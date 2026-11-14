import type { OfferAction, Order, PostAction, PriceRequest } from '../vendor/spread/types.ts'
import type { Model } from './policy.ts'
import type { FeeMode } from './fees.ts'
import { feeSchedule } from './fees.ts'

export function chainPosts(posts: PostAction[], orders: Map<string, Order>, requests: Map<string, PriceRequest>, model: Model, now: number, level: 3 | 4, mode: FeeMode): PostAction[] {
  const road = (from: string, to: string) => model.roads.get(`${from}/${to}`)?.minutes ?? Infinity
  const feasible = (stops: PostAction['stops'], start: number): boolean => {
    let time = start
    let previous: string | undefined
    const day = Math.floor(now / 1440)
    for (const stop of stops) {
      const order = orders.get(stop.orderId)
      const leg = order?.legs[stop.leg]
      if (!order || !leg || order.status === 'cancelled') return false
      const place = leg[stop.kind]
      if (place.privateAddress) return false
      if (previous) time += road(previous, place.placeId)
      time = Math.max(time, place.window.from, stop.window?.from ?? 0)
      const hours = place.hours && (day % 7 === 5 ? place.hours.saturday : place.hours.weekdays.includes(day % 7) ? place.hours : null)
      if (place.hours && !hours) return false
      if (hours) time = Math.max(time, day * 1440 + hours.opens)
      const last = Math.min(place.window.to, stop.window?.to ?? Infinity, order.deadline, hours ? day * 1440 + hours.closes - 1 : Infinity)
      if (time > last || Math.floor(time / 1440) !== day) return false
      time += 15 + (stop.withCharging ? 40 : 0)
      previous = place.placeId
    }
    return Math.floor(time / 1440) === day
  }
  const combine = (a: PostAction, b: PostAction): PostAction | null => {
    if (a.stops.length !== 2 || b.stops.length !== 2 || a.stops[0]!.orderId === b.stops[0]!.orderId) return null
    const stops = [...a.stops, ...b.stops]
    const places = stops.map(s => orders.get(s.orderId)?.legs[s.leg]?.[s.kind].placeId)
    if (places.some(p => !p) || road(places[1]!, places[2]!) > 15) return null
    const minutes = places.slice(1).reduce((sum, p, i) => sum + road(places[i]!, p!), 0)
    if (minutes > 360 || !feasible(stops, now + 55) || !feasible(stops, now + 55 + 210)) return null
    const reference = [...new Set(stops.map(s => s.orderId))].reduce((sum, id) => sum + (requests.get(id)?.referenceFeeCents ?? 0), 0)
    if (!reference) return null
    return { type: 'post', stops, audience: { experienced: a.audience.experienced || b.audience.experienced, manualLicence: a.audience.manualLicence || b.audience.manualLicence },
      schedule: feeSchedule(level, mode, now, Math.max(1, Math.round(reference * 0.90)), model.policy) }
  }
  const used = new Set<number>()
  const result: PostAction[] = []
  for (let i = 0; i < posts.length; i++) {
    if (used.has(i)) continue
    let chain: PostAction | null = null
    for (let j = i + 1; j < posts.length; j++) {
      if (used.has(j)) continue
      chain = combine(posts[i]!, posts[j]!) ?? combine(posts[j]!, posts[i]!)
      if (chain) { used.add(j); break }
    }
    result.push(chain ?? posts[i]!)
  }
  return result
}

export type NetworkMode = 'baseline' | 'offers' | 'chains'
export type NetworkGig = { action: PostAction; status: string; postedAt: number }
export type NetworkState = { attempts: { gigId: string; driverId: string; at: number; expiresAt: number; closed: boolean }[]; blockedDay: number }

export function restoreNetwork(state?: NetworkState, now = 0, uncertain = false): NetworkState {
  const restored = structuredClone(state ?? { attempts: [], blockedDay: -1 })
  if (uncertain) restored.blockedDay = Math.max(restored.blockedDay, Math.floor(now / 1440))
  return restored
}

export class OfferPlanner {
  state: NetworkState
  views = new Map<string, number>()
  constructor(state?: NetworkState) { this.state = structuredClone(state ?? { attempts: [], blockedDay: -1 }) }
  viewed(gigId: string, driverId: string, now: number) { this.views.set(`${gigId}/${driverId}`, now) }
  answered(gigId: string, driverId: string) {
    for (const attempt of this.state.attempts) if (attempt.gigId === gigId && attempt.driverId === driverId) attempt.closed = true
  }
  sent(action: OfferAction, now: number) {
    this.state.attempts.push({ gigId: action.gigId, driverId: action.driverId, at: now, expiresAt: now + 10, closed: false })
  }
  plan(gigs: Map<string, NetworkGig>, orders: Map<string, Order>, requests: Map<string, PriceRequest>, model: Model, now: number): OfferAction[] {
    const day = Math.floor(now / 1440)
    if (day <= this.state.blockedDay || now % 1440 < 420 || now % 1440 >= 1380) return []
    const planned: OfferAction[] = []
    const daily = new Map<string, number>()
    for (const a of this.state.attempts) if (Math.floor(a.at / 1440) === day) daily.set(a.driverId, (daily.get(a.driverId) ?? 0) + 1)
    for (const [gigId, gig] of gigs) {
      if (gig.status !== 'open' || now - gig.postedAt < 30) continue
      const attempts = this.state.attempts.filter(a => a.gigId === gigId)
      if (attempts.length >= 3 || attempts.filter(a => !a.closed && a.expiresAt > now).length >= 3) continue
      const order = orders.get(gig.action.stops[0]!.orderId)
      if (!order || order.status === 'cancelled') continue
      const pickup = order.legs[gig.action.stops[0]!.leg]!.pickup.placeId
      const distance = (home: string) => model.roads.get(`${home}/${pickup}`)?.minutes ?? Infinity
      const recentView = (id: string) => now - (this.views.get(`${gigId}/${id}`) ?? -Infinity) <= 60 ? 1 : 0
      const driver = model.drivers.filter(d =>
        (!gig.action.audience.experienced || (d.rating >= 4.8 && d.completedGigs >= 50)) &&
        (!gig.action.audience.manualLicence || d.licence === 'manual') &&
        distance(d.homePlaceId) <= 55 && (daily.get(d.id) ?? 0) < 3 && !attempts.some(a => a.driverId === d.id)
      ).sort((a, b) => recentView(b.id) - recentView(a.id) || distance(a.homePlaceId) - distance(b.homePlaceId) || a.drops / Math.max(1, a.completedGigs) - b.drops / Math.max(1, b.completedGigs) || a.id.localeCompare(b.id))[0]
      if (!driver) continue
      const reference = [...new Set(gig.action.stops.map(s => s.orderId))].reduce((sum, id) => sum + (requests.get(id)?.referenceFeeCents ?? 0), 0)
      if (reference <= 0) continue
      planned.push({ type: 'offer', gigId, driverId: driver.id, feeCents: Math.max(1, Math.round(reference * Math.max(model.policy.openingMultiplier, 0.90))) })
      daily.set(driver.id, (daily.get(driver.id) ?? 0) + 1)
    }
    return planned
  }
}

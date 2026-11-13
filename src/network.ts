import type { OfferAction, Order, PostAction, PriceRequest } from '../vendor/spread/types.ts'
import type { Model } from './policy.ts'

export type NetworkMode = 'baseline' | 'offers' | 'chains'
export type NetworkGig = { action: PostAction; status: string; postedAt: number }
export type NetworkState = { attempts: { gigId: string; driverId: string; at: number; expiresAt: number; closed: boolean }[]; blockedDay: number }

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

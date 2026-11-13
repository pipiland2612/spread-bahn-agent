import type { DriverProfile, Order, PostAction, PriceRequest, StopPlace, WorldMap } from '../vendor/spread/types.ts'

export type Policy = {
  openingMultiplier: number
  maxReferenceShare: number
  maxDriveMinutes: number
  minLocalDrivers: number
  minSlackMinutes: number
}

export const DEFAULT_POLICY: Policy = {
  openingMultiplier: 0.75,
  maxReferenceShare: 1.05,
  maxDriveMinutes: 240,
  minLocalDrivers: 15,
  minSlackMinutes: 210,
}

/** Latest minute at which a site can receive a car before its contractual deadline. */
export function latestOpen(stop: StopPlace, deadline: number): number {
  const end = Math.min(deadline, stop.window.to)
  if (!stop.hours) return end
  for (let day = Math.floor(end / 1440); day >= Math.floor(stop.window.from / 1440); day--) {
    const weekday = day % 7
    const hours = weekday === 5 ? stop.hours.saturday : stop.hours.weekdays.includes(weekday) ? stop.hours : null
    if (!hours) continue
    const latest = Math.min(end, day * 1440 + hours.closes - 1)
    if (latest >= Math.max(stop.window.from, day * 1440 + hours.opens)) return latest
  }
  return -Infinity
}

export class Model {
  readonly roads: Map<string, WorldMap['roads'][number]>
  readonly drivers: DriverProfile[]
  readonly policy: Policy
  constructor(map: WorldMap, drivers: DriverProfile[], policy = DEFAULT_POLICY) {
    this.roads = new Map(map.roads.map(r => [`${r.from}/${r.to}`, r]))
    this.drivers = drivers
    this.policy = policy
  }

  assess(request: PriceRequest, now: number): { accept: boolean; reason: string; fee: number } {
    const option = request.options[0]
    const fee = Math.max(1, Math.round(request.referenceFeeCents * this.policy.openingMultiplier))
    const reject = (reason: string) => ({ accept: false, reason, fee })
    if (!option || now >= request.respondBy) return reject('expired')
    if (request.legs.length !== 1) return reject('multi-car: Level 1 supports single-car gigs')
    const leg = request.legs[0]!
    if (leg.pickup.privateAddress || leg.delivery.privateAddress) return reject('private appointment risk')
    if (request.referenceFeeCents > option.listPriceCents * this.policy.maxReferenceShare) return reject('thin margin')
    const route = this.roads.get(`${leg.pickup.placeId}/${leg.delivery.placeId}`)
    if (!route || route.minutes > this.policy.maxDriveMinutes) return reject('long route')
    const qualified = this.drivers.filter(d => !leg.car.premium || (d.rating >= 4.8 && d.completedGigs >= 50))
    const local = qualified.filter(d => (this.roads.get(`${d.homePlaceId}/${leg.pickup.placeId}`)?.minutes ?? Infinity) <= 55).length
    if (local < this.policy.minLocalDrivers) return reject('sparse driver coverage')
    const charge = leg.car.electric && (leg.car.chargePercent ?? 100) < 30 && route.km > 200 ? 40 : 0
    const lastDelivery = latestOpen(leg.delivery, option.deadline)
    const lastPickup = latestOpen(leg.pickup, Math.min(option.deadline, lastDelivery - route.minutes - charge))
    const ready = Math.max(now + 15, leg.pickup.window.from)
    if (lastPickup - ready < this.policy.minSlackMinutes) return reject('insufficient booking buffer')
    return { accept: true, reason: 'eligible', fee }
  }

  post(order: Order, referenceFee: number, now: number, multiplier = this.policy.openingMultiplier): PostAction {
    const leg = order.legs[0]!
    const route = this.roads.get(`${leg.pickup.placeId}/${leg.delivery.placeId}`)!
    return {
      type: 'post',
      stops: [
        { orderId: order.id, leg: 0, kind: 'pickup', withCharging: leg.car.electric && (leg.car.chargePercent ?? 100) < 30 && route.km > 200 },
        { orderId: order.id, leg: 0, kind: 'delivery' },
      ],
      audience: { experienced: leg.car.premium, manualLicence: false },
      schedule: [{ at: now, feeCents: Math.max(1, Math.round(referenceFee * multiplier)) }],
    }
  }
}

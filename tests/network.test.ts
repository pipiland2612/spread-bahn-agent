import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OfferPlanner } from '../src/network.ts'
import { Model } from '../src/policy.ts'
import type { DriverProfile, Order, PostAction, PriceRequest } from '../vendor/spread/types.ts'

const drivers: DriverProfile[] = [
  { id: 'near', homePlaceId: 'a', rating: 4.9, licence: 'manual', completedGigs: 100, drops: 0 },
  { id: 'viewer', homePlaceId: 'b', rating: 4.9, licence: 'manual', completedGigs: 100, drops: 2 },
  { id: 'far', homePlaceId: 'c', rating: 5, licence: 'manual', completedGigs: 100, drops: 0 },
  { id: 'novice', homePlaceId: 'a', rating: 4.7, licence: 'automatic_only', completedGigs: 10, drops: 0 },
]
export function networkFixture() {
  const hours = { opens: 420, closes: 1260, weekdays: [0, 1, 2, 3, 4], saturday: null }
  const leg = { car: { premium: true, electric: false, chargePercent: null }, pickup: { placeId: 'a', privateAddress: false, window: { from: 420, to: 1200 }, hours }, delivery: { placeId: 'b', privateAddress: false, window: { from: 420, to: 1200 }, hours } }
  const request: PriceRequest = { id: 'R1', dealerId: 'D1', batchId: null, arrivedAt: 420, respondBy: 435, legs: [leg], options: [{ kind: 'same_day', deadline: 1200, listPriceCents: 14000 }], referenceFeeCents: 10000, note: null }
  const order: Order = { id: 'R1', dealerId: 'D1', option: 'same_day', priceCents: 14000, deadline: 1200, legs: [leg], status: 'waiting', deliveredAt: [null], lastPickupAt: 1100 }
  const post: PostAction = { type: 'post', stops: [{ orderId: 'R1', leg: 0, kind: 'pickup' }, { orderId: 'R1', leg: 0, kind: 'delivery' }], audience: { experienced: true, manualLicence: true }, schedule: [{ at: 450, feeCents: 7500 }] }
  const model = new Model({ places: [], roads: [{ from: 'a', to: 'a', minutes: 0, km: 0 }, { from: 'b', to: 'a', minutes: 30, km: 25 }, { from: 'c', to: 'a', minutes: 180, km: 200 }, { from: 'a', to: 'b', minutes: 60, km: 50 }, { from: 'b', to: 'b', minutes: 0, km: 0 }] }, drivers)
  return { model, orders: new Map([['R1', order]]), requests: new Map([['R1', request]]), gigs: new Map([['g1', { action: post, postedAt: 450, status: 'open' }]]) }
}

test('offers prefer recent qualified local viewers, never distant or unqualified viewers', () => {
  const f = networkFixture(); const planner = new OfferPlanner()
  planner.viewed('g1', 'viewer', 475); planner.viewed('g1', 'far', 479); planner.viewed('g1', 'novice', 479)
  assert.deepEqual(planner.plan(f.gigs, f.orders, f.requests, f.model, 480), [{ type: 'offer', gigId: 'g1', driverId: 'viewer', feeCents: 9000 }])
})
test('night, young gigs, booked gigs, and blocked recovery days send no offers', () => {
  const f = networkFixture(); const planner = new OfferPlanner()
  for (const now of [400, 460, 1380]) assert.deepEqual(planner.plan(f.gigs, f.orders, f.requests, f.model, now), [])
  planner.state.blockedDay = 0
  assert.deepEqual(planner.plan(f.gigs, f.orders, f.requests, f.model, 480), [])
  f.gigs.get('g1')!.status = 'booked'; planner.state.blockedDay = -1
  assert.deepEqual(planner.plan(f.gigs, f.orders, f.requests, f.model, 480), [])
})
test('successful offer state survives restart and prevents duplicate driver targeting', () => {
  const f = networkFixture(); const planner = new OfferPlanner()
  planner.sent({ type: 'offer', gigId: 'g1', driverId: 'near', feeCents: 9000 }, 480)
  const restored = new OfferPlanner(planner.state)
  assert.equal(restored.plan(f.gigs, f.orders, f.requests, f.model, 481)[0]?.driverId, 'viewer')
  restored.sent({ type: 'offer', gigId: 'g1', driverId: 'viewer', feeCents: 9000 }, 481)
  assert.deepEqual(restored.plan(f.gigs, f.orders, f.requests, f.model, 495), [])
})
test('planned offers reserve three-per-driver daily budget within a batch', () => {
  const f = networkFixture(); f.model.drivers.splice(1)
  const gig = f.gigs.get('g1')!
  for (let n = 2; n <= 5; n++) f.gigs.set(`g${n}`, structuredClone(gig))
  const planner = new OfferPlanner()
  assert.equal(planner.plan(f.gigs, f.orders, f.requests, f.model, 480).length, 3)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Desk } from '../src/run.ts'
import { Model, DEFAULT_POLICY } from '../src/policy.ts'
import type { DeskSnapshot, Order, PostAction, PriceRequest } from '../vendor/spread/types.ts'

function fixture(mode: 'legacy' | 'stable' | 'delayed' = 'stable', level: 1 | 2 = 2) {
  const hours = { opens: 420, closes: 1260, weekdays: [0, 1, 2, 3, 4], saturday: null }
  const request: PriceRequest = {
    id: 'R1', dealerId: 'D1', batchId: null, arrivedAt: 490, respondBy: 505,
    legs: [{ car: { premium: false, electric: false, chargePercent: null },
      pickup: { placeId: 'a', privateAddress: false, window: { from: 490, to: 1200 }, hours },
      delivery: { placeId: 'b', privateAddress: false, window: { from: 490, to: 1200 }, hours } }],
    options: [{ kind: 'same_day', deadline: 1200, listPriceCents: 14000 }], referenceFeeCents: 10000, note: null,
  }
  const order: Order = { id: 'R1', dealerId: 'D1', option: 'same_day', priceCents: 14000, deadline: 1200,
    legs: request.legs, status: 'waiting', deliveredAt: [null], lastPickupAt: 1000 }
  const model = new Model({ places: [], roads: [{ from: 'a', to: 'b', km: 50, minutes: 60 }] }, [], { ...DEFAULT_POLICY, openingMultiplier: 0.75 })
  const desk = new Desk(model, level, mode)
  desk.now = 505; desk.requests.set(request.id, request); desk.orders.set(order.id, order)
  desk.post(order)
  const post = desk.outbox.shift() as PostAction
  desk.results([post], [{ ok: true, id: 'g1' }])
  return { desk, order, request, post }
}

test('Level 2 delayed posting sends its scheduled future fee', () => {
  assert.deepEqual(fixture('delayed').post.schedule, [{ at: 505, feeCents: 7500 }, { at: 625, feeCents: 10500 }])
})
test('stable Level 2 mode does not raise merely because an open gig aged', () => {
  const { desk } = fixture(); desk.now = 650; desk.tick()
  assert.deepEqual(desk.outbox, [])
})
test('booking after a deadline warning removes the now-invalid queued reprice', () => {
  const { desk } = fixture(); desk.now = 820
  desk.handle({ kind: 'deadline_close', seq: 10, at: 820, orderId: 'R1', lastPickupAt: 1000 })
  assert.equal(desk.outbox.length, 1)
  desk.handle({ kind: 'gig_booked', seq: 11, at: 820, gigId: 'g1', driverId: 'd1', feeCents: 7500 })
  desk.handle({ kind: 'gig_started', seq: 12, at: 820, gigId: 'g1', driverId: 'd1' })
  assert.deepEqual(desk.outbox, [])
})
test('cancellation discards a pending reprice as well as a pending post', () => {
  const { desk } = fixture(); desk.raise('R1', 1.65)
  desk.handle({ kind: 'order_cancelled', seq: 12, at: 820, orderId: 'R1', gigs: [{ gigId: 'g1', outcome: 'withdrawn' }] })
  assert.deepEqual(desk.outbox, [])
})
test('expired gig discards old reprices before its replacement post', () => {
  const { desk } = fixture(); desk.raise('R1', 1.65)
  desk.handle({ kind: 'gig_expired', seq: 12, at: 1201, gigId: 'g1' })
  assert.deepEqual(desk.outbox.map(a => a.type), ['post'])
})
test('proposed or refused fees never replace confirmed fee state', t => {
  t.mock.method(console, 'error', () => {})
  const { desk } = fixture(); desk.raise('R1', 1.65)
  assert.equal(desk.gigs.get('g1')!.multiplier, 0.75)
  const actions = desk.outbox.splice(0)
  desk.results(actions, [{ ok: false, reason: 'Gig g1 is not open' }])
  assert.equal(desk.gigs.get('g1')!.multiplier, 0.75)
  assert.equal(desk.stats.refused.length, 1)
})
test('accepted reprice replaces the confirmed schedule', () => {
  const { desk } = fixture(); desk.raise('R1', 1.65)
  desk.results(desk.outbox.splice(0), [{ ok: true, id: 'g1' }])
  assert.deepEqual(desk.gigs.get('g1')!.action.schedule, [{ at: 505, feeCents: 16500 }])
})
for (const kind of ['gig_dropped', 'no_show'] as const) test(`${kind} reopens and rescues urgent work`, () => {
  const { desk } = fixture(); desk.now = 850
  desk.handle({ kind: 'gig_booked', seq: 1, at: 700, gigId: 'g1', driverId: 'd1', feeCents: 7500 })
  desk.handle({ kind, seq: 2, at: 850, gigId: 'g1', driverId: 'd1' })
  desk.tick()
  assert.equal(desk.gigs.get('g1')!.status, 'open')
  assert.deepEqual(desk.outbox, [{ type: 'reprice', gigId: 'g1', schedule: [{ at: 850, feeCents: 16500 }] }])
})
test('restart derives the active scheduled fee from world time', () => {
  const { desk, order, request, post } = fixture('delayed')
  const snapshot: DeskSnapshot = { worldId: 'w1', now: 650, endsAt: 14280, orders: [order], openRequests: [], driverPositions: [],
    score: { marginCents: 0, revenueCents: 0, marginShare: 0, wonOrders: 1, onTimeShare: 1, undeliveredShare: 0, ranked: false },
    gigs: [{ id: 'g1', stops: post.stops, audience: post.audience, schedule: [{ at: 505, feeCents: 7500 }, { at: 625, feeCents: 10500 }], status: 'open', postedAt: 505, feeCents: 7500, driverId: null }] }
  const restored = new Desk(desk.model, 2, 'delayed')
  restored.rebuild(snapshot, [{ kind: 'price_request', seq: 0, at: 490, request }])
  assert.equal(restored.gigs.get('g1')!.multiplier, 1.05)
  restored.tick()
  assert.deepEqual(restored.outbox, [])
})

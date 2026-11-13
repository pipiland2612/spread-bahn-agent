import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_POLICY, Model, latestOpen } from '../src/policy.ts'
import { Desk } from '../src/run.ts'
import { resolveSettings } from '../src/settings.ts'
import type { DeskSnapshot, DriverProfile, Order, PriceRequest, WorldMap } from '../vendor/spread/types.ts'

const hours = { opens: 420, closes: 1200, weekdays: [0, 1, 2, 3, 4], saturday: null }
const request = (): PriceRequest => ({
  id: 'R1', dealerId: 'D1', batchId: null, arrivedAt: 490, respondBy: 505,
  legs: [{ car: { premium: false, electric: false, chargePercent: null },
    pickup: { placeId: 'a', privateAddress: false, window: { from: 490, to: 2640 }, hours },
    delivery: { placeId: 'b', privateAddress: false, window: { from: 490, to: 2640 }, hours } }],
  options: [{ kind: 'same_day', deadline: 1200, listPriceCents: 10000 }], referenceFeeCents: 6000, note: null,
})
const map: WorldMap = { places: [], roads: [{ from: 'a', to: 'a', km: 12, minutes: 25 }, { from: 'a', to: 'b', km: 150, minutes: 110 }] }
const drivers: DriverProfile[] = Array.from({ length: 40 }, (_, i) => ({ id: `d${i}`, homePlaceId: 'a', rating: 5, licence: 'manual', completedGigs: 100, drops: 0 }))
const model = () => new Model(map, drivers, { ...DEFAULT_POLICY, openingMultiplier: 0.85, maxReferenceShare: 0.88 })

test('accepts profitable work with enough driver and deadline buffer', () => {
  assert.deepEqual(model().assess(request(), 490), { accept: true, reason: 'eligible', fee: 5100 })
})
test('rejects thin margins, private appointments, multi-car work and scarce drivers', () => {
  const r = request(); r.referenceFeeCents = 9000
  assert.equal(model().assess(r, 490).accept, false)
  r.referenceFeeCents = 6000; r.legs[0]!.delivery.privateAddress = true
  assert.equal(model().assess(r, 490).accept, false)
  r.legs[0]!.delivery.privateAddress = false; r.legs.push(structuredClone(r.legs[0]!))
  assert.equal(model().assess(r, 490).accept, false)
  assert.equal(new Model(map, []).assess(request(), 490).accept, false)
})
test('uses actual closing hours and rejects insufficient lead time', () => {
  const r = request(); r.legs[0]!.delivery.hours = { ...hours, closes: 900 }
  assert.equal(latestOpen(r.legs[0]!.delivery, 1200), 899)
  assert.equal(model().assess(r, 700).accept, false)
})
test('Sunday closing moves latest feasible delivery back to Friday', () => {
  const stop = request().legs[0]!.delivery
  stop.window.to = 7 * 1440
  assert.equal(latestOpen(stop, 6 * 1440 + 1200), 4 * 1440 + 1199)
})
test('low battery long-distance cars get a planned charging stop', () => {
  const r = request(); r.legs[0]!.car = { premium: true, electric: true, chargePercent: 10 }
  const m = new Model({ ...map, roads: [{ from: 'a', to: 'b', km: 250, minutes: 150 }] }, drivers)
  const order = { ...r, option: 'same_day', priceCents: 10000, deadline: 1200, status: 'waiting', deliveredAt: [null], lastPickupAt: 1000 } as Order
  const action = m.post(order, r.referenceFeeCents, 505)
  assert.equal(action.stops[0]!.withCharging, true)
  assert.equal(action.audience.experienced, true)
  assert.equal(action.schedule.length, 1)
})
test('rejoin answers an open request already present in event history', () => {
  const r = request()
  const desk = new Desk(model())
  desk.rebuild({ now: 490, orders: [], gigs: [], openRequests: [r] } as unknown as DeskSnapshot, [{ kind: 'price_request', seq: 0, at: 490, request: r }])
  assert.equal(desk.outbox[0]?.type, 'quote')
  desk.handle({ kind: 'price_request', seq: 0, at: 490, request: r })
  assert.equal(desk.outbox.length, 1)
})
test('cancellation removes pending posts and prevents subsequent repricing', () => {
  const r = request(); const desk = new Desk(model()); desk.now = 490; desk.quote(r)
  const order = { ...r, option: 'same_day', priceCents: 10000, deadline: 1200, status: 'waiting', deliveredAt: [null], lastPickupAt: 1000 } as Order
  desk.handle({ kind: 'order_won', seq: 1, at: 505, order })
  desk.handle({ kind: 'order_cancelled', seq: 2, at: 506, orderId: r.id, gigs: [] })
  assert.equal(desk.outbox.filter(a => a.type === 'post').length, 0)
})

test('validated Level 2 defaults accept broader work and retain the winning fee behavior', () => {
  const r = request(); r.referenceFeeCents = 11000
  const first = resolveSettings({ level: '1' })
  const second = resolveSettings({ level: '2' })
  assert.equal(new Model(map, drivers, first.policy).assess(r, 490).accept, false)
  const model = new Model(map, drivers, second.policy)
  assert.deepEqual(model.assess(r, 490), { accept: true, reason: 'eligible', fee: 8250 })
  const order = { ...r, option: 'same_day', priceCents: 10000, deadline: 1200, status: 'waiting', deliveredAt: [null], lastPickupAt: 1000 } as Order
  const desk = new Desk(model, second.level, second.mode)
  desk.now = 505; desk.requests.set(r.id, r); desk.orders.set(order.id, order); desk.post(order)
  desk.results(desk.outbox.splice(0), [{ ok: true, id: 'g1' }])
  desk.now = 570; desk.tick()
  assert.deepEqual(desk.outbox, [{ type: 'reprice', gigId: 'g1', schedule: [{ at: 570, feeCents: 11550 }] }])
})

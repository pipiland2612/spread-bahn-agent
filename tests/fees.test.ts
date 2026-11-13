import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as fees from '../src/fees.ts'
import * as policy from '../src/policy.ts'

test('Level 1 posts one fee even when delayed mode was selected', () => {
  assert.deepEqual(fees.feeSchedule(1, 'delayed', 500, 10001, policy.DEFAULT_POLICY), [{ at: 500, feeCents: 7501 }])
})
test('stable Level 2 fees have no scheduled increase', () => {
  assert.deepEqual(fees.feeSchedule(2, 'stable', 500, 10000, policy.DEFAULT_POLICY), [{ at: 500, feeCents: 7500 }])
})
test('delayed Level 2 fees rise once after 120 minutes without decreasing', () => {
  assert.deepEqual(fees.feeSchedule(2, 'delayed', 500, 10000, policy.DEFAULT_POLICY), [{ at: 500, feeCents: 7500 }, { at: 620, feeCents: 10500 }])
  assert.deepEqual(fees.feeSchedule(2, 'delayed', 500, 10000, { ...policy.DEFAULT_POLICY, openingMultiplier: 1.2 }), [{ at: 500, feeCents: 12000 }, { at: 620, feeCents: 12000 }])
})
test('stable fees ignore age but rescue an urgent gig', () => {
  assert.equal(fees.targetMultiplier('stable', 600, 400, 0.8), 0.8)
  assert.equal(fees.targetMultiplier('stable', 5, 180, 0.8), 1.65)
  assert.equal(fees.targetMultiplier('legacy', 60, 400, 0.75), 1.05)
  assert.equal(fees.targetMultiplier('legacy', 120, 400, 0.75), 1.2)
})
test('fee generation rejects invalid world minutes and reference amounts', () => {
  assert.equal(typeof fees.feeSchedule, 'function')
  for (const [now, reference] of [[0.5, 100], [-1, 100], [0, 0], [0, 1.5], [0, Infinity]]) {
    assert.throws(() => fees.feeSchedule(2, 'stable', now, reference, policy.DEFAULT_POLICY))
  }
})
test('policy rejects nonfinite fees and invalid integer timing thresholds', () => {
  for (const patch of [{ openingMultiplier: 0 }, { openingMultiplier: NaN }, { maxReferenceShare: Infinity }, { minSlackMinutes: -1 }, { minSlackMinutes: 2.5 }, { minLocalDrivers: 0 }, { maxDriveMinutes: 0 }]) {
    assert.throws(() => policy.validatePolicy({ ...policy.DEFAULT_POLICY, ...patch }))
  }
  assert.doesNotThrow(() => policy.validatePolicy({ ...policy.DEFAULT_POLICY, maxReferenceShare: 1.05 }))
})

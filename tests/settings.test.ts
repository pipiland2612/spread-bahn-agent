import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as settings from '../src/settings.ts'
import { DEFAULT_POLICY } from '../src/policy.ts'
import type { WorldSummary } from '../vendor/spread/types.ts'

const world: WorldSummary = { worldId: 'w1', kind: 'practice', level: 2, parent: null, season: null, boardRun: null, ended: false }
const manifest = { worldId: 'w1', level: 2, feeMode: 'delayed', seed: 'saved-seed', policy: { ...DEFAULT_POLICY, openingMultiplier: 0.8, maxReferenceShare: 0.95 } }

test('Level 2 can be selected while unsupported levels are refused', () => {
  assert.equal(settings.resolveSettings({ level: '2' }).level, 2)
  assert.equal(settings.resolveSettings({ level: '2' }).mode, 'stable')
  assert.throws(() => settings.resolveSettings({ level: '3' }), /level/i)
})
test('resume restores the saved level, fee mode, complete policy and seed', () => {
  const actual = settings.resolveSettings({}, manifest, world)
  assert.equal(actual.level, 2)
  assert.equal(actual.mode, 'delayed')
  assert.equal(actual.seed, 'saved-seed')
  assert.equal(actual.policy.openingMultiplier, 0.8)
  assert.equal(actual.policy.maxReferenceShare, 0.95)
  assert.deepEqual(actual.overrides, [])
})
test('legacy manifests keep their historical policy and fee behavior', () => {
  const actual = settings.resolveSettings({}, { level: 1, seed: 'old', policy: { ...DEFAULT_POLICY, openingMultiplier: 0.85, maxReferenceShare: 0.88 } }, { ...world, level: 1 })
  assert.equal(actual.mode, 'legacy')
  assert.equal(actual.policy.openingMultiplier, 0.85)
})
test('explicit resume policy overrides are recorded without changing the seed', () => {
  const actual = settings.resolveSettings({ opening: '0.9', 'fee-mode': 'stable' }, manifest, world)
  assert.equal(actual.policy.openingMultiplier, 0.9)
  assert.equal(actual.mode, 'stable')
  assert.deepEqual(actual.overrides, ['opening', 'fee-mode'])
  assert.equal(actual.seed, 'saved-seed')
})
test('resume rejects incompatible levels, wrong manifests and changed seeds', () => {
  assert.equal(typeof settings.resolveSettings, 'function')
  assert.throws(() => settings.resolveSettings({ level: '1' }, manifest, world), /level/i)
  assert.throws(() => settings.resolveSettings({}, { ...manifest, worldId: 'w2' }, world), /world/i)
  assert.throws(() => settings.resolveSettings({ seed: 'different' }, manifest, world), /seed/i)
})
test('missing manifests require an explicit compatible resume policy', () => {
  assert.equal(typeof settings.resolveSettings, 'function')
  assert.throws(() => settings.resolveSettings({}, undefined, world), /manifest/i)
  const actual = settings.resolveSettings({ level: '2', opening: '0.8', 'reference-share': '1.05', 'fee-mode': 'stable' }, undefined, world)
  assert.equal(actual.policy.openingMultiplier, 0.8)
  assert.equal(actual.seed, null)
})
test('CLI refuses empty, partial, nonfinite and zero numeric arguments', () => {
  assert.equal(typeof settings.resolveSettings, 'function')
  for (const opening of ['', '0.8junk', 'NaN', 'Infinity', '0', '-1']) assert.throws(() => settings.resolveSettings({ opening }))
  for (const level of ['', '2.0', '2x', '0']) assert.throws(() => settings.resolveSettings({ level }))
  assert.throws(() => settings.resolveSettings({ 'fee-mode': 'unknown' }), /mode/i)
})
test('ranking guard rejects a world from another season', () => {
  assert.equal(typeof settings.assertBoardSeason, 'function')
  assert.doesNotThrow(() => settings.assertBoardSeason(3, { ...world, season: 3, boardRun: 1 }))
  assert.throws(() => settings.assertBoardSeason(3, { ...world, season: 4, boardRun: 1 }), /season/i)
})

test('resuming an old ranked world cannot silently switch its remaining runs to a new season', () => {
  const old = { ...world, season: 3, boardRun: 4 }
  const expected = settings.targetBoardSeason(4, old)
  assert.equal(expected, 3)
  assert.throws(() => settings.assertBoardSeason(expected, { ...world, season: 4, boardRun: 1 }), /season/i)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as settings from '../src/settings.ts'
import { DEFAULT_POLICY } from '../src/policy.ts'
import type { WorldSummary } from '../vendor/spread/types.ts'

const world: WorldSummary = { worldId: 'w1', kind: 'practice', level: 2, parent: null, season: null, boardRun: null, ended: false }
const manifest = { worldId: 'w1', level: 2, feeMode: 'delayed', seed: 'saved-seed', policy: { ...DEFAULT_POLICY, openingMultiplier: 0.8, maxReferenceShare: 0.95 } }

test('Level 2 can be selected while unsupported levels are refused', () => {
  assert.equal(settings.resolveSettings({ level: '2' }).level, 2)
  assert.equal(settings.resolveSettings({ level: '2', 'fee-mode': 'stable' }).mode, 'stable')
  assert.throws(() => settings.resolveSettings({ level: '5' }), /level/i)
})
test('Level 3 preserves explicit network mode while older manifests remain baseline', () => {
  assert.equal(settings.resolveSettings({ level: '3', network: 'offers' }).network, 'offers')
  assert.equal(settings.resolveSettings({}, { ...manifest, level: 3, networkMode: 'chains', networkRevision: 2 }, { ...world, level: 3 }).network, 'chains')
  assert.equal(settings.resolveSettings({}, manifest, world).network, 'baseline')
  assert.throws(() => settings.resolveSettings({ level: '2', network: 'offers' }), /network/i)
  assert.throws(() => settings.resolveSettings({ level: '3', network: 'unknown' }), /network/i)
})
test('missing Level 3 manifests require explicit network choice and old chain revisions require consent', () => {
  const args = { level: '3', opening: '0.75', 'reference-share': '1.2', 'fee-mode': 'legacy' }
  assert.throws(() => settings.resolveSettings(args, undefined, { ...world, level: 3 }), /network/i)
  assert.equal(settings.resolveSettings({ ...args, network: 'offers' }, undefined, { ...world, level: 3 }).network, 'offers')
  const old = { ...manifest, level: 3, networkMode: 'chains' }
  assert.throws(() => settings.resolveSettings({}, old, { ...world, level: 3 }), /revision/i)
  assert.deepEqual(settings.resolveSettings({ network: 'chains' }, old, { ...world, level: 3 }).overrides, ['network'])
})
test('validated Level 3 defaults enable offers only for new Level 3 worlds', () => {
  assert.equal(settings.resolveSettings({ level: '3' }).network, 'offers')
  assert.equal(settings.resolveSettings({ level: '2' }).network, 'baseline')
  assert.equal(settings.resolveSettings({}, { ...manifest, level: 3 }, { ...world, level: 3 }).network, 'baseline')
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

test('multi-run resume preserves the original seed on its first world', () => {
  assert.equal(settings.seedForRun('saved-seed', 0, 3, true), 'saved-seed')
  assert.equal(settings.seedForRun('fresh', 0, 3, false), 'fresh-1')
  assert.equal(settings.seedForRun('fresh', 1, 3, false), 'fresh-2')
  assert.equal(settings.seedForRun('fresh', 0, 1, false), 'fresh')
})

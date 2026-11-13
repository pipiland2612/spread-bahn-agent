import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Desk } from '../src/run.ts'
import { Model } from '../src/policy.ts'
import { restoreStats } from '../src/recovery.ts'

test('completed-world resume retains historical refused actions and quote counts', () => {
  const previous = { stats: { quoted: 42, declined: { distance: 3 }, refused: [{ action: 'reprice', reason: 'not open' }] } }
  const stats = restoreStats(previous)
  const desk = new Desk(new Model({ places: [], roads: [] }, []), 2, 'legacy', stats)
  assert.equal(desk.stats.quoted, 42)
  assert.deepEqual(desk.stats.refused, previous.stats.refused)
  assert.equal(desk.stats.complete, true)
})

test('connection recovery preserves cumulative evidence but flags uncertain action results', () => {
  const previous = { stats: { quoted: 42, declined: {}, refused: [{ action: 'post', reason: 'bad stops' }] } }
  const stats = restoreStats(previous, true)
  const rebuilt = new Desk(new Model({ places: [], roads: [] }, []), 2, 'legacy', stats)
  assert.equal(rebuilt.stats.quoted, 42)
  assert.equal(rebuilt.stats.refused.length, 1)
  assert.equal(rebuilt.stats.complete, false)
})

test('crashed in-flight actions or missing historical statistics cannot pass evidence gate', () => {
  assert.equal(restoreStats({ pendingAdvance: true, stats: { quoted: 1, declined: {}, refused: [] } }).complete, false)
  assert.equal(restoreStats({ worldId: 'old' }).complete, false)
  assert.equal(restoreStats().complete, true)
})

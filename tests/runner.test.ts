import { test } from 'node:test'
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from '../src/run.ts'
import { Client } from '../vendor/spread/spread.ts'
import { DEFAULT_POLICY } from '../src/policy.ts'

async function runnerFixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'spread-runner-test-'))
  const cwd = process.cwd()
  const oldKey = process.env.SPREAD_KEY
  process.env.SPREAD_KEY = 'test-key-no-network'
  t.after(async () => { process.chdir(cwd); if (oldKey === undefined) delete process.env.SPREAD_KEY; else process.env.SPREAD_KEY = oldKey; await rm(directory, { recursive: true }) })
  process.chdir(directory); await mkdir('results')
  const previous = { worldId: 'w-test', level: 3, seed: 'resume-test', feeMode: 'legacy', networkMode: 'baseline', policy: DEFAULT_POLICY,
    stats: { quoted: 42, declined: { distance: 3 }, refused: [{ action: 'reprice', reason: 'not open' }], complete: true },
    networkState: { attempts: [], blockedDay: -1 } }
  await writeFile('results/w-test.json', JSON.stringify(previous))
  const summary = { worldId: 'w-test', level: 3, kind: 'practice', ended: true, boardRun: null, season: null, parent: null }
  const score = { marginCents: 100, revenueCents: 200, marginShare: .5, wonOrders: 1, onTimeShare: 1, undeliveredShare: 0, ranked: true }
  const fakeWorld = { id: 'w-test', snapshot: async () => ({ now: 0, endsAt: 0, orders: [], gigs: [], openRequests: [], driverPositions: [], score }),
    events: async () => [], roster: async () => [], score: async () => score }
  t.mock.method(Client.prototype, 'map', async () => ({ places: [], roads: [] }))
  t.mock.method(Client.prototype, 'worlds', async () => [summary])
  t.mock.method(Client.prototype, 'world', () => fakeWorld)
  t.mock.method(console, 'log', () => {})
  return { previous, fakeWorld, score }
}

test('CLI resume resolves explicit network override from the saved level and preserves cumulative refusals', async t => {
  const { previous } = await runnerFixture(t)
  await main(['--world', 'w-test', '--network', 'offers'])
  const result = JSON.parse(await readFile('results/w-test.json', 'utf8'))
  assert.equal(result.level, 3)
  assert.equal(result.networkMode, 'offers')
  assert.equal(result.stats.quoted, 42)
  assert.deepEqual(result.stats.refused, previous.stats.refused)
  assert.deepEqual(result.resumes[0].overrides, ['network'])
})

test('failed startup keeps in-flight uncertainty until offer suppression is durable', async t => {
  const { previous, fakeWorld, score } = await runnerFixture(t)
  await writeFile('results/w-test.json', JSON.stringify({ ...previous, networkMode: 'offers', pendingAdvance: true }))
  let snapshots = 0
  t.mock.method(fakeWorld, 'snapshot', async () => {
    if (snapshots++ === 0) throw new Error('snapshot unavailable')
    return { now: 480, endsAt: 480, orders: [], gigs: [], openRequests: [], driverPositions: [], score }
  })
  await assert.rejects(main(['--world', 'w-test']), /snapshot unavailable/)
  const interrupted = JSON.parse(await readFile('results/w-test.json', 'utf8'))
  assert.equal(interrupted.pendingAdvance, true)
  await main(['--world', 'w-test'])
  const recovered = JSON.parse(await readFile('results/w-test.json', 'utf8'))
  assert.equal(recovered.networkState.blockedDay, 0)
  assert.equal(recovered.pendingAdvance, false)
  assert.equal(recovered.stats.complete, false)
})

import { planQuote } from './quotes.ts'
import type { QuoteSettings } from './quotes.ts'
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { Client, SpreadError, Unreachable } from '../vendor/spread/spread.ts'
import type { Action, ActionResult, DeskEvent, DeskEventKind, DeskSnapshot, Order, PostAction, PriceRequest, Score, WorldSummary } from '../vendor/spread/types.ts'
import { Model } from './policy.ts'
import { feeSchedule, targetMultiplier } from './fees.ts'
import type { FeeMode } from './fees.ts'
import { assertBoardSeason, resolveSettings, seedForRun, targetBoardSeason } from './settings.ts'
import { restoreStats } from './recovery.ts'
import type { Statistics } from './recovery.ts'
import { OfferPlanner, chainPosts, restoreNetwork } from './network.ts'
import type { NetworkMode, NetworkState } from './network.ts'

const WAKE: DeskEventKind[] = ['price_request', 'order_won', 'order_cancelled', 'gig_expired', 'deadline_close', 'no_show', 'gig_dropped', 'visit_failed']
type TrackedGig = { action: PostAction; status: string; postedAt: number; multiplier: number }
const euros = (cents: number) => (cents / 100).toFixed(2)
const report = (label: string, s: Score) => console.log(`${label}: margin €${euros(s.marginCents)}, revenue €${euros(s.revenueCents)}, ${s.wonOrders} orders, ${(100 * s.onTimeShare).toFixed(2)}% on time, ranked=${s.ranked}`)

export class Desk {
  now = 0
  requests = new Map<string, PriceRequest>()
  orders = new Map<string, Order>()
  gigs = new Map<string, TrackedGig>()
  outbox: Action[] = []
  heldPosts: { action: PostAction; at: number }[] = []
  seen = new Set<number>()
  stats: Statistics
  model: Model
  readonly level: 1 | 2 | 3 | 4
  readonly mode: FeeMode
  readonly networkMode: NetworkMode
  readonly quoteSettings: QuoteSettings
  network: OfferPlanner
  constructor(model: Model, level: 1 | 2 | 3 | 4 = 1, mode: FeeMode = level === 1 ? 'legacy' : 'stable', stats = restoreStats(), networkMode: NetworkMode = 'baseline', networkState?: NetworkState, quoteSettings: QuoteSettings = { mode: 'first', multiplier: 1 }) {
    this.model = model; this.level = level; this.mode = mode
    this.quoteSettings = quoteSettings
    this.stats = stats
    this.networkMode = networkMode; this.network = new OfferPlanner(networkState)
  }

  private reference(action: PostAction): number {
    return [...new Set(action.stops.map(s => s.orderId))].reduce((sum, id) => sum + (this.requests.get(id)?.referenceFeeCents ?? 0), 0)
  }

  private covered(orderId: string, leg = 0): boolean {
    const matches = (action: PostAction) => action.stops.some(s => s.orderId === orderId && s.leg === leg)
    return [...this.gigs.values()].some(g => ['open', 'booked', 'working'].includes(g.status) && matches(g.action)) ||
      this.outbox.some(a => a.type === 'post' && matches(a)) || this.heldPosts.some(p => matches(p.action))
  }

  nextWake(): number { return Math.min(this.now + 30, ...this.heldPosts.map(p => p.at + 10)) }

  private activeFee(action: PostAction): number {
    return (action.schedule.filter(step => step.at <= this.now).at(-1) ?? action.schedule[0])!.feeCents
  }

  private discardGigActions(gigId: string) {
    this.outbox = this.outbox.filter(action => !('gigId' in action) || action.gigId !== gigId)
  }

  rebuild(snapshot: DeskSnapshot, events: DeskEvent[]) {
    this.now = snapshot.now
    for (const e of events) {
      this.seen.add(e.seq)
      if (e.kind === 'price_request') this.requests.set(e.request.id, e.request)
    }
    for (const order of snapshot.orders) this.orders.set(order.id, order)
    for (const gig of snapshot.gigs) {
      const action: PostAction = { type: 'post', stops: gig.stops, audience: gig.audience, schedule: gig.schedule }
      const reference = this.reference(action) || gig.feeCents
      this.gigs.set(gig.id, { action, status: gig.status, postedAt: gig.postedAt, multiplier: this.activeFee(action) / reference })
    }
    for (const request of snapshot.openRequests) this.quote(request, true)
    for (const order of snapshot.orders) {
      // Original collection timestamps may be unavailable after a crash: publish recovery work now.
      if (order.status === 'waiting') this.post(order, undefined, false)
    }
  }

  quote(request: PriceRequest, replay = false) {
    if (!replay && this.requests.has(request.id)) return
    this.requests.set(request.id, request)
    if (this.level === 4) {
      const action = planQuote(this.model, request, this.now, this.quoteSettings)
      if (action) { this.stats.quoted++; this.outbox.push(action) }
      return
    }
    const decision = this.model.assess(request, this.now)
    if (!decision.accept) {
      this.stats.declined[decision.reason] = (this.stats.declined[decision.reason] ?? 0) + 1
      return
    }
    this.stats.quoted++
    const option = request.options[0]!
    this.outbox.push({ type: 'quote', requestId: request.id, prices: { [option.kind]: option.listPriceCents } })
  }

  post(order: Order, multiplier?: number, collect = true) {
    const request = this.requests.get(order.id)
    if (!request || order.status === 'cancelled') return
    for (let leg = 0; leg < order.legs.length; leg++) {
      if (order.deliveredAt[leg] !== null || this.covered(order.id, leg)) continue
      // Deliberately losing quotes can theoretically win excluded multi-leg work.
      // Dispatch each uncovered car separately at the full reference as a rescue.
      const single = { ...order, legs: [order.legs[leg]!] }
      const action = this.model.post(single, request.referenceFeeCents, this.now, multiplier)
      action.stops = action.stops.map(stop => ({ ...stop, leg }))
      action.schedule = feeSchedule(this.level, this.mode, this.now, request.referenceFeeCents, {
        ...this.model.policy, openingMultiplier: multiplier ?? this.model.policy.openingMultiplier,
      })
      if (this.level >= 3 && this.networkMode === 'chains' && collect && order.legs.length === 1) this.heldPosts.push({ action, at: this.now })
      else this.outbox.push(action)
    }
  }

  handle(e: DeskEvent) {
    if (this.seen.has(e.seq)) return
    this.seen.add(e.seq)
    if (e.kind === 'price_request') this.quote(e.request)
    else if (e.kind === 'gig_viewed') this.network.viewed(e.gigId, e.driverId, e.at)
    else if (e.kind === 'offer_answered') this.network.answered(e.gigId, e.driverId)
    else if (e.kind === 'order_won') { this.orders.set(e.order.id, e.order); this.post(e.order) }
    else if (e.kind === 'order_cancelled') {
      const order = this.orders.get(e.orderId)
      if (order) order.status = 'cancelled'
      this.outbox = this.outbox.filter(a => a.type !== 'post' || !a.stops.some(s => s.orderId === e.orderId))
      this.heldPosts = this.heldPosts.filter(p => !p.action.stops.some(s => s.orderId === e.orderId))
      for (const cancelled of e.gigs) {
        this.discardGigActions(cancelled.gigId)
        const gig = this.gigs.get(cancelled.gigId)
        if (gig) {
          const survivors = [...new Set(gig.action.stops.map(s => s.orderId))].filter(id => id !== e.orderId)
          if (cancelled.outcome === 'withdrawn' || cancelled.outcome === 'released') {
            gig.status = 'withdrawn'
            for (const id of survivors) { const survivor = this.orders.get(id); if (survivor) this.post(survivor) }
          } else gig.action = { ...gig.action, stops: gig.action.stops.filter(s => s.orderId !== e.orderId) }
        }
      }
    } else if (e.kind === 'gig_booked' || e.kind === 'gig_started' || e.kind === 'gig_dropped' || e.kind === 'no_show') {
      const gig = this.gigs.get(e.gigId)
      if (gig) gig.status = e.kind === 'gig_booked' ? 'booked' : e.kind === 'gig_started' ? 'working' : 'open'
      if (e.kind === 'gig_booked' || e.kind === 'gig_started') this.discardGigActions(e.gigId)
    } else if (e.kind === 'delivered') {
      const order = this.orders.get(e.orderId)
      if (order) { order.deliveredAt[e.leg] = e.at; if (order.deliveredAt.every(t => t !== null)) order.status = 'delivered' }
      const gig = this.gigs.get(e.gigId)
      if (gig && gig.action.stops.filter(s => s.kind === 'delivery').every(s => {
        const covered = this.orders.get(s.orderId)
        return covered?.status === 'cancelled' || covered?.deliveredAt[s.leg] != null
      })) gig.status = 'done'
      this.discardGigActions(e.gigId)
    } else if (e.kind === 'gig_expired') {
      const gig = this.gigs.get(e.gigId)
      if (gig) {
        this.discardGigActions(e.gigId)
        gig.status = 'withdrawn'
        for (const id of new Set(gig.action.stops.map(s => s.orderId))) {
          const order = this.orders.get(id)
          if (order) this.post(order, 1.8)
        }
      }
    } else if (e.kind === 'deadline_close') {
      this.raise(e.orderId, 1.65)
    } else if (e.kind === 'visit_failed') {
      throw new Error(`Unexpected Level ${this.level} visit failure: ${e.orderId} ${e.reason}; resume this world with --world after inspecting its snapshot`)
    }
  }

  raise(orderId: string, multiplier: number) {
    const request = this.requests.get(orderId)
    if (!request || this.orders.get(orderId)?.status === 'cancelled') return
    for (const [gigId, gig] of this.gigs) {
      if (gig.status !== 'open' || !gig.action.stops.some(s => s.orderId === orderId)) continue
      const cents = Math.max(1, Math.round(this.reference(gig.action) * multiplier))
      const pending = this.outbox.find(action => action.type === 'reprice' && action.gigId === gigId)
      const pendingFee = pending?.type === 'reprice' ? pending.schedule[0]!.feeCents : 0
      if (cents <= Math.max(this.activeFee(gig.action), pendingFee)) continue
      this.discardGigActions(gigId)
      this.outbox.push({ type: 'reprice', gigId, schedule: [{ at: this.now, feeCents: cents }] })
    }
  }

  tick() {
    if (this.heldPosts.some(p => this.now >= p.at + 10 || p.action.stops.some(s => (this.orders.get(s.orderId)?.lastPickupAt ?? Infinity) - this.now <= 210))) {
      for (const pending of this.heldPosts.splice(0)) {
        const delta = this.now - pending.at
        this.outbox.push({ ...pending.action, schedule: pending.action.schedule.map(step => ({ ...step, at: step.at + delta })) })
      }
    }
    for (const gig of this.gigs.values()) {
      if (gig.status !== 'open') continue
      const order = this.orders.get(gig.action.stops[0]!.orderId)
      if (!order) continue
      const age = this.now - gig.postedAt
      const reference = this.reference(gig.action)
      gig.multiplier = this.activeFee(gig.action) / reference
      const remaining = gig.action.stops.filter(s => s.kind === 'pickup' && this.orders.get(s.orderId)?.deliveredAt[s.leg] == null)
      const lastPickupAt = Math.min(...remaining.map(s => this.orders.get(s.orderId)!.lastPickupAt))
      const multiplier = targetMultiplier(this.mode, age, lastPickupAt - this.now, this.model.policy.openingMultiplier)
      this.raise(order.id, multiplier)
    }
    if (this.level >= 3 && this.networkMode === 'chains') {
      const posts = this.outbox.filter((a): a is PostAction => a.type === 'post')
      this.outbox = [...this.outbox.filter(a => a.type !== 'post'), ...chainPosts(posts, this.orders, this.requests, this.model, this.now, this.level as 3 | 4, this.mode)]
    }
    if (this.level >= 3 && this.networkMode !== 'baseline') {
      const alreadyQueued = new Set(this.outbox.filter(a => a.type === 'offer').map(a => a.gigId))
      this.outbox.push(...this.network.plan(this.gigs, this.orders, this.requests, this.model, this.now).filter(a => !alreadyQueued.has(a.gigId)))
    }
  }

  results(actions: Action[], results: ActionResult[]) {
    actions.forEach((action, i) => {
      const result = results[i]
      if (!result) throw new Error('Missing action result')
      if (!result.ok) {
        this.stats.refused.push({ action: action.type, reason: result.reason })
        console.error(`REFUSED ${action.type}: ${result.reason}`)
        return
      }
      if (action.type === 'post') {
        if (action.stops.filter(s => s.kind === 'pickup').length > 1) this.stats.chainsPosted++
        const reference = this.reference(action)
        this.gigs.set(result.id, { action, status: 'open', postedAt: this.now, multiplier: action.schedule[0]!.feeCents / reference })
      } else if (action.type === 'offer') this.network.sent(action, this.now)
      else if (action.type === 'reprice') {
        const gig = this.gigs.get(action.gigId)
        if (gig) {
          gig.action = { ...gig.action, schedule: action.schedule }
          gig.multiplier = this.activeFee(gig.action) / this.reference(gig.action)
        }
      }
    })
  }
}

export async function main(argv = process.argv.slice(2)) {
  const { values: args } = parseArgs({ args: argv, options: {
    level: { type: 'string' }, seed: { type: 'string' },
    board: { type: 'boolean' }, runs: { type: 'string', default: '1' },
    world: { type: 'string' }, status: { type: 'boolean' },
    opening: { type: 'string' }, 'reference-share': { type: 'string' }, 'fee-mode': { type: 'string' },
    network: { type: 'string' }, 'quote-mode': { type: 'string' }, 'quote-multiplier': { type: 'string' },
  } })
  // Resume overrides need the saved world's level before validating network features.
  let settings = resolveSettings(args.world && !args.status ? { level: args.level } : args)
  const runs = Number(args.runs)
  if (!Number.isInteger(runs) || runs < 1 || runs > 5) throw new Error('--runs must be 1 to 5')
  const client = new Client()
  if (args.status) {
    const board = await client.board(settings.level)
    console.log(JSON.stringify({ worlds: await client.worlds(), round: board.current?.name, teams: board.current?.teams.filter(t => t.played > 0) }, null, 2))
    return
  }
  await mkdir('results', { recursive: true })
  const map = await client.map()
  const summaries: WorldSummary[] = await client.worlds()
  let saved: any
  if (args.world) {
    const summary = summaries.find(w => w.worldId === args.world)
    if (!summary) throw new Error('Requested world was not found on the team key')
    saved = await readFile(`results/${summary.worldId}.json`, 'utf8').then(text => JSON.parse(text), error => {
      if (error.code !== 'ENOENT') throw error
      return undefined
    })
    settings = resolveSettings(args, saved, summary)
    if (args.board && !summary.boardRun) throw new Error('--board cannot resume an unranked practice world')
  }
  const { level, mode, policy, network, quotes } = settings
  const before = args.board ? await client.board(level) : null
  if (args.board && !before?.current) throw new Error('No ranking round is open')
  const expectedSeason = args.board ? targetBoardSeason(before!.current!.season, args.world ? summaries.find(w => w.worldId === args.world) : undefined) : null
  const activeBoard = summaries.find(w => w.level === level && w.boardRun && !w.ended)
  if (args.board && activeBoard && !args.world) throw new Error(`Ranking world ${activeBoard.worldId} is already active. Resume with --board --world ${activeBoard.worldId}`)
  const completed = []
  for (let index = 0; index < runs; index++) {
    const resuming = index === 0 && Boolean(args.world)
    const seed = seedForRun(settings.seed, index, runs, resuming)
    if (args.board && index > 0 && (await client.board(level)).current?.season !== expectedSeason) throw new Error('Ranking season changed; stopping before creating another attempt')
    const world = resuming ? client.world(args.world!) : await client.create(level, args.board ? { board: true } : { seed: seed ?? undefined })
    const summary = (await client.worlds()).find(w => w.worldId === world.id)!
    if (summary.level !== level || summary.kind !== 'practice') throw new Error(`Can only play Level ${level} practice or ranking worlds`)
    const resultPath = `results/${world.id}.json`
    const previous = resuming ? saved : undefined
    const effectiveSettings = { level, feeMode: mode, networkMode: network, quoteSettings: quotes, seed, policy }
    const record = { ...previous, worldId: world.id, seed: summary.boardRun ? null : seed, level, feeMode: mode, networkMode: network, quoteSettings: quotes, networkRevision: 2, board: Boolean(summary.boardRun), season: summary.season, boardRun: summary.boardRun, policy,
      originalSettings: previous?.originalSettings ?? (previous ? { level: previous.level, feeMode: previous.feeMode, networkMode: previous.networkMode, quoteSettings: previous.quoteSettings, networkRevision: previous.networkRevision, seed: previous.seed, policy: previous.policy } : effectiveSettings),
      startedAt: previous?.startedAt ?? new Date().toISOString(), resumes: resuming ? [...(previous?.resumes ?? []), { at: new Date().toISOString(), overrides: settings.overrides, settings: effectiveSettings }] : [] }
    let networkState: NetworkState | undefined = previous?.networkState
    const persist = async (stats: Statistics, pendingAdvance = false) => writeFile(resultPath, JSON.stringify({ ...record, stats, networkState, pendingAdvance }, null, 2) + '\n')
    const stats = restoreStats(resuming ? previous ?? {} : undefined)
    await persist(stats, Boolean(previous?.pendingAdvance))
    if (args.board && !resuming) assertBoardSeason(expectedSeason!, summary)
    console.log(`${summary.boardRun ? `Ranking ${summary.boardRun}/5` : 'Practice'} world ${world.id}`)
    let snapshot = await world.snapshot()
    networkState = restoreNetwork(networkState, snapshot.now, resuming && (!networkState || Boolean(previous?.pendingAdvance)))
    let desk = new Desk(new Model(map, await world.roster(), policy), level, mode, stats, network, networkState, quotes)
    networkState = desk.network.state
    // Only clear an in-flight marker once its conservative offer block is durably recorded.
    await persist(desk.stats)
    desk.rebuild(snapshot, await world.events())
    let previousDay = Math.floor(desk.now / 1440)
    while (desk.now < snapshot.endsAt) {
      desk.tick()
      const actions = desk.outbox.splice(0)
      await persist(desk.stats, actions.length > 0)
      try {
        const step = await world.advance({ untilEvent: WAKE, max: Math.min(snapshot.endsAt, desk.nextWake()), actions })
        desk.results(actions, step.results)
        await persist(desk.stats)
        desk.now = step.now
        for (const e of step.events) desk.handle(e)
      } catch (error) {
        if (!(error instanceof Unreachable)) throw error
        console.error(`Connection interrupted for ${world.id}; rebuilding state in 5 seconds`)
        await new Promise(resolve => setTimeout(resolve, 5000))
        snapshot = await world.snapshot()
        desk = new Desk(desk.model, level, mode, restoreStats({ stats: desk.stats }, actions.length > 0), network, restoreNetwork(desk.network.state, snapshot.now, true), quotes)
        networkState = desk.network.state
        desk.rebuild(snapshot, await world.events())
      }
      const day = Math.floor(desk.now / 1440)
      if (day > previousDay) { report(`Day ${previousDay + 1}`, await world.score()); previousDay = day }
    }
    const score = await world.score()
    report(`End ${world.id}`, score)
    await writeFile(resultPath, JSON.stringify({ ...record, networkState: desk.network.state, pendingAdvance: false, finishedAt: new Date().toISOString(), score, stats: desk.stats }, null, 2) + '\n')
    completed.push({ worldId: world.id, season: summary.season, boardRun: summary.boardRun, score })
    if (summary.boardRun && !score.ranked) throw new Error(`Ranking run missed the delivery minimum; pausing before consuming another secret week. Inspect ${resultPath}`)
    if (summary.boardRun && (!desk.stats.complete || desk.stats.refused.length)) throw new Error(`Ranking evidence is incomplete or contains refused actions; inspect ${resultPath} before another attempt`)
  }
  if (args.board) {
    await new Promise(resolve => setTimeout(resolve, 2200))
    const board = await client.board(level)
    const season = [board.current, board.previous].find(s => s?.season === completed[0]?.season)
    const ownRuns = completed.filter(r => r.season === season?.season)
    const teams = season?.teams.filter(t => ownRuns.length > 0 && ownRuns.every(own => t.runs.some(r => r.run === own.boardRun && r.marginCents === own.score.marginCents && r.wonOrders === own.score.wonOrders && r.onTimeShare === own.score.onTimeShare)))
    const summary = { checkedAt: new Date().toISOString(), round: season?.name, season: season?.season, teams, completed }
    await writeFile(`results/leaderboard-level-${level}-season-${season?.season}.json`, JSON.stringify(summary, null, 2) + '\n')
    console.log(JSON.stringify(summary, null, 2))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main().catch(error => {
  console.error(error instanceof SpreadError ? error.message : error)
  console.error('Worlds are preserved on errors. Resume with --world WORLD_ID; ranking attempts are never automatically deleted.')
  process.exitCode = 1
})

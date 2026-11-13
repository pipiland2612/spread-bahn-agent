import { validateQuotes } from './quotes.ts'
import type { QuoteSettings } from './quotes.ts'
import { DEFAULT_POLICY, validatePolicy } from './policy.ts'
import type { Policy } from './policy.ts'
import type { FeeMode } from './fees.ts'
import type { WorldSummary } from '../vendor/spread/types.ts'
import type { NetworkMode } from './network.ts'

export type SavedSettings = { worldId?: string; level: number; feeMode?: string; networkMode?: string; networkRevision?: number; quoteSettings?: QuoteSettings; seed?: string | null; policy: Policy }
export type RunSettings = { level: 1 | 2 | 3 | 4; quotes: QuoteSettings; mode: FeeMode; network: NetworkMode; seed: string | null; policy: Policy; overrides: string[] }

export function resolveSettings(args: Record<string, string | boolean | undefined>, manifest?: SavedSettings, world?: WorldSummary): RunSettings {
  if (args.level !== undefined && (typeof args.level !== 'string' || !/^[1234]$/.test(args.level))) throw new Error('level must be 1, 2, 3 or 4')
  const level = Number(args.level ?? manifest?.level ?? world?.level ?? 1)
  if (level !== 1 && level !== 2 && level !== 3 && level !== 4) throw new Error('Only levels 1–4 are supported')
  if (world && (world.level !== level || (manifest && manifest.level !== world.level))) throw new Error('Resume level does not match the world')
  if (manifest?.worldId && world && manifest.worldId !== world.worldId) throw new Error('Manifest belongs to another world')
  if (world && !manifest && ['level', 'opening', 'reference-share', 'fee-mode'].some(key => args[key] === undefined)) {
    throw new Error('Missing local manifest: supply --level, --opening, --reference-share and --fee-mode to explicitly restore policy')
  }
  if (world && !manifest && level >= 3 && args.network === undefined) throw new Error('Missing Level 3 manifest: also supply --network explicitly')
  if (world && manifest?.networkMode === 'chains' && manifest.networkRevision !== 2 && args.network === undefined) throw new Error('Old chain revision: explicitly choose --network to acknowledge the changed dispatch policy')
  const mode = args['fee-mode'] ?? manifest?.feeMode ?? 'legacy'
  if (mode !== 'legacy' && mode !== 'stable' && mode !== 'delayed') throw new Error('fee-mode must be legacy, stable or delayed')
  const network = args.network ?? manifest?.networkMode ?? (level >= 3 && !manifest ? 'offers' : 'baseline')
  if (!['baseline', 'offers', 'chains'].includes(network as string) || (level < 3 && network !== 'baseline')) throw new Error('network must be baseline, offers or chains; offers/chains require Level 3')
  if (world && !manifest && level === 4 && (args['quote-mode'] === undefined || args['quote-multiplier'] === undefined)) throw new Error('Missing Level 4 manifest: supply quote-mode and quote-multiplier')
  if (level < 4 && (args['quote-mode'] !== undefined || args['quote-multiplier'] !== undefined)) throw new Error('Quote settings require Level 4')
  const quoteRaw = args['quote-multiplier']
  if (quoteRaw !== undefined && (typeof quoteRaw !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(quoteRaw))) throw new Error('quote-multiplier must be a positive finite decimal')
  const quotes = { mode: args['quote-mode'] ?? manifest?.quoteSettings?.mode ?? 'first', multiplier: quoteRaw === undefined ? manifest?.quoteSettings?.multiplier ?? 1 : Number(quoteRaw) } as QuoteSettings
  validateQuotes(quotes)
  const policy = { ...DEFAULT_POLICY, ...(level >= 2 ? { maxReferenceShare: 1.2 } : {}), ...manifest?.policy }
  const overrides: string[] = []
  for (const [argument, field] of [['opening', 'openingMultiplier'], ['reference-share', 'maxReferenceShare']] as const) {
    const raw = args[argument]
    if (raw === undefined) continue
    if (typeof raw !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error(`${argument} must be a positive finite decimal`)
    policy[field] = Number(raw)
    if (world) overrides.push(argument)
  }
  validatePolicy(policy)
  if (world && args['fee-mode'] !== undefined) overrides.push('fee-mode')
  for (const key of ['quote-mode', 'quote-multiplier']) if (world && args[key] !== undefined) overrides.push(key)
  if (world && args.network !== undefined) overrides.push('network')
  if (args.seed !== undefined && typeof args.seed !== 'string') throw new Error('seed must be text')
  if (world && args.seed !== undefined && args.seed !== manifest?.seed) throw new Error('Cannot change the seed of an existing world')
  const seed = world ? manifest?.seed ?? null : (args.seed as string | undefined) ?? 'spread-1'
  return { level, mode, quotes, network: network as NetworkMode, policy, seed, overrides }
}

export function assertBoardSeason(expected: number, world: WorldSummary): void {
  if (world.season !== expected || !world.boardRun) throw new Error(`Ranking season changed: expected ${expected}, world ${world.worldId} is in season ${world.season}. World is preserved.`)
}

export function targetBoardSeason(current: number, resumed?: WorldSummary): number {
  return resumed?.boardRun && resumed.season !== null ? resumed.season : current
}

export function seedForRun(seed: string | null, index: number, runs: number, resuming: boolean): string | null {
  return resuming || runs === 1 ? seed : `${seed}-${index + 1}`
}

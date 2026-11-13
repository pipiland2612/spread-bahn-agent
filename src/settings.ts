import { DEFAULT_POLICY, validatePolicy } from './policy.ts'
import type { Policy } from './policy.ts'
import type { FeeMode } from './fees.ts'
import type { WorldSummary } from '../vendor/spread/types.ts'

export type SavedSettings = { worldId?: string; level: number; feeMode?: string; seed?: string | null; policy: Policy }
export type RunSettings = { level: 1 | 2; mode: FeeMode; seed: string | null; policy: Policy; overrides: string[] }

export function resolveSettings(args: Record<string, string | boolean | undefined>, manifest?: SavedSettings, world?: WorldSummary): RunSettings {
  if (args.level !== undefined && (typeof args.level !== 'string' || !/^[12]$/.test(args.level))) throw new Error('level must be 1 or 2')
  const level = Number(args.level ?? manifest?.level ?? world?.level ?? 1)
  if (level !== 1 && level !== 2) throw new Error('Only level 1 and 2 are supported')
  if (world && (world.level !== level || (manifest && manifest.level !== world.level))) throw new Error('Resume level does not match the world')
  if (manifest?.worldId && world && manifest.worldId !== world.worldId) throw new Error('Manifest belongs to another world')
  if (world && !manifest && ['level', 'opening', 'reference-share', 'fee-mode'].some(key => args[key] === undefined)) {
    throw new Error('Missing local manifest: supply --level, --opening, --reference-share and --fee-mode to explicitly restore policy')
  }
  const mode = args['fee-mode'] ?? manifest?.feeMode ?? 'legacy'
  if (mode !== 'legacy' && mode !== 'stable' && mode !== 'delayed') throw new Error('fee-mode must be legacy, stable or delayed')
  const policy = { ...DEFAULT_POLICY, ...(level === 2 ? { maxReferenceShare: 1.2 } : {}), ...manifest?.policy }
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
  if (args.seed !== undefined && typeof args.seed !== 'string') throw new Error('seed must be text')
  if (world && args.seed !== undefined && args.seed !== manifest?.seed) throw new Error('Cannot change the seed of an existing world')
  const seed = world ? manifest?.seed ?? null : (args.seed as string | undefined) ?? 'spread-1'
  return { level, mode, policy, seed, overrides }
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

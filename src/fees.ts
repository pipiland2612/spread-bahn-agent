import type { FeeStep } from '../vendor/spread/types.ts'
import { validatePolicy } from './policy.ts'
import type { Policy } from './policy.ts'

export type FeeMode = 'legacy' | 'stable' | 'delayed'

export function feeSchedule(level: 1 | 2 | 3, mode: FeeMode, now: number, reference: number, policy: Policy): FeeStep[] {
  validatePolicy(policy)
  if (![1, 2, 3].includes(level) || !['legacy', 'stable', 'delayed'].includes(mode)) throw new Error('Unsupported level or fee mode')
  if (!Number.isInteger(now) || now < 0 || !Number.isInteger(reference) || reference < 1) throw new Error('Fees require positive integer cents and nonnegative integer minutes')
  const opening = Math.max(1, Math.round(reference * policy.openingMultiplier))
  const steps = [{ at: now, feeCents: opening }]
  if (level >= 2 && mode === 'delayed') steps.push({ at: now + 120, feeCents: Math.max(opening, Math.round(reference * 1.05)) })
  return steps
}

export function targetMultiplier(mode: FeeMode, age: number, minutesLeft: number, opening: number): number {
  if (minutesLeft <= 180) return Math.max(opening, 1.65)
  if (mode === 'legacy') return Math.max(opening, age >= 120 ? 1.2 : age >= 60 ? 1.05 : opening)
  if (mode === 'delayed' && age >= 120) return Math.max(opening, 1.05)
  return opening
}

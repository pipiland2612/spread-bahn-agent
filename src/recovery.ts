export type Statistics = {
  quoted: number
  declined: Record<string, number>
  refused: { action: string; reason: string }[]
  complete: boolean
  chainsPosted: number
}

export function restoreStats(previous?: { stats?: Partial<Statistics>; pendingAdvance?: boolean }, uncertain = false): Statistics {
  const saved = previous?.stats
  return {
    quoted: saved?.quoted ?? 0,
    declined: { ...saved?.declined },
    refused: [...(saved?.refused ?? [])],
    chainsPosted: saved?.chainsPosted ?? 0,
    complete: !uncertain && !previous?.pendingAdvance && (!previous || Boolean(saved)) && saved?.complete !== false,
  }
}

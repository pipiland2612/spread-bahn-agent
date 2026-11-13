# Level 4 execution record

The user delegated approach and execution decisions and opted out of approval questions. Used Superpowers brainstorming, writing-plans, executing-plans, test-driven-development and verification-before-completion. Fixed-price experiments were selected before adaptive learning. Code work is on `codex/level-4`, based on main `df4e723` after PR #3 merged.

## Implementation and verification

The first Level 4 tests demonstrated missing quote planner behavior, a Desk that omitted later feasible options, and rejected Level 4 settings. Implementation produced a green 68-test suite. Pure planning checks cover actual quoted prices, deadlines, integer cents, declines and expiration. Vendor files remain unchanged and no dependencies were added.

A fresh whole-branch reviewer found two recovery gaps:

1. An existing Level 4 manifest without complete quote settings could silently reset mode/multiplier. The regression failed with `Missing expected exception`; explicit recovery is now required for missing values. Suite: 69 passing.
2. A theoretical win of a high decline quote for excluded two-leg work posted only leg 0. The regression failed with one post rather than two. Coverage and recovery now operate per leg, and every uncovered car is dispatched separately. Each such fallback leg receives the full reference fee conservatively; this rescue is not evidence of profitable trade-in acceptance. Suite: 70 passing.

Ruling: keep the existing ranked-run stop at the official qualification threshold (90%), plus complete evidence and zero refused actions. The stricter 95% gate applies to every practice validation week, not to secret ranked outcomes. A ranked result below 90% stops before the next attempt.

Ruling: fixes to incomplete-manifest recovery and unexpected two-leg rescue were made while tuning ran. Valid complete-manifest, eligible single-leg quote decisions are unchanged; no such unexpected wins or refusals have been observed so far. Preserve exact manifests for audit.

## Experiments

Matched tuning and independent holdout results will be recorded in `docs/LEVEL-4-RESULTS.md` once complete. Do not treat intermediate week scores as final results. Ranking entry requires the design's promotion gates.

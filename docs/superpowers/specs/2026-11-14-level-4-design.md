# Level 4: competitive quotes

The user authorized implementation, experiments and leaderboard entry and opted out of routine approval questions. Retain Node/TypeScript, no dependencies and unmodified official kit. Implement natively with a fresh final review.

## Approaches

Compare fixed prices first (selected by agent under delegated authority). Adaptive win/loss learning is deferred until a measured competitive baseline exists. Extending Level 3 unchanged is the comparator, not a claim of competitive optimization.

## Behavior

Support Levels 1–4, preserving Levels 1–3 behavior. New Level 4 worlds use existing legacy fees and direct offers. Quote settings are mode `first` or `options` and a positive finite multiplier of each option's list price. Assess each offered option independently using its deadline and actual quoted price for the reference/price filter. `first` assesses only the first option; `options` offers all feasible options. Preserve integer-cent amounts. At Level 4, send a deliberately losing quote at 100 times list price when no option is eligible, rather than incur the unquoted goodwill penalty; never quote expired requests. This follows the official recommendation, not a guarantee of rejection. Any unexpected win is dispatched normally. Continue excluding private and trade-in requests from eligible work.

Persist quote mode/multiplier in checkpoints, original settings and resume overrides. Missing Level 4 manifests require explicit quote settings and network settings. Levels 5–8/live final remain unsupported.

## Evidence and entry

Use three `quotes-tune-N` seeds for the first/list-price baseline and options at multipliers 0.9, 1.0 and 1.1. Select highest aggregate eligible margin; every week must be >=95% on time, positive aggregate margin, zero refused actions and complete evidence. Compare tuning winner against baseline on three untouched `quotes-holdout-N` seeds. Promote a changed policy only if held-out total exceeds baseline and it passes all gates; otherwise retain a qualifying baseline. If neither qualifies, stop before leaderboard entry and report it. At most four active experiment worlds. Preserve worlds on errors. Then play up to five available Level 4 ranking worlds sequentially, stopping after any unqualified or incomplete run and on season changes. Save exact leaderboard evidence with check time. Do not fork, reveal or delete ranking worlds. Publish code, evidence, limitations and a PR without merging it.

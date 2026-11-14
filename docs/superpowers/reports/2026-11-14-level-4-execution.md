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

## Network diagnostic during tuning

Two 1.10× tuning worlds rebuilt after interrupted advances and ended with incomplete statistics. They were excluded by the original gate despite their higher raw aggregate margin. These historical manifests are not rewritten or reclassified.

Inspection exposed an existing conservative false negative: even an advance with zero actions marked action evidence uncertain. A full CLI regression failed (`false !== true`) before the fix and passed after it. Empty advances now preserve known evidence; nonempty interrupted batches retain the incomplete-evidence guard. This also avoids writing an in-flight action marker for an empty action list. Final suite: 71 passing. Network recovery still conservatively blocks offers for the current day. Running experiments retain their loaded code version; no historical evidence is relabeled.

An authoritative snapshot audit of all 12 tuning worlds found no multi-leg or private-address wins, including cancelled orders. The per-leg rescue change therefore did not alter those experiment workloads. Counts are saved in `results/level4-tuning-order-audit.json`.

## Promotion

The eligible tuning winner was all-options quoting at list price. Four interrupted original holdouts were repeated with the same seeds and fixed policies, with originals preserved. Two repeats used idle slots while the remaining original candidate worlds finished; active experiment worlds never exceeded four. All six reported holdouts have complete evidence and zero refused actions. Selected margin €11,444.38 versus €11,334.01 baseline (+0.97%); worst selected on-time week 96.61%. The candidate lost on the second paired seed; no robust broad advantage is claimed from three weeks.

Defaults were promoted only after those results. A consumer-level regression first failed because new Level 4 defaults declined a request with a feasible later option; after promotion it emitted the validated later-option quote. Saved first-option settings still restore unchanged. Full suite: 72 passing. Ranking runs receive explicit settings, so changing defaults does not change their configuration mid-run.

The original reviewer verified the subsequent recovery/default changes and reported evidence. It reconciled all six clean holdouts to €11,444.38 versus €11,334.01, confirmed originals and exclusions are disclosed, found no material remaining correctness/reporting issues, and detected no credentials in the tracked diff. Its full suite run passed all 72 tests. No second reviewer or API mutations were used for this verification.


## Ranked result and final verification

All five season-4 Level 4 ranking weeks qualified with complete evidence and zero refused actions. T2 was rank 4 in `Saturday 00:00`, checked at `2026-11-14T00:17:53.676Z` (02:17 Helsinki time). Total margin €17,906.90, 99.38% on time across 1,463 orders. All cars were eventually delivered. Ranking worlds were never forked, revealed or deleted. A second fresh API read agreed with all five scores and rank; no unfinished Level 4 ranking worlds remained.

The 0.97% held-out gain remains a modest three-week aggregate improvement, with one losing pair. Ranking seeds differ from the holdouts and are not evidence of an isolated quote-policy gain. Levels 5–8 and the live final remain out of scope. The feature is published as PR #4 without merging it.

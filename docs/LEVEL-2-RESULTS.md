# Level 2 experiments

## Approach

Level 2 adds driver learning and booking drops. The agent supports three fee modes: legacy age-based raises, stable fees with deadline rescue, and delayed schedules with one raise after 120 minutes. All modes use the same feasibility checks, charging rules, cancellation handling, and 180-minute rescue threshold.

## Matched tuning weeks

Three identical seeds per configuration: `market-tune-1`, `market-tune-2`, and `market-tune-3`. Opening fee and selection threshold are shown explicitly because some configurations change both. These are policy comparisons, not isolated causal estimates of driver learning.

| Mode | Opening/reference | Max reference/list price | Three-week margin | Worst on time | Refused actions |
| --- | ---: | ---: | ---: | ---: | ---: |
| Legacy baseline | 0.75 | 1.05 | €18,100.71 | 98.86% | 0 |
| Stable | 0.80 | 1.05 | €14,907.66 | 97.83% | 0 |
| Delayed | 0.65 | 1.05 | €11,624.31 | 98.19% | 0 |
| Legacy, higher opening | 0.85 | 1.05 | €18,667.31 | 99.28% | 0 |
| **Legacy, broader selection** | **0.75** | **1.20** | **€19,024.22** | **98.63%** | **0** |

The best tuning total comes from broader selection, with the existing raise logic. Stable and delayed fee experiments did not improve margin on these seeds. The selected policy remains an empirical rule; the agent does not observe hidden driver costs or infer them from views alone.

## Independent validation

The tuning winner and baseline were evaluated on `market-holdout-1` through `market-holdout-3`. The gate requires at least 95% on time in every week, positive total margin, higher total margin than baseline, and zero refused actions before promotion or ranked entry.

| Seed | Baseline margin | Selected policy margin | Selected policy on time | Orders |
| --- | ---: | ---: | ---: | ---: |
| `market-holdout-1` | €5,677.22 | €5,640.43 | 98.67% | 601 |
| `market-holdout-2` | €5,842.03 | €6,239.80 | 98.86% | 613 |
| `market-holdout-3` | €6,685.29 | €6,730.61 | 99.35% | 614 |
| **Total** | **€18,204.54** | **€18,610.84** | **98.67% worst week** | **1,828** |

Aggregate margin improved **2.23%**. The first seed earned €36.79 less than baseline, so this is a modest aggregate improvement, not a win on every week. All three selected-policy runs have zero refused actions and qualify. Level 2 defaults are now legacy mode, 0.75 opening/reference, and 1.20 maximum reference/list price. Level 1 keeps its separately validated 1.05 threshold.

## Ranked round

T2 completed all five Level 2 weeks of season 3, **Friday 20:01**. The API reported **rank 2** at 23:48 Helsinki time on 13 November 2026.

**Total margin: €31,612.14. On time: 99.16%, across 2,972 orders.** Every week qualified. All cars were eventually delivered, and no API actions were refused in these runs.

| Ranked week | Margin | On time | Orders | World |
| --- | ---: | ---: | ---: | --- |
| 1 | €7,190.04 | 99.65% | 578 | `wf0c6cb50294ff1098f1e` |
| 2 | €5,791.31 | 98.36% | 611 | `w6169611bb6c1e15d4452` |
| 3 | €5,999.79 | 99.33% | 594 | `w5f17ceae64244b596f54` |
| 4 | €6,003.30 | 98.85% | 608 | `waf3e7a276b1797f61e5a` |
| 5 | €6,627.70 | 99.66% | 581 | `w268394fd574e266c052a` |

The [saved leaderboard response](../results/leaderboard-level-2-season-3.json) records this check. Live rank can change. Level 1 and Level 2 use different worlds, so their ranked totals are not a causal before/after comparison.

## Implementation checks

The local suite covers fee schedules, configuration validation, stale reprices after booking/cancellation/expiry, dropped bookings, no-shows, confirmed versus proposed fees, active schedule restoration, policy-preserving resume, and ranking-season changes. Official client and generated types remain unmodified.

Independent review found that recovery could reset cumulative refusal statistics. The fix retains statistics across rebuilds and explicit resumes, checkpoints before and after advances, and marks unknown action outcomes as incomplete. Incomplete evidence or refused actions stops subsequent ranked attempts. All 37 tests pass, including three recovery regressions. Resume entries now retain effective settings and the original configuration for future auditability.

A separate real pause/resume diagnostic, `w046e76b924e2bcb405f3`, resumed from minute 800 using only `--world`. It retained Level 2, delayed fees, seed `resume-smoke`, opening 0.82, and reference share 1.10. It completed with €7,005.23 margin, 99.16% on time, 593 orders, and zero refused actions. This diagnostic is excluded from all tuning and validation totals. It predates cumulative-statistics checkpointing; only its resumed-session counts were recorded.

Level 2 is a practice milestone. Levels 3–8 and the live final remain outside this implementation.

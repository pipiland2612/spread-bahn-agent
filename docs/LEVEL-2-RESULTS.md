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

The selected policy meets the independent validation gate. Ranked results pending.

## Implementation checks

The local suite covers fee schedules, configuration validation, stale reprices after booking/cancellation/expiry, dropped bookings, no-shows, confirmed versus proposed fees, active schedule restoration, policy-preserving resume, and ranking-season changes. Official client and generated types remain unmodified.

Level 2 is a practice milestone. Levels 3–8 and the live final remain outside this implementation.

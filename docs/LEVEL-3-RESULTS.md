# Level 3: offers and chains

Level 3 uses the same simulated world as Level 2, adding multi-car gigs and direct offers. Request selection remains unchanged: only single-leg, dealer-to-dealer work, with 0.75 opening/reference and 1.20 maximum reference/list-price ratio. The policy is deterministic, not a trained machine-learning model.

## Matched tuning

Every configuration played `network-tune-1` through `network-tune-3`. All runs had complete action evidence and zero refused actions.

| Configuration | Three-week margin | Worst on time | Direct offers | Multi-car gigs |
| --- | ---: | ---: | ---: | ---: |
| Baseline, no offers | €20,344.88 | 99.18% | 0 | 0 |
| Offers | €21,088.71 | 99.01% | 1,840 | 0 |
| Offers + immediate chains, revision 1 | €21,058.10 | 99.01% | 1,845 | 1 |
| Offers + ten-minute chain collection, revision 2 | €20,103.50 | 98.35% | 1,961 | 3 |

Offers earned **3.66% more than baseline** and won tuning. The immediate chain variant formed no chains on its first two seeds and one on its third. A follow-up revision waited at most ten minutes for compatible orders; it formed more chains but lost margin. This does not establish that chains always lose: there were few compatible pairs, and the delayed variant changes dispatch timing as well as grouping. Chains remain an explicit experimental mode, not the selected default.

## Offer policy

For an open gig aged at least 30 minutes, send one direct offer per policy tick to a distinct qualified driver, at 0.90 times reference (or the configured opening multiplier if higher). Try at most three drivers over the gig's lifetime. Drivers must live within 55 road minutes of its first pickup. Recent viewers rank ahead of other local drivers, then proximity, drop rate, and driver ID break ties. A view is evidence of app activity, not availability or willingness to work.

Honor three offers per driver per world day, three pending per gig, and no sends from 23:00 to 06:59. An offer does not mutate the confirmed public fee. Successful sends consume counters; answers close pending offers. Booking, start, cancellation and expiry prune queued offers.

## Chain policy

Only chain two newly won, single-leg orders. Never withdraw a public or booked gig to regroup it. Require at most 15 minutes deadhead and 360 total road minutes, versus the server's 720-minute multi-car cap. Check windows, opening hours, 40-minute charging stops and 15-minute stop buffers. A same-day plan must remain feasible at both `now + 55` and `now + 55 + 210`. The combined schedule uses 90% of summed reference fees. Partial delivery does not finish the gig; cancellations and expiry preserve or repost surviving uncovered work.

Trade-in request acceptance remains excluded. The multi-car implementation combines separate eligible orders instead.

## Independent validation

Offers were selected before their `network-holdout-1` through `network-holdout-3` outcomes were read. The gate requires at least 95% on time in every week, positive aggregate margin, improvement over baseline, no refused actions, and complete cumulative evidence.

| Seed | Baseline margin | Offers margin | Offers on time | Offers orders |
| --- | ---: | ---: | ---: | ---: |
| `network-holdout-1` | €5,825.44 | €6,100.46 | 99.17% | 602 |
| `network-holdout-2` | €6,785.60 | €6,657.31 | 100.00% | 582 |
| `network-holdout-3` | €6,421.15 | €6,326.36 | 98.35% | 606 |
| **Total** | **€19,032.19** | **€19,084.13** | **98.35% worst** | **1,790** |

Aggregate gain is **€51.94 (+0.27%)**, much smaller than tuning. Two of three validation weeks earned less than baseline. This is weak evidence of a general margin advantage, not a robust win across seeds. It nevertheless passes the predeclared promotion gate; new Level 3 worlds default to offers. Use `--network baseline` to retain the comparator. All 2,041 validation offers were accepted as valid API actions; drivers need not accept them. No validation actions were refused, and every run has complete evidence. Baseline won 1,791 orders; offers won 1,790 because different event timing can change the feasibility decision at quote time.

## Recovery verification

Real diagnostic world `w9c28e2681cd356b2df33` paused at minute 800 with 24 successful offers and 39 quotes. Resuming with only `--world` retained Level 3, offer mode, seed, fee mode and policy, without overrides. All 24 early attempts remained in the final 642-offer history; final quote count was 602. It ended at €6,720.43 margin, 98.99% on time, 597 orders, zero refused actions and complete evidence.

The diagnostic used coarse time advances before its pause and is not a policy benchmark. It is excluded from tuning and validation. Historical/missing network counters or uncertain action outcomes suppress offers for the current world day; incomplete action evidence blocks further ranked attempts. Old revision-1 chain manifests require explicit `--network` acknowledgement before resuming with revision 2.

Independent review found two restart hazards. Startup now retains the in-flight marker until conservative offer suppression is durably saved, even if snapshot or roster loading fails. Rebuild publishes uncovered accepted work immediately instead of restarting an unknown ten-minute holding deadline. Both fixes have RED→GREEN regressions, including a full offline CLI startup-failure test.

## Ranked round

T2 completed all five Level 3 weeks of season 4, **Saturday 00:00**. The API reported **rank 1** at **00:18 Helsinki time on 14 November 2026** (`2026-11-13T22:18:03.107Z`). Live standings can change.

**Total margin: €32,576.83. On time: 99.03%, across 2,988 orders.** Every week exceeded 95% on time and qualified. All cars were eventually delivered. All 3,587 offer actions were valid; no API actions were refused, and every run has complete cumulative evidence.

| Ranked week | Margin | On time | Orders | World |
| --- | ---: | ---: | ---: | --- |
| 1 | €6,000.37 | 99.68% | 627 | `w60b6baddc6d9d6cdf263` |
| 2 | €5,823.35 | 99.15% | 585 | `w097db9a574686270b3ab` |
| 3 | €6,428.43 | 98.48% | 594 | `wd8af516bbf7949d88a5f` |
| 4 | €6,832.57 | 98.49% | 597 | `w81cecec512f6bd63f789` |
| 5 | €7,492.11 | 99.32% | 585 | `w635a9eeadfe482cc89e0` |

The [saved leaderboard response](../results/leaderboard-level-3-season-4.json) contains the server's rank and matching run fingerprints. These secret weeks differ from the prior Level 2 season, so ranked totals are not a causal measure of improvement. Ranking worlds were not forked, revealed or deleted. No unfinished practice worlds remain at handoff.

## Limits

All **60 tests pass**, including the two important review findings and the full CLI resume regressions. Pure modules pass TypeScript checks; the runner passes syntax checks. The suite covers offer budgets, restart counters, no-night sends, eligibility, multi-car completion, cancellation survivors, expiry, rebuild coverage, holding windows and policy restoration. Hidden driver locations, availability and costs remain unknown. Levels 4–8, multilingual notes, weather and the live final remain unimplemented.

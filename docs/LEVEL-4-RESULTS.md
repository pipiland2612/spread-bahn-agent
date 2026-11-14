# Level 4: competitive quote experiments

The dispatcher now supports competitive quotes at Level 4. These experiments compare first-option list-price quotes against quotes for every feasible delivery option, with fixed list-price multipliers. All policies use the same 0.75 opening/reference, 1.20 maximum reference/quoted-price share, legacy fee behavior, and direct offers. Private and trade-in work remains excluded from eligible requests.

A price change also changes which requests pass the reference/price filter. These are combined policy comparisons, not isolated causal effects of price or later delivery options. The competitor responds to each policy’s wins, so later events and workloads differ. Its prices remain hidden.

## Matched tuning

| Policy | Three-week margin | Worst on time | Won orders | Refused actions | Incomplete weeks |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline | €10,602.54 | 99.67% | 980 | 0 | 0 |
| options-090 | €6,805.49 | 98.90% | 1305 | 0 | 0 |
| options-100 | €10,686.77 | 98.86% | 998 | 0 | 0 |
| options-110 | €11,297.06 | 99.09% | 659 | 0 | 2 |

`baseline` quotes the first option at 1.00× list price. `options-090`, `options-100` and `options-110` quote all feasible options at 0.90×, 1.00× and 1.10× respectively.

Eligible tuning winner: **options-100**. The 1.10× candidate had the highest raw margin, but two connection-interrupted weeks had incomplete cumulative action evidence and therefore failed the predeclared gate. Tuning seeds were `quotes-tune-1` through `quotes-tune-3`.

## Independent validation

| Seed | Baseline margin | Tuning winner margin | Winner on time |
| --- | ---: | ---: | ---: |
| `quotes-holdout-1` | €3,160.80 | €3,251.92 | 96.61% |
| `quotes-holdout-2` | €5,160.14 | €5,084.29 | 99.77% |
| `quotes-holdout-3` | €3,013.07 | €3,108.17 | 98.74% |

All six reported holdouts have complete cumulative action evidence and zero refused actions. Four interrupted original holdouts were repeated with unchanged seeds and settings; the originals remain in [the retry history](../results/level4-validation-retries.json) and per-world files. No policy was retuned on these outcomes.

Tuning-winner held-out margin: **€11,444.38**, versus **€11,334.01** baseline; difference **€110.37 (+0.97%)**. Every promotion requires at least 95% on time in each validation week, positive aggregate margin, zero refused actions and complete cumulative evidence. A changed candidate must also improve aggregate held-out margin. The candidate lost €75.85 on the second paired seed. Three seeds are a small sample and do not guarantee generalization.

Selected policy: **options-100**, quote mode `options`, multiplier **1**. Explicit quote settings were supplied to every experiment and ranking run.

## Ranked round

T2 rank **4**, round **Saturday 00:00** (season 4), checked at `2026-11-14T00:17:53.676Z`. Live standings can change.

Total gross margin **€17,906.90**, **99.38%** on time. These secret weeks differ from the experiment seeds and do not measure a causal before/after gain.

| Week | Margin | On time | Orders | World |
| --- | ---: | ---: | ---: | --- |
| 1 | €2,255.37 | 100.00% | 151 | `w618b5ba1222c77c14365` |
| 2 | €3,384.95 | 99.31% | 291 | `w8629ed9dac170ba977ca` |
| 3 | €5,011.23 | 99.75% | 396 | `w97199e77e89bd414ea72` |
| 4 | €4,405.19 | 99.49% | 395 | `w06a2ffe61471fe851e1b` |
| 5 | €2,850.16 | 98.26% | 230 | `w246c9c315cca339b736c` |

[Saved leaderboard evidence](../results/leaderboard-level-4-season-4.json). Ranking worlds were not forked, revealed or deleted.

All five attempts in this round are complete. Further ranked entry requires a new round. No unfinished Level 4 ranking world remained at the final check.

## Evidence index

All per-world JSON files retain seed, quote settings, dispatch policy, score and cumulative action statistics. Tuning and holdout labels are independent of secret ranking seeds.

| Phase | Policy | Seed | World |
| --- | --- | --- | --- |
| tuning | baseline | `quotes-tune-1` | [w75647a076e242f6b19dd](../results/w75647a076e242f6b19dd.json) |
| tuning | baseline | `quotes-tune-2` | [w64713e8e9447bb51d365](../results/w64713e8e9447bb51d365.json) |
| tuning | baseline | `quotes-tune-3` | [we3a63d80d82e601db3e0](../results/we3a63d80d82e601db3e0.json) |
| tuning | options-090 | `quotes-tune-1` | [wf46a257285de6a95fb33](../results/wf46a257285de6a95fb33.json) |
| tuning | options-090 | `quotes-tune-2` | [w42e919169e949d865f2f](../results/w42e919169e949d865f2f.json) |
| tuning | options-090 | `quotes-tune-3` | [w4331ef1c066642e9c9c5](../results/w4331ef1c066642e9c9c5.json) |
| tuning | options-100 | `quotes-tune-1` | [w741b673b72e99d85d13c](../results/w741b673b72e99d85d13c.json) |
| tuning | options-100 | `quotes-tune-2` | [w3e67be1657c49dd2cda7](../results/w3e67be1657c49dd2cda7.json) |
| tuning | options-100 | `quotes-tune-3` | [w490dc4688a22d34923b3](../results/w490dc4688a22d34923b3.json) |
| tuning | options-110 | `quotes-tune-1` | [w0bb8a821723b255baf38](../results/w0bb8a821723b255baf38.json) |
| tuning | options-110 | `quotes-tune-2` | [w9a9bfc5b2c15a3202137](../results/w9a9bfc5b2c15a3202137.json) |
| tuning | options-110 | `quotes-tune-3` | [w679fd54c809c41efdbfd](../results/w679fd54c809c41efdbfd.json) |
| holdout | baseline | `quotes-holdout-1` | [we0109d7908c30596781e](../results/we0109d7908c30596781e.json) |
| holdout | baseline | `quotes-holdout-2` | [w45ed4033bc61917fe639](../results/w45ed4033bc61917fe639.json) |
| holdout | baseline | `quotes-holdout-3` | [w6c7d3ea3a92851828b06](../results/w6c7d3ea3a92851828b06.json) |
| holdout | options-100 | `quotes-holdout-1` | [wbbdad668719e979e9602](../results/wbbdad668719e979e9602.json) |
| holdout | options-100 | `quotes-holdout-2` | [w6bec197bf4044fe89d0d](../results/w6bec197bf4044fe89d0d.json) |
| holdout | options-100 | `quotes-holdout-3` | [w245533323cecfc7e5ed3](../results/w245533323cecfc7e5ed3.json) |

## Implementation limits

This is a fixed rule policy, not an adaptive quote learner or a trained model. Levels 5–8 and live final execution remain unsupported. Direct offers and driver fees were held fixed. The official decline recommendation uses very high prices rather than no quote at Level 4; rejection is not guaranteed. Rare unexpected multi-car wins are rescued one leg at a time, paying the full reference fee per leg conservatively. This does not establish profitable trade-in support.

The independent review and RED→GREEN recovery regressions are recorded in [the execution report](superpowers/reports/2026-11-14-level-4-execution.md). No dependencies or vendor edits were introduced.

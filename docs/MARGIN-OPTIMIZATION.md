# Level 1 margin optimization

## Method

Compare identical deterministic seeds, with the original policy as baseline. Tune on `margin-tune-1` through `margin-tune-3`. Validate the winner on separate `margin-holdout-1` through `margin-holdout-3`. Each candidate must earn positive total validation margin, improve over baseline, achieve at least 95% on-time delivery in every week, and have zero refused actions before promotion.

These experiments change opening fees and request selection together. They measure the combined policy, not the isolated effect of either parameter. Road limits, driver coverage, opening hours, and rescue logic remain unchanged during the comparisons.

## Tuning

| Opening/reference | Max reference/list price | Total margin, three weeks | Worst on time | Refused actions |
| ---: | ---: | ---: | ---: | ---: |
| 0.85 | 0.88 | €11,764.84 | 99.25% | 0 |
| 0.75 | 1.05 | €20,732.69 | 98.09% | 0 |
| 0.65 | 0.95 | €14,894.14 | 98.04% | 1 |

The broad 0.75/1.05 policy improves tuning margin by 76.23%. It is selected for held-out validation. A reference fee above list price can still be profitable because actual bookings can occur below reference fee. The reference fee is a cost proxy, not a minimum acceptable driver fee.

## Holdout validation

| Seed | Baseline margin | Candidate margin | Candidate on time | Candidate orders |
| --- | ---: | ---: | ---: | ---: |
| `margin-holdout-1` | €3,865.53 | €6,565.76 | 98.94% | 567 |
| `margin-holdout-2` | €3,897.99 | €7,088.55 | 99.44% | 534 |
| `margin-holdout-3` | €3,705.33 | €6,177.96 | 99.45% | 548 |
| **Total** | **€11,468.85** | **€19,832.27** | **98.94% worst week** | **1,649** |

The candidate improves held-out total margin by **72.92%**, with all weeks above 98.9% on time and zero refused actions. It wins on every paired seed and passes all promotion gates. Defaults are now 0.75 opening/reference and 1.05 maximum reference/list price. This is evidence from three held-out weeks, not a guarantee on all future weeks.

## Event-batch defect found during experimentation

The weaker candidate and one baseline holdout week exposed a refused reprice. Investigation of world `wa6497da5e65f264d4aae` found a deadline warning, booking, and start in the same world minute, 6690:

- `deadline_close`, seq 26498, queues a rescue reprice.
- `gig_booked`, seq 26507, books `g413`.
- `gig_started`, seq 26508, starts it.
- The queued reprice survives until the next API request, which correctly refuses it because the gig is no longer open.

The implemented fix removes queued reprices when later events in the same batch book, start, finish, expire, or cancel that gig. Regression tests reproduce the observed event ordering. Proposed fees remain separate from confirmed state until API acceptance. The subsequent Level 2 comparisons, validation, and ranked weeks had zero refused actions.

## Ranking limitation

The five Level 1 season-3 attempts were already completed before this optimization. New practice results do not change the historical €20,389.15 leaderboard total. The tuned policy can enter a future round with new secret seeds.

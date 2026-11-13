# Level 1 results — 13 November 2026

Team **T2** (`t2`) completed the five worlds of season 3, **Friday 20:01**. At the API check on 13 November at 23:15 Helsinki time, T2 was **ranked 2nd**.

Total gross margin: **€20,389.15**. On-time share: **98.93%**, across **1,400 won orders**. Every ranked week met the 90% delivery minimum. No undelivered orders remained, and the API refused no actions in these runs.

The ranking can change as other teams finish. This is a Level 1 practice ranking, separate from the Level 8 final.

| Ranked week | Margin | On time | Orders | World |
| --- | ---: | ---: | ---: | --- |
| 1 | €3,969.58 | 97.78% | 270 | `w7c2ddfb8382049937601` |
| 2 | €3,927.85 | 99.27% | 274 | `w6edc45b1326f2636d5d6` |
| 3 | €4,280.83 | 99.66% | 296 | `w544c8c76a34e30761e0e` |
| 4 | €4,584.55 | 99.01% | 304 | `wf1998111054b4132d71e` |
| 5 | €3,626.34 | 98.83% | 256 | `w579dfede75db1f3a29d4` |

The [saved leaderboard response](../results/leaderboard-level-1.json) and per-world JSON files in `results/` contain the scores returned by the API. Check the current [leaderboard](https://spread.bahnexpress.com/leaderboard) for live standings.

## Practice comparison

All other policy settings were identical. The candidate changed two settings together: opening fee from 0.95 to 0.85 times reference, and allowed reference/list-price share from 0.78 to 0.88. The experiment measures their combined effect, not each change separately.

| Seed | Policy | Margin | On time | Orders |
| --- | --- | ---: | ---: | ---: |
| `spread-1` | Initial conservative policy | €1,411.28 | 98.39% | 124 |
| `spread-1` | Candidate, now default | €3,980.39 | 98.91% | 274 |
| `spread-validation-2` | Candidate | €4,329.73 | 100.00% | 292 |
| `spread-validation-3` | Candidate | €4,023.26 | 99.33% | 299 |

On the comparison seed, margin improved by €2,569.11. The two additional seeds validated the candidate before its ranked attempts. This is a small initial sample; more seeds and paired comparisons are needed before claiming broad robustness.

## Verification

- Seven Node tests pass, covering selection, hours, delivery buffer, charging, replay, and cancellation.
- `src/policy.ts` passes TypeScript checking with the generated API types.
- Both custom source files pass Node syntax checks.
- Four practice weeks and five ranked weeks completed against the real API; all qualified, and none had refused actions.
- Team credentials are stored only in the ignored local `.env` file.

## Next work

The next milestone is Level 2: evaluate driver learning and compare stable opening fees against predictable raises. The current runner guards against entering higher levels until their mechanisms have been implemented. See [the strategy and roadmap](STRATEGY.md).

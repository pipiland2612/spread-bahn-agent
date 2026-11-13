# Repository investigation — 14 November 2026

This review covers main at `6cdef0be9e948a605cf11f1c19c67035c8293230`, including the README, strategy and experiment reports, implementation plans and specifications, official references, and vendored kit documentation. The custom implementation was reviewed and its existing test suite was run on Node 24.22.1.

## What the system does

The agent is a deterministic TypeScript dispatcher with no package dependencies. It runs a simulated car transport company for a week in Finland. The objective is gross margin, subject to at least 90% of won orders arriving on time.

The implementation supports Levels 1–3:

- `src/policy.ts` selects single-car, dealer-to-dealer requests using reference fees, road times, opening hours, nearby qualified drivers, charging requirements, and booking slack.
- `src/fees.ts` provides legacy, stable, and delayed fee policies, with deadline rescue increases.
- `src/network.ts` plans Level 3 direct offers and experimental two-order chains. Driver home locations and views are heuristics, not evidence of availability or hidden costs.
- `src/run.ts` handles events, batches actions with advances, saves manifests, and rebuilds interrupted worlds from server state and history.
- `src/settings.ts` restores saved policy settings and guards against incompatible resumes and mixed ranking rounds.
- `src/recovery.ts` preserves cumulative evidence and marks uncertain action outcomes incomplete.

New Level 3 worlds default to offers. Chains remain experimental: the delayed chain candidate lost tuning margin. Offers improved held-out aggregate margin by only 0.27% over three seeds and lost on two of those seeds, so the evidence does not establish a robust advantage across unseen weeks.

## Verification

All 60 existing tests passed. Coverage includes feasibility, fee schedules, cancellation and expiry, stale action pruning, chain lifecycle, offer budgets, and recovery. No new practice or ranking worlds were created for this investigation.

The live `HANDBOOK.md`, `RULES.md`, `API.md`, and OpenAPI contract matched the committed copies byte for byte. Where official documents disagree, `RULES.md` takes precedence.

Authenticated world listing succeeded and showed 75 worlds, with none unfinished at the time of review. Credentials remain local and ignored; they are not part of this report or the repository history.

## Leaderboard snapshot

These are time-sensitive API observations from this investigation, not permanent ranking claims. The current round was season 4, `Saturday 00:00`; the previous round was season 3, `Friday 20:01`.

| Level | Round | T2 rank | Gross margin | On time |
| --- | --- | ---: | ---: | ---: |
| 1 | Previous, season 3 | 4 | €20,389.15 | 98.93% |
| 2 | Previous, season 3 | 2 | €31,612.14 | 99.16% |
| 3 | Current, season 4 | 1 | €32,576.83 | 99.03% |

T2 had completed all five Level 3 ranking weeks in the current round. It had no current-round attempts at Levels 1–2 or 4–8. The README's earlier Level 1 rank of 2 is a historical observation; the API showed rank 4 during this review. Earlier result reports retain their original check times.

See the [live leaderboard](https://spread.bahnexpress.com/leaderboard) and the existing [Level 3 evidence report](LEVEL-3-RESULTS.md).

## Gap to the final

The custom runner explicitly rejects Levels 4–8 and has no live final mode. It does not yet implement competitive quote acceptance and multiple delivery options, multilingual note interpretation, changed-order and failed-visit recovery for higher levels, weather-aware planning, or the shortage and trust mechanisms. Successful Level 3 practice does not establish Level 8 readiness.

The next implementation milestone is Level 4 quoting. Subsequent work should add higher-level mechanics with matched practice comparisons and independent validation, then implement a live stream runner with reconnect, replay, and restart recovery. Test the moving clock before entering the Level 8 final.

## Ranking and submission workflow

Ranking results are produced by playing server-hosted board worlds; there is no separate score-file upload. Each round permits five secret weeks per level. All five must qualify for a team rank. Do not delete, fork, or reveal ranking worlds to retry an attempt.

The [official judging page](https://spread.bahnexpress.com/judging) specifies a separate Junction submission containing the team's submission hash, a code link, and 5–10 slides or a short video. The final submission deadline is Sunday, 15 November 2026 at 10:00 Helsinki time. The final starts at 08:00, with registration closing at 07:30. Confirm the official schedule before participating.

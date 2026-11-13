# Level 3: direct offers and conservative chains

## Intent

Advance the validated Level 2 dispatcher to Level 3 and improve gross margin without sacrificing delivery reliability. The user delegated implementation choices and trial and error, and explicitly requested the prior PR be merged before this work. PR #1 is merged at `174d5e4`.

## Approaches

1. Keep single-car gigs and add targeted direct offers: small state change, isolates the offer effect.
2. Add direct offers and conservative two-car chains, behind separate experiment modes: chosen by the agent because each feature can be measured against baseline.
3. Global route optimization and trade-in acceptance: larger coverage and state risk. Deferred until evidence supports the simpler policy.

## Scope and constraints

- Retain Node/TypeScript, official unmodified client, no dependencies, RTK, SSH and gh. Reuse the isolated managed worktree on `codex/level-3`.
- Support levels 1–3. Levels 1 and 2 remain behaviorally unchanged.
- Network modes: `baseline` (Level 2 behavior), `offers`, `chains` (offers plus two-car chains). Persist and restore the mode. Initially default to baseline; promote only after held-out evidence.
- Keep request selection unchanged: only single-leg, non-private orders. Multi-car means chaining two eligible orders, not accepting new trade-ins.
- Do not infer hidden driver availability or costs. Views show activity only. Public home locations are a proximity heuristic.
- At most four unfinished worlds at once. Never delete worlds automatically.

## Direct offers

Track successful offer sends by driver/day, gig/driver, and expiry. Reconstruct them from checkpointed network state on resume; if old state is missing, disable offers until the next world day to avoid exceeding limits. Recovery with uncertain sends similarly suppresses offers for the remainder of that day.

For open gigs aged at least 30 minutes, send up to three offers over their lifetime to distinct drivers, no more than one per gig per tick. Never send from 23:00 through 06:59. Enforce three offers per driver per world day and three open offers per gig, including queued sends. Prefer eligible drivers whose homes are within 55 road minutes of the first pickup; rank recent viewers first, then distance, past-drop rate, and stable driver ID. Require the gig's experienced/manual audience. Do not promise that home proximity proves feasibility.

Offer fee is the larger of the opening fee and 0.90 times the sum of the gig's reference fees. Do not change the public fee because an offer was sent or accepted. Prune queued offers after booking, start, cancellation, or expiry. Successful sends count against limits; rejected actions remain cumulative evidence. Answers close pending offers; booking events own gig status. Counters and attempts persist before/after each advance with the existing conservative incomplete-evidence gate.

## Chains

Only combine pending new single-car posts, never withdraw a booked/open gig for savings. Hold new posts for at most ten minutes to collect compatible orders, flushing the whole waiting batch when the oldest reaches ten minutes or any order becomes urgent (within 210 minutes of last pickup). The initial immediate-post experiment formed no chains; this bounded delay is a follow-up tuning choice, recorded as network revision 2. Greedily join at most two posts in deterministic input order, trying both orientations. Require at most 15 road minutes between the first delivery and second pickup, at most 360 total road minutes (stricter than the server's 720-minute cap), and a feasible same-day plan from now plus 55 minutes. Check readiness, stop windows, site hours, charging (40 minutes), and add 15 minutes per stop as a conservative handling buffer. Require 210 minutes of initial booking slack. No overnight chains; no private stops.

Initial booking slack means the chain remains feasible if its first approach starts at `now + 55 + 210`; the 55-minute approach does not count toward the 210 minutes. Check both that delayed start and `now + 55`, with both finishing within the current world day. This is the agent's conservative decision following the builder check.

Each chain uses pickup/delivery for the first car followed by pickup/delivery for the second. Experienced/manual requirements are the union. Its fee schedule uses 0.90 times the sum of reference fees, then the selected fee mode. Single-car schedules remain unchanged.

Track every order/leg in a gig. A first-car delivery must not mark a chain done. Repricing uses the sum of reference fees and the earliest remaining last-pickup deadline. Expiry reposts every undelivered, uncovered order separately. Cancellation outcomes `withdrawn`/`released` remove coverage and repost surviving orders; `shortened`/`continues` remove only cancelled stops and retain the gig's status. Never duplicate surviving coverage on rebuild. Chain mode is an experimental candidate, not a requirement to promote it.

On rebuild, publish uncovered accepted work immediately when its original holding timestamp is unknown; never restart its ten-minute waiting period. Keep an in-flight checkpoint marker until the restored conservative offer block is durably saved, so failed startup reads cannot erase uncertainty.

## Validation and delivery

First run baseline, offers, and chains on `network-tune-1` through `network-tune-3`. Choose the highest eligible margin total. Compare the winner to baseline on untouched `network-holdout-1` through `network-holdout-3`. Every candidate week must have at least 95% on time, positive aggregate margin, no refused actions, and complete cumulative evidence. Promote only if held-out aggregate margin exceeds baseline. If candidates lose, retain baseline and report that result honestly. If the retained policy passes delivery/evidence gates, play up to five available Level 3 ranked weeks sequentially.

Run the full suite per task, plus syntax/pure-module type checks. One fresh whole-branch review precedes publication. Do not merge the new PR without an explicit user request covering it. Save exact world IDs/settings/results, limitations, and leaderboard check time. The live final and levels 4–8 remain out of scope.

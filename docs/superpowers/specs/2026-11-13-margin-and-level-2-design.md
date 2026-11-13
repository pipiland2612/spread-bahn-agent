# Margin optimization, then Level 2

## Intent

Improve the team's margin at Level 1, then support Level 2 and validate it before using ranked attempts. Keep the existing working policy available for reproducible comparisons.

The user requested Superpowers, caveman responses, and RTK shell commands. The user approved proceeding with the recommended approach and trial-and-error experiments: "just do what you recomends, trial and error". Routine implementation and execution choices are delegated to the agent.

## Current evidence

- TypeScript agent on Node 22.18+, with the official client and no package dependencies.
- Level 1 season 3: €20,389.15 across five qualifying weeks; 98.93% on time over 1,400 orders. Rank was 2 when checked.
- Current defaults: opening fee 0.85 times reference; reference fee at most 0.88 times list price; drive at most 240 minutes; 15 qualified drivers within 55 road minutes; 210 minutes of pickup buffer.
- Current runner uses one-step fees, reprices open gigs after 60/120 minutes, and escalates near deadlines. It rejects Levels 2–8.
- Level 2 adds fee schedules, drivers learning from raises, and dropped bookings. Multi-car bundling and direct offers belong to Level 3.

## Approaches

1. **Measured rule tuning, then Level 2 fee policies — recommended.** Sweep reproducible practice seeds, retain delivery constraints, then compare stable fees with delayed or urgency-driven raises at Level 2. Low complexity and directly measurable.
2. **Train a booking-cost model first.** Could improve lane-specific fees, but requires a larger dataset and introduces estimation and validation work before improving the first baseline.

The agent recommends approach 1. No neural model or third-party service is required for this increment.

## Phase 1: margin optimization

Use the existing CLI to compare opening fees and acceptance thresholds on the same three tuning seeds. Keep the existing baseline and candidate settings in every comparison. The initial candidates are `(opening=0.75, referenceShare=1.05)` and `(opening=0.65, referenceShare=0.95)`, against `(0.85, 0.88)`.

Choose the highest total-margin candidate only among policies with every tuning week ranked and a worst on-time share of at least 95%. Validate the winner and baseline on three untouched seeds. Require all validation weeks to have at least 95% on-time delivery, positive total margin, and higher total margin than baseline before changing defaults. If no candidate qualifies, retain the baseline and report the measured failure rather than inventing a gain.

If these first candidates fail, the builder may test up to three further configurations guided by results, using the same tuning seeds. No more than four unfinished experiment worlds may run concurrently, leaving practice capacity for teammates. Do not access or replay secret ranking seeds.

The output is an evidence report with per-seed margin, on-time share, order count, configuration, and world ID. Change Level 1 defaults only when supported by held-out evidence. The current season's five Level 1 attempts are already used; practice improvements cannot rewrite that score.

## Phase 2: Level 2 implementation

Keep request selection shared with Level 1. Add an explicit level and fee-mode setting. Level 1 must still send exactly one schedule step. Level 2 supports two comparison modes:

- **Stable fee:** a competitive opening fee, no age-based increases, and a deadline rescue increase only when needed.
- **Delayed fee:** a modest initial fee, one delayed nondecreasing scheduled raise, and a deadline rescue increase. Bound every schedule to 1–48 integer-minute, integer-cent steps.

Do not assume either mode wins. Compare them and a Level 1-style repricing baseline on the same Level 2 tuning seeds. Tune a small set of opening multipliers and escalation delays. Retain the mode with the highest total margin subject to the same 95% delivery gate, then compare the selected candidate and baseline on three untouched Level 2 seeds.

Handle drops and no-shows by reopening the gig in local state. Wake promptly on those events. Raise the fee when an urgent reopened gig needs rescue, without submitting reprices for booked, working, delivered, or cancelled work. Keep booked price and current schedule separate where needed. The server performs driver learning; the agent does not pretend to observe hidden driver costs.

An error must preserve the world. Resumption must restore level, policy, schedule state, and the original seed from the saved manifest unless an explicit, recorded override is provided. Refused actions must be visible and disqualify a candidate from automatic promotion. Cancellation and replay must not leave duplicate posts or stale reprices queued.

## Architecture and tests

- `src/policy.ts`: request feasibility and validated policy configuration; retain public API compatibility where practical.
- A focused fee-policy module: generates schedules and rescue decisions for each level and mode.
- `src/run.ts`: CLI, world creation/resume, event handling, and manifests; add explicit Level 1/2 support and level-specific board paths.
- A small experiment/report helper only if manual invocation becomes error-prone; avoid a general optimization framework.
- `tests/`: failing tests first for schedules, invalid configuration, drops, urgency, cancellation, replay, and resumption.
- `results/`: per-world evidence. Preserve old runs and existing leaderboard snapshots.

Keep the official client and types unmodified. Use RTK for every shell command. Use Git/gh and SSH for publishing. Keep `.env` ignored and never copy keys into reports or commands.

## Ranked Level 2 run

The user's request to work on Level 2 is taken to include testing it against the server and, once it passes the validation gate, attempting its five ranked weeks as in the previous milestone. Complete the current round sequentially. Do not start if another teammate has an active Level 2 ranking world. Stop before the next attempt if a week is not ranked. Save the final API leaderboard response and distinguish live rank from a permanent result.

If no candidate meets the gate, leave Level 2 available for practice and report the blocker. Do not spend ranked attempts merely to produce a leaderboard entry.

## Boundaries

This increment does not implement Levels 3–8, private appointments, multi-car routing, direct offers, multilingual note parsing, final live streaming, or a training pipeline. Success here does not establish Level 8 readiness.

## Acceptance criteria

1. Measured Level 1 optimization report, with held-out comparison and no unsupported promotion.
2. Level 2 fee modes, drop handling, and restart behavior covered by tests.
3. Complete suite passes, plus real practice validation on independent seeds.
4. Ranked Level 2 round attempted only after the stated gate; results or precise reason for not entering recorded.
5. Code, docs, and evidence committed and published for teammates. Existing results remain accessible.

## Builder choices

The builder may choose exact module names, additional tuning points within the bounds above, test fixtures, and report format. Prefer native inline implementation with one independent final review to limit usage. Use an isolated checkout if available; do not alter teammates' existing edits.

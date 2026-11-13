# Level 1 baseline

## Goal and approach

Produce positive gross margin while keeping enough delivery buffer to qualify on unseen weeks. The first milestone is a complete five-week Level 1 ranking round. This agent is a deterministic policy, not a trained machine-learning model.

The official starter quotes everything and can lose money or miss the delivery minimum. A first learned model would require outcome data that the team does not yet have. We start with explicit selection and pricing rules, retain reproducible run summaries, and use practice outcomes to decide what to improve.

## Request selection

For every request, estimate whether the first option is profitable and feasible using its reference driver fee, public road times, site opening hours, and the world's driver roster.

- One car, with dealer sites at both ends.
- Reference fee below a configurable share of the first option's list price.
- At most four hours of planned driving.
- At least 15 qualified drivers living within 55 road minutes of the pickup. Premium cars require a rating of at least 4.8 and 50 completed gigs.
- At least 210 minutes between the earliest booking decision and latest feasible pickup, accounting for delivery closing hours and any required charging stop.

Eligible requests receive the first option's list price. Ineligible requests receive no quote, as the rules prescribe at Level 1. Coverage is only a supply proxy: the roster does not disclose who will work that day.

## Driver fees

Post each won car immediately, using one fee step. The default opening fee is 0.85 times reference fee, and reference fee must be at most 0.88 times list price. Both are configurable. If still open, raise to at least 1.05 times reference after 60 minutes, then 1.2 after 120 minutes. Within 180 minutes of `lastPickupAt`, raise to 1.65 times reference. Repost expired gigs at 1.8 times reference so late work can still finish.

Fee raises can sacrifice an individual order's margin to protect the delivery minimum. They do not notify drivers. This is a Level 1 policy: drivers learn from raises at Level 2, so this schedule needs a new evaluation before promotion.

## Execution and recovery

Use the official rate-aware client. Advance to actionable events or a 30-minute policy check, batching actions with the next advance. Deduplicate events by sequence number. Track cancellations, bookings, deliveries, and expired gigs. Save the world ID before playing it and final score afterward.

Practice and ranking worlds are preserved on errors. Resume a world with `--world WORLD_ID`. Recovery rebuilds from authoritative snapshot and history rather than assuming a failed network request had no effect. Do not run two agents on one world. The runner stops before consuming the next ranking attempt when a week misses the delivery minimum.

## Team work areas

- `src/policy.ts`: request selection, driver coverage, and fee model.
- `src/run.ts`: event handling, batching, recovery, and result collection.
- `tests/`: calendar, feasibility, charging, replay, and cancellation checks.
- `results/`: seed, policy, world ID, score, and action refusals for each run.
- `vendor/spread/`: unmodified official kit; make team changes in `src/`.

## Next milestones

1. Compare policies on identical seeds; retain separate validation seeds and track margin plus worst on-time share.
2. Level 2: study booked fees and waiting behavior; avoid teaching drivers to wait for predictable raises.
3. Level 3: add linked routes and direct offers based on actual driver positions and future pickups.
4. Level 4: learn quote acceptance per dealer/lane/day; support later delivery options and competitive prices.
5. Levels 5–6: implement and measure multilingual note parsing, changes, weather, and failed-visit recovery.
6. Levels 7–8: adapt to local driver shortages, trust, price war, and unannounced events. Validate across 10–20 weeks.
7. Add the live stream runner and test it in a scheduled test final before entering the Level 8 final.

The custom runner intentionally refuses higher levels until those mechanisms are implemented and tested. The vendor starter supports them for research, but its results are not this policy's results.

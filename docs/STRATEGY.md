# Level 1 and Level 2 strategy

## Goal and approach

Produce positive gross margin while keeping enough delivery buffer to qualify on unseen weeks. Level 1 is ranked and optimized; Level 2 has fee-policy comparisons, drop handling, and independent validation. This agent is a deterministic policy, not a trained machine-learning model.

The official starter quotes everything and can lose money or miss the delivery minimum. A first learned model would require outcome data that the team does not yet have. We start with explicit selection and pricing rules, retain reproducible run summaries, and use practice outcomes to decide what to improve.

## Request selection

For every request, estimate whether the first option is profitable and feasible using its reference driver fee, public road times, site opening hours, and the world's driver roster.

- One car, with dealer sites at both ends.
- Reference fee below a configurable share of the first option's list price.
- At most four hours of planned driving.
- At least 15 qualified drivers living within 55 road minutes of the pickup. Premium cars require a rating of at least 4.8 and 50 completed gigs.
- At least 210 minutes between the earliest booking decision and latest feasible pickup, accounting for delivery closing hours and any required charging stop.

Eligible requests receive the first option's list price. Ineligible requests receive no quote, as the rules prescribe at Levels 1–3. Coverage is only a supply proxy: the roster does not disclose who will work that day.

## Driver fees

Post each won car immediately. Level 1 always uses one fee step. Its optimized opening fee is 0.75 times reference, and reference fee must be at most 1.05 times list price. Both are configurable. In legacy mode, if still open, raise to at least 1.05 times reference after 60 minutes, then 1.2 after 120 minutes. Within 180 minutes of `lastPickupAt`, raise to 1.65 times reference. Repost expired gigs at 1.8 times reference so late work can still finish.

Fee raises can sacrifice an individual order's margin to protect the delivery minimum. They do not notify drivers. At Level 2, compare legacy mode with stable fees and delayed schedules rather than assuming a policy that avoids raises will earn more. The selected Level 2 default is legacy mode with the same 0.75 opening fee and a broader 1.20 reference/list-price threshold. Driver learning and drops are simulated by the server. [Level 2 measurements](LEVEL-2-RESULTS.md) record what worked and what did not.

## Execution and recovery

Use the official rate-aware client. Advance to actionable events or a 30-minute policy check, batching actions with the next advance. Deduplicate events by sequence number. Track cancellations, bookings, deliveries, and expired gigs. Save the world ID before playing it and final score afterward.

Practice and ranking worlds are preserved on errors. Resume a world with `--world WORLD_ID`. Recovery restores its saved level, policy, fee mode, seed, and active schedule. It rebuilds from authoritative snapshot and history rather than assuming a failed network request had no effect. Do not run two agents on one world. The runner stops before consuming the next ranking attempt when a week misses the delivery minimum, and stops before mixing rounds.

## Team work areas

- `src/policy.ts`: request selection, driver coverage, and fee model.
- `src/fees.ts`: Level 1/2 schedules and rescue targets.
- `src/settings.ts`: strict CLI policy settings, resume restoration, and season checks.
- `src/run.ts`: event handling, batching, recovery, and result collection.
- `tests/`: calendar, feasibility, charging, replay, and cancellation checks.
- `results/`: seed, policy, world ID, score, and action refusals for each run.
- `vendor/spread/`: unmodified official kit; make team changes in `src/`.

## Next milestones

1. Extend paired comparisons beyond three held-out seeds; track margin, worst on-time share, and rejected actions.
2. Level 2: refine lane-specific fees and study drops using the completed practice worlds and official CSV exporter.
3. Level 3: add linked routes and direct offers based on actual driver positions and future pickups.
4. Level 4: learn quote acceptance per dealer/lane/day; support later delivery options and competitive prices.
5. Levels 5–6: implement and measure multilingual note parsing, changes, weather, and failed-visit recovery.
6. Levels 7–8: adapt to local driver shortages, trust, price war, and unannounced events. Validate across 10–20 weeks.
7. Add the live stream runner and test it in a scheduled test final before entering the Level 8 final.

The custom runner intentionally refuses higher levels until those mechanisms are implemented and tested. The vendor starter supports them for research, but its results are not this policy's results.

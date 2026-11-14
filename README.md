# Spread by Bahn Express

Dispatch agent for the Spread hackathon: run a car transport company for one simulated week in Finland. Supports Levels 1–4.

**First result:** team **T2**, **#2** in the Level 1 round `Friday 20:01` when checked on 13 November 2026. Five qualifying weeks: **€20,389.15 margin**, **98.93% on time**, **1,400 orders**. [Results and evidence](docs/RESULTS.md). Live standings can change.

**Optimization:** Level 1 held-out margin improved **72.92%**, from €11,468.85 to €19,832.27 over three matched weeks. Worst candidate week: 98.94% on time. [Experiment details](docs/MARGIN-OPTIMIZATION.md).

**Level 2:** **#2** in the same named round when checked at 23:48 Helsinki time. Five qualifying weeks: **€31,612.14 margin**, **99.16% on time**, **2,972 orders**. The selected policy improved matched holdout margin by **2.23%**. [Measurements and ranked evidence](docs/LEVEL-2-RESULTS.md).

**Level 3:** **#1** in `Saturday 00:00` when checked at 00:18 Helsinki time on 14 November 2026: **€32,576.83 margin**, **99.03% on time**, **2,988 orders**, zero refused actions. Offers improved held-out margin by only **0.27%**; two validation weeks earned less than baseline. New Level 3 worlds use offers; chains remain experimental. [Measurements and ranked evidence](docs/LEVEL-3-RESULTS.md).

**Level 4:** **#4** in `Saturday 00:00` when checked at 02:17 Helsinki time on 14 November 2026: **€17,906.90 margin**, **99.38% on time**, **1,463 orders**, zero refused actions and complete evidence in all five weeks. All-options/list-price quotes improved matched held-out margin by **0.97%**; this is a small three-week gain. [Experiments and ranked evidence](docs/LEVEL-4-RESULTS.md). Live standings can change.

## Goal

Maximize gross margin while delivering at least 90% of cars by their deadlines.

- Quote dealers competitively.
- Post winning drives as driver gigs.
- Set driver fees high enough to get the work accepted on time.
- Track margin, deadlines, and leaderboard performance.

## Getting started

Requires Node 22.18+ (tested on Node 24). No package installation is needed.

```sh
git clone git@github.com:pipiland2612/spread-bahn-agent.git
cd spread-bahn-agent
cp .env.example .env
# Put the team's SPREAD_KEY in .env.
npm test
npm run practice -- --seed spread-1
```

Read [the source index](docs/SOURCES.md) for all official docs and [the strategy](docs/STRATEGY.md) for the policy, assumptions, and roadmap.

See the [repository investigation](docs/REPOSITORY-INVESTIGATION.md) for the verified project overview, leaderboard snapshot, and next steps toward the final.

Never commit `.env` or API keys. Teammates using the same team key share practice limits and ranking attempts.

## Run and inspect

```sh
# A reproducible practice week
npm run practice -- --seed validation-1

# Compare configurable fees and selection on the same seed
npm run practice -- --seed validation-1 --opening 0.85 --reference-share 0.88

# Level 2, with explicit fee behavior for reproducible experiments
npm run practice:level2 -- --seed market-example --fee-mode legacy
npm run practice:level2 -- --seed market-example --fee-mode stable
npm run practice:level2 -- --seed market-example --fee-mode delayed

# Complete up to five secret weeks in the current Level 1 ranking round
npm run board

# Level 2 ranking round, after validation and team coordination
npm run board:level2

# Level 3 experiments on the same seed
npm run practice:level3 -- --seed network-example --network baseline
npm run practice:level3 -- --seed network-example --network offers
npm run practice:level3 -- --seed network-example --network chains

# Level 3 ranking round, only after validation
npm run board:level3

# Level 4 quote comparison (same seed and dispatch settings)
npm run practice:level4 -- --seed quotes-example --quote-mode first --quote-multiplier 1
npm run practice:level4 -- --seed quotes-example --quote-mode options --quote-multiplier 1.1

# Level 4 ranking round, after practice validation
npm run board:level4

# Inspect active worlds and teams with completed attempts
npm run status

# Resume an interrupted world (add --board when resuming a ranking run)
npm run practice -- --world WORLD_ID
```

Run summaries are saved as `results/WORLD_ID.json`. A rank requires all five weeks to meet the 90% delivery minimum. Ranked attempts are limited: coordinate with teammates before launching them. Interrupted worlds are preserved, and the agent never automatically deletes a ranking attempt.

Resume restores saved level, fee mode, network mode, policy, seed, cumulative statistics and offer counters. Explicit overrides retain effective settings. Without a local manifest, supply `--level`, `--opening`, `--reference-share`, and `--fee-mode` explicitly; Levels 3–4 also require `--network`. Level 4 requires `--quote-mode` and `--quote-multiplier` when saved quote settings are missing. Missing offer counters suppress offers until the next world day. Unknown action outcomes mark evidence incomplete and stop further ranked attempts. A world and its manifest must match. Keep per-world JSON files when moving the agent to another machine.

This is a rule-based Level 1–4 agent. Level 3 adds direct offers and optional two-order chains. Level 4 compares competitive quotes across feasible delivery options. Trade-ins remain excluded from eligible work; an unexpected win of a deliberately high decline quote triggers separate rescue gigs for all its legs. See [Level 3 measurements and limitations](docs/LEVEL-3-RESULTS.md). The runner refuses Levels 5–8; the final is Level 8 and needs further work.

## Team workflow

```sh
git clone git@github.com:pipiland2612/spread-bahn-agent.git
cd spread-bahn-agent
cp .env.example .env
git checkout -b feature/your-name
```

Keep experiments in separate branches and open a pull request for changes that affect the shared strategy.

## Repository layout

```text
src/           Agent and strategy implementation
docs/          Strategy and official reference documents
tests/         Policy and event-handling tests
vendor/spread/ Official TypeScript client, types, and starter
results/       Reproducible run summaries and leaderboard evidence
```

## Event details

Registration: [spread.bahnexpress.com/join](https://spread.bahnexpress.com/join)

Event code: `spread-kmu9z6`

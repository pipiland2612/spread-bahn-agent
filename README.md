# Spread by Bahn Express

Dispatch agent for the Spread hackathon: run a car transport company for one simulated week in Finland. Supports Levels 1 and 2.

**First result:** team **T2**, **#2** in the Level 1 round `Friday 20:01` when checked on 13 November 2026. Five qualifying weeks: **€20,389.15 margin**, **98.93% on time**, **1,400 orders**. [Results and evidence](docs/RESULTS.md). Live standings can change.

**Optimization:** Level 1 held-out margin improved **72.92%**, from €11,468.85 to €19,832.27 over three matched weeks. Worst candidate week: 98.94% on time. [Experiment details](docs/MARGIN-OPTIMIZATION.md).

**Level 2:** **#2** in the same named round when checked at 23:48 Helsinki time. Five qualifying weeks: **€31,612.14 margin**, **99.16% on time**, **2,972 orders**. The selected policy improved matched holdout margin by **2.23%**. [Measurements and ranked evidence](docs/LEVEL-2-RESULTS.md).

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

# Inspect active worlds and teams with completed attempts
npm run status

# Resume an interrupted world (add --board when resuming a ranking run)
npm run practice -- --world WORLD_ID
```

Run summaries are saved as `results/WORLD_ID.json`. A rank requires all five weeks to meet the 90% delivery minimum. Ranked attempts are limited: coordinate with teammates before launching them. Interrupted worlds are preserved, and the agent never automatically deletes a ranking attempt.

Resume restores saved level, fee mode, policy, and seed. Explicit fee overrides are recorded. Without a local manifest, supply `--level`, `--opening`, `--reference-share`, and `--fee-mode` explicitly. A world and its manifest must match. Keep per-world JSON files when moving the agent to another machine.

This is a rule-based Level 1/2 agent. The runner refuses Levels 3–8; the final is Level 8 and needs further work. [Level 2 measurements](docs/LEVEL-2-RESULTS.md).

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

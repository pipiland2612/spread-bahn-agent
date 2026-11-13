# Spread by Bahn Express

Starter repository for the Spread hackathon: build a system that runs a car transport company for one simulated week in Finland.

## Goal

Maximize gross margin while delivering at least 90% of cars by their deadlines.

- Quote dealers competitively.
- Post winning drives as driver gigs.
- Set driver fees high enough to get the work accepted on time.
- Track margin, deadlines, and leaderboard performance.

## Getting started

1. Copy `.env.example` to `.env`.
2. Add your personal Spread API key to `.env`.
3. Read the API and world rules at [spread.bahnexpress.com/llms.txt](https://spread.bahnexpress.com/llms.txt).
4. Add implementation code under `src/`.

Never commit `.env` or API keys. Each teammate should use their own key when possible.

## Team workflow

```sh
git clone <repository-url>
cd spread-bahn-agent
cp .env.example .env
git checkout -b feature/your-name
```

Keep experiments in separate branches and open a pull request for changes that affect the shared strategy.

## Repository layout

```text
src/       Agent and strategy implementation
docs/      Notes about the world model and decisions
tests/     Strategy and API tests
```

## Event details

Registration: [spread.bahnexpress.com/join](https://spread.bahnexpress.com/join)

Event code: `spread-kmu9z6`

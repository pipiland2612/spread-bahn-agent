# Margin and Level 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Level 1 margin with held-out evidence, then implement and validate Level 2.

**Architecture:** Retain the official client and shared request selection. Add explicit fee modes, configuration validation, and safe state restoration. Keep experiments reproducible through manifests and paired seeds.

**Tech Stack:** TypeScript, Node 22.18+, native Node tests, official Spread client, RTK, Git/gh over SSH.

**Spec:** `docs/superpowers/specs/2026-11-13-margin-and-level-2-design.md`

## Global Constraints

- No package dependencies or edits to the official kit.
- At most four unfinished experiment worlds concurrently.
- At least 95% on time on every tuning and validation week for promotion.
- Require positive validation total margin, improvement over paired baseline, and zero refused actions before promotion.
- Level 1 has exactly one schedule step. Level 2 schedules have 1–48 nondecreasing integer-minute, integer-cent steps.
- Preserve existing results, ignored credentials, and unfinished worlds. Never automatically delete ranked attempts.
- Do Level 1 optimization before Level 2 experiments. Use three tuning and three untouched validation seeds at each level.

## Review Focus

- Resume without a local manifest: require an explicit compatible policy instead of silently changing one.
- Rescue and cancellation in the same event batch: no stale reprices or duplicate posts.
- Fee increases refused by the server: retain confirmed state and report failure.
- Scheduled raises already active on restart: compute the current fee from schedule time, not its first step.
- A ranking round changes during a five-run invocation: preserve season identity and never silently mix rounds.

## Task 1: Validate fee and selection configuration

**Files:** Modify `src/policy.ts`; create `src/fees.ts`, `tests/fees.test.ts`; modify `tests/policy.test.ts`.

**Interfaces:** Produce `FeeMode = 'legacy' | 'stable' | 'delayed'`, `feeSchedule(level, mode, now, reference, policy)`, `targetMultiplier(mode, age, minutesLeft, opening)`, and `validatePolicy(policy)`.

- [ ] Write failing tests: Level 1 always one step; Level 2 stable one step; delayed two ordered steps; zero/NaN/Infinity/invalid shares and timings rejected.
- [ ] Run `rtk npm test`; confirm intended assertion failures.
- [ ] Implement schedules: stable opening only; delayed opening then at least 1.05 times reference at 120 minutes; legacy preserves current behavior. Rescue remains 1.65 reference within 180 minutes.
- [ ] Run `rtk npm test`; expect all passing. Commit.

## Task 2: Reliable event state and level-aware fees

**Files:** Modify `src/run.ts`; create `tests/desk.test.ts`.

**Interfaces:** `Desk(model, level=1, mode='legacy')`; current confirmed schedules stored separately from queued actions. `Desk.rebuild(snapshot, history)` restores scheduled state and urgency.

- [ ] Write failing tests for urgent drops, no-shows, cancelled queued reprices, replay deduplication, confirmed reprices, refusal reporting, and already-active schedule raises on restart.
- [ ] Run tests and inspect expected failures.
- [ ] Connect posting and ticking to fee helpers. Apply tracked fee updates only after successful action results. Drops wake and reopen; urgent drops rescue. Cancellation prunes all queued gig actions for the cancelled work.
- [ ] Run complete suite; commit.

## Task 3: Level-aware CLI, manifests, and experiments

**Files:** Create `src/settings.ts`, `tests/settings.test.ts`; modify `src/run.ts`, `package.json`.

**Interfaces:** Export pure `resolveSettings(args, manifest?, worldSummary?)` returning validated level, mode, policy, and seed; runner persists these before play. Explicit overrides on resume must be recorded.

- [ ] Write failing tests for Level 2 acceptance, Level 3 refusal, manifest restoration, incompatible resume level, missing-manifest policy requirements, and strict numeric CLI validation.
- [ ] Implement Level 1/2 routing, `--fee-mode`, level-specific boards, ranking-season preservation, and metadata including overrides. Preserve old Level 1 manifests as legacy mode.
- [ ] Run full suite and one small API smoke run only after Task 1/2 gates. Commit.

## Task 4: Select and validate Level 1 improvement

**Files:** Existing and new `results/*.json`; create `docs/MARGIN-OPTIMIZATION.md`; update defaults only if evidence passes the spec.

- [ ] Finish baseline plus two candidates on `margin-tune-1` through `margin-tune-3` using the existing CLI before implementing Task 3 if these processes are already running.
- [ ] Select highest-margin eligible candidate. Compare winner and baseline on `margin-holdout-1` through `margin-holdout-3`.
- [ ] If necessary test up to three further candidates. Promote only when every gate passes; otherwise retain baseline.
- [ ] Record exact settings, paired gains, worst delivery share, refusals, and world IDs. Run complete suite if defaults change. Commit.

## Task 5: Level 2 validation, ranking, and handoff

**Files:** `results/`, new `docs/LEVEL-2-RESULTS.md`; update `README.md`, `docs/STRATEGY.md`.

- [ ] Compare legacy, stable, and delayed modes on `market-tune-1` through `market-tune-3`. Use observed outcomes to choose opening fees and mode.
- [ ] Compare selected mode and Level 2 baseline on `market-holdout-1` through `market-holdout-3`; apply all spec gates.
- [ ] If eligible, play up to five available Level 2 ranked weeks sequentially, stopping after an unranked score. Save exact leaderboard response.
- [ ] Run complete suite and syntax/type checks appropriate to the changed modules. Commit evidence and docs.
- [ ] Request one independent whole-branch review. Fix important findings with RED→GREEN tests; ledger any deferred minors.
- [ ] Publish the reviewed branch and hand off measured results and limitations. Do not claim the Level 1 historic ranking was rewritten.

## Execution note

User delegated routine choices and requested trial and error. Native execution is selected to reduce usage. Existing Level 1 tuning processes may finish in the original checkout while implementation uses an isolated workspace. Task 4 runs alongside Tasks 1–3, but Level 2 API experiments start only after Task 4 finishes.

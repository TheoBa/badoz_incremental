# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What this project is

DEVRUN is a **finite, speedrunnable incremental game**. The player builds a SaaS product from solo dev to $1B exit. The win condition is hard — every run ends. The design goal is that first-timers discover the game blind, then replay faster with accumulated knowledge.

This is a personal project by Théo — keep implementations lean and readable over clever.

---

## Dev commands

```bash
npm run dev      # start server with auto-restart on file change (uses node --watch)
npm start        # start server without auto-restart (production)
```

The Express server (`server/index.js`) serves the static frontend from the project root **and** provides the `/api/*` routes. There is no separate build step — the frontend uses native ES modules (`type="module"` in `index.html`), so the browser loads files directly without bundling.

To test the API manually:
```bash
curl http://localhost:3000/api/analytics/runs
curl -X POST http://localhost:3000/api/state/save \
  -H "Content-Type: application/json" \
  -d '{"playerId":"theo","state":{}}'
```

nginx proxies port 80 → 3000. Config lives at `infra/nginx.conf`.

---

## Architecture

### The single rule: state flows one way

```
tick.js mutates state → render.js reads state → DOM updates
```

`state.js` is the **only place state lives**. No tab file, no render function, no route handler ever stores game values locally. This makes save/load trivial (serialize the whole object) and makes bugs easy to find (if something is wrong, check state.js first).

### Frontend

- **`src/main.js`** — entry point. Loads state (from save or `initState()`), calls `render()`, starts the tick loop.
- **`src/engine/state.js`** — canonical state object + `CONSTANTS` (all balancing variables). When filling in `null` constants, change only this file.
- **`src/engine/tick.js`** — game loop. Fires every `CONSTANTS.TICK_RATE` seconds (1 real second = 1 in-game hour). Every 24 ticks = 1 in-game day.
- **`src/engine/save.js`** — localStorage persistence. Will later sync to `/api/state`.
- **`src/ui/render.js`** — top-level renderer. Reads `state`, dispatches to the active tab's render function.
- **`src/tabs/*.js`** — one file per game tab. Each exports a `renderXxx(state)` function and action handlers (`onXxx(state, ...args)`). Action handlers **mutate state directly** — they do not return new state.
- **`src/ui/histograms.js`** — shared utility for the 7-bar KPI histograms.

### Backend

- **`server/index.js`** — Express entry. Mounts `/api/analytics` and `/api/state` routers, serves static files.
- **`server/routes/analytics.js`** — POST `/event` (ingest game events), GET `/runs` (run history).
- **`server/routes/state.js`** — POST `/save`, GET `/load` (server-side save slot).
- **`server/db/init.js`** — initialises sql.js (pure-JS SQLite, no native build). DB is kept in memory and flushed to `server/db/badoz.db.bin` after every write via `persist()`. Call `persist()` after every `db.run()` that writes data.
- **`server/db/schema.sql`** — three tables: `runs`, `events`, `saves`.

---

## Naming & style conventions

- **snake_case everywhere in the UI** — tab names, property names, button labels. This is intentional: the game has a nerdy dev aesthetic.
- **Tab identifiers**: `write_code`, `saas_product`, `freelance`, `investment`, `frontier_lab`, `post_on_x`. (`ship_feature` was folded into `saas_product`.)
- **CONSTANTS keys** use `PascalCase_with_underscores` (e.g. `Freelance_RCU_T1`) — this matches the GDD vocabulary so balancing discussions map directly to code.
- **`null` constants are not yet tuned** — do not invent values. Leave them `null` until a balancing pass sets them deliberately.

---

## Color coding — strict, never override

Every game mechanic has one canonical color. Use the right class or CSS variable everywhere: tab UIs, KPI sidebar dots, effect labels, button accents. **Changing a color requires updating every usage site at once.**

| Mechanic | Color | Hex | CSS var | Class |
|---|---|---|---|---|
| `RCU` / hardware | teal | `#1D9E75` | `var(--teal)` | `.teal` |
| `money` / income | teal | `#1D9E75` | `var(--teal)` | `.money` |
| `satisfaction` | teal | `#1D9E75` | `var(--teal)` | `.teal` |
| `retention` | blue | `#378ADD` | `var(--blue)` | `.blue` |
| `marketing_stream` | amber | `#BA7517` | `var(--amber)` | `.amber` |
| `reputation` | default | `var(--text)` | — | *(none — default text color)* |
| burn / daily cost | red | `#c94040` | `var(--red)` | `.burn` |
| cooldown timers | amber | `#BA7517` | `var(--amber)` | `.amber` |
| **Frontier Lab** accent | purple | `#8b5cf6` | `--lab-accent` | *(lab panel only)* |

The Frontier Lab tab uses a fully separate dark theme (`#0e0e14` background, purple `#8b5cf6` accent). Its CSS is scoped to `#panel-frontier_lab` and `.lab-*` child classes. Do not mix standard utility classes (`.teal`, `.amber`, etc.) inside the lab panel — use the lab-scoped equivalents.

---

## Key game mechanics (for context when editing logic)

- **Tick rate**: 1 real second = 1 in-game hour. 24 ticks = 1 day. 1 month ≈ 12 real minutes.
- **Three milestone tracks** (checked in `tick.js → checkMilestones`):
  1. Lifetime RCU → freelance tier upgrades (Junior → Senior → Lead → 10x)
  2. Cumulative Frontier Lab spend → agent unlocks
  3. Lifetime money earned → subscription price rounds (one-way, triggers demand shock)
- **Rush option** in freelance: one-time unlock costing `Freelance_RCU_T1` RCU, doubles mission reward, instant completion.
- **post_on_x**: available once per in-game day (24-tick cooldown). Each post compounds `reputation.multiplier` by ×1.05. No streak mechanic.
- **Frontier Lab billing**: plan changes take effect at the next in-game day boundary (tick % 24 === 0). Daily cost deducted then.
- **Run info panel** in the KPI dashboard is hidden until `state.runCount > 0`.

---

## Git workflow

- **`main`** — stable only. Never commit directly. Merges from `dev` only.
- **`dev`** — active development. All feature branches merge here.
- **`feature/xxx`** — short-lived, one mechanic per branch. Branch from `dev`, PR back to `dev`.

Commit message format: `type(scope): description`
Common types: `feat`, `fix`, `chore`, `docs`, `infra`, `refactor`.
Examples: `feat(tick): implement daily revenue`, `fix(server): correct static file path`.

Known issue: the macOS FUSE mount used by the Linux sandbox blocks `unlink()`, so git emits `unable to unlink` warnings. These are harmless — the post-commit hook at `.git/hooks/post-commit` clears stale lock files using `mv` instead of `rm`.

**Claude must never attempt `git push`.** The sandbox has no GitHub credentials. After committing, always tell Théo to run `git push origin <branch>` from his terminal. Do not retry push on failure — hand it off immediately.

### PR descriptions

When a feature branch is ready to push, Claude must write a PR description containing:

1. **Purpose** — one sentence on what the branch adds or fixes and why it matters.
2. **Changes** — a brief list of every file touched and what changed in each.
3. **Testing notes** — anything Théo should verify manually before merging.

Format it as a markdown block so Théo can paste it directly into the GitHub PR body.

---

## Backlog (one feature branch per item)

All `// TODO` stubs in `tick.js`, the tab render functions in `src/tabs/`, and the analytics event emission in `src/engine/save.js` are intentional placeholders. Do not fill them in incidentally while working on something else — each is its own feature branch.

### Pending items

- **KPI histograms — daily deltas** (`feature/kpi-histograms`)
  Replace cumulative lifetime snapshots with per-day deltas so bars fluctuate meaningfully.
  - `earned` bar → money earned **that day** (not `moneyLifetime`)
  - `rcu` bar → RCU acquired **that day** (clicks + passive, not `rcuLifetime`)
  - `mrr` bar → daily subscriptions: new sign-ups + renewals (recurrent paying customers), not net MRR level
  `history` in state needs a `prev` shadow object updated at each snapshot to compute the day-over-day delta.

- **ship_feature — infinite upgrades with scale cost** (`feature/ship-feature-scale`)
  All three upgrade tracks (satisfaction, retention, marketing_stream) should be infinitely purchasable with exponentially scaling costs, exactly like CPU/GPU in the investment tab.
  Formula: `baseCost × Ship_Cost_Scale^level`. Each purchase increments the level and the next card immediately appears with the higher cost. Confirm the stat delta per level and the scale factor match the GDD intent; tune constants if needed.

- **Reputation — full integration** (`feature/reputation`)
  Audit every mechanic that should be influenced by `reputation.multiplier` and wire it up consistently:
  - Confirm which acquisition/conversion formulas are multiplied by reputation.
  - Verify reputation is displayed with the correct color (default `var(--text)`) everywhere it appears.
  - Ensure `post_on_x` cooldown, `numberOfPosts`, and multiplier compound correctly across a full run.
  - Add any missing reputation effects called out in the GDD.

- **Milestone checks** (`feature/milestones`)
  Wire up `checkMilestones()` in `tick.js` for all three tracks:
  - **RCU milestones** — `Freelance_RCU_T1/T2/T3` (lifetime RCU) → freelance tier upgrades (junior → senior → lead → 10x).
  - **Money milestones** — `Price_Round_T1/T2` (lifetime money earned) → subscription price rounds; `Lab_Unlock_Money` (already gated in UI, but should also fire an event).
  - **Lab spend milestones** — `Lab_Money_T1–T9` (cumulative `labSpendLifetime`) → Frontier Lab agent unlocks (ai_support, ai_marketer, and later agents). Tune the null thresholds as part of this branch.

- **Win condition** (`feature/win`)
  `$1B retire` button appears when `state.moneyLifetime >= WIN_CONDITION`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What this project is

BADOZ_INCREMENTAL is a **finite, speedrunnable incremental game**. The player builds a SaaS product from solo dev to $1B exit. The win condition is hard — every run ends. The design goal is that first-timers discover the game blind, then replay faster with accumulated knowledge.

This is a personal project by Théo — keep implementations lean and readable over clever.
It will be made clever from time to time semi-manually".

---

## Dev commands

```bash
npm run dev      # start server with auto-restart on file change (uses node --watch)
npm start        # start server without auto-restart (production)
```

The Express server (`server/index.js`) serves the static frontend from the project root **and** provides the `/api/*` routes. There is no separate build step — the frontend uses native ES modules (`type="module"` in `index.html`), so the browser loads files directly without bundling.

To test the API manually:
```bash
curl http://localhost:3000/api/runs/leaderboard
curl http://localhost:3000/api/runs/1
curl -X POST http://localhost:3000/api/runs/complete \
  -H "Content-Type: application/json" \
  -d '{"player_name":"theo","won":true,"total_elapsed_ticks":1440,"series":{"t":[],"money":[],"rcu":[],"labBurn":[]}}'
```

nginx proxies port 80 → 3000. Config lives at `infra/nginx.conf`.

**Deployment** (mac mini): the production server runs from `~/badoz_prod`, a separate clone always on `main`. Never from the dev working tree.

Deploys are **automatic**: a crontab entry runs `~/badoz_prod/infra/auto-deploy.sh` every 5 minutes, which deploys + restarts the server whenever `origin/main` has new commits (so a `dev` → `main` merge goes live within 5 minutes). Logs: `~/Library/Logs/badoz/auto-deploy.log` and `server.log`. The cron must point at the `~/badoz_prod` copy of the script — macOS TCC silently blocks cron from reading anything under `~/Documents`.

To deploy manually instead:
```bash
bash infra/deploy.sh          # pulls origin/main into ~/badoz_prod
lsof -i :3000 -t | xargs kill # stop running server
cd ~/badoz_prod && npm start   # restart from prod dir
```

---

## Architecture

### The single rule: state flows one way

```
tick.js mutates state → render.js reads state → DOM updates
```

`state.js` is the **only place state lives**. No tab file, no render function, no route handler ever stores game values locally. This makes save/load trivial (serialize the whole object) and makes bugs easy to find (if something is wrong, check state.js first).

### Frontend

- **`src/main.js`** — entry point. Loads state (from save or `initState()`), calls `render()`, starts the tick loop.
- **`src/engine/config.js`** — **every balancing constant** (`CONSTANTS`, `MILESTONES`, `FREELANCE`, `SAAS`, `LAB`, `INVESTMENTS`). All mechanics derive from this file; a balancing pass touches only this file. When filling in `null` constants, change only this file.
- **`src/engine/formulas.js`** — pure derived-value helpers (`calcRcuPerClick`, `calcAgentBoost`, `softCap`, …). No mutation, no DOM.
- **`src/engine/state.js`** — canonical state object (`initState()`). Shape only; values come from config.
- **`src/engine/tick.js`** — game loop. Fires every `CONSTANTS.TICK_RATE` seconds (1 real second = 1 in-game hour). Every 24 ticks = 1 in-game day.
- **`src/engine/save.js`** — localStorage persistence.
- **`src/ui/render.js`** — top-level renderer. Reads `state`, dispatches to the active tab's render function.
- **`src/tabs/*.js`** — one file per game tab. Each exports a `renderXxx(state)` function and action handlers (`onXxx(state, ...args)`). Action handlers **mutate state directly** — they do not return new state.
- **`src/ui/histograms.js`** — shared utility for the 7-bar KPI histograms.

### Backend

- **`server/index.js`** — Express entry. Mounts the `/api/runs` router, serves static files.
- **`server/routes/runs.js`** — POST `/complete` (end-of-run analytics submission), GET `/leaderboard`, GET `/:id` (run detail with series/events for the post-game charts).
- **`server/db/init.js`** — initialises sql.js (pure-JS SQLite, no native build). DB is kept in memory and flushed to `server/db/badoz.db.bin` after every write via `persist()`. Call `persist()` after every `db.run()` that writes data.
- **`server/db/schema.sql`** — one table: `runs`.

---

## Naming & style conventions

- **snake_case everywhere in the UI** — tab names, property names, button labels. This is intentional: the game has a nerdy dev aesthetic.
- **Tab identifiers**: `write_code`, `saas_product`, `freelance`, `investment`, `frontier_lab`, `post_on_x`. (`ship_feature` was folded into `saas_product`.)
- **CONSTANTS keys** use `UPPER_CASE` for constant names and `lower_case_with_underscores` for derived attributes (e.g. `FREELANCE = { rcu_cost: { junior: 10, senior: 50 } }`).
- **`null` constants are not yet tuned** — do not invent values. Leave them `null` until a balancing pass sets them deliberately.

---

## Color coding — strict, never override

Every game mechanic has one canonical color. Use the right class or CSS variable everywhere: tab UIs, KPI sidebar dots, effect labels, button accents. **Changing a color requires updating every usage site at once.**

| Mechanic | Color | Hex | CSS var | Class |
|---|---|---|---|---|
| `money` / income | green | `#16a34a` | `var(--green)` | `.money` |
| `RCU` / hardware | blue | `#2563eb` | `var(--blue)` | `.rcu` |
| `MRR` | purple | `#7c3aed` | `var(--purple)` | `.mrr` |
| burn / daily cost | red | `#c94040` | `var(--red)` | `.burn` |
| `reputation` | gold | `#d97706` | `var(--gold)` | `.gold` |
| `marketing_stream` | gold | `#d97706` | `var(--gold)` | `.gold` |
| `satisfaction` | pink | `#db2777` | `var(--pink)` | `.pink` |
| `retention` | yellow | `#a89200` | `var(--yellow)` | `.yellow` |
| cooldown timers | grey | `var(--text2)` | — | *(none — use default muted text color)* |

Reputation and `marketing_stream` share the same gold color — this is intentional to signal to the player that the two mechanics are related.

The Frontier Lab tab uses the same light theme as the rest of the app. Its CSS is scoped to `.lab-*` classes. Standard utility classes are used inside the lab panel for boost value labels — this is intentional.

---

## Key game mechanics (for context when editing logic)

- **Tick rate**: 1 real second = 1 in-game hour. 24 ticks = 1 day. 1 month ≈ 12 real minutes.
- **Milestone tracks** (defined in `engine/milestones.js`, claimed by the player in the milestones tab):
  1. money_earned; unlocks the `investments` tab and 2 `launch_new_subscription()` unlocks (t2 $100/mo → t3 $1000/mo)
  2. freelance_missions; unlocks freelance related upgrades (Junior → Senior → Lead → 10x) as well as the `rush` option: double RCU cost to mission reward.
  3. rcu_gained → unlocks the `frontier_lab` tab and first 3 agents 
  4. lab_spend → agent unlocks lab scale plan (free → hobbyist → growth → scale → infernal)
  5. mrr_peak; unlocks investments options then frontier_lab agents (ai_marketer → ai_ceo)
- **post_on_x**: available once per in-game day (24-tick cooldown). Each post adds `POST_REP_DELTA` (+0.01) to `reputation.multiplier`. No streak mechanic.
- **Frontier Lab billing**: plan changes take effect at the next in-game day boundary (tick % 24 === 0). Daily cost deducted then.
- **Run info panel** in the KPI dashboard is hidden until `state.runCount > 0`.

---

## Git workflow

- **`main`** — release branch. Prod (`~/badoz_prod`) always serves from `main`. Only `dev` merges into it — a `dev` → `main` merge **is** a release.
- **`dev`** — long-lived integration branch. All day-to-day work lands here.
- **`feature/xxx`** — short-lived, one mechanic per branch. Branch from `dev`, PR back to `dev`.

Commit message format: `type(scope): description`
Common types: `feat`, `fix`, `chore`, `docs`, `infra`, `refactor`.
Examples: `feat(tick): implement daily revenue`, `fix(server): correct static file path`.

Known issue: the macOS FUSE mount used by the Linux sandbox blocks `unlink()`, so git emits `unable to unlink` warnings. These are harmless — the post-commit hook at `.git/hooks/post-commit` clears stale lock files using `mv` instead of `rm`.

**Claude is authorised to:**
- `git push origin <feature-branch>` — push feature branches to remote.
- `gh pr create` — open PRs (feature → dev).
- `gh pr merge` — merge PRs once created (squash merge preferred).

Releases (`dev` → `main`) are done by Théo. Never force-push to `main` or `dev`. Never push directly to `main` or `dev`.

---

# Plan — v0 online release (run submission + leaderboard + post-game analytics)

Goal: ship DEVRUN so friends play it in a browser, and a completed run posts its
data to the Mac Mini to power (a) a fastest-run leaderboard and (b) AoE-style
post-game analytics.

## Decisions (locked)

- **Completed run = the $1B win only.** No partial/give-up submissions in v0.
- **Leaderboard metric = in-game time (`total_elapsed_ticks`), ascending.**
  Deterministic, tied to efficient play, immune to tab-backgrounding.
- **Identity = a `player_name`** entered once, stored in `localStorage`. No accounts.
- **Hosting is done** — already live behind a Cloudflare Tunnel at
  `http://incremental.badoz.org` → `localhost:3000`. No app/infra work here.
- **Analytics series are all cumulative** (money earned, RCU generated, lab tokens
  burned) — AoE "resources gathered" style, monotonic and comparable on one axis.
- **Minimal payload** — only what the board + the 3 graphs + price markers need.
  No final-build snapshot in v0 (easy to add later, it's just a JSON blob).

## Hard dependency / risk

Because only a win submits, **the win must be reachable and roughly tuned** or the
leaderboard never populates. Today `feature/win` is unbuilt and several balancing
constants are `null`. v0 therefore includes a playtest pass confirming at least one
honest run reaches `WIN_CONDITION`. `devMode` runs can validate the pipeline before
balance is final, but are flagged (`dev_mode = 1`) and excluded from the board.

Trust model: friends only. No anti-cheat beyond the dev-mode flag and basic
server-side sanity bounds (reject negative/absurd values).

## Run lifecycle

1. **Run start** — `initState()` sets `runStartedAt = Date.now()` and an empty
   `series` buffer + `events` array. A new run after a win re-stamps/clears them.
2. **Sampling** — every `CONSTANTS.Sample_Every_Ticks` (= 24, one in-game day) the
   tick loop appends the current tick + cumulative `moneyLifetime`, `rcuLifetime`,
   `labSpendLifetime` into `state.series`.
3. **Price-raise events** — price only ever changes via a manual player raise on
   the `saas_product` tab. On each raise, push `{ tick, type:'raise_price', from, to }`
   onto `state.events`. (`Saas_Price_Shock_*` computes the conversion/retention
   penalty of the raise — it is not a separate event.)
4. **Win** — when `moneyLifetime >= CONSTANTS.WIN_CONDITION`, show a win screen with
   the summary + graphs, then POST once. A `runSubmitted` flag prevents double-posts.
5. After submit, offer "new run" (reset to `initState`, `runCount++`).

## Data model

One `runs` table replaces the current `runs`/`events` split (the standalone
`events` table folds into a per-run blob; `saves` is unchanged). Pre-release with no
real data → just rewrite `schema.sql` and regenerate the `.db.bin`; no migration.

```sql
CREATE TABLE IF NOT EXISTS runs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name         TEXT    NOT NULL,
  saas_name           TEXT,
  total_elapsed_ticks INTEGER NOT NULL,   -- leaderboard sort key (ASC)
  submitted_at        INTEGER NOT NULL,   -- "date" on the board
  won                 INTEGER DEFAULT 1,
  dev_mode            INTEGER DEFAULT 0,
  client_version      TEXT,
  series_json         TEXT,               -- the 3 cumulative time series
  events_json         TEXT                -- timeline markers (price raises)
);
```

Rationale: a run's series is only ever fetched whole to chart one run — never
aggregated across runs in SQL — so JSON blobs beat a normalized `samples` table.
Leaderboard stays a flat indexed query; analytics is a single-row read.

**Payload sizing:** a ~4-hour run is ~14,400 ticks = 600 in-game days. At one
sample/day (`Sample_Every_Ticks = 24`) that's ~600 samples × 4 numbers ≈ 20 KB JSON
per run — trivial to sample, store, transmit, and chart. No downsampling needed;
the constant is the knob if runs ever get much longer.

### Submit payload — `POST /api/runs/complete`

```jsonc
{
  "player_name": "theo",
  "saas_name": "...",
  "total_elapsed_ticks": 0,
  "won": true,
  "dev_mode": false,
  "client_version": "0.1.0",
  "series": {
    "sampleEveryTicks": 24,
    "t":       [0, 24, 48],
    "money":   [],      // cumulative moneyLifetime
    "rcu":     [],      // cumulative rcuLifetime
    "labBurn": []       // cumulative labSpendLifetime
  },
  "events": [
    { "tick": 2200, "type": "raise_price", "from": 1,  "to": 10  },
    { "tick": 5400, "type": "raise_price", "from": 10, "to": 100 }
  ]
}
```

Server sets `submitted_at = now`, validates sanity bounds, writes flat columns +
`series_json`/`events_json`.

### Reads

- `GET /api/runs/leaderboard?limit=20`
  `WHERE dev_mode=0 ORDER BY total_elapsed_ticks ASC`, returns
  `{ rank, player_name, saas_name, total_elapsed_ticks, submitted_at }` per row.
- `GET /api/runs/:id` — one run's `series_json` + `events_json` for the post-game view.

## Frontend

- **Name prompt** — first load with no stored `player_name` asks for one.
- **Win screen** — summary + the post-game graphs (3 cumulative series with
  `raise_price` markers overlaid on the timeline), submit confirmation, "new run".
- **Leaderboard view** — a `leaderboard` tab (snake_case, default text styling)
  fetching `/api/runs/leaderboard`; rows clickable through to the post-game graphs.

## Build sequence (one feature branch each, branched from `dev`)

1. `feature/win` — win condition, win screen, `runStartedAt`, new-run reset.
2. `feature/run-series` — `series` buffer + sampler in `tick.js`, and `raise_price`
   event emission on manual price raises (`saas_product` tab).
3. `feature/run-submit` — state→payload builder, `POST /api/runs/complete`,
   `schema.sql` rewrite, server-side sanity bounds.
4. `feature/leaderboard` — `GET /api/runs/leaderboard` + `GET /api/runs/:id`,
   leaderboard tab, post-game graph view.
5. Balance/playtest pass — confirm an honest run reaches `WIN_CONDITION`.

Each branch PRs back to `dev`; `dev` → `main` for the release. Théo runs `git push`.

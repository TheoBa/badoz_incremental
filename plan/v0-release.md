# Plan — v0 online release (run submission + leaderboard)

Goal: ship DEVRUN so friends play it in a browser, and a completed run posts a
summary to the Mac Mini that powers per-player analytics and a fastest-run
leaderboard.

## Decisions (locked)

- **Completed run = the $1B win only.** No partial/give-up submissions in v0.
- **Leaderboard metric = in-game time (`ticksElapsed`), ascending.** Deterministic,
  tied to efficient play, immune to tab-backgrounding (ticks pause when the tab
  is hidden, so wall-clock would diverge). We still *store* real seconds for later
  analysis, but never rank on it.
- **Exposure = Cloudflare Tunnel** (`cloudflared`) → `localhost:3000`. No port
  forwarding, no home IP exposure, free TLS.
- **Identity = a handle** entered once, stored in `localStorage`. No accounts.

## Hard dependency / risk

Because only a win submits, **the win must be reachable and roughly tuned** or the
leaderboard never populates. Today `feature/win` is unbuilt and several balancing
constants are `null`. v0 therefore includes a playtest pass that confirms at least
one honest run reaches `WIN_CONDITION`. `devMode` (the backtick dev panel) can be
used to validate the submit pipeline before balance is final, but those runs must
be flagged (`devModeUsed: true`) and excluded from the public board.

Trust model: friends only, no anti-cheat beyond the dev-mode flag and basic
server-side sanity bounds (reject negative/absurd values).

## Run lifecycle

1. **Run start** — `initState()` sets `runStartedAt = Date.now()`. A new run after a
   win re-stamps it.
2. **Splits** — when `checkMilestones()` first fires a milestone, record the tick:
   `state.splits[stepId] = state.ticksElapsed`. (New `splits: {}` field in state;
   depends on `feature/milestones` being wired.)
3. **Win** — when `moneyLifetime >= CONSTANTS.WIN_CONDITION`, show a win screen with
   the run summary, then POST it once. A `runSubmitted` flag prevents double-posts.
4. After submit, offer "new run" (reset to `initState`, `runCount++`).

## Data model

Extend the existing `runs` table — keep indexed columns for the board, add one blob:

```sql
ALTER TABLE runs ADD COLUMN handle        TEXT;
ALTER TABLE runs ADD COLUMN ticks_elapsed INTEGER;  -- leaderboard sort key
ALTER TABLE runs ADD COLUMN money_lifetime INTEGER;
ALTER TABLE runs ADD COLUMN dev_mode      INTEGER DEFAULT 0;
ALTER TABLE runs ADD COLUMN summary_json  TEXT;      -- full payload below
```

`events` table stays unused in v0 (per-event streaming is out of scope).

### Submit payload — `POST /api/runs/complete`

```jsonc
{
  "handle": "theo",
  "productName": "...",
  "won": true,
  "clientVersion": "0.1.0",
  "devModeUsed": false,
  "timing":  { "ticksElapsed": 0, "inGameDays": 0, "durationRealS": 0 },
  "economy": { "moneyLifetime": 0, "rcuLifetime": 0,
               "labSpendLifetime": 0, "mrrPeak": 0 },
  "build": {
    "freelanceTier": "tenmx",
    "reputationMult": 1.0,
    "numberOfPosts": 0,
    "hardware": { "gearLevel": 0, "laptopLevel": 0, "cpuLevel": 0, "gpuLevel": 0 },
    "labAgents": { "ai_coder": { "tier": "scale", "model": "v3.2" } },
    "upgradeCounts": { "conversion": 0, "retention": 0, "marketingStream": 0 }
  },
  "milestonesClaimed": ["..."],
  "splits": { "freelance_senior": 1234, "price_round_1": 2200, "ai_support": 800 }
}
```

Server validates, computes nothing it can't trust, writes indexed columns +
`summary_json`, sets `won=1`, `ended_at=now`, `duration_s` from `durationRealS`.

### Read — `GET /api/runs/leaderboard?limit=20`

Returns top N where `won=1 AND dev_mode=0`, ordered by `ticks_elapsed ASC`.
Each row: `{ rank, handle, productName, ticksElapsed, inGameDays, moneyLifetime, date }`.

## Frontend

- **Handle prompt** — first load with no stored handle asks for one, saves to
  `localStorage`, sends with the run.
- **Win screen** — overlay showing the summary + the player's splits, a "submitted"
  confirmation, and a "new run" button.
- **Leaderboard view** — a `leaderboard` tab (snake_case, default text styling)
  that fetches `/api/runs/leaderboard` and renders rank / handle / in-game time.
  Could also surface "your best run" vs the board.

## Hosting (Cloudflare Tunnel)

On the Mac Mini:

```bash
brew install cloudflared
cloudflared tunnel login                       # auth a domain in Cloudflare
cloudflared tunnel create devrun
# route a hostname (e.g. devrun.<yourdomain>) to the tunnel, then:
cloudflared tunnel run --url http://localhost:3000 devrun
```

The Node server already serves the frontend and API on :3000, so the tunnel can
point straight at it; nginx becomes optional. Run `cloudflared` and the server as
background services (pm2 for node, `cloudflared service install` for the tunnel) so
they survive reboots. A named tunnel needs a domain for a stable URL; a quick
tunnel works for testing but the URL changes on restart.

## Build sequence (one feature branch each, branched from `dev`)

1. `feature/win` — win condition, win screen, `runStartedAt`, new-run reset.
   *(Prereq: `feature/milestones` for splits, or stub splits as `{}` for now.)*
2. `feature/run-submit` — state→payload builder, `POST /api/runs/complete`, schema
   migration, server-side sanity bounds.
3. `feature/leaderboard` — `GET /api/runs/leaderboard` + the leaderboard tab.
4. `feature/deploy-tunnel` — `cloudflared` config, pm2/service setup, deploy notes
   (no app code — infra + docs).
5. Balance/playtest pass — confirm an honest run reaches `WIN_CONDITION`.

Each branch PRs back to `dev`; `dev` → `main` for the release. Théo runs
`git push` and the Cloudflare/pm2 setup on the Mac Mini himself.

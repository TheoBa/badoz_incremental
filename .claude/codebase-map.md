# DEVRUN — Codebase Map

_Living reference. Updated by `/sync-codebase-map` after each feature branch. Source of truth for planning._

---

## Data flow (single rule)

```
user action / setInterval
        │
        ▼
   tick.js::tick()          ← mutates state
        │
        ▼
   render.js::render()      ← reads state, writes DOM
        │
        ▼
     DOM                    ← never stores values
```

`state.js` is the **only place state lives**. Every other file reads or mutates it — nothing stores a copy.

---

## File inventory

### Entry & boot

| File | Role |
|---|---|
| `index.html` | Shell: tab buttons (`.tab[data-tab]`), panels (`#panel-<id>`), KPI sidebar, header bar |
| `src/main.js` | Boot: `load() ?? initState()`, seeds missions, applies save migrations, wires tab-click events, calls `initDevPanel(state, render)`, starts tick loop |

### Engine

| File | Role |
|---|---|
| `src/engine/state.js` | Canonical state object (`initState()`), `CONSTANTS`, `LAB_PLANS`, derived helpers (`calcRcuPerClick`, `calcModelTotalMinorIncrements`, `calcCoderRcuPerHour`, `calcSupportRetentionBonus`, `calcMarketerMarketingBonus`, `calcMarketerRepPerDay`) |
| `src/engine/tick.js` | Game loop (`startTick`). 1 tick = 1 in-game hour. Every 24 ticks fires daily functions. Calls `checkMilestones` every tick (currently a TODO stub). |
| `src/engine/save.js` | `save(state)` / `load()` — localStorage persistence. TODO: sync to `/api/state`. |
| `src/engine/missions.js` | `generateMissions(tier)` — returns 3 randomised freelance missions using Box-Muller normal distribution around `CONSTANTS.Freelance_RCU_Cost_Tx`. |
| `src/engine/milestones.js` | `MILESTONE_TRACKS` definition, `getStepStatus(track, step, state)`, `getProgressTarget(track, state)`. Status is derived on-the-fly; only `state.milestones.claimed` is persisted. |

### UI

| File | Role |
|---|---|
| `src/ui/render.js` | `render(state)` — calls `renderHeader`, `renderKpi`, `renderActiveTab`. Dispatches to active tab renderer. Exports `fmt` (money) and `fmtN` (integer). |
| `src/ui/histograms.js` | `renderHistogram(el, dataArr, color)` — draws 7-bar KPI chart. |
| `src/ui/style.css` | All styles. Scoped lab theme: `#panel-frontier_lab` + `.lab-*`. |
| `src/ui/dev.js` | `initDevPanel(state, renderFn)` — dev-only overlay (fixed bottom-right, toggle with `` ` ``). Give money, give RCU, reset run. Self-contained: injects its own `<style>` tag. |

### Tabs

Each tab file exports `renderXxx(state)` and action handlers `onXxx(state, ...args)`. Handlers mutate state directly.

| File | Tab ID | Key exports |
|---|---|---|
| `src/tabs/write_code.js` | `write_code` | `renderWriteCode`, click handler adds RCU |
| `src/tabs/saas_product.js` | `saas_product` | `renderSaasProduct`, ship-feature purchase handlers, raise-price action |
| `src/tabs/freelance.js` | `freelance` | `renderFreelance`, accept/complete/rush mission handlers |
| `src/tabs/investment.js` | `investment` | `renderInvestment`, buy handlers for cold-outreach, SEO, newsletter, product-hunt, press, hardware |
| `src/tabs/frontier_lab.js` | `frontier_lab` | `renderFrontierLab`, model upgrade / plan change handlers |
| `src/tabs/post_on_x.js` | `post_on_x` | `renderPostOnX`, post handler (24-tick cooldown, compounds `reputation.multiplier` ×1.05) |
| `src/tabs/milestones.js` | `milestones` | `renderMilestones`, claim handler — calls `step.onClaim(state)` |
| `src/tabs/ship_feature.js` | _(folded into saas_product)_ | Legacy; no longer a separate tab |

### Backend

| File | Role |
|---|---|
| `server/index.js` | Express entry. Serves static from project root. Mounts `/api/analytics` and `/api/state`. Port 3000 (nginx proxies 80 → 3000). |
| `server/routes/analytics.js` | `POST /event` (ingest), `GET /runs` (run history) |
| `server/routes/state.js` | `POST /save`, `GET /load` (server-side save slot) |
| `server/db/init.js` | sql.js (pure-JS SQLite). DB in memory, flushed to `server/db/badoz.db.bin` via `persist()`. Call `persist()` after every write. |
| `server/db/schema.sql` | Tables: `runs`, `events`, `saves` |
| `infra/nginx.conf` | nginx proxy: port 80 → 3000 |

---

## State shape (top-level keys)

```
state
├── runCount           int     — completed runs (hides run-info panel until > 0)
├── productName        string|null
├── ticksElapsed       int     — 1 tick/s; 24 = 1 day
├── rcu                float   — current resource
├── rcuLifetime        float   — total ever gained (milestone trigger)
├── wallet             float   — spendable money
├── moneyLifetime      float   — total ever earned (milestone trigger)
├── labSpendLifetime   float   — total lab billing paid (milestone trigger)
├── saas
│   ├── mrr            float
│   ├── mrrPeak        float   — highest MRR this run (churn-proof milestone value)
│   ├── customers      float
│   ├── satisfaction   float   — multiplier for conversion (default 1.0)
│   ├── retention      float   — reduces churn (default 1.0)
│   ├── marketingStream float  — permanent visitors/day from upgrades
│   ├── price          float   — $/mo; 0 until saas_product first visited
│   └── priceRound     int     — 0/1/2 tracks price tier
├── freelance
│   ├── tier           'junior'|'senior'|'lead'|'tenmx'
│   ├── missions       Mission[]  — refreshed every in-game day
│   └── rushUnlocked   bool
├── lab
│   └── agents
│       ├── ai_coder    AgentState  — always unlocked; passive RCU/h
│       ├── ai_support  AgentState  — unlocked via lab_m1 milestone
│       └── ai_marketer AgentState  — unlocked via lab_m2 milestone
├── reputation
│   ├── multiplier       float   — ×1.05 per post_on_x post
│   ├── postCooldownTicks int
│   └── numberOfPosts    int
├── upgrades            {satisfaction[], retention[], marketingStream[]}
├── investments
│   ├── active           [{id, label, ticksRemaining, marketingBoost}]
│   ├── productHuntUsed  bool
│   ├── pressUsesRemaining int|null
│   ├── pressCooldownTicks int
│   ├── newsletterCooldownTicks int
│   └── hardware         {gearLevel, laptopLevel, cpuLevel, gpuLevel}
├── history             {earned[], rcu[], mrr[], burn[]}  — 7-entry rolling window
├── milestones          {claimed: {[stepId]: true}}
├── rcuHistory          float[10]  — sliding window for RCU/h display
└── _rcuThisTick        float      — accumulates this tick, reset after window push
```

`AgentState`: `{ unlocked, tier, pendingTier, modelMajor, modelMinor }`

---

## Tick logic (per-tick and daily)

**Every tick:**
1. `state.ticksElapsed++`
2. `applyLabAgents` — ai_coder passive RCU/h (plan.multiplier × calcCoderRcuPerHour)
3. If `ticksElapsed % 24 === 0` (daily):
   - `applyDailyAcquisition` — visitors = 1 + marketingStream + investBoosts + marketerBoost; gained = visitors × 0.05 × satisfaction
   - `applyDailyChurn` — churnRate = 0.02 / (retention + supportBonus)
   - `applyDailyRevenue` — daily = price × customers / 30
   - `applyDailyMarketerRep` — reputation.multiplier += calcMarketerRepPerDay
   - `applyDailyLabBilling` — flush pendingTier changes, deduct plan costs
   - `refreshFreelanceMissions` — new 3-mission pool for current tier
   - `pushHistorySnapshot` — append to 7-entry rolling window
4. `tickInvestments` — decrement boost timers, remove expired
5. `postCooldownTicks--` if > 0
6. `checkMilestones` — TODO (stub)
7. RCU/h sliding window update

---

## Milestone tracks

Defined in `src/engine/milestones.js`. Checked and rendered in `src/tabs/milestones.js`. Status derived on-the-fly; only `state.milestones.claimed[id]` is stored.

| Track | Trigger value | Steps |
|---|---|---|
| `money_earned` | `state.moneyLifetime` | lab_unlock (autoClaim), price_t1 ($5K), price_t2 ($100K) |
| `rcu_gained` | `state.rcuLifetime` | freelance_t1 (500 → senior), freelance_t2 (5K → lead), freelance_t3 (50K → 10x) |
| `mrr` | `state.saas.mrrPeak` | mrr_t1–t5 (unlocks investment items and lab plans) |
| `lab_burn` | `state.labSpendLifetime` | lab_m1 (ai_support), lab_m2 (ai_marketer), lab_m3–m5 (TBD) |

`autoClaim` steps (e.g. `lab_unlock`) auto-resolve — no player interaction needed.

---

## Key formulas

```
RCU/click   = floor((1 + gearBonus + laptopBonus) × cpuMult × gpuMult)
              cpuMult = 1 + cpuLevel × Hardware_CPU_Delta
              gpuMult = 1 + gpuLevel × Hardware_GPU_Delta

CoderRCU/h  = (Coder_RCU_Base + totalMinorIncrements × Coder_RCU_Delta) × plan.multiplier

totalMinor  = (modelMajor - 1) × 9 + modelMinor

SupportBonus = (Support_Retention_Base + n × Support_Retention_Delta) × plan.multiplier

MarketerVisitors/d = (Marketer_Marketing_Base + n × Marketing_Delta) × plan.multiplier

MissionReward = rcuCost × Freelance_Money_Mult_Tx
  rcuCost ~ N(Freelance_RCU_Cost_Tx, Tx × StdDev)
```

---

## Constants overview (key balancing values)

See `src/engine/state.js:CONSTANTS` for full list. `null` values are not yet tuned — leave them null.

| Key(s) | What they control |
|---|---|
| `Freelance_RCU_Cost_T1–T4` | Mission RCU cost mean per tier |
| `Freelance_RCU_T1/T2/T3` | Lifetime RCU thresholds for tier upgrades |
| `Lab_Money_T1–T9` | Lab spend thresholds for agent unlocks |
| `Price_Round_T1/T2` | Lifetime money thresholds for price raise eligibility |
| `Saas_Price_T1/T2/T3` | Subscription price values per tier |
| `Hardware_*` | Gear/laptop/CPU/GPU costs and RCU bonuses |
| `Lab_Model_*` | Minor/major upgrade costs for lab agents |
| `WIN_CONDITION` | 1,000,000,000 — $1B lifetime earned |

---

## Pending features (one branch each)

| Branch | What |
|---|---|
| `feature/kpi-histograms` | Replace cumulative snapshots with per-day deltas in history |
| `feature/milestones` | Wire `checkMilestones()` in tick.js (currently stub) |
| `feature/win` | $1B retire button when `moneyLifetime >= WIN_CONDITION` |

---

## Invariants (never violate)

- **State flows one way**: tick mutates → render reads → DOM updates. No reverse.
- **`null` constants are untuned** — do not invent values; wait for balancing pass.
- **`persist()` after every `db.run()` write** in backend.
- **`pendingTier`** buffers plan changes; they take effect at next `ticksElapsed % 24 === 0`.
- **`mrrPeak`** tracks highest MRR (churn can't un-qualify a milestone).
- **Color coding is strict** — teal for money/RCU/satisfaction, blue for retention, amber for cooldowns/marketing, red for burn, purple scoped to `#panel-frontier_lab` only.

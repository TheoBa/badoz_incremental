# Plan: KPI Histograms — Daily Deltas

**Branch:** `feature/kpi-histograms`

## Context

`pushHistorySnapshot()` in `src/engine/tick.js` (lines 137–145) stores cumulative lifetime values into the 7-slot history arrays:

| Bar | Current source |
|-----|---------------|
| `earned` | `state.moneyLifetime` |
| `rcu` | `state.rcuLifetime` |
| `mrr` | `state.saas.mrr` |
| `burn` | `state.labSpendLifetime` |

Because `moneyLifetime`, `rcuLifetime`, and `labSpendLifetime` only ever increase, all bars converge to the same height after a few days and become visually useless. `saas.mrr` can fluctuate but the level value is less informative than the daily change.

## Goal

Replace absolute snapshots with per-day deltas so bars reflect activity on that specific day.

| Bar | New meaning |
|-----|------------|
| `earned` | Money earned **that day** |
| `rcu` | RCU acquired **that day** (clicks + passive) |
| `mrr` | Net MRR change **that day** (new subs − churn) |
| `burn` | Lab spend **that day** |

## Changes

### 1. `src/engine/state.js`

Add a `prev` shadow object inside `history`:

```js
history: {
  prev: { earned: 0, rcu: 0, mrr: 0, burn: 0 },
  earned: [0, 0, 0, 0, 0, 0, 0],
  rcu:    [0, 0, 0, 0, 0, 0, 0],
  mrr:    [0, 0, 0, 0, 0, 0, 0],
  burn:   [0, 0, 0, 0, 0, 0, 0],
},
```

### 2. `src/engine/tick.js` — `pushHistorySnapshot()`

Compute delta against `prev`, push the delta, then update `prev`:

```js
function pushHistorySnapshot(state) {
  const h = state.history;
  const p = h.prev;
  const push = (arr, val) => { arr.push(val); if (arr.length > 7) arr.shift(); };

  push(h.earned, state.moneyLifetime    - p.earned);
  push(h.rcu,    state.rcuLifetime      - p.rcu);
  push(h.mrr,    state.saas.mrr         - p.mrr);
  push(h.burn,   state.labSpendLifetime - p.burn);

  p.earned = state.moneyLifetime;
  p.rcu    = state.rcuLifetime;
  p.mrr    = state.saas.mrr;
  p.burn   = state.labSpendLifetime;
}
```

Deltas can be zero or negative (e.g. MRR churn). `renderHistogram` already clamps bar height to a minimum of 2px, so a zero-delta day renders as a flat bar — correct behaviour.

## No UI changes needed

`src/ui/histograms.js` and `src/ui/render.js` are untouched. The renderer normalises any array of numbers to proportional heights.

## Verification

1. Start a fresh run.
2. Wait 2+ in-game days (48+ real seconds).
3. Confirm the `earned` bar fluctuates — taller on days with income, flat on idle days.
4. Confirm the `burn` bar is flat when no Frontier Lab plan is active.
5. Confirm the `mrr` bar reflects daily sub changes, not the running MRR level.

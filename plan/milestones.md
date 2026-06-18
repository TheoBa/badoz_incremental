# Plan: Milestone Checks — Full Wiring

**Branch:** `feature/milestones`

## Context

`checkMilestones()` in `src/engine/tick.js` (lines 157–161) is called every tick but is a stub:

```js
function checkMilestones(state) {
  // TODO: Freelance_RCU_T1/T2/T3 → freelance tier upgrades
  // TODO: Lab_Money_T1–T9 → agent unlocks
  // TODO: Price_Round_T1/T2 (lifetime money earned) → subscription price rounds
}
```

The track definitions and `onClaim()` handlers already exist in `src/engine/milestones.js` (MILESTONE_TRACKS array). The milestone tab reads `state.milestones.claimed[stepId]` to show progress. The frontier_lab tab gates paid plans behind milestone claims.

## Goal

Implement `checkMilestones()` so milestone effects trigger automatically when thresholds are crossed, without requiring a manual claim action.

## Tracks and thresholds

### RCU track (`rcu_gained`) → freelance tier upgrades

| Step ID | Threshold | Effect |
|---------|-----------|--------|
| `freelance_t1` | `Freelance_RCU_T1 = 500` RCU lifetime | `state.freelance.tier = 'senior'` |
| `freelance_t2` | `Freelance_RCU_T2 = 5 000` RCU lifetime | `state.freelance.tier = 'lead'` |
| `freelance_t3` | `Freelance_RCU_T3 = 50 000` RCU lifetime | `state.freelance.tier = 'tenmx'` |

### Money track (`money_earned`) → subscription price rounds

| Step ID | Threshold | Effect |
|---------|-----------|--------|
| `price_t1` | `Price_Round_T1 = 5 000` money lifetime | advances `state.saas.priceRound` → price $10/mo |
| `price_t2` | `Price_Round_T2 = 100 000` money lifetime | advances `state.saas.priceRound` → price $100/mo |

### Lab spend track (`lab_burn`) → agent unlocks

| Step ID | Threshold | Effect |
|---------|-----------|--------|
| `lab_m1` | `Lab_Money_T1 = 1 000` lab spend | `state.lab.agents.ai_support.unlocked = true` |
| `lab_m2` | `Lab_Money_T2 = 10 000` lab spend | `state.lab.agents.ai_marketer.unlocked = true` |
| `lab_m3` | `Lab_Money_T3 = 50 000` | teaser only — `onClaim: null` |
| `lab_m4` | `Lab_Money_T4 = 200 000` | teaser only |
| `lab_m5` | `Lab_Money_T5 = 500 000` | teaser only |
| `lab_m6–m9` | `Lab_Money_T6–T9 = null` | not yet tuned |

## Changes

### 1. `src/engine/tick.js` — implement `checkMilestones()`

```js
function checkMilestones(state) {
  for (const track of MILESTONE_TRACKS) {
    const val = track.getValue(state);
    for (const step of track.steps) {
      if (step.threshold === null) continue;
      if (state.milestones.claimed[step.id]) continue;
      if (val >= step.threshold) {
        if (step.onClaim) step.onClaim(state);
        state.milestones.claimed[step.id] = true;
      }
    }
  }
}
```

The `threshold === null` guard skips untuned lab steps cleanly.

### 2. `src/engine/state.js` — null Lab_Money thresholds

`Lab_Money_T6` through `Lab_Money_T9` are currently `null`. Decision options:
- **Leave null** — the null guard above skips them; no gameplay effect. Clean.
- **Set placeholder values** — only if specific agents (PR Bot, Product Manager, Growth loops, AI CEO) have defined unlock behaviours. Do not set values for mechanics that don't exist yet.

Recommended: leave `null` for this branch. A separate balance pass can fill them in when the agents are implemented.

### 3. Verify `onClaim` handlers in `src/engine/milestones.js`

Before wiring, confirm each handler's state mutation:
- `freelance_t1/t2/t3` → sets `state.freelance.tier` to `'senior'`/`'lead'`/`'tenmx'`
- `lab_m1` → `state.lab.agents.ai_support.unlocked = true`
- `lab_m2` → `state.lab.agents.ai_marketer.unlocked = true`
- `price_t1/t2` → advances `state.saas.priceRound`; confirm the raise_price button in saas_product tab reacts

### 4. No tab changes

- Milestone tab already reads `state.milestones.claimed` for progress display.
- Frontier Lab tab already gates plans behind claimed milestone IDs.
- Freelance tab already reads `state.freelance.tier` to set mission rewards.
- SaaS tab already reads `state.saas.priceRound` and `state.milestones.claimed['price_t1/t2']` for the raise_price button.

## Verification

1. **Freelance tier:** Run until `state.rcuLifetime >= 500`. Confirm `state.freelance.tier` flips to `'senior'` automatically (no claim button needed). Confirm mission rewards reflect the new tier.
2. **Price round:** Earn 5 000 money lifetime. Confirm the raise_price button appears in the saas_product tab.
3. **Agent unlock:** Spend 1 000 total in Frontier Lab. Confirm the ai_support agent card becomes available.
4. **No double-claim:** Cross the same threshold twice in a single run; confirm the handler fires exactly once.

# Plan: Ship Feature — Infinite Upgrades with Scale Cost

**Branch:** `feature/ship-feature-scale`

## Context

The three upgrade tracks in `src/tabs/saas_product.js` (`satisfaction`, `retention`, `marketingStream`) already have the right foundation:

- Cost formula: `baseCost × Ship_Cost_Scale^level` (exponential, `Ship_Cost_Scale = 2`)
- Level stored as `state.upgrades[track.key].length` — already an unbounded array

But the render path caps purchases at 6 tiers via a fixed `UPGRADE_NAMES` array. When `level >= UPGRADE_NAMES.length`, the card shows "at max" and no further purchase is possible.

## Goal

Remove the 6-tier cap so all three tracks are infinitely purchasable, exactly like CPU/GPU in the investment tab.

## Current CONSTANTS (no changes needed)

```
Ship_Satisfaction_Base_Cost: 10   Ship_Satisfaction_Delta: 0.1
Ship_Retention_Base_Cost:    10   Ship_Retention_Delta:    0.1
Ship_Marketing_Base_Cost:    15   Ship_Marketing_Delta:    1
Ship_Cost_Scale:              2
```

## Changes — `src/tabs/saas_product.js` only

### 1. Remove the UPGRADE_NAMES name lookup

Replace `UPGRADE_NAMES[level]` with a generated label, e.g.:

```js
const cardTitle = `lv. ${level + 1}`;
```

If `UPGRADE_NAMES` is only used for this title (verify before deleting), remove the array entirely.

### 2. Delete the "at max" guard

Remove any branch of the form:

```js
if (level >= UPGRADE_NAMES.length) {
  // render "at max" / return early
}
```

Always fall through to render the next purchase card.

### 3. Keep everything else unchanged

- `upgradeCost(track, level)` formula is already correct.
- `onBuyUpgrade()` push logic is already correct.
- State shape is unchanged.

## Verification

1. Buy all 6 existing tiers on one track (e.g. satisfaction).
2. Confirm a 7th card appears immediately with cost `10 × 2^6 = 640 RCU`.
3. Buy it; confirm `state.saas.satisfaction` increments by `Ship_Satisfaction_Delta` (0.1).
4. Confirm the 8th card appears at `10 × 2^7 = 1 280 RCU`.
5. Repeat for retention and marketingStream tracks.

# Plan: Reputation — Full Integration

**Branch:** `feature/reputation`

## Context

`state.reputation.multiplier` is tracked, displayed, and incremented by two sources:

| Source | Effect |
|--------|--------|
| `onPostOnX()` in `src/tabs/post_on_x.js` | `+= PostOnX_Rep_Delta (0.01)` per post |
| AI Marketer (Frontier Lab) in `src/engine/tick.js` | `+= Lab_Marketer_Rep_Per_Day (0.001)` per day × plan multiplier |

But the multiplier is **never applied** to any game formula. The acquisition conversion in `src/engine/tick.js` line 86:

```js
const conversion = 0.05 * state.saas.satisfaction;
```

Reputation has no effect on the game despite being a visible metric.

## Goal

Wire `reputation.multiplier` into the acquisition formula and audit every other site where it should (or shouldn't) apply.

## Changes

### 1. `src/engine/tick.js` — acquisition formula

Apply the multiplier to conversion:

```js
const conversion = 0.05 * state.saas.satisfaction * state.reputation.multiplier;
```

Reputation scales how well visitors convert into subscribers — the canonical usage.

### 2. Audit other formula sites in `tick.js`

Review the following and confirm reputation applies only to conversion (not raw visitor generation):
- Organic visitor calculation (marketing stream, organic growth)
- Churn formula — reputation should NOT reduce churn (that's `retention`)
- Revenue formula — reputation should NOT double-count (it already affected customer count via conversion)

Document the decision here once confirmed. Likely outcome: reputation touches only the conversion line.

### 3. Verify `post_on_x` compounding

Current implementation: additive (`+= 0.01`).
Backlog note: GDD says ×1.05 per post.

Check the GDD or prior design notes. If multiplicative was intended, change to:

```js
state.reputation.multiplier *= 1.05;
```

**This is a balancing decision** — flag for Théo to confirm before changing. Additive is safer; multiplicative compounds fast.

### 4. Verify display color

Reputation value in `src/tabs/post_on_x.js` must render in `var(--text)` (default text color) with no color class. Per the color table in CLAUDE.md, reputation has no assigned color. Remove any `.teal`, `.amber`, `.blue` wrapper if present.

### 5. No new UI needed

Reputation is already displayed in `post_on_x.js` and the AI Marketer card in `frontier_lab.js`.

## Verification

1. Start a run with `state.reputation.multiplier` at its default (1.0).
2. Note the daily customer acquisition count.
3. Post on X several times to raise the multiplier to ~1.1.
4. Confirm daily acquisitions increase proportionally (~10% more).
5. Confirm the multiplier value shown in the UI matches the change.
6. Confirm churn and MRR revenue per customer are unaffected.

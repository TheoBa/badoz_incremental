# PR: Wire Reputation Multiplier into Acquisition Formula

## Purpose

Reputation was a visible metric that players could build up through Post on X and AI Marketer, but had **zero effect** on any game formula. This branch wires the `reputation.multiplier` into the customer acquisition formula, making reputation a meaningful progression lever that scales conversion rate.

## Changes

### `src/engine/tick.js` — Apply reputation to acquisition formula
**Line 87:** Multiplied the conversion rate by `state.reputation.multiplier`.

Before:
```js
const conversion = 0.05 * state.saas.satisfaction; // 5% base conversion rate
```

After:
```js
const conversion = 0.05 * state.saas.satisfaction * state.reputation.multiplier; // 5% base, scaled by reputation
```

**Why:** Reputation now directly scales how well visitors convert into subscribers. A multiplier of 1.5× means 50% more conversions at the same satisfaction level, creating a meaningful incentive to invest in Post on X and reputation-building investments.

### `src/ui/render.js` & `index.html` — Display actual conversion rate in dashboard

**render.js line 40:** Calculate and display the effective conversion rate instead of just the raw satisfaction value.

Before:
```js
set('k-sat', state.saas.satisfaction.toFixed(2));
```

After:
```js
const conversionRate = (0.05 * state.saas.satisfaction * state.reputation.multiplier).toFixed(4);
set('k-sat', conversionRate);
```

**index.html line 76:** Updated KPI label from `satisfaction` to `conversion_rate` for clarity.

**Why:** Players can now see the actual conversion rate in the dashboard KPI, making it clear how satisfaction and reputation combine to affect customer acquisition. The metric now reflects all factors affecting conversion.

### Audit of other formula sites (no changes)

Reviewed all other acquisition-related formulas in `tick.js` to confirm reputation applies only to conversion:

1. **Organic visitor generation (line 86)** — marketing stream and marketer boost are unaffected. Raw visitor generation should not scale with reputation; reputation only improves conversion. ✓
2. **Churn formula (line 100)** — uses retention, not reputation. Churn reduction is a retention lever, not a reputation lever. ✓
3. **Revenue formula (line 74)** — uses `price × customers`. Reputation already affects customer count via the conversion multiplier, so applying it again here would be double-counting. ✓

**Result:** Reputation touches only the conversion line, the canonical usage.

### Display color verification (no changes)

Both reputation displays already use correct styling:
- **post_on_x.js** (line 15, 32): Reputation value rendered in default text color (no `.teal`, `.amber`, `.blue` wrapper). ✓
- **frontier_lab.js** (line 215): Marketer card reputation/day display in default text color. ✓

Per CLAUDE.md color table, reputation has no assigned color and should use default text color (`var(--text)`).

## Verification

**Testing notes:**
1. Start a fresh run and note the conversion_rate KPI in the dashboard (should show 0.0500 = 0.05 × 1.0 × 1.0)
2. Post on X 5–10 times to raise reputation to ~1.05–1.10×
3. Verify:
   - Daily acquisitions increase proportionally (~5–10% more visitors converting)
   - Dashboard `conversion_rate` KPI now shows the scaled value (e.g., 0.0525 for 1.05× reputation)
   - The reputation multiplier shown in post_on_x tab matches the conversion_rate changes
   - AI Marketer card shows reputation/day being generated
4. Verify churn and MRR revenue per customer are unaffected (only customer count changes)

## Open question for balancing

**Post on X compounding behavior:** Current implementation is additive (`+= 0.01 per post`). The GDD (v0.6, line 261) uses the word "compounds," which suggests multiplicative behavior (×1.05 per post as noted in the backlog). This is a balancing decision:

- **Additive (+0.01):** Safer, slower growth. 100 posts = 2.0× multiplier.
- **Multiplicative (×1.05):** Compounds fast. 100 posts ≈ 131× multiplier (exponential).

Current code uses additive. No change made pending confirmation. Flag for a separate balancing pass if desired.

# Backlog — optional improvements for future iteration loops

Items here are not on the critical path. They get pulled into a feature branch when the core game is stable enough to polish.

---

- [ ] **KPI histograms — daily deltas** (`feature/kpi-histograms`)
  Replace cumulative lifetime snapshots with per-day deltas so bars fluctuate meaningfully.
  - `earned` bar → money earned **that day** (not `moneyLifetime`)
  - `rcu` bar → RCU acquired **that day** (clicks + passive, not `rcuLifetime`)
  - `mrr` bar → daily subscriptions: new sign-ups + renewals (recurrent paying customers), not net MRR level
  `history` in state needs a `prev` shadow object updated at each snapshot to compute the day-over-day delta.

- [ ] **ship_feature — infinite upgrades with scale cost** (`feature/ship-feature-scale`)
  All three upgrade tracks (satisfaction, retention, marketing_stream) should be infinitely purchasable with exponentially scaling costs, exactly like CPU/GPU in the investment tab.
  Formula: `baseCost × Ship_Cost_Scale^level`. Each purchase increments the level and the next card immediately appears with the higher cost. Confirm the stat delta per level and the scale factor match the GDD intent; tune constants if needed.

- [ ] **Reputation — full integration** (`feature/reputation`)
  Audit every mechanic that should be influenced by `reputation.multiplier` and wire it up consistently:
  - Confirm which acquisition/conversion formulas are multiplied by reputation.
  - Verify reputation is displayed with the correct color (default `var(--text)`) everywhere it appears.
  - Ensure `post_on_x` cooldown, `numberOfPosts`, and multiplier compound correctly across a full run.
  - Add any missing reputation effects called out in the GDD.

- [ ] **Milestone checks** (`feature/milestones`)
  Wire up `checkMilestones()` in `tick.js` for all three tracks:
  - **RCU milestones** — `Freelance_RCU_T1/T2/T3` (lifetime RCU) → freelance tier upgrades (junior → senior → lead → 10x).
  - **Money milestones** — `Price_Round_T1/T2` (lifetime money earned) → subscription price rounds.
  - **Lab spend milestones** — `Lab_Money_T1–T9` (cumulative `labSpendLifetime`) → Frontier Lab agent unlocks (ai_support, ai_marketer). Tune the null thresholds as part of this branch.

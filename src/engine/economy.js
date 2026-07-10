// economy.js — the game's economy steps, shared by the real tick loop
// (tick.js) and the headless strategy simulator (simulator.js).
// Every function mutates `state` in place and reads tuning from config.js.
// Keeping one implementation is what makes the simulator trustworthy for
// balancing — do not fork these formulas.

import { CONSTANTS, LAB } from './config.js';
import {
  softCap,
  calcCoderRcuPerHour,
  calcSupportRetentionBonus,
  calcMarketerMarketingBonus,
  calcProductManagerMultiplier,
  calcCeoReputationGain,
} from './formulas.js';

// ── Passive RCU generation (AI Coder agent) — every tick ──────
export function applyPassiveCoderRcu(state) {
  if (!state.milestones?.claimed?.lab_unlock) return;
  const coder = state.lab.agents.ai_coder;
  if (!coder.unlocked) return;

  // Free plan (multiplier 1) provides the baseline floor; paid plans scale above that
  const plan       = LAB.plans[coder.tier] ?? LAB.plans.free;
  const pmMult     = calcProductManagerMultiplier(state);
  const rcuPerHour = calcCoderRcuPerHour(coder) * plan.multiplier * pmMult;

  // 1 tick = 1 in-game hour
  state.rcu            += rcuPerHour;
  state.rcuLifetime    += rcuPerHour;
  state._rcuThisTick    = (state._rcuThisTick ?? 0) + rcuPerHour;
}

// ── Daily SaaS: acquisition + monthly renewal (cohort ring buffer) ─
export function applyDailySaas(state) {
  if (state.saas.tiers.length === 0) return;

  const slotIdx       = Math.floor(state.ticksElapsed / CONSTANTS.TICKS_PER_DAY) % CONSTANTS.COHORT_DAYS;
  const investBoost   = state.investments.active.reduce((s, b) => s + b.marketingBoost, 0);
  const pmMult        = calcProductManagerMultiplier(state);
  const marketerBoost = calcMarketerMarketingBonus(state) * pmMult;
  const visitors      = (1 + state.saas.marketingStream + investBoost + marketerBoost)
                        * state.reputation.multiplier;
  const supportBonus  = calcSupportRetentionBonus(state);

  for (const tier of state.saas.tiers) {
    // Renewal: the cohort that subscribed COHORT_DAYS ago either renews or churns
    const oldCohort    = tier.cohorts[slotIdx];
    const effRetention = (state.saas.retention + supportBonus * pmMult) * tier.retentionMult;
    const renewalProb  = effRetention > 0
      ? Math.pow(1 - CONSTANTS.CHURN_BASE / effRetention, CONSTANTS.COHORT_DAYS)
      : 0;
    const renewed      = oldCohort * renewalProb;

    // Acquisition: new signups today
    const convRate     = softCap(state.saas.conversion * tier.conversionMult, 1, CONSTANTS.CONV_HALF_LIFE);
    const gained       = visitors * convRate;

    // Revenue collected upfront: renewals pay for next month, new signups pay for month 1
    const revenue = (renewed + gained) * tier.price;
    state.wallet        += revenue;
    state.moneyLifetime += revenue;

    // Write slot: renewed subscribers + today's new signups
    tier.cohorts[slotIdx] = renewed + gained;
  }

  // Recompute derived fields
  state.saas.customers = state.saas.tiers.reduce(
    (total, t) => total + t.cohorts.reduce((a, b) => a + b, 0), 0
  );
  state.saas.mrr = state.saas.tiers.reduce(
    (s, t) => s + t.price * t.cohorts.reduce((a, b) => a + b, 0), 0
  );
  if (state.saas.mrr > (state.saas.mrrPeak ?? 0)) state.saas.mrrPeak = state.saas.mrr;
}

// ── Daily Lab billing ──────────────────────────────────────────
export function applyDailyLabBilling(state) {
  if (!state.milestones?.claimed?.lab_unlock) return;
  // Apply plan changes queued from previous day
  for (const agent of Object.values(state.lab.agents)) {
    if (agent.pendingTier != null) {
      agent.tier        = agent.pendingTier;
      agent.pendingTier = null;
    }
  }
  // Deduct daily plan costs
  let totalCost = 0;
  for (const agent of Object.values(state.lab.agents)) {
    if (!agent.unlocked) continue;
    const plan = LAB.plans[agent.tier];
    if (plan && plan.dailyCost > 0) totalCost += plan.dailyCost;
  }
  if (totalCost > 0) {
    state.wallet           -= totalCost;
    state.labSpendLifetime += totalCost;
  }
}

// ── Daily CEO reputation gain ──────────────────────────────────
export function applyDailyCeoReputation(state) {
  const gain = calcCeoReputationGain(state);
  if (gain > 0) state.reputation.multiplier += gain;
}

// tick.js — game loop
// Fires every TICK_RATE real seconds = 1 in-game hour.
// Every 24 ticks = 1 in-game day.

import {
  CONSTANTS, LAB_PLANS,
  calcCoderRcuPerHour,
  calcSupportRetentionBonus,
  calcMarketerMarketingBonus,
  calcMarketerRepPerDay,
} from './state.js';
import { generateMissions } from './missions.js';

export function startTick(state, onTick) {
  setInterval(() => {
    tick(state);
    onTick(state);
  }, CONSTANTS.TICK_RATE * 1000);
}

function tick(state) {
  state.ticksElapsed++;

  // Passive RCU generation (AI Coder agent)
  applyLabAgents(state);

  // Daily events (every 24 ticks = 1 in-game day)
  if (state.ticksElapsed % 24 === 0) {
    applyDailyAcquisition(state);
    applyDailyChurn(state);
    applyDailyRevenue(state);
    applyDailyMarketerRep(state);
    applyDailyLabBilling(state);
    refreshFreelanceMissions(state);
    pushHistorySnapshot(state);
  }

  // Tick down active investment boosts
  tickInvestments(state);

  // Post on X cooldown
  if (state.reputation.postCooldownTicks > 0) {
    state.reputation.postCooldownTicks--;
  }

  checkMilestones(state);
}

// ── Agent passive effects ──────────────────────────────────────
function applyLabAgents(state) {
  const coder = state.lab.agents.ai_coder;
  if (!coder.unlocked || coder.tier === 'free') return;  // free plan = idle

  const plan       = LAB_PLANS[coder.tier];
  const rcuPerHour = calcCoderRcuPerHour(coder) * plan.multiplier;

  // 1 tick = 1 in-game hour, so add rcuPerHour directly
  state.rcu         += rcuPerHour;
  state.rcuLifetime += rcuPerHour;
}

// ── Daily revenue ──────────────────────────────────────────────
function applyDailyRevenue(state) {
  if (state.saas.price === 0 || state.saas.customers < 1) return;
  const daily = (state.saas.price * state.saas.customers) / 30;
  state.wallet        += daily;
  state.moneyLifetime += daily;
  state.saas.mrr       = state.saas.price * state.saas.customers;
}

// ── Daily customer acquisition ─────────────────────────────────
function applyDailyAcquisition(state) {
  if (state.saas.price === 0) return;
  // Effective marketing stream = permanent value + active investment boosts + ai_marketer
  const investBoost    = state.investments.active.reduce((s, b) => s + b.marketingBoost, 0);
  const marketerBoost  = calcMarketerMarketingBonus(state);
  const visitors       = 1 + state.saas.marketingStream + investBoost + marketerBoost;
  const conversion     = 0.05 * state.saas.satisfaction; // 5% base conversion rate
  const gained         = visitors * conversion;
  state.saas.customers += gained;
  state.saas.mrr        = state.saas.price * state.saas.customers;
  // Track peak MRR for milestones (MRR can fluctuate due to churn)
  if (state.saas.mrr > (state.saas.mrrPeak ?? 0)) state.saas.mrrPeak = state.saas.mrr;
}

// ── Daily churn ────────────────────────────────────────────────
function applyDailyChurn(state) {
  if (state.saas.customers < 1) return;
  // 2% daily base churn, reduced by retention (+ ai_support bonus)
  const effectiveRetention = state.saas.retention + calcSupportRetentionBonus(state);
  const churnRate          = 0.02 / effectiveRetention;
  state.saas.customers     = Math.max(0, state.saas.customers - state.saas.customers * churnRate);
  state.saas.mrr           = state.saas.price * state.saas.customers;
}

// ── Daily ai_marketer reputation ───────────────────────────────
function applyDailyMarketerRep(state) {
  const repGain = calcMarketerRepPerDay(state);
  if (repGain > 0) state.reputation.multiplier += repGain;
}

// ── Daily Lab billing ──────────────────────────────────────────
function applyDailyLabBilling(state) {
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
    const plan = LAB_PLANS[agent.tier];
    if (plan && plan.dailyCost > 0) totalCost += plan.dailyCost;
  }
  if (totalCost > 0) {
    state.wallet           -= totalCost;
    state.labSpendLifetime += totalCost;
  }
}

// ── Freelance mission refresh ──────────────────────────────────
function refreshFreelanceMissions(state) {
  state.freelance.missions = generateMissions(state.freelance.tier);
}

// ── Histogram snapshots (one per in-game day) ──────────────────
function pushHistorySnapshot(state) {
  const h = state.history;
  const push = (arr, val) => { arr.push(val); if (arr.length > 7) arr.shift(); };
  push(h.earned,  state.moneyLifetime);
  push(h.rcu,     state.rcuLifetime);
  push(h.mrr,     state.saas.mrr);
  push(h.burn,    state.labSpendLifetime); // rough burn proxy until billing is implemented
}

// ── Investment boost timers ────────────────────────────────────
function tickInvestments(state) {
  state.investments.active = state.investments.active
    .map(b => ({ ...b, ticksRemaining: b.ticksRemaining - 1 }))
    .filter(b => b.ticksRemaining > 0);
  if (state.investments.newsletterCooldownTicks > 0) state.investments.newsletterCooldownTicks--;
  if (state.investments.pressCooldownTicks > 0)      state.investments.pressCooldownTicks--;
}

// ── Milestone checks ───────────────────────────────────────────
function checkMilestones(state) {
  // TODO: Freelance_RCU_T1/T2/T3 → freelance tier upgrades
  // TODO: Lab_Money_T1–T9 → agent unlocks
  // TODO: Price_Round_T1/T2 (lifetime money earned) → subscription price rounds
}

// tick.js — game loop
// Fires every TICK_RATE real seconds = 1 in-game hour.
// Every 24 ticks = 1 in-game day.

import {
  CONSTANTS, LAB_PLANS,
  calcCoderRcuPerHour,
  calcSupportRetentionBonus,
  calcMarketerMarketingBonus,
  calcProductManagerMultiplier,
  calcCeoReputationGain,
} from './state.js';
import { generateMissions } from './missions.js';

export function startTick(state, onTick) {
  setInterval(() => {
    tick(state);
    onTick(state);
  }, CONSTANTS.TICK_RATE * 1000);
}

function tick(state) {
  // Frozen until the product is named on the start screen (run hasn't begun),
  // and again once the run is won — no economy or time progression either way.
  if (state.won || !state.productName) return;

  state.ticksElapsed++;

  // Passive RCU generation (AI Coder agent)
  applyLabAgents(state);

  // Daily events (every 24 ticks = 1 in-game day)
  if (state.ticksElapsed % 24 === 0) {
    applyDailyAcquisition(state);
    applyDailyChurn(state);
    applyDailyRevenue(state);
    applyDailyLabBilling(state);
    applyDailyCeoReputation(state);
    refreshFreelanceMissions(state);
    pushHistorySnapshot(state);
  }

  // Analytics sampler — cumulative snapshot every Sample_Every_Ticks
  if (state.ticksElapsed % CONSTANTS.Sample_Every_Ticks === 0) {
    sampleSeries(state);
  }

  // Tick down active investment boosts
  tickInvestments(state);

  // Post on X cooldown
  if (state.reputation.postCooldownTicks > 0) {
    state.reputation.postCooldownTicks--;
  }

  checkWin(state);

  // Sliding window for RCU/h display — push this tick's total, keep last 10
  if (!Array.isArray(state.rcuHistory)) state.rcuHistory = new Array(10).fill(0);
  state.rcuHistory.push(state._rcuThisTick ?? 0);
  if (state.rcuHistory.length > 10) state.rcuHistory.shift();
  state._rcuThisTick = 0;
}

// ── Agent passive effects ──────────────────────────────────────
function applyLabAgents(state) {
  if (!state.milestones?.claimed?.lab_unlock) return;
  const coder = state.lab.agents.ai_coder;
  if (!coder.unlocked) return;

  // Free plan (multiplier 1) provides the baseline floor; paid plans scale above that
  const plan       = LAB_PLANS[coder.tier] ?? LAB_PLANS.free;
  const pmMult     = calcProductManagerMultiplier(state);
  const rcuPerHour = calcCoderRcuPerHour(coder) * plan.multiplier * pmMult;

  // 1 tick = 1 in-game hour
  state.rcu            += rcuPerHour;
  state.rcuLifetime    += rcuPerHour;
  state._rcuThisTick    = (state._rcuThisTick ?? 0) + rcuPerHour;
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
  // Effective marketing stream = permanent value + active investment boosts + ai_marketer, scaled by reputation
  const investBoost    = state.investments.active.reduce((s, b) => s + b.marketingBoost, 0);
  const marketerBoost  = calcMarketerMarketingBonus(state) * calcProductManagerMultiplier(state);
  const visitors       = (1 + state.saas.marketingStream + investBoost + marketerBoost) * state.reputation.multiplier;
  const conversionRate = progressive_wall(state.saas.conversion, 1, 2);
  const gained         = visitors * conversionRate;
  state.saas.customers += gained;
  state.saas.mrr        = state.saas.price * state.saas.customers;
  // Track peak MRR for milestones (MRR can fluctuate due to churn)
  if (state.saas.mrr > (state.saas.mrrPeak ?? 0)) state.saas.mrrPeak = state.saas.mrr;
}

// ── Daily churn ────────────────────────────────────────────────
function applyDailyChurn(state) {
  if (state.saas.customers < 1) return;
  // 2% daily base churn, reduced by retention (+ ai_support bonus scaled by PM)
  const effectiveRetention = state.saas.retention + calcSupportRetentionBonus(state) * calcProductManagerMultiplier(state);
  const churnRate          = 0.02 / effectiveRetention;
  state.saas.customers     = Math.max(0, state.saas.customers - state.saas.customers * churnRate);
  state.saas.mrr           = state.saas.price * state.saas.customers;
}

// ── Daily Lab billing ──────────────────────────────────────────
function applyDailyLabBilling(state) {
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
    const plan = LAB_PLANS[agent.tier];
    if (plan && plan.dailyCost > 0) totalCost += plan.dailyCost;
  }
  if (totalCost > 0) {
    state.wallet           -= totalCost;
    state.labSpendLifetime += totalCost;
  }
}

// ── Daily CEO reputation gain ──────────────────────────────────
function applyDailyCeoReputation(state) {
  const gain = calcCeoReputationGain(state);
  if (gain > 0) state.reputation.multiplier += gain;
}

// ── Freelance mission refresh ──────────────────────────────────
function refreshFreelanceMissions(state) {
  state.freelance.missions = generateMissions(state.freelance.tier);
}

// ── Histogram snapshots (one per in-game day) ──────────────────
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

// ── Investment boost timers ────────────────────────────────────
function tickInvestments(state) {
  state.investments.active = state.investments.active
    .map(b => ({ ...b, ticksRemaining: b.ticksRemaining - 1 }))
    .filter(b => b.ticksRemaining > 0);
  if (state.investments.newsletterCooldownTicks > 0) state.investments.newsletterCooldownTicks--;
  if (state.investments.pressCooldownTicks > 0)      state.investments.pressCooldownTicks--;
}

// ── Win condition ──────────────────────────────────────────────
// The run is won the moment lifetime earnings reach WIN_CONDITION ($1B exit).
function checkWin(state) {
  if (state.won) return;
  if (state.moneyLifetime >= CONSTANTS.WIN_CONDITION) {
    state.won        = true;
    state.winTick    = state.ticksElapsed;
    state.runEndedAt = Date.now();
    // Capture a closing sample so the curves end exactly at the win moment,
    // even if it fell between daily sampling boundaries.
    sampleSeries(state);
  }
}

// ── Analytics series sampler ───────────────────────────────────
// Appends one cumulative snapshot (tick + lifetime money/RCU/lab-burn).
// Dedupes on tick so a win landing on a sampling boundary isn't double-counted.
function sampleSeries(state) {
  const s = state.series;
  if (!s) return;
  if (s.t[s.t.length - 1] === state.ticksElapsed) return;
  s.t.push(state.ticksElapsed);
  s.money.push(state.moneyLifetime);
  s.rcu.push(state.rcuLifetime);
  s.labBurn.push(state.labSpendLifetime);
}


// ── Helpers ────────────────────────────────────────────────────
export function progressive_wall(x, wall_value, half_life) {
  return ((wall_value * x) / (x + half_life)).toFixed(2);
}

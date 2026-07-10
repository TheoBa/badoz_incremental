// tick.js — game loop
// Fires every TICK_RATE real seconds = 1 in-game hour.
// Every 24 ticks = 1 in-game day.

import { CONSTANTS, LAB } from './config.js';
import {
  softCap,
  calcCoderRcuPerHour,
  calcSupportRetentionBonus,
  calcMarketerMarketingBonus,
  calcProductManagerMultiplier,
  calcCeoReputationGain,
} from './formulas.js';
import { generateMissions } from './missions.js';

export function startTick(state, onTick) {
  setInterval(() => {
    tick(state);
    onTick(state);
  }, CONSTANTS.TICK_RATE * 1000);
}

function tick(state) {
  // Frozen until the start screen is submitted (_runStarted gates the tick),
  // and again once the run is won — no economy or time progression either way.
  if (state.won || !state._runStarted) return;

  state.ticksElapsed++;

  // Passive RCU generation (AI Coder agent)
  applyLabAgents(state);

  // Daily events (every TICKS_PER_DAY ticks = 1 in-game day)
  if (state.ticksElapsed % CONSTANTS.TICKS_PER_DAY === 0) {
    applyDailySaas(state);
    applyDailyLabBilling(state);
    applyDailyCeoReputation(state);
    refreshFreelanceMissions(state);
    pushHistorySnapshot(state);

    // Weekly summary — trigger every 7 days
    if (state.ticksElapsed % CONSTANTS.TICKS_PER_WEEK === 0) {
      // Freeze display snapshot BEFORE resetting accumulators
      state.weekStats.lastWeek = {
        missionsDone: (state.freelance.missionsCompleted ?? 0) - state.weekStats.missionsAtStart,
        investSpent:  state.weekStats.investSpent,
      };
      state._weeklyPopupPending = true;
      state.weekStats.investSpent     = 0;
      state.weekStats.missionsAtStart = state.freelance.missionsCompleted ?? 0;
    }
  }

  // Analytics sampler — cumulative snapshot every SAMPLE_EVERY_TICKS
  if (state.ticksElapsed % CONSTANTS.SAMPLE_EVERY_TICKS === 0) {
    sampleSeries(state);
  }

  // Tick down active investment boosts
  tickInvestments(state);

  // Post on X cooldown
  if (state.reputation.postCooldownTicks > 0) {
    state.reputation.postCooldownTicks--;
  }

  checkWin(state);

  // Sliding window for RCU/h display — push this tick's total, keep the window
  if (!Array.isArray(state.rcuHistory)) state.rcuHistory = new Array(CONSTANTS.RCU_WINDOW_TICKS).fill(0);
  state.rcuHistory.push(state._rcuThisTick ?? 0);
  if (state.rcuHistory.length > CONSTANTS.RCU_WINDOW_TICKS) state.rcuHistory.shift();
  state._rcuThisTick = 0;
}

// ── Agent passive effects ──────────────────────────────────────
function applyLabAgents(state) {
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
function applyDailySaas(state) {
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
    const plan = LAB.plans[agent.tier];
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

  push(h.earned,    state.moneyLifetime    - p.earned);
  push(h.rcu,       state.rcuLifetime      - p.rcu);
  push(h.mrr,       state.saas.mrr         - p.mrr);
  push(h.burn,      state.labSpendLifetime - p.burn);
  push(h.customers, state.saas.customers   - p.customers);
  push(h.wallet,    state.wallet);

  p.earned    = state.moneyLifetime;
  p.rcu       = state.rcuLifetime;
  p.mrr       = state.saas.mrr;
  p.burn      = state.labSpendLifetime;
  p.customers = state.saas.customers;
}

// ── Investment boost timers ────────────────────────────────────
function tickInvestments(state) {
  state.investments.active = state.investments.active
    .map(b => ({ ...b, ticksRemaining: b.ticksRemaining - 1 }))
    .filter(b => b.ticksRemaining > 0);
  const cd = state.investments.cooldowns;
  if (cd) {
    for (const id of Object.keys(cd)) {
      if (cd[id] > 0) cd[id]--;
    }
  }
}

// ── Win condition ──────────────────────────────────────────────
// The run is won the moment lifetime earnings reach WIN_CONDITION ($1B exit).
function checkWin(state) {
  if (state.won) return;
  if (state.moneyLifetime >= CONSTANTS.WIN_CONDITION) {
    state.won                  = true;
    state.winTick              = state.ticksElapsed;
    state.runEndedAt           = Date.now();
    state._leaderboardUnlocked = true;  // latches permanently; survives newRun()
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

// tick.js — game loop
// Fires every TICK_RATE real seconds = 1 in-game hour.
// Every 24 ticks = 1 in-game day.

import { CONSTANTS } from './state.js';

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
    applyDailyRevenue(state);
    applyDailyChurn(state);
    applyDailyLabBilling(state);
    refreshFreelanceMissions(state);
    pushHistorySnapshot(state);
  }

  // Post on X cooldown
  if (state.reputation.postCooldownTicks > 0) {
    state.reputation.postCooldownTicks--;
  }

  checkMilestones(state);
}

// ── Agent passive effects ──────────────────────────────────────
function applyLabAgents(state) {
  // TODO: per-agent RCU/h based on tier and modelLevel
}

// ── Daily revenue ──────────────────────────────────────────────
function applyDailyRevenue(state) {
  // TODO: daily_revenue = (mrr / 30) * customers → add to wallet + moneyLifetime
}

// ── Daily churn ────────────────────────────────────────────────
function applyDailyChurn(state) {
  // TODO: customers *= retention multiplier (small daily decay)
}

// ── Daily Lab billing ──────────────────────────────────────────
function applyDailyLabBilling(state) {
  // TODO: deduct daily cost of each active agent tier from wallet + labSpendLifetime
  // Plan changes set on a previous day take effect here (tick % 24 === 0)
}

// ── Freelance mission refresh ──────────────────────────────────
function refreshFreelanceMissions(state) {
  // TODO: generate new mission pool based on state.freelance.tier
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

// ── Milestone checks ───────────────────────────────────────────
function checkMilestones(state) {
  // TODO: Freelance_RCU_T1/T2/T3 → freelance tier upgrades
  // TODO: Lab_Money_T1–T9 → agent unlocks
  // TODO: Price_Round_T1/T2 (lifetime money earned) → subscription price rounds
}

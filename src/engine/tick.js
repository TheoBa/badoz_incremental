// tick.js — game loop orchestration.
// Fires every TICK_RATE real seconds = 1 in-game hour.
// The economy itself (passive RCU, daily SaaS, lab billing, CEO rep) lives in
// economy.js so the simulator runs the exact same code.

import { CONSTANTS } from './config.js';
import {
  applyPassiveCoderRcu,
  applyDailySaas,
  applyDailyLabBilling,
  applyDailyCeoReputation,
} from './economy.js';
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

  applyPassiveCoderRcu(state);

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

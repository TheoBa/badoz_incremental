// migrate.js — in-place upgrades for saves written by older client versions.
// Called once at boot on the loaded state, before anything reads it.
// Each block is a one-way, idempotent shape fix; fresh initState() saves
// pass through untouched.

import { CONSTANTS, INVESTMENTS, SAAS } from './config.js';
import { makeTier } from './formulas.js';
import { generateMissions } from './missions.js';

export function migrateState(state) {
  // Seed missions on first boot (missions array is empty in fresh state)
  if (state.freelance.missions.length === 0) {
    state.freelance.missions = generateMissions(state.freelance.tier);
  }

  // Migrate investments shape: old saves have investments as [] instead of an object
  if (Array.isArray(state.investments)) {
    state.investments = { active: [], cooldowns: {}, uses: {} };
  }
  // Migrate named cooldown fields → generic cooldowns dict (old saves)
  if (!state.investments.cooldowns) {
    state.investments.cooldowns = {};
    const nlcd = state.investments.newsletterCooldownTicks ?? 0;
    const prcd = state.investments.pressCooldownTicks ?? 0;
    if (nlcd > 0) state.investments.cooldowns.newsletter = nlcd;
    if (prcd > 0) state.investments.cooldowns.press = prcd;
    delete state.investments.newsletterCooldownTicks;
    delete state.investments.pressCooldownTicks;
  }
  // Migrate named uses fields → generic uses dict (old saves)
  if (!state.investments.uses) {
    const pressItem = INVESTMENTS.reputation.press_coverage;
    const phItem    = INVESTMENTS.reputation.product_hunt;
    state.investments.uses = {
      [pressItem.id]: state.investments.pressUsesRemaining ?? pressItem.max_uses,
      [phItem.id]:    state.investments.productHuntUsed ? 0 : phItem.max_uses,
    };
    delete state.investments.pressUsesRemaining;
    delete state.investments.productHuntUsed;
  }
  // Initialise hardware sub-object if missing (old saves)
  if (!state.investments.hardware) {
    state.investments.hardware = { gearLevel: 0, laptopLevel: 0, cpuLevel: 0, gpuLevel: 0 };
  }
  // Migrate cpuPurchased/gpuPurchased → cpuLevel/gpuLevel (old saves)
  const hw = state.investments.hardware;
  if ('cpuPurchased' in hw) { hw.cpuLevel = hw.cpuPurchased ? 1 : 0; delete hw.cpuPurchased; }
  if ('gpuPurchased' in hw) { hw.gpuLevel = hw.gpuPurchased ? 1 : 0; delete hw.gpuPurchased; }

  // Migrate lab agents to modelLevel (old saves had modelMajor/modelMinor)
  if (state.lab?.agents) {
    for (const agent of Object.values(state.lab.agents)) {
      if (!('pendingTier' in agent)) agent.pendingTier = null;
      if (!('modelLevel' in agent)) {
        const major = agent.modelMajor ?? 1;
        const minor = agent.modelMinor ?? 0;
        agent.modelLevel = (major - 1) * 10 + minor;
      }
      delete agent.modelMajor;
      delete agent.modelMinor;
    }
  }

  // Migrate: add mrrPeak to saas (old saves)
  if (state.saas.mrrPeak == null) state.saas.mrrPeak = state.saas.mrr;
  // Migrate: saas cohort model — old saves have price/priceRound instead of tiers
  if (!state.saas.tiers) {
    const oldRound = state.saas.priceRound ?? 0;
    const oldCusts = state.saas.customers  ?? 0;
    state.saas.tiers = SAAS.subscription_tiers.slice(0, oldRound + 1).map((cfg, i) => {
      const tier = makeTier(cfg);
      if (i === 0) tier.cohorts[0] = oldCusts;
      return tier;
    });
    delete state.saas.price;
    delete state.saas.priceRound;
  }

  // Migrate: add milestones object (old saves)
  if (!state.milestones)         state.milestones         = { claimed: {} };
  if (!state.milestones.claimed) state.milestones.claimed = {};

  // Migrate: add history.prev for delta-based histograms (old saves)
  if (!state.history.prev) {
    state.history.prev = {
      earned: state.moneyLifetime,
      rcu:    state.rcuLifetime,
      mrr:    state.saas.mrr,
      burn:   state.labSpendLifetime,
    };
  }

  // Migrate: init RCU/h sliding window (old saves)
  if (!Array.isArray(state.rcuHistory)) {
    state.rcuHistory = new Array(CONSTANTS.RCU_WINDOW_TICKS).fill(0);
  }
  if (state._rcuThisTick == null) state._rcuThisTick = 0;

  // Migrate postsThisRun → numberOfPosts (old saves)
  if (state.reputation.numberOfPosts == null) {
    state.reputation.numberOfPosts = state.reputation.postsThisRun ?? 0;
    delete state.reputation.postsThisRun;
  }

  // Migrate: upgrades.satisfaction → upgrades.conversion (old saves)
  if (!state.upgrades) state.upgrades = {};
  if (state.upgrades.satisfaction && !state.upgrades.conversion) {
    state.upgrades.conversion = state.upgrades.satisfaction;
    delete state.upgrades.satisfaction;
  }
  // Ensure all upgrade tracks exist
  if (!state.upgrades.conversion) state.upgrades.conversion = [];
  if (!state.upgrades.retention) state.upgrades.retention = [];
  if (!state.upgrades.marketingStream) state.upgrades.marketingStream = [];
  // Migrate: saas.satisfaction → saas.conversion (old saves)
  if (state.saas.satisfaction != null && state.saas.conversion == null) {
    state.saas.conversion = state.saas.satisfaction;
    delete state.saas.satisfaction;
  }
  // Migrate: history.satisfaction → history.conversion (old saves)
  if (state.history.satisfaction && !state.history.conversion) {
    state.history.conversion = state.history.satisfaction;
    delete state.history.satisfaction;
  }

  // Migrate: run lifecycle fields (old saves predate the win condition)
  if (state.runStartedAt == null) state.runStartedAt = Date.now();
  if (!('runEndedAt' in state))   state.runEndedAt   = null;
  if (typeof state.won !== 'boolean') state.won       = false;
  if (!('winTick' in state))      state.winTick      = null;

  // Migrate: analytics series + events (old saves predate run-series)
  if (!state.series || !Array.isArray(state.series.t)) {
    state.series = {
      sampleEveryTicks: CONSTANTS.SAMPLE_EVERY_TICKS,
      t: [0], money: [0], rcu: [0], labBurn: [0],
    };
  }
  if (!Array.isArray(state.events)) state.events = [];

  // Migrate: dev-mode taint flag (old saves predate run submission)
  if (typeof state.devModeUsed !== 'boolean') state.devModeUsed = false;
  // Migrate: _runStarted (old saves used productName as the tick gate)
  if (state._runStarted == null) state._runStarted = !!state.productName;
  // Migrate: _leaderboardUnlocked (old saves: treat runCount > 0 as "has won before")
  if (state._leaderboardUnlocked == null) state._leaderboardUnlocked = state.runCount > 0;
  // Migrate: tabsDiscovered (old saves with active runs skip lore entirely)
  if (!state.tabsDiscovered) {
    state.tabsDiscovered = state.productName
      ? { write_code: true, saas_product: true, freelance: true, investment: true, frontier_lab: true, post_on_x: true, milestones: true }
      : {};
  }

  return state;
}

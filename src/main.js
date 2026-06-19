// main.js — entry point
// Boots the game: loads state, wires tab switching, starts the tick loop.

import { initState, CONSTANTS } from './engine/state.js';
import { startTick }            from './engine/tick.js';
import { load, save }           from './engine/save.js';
import { render }               from './ui/render.js';
import { generateMissions }     from './engine/missions.js';
import { initDevPanel }         from './ui/dev.js';
import { initWinScreen }        from './ui/win.js';

// ── Load or initialise state ───────────────────────────────────
const state = load() ?? initState();

// Seed missions on first boot (missions array is empty in fresh state)
if (state.freelance.missions.length === 0) {
  state.freelance.missions = generateMissions(state.freelance.tier);
}

// Migrate investments shape: old saves have investments as [] instead of an object
if (Array.isArray(state.investments)) {
  state.investments = { active: [], productHuntUsed: false, pressUsesRemaining: CONSTANTS.Invest_Press_Uses };
}
// Initialise press coverage uses if not yet set
if (state.investments.pressUsesRemaining == null) {
  state.investments.pressUsesRemaining = CONSTANTS.Invest_Press_Uses;
}
// Initialise hardware sub-object if missing (old saves)
if (!state.investments.hardware) {
  state.investments.hardware = { gearLevel: 0, laptopLevel: 0, cpuLevel: 0, gpuLevel: 0 };
}
// Migrate cpuPurchased/gpuPurchased → cpuLevel/gpuLevel (old saves)
const _hw = state.investments.hardware;
if ('cpuPurchased' in _hw) { _hw.cpuLevel = _hw.cpuPurchased ? 1 : 0; delete _hw.cpuPurchased; }
if ('gpuPurchased' in _hw) { _hw.gpuLevel = _hw.gpuPurchased ? 1 : 0; delete _hw.gpuPurchased; }
// Initialise cooldown fields if missing (old saves)
if (state.investments.pressCooldownTicks == null)     state.investments.pressCooldownTicks = 0;
if (state.investments.newsletterCooldownTicks == null) state.investments.newsletterCooldownTicks = 0;
// Migrate lab agents: add pendingTier + modelMajor/modelMinor (old saves)
if (state.lab?.agents) {
  for (const agent of Object.values(state.lab.agents)) {
    if (!('pendingTier' in agent))  agent.pendingTier = null;
    if (!('modelMajor'  in agent))  agent.modelMajor  = agent.modelLevel ?? 1;
    if (!('modelMinor'  in agent))  agent.modelMinor  = 0;
    delete agent.modelLevel;  // remove old field
  }
}
// Migrate: add mrrPeak to saas (old saves)
if (state.saas.mrrPeak == null) state.saas.mrrPeak = state.saas.mrr;
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
if (!Array.isArray(state.rcuHistory)) state.rcuHistory = new Array(10).fill(0);
if (state._rcuThisTick == null)       state._rcuThisTick = 0;
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
    sampleEveryTicks: CONSTANTS.Sample_Every_Ticks,
    t: [0], money: [0], rcu: [0], labBurn: [0],
  };
}
if (!Array.isArray(state.events)) state.events = [];

// ── Tab switching ──────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
    btn.classList.add('on');
    document.getElementById('panel-' + btn.dataset.tab)?.classList.add('on');

    // saas_product discovery: auto-set initial price on first visit
    if (btn.dataset.tab === 'saas_product' && state.saas.price === 0) {
      state.saas.price      = CONSTANTS.Saas_Price_T1;
      state.saas.priceRound = 0;
    }

    render(state);
  });
});

// ── Dev panel (toggle with ` key) ─────────────────────────────
initDevPanel(state, render);

// ── Win screen (shown when state.won) ─────────────────────────
initWinScreen(state, render);

// ── Initial render ─────────────────────────────────────────────
render(state);

// ── Tick loop ──────────────────────────────────────────────────
startTick(state, (s) => {
  render(s);
  if (s.won) {
    // Save once on the winning frame so a reload keeps the run resolved,
    // then stop autosaving (the tick loop is frozen anyway).
    if (!s._winSaved) { s._winSaved = true; save(s); }
  } else if (s.ticksElapsed % 60 === 0) {
    // Auto-save every 60 ticks (1 in-game hour)
    save(s);
  }
});

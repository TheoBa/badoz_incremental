// main.js — entry point
// Boots the game: loads state, wires tab switching, starts the tick loop.

import { initState, INVESTMENTS, SAAS } from './engine/state.js';
import { startTick }            from './engine/tick.js';
import { load, save }           from './engine/save.js';
import { render }               from './ui/render.js';
import { generateMissions }     from './engine/missions.js';
import { newRun }               from './engine/run.js';
import { initDevPanel }         from './ui/dev.js';
import { initWinScreen }        from './ui/win.js';
import { initStartScreen }      from './ui/start.js';
import { refreshLeaderboard }   from './tabs/leaderboard.js';
import { showLore, isTabUnlocked } from './ui/lore.js';

// ── Load or initialise state ───────────────────────────────────
const state = load() ?? initState();

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
const _hw = state.investments.hardware;
if ('cpuPurchased' in _hw) { _hw.cpuLevel = _hw.cpuPurchased ? 1 : 0; delete _hw.cpuPurchased; }
if ('gpuPurchased' in _hw) { _hw.gpuLevel = _hw.gpuPurchased ? 1 : 0; delete _hw.gpuPurchased; }
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

// ── Tab switching ──────────────────────────────────────────────
function switchToTab(tab) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  btn?.classList.add('on');
  document.getElementById('panel-' + tab)?.classList.add('on');

  if (isTabUnlocked(tab, state) && !state.tabsDiscovered[tab]) {
    state.tabsDiscovered[tab] = true;
    showLore(tab, state, () => render(state));
  }

  if (tab === 'saas_product' && state.saas.price === 0) {
    state.saas.price      = SAAS.subscription_price.t1;
    state.saas.priceRound = 0;
  }

  if (tab === 'leaderboard') refreshLeaderboard();

  render(state);
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('locked')) return;
    switchToTab(btn.dataset.tab);
  });
});

// ── Tab shortcuts (1-8 switch tabs left to right) ──────────────
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target;
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
  const idx = Number(e.key) - 1;
  if (!Number.isInteger(idx) || idx < 0) return;
  const btn = document.querySelectorAll('.tab')[idx];
  if (!btn || btn.classList.contains('locked')) return;
  switchToTab(btn.dataset.tab);
});

// ── Dev panel (toggle with ` key) ─────────────────────────────
initDevPanel(state, render);

// ── Win screen (shown when state.won) ─────────────────────────
initWinScreen(state, render);

// ── Go broke confirm overlay ───────────────────────────────────
document.getElementById('go-broke-confirm')?.addEventListener('click', () => {
  document.getElementById('go-broke-overlay').classList.remove('on');
  newRun(state);
  render(state);
});
document.getElementById('go-broke-cancel')?.addEventListener('click', () => {
  document.getElementById('go-broke-overlay').classList.remove('on');
});

// ── Start screen (handle + product name; gates the run start) ──
initStartScreen(state, render);

// ── KPI sidebar toggle ─────────────────────────────────────────
document.getElementById('kpi-toggle').addEventListener('click', () => {
  document.body.classList.toggle('kpi-closed');
});
document.getElementById('kpi-reopen').addEventListener('click', () => {
  document.body.classList.remove('kpi-closed');
});

// ── Initial render ─────────────────────────────────────────────
render(state);

// ── Tick loop ──────────────────────────────────────────────────
startTick(state, (s) => {
  render(s);
  // Auto-switch to saas_product the moment it unlocks (first time only)
  if (isTabUnlocked('saas_product', s) && !s.tabsDiscovered.saas_product) {
    switchToTab('saas_product');
  }
  if (s.won) {
    // Save once on the winning frame so a reload keeps the run resolved,
    // then stop autosaving (the tick loop is frozen anyway).
    if (!s._winSaved) { s._winSaved = true; save(s); }
  } else if (s.ticksElapsed % 60 === 0) {
    // Auto-save every 60 ticks (1 in-game hour)
    save(s);
  }
});

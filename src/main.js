// main.js — entry point
// Boots the game: loads state, wires tab switching, starts the tick loop.

import { initState }            from './engine/state.js';
import { CONSTANTS, SAAS }      from './engine/config.js';
import { makeTier }             from './engine/formulas.js';
import { migrateState }         from './engine/migrate.js';
import { startTick }            from './engine/tick.js';
import { load, save }           from './engine/save.js';
import { render }               from './ui/render.js';
import { newRun }               from './engine/run.js';
import { initDevPanel }         from './ui/dev.js';
import { initDevAnalysis }     from './ui/dev-analysis.js';
import { initWinScreen }        from './ui/win.js';
import { initStartScreen }      from './ui/start.js';
import { refreshLeaderboard }   from './tabs/leaderboard.js';
import { showLore, isTabUnlocked } from './ui/lore.js';

// ── Load or initialise state ───────────────────────────────────
// migrateState upgrades old save shapes in place (and seeds missions on first boot).
const state = migrateState(load() ?? initState());

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

  if (tab === 'saas_product' && state.saas.tiers.length === 0) {
    state.saas.tiers = [makeTier(SAAS.subscription_tiers[0])];
  }

  if (tab === 'leaderboard') refreshLeaderboard();

  render(state);
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('locked')) return;
    btn.blur(); // so Enter/Space go to the tab's primary action, not the tab button
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

// ── Action shortcuts (Enter / Space trigger the active tab's primary action) ──
const PRIMARY_ACTION = {
  write_code: () => document.getElementById('wc-btn'),
  freelance:  () => document.querySelector('#fl-missions .fl-btn-accept:not([disabled])'),
  post_on_x:  () => document.getElementById('pox-btn'),
  milestones: () => document.querySelector('.ms-claim-btn'),
};

// Pop-ups where Enter/Space confirm. go_broke and win-screen are deliberately
// absent — go_broke is destructive, and the win screen shouldn't be skippable
// by a stray keypress. dev-analysis just suppresses shortcuts.
const OVERLAY_CONFIRM = [
  ['#start-screen.on',   () => document.querySelector('#start-form button[type=submit]')],
  ['#lore-overlay.on',   () => document.getElementById('lore-ok')],
  ['#weekly-overlay.on', () => document.getElementById('weekly-ok')],
];

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target;
  if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
  if (target?.tagName === 'BUTTON') return; // focused buttons keep native Enter/Space
  if (document.querySelector('#go-broke-overlay.on, #win-screen.on, #dev-analysis-overlay.on')) return;

  for (const [sel, getBtn] of OVERLAY_CONFIRM) {
    if (!document.querySelector(sel)) continue;
    e.preventDefault();
    getBtn()?.click();
    return;
  }

  const tab = document.querySelector('.tab.on')?.dataset.tab;
  const btn = PRIMARY_ACTION[tab]?.();
  if (!btn || btn.disabled) return;
  e.preventDefault(); // keep Space from scrolling the page
  btn.click();
});

// ── Dev panel (toggle with ` key) ─────────────────────────────
initDevPanel(state, render);
initDevAnalysis();

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
  } else if (s.ticksElapsed % CONSTANTS.AUTOSAVE_EVERY_TICKS === 0) {
    save(s);
  }
});

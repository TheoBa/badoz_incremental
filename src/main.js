// main.js — entry point
// Boots the game: loads state, wires tab switching, starts the tick loop.

import { initState, CONSTANTS } from './engine/state.js';
import { startTick }            from './engine/tick.js';
import { load, save }           from './engine/save.js';
import { render }               from './ui/render.js';
import { generateMissions }     from './engine/missions.js';

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

// ── Initial render ─────────────────────────────────────────────
render(state);

// ── Tick loop ──────────────────────────────────────────────────
startTick(state, (s) => {
  render(s);
  // Auto-save every 60 ticks (1 in-game hour)
  if (s.ticksElapsed % 60 === 0) save(s);
});

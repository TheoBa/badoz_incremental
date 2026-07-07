// win.js — end-of-run win screen
// Renders the $1B-exit overlay from state.won and wires the "new_run" button.
// Pure read in renderWinScreen(); state is only mutated via newRun() on the button.

import { newRun }      from '../engine/run.js';
import { submitRun }   from '../engine/submit.js';
import { fmt, fmtN }   from './render.js';

export function initWinScreen(state, renderFn) {
  document.getElementById('win-new-run')?.addEventListener('click', () => {
    newRun(state);
    renderFn(state);
  });
}

export function renderWinScreen(state) {
  const overlay = document.getElementById('win-screen');
  if (!overlay) return;

  if (!state.won) {
    overlay.classList.remove('on');
    return;
  }

  overlay.classList.add('on');
  const tick = state.winTick ?? state.ticksElapsed;
  const days = Math.floor(tick / 24);
  const hrs  = tick % 24;

  set('win-product', state.productName ?? '—');
  set('win-time',    `${days}d ${hrs}h`);
  set('win-earned',  fmt(state.moneyLifetime));
  set('win-rcu',     fmtN(state.rcuLifetime));
  set('win-burn',    fmt(state.labSpendLifetime));

  // Submit the run exactly once. The flag is set synchronously so the
  // per-tick re-render can't fire a second POST while the first is in flight.
  if (!state._runSubmitted) {
    state._runSubmitted = true;
    set('win-submit-status', 'submitting run…');
    submitRun(state).then(r => {
      set('win-submit-status', r.ok
        ? (state.devModeUsed ? 'submitted (dev run — off leaderboard)' : 'run submitted ✓')
        : `not submitted (${r.error})`);
    });
  }
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

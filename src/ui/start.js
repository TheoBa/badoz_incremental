// start.js — run start screen
// Collects the player handle (once, persisted) before play begins.
// Product naming moved to the saas_product tab (first visit lore).

import { getPlayerName, setPlayerName } from '../engine/identity.js';
import { save } from '../engine/save.js';
import { showLore } from './lore.js';

export function initStartScreen(state, renderFn) {
  const form = document.getElementById('start-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const handleInput = document.getElementById('start-handle');

    if (!getPlayerName()) {
      const h = (handleInput?.value || '').trim();
      if (!h) { handleInput?.focus(); return; }
      setPlayerName(h);
    }

    state._runStarted  = true;
    state.runStartedAt = Date.now();
    delete state._runSubmitted;
    delete state._winSaved;
    save(state);
    renderFn(state);

    // Show write_code lore immediately after the run starts
    if (!state.tabsDiscovered.write_code) {
      state.tabsDiscovered.write_code = true;
      showLore('write_code', state, () => renderFn(state));
    }
  });
}

// Reactive toggle (called from render). Gates on _runStarted instead of productName.
export function renderStartScreen(state) {
  const overlay = document.getElementById('start-screen');
  if (!overlay) return;

  if (state._runStarted) {
    overlay.classList.remove('on');
    return;
  }
  if (overlay.classList.contains('on')) return;  // already showing — leave inputs alone

  overlay.classList.add('on');
  const handleRow   = document.getElementById('start-handle-row');
  const handleInput = document.getElementById('start-handle');
  const haveHandle  = !!getPlayerName();
  if (handleRow) handleRow.style.display = haveHandle ? 'none' : '';
  handleInput?.focus();
}

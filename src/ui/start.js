// start.js — run start screen
// Collects the player handle (once, persisted) and the SaaS product name (each run)
// before play begins. The tick loop is frozen while productName is unset, so the
// run clock only starts once the player commits a name here.

import { getPlayerName, setPlayerName } from '../engine/identity.js';
import { save } from '../engine/save.js';

export function initStartScreen(state, renderFn) {
  const form = document.getElementById('start-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const handleInput = document.getElementById('start-handle');
    const nameInput   = document.getElementById('start-product');

    // Handle is only asked when not already stored.
    if (!getPlayerName()) {
      const h = (handleInput?.value || '').trim();
      if (!h) { handleInput?.focus(); return; }
      setPlayerName(h);
    }

    const p = (nameInput?.value || '').trim();
    if (!p) { nameInput?.focus(); return; }

    state.productName  = p;
    state.runStartedAt = Date.now();  // the run truly begins now
    delete state._runSubmitted;       // fresh run → allow a future submit
    delete state._winSaved;
    if (nameInput) nameInput.value = '';
    save(state);
    renderFn(state);
  });
}

// Reactive toggle (called from render). Idempotent show so it never clobbers
// what the player is typing; field setup + focus run only on the show transition.
export function renderStartScreen(state) {
  const overlay = document.getElementById('start-screen');
  if (!overlay) return;

  if (state.productName) {
    overlay.classList.remove('on');
    return;
  }
  if (overlay.classList.contains('on')) return;  // already showing — leave inputs alone

  overlay.classList.add('on');
  const handleRow   = document.getElementById('start-handle-row');
  const handleInput = document.getElementById('start-handle');
  const nameInput   = document.getElementById('start-product');
  const haveHandle  = !!getPlayerName();
  if (handleRow) handleRow.style.display = haveHandle ? 'none' : '';
  (haveHandle ? nameInput : handleInput)?.focus();
}

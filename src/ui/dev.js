import { newRun } from '../engine/run.js';

export function initDevPanel(state, renderFn) {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #dev-panel {
      position: fixed; bottom: 1rem; right: 1rem;
      background: #1a1a2e; border: 1px solid #555;
      padding: .75rem 1rem; z-index: 9999;
      display: none; flex-direction: column; gap: .5rem;
      font-family: monospace; font-size: .8rem; color: #ccc;
    }
    #dev-panel label { color: #888; font-size: .7rem; text-transform: uppercase; letter-spacing: .05em; }
    #dev-panel .dev-row { display: flex; gap: .4rem; align-items: center; }
    #dev-panel input[type=number] { width: 110px; background: #111; border: 1px solid #444; color: #eee; padding: .2rem .4rem; font-family: monospace; }
    #dev-panel button { background: #2a2a3e; border: 1px solid #555; color: #ccc; padding: .2rem .6rem; cursor: pointer; font-family: monospace; }
    #dev-panel button:hover { background: #3a3a5e; }
    #dev-panel .dev-reset { margin-top: .25rem; border-color: #c94040; color: #c94040; width: 100%; }
    #dev-panel .dev-reset:hover { background: #2a1010; }
    #dev-panel .dev-title { color: #666; font-size: .65rem; margin-bottom: .1rem; }
  `;
  document.head.appendChild(style);

  // Build panel
  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.innerHTML = `
    <div class="dev-title">[ dev mode ]</div>
    <label>money</label>
    <div class="dev-row">
      <input type="number" id="dev-money-amt" value="1000000" min="0" step="1000">
      <button id="dev-give-money">Give $</button>
    </div>
    <label>rcu</label>
    <div class="dev-row">
      <input type="number" id="dev-rcu-amt" value="1000" min="0" step="100">
      <button id="dev-give-rcu">Give RCU</button>
    </div>
    <button class="dev-reset" id="dev-reset-run">Reset run</button>
  `;
  document.body.appendChild(panel);

  // Toggle with backtick
  document.addEventListener('keydown', e => {
    if (e.key === '`') {
      panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    }
  });

  document.getElementById('dev-give-money').addEventListener('click', () => {
    const amt = Number(document.getElementById('dev-money-amt').value) || 0;
    state.wallet        += amt;
    state.moneyLifetime += amt;
    state.devModeUsed    = true;  // taint the run so it stays off the leaderboard
    renderFn(state);
  });

  document.getElementById('dev-give-rcu').addEventListener('click', () => {
    const amt = Number(document.getElementById('dev-rcu-amt').value) || 0;
    state.rcu        += amt;
    state.rcuLifetime += amt;
    state.devModeUsed  = true;
    renderFn(state);
  });

  document.getElementById('dev-reset-run').addEventListener('click', () => {
    newRun(state);
    renderFn(state);
  });
}

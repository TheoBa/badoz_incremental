// write_code.js — main resource tab
// Shows RCU count, write_code() button, and passive stats.
// Price and product details live in the saas_product tab.

import { fmtN, fmt } from '../ui/render.js';
import { calcRcuPerClick } from '../engine/state.js';

export function renderWriteCode(state) {
  const panel = document.getElementById('panel-write_code');
  if (!panel._built) {
    panel.innerHTML = `
      <div class="rcu-display">
        <div class="rcu-count" id="wc-rcu">0</div>
        <div class="rcu-label">raw_code_units</div>
      </div>
      <button class="write-btn" id="wc-btn">[ write_code() ]</button>
      <div class="stat-section">
        <div class="stat-row"><span>RCU/click</span><b id="wc-rcu-click">1</b></div>
        <div class="stat-row"><span>RCU/h</span><b id="wc-rcuh">0</b></div>
        <div class="stat-row"><span>MB/h</span><b id="wc-mbh" class="burn">$0</b></div>
      </div>
      <div class="stat-section">
        <div class="stat-section-label">saas_product</div>
        <div class="stat-row"><span>name</span><b id="wc-product" class="teal">—</b></div>
        <div class="stat-row"><span>customers</span><b id="wc-customers">0</b></div>
        <div class="stat-row"><span>MRR</span><b id="wc-mrr" class="money">$0</b></div>
      </div>
      <button class="go-broke-btn" id="wc-go-broke">go_broke()</button>`;

    document.getElementById('wc-btn').addEventListener('click', () => onWriteCode(state));
    document.getElementById('wc-go-broke').addEventListener('click', () => {
      document.getElementById('go-broke-overlay').classList.add('on');
    });
    panel._built = true;
  }

  const rpc = calcRcuPerClick(state);
  document.getElementById('wc-rcu').textContent       = fmtN(state.rcu);
  document.getElementById('wc-rcu-click').textContent = rpc;
  const _rcuh = Array.isArray(state.rcuHistory) && state.rcuHistory.length
    ? state.rcuHistory.reduce((a, b) => a + b, 0) / state.rcuHistory.length
    : 0;
  document.getElementById('wc-rcuh').textContent = fmtN(_rcuh);
  document.getElementById('wc-mbh').textContent       = fmt(0);
  document.getElementById('wc-product').textContent   = state.productName ?? '—';
  document.getElementById('wc-customers').textContent = Math.floor(state.saas.customers);
  document.getElementById('wc-mrr').textContent       = fmt(state.saas.mrr);
}

export function onWriteCode(state) {
  const amount = calcRcuPerClick(state);
  state.rcu            += amount;
  state.rcuLifetime    += amount;
  state._rcuThisTick    = (state._rcuThisTick ?? 0) + amount;

  const btn = document.getElementById('wc-btn');
  if (btn) {
    btn.textContent = `[ +${amount} RCU ]`;
    clearTimeout(btn._flash);
    btn._flash = setTimeout(() => { btn.textContent = '[ write_code() ]'; }, 200);
  }

  document.getElementById('wc-rcu').textContent = fmtN(state.rcu);
  document.getElementById('h-rcu').textContent  = fmtN(state.rcu);
}

// write_code.js — main resource tab
// Shows RCU count, write_code() button, and product stats.

import { fmtN, fmt } from '../ui/render.js';

export function renderWriteCode(state) {
  const panel = document.getElementById('panel-write_code');
  if (!panel._built) {
    panel.innerHTML = `
      <div class="rcu-display">
        <div class="rcu-count" id="wc-rcu">0</div>
        <div class="rcu-label">raw_code_units</div>
      </div>
      <button class="write-btn" id="wc-btn">[ write_code() ]</button>
      <div>
        <div class="stat-row"><span>RCU/h</span><b id="wc-rcuh">0 <span style="color:var(--text3)">(manual)</span></b></div>
        <div class="stat-row"><span>MB/h</span><b id="wc-mbh" class="burn">$0</b></div>
        <div class="stat-row"><span>product</span><b id="wc-product" class="teal">—</b></div>
        <div class="stat-row"><span>MRR</span><b id="wc-mrr" class="money">$0</b></div>
        <div class="stat-row"><span>customers</span><b id="wc-customers">0</b></div>
      </div>`;
    document.getElementById('wc-btn').addEventListener('click', () => onWriteCode(state));
    panel._built = true;
  }

  document.getElementById('wc-rcu').textContent       = fmtN(state.rcu);
  document.getElementById('wc-rcuh').innerHTML        = fmtN(0) + ' <span style="color:var(--text3)">(manual)</span>';
  document.getElementById('wc-mbh').textContent       = fmt(0);
  document.getElementById('wc-product').textContent   = state.productName ?? '—';
  document.getElementById('wc-mrr').textContent       = fmt(state.saas.mrr);
  document.getElementById('wc-customers').textContent = Math.floor(state.saas.customers);
}

export function onWriteCode(state) {
  state.rcu++;
  state.rcuLifetime++;

  // Flash button feedback
  const btn = document.getElementById('wc-btn');
  if (btn) {
    btn.textContent = '[ +1 RCU ]';
    clearTimeout(btn._flash);
    btn._flash = setTimeout(() => { btn.textContent = '[ write_code() ]'; }, 200);
  }

  // Update RCU displays immediately (don't wait for next tick)
  document.getElementById('wc-rcu').textContent  = fmtN(state.rcu);
  document.getElementById('h-rcu').textContent   = fmtN(state.rcu);
}

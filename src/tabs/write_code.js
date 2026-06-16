// write_code.js — main resource tab
// Shows RCU count, write_code() button, product stats, and price setting.

import { fmtN, fmt } from '../ui/render.js';

// Subscription price tiers the player can choose from
const PRICE_OPTIONS = [5, 9, 19, 29, 49, 99];

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
        <div class="stat-row"><span>RCU/h</span><b id="wc-rcuh">0 <span style="color:var(--text3)">(manual)</span></b></div>
        <div class="stat-row"><span>MB/h</span><b id="wc-mbh" class="burn">$0</b></div>
      </div>
      <div class="stat-section" id="wc-product-section">
        <div class="stat-section-label">saas_product</div>
        <div class="stat-row"><span>name</span><b id="wc-product" class="teal">—</b></div>
        <div class="stat-row"><span>price</span><b id="wc-price">not set</b></div>
        <div class="stat-row"><span>customers</span><b id="wc-customers">0</b></div>
        <div class="stat-row"><span>MRR</span><b id="wc-mrr" class="money">$0</b></div>
        <div class="stat-row"><span>mkt_stream</span><b id="wc-mkt">0/d</b></div>
      </div>
      <div id="wc-price-picker" class="price-picker"></div>`;

    document.getElementById('wc-btn').addEventListener('click', () => onWriteCode(state));
    panel._built = true;
  }

  document.getElementById('wc-rcu').textContent       = fmtN(state.rcu);
  document.getElementById('wc-rcuh').innerHTML        = fmtN(0) + ' <span style="color:var(--text3)">(manual)</span>';
  document.getElementById('wc-mbh').textContent       = fmt(0);
  document.getElementById('wc-product').textContent   = state.productName ?? '—';
  document.getElementById('wc-price').textContent     = state.saas.price > 0 ? `$${state.saas.price}/mo` : 'not set';
  document.getElementById('wc-customers').textContent = Math.floor(state.saas.customers);
  document.getElementById('wc-mrr').textContent       = fmt(state.saas.mrr);
  document.getElementById('wc-mkt').textContent       = fmtN(state.saas.marketingStream) + '/d';

  renderPricePicker(state);
}

function renderPricePicker(state) {
  const picker = document.getElementById('wc-price-picker');
  picker.innerHTML = `
    <div class="stat-section-label" style="margin-top:12px">set_subscription_price</div>
    <div class="price-options">
      ${PRICE_OPTIONS.map(p => `
        <button
          class="price-opt ${state.saas.price === p ? 'on' : ''}"
          data-price="${p}">
          $${p}/mo
        </button>`).join('')}
    </div>
    ${state.saas.price === 0 ? '<div class="price-hint">set a price to start acquiring customers</div>' : ''}`;

  picker.querySelectorAll('.price-opt').forEach(btn => {
    btn.addEventListener('click', () => onSetPrice(state, Number(btn.dataset.price)));
  });
}

function onSetPrice(state, price) {
  state.saas.price = price;
  state.saas.mrr   = price * state.saas.customers;
  renderWriteCode(state);
}

export function onWriteCode(state) {
  state.rcu++;
  state.rcuLifetime++;

  const btn = document.getElementById('wc-btn');
  if (btn) {
    btn.textContent = '[ +1 RCU ]';
    clearTimeout(btn._flash);
    btn._flash = setTimeout(() => { btn.textContent = '[ write_code() ]'; }, 200);
  }

  document.getElementById('wc-rcu').textContent = fmtN(state.rcu);
  document.getElementById('h-rcu').textContent  = fmtN(state.rcu);
}

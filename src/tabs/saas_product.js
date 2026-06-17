// saas_product.js — SaaS product tab
// Consolidates price management and ship_feature upgrades.
//
// Price flow:
//   - Price is auto-set to Saas_Price_T1 on first tab visit (handled in main.js)
//   - raise_price() unlocks T2 then T3 at lifetime-earned milestones (Price_Round_T1/T2)
//   - Raises are one-way and trigger a demand shock

import { CONSTANTS } from '../engine/state.js';
import { fmt, fmtN } from '../ui/render.js';

const PRICE_TIERS = () => [
  CONSTANTS.Saas_Price_T1,
  CONSTANTS.Saas_Price_T2,
  CONSTANTS.Saas_Price_T3,
];

const RAISE_MILESTONES = () => [
  CONSTANTS.Price_Round_T1,  // earned to unlock T2
  CONSTANTS.Price_Round_T2,  // earned to unlock T3
];

export function renderSaasProduct(state) {
  const panel  = document.getElementById('panel-saas_product');
  const tiers  = PRICE_TIERS();
  const round  = state.saas.priceRound;   // 0 | 1 | 2
  const milestones = RAISE_MILESTONES();

  // Next tier raise: available only if milestone is tuned AND met
  const nextPrice     = tiers[round + 1] ?? null;
  const milestone     = milestones[round] ?? null;
  const milestonesMet = milestone !== null && state.moneyLifetime >= milestone;
  const canRaise      = nextPrice !== null && milestonesMet;

  panel.innerHTML = `
    <div class="sp-section">
      <div class="sp-label">saas_product</div>
      <div class="stat-row"><span>name</span><b class="teal">${state.productName ?? '—'}</b></div>
      <div class="stat-row"><span>price</span><b class="money">$${tiers[round]}/mo</b></div>
      <div class="stat-row"><span>customers</span><b>${Math.floor(state.saas.customers)}</b></div>
      <div class="stat-row"><span>MRR</span><b class="money">${fmt(state.saas.mrr)}</b></div>
    </div>

    ${nextPrice !== null ? `
    <div class="sp-section">
      <div class="sp-label">price_management</div>
      <button id="sp-raise-btn" class="sp-raise-btn" ${canRaise ? '' : 'disabled'}>
        raise_price() → $${nextPrice}/mo
      </button>
      <div class="sp-hint">
        ${milestone === null
          ? 'milestone threshold not yet set'
          : canRaise
            ? 'warning: raising price triggers a demand shock'
            : `unlock at ${fmt(milestone)} lifetime earned (current: ${fmt(state.moneyLifetime)})`}
      </div>
    </div>` : `
    <div class="sp-section">
      <div class="sp-hint">max_price_tier reached</div>
    </div>`}

    <div class="sp-section">
      <div class="sp-label">ship_feature</div>
      <div class="sp-coming-soon">upgrade cards — coming soon</div>
    </div>`;

  if (canRaise) {
    document.getElementById('sp-raise-btn')
      ?.addEventListener('click', () => onRaisePrice(state));
  }
}

function onRaisePrice(state) {
  const tiers = PRICE_TIERS();
  if (state.saas.priceRound >= tiers.length - 1) return;

  state.saas.priceRound++;
  state.saas.price     = tiers[state.saas.priceRound];

  // Demand shock: lose 20% of customers immediately on price raise
  // TODO: tune shock magnitude via a CONSTANT once balancing pass runs
  state.saas.customers *= 0.8;
  state.saas.mrr        = state.saas.price * state.saas.customers;

  renderSaasProduct(state);
}

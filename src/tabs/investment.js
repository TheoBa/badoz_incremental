// investment.js — investment tab
// Spend money on timed marketing boosts and instant reputation events.
//
// Timed boosts (Cold Outreach, SEO, Product Hunt) are stored in
// state.investments.active and consumed by tick.js without mutating
// state.saas.marketingStream, so effects expire cleanly.
//
// Instant effects (newsletter, press, product hunt rep) mutate
// state.reputation.multiplier directly.

import { CONSTANTS } from '../engine/state.js';
import { fmt, fmtN } from '../ui/render.js';

// ── Investment catalog ─────────────────────────────────────────
const CATALOG = [
  {
    id:         'cold_outreach',
    label:      'cold_outreach_campaign',
    desc:       'blast 500 cold emails · temporary visitor spike',
    cost:       () => CONSTANTS.Invest_ColdOutreach_Cost,
    effect:     () => `+${fmtN(CONSTANTS.Invest_ColdOutreach_Boost)} mkt_stream · 1 day`,
    available:  () => true,
    buy: (state) => {
      if (state.wallet < CONSTANTS.Invest_ColdOutreach_Cost) return;
      state.wallet -= CONSTANTS.Invest_ColdOutreach_Cost;
      state.investments.active.push({
        id: 'cold_outreach_' + Date.now(),
        label: 'cold_outreach_campaign',
        ticksRemaining: 24,
        marketingBoost: CONSTANTS.Invest_ColdOutreach_Boost,
      });
    },
  },
  {
    id:         'seo_push',
    label:      'seo_push',
    desc:       'optimise meta tags, schema, backlinks · slow burn',
    cost:       () => CONSTANTS.Invest_SEO_Cost,
    effect:     () => `+${fmtN(CONSTANTS.Invest_SEO_Boost)} mkt_stream · 7 days`,
    available:  () => true,
    buy: (state) => {
      if (state.wallet < CONSTANTS.Invest_SEO_Cost) return;
      state.wallet -= CONSTANTS.Invest_SEO_Cost;
      state.investments.active.push({
        id: 'seo_' + Date.now(),
        label: 'seo_push',
        ticksRemaining: 168,
        marketingBoost: CONSTANTS.Invest_SEO_Boost,
      });
    },
  },
  {
    id:         'newsletter',
    label:      'sponsored_newsletter',
    desc:       'featured in a niche indie-hacker newsletter · instant rep',
    cost:       () => CONSTANTS.Invest_Newsletter_Cost,
    effect:     () => `+${CONSTANTS.Invest_Newsletter_Rep.toFixed(2)} reputation · permanent`,
    available:  () => true,
    buy: (state) => {
      if (state.wallet < CONSTANTS.Invest_Newsletter_Cost) return;
      state.wallet                -= CONSTANTS.Invest_Newsletter_Cost;
      state.reputation.multiplier += CONSTANTS.Invest_Newsletter_Rep;
    },
  },
  {
    id:         'press',
    label:      'press_coverage',
    desc:       'a journalist actually replied · large rep spike',
    cost:       () => CONSTANTS.Invest_Press_Cost,
    effect:     () => `+${CONSTANTS.Invest_Press_Rep.toFixed(2)} reputation · permanent`,
    available:  (state) => state.investments.pressUsesRemaining > 0,
    buy: (state) => {
      if (state.wallet < CONSTANTS.Invest_Press_Cost) return;
      if (state.investments.pressUsesRemaining <= 0) return;
      state.wallet                -= CONSTANTS.Invest_Press_Cost;
      state.reputation.multiplier += CONSTANTS.Invest_Press_Rep;
      state.investments.pressUsesRemaining--;
    },
  },
  {
    id:         'product_hunt',
    label:      'launch_on_product_hunt',
    desc:       '#1 product of the day · massive one-time event',
    cost:       () => CONSTANTS.Invest_ProductHunt_Cost,
    effect:     () => `+${fmtN(CONSTANTS.Invest_ProductHunt_Boost)} mkt_stream (1d) · +${CONSTANTS.Invest_ProductHunt_Rep.toFixed(2)} rep`,
    available:  (state) => !state.investments.productHuntUsed,
    buy: (state) => {
      if (state.wallet < CONSTANTS.Invest_ProductHunt_Cost) return;
      if (state.investments.productHuntUsed) return;
      state.wallet -= CONSTANTS.Invest_ProductHunt_Cost;
      state.investments.productHuntUsed = true;
      state.reputation.multiplier      += CONSTANTS.Invest_ProductHunt_Rep;
      state.investments.active.push({
        id: 'product_hunt',
        label: 'product_hunt_launch',
        ticksRemaining: 24,
        marketingBoost: CONSTANTS.Invest_ProductHunt_Boost,
      });
    },
  },
];

// ── Renderer ───────────────────────────────────────────────────
export function renderInvestment(state) {
  const panel = document.getElementById('panel-investment');
  const activeBoost = state.investments.active.reduce((s, b) => s + b.marketingBoost, 0);

  panel.innerHTML = `
    <div class="inv-stats">
      <div class="inv-stat-row"><span>wallet</span><b class="money">${fmt(state.wallet)}</b></div>
      <div class="inv-stat-row"><span>reputation</span><b class="teal">${state.reputation.multiplier.toFixed(2)}×</b></div>
      ${activeBoost > 0 ? `<div class="inv-stat-row"><span>active_boost</span><b class="amber">+${fmtN(activeBoost)} mkt/d</b></div>` : ''}
    </div>

    ${state.investments.active.length > 0 ? `
    <div class="inv-section">
      <div class="inv-label">active_campaigns</div>
      ${state.investments.active.map(b => `
        <div class="inv-active-row">
          <span>${b.label}</span>
          <span class="inv-ticks">${ticksToLabel(b.ticksRemaining)}</span>
        </div>`).join('')}
    </div>` : ''}

    <div class="inv-section">
      <div class="inv-label">available_investments</div>
      ${CATALOG.map(inv => investmentCard(inv, state)).join('')}
    </div>`;

  CATALOG.forEach(inv => {
    const btn = document.getElementById(`inv-btn-${inv.id}`);
    if (btn && !btn.disabled) {
      btn.addEventListener('click', () => {
        inv.buy(state);
        document.getElementById('h-wallet').textContent = fmt(state.wallet);
        renderInvestment(state);
      });
    }
  });
}

// ── Card builder ───────────────────────────────────────────────
function investmentCard(inv, state) {
  const available = inv.available(state);
  const canAfford = state.wallet >= inv.cost();
  const used      = inv.id === 'product_hunt' && state.investments.productHuntUsed;
  const disabled  = !available || !canAfford || used;

  const badge = used
    ? '<span class="inv-badge">used</span>'
    : inv.id === 'press'
      ? `<span class="inv-badge">${state.investments.pressUsesRemaining}/${CONSTANTS.Invest_Press_Uses} left</span>`
      : '';

  return `
    <div class="inv-card${used ? ' inv-card-used' : ''}">
      <div class="inv-card-body">
        <div class="inv-card-name">${inv.label} ${badge}</div>
        <div class="inv-card-desc">${inv.desc}</div>
        <div class="inv-card-effect">${inv.effect()}</div>
      </div>
      <div class="inv-card-side">
        <div class="inv-card-cost">${fmt(inv.cost())}</div>
        <button
          id="inv-btn-${inv.id}"
          class="inv-btn"
          ${disabled ? 'disabled' : ''}
          title="${!canAfford && !used ? `need ${fmt(inv.cost())}` : ''}">
          ${used ? 'done' : 'invest'}
        </button>
      </div>
    </div>`;
}

// ── Helpers ────────────────────────────────────────────────────
function ticksToLabel(ticks) {
  const days  = Math.floor(ticks / 24);
  const hours = ticks % 24;
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
}

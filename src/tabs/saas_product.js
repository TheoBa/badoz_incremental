// saas_product.js — SaaS product tab
// Consolidates price management and ship_feature upgrades.
//
// Price flow:
//   - Price is auto-set to Saas_Price_T1 on first tab visit (handled in main.js)
//   - raise_price() unlocks T2 then T3 at lifetime-earned milestones (Price_Round_T1/T2)
//   - Raises are one-way and apply negative pressure on satisfaction + retention
//
// Ship feature:
//   - Three upgrade tracks: satisfaction, retention, marketing_stream
//   - Each track shows the next purchasable upgrade; costs scale as baseCost × Scale^level
//   - Buying mutates state.saas.* directly and records purchase in state.upgrades.*

import { CONSTANTS } from '../engine/state.js';
import { fmt, fmtN } from '../ui/render.js';

// ── Upgrade name pools (one per track, in purchase order) ──────
const UPGRADE_NAMES = {
  satisfaction: [
    'add_user_onboarding_flow',
    'implement_in_app_tutorials',
    'add_live_chat_support',
    'launch_knowledge_base',
    'redesign_ux',
    'add_satisfaction_surveys',
  ],
  retention: [
    'add_weekly_email_digest',
    'implement_usage_analytics',
    'add_api_access',
    'build_integrations_hub',
    'implement_feature_flags',
    'add_team_collaboration',
  ],
  marketingStream: [
    'write_landing_page_copy',
    'add_seo_meta_tags',
    'launch_blog',
    'open_source_a_component',
    'add_product_demo_video',
    'submit_to_directories',
  ],
};

// ── Track metadata (colors match CLAUDE.md color coding) ───────
const TRACKS = [
  {
    key:      'satisfaction',
    stateKey: 'satisfaction',
    label:    'satisfaction',
    color:    '#1D9E75',
    baseCost: () => CONSTANTS.Ship_Satisfaction_Base_Cost,
    delta:    () => CONSTANTS.Ship_Satisfaction_Delta,
    fmt:      v  => v.toFixed(2) + '×',
  },
  {
    key:      'retention',
    stateKey: 'retention',
    label:    'retention',
    color:    '#378ADD',
    baseCost: () => CONSTANTS.Ship_Retention_Base_Cost,
    delta:    () => CONSTANTS.Ship_Retention_Delta,
    fmt:      v  => v.toFixed(2) + '×',
  },
  {
    key:      'marketingStream',
    stateKey: 'marketingStream',
    label:    'marketing_stream',
    color:    '#BA7517',
    baseCost: () => CONSTANTS.Ship_Marketing_Base_Cost,
    delta:    () => CONSTANTS.Ship_Marketing_Delta,
    fmt:      v  => fmtN(v) + '/d',
  },
];

function upgradeCost(track, level) {
  return Math.round(track.baseCost() * Math.pow(CONSTANTS.Ship_Cost_Scale, level));
}

// ── Price tier helpers ─────────────────────────────────────────
const PRICE_TIERS    = () => [CONSTANTS.Saas_Price_T1, CONSTANTS.Saas_Price_T2, CONSTANTS.Saas_Price_T3];
const PRICE_CLAIM_IDS = ['price_t1', 'price_t2'];  // milestone step IDs per round

// ── Renderer ───────────────────────────────────────────────────
export function renderSaasProduct(state) {
  const panel = document.getElementById('panel-saas_product');
  const tiers = PRICE_TIERS();
  const round = state.saas.priceRound;

  const nextPrice  = tiers[round + 1] ?? null;
  const claimId    = PRICE_CLAIM_IDS[round] ?? null;
  const milestoneOk = claimId !== null && !!state.milestones?.claimed?.[claimId];
  const canRaise   = nextPrice !== null && milestoneOk;

  const shockSat = CONSTANTS.Saas_Price_Shock_Satisfaction;
  const shockRet = CONSTANTS.Saas_Price_Shock_Retention;

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
      <div class="sp-hint sp-raise-warning">
        ${!milestoneOk
          ? `<span class="sp-hint-lock">locked · claim money_earned milestone in milestones tab first</span>`
          : `<span class="sp-hint-warn">⚠ demand shock: −${shockSat.toFixed(1)} satisfaction · −${shockRet.toFixed(1)} retention</span>`}
      </div>
    </div>` : `
    <div class="sp-section">
      <div class="sp-hint">max_price_tier reached</div>
    </div>`}

    <div class="sp-section">
      <div class="sp-label">ship_feature</div>
      <div id="sp-upgrades">
        ${TRACKS.map(t => upgradeCard(t, state)).join('')}
      </div>
    </div>`;

  // Wire raise_price button
  if (canRaise) {
    document.getElementById('sp-raise-btn')
      ?.addEventListener('click', () => onRaisePrice(state));
  }

  // Wire upgrade buttons
  TRACKS.forEach(t => {
    const level  = state.upgrades[t.key].length;
    const names  = UPGRADE_NAMES[t.key];
    if (level >= names.length) return; // max tier reached
    const btn = document.getElementById(`sp-upgrade-${t.key}`);
    if (btn && !btn.disabled) {
      btn.addEventListener('click', () => onBuyUpgrade(state, t));
    }
  });
}

function upgradeCard(track, state) {
  const level    = state.upgrades[track.key].length;
  const names    = UPGRADE_NAMES[track.key];
  const maxed    = level >= names.length;
  const cost     = maxed ? 0 : upgradeCost(track, level);
  const canAfford = !maxed && state.rcu >= cost;
  const current  = state.saas[track.stateKey];

  return `
    <div class="sf-card">
      <div class="sf-track-header">
        <span class="sf-track-name" style="color:${track.color}">${track.label}</span>
        <span class="sf-track-val">${track.fmt(current)}</span>
      </div>
      ${maxed
        ? `<div class="sf-card-name" style="color:var(--text3)">max_tier_reached</div>`
        : `<div class="sf-card-name">${names[level]}</div>
           <div class="sf-card-sub">
             cost <b style="color:${track.color}">${fmtN(cost)} RCU</b>
             · +${track.fmt(track.delta())}
             · lvl ${level + 1}/${names.length}
           </div>
           <button
             id="sp-upgrade-${track.key}"
             class="sf-btn"
             style="border-color:${track.color};color:${track.color}"
             ${canAfford ? '' : 'disabled'}>
             ship_feature()
           </button>`}
    </div>`;
}

// ── Action handlers ────────────────────────────────────────────
function onRaisePrice(state) {
  const tiers = PRICE_TIERS();
  if (state.saas.priceRound >= tiers.length - 1) return;

  state.saas.priceRound++;
  state.saas.price        = tiers[state.saas.priceRound];
  // Demand shock: flat negative pressure on satisfaction and retention
  state.saas.satisfaction = Math.max(0.1, state.saas.satisfaction - CONSTANTS.Saas_Price_Shock_Satisfaction);
  state.saas.retention    = Math.max(0.1, state.saas.retention    - CONSTANTS.Saas_Price_Shock_Retention);
  state.saas.mrr          = state.saas.price * state.saas.customers;

  renderSaasProduct(state);
}

function onBuyUpgrade(state, track) {
  const level = state.upgrades[track.key].length;
  const cost  = upgradeCost(track, level);
  if (state.rcu < cost) return;

  state.rcu                   -= cost;
  state.saas[track.stateKey]  += track.delta();
  state.upgrades[track.key].push(level);

  // Immediate header update
  document.getElementById('h-rcu').textContent = fmtN(state.rcu);

  renderSaasProduct(state);
}

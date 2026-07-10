// saas_product.js — SaaS product tab
//
// Subscription model:
//   - Customers buy a 1-month subscription, paid upfront.
//   - After 30 in-game days, each cohort faces a renewal check (renewalProb based on retention).
//   - launch_new_subscription() adds an independent tier at 10x price with lower conv/ret multipliers.
//
// Ship feature:
//   - Three upgrade tracks: conversion, retention, marketing_stream (global, apply to all tiers)
//   - Each track shows the next purchasable upgrade; costs scale as baseCost × Scale^level

import { MILESTONES, SAAS, calcSupportRetentionBonus } from '../engine/state.js';
import { fmt, fmtN, progressive_wall } from '../ui/render.js';

// ── Track metadata (colors match CLAUDE.md color coding) ───────
const TRACKS = [
  {
    key:      'conversion',
    stateKey: 'conversion',
    label:    'conversion',
    color:    '#db2777',
    baseCost: () => SAAS.ship_feature.conversion.base_cost,
    costScale: () => SAAS.ship_feature.conversion.cost_scale,
    delta:    (level) => SAAS.ship_feature.conversion.base_delta * Math.pow(SAAS.ship_feature.conversion.delta_scale, level),
    fmt:      v  => v.toFixed(2) + '×',
  },
  {
    key:      'retention',
    stateKey: 'retention',
    label:    'retention',
    color:    '#a89200',
    baseCost: () => SAAS.ship_feature.retention.base_cost,
    costScale: () => SAAS.ship_feature.retention.cost_scale,
    delta:    (level) => SAAS.ship_feature.retention.base_delta * Math.pow(SAAS.ship_feature.retention.delta_scale, level),
    fmt:      v  => v.toFixed(2) + '×',
  },
  {
    key:      'marketingStream',
    stateKey: 'marketingStream',
    label:    'marketing_stream',
    color:    '#d97706',
    baseCost: () => SAAS.ship_feature.marketing.base_cost,
    costScale: () => SAAS.ship_feature.marketing.cost_scale,
    delta:    (level) => SAAS.ship_feature.marketing.base_delta * Math.pow(SAAS.ship_feature.marketing.delta_scale, level),
    fmt:      v  => fmtN(v) + '/d',
  },
];

function upgradeScale(base, scaleFactor, level) {
  return base * Math.pow(scaleFactor, level);
}

// ── Tier helpers ──────────────────────────────────────────────
const LAUNCH_CLAIM_IDS = ['price_t1', 'price_t2'];  // milestone IDs per launch

// ── Renderer ───────────────────────────────────────────────────
export function renderSaasProduct(state) {
  const panel = document.getElementById('panel-saas_product');

  if ((state.freelance.missionsCompleted ?? 0) < MILESTONES.freelance_tiers.t0) {
    panel.innerHTML = `<div class="locked-msg">// complete ${MILESTONES.freelance_tiers.t0} freelance missions to unlock</div>`;
    return;
  }

  const tiers       = state.saas.tiers;
  const cfgTiers    = SAAS.subscription_tiers;
  const tierIdx     = tiers.length;
  const nextCfg     = cfgTiers[tierIdx] ?? null;
  const claimId     = LAUNCH_CLAIM_IDS[tierIdx - 1] ?? null;
  const canLaunch   = nextCfg !== null && claimId !== null
    && !!state.milestones?.claimed?.[claimId];
  const supportBonus = calcSupportRetentionBonus(state);

  const tierCards = tiers.map((tier, i) => {
    const customers = Math.floor(tier.cohorts.reduce((a, b) => a + b, 0));
    const tierMrr   = tier.price * tier.cohorts.reduce((a, b) => a + b, 0);
    const convPct   = progressive_wall(state.saas.conversion * tier.conversionMult, 100, 2);
    const retPct    = progressive_wall((state.saas.retention + supportBonus) * tier.retentionMult, 100, 5);
    return `
    <div class="sp-tier-card">
      <div class="sp-tier-header">
        <span class="sp-tier-label">t${i + 1}</span>
        <span class="money">$${tier.price}/mo</span>
      </div>
      <div class="stat-row"><span>customers</span><b class="mrr">${customers}</b></div>
      <div class="stat-row"><span>MRR</span><b class="mrr">${fmt(tierMrr)}</b></div>
      <div class="stat-row"><span>conv</span><b class="pink">${convPct}%</b></div>
      <div class="stat-row"><span>ret</span><b class="yellow">${retPct}%</b></div>
    </div>`;
  }).join('');

  const launchSection = nextCfg !== null ? `
    <div class="sp-section">
      <div class="sp-label">new_subscription_tier</div>
      <button id="sp-launch-btn" class="sp-raise-btn" ${canLaunch ? '' : 'disabled'}>
        launch_new_subscription() → $${nextCfg.price}/mo
      </button>
      <div class="sp-hint sp-raise-warning">
        ${!canLaunch
          ? `<span class="sp-hint-lock">locked · claim money_earned milestone first</span>`
          : `<span class="sp-hint-warn">conv ×${nextCfg.conversionMult} · ret ×${nextCfg.retentionMult} vs t1</span>`}
      </div>
    </div>` : `
    <div class="sp-section">
      <div class="sp-hint">all_tiers_launched</div>
    </div>`;

  panel.innerHTML = `
    <div class="sp-section">
      <div class="sp-label">saas_product</div>
      <div class="stat-row"><span>name</span><b>${state.productName ?? '—'}</b></div>
      <div class="stat-row"><span>customers</span><b class="mrr">${Math.floor(state.saas.customers)}</b></div>
      <div class="stat-row"><span>MRR</span><b class="mrr">${fmt(state.saas.mrr)}</b></div>
      ${tiers.length < 2 ? `
      <div class="stat-row"><span>conv</span><b class="pink">${progressive_wall(state.saas.conversion, 100, 2)}%</b></div>
      <div class="stat-row"><span>ret</span><b class="yellow">${progressive_wall(state.saas.retention + supportBonus, 100, 5)}%</b></div>
      ` : ''}
    </div>

    <div class="sp-section">
      <div class="sp-label">subscriptions</div>
      ${tierCards}
    </div>

    ${launchSection}

    <div class="sp-section">
      <div class="sp-label">ship_feature</div>
      <div id="sp-upgrades">
        ${TRACKS.map(t => upgradeCard(t, state)).join('')}
      </div>
    </div>`;

  if (canLaunch) {
    document.getElementById('sp-launch-btn')
      ?.addEventListener('click', () => onLaunchNewSubscription(state));
  }

  TRACKS.forEach(t => {
    const btn = document.getElementById(`sp-upgrade-${t.key}`);
    if (btn && !btn.disabled) {
      btn.addEventListener('click', () => onBuyUpgrade(state, t));
    }
  });
}

function upgradeCard(track, state) {
  const level     = state.upgrades[track.key].length;
  const cost      = upgradeScale(track.baseCost(), track.costScale(), level);
  const canAfford = state.rcu >= cost;
  const current   = state.saas[track.stateKey];

  return `
    <div class="sf-card">
      <div class="sf-track-header">
        <span class="sf-track-name" style="color:${track.color}">${track.label}</span>
        <span class="sf-track-val" style="color:${track.color}">${track.fmt(current)}</span>
      </div>
      <div class="sf-card-name">lv. ${level}</div>
      <div class="sf-card-sub">
        cost <b class="rcu">${fmtN(cost)} RCU</b>
        · <b style="color:${track.color}">+${track.fmt(track.delta(level))}</b>
      </div>
      <button
        id="sp-upgrade-${track.key}"
        class="sf-btn"
        style="border-color:${track.color};color:${track.color}"
        ${canAfford ? '' : 'disabled'}>
        ship_feature()
      </button>
    </div>`;
}

// ── Action handlers ────────────────────────────────────────────
function onLaunchNewSubscription(state) {
  const nextIdx = state.saas.tiers.length;
  if (nextIdx >= SAAS.subscription_tiers.length) return;
  const claimId = LAUNCH_CLAIM_IDS[nextIdx - 1];
  if (!state.milestones?.claimed?.[claimId]) return;

  const cfg = SAAS.subscription_tiers[nextIdx];
  state.saas.tiers.push({
    price:          cfg.price,
    cohorts:        new Array(30).fill(0),
    conversionMult: cfg.conversionMult,
    retentionMult:  cfg.retentionMult,
  });
  state.events.push({ tick: state.ticksElapsed, type: 'launch_subscription', price: cfg.price });

  renderSaasProduct(state);
}

function onBuyUpgrade(state, track) {
  const level = state.upgrades[track.key].length;
  const cost  = upgradeScale(track.baseCost(), track.costScale(), level);
  if (state.rcu < cost) return;

  state.rcu                   -= cost;
  state.saas[track.stateKey]  += track.delta(level);
  state.upgrades[track.key].push(level);

  document.getElementById('h-rcu').textContent = fmtN(state.rcu);

  renderSaasProduct(state);
}

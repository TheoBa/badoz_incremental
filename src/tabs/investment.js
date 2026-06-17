// investment.js — investment tab
// Investments are grouped into three categories:
//
//   mkt_stream  — timed visitor boosts (stored in state.investments.active)
//   reputation  — instant permanent rep multiplier bumps
//   hardware    — one-time RCU/click upgrades (gear → laptop → CPU/GPU)
//
// Architecture note: timed boosts do NOT mutate state.saas.marketingStream.
// tick.js sums active boosts at acquisition time so expiry is a clean array filter.

import { CONSTANTS, calcRcuPerClick } from '../engine/state.js';
import { fmt, fmtN } from '../ui/render.js';

// ── Category definitions ───────────────────────────────────────
const CATEGORIES = [
  {
    id:          'mkt_stream',
    label:       'mkt_stream · visitor boosts',
    effectClass: 'amber',
    items: [
      {
        id:        'cold_outreach',
        label:     'cold_outreach_campaign',
        desc:      'blast 500 cold emails · temporary visitor spike',
        cost:      () => CONSTANTS.Invest_ColdOutreach_Cost,
        effect:    () => `+${fmtN(CONSTANTS.Invest_ColdOutreach_Boost)} mkt_stream · 1 day`,
        available: (state) => !state.investments.active.some(b => b.label === 'cold_outreach_campaign'),
        activeTicks: (state) => {
          const b = state.investments.active.find(b => b.label === 'cold_outreach_campaign');
          return b ? b.ticksRemaining : 0;
        },
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
        id:        'seo_push',
        label:     'seo_push',
        desc:      'optimise meta tags, schema, backlinks · slow burn',
        cost:      () => CONSTANTS.Invest_SEO_Cost,
        effect:    () => `+${fmtN(CONSTANTS.Invest_SEO_Boost)} mkt_stream · 7 days`,
        available: (state) => !state.investments.active.some(b => b.label === 'seo_push'),
        activeTicks: (state) => {
          const b = state.investments.active.find(b => b.label === 'seo_push');
          return b ? b.ticksRemaining : 0;
        },
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
    ],
  },
  {
    id:          'reputation',
    label:       'reputation · rep multiplier',
    effectClass: '',
    items: [
      {
        id:           'newsletter',
        label:        'sponsored_newsletter',
        desc:         'featured in a niche indie-hacker newsletter · instant rep',
        cost:         () => CONSTANTS.Invest_Newsletter_Cost,
        effect:       () => `+${CONSTANTS.Invest_Newsletter_Rep.toFixed(2)} rep · permanent`,
        available:    (state) => state.investments.newsletterCooldownTicks === 0,
        cooldownTicks:(state) => state.investments.newsletterCooldownTicks,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Invest_Newsletter_Cost) return;
          if (state.investments.newsletterCooldownTicks > 0) return;
          state.wallet                          -= CONSTANTS.Invest_Newsletter_Cost;
          state.reputation.multiplier           += CONSTANTS.Invest_Newsletter_Rep;
          state.investments.newsletterCooldownTicks = CONSTANTS.Invest_Newsletter_Cooldown;
        },
      },
      {
        id:           'press',
        label:        'press_coverage',
        desc:         'a journalist actually replied · large rep spike',
        cost:         () => CONSTANTS.Invest_Press_Cost,
        effect:       () => `+${CONSTANTS.Invest_Press_Rep.toFixed(2)} rep · permanent`,
        available:    (state) => state.investments.pressUsesRemaining > 0 && state.investments.pressCooldownTicks === 0,
        cooldownTicks:(state) => state.investments.pressCooldownTicks,
        badge:        (state) => `${state.investments.pressUsesRemaining}/${CONSTANTS.Invest_Press_Uses} left`,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Invest_Press_Cost) return;
          if (state.investments.pressUsesRemaining <= 0) return;
          if (state.investments.pressCooldownTicks > 0) return;
          state.wallet                       -= CONSTANTS.Invest_Press_Cost;
          state.reputation.multiplier        += CONSTANTS.Invest_Press_Rep;
          state.investments.pressUsesRemaining--;
          state.investments.pressCooldownTicks = CONSTANTS.Invest_Press_Cooldown;
        },
      },
      {
        id:        'product_hunt',
        label:     'launch_on_product_hunt',
        desc:      '#1 product of the day · massive one-time event',
        cost:      () => CONSTANTS.Invest_ProductHunt_Cost,
        effect:    () => `+${CONSTANTS.Invest_ProductHunt_Rep.toFixed(2)} rep · permanent`,
        available: (state) => !state.investments.productHuntUsed,
        done:      (state) => state.investments.productHuntUsed,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Invest_ProductHunt_Cost) return;
          if (state.investments.productHuntUsed) return;
          state.wallet                     -= CONSTANTS.Invest_ProductHunt_Cost;
          state.investments.productHuntUsed = true;
          state.reputation.multiplier      += CONSTANTS.Invest_ProductHunt_Rep;
        },
      },
    ],
  },
  {
    id:          'hardware',
    label:       'hardware · rcu/click',
    effectClass: 'teal',
    items: [
      // ── Gear tiers (sequential) ──────────────────────────────
      {
        id:        'gear_t1',
        label:     'mechanical_keyboard',
        desc:      'tactile feedback, 10% faster typing — or so you tell yourself',
        cost:      () => CONSTANTS.Hardware_Gear_T1_Cost,
        effect:    () => `+${CONSTANTS.Hardware_Gear_T1_RCU} RCU/click`,
        available: (state) => state.investments.hardware.gearLevel === 0,
        oneTime:   true,
        done:      (state) => state.investments.hardware.gearLevel >= 1,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Hardware_Gear_T1_Cost) return;
          if (state.investments.hardware.gearLevel !== 0) return;
          state.wallet -= CONSTANTS.Hardware_Gear_T1_Cost;
          state.investments.hardware.gearLevel = 1;
        },
      },
      {
        id:        'gear_t2',
        label:     'dual_monitor_setup',
        desc:      'one screen for code, one for docs you never read',
        cost:      () => CONSTANTS.Hardware_Gear_T2_Cost,
        effect:    () => `+${CONSTANTS.Hardware_Gear_T2_RCU} RCU/click`,
        available: (state) => state.investments.hardware.gearLevel === 1,
        oneTime:   true,
        done:      (state) => state.investments.hardware.gearLevel >= 2,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Hardware_Gear_T2_Cost) return;
          if (state.investments.hardware.gearLevel !== 1) return;
          state.wallet -= CONSTANTS.Hardware_Gear_T2_Cost;
          state.investments.hardware.gearLevel = 2;
        },
      },
      {
        id:        'gear_t3',
        label:     'ergonomic_workstation',
        desc:      'standing desk, Herman Miller, the works',
        cost:      () => CONSTANTS.Hardware_Gear_T3_Cost,
        effect:    () => `+${CONSTANTS.Hardware_Gear_T3_RCU} RCU/click`,
        available: (state) => state.investments.hardware.gearLevel === 2,
        oneTime:   true,
        done:      (state) => state.investments.hardware.gearLevel >= 3,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Hardware_Gear_T3_Cost) return;
          if (state.investments.hardware.gearLevel !== 2) return;
          state.wallet -= CONSTANTS.Hardware_Gear_T3_Cost;
          state.investments.hardware.gearLevel = 3;
        },
      },
      // ── Laptop tiers (sequential) ───────────────────────────
      {
        id:        'laptop_t1',
        label:     'macbook_pro_upgrade',
        desc:      'M-series chip, finally compiles in under a minute',
        cost:      () => CONSTANTS.Hardware_Laptop_T1_Cost,
        effect:    () => `+${CONSTANTS.Hardware_Laptop_T1_RCU} RCU/click`,
        available: (state) => state.investments.hardware.laptopLevel === 0,
        oneTime:   true,
        done:      (state) => state.investments.hardware.laptopLevel >= 1,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Hardware_Laptop_T1_Cost) return;
          if (state.investments.hardware.laptopLevel !== 0) return;
          state.wallet -= CONSTANTS.Hardware_Laptop_T1_Cost;
          state.investments.hardware.laptopLevel = 1;
        },
      },
      {
        id:        'laptop_t2',
        label:     'mac_studio',
        desc:      'desktop-class silicon · no thermal throttling ever',
        cost:      () => CONSTANTS.Hardware_Laptop_T2_Cost,
        effect:    () => `+${CONSTANTS.Hardware_Laptop_T2_RCU} RCU/click`,
        available: (state) => state.investments.hardware.laptopLevel === 1,
        oneTime:   true,
        done:      (state) => state.investments.hardware.laptopLevel >= 2,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Hardware_Laptop_T2_Cost) return;
          if (state.investments.hardware.laptopLevel !== 1) return;
          state.wallet -= CONSTANTS.Hardware_Laptop_T2_Cost;
          state.investments.hardware.laptopLevel = 2;
        },
      },
      // ── CPU / GPU (independent multipliers) ─────────────────
      {
        id:        'cpu_upgrade',
        label:     'cpu_upgrade',
        desc:      'faster compilation pipeline · multiplies base RCU output',
        cost:      () => CONSTANTS.Hardware_CPU_Cost,
        effect:    () => `×${CONSTANTS.Hardware_CPU_Mult} base RCU/click`,
        available: (state) => !state.investments.hardware.cpuPurchased,
        oneTime:   true,
        done:      (state) => state.investments.hardware.cpuPurchased,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Hardware_CPU_Cost) return;
          if (state.investments.hardware.cpuPurchased) return;
          state.wallet -= CONSTANTS.Hardware_CPU_Cost;
          state.investments.hardware.cpuPurchased = true;
        },
      },
      {
        id:        'gpu_rig',
        label:     'gpu_rig',
        desc:      'parallel shader cores for... local model inference, obviously',
        cost:      () => CONSTANTS.Hardware_GPU_Cost,
        effect:    () => `×${CONSTANTS.Hardware_GPU_Mult} total RCU/click`,
        available: (state) => !state.investments.hardware.gpuPurchased,
        oneTime:   true,
        done:      (state) => state.investments.hardware.gpuPurchased,
        buy: (state) => {
          if (state.wallet < CONSTANTS.Hardware_GPU_Cost) return;
          if (state.investments.hardware.gpuPurchased) return;
          state.wallet -= CONSTANTS.Hardware_GPU_Cost;
          state.investments.hardware.gpuPurchased = true;
        },
      },
    ],
  },
];

// ── Renderer ───────────────────────────────────────────────────
export function renderInvestment(state) {
  const panel       = document.getElementById('panel-investment');
  const activeBoost = state.investments.active.reduce((s, b) => s + b.marketingBoost, 0);
  const rcuPerClick = calcRcuPerClick(state);

  panel.innerHTML = `
    <div class="inv-stats">
      <div class="inv-stat-row"><span>wallet</span><b class="money">${fmt(state.wallet)}</b></div>
      <div class="inv-stat-row"><span>reputation</span><b class="teal">${state.reputation.multiplier.toFixed(2)}×</b></div>
      <div class="inv-stat-row"><span>rcu/click</span><b>${rcuPerClick}</b></div>
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

    ${CATEGORIES.map(cat => categorySection(cat, state)).join('')}`;

  // Wire click handlers for every buy button
  CATEGORIES.forEach(cat => {
    cat.items.forEach(inv => {
      const btn = document.getElementById(`inv-btn-${inv.id}`);
      if (btn && !btn.disabled) {
        btn.addEventListener('click', () => {
          inv.buy(state);
          document.getElementById('h-wallet').textContent = fmt(state.wallet);
          renderInvestment(state);
        });
      }
    });
  });
}

// ── Section builder ────────────────────────────────────────────
function categorySection(cat, state) {
  // For hardware: show only purchased items + the next available one (not all future)
  const items = cat.id === 'hardware'
    ? hardwareVisible(cat.items, state)
    : cat.items;

  const cards = items.map(inv => investmentCard(inv, state, cat.effectClass)).join('');
  return `
    <div class="inv-section">
      <div class="inv-label">${cat.label}</div>
      ${cards}
    </div>`;
}

// For hardware: show all done items + the first not-done item per sub-track (gear, laptop)
// CPU and GPU are always shown.
function hardwareVisible(items, state) {
  const ALWAYS = ['cpu_upgrade', 'gpu_rig'];
  const GEAR_IDS   = ['gear_t1',   'gear_t2',   'gear_t3'];
  const LAPTOP_IDS = ['laptop_t1', 'laptop_t2'];

  const visible = new Set(ALWAYS);

  // Gear: show purchased + next
  const gearPurchased = GEAR_IDS.filter(id => items.find(i => i.id === id)?.done(state));
  gearPurchased.forEach(id => visible.add(id));
  const nextGear = GEAR_IDS.find(id => !items.find(i => i.id === id)?.done(state));
  if (nextGear) visible.add(nextGear);

  // Laptop: show purchased + next
  const laptopPurchased = LAPTOP_IDS.filter(id => items.find(i => i.id === id)?.done(state));
  laptopPurchased.forEach(id => visible.add(id));
  const nextLaptop = LAPTOP_IDS.find(id => !items.find(i => i.id === id)?.done(state));
  if (nextLaptop) visible.add(nextLaptop);

  return items.filter(i => visible.has(i.id));
}

// ── Card builder ───────────────────────────────────────────────
function investmentCard(inv, state, effectClass = '') {
  const done         = inv.done ? inv.done(state) : false;
  const activeTicks  = inv.activeTicks   ? inv.activeTicks(state)   : 0;
  const cdTicks      = inv.cooldownTicks ? inv.cooldownTicks(state) : 0;
  const inProgress   = activeTicks > 0;
  const onCooldown   = cdTicks > 0;
  const available    = !done && !inProgress && !onCooldown && inv.available(state);
  const canAfford    = state.wallet >= inv.cost();
  const disabled     = done || inProgress || onCooldown || !canAfford;

  // Badge: priority order — cooldown remaining > in-progress remaining > custom badge
  const badge = onCooldown
    ? `<span class="inv-badge">${ticksToLabel(cdTicks)}</span>`
    : inProgress
      ? `<span class="inv-badge">active · ${ticksToLabel(activeTicks)}</span>`
      : inv.badge
        ? `<span class="inv-badge">${inv.badge(state)}</span>`
        : '';

  const btnLabel = done ? 'done' : inProgress ? 'active' : onCooldown ? 'cooldown' : 'invest';

  return `
    <div class="inv-card${done ? ' inv-card-used' : ''}">
      <div class="inv-card-body">
        <div class="inv-card-name">${inv.label} ${badge}</div>
        <div class="inv-card-desc">${inv.desc}</div>
        <div class="inv-card-effect${effectClass ? ' ' + effectClass : ''}">${inv.effect()}</div>
      </div>
      <div class="inv-card-side">
        <div class="inv-card-cost">${done ? '—' : fmt(inv.cost())}</div>
        <button
          id="inv-btn-${inv.id}"
          class="inv-btn"
          ${disabled ? 'disabled' : ''}
          title="${!canAfford && !done && !inProgress && !onCooldown ? `need ${fmt(inv.cost())}` : ''}">
          ${btnLabel}
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

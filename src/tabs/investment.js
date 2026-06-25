// investment.js — investment tab
// Investments are grouped into three categories:
//
//   mkt_stream  — timed visitor boosts (stored in state.investments.active)
//   reputation  — instant permanent rep multiplier bumps
//   hardware    — one-time RCU/click upgrades (gear → laptop → CPU/GPU)
//
// Architecture note: timed boosts do NOT mutate state.saas.marketingStream.
// tick.js sums active boosts at acquisition time so expiry is a clean array filter.
//
// CATEGORIES is derived from INVESTMENTS in state.js — add or remove an entry
// there and it flows here automatically. Each category type has one builder:
//   buildMarketingCategory  — items with campaign_active → timed boost
//   buildReputationCategory — items with cooldown/max_uses → rep bump
//   buildHardwareCategory   — gear/laptop tiers + cpu/gpu infinite upgrades

import { INVESTMENTS, MILESTONES, calcRcuPerClick } from '../engine/state.js';
import { fmt, fmtN } from '../ui/render.js';

// ── Category builders ──────────────────────────────────────────

function buildMarketingCategory() {
  return {
    id:          'mkt_stream',
    label:       'mkt_stream · visitor boosts',
    effectClass: 'amber',
    items: Object.values(INVESTMENTS.marketing).map(item => {
      const days = item.campaign_active / 24;
      const durLabel = `${days} day${days !== 1 ? 's' : ''}`;
      return {
        id:          item.id,
        label:       item.label,
        desc:        item.desc,
        cost:        () => item.cost,
        effect:      () => `+${fmtN(item.boost)} mkt_stream · ${durLabel}`,
        gate:        item.gate ? (state) => !!state.milestones?.claimed?.[item.gate] : null,
        gateLabel:   item.gate,
        available:   (state) => !state.investments.active.some(b => b.label === item.label),
        activeTicks: (state) => {
          const b = state.investments.active.find(b => b.label === item.label);
          return b ? b.ticksRemaining : 0;
        },
        buy: (state) => {
          if (state.wallet < item.cost) return;
          state.wallet -= item.cost;
          if (state.weekStats) state.weekStats.investSpent += item.cost;
          state.investments.active.push({
            id:             item.id + '_' + Date.now(),
            label:          item.label,
            ticksRemaining: item.campaign_active,
            marketingBoost: item.boost,
          });
        },
      };
    }),
  };
}

function buildReputationCategory() {
  return {
    id:          'reputation',
    label:       'reputation · rep multiplier',
    effectClass: '',
    items: Object.values(INVESTMENTS.reputation).map(item => {
      const hasUses     = item.max_uses != null;
      const hasCooldown = item.cooldown  != null;
      return {
        id:        item.id,
        label:     item.label,
        desc:      item.desc,
        cost:      () => item.cost,
        effect:    () => `+${item.boost.toFixed(2)} rep · permanent`,
        gate:      item.gate ? (state) => !!state.milestones?.claimed?.[item.gate] : null,
        gateLabel: item.gate,
        available: (state) => {
          const uses     = state.investments.uses?.[item.id] ?? item.max_uses ?? Infinity;
          const cooldown = state.investments.cooldowns?.[item.id] ?? 0;
          return (!hasUses || uses > 0) && (!hasCooldown || cooldown === 0);
        },
        done: hasUses
          ? (state) => (state.investments.uses?.[item.id] ?? item.max_uses) <= 0
          : undefined,
        cooldownTicks: hasCooldown
          ? (state) => state.investments.cooldowns?.[item.id] ?? 0
          : undefined,
        badge: hasUses && item.max_uses > 1
          ? (state) => {
              const left = state.investments.uses?.[item.id] ?? item.max_uses;
              return `${left}/${item.max_uses} left`;
            }
          : undefined,
        buy: (state) => {
          const uses     = state.investments.uses?.[item.id] ?? item.max_uses ?? Infinity;
          const cooldown = state.investments.cooldowns?.[item.id] ?? 0;
          if (state.wallet < item.cost) return;
          if (hasUses && uses <= 0) return;
          if (hasCooldown && cooldown > 0) return;
          state.wallet -= item.cost;
          if (state.weekStats) state.weekStats.investSpent += item.cost;
          state.reputation.multiplier += item.boost;
          if (hasUses) {
            if (!state.investments.uses) state.investments.uses = {};
            state.investments.uses[item.id] = uses - 1;
          }
          if (hasCooldown) {
            if (!state.investments.cooldowns) state.investments.cooldowns = {};
            state.investments.cooldowns[item.id] = item.cooldown;
          }
        },
      };
    }),
  };
}

function buildHardwareCategory() {
  const { gear, laptop, cpu, gpu } = INVESTMENTS.rcu;

  const gearItems = Object.values(gear).map((tier, i) => ({
    id:        tier.id,
    label:     tier.label,
    desc:      tier.desc,
    cost:      () => tier.cost,
    effect:    () => `+${tier.boost} RCU/click`,
    available: (state) => state.investments.hardware.gearLevel === i,
    oneTime:   true,
    done:      (state) => state.investments.hardware.gearLevel > i,
    buy: (state) => {
      if (state.wallet < tier.cost) return;
      if (state.investments.hardware.gearLevel !== i) return;
      state.wallet -= tier.cost;
      if (state.weekStats) state.weekStats.investSpent += tier.cost;
      state.investments.hardware.gearLevel = i + 1;
    },
  }));

  const laptopItems = Object.values(laptop).map((tier, i) => ({
    id:        tier.id,
    label:     tier.label,
    desc:      tier.desc,
    cost:      () => tier.cost,
    effect:    () => `+${tier.boost} RCU/click`,
    available: (state) => state.investments.hardware.laptopLevel === i,
    oneTime:   true,
    done:      (state) => state.investments.hardware.laptopLevel > i,
    buy: (state) => {
      if (state.wallet < tier.cost) return;
      if (state.investments.hardware.laptopLevel !== i) return;
      state.wallet -= tier.cost;
      if (state.weekStats) state.weekStats.investSpent += tier.cost;
      state.investments.hardware.laptopLevel = i + 1;
    },
  }));

  const cpuItem = {
    id:        cpu.id,
    label:     cpu.label,
    desc:      cpu.desc,
    cost:      (state) => Math.floor(cpu.base_cost * Math.pow(cpu.cost_scale, state.investments.hardware.cpuLevel)),
    effect:    (state) => `×${(1 + (state.investments.hardware.cpuLevel + 1) * cpu.delta).toFixed(1)} base RCU/click`,
    badge:     (state) => state.investments.hardware.cpuLevel > 0 ? `lv.${state.investments.hardware.cpuLevel}` : null,
    available: () => true,
    buy: (state) => {
      const cost = Math.floor(cpu.base_cost * Math.pow(cpu.cost_scale, state.investments.hardware.cpuLevel));
      if (state.wallet < cost) return;
      state.wallet -= cost;
      if (state.weekStats) state.weekStats.investSpent += cost;
      state.investments.hardware.cpuLevel++;
    },
  };

  const gpuItem = {
    id:        gpu.id,
    label:     gpu.label,
    desc:      gpu.desc,
    cost:      (state) => Math.floor(gpu.base_cost * Math.pow(gpu.cost_scale, state.investments.hardware.gpuLevel)),
    effect:    (state) => `×${(1 + (state.investments.hardware.gpuLevel + 1) * gpu.delta).toFixed(1)} total RCU/click`,
    badge:     (state) => state.investments.hardware.gpuLevel > 0 ? `lv.${state.investments.hardware.gpuLevel}` : null,
    available: () => true,
    buy: (state) => {
      const cost = Math.floor(gpu.base_cost * Math.pow(gpu.cost_scale, state.investments.hardware.gpuLevel));
      if (state.wallet < cost) return;
      state.wallet -= cost;
      if (state.weekStats) state.weekStats.investSpent += cost;
      state.investments.hardware.gpuLevel++;
    },
  };

  return {
    id:          'hardware',
    label:       'hardware · rcu/click',
    effectClass: 'teal',
    items:       [...gearItems, ...laptopItems, cpuItem, gpuItem],
  };
}

const CATEGORIES = [
  buildHardwareCategory(),
  buildReputationCategory(),
  buildMarketingCategory(),
];

// ── Renderer ───────────────────────────────────────────────────
export function renderInvestment(state) {
  const panel = document.getElementById('panel-investment');

  if (!state.milestones?.claimed?.investment_unlock) {
    panel.innerHTML = `<div class="inv-locked">earn $${MILESTONES.money_tiers.t1} lifetime to unlock investments</div>`;
    return;
  }

  const activeBoost = state.investments.active.reduce((s, b) => s + b.marketingBoost, 0);
  const rcuPerClick = calcRcuPerClick(state);

  panel.innerHTML = `
    <div class="inv-stats">
      <div class="inv-stat-row"><span>wallet</span><b class="money">${fmt(state.wallet)}</b></div>
      <div class="inv-stat-row"><span>reputation</span><b class="teal">${state.reputation.multiplier.toFixed(2)}×</b></div>
      <div class="inv-stat-row"><span>rcu/click</span><b>${rcuPerClick}</b></div>
      ${activeBoost > 0 ? `<div class="inv-stat-row"><span>active_boost</span><b class="amber">+${fmtN(activeBoost)} mkt/d</b></div>` : ''}
    </div>

    ${CATEGORIES
        .filter(cat => cat.id !== 'mkt_stream' || (state.freelance.missionsCompleted ?? 0) >= MILESTONES.freelance_tiers.t0)
        .map(cat => categorySection(cat, state)).join('')}`;

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
  if (cat.id === 'hardware') return hardwareCategorySection(cat, state);

  const cards = cat.items.map(inv => {
    const gated = inv.gate && !inv.gate(state);
    return gated
      ? lockedInvestmentCard(inv, state)
      : investmentCard(inv, state, cat.effectClass);
  }).join('');

  return `
    <div class="inv-section">
      <div class="inv-label">${cat.label}</div>
      ${cards}
    </div>`;
}

// Hardware renders as three fixed rows: gear · laptop · cpu+gpu
function hardwareCategorySection(cat, state) {
  const { gear, laptop, cpu, gpu } = INVESTMENTS.rcu;
  const byId = Object.fromEntries(cat.items.map(i => [i.id, i]));
  const card = id => investmentCard(byId[id], state, cat.effectClass);

  const gearRow   = Object.values(gear).map(t => card(t.id)).join('');
  const laptopRow = Object.values(laptop).map(t => card(t.id)).join('');
  const cpuGpuRow = [cpu.id, gpu.id].map(id => card(id)).join('');

  return `
    <div class="inv-section">
      <div class="inv-label">${cat.label}</div>
      <div class="inv-row">${gearRow}</div>
      <div class="inv-row">${laptopRow}</div>
      <div class="inv-row">${cpuGpuRow}</div>
    </div>`;
}

// ── Locked card (gated by milestone) ──────────────────────────
function lockedInvestmentCard(inv) {
  return `
    <div class="inv-card inv-card-locked">
      <div class="inv-card-body">
        <div class="inv-card-name">${inv.label}</div>
        <div class="inv-card-desc">${inv.desc}</div>
      </div>
      <div class="inv-card-side">
        <span class="inv-badge inv-badge-gate">🔒 ${inv.gateLabel ?? 'milestone'}</span>
      </div>
    </div>`;
}

// ── Card builder ───────────────────────────────────────────────
function investmentCard(inv, state, effectClass = '') {
  const done        = inv.done ? inv.done(state) : false;
  const activeTicks = inv.activeTicks   ? inv.activeTicks(state)   : 0;
  const cdTicks     = inv.cooldownTicks ? inv.cooldownTicks(state) : 0;
  const inProgress  = activeTicks > 0;
  const onCooldown  = cdTicks > 0;
  const cost        = inv.cost(state);
  const canAfford   = state.wallet >= cost;
  const disabled    = done || inProgress || onCooldown || !canAfford;

  // Badge: priority — cooldown > in-progress > custom (null = no badge)
  const customBadge = inv.badge ? inv.badge(state) : null;
  const badge = onCooldown
    ? `<span class="inv-badge">${ticksToLabel(cdTicks)}</span>`
    : inProgress
      ? `<span class="inv-badge">active · ${ticksToLabel(activeTicks)}</span>`
      : customBadge
        ? `<span class="inv-badge">${customBadge}</span>`
        : '';

  const btnLabel = done ? 'done' : inProgress ? 'active' : onCooldown ? 'cooldown' : 'invest';

  return `
    <div class="inv-card${done ? ' inv-card-used' : ''}">
      <div class="inv-card-body">
        <div class="inv-card-name">${inv.label} ${badge}</div>
        <div class="inv-card-desc">${inv.desc}</div>
        <div class="inv-card-effect${effectClass ? ' ' + effectClass : ''}">${inv.effect(state)}</div>
      </div>
      <div class="inv-card-side">
        <div class="inv-card-cost">${done ? '—' : fmt(cost)}</div>
        <button
          id="inv-btn-${inv.id}"
          class="inv-btn"
          ${disabled ? 'disabled' : ''}
          title="${!canAfford && !done && !inProgress && !onCooldown ? `need ${fmt(cost)}` : ''}">
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

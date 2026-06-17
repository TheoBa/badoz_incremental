// frontier_lab.js — Frontier Lab tab
// Dark-themed AI agent hub. Agents unlock, subscribe to a plan tier, and upgrade their model.
// Daily plan costs are deducted by tick.js → applyDailyLabBilling() at each day boundary.
// Plan changes take effect at the next day boundary (pendingTier → tier).

import { CONSTANTS, LAB_PLANS } from '../engine/state.js';

// ── Plan display order ─────────────────────────────────────────
const PLAN_ORDER = ['free', 'hobbyist', 'growth', 'scale', 'infernal'];

// ── Agent display config ───────────────────────────────────────
const AGENTS = [
  {
    id:        'ai_coder',
    label:     'ai_coder',
    desc:      'Writes code so you don\'t have to. Mostly correct.',
    boost:     'passive_rcu/h',
    unlockRcu: 0,    // pre-unlocked — this value never shown
  },
  {
    id:        'ai_support',
    label:     'ai_support',
    desc:      'Handles tickets. Rarely gaslights customers.',
    boost:     'customer_retention',
    unlockRcu: CONSTANTS.Lab_Support_Unlock_RCU,   // null until tuned
  },
  {
    id:        'ai_marketer',
    label:     'ai_marketer',
    desc:      'Posts everywhere simultaneously. Results may include virality. Or controversy.',
    boost:     'marketing_stream + reputation/d',
    unlockRcu: CONSTANTS.Lab_Marketer_Unlock_RCU,  // null until tuned
  },
];

// ── Renderer ───────────────────────────────────────────────────
export function renderFrontierLab(state) {
  const panel = document.getElementById('panel-frontier_lab');

  // Build chrome once
  if (!panel._built) {
    panel.innerHTML = `
      <div class="lab-header">
        <div class="lab-title">THE FRONTIER LAB</div>
        <div class="lab-tagline">We align with your wallet.</div>
      </div>
      <div id="lab-gate"></div>
      <div id="lab-catalog"></div>
      <div class="lab-burn" id="lab-burn"></div>`;
    panel._built = true;
  }

  const unlocked = state.moneyLifetime >= CONSTANTS.Lab_Unlock_Money;
  const gate     = document.getElementById('lab-gate');
  const catalog  = document.getElementById('lab-catalog');

  if (!unlocked) {
    gate.innerHTML =
      `<div class="lab-locked">[ classified ] — unlocked_at: ${fmtMoney(CONSTANTS.Lab_Unlock_Money)} earned</div>`;
    catalog.innerHTML = '';
    document.getElementById('lab-burn').textContent = '';
    return;
  }

  gate.innerHTML = '';

  // Rebuild catalog each render (3 cards, only active when tab is visible)
  catalog.innerHTML = AGENTS.map(cfg => {
    const agent = state.lab.agents[cfg.id];
    return agentCardHTML(cfg, agent, state);
  }).join('');

  // Wire buttons
  AGENTS.forEach(cfg => {
    const agent = state.lab.agents[cfg.id];

    if (!agent.unlocked) {
      const btn = document.getElementById(`lab-unlock-${cfg.id}`);
      if (btn) btn.addEventListener('click', () => {
        onUnlockAgent(state, cfg);
        renderFrontierLab(state);
      });
    } else {
      PLAN_ORDER.forEach(planId => {
        const btn = document.getElementById(`lab-plan-${cfg.id}-${planId}`);
        if (btn) btn.addEventListener('click', () => {
          onSetPlan(state, cfg.id, planId);
          renderFrontierLab(state);
        });
      });
      const upgradeBtn = document.getElementById(`lab-upgrade-${cfg.id}`);
      if (upgradeBtn) upgradeBtn.addEventListener('click', () => {
        onUpgradeModel(state, cfg.id);
        renderFrontierLab(state);
      });
    }
  });

  // Daily burn total
  const burn = calcDailyBurn(state);
  document.getElementById('lab-burn').textContent =
    burn > 0 ? `daily_burn: $${burn}/d` : 'daily_burn: —';
}

// ── Card HTML builders ─────────────────────────────────────────
function agentCardHTML(cfg, agent, state) {
  return agent.unlocked ? activeCardHTML(cfg, agent, state) : lockedCardHTML(cfg, agent, state);
}

function lockedCardHTML(cfg, agent, state) {
  const hasRcu    = cfg.unlockRcu != null;
  const canAfford = hasRcu && state.rcu >= cfg.unlockRcu;
  const costLabel = hasRcu ? `${cfg.unlockRcu} RCU` : 'TBD';

  return `
    <div class="lab-card lab-card-locked">
      <div class="lab-card-top">
        <span class="lab-agent-name">${cfg.label}</span>
        <span class="lab-status-tag lab-tag-locked">locked</span>
      </div>
      <div class="lab-agent-desc">${cfg.desc}</div>
      <div class="lab-agent-boost">boost: ${cfg.boost}</div>
      <button class="lab-btn lab-unlock-btn" id="lab-unlock-${cfg.id}"
        ${hasRcu && canAfford ? '' : 'disabled'}>
        [ unlock — ${costLabel} ]
      </button>
    </div>`;
}

function activeCardHTML(cfg, agent, state) {
  const plan    = LAB_PLANS[agent.tier];
  const pending = agent.pendingTier;

  // effective_boost = plan_multiplier × modelLevel (v1 = 1×, v2 = 2×, …)
  const effectiveMult = plan.multiplier * agent.modelLevel;

  const planBtns = PLAN_ORDER.map(planId => {
    const p         = LAB_PLANS[planId];
    const isCurrent = agent.tier === planId;
    const isPending = pending === planId && !isCurrent;
    const classes   = ['lab-plan-btn',
      isCurrent ? 'lab-plan-current' : '',
      isPending ? 'lab-plan-pending' : '',
    ].filter(Boolean).join(' ');

    return `<button class="${classes}" id="lab-plan-${cfg.id}-${planId}">
      ${planId}<br>
      <span class="lab-plan-sub">${p.dailyCost === 0 ? 'free' : `$${p.dailyCost}/d`} · ×${p.multiplier}</span>
    </button>`;
  }).join('');

  const pendingNote = pending && pending !== agent.tier
    ? `<div class="lab-pending-note">→ ${pending} takes effect tomorrow</div>`
    : '';

  const upgradeCost = CONSTANTS.Lab_Model_Upgrade_RCU;
  const canUpgrade  = upgradeCost != null && state.rcu >= upgradeCost;

  return `
    <div class="lab-card">
      <div class="lab-card-top">
        <span class="lab-agent-name">${cfg.label}</span>
        <span class="lab-status-tag lab-tag-model">v${agent.modelLevel}</span>
        <button class="lab-btn lab-upgrade-btn" id="lab-upgrade-${cfg.id}"
          ${canUpgrade ? '' : 'disabled'}>
          ${upgradeCost == null ? '[ upgrade_model — TBD ]' : `[ upgrade_model — ${upgradeCost} RCU ]`}
        </button>
      </div>
      <div class="lab-agent-desc">${cfg.desc}</div>
      <div class="lab-agent-boost">
        effective_boost: <span class="lab-boost-val">×${effectiveMult.toFixed(1)}</span>
        <span class="lab-boost-target">${cfg.boost}</span>
      </div>
      <div class="lab-plans">${planBtns}</div>
      ${pendingNote}
    </div>`;
}

// ── Action handlers ────────────────────────────────────────────
function onUnlockAgent(state, cfg) {
  if (cfg.unlockRcu == null || state.rcu < cfg.unlockRcu) return;
  state.rcu -= cfg.unlockRcu;
  state.lab.agents[cfg.id].unlocked = true;
}

function onSetPlan(state, agentId, planId) {
  const agent = state.lab.agents[agentId];
  if (!agent.unlocked) return;
  // Clicking the current plan cancels any pending change
  agent.pendingTier = planId === agent.tier ? null : planId;
}

function onUpgradeModel(state, agentId) {
  const cost = CONSTANTS.Lab_Model_Upgrade_RCU;
  if (cost == null || state.rcu < cost) return;
  state.rcu -= cost;
  state.lab.agents[agentId].modelLevel++;
}

// ── Helpers ────────────────────────────────────────────────────
function calcDailyBurn(state) {
  return Object.values(state.lab.agents)
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + (LAB_PLANS[a.tier]?.dailyCost ?? 0), 0);
}

function fmtMoney(n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

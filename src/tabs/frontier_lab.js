// frontier_lab.js — Frontier Lab tab
// AI agent hub. Agents subscribe to a plan tier and have an infinitely upgradeable model version.
//
// Model versioning: vX.Y where Y ∈ 0–9.
//   Minor increments (Y < 9): RCU cost, scales per total increments purchased.
//   Major release (Y === 9 → (X+1).0): money cost, scales per major version.
//   Each minor increment adds Lab_Coder_RCU_Delta passive RCU/h to ai_coder.
//
// Plan changes: set pendingTier, applied at next day boundary by tick.js.
// Billing: daily plan costs deducted by tick.js → applyDailyLabBilling().

import {
  LAB_PLANS,
  CONSTANTS,
  calcModelMinorUpgradeCost,
  calcModelMajorUpgradeCost,
  calcCoderRcuPerHour,
  calcSupportRetentionBonus,
  calcMarketerMarketingBonus,
  calcMarketerRepPerDay,
} from '../engine/state.js';

// ── Plan display order ─────────────────────────────────────────
const PLAN_ORDER = ['free', 'hobbyist', 'growth', 'scale', 'infernal'];

// ── Agent display config ───────────────────────────────────────
// Agents are unlocked via the milestones tab (lab_burn track).
const AGENTS = [
  {
    id:      'ai_coder',
    label:   'ai_coder',
    desc:    'Writes code so you don\'t have to. Mostly correct.',
    boost:   'passive_rcu/h',
    showRcu: true, // display live passive_rcu/h on card
  },
  {
    id:      'ai_support',
    label:   'ai_support',
    desc:    'Handles tickets. Rarely gaslights customers.',
    boost:   'customer_retention',
    showRcu: false,
  },
  {
    id:      'ai_marketer',
    label:   'ai_marketer',
    desc:    'Posts everywhere simultaneously. Results may include virality. Or controversy.',
    boost:   'marketing_stream + reputation/d',
    showRcu: false,
  },
];

// ── Renderer ───────────────────────────────────────────────────
export function renderFrontierLab(state) {
  const panel = document.getElementById('panel-frontier_lab');

  if (!panel._built) {
    panel.innerHTML = `
      <div class="lab-header">
        <div class="lab-title">frontier_lab</div>
        <div class="lab-tagline">We align with your wallet.</div>
      </div>
      <div id="lab-gate"></div>
      <div id="lab-catalog"></div>
      <div class="lab-footer" id="lab-burn"></div>`;
    panel._built = true;
  }

  const active  = state.moneyLifetime >= CONSTANTS.Lab_Unlock_Money;
  const gate    = document.getElementById('lab-gate');
  const catalog = document.getElementById('lab-catalog');

  if (!active) {
    gate.innerHTML =
      `<div class="lab-locked">unlocked at ${fmtMoney(CONSTANTS.Lab_Unlock_Money)} earned</div>`;
    catalog.innerHTML = '';
    document.getElementById('lab-burn').textContent = '';
    return;
  }

  gate.innerHTML = '';

  catalog.innerHTML = AGENTS.map(cfg => {
    const agent = state.lab.agents[cfg.id];
    return agentCardHTML(cfg, agent, state);
  }).join('');

  // Wire buttons after innerHTML is set
  AGENTS.forEach(cfg => {
    const agent = state.lab.agents[cfg.id];

    if (agent.unlocked) {
      // Plan buttons
      PLAN_ORDER.forEach(planId => {
        const btn = document.getElementById(`lab-plan-${cfg.id}-${planId}`);
        if (btn) btn.addEventListener('click', () => {
          onSetPlan(state, cfg.id, planId);
          renderFrontierLab(state);
        });
      });
      // Model upgrade buttons
      const minorBtn = document.getElementById(`lab-minor-${cfg.id}`);
      if (minorBtn) minorBtn.addEventListener('click', () => {
        onMinorUpgrade(state, cfg.id);
        renderFrontierLab(state);
      });
      const majorBtn = document.getElementById(`lab-major-${cfg.id}`);
      if (majorBtn) majorBtn.addEventListener('click', () => {
        onMajorUpgrade(state, cfg.id);
        renderFrontierLab(state);
      });
    }
  });

  // Burn footer
  const burn = calcDailyBurn(state);
  document.getElementById('lab-burn').textContent =
    burn > 0 ? `daily_burn: $${burn}/d` : '';
}

// ── Card builders ──────────────────────────────────────────────
function agentCardHTML(cfg, agent, state) {
  return agent.unlocked ? activeCardHTML(cfg, agent, state) : lockedCardHTML(cfg, agent, state);
}

function lockedCardHTML(cfg, agent, state) {
  return `
    <div class="lab-card lab-card-locked">
      <div class="lab-card-top">
        <span class="lab-agent-name">${cfg.label}</span>
        <span class="lab-tag">locked</span>
      </div>
      <div class="lab-agent-desc">${cfg.desc}</div>
      <div class="lab-agent-boost">boost: ${cfg.boost}</div>
      <div class="lab-pending-note">unlock via lab_burn milestones</div>
    </div>`;
}

function activeCardHTML(cfg, agent, state) {
  const plan    = LAB_PLANS[agent.tier];
  const pending = agent.pendingTier;

  // ── Model upgrade section ──
  const versionLabel = `v${agent.modelMajor}.${agent.modelMinor}`;
  const atMajorGate  = agent.modelMinor === 9;

  let upgradeHTML;
  if (!atMajorGate) {
    // Minor increment: RCU cost
    const cost       = calcModelMinorUpgradeCost(agent);
    const canAfford  = state.rcu >= cost;
    const nextMinor  = `v${agent.modelMajor}.${agent.modelMinor + 1}`;
    upgradeHTML = `
      <button class="lab-btn" id="lab-minor-${cfg.id}" ${canAfford ? '' : 'disabled'}>
        [ ${versionLabel} → ${nextMinor} — ${cost} RCU ]
      </button>`;
  } else {
    // Major release: money cost
    const cost      = calcModelMajorUpgradeCost(agent);
    const canAfford = state.wallet >= cost;
    const nextMajor = `v${agent.modelMajor + 1}.0`;
    upgradeHTML = `
      <button class="lab-btn lab-btn-money" id="lab-major-${cfg.id}" ${canAfford ? '' : 'disabled'}>
        [ release ${nextMajor} — ${fmtMoney(cost)} ]
      </button>`;
  }

  // ── Plan selector ──
  const planBtns = PLAN_ORDER.map(planId => {
    const p         = LAB_PLANS[planId];
    const isCurrent = agent.tier === planId;
    const isPending = pending === planId && !isCurrent;
    const cls       = ['lab-plan-btn',
      isCurrent ? 'lab-plan-current' : '',
      isPending  ? 'lab-plan-pending' : '',
    ].filter(Boolean).join(' ');

    return `<button class="${cls}" id="lab-plan-${cfg.id}-${planId}">
      ${planId}<br><span class="lab-plan-sub">${p.dailyCost === 0 ? 'free' : `$${p.dailyCost}/d`} · ×${p.multiplier}</span>
    </button>`;
  }).join('');

  const pendingNote = pending && pending !== agent.tier
    ? `<div class="lab-pending-note">→ ${pending} takes effect tomorrow</div>`
    : '';

  // ── Passive output ──
  let boostLine;
  if (cfg.id === 'ai_coder') {
    const baseRcu   = calcCoderRcuPerHour(agent);
    const activeRcu = agent.tier === 'free' ? 0 : baseRcu * plan.multiplier;
    const status    = agent.tier === 'free' ? ' <span class="lab-tbd">(idle on free plan)</span>' : '';
    boostLine = `passive_rcu/h: <b class="teal">${fmtN(activeRcu)}</b>${status}`;
  } else if (cfg.id === 'ai_support') {
    const bonus = agent.tier === 'free' ? 0 : calcSupportRetentionBonusForAgent(agent);
    const status = agent.tier === 'free' ? ' <span class="lab-tbd">(idle on free plan)</span>' : '';
    boostLine = `retention_bonus: <b class="blue">+${bonus.toFixed(2)}</b>${status}`;
  } else if (cfg.id === 'ai_marketer') {
    const mkt = agent.tier === 'free' ? 0 : calcMarketerMarketingBonusForAgent(agent);
    const rep = agent.tier === 'free' ? 0 : calcMarketerRepPerDayForAgent(agent);
    const status = agent.tier === 'free' ? ' <span class="lab-tbd">(idle on free plan)</span>' : '';
    boostLine = `mkt_stream: <b class="amber">+${fmtN(mkt)}/d</b> · rep: <b>+${rep.toFixed(3)}/d</b>${status}`;
  } else {
    boostLine = `boost: ${cfg.boost}`;
  }

  return `
    <div class="lab-card">
      <div class="lab-card-top">
        <span class="lab-agent-name">${cfg.label}</span>
        <span class="lab-tag">${versionLabel}</span>
        ${upgradeHTML}
      </div>
      <div class="lab-agent-desc">${cfg.desc}</div>
      <div class="lab-agent-boost">${boostLine}</div>
      <div class="lab-plans">${planBtns}</div>
      ${pendingNote}
    </div>`;
}

// ── Action handlers ────────────────────────────────────────────
function onSetPlan(state, agentId, planId) {
  const agent = state.lab.agents[agentId];
  if (!agent.unlocked) return;
  agent.pendingTier = planId === agent.tier ? null : planId;
}

function onMinorUpgrade(state, agentId) {
  const agent = state.lab.agents[agentId];
  if (agent.modelMinor >= 9) return;  // use major upgrade instead
  const cost = calcModelMinorUpgradeCost(agent);
  if (state.rcu < cost) return;
  state.rcu -= cost;
  agent.modelMinor++;
}

function onMajorUpgrade(state, agentId) {
  const agent = state.lab.agents[agentId];
  if (agent.modelMinor !== 9) return;  // must be at v X.9
  const cost = calcModelMajorUpgradeCost(agent);
  if (state.wallet < cost) return;
  state.wallet -= cost;
  agent.modelMajor++;
  agent.modelMinor = 0;
}

// ── Helpers ────────────────────────────────────────────────────
function calcDailyBurn(state) {
  return Object.values(state.lab.agents)
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + (LAB_PLANS[a.tier]?.dailyCost ?? 0), 0);
}

// Per-agent bonus calculators (don't require full state — used for card display only)
function calcSupportRetentionBonusForAgent(agent) {
  const plan = LAB_PLANS[agent.tier];
  if (!plan || agent.tier === 'free') return 0;
  const n = (agent.modelMajor - 1) * 9 + agent.modelMinor;
  return (CONSTANTS.Lab_Support_Retention_Base + n * CONSTANTS.Lab_Support_Retention_Delta) * plan.multiplier;
}

function calcMarketerMarketingBonusForAgent(agent) {
  const plan = LAB_PLANS[agent.tier];
  if (!plan || agent.tier === 'free') return 0;
  const n = (agent.modelMajor - 1) * 9 + agent.modelMinor;
  return (CONSTANTS.Lab_Marketer_Marketing_Base + n * CONSTANTS.Lab_Marketer_Marketing_Delta) * plan.multiplier;
}

function calcMarketerRepPerDayForAgent(agent) {
  const plan = LAB_PLANS[agent.tier];
  if (!plan || agent.tier === 'free') return 0;
  return CONSTANTS.Lab_Marketer_Rep_Per_Day * plan.multiplier;
}

function fmtMoney(n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

function fmtN(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return (Math.round(n * 10) / 10).toFixed(1);  // one decimal for fractional RCU/h
}

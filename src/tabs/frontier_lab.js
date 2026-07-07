// frontier_lab.js — Frontier Lab tab
// AI agent hub. Agents subscribe to a plan tier and have an infinitely upgradeable model version.
//
// Model versioning: vX.Y where Y ∈ 0–9.
//   Minor increments (Y < 9): RCU cost, scales per total increments purchased.
//   Major release (Y === 9 → (X+1).0): money cost, scales per major version.
//
// Plan changes: set pendingTier, applied at next day boundary by tick.js.
// Billing: daily plan costs deducted by tick.js → applyDailyLabBilling().
//
// Agent catalog is derived from LAB.agents in state.js — add an entry there
// and a matching entry in BOOST_DISPLAY here; the rest flows automatically.

import {
  LAB,
  LAB_PLANS,
  MILESTONES,
  calcModelMinorUpgradeCost,
  calcModelMajorUpgradeCost,
  calcCoderRcuPerHour,
  calcProductManagerMultiplier,
  calcCeoReputationGain,
  calcAgentBoost,
} from '../engine/state.js';

// ── Plan display order + lab_spend gates ──────────────────────
const PLAN_ORDER = ['free', 'hobbyist', 'growth', 'scale', 'infernal'];
const PLAN_GATES = {
  free:     null,
  hobbyist: 'hobbyist_unlock',
  growth:   'growth_unlock',
  scale:    'scale_unlock',
  infernal: 'infernal_unlock',
};

// ── Per-agent boost display ────────────────────────────────────
// Keyed by boost_type from LAB.agents. Called as fn(agent, plan, state).
// Add a new entry here when adding a new agent type to LAB.agents.
const BOOST_DISPLAY = {
  coder_rcu: (agent, plan, state) => {
    const rcu = calcCoderRcuPerHour(agent) * plan.multiplier * calcProductManagerMultiplier(state);
    return `passive_rcu/h: <b class="rcu">${fmtN(rcu)}</b>`;
  },
  support_retention: (agent, _plan, state) => {
    const plan_ = LAB_PLANS[agent.tier] ?? LAB_PLANS.free;
    const bonus = calcAgentBoost(agent, LAB.agents.support) * plan_.multiplier * calcProductManagerMultiplier(state);
    return `retention_bonus: <b class="yellow">+${bonus.toFixed(2)}</b>`;
  },
  marketer_mkt: (agent, _plan, state) => {
    const plan_ = LAB_PLANS[agent.tier] ?? LAB_PLANS.free;
    const mkt   = calcAgentBoost(agent, LAB.agents.marketer) * plan_.multiplier * calcProductManagerMultiplier(state);
    return `mkt_stream: <b class="gold">+${fmtN(mkt)}/d</b>`;
  },
  pm_mult: (_agent, _plan, state) => {
    const mult = calcProductManagerMultiplier(state);
    return `all_agents: <b>×${mult.toFixed(2)}</b>`;
  },
  ceo_rep: (_agent, _plan, state) => {
    const rep = calcCeoReputationGain(state);
    return `reputation/d: <b class="gold">+${rep.toFixed(3)}</b>`;
  },
};

// ── Renderer ───────────────────────────────────────────────────
export function renderFrontierLab(state) {
  const panel  = document.getElementById('panel-frontier_lab');
  const agents = Object.values(LAB.agents);

  if (!panel._built) {
    panel.innerHTML = `
      <div class="lab-header">
        <div class="lab-title">frontier_lab</div>
        <div class="lab-tagline">We align with your wallet.</div>
        <div class="lab-tagline">Feel free to make open source contributions.</div>
      </div>
      <div id="lab-gate"></div>
      <div id="lab-catalog"></div>
      <div class="lab-footer" id="lab-burn"></div>`;
    panel._built = true;
  }

  const active  = !!state.milestones?.claimed?.lab_unlock;
  const gate    = document.getElementById('lab-gate');
  const catalog = document.getElementById('lab-catalog');

  if (!active) {
    gate.innerHTML =
      `<div class="lab-locked">claim the ${fmtN(MILESTONES.rcu_tiers.t1)} RCU milestone to unlock</div>`;
    catalog.innerHTML = '';
    document.getElementById('lab-burn').textContent = '';
    return;
  }

  gate.innerHTML = '';

  catalog.innerHTML = agents.map(cfg => {
    const agent = state.lab.agents[cfg.id];
    return agentCardHTML(cfg, agent, state);
  }).join('');

  // Pay-per-use section (visible only when values are set)
  const payPerUseEl = document.getElementById('lab-pay-per-use');
  if (LAB.pay_per_use.money_cost !== null && LAB.pay_per_use.rcu_granted !== null) {
    if (!payPerUseEl) {
      const el = document.createElement('div');
      el.id        = 'lab-pay-per-use';
      el.className = 'lab-pay-per-use';
      catalog.after(el);
    }
    const canAfford = state.wallet >= LAB.pay_per_use.money_cost;
    document.getElementById('lab-pay-per-use').innerHTML = `
      <div class="lab-pay-label">pay_per_use</div>
      <div class="lab-pay-desc">one-shot compute burst · no subscription needed</div>
      <button class="lab-btn" id="lab-ppu-btn" ${canAfford ? '' : 'disabled'}>
        [ buy ${fmtN(LAB.pay_per_use.rcu_granted)} RCU — ${fmtMoney(LAB.pay_per_use.money_cost)} ]
      </button>`;
    const ppuBtn = document.getElementById('lab-ppu-btn');
    if (ppuBtn && !ppuBtn.disabled) {
      ppuBtn.addEventListener('click', () => {
        onBuyCompute(state);
        renderFrontierLab(state);
      });
    }
  } else if (payPerUseEl) {
    payPerUseEl.remove();
  }

  // Wire buttons after innerHTML is set
  agents.forEach(cfg => {
    const agent = state.lab.agents[cfg.id];

    if (agent.unlocked) {
      PLAN_ORDER.forEach(planId => {
        const btn = document.getElementById(`lab-plan-${cfg.id}-${planId}`);
        if (btn) btn.addEventListener('click', () => {
          onSetPlan(state, cfg.id, planId);
          renderFrontierLab(state);
        });
      });
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

  const burn = calcDailyBurn(state);
  document.getElementById('lab-burn').textContent =
    burn > 0 ? `daily_burn: $${burn}/d` : '';
}

// ── Card builders ──────────────────────────────────────────────
function agentCardHTML(cfg, agent, state) {
  return agent.unlocked ? activeCardHTML(cfg, agent, state) : lockedCardHTML(cfg);
}

function lockedCardHTML(cfg) {
  return `
    <div class="lab-card lab-card-locked">
      <div class="lab-card-top">
        <span class="lab-agent-name">${cfg.label}</span>
        <span class="lab-tag">locked</span>
      </div>
      <div class="lab-agent-desc">${cfg.desc}</div>
      <div class="lab-agent-boost">boost: ${cfg.boost_label}</div>
      <div class="lab-pending-note">unlock via milestones</div>
    </div>`;
}

function activeCardHTML(cfg, agent, state) {
  const plan    = LAB_PLANS[agent.tier];
  const pending = agent.pendingTier;

  // ── Model upgrade section ──
  const vLabel       = lvl => `v${Math.floor(lvl / 10) + 1}.${lvl % 10}`;
  const versionLabel = vLabel(agent.modelLevel);
  const atMajorGate  = agent.modelLevel % 10 === 9;

  let upgradeHTML;
  if (!atMajorGate) {
    const cost      = calcModelMinorUpgradeCost(agent, cfg);
    const canAfford = state.rcu >= cost;
    upgradeHTML = `
      <button class="lab-btn" id="lab-minor-${cfg.id}" ${canAfford ? '' : 'disabled'}>
        [ ${versionLabel} → ${vLabel(agent.modelLevel + 1)} — ${cost} RCU ]
      </button>`;
  } else {
    const cost      = calcModelMajorUpgradeCost(agent, cfg);
    const canAfford = state.wallet >= cost;
    upgradeHTML = `
      <button class="lab-btn lab-btn-money" id="lab-major-${cfg.id}" ${canAfford ? '' : 'disabled'}>
        [ release ${vLabel(agent.modelLevel + 1)} — ${fmtMoney(cost)} ]
      </button>`;
  }

  // ── Plan selector ──
  const planBtns = PLAN_ORDER.map(planId => {
    const p          = LAB_PLANS[planId];
    const gateId     = PLAN_GATES[planId];
    const isUnlocked = !gateId || !!state.milestones?.claimed?.[gateId];
    const isCurrent  = agent.tier === planId;
    const isPending  = pending === planId && !isCurrent;

    if (!isUnlocked) {
      return `<button class="lab-plan-btn lab-plan-locked" disabled title="unlock: ${gateId}">
        ${planId}<br><span class="lab-plan-sub">🔒 ${gateId}</span>
      </button>`;
    }

    const cls = ['lab-plan-btn',
      isCurrent ? 'lab-plan-current' : '',
      isPending ? 'lab-plan-pending' : '',
    ].filter(Boolean).join(' ');

    return `<button class="${cls}" id="lab-plan-${cfg.id}-${planId}">
      ${planId}<br><span class="lab-plan-sub">${p.dailyCost === 0 ? 'free' : `$${p.dailyCost}/d`} · ×${p.multiplier}</span>
    </button>`;
  }).join('');

  const pendingNote = pending && pending !== agent.tier
    ? `<div class="lab-pending-note">→ ${pending} takes effect tomorrow</div>`
    : '';

  // ── Passive output ──
  const boostFn   = BOOST_DISPLAY[cfg.boost_type];
  const boostLine = boostFn ? boostFn(agent, plan, state) : `boost: ${cfg.boost_label}`;

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
  if (agent.modelLevel % 10 >= 9) return;
  const cfg  = Object.values(LAB.agents).find(a => a.id === agentId);
  const cost = calcModelMinorUpgradeCost(agent, cfg);
  if (state.rcu < cost) return;
  state.rcu -= cost;
  agent.modelLevel++;
}

function onBuyCompute(state) {
  const cost = LAB.pay_per_use.money_cost;
  const rcu  = LAB.pay_per_use.rcu_granted;
  if (cost === null || rcu === null) return;
  if (state.wallet < cost) return;
  state.wallet           -= cost;
  state.rcu              += rcu;
  state.rcuLifetime      += rcu;
  state.labSpendLifetime += cost;
}

function onMajorUpgrade(state, agentId) {
  const agent = state.lab.agents[agentId];
  if (agent.modelLevel % 10 !== 9) return;
  const cfg  = Object.values(LAB.agents).find(a => a.id === agentId);
  const cost = calcModelMajorUpgradeCost(agent, cfg);
  if (state.wallet < cost) return;
  state.wallet -= cost;
  agent.modelLevel++;
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

function fmtN(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return (Math.round(n * 10) / 10).toFixed(1);
}

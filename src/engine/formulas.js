// formulas.js — pure derived-value helpers.
// Everything here reads config (and optionally state) and returns a number
// or a plain object. No mutation, no DOM.

import { CONSTANTS, LAB, INVESTMENTS } from './config.js';

/**
 * Diminishing-returns curve: approaches `cap` as x grows, reaches cap/2 at
 * x = halfLife. Used for conversion/retention so raw stats can grow forever
 * while their effect stays bounded. Returns a number (format at the UI).
 */
export function softCap(x, cap, halfLife) {
  return (cap * x) / (x + halfLife);
}

/**
 * Geometric scaling helper: base × scale^level.
 * Used for upgrade costs and per-level gains.
 */
export function upgradeScale(base, scale, level) {
  return base * Math.pow(scale, level);
}

/**
 * RCU earned per write_code() click.
 * Formula: (1 + gearBonus + laptopBonus) × cpuMult × gpuMult
 * Gear and laptop add flat RCU; CPU/GPU are independent multipliers.
 */
export function calcRcuPerClick(state) {
  const hw = state.investments?.hardware ?? {};
  const { gear, laptop, cpu, gpu } = INVESTMENTS.rcu;

  const gearBonus   = Object.values(gear).slice(0, hw.gearLevel ?? 0).reduce((s, t) => s + t.boost, 0);
  const laptopBonus = Object.values(laptop).slice(0, hw.laptopLevel ?? 0).reduce((s, t) => s + t.boost, 0);
  const cpuMult     = 1 + (hw.cpuLevel ?? 0) * cpu.delta;
  const gpuMult     = 1 + (hw.gpuLevel ?? 0) * gpu.delta;

  return Math.floor((1 + gearBonus + laptopBonus) * cpuMult * gpuMult);
}

/**
 * Fresh subscription-tier runtime object from a SAAS.subscription_tiers entry.
 * The cohort ring buffer holds one slot per subscription day.
 */
export function makeTier(cfg) {
  return {
    price:          cfg.price,
    cohorts:        new Array(CONSTANTS.COHORT_DAYS).fill(0),
    conversionMult: cfg.conversionMult,
    retentionMult:  cfg.retentionMult,
  };
}

// ── Frontier Lab model helpers ─────────────────────────────────

/**
 * RCU cost for the next minor increment.
 * Formula: floor(minor_base_cost × minor_cost_scale^modelLevel)
 */
export function calcModelMinorUpgradeCost(agent, cfg) {
  return Math.floor(upgradeScale(cfg.minor_base_cost, cfg.minor_cost_scale, agent.modelLevel));
}

/**
 * Money cost for the major release (only available when level%10===9).
 * Formula: floor(major_base_cost × major_cost_scale^floor(modelLevel/10))
 */
export function calcModelMajorUpgradeCost(agent, cfg) {
  return Math.floor(
    upgradeScale(cfg.major_base_cost, cfg.major_cost_scale, Math.floor(agent.modelLevel / 10))
  );
}

/**
 * Total agent output boost.
 * Formula: base_delta × delta_scale^modelLevel × major_pow^floor(modelLevel/10)
 * Major releases (level%10===9 → level++) multiply the full output by major_pow.
 */
export function calcAgentBoost(agent, cfg) {
  return upgradeScale(cfg.base_delta, cfg.delta_scale, agent.modelLevel)
    * Math.pow(cfg.major_pow, Math.floor(agent.modelLevel / 10));
}

/** Plan multiplier for an agent's current tier (free plan is the floor). */
function planMultiplier(agent) {
  return (LAB.plans[agent.tier] ?? LAB.plans.free).multiplier;
}

/**
 * Base passive RCU/h for the coder agent before plan multiplier.
 * Multiply by plan.multiplier (and PM multiplier) at the call site.
 */
export function calcCoderRcuPerHour(agent) {
  return calcAgentBoost(agent, LAB.agents.ai_coder);
}

export function calcSupportRetentionBonus(state) {
  const agent = state.lab?.agents?.ai_support;
  if (!agent?.unlocked) return 0;
  return calcAgentBoost(agent, LAB.agents.ai_support) * planMultiplier(agent);
}

export function calcMarketerMarketingBonus(state) {
  const agent = state.lab?.agents?.ai_marketer;
  if (!agent?.unlocked) return 0;
  return calcAgentBoost(agent, LAB.agents.ai_marketer) * planMultiplier(agent);
}

export function calcProductManagerMultiplier(state) {
  const agent = state.lab?.agents?.ai_product_manager;
  if (!agent?.unlocked) return 1;
  return 1 + calcAgentBoost(agent, LAB.agents.ai_product_manager) * planMultiplier(agent);
}

export function calcCeoReputationGain(state) {
  const agent = state.lab?.agents?.ai_ceo;
  if (!agent?.unlocked) return 0;
  return calcAgentBoost(agent, LAB.agents.ai_ceo) * planMultiplier(agent);
}

/** Total daily plan cost across unlocked agents (0 until the lab is unlocked). */
export function calcDailyLabBurn(state) {
  if (!state.milestones?.claimed?.lab_unlock) return 0;
  return Object.values(state.lab.agents)
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + (LAB.plans[a.tier]?.dailyCost ?? 0), 0);
}

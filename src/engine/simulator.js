// simulator.js — headless strategy simulator (pure logic, no DOM)
// Runs a full game in one JS call; stores results to localStorage.

import { initState } from './state.js';
import { CONSTANTS, LAB, PLAN_ORDER, SAAS, INVESTMENTS, MILESTONES } from './config.js';
import {
  calcRcuPerClick, calcCoderRcuPerHour, calcProductManagerMultiplier,
  calcSupportRetentionBonus, calcMarketerMarketingBonus, calcCeoReputationGain,
  makeTier,
} from './formulas.js';
import { generateMissions } from './missions.js';
import { MILESTONE_TRACKS }  from './milestones.js';

const STORAGE_KEY = 'dev_sims';
const MAX_SIMS    = 10;

// ── Mappings ───────────────────────────────────────────────────────────────

const SF_MAP = {
  conversion: { cfgKey: 'conversion', stateKey: 'conversion',     upgradeKey: 'conversion' },
  retention:  { cfgKey: 'retention',  stateKey: 'retention',      upgradeKey: 'retention'  },
  marketing:  { cfgKey: 'marketing',  stateKey: 'marketingStream', upgradeKey: 'marketingStream' },
};

const HW_TIERS = {
  gear:   [30, 120, 350],
  laptop: [1_000, 10_000],
};

// ── Upgrade helpers ────────────────────────────────────────────────────────

function sfNextCost(state, track) {
  const m = SF_MAP[track];
  const level = state.upgrades[m.upgradeKey].length;
  const cfg = SAAS.ship_feature[m.cfgKey];
  return Math.floor(cfg.base_cost * Math.pow(cfg.cost_scale, level));
}

function sfBuy(state, track) {
  const m = SF_MAP[track];
  const cfg = SAAS.ship_feature[m.cfgKey];
  const level = state.upgrades[m.upgradeKey].length;
  const cost  = Math.floor(cfg.base_cost * Math.pow(cfg.cost_scale, level));
  const delta = cfg.base_delta * Math.pow(cfg.delta_scale, level);
  state.rcu -= cost;
  state.saas[m.stateKey] += delta;
  state.upgrades[m.upgradeKey].push(1);
}

function agentMinorNextCost(state, agentKey) {
  const agent = state.lab.agents[agentKey];
  const cfg   = LAB.agents[agentKey];
  return Math.floor(cfg.minor_base_cost * Math.pow(cfg.minor_cost_scale, agent.modelLevel));
}

function agentMinorBuy(state, agentKey) {
  const cost = agentMinorNextCost(state, agentKey);
  state.rcu -= cost;
  state.lab.agents[agentKey].modelLevel++;
}

function agentMajorCost(agentKey, modelLevel) {
  const cfg = LAB.agents[agentKey];
  return Math.floor(cfg.major_base_cost * Math.pow(cfg.major_cost_scale, Math.floor(modelLevel / 10)));
}

function hwNextCost(state, track) {
  const hw = state.investments.hardware;
  if (track === 'gear' || track === 'laptop') {
    const tiers = HW_TIERS[track];
    const level = hw[`${track}Level`];
    return level >= tiers.length ? Infinity : tiers[level];
  }
  const cfg   = INVESTMENTS.rcu[track];
  const level = hw[`${track}Level`];
  return Math.floor(cfg.base_cost * Math.pow(cfg.cost_scale, level));
}

function hwBuy(state, track) {
  const cost = hwNextCost(state, track);
  state.wallet -= cost;
  state.investments.hardware[`${track}Level`]++;
}

// ── Milestone auto-claim ───────────────────────────────────────────────────

function autoClaimMilestones(state) {
  for (const track of MILESTONE_TRACKS) {
    for (const step of track.steps) {
      if (state.milestones.claimed[step.id]) continue;
      if (step.threshold === null) continue;
      if (track.getValue(state) >= step.threshold) {
        state.milestones.claimed[step.id] = true;
        if (typeof step.onClaim === 'function') step.onClaim(state);
      }
    }
  }
}

// ── Lab plan management ────────────────────────────────────────────────────

function highestUnlockedPlan(state, targetPlan) {
  const targetIdx = PLAN_ORDER.indexOf(targetPlan);
  let best = 'free';
  for (let i = 0; i <= targetIdx; i++) {
    const plan = PLAN_ORDER[i];
    const gate = LAB.plans[plan].gate;
    if (!gate || state.milestones.claimed[gate]) best = plan;
  }
  return best;
}

function queueLabPlan(state, targetPlan) {
  const best = highestUnlockedPlan(state, targetPlan);
  for (const agent of Object.values(state.lab.agents)) {
    if (agent.unlocked && agent.tier !== best && agent.pendingTier !== best) {
      agent.pendingTier = best;
    }
  }
}

// ── Main simulation ────────────────────────────────────────────────────────

export function runSim(strategy) {
  const maxTicks = (strategy.maxDays ?? 365) * 24;
  const state    = initState();
  state._runStarted = true;
  state.freelance.missions = generateMissions('junior');

  const timeline = [];

  for (let tick = 0; tick < maxTicks; tick++) {

    // ── A. Player actions ──────────────────────────────────────

    // 1. Write code clicks → RCU
    if ((strategy.clicksPerTick ?? 3) > 0) {
      const gained = calcRcuPerClick(state) * strategy.clicksPerTick;
      state.rcu         += gained;
      state.rcuLifetime += gained;
    }

    // 2. Accept missions
    if (strategy.acceptMissions !== false) {
      for (const m of state.freelance.missions) {
        if (!m.accepted && state.rcu >= m.rcuCost) {
          state.rcu                        -= m.rcuCost;
          state.wallet                     += m.reward;
          state.moneyLifetime              += m.reward;
          m.accepted                        = true;
          state.freelance.missionsCompleted++;
        }
      }
    }

    // 3. Post on X
    if (strategy.alwaysPost !== false && state.reputation.postCooldownTicks === 0) {
      state.reputation.multiplier        += CONSTANTS.POST_REP_DELTA;
      state.reputation.postCooldownTicks  = CONSTANTS.POST_COOLDOWN;
      state.reputation.numberOfPosts++;
    }

    // 4. Auto-claim milestones
    autoClaimMilestones(state);

    // 5. Auto-init t1 tier (saas unlocked at freelance_t0 = 5 missions)
    if (state.saas.tiers.length === 0 &&
        state.freelance.missionsCompleted >= MILESTONES.freelance_tiers.t0) {
      const cfg = SAAS.subscription_tiers[0];
      state.saas.tiers = [{ price: cfg.price, cohorts: new Array(30).fill(0),
        conversionMult: cfg.conversionMult, retentionMult: cfg.retentionMult }];
    }
    // Auto-launch t2/t3 when milestone claimed (simulates player clicking button)
    if (state.milestones.claimed.price_t1 && state.saas.tiers.length < 2) {
      const cfg = SAAS.subscription_tiers[1];
      state.saas.tiers.push({ price: cfg.price, cohorts: new Array(30).fill(0),
        conversionMult: cfg.conversionMult, retentionMult: cfg.retentionMult });
    }
    if (state.milestones.claimed.price_t2 && state.saas.tiers.length < 3) {
      const cfg = SAAS.subscription_tiers[2];
      state.saas.tiers.push({ price: cfg.price, cohorts: new Array(30).fill(0),
        conversionMult: cfg.conversionMult, retentionMult: cfg.retentionMult });
    }

    // 6. Spend RCU on upgrades (in priority order)
    for (const track of (strategy.rcuPriority ?? ['conversion', 'retention', 'marketing', 'coder'])) {
      if (track === 'coder') {
        if (!state.milestones.claimed.lab_unlock) continue;
        const agent = state.lab.agents.ai_coder;
        let cost = agentMinorNextCost(state, 'ai_coder');
        while (cost <= state.rcu) {
          agentMinorBuy(state, 'ai_coder');
          cost = agentMinorNextCost(state, 'ai_coder');
        }
      } else {
        if (state.saas.tiers.length === 0) continue;
        let cost = sfNextCost(state, track);
        while (cost <= state.rcu) {
          sfBuy(state, track);
          cost = sfNextCost(state, track);
        }
      }
    }

    // 7. Spend money on hardware (in priority order)
    if (state.milestones.claimed.investment_unlock) {
      for (const track of (strategy.moneyPriority ?? ['cpu', 'gear', 'laptop', 'gpu'])) {
        let cost = hwNextCost(state, track);
        while (cost !== Infinity && cost <= state.wallet) {
          hwBuy(state, track);
          cost = hwNextCost(state, track);
        }
      }
    }

    // 8. Auto-buy agent major upgrades with money (when at boundary)
    if (state.milestones.claimed.lab_unlock) {
      for (const [agentKey, agent] of Object.entries(state.lab.agents)) {
        if (!agent.unlocked) continue;
        if (agent.modelLevel > 0 && agent.modelLevel % 10 === 9) {
          const cost = agentMajorCost(agentKey, agent.modelLevel);
          if (cost <= state.wallet) {
            state.wallet -= cost;
            agent.modelLevel++;
          }
        }
      }
    }

    // 9. Queue target lab plan
    if (state.milestones.claimed.lab_unlock) {
      queueLabPlan(state, strategy.targetPlan ?? 'growth');
    }

    // ── B. Passive engine ──────────────────────────────────────

    // 10. Passive coder RCU
    if (state.milestones.claimed.lab_unlock) {
      const agent  = state.lab.agents.ai_coder;
      const plan   = LAB.plans[agent.tier] ?? LAB.plans.free;
      const pmMult = calcProductManagerMultiplier(state);
      const rcuH   = calcCoderRcuPerHour(agent) * plan.multiplier * pmMult;
      state.rcu         += rcuH;
      state.rcuLifetime += rcuH;
    }

    // 11. Post cooldown
    if (state.reputation.postCooldownTicks > 0) state.reputation.postCooldownTicks--;

    // 12. Daily boundary (every 24 ticks)
    if (tick > 0 && tick % 24 === 0) {
      const pmMult = calcProductManagerMultiplier(state);

      // SaaS cohort: acquisition + monthly renewal per tier
      if (state.saas.tiers.length > 0) {
        const slotIdx       = Math.floor(tick / 24) % 30;
        const marketerBoost = calcMarketerMarketingBonus(state) * pmMult;
        const visitors      = (1 + state.saas.marketingStream + marketerBoost)
                              * state.reputation.multiplier;
        const supportBonus  = calcSupportRetentionBonus(state);

        for (const tier of state.saas.tiers) {
          const oldCohort    = tier.cohorts[slotIdx];
          const effRetention = (state.saas.retention + supportBonus * pmMult) * tier.retentionMult;
          const renewalProb  = effRetention > 0 ? Math.pow(1 - 0.02 / effRetention, 30) : 0;
          const renewed      = oldCohort * renewalProb;

          const effConv  = state.saas.conversion * tier.conversionMult;
          const convRate = effConv > 0 ? effConv / (effConv + 2) : 0;
          const gained   = visitors * convRate;

          const revenue = (renewed + gained) * tier.price;
          state.wallet        += revenue;
          state.moneyLifetime += revenue;

          tier.cohorts[slotIdx] = renewed + gained;
        }

        state.saas.customers = state.saas.tiers.reduce(
          (total, t) => total + t.cohorts.reduce((a, b) => a + b, 0), 0);
        state.saas.mrr = state.saas.tiers.reduce(
          (s, t) => s + t.price * t.cohorts.reduce((a, b) => a + b, 0), 0);
        state.saas.mrrPeak = Math.max(state.saas.mrrPeak ?? 0, state.saas.mrr);
      }

      // Lab billing
      if (state.milestones.claimed.lab_unlock) {
        for (const agent of Object.values(state.lab.agents)) {
          if (agent.unlocked && agent.pendingTier) {
            agent.tier = agent.pendingTier;
            agent.pendingTier = null;
          }
        }
        const totalCost = Object.values(state.lab.agents)
          .filter(a => a.unlocked)
          .reduce((s, a) => s + (LAB.plans[a.tier]?.dailyCost ?? 0), 0);
        state.wallet           -= totalCost;
        state.labSpendLifetime += totalCost;
      }

      // CEO reputation
      const ceoGain = calcCeoReputationGain(state);
      if (ceoGain > 0) state.reputation.multiplier += ceoGain;

      // Refresh missions
      state.freelance.missions = generateMissions(state.freelance.tier);

      // Sample timeline (every day)
      const coderAgent = state.lab.agents.ai_coder;
      const coderPlan  = LAB.plans[coderAgent.tier] ?? LAB.plans.free;
      const rcuH = state.milestones.claimed.lab_unlock
        ? calcCoderRcuPerHour(coderAgent) * coderPlan.multiplier * calcProductManagerMultiplier(state)
        : 0;
      timeline.push({
        day:           tick / 24,
        mrr:           Math.max(0, state.saas.mrr),
        customers:     Math.floor(Math.max(0, state.saas.customers)),
        wallet:        Math.max(0, state.wallet),
        moneyLifetime: state.moneyLifetime,
        rcuH,
      });
    }

    // 13. Win check
    if (state.moneyLifetime >= CONSTANTS.WIN_CONDITION) {
      return buildResult(strategy, Math.floor(tick / 24), state.winTick ?? tick, timeline);
    }
  }

  return buildResult(strategy, null, null, timeline);
}

function buildResult(strategy, winDay, winTick, timeline) {
  return {
    id:       Date.now(),
    name:     strategy.name ?? 'unnamed',
    strategy,
    winDay,
    winTick,
    timeline,
    runAt:    Date.now(),
  };
}

// ── Persistence ────────────────────────────────────────────────────────────

export function saveSim(result) {
  const sims = loadSims();
  sims.push(result);
  if (sims.length > MAX_SIMS) sims.splice(0, sims.length - MAX_SIMS);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sims)); } catch (_) {}
}

export function loadSims() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch (_) { return []; }
}

export function deleteSim(id) {
  const sims = loadSims().filter(s => s.id !== id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sims)); } catch (_) {}
}

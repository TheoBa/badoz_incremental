// state.js — canonical game state
// All game values live here. Nothing else stores state.

// ── Balancing constants ────────────────────────────────────────
export const CONSTANTS = {
  TICK_RATE: 1,             // real seconds per in-game hour

  // ── Freelance mission generation ──────────────────────────────
  // Mean RCU cost per tier (μ in normal distribution)
  Freelance_RCU_Cost_T1: 8,    // junior
  Freelance_RCU_Cost_T2: 25,   // senior
  Freelance_RCU_Cost_T3: 90,   // lead
  Freelance_RCU_Cost_T4: 220,  // 10x

  // Std dev as a fraction of the mean (0.3 → ±30% spread)
  Freelance_RCU_StdDev: 0.3,

  // Money reward = rcuCost × multiplier (higher tiers pay more per RCU)
  Freelance_Money_Mult_T1: 5,
  Freelance_Money_Mult_T2: 5,
  Freelance_Money_Mult_T3: 6,
  Freelance_Money_Mult_T4: 8,

  // ── Milestone thresholds (not yet tuned) ─────────────────────
  Freelance_RCU_T1: null,  // RCU milestone → Senior tier
  Freelance_RCU_T2: null,  // RCU milestone → Lead tier
  Freelance_RCU_T3: null,  // RCU milestone → 10x tier

  Lab_Money_T1: null,       // cumulative Lab spend → AI Support
  Lab_Money_T2: null,       // → AI Marketer
  Lab_Money_T3: null,       // → Product Hunt (Investment tab)
  Lab_Money_T4: null,       // → Growth Hacker agent
  Lab_Money_T5: null,       // → Enterprise tier
  Lab_Money_T6: null,       // → PR Bot agent
  Lab_Money_T7: null,       // → Product Manager agent
  Lab_Money_T8: null,       // → Growth loops
  Lab_Money_T9: null,       // → AI CEO mode

  // Subscription price tiers (auto-set on saas_product tab discovery; one-way raises)
  Saas_Price_T1: 1,         // initial price, set on first tab visit
  Saas_Price_T2: 10,        // unlocks at Price_Round_T1 milestone
  Saas_Price_T3: 100,       // unlocks at Price_Round_T2 milestone

  Price_Round_T1: null,     // lifetime earned milestone → raise to T2
  Price_Round_T2: null,     // lifetime earned milestone → raise to T3

  // ── Ship feature upgrade curves ───────────────────────────────
  // Base RCU cost of the first upgrade in each track
  Ship_Satisfaction_Base_Cost: 10,
  Ship_Retention_Base_Cost:    10,
  Ship_Marketing_Base_Cost:    15,
  // Each subsequent upgrade costs baseCost × Scale^level
  Ship_Cost_Scale: 2,
  // Stat gain per upgrade purchased
  Ship_Satisfaction_Delta: 0.1,   // added to satisfaction multiplier
  Ship_Retention_Delta:    0.1,   // added to retention multiplier
  Ship_Marketing_Delta:    1,     // additional visitors/day

  // ── Investment costs & effects ────────────────────────────────
  Invest_ColdOutreach_Cost:    50,   // money
  Invest_ColdOutreach_Boost:    5,   // marketing_stream +5 for 1 day (24 ticks)

  Invest_SEO_Cost:            200,   // money
  Invest_SEO_Boost:             2,   // marketing_stream +2 for 7 days (168 ticks)

  Invest_Newsletter_Cost:       100,   // money
  Invest_Newsletter_Rep:       0.01,  // reputation.multiplier +0.01 (instant, permanent)
  Invest_Newsletter_Cooldown:    24,  // ticks before can buy again (1 day)

  Invest_ProductHunt_Cost:  10_000,  // money (once per run)
  Invest_ProductHunt_Rep:      1.0,  // reputation.multiplier +1.0 (instant)

  Invest_Press_Cost:           300,  // money per use
  Invest_Press_Rep:           0.15,  // reputation.multiplier +0.15 (instant)
  Invest_Press_Uses:             3,  // max uses per run
  Invest_Press_Cooldown:       168,  // ticks before can buy again (7 days)

  // ── Hardware upgrades (rcu/click) ────────────────────────────
  // Gear tiers — sequential additive bonus (buy T1 before T2 before T3)
  Hardware_Gear_T1_Cost:   30,  Hardware_Gear_T1_RCU: 1,  // mechanical keyboard
  Hardware_Gear_T2_Cost:  120,  Hardware_Gear_T2_RCU: 2,  // dual-monitor setup
  Hardware_Gear_T3_Cost:  350,  Hardware_Gear_T3_RCU: 3,  // ergonomic workstation

  // Laptop tiers — sequential additive bonus
  Hardware_Laptop_T1_Cost:  800, Hardware_Laptop_T1_RCU: 4,  // MacBook Pro
  Hardware_Laptop_T2_Cost: 2500, Hardware_Laptop_T2_RCU: 10, // Mac Studio

  // CPU & GPU — infinite repeatable upgrades, scale like ship_feature
  // Formula: rcu/click = (1 + gearBonus + laptopBonus) × cpuMult × gpuMult
  //   cpuMult = 1 + cpuLevel × Hardware_CPU_Delta
  //   gpuMult = 1 + gpuLevel × Hardware_GPU_Delta
  Hardware_CPU_Base_Cost: 1500, Hardware_CPU_Scale: 2,   Hardware_CPU_Delta: 0.5,
  Hardware_GPU_Base_Cost: 1000, Hardware_GPU_Scale: 1.8,  Hardware_GPU_Delta: 0.3,

  // ── post_on_x ─────────────────────────────────────────────────
  PostOnX_Rep_Delta: 0.01,   // reputation.multiplier += delta per post
  PostOnX_Cooldown:    24,   // ticks before can post again (1 in-game day)

  // ── Frontier Lab ───────────────────────────────────────────────
  Lab_Unlock_Money: 100,           // moneyLifetime threshold before tab becomes active

  // Agent unlock costs (RCU). null = not yet tuned.
  Lab_Support_Unlock_RCU:  null,
  Lab_Marketer_Unlock_RCU: null,

  // Model version — minor increments (vX.0 → vX.1 → … → vX.9) cost RCU
  // Formula: floor(Minor_RCU_Base × Minor_Scale^totalMinorIncrements)
  Lab_Model_Minor_RCU_Base: 20,   // base RCU cost for first minor increment
  Lab_Model_Minor_Scale:    1.3,  // exponential scale per total minor increment

  // Model version — major release (vX.9 → v(X+1).0) costs money
  // Formula: floor(Major_Money_Base × Major_Money_Scale^(modelMajor - 1))
  Lab_Model_Major_Money_Base:  500,  // money cost for first major release (v1.9 → v2.0)
  Lab_Model_Major_Money_Scale: 2.5,  // exponential scale per subsequent major release

  // AI Coder passive RCU/h
  // Formula: Coder_RCU_Base + totalMinorIncrements × Coder_RCU_Delta
  // Then multiplied by the active plan multiplier (free plan = idle, no output)
  Lab_Coder_RCU_Base:  1,  // RCU/h at v1.0 with plan mult 1×
  Lab_Coder_RCU_Delta: 1,  // additional RCU/h per minor increment

  WIN_CONDITION: 1_000_000_000,
};

// ── Frontier Lab plan definitions ──────────────────────────────
// plan_multiplier is the base boost multiplier at this plan tier.
// effective_boost = plan_multiplier × agent.modelLevel
export const LAB_PLANS = {
  free:     { dailyCost: 0,   multiplier: 1,   label: 'free'     },
  hobbyist: { dailyCost: 5,   multiplier: 1.5, label: 'hobbyist' },
  growth:   { dailyCost: 25,  multiplier: 4,   label: 'growth'   },
  scale:    { dailyCost: 100, multiplier: 12,  label: 'scale'    },
  infernal: { dailyCost: 500, multiplier: 40,  label: 'infernal' },
};

// ── Derived helpers ────────────────────────────────────────────

/**
 * RCU earned per write_code() click.
 * Formula: (1 + gearBonus + laptopBonus) × cpuMult × gpuMult
 * Gear and laptop add flat RCU; CPU/GPU are independent multipliers.
 */
export function calcRcuPerClick(state) {
  const hw = state.investments?.hardware ?? {};
  const gearTierRCU   = [CONSTANTS.Hardware_Gear_T1_RCU,   CONSTANTS.Hardware_Gear_T2_RCU,   CONSTANTS.Hardware_Gear_T3_RCU];
  const laptopTierRCU = [CONSTANTS.Hardware_Laptop_T1_RCU, CONSTANTS.Hardware_Laptop_T2_RCU];

  const gearBonus   = gearTierRCU.slice(0, hw.gearLevel ?? 0).reduce((s, v) => s + v, 0);
  const laptopBonus = laptopTierRCU.slice(0, hw.laptopLevel ?? 0).reduce((s, v) => s + v, 0);
  const cpuMult     = 1 + (hw.cpuLevel ?? 0) * CONSTANTS.Hardware_CPU_Delta;
  const gpuMult     = 1 + (hw.gpuLevel ?? 0) * CONSTANTS.Hardware_GPU_Delta;

  return Math.floor((1 + gearBonus + laptopBonus) * cpuMult * gpuMult);
}

// ── Frontier Lab model helpers ─────────────────────────────────

/**
 * Total minor increments purchased across all major versions.
 * v1.0 = 0, v1.5 = 5, v2.0 = 9, v2.3 = 12, v3.0 = 18, …
 * Major releases consume 9 minor slots each (x.0 → x.9, then money bump).
 */
export function calcModelTotalMinorIncrements(agent) {
  return (agent.modelMajor - 1) * 9 + agent.modelMinor;
}

/**
 * RCU cost for the next minor increment on this agent.
 * Formula: floor(Minor_RCU_Base × Minor_Scale^totalMinorIncrements)
 */
export function calcModelMinorUpgradeCost(agent) {
  const n = calcModelTotalMinorIncrements(agent);
  return Math.floor(CONSTANTS.Lab_Model_Minor_RCU_Base * Math.pow(CONSTANTS.Lab_Model_Minor_Scale, n));
}

/**
 * Money cost for the next major version release (only at minor === 9).
 * Formula: floor(Major_Money_Base × Major_Money_Scale^(modelMajor - 1))
 */
export function calcModelMajorUpgradeCost(agent) {
  return Math.floor(
    CONSTANTS.Lab_Model_Major_Money_Base * Math.pow(CONSTANTS.Lab_Model_Major_Money_Scale, agent.modelMajor - 1)
  );
}

/**
 * Base passive RCU/h for this agent before plan multiplier.
 * Formula: Coder_RCU_Base + totalMinorIncrements × Coder_RCU_Delta
 * Multiply by plan.multiplier in tick/render (free plan = idle = 0 output).
 */
export function calcCoderRcuPerHour(agent) {
  const n = calcModelTotalMinorIncrements(agent);
  return CONSTANTS.Lab_Coder_RCU_Base + n * CONSTANTS.Lab_Coder_RCU_Delta;
}

// ── Initial state factory ──────────────────────────────────────
export function initState() {
  return {
    // Meta
    runCount: 0,
    productName: null,

    // Time
    ticksElapsed: 0,

    // Resources
    rcu: 0,
    rcuLifetime: 0,
    wallet: 0,
    moneyLifetime: 0,
    labSpendLifetime: 0,

    // SaaS product
    saas: {
      mrr: 0,
      customers: 0,
      satisfaction: 1.0,
      retention: 1.0,
      marketingStream: 0,
      price: 0,
      priceRound: 0,
    },

    // Freelance
    freelance: {
      tier: 'junior',       // junior | senior | lead | tenmx
      missions: [],
      rushUnlocked: false,
    },

    // Frontier Lab
    lab: {
      agents: {
        ai_coder:    { unlocked: true,  tier: 'free', pendingTier: null, modelMajor: 1, modelMinor: 0 },
        ai_support:  { unlocked: false, tier: 'free', pendingTier: null, modelMajor: 1, modelMinor: 0 },
        ai_marketer: { unlocked: false, tier: 'free', pendingTier: null, modelMajor: 1, modelMinor: 0 },
      },
    },

    // Reputation (post_on_x)
    reputation: {
      multiplier: 1.0,
      postCooldownTicks: 0,
      numberOfPosts: 0,
    },

    // Upgrades (ship_feature)
    upgrades: {
      satisfaction: [],
      retention: [],
      marketingStream: [],
    },

    // Investment
    investments: {
      // Timed boosts: [{id, label, ticksRemaining, marketingBoost}]
      // marketingStream is NOT mutated — acquisition reads active boosts separately
      active: [],
      productHuntUsed: false,
      pressUsesRemaining: null,    // set to Invest_Press_Uses on first run (handled in main.js)
      pressCooldownTicks: 0,       // ticks until press_coverage can be bought again
      newsletterCooldownTicks: 0,  // ticks until sponsored_newsletter can be bought again
      // Hardware upgrades (rcu/click progression)
      hardware: {
        gearLevel:    0,      // 0–3 gear tiers purchased
        laptopLevel:  0,      // 0–2 laptop tiers purchased
        cpuLevel: 0,   // infinite upgrades; cpuMult = 1 + cpuLevel × Hardware_CPU_Delta
        gpuLevel: 0,   // infinite upgrades; gpuMult = 1 + gpuLevel × Hardware_GPU_Delta
      },
    },

    // KPI histogram snapshots — last 7 in-game days, oldest first
    history: {
      earned: [0, 0, 0, 0, 0, 0, 0],
      rcu:    [0, 0, 0, 0, 0, 0, 0],
      mrr:    [0, 0, 0, 0, 0, 0, 0],
      burn:   [0, 0, 0, 0, 0, 0, 0],
    },

    // Analytics events queued for backend
    _pendingEvents: [],
  };
}

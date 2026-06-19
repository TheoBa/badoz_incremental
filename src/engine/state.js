// state.js — canonical game state
// All game values live here. Nothing else stores state.

// Bumped when the run payload shape changes; stored with every submitted run.
export const CLIENT_VERSION = '0.1.1';

// ── Balancing constants ────────────────────────────────────────
export const MILESTONES = {
  money_tiers: {       // lifetime earned
    t1: 100,           // → investment tab unlocked
    t2: 500_000,       // → raise to $100/mo
    t3: 10_000_000,    // → raise to $1000/mo
  },
  freelance_tiers: { // freelance missions completed
    t1: 21,          // → Senior tier
    t2: 100,         // → Lead tier
    t3: 500,         // → 10x tier
  },
  rcu_tiers: {         // lifetime RCU
    t1: 1_000,         // → frontier_lab tab unlocked
    t2: 10_000,        // → ai_support unlocked
    t3: 100_000,       // → ai_product_manager unlocked
  },
  lab_spend_tiers: {    // lifetime Lab spend (burn) (TODO: include a pay per use plan)
    t1: 100,            // → unlock hobbyist plan
    t2: 1_000,          // → unlock growth plan
    t3: 10_000,         // → unlock scale plan
    t4: 50_000,         // → unlock infernal plan
    t5: 100_000,        // → unlock PR Bot agent
  },
  mrr_peak_tiers: {
    t1: 100,          // MRR peak → seo_push + press_coverage investment unlock
    t2: 10_000,       // → launch_product_hunt investment unlock
    t3: 100_000,      // → ai_marketer unlocked
    t4: 10_000_000,   // → ai_ceo unlocked
  }
}
export const CONSTANTS = {
  TICK_RATE: 1,             // real seconds per in-game hour

  // ── Freelance mission generation ──────────────────────────────
  // Mean RCU cost per tier (μ in normal distribution)
  Freelance_RCU_Cost_T1: 10,    // junior
  Freelance_RCU_Cost_T2: 50,   // senior
  Freelance_RCU_Cost_T3: 250,   // lead
  Freelance_RCU_Cost_T4: 1250,  // 10x

  // Std dev as a fraction of the mean (0.3 → ±30% spread)
  Freelance_RCU_StdDev: 0.5,

  // Money reward = rcuCost × multiplier (higher tiers pay more per RCU)
  Freelance_Money_Mult_T1: 5,
  Freelance_Money_Mult_T2: 6,
  Freelance_Money_Mult_T3: 8,
  Freelance_Money_Mult_T4: 10,

  // Subscription price tiers (auto-set on saas_product tab discovery; one-way raises)
  Saas_Price_T1: 10,           // initial price, set on first tab visit
  Saas_Price_T2: 100,          // unlocks at MILESTONES.money_tiers.t2 milestone
  Saas_Price_T3: 1000,         // unlocks at MILESTONES.money_tiers.t3 milestone

  // ── Frontier Lab pay-per-use ──────────────────────────────────
  // One-shot compute purchase available on the free plan.
  // Deducts money, grants RCU, increments labSpendLifetime.
  // Leave null until balancing pass sets deliberate values.
  Lab_PayPerUse_Cost: null,   // money cost per session
  Lab_PayPerUse_RCU:  null,   // RCU granted per session

  // ── Ship feature upgrade curves ───────────────────────────────
  // Base RCU cost of the first upgrade in each track
  Ship_Conversion_Base_Cost: 10,
  Ship_Retention_Base_Cost:    10,
  Ship_Marketing_Base_Cost:    15,
  // Each subsequent upgrade costs baseCost × Scale^level
  Ship_Cost_Scale: 1.3,
  // Stat gain per upgrade purchased
  Ship_Conversion_Delta: 0.1,   // added to conversion multiplier
  Ship_Retention_Delta:    0.1,   // added to retention multiplier
  Ship_Marketing_Delta:    5,     // additional visitors/day
  Ship_Delta_Scale: 1.15,         // bonus grows 15% per level

  // ── Investment costs & effects ────────────────────────────────
  Invest_ColdOutreach_Cost:    100,   // money
  Invest_ColdOutreach_Boost:    50,   // marketing_stream +50 for 1 day (24 ticks)

  Invest_SEO_Cost:            1000,   // money
  Invest_SEO_Boost:             50,   // marketing_stream +50 for 7 days (168 ticks)

  Invest_Newsletter_Cost:       250,  // money
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
  Hardware_Laptop_T1_Cost:  1000, Hardware_Laptop_T1_RCU: 10,  // MacBook Pro
  Hardware_Laptop_T2_Cost: 10_000, Hardware_Laptop_T2_RCU: 100, // Mac Studio

  // CPU & GPU — infinite repeatable upgrades, scale like ship_feature
  // Formula: rcu/click = (1 + gearBonus + laptopBonus) × cpuMult × gpuMult
  //   cpuMult = 1 + cpuLevel × Hardware_CPU_Delta
  //   gpuMult = 1 + gpuLevel × Hardware_GPU_Delta
  Hardware_CPU_Base_Cost: 1500, Hardware_CPU_Scale: 1.3,   Hardware_CPU_Delta: 0.4,
  Hardware_GPU_Base_Cost: 1000, Hardware_GPU_Scale: 1.5,  Hardware_GPU_Delta: 0.5,

  // ── post_on_x ─────────────────────────────────────────────────
  PostOnX_Rep_Delta: 0.01,   // reputation.multiplier += delta per post
  PostOnX_Cooldown:    24,   // ticks before can post again (1 in-game day)

  // ── Price shock (applied when player manually raises price) ───
  Saas_Price_Shock_Conversion: 1.5,  // flat decrease to conversion
  Saas_Price_Shock_Retention:    1.5,  // flat decrease to retention

  // ── Frontier Lab ───────────────────────────────────────────────
  // Model version — minor increments (vX.0 → vX.1 → … → vX.9) cost RCU
  // Formula: floor(agentMinorRcuBase × Minor_Scale^totalMinorIncrements)
  // Each agent has its own base cost — later-unlocking agents start more expensive.
  Lab_Coder_Minor_RCU_Base:    20,   // ai_coder — available from run start
  Lab_Support_Minor_RCU_Base:  100,  // ai_support — unlocks at MILESTONES.rcu_tiers.t2
  Lab_Marketer_Minor_RCU_Base: 500,  // ai_marketer — unlocks at MILESTONES.mrr_peak_tiers.t3
  Lab_Model_Minor_Scale:       1.3,  // exponential scale per total minor increment

  // Model version — major release (vX.9 → v(X+1).0) costs money
  // Formula: floor(Major_Money_Base × Major_Money_Scale^(modelMajor - 1))
  Lab_Model_Major_Money_Base:  10000,  // money cost for first major release (v1.9 → v2.0)
  Lab_Model_Major_Money_Scale: 2.5,  // exponential scale per subsequent major release

  // AI Coder passive RCU/h
  // Formula: Coder_RCU_Base + totalMinorIncrements × Coder_RCU_Delta
  // Then multiplied by the active plan multiplier (free plan = idle, no output)
  Lab_Coder_RCU_Base:  1,  // RCU/h at v1.0 with plan mult 1×
  Lab_Coder_RCU_Delta: 1,  // additional RCU/h per minor increment

  // AI Support: flat retention bonus (added to effective retention in churn calc)
  // Formula: (Retention_Base + totalMinorIncrements × Retention_Delta) × plan.multiplier
  Lab_Support_Retention_Base:  0.2,   // retention bonus at v1.0 on any paid plan
  Lab_Support_Retention_Delta: 0.05,  // additional per minor increment

  // AI Marketer: marketing visitors/d
  // Marketing formula: (Marketing_Base + totalMinorIncrements × Marketing_Delta) × plan.multiplier
  Lab_Marketer_Marketing_Base:  2,     // visitors/d at v1.0 on hobbyist
  Lab_Marketer_Marketing_Delta: 1,     // additional visitors/d per minor increment

  WIN_CONDITION: 1_000_000_000,

  // ── Analytics sampling ─────────────────────────────────────────
  // How often (in ticks) the run-series sampler records a cumulative snapshot.
  // 24 = once per in-game day. ~600 samples for a ~4h run (~20 KB payload).
  Sample_Every_Ticks: 24,
};

// ── Frontier Lab plan definitions ──────────────────────────────
// plan_multiplier is the base boost multiplier at this plan tier.
// effective_boost = plan_multiplier × agent.modelLevel
export const LAB_PLANS = {
  free:     { dailyCost: 5,   multiplier: 1,   label: 'free'     },
  hobbyist: { dailyCost: 10,   multiplier: 1.5, label: 'hobbyist' },
  growth:   { dailyCost: 50,  multiplier: 4,   label: 'growth'   },
  scale:    { dailyCost: 200, multiplier: 12,  label: 'scale'    },
  infernal: { dailyCost: 1000, multiplier: 40,  label: 'infernal' },
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
 * Formula: floor(minorRcuBase × Minor_Scale^totalMinorIncrements)
 * minorRcuBase differs per agent (Lab_Coder/Support/Marketer_Minor_RCU_Base).
 */
export function calcModelMinorUpgradeCost(agent, minorRcuBase) {
  const n = calcModelTotalMinorIncrements(agent);
  return Math.floor(minorRcuBase * Math.pow(CONSTANTS.Lab_Model_Minor_Scale, n));
}

/**
 * Per-minor-increment output bonus with major-version doubling.
 * The effective delta per minor doubles with each major: delta × 2^(major-1).
 * Completed major versions contribute their full 9 increments at that era's delta.
 * Formula: base + 9×delta×(2^(major-1) − 1) + minor×delta×2^(major-1)
 */
export function calcAgentTieredBonus(agent, base, delta) {
  const majorMult  = Math.pow(2, agent.modelMajor - 1);
  const prevMajors = 9 * delta * (majorMult - 1);
  return base + prevMajors + agent.modelMinor * delta * majorMult;
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
 * Multiply by plan.multiplier in tick/render. Free plan (mult 1) gives the baseline floor.
 */
export function calcCoderRcuPerHour(agent) {
  return calcAgentTieredBonus(agent, CONSTANTS.Lab_Coder_RCU_Base, CONSTANTS.Lab_Coder_RCU_Delta);
}

// ── AI Support helper ──────────────────────────────────────────
/**
 * Flat retention bonus contributed by ai_support agent.
 * Free plan uses multiplier 1 (baseline). Returns 0 only if not unlocked.
 */
export function calcSupportRetentionBonus(state) {
  const agent = state.lab?.agents?.ai_support;
  if (!agent?.unlocked) return 0;
  const plan = LAB_PLANS[agent.tier] ?? LAB_PLANS.free;
  return calcAgentTieredBonus(agent, CONSTANTS.Lab_Support_Retention_Base, CONSTANTS.Lab_Support_Retention_Delta) * plan.multiplier;
}

// ── AI Marketer helpers ────────────────────────────────────────
/**
 * Extra marketing visitors/day contributed by ai_marketer agent.
 * Free plan uses multiplier 1 (baseline). Returns 0 only if not unlocked.
 */
export function calcMarketerMarketingBonus(state) {
  const agent = state.lab?.agents?.ai_marketer;
  if (!agent?.unlocked) return 0;
  const plan = LAB_PLANS[agent.tier] ?? LAB_PLANS.free;
  return calcAgentTieredBonus(agent, CONSTANTS.Lab_Marketer_Marketing_Base, CONSTANTS.Lab_Marketer_Marketing_Delta) * plan.multiplier;
}

// ── Initial state factory ──────────────────────────────────────
export function initState() {
  return {
    // Meta
    runCount: 0,
    productName: null,
    devModeUsed: false,   // true if dev tools touched this run; excluded from board

    // Run lifecycle
    runStartedAt: Date.now(),  // real epoch ms when this run began
    runEndedAt:   null,        // real epoch ms when the win fired
    won:          false,       // true once WIN_CONDITION is reached
    winTick:      null,        // ticksElapsed at the moment of the win

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
      mrrPeak: 0,       // highest MRR ever reached this run (used for milestones)
      customers: 0,
      conversion: 0,
      retention: 0,
      marketingStream: 0,
      price: 0,
      priceRound: 0,
    },

    // Freelance
    freelance: {
      tier: 'junior',             // junior | senior | lead | tenmx
      missions: [],
      rushUnlocked: false,
      missionsCompleted: 0,       // increments on accept (rush counts as 2)
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
      conversion: [],
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
      prev: { earned: 0, rcu: 0, mrr: 0, burn: 0 },
      earned: [0, 0, 0, 0, 0, 0, 0],
      rcu:    [0, 0, 0, 0, 0, 0, 0],
      mrr:    [0, 0, 0, 0, 0, 0, 0],
      burn:   [0, 0, 0, 0, 0, 0, 0],
    },

    // Milestones — player-claimed rewards
    milestones: {
      claimed: {},  // { [stepId]: true } for every claimed step
    },

    // Post-game analytics — cumulative time series, sampled every
    // Sample_Every_Ticks. Seeded with a t=0 origin point so charts start clean.
    // Submitted whole at run completion (see plan/v0-release.md).
    series: {
      sampleEveryTicks: CONSTANTS.Sample_Every_Ticks,
      t:       [0],
      money:   [0],
      rcu:     [0],
      labBurn: [0],
    },

    // Timeline event markers overlaid on the analytics charts.
    // v0: only manual raise_price events { tick, type, from, to }.
    events: [],

    // RCU/h sliding window — last 10 ticks (1 tick = 1 in-game hour)
    // Each entry = total RCU gained that tick (passive + clicks).
    // Display: average of the array = effective RCU/h over recent play.
    rcuHistory:   new Array(10).fill(0),
    _rcuThisTick: 0,

    // Analytics events queued for backend
    _pendingEvents: [],
  };
}

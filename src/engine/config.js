// config.js — every balancing constant in the game, and nothing else.
// All mechanics derive from the values in this file. Data only: no state,
// no DOM, no formulas (those live in formulas.js).
//
// `null` constants are not yet tuned — leave them null until a balancing
// pass sets them deliberately.

// Bumped when the run payload shape changes; stored with every submitted run.
export const CLIENT_VERSION = '0.1.1';

export const CONSTANTS = {
  TICK_RATE: 1,             // real seconds per in-game hour
  TICKS_PER_DAY:  24,       // 1 tick = 1 in-game hour
  TICKS_PER_WEEK: 168,      // 7 days — weekly summary cadence

  WIN_CONDITION: 1_000_000_000,   // lifetime earnings for the $1B exit

  // ── post_on_x ─────────────────────────────────────────────────
  POST_REP_DELTA: 0.01,     // reputation.multiplier += delta per post
  POST_COOLDOWN:  24,       // ticks before can post again (1 in-game day)

  // ── SaaS economy ──────────────────────────────────────────────
  COHORT_DAYS:    30,       // subscription length; cohort ring-buffer size
  CHURN_BASE:     0.02,     // renewalProb = (1 - CHURN_BASE / retention)^COHORT_DAYS
  CONV_HALF_LIFE: 2,        // softCap half-life for conversion
  RET_HALF_LIFE:  5,        // softCap half-life for retention

  // ── Display / persistence cadence ─────────────────────────────
  RCU_WINDOW_TICKS:     10, // sliding window for the RCU/h display
  AUTOSAVE_EVERY_TICKS: 60,

  // ── Analytics sampling ─────────────────────────────────────────
  // How often (in ticks) the run-series sampler records a cumulative snapshot.
  // 24 = once per in-game day. ~600 samples for a ~4h run (~20 KB payload).
  SAMPLE_EVERY_TICKS: 24,
};

export const MILESTONES = {
  money_tiers: {       // lifetime earned
    t1: 100,           // → investment tab unlocked
    t2: 500_000,       // → raise to $100/mo
    t3: 10_000_000,    // → raise to $1000/mo
  },
  freelance_tiers: { // freelance missions completed
    t0: 5,           // → saas_product tab unlocked
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
};

export const FREELANCE = {
  rcu_cost: {
    junior: 10,
    senior: 50,
    lead:   250,
    tenmx:  1250,   // "10x" tier
  },
  rcu_to_money_mult: { // money = rcuCost × multiplier
    junior: 5,
    senior: 6,
    lead:   8,
    tenmx:  10,
  },
  rcu_stdev: 0.5
};

export const SAAS = {
  subscription_tiers: [
    { price: 10,   conversionMult: 1.0,  retentionMult: 1.0 },  // t1: base
    { price: 100,  conversionMult: 0.01, retentionMult: 0.01 },  // t2: launch via button
    { price: 1000, conversionMult: 0.001, retentionMult: 0.001 },  // t3: launch via button
  ],
  ship_feature: {
    conversion: {
      base_cost: 10,
      cost_scale: 1.3,
      base_delta: 0.1,
      delta_scale: 1.15,
    },
    retention: {
      base_cost: 10,
      cost_scale: 1.3,
      base_delta: 0.1,
      delta_scale: 1.15,
    },
    marketing: {
      base_cost: 15,
      cost_scale: 1.3,
      base_delta: 5,
      delta_scale: 1.15
    },
  }
};

export const LAB = {
  // The single source of truth for lab plans. `gate` is the milestone step id
  // that unlocks the plan (null = always available).
  plans: {
    free:     { dailyCost: 5,    multiplier: 1,   label: 'free',     gate: null },
    hobbyist: { dailyCost: 10,   multiplier: 1.5, label: 'hobbyist', gate: 'hobbyist_unlock' },
    growth:   { dailyCost: 50,   multiplier: 4,   label: 'growth',   gate: 'growth_unlock' },
    scale:    { dailyCost: 200,  multiplier: 12,  label: 'scale',    gate: 'scale_unlock' },
    infernal: { dailyCost: 1000, multiplier: 40,  label: 'infernal', gate: 'infernal_unlock' },
  },
  // Keyed by agent id — the same key used in state.lab.agents.
  agents: {
    ai_coder: {
      id:               'ai_coder',
      label:            'ai_coder',
      desc:             'Writes code so you don\'t have to. Mostly correct.',
      boost_label:      'passive_rcu/h',
      boost_type:       'coder_rcu',
      starts_unlocked:  true,
      minor_base_cost:  20,
      minor_cost_scale: 1.3,
      base_delta:       1,
      delta_scale:      1.11,
      major_base_cost:  800,
      major_cost_scale: 2.5,
      major_pow:        4,
    },
    ai_support: {
      id:               'ai_support',
      label:            'ai_support',
      desc:             'Handles tickets. Rarely gaslights customers.',
      boost_label:      'customer_retention',
      boost_type:       'support_retention',
      minor_base_cost:  300,
      minor_cost_scale: 1.3,
      base_delta:       1,
      delta_scale:      1.1,
      major_base_cost:  4_000,
      major_cost_scale: 2.5,
      major_pow:        2,
    },
    ai_marketer: {
      id:               'ai_marketer',
      label:            'ai_marketer',
      desc:             'Posts everywhere simultaneously. Results may include virality. Or controversy.',
      boost_label:      'marketing_stream + reputation/d',
      boost_type:       'marketer_mkt',
      minor_base_cost:  1_500,
      minor_cost_scale: 1.3,
      base_delta:       5,
      delta_scale:      1.15,
      major_base_cost:  20_000,
      major_cost_scale: 2.5,
      major_pow:        3,
    },
    ai_product_manager: {
      id:               'ai_product_manager',
      label:            'ai_product_manager',
      desc:             'Syncs all agents into a single coherent vision. Occasionally.',
      boost_label:      'all_agent_output ×mult',
      boost_type:       'pm_mult',
      minor_base_cost:  5_000,
      minor_cost_scale: 1.4,
      base_delta:       0.3,
      delta_scale:      1.1,
      major_base_cost:  100_000,
      major_cost_scale: 2.5,
      major_pow:        2,
    },
    ai_ceo: {
      id:               'ai_ceo',
      label:            'ai_ceo',
      desc:             'Sets the vision. Attends the offsites. Ships the deck.',
      boost_label:      'reputation/d',
      boost_type:       'ceo_rep',
      minor_base_cost:  100_000,
      minor_cost_scale: 1.3,
      base_delta:       0.005,
      delta_scale:      1.1,
      major_base_cost:  500_000,
      major_cost_scale: 2.5,
      major_pow:        4,
    },
  },
  pay_per_use: {
    money_cost: null,   // money cost per session
    rcu_granted: null,  // RCU granted per session
  }
};

// Plan display / upgrade order (cheapest first).
export const PLAN_ORDER = Object.keys(LAB.plans);

export const INVESTMENTS = {
  marketing: {
    cold_outreach_campaign: {
      id:             'cold_outreach',
      label:          'cold_outreach_campaign',
      desc:           'blast 500 cold emails · temporary visitor spike',
      cost:           100,
      boost:          50,
      campaign_active: 24,
    },
    seo_push: {
      id:             'seo_push',
      label:          'seo_push',
      desc:           'optimise meta tags, schema, backlinks · slow burn',
      cost:           1000,
      boost:          50,
      campaign_active: 168,
      gate:           'mrr_t1',
    },
  },
  reputation: {
    newsletter: {
      id:       'newsletter',
      label:    'sponsored_newsletter',
      desc:     'featured in a niche indie-hacker newsletter · instant rep',
      cost:     250,
      boost:    0.01,
      cooldown: 24,
    },
    press_coverage: {
      id:       'press',
      label:    'press_coverage',
      desc:     'a journalist actually replied · large rep spike',
      cost:     300,
      boost:    0.15,
      cooldown: 168,
      max_uses: 3,
      gate:     'mrr_t1',
    },
    product_hunt: {
      id:       'product_hunt',
      label:    'launch_on_product_hunt',
      desc:     '#1 product of the day · massive one-time event',
      cost:     10_000,
      boost:    1.0,
      max_uses: 1,
      gate:     'mrr_t2',
    },
  },
  rcu: {
    gear: {
      t1: { id: 'gear_t1',   label: 'mechanical_keyboard',   desc: 'tactile feedback, 10% faster typing — or so you tell yourself', cost: 30,    boost: 1   },
      t2: { id: 'gear_t2',   label: 'dual_monitor_setup',    desc: 'one screen for code, one for docs you never read',              cost: 120,   boost: 2   },
      t3: { id: 'gear_t3',   label: 'ergonomic_workstation', desc: 'standing desk, Herman Miller, the works',                      cost: 350,   boost: 3   },
    },
    laptop: {
      t1: { id: 'laptop_t1', label: 'macbook_pro_upgrade',   desc: 'M-series chip, finally compiles in under a minute',            cost: 1_000,  boost: 10  },
      t2: { id: 'laptop_t2', label: 'mac_studio',            desc: 'desktop-class silicon · no thermal throttling ever',           cost: 10_000, boost: 100 },
    },
    cpu: { id: 'cpu_upgrade', label: 'cpu_upgrade', desc: 'faster compilation pipeline · repeatable · cost scales each level',              base_cost: 1500, cost_scale: 1.3, delta: 0.4 },
    gpu: { id: 'gpu_rig',    label: 'gpu_rig',     desc: 'parallel shader cores for... local model inference, obviously · repeatable',      base_cost: 1000, cost_scale: 1.5, delta: 0.5 },
  },
};

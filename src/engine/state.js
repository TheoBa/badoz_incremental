// state.js — canonical game state shape.
// All game values live in the object returned by initState(). Nothing else
// stores state. Balancing constants live in config.js; derived-value helpers
// in formulas.js.

import { CONSTANTS, LAB, INVESTMENTS } from './config.js';

export function initState() {
  return {
    // Meta
    runCount: 0,
    productName: null,
    _runStarted: false,          // true once the start screen is submitted (gates the tick)
    _leaderboardUnlocked: false, // latches true on first win; preserved across newRun()
    tabsDiscovered: {},          // { [tabName]: true } — which tabs have shown their lore
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
      customers: 0,     // derived: sum of all tier cohorts — kept for compat
      conversion: 0,
      retention: 0,
      marketingStream: 0,
      tiers: [],        // populated on first saas_product tab visit
    },

    // Freelance
    freelance: {
      tier: 'junior',             // junior | senior | lead | tenmx
      missions: [],
      rushUnlocked: false,
      missionsCompleted: 0,       // increments on accept (rush counts as 2)
    },

    // Frontier Lab — agent runtime state derived from LAB.agents config
    lab: {
      agents: Object.fromEntries(
        Object.values(LAB.agents).map(cfg => [
          cfg.id,
          { unlocked: cfg.starts_unlocked ?? false, tier: 'free', pendingTier: null, modelLevel: 0 },
        ])
      ),
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
      // Cooldown ticks keyed by item id — decremented each tick
      cooldowns: {},
      // Remaining uses keyed by item id — auto-populated from INVESTMENTS.max_uses
      uses: Object.fromEntries(
        Object.values(INVESTMENTS.reputation)
          .filter(item => item.max_uses != null)
          .map(item => [item.id, item.max_uses])
      ),
      // Hardware upgrades (rcu/click progression)
      hardware: {
        gearLevel:   0,   // 0–3 gear tiers purchased
        laptopLevel: 0,   // 0–2 laptop tiers purchased
        cpuLevel:    0,   // infinite upgrades; see INVESTMENTS.rcu.cpu
        gpuLevel:    0,   // infinite upgrades; see INVESTMENTS.rcu.gpu
      },
    },

    // KPI histogram snapshots — last 7 in-game days, oldest first
    history: {
      prev: { earned: 0, rcu: 0, mrr: 0, burn: 0, customers: 0 },
      earned:    [0, 0, 0, 0, 0, 0, 0],
      rcu:       [0, 0, 0, 0, 0, 0, 0],
      mrr:       [0, 0, 0, 0, 0, 0, 0],
      burn:      [0, 0, 0, 0, 0, 0, 0],
      customers: [0, 0, 0, 0, 0, 0, 0],  // daily net customer delta (acquired − churned)
      wallet:    [0, 0, 0, 0, 0, 0, 0],  // daily wallet balance snapshot (absolute)
    },

    // Milestones — player-claimed rewards
    milestones: {
      claimed: {},  // { [stepId]: true } for every claimed step
    },

    // Post-game analytics — cumulative time series, sampled every
    // SAMPLE_EVERY_TICKS. Seeded with a t=0 origin point so charts start clean.
    // Submitted whole at run completion (see plan/v0-release.md).
    series: {
      sampleEveryTicks: CONSTANTS.SAMPLE_EVERY_TICKS,
      t:       [0],
      money:   [0],
      rcu:     [0],
      labBurn: [0],
    },

    // Timeline event markers overlaid on the analytics charts.
    // launch_subscription events: { tick, type, price }
    events: [],

    // RCU/h sliding window — last RCU_WINDOW_TICKS ticks (1 tick = 1 in-game hour)
    // Each entry = total RCU gained that tick (passive + clicks).
    // Display: average of the array = effective RCU/h over recent play.
    rcuHistory:   new Array(CONSTANTS.RCU_WINDOW_TICKS).fill(0),
    _rcuThisTick: 0,

    // Weekly summary — fired every TICKS_PER_WEEK ticks (7 in-game days)
    weekStats: {
      investSpent:     0,   // accumulator: money spent on investments this week
      missionsAtStart: 0,   // missionsCompleted snapshot at start of current week
      lastWeek: { missionsDone: 0, investSpent: 0 },  // frozen display values for popup
    },
    _weeklyPopupPending: false,
  };
}

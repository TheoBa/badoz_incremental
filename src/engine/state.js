// state.js — canonical game state
// All game values live here. Nothing else stores state.

// ── Balancing constants ────────────────────────────────────────
export const CONSTANTS = {
  TICK_RATE: 1,             // real seconds per in-game hour

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

  Price_Round_T1: null,     // lifetime earned milestone → first price raise
  Price_Round_T2: null,     // → second price raise

  WIN_CONDITION: 1_000_000_000,
};

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
        ai_coder:    { unlocked: true,  tier: 'free', modelLevel: 1 },
        ai_support:  { unlocked: false, tier: 'free', modelLevel: 1 },
        ai_marketer: { unlocked: false, tier: 'free', modelLevel: 1 },
      },
    },

    // Reputation (post_on_x)
    reputation: {
      multiplier: 1.0,
      postCooldownTicks: 0,
      postsThisRun: 0,
    },

    // Upgrades (ship_feature)
    upgrades: {
      satisfaction: [],
      retention: [],
      marketingStream: [],
    },

    // Investment
    investments: [],

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

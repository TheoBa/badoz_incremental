// state.js — canonical game state
// All game values live here. Nothing else stores state.

// ─── Balancing constants ───────────────────────────────────────────────────
export const CONSTANTS = {
  TICK_RATE: 1,              // real seconds per in-game hour

  Freelance_RCU_T1: null,   // RCU milestone → Senior tier
  Freelance_RCU_T2: null,   // RCU milestone → Lead tier
  Freelance_RCU_T3: null,   // RCU milestone → 10x tier

  Lab_Money_T1: null,        // cumulative Lab spend → AI Support
  Lab_Money_T2: null,        // → AI Marketer
  Lab_Money_T3: null,        // → Product Hunt (Investment tab)
  Lab_Money_T4: null,        // → Growth Hacker agent
  Lab_Money_T5: null,        // → Enterprise tier
  Lab_Money_T6: null,        // → PR Bot agent
  Lab_Money_T7: null,        // → Product Manager agent
  Lab_Money_T8: null,        // → Growth loops
  Lab_Money_T9: null,        // → AI CEO mode

  Price_Round_T1: null,      // lifetime earned milestone → first price raise
  Price_Round_T2: null,      // → second price raise

  WIN_CONDITION: 1_000_000_000, // $1B net worth
};

// ─── Initial state factory ─────────────────────────────────────────────────
export function initState() {
  return {
    // Meta
    runCount: 0,
    productName: null,        // set at run start

    // Time
    ticksElapsed: 0,          // in-game hours elapsed

    // Resources
    rcu: 0,
    rcuLifetime: 0,
    wallet: 0,
    moneyLifetime: 0,         // lifetime money earned
    labSpendLifetime: 0,      // cumulative Frontier Lab spend

    // SaaS product
    saas: {
      mrr: 0,
      customers: 0,
      satisfaction: 1.0,
      retention: 1.0,
      marketingStream: 0,     // new visitors / in-game day
      price: 0,               // monthly subscription price
      priceRound: 0,          // 0 = base, 1 = after T1, 2 = after T2
    },

    // Freelance
    freelance: {
      tier: 'junior',         // junior | senior | lead | tenmx
      missions: [],           // generated each in-game day
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
      postCooldownTicks: 0,   // ticks remaining until next post available
      postsThisRun: 0,
    },

    // Upgrades (ship_feature)
    upgrades: {
      satisfaction: [],
      retention: [],
      marketingStream: [],
    },

    // Investment
    investments: [],          // { id, activatedAt }

    // Analytics events (sent to backend)
    _pendingEvents: [],
  };
}

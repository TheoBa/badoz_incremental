// milestones.js — milestone track definitions + status helpers
// Three tracks: money_earned, rcu_gained, lab_burn.
// Each step has a threshold and an optional onClaim() mutator.
// Status is derived on-the-fly — nothing is stored except state.milestones.claimed[id].

import { CONSTANTS } from './state.js';

// ── Local formatters (no render.js import — avoids circular deps) ──
function fmtMoney(n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

function fmtRcu(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M RCU';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K RCU';
  return Math.floor(n) + ' RCU';
}

// ── Milestone track definitions ────────────────────────────────
// step fields:
//   id            — unique key used in state.milestones.claimed
//   threshold     — value at which this step becomes claimable (null = not yet set)
//   effect        — human-readable reward string (null = always show ???)
//   onClaim       — function(state) → mutates state; null = not yet implemented
//   autoClaim     — if true, status derived from isAutoClaimed() instead of claimed map
//   isAutoClaimed — function(state) → bool, only when autoClaim: true
//   hideThreshold — if true, show ??? for the threshold in locked rows

export const MILESTONE_TRACKS = [
  // ── money_earned ───────────────────────────────────────────
  {
    id:       'money_earned',
    label:    'money_earned',
    getValue: (state) => state.moneyLifetime,
    fmtValue: fmtMoney,
    barColor: '#1D9E75',
    steps: [
      {
        id:           'lab_unlock',
        threshold:    CONSTANTS.Lab_Unlock_Money,
        effect:       'frontier_lab unlocked',
        autoClaim:    true,
        isAutoClaimed: (state) => state.moneyLifetime >= CONSTANTS.Lab_Unlock_Money,
        onClaim:      null,
      },
      {
        id:        'price_t1',
        threshold: CONSTANTS.Price_Round_T1,
        effect:    `price_round → $${CONSTANTS.Saas_Price_T2}/mo`,
        onClaim:   (state) => {
          if (state.saas.priceRound < 1) {
            state.saas.price      = CONSTANTS.Saas_Price_T2;
            state.saas.priceRound = 1;
          }
        },
      },
      {
        id:        'price_t2',
        threshold: CONSTANTS.Price_Round_T2,
        effect:    `price_round → $${CONSTANTS.Saas_Price_T3}/mo`,
        onClaim:   (state) => {
          if (state.saas.priceRound < 2) {
            state.saas.price      = CONSTANTS.Saas_Price_T3;
            state.saas.priceRound = 2;
          }
        },
      },
    ],
  },

  // ── rcu_gained ─────────────────────────────────────────────
  {
    id:       'rcu_gained',
    label:    'rcu_gained',
    getValue: (state) => state.rcuLifetime,
    fmtValue: fmtRcu,
    barColor: '#888',
    steps: [
      {
        id:        'freelance_t1',
        threshold: CONSTANTS.Freelance_RCU_T1,
        effect:    'freelance: senior',
        onClaim:   (state) => { state.freelance.tier = 'senior'; },
      },
      {
        id:        'freelance_t2',
        threshold: CONSTANTS.Freelance_RCU_T2,
        effect:    'freelance: lead',
        onClaim:   (state) => { state.freelance.tier = 'lead'; },
      },
      {
        id:        'freelance_t3',
        threshold: CONSTANTS.Freelance_RCU_T3,
        effect:    'freelance: 10x',
        onClaim:   (state) => { state.freelance.tier = 'tenmx'; },
      },
    ],
  },

  // ── lab_burn ───────────────────────────────────────────────
  {
    id:       'lab_burn',
    label:    'lab_burn',
    getValue: (state) => state.labSpendLifetime,
    fmtValue: fmtMoney,
    barColor: '#c94040',
    steps: [
      {
        id:        'lab_m1',
        threshold: CONSTANTS.Lab_Money_T1,
        effect:    'ai_support unlocked',
        onClaim:   (state) => { state.lab.agents.ai_support.unlocked = true; },
      },
      {
        id:        'lab_m2',
        threshold: CONSTANTS.Lab_Money_T2,
        effect:    'ai_marketer unlocked',
        onClaim:   (state) => { state.lab.agents.ai_marketer.unlocked = true; },
      },
      {
        id:        'lab_m3',
        threshold: CONSTANTS.Lab_Money_T3,
        effect:    null,    // TBD — teaser
        onClaim:   null,
      },
      {
        id:             'lab_m4',
        threshold:      CONSTANTS.Lab_Money_T4,
        hideThreshold:  true,
        effect:         null,
        onClaim:        null,
      },
      {
        id:             'lab_m5',
        threshold:      CONSTANTS.Lab_Money_T5,
        hideThreshold:  true,
        effect:         null,
        onClaim:        null,
      },
    ],
  },
];

// ── Status helper ──────────────────────────────────────────────
// Returns 'claimed' | 'claimable' | 'locked'
export function getStepStatus(track, step, state) {
  if (step.autoClaim) {
    return step.isAutoClaimed(state) ? 'claimed' : 'locked';
  }
  if (state.milestones?.claimed?.[step.id]) return 'claimed';
  if (step.threshold === null) return 'locked';
  if (track.getValue(state) >= step.threshold) return 'claimable';
  return 'locked';
}

// ── Progress target ────────────────────────────────────────────
// Returns the first step the player should be working toward:
//   • any claimable step (ready to claim — highest priority)
//   • or first locked step with a real, non-hidden threshold
// Returns null if all steps are claimed or only null/hidden thresholds remain.
export function getProgressTarget(track, state) {
  const claimable = track.steps.find(s => getStepStatus(track, s, state) === 'claimable');
  if (claimable) return claimable;
  return track.steps.find(s =>
    getStepStatus(track, s, state) === 'locked' &&
    s.threshold !== null &&
    !s.hideThreshold &&
    !s.autoClaim
  ) ?? null;
}

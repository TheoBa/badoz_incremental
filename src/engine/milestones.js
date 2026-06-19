// milestones.js — milestone track definitions + status helpers
// Five tracks: money_earned, freelance_missions, rcu_gained, lab_spend, mrr_peak.
// Each step has a threshold and an optional onClaim() mutator.
// Status is derived on-the-fly — nothing is stored except state.milestones.claimed[id].

import { MILESTONES, CONSTANTS } from './state.js';

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

function fmtMissions(n) {
  return Math.floor(n) + ' missions';
}

// ── Milestone track definitions ────────────────────────────────
// step fields:
//   id            — unique key used in state.milestones.claimed
//   threshold     — value at which this step becomes claimable (null = not yet set)
//   effect        — human-readable reward string (null = always show ???)
//   onClaim       — function(state) → mutates state; null = not yet implemented
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
        id:        'investment_unlock',
        threshold: MILESTONES.money_tiers.t1,
        effect:    'investment tab unlocked',
        onClaim:   () => {},
      },
      {
        id:        'price_t1',
        threshold: MILESTONES.money_tiers.t2,
        effect:    `raise_price → $${CONSTANTS.Saas_Price_T2}/mo unlocked`,
        onClaim:   () => {},  // raise_price is a manual button in saas_product tab
      },
      {
        id:        'price_t2',
        threshold: MILESTONES.money_tiers.t3,
        effect:    `raise_price → $${CONSTANTS.Saas_Price_T3}/mo unlocked`,
        onClaim:   () => {},  // raise_price is a manual button in saas_product tab
      },
    ],
  },

  // ── freelance_missions ─────────────────────────────────────
  // Tracks missions completed (rush counts as 2). Drives tier upgrades.
  {
    id:       'freelance_missions',
    label:    'freelance_missions',
    getValue: (state) => state.freelance?.missionsCompleted ?? 0,
    fmtValue: fmtMissions,
    barColor: '#888',
    steps: [
      {
        id:        'freelance_t1',
        threshold: MILESTONES.freelance_tiers.t1,
        effect:    'freelance: senior + rush_mode unlocked',
        onClaim:   (state) => {
          state.freelance.tier         = 'senior';
          state.freelance.rushUnlocked = true;
        },
      },
      {
        id:        'freelance_t2',
        threshold: MILESTONES.freelance_tiers.t2,
        effect:    'freelance: lead',
        onClaim:   (state) => { state.freelance.tier = 'lead'; },
      },
      {
        id:        'freelance_t3',
        threshold: MILESTONES.freelance_tiers.t3,
        effect:    'freelance: 10x',
        onClaim:   (state) => { state.freelance.tier = 'tenmx'; },
      },
    ],
  },

  // ── rcu_gained ─────────────────────────────────────────────
  // Drives lab unlock and ai_support unlock.
  {
    id:       'rcu_gained',
    label:    'rcu_gained',
    getValue: (state) => state.rcuLifetime,
    fmtValue: fmtRcu,
    barColor: '#888',
    steps: [
      {
        id:        'lab_unlock',
        threshold: MILESTONES.rcu_tiers.t1,
        effect:    'frontier_lab unlocked',
        onClaim:   () => {},
      },
      {
        id:        'ai_support_unlock',
        threshold: MILESTONES.rcu_tiers.t2,
        effect:    'ai_support unlocked',
        onClaim:   (state) => { state.lab.agents.ai_support.unlocked = true; },
      },
      {
        id:            'ai_product_manager',
        threshold:     MILESTONES.rcu_tiers.t3,
        hideThreshold: true,
        effect:        null,    // TBD — teaser
        onClaim:       null,
      },
    ],
  },

  // ── lab_spend ─────────────────────────────────────────────
  // Drives lab plan unlocks. Free plan ($5/d) naturally accumulates labSpendLifetime.
  {
    id:       'lab_spend',
    label:    'lab_spend',
    getValue: (state) => state.labSpendLifetime,
    fmtValue: fmtMoney,
    barColor: '#c94040',
    steps: [
      {
        id:        'hobbyist_unlock',
        threshold: MILESTONES.lab_spend_tiers.t1,
        effect:    'hobbyist plan unlocked',
        onClaim:   () => {},
      },
      {
        id:        'growth_unlock',
        threshold: MILESTONES.lab_spend_tiers.t2,
        effect:    'growth plan unlocked',
        onClaim:   () => {},
      },
      {
        id:        'scale_unlock',
        threshold: MILESTONES.lab_spend_tiers.t3,
        effect:    'scale plan unlocked',
        onClaim:   () => {},
      },
      {
        id:        'infernal_unlock',
        threshold: MILESTONES.lab_spend_tiers.t4,
        effect:    'infernal plan unlocked',
        onClaim:   () => {},
      },
      {
        id:            'pr_bot',
        threshold:     MILESTONES.lab_spend_tiers.t5,
        hideThreshold: true,
        effect:        null,    // TBD — teaser
        onClaim:       null,
      },
    ],
  },

  // ── mrr_peak ───────────────────────────────────────────────
  // getValue uses mrrPeak so churn can't un-qualify a milestone.
  {
    id:       'mrr_peak',
    label:    'mrr_peak',
    getValue: (state) => state.saas.mrrPeak ?? state.saas.mrr,
    fmtValue: fmtMoney,
    barColor: '#378ADD',
    steps: [
      {
        id:        'mrr_t1',
        threshold: MILESTONES.mrr_peak_tiers.t1,
        effect:    'seo_push + press_coverage unlocked',
        onClaim:   () => {},
      },
      {
        id:        'mrr_t2',
        threshold: MILESTONES.mrr_peak_tiers.t2,
        effect:    'launch_on_product_hunt unlocked',
        onClaim:   () => {},
      },
      {
        id:        'ai_marketer_unlock',
        threshold: MILESTONES.mrr_peak_tiers.t3,
        effect:    'ai_marketer unlocked',
        onClaim:   (state) => { state.lab.agents.ai_marketer.unlocked = true; },
      },
      {
        id:            'ai_ceo',
        threshold:     MILESTONES.mrr_peak_tiers.t4,
        hideThreshold: true,
        effect:        null,    // TBD — teaser
        onClaim:       null,
      },
    ],
  },
];

// ── Status helper ──────────────────────────────────────────────
// Returns 'claimed' | 'claimable' | 'locked'
export function getStepStatus(track, step, state) {
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
    !s.hideThreshold
  ) ?? null;
}

// missions.js — mission pool definitions and generation
<<<<<<< HEAD
// Costs are generated per-mission using CONSTANTS as the mean, so tuning
// Freelance_RCU_Cost_Tx / Freelance_RCU_StdDev in state.js controls all tiers.

import { CONSTANTS } from './state.js';

// ── Name pools (one per tier) ──────────────────────────────────
const POOLS = {
  junior: [
    'fix_wordpress_plugin_bug',
    'debug_css_alignment_issue',
    'write_sql_queries_for_client',
    'add_google_analytics',
    'update_npm_dependencies',
    'fix_404_on_client_site',
    'deploy_static_site_to_netlify',
    'write_bash_backup_script',
    'set_up_github_actions_workflow',
    'write_unit_tests_for_legacy_fn',
  ],
  senior: [
    'build_rest_api_for_startup',
    'implement_oauth_login_flow',
    'migrate_mysql_to_postgres',
    'optimize_slow_db_queries',
    'build_admin_dashboard',
    'set_up_ci_cd_pipeline',
    'build_landing_page_with_anim',
    'refactor_spaghetti_codebase',
  ],
  lead: [
    'architect_multitenant_saas',
    'build_realtime_notification_sys',
    'implement_payment_integration',
    'build_data_pipeline_analytics',
    'implement_fulltext_search',
    'design_api_versioning_strategy',
  ],
  tenmx: [
    'design_infra_for_series_a',
    'build_ai_feature_from_scratch',
    'lead_legacy_codebase_rewrite',
    'architect_zero_downtime_migration',
  ],
};

// ── Tier → CONSTANTS lookup ────────────────────────────────────
const TIER_PARAMS = {
  junior: { costKey: 'Freelance_RCU_Cost_T1', multKey: 'Freelance_Money_Mult_T1' },
  senior: { costKey: 'Freelance_RCU_Cost_T2', multKey: 'Freelance_Money_Mult_T2' },
  lead:   { costKey: 'Freelance_RCU_Cost_T3', multKey: 'Freelance_Money_Mult_T3' },
  tenmx:  { costKey: 'Freelance_RCU_Cost_T4', multKey: 'Freelance_Money_Mult_T4' },
};

// ── Box-Muller normal distribution ────────────────────────────
// Returns a random integer drawn from N(mean, stdDev), clamped to ≥ 1.
function normalRandom(mean, stdDev) {
  let u;
  do { u = Math.random(); } while (u === 0);
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
  return Math.max(1, Math.round(mean + z * stdDev));
}

// ── LCG for pool shuffling (deterministic within a run) ───────
let _seed = Date.now();
function rand() {
=======
// Each tier has a named pool. 3 missions are drawn randomly each in-game day.

const POOLS = {
  junior: [
    { name: 'fix_wordpress_plugin_bug',       rcuCost:  5, reward:  25 },
    { name: 'debug_css_alignment_issue',       rcuCost:  4, reward:  20 },
    { name: 'write_sql_queries_for_client',    rcuCost:  6, reward:  30 },
    { name: 'add_google_analytics',            rcuCost:  4, reward:  22 },
    { name: 'update_npm_dependencies',         rcuCost:  3, reward:  18 },
    { name: 'fix_404_on_client_site',          rcuCost:  5, reward:  25 },
    { name: 'deploy_static_site_to_netlify',   rcuCost:  6, reward:  30 },
    { name: 'write_bash_backup_script',        rcuCost:  8, reward:  40 },
    { name: 'set_up_github_actions_workflow',  rcuCost: 10, reward:  50 },
    { name: 'write_unit_tests_for_legacy_fn',  rcuCost:  9, reward:  45 },
  ],
  senior: [
    { name: 'build_rest_api_for_startup',      rcuCost: 20, reward: 100 },
    { name: 'implement_oauth_login_flow',       rcuCost: 25, reward: 120 },
    { name: 'migrate_mysql_to_postgres',        rcuCost: 30, reward: 150 },
    { name: 'optimize_slow_db_queries',         rcuCost: 22, reward: 110 },
    { name: 'build_admin_dashboard',            rcuCost: 28, reward: 140 },
    { name: 'set_up_ci_cd_pipeline',            rcuCost: 24, reward: 120 },
    { name: 'build_landing_page_with_anim',     rcuCost: 18, reward:  90 },
    { name: 'refactor_spaghetti_codebase',      rcuCost: 35, reward: 180 },
  ],
  lead: [
    { name: 'architect_multitenant_saas',       rcuCost:  80, reward:  500 },
    { name: 'build_realtime_notification_sys',  rcuCost:  90, reward:  550 },
    { name: 'implement_payment_integration',    rcuCost: 100, reward:  600 },
    { name: 'build_data_pipeline_analytics',    rcuCost: 110, reward:  650 },
    { name: 'implement_fulltext_search',        rcuCost:  85, reward:  520 },
    { name: 'design_api_versioning_strategy',   rcuCost:  70, reward:  450 },
  ],
  tenmx: [
    { name: 'design_infra_for_series_a',        rcuCost: 200, reward: 2000 },
    { name: 'build_ai_feature_from_scratch',    rcuCost: 250, reward: 2500 },
    { name: 'lead_legacy_codebase_rewrite',     rcuCost: 220, reward: 2200 },
    { name: 'architect_zero_downtime_migration',rcuCost: 240, reward: 2400 },
  ],
};

let _seed = Date.now();
function rand() {
  // Simple seeded LCG — reproducible within a run if we seed from state
>>>>>>> bc09f8a (chore: carry forward feature/freelance changes onto saas-product base)
  _seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
  return Math.abs(_seed) / 0xffffffff;
}

/**
<<<<<<< HEAD
 * Generate 3 fresh missions for the player's current tier.
 * RCU cost is sampled from N(mean, mean × StdDev); money = rcuCost × multiplier.
 */
export function generateMissions(tier) {
  const pool   = POOLS[tier] ?? POOLS.junior;
  const params = TIER_PARAMS[tier] ?? TIER_PARAMS.junior;
  const mean   = CONSTANTS[params.costKey];
  const stdDev = mean * CONSTANTS.Freelance_RCU_StdDev;
  const mult   = CONSTANTS[params.multKey];

  const shuffled = [...pool].sort(() => rand() - 0.5);
  return shuffled.slice(0, 3).map((name, i) => {
    const rcuCost = normalRandom(mean, stdDev);
    return {
      id:       `${tier}_${Date.now()}_${i}`,
      name,
      rcuCost,
      reward:   Math.round(rcuCost * mult),
      accepted: false,
    };
  });
=======
 * Generate a fresh pool of 3 missions for the player's current tier.
 * Returns an array of mission objects with a unique `id` added.
 */
export function generateMissions(tier) {
  const pool = POOLS[tier] ?? POOLS.junior;
  const shuffled = [...pool].sort(() => rand() - 0.5);
  return shuffled.slice(0, 3).map((m, i) => ({
    id: `${tier}_${Date.now()}_${i}`,
    ...m,
    accepted: false,
  }));
>>>>>>> bc09f8a (chore: carry forward feature/freelance changes onto saas-product base)
}

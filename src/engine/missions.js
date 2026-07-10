// missions.js — mission pool definitions and generation
// Costs are generated per-mission

import { FREELANCE } from './config.js';

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
  _seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
  return Math.abs(_seed) / 0xffffffff;
}

/**
 * Generate 3 fresh missions for the player's current tier.
 * RCU cost is sampled from N(mean, mean × StdDev); money = rcuCost × multiplier.
 */
export function generateMissions(tier) {
  const pool   = POOLS[tier] ?? POOLS.junior;
  const mean   = FREELANCE.rcu_cost[tier] ?? FREELANCE.rcu_cost.junior;
  const stdDev = mean * FREELANCE.rcu_stdev;
  const mult   = FREELANCE.rcu_to_money_mult[tier] ?? FREELANCE.rcu_to_money_mult.junior;

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
}

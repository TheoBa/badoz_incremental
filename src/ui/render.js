// render.js — top-level DOM renderer
// Called after every tick. Reads state, updates the DOM. Never touches state.

import { renderWriteCode }   from '../tabs/write_code.js';
import { renderSaasProduct } from '../tabs/saas_product.js';
import { renderFreelance }   from '../tabs/freelance.js';
import { renderInvestment }  from '../tabs/investment.js';
import { renderFrontierLab } from '../tabs/frontier_lab.js';
import { renderPostOnX }     from '../tabs/post_on_x.js';
import { renderMilestones }  from '../tabs/milestones.js';
import { renderLeaderboard } from '../tabs/leaderboard.js';
import { renderHistogram }   from './histograms.js';
import { renderWinScreen }     from './win.js';
import { renderStartScreen }   from './start.js';
import { renderWeeklyOverlay } from './weekly.js';
import { CONSTANTS, MILESTONES } from '../engine/config.js';
import {
  softCap, calcSupportRetentionBonus, calcMarketerMarketingBonus, calcDailyLabBurn,
} from '../engine/formulas.js';
import { MILESTONE_TRACKS, getStepStatus } from '../engine/milestones.js';

export function render(state) {
  renderHeader(state);
  renderKpi(state);
  renderTabLocks(state);
  renderMilestoneNotif(state);
  renderActiveTab(state);
  renderWinScreen(state);
  renderStartScreen(state);
  renderWeeklyOverlay(state);
}

// ── Tab lock display ────────────────────────────────────────────
const TAB_LOCKS = [
  { tab: 'saas_product', unlocked: s => (s.freelance.missionsCompleted ?? 0) >= MILESTONES.freelance_tiers.t0 },
  { tab: 'investment',   unlocked: s => !!s.milestones?.claimed?.investment_unlock },
  { tab: 'frontier_lab', unlocked: s => !!s.milestones?.claimed?.lab_unlock },
  { tab: 'leaderboard',  unlocked: s => !!s._leaderboardUnlocked },
];

function renderMilestoneNotif(state) {
  const btn = document.querySelector('.tab[data-tab="milestones"]');
  if (!btn) return;
  const hasClaimable = MILESTONE_TRACKS.some(track =>
    track.steps.some(step => getStepStatus(track, step, state) === 'claimable')
  );
  btn.classList.toggle('notif', hasClaimable);
}

function renderTabLocks(state) {
  for (const { tab, unlocked } of TAB_LOCKS) {
    const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (!btn) continue;
    const isUnlocked = unlocked(state);
    btn.classList.toggle('locked', !isUnlocked);
    btn.textContent = isUnlocked ? tab : '???';
  }
}

// ── Header ─────────────────────────────────────────────────────
function renderHeader(state) {
  const hours = state.ticksElapsed;
  const days  = Math.floor(hours / CONSTANTS.TICKS_PER_DAY);
  const h     = hours % CONSTANTS.TICKS_PER_DAY;
  set('h-timer', `${String(days).padStart(2, '0')}d ${String(h).padStart(2, '0')}h`);
}

// ── KPI sidebar ────────────────────────────────────────────────
function renderKpi(state) {
  set('h-wallet', fmt(state.wallet));
  set('h-rcu',    fmtN(state.rcu));
  set('h-rcuh',   fmtN(calcRcuPerHour(state)));
  set('h-mbh',    fmt(calcBurnPerHour(state)));

  const lastEarned = state.history.earned.at(-1) ?? 0;
  const lastRcu    = state.history.rcu.at(-1)    ?? 0;
  set('k-earned', fmt(lastEarned) + '/d');
  set('k-rcu',    fmtN(lastRcu)  + '/d');
  set('k-mrr',    fmt(state.saas.mrr));
  set('k-burn',   fmt(calcDailyLabBurn(state)) + '/d');
  const conversionRate = softCap(state.saas.conversion, 100, CONSTANTS.CONV_HALF_LIFE);
  set('k-sat',    conversionRate.toFixed(2) + '%');
  const effectiveRetention = state.saas.retention + calcSupportRetentionBonus(state);
  const retentionPct = softCap(effectiveRetention, 100, CONSTANTS.RET_HALF_LIFE);
  set('k-ret',    retentionPct.toFixed(2) + '%');
  const investBoost = state.investments.active.reduce((s, b) => s + b.marketingBoost, 0);
  const marketerBoost = calcMarketerMarketingBonus(state);
  const effectiveMkt = (state.saas.marketingStream + investBoost + marketerBoost) * state.reputation.multiplier;
  set('k-mkt', fmtN(effectiveMkt) + '/d');
  set('k-rep', state.reputation.multiplier.toFixed(2) + '×');

  renderHistogram(document.getElementById('hist-earned'), state.history.earned, '#16a34a');
  renderHistogram(document.getElementById('hist-rcu'),    state.history.rcu,    '#2563eb');
  renderHistogram(document.getElementById('hist-mrr'),    state.history.mrr,    '#7c3aed');
  renderHistogram(document.getElementById('hist-burn'),   state.history.burn,   '#c94040');

  // Run info only visible once the leaderboard is unlocked (first win)
  document.getElementById('kpi-run-info').style.display =
    state._leaderboardUnlocked ? 'block' : 'none';

  // MRR + saas_properties only once saas_product is unlocked
  const saasUnlocked = (state.freelance.missionsCompleted ?? 0) >= MILESTONES.freelance_tiers.t0;
  const saasDisplay  = saasUnlocked ? '' : 'none';
  document.getElementById('km-mrr').style.display    = saasDisplay;
  document.getElementById('kpi-props').style.display = saasDisplay;

  // Daily burn only once frontier_lab is unlocked
  const labUnlocked = !!state.milestones?.claimed?.lab_unlock;
  document.getElementById('km-burn').style.display = labUnlocked ? '' : 'none';
}

// ── Tab dispatcher ──────────────────────────────────────────────
function renderActiveTab(state) {
  const active = document.querySelector('.tab.on')?.dataset.tab ?? 'write_code';
  switch (active) {
    case 'write_code':    renderWriteCode(state);   break;
    case 'saas_product':  renderSaasProduct(state); break;
    case 'freelance':    renderFreelance(state);   break;
    case 'investment':   renderInvestment(state);  break;
    case 'frontier_lab': renderFrontierLab(state); break;
    case 'post_on_x':    renderPostOnX(state);     break;
    case 'milestones':   renderMilestones(state);  break;
    case 'leaderboard':  renderLeaderboard();       break;
  }
}

// ── Helpers ────────────────────────────────────────────────────
function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

export function fmt(n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

export function fmtN(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.floor(n));
}

function calcRcuPerHour(state) {
  if (!Array.isArray(state.rcuHistory) || state.rcuHistory.length === 0) return 0;
  return state.rcuHistory.reduce((a, b) => a + b, 0) / state.rcuHistory.length;
}

function calcBurnPerHour(state) {
  return calcDailyLabBurn(state) / CONSTANTS.TICKS_PER_DAY;
}
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
import { renderWinScreen }   from './win.js';
import { renderStartScreen } from './start.js';
import { CONSTANTS, MILESTONES, LAB_PLANS, calcSupportRetentionBonus, calcMarketerMarketingBonus } from '../engine/state.js';
import { MILESTONE_TRACKS, getStepStatus } from '../engine/milestones.js';

export function render(state) {
  renderHeader(state);
  renderKpi(state);
  renderTabLocks(state);
  renderMilestoneNotif(state);
  renderActiveTab(state);
  renderWinScreen(state);
  renderStartScreen(state);
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
  const hours  = state.ticksElapsed;
  const days   = Math.floor(hours / 24);
  const h      = hours % 24;
  const mm     = String(days).padStart(2, '0');
  const ss     = String(h).padStart(2, '0');
  set('h-timer',  `${mm}d ${ss}h`);
  set('h-wallet', fmt(state.wallet));
  set('h-rcu',    fmtN(state.rcu));
  set('h-rcuh',   fmtN(calcRcuPerHour(state)));
  set('h-mbh',    fmt(calcBurnPerHour(state)));
}

// ── KPI sidebar ────────────────────────────────────────────────
function renderKpi(state) {
  const lastEarned = state.history.earned.at(-1) ?? 0;
  const lastRcu    = state.history.rcu.at(-1)    ?? 0;
  set('k-earned', fmt(lastEarned) + '/d');
  set('k-rcu',    fmtN(lastRcu)  + '/d');
  set('k-mrr',    fmt(state.saas.mrr));
  set('k-burn',   fmt(calcBurnPerDay(state)) + '/d');
  const conversionRate = progressive_wall(state.saas.conversion, 100, 2);
  set('k-sat',    conversionRate + '%');
  const effectiveRetention = state.saas.retention + calcSupportRetentionBonus(state);
  const retentionPct = progressive_wall(effectiveRetention, 100, 5);
  set('k-ret',    retentionPct + '%');
  const investBoost = Array.isArray(state.investments)
    ? 0
    : state.investments.active.reduce((s, b) => s + b.marketingBoost, 0);
  const marketerBoost = calcMarketerMarketingBonus(state);
  const effectiveMkt = (state.saas.marketingStream + investBoost + marketerBoost) * state.reputation.multiplier;
  set('k-mkt', fmtN(effectiveMkt) + '/d');
  set('k-rep', state.reputation.multiplier.toFixed(2) + '×');

  renderHistogram(document.getElementById('hist-earned'), state.history.earned, '#1D9E75');
  renderHistogram(document.getElementById('hist-rcu'),    state.history.rcu,    '#888');
  renderHistogram(document.getElementById('hist-mrr'),    state.history.mrr,    '#378ADD');
  renderHistogram(document.getElementById('hist-burn'),   state.history.burn,   '#c94040');

  // Run info only visible after at least one completed run
  document.getElementById('kpi-run-info').style.display =
    state.runCount > 0 ? 'block' : 'none';
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
  return calcBurnPerDay(state) / 24;
}

function calcBurnPerDay(state) {
  if (!state.milestones?.claimed?.lab_unlock) return 0;
  return Object.values(state.lab.agents)
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + (LAB_PLANS[a.tier]?.dailyCost ?? 0), 0);
}

export function progressive_wall(x, wall_value, half_life) {
  return ((wall_value * x) / (x + half_life)).toFixed(2);
}
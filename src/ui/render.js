// render.js — top-level DOM renderer
// Called after every tick. Reads state, updates the DOM. Never touches state.

import { renderWriteCode }   from '../tabs/write_code.js';
import { renderShipFeature } from '../tabs/ship_feature.js';
import { renderFreelance }   from '../tabs/freelance.js';
import { renderInvestment }  from '../tabs/investment.js';
import { renderFrontierLab } from '../tabs/frontier_lab.js';
import { renderPostOnX }     from '../tabs/post_on_x.js';
import { renderHistogram }   from './histograms.js';

export function render(state) {
  renderHeader(state);
  renderKpi(state);
  renderActiveTab(state);
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
  set('k-earned', fmt(state.moneyLifetime));
  set('k-rcu',    fmtN(state.rcuLifetime));
  set('k-mrr',    fmt(state.saas.mrr));
  set('k-burn',   fmt(calcBurnPerDay(state)) + '/d');
  set('k-sat',    state.saas.satisfaction.toFixed(2));
  set('k-ret',    state.saas.retention.toFixed(2));
  set('k-mkt',    fmtN(state.saas.marketingStream) + '/d');

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
    case 'write_code':   renderWriteCode(state);   break;
    case 'ship_feature': renderShipFeature(state); break;
    case 'freelance':    renderFreelance(state);   break;
    case 'investment':   renderInvestment(state);  break;
    case 'frontier_lab': renderFrontierLab(state); break;
    case 'post_on_x':    renderPostOnX(state);     break;
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
  // TODO: sum passive RCU/h from agents
  return 0;
}

function calcBurnPerHour(state) {
  return calcBurnPerDay(state) / 24;
}

function calcBurnPerDay(state) {
  // TODO: sum active agent tier daily costs
  return 0;
}

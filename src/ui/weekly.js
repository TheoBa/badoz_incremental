// weekly.js — weekly summary pop-up
// Fires every 7 in-game days (168 ticks). Shows a digest of the past week
// with a balance trend chart.

import { CONSTANTS } from '../engine/config.js';
import { fmt, fmtN } from './render.js';
import { renderHistogram } from './histograms.js';

const overlay = () => document.getElementById('weekly-overlay');
const el      = id  => document.getElementById(id);

export function renderWeeklyOverlay(state) {
  if (!state._weeklyPopupPending) return;
  const ov = overlay();
  if (!ov || ov.classList.contains('on')) return;
  showWeeklySummary(state);
}

function showWeeklySummary(state) {
  const ov = overlay();
  if (!ov) return;

  const weekNum = Math.floor(state.ticksElapsed / CONSTANTS.TICKS_PER_WEEK);
  const h       = state.history;
  const lw      = state.weekStats?.lastWeek ?? {};

  const moneyMade   = h.earned.reduce((a, b) => a + b, 0);
  const rcuGained   = h.rcu.reduce((a, b) => a + b, 0);
  const newCust     = h.customers.reduce((a, b) => a + b, 0);
  const missions    = lw.missionsDone ?? 0;
  const investSpent = lw.investSpent  ?? 0;

  el('weekly-kicker').textContent = `week_${weekNum}_summary`;

  el('weekly-rows').innerHTML = [
    row('money_made',     fmt(moneyMade),              'money'),
    row('rcu_gained',     fmtN(rcuGained),   'rcu'),
    row('new_customers',  fmtCust(newCust),  'mrr'),
    row('freelance_done', `${missions} mission${missions !== 1 ? 's' : ''}`),
    investSpent > 0 ? row('invest_spent', fmt(investSpent)) : '',
  ].join('');

  // Wallet evolution bars — clamp to 0 for bar height; negative shown as near-zero
  renderHistogram(el('weekly-wallet'), h.wallet.map(v => Math.max(v, 0)), '#16a34a');

  el('weekly-hint').textContent = `balance: ${fmt(state.wallet)}`;

  ov.classList.add('on');

  const btn = el('weekly-ok');
  btn.onclick = () => {
    ov.classList.remove('on');
    state._weeklyPopupPending = false;
  };
}

function row(label, value, cls = '') {
  return `<div class="weekly-row"><span>${label}</span><b${cls ? ` class="${cls}"` : ''}>${value}</b></div>`;
}

function fmtCust(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${Math.round(n)}`;
}

// leaderboard.js — leaderboard tab + post-game detail view.
// Fetches lazily and caches; a paint-token guard means the per-tick re-render
// is a no-op unless data or the active sub-view actually changed (so clicks and
// scroll position survive). View state here is UI-only, not game state.

import { getPlayerName }      from '../engine/identity.js';
import { renderSeriesCharts } from '../ui/charts.js';

let board   = null;                 // cached leaderboard rows (null = not loaded)
let loading = false;
let detail  = null;                 // cached run detail
let detailLoading = false;
let view    = { mode: 'list', id: null };
let version = 0;                    // bumped whenever cached data changes
let painted = '';                  // token describing what's in the DOM

// Called from the tab-switch handler so each open shows fresh standings.
export function refreshLeaderboard() {
  view = { mode: 'list', id: null };
  fetchBoard();
}

function fetchBoard() {
  if (loading) return;
  loading = true;
  fetch('/api/runs/leaderboard?limit=25')
    .then(r => r.json())
    .then(d => { board = d.leaderboard || []; })
    .catch(() => { board = board || []; })
    .finally(() => { loading = false; version++; repaint(); });
}

function fetchDetail(id) {
  detail = null;
  detailLoading = true;
  version++;
  repaint();
  fetch('/api/runs/' + id)
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(d => { detail = d.run; })
    .catch(() => { detail = null; })
    .finally(() => { detailLoading = false; version++; repaint(); });
}

function repaint() {
  paint(document.getElementById('panel-leaderboard'));
}

export function renderLeaderboard() {
  const panel = document.getElementById('panel-leaderboard');
  if (!panel) return;
  if (board === null && !loading) fetchBoard();
  paint(panel);
}

function paint(panel) {
  if (!panel) return;
  const token = `${view.mode}:${view.id ?? ''}:v${version}`;
  if (token === painted) return;
  painted = token;
  if (view.mode === 'detail') paintDetail(panel);
  else paintList(panel);
}

// ── List view ──────────────────────────────────────────────────
function paintList(panel) {
  if (board === null) {
    panel.innerHTML = headerHTML() + '<div class="lb-empty">loading…</div>';
    wireRefresh(panel);
    return;
  }
  if (board.length === 0) {
    panel.innerHTML = headerHTML() + '<div class="lb-empty">no runs yet — be the first to exit at $1B.</div>';
    wireRefresh(panel);
    return;
  }

  const me = getPlayerName();
  const rows = board.map(r => `
    <tr class="lb-row${r.player_name === me ? ' lb-me' : ''}" data-id="${r.id}">
      <td class="lb-rank">${r.rank}</td>
      <td class="lb-name">${esc(r.player_name)}</td>
      <td class="lb-saas">${esc(r.saas_name)}</td>
      <td class="lb-time">${fmtTicks(r.total_elapsed_ticks)}</td>
      <td class="lb-date">${fmtDate(r.submitted_at)}</td>
      <td class="lb-dev-mode">${r.dev_mode ? 'dev' : ''}</td>
    </tr>`).join('');

  panel.innerHTML = headerHTML() + `
    <table class="lb-table">
      <thead><tr><th>#</th><th>handle</th><th>product</th><th>time</th><th>date</th><th>dev</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  wireRefresh(panel);
  panel.querySelectorAll('.lb-row').forEach(tr => {
    tr.addEventListener('click', () => {
      view = { mode: 'detail', id: Number(tr.dataset.id) };
      fetchDetail(view.id);
    });
  });
}

function headerHTML() {
  return `
    <div class="lb-head">
      <div class="lb-title">leaderboard · fastest_to_$1B</div>
      <button id="lb-refresh" class="lb-btn">refresh</button>
    </div>`;
}

function wireRefresh(panel) {
  panel.querySelector('#lb-refresh')?.addEventListener('click', () => fetchBoard());
}

// ── Detail view ────────────────────────────────────────────────
function paintDetail(panel) {
  if (detailLoading) {
    panel.innerHTML = backHTML() + '<div class="lb-empty">loading run…</div>';
    wireBack(panel);
    return;
  }
  if (!detail) {
    panel.innerHTML = backHTML() + '<div class="lb-empty">run not found.</div>';
    wireBack(panel);
    return;
  }

  const run = detail;
  panel.innerHTML = backHTML() + `
    <div class="lb-detail-head">
      <div class="lb-detail-title">${esc(run.saas_name)} <span class="lb-detail-by">by ${esc(run.player_name)}</span></div>
      <div class="lb-detail-meta">time ${fmtTicks(run.total_elapsed_ticks)} · ${fmtDate(run.submitted_at)}</div>
    </div>
    <div id="lb-charts"></div>`;

  wireBack(panel);
  renderSeriesCharts(panel.querySelector('#lb-charts'), run.series, run.events);
}

function backHTML() {
  return `<div class="lb-head"><button id="lb-back" class="lb-btn">← leaderboard</button></div>`;
}

function wireBack(panel) {
  panel.querySelector('#lb-back')?.addEventListener('click', () => {
    view = { mode: 'list', id: null };
    version++;       // force a repaint back to the (cached) list
    repaint();
  });
}

// ── Helpers ────────────────────────────────────────────────────
function fmtTicks(ticks) {
  const t = Number(ticks) || 0;
  return `${Math.floor(t / 24)}d ${t % 24}h`;
}

function fmtDate(ms) {
  try { return new Date(Number(ms)).toLocaleDateString(); } catch { return '—'; }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

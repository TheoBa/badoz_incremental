// charts.js — post-game analytics charts (hand-rolled SVG, no external libs).
// Renders the three cumulative series sharing a time axis, with vertical
// raise_price markers. Colors follow CLAUDE.md: money=teal, rcu=grey, burn=red.

import { fmt, fmtN } from './render.js';

const SERIES = [
  { key: 'money',   title: 'cumulative_money',  color: '#1D9E75', peak: fmt  },
  { key: 'rcu',     title: 'cumulative_rcu',    color: '#888888', peak: fmtN },
  { key: 'labBurn', title: 'lab_tokens_burned', color: '#c94040', peak: fmt  },
];

export function renderSeriesCharts(container, series, events) {
  if (!container) return;
  const s    = series || {};
  const t    = Array.isArray(s.t) ? s.t : [];
  const maxT = t.length ? t[t.length - 1] : 0;
  const evs  = (Array.isArray(events) ? events : []).filter(e => e && e.type === 'raise_price');

  if (t.length < 2) {
    container.innerHTML = '<div class="lb-empty">no series data for this run.</div>';
    return;
  }
  container.innerHTML = SERIES
    .map(spec => chartSVG(spec, t, Array.isArray(s[spec.key]) ? s[spec.key] : [], maxT, evs))
    .join('');
}

function chartSVG(spec, t, vals, maxT, evs) {
  const W = 600, H = 140, padL = 8, padR = 8, padT = 22, padB = 18;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxV   = Math.max(1, ...vals);

  const sx = tick => padL + (maxT ? tick / maxT : 0) * innerW;
  const sy = val  => padT + innerH - (val / maxV) * innerH;

  const pts = t
    .map((tk, i) => `${sx(tk).toFixed(1)},${sy(vals[i] ?? 0).toFixed(1)}`)
    .join(' ');

  const markers = evs
    .filter(e => Number.isFinite(e.tick) && e.tick <= maxT)
    .map(e => {
      const x = sx(e.tick).toFixed(1);
      return `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + innerH}" stroke="#BA7517" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>`
           + `<text x="${x}" y="${padT - 6}" fill="#BA7517" font-size="9" text-anchor="middle">$${e.to}</text>`;
    })
    .join('');

  const maxDays = Math.floor(maxT / 24);

  return `
    <div class="lb-chart">
      <div class="lb-chart-title" style="color:${spec.color}">${spec.title} · peak ${spec.peak(maxV)}</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="lb-chart-svg" role="img">
        <line x1="${padL}" y1="${padT + innerH}" x2="${W - padR}" y2="${padT + innerH}" stroke="var(--border)" stroke-width="1"/>
        ${markers}
        <polyline points="${pts}" fill="none" stroke="${spec.color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
        <text x="${padL}" y="${H - 5}" fill="var(--text3)" font-size="9">0d</text>
        <text x="${W - padR}" y="${H - 5}" fill="var(--text3)" font-size="9" text-anchor="end">${maxDays}d</text>
      </svg>
    </div>`;
}

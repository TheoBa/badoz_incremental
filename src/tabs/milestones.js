// milestones.js — Milestones tab
// Three tracks displayed in sections: money_earned, rcu_gained, lab_burn.
// Each step row has three states:
//   claimed   — ✓ prefix (teal), effect revealed, "claimed" badge
//   claimable — → prefix (amber), effect revealed, [ claim ] button or "coming_soon"
//   locked    — · prefix (muted), effect hidden as ???, "locked" badge

import { MILESTONE_TRACKS, getStepStatus, getProgressTarget } from '../engine/milestones.js';

export function renderMilestones(state) {
  const panel = document.getElementById('panel-milestones');
  panel.innerHTML = MILESTONE_TRACKS.map(track => trackHTML(track, state)).join('');

  // Wire claim buttons
  MILESTONE_TRACKS.forEach(track => {
    track.steps.forEach(step => {
      const btn = document.getElementById(`ms-claim-${step.id}`);
      if (btn) btn.addEventListener('click', () => {
        onClaim(state, step);
        renderMilestones(state);
      });
    });
  });
}

// ── Track section ──────────────────────────────────────────────
function trackHTML(track, state) {
  const current = track.getValue(state);
  const target  = getProgressTarget(track, state);

  const hasClaimable  = track.steps.some(s => getStepStatus(track, s, state) === 'claimable');
  const allClaimed    = track.steps.every(s => getStepStatus(track, s, state) === 'claimed');

  let progressPct = 0;
  let hintText    = '';

  if (hasClaimable) {
    progressPct = 100;
    hintText    = '↑ claim available';
  } else if (target && target.threshold !== null) {
    progressPct = Math.min(100, (current / target.threshold) * 100);
    hintText    = `↑ next at ${track.fmtValue(target.threshold)}`;
  } else if (allClaimed) {
    progressPct = 100;
    hintText    = 'all milestones claimed';
  }

  return `
    <div class="ms-track">
      <div class="ms-track-head">
        <span class="ms-track-label${hasClaimable ? ' ms-label-claimable' : ''}">${track.label}</span>
        <span class="ms-track-val">${track.fmtValue(current)}</span>
      </div>
      <div class="ms-bar-wrap"><div class="ms-bar" style="width:${progressPct}%;background:${track.barColor}"></div></div>
      ${hintText ? `<div class="ms-hint${hasClaimable ? ' ms-hint-claimable' : ''}">${hintText}</div>` : ''}
      <div class="ms-steps">
        ${track.steps.map(step => stepHTML(track, step, state)).join('')}
      </div>
    </div>`;
}

// ── Step row ───────────────────────────────────────────────────
function stepHTML(track, step, state) {
  const status    = getStepStatus(track, step, state);
  const threshold = (step.hideThreshold || step.threshold === null)
    ? '???'
    : track.fmtValue(step.threshold);
  const showEffect = status === 'claimed' || status === 'claimable';
  const effect     = showEffect ? (step.effect ?? '???') : '???';

  let prefix, thresholdCls, badge;
  if (status === 'claimed') {
    prefix = '✓'; thresholdCls = 'ms-t-done';
    badge  = `<span class="ms-badge ms-badge-done">claimed</span>`;
  } else if (status === 'claimable') {
    prefix = '→'; thresholdCls = 'ms-t-claim';
    badge  = step.onClaim !== null
      ? `<button class="ms-claim-btn" id="ms-claim-${step.id}">[ claim ]</button>`
      : `<span class="ms-badge ms-badge-soon">coming_soon</span>`;
  } else {
    prefix = '·'; thresholdCls = 'ms-t-lock';
    badge  = `<span class="ms-badge ms-badge-locked">locked</span>`;
  }

  return `
    <div class="ms-row${status === 'claimable' ? ' ms-row-claimable' : ''}">
      <span class="ms-threshold ${thresholdCls}"><span class="ms-prefix">${prefix}</span>${threshold}</span>
      <span class="ms-effect${showEffect ? ' ms-effect-vis' : ' ms-effect-hid'}">${effect}</span>
      ${badge}
    </div>`;
}

// ── Claim handler ──────────────────────────────────────────────
function onClaim(state, step) {
  if (!state.milestones)         state.milestones         = { claimed: {} };
  if (!state.milestones.claimed) state.milestones.claimed = {};
  state.milestones.claimed[step.id] = true;
  if (step.onClaim) step.onClaim(state);
}

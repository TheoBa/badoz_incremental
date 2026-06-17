// freelance.js — freelance mission tab
// Shows 3 daily missions. Missions refresh every 24 ticks (1 in-game day).
// Accepting a mission costs RCU and pays money instantly.
//
// Rush mechanic:
//   - Available only after claiming the freelance_t1 milestone (senior tier)
//   - One-time unlock costs Freelance_RCU_T1 RCU (from current pool)
//   - When unlocked: "rush ×2" button accepts mission at 2× RCU cost for 2× reward

import { CONSTANTS } from '../engine/state.js';
import { fmtN, fmt } from '../ui/render.js';

export function renderFreelance(state) {
  const panel      = document.getElementById('panel-freelance');
  const ticksInDay = state.ticksElapsed % 24;
  const refreshIn  = 24 - ticksInDay;
  const day        = Math.floor(state.ticksElapsed / 24) + 1;

  const seniorClaimed = !!state.milestones?.claimed?.freelance_t1;
  const rushUnlocked  = state.freelance.rushUnlocked;

  panel.innerHTML = `
    <div class="fl-meta">
      day <b>${day}</b>
      · tier <b class="teal">${state.freelance.tier}</b>
      · refreshes in <b>${refreshIn}h</b>
    </div>

    <div id="fl-missions">
      ${state.freelance.missions.map(m => missionCard(m, state, seniorClaimed, rushUnlocked)).join('')}
    </div>

    ${seniorClaimed && !rushUnlocked ? rushUnlockSection(state) : ''}`;

  // Wire accept buttons
  state.freelance.missions.forEach(m => {
    if (m.accepted) return;

    const acceptBtn = document.getElementById(`fl-accept-${m.id}`);
    if (acceptBtn && !acceptBtn.disabled) {
      acceptBtn.addEventListener('click', () => {
        onAcceptMission(state, m.id, false);
        renderFreelance(state);
      });
    }

    if (rushUnlocked) {
      const rushBtn = document.getElementById(`fl-rush-${m.id}`);
      if (rushBtn && !rushBtn.disabled) {
        rushBtn.addEventListener('click', () => {
          onAcceptMission(state, m.id, true);
          renderFreelance(state);
        });
      }
    }
  });

  // Wire rush unlock button
  const unlockBtn = document.getElementById('fl-rush-unlock-btn');
  if (unlockBtn && !unlockBtn.disabled) {
    unlockBtn.addEventListener('click', () => {
      onUnlockRush(state);
      renderFreelance(state);
    });
  }
}

function missionCard(m, state, seniorClaimed, rushUnlocked) {
  const canAfford      = state.rcu >= m.rcuCost;
  const canRush        = rushUnlocked && !m.accepted && state.rcu >= m.rcuCost * 2;
  const sub = m.accepted
    ? `completed ✓ · +${fmt(m.reward)}`
    : `cost <b class="teal">${fmtN(m.rcuCost)} RCU</b> · reward <b class="money">${fmt(m.reward)}</b>`;

  const rushBtn = seniorClaimed
    ? rushUnlocked
      ? `<button
          id="fl-rush-${m.id}"
          class="fl-btn-rush fl-btn-rush-active"
          ${m.accepted || !canRush ? 'disabled' : ''}
          title="${!canRush && !m.accepted ? `need ${fmtN(m.rcuCost * 2)} RCU` : ''}">
          rush ×2
        </button>`
      : `<button class="fl-btn-rush" disabled title="rush not unlocked">rush ×2</button>`
    : ''; // hidden entirely until milestone claimed

  return `
    <div class="fl-card${m.accepted ? ' fl-card-done' : ''}">
      <div class="fl-card-left">
        <div class="fl-card-name">${m.name}</div>
        <div class="fl-card-sub">${sub}</div>
      </div>
      <div class="fl-card-actions">
        <button
          id="fl-accept-${m.id}"
          class="fl-btn-accept"
          ${m.accepted || !canAfford ? 'disabled' : ''}
          title="${m.accepted ? '' : canAfford ? '' : `need ${fmtN(m.rcuCost)} RCU`}">
          ${m.accepted ? 'done' : 'accept'}
        </button>
        ${rushBtn}
      </div>
    </div>`;
}

function rushUnlockSection(state) {
  const cost      = CONSTANTS.Freelance_RCU_T1;
  const canAfford = state.rcu >= cost;
  return `
    <div class="fl-rush-unlock">
      <div class="fl-rush-label">rush_mode</div>
      <div class="fl-rush-desc">one-time unlock · doubles reward and RCU cost on any mission</div>
      <button id="fl-rush-unlock-btn" class="fl-btn fl-btn-rush-unlock" ${canAfford ? '' : 'disabled'}>
        [ unlock rush — ${fmtN(cost)} RCU ]
      </button>
      ${!canAfford ? `<div class="fl-rush-hint">need ${fmtN(cost)} RCU · current: ${fmtN(state.rcu)}</div>` : ''}
    </div>`;
}

// ── Action handlers ────────────────────────────────────────────
function onAcceptMission(state, missionId, isRush) {
  const mission = state.freelance.missions.find(m => m.id === missionId);
  if (!mission || mission.accepted) return;

  const cost   = isRush ? mission.rcuCost * 2 : mission.rcuCost;
  const reward = isRush ? mission.reward  * 2 : mission.reward;
  if (state.rcu < cost) return;

  state.rcu           -= cost;
  state.wallet        += reward;
  state.moneyLifetime += reward;
  mission.accepted     = true;

  // Immediate header updates
  document.getElementById('h-rcu').textContent    = fmtN(state.rcu);
  document.getElementById('h-wallet').textContent = fmt(state.wallet);
}

function onUnlockRush(state) {
  const cost = CONSTANTS.Freelance_RCU_T1;
  if (state.rcu < cost || state.freelance.rushUnlocked) return;
  state.rcu -= cost;
  state.freelance.rushUnlocked = true;
  document.getElementById('h-rcu').textContent = fmtN(state.rcu);
}

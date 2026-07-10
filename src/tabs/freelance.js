// freelance.js — freelance mission tab
// Shows 3 daily missions. Missions refresh every 24 ticks (1 in-game day).
// Accepting a mission costs RCU and pays money instantly.
//
// Rush mechanic:
//   - Unlocks automatically when the freelance_t1 milestone is claimed (senior tier)
//   - "rush ×2" button accepts at 2× RCU cost for 2× reward; counts as 2 missions completed

import { CONSTANTS } from '../engine/config.js';
import { fmtN, fmt } from '../ui/render.js';

export function renderFreelance(state) {
  const panel      = document.getElementById('panel-freelance');
  const ticksInDay = state.ticksElapsed % CONSTANTS.TICKS_PER_DAY;
  const refreshIn  = CONSTANTS.TICKS_PER_DAY - ticksInDay;
  const day        = Math.floor(state.ticksElapsed / CONSTANTS.TICKS_PER_DAY) + 1;

  const seniorClaimed = !!state.milestones?.claimed?.freelance_t1;
  const rushUnlocked  = state.freelance.rushUnlocked;

  panel.innerHTML = `
    <div class="fl-meta">
      day <b>${day}</b>
      · tier <b class="rcu">${state.freelance.tier}</b>
      · refreshes in <b>${refreshIn}h</b>
    </div>

    <div id="fl-missions">
      ${state.freelance.missions.map(m => missionCard(m, state, seniorClaimed, rushUnlocked)).join('')}
    </div>

    `;

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

}

function missionCard(m, state, seniorClaimed, rushUnlocked) {
  const canAfford      = state.rcu >= m.rcuCost;
  const canRush        = rushUnlocked && !m.accepted && state.rcu >= m.rcuCost * 2;
  const sub = m.accepted
    ? `completed ✓ · +${fmt(m.reward)}`
    : `cost <b class="rcu">${fmtN(m.rcuCost)} RCU</b> · reward <b class="money">${fmt(m.reward)}</b>`;

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
  state.freelance.missionsCompleted = (state.freelance.missionsCompleted ?? 0) + (isRush ? 2 : 1);

  // Immediate header updates
  document.getElementById('h-rcu').textContent    = fmtN(state.rcu);
  document.getElementById('h-wallet').textContent = fmt(state.wallet);
}

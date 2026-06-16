// freelance.js — freelance mission tab
// Shows 3 daily missions. Missions refresh every 24 ticks (1 in-game day).
// Accepting a mission costs RCU and pays money instantly.

import { fmtN, fmt } from '../ui/render.js';

export function renderFreelance(state) {
  const panel = document.getElementById('panel-freelance');
  const ticksInDay = state.ticksElapsed % 24;
  const refreshIn  = 24 - ticksInDay;
  const day        = Math.floor(state.ticksElapsed / 24) + 1;

  panel.innerHTML = `
    <div class="fl-meta">
      day <b>${day}</b>
      · tier <b class="teal">${state.freelance.tier}</b>
      · refreshes in <b>${refreshIn}h</b>
    </div>

    <div id="fl-missions">
      ${state.freelance.missions.map(m => missionCard(m, state)).join('')}
    </div>

    <div class="fl-rush-hint ${state.freelance.rushUnlocked ? 'hidden' : ''}">
      🔒 rush_unlock — one-time payment of
      <b>Freelance_RCU_T1</b> RCU · doubles reward, instant completion
    </div>`;

  // Wire accept buttons
  state.freelance.missions.forEach(m => {
    if (m.accepted) return;
    const btn = document.getElementById(`fl-accept-${m.id}`);
    if (btn) btn.addEventListener('click', () => onAcceptMission(state, m.id));
  });
}

function missionCard(m, state) {
  const canAfford = state.rcu >= m.rcuCost;
<<<<<<< HEAD
  const sub = m.accepted
    ? `completed ✓ · +${fmt(m.reward)}`
    : `cost <b class="teal">${fmtN(m.rcuCost)} RCU</b> · reward <b class="money">${fmt(m.reward)}</b>`;

  // Accepted cards keep the same DOM structure — only CSS changes (fl-card-done)
  // so the card height stays fixed and the row never jumps.
  return `
    <div class="fl-card${m.accepted ? ' fl-card-done' : ''}">
      <div class="fl-card-left">
        <div class="fl-card-name">${m.name}</div>
        <div class="fl-card-sub">${sub}</div>
=======
  if (m.accepted) {
    return `
      <div class="fl-card fl-card-done">
        <div class="fl-card-name">${m.name}</div>
        <div class="fl-card-sub">completed ✓ · +${fmt(m.reward)}</div>
      </div>`;
  }
  return `
    <div class="fl-card">
      <div class="fl-card-left">
        <div class="fl-card-name">${m.name}</div>
        <div class="fl-card-sub">cost <b class="teal">${fmtN(m.rcuCost)} RCU</b> · reward <b class="money">${fmt(m.reward)}</b></div>
>>>>>>> bc09f8a (chore: carry forward feature/freelance changes onto saas-product base)
      </div>
      <div class="fl-card-actions">
        <button
          id="fl-accept-${m.id}"
          class="fl-btn-accept"
<<<<<<< HEAD
          ${m.accepted || !canAfford ? 'disabled' : ''}
          title="${m.accepted ? '' : canAfford ? '' : `need ${fmtN(m.rcuCost)} RCU`}">
          ${m.accepted ? 'done' : 'accept'}
=======
          ${canAfford ? '' : 'disabled'}
          title="${canAfford ? '' : `need ${fmtN(m.rcuCost)} RCU`}">
          accept
>>>>>>> bc09f8a (chore: carry forward feature/freelance changes onto saas-product base)
        </button>
        <button class="fl-btn-rush" disabled title="rush locked">rush ×2</button>
      </div>
    </div>`;
}

function onAcceptMission(state, missionId) {
  const mission = state.freelance.missions.find(m => m.id === missionId);
  if (!mission || mission.accepted || state.rcu < mission.rcuCost) return;

  state.rcu          -= mission.rcuCost;
  state.wallet       += mission.reward;
  state.moneyLifetime += mission.reward;
  mission.accepted    = true;

  // Immediate DOM updates without waiting for next tick
  document.getElementById('h-rcu').textContent    = fmtN(state.rcu);
  document.getElementById('h-wallet').textContent = fmt(state.wallet);

  // Re-render the panel
  renderFreelance(state);
}

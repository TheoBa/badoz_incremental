// post_on_x.js — post on X tab
// Once-per-day action. Each post adds POST_REP_DELTA to reputation.multiplier.
// Cooldown is tracked in state.reputation.postCooldownTicks (decremented by tick.js).

import { CONSTANTS } from '../engine/config.js';
import { ticksToLabel } from '../ui/format.js';

export function renderPostOnX(state) {
  const panel    = document.getElementById('panel-post_on_x');
  const cooldown = state.reputation.postCooldownTicks;
  const ready    = cooldown === 0;

  if (!panel._built) {
    panel.innerHTML = `
      <div class="pox-rep-display">
        <div class="pox-rep-value gold" id="pox-rep">1.00×</div>
        <div class="pox-rep-label">reputation_multiplier</div>
      </div>

      <button class="pox-btn" id="pox-btn">[ post_on_x() ]</button>
      <div class="pox-cooldown" id="pox-cooldown"></div>

      <div class="stat-section">
        <div class="stat-row"><span>rep/post</span><b class="gold">+${CONSTANTS.POST_REP_DELTA.toFixed(2)}</b></div>
        <div class="stat-row"><span>number_of_posts</span><b id="pox-count" class="gold">0</b></div>
        <div class="stat-row"><span>cooldown</span><b>1 day</b></div>
      </div>`;

    document.getElementById('pox-btn').addEventListener('click', () => onPostOnX(state));
    panel._built = true;
  }

  document.getElementById('pox-rep').textContent   = state.reputation.multiplier.toFixed(2) + '×';
  document.getElementById('pox-count').textContent = state.reputation.numberOfPosts;

  const btn = document.getElementById('pox-btn');
  const cd  = document.getElementById('pox-cooldown');

  if (ready) {
    btn.disabled        = false;
    btn.textContent     = '[ post_on_x() ]';
    btn.classList.remove('pox-btn-cooldown');
    cd.textContent      = '';
  } else {
    btn.disabled        = true;
    btn.textContent     = '[ on_cooldown ]';
    btn.classList.add('pox-btn-cooldown');
    cd.textContent      = `next post in ${ticksToLabel(cooldown)}`;
  }
}

export function onPostOnX(state) {
  if (state.reputation.postCooldownTicks > 0) return;

  state.reputation.multiplier       += CONSTANTS.POST_REP_DELTA;
  state.reputation.postCooldownTicks = CONSTANTS.POST_COOLDOWN;
  state.reputation.numberOfPosts++;

  // Re-render the tab immediately
  renderPostOnX(state);

  // Flash the button briefly
  const btn = document.getElementById('pox-btn');
  if (btn) {
    btn.textContent = `[ +${CONSTANTS.POST_REP_DELTA.toFixed(2)} rep ]`;
    setTimeout(() => renderPostOnX(state), 300);
  }
}

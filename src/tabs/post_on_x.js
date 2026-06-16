// post_on_x.js — tab renderer
// Post a thread once per in-game day for a permanent compounding reputation multiplier.

export function renderPostOnX(state) {
  // TODO: show post button (greyed out if cooldown > 0), reputation multiplier, post log
}

/** Called when player posts a thread. */
export function onPostOnX(state) {
  if (state.reputation.postCooldownTicks > 0) return;
  state.reputation.multiplier = Math.round(state.reputation.multiplier * 1.05 * 100) / 100;
  state.reputation.postCooldownTicks = 24; // 1 in-game day cooldown
  state.reputation.postsThisRun++;
}

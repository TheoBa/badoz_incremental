// write_code.js — tab renderer
// Handles the main resource display and the write_code() button.

export function renderWriteCode(state) {
  // TODO: update RCU counter, RCU/h, MRR, customer count
}

/** Called when player clicks [ write_code() ] */
export function onWriteCode(state) {
  const gain = 1; // base manual gain; multiplied by upgrades later
  state.rcu += gain;
  state.rcuLifetime += gain;
}

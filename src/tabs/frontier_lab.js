// frontier_lab.js — tab renderer
// Manage AI agents and their subscription tiers (Free / Hobbyist / Growth / Scale / Infernal).
// Agents unlock progressively via Lab_Money milestones.

export function renderFrontierLab(state) {
  // TODO: render agent cards with tier selector buttons
  // Locked agents shown at reduced opacity with milestone badge
}

/** Called when player changes an agent's subscription tier. */
export function onSetAgentTier(state, agentId, tier) {
  // TODO: update state.lab.agents[agentId].tier
  // Billing takes effect at the start of the next in-game day
}

/** Called when player upgrades an agent's model level. */
export function onUpgradeAgentModel(state, agentId) {
  // TODO: deduct RCU cost, increment modelLevel, boost agent multiplier
}

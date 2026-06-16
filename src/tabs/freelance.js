// freelance.js — tab renderer
// Shows daily mission pool. Missions refresh every 24 ticks (1 in-game day).

export function renderFreelance(state) {
  // TODO: render mission cards with accept / rush buttons
  // Rush is hidden until state.freelance.rushUnlocked === true
}

/** Called when player accepts a mission. */
export function onAcceptMission(state, missionId) {
  // TODO: deduct RCU cost, credit reward to wallet + moneyLifetime
}

/** Called when player uses the rush option on a mission. */
export function onRushMission(state, missionId) {
  // TODO: deduct Rush_RCU_Cost (= Freelance_RCU_T1), complete mission instantly at 2× reward
}

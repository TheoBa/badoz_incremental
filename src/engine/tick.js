// tick.js — game loop
// Called once per TICK_RATE seconds. Advances the game by one in-game hour.

import { CONSTANTS } from './state.js';

export function startTick(state, onTick) {
  setInterval(() => {
    tick(state);
    onTick(state);
  }, CONSTANTS.TICK_RATE * 1000);
}

function tick(state) {
  state.ticksElapsed++;

  // Passive RCU generation (AI Coder agent)
  applyLabAgents(state);

  // SaaS revenue tick (every 24 ticks = 1 in-game day)
  if (state.ticksElapsed % 24 === 0) {
    applyDailyRevenue(state);
    applyDailyChurn(state);
    refreshFreelanceMissions(state);
  }

  // Post on X cooldown
  if (state.reputation.postCooldownTicks > 0) {
    state.reputation.postCooldownTicks--;
  }

  checkMilestones(state);
}

function applyLabAgents(state) {
  // TODO: implement per-agent RCU/h and money burn based on tier
}

function applyDailyRevenue(state) {
  // TODO: mrr / 30 * customers → wallet
}

function applyDailyChurn(state) {
  // TODO: apply retention multiplier to customer count
}

function refreshFreelanceMissions(state) {
  // TODO: generate new mission pool based on freelance tier
}

function checkMilestones(state) {
  // TODO: check RCU milestones (freelance tiers), Lab spend milestones, price round triggers
}

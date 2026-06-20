// run.js — run lifecycle helpers
// Single source of truth for starting a fresh run, so every reset path
// (win screen "new_run", dev panel "Reset run") re-stamps runStartedAt the same way.

import { initState }        from './state.js';
import { generateMissions } from './missions.js';
import { save }             from './save.js';

/**
 * Reset `state` in place to a fresh run, preserving the lifetime run counter.
 * initState() stamps a new runStartedAt and clears the won/winTick fields.
 */
export function newRun(state) {
  const nextRunCount         = state.runCount + 1;
  const leaderboardUnlocked  = !!state._leaderboardUnlocked;
  Object.assign(state, initState());
  state.runCount             = nextRunCount;
  state._leaderboardUnlocked = leaderboardUnlocked;
  state.freelance.missions   = generateMissions(state.freelance.tier);
  save(state);
}

// identity.js — player handle, persisted once across all runs.
// No accounts; the handle is just a display name for the leaderboard.

const KEY = 'devrun_player';

export function getPlayerName() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setPlayerName(name) {
  try { localStorage.setItem(KEY, name); } catch { /* ignore */ }
}

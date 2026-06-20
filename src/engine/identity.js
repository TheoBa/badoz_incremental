// identity.js — player handle, persisted once across all runs.
// No accounts; the handle is just a display name for the leaderboard.

const KEY     = 'bdz_player';
const KEY_OLD = 'devrun_player';

export function getPlayerName() {
  try {
    return localStorage.getItem(KEY)
      ?? localStorage.getItem(KEY_OLD)  // migrate old key
      ?? null;
  } catch { return null; }
}

export function setPlayerName(name) {
  try {
    localStorage.setItem(KEY, name);
    localStorage.removeItem(KEY_OLD);  // clean up old key on first write
  } catch { /* ignore */ }
}

// save.js — persistence
// Saves to localStorage for now; will sync to backend when server is up.

const SAVE_KEY     = 'bdz_save';
const SAVE_KEY_OLD = 'devrun_save';

export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[save] could not write save:', e);
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
      ?? localStorage.getItem(SAVE_KEY_OLD);  // migrate old key
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[save] could not read save:', e);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(SAVE_KEY_OLD);
}

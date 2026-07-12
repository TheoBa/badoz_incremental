// format.js — shared display formatters.
// Leaf module (config-only import) so both engine and UI code can use it
// without circular dependencies.

import { CONSTANTS } from '../engine/config.js';

/** Money: $1.23B / $4.56M / $7.8K / $12 */
export function fmt(n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}

/** Plain number: 1.2M / 3.4K / 567 */
export function fmtN(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.floor(n));
}

/** Tick count as in-game duration: "3d 7h", or "7h" under a day. */
export function ticksToLabel(ticks) {
  const t     = Number(ticks) || 0;
  const days  = Math.floor(t / CONSTANTS.TICKS_PER_DAY);
  const hours = t % CONSTANTS.TICKS_PER_DAY;
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

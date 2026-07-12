// submit.js — build and POST the end-of-run summary.
// Called once when a run is won (see ui/win.js). Same-origin fetch, so it works
// locally and behind the Cloudflare tunnel without any base URL.

import { CLIENT_VERSION } from './config.js';
import { getPlayerName }  from './identity.js';

/** Build the /api/runs/complete payload from final run state. */
export function buildRunPayload(state) {
  const s = state.series ?? { sampleEveryTicks: null, t: [], money: [], rcu: [], labBurn: [] };
  return {
    player_name:         getPlayerName() ?? 'anon',
    saas_name:           state.productName ?? '',
    total_elapsed_ticks: state.winTick ?? state.ticksElapsed,
    won:                 !!state.won,
    dev_mode:            !!state.devModeUsed,
    client_version:      CLIENT_VERSION,
    series: {
      sampleEveryTicks: s.sampleEveryTicks,
      t:       s.t,
      money:   s.money,
      rcu:     s.rcu,
      labBurn: s.labBurn,
    },
    events: state.events ?? [],
  };
}

/**
 * POST the run summary. Resolves { ok, id } on success, { ok:false, error }
 * otherwise — never throws, so the win screen can show status either way.
 */
export async function submitRun(state) {
  try {
    const res = await fetch('/api/runs/complete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(buildRunPayload(state)),
    });
    if (!res.ok) {
      let err = `server ${res.status}`;
      try { err = (await res.json()).error ?? err; } catch { /* ignore */ }
      return { ok: false, error: err };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data.id ?? null };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

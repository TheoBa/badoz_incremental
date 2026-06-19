// routes/runs.js — run completion ingestion
// Accepts a finished ($1B win) run and stores it for the leaderboard + analytics.
import { Router } from 'express';
import { getDb, persist } from '../db/init.js';

export const router = Router();

// Sanity bounds — friends-only trust model, just reject absurd/garbage payloads.
const MAX_NAME       = 64;
const MAX_TICKS      = 5_000_000;   // ~57 in-game years; generous
const MAX_SAMPLES    = 50_000;
const MAX_EVENTS     = 2_000;
const MAX_VERSION    = 32;

const allFinitePos = arr => arr.every(n => Number.isFinite(n) && n >= 0);

router.post('/complete', async (req, res) => {
  const b = req.body || {};

  const playerName = typeof b.player_name === 'string' ? b.player_name.trim().slice(0, MAX_NAME) : '';
  const saasName   = typeof b.saas_name   === 'string' ? b.saas_name.trim().slice(0, MAX_NAME)   : '';
  const ticks      = Number(b.total_elapsed_ticks);

  if (!playerName)  return res.status(400).json({ error: 'player_name required' });
  if (b.won !== true) return res.status(400).json({ error: 'only won runs are accepted in v0' });
  if (!Number.isFinite(ticks) || ticks <= 0 || ticks > MAX_TICKS)
    return res.status(400).json({ error: 'total_elapsed_ticks out of range' });

  // Validate the time series: aligned, capped, finite, non-negative.
  const s       = b.series || {};
  const t       = Array.isArray(s.t)       ? s.t       : [];
  const money   = Array.isArray(s.money)   ? s.money   : [];
  const rcu     = Array.isArray(s.rcu)     ? s.rcu     : [];
  const labBurn = Array.isArray(s.labBurn) ? s.labBurn : [];

  if (t.length > MAX_SAMPLES) return res.status(400).json({ error: 'series too large' });
  if (!(t.length === money.length && t.length === rcu.length && t.length === labBurn.length))
    return res.status(400).json({ error: 'series arrays misaligned' });
  if (![t, money, rcu, labBurn].every(allFinitePos))
    return res.status(400).json({ error: 'series contains invalid values' });

  const events        = Array.isArray(b.events) ? b.events.slice(0, MAX_EVENTS) : [];
  const devMode       = b.dev_mode === true ? 1 : 0;
  const clientVersion = typeof b.client_version === 'string' ? b.client_version.slice(0, MAX_VERSION) : null;

  const seriesJson = JSON.stringify({
    sampleEveryTicks: Number.isFinite(s.sampleEveryTicks) ? s.sampleEveryTicks : null,
    t, money, rcu, labBurn,
  });

  const db = await getDb();
  db.run(
    `INSERT INTO runs
       (player_name, saas_name, total_elapsed_ticks, submitted_at, won, dev_mode, client_version, series_json, events_json)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [playerName, saasName, Math.floor(ticks), Date.now(), devMode, clientVersion, seriesJson, JSON.stringify(events)]
  );
  persist();

  // sql.js's last_insert_rowid() is unreliable across db.run/db.exec; the DB is
  // single-threaded with no concurrent inserts, so MAX(id) is the just-inserted row.
  const r  = db.exec('SELECT MAX(id) AS id FROM runs');
  const id = r[0]?.values[0][0] ?? null;
  res.json({ ok: true, id });
});

// ── Leaderboard: fastest won runs (dev runs excluded) ──────────
// NOTE: must be declared before '/:id' so 'leaderboard' isn't captured as an id.
router.get('/leaderboard', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const db = await getDb();
  const result = db.exec(
    `SELECT id, player_name, saas_name, total_elapsed_ticks, submitted_at, dev_mode
       FROM runs
      ORDER BY total_elapsed_ticks ASC
      LIMIT ${limit}`
  );
  const rows = result[0]
    ? result[0].values.map((v, i) => ({
        rank: i + 1,
        id: v[0],
        player_name: v[1],
        saas_name: v[2],
        total_elapsed_ticks: v[3],
        submitted_at: v[4],
        dev_mode: v[5],
      }))
    : [];
  res.json({ leaderboard: rows });
});

// ── Single run detail: series + events for the post-game charts ─
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad id' });

  const db = await getDb();
  const result = db.exec(
    `SELECT id, player_name, saas_name, total_elapsed_ticks, submitted_at,
            dev_mode, client_version, series_json, events_json
       FROM runs WHERE id = ${id}`
  );
  const v = result[0]?.values[0];
  if (!v) return res.status(404).json({ error: 'not found' });

  res.json({
    run: {
      id: v[0],
      player_name: v[1],
      saas_name: v[2],
      total_elapsed_ticks: v[3],
      submitted_at: v[4],
      dev_mode: v[5],
      client_version: v[6],
      series: safeParse(v[7], {}),
      events: safeParse(v[8], []),
    },
  });
});

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

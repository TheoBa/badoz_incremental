// routes/state.js — server-side save/load
import { Router } from 'express';
import { getDb, persist } from '../db/init.js';

export const router = Router();

router.post('/save', async (req, res) => {
  const { playerId, state } = req.body;
  if (!playerId || !state) return res.status(400).json({ error: 'playerId and state required' });
  const db = await getDb();
  db.run(
    `INSERT INTO saves (player_id, state_json, saved_at)
     VALUES (?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET state_json=excluded.state_json, saved_at=excluded.saved_at`,
    [playerId, JSON.stringify(state), Date.now()]
  );
  persist();
  res.json({ ok: true });
});

router.get('/load', async (req, res) => {
  const { playerId } = req.query;
  if (!playerId) return res.status(400).json({ error: 'playerId required' });
  const db  = await getDb();
  const result = db.exec('SELECT state_json FROM saves WHERE player_id = ?', [playerId]);
  const row    = result[0]?.values[0];
  res.json({ state: row ? JSON.parse(row[0]) : null });
});

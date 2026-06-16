// routes/analytics.js — analytics event ingestion
import { Router } from 'express';
import { getDb, persist } from '../db/init.js';

export const router = Router();

// Store a game event emitted by the frontend
router.post('/event', async (req, res) => {
  const { runId, tick, event, payload } = req.body;
  if (!runId || !event) return res.status(400).json({ error: 'runId and event required' });
  const db = await getDb();
  db.run(
    'INSERT INTO events (run_id, tick, event, payload) VALUES (?, ?, ?, ?)',
    [runId, tick ?? 0, event, payload ? JSON.stringify(payload) : null]
  );
  persist();
  res.json({ ok: true });
});

// Return all runs
router.get('/runs', async (req, res) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM runs ORDER BY started_at DESC');
  const rows = result[0]
    ? result[0].values.map(row =>
        Object.fromEntries(result[0].columns.map((col, i) => [col, row[i]]))
      )
    : [];
  res.json({ runs: rows });
});

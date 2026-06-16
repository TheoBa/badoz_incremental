// routes/state.js — server-side save/load
// POST /api/state/save  → persist game state
// GET  /api/state/load  → retrieve latest saved state

import { Router } from 'express';
import Database   from 'better-sqlite3';

const db     = new Database('./server/db/badoz.db');
export const router = Router();

router.post('/save', (req, res) => {
  const { playerId, state } = req.body;
  // TODO: upsert into `saves` table
  res.json({ ok: true });
});

router.get('/load', (req, res) => {
  const { playerId } = req.query;
  // TODO: fetch latest save for playerId
  res.json({ state: null });
});

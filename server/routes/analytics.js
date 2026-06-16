// routes/analytics.js — analytics event ingestion
// POST /api/analytics/event  → store a game event
// GET  /api/analytics/runs   → list all recorded runs

import { Router } from 'express';
import Database   from 'better-sqlite3';

const db     = new Database('./server/db/badoz.db');
export const router = Router();

// Insert a single event emitted by the frontend
router.post('/event', (req, res) => {
  const { runId, tick, event, payload } = req.body;
  // TODO: validate and insert into `events` table
  res.json({ ok: true });
});

// Return a summary of all runs
router.get('/runs', (req, res) => {
  // TODO: query runs table and return summary rows
  res.json({ runs: [] });
});

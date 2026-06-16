// server/index.js — Express entry point
// Serves the static frontend and mounts API routes.

import express from 'express';
import { router as analyticsRouter } from './routes/analytics.js';
import { router as stateRouter }     from './routes/state.js';

const app  = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// Serve frontend static files from project root
app.use(express.static('../'));

// API routes
app.use('/api/analytics', analyticsRouter);
app.use('/api/state',     stateRouter);

app.listen(PORT, () => {
  console.log(`[devrun] server running on http://localhost:${PORT}`);
});

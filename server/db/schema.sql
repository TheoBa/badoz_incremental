-- schema.sql — SQLite database schema

-- One row per completed (won) run. Flat columns drive the leaderboard;
-- series_json / events_json hold the post-game analytics payload.
CREATE TABLE IF NOT EXISTS runs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name         TEXT    NOT NULL,
  saas_name           TEXT,
  total_elapsed_ticks INTEGER NOT NULL,   -- leaderboard sort key (ASC)
  submitted_at        INTEGER NOT NULL,   -- unix ms; the "date" on the board
  won                 INTEGER DEFAULT 1,
  dev_mode            INTEGER DEFAULT 0,  -- 1 = dev tools used; excluded from board
  client_version      TEXT,
  series_json         TEXT,               -- { sampleEveryTicks, t[], money[], rcu[], labBurn[] }
  events_json         TEXT                -- [ { tick, type, from, to }, ... ]
);
CREATE INDEX IF NOT EXISTS idx_runs_board ON runs (dev_mode, total_elapsed_ticks);

-- Legacy per-event ingestion table (currently unused; kept for the analytics route).
CREATE TABLE IF NOT EXISTS events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id  INTEGER NOT NULL,
  tick    INTEGER NOT NULL,
  event   TEXT    NOT NULL,
  payload TEXT
);

-- Server-side save slot (one per player).
CREATE TABLE IF NOT EXISTS saves (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  TEXT    NOT NULL UNIQUE,
  state_json TEXT    NOT NULL,
  saved_at   INTEGER NOT NULL
);

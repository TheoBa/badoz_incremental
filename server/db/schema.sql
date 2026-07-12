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

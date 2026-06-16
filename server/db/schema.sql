-- schema.sql — SQLite database schema

CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   TEXT    NOT NULL,
  started_at  INTEGER NOT NULL,  -- unix timestamp
  ended_at    INTEGER,
  won         INTEGER DEFAULT 0, -- 1 = player reached $1B
  duration_s  INTEGER            -- real seconds for the run
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     INTEGER NOT NULL REFERENCES runs(id),
  tick       INTEGER NOT NULL,   -- in-game hour when event occurred
  event      TEXT    NOT NULL,   -- e.g. 'mission_accepted', 'agent_tier_changed'
  payload    TEXT                -- JSON blob with event-specific data
);

CREATE TABLE IF NOT EXISTS saves (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  TEXT    NOT NULL UNIQUE,
  state_json TEXT    NOT NULL,
  saved_at   INTEGER NOT NULL
);

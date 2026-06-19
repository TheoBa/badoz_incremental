// db/init.js — initialise SQLite via sql.js (pure JS, no native build needed)
import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require  = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

const __dir   = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dir, 'badoz.db.bin');
const SCHEMA  = readFileSync(join(__dir, 'schema.sql'), 'utf8');

let _db;

export async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();

  _db = existsSync(DB_PATH)
    ? new SQL.Database(readFileSync(DB_PATH))
    : new SQL.Database();

  ensureSchema(_db);
  return _db;
}

/**
 * Create any missing tables, and self-heal a pre-release `runs` table whose
 * columns predate the analytics fields. The old `runs` table was never written
 * to, so dropping it loses nothing — this avoids a manual DB delete on deploy.
 */
function ensureSchema(db) {
  // Drop a stale pre-release `runs` table FIRST — before running SCHEMA, whose
  // index references columns the old shape lacks (which would otherwise throw).
  const info = db.exec('PRAGMA table_info(runs)');
  const cols = info[0] ? info[0].values.map(r => r[1]) : [];
  if (cols.length && !cols.includes('series_json')) {
    db.run('DROP TABLE IF EXISTS runs');
  }

  db.run(SCHEMA);  // idempotent: CREATE TABLE/INDEX IF NOT EXISTS
  persist();
}

/** Call after any write to flush the in-memory DB to disk. */
export function persist() {
  if (!_db) return;
  const data = _db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

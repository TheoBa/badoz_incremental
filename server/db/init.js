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

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
    _db.run(SCHEMA);
    persist();
  }

  return _db;
}

/** Call after any write to flush the in-memory DB to disk. */
export function persist() {
  if (!_db) return;
  const data = _db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

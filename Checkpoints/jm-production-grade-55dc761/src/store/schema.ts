// src/store/schema.ts — the store spine (bible §7.9 / discovery §7).
// One sqlite file per index; FTS5 for text; every verb writes a run row.

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
  id           INTEGER PRIMARY KEY,
  path         TEXT NOT NULL UNIQUE,
  size         INTEGER NOT NULL,
  mtime        INTEGER NOT NULL,
  sha256       TEXT,
  kind         TEXT,
  text_indexed INTEGER NOT NULL DEFAULT 0,
  state        TEXT NOT NULL DEFAULT 'new',
  indexed_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_state ON files(state);
CREATE INDEX IF NOT EXISTS idx_files_size  ON files(size);
CREATE TABLE IF NOT EXISTS docs (
  id      INTEGER PRIMARY KEY,
  file_id INTEGER NOT NULL,
  path    TEXT NOT NULL,
  text    TEXT NOT NULL
);
CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(text, path);
CREATE TABLE IF NOT EXISTS tags (
  id        INTEGER PRIMARY KEY,
  path      TEXT NOT NULL,
  name      TEXT NOT NULL,
  value     TEXT NOT NULL,
  prob      REAL,
  judged_at TEXT
);
CREATE TABLE IF NOT EXISTS runs (
  id         INTEGER PRIMARY KEY,
  verb       TEXT NOT NULL,
  args_json  TEXT NOT NULL,
  started    TEXT NOT NULL,
  ended      TEXT,
  status     TEXT NOT NULL,
  stats_json TEXT,
  cost_usd   REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS decisions (
  id           INTEGER PRIMARY KEY,
  scenario_ref TEXT,
  question     TEXT,
  answer_json  TEXT,
  conf         REAL,
  policy       TEXT,
  context_ref  TEXT,
  at           TEXT
);
CREATE TABLE IF NOT EXISTS cache (
  fingerprint TEXT PRIMARY KEY,
  provider    TEXT,
  model       TEXT,
  schema_hash TEXT,
  state_hash  TEXT,
  answer_json TEXT,
  created_at  TEXT,
  hits        INTEGER NOT NULL DEFAULT 0
);
`;

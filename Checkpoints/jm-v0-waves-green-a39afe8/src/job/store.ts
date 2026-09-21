// src/job/store.ts — the per-job layout: ~/.jm/jobs/<id>/{queue.sqlite, ledger.jsonl, results/}.
// One store per job (bible T6). Never a repo, never shared mutable state.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";

export const jmHome = (): string => process.env.JM_HOME ?? join(process.env.HOME ?? ".", ".jm");
export const jobsDir = (): string => join(jmHome(), "jobs");
export const jobDir = (id: string): string => join(jobsDir(), id.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.\.+/g, "_").slice(0, 64));

export interface JobPaths { dir: string; dbPath: string; ledgerPath: string; resultsDir: string; }

export function openJob(id: string): { paths: JobPaths; db: Database } {
  const dir = jobDir(id);
  const resultsDir = join(dir, "results");
  mkdirSync(resultsDir, { recursive: true });
  const dbPath = join(dir, "queue.sqlite");
  const db = new Database(dbPath, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");   // contended writes WAIT, not fail-fast
  db.run(`
    CREATE TABLE IF NOT EXISTS queue (
      id          INTEGER PRIMARY KEY,
      fingerprint TEXT NOT NULL UNIQUE,      -- idempotency: the same item never lands twice
      kind        TEXT NOT NULL,
      payload     TEXT NOT NULL,
      state       TEXT NOT NULL DEFAULT 'pending',   -- pending | running | done | failed
      attempts    INTEGER NOT NULL DEFAULT 0,
      result      TEXT,
      error       TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_queue_state ON queue(state);
    CREATE TABLE IF NOT EXISTS job_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return { paths: { dir, dbPath, ledgerPath: join(dir, "ledger.jsonl"), resultsDir }, db };
}

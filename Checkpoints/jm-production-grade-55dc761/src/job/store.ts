// src/job/store.ts — the per-job layout: ~/.jm/jobs/<id>/{queue.sqlite, ledger.jsonl, results/}.
// One store per job (bible T6). Never a repo, never shared mutable state.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { Database } from "bun:sqlite";

export const jmHome = (): string => process.env.JM_HOME ?? join(process.env.HOME ?? ".", ".jm");
export const jobsDir = (): string => join(jmHome(), "jobs");
// THE SANITISER MUST NOT COLLAPSE ROWS ONTO SHARED STATE, AND MUST BE INJECTIVE (audit
// job/store.ts:9). Two measured defects: `id=""` and `id="."` both survived the replacements, and
// `join(jobsDir(), "")` / `join(jobsDir(), ".")` resolve to the **shared jobs root** — every job's
// queue.sqlite landing in ONE directory; and the sanitiser was not injective, so `"a/b"` and
// `"a b"` both became `a_b` and two different jobs silently shared a store. Measured after the
// fix: **zero** ids resolve to the shared root. (`".."` and `"..."` are handled by the `\.\.+`
// replacement, which turns them into `_` plus a digest; the empty/`.` cases are what needed the
// explicit refusal.) An already-safe id is returned UNCHANGED, so existing job directories keep
// their paths.
export const jobDir = (id: string): string => {
  const cleaned = id.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.\.+/g, "_").slice(0, 64);
  if (!cleaned || cleaned === ".") {
    throw new Error(`JM_JOB_ID_INVALID: ${JSON.stringify(id)} — a job id must produce a directory name (not empty, not ".")`);
  }
  if (cleaned === id) return join(jobsDir(), cleaned);
  const digest = createHash("sha256").update(id).digest("hex").slice(0, 8);
  return join(jobsDir(), `${cleaned.slice(0, 48)}-${digest}`);
};

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

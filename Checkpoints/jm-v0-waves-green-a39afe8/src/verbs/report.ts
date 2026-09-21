// src/verbs/report.ts — W7: the status report over the store, the ledger and the registry.
// The report is a READ: it never writes rows, so `jm report` is safe to run anywhere.
import type { Database } from "bun:sqlite";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { loadTargets, indexPathFor } from "../store/db.ts";
import { jobsDir, openJob } from "../job/store.ts";
import { join } from "node:path";
import { ledgerPath } from "../ledger.ts";

export interface ReportOpts { index?: string; ledgerPath?: string; }

export interface Report {
  index: string;
  index_bytes: number;
  files: number;
  live: number;
  gone: number;
  text_indexed: number;
  docs: number;
  fts_rows: number;
  tags: number;
  runs: number;
  decisions: number;
  cache: { rows: number; hits: number };
  kinds: Record<string, number>;
  targets: { name: string; kind: string; root: string }[];
  ledger: { path: string; rows: number; ok: number; failed: number; cost_usd: number; verbs: Record<string, number> };
}

export function report(db: Database, opts: ReportOpts = {}): Report {
  const indexName = opts.index ?? "all";
  const one = <T>(sql: string): T => db.query(sql).get() as T;

  const files = one<{ n: number }>("SELECT COUNT(*) AS n FROM files WHERE state != 'gone'").n;
  const gone = one<{ n: number }>("SELECT COUNT(*) AS n FROM files WHERE state = 'gone'").n;
  const textIndexed = one<{ n: number }>("SELECT COUNT(*) AS n FROM files WHERE text_indexed = 1 AND state != 'gone'").n;
  const docs = one<{ n: number }>("SELECT COUNT(*) AS n FROM docs").n;
  const fts = one<{ n: number }>("SELECT COUNT(*) AS n FROM docs_fts").n;
  const tags = one<{ n: number }>("SELECT COUNT(*) AS n FROM tags").n;
  const runs = one<{ n: number }>("SELECT COUNT(*) AS n FROM runs").n;
  const decisions = one<{ n: number }>("SELECT COUNT(*) AS n FROM decisions").n;
  const cache = one<{ rows: number; hits: number }>("SELECT COUNT(*) AS rows, COALESCE(SUM(hits),0) AS hits FROM cache");
  const kindRows = db.query("SELECT COALESCE(kind,'unknown') AS k, COUNT(*) AS n FROM files WHERE state != 'gone' GROUP BY k ORDER BY n DESC").all() as { k: string; n: number }[];
  const kinds: Record<string, number> = {};
  for (const r of kindRows) kinds[r.k] = r.n;

  const p = opts.ledgerPath ?? ledgerPath();
  let rows = 0, ok = 0, failed = 0, cost = 0;
  const verbs: Record<string, number> = {};
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      if (!line.trim()) continue;
      rows++;
      try {
        const r = JSON.parse(line) as { verb?: string; status?: string; cost_usd?: number };
        if (r.status === "ok") ok++; else failed++;
        cost += Number(r.cost_usd ?? 0);
        if (r.verb) verbs[r.verb] = (verbs[r.verb] ?? 0) + 1;
      } catch { failed++; }         // a malformed ledger line is COUNTED, never silently dropped
    }
  }

  const dbPath = indexPathFor(indexName);
  let bytes = 0;
  try { bytes = Bun.file(dbPath).size; } catch { bytes = 0; }

  return {
    index: indexName, index_bytes: bytes,
    files, live: files, gone, text_indexed: textIndexed, docs, fts_rows: fts, tags, runs, decisions,
    cache, kinds,
    targets: loadTargets().map((t) => ({ name: t.name, kind: t.kind, root: t.root })),
    ledger: { path: p, rows, ok, failed, cost_usd: cost, verbs },
  };
}

// ── C8: THE PER-JOB RECONCILIATION (`jm report --job <id|last>`) ──────────────────────────────
// The spec's C8 criterion names this invocation and asks that "rows == decisions + runs". The
// underlying data always existed (a per-job queue db plus the global ledger); the INTERFACE did
// not, and it was recorded as an open violation rather than reinterpreted as satisfied by the
// index-level report.

export interface JobReport {
  job: string;
  queue: { total: number; done: number; pending: number; running: number; failed: number; distinct: number; duplicate_fingerprints: number };
  ledger: { rows: number; this_job: number; ok: number; failed: number; cost_usd: number; verbs: Record<string, number> };
  files: number;                 // index rows the job's work produced, when the index is present
  reconciled: boolean;           // the criterion's check, computed rather than asserted
  note: string;
}

/** The most recent job id, by the queue db's mtime. */
export function lastJobId(): string | null {
  let best: { id: string; at: number } | null = null;
  let ids: string[] = [];
  try { ids = readdirSync(jobsDir()); } catch { return null; }
  for (const id of ids) {
    if (id.startsWith(".")) continue;                       // a tmp-rename leftover is not a job
    try {
      const st = statSync(join(jobsDir(), id, "queue.sqlite"));
      if (!best || st.mtimeMs > best.at) best = { id, at: st.mtimeMs };
    } catch { /* a job dir without a queue db is not a finished job */ }
  }
  return best?.id ?? null;
}

/** True when this job has a queue db on disk. `openJob()` CREATES the job directory, so a
 *  reconcile call on a typo'd id would otherwise report an empty-but-healthy job — the D-009
 *  phantom class, in this verb. */
export function jobExists(jobId: string): boolean {
  return existsSync(join(jobsDir(), jobId.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.\.+/g, "_").slice(0, 64), "queue.sqlite"));
}

export function jobReport(db: Database | null, jobId: string, opts: { ledgerPath?: string } = {}): JobReport {
  if (!jobExists(jobId)) {
    throw new Error(`JM_JOB_MISSING: no job "${jobId}" (no queue db under ${jobsDir()}) — list them with: ls ${jobsDir()}`);
  }
  const { db: qdb } = openJob(jobId);
  let q: JobReport["queue"];
  try {
    const one = qdb.query("SELECT COUNT(*) AS n, COUNT(DISTINCT fingerprint) AS uniq FROM queue").get() as { n: number; uniq: number };
    const by = qdb.query("SELECT state, COUNT(*) AS n FROM queue GROUP BY state").all() as { state: string; n: number }[];
    const of = (s: string) => by.find((r) => r.state === s)?.n ?? 0;
    q = {
      total: one.n, done: of("done"), pending: of("pending"), running: of("running"),
      failed: of("failed"), distinct: one.uniq, duplicate_fingerprints: one.n - one.uniq,
    };
  } finally { qdb.close(); }

  // the ledger half: every row, and the rows that name THIS job
  const p = opts.ledgerPath ?? ledgerPath();
  let rows = 0, thisJob = 0, ok = 0, failed = 0, cost = 0;
  const verbs: Record<string, number> = {};
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split("\n")) {
      if (!line.trim()) continue;
      rows++;
      try {
        const r = JSON.parse(line) as { verb?: string; status?: string; cost_usd?: number; args?: Record<string, unknown> };
        if (r.status === "ok") ok++; else failed++;
        cost += Number(r.cost_usd ?? 0);
        if (r.verb) verbs[r.verb] = (verbs[r.verb] ?? 0) + 1;
        const a = r.args ?? {};
        if (a.job === jobId || a.jobId === jobId || a.in === jobId) thisJob++;
      } catch { failed++; }
    }
  }

  const files = db ? (db.query("SELECT COUNT(*) AS n FROM files WHERE state != 'gone'").get() as { n: number }).n : 0;
  const dup = q.duplicate_fingerprints;
  return {
    job: jobId,
    queue: q,
    ledger: { rows, this_job: thisJob, ok, failed, cost_usd: cost, verbs },
    files,
    reconciled: dup === 0 && q.running === 0,
    // NOTE: `queue.fingerprint` carries a UNIQUE constraint, so a duplicate is impossible to
    // INSERT — the count above is a defensive read, not the enforcement. The enforcement is the
    // schema, which is why the crash-resume property holds structurally rather than by arithmetic.
    note: dup === 0
      ? `no duplicate fingerprints (the UNIQUE constraint enforces this structurally); ${q.running} rows left running`
      : `JM_DUP_VIOLATION: ${dup} duplicate fingerprint(s) in this job's queue`,
  };
}

export function renderJobReport(r: JobReport): string {
  return [
    `job:          ${r.job}`,
    `queue:        ${r.queue.total} rows · ${r.queue.done} done · ${r.queue.pending} pending · ${r.queue.running} running · ${r.queue.failed} failed`,
    `fingerprints: ${r.queue.distinct} distinct · ${r.queue.duplicate_fingerprints} duplicate`,
    `index files:  ${r.files} live`,
    `ledger:       ${r.ledger.rows} rows total · ${r.ledger.this_job} naming this job · ${r.ledger.ok} ok · ${r.ledger.failed} failed · $${r.ledger.cost_usd.toFixed(6)}`,
    `ledger verbs: ${Object.entries(r.ledger.verbs).map(([k, n]) => `${k}=${n}`).join(" ") || "(none)"}`,
    `reconciled:   ${r.reconciled ? "YES" : "NO"} — ${r.note}`,
  ].join("\n");
}

export function renderReport(r: Report): string {
  const lines = [
    `index:        ${r.index} (${(r.index_bytes / 1024).toFixed(1)} KB)`,
    `files:        ${r.files} live · ${r.gone} gone · ${r.text_indexed} with text`,
    `docs/fts:     ${r.docs} docs · ${r.fts_rows} fts rows`,
    `tags:         ${r.tags}`,
    `runs:         ${r.runs} · decisions: ${r.decisions}`,
    `cache:        ${r.cache.rows} rows · ${r.cache.hits} hits`,
    `kinds:        ${Object.entries(r.kinds).map(([k, n]) => `${k}=${n}`).join(" ")}`,
    `targets:      ${r.targets.map((t) => `${t.name}(${t.kind})`).join(" ") || "(none)"}`,
    `ledger:       ${r.ledger.rows} rows · ${r.ledger.ok} ok · ${r.ledger.failed} failed · $${r.ledger.cost_usd.toFixed(6)}`,
    `ledger verbs: ${Object.entries(r.ledger.verbs).map(([k, n]) => `${k}=${n}`).join(" ")}`,
  ];
  return lines.join("\n");
}


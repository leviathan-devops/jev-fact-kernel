// src/verbs/report.ts — W7: the status report over the store, the ledger and the registry.
// The report is a READ: it never writes rows, so `jm report` is safe to run anywhere.
import type { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { loadTargets, indexPathFor } from "../store/db.ts";
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


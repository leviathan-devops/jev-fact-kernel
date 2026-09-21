// src/targets.ts — W2 / S7+S8: the adapter set + `--in` resolution.
// The REGISTRY lives in src/store/db.ts (single writer: loadTargets/saveTargets/resolveTarget).
// This module never re-implements it — it adds the kinds and the multi-target resolver.
import { resolve as resolvePath } from "node:path";
import { homedir } from "node:os";
import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { loadTargets, type Target, type TargetKind } from "./store/db.ts";
import { openSource, rowsOf as sqliteRows, listTables } from "./adapters/sqlite.ts";
import { streamJsonl, streamJson, fileStat } from "./adapters/jsonl.ts";
import { indexFile, listFiles } from "./verbs/index.ts";

export type { Target, TargetKind };

export interface Enumerated {
  target: string;                     // the target name
  kind: TargetKind;
  ref: string;                        // the stable row identity (the store `files.path`)
  text: string;                       // the indexable text
  meta?: Record<string, unknown>;     // size/mtime/table/pk — whatever the kind knows
}

export interface Adapter {
  kind: TargetKind;
  enumerate(t: Target, opts?: { limit?: number }): AsyncGenerator<Enumerated>;
  text(item: Enumerated): string;
}

const expand = (p: string) => resolvePath(p.replace(/^~(?=\/|$)/, homedir()));

/** A target name is a NAMESPACE KEY, never a path fragment. A name like `../../evil` would
 *  otherwise prefix every stored row with `../` and collide with a sibling target's namespace
 *  (ADV-2 probe `test_adv_target_name_traversal_does_not_escape_the_store`). */
export function safeTargetName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.\.+/g, "_").replace(/^[._]+/, "_").slice(0, 64);
  const base = cleaned.length > 0 ? cleaned : "_";
  // COLLISION-PROOF: `same name` and `same/name` both sanitise to `same_name`, and two targets
  // sharing a key merge their row namespaces — 2 files became 1 row, silently (D-027, found by the
  // ADV-3 sweep; the same class as D-008, reached through the NAME instead of the path). When the
  // name needed changing at all, a short digest of the ORIGINAL disambiguates it. A name that was
  // already safe is returned UNCHANGED, so existing targets keep their keys.
  if (base === name) return base;
  return `${base.slice(0, 48)}-${createHash("sha256").update(name).digest("hex").slice(0, 8)}`;
}

/** `--in all` | `--in a,b` -> resolved targets. A missing name is LOUD (never a silent subset). */
export function targetsIn(spec: string | undefined): Target[] {
  const reg = loadTargets();
  const want = (spec ?? "all").trim();
  if (want === "all" || want === "") return reg;
  const names = want.split(",").map((s) => s.trim()).filter(Boolean);
  const out: Target[] = [];
  const missing: string[] = [];
  for (const n of names) {
    const t = reg.find((x) => x.name === n);
    if (t) out.push(t); else missing.push(n);
  }
  if (missing.length) throw new Error(`JM_TARGET_UNKNOWN: ${missing.join(",")} (have: ${reg.map((t) => t.name).join(",") || "none"})`);
  return out;
}

// ---------------------------------------------------------------- adapters (S7)

export const fsAdapter: Adapter = {
  kind: "fs",
  async *enumerate(t, opts = {}) {
    const root = expand(t.root);
    const o = (t.opts ?? {}) as { include?: string[]; exclude?: string[] };
    const files = listFiles(root, { include: o.include, exclude: o.exclude, limit: opts.limit });
    for (const abs of files) {
      const rel = abs.slice(root.length + 1);
      let st; try { st = fileStat(abs); } catch { continue; }
      // ref = "<safe-name>/<rel>": the SAME key indexFile writes, so enumerate and ingest agree.
      yield { target: t.name, kind: "fs", ref: `${safeTargetName(t.name)}/${rel}`, text: "", meta: { abs, size: st.size, mtimeMs: st.mtimeMs } };
    }
  },
  text: (item) => item.text,
};

export const jsonlAdapter: Adapter = {
  kind: "jsonl",
  async *enumerate(t, opts = {}) {
    const p = expand(t.root);
    const o = (t.opts ?? {}) as { limitPerTable?: number };
    const limit = opts.limit ?? o.limitPerTable ?? Infinity;
    const gen = p.endsWith(".json") ? streamJson(p, { limit }) : streamJsonl(p, { limit });
    for await (const row of gen) {
      yield { target: t.name, kind: "jsonl", ref: `${p}#L${row.line}`, text: row.text, meta: { line: row.line } };
    }
  },
  text: (item) => item.text,
};

export const sqliteAdapter: Adapter = {
  kind: "sqlite",
  async *enumerate(t, opts = {}) {
    const p = expand(t.root);
    const o = (t.opts ?? {}) as { tables?: string[]; limitPerTable?: number };
    const db = openSource(p);
    try {
      const tables = o.tables ?? listTables(db);
      const limit = opts.limit ?? o.limitPerTable ?? 10_000;
      for (const row of sqliteRows(db, tables, { limitPerTable: limit })) {
        const id = row.pk ?? String((row.row as Record<string, unknown> | undefined)?.rowid ?? "0");
        yield { target: t.name, kind: "sqlite", ref: `${p}#${row.table}/${id}`, text: row.text, meta: { table: row.table, pk: row.pk } };
      }
    } finally { db.close(); }
  },
  text: (item) => item.text,
};

export const ADAPTERS: Record<TargetKind, Adapter> = { fs: fsAdapter, jsonl: jsonlAdapter, sqlite: sqliteAdapter };

export function adapterFor(kind: string): Adapter {
  const a = ADAPTERS[kind as TargetKind];
  if (!a) throw new Error(`JM_ADAPTER_UNKNOWN: ${kind} (have: ${Object.keys(ADAPTERS).join(",")})`);
  return a;
}

// ---------------------------------------------------------------- ingest

export interface IngestStats { target: string; kind: TargetKind; rows: number; changed: number; textIndexed: number; ms: number; }

/** Index ONE target through its adapter. fs targets reuse indexFile (the hash/incremental spine);
 *  row targets (jsonl/sqlite) land in files+docs with the synthetic ref as the path. */
export async function ingestTarget(db: Database, t: Target, opts: { limit?: number } = {}): Promise<IngestStats> {
  const t0 = Date.now();
  let rows = 0, changed = 0, textIndexed = 0;
  const root = expand(t.root);
  if (t.kind === "fs") {
    for await (const it of fsAdapter.enumerate(t, opts)) {
      rows++;
      try {
        const r = indexFile(db, root, String((it.meta as { abs: string }).abs), { prefix: `${safeTargetName(t.name)}/` });
        if (r.changed) changed++;
        if (r.textIndexed) textIndexed++;
      } catch { /* one bad file never aborts the batch */ }
    }
    return { target: t.name, kind: t.kind, rows, changed, textIndexed, ms: Date.now() - t0 };
  }
  const ad = adapterFor(t.kind);
  const now = new Date().toISOString();
  const insFile = db.query("INSERT INTO files (path,size,mtime,sha256,kind,text_indexed,state,indexed_at) VALUES (?,?,?,?,?,?,'new',?) ON CONFLICT(path) DO UPDATE SET size=excluded.size, mtime=excluded.mtime, sha256=excluded.sha256, kind=excluded.kind, text_indexed=excluded.text_indexed, state='new', indexed_at=excluded.indexed_at RETURNING id");
  // Per-row mirror of indexFile's write path (docs + docs_fts), NOT a global FTS rebuild:
  // a full-table rebuild is O(corpus) per ingest and would make incremental ingest a lie.
  const delDocs = db.query("DELETE FROM docs WHERE path = ?");
  const delFts = db.query("DELETE FROM docs_fts WHERE path = ?");
  const insDoc = db.query("INSERT INTO docs (file_id,path,text) VALUES (?,?,?)");
  const insFts = db.query("INSERT INTO docs_fts(text, path) VALUES (?,?)");
  const priorSha = db.query("SELECT sha256, state FROM files WHERE path = ?");
  const tx = db.transaction((batch: Enumerated[]) => {
    for (const it of batch) {
      const text = ad.text(it);
      const sha = createHash("sha256").update(text).digest("hex");
      const prior = priorSha.get(it.ref) as { sha256: string | null; state: string } | null;
      if (prior && prior.sha256 === sha && prior.state !== "gone") { rows++; continue; }   // row unchanged: skip the write
      const size = Buffer.byteLength(text, "utf8");
      const id = (insFile.get(it.ref, size, 0, sha, `${it.kind}:${it.target}`, 1, now) as { id: number }).id;
      delDocs.run(it.ref);
      delFts.run(it.ref);
      insDoc.run(id, it.ref, text);
      insFts.run(text, it.ref);
      rows++; changed++; textIndexed++;
    }
  });
  let batch: Enumerated[] = [];
  for await (const it of ad.enumerate(t, opts)) {
    batch.push(it);
    if (batch.length >= 500) { tx(batch); batch = []; }
  }
  if (batch.length) tx(batch);
  return { target: t.name, kind: t.kind, rows, changed, textIndexed, ms: Date.now() - t0 };
}

/** `--in` end to end: every resolved target through its adapter, aggregated. */
export async function ingestAll(db: Database, spec: string | undefined, opts: { limit?: number } = {}): Promise<IngestStats[]> {
  const out: IngestStats[] = [];
  for (const t of targetsIn(spec)) out.push(await ingestTarget(db, t, opts));
  return out;
}

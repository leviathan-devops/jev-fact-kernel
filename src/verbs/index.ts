// src/verbs/index.ts — the index verb: walk · hash · incremental · tombstones.
// Deterministic op: NO network, NO key (bible L4 / T9). Ledger row written by the CLI.
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { createHash } from "node:crypto";
import type { Database } from "bun:sqlite";

export interface IndexOpts {
  include?: string[];
  exclude?: string[];
  maxTextBytes?: number;   // text indexed into FTS5 only under this size
  maxHashBytes?: number;   // content hashed only under this size
  limit?: number;          // stop after N files (testing)
  // The store's `files.path` is UNIQUE. Two targets with the same relative path (README.md,
  // index.ts, ...) would COLLIDE and silently lose rows, so a multi-target ingest passes
  // "<target>/" here and every stored path is namespaced by its target.
  prefix?: string;
}

export interface IndexStats {
  files: number; changed: number; gone: number; textIndexed: number;
  bytesHashed: number; skipped: number; lastError?: string;
  ms: number; truncated: boolean; name: string; root: string;
}

const DEFAULT_EXCLUDE = ["node_modules", ".git", ".venv", "dist", "target", "__pycache__"];
const TEXT_EXT = new Set([".md", ".txt", ".json", ".jsonl", ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".toml", ".yml", ".yaml", ".sh", ".sql", ".csv", ".c", ".h", ".cpp", ".hpp", ".java", ".go", ".rb", ".php", ".html", ".css", ".scss", ".xml", ".mdx", ".vue", ".svelte", ".kt", ".swift"]);

function globToRe(g: string): RegExp {
  const esc = g.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".")
    .replace(/\u0000/g, ".*");
  return new RegExp(`^${esc}$`);
}

function matchesAny(rel: string, pats?: string[]): boolean {
  if (!pats || pats.length === 0) return false;
  const base = rel.split("/").pop() ?? rel;
  return pats.some((p) => {
    if (!p.includes("*") && !p.includes("?")) return base === p || rel === p;   // anchored: "test" must NOT match "latest"
    const re = globToRe(p);
    return re.test(rel) || re.test(base);   // `*.json` matches basenames at ANY depth
  });
}

function walk(root: string, opts: IndexOpts, out: string[] = []): string[] {
  const excl = [...DEFAULT_EXCLUDE, ...(opts.exclude ?? [])];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: string[];
    try { entries = readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (excl.some((e) => name === e)) continue;
      const full = join(dir, name);
      let st; try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) { stack.push(full); continue; }
      if (!st.isFile()) continue;
      const rel = relative(root, full);
      if (opts.include && opts.include.length > 0 && !matchesAny(rel, opts.include)) continue;
      if (matchesAny(rel, opts.exclude)) continue;
      out.push(full);
      if (opts.limit && out.length >= opts.limit) return out;
    }
  }
  return out;
}

const sha = (buf: Uint8Array | string) => createHash("sha256").update(buf).digest("hex");

export interface OneFileResult { rel: string; changed: boolean; textIndexed: boolean; bytesHashed: number; truncated: boolean; }

/** Index ONE file (the unit the queue and the batch walker share). Idempotent by (size,mtime)+sha. */
export function indexFile(db: Database, root: string, abs: string, opts: IndexOpts = {}): OneFileResult {
  const maxText = opts.maxTextBytes ?? 262_144;
  const maxHash = opts.maxHashBytes ?? 8 * 1024 * 1024;
  const rel = (opts.prefix ?? "") + relative(root, abs);
  const st = statSync(abs);
  const now = new Date().toISOString();
  const prev = db.query("SELECT id, size, mtime, state FROM files WHERE path = ?").get(rel) as { id: number; size: number; mtime: number; state: string } | null;
  if (prev && prev.size === st.size && prev.mtime === Math.floor(st.mtimeMs) && prev.state !== "gone") {
    return { rel, changed: false, textIndexed: false, bytesHashed: 0, truncated: false };  // incremental skip
  }
  // a tombstoned file with IDENTICAL bytes must REACTIVATE (the skip must not respect the tombstone)
  const ext = extname(rel).toLowerCase();
  const kind = TEXT_EXT.has(ext) ? "text" : "binary";
  let digest: string | null = null, text: string | null = null, bytesHashed = 0, truncated = false;
  if (st.size <= maxHash) {
    const buf = readFileSync(abs);
    bytesHashed = buf.byteLength;
    digest = sha(buf);
    if (kind === "text" && st.size <= maxText) text = buf.toString("utf8"); else if (kind === "text") truncated = true;
  } else truncated = true;
  const ti = text !== null ? 1 : 0;
  if (prev) {
    db.query("UPDATE files SET size=?, mtime=?, sha256=?, kind=?, text_indexed=?, state=?, indexed_at=? WHERE path=?")
      .run(st.size, Math.floor(st.mtimeMs), digest, kind, ti, "changed", now, rel);
    db.query("DELETE FROM docs WHERE file_id = ?").run(prev.id);
    db.query("DELETE FROM docs_fts WHERE path = ?").run(rel);
  } else {
    db.query("INSERT INTO files(path, size, mtime, sha256, kind, text_indexed, state, indexed_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(rel, st.size, Math.floor(st.mtimeMs), digest, kind, ti, "new", now);
  }
  if (text !== null) {
    const row = db.query("SELECT id FROM files WHERE path = ?").get(rel) as { id: number };
    db.query("INSERT INTO docs(file_id, path, text) VALUES (?,?,?)").run(row.id, rel, text);
    db.query("INSERT INTO docs_fts(text, path) VALUES (?,?)").run(text, rel);
  }
  return { rel, changed: true, textIndexed: text !== null, bytesHashed, truncated };
}

/** List the absolute paths a walk yields (shared by the batch and queued paths). */
export function listFiles(root: string, opts: IndexOpts = {}): string[] { return walk(root, opts); }

export function indexTarget(db: Database, name: string, root: string, opts: IndexOpts = {}): IndexStats {
  const prefix = opts.prefix ?? "";
  const t0 = Date.now();
  const maxText = opts.maxTextBytes ?? 262_144;      // 256 KB
  const maxHash = opts.maxHashBytes ?? 8 * 1024 * 1024; // 8 MB
  const paths = walk(root, opts);
  const now = new Date().toISOString();

  let changed = 0, textIndexed = 0, bytesHashed = 0, truncated = false, skipped = 0, lastError: string | undefined;
  const seen = new Set<string>();

  const tx = db.transaction(() => {
    for (const full of paths) {
      const rel = prefix + relative(root, full);
      seen.add(rel);
      try {
        const r = indexFile(db, root, full, { ...opts, maxTextBytes: maxText, maxHashBytes: maxHash });
        if (r.changed) changed++;
        if (r.textIndexed) textIndexed++;
        bytesHashed += r.bytesHashed;
        if (r.truncated) truncated = true;
      } catch (err) { skipped++; lastError = String(err).slice(0, 120); }   // one bad file never aborts the batch
    }
    const all = db.query("SELECT path FROM files WHERE state != 'gone'").all() as { path: string }[];
    const gone = db.query("UPDATE files SET state='gone', indexed_at=? WHERE path=?");
    for (const r of all) if (!seen.has(r.path)) gone.run(now, r.path);
  });
  tx();

  const total = (db.query("SELECT COUNT(*) AS n FROM files WHERE state != 'gone'").get() as { n: number }).n;
  const goneCount = (db.query("SELECT COUNT(*) AS n FROM files WHERE state = 'gone'").get() as { n: number }).n;
  return {
    files: total, changed, gone: goneCount, textIndexed, bytesHashed, skipped, lastError,
    ms: Date.now() - t0, truncated, name, root,
  };
}

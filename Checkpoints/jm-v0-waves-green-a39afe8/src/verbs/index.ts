// src/verbs/index.ts — the index verb: walk · hash · incremental · tombstones.
// Deterministic op: NO network, NO key (bible L4 / T9). Ledger row written by the CLI.
import { closeSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { join, relative, extname, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Database } from "bun:sqlite";
import { loadTargets, reconcileRoots } from "../store/db.ts";

export interface IndexOpts {
  include?: string[];
  exclude?: string[];
  maxTextBytes?: number;   // the CHUNK size for FTS5 text (a larger file is SPLIT, not skipped)
  maxChunkSourceBytes?: number;   // a text file above this is not read at all (bounded work)
  maxHashBytes?: number;   // content hashed only under this size
  limit?: number;          // stop after N files (testing)
  // The store's `files.path` is UNIQUE. Two targets with the same relative path (README.md,
  // index.ts, ...) would COLLIDE and silently lose rows, so a multi-target ingest passes
  // "<target>/" here and every stored path is namespaced by its target.
  prefix?: string;
  rebuild?: boolean;   // authorise replacing a DIFFERENT root-set in this index
}

export interface IndexStats {
  files: number; changed: number; gone: number; textIndexed: number;
  bytesHashed: number; skipped: number; lastError?: string;
  ms: number; truncated: boolean; name: string; root: string;
  // set ONLY when the tombstone sweep was deliberately not run, so `gone=0` can never be read as
  // "nothing was deleted" when the truth is "deletion was not checked" (D-061).
  sweep_skipped?: string;
}

const DEFAULT_EXCLUDE = ["node_modules", ".git", ".venv", "dist", "target", "__pycache__"];
const TEXT_EXT = new Set([".md", ".txt", ".json", ".jsonl", ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".toml", ".yml", ".yaml", ".sh", ".sql", ".csv", ".c", ".h", ".cpp", ".hpp", ".java", ".go", ".rb", ".php", ".html", ".css", ".scss", ".xml", ".mdx", ".vue", ".svelte", ".kt", ".swift"]);

// THE CLASSIFIER SNIFFS; IT DOES NOT TRUST A WHITELIST (the second half of the capability gap).
// `TEXT_EXT` alone made every unrecognised extension BINARY, and a whitelist is always incomplete —
// MEASURED on the Graph Intelligence session directory: **63 `.log` files were unindexed and
// unsearchable**, which is exactly the content an operator pointing at a session tree wants to grep.
// So the rule is inverted: a file is TEXT unless it is a known binary container OR its first bytes
// carry a NUL (the reliable binary signal for everything else). The whitelist is kept as a fast path
// and as the authority for extensions that are text despite looking odd.
// A static string-keyed lookup table is a `Record`, not a `Set` (the project's ts-set-map rule).
const BINARY_EXT: Record<string, true> = {
  ".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".webp": true, ".ico": true,
  ".bmp": true, ".tiff": true, ".svgz": true, ".zip": true, ".gz": true, ".tgz": true,
  ".bz2": true, ".xz": true, ".zst": true, ".7z": true, ".rar": true, ".jar": true,
  ".war": true, ".pdf": true, ".doc": true, ".docx": true, ".xls": true, ".xlsx": true,
  ".ppt": true, ".pptx": true, ".odt": true, ".ods": true, ".mp3": true, ".mp4": true,
  ".mov": true, ".avi": true, ".mkv": true, ".webm": true, ".wav": true, ".flac": true,
  ".ogg": true, ".woff": true, ".woff2": true, ".ttf": true, ".otf": true, ".eot": true,
  ".so": true, ".dylib": true, ".dll": true, ".exe": true, ".o": true, ".a": true,
  ".class": true, ".pyc": true, ".wasm": true, ".bin": true, ".dat": true, ".db": true,
  ".sqlite": true, ".sqlite3": true, ".gguf": true, ".pt": true, ".onnx": true,
  ".safetensors": true, ".npy": true, ".npz": true, ".parquet": true, ".avro": true,
};

/** Is this file text? Extension first (fast, authoritative for the known cases), then a NUL sniff. */
function isTextFile(abs: string, ext: string): boolean {
  if (TEXT_EXT.has(ext)) return true;
  if (BINARY_EXT[ext] === true) return false;
  try {
    const fd = openSync(abs, "r");
    try {
      const buf = Buffer.alloc(8192);
      const n = readSync(fd, buf, 0, 8192, 0);
      for (let i = 0; i < n; i++) if (buf[i] === 0) return false;   // a NUL byte: binary
      return true;
    } finally { closeSync(fd); }
  } catch { return false; }        // unreadable is not text
}

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
  // A FILE root is ONE target, not an empty walk. (Second-operator drill G2b: `jm index <file>`
  // reported files=0 exit 0 — a silent no-op that read as success.)
  let rootStat; try { rootStat = statSync(root); } catch { throw new Error(`JM_INDEX_MISSING: ${root} does not exist`); }
  if (rootStat.isFile()) {
    if (opts.include && opts.include.length > 0 && !matchesAny(root.split("/").pop() ?? root, opts.include)) return out;
    out.push(root);
    return out;
  }
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
  // A FILE root: relative(file, file) is "" — the row would land under an empty path. The
  // basename is the identity in that case (and the stored path must never be empty).
  const base = relative(root, abs);
  const rel = (opts.prefix ?? "") + (base === "" ? (abs.split("/").pop() ?? abs) : base);
  const st = statSync(abs);
  const now = new Date().toISOString();
  const prev = db.query("SELECT id, size, mtime, state FROM files WHERE path = ?").get(rel) as { id: number; size: number; mtime: number; state: string } | null;
  if (prev && prev.size === st.size && prev.mtime === Math.floor(st.mtimeMs) && prev.state !== "gone") {
    return { rel, changed: false, textIndexed: false, bytesHashed: 0, truncated: false };  // incremental skip
  }
  // a tombstoned file with IDENTICAL bytes must REACTIVATE (the skip must not respect the tombstone)
  const ext = extname(rel).toLowerCase();
  const kind = isTextFile(abs, ext) ? "text" : "binary";
  let digest: string | null = null, text: string | null = null, bytesHashed = 0, truncated = false;
  if (st.size <= maxHash) {
    const buf = readFileSync(abs);
    bytesHashed = buf.byteLength;
    digest = sha(buf);
  } else truncated = true;
  // A LARGE TEXT FILE IS CHUNKED, NOT DROPPED (the capability gap this tool was pointed at a
  // 37.9 MB session to find). The old rule was `size <= maxText ? index : truncated`, so EVERY text
  // file over the cap had `text_indexed=0` and was INVISIBLE to `query --fts` while still appearing
  // in `files` — a silent, total loss of searchability. MEASURED on the Graph Intelligence session
  // directory: **86 of 124 files unindexed, including the 37.9 MB transcript itself** — the one file
  // the operator wanted to search. The `files` row is unchanged (one per file, the identity); the
  // CONTENT is split into `maxText`-sized docs, so the FTS bound holds while nothing is lost.
  // A file larger than `maxChunkSource` is still skipped, and says so via `truncated`.
  const maxChunkSource = opts.maxChunkSourceBytes ?? 64 * 1024 * 1024;
  if (kind === "text" && st.size <= maxChunkSource) {
    text = readFileSync(abs).toString("utf8");
    if (st.size > maxText) truncated = true;     // still REPORTED: the file was chunked, not whole
  } else if (kind === "text") truncated = true;
  const ti = text !== null ? 1 : 0;
  if (prev) {
    db.query("UPDATE files SET size=?, mtime=?, sha256=?, kind=?, text_indexed=?, state=?, indexed_at=? WHERE path=?")
      .run(st.size, Math.floor(st.mtimeMs), digest, kind, ti, "changed", now, rel);
    // PURGE BY THE DOC'S OWN PATHS, not by `rel`: a chunked file's fts rows carry `rel#c0`, `rel#c1`, …
    // so a `WHERE path = rel` delete would leave every chunk behind in the FTS index — searchable text
    // for a file that no longer has a doc. The docs rows are the authority on which paths belong to
    // this file, so the FTS delete is driven by them.
    db.query("DELETE FROM docs_fts WHERE path IN (SELECT path FROM docs WHERE file_id = ?)").run(prev.id);
    db.query("DELETE FROM docs WHERE file_id = ?").run(prev.id);
  } else {
    db.query("INSERT INTO files(path, size, mtime, sha256, kind, text_indexed, state, indexed_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(rel, st.size, Math.floor(st.mtimeMs), digest, kind, ti, "new", now);
  }
  if (text !== null) {
    const row = db.query("SELECT id FROM files WHERE path = ?").get(rel) as { id: number };
    // CHUNK THE CONTENT. One doc per `maxText` slice, each with its own path (`rel#c0`, `rel#c1`, …), so
    // the FTS5 bound is respected per-doc while the WHOLE file is searchable. A single-chunk file keeps
    // the bare `rel`, so existing indexes and every `query` result are unchanged.
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxText) chunks.push(text.slice(i, i + maxText));
    if (chunks.length === 0) chunks.push("");
    const insDoc = db.query("INSERT INTO docs(file_id, path, text) VALUES (?,?,?)");
    const insFts = db.query("INSERT INTO docs_fts(text, path) VALUES (?,?)");
    for (let ci = 0; ci < chunks.length; ci++) {
      const cpath = chunks.length === 1 ? rel : `${rel}#c${ci}`;
      insDoc.run(row.id, cpath, chunks[ci]);
      insFts.run(chunks[ci], cpath);
    }
  }
  return { rel, changed: true, textIndexed: text !== null, bytesHashed, truncated };
}

/** List the absolute paths a walk yields (shared by the batch and queued paths). */
export function listFiles(root: string, opts: IndexOpts = {}): string[] { return walk(root, opts); }

export function indexTarget(db: Database, name: string, root: string, opts: IndexOpts = {}): IndexStats {
  // A BARE-PATH WALK OWNS THE `path:<root>` IDENTITY (see reconcileRoots). The CLI resolves the root
  // before this call, so it is already absolute; one call site, one namespace.
  reconcileRoots(db, [{ prefix: opts.prefix ?? "", root: resolve(root) }], opts.rebuild ?? false);
  const prefix = opts.prefix ?? "";
  const t0 = Date.now();
  const maxText = opts.maxTextBytes ?? 262_144;      // 256 KB
  const maxHash = opts.maxHashBytes ?? 8 * 1024 * 1024; // 8 MB
  const paths = walk(root, opts);
  const now = new Date().toISOString();

  let changed = 0, textIndexed = 0, bytesHashed = 0, truncated = false, skipped = 0, lastError: string | undefined;
  const seen = new Set<string>();

  // the sweep is a TRANSACTION BODY, so anything it decides to skip is recorded here and folded
  // into the returned stats after the commit.
  let sweepSkipped: string | undefined;
  const tx = db.transaction(() => {
    for (const full of paths) {
      const base = relative(root, full);
      const rel = prefix + (base === "" ? (full.split("/").pop() ?? full) : base);
      seen.add(rel);
      try {
        const r = indexFile(db, root, full, { ...opts, maxTextBytes: maxText, maxHashBytes: maxHash });
        if (r.changed) changed++;
        if (r.textIndexed) textIndexed++;
        bytesHashed += r.bytesHashed;
        if (r.truncated) truncated = true;
      } catch (err) { skipped++; lastError = String(err).slice(0, 120); }   // one bad file never aborts the batch
    }
    // THE SWEEP IS SCOPED, AND A TRUNCATED WALK NEVER TOMBSTONES (D-060/D-061).
    //
    // Two measured data-loss defects, both from the same over-broad rule "not seen this run means
    // gone":
    //
    //  D-061 — `jm index <dir> --limit 1` marked the files it did NOT WALK as gone. `--limit` is a
    //          CAP; treating "not visited" as "deleted" destroyed index entries on a performance
    //          flag. A truncated walk is not evidence of anything.
    //  D-060 — `jm index @A --name combined` tombstoned AND PURGED every row belonging to target B.
    //          A per-target refresh of a multi-source index destroyed the other sources.
    //
    // The rule now: a run may only tombstone paths inside ITS OWN NAMESPACE. `prefix` names that
    // namespace for a multi-source ingest; when it is empty the run walked a bare root, so every
    // OTHER target's `<name>/` prefix is foreign and off-limits. A path the run cannot prove it
    // produced is left alone — a stale row is a wart, a purged row is lost data.
    const truncatedByLimit = Boolean(opts.limit) && paths.length >= (opts.limit ?? 0);
    if (truncatedByLimit) {
      sweepSkipped = "walk truncated by --limit: an unvisited file is not a deleted file";
    } else {
      const ownPrefix = opts.prefix ?? "";
      const foreignPrefixes = ownPrefix !== ""
        ? []
        : loadTargets().map((t: { name: string }) => `${t.name}/`).filter((p: string) => p !== ownPrefix);
      const all = db.query("SELECT path FROM files WHERE state != 'gone'").all() as { path: string }[];
      const gone = db.query("UPDATE files SET state='gone', indexed_at=? WHERE path=?");
      // THE TOMBSTONE PURGES THE TEXT, it does not only flag the file (H-9). `UPDATE files SET
      // state='gone'` alone left the file's `docs` and `docs_fts` rows in the store forever:
      // queries stopped SERVING them (the read joins on state), but the deleted content stayed on
      // disk in the index — MEASURED: a removed file's text was still in `docs` after the
      // re-index. For a tool pointed at arbitrary corpora that is retained data nobody asked to
      // keep, and `docs_fts` is a STANDALONE fts5 table (it holds its own copy of the text), so it
      // needs its own delete. Found by the audit (H-9).
      const purgeDocs = db.query("DELETE FROM docs WHERE path = ?");
      const purgeFts = db.query("DELETE FROM docs_fts WHERE path = ?");
        for (const r of all) {
          const inOwnNamespace = (ownPrefix === "" || r.path.startsWith(ownPrefix)) && !foreignPrefixes.some((f: string) => r.path.startsWith(f));
          if (!inOwnNamespace || seen.has(r.path)) continue;
          // A PATH THE RUN'S OWN FILTERS WOULD NOT ADMIT IS NOT A DELETION CANDIDATE (audit
          // index.ts:74). `--include`/`--exclude` NARROW THE WALK, so an excluded file is never
          // `seen` — and the sweep read that as "deleted". MEASURED: `jm index <dir> --include '*.md'`
          // marked the previously indexed `b.txt` gone AND PURGED its text. The rule is the same one
          // `--limit` needed (D-061): **"not seen this run" is only evidence of deletion if the run
          // would have seen it.** A path the filter excludes is simply out of scope, so it is left
          // alone; a deleted file the filter WOULD admit is still tombstoned.
          const rel = ownPrefix !== "" && r.path.startsWith(ownPrefix) ? r.path.slice(ownPrefix.length) : r.path;
          if (opts.include && opts.include.length > 0 && !matchesAny(rel, opts.include)) continue;
          if (matchesAny(rel, opts.exclude)) continue;
          gone.run(now, r.path); purgeDocs.run(r.path); purgeFts.run(r.path);
        }
    }
  });
  tx();

  const total = (db.query("SELECT COUNT(*) AS n FROM files WHERE state != 'gone'").get() as { n: number }).n;
  const goneCount = (db.query("SELECT COUNT(*) AS n FROM files WHERE state = 'gone'").get() as { n: number }).n;
  return {
    files: total, changed, gone: goneCount, textIndexed, bytesHashed, skipped, lastError,
    ms: Date.now() - t0, truncated, name, root,
    // present ONLY when the sweep was deliberately not run, so `gone=0` can never be read as
    // "nothing was deleted" when the truth is "deletion was not checked" (D-061).
    sweep_skipped: sweepSkipped,
  };
}

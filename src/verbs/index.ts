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
}

export interface IndexStats {
  files: number; changed: number; gone: number; textIndexed: number;
  bytesHashed: number; ms: number; truncated: boolean; name: string; root: string;
}

const DEFAULT_EXCLUDE = ["node_modules", ".git", ".venv", "dist", "target", "__pycache__"];
const TEXT_EXT = new Set([".md", ".txt", ".json", ".jsonl", ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".toml", ".yml", ".yaml", ".sh", ".sql", ".csv"]);

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
    if (!p.includes("*") && !p.includes("?")) return rel.includes(p) || base === p;
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

export function indexTarget(db: Database, name: string, root: string, opts: IndexOpts = {}): IndexStats {
  const t0 = Date.now();
  const maxText = opts.maxTextBytes ?? 262_144;      // 256 KB
  const maxHash = opts.maxHashBytes ?? 8 * 1024 * 1024; // 8 MB
  const paths = walk(root, opts);
  const now = new Date().toISOString();

  const getFile = db.query("SELECT id, size, mtime, sha256 FROM files WHERE path = ?");
  const insFile = db.query("INSERT INTO files(path, size, mtime, sha256, kind, text_indexed, state, indexed_at) VALUES (?,?,?,?,?,?,?,?)");
  const updFile = db.query("UPDATE files SET size=?, mtime=?, sha256=?, kind=?, text_indexed=?, state=?, indexed_at=? WHERE path=?");
  const delDocs = db.query("DELETE FROM docs WHERE file_id = ?");
  const delFts = db.query("DELETE FROM docs_fts WHERE path = ?");
  const insDoc = db.query("INSERT INTO docs(file_id, path, text) VALUES (?,?,?)");
  const insFts = db.query("INSERT INTO docs_fts(text, path) VALUES (?,?)");

  let changed = 0, textIndexed = 0, bytesHashed = 0, truncated = false;
  const seen = new Set<string>();

  const tx = db.transaction(() => {
    for (const full of paths) {
      const rel = relative(root, full);
      seen.add(rel);
      const st = statSync(full);
      const mtime = Math.floor(st.mtimeMs);
      const prev = getFile.get(rel) as { id: number; size: number; mtime: number; sha256: string | null } | null;
      if (prev && prev.size === st.size && prev.mtime === mtime) continue; // unchanged → skip (C2)

      const ext = extname(rel).toLowerCase();
      const kind = TEXT_EXT.has(ext) ? "text" : "binary";
      let digest: string | null = null;
      let text: string | null = null;
      if (st.size <= maxHash) {
        const buf = readFileSync(full);
        bytesHashed += buf.byteLength;
        digest = sha(buf);
        if (kind === "text" && st.size <= maxText) text = buf.toString("utf8");
        else if (kind === "text") truncated = true;
      } else {
        truncated = true; // too large to hash this pass — recorded, never silent
      }
      const ti = text !== null ? 1 : 0;
      if (prev) {
        updFile.run(st.size, mtime, digest, kind, ti, "changed", now, rel);
        delDocs.run(prev.id); delFts.run(rel);
        changed++;
      } else {
        insFile.run(rel, st.size, mtime, digest, kind, ti, "new", now);
        changed++;
      }
      if (text !== null) {
        const row = getFile.get(rel) as { id: number };
        insDoc.run(row.id, rel, text);
        insFts.run(text, rel);
        textIndexed++;
      }
    }
    // tombstones: rows not seen in this walk
    const all = db.query("SELECT path FROM files WHERE state != 'gone'").all() as { path: string }[];
    const gone = db.query("UPDATE files SET state='gone', indexed_at=? WHERE path=?");
    for (const r of all) if (!seen.has(r.path)) gone.run(now, r.path);
  });
  tx();

  const total = (db.query("SELECT COUNT(*) AS n FROM files WHERE state != 'gone'").get() as { n: number }).n;
  const goneCount = (db.query("SELECT COUNT(*) AS n FROM files WHERE state = 'gone'").get() as { n: number }).n;
  return {
    files: total, changed, gone: goneCount, textIndexed, bytesHashed,
    ms: Date.now() - t0, truncated, name, root,
  };
}

// src/verbs/cluster.ts — W3/S10: group candidates by (source, kind, token-signature, path).
// NO MODEL. The same input always yields the same groups in the same order.
import type { Database } from "bun:sqlite";
import type { Candidate } from "./scan.ts";

export interface ClusterOpts {
  minSize?: number;          // drop groups smaller than this (default 2)
  tokenTop?: number;         // signature size (default 6)
  maxExemplars?: number;     // exemplars kept per cluster (default 5)
}

export interface Cluster {
  key: string;
  source: string;            // the target/index source prefix the rows came from
  kind: string;              // the row kind (text | sqlite:x | jsonl:x ...)
  signature: string[];       // the top token set that defines the group
  n: number;
  exemplars: { path: string; hits: number }[];
}

export interface ClusterResult { clusters: Cluster[]; grouped: number; ungrouped: number; small: number; ms: number; }

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "not", "but", "you", "your"]);

/** A token signature: the top-N most frequent non-stop tokens >= 4 chars. */
export function signatureOf(texts: string[], top: number): string[] {
  const freq = new Map<string, number>();
  for (const t of texts) {
    for (const w of t.toLowerCase().split(/[^a-z0-9_]+/)) {
      if (w.length < 4 || STOP.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))     // deterministic tie-break
    .slice(0, top)
    .map(([w]) => w);
}

/** The source prefix of a ref: the path before '#' (a row ref) or the file's directory. */
function sourceOf(path: string): string {
  const beforeHash = path.split("#")[0];
  const slash = beforeHash.lastIndexOf("/");
  return slash > 0 ? beforeHash.slice(0, slash) : ".";
}

export function clusterIndex(db: Database, candidates: Candidate[], opts: ClusterOpts = {}): ClusterResult {
  const t0 = Date.now();
  const minSize = opts.minSize ?? 2;
  const tokenTop = opts.tokenTop ?? 6;
  const maxExemplars = opts.maxExemplars ?? 5;
  const textStmt = db.query("SELECT text FROM docs WHERE path = ?");

  // bucket by (source, kind) first — the deterministic partition, then signature within it
  const buckets = new Map<string, { path: string; hits: number; kind: string; source: string; text: string }[]>();
  for (const c of candidates) {
    const row = db.query("SELECT kind FROM files WHERE path = ?").get(c.path) as { kind: string | null } | null;
    const kind = row?.kind ?? "unknown";
    const source = sourceOf(c.path);
    const doc = textStmt.get(c.path) as { text: string } | null;
    const key = `${source}\u0000${kind}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({ path: c.path, hits: c.hits, kind, source, text: doc?.text ?? c.excerpt });
  }

  const clusters: Cluster[] = [];
  let grouped = 0;
  for (const [key, items] of buckets) {
    const sig = signatureOf(items.map((i) => i.text), tokenTop);
    const sigKey = sig.join("|");
    const clusterKey = sigKey.length > 0 ? `${key}\u0000${sigKey}` : key;
    clusters.push({
      key: clusterKey,
      source: items[0].source,
      kind: items[0].kind,
      signature: sig,
      n: items.length,
      exemplars: items.slice(0, maxExemplars).map((i) => ({ path: i.path, hits: i.hits })),
    });
    if (items.length >= minSize) grouped += items.length;
  }
  clusters.sort((a, b) => (b.n - a.n) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  // Keep every cluster (a cluster of n=1 is still a cluster); `minSize` only decides what counts
  // as GROUPED. A display filter belongs to the caller, not the verb.
  const small = clusters.filter((c) => c.n < minSize).length;
  return {
    clusters,
    small,
    grouped,
    ungrouped: candidates.length - grouped,
    ms: Date.now() - t0,
  };
}

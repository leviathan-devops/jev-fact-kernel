// src/verbs/find.ts — THE FIND CHAIN (S11 / bible §6.18.3):
//   pick → seed → fetch → narrow → judge → rerank → cluster → label → emit
// Deterministic where it can be; Jev only for "is this an instance of X?".
import { writeFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { Judge } from "../judge/client.ts";
import { runPool } from "../pools/pool.ts";
import { Budget } from "../pools/budget.ts";
import { queryIndex, type QueryRow } from "./query.ts";

export interface FindOpts {
  phrase: string; common?: number; structure?: "md" | "json"; minP?: number;
  limit?: number; concurrency?: number; budgetCalls?: number; outPath?: string; maxExcerpt?: number;
}

export interface Pattern {
  name: string; n: number; sources: string[]; exemplars: { path: string; p: number; quote: string }[];
  signature: string; tokens: string[];
}

export interface FindResult {
  phrase: string; seeds: string[]; fetched: number; narrowed: number; judged: number;
  kept: number; clusters: number; calls: number; costUsd: number; budgetStopped: boolean;
  patterns: Pattern[]; out?: string; trend: string;
}

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "what", "when", "where", "which", "have", "has", "was", "were", "are", "its", "its", "bug", "issue"]);

export async function find(db: Database, opts: FindOpts): Promise<FindResult> {
  const budget = new Budget({ calls: opts.budgetCalls });
  const judge = new Judge(db, {});
  const minP = opts.minP ?? 0.8;
  const maxExcerpt = opts.maxExcerpt ?? 1200;
  let calls = 0, costUsd = 0, budgetStopped = false;

  // 2 SEEDS — deterministic tokenisation (no model)
  const seeds = Array.from(new Set(opts.phrase.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 3 && !STOP.has(t))));
  if (seeds.length === 0) seeds.push(opts.phrase.toLowerCase());

  // 3 FETCH — BM25/FTS per seed, deduped by path
  const seen = new Map<string, QueryRow>();
  for (const s of seeds) for (const r of queryIndex(db, { fts: s, limit: opts.limit ?? 100 })) if (!seen.has(r.path)) seen.set(r.path, r);

  // 4 NARROW — cap the judge surface (the ≥100× cut lives here in aggregate use)
  const candidates = Array.from(seen.values()).slice(0, opts.limit ?? 100);

  // 5 JUDGE — one Noul per candidate over a bounded excerpt
  const judged: { row: QueryRow; p: number; quote: string }[] = [];
  const { errors: poolErrors } = await runPool(candidates, async (c) => {
    if (budgetStopped) return null;
    if (!budget.roomLeft()) { budgetStopped = true; return null; }
    const doc = db.query("SELECT text FROM docs WHERE path = ?").get(c.path) as { text: string } | null;
    const excerpt = (doc?.text ?? "").slice(0, maxExcerpt);
    const res = await judge.ask({ target_phrase: opts.phrase, candidate: { path: c.path, excerpt } },
      { is_instance: { type: "noul", instructions: `Is this an instance of "${opts.phrase}" given the excerpt?` } }, "find@v1");
    const p = (res.answers.is_instance as { noul?: number })?.noul ?? 0;
    if (!res.cached) { calls++; costUsd += res.costUsd; budget.spend(res.costUsd); }   // cached hits consume no budget slot
    if (p >= minP) judged.push({ row: c, p, quote: excerpt.slice(0, 160) });
    return null;
  }, { concurrency: opts.concurrency ?? 6 });

  const noKey = poolErrors.find((e) => e.error.includes("JEV_NO_KEY"));
  if (noKey) throw new Error(noKey.error);          // FAIL-CLOSED
  // 6 RERANK — by probability (code sorts; no model)
  judged.sort((a, b) => b.p - a.p);

  // 7 CLUSTER — deterministic signature: kind + top path tokens
  const clusters = new Map<string, { row: QueryRow; p: number; quote: string }[]>();
  for (const j of judged) {
    const toks = j.row.path.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    const sig = `${j.row.kind ?? "?"}:${toks.slice(0, 2).join("-") || "root"}`;
    if (!clusters.has(sig)) clusters.set(sig, []);
    clusters.get(sig)!.push(j);
  }

  // 8 LABEL — the cluster's dominant tokens (deterministic, never generated)
  const patterns: Pattern[] = [];
  for (const [sig, members] of clusters) {
    const freq = new Map<string, number>();
    for (const m of members) for (const t of m.row.path.toLowerCase().split(/[^a-z0-9]+/)) if (t.length > 3 && !STOP.has(t)) freq.set(t, (freq.get(t) ?? 0) + 1);
    const tokens = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
    patterns.push({
      name: tokens.slice(0, 2).join(" ") || sig, n: members.length,
      sources: Array.from(new Set(members.map((m) => m.row.path.split("/")[0]))),
      exemplars: members.slice(0, 3).map((m) => ({ path: m.row.path, p: m.p, quote: m.quote })),
      signature: sig, tokens,
    });
  }
  patterns.sort((a, b) => b.n - a.n);

  // 9 EMIT — the requested structure or an error (L10)
  const structure = opts.structure ?? "md";
  let out: string | undefined;
  if (opts.outPath) {
    if (structure === "json") writeFileSync(opts.outPath, JSON.stringify({ phrase: opts.phrase, patterns }, null, 2));
    else {
      const lines = [`# Patterns for: ${opts.phrase}`, "", `clusters: ${patterns.length} · kept: ${judged.length}`, ""];
      for (const p of patterns) {
        lines.push(`## ${p.name}  (n=${p.n})`);
        lines.push(`sources: ${p.sources.join(", ")}`);
        for (const e of p.exemplars) lines.push(`- [p=${e.p.toFixed(2)}] ${e.path} — "${e.quote.replace(/\s+/g, " ").slice(0, 120)}"`);
        lines.push("");
      }
      writeFileSync(opts.outPath, lines.join("\n"));
    }
    out = opts.outPath;
  }
  return {
    phrase: opts.phrase, seeds, fetched: seen.size, narrowed: candidates.length, judged: judged.length,
    kept: judged.length, clusters: patterns.length, calls, costUsd, budgetStopped, patterns, out,
    trend: `${seen.size} → ${candidates.length} → ${judged.length} → ${patterns.length}`,
  };
}

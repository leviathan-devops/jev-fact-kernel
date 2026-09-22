// src/verbs/find.ts — THE FIND CHAIN (S11 / bible §6.18.3):
//   pick → seed → fetch → narrow → judge → rerank → cluster → label → emit
// Deterministic where it can be; Jev only for "is this an instance of X?".
import { writeFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { Judge } from "../judge/client.ts";
import { runPool } from "../pools/pool.ts";
import { Budget } from "../pools/budget.ts";
import { queryIndex, type QueryRow } from "./query.ts";
import { excerptAround, quoteAround, seedsOf } from "./excerpt.ts";
import { fatalJudgeError, noulFrom } from "../judge/policy.ts";

export interface FindOpts {
  phrase: string; common?: number; structure?: "md" | "json"; minP?: number;
  failOpen?: boolean;   // explicit opt-in: degrade with marked rows instead of refusing
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
  /** Patterns dropped for having support below `common` (observable, never silent). */
  belowCommon: number;
}

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "what", "when", "where", "which", "have", "has", "was", "were", "are", "its", "its", "bug", "issue"]);

export async function find(db: Database, opts: FindOpts): Promise<FindResult> {
  const budget = new Budget({ calls: opts.budgetCalls });
  const judge = new Judge(db, {});
  const minP = opts.minP ?? 0.8;
  const maxExcerpt = opts.maxExcerpt ?? 1200;
  let calls = 0, costUsd = 0, budgetStopped = false;

  // 2 SEEDS — deterministic tokenisation (no model)
  const seeds = seedsOf(opts.phrase);

  // 3 FETCH — BM25/FTS per seed, ROUND-ROBIN, deduped by path.
  //
  // Seed-by-seed with a slice was a MONOPOLY: the candidate set was built in seed order and then
  // truncated, so if the first seed had >= limit hits, the others contributed NOTHING. Measured on
  // the real corpus: "theatrical enforcement claim" (seeds theatrical=345, enforcement=361,
  // claim=486 hits) produced 100 candidates, ALL of them from `theatrical` — the chain then judged
  // one token's hits and reported patterns for the whole phrase. (D-033, the same class as D-031/32:
  // the stage that decides was not shown evidence for the thing it was asked about.)
  const limit = opts.limit ?? 100;
  const perSeed = seeds.map((s) => queryIndex(db, { fts: s, limit }));
  const seen = new Map<string, QueryRow>();
  for (let rank = 0; rank < limit; rank++) {
    for (const list of perSeed) {
      const r = list[rank];
      if (!r) continue;
      if (!seen.has(r.path)) seen.set(r.path, r);
      if (seen.size >= limit) break;
    }
    if (seen.size >= limit) break;
  }
  // a seed whose hits are exhausted above still contributes anything it has (a short list)
  for (const list of perSeed) for (const r of list) if (!seen.has(r.path) && seen.size < limit) seen.set(r.path, r);

  // The TREND's first number is "how many rows the seeds could reach", which is a different fact
  // from "how many candidates we will judge" — the round-robin above caps the map at `limit`, so
  // the union is counted separately rather than reported as the capped size.
  const union = new Set<string>();
  for (const list of perSeed) for (const r of list) union.add(r.path);

  // 4 NARROW — cap the judge surface (the ≥100× cut lives here in aggregate use)
  const candidates = Array.from(seen.values()).slice(0, limit);

  // 5 JUDGE — one Noul per candidate over a bounded excerpt
  const judged: { row: QueryRow; p: number; quote: string }[] = [];
  const { errors: poolErrors } = await runPool(candidates, async (c) => {
    if (budgetStopped) return null;
    if (!budget.claim()) { budgetStopped = true; return null; }   // SYNC claim before the await (D-024)
    // EVERY CLAIM IS RELEASED ON EVERY EXIT (audit find.ts:93 — the SAME leak I fixed in
    // `decision-tree.ts` and did not sweep for here). `claim()` increments `pending`, which
    // `roomLeft()` counts, and only `settle()` releases it. Without a `finally`, a worker that
    // THROWS — a judge outage (`judge.ask` rejects), or `noulFrom` refusing an unusable answer —
    // exits with the claim held, so the budget leaks one slot per failed row and then reports a
    // FALSE "budget exhausted". Instance count of this class: **eight.**
    let settled = false;
    try {
    const doc = db.query("SELECT text FROM docs WHERE path = ?").get(c.path) as { text: string } | null;
    // THE EXCERPT MUST CONTAIN THE MATCH (D-031). Taking the document HEAD meant the judge was
    // asked "is this an instance of X?" while being shown text that did not contain X — measured
    // on the real corpus: the three seeded documents held the phrase at char 1267, 1267 and 9224,
    // all OUTSIDE a 1200-char head slice, so every true positive was judged `no` and the chain
    // returned `209 -> 100 -> 0 -> 0` for EVERY phrase. For a structured corpus (JSON session
    // logs) the head is metadata noise, which is exactly the corpus R2 targets.
    const text = doc?.text ?? "";
    const excerpt = excerptAround(text, seeds, maxExcerpt);
    const res = await judge.ask({ target_phrase: opts.phrase, candidate: { path: c.path, excerpt } },
      { is_instance: { type: "noul", instructions: `Is this an instance of "${opts.phrase}" given the excerpt?` } }, "find@v1");
    const p = noulFrom(res.answers, "is_instance");   // by SHAPE, never a bare `?? 0` (D-042)
    budget.settle(res.costUsd, res.cached);
    settled = true;
    if (res.usageMissing) throw new Error(`JM_JUDGE_USAGE_MISSING: the response carried no usage block, so this call cannot be costed — a budget cannot be enforced against an unmeasured cost (D-046)`);   // cached hits refund the claim; a real call converts it
    if (!res.cached) { calls++; costUsd += res.costUsd; }
    if (p >= minP) judged.push({ row: c, p, quote: quoteAround(text, seeds, 160) });
    } finally {
      // A refund is not a purchase: `settle(0, true)` is the release-WITHOUT-spend branch, which is
      // exactly what "this claim produced no measured call" means (measured in EN-083: `settle(0,
      // false)` calls `spend(0)` — INCREMENTING the call count and billing a call that failed).
      if (!settled) budget.settle(0, true);
    }
    return null;
  }, { concurrency: opts.concurrency ?? 6 });

  // FAIL-CLOSED FOR EVERY JUDGE FAILURE, not just a missing key (D-041): under a 500 this verb
  // returned `0 patterns` with a plausible trend — an empty search indistinguishable from a
  // completed one.
  const fatal = fatalJudgeError(poolErrors, { failOpen: opts.failOpen });
  if (fatal) throw new Error(fatal);
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
  // 9 SUPPORT FILTER -- `--common N` (default 2) is the MINIMUM support a pattern needs. It was
  // accepted in FindOpts and documented in the MCP schema, and the implementation IGNORED it, so
  // a caller asking for n>=2 received n=1 patterns. (D-025, caught by the C5 pin.)
  const common = opts.common ?? 2;
  const dropped = patterns.filter((x) => x.n < common).length;
  const supported = patterns.filter((x) => x.n >= common);
  patterns.length = 0;
  patterns.push(...supported);
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
    // `judged` = how many candidates RECEIVED a judge call; `kept` = how many passed `--min-p`.
    // They are different numbers, and the type names them as numbers (audit find.ts:158).
    phrase: opts.phrase, seeds, fetched: seen.size, narrowed: candidates.length, judged: candidates.length,
    kept: judged.length, clusters: patterns.length, calls, costUsd, budgetStopped, patterns, out,
    belowCommon: dropped,
    // 9 THE TREND — the operator-facing chain. `judged` AND `kept` ARE SEPARATE NUMBERS
    // (audit find.ts:158): the field used to be `judged: judged.length`, and `judged` is populated
    // ONLY for rows with `p >= minP` — so it was literally `kept.length`, and the trend reported the
    // KEPT count under the label "judged". Every candidate in `narrowed` receives a judge call, so
    // things JUDGED = `candidates.length`; things KEPT = `judged.length`.
    //
    // THE FORMAT KEEPS ITS CONTRACT: the four leading numbers stay space-arrow separated and
    // positionally parseable (`split(" → ").map(Number)`, which the find suite relies on), and the
    // labels are APPENDED after them. A trend that changes shape to become clearer breaks every
    // reader that was already parsing it.
    trend: `${union.size} → ${candidates.length} → ${judged.length} → ${patterns.length}` +
      `   (seeds → candidates → KEPT → patterns; ${candidates.length} judged, ${judged.length} kept)`,
  };
}

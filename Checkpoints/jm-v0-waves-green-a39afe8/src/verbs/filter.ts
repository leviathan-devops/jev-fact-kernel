// src/verbs/filter.ts — scan + filter: deterministic narrowing first, then one judgment per row.
// (L1/T9: Jev sees only the survivors; the FTS pass did the narrowing.)
import type { Database } from "bun:sqlite";
import { Judge } from "../judge/client.ts";
import { runPool } from "../pools/pool.ts";
import { Budget } from "../pools/budget.ts";
import { excerptAround, seedsOf } from "./excerpt.ts";
import { fatalJudgeError, noulFrom } from "../judge/policy.ts";
import { queryIndex } from "./query.ts";

export interface FilterOpts {
  fts?: string; where?: string; limit?: number;
  question: string; minP?: number; concurrency?: number; budgetCalls?: number;
  failOpen?: boolean;   // explicit opt-in: degrade with marked rows instead of refusing
  maxExcerpt?: number;
}

export interface FilterRow { path: string; size: number; p: number; keep: boolean; reason: string; cached: boolean; }
export interface FilterResult { candidates: number; judged: number; kept: number; kept_rows: FilterRow[]; calls: number; costUsd: number; budgetStopped: boolean;
  /** HTTP REQUESTS made. `calls` counts judged items; this counts round trips — the batching proof. */
  requests: number; }

export async function filterIndex(db: Database, opts: FilterOpts): Promise<FilterResult> {
  const candidates = queryIndex(db, { fts: opts.fts, where: opts.where, limit: opts.limit ?? 200 });
  const seeds = opts.fts ? seedsOf(opts.fts) : [];
  const judge = new Judge(db, {});
  const budget = new Budget({ calls: opts.budgetCalls });
  const minP = opts.minP ?? 0.8;
  const cap = opts.maxExcerpt ?? 1500;
  let calls = 0, costUsd = 0, budgetStopped = false;
  const rows: FilterRow[] = [];

  // ── THE BATCH JUDGING PATH (MEASURED: 400 questions in ONE request, 2.39s, time FLAT in n) ──
  //
  // WHAT THIS REPLACED: `runPool(candidates, …, {concurrency:6})` with one `judge.ask` per candidate —
  // 98 candidates meant 98 HTTP requests. The API's `questions` is a map the CALLER keys ("You choose
  // each key; answers come back under the same keys" — docs.typesafe.ai/api), so N candidates are N
  // questions in ONE request. Measured this session: n=400 in one request at 2.39s with time flat in
  // n, and a wrapped batch agreeing with the serial answers 8/8 at 9x the speed. The pool is gone —
  // there is nothing to parallelize when one call does the whole chunk.
  const metaByPath = new Map<string, { path: string; size: number }>();
  const items: { id: string; state: unknown }[] = [];
  for (const c of candidates) {
    if (!budget.claim()) { budgetStopped = true; break; }   // SYNC claim before the await (D-024)
    const doc = db.query("SELECT text FROM docs WHERE path = ?").get(c.path) as { text: string } | null;
    // THE EXCERPT MUST CONTAIN THE MATCH (D-032) — unchanged; the seed-aware helper still runs per row.
    const excerpt = excerptAround(doc?.text ?? "", seeds, cap);
    items.push({ id: c.path, state: { candidate: { path: c.path, size: c.size, excerpt } } });
    metaByPath.set(c.path, { path: c.path, size: c.size });
  }
  let batch: Awaited<ReturnType<typeof judge.askManyBatch>>;
  try {
    batch = await judge.askManyBatch(items, { match: { type: "noul", instructions: opts.question } }, "is-x@v1");
  } catch (err) {
    for (let i = 0; i < items.length; i++) budget.settle(0, true);   // a batch that did not answer judged nothing
    // FAIL-CLOSED FOR EVERY JUDGE FAILURE, not just a missing key (D-041): under a 500 this verb
    // returned `kept=0 judged=0` — an empty result indistinguishable from a considered answer.
    const fatal = fatalJudgeError([{ error: err instanceof Error ? err.message : String(err) }], { failOpen: opts.failOpen });
    if (fatal) throw new Error(fatal);
    return { candidates: candidates.length, judged: 0, kept: 0, kept_rows: [], calls: 0, costUsd: 0, budgetStopped, requests: 0 };
  }
  if (batch.usageMissing > 0) {
    for (let i = 0; i < items.length; i++) budget.settle(0, true);
    throw new Error(`JM_JUDGE_USAGE_MISSING: the response carried no usage block, so this call cannot be costed — a budget cannot be enforced against an unmeasured cost (D-046)`);
  }
  const cachedSet = new Set(batch.cachedKeys);
  // THE COST IS SHARED, NOT DUPLICATED: one request billed `usage`, so each asked item carries its
  // share, and summing the shares reproduces the batch's real cost exactly.
  const share = batch.asked > 0 ? batch.costUsd / batch.asked : 0;
  for (const it of items) {
    const k = `${it.id}__match`;
    const cached = cachedSet.has(k);
    budget.settle(cached ? 0 : share, cached);        // a cached pair REFUNDS (EN-083); an asked pair converts
    const a = batch.answers[k];
    if (a === undefined) continue;                    // no answer is not an answer
    if (!cached) { calls++; costUsd += share; }
    const p = noulFrom({ match: a }, "match");        // by SHAPE, never a bare `?? 0` (D-042)
    const keep = p >= minP;
    const m = metaByPath.get(it.id)!;
    rows.push({ path: m.path, size: m.size, p, keep, reason: keep ? "kept" : `p<${minP}`, cached });
  }
  const kept = rows.filter((r) => r.keep).sort((a, b) => b.p - a.p);
  // `judged` = candidates that PRODUCED A JUDGEMENT; `kept` = those that passed `--min-p`. **The
  // distinction is real and must survive**: under a complete outage a healthy run shows
  // `candidates=6 judged=6 kept=N` while an outage shows `candidates=6 judged=0 kept=0` — which is
  // exactly the "considered answer vs empty result" signal D-041 added this check for.
  //
  // I CHANGED THIS TO `candidates.length` AND REVERTED IT. `find.ts:158`'s defect was that its
  // `judged` field was LITERALLY the same expression as `kept` (`judged.length`, where the array holds
  // only rows with `p >= minP`) — a duplicate. Here it is not a duplicate, so applying `find`'s fix
  // here would have DESTROYED the failure signal: every outage would report `judged=candidates`. **The
  // same audit note, read as one rule, was wrong for one of the two verbs.** The pin that caught it
  // was `test_filter_refuses_a_judge_outage`, asserting `candidates > judged` — an assertion that
  // encodes the distinction, and that my "fix" broke.
  return { candidates: candidates.length, judged: rows.length, kept: kept.length, kept_rows: kept, calls, costUsd, budgetStopped, requests: batch.requests };
}

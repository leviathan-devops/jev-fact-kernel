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
export interface FilterResult { candidates: number; judged: number; kept: number; kept_rows: FilterRow[]; calls: number; costUsd: number; budgetStopped: boolean; }

export async function filterIndex(db: Database, opts: FilterOpts): Promise<FilterResult> {
  const candidates = queryIndex(db, { fts: opts.fts, where: opts.where, limit: opts.limit ?? 200 });
  const seeds = opts.fts ? seedsOf(opts.fts) : [];
  const judge = new Judge(db, {});
  const budget = new Budget({ calls: opts.budgetCalls });
  const minP = opts.minP ?? 0.8;
  const cap = opts.maxExcerpt ?? 1500;
  let calls = 0, costUsd = 0, budgetStopped = false;
  const rows: FilterRow[] = [];

  const { errors } = await runPool(candidates, async (c) => {
    if (budgetStopped) return null;
    if (!budget.claim()) { budgetStopped = true; return null; }   // SYNC claim before the await (D-024)
    // EVERY CLAIM IS RELEASED ON EVERY EXIT (audit find.ts:93, swept here). `claim()` increments
    // `pending`, which `roomLeft()` counts, and only `settle()` releases it — so a worker that THROWS
    // (a judge outage, or `noulFrom` refusing an unusable answer) exited with the claim held, leaking
    // one budget slot per failed row and then reporting a FALSE "budget exhausted". This is the same
    // defect fixed in `decision-tree.ts`, and the sweep that should have followed it was the point.
    let settled = false;
    try {
    const doc = db.query("SELECT text FROM docs WHERE path = ?").get(c.path) as { text: string } | null;
    // THE EXCERPT MUST CONTAIN THE MATCH (D-032): the head slice sent the judge text that did not
    // contain the phrase that matched the row — measured on the real corpus, 4 of 6 candidates had
    // their hit OUTSIDE a 1500-char head slice, one of them at char 58,842. The seeds are the
    // phrase's tokens when the candidates came from --fts; a --where-only run has none, and the
    // helper falls back to the head, which is the best available answer for that case.
    const excerpt = excerptAround(doc?.text ?? "", seeds, cap);
    const res = await judge.ask({ candidate: { path: c.path, size: c.size, excerpt } },
      { match: { type: "noul", instructions: opts.question } }, "is-x@v1");
    const p = noulFrom(res.answers, "match");   // by SHAPE, never a bare `?? 0` (D-042)
    budget.settle(res.costUsd, res.cached);
    settled = true;
    if (res.usageMissing) throw new Error(`JM_JUDGE_USAGE_MISSING: the response carried no usage block, so this call cannot be costed — a budget cannot be enforced against an unmeasured cost (D-046)`);   // cached hits refund the claim; a real call converts it
    if (!res.cached) { calls++; costUsd += res.costUsd; }
    const keep = p >= minP;
    rows.push({ path: c.path, size: c.size, p, keep, reason: keep ? "kept" : `p<${minP}`, cached: res.cached });
    return rows[rows.length - 1];
    } finally {
      // A refund is not a purchase: `settle(0, true)` releases WITHOUT spending (EN-083 measured that
      // `settle(0, false)` calls `spend(0)`, incrementing the call count and billing a failed call).
      if (!settled) budget.settle(0, true);
    }
  }, { concurrency: opts.concurrency ?? 6 });

  // FAIL-CLOSED FOR EVERY JUDGE FAILURE, not just a missing key (D-041): under a 500 this verb
  // returned `kept=0 judged=0` — an empty result indistinguishable from a considered answer.
  const fatal = fatalJudgeError(errors, { failOpen: opts.failOpen });
  if (fatal) throw new Error(fatal);
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
  return { candidates: candidates.length, judged: rows.length, kept: kept.length, kept_rows: kept, calls, costUsd, budgetStopped };
}

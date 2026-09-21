// src/verbs/filter.ts — scan + filter: deterministic narrowing first, then one judgment per row.
// (L1/T9: Jev sees only the survivors; the FTS pass did the narrowing.)
import type { Database } from "bun:sqlite";
import { Judge } from "../judge/client.ts";
import { runPool } from "../pools/pool.ts";
import { Budget } from "../pools/budget.ts";
import { queryIndex } from "./query.ts";

export interface FilterOpts {
  fts?: string; where?: string; limit?: number;
  question: string; minP?: number; concurrency?: number; budgetCalls?: number;
  maxExcerpt?: number;
}

export interface FilterRow { path: string; size: number; p: number; keep: boolean; reason: string; cached: boolean; }
export interface FilterResult { candidates: number; judged: number; kept: number; kept_rows: FilterRow[]; calls: number; costUsd: number; budgetStopped: boolean; }

export async function filterIndex(db: Database, opts: FilterOpts): Promise<FilterResult> {
  const candidates = queryIndex(db, { fts: opts.fts, where: opts.where, limit: opts.limit ?? 200 });
  const judge = new Judge(db, {});
  const budget = new Budget({ calls: opts.budgetCalls });
  const minP = opts.minP ?? 0.8;
  const cap = opts.maxExcerpt ?? 1500;
  let calls = 0, costUsd = 0, budgetStopped = false;
  const rows: FilterRow[] = [];

  const { errors } = await runPool(candidates, async (c) => {
    if (budgetStopped) return null;
    if (!budget.roomLeft()) { budgetStopped = true; return null; }
    const doc = db.query("SELECT text FROM docs WHERE path = ?").get(c.path) as { text: string } | null;
    const excerpt = (doc?.text ?? "").slice(0, cap);
    const res = await judge.ask({ candidate: { path: c.path, size: c.size, excerpt } },
      { match: { type: "noul", instructions: opts.question } }, "is-x@v1");
    const p = (res.answers.match as { noul?: number })?.noul ?? 0;
    if (!res.cached) { calls++; costUsd += res.costUsd; }
    budget.spend(res.costUsd);
    const keep = p >= minP;
    rows.push({ path: c.path, size: c.size, p, keep, reason: keep ? "kept" : `p<${minP}`, cached: res.cached });
    return rows[rows.length - 1];
  }, { concurrency: opts.concurrency ?? 6 });

  const noKey = errors.find((e) => e.error.includes("JEV_NO_KEY"));
  if (noKey) throw new Error(noKey.error);          // FAIL-CLOSED: never a silent empty success
  const kept = rows.filter((r) => r.keep).sort((a, b) => b.p - a.p);
  return { candidates: candidates.length, judged: rows.length, kept: kept.length, kept_rows: kept, calls, costUsd, budgetStopped };
}

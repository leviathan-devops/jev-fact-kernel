// src/verbs/route.ts — W5/S13: the catalogue Choice. Decide WHICH capability should act.
//
// THE SHAPE OF THE QUESTION IS A MEASURED CONSTRAINT, NOT A PREFERENCE (D-034):
// the live Typesafe API accepts `noul` questions ONLY. Measured against the real endpoint:
//   noul    -> 200, a probability back
//   choice  -> HTTP 400 "Invalid request."
//   mcq     -> HTTP 400 "Invalid request."
// So a single "pick from this menu" question is NOT expressible, and this verb was non-functional
// against the real judge for the whole build — every test passed against a mock, which is exactly
// how the defect survived. The shipping shape is one `noul` per CANDIDATE ("does this capability
// apply to the task?"), which discriminates for real: on a find-a-phrase task the live API rated
// tool:jev_find 0.77 and skill:ascii-diagrams 0.10.
//
// A 456-entry catalogue cannot afford 456 calls, so a deterministic LEXICAL pre-score chooses the
// shortlist and the judge ranks it: deterministic-first, judged-second, the same shape as the rest
// of the engine.
import type { Database } from "bun:sqlite";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Judge } from "../judge/client.ts";
import { Budget } from "../pools/budget.ts";
import { reasonForSignal, noulFrom, DEFAULT_POLICY, type Policy } from "../judge/policy.ts";

export interface CatalogueEntry { id: string; kind: "skill" | "tool" | "model"; name: string; hint?: string; }
export interface Catalogue { entries: CatalogueEntry[]; sources: string[]; }

export interface RouteOpts {
  task: string;                 // the natural-language task the route must serve
  catalogue?: Catalogue;        // inject for tests; else built from disk
  policy?: Policy;
  context?: string;
  shortlist?: number;           // how many candidates the judge rates (default 12)
  budgetCalls?: number;         // a hard cap on judge calls for the shortlist
}

export interface Rated { id: string; p: number; }

export interface RouteResult {
  choice: string;               // the selected catalogue id ("" when the ladder escalates)
  route: "act" | "escalate" | "noop";   // "reject" is folded into "escalate" (same caller action)
  p: number;                    // the winner's probability
  runnerUp?: Rated;             // logged, always (the near-miss is the useful part)
  injection?: string;           // present ONLY on act
  candidates: number;           // the catalogue size
  shortlist: string[];          // what the lexical pre-score put in front of the judge
  rated: Rated[];               // every judged candidate, ranked
  calls: number;
  /** HTTP REQUESTS made. `calls` counts judged entries; this counts ROUND TRIPS — the batching proof. */
  requests: number;
  cached: boolean;
  costUsd: number;
  reason: string;
}

/** The live catalogue: skills on disk plus the tool names this engine exposes. */
export function buildCatalogue(indexName?: string): Catalogue {
  const sources: string[] = [];
  const entries: CatalogueEntry[] = [];

  const skillDirs = [
    join(homedir(), ".omp", "agent", "skills"),
    join(homedir(), ".omp", "agent", "managed-skills"),
  ];
  for (const dir of skillDirs) {
    if (!existsSync(dir)) continue;
    sources.push(dir);
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      entries.push({ id: `skill:${name}`, kind: "skill", name });
    }
  }

  for (const t of ["jev_query", "jev_find", "jev_decide", "jev_index"]) {
    entries.push({ id: `tool:${t}`, kind: "tool", name: t, hint: "JM engine tool" });
  }
  void indexName;

  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));   // deterministic menu order
  return { entries, sources };
}

/** The deterministic shortlist: token overlap between the task and a capability's name+hint.
 *  Ties break on id, so the same task always produces the same shortlist. */
export function shortlistOf(cat: Catalogue, task: string, k: number): CatalogueEntry[] {
  const taskTokens = new Set(task.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
  const scored = cat.entries.map((entry) => {
    const capTokens = `${entry.name} ${entry.hint ?? ""}`.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    return { entry, overlap: capTokens.filter((t) => taskTokens.has(t)).length };
  });
  scored.sort((a, b) => (b.overlap - a.overlap) || (a.entry.id < b.entry.id ? -1 : 1));
  return scored.slice(0, Math.min(k, scored.length)).map((x) => x.entry);
}

/** Ask the judge which capability should act. Fail polarity: no key -> throw (caller exits 2). */
export async function route(db: Database, opts: RouteOpts): Promise<RouteResult> {
  const cat = opts.catalogue ?? buildCatalogue();
  if (cat.entries.length === 0) throw new Error("JM_ROUTE_CATALOGUE_EMPTY: no skills, tools or models found");
  const policy = opts.policy ?? DEFAULT_POLICY;
  const budget = new Budget({ calls: opts.budgetCalls });

  const shortlist = shortlistOf(cat, opts.task, opts.shortlist ?? 12);
  const judge = new Judge(db, {});
  let calls = 0, costUsd = 0, cached = false;
  const rated: Rated[] = [];
  let stopped = false;

    // ── THE BATCH PATH (W2). MEASURED BEFORE: this loop made ONE HTTP REQUEST PER SHORTLIST ENTRY
    // — 12 entries, 12 requests — while the API takes N questions in ONE request (measured: n=400
    // in 2.39s, TIME FLAT in n). The capability VARIES PER ENTRY, so each entry becomes one
    // question whose `instructions.item` carries ITS OWN capability; the question TEXT stays
    // constant and refers to `item` — the documented shape ("put the data in the other fields and
    // refer to them by name in backticks" — docs.typesafe.ai/api).
    const items: { id: string; state: unknown }[] = [];
    for (const e of shortlist) {
      if (!budget.claim()) { stopped = true; break; }   // the same synchronous claim every pool uses
      items.push({ id: e.id, state: { task: opts.task, ...(opts.context ? { context: opts.context } : {}), capability: e.id } });
    }
    let requests = 0;
    if (items.length > 0) {
      let bd: Awaited<ReturnType<typeof judge.askManyBatch>>;
      try {
        bd = await judge.askManyBatch(
          items,
          { applies: { type: "noul", instructions: "Does the capability named in `item` apply to the task described in `item`? Answer with a probability in [0,1]." } },
          "route@v2",
        );
      } catch (err) {
        for (let i = 0; i < items.length; i++) budget.settle(0, true);   // nothing was judged
        throw err;   // route has no fail-open path; a judge failure is fatal here
      }
      if (bd.usageMissing > 0) {
        for (let i = 0; i < items.length; i++) budget.settle(0, true);
        throw new Error("JM_JUDGE_USAGE_MISSING: the response carried no usage block, so this call cannot be costed — a budget cannot be enforced against an unmeasured cost (D-046)");
      }
      requests = bd.requests;
      const cachedSet = new Set(bd.cachedKeys);
      const share = bd.asked > 0 ? bd.costUsd / bd.asked : 0;   // one request's cost, split across its entries
      for (const it of items) {
        const key = `${it.id}__applies`;
        const isCached = cachedSet.has(key);
        budget.settle(isCached ? 0 : share, isCached);
        const a = bd.answers[key];
        if (a === undefined) continue;                        // no answer is not an answer
        if (isCached) cached = true; else { calls++; costUsd += share; }
        rated.push({ id: it.id, p: noulFrom({ applies: a }, "applies") });   // by SHAPE (D-042)
      }
    }
  rated.sort((a, b) => (b.p - a.p) || (a.id < b.id ? -1 : 1));

  const winner = rated[0] ?? { id: "none", p: 0 };
  const runner = rated[1];
  const decided = reasonForSignal(winner.p, policy);   // the SAME ladder as decision-tree
  const inMenu = winner.id !== "none" && cat.entries.some((e) => e.id === winner.id);
  // "reject" folds to "escalate" (both hand the decision to a human), so the caller's action set
  // stays three-valued.
  const folded: RouteResult["route"] =
    decided.route === "act" ? (inMenu ? "act" : "escalate") : decided.route === "noop" ? "noop" : "escalate";
  const shortNote = stopped ? " (BUDGET_STOPPED: the shortlist was judged only in part)" : "";

  return {
    choice: folded === "act" ? winner.id : "",
    route: folded,
    p: winner.p,
    runnerUp: runner,
    injection: folded === "act"
      ? `[JM ROUTE] Use ${winner.id} (p=${winner.p.toFixed(3)}). Runner-up: ${runner ? `${runner.id} (p=${runner.p.toFixed(3)})` : "none"}.`
      : undefined,
    candidates: cat.entries.length,
    shortlist: shortlist.map((e) => e.id),
    rated,
    calls,
      requests,
    cached,
    costUsd,
    reason: folded === "act"
      ? `${winner.id} at p=${winner.p.toFixed(3)} >= act ${policy.act}${shortNote}`
      : !inMenu && decided.route === "act"
        ? `judge chose ${winner.id} at p=${winner.p.toFixed(3)} but it is NOT in the catalogue -> escalate`
        : `${decided.reason} -> ${folded}${shortNote}`,
  };
}

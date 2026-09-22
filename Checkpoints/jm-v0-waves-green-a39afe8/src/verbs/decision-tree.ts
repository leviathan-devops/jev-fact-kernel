// src/verbs/decision-tree.ts — the batch decision verb (S12).
// rows × one recipe → decisions + an escalation file; cache-first; fail-closed without a key.
import { readFileSync, writeFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { Judge } from "../judge/client.ts";
import type { JudgeResponse } from "../judge/transport.ts";
import { DEFAULT_POLICY, fatalJudgeError, reasonForSignal, type Policy } from "../judge/policy.ts";
import { runPool } from "../pools/pool.ts";
import { Budget } from "../pools/budget.ts";

export interface Recipe {
  recipe: string; version: number; status?: string;
  state_fields?: string[];
  questions: Record<string, unknown>;
  policy?: Partial<Policy>;
}

/** Validate a recipe BEFORE any work. A malformed recipe used to run to completion: no
 *  questions -> no judge calls -> every row `noop`, exit 0 — a silent wrong answer that reads as
 *  a successful triage (D-020). A recipe is a CLIENT artifact: a bad one is a client error. */
export function validateRecipe(r: unknown): Recipe {
  const o = r as Partial<Recipe> | null;
  if (!o || typeof o !== "object") throw new Error("JM_RECIPE_INVALID: not an object");
  if (typeof o.recipe !== "string" || o.recipe.length === 0) throw new Error("JM_RECIPE_INVALID: `recipe` must be a non-empty string");
  if (typeof o.version !== "number" || !Number.isFinite(o.version)) throw new Error("JM_RECIPE_INVALID: `version` must be a number");
  const q = o.questions;
  if (!q || typeof q !== "object" || Array.isArray(q) || Object.keys(q).length === 0) {
    throw new Error("JM_RECIPE_INVALID: `questions` must be a NON-EMPTY object (an empty one judges nothing and silently noops every row)");
  }
  for (const [name, question] of Object.entries(q as Record<string, unknown>)) {
    const t = (question as { type?: unknown } | null)?.type;
    // THE LIVE API ACCEPTS `noul` ONLY (D-034, measured against api.typesafe.ai: `choice` and
    // `mcq` both return HTTP 400 "Invalid request."). Accepting them here validated a shape that
    // cannot run — the validator was checking the recipe against the CODE's idea of the API rather
    // than against the API. A recipe using either type is refused AT LOAD, with the reason, instead
    // of failing later on every call.
    if (t !== "noul") {
      throw new Error(
        `JM_RECIPE_INVALID: question "${name}" has type ${JSON.stringify(t)} — the live judge accepts ` +
        `\"noul\" ONLY (measured: choice/mcq -> HTTP 400). Express a choice as one noul per candidate.`,
      );
    }
  }
  if (o.policy !== undefined) {
    const p = o.policy as Partial<Policy>;
    for (const [k, v] of Object.entries(p)) {
      if (k === "fail") {
        // `fail` WAS THE ONE POLICY FIELD EXEMPTED FROM VALIDATION, and it is a raw string from a
        // client-supplied recipe file. With a typo (`"Closed"`, `"closed "`, `"opne"`) NEITHER of
        // the run's polarity checks matched, so it silently degraded to FAIL-OPEN — the opposite of
        // the documented default, on the one field whose entire job is to decide what a failure
        // MEANS. Measured before the fix: fail="closed" refused the run; fail="Closed" COMPLETED it
        // with a marked row. In a decision engine that is the difference between an outage
        // producing a refusal and an outage producing decisions. Found by the audit (H-5).
        if (v !== "open" && v !== "closed") {
          throw new Error(
            `JM_RECIPE_INVALID: policy.fail must be exactly "open" or "closed" (got ${JSON.stringify(v)}) — ` +
            `a value outside that set silently degrades the run to FAIL-OPEN`,
          );
        }
        continue;
      }
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) throw new Error(`JM_RECIPE_INVALID: policy.${k} must be a number in [0,1]`);
    }
    if (p.act !== undefined && p.flag !== undefined && p.flag > p.act) throw new Error("JM_RECIPE_INVALID: policy.flag must not exceed policy.act");
  }
  return o as Recipe;
}

export interface DecisionRow {
  i: number; route: string; reason: string; answers: unknown; cached: boolean; model: string;
  /** The aggregate signal this row was routed on, or null when there WAS no signal (a degraded or
   *  errored row). Stored as the row's confidence — and `null` means "unknown", never 0, which
   *  would read as a confident negative. (D-043: this value used to be recovered by regex-parsing
   *  `reason`, so every degraded row silently stored conf=0.) */
  signal: number | null;
}

export interface DecisionTreeResult {
  rows: number; decisions: number; cached: number; calls: number; costUsd: number;
  bands: { act: number; escalate: number; noop: number };
  out?: string; escalationOut?: string; budgetStopped: boolean;
}

/** THE AGGREGATE SIGNAL, OR `null` WHEN THERE IS NONE (audit decision-tree.ts:85).
 *
 * The first version seeded `best = 0` and only raised it on a recognised field — so an answer whose
 * shape nothing matched returned **0, a confident "no"**, instead of "unknown". That is the same class
 * as D-039/D-042 (`answersToPolicyValue`'s sibling `noulFrom` already returns `null` on failure, and
 * `pOf` was fixed for exactly this), and it is the worse of the two shapes: a fabricated zero is
 * routed, banded and stored as a DECISION. `best = 0` also swallows a NON-FINITE value: `Math.max(0,
 * NaN)` is NaN, and `typeof NaN === "number"` let it through on the `noul` branch.
 *
 * Returning `null` lets the caller honour the fail polarity — refuse under `closed`, mark the row
 * under `open` — which is what the sibling verbs do with an unreadable answer. */
function answersToPolicyValue(answers: JudgeResponse["answers"]): number | null {
  let best: number | null = null;
  const raise = (v: unknown): void => {
    if (typeof v === "number" && Number.isFinite(v)) best = best === null ? v : Math.max(best, v);
  };
  for (const a of Object.values(answers)) {
    raise(a?.noul);
    if (a?.probabilities && typeof a.probabilities === "object") for (const v of Object.values(a.probabilities)) raise(v);
    else raise(a?.confidence);
  }
  return best;
}

export async function decisionTree(opts: {
  db: Database; rowsPath: string; recipe: Recipe; contextPath?: string; criteriaPath?: string;
  policy?: Policy; outPath?: string; escalationPath?: string; concurrency?: number; budgetCalls?: number;
}): Promise<DecisionTreeResult> {
  const raw = readFileSync(opts.rowsPath, "utf8").trim();
  const rows: unknown[] = raw.startsWith("[") ? JSON.parse(raw) : raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const context = opts.contextPath ? readFileSync(opts.contextPath, "utf8") : "";
  const criteria = opts.criteriaPath ? readFileSync(opts.criteriaPath, "utf8") : "";
  const policy: Policy = { act: opts.policy?.act ?? opts.recipe.policy?.act ?? DEFAULT_POLICY.act,
                           flag: opts.policy?.flag ?? opts.recipe.policy?.flag ?? DEFAULT_POLICY.flag,
                           fail: opts.policy?.fail ?? opts.recipe.policy?.fail ?? DEFAULT_POLICY.fail };
  const judge = new Judge(opts.db, {});
  const budget = new Budget({ calls: opts.budgetCalls });
  if (policy.fail === "open") console.error("JM_POLICY: fail=open — judge outages continue with marked rows");
  const decisions: DecisionRow[] = [];
  const escalations: DecisionRow[] = [];
  let cached = 0, calls = 0, costUsd = 0, budgetStopped = false;

  const results = await runPool(rows, async (row, i) => {
    if (budgetStopped) return null;
    if (!budget.claim()) { budgetStopped = true; return null; }   // SYNC claim before the await (D-024)   // HARD CAP: no room, no call
    const state = { row, criteria, context };
    // EVERY CLAIM IS RELEASED (audit decision-tree.ts:121). `budget.claim()` increments `pending`,
    // which `roomLeft()` counts, and only `settle()` decrements it — but BOTH degraded-return sites
    // (the fail-open noop here and the outer catch below) returned WITHOUT settling. So every
    // degraded row permanently consumed a slot: a run that hit a judge outage under `fail: "open"`
    // leaked one claim per row and then stopped with a false "budget exhausted" — the degradation
    // path silently became a budget failure. A claim that produces no measured call is REFUNDED;
    // `finally` is the only shape that covers every exit, including a rethrow.
    let settled = false;
    try {
      let res;
      try {
        res = await judge.ask(state, opts.recipe.questions, `${opts.recipe.recipe}@v${opts.recipe.version}`);
      } catch (err) {
        if (policy.fail === "open") return { i, route: "noop", reason: `gate_unavailable: ${String(err).slice(0, 100)}`, answers: null, cached: false, model: "", signal: null } as DecisionRow;
        throw err;    // fail-closed (the default): propagate, never a silent success
      }
      // No cast: `res.answers` IS the type the parameter declares, so the boundary is checked rather
      // than asserted. The previous `as never` disabled exactly the checking that would catch a
      // future field rename — the defect class this function was just fixed for.
      const value = answersToPolicyValue(res.answers);
      // ONE signal source: the aggregate drives BOTH the route and the reason, and the reason now
      // comes from the SAME ladder the route does (a fixed template here made every row claim
      // ">= act", including the noops and the escalates — D-030).
      //
      // AN UNREADABLE ANSWER IS NOT A ZERO (audit decision-tree.ts:85). `value === null` means the
      // response carried no usable signal, so there is nothing to route on — the row is built with
      // `signal: null` and the FAIL POLARITY decides: `closed` (the default) refuses the run, `open`
      // marks the row. `budget.settle` runs BEFORE either, because a real call WAS made and its cost
      // is real regardless of whether we could read the answer.
      const decided = value === null ? null : reasonForSignal(value, policy);
      const d: DecisionRow = decided === null
        ? { i, route: "noop", reason: "gate_no_signal: the response carried no usable signal (no noul/probabilities/confidence) — an unreadable answer cannot be routed", answers: res.answers, cached: res.cached, model: res.model, signal: null }
        : { i, route: decided.route, reason: decided.reason, answers: res.answers, cached: res.cached, model: res.model, signal: value };
      budget.settle(res.costUsd, res.cached);
      settled = true;
      if (res.usageMissing) throw new Error(`JM_JUDGE_USAGE_MISSING: the response carried no usage block, so this call cannot be costed — a budget cannot be enforced against an unmeasured cost (D-046)`);   // cached hits refund the claim; a real call converts it
      if (decided === null && policy.fail === "closed") throw new Error(`JM_JUDGE_NO_SIGNAL: the response carried no usable signal, so row ${i} cannot be routed — the same refusal as any other unreadable answer (fail: "open" opts into a marked row instead)`);
      if (res.cached) cached++; else { calls++; costUsd += res.costUsd; }
      return d;
    } catch (err) {
      // THE POLICY IS NOT RE-IMPLEMENTED HERE (audit decision-tree.ts:134/149). `judge/policy.ts`
      // documents `fatalJudgeError` as "THE JUDGE-FAILURE POLICY, IN ONE PLACE" — and this block was
      // a SECOND COPY of it, which had DRIFTED. The copy checked `JEV_NO_KEY` alone, so a
      // usage-missing response (D-046) fell through to the `fail: "open"` degradation path and was
      // reported as `gate_unavailable:` — the SAME reason a judge outage produces. Meanwhile
      // `filter` and `find` treat a usage-missing response as FATAL REGARDLESS OF POLARITY, because
      // *"fail: open is the opt-in to DEGRADE — a marked row whose cost is known to be zero — not an
      // opt-in to run without accounting."* **Two copies of one policy disagreed**, which is the
      // entire reason the shared one exists. It also made the marked row's reason a lie: a judge
      // that ANSWERED and whose answer was READ was reported as an unavailable gate.
      //
      // The shared function returns the fatal error string, or null when the polarity says degrade.
      const fatal = fatalJudgeError([{ error: String(err) }], { failOpen: policy.fail === "open" });
      if (fatal !== null) throw new Error(fatal);
      return { i, route: "noop", reason: `gate_unavailable: ${String(err).slice(0, 120)}`, answers: null, cached: false, model: "", signal: null } as DecisionRow;
    } finally {
      // THE CLAIM IS ALWAYS RELEASED — including on the fail-open return above and on a rethrow.
      //
      // THE REFUND GOES THROUGH THE `cached` PATH, and my first attempt at this got it wrong:
      // `settle(0, false)` calls `spend(0)`, which INCREMENTS the call count — so a FAILED call was
      // billed as a spend, and a run of degraded rows exhausted a calls cap on calls that never
      // happened (measured: cap=3 over 6 failing rows stopped at 3 with `budgetStopped=true`).
      // `settle(0, true)` is the release-without-spend branch, which is exactly what "this claim
      // produced no measured call" means. A refund is not a purchase.
      if (!settled) budget.settle(0, true);
    }
  }, { concurrency: opts.concurrency ?? 6 });

  // THE THIRD COPY OF THE POLICY, AND THE OPERATIVE ONE (audit decision-tree.ts:134/149). The inner
  // catch above classifies a throw; but `runPool` CAPTURES a task's throw into `errors[]` rather
  // than propagating it, so THIS block is what decides whether the run refuses. It checked
  // `JEV_NO_KEY` only, then `fail === "closed"` — so under `fail: "open"` a
  // `JM_JUDGE_USAGE_MISSING` was SWALLOWED and the run COMPLETED with rows whose cost was never
  // measured. **Measured: a judge answering correctly without a `usage` block completed under
  // `fail: "open"`** while `filter` and `find` refuse the same response — the drift the shared
  // policy exists to prevent. All three verbs now classify through `fatalJudgeError`.
  const fatal = fatalJudgeError(results.errors, { failOpen: policy.fail === "open" });
  if (fatal !== null) throw new Error(fatal);
  for (const d of results.ok) if (d) { decisions.push(d); if (d.route === "escalate") escalations.push(d); }

  const bands = { act: decisions.filter((d) => d.route === "act").length,
                  escalate: decisions.filter((d) => d.route === "escalate").length,
                  noop: decisions.filter((d) => d.route === "noop").length };
  // THE ARTIFACT IS THE DECISION: run metadata (cache hit, cost) never enters it, so a
  // replay of the same rows is byte-identical (the determinism contract).
  // W7 FEEDSTOCK: every decision lands in the decisions table (later_truth in context_ref).
  const ins = opts.db.query("INSERT INTO decisions(scenario_ref, question, answer_json, conf, policy, context_ref, at) VALUES (?,?,?,?,?,?,?)");
  for (const d of decisions) {
    // `d.signal`, NOT a regex over `d.reason` (D-043): the reason's FORMAT is prose for a human,
    // and parsing it back into a number made the stored confidence a fabrication for every row
    // whose reason carried no `agg=` — i.e. exactly the degraded and errored rows, whose
    // confidence is UNKNOWN. NULL means unknown; 0 means the judge said no.
    ins.run(String(d.i), `${opts.recipe.recipe}@v${opts.recipe.version}`, JSON.stringify(d.answers), d.signal, JSON.stringify(policy), null, new Date().toISOString());
  }
  const artifact = decisions.map(({ i, route, reason, answers, model }) => ({ i, route, reason, answers, model }));
  if (opts.outPath) writeFileSync(opts.outPath, JSON.stringify(artifact, null, 2));
  if (opts.escalationPath) writeFileSync(opts.escalationPath, escalations.map((e) => JSON.stringify(e)).join("\n") + (escalations.length ? "\n" : ""));
  return { rows: rows.length, decisions: decisions.length, cached, calls, costUsd, bands, out: opts.outPath, escalationOut: opts.escalationPath, budgetStopped };
}

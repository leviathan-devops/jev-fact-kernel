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

/** Validate the QUESTION TYPES of a judge request — ONE validator, TWO callers.
 *
 *  WHY IT IS SHARED (found by running EVERY MCP use case, not by reading the code): the CLI's recipe
 *  path refused a non-`noul` question AT LOAD as `JM_RECIPE_INVALID`, but the MCP `jev_decide`
 *  passthrough had NO such guard — it handed the questions straight to the judge and relayed the
 *  API's raw `JM_JUDGE_HTTP_422`. MEASURED, this session:
 *
 *    CLI  decision-tree  + a `choice` question  -> JM_RECIPE_INVALID   (named, zero calls)
 *    MCP  jev_decide     + a `choice` question  -> JM_JUDGE_HTTP_422   (a raw API body relayed)
 *
 *  The guard existed on one surface and not the other — the same-semantics violation (§18.8) this
 *  codebase keeps finding. A duplicate copy would drift the moment either surface changed, so the
 *  check lives HERE and BOTH callers run it.
 *
 *  THE UNDERLYING API FACT (D-034, measured against api.typesafe.ai): the live judge accepts `noul`
 *  ONLY. `choice` and `mcq` both return HTTP 400/422. Accepting them would validate a shape that
 *  cannot run — checking the request against the CODE's idea of the API rather than against the API. */
export function validateQuestions(q: unknown): void {
  if (!q || typeof q !== "object" || Array.isArray(q) || Object.keys(q).length === 0) {
    throw new Error("JM_RECIPE_INVALID: `questions` must be a NON-EMPTY object (an empty one judges nothing and silently noops every row)");
  }
  for (const [name, question] of Object.entries(q as Record<string, unknown>)) {
    const t = (question as { type?: unknown } | null)?.type;
    if (t !== "noul") {
      throw new Error(
        `JM_RECIPE_INVALID: question "${name}" has type ${JSON.stringify(t)} — the live judge accepts ` +
        `"noul" ONLY (measured: choice/mcq -> HTTP 400). Express a choice as one noul per candidate.`,
      );
    }
  }
}

/** Validate a recipe BEFORE any work. A malformed recipe used to run to completion: no
 *  questions -> no judge calls -> every row `noop`, exit 0 — a silent wrong answer that reads as
 *  a successful triage (D-020). A recipe is a CLIENT artifact: a bad one is a client error. */
export function validateRecipe(r: unknown): Recipe {
  const o = r as Partial<Recipe> | null;
  if (!o || typeof o !== "object") throw new Error("JM_RECIPE_INVALID: not an object");
  if (typeof o.recipe !== "string" || o.recipe.length === 0) throw new Error("JM_RECIPE_INVALID: `recipe` must be a non-empty string");
  if (typeof o.version !== "number" || !Number.isFinite(o.version)) throw new Error("JM_RECIPE_INVALID: `version` must be a number");
  validateQuestions(o.questions);
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
  /** HTTP REQUESTS made. `calls` counts judged rows; this counts ROUND TRIPS — the batching proof. */
  requests: number;
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
  let cached = 0, calls = 0, costUsd = 0, budgetStopped = false, requests = 0;

  // ── THE BATCH PATH (MEASURED: 400 questions in ONE request; time FLAT in n) ──────────────────
  // The recipe's questions are the SAME for every row, and each row is that recipe applied to ONE
  // state. So N rows = N questions in ONE request, with the row in a structured `instructions` field
  // ("Put the question in one field and the data in the others" — docs.typesafe.ai/api). The per-row
  // POOL is gone: it made N requests where one does.
  //
  // THREE SEMANTICS ARE PRESERVED EXACTLY, because they are pinned and load-bearing:
  //   · A CLAIM THAT PRODUCES NO MEASURED CALL IS REFUNDED (`settle(0, true)` — a refund is not a
  //     purchase; `settle(0, false)` increments the call count, the D-024/EN-083 defect).
  //   · AN UNREADABLE ANSWER IS NOT A ZERO — `answersToPolicyValue` returning null routes the row by
  //     FAIL POLARITY (`fail: closed` refuses, `fail: open` marks it), never as a decision.
  //   · AN UNMEASURED COST IS FATAL AT BOTH POLARITIES (D-046) — usage is checked before any routing.
  const qForRow: Record<string, { type: string; instructions: unknown; criteria?: unknown }> = {};
  for (const [qname, q] of Object.entries(opts.recipe.questions as Record<string, { type: string; instructions: unknown }>)) {
    qForRow[qname] = { type: q.type, instructions: q.instructions };
  }
  // ── THE CLAIM LOOP: claim a chunk, ask it, settle it, and let REFUNDS FREE ROOM FOR THE NEXT ──
  //
  // The pool claimed one row at a time and a REFUNDED claim freed its slot, so under `fail: open` a
  // judge outage degraded EVERY row (`decisions=6` with `budgetCalls=3`) — a cap counts CALLS THAT
  // HAPPENED, not rows attempted. Claiming all rows up front (my first batching attempt) broke that:
  // it hit the cap at 3 and stopped with a FALSE "budget exhausted", which is the exact defect the
  // 121 audit fixed. So the batching is layered ON TOP of the same claim discipline: claim up to
  // min(200, what the budget allows), one request for the chunk, settle each row (a failed chunk
  // REFUNDS every claim in it), then loop — the freed room admits the next chunk.
  //
  // 200 IS ALSO askManyBatch's OWN CHUNK SIZE, so one loop iteration is exactly one HTTP request and
  // every claim is settled against the response that belongs to it.
  const CHUNK = 200;
  for (let base = 0; base < rows.length; ) {
    const items: { id: string; state: unknown }[] = [];
    const indices: number[] = [];
    while (base < rows.length && items.length < CHUNK && budget.claim()) {   // SYNC claim before the await (D-024)
      items.push({ id: String(base), state: { row: rows[base], criteria, context } });
      indices.push(base);
      base++;
    }
    // A CHUNK THAT CANNOT EVEN START IS THE REAL "STOPPED" SIGNAL. A claim failure MID-chunk is not:
    // that chunk's claims may be REFUNDED after the request (a degraded row consumed no budget), and
    // the refund frees the room the next chunk needs. Setting `budgetStopped` on the mid-chunk failure
    // (my first attempt) stopped the run at the cap with 3 of 6 rows attempted — the exact FALSE
    // "budget exhausted" the 121 audit fixed.
    if (items.length === 0) { budgetStopped = true; break; }
    let bd: Awaited<ReturnType<typeof judge.askManyBatch>>;
    try {
      bd = await judge.askManyBatch(items, qForRow, `${opts.recipe.recipe}@v${opts.recipe.version}`);
    } catch (err) {
      for (let i = 0; i < items.length; i++) budget.settle(0, true);   // no measured call was produced
      // THE POLICY IS NOT RE-IMPLEMENTED HERE (audit decision-tree.ts:134/149): `fatalJudgeError` is
      // "THE JUDGE-FAILURE POLICY, IN ONE PLACE" — it makes an unmeasured cost fatal at BOTH
      // polarities while honouring `fail: open` for an outage.
      const fatal = fatalJudgeError([{ error: err instanceof Error ? err.message : String(err) }], { failOpen: policy.fail === "open" });
      if (fatal !== null) throw new Error(fatal);
      for (const it of items) {
        decisions.push({ i: Number(it.id), route: "noop", reason: `gate_unavailable: ${String(err).slice(0, 120)}`, answers: null, cached: false, model: "", signal: null } as DecisionRow);
      }
      continue;                                                // refunded -> the loop claims the next chunk
    }
    if (bd.usageMissing > 0) {
      for (let i = 0; i < items.length; i++) budget.settle(0, true);
      throw new Error(`JM_JUDGE_USAGE_MISSING: the response carried no usage block, so this call cannot be costed — a budget cannot be enforced against an unmeasured cost (D-046)`);
    }
    requests += bd.requests;
    const cachedSet = new Set(bd.cachedKeys);
    const share = bd.asked > 0 ? bd.costUsd / bd.asked : 0;   // one request's cost, split across its rows
    for (const it of items) {
      const i = Number(it.id);
      // THE ANSWER IS READ BY QUESTION NAME, and each answered question belongs to THIS row only —
      // so `answers` is keyed back to the recipe's own names, then converted the same way `ask()` was.
      const answers: Record<string, unknown> = {};
      let anyCached = false, allCached = true, anyAnswered = false;
      const questionKeys = Object.keys(qForRow).map((qn) => `${it.id}__${qn}`);
      for (const qk of questionKeys) {
        const a = bd.answers[qk];
        if (a === undefined) { allCached = false; continue; }
        anyAnswered = true;
        if (cachedSet.has(qk)) { anyCached = true; } else { allCached = false; }
        answers[qk.slice(it.id.length + 2)] = a;
      }
      const isCached = anyAnswered && allCached;
      budget.settle(isCached ? 0 : share, isCached);
      if (!anyAnswered) continue;                            // no answer is not an answer
      if (!isCached) { calls++; costUsd += share; }
      if (isCached) cached++;
      const value = answersToPolicyValue(answers as Parameters<typeof answersToPolicyValue>[0]);
      const decided = value === null ? null : reasonForSignal(value, policy);
      if (decided === null) {
        if (policy.fail === "closed") throw new Error(`JM_JUDGE_NO_SIGNAL: the response carried no usable signal, so row ${i} cannot be routed — the same refusal as any other unreadable answer (fail: "open" opts into a marked row instead)`);
        decisions.push({ i, route: "noop", reason: "gate_no_signal: the response carried no usable signal (no noul/probabilities/confidence) — an unreadable answer cannot be routed", answers, cached: isCached, model: bd.model, signal: null } as DecisionRow);
      } else {
        decisions.push({ i, route: decided.route, reason: decided.reason, answers, cached: isCached, model: bd.model, signal: value } as DecisionRow);
      }
    }
    if (budgetStopped) break;
  }
  // `decisions` was filled by the batch path above; only the escalation split remains.
  for (const d of decisions) if (d.route === "escalate") escalations.push(d);

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
  return { rows: rows.length, decisions: decisions.length, cached, calls, costUsd, bands, out: opts.outPath, escalationOut: opts.escalationPath, budgetStopped, requests };
}

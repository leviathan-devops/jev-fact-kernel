// src/verbs/decision-tree.ts — the batch decision verb (S12).
// rows × one recipe → decisions + an escalation file; cache-first; fail-closed without a key.
import { readFileSync, writeFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { Judge } from "../judge/client.ts";
import { routeOf, DEFAULT_POLICY, type Policy } from "../judge/policy.ts";
import { runPool } from "../pools/pool.ts";
import { Budget } from "../pools/budget.ts";

export interface Recipe {
  recipe: string; version: number; status?: string;
  state_fields?: string[];
  questions: Record<string, unknown>;
  policy?: Partial<Policy>;
}

export interface DecisionRow { i: number; route: string; reason: string; answers: unknown; cached: boolean; model: string; }

export interface DecisionTreeResult {
  rows: number; decisions: number; cached: number; calls: number; costUsd: number;
  bands: { act: number; escalate: number; noop: number };
  out?: string; escalationOut?: string; budgetStopped: boolean;
}

function answersToPolicyValue(answers: Record<string, { noul?: number; probabilities?: Record<string, number>; confidence?: number }>): number {
  let best = 0;
  for (const a of Object.values(answers)) {
    if (typeof a.noul === "number") best = Math.max(best, a.noul);
    if (a.probabilities) best = Math.max(best, ...Object.values(a.probabilities));
    else if (typeof a.confidence === "number") best = Math.max(best, a.confidence);
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
  const decisions: DecisionRow[] = [];
  const escalations: DecisionRow[] = [];
  let cached = 0, calls = 0, costUsd = 0, budgetStopped = false;

  const results = await runPool(rows, async (row, i) => {
    if (budgetStopped) return null;
    if (!budget.roomLeft()) { budgetStopped = true; return null; }   // HARD CAP: no room, no call
    const state = { row, criteria, context };
    try {
      const res = await judge.ask(state, opts.recipe.questions, `${opts.recipe.recipe}@v${opts.recipe.version}`);
      const value = answersToPolicyValue(res.answers as never);
      const { route, reason } = routeOf(res.answers[Object.keys(opts.recipe.questions)[0]] as never, policy);
      // recompute with the aggregate signal for multi-question recipes
      const agg = value >= policy.act ? "act" : value >= policy.flag ? "escalate" : "noop";
      const d: DecisionRow = { i, route: agg, reason: `${reason} | agg=${value.toFixed(2)}`, answers: res.answers, cached: res.cached, model: res.model };
      if (res.cached) cached++; else { calls++; costUsd += res.costUsd; }
      budget.spend(res.costUsd);
      return d;
    } catch (err) {
      if (String(err).includes("JEV_NO_KEY")) throw err;    // fail-closed must propagate
      return { i, route: "noop", reason: `error: ${String(err).slice(0, 120)}`, answers: null, cached: false, model: "" } as DecisionRow;
    }
  }, { concurrency: opts.concurrency ?? 6 });

  if (results.errors.length > 0) {
    const noKey = results.errors.find((e) => e.error.includes("JEV_NO_KEY"));
    if (noKey) throw new Error(noKey.error);
  }
  for (const d of results.ok) if (d) { decisions.push(d); if (d.route === "escalate") escalations.push(d); }

  const bands = { act: decisions.filter((d) => d.route === "act").length,
                  escalate: decisions.filter((d) => d.route === "escalate").length,
                  noop: decisions.filter((d) => d.route === "noop").length };
  // THE ARTIFACT IS THE DECISION: run metadata (cache hit, cost) never enters it, so a
  // replay of the same rows is byte-identical (the determinism contract).
  // W7 FEEDSTOCK: every decision lands in the decisions table (later_truth in context_ref).
  const ins = opts.db.query("INSERT INTO decisions(scenario_ref, question, answer_json, conf, policy, context_ref, at) VALUES (?,?,?,?,?,?,?)");
  for (const d of decisions) {
    const val = Number((d.reason.match(/agg=([0-9.]+)/)?.[1]) ?? 0);
    ins.run(String(d.i), `${opts.recipe.recipe}@v${opts.recipe.version}`, JSON.stringify(d.answers), val, JSON.stringify(policy), null, new Date().toISOString());
  }
  const artifact = decisions.map(({ i, route, reason, answers, model }) => ({ i, route, reason, answers, model }));
  if (opts.outPath) writeFileSync(opts.outPath, JSON.stringify(artifact, null, 2));
  if (opts.escalationPath) writeFileSync(opts.escalationPath, escalations.map((e) => JSON.stringify(e)).join("\n") + (escalations.length ? "\n" : ""));
  return { rows: rows.length, decisions: decisions.length, cached, calls, costUsd, bands, out: opts.outPath, escalationOut: opts.escalationPath, budgetStopped };
}

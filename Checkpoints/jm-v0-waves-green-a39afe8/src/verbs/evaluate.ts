// src/verbs/evaluate.ts — W5/S14: fixed cases + oracle labels -> metrics that can be argued with.
// agreement · Brier · ECE · variance · latency · $/call, and --replay diffs two runs' routes.
import type { Database } from "bun:sqlite";
import { Judge } from "../judge/client.ts";
import { answerFrom } from "../judge/policy.ts";
import { routeOf } from "../judge/policy.ts";

export interface EvalCase { id: string; state: unknown; oracle: string | number; note?: string; }
export interface EvalOpts {
  cases: EvalCase[];
  questions: Record<string, unknown>;
  questionKey: string;          // which answered question carries the signal
  schema?: string;
  repetitions?: number;         // k (default 1)
  threshold?: number;           // the cut for a binary agree/disagree (default 0.5)
}

export interface CaseResult {
  id: string; oracle: string | number; p: number; answer: string;
  agree: boolean; latencyMs: number; cached: boolean; costUsd: number;
}
export interface EvalMetrics {
  n: number; k: number; agreement: number; brier: number; ece: number;
  variance: number; latencyMsMean: number; costPerCall: number; costUsdTotal: number;
  bins: { lo: number; hi: number; n: number; meanP: number; accuracy: number }[];
}
export interface EvalResult { cases: CaseResult[]; metrics: EvalMetrics; ms: number; }

/** Answers may be a probability or a label; both are normalised to a number for scoring. */
function pOf(answered: unknown, threshold: number): number {
  const a = answered as { noul?: number; probs?: Record<string, number>; answer?: string; bool?: boolean } | undefined;
  if (!a) return 0;
  if (typeof a.noul === "number") return a.noul;
  if (typeof a.bool === "boolean") return a.bool ? 1 : 0;
  if (a.probs) {
    const yes = Object.entries(a.probs).find(([k]) => /^(yes|true|act|1)$/i.test(k));
    if (yes) return yes[1];
    const vals = Object.values(a.probs);
    if (vals.length) return Math.max(...vals);
  }
  if (typeof a.answer === "string" && /^none$/i.test(a.answer)) return 0;
  if (typeof a.answer === "string") return /^(yes|true|act|1)$/i.test(a.answer) ? 1 : 0;
  void threshold;
  return 0;
}

export async function evaluate(db: Database, opts: EvalOpts): Promise<EvalResult> {
  const t0 = Date.now();
  const k = Math.max(1, Math.floor(opts.repetitions ?? 1));
  const threshold = opts.threshold ?? 0.5;
  const judge = new Judge(db, {});
  const cases: CaseResult[] = [];

  for (const c of opts.cases) {
    for (let r = 0; r < k; r++) {
      const s = Date.now();
      const res = await judge.ask(c.state, opts.questions, opts.schema ?? "eval@v1");
      // RESOLVE BY SHAPE (D-042): reading `answers[questionKey]` directly meant a renamed key made
      // every case score 0 — and a metric computed from fabricated zeros still LOOKS like a
      // measurement. An answer with no usable signal throws instead.
      const resolved = answerFrom(res.answers, opts.questionKey);
      const answered = resolved.answer;
      const p = pOf(answered, threshold);
      const truth = typeof c.oracle === "number" ? c.oracle : /^(yes|true|act|1)$/i.test(String(c.oracle)) ? 1 : 0;
      cases.push({
        id: c.id, oracle: c.oracle, p,
        answer: (answered as { answer?: string })?.answer ?? String(Math.round(p)),
        agree: (p >= threshold ? 1 : 0) === (truth >= threshold ? 1 : 0),
        latencyMs: Date.now() - s, cached: res.cached, costUsd: res.costUsd,
      });
    }
  }

  const n = cases.length;
  const agreement = n ? cases.filter((c) => c.agree).length / n : 0;
  const brier = n ? cases.reduce((s, c) => {
    const truth = typeof c.oracle === "number" ? c.oracle : /^(yes|true|act|1)$/i.test(String(c.oracle)) ? 1 : 0;
    return s + (c.p - truth) ** 2;
  }, 0) / n : 0;

  // per-case variance across the k repetitions (the stability signal)
  const byId = new Map<string, number[]>();
  for (const c of cases) {
    if (!byId.has(c.id)) byId.set(c.id, []);
    byId.get(c.id)!.push(c.p);
  }
  let variance = 0;
  for (const ps of byId.values()) {
    if (ps.length < 2) continue;
    const m = ps.reduce((a, b) => a + b, 0) / ps.length;
    const v = ps.reduce((s, p) => s + (p - m) ** 2, 0) / ps.length;
    // NUMERICAL ZERO: identical answers must report variance 0, not floating-point dust
    // ((0.7*3)/3 = 0.6999999999999998 -> 4e-32). The determinism claim (k repeats -> zero
    // variance) is only readable when the number is honest.
    variance += v < 1e-12 ? 0 : v;
  }
  variance = byId.size ? variance / byId.size : 0;
  if (variance < 1e-12) variance = 0;

  // ECE over 10 fixed bins (calibration: does p=0.7 mean 70%?)
  const bins: EvalMetrics["bins"] = [];
  let ece = 0;
  for (let i = 0; i < 10; i++) {
    const lo = i / 10, hi = (i + 1) / 10;
    const inBin = cases.filter((c) => c.p >= lo && (i === 9 ? c.p <= hi : c.p < hi));
    if (inBin.length === 0) { bins.push({ lo, hi, n: 0, meanP: 0, accuracy: 0 }); continue; }
    const meanP = inBin.reduce((s, c) => s + c.p, 0) / inBin.length;
    const acc = inBin.filter((c) => {
      const truth = typeof c.oracle === "number" ? c.oracle : /^(yes|true|act|1)$/i.test(String(c.oracle)) ? 1 : 0;
      return (c.p >= threshold ? 1 : 0) === (truth >= threshold ? 1 : 0);
    }).length / inBin.length;
    bins.push({ lo, hi, n: inBin.length, meanP, accuracy: acc });
    ece += (inBin.length / n) * Math.abs(acc - meanP);
  }

  return {
    cases,
    metrics: {
      n, k, agreement, brier, ece, variance, bins,
      latencyMsMean: n ? cases.reduce((s, c) => s + c.latencyMs, 0) / n : 0,
      costPerCall: n ? cases.reduce((s, c) => s + c.costUsd, 0) / n : 0,
      costUsdTotal: cases.reduce((s, c) => s + c.costUsd, 0),
    },
    ms: Date.now() - t0,
  };
}

/** --replay: diff two runs' routes per case. Any changed route is a finding, printed. */
export function replayDiff(a: EvalResult, b: EvalResult): { id: string; from: number; to: number; flipped: boolean }[] {
  const byId = new Map(a.cases.map((c) => [`${c.id}`, c]));
  const out: { id: string; from: number; to: number; flipped: boolean }[] = [];
  for (const c of b.cases) {
    const prev = byId.get(c.id);
    if (!prev) continue;
    if (prev.p !== c.p) out.push({ id: c.id, from: prev.p, to: c.p, flipped: (prev.p >= 0.5) !== (c.p >= 0.5) });
  }
  out.sort((x, y) => (x.id < y.id ? -1 : 1));
  return out;
}

export { routeOf };

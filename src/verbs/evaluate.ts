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
// No `threshold` PARAMETER: it was `void threshold;` — accepted, documented, and never read, so every
// caller passed a value with no effect on the result. The cut is applied AT THE CALL SITE (agreement is
// `p >= threshold`), which is where it belongs: the cut is a scoring decision, and `pOf` only reads a
// probability out of an answer.
function pOf(answered: unknown): number {
  // `probabilities` IS THE CANONICAL FIELD (`policy.ts:17`, `policy.ts:92`, `JudgeResponse`), and
  // this reader only knew `probs` — so a choice-shaped answer fell through every branch and scored
  // **0**, a confident "no", for EVERY case. The Brier score and the agreement rate were then
  // computed over those fabricated zeros and still looked like measurements. `probs` is kept as a
  // legacy alias. Found by the audit (evaluate:35) — the same renamed-field class as D-039/D-042.
  const a = answered as { noul?: number; probabilities?: Record<string, number>; probs?: Record<string, number>; answer?: string; bool?: boolean } | undefined;
  if (!a) return 0;
  if (typeof a.noul === "number") return a.noul;
  if (typeof a.bool === "boolean") return a.bool ? 1 : 0;
  const dist = a.probabilities ?? a.probs;
  if (dist) {
    const yes = Object.entries(dist).find(([k]) => /^(yes|true|act|1)$/i.test(k));
    if (yes) return yes[1];
    const vals = Object.values(dist);
    if (vals.length) return Math.max(...vals);
  }
  if (typeof a.answer === "string" && /^none$/i.test(a.answer)) return 0;
  if (typeof a.answer === "string") return /^(yes|true|act|1)$/i.test(a.answer) ? 1 : 0;
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
      // THE USAGE GAP IS CHECKED, AS IN EVERY SIBLING (audit evaluate.ts:57). `filter`, `find` and
      // `decision-tree` all treat a response with no `usage` block as a fatal judge failure (D-046: a
      // budget cannot be enforced against an unmeasured cost). `evaluate` ignored the flag entirely,
      // so a run could score an entire corpus and account for none of the spend — the exact hole
      // D-046 closed on the other three verbs, left open here.
      if (res.usageMissing) {
        throw new Error("JM_JUDGE_USAGE_MISSING: the response carried no usage block, so this call cannot be costed — a budget cannot be enforced against an unmeasured cost (D-046)");
      }
      // RESOLVE BY SHAPE (D-042): reading `answers[questionKey]` directly meant a renamed key made
      // every case score 0 — and a metric computed from fabricated zeros still LOOKS like a
      // measurement. An answer with no usable signal throws instead.
      const resolved = answerFrom(res.answers, opts.questionKey);
      const answered = resolved.answer;
      const p = pOf(answered);
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
  // THE COMPARISON IS PER (id, REPETITION), NOT PER id (audit evaluate.ts:130). `new Map(a.cases.map((c) => [c.id, c]))`
  // keyed by id alone, and `cases` holds `k` REPETITIONS per id — so the Map kept only the LAST
  // repetition's probability, and every one of `b`'s k entries was compared against that single
  // stored value. MEASURED: `replayDiff` of two IDENTICAL runs (k=2, p=0.9 then 0.2) reported a
  // finding — `{from: 0.2, to: 0.9, flipped: true}` — a change that did not happen, in the one
  // function whose entire job is to report what changed. A replay diff that fires on identical
  // input cannot be used to detect drift.
  //
  // The probabilities are grouped per id IN ORDER, and b's i-th repetition is compared against a's
  // i-th — which is the same comparison the single-repetition case always made, and the only one
  // with a defined meaning when repetitions are independent samples of the same case.
  const byId = new Map<string, number[]>();
  for (const c of a.cases) {
    const arr = byId.get(c.id);
    if (arr) arr.push(c.p); else byId.set(c.id, [c.p]);
  }
  const out: { id: string; from: number; to: number; flipped: boolean }[] = [];
  const seenPerId = new Map<string, number>();
  for (const c of b.cases) {
    const prevs = byId.get(c.id);
    if (!prevs) continue;
    const n = seenPerId.get(c.id) ?? 0;
    seenPerId.set(c.id, n + 1);
    const prev = prevs[n];
    if (prev === undefined) continue;                // b has more repetitions than a: nothing to compare
    if (prev !== c.p) out.push({ id: c.id, from: prev, to: c.p, flipped: (prev >= 0.5) !== (c.p >= 0.5) });
  }
  out.sort((x, y) => (x.id < y.id ? -1 : 1));
  return out;
}

export { routeOf };

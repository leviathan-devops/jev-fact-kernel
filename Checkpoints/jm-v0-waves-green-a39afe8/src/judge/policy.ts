// src/judge/policy.ts — thresholds are policy, derived from data, never inline (IL-07).
export interface Policy { act: number; flag: number; fail: "open" | "closed"; }

export const DEFAULT_POLICY: Policy = { act: 0.8, flag: 0.5, fail: "closed" };

export type Route = "act" | "escalate" | "noop" | "reject";

export interface NoulAnswer { type: "noul"; noul: number; }
export interface ChoiceAnswer { type: "choice"; choice: string; probabilities?: Record<string, number>; confidence?: number; }

const finite = (n: unknown, fallback = 0): number => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback);

export function signalOf(answer: NoulAnswer | ChoiceAnswer | undefined): number {
  if (!answer || typeof answer !== "object") return 0;          // missing answer -> noop
  if (answer.type === "noul") return finite(answer.noul);
  if (answer.type !== "choice") return 0;                       // unknown type (score/typo) NEVER routes on confidence
  const probs = answer.probabilities ? Object.values(answer.probabilities).filter((v) => Number.isFinite(v)) : [];
  if (probs.length > 0) return finite(Math.max(...probs));      // Math.max(...[]) is -Infinity
  return finite(answer.confidence, 0);                          // choice may fall back to its confidence
}

/** The reason string for a RAW signal value — the same ladder as routeOf, for a caller that
 *  aggregates its own signal (decision-tree takes a max over several answers).
 *
 *  This exists because the reason was a fixed TEMPLATE: every row printed
 *  `agg=<v> >= act=<a> / flag=<f>`, so a noop row claimed `0.15 >= 0.8` and an escalate row
 *  claimed `0.59 >= 0.8`. The ROUTE was right and the AUDIT TRAIL lied — and the reason is the
 *  line an operator reads to justify the route. (D-030, found by reading a live run's output
 *  rather than its exit status.) */
export function reasonForSignal(value: number, p: Policy): { route: Route; reason: string } {
  if (value >= p.act) return { route: "act", reason: `agg=${value.toFixed(2)} >= act=${p.act}` };
  if (value >= p.flag) return { route: "escalate", reason: `agg=${value.toFixed(2)} in [flag=${p.flag}, act=${p.act})` };
  return { route: "noop", reason: `agg=${value.toFixed(2)} < flag=${p.flag}` };
}

export function routeOf(answer: NoulAnswer | ChoiceAnswer | undefined, p: Policy): { route: Route; reason: string } {
  const s = signalOf(answer);
  if (s >= p.act) return { route: "act", reason: `signal=${s.toFixed(2)} >= act=${p.act}` };
  if (s >= p.flag) return { route: "escalate", reason: `signal=${s.toFixed(2)} in [${p.flag},${p.act})` };
  return { route: "noop", reason: `signal=${s.toFixed(2)} < flag=${p.flag}` };
}


/** THE JUDGE-FAILURE POLICY, IN ONE PLACE (D-040, D-041).
 *
 * Three verbs judged rows through a pool and each decided for itself what a judge failure meant.
 * All three checked `JEV_NO_KEY` ONLY, so a missing key aborted a run while a 500, a 429 or a
 * timeout produced a SILENT EMPTY RESULT — `filter` returning `kept=0` and `find` returning
 * `0 patterns`, both looking like considered answers to questions the judge never saw.
 *
 * The rule here: ANY judge error is fatal unless the caller explicitly opted into degradation.
 * `JEV_NO_KEY` is fatal even then — a missing key is a configuration failure, never a
 * data-quality signal.
 *
 * Returns the error text that should abort the run, or null when the caller may degrade. */
export function fatalJudgeError(errors: { error: string }[], opts: { failOpen?: boolean } = {}): string | null {
  if (errors.length === 0) return null;
  const noKey = errors.find((e) => e.error.includes("JEV_NO_KEY"));
  if (noKey) return noKey.error;
  return opts.failOpen ? null : errors[0].error;
}


/** READ AN ANSWER BY SHAPE, NOT BY KEY (D-042).
 *
 * `filter` read `answers.match.noul`, `find` read `answers.is_instance.noul`, `route` read
 * `answers.applies.noul` — and each used `?? 0`. Measured against a judge that answered
 * `{ verdict: { noul: 0.95 } }`: filter made SIX real calls, the judge said 0.95 (a clear yes), the
 * verb read 0, and it reported `kept=0` — "no row here is a problem". `decision-tree` was immune
 * because `answersToPolicyValue` walks `Object.values()` and takes the max, so this is a solved
 * problem in the same codebase, in one verb out of three.
 *
 * A misshapen answer is a JUDGE FAILURE, not a confident negative: nothing usable throws.
 *
 * Resolution order: the question the verb asked, then the only answer present, then the best
 * `noul` across all answers. Anything without a finite number throws `JM_JUDGE_ANSWER_INVALID`. */
export function noulFrom(answers: unknown, expectedKey: string): number {
  const map = (answers ?? {}) as Record<string, { noul?: unknown; probabilities?: Record<string, unknown> } | undefined>;
  const finite = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const asked = map[expectedKey];
  if (asked) {
    const direct = finite(asked.noul);
    if (direct !== null) return direct;
    if (asked.probabilities) {                      // a choice-shaped answer still carries a signal
      const vals = Object.values(asked.probabilities).map(finite).filter((v): v is number => v !== null);
      if (vals.length > 0) return Math.max(...vals);
    }
  }
  const keys = Object.keys(map).filter((k) => map[k] !== undefined);
  const bestOf = (a: { noul?: unknown; probabilities?: Record<string, unknown> } | undefined): number | null => {
    const direct = finite(a?.noul);
    if (direct !== null) return direct;
    if (a?.probabilities) {
      const vals = Object.values(a.probabilities).map(finite).filter((v): v is number => v !== null);
      if (vals.length > 0) return Math.max(...vals);
    }
    return null;
  };
  if (keys.length === 1) {                          // the judge renamed the key; use what arrived
    const only = bestOf(map[keys[0]]);
    if (only !== null) return only;
  }
  const all = keys.map((k) => finite(map[k]?.noul)).filter((v): v is number => v !== null);
  if (all.length > 0) return Math.max(...all);      // the same shape decision-tree already trusts
  throw new Error(`JM_JUDGE_ANSWER_INVALID: no usable answer — expected "${expectedKey}", received [${keys.join(", ") || "nothing"}]`);
}

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

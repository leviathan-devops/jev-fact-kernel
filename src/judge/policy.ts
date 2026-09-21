// src/judge/policy.ts — thresholds are policy, derived from data, never inline (IL-07).
export interface Policy { act: number; flag: number; fail: "open" | "closed"; }

export const DEFAULT_POLICY: Policy = { act: 0.8, flag: 0.5, fail: "closed" };

export type Route = "act" | "escalate" | "noop" | "reject";

export interface NoulAnswer { type: "noul"; noul: number; }
export interface ChoiceAnswer { type: "choice"; choice: string; probabilities?: Record<string, number>; confidence?: number; }

export function signalOf(answer: NoulAnswer | ChoiceAnswer | undefined): number {
  if (!answer) return 0;
  if (answer.type === "noul") return answer.noul;
  if (answer.probabilities) return Math.max(...Object.values(answer.probabilities));
  return answer.confidence ?? 0;
}

export function routeOf(answer: NoulAnswer | ChoiceAnswer | undefined, p: Policy): { route: Route; reason: string } {
  const s = signalOf(answer);
  if (s >= p.act) return { route: "act", reason: `signal=${s.toFixed(2)} >= act=${p.act}` };
  if (s >= p.flag) return { route: "escalate", reason: `signal=${s.toFixed(2)} in [${p.flag},${p.act})` };
  return { route: "noop", reason: `signal=${s.toFixed(2)} < flag=${p.flag}` };
}

// src/judge/types.ts — THE FROZEN CONTRACTS (W1 of the production-grade build).
//
// ONE declaration site for the shapes the other waves build against. Before this file the
// batch shapes lived inline in `client.ts` and the three new surfaces (the rate limiter, the
// job recovery, the gate verdict) had NO declared contract at all — so W3/W4/W5 would each
// have invented their own. The parallelism the wave plan depends on needs the interfaces
// FROZEN FIRST (hydra-mode's interface-first rule): W2/W3/W4/W5 touch disjoint files and can
// only run concurrently if they agree on these shapes.
//
// A CONTRACT IS THE INVARIANTS, NOT JUST THE SHAPE. Each interface below names the invariants
// it must hold, and each invariant names the defect it prevents — every one of them is a
// defect this project has already measured.

/** One item to judge. `id` is the caller's handle; the answers come back under
 *  `${id}__${questionName}` so a caller can map a response back to ITS row. */
export interface AskItem { id: string; state: unknown; }

/** One typed answer, as the wire returns it. Kept structural (not narrowed) so a new answer
 *  field from the API does not require a type change here. */
export interface JudgeAnswer {
  type: string;
  noul?: number;
  choice?: string;
  probabilities?: Record<string, number>;
  confidence?: number;
  score?: number;
  legend?: Record<string, string>;
}

/** THE BATCH RESULT.
 *
 *  INVARIANTS (each one a defect already measured):
 *  - `usageMissing > 0` means the response carried no usage block -> the caller REFUSES
 *    (an unmeasured cost is fatal at BOTH fail polarities — D-046).
 *  - a response that does not answer every question is a NAMED failure
 *    (`JM_JUDGE_ANSWER_COUNT`), never a silent skip.
 *  - `model` is the model that PRODUCED the cache on a cached run — a cold run and an
 *    all-cached run must report the SAME model, or the byte-identical-replay contract breaks.
 *  - `cachedKeys` is per-(item, question): the caller settles budget PER ITEM, and a count
 *    alone cannot tell it which item consumed budget. */
export interface AskManyResult {
  answers: Record<string, JudgeAnswer>;
  model: string;
  /** HTTP REQUESTS made. This is the batching proof: N items cost ceil(N/batchSize), not N. */
  requests: number;
  cached: number;
  cachedKeys: string[];
  asked: number;
  inputTokens: number;
  costUsd: number;
  usageMissing: number;
}

/** THE RATE LIMITER (W3).
 *
 *  INVARIANTS:
 *  - the cap is enforced IN THE PATH (a chokepoint every call passes through), never in a doc;
 *  - `stats().peak` is the OBSERVED maximum in-flight count — the measurement that proves the
 *    cap holds, which a "configured" number never does;
 *  - a caller over the bound is DELAYED, not failed: `acquire()` resolves when a slot frees. */
export interface RateLimiterStats { inFlight: number; peak: number; waitedMs: number; granted: number; }
export interface RateLimiter {
  acquire(): Promise<void>;
  release(): void;
  stats(): RateLimiterStats;
}

/** THE JOB RECOVERY CONTRACT (W4).
 *
 *  INVARIANT: `done + pending + running` is CONSERVED across a kill — a job killed at any
 *  point resumes with no row lost and none double-processed (the queue's fingerprint UNIQUE
 *  enforces the second half structurally). "Resumable by design" is NOT this: this is the
 *  counts read back after a real SIGKILL. */
export interface JobRecoveryCounts { done: number; pending: number; running: number; failed: number; }
export interface JobRecovery { resume(jobId: string): Promise<JobRecoveryCounts>; }

/** THE GATE VERDICT (W5) — the shape the CI gate and the pre-commit hook both speak.
 *
 *  INVARIANTS: FAIL blocks every ship-ready claim; BLOCKED is NEVER reported as PASS (a
 *  degraded run is a distinct state, not a green one). */
export interface GateFinding { file: string; line: number; severity: "critical" | "high" | "medium" | "low"; message?: string; }
export interface GateVerdict {
  gate: "PASS" | "FAIL" | "BLOCKED";
  findings: GateFinding[];
  /** Why a BLOCKED verdict was reached (quota, an unreachable service). Absent for PASS/FAIL. */
  blockedReason?: string;
}

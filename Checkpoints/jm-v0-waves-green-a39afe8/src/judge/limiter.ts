// src/judge/limiter.ts — THE RATE LIMITER (W3). A chokepoint every judge call passes through.
//
// WHY IT EXISTS — MEASURED, IN THE SEAT (`.trident/runtime-ledger.md` RL-01): during this build the
// account hit `HTTP 402 billing_error: "Your organization has no available TypeSafe API credits."`
// Nothing in the engine bounded REQUEST FREQUENCY. `Budget{calls,usd}` is per-INVOCATION and resets
// every run, so a series of individually-reasonable commands (a `find` over 100 candidates, a
// `filter` over 40, several 10-run test windows) each opened their own budget from zero and together
// walked the account to its ceiling.
//
// THE LAW THIS IMPLEMENTS (the pin's §1 F-2, verbatim): *"NO request-frequency bound: nothing caps
// calls/second; a 100k-row batch is 250 unthrottled requests."*
//
// THE DESIGN CONSTRAINTS (each from a defect this project has already paid for):
//  1. THE CAP LIVES IN THE PATH, NOT IN A DOC. Every call acquires a token before it goes on the
//     wire; there is no code path to the judge that skips it. A documented limit bounds nothing.
//  2. THE PEAK IS OBSERVABLE. `stats().peak` is the OBSERVED maximum in-flight count — a configured
//     number proves nothing about what happened.
//  3. A CALLER OVER THE BOUND IS DELAYED, NOT FAILED. `acquire()` resolves when a slot frees; a
//     limiter that throws would turn a pacing problem into an outage.
//  4. THE WAIT IS BOUNDED AND NAMED. A caller that would wait past the ceiling gets
//     `JM_JUDGE_RATE_EXHAUSTED` naming the wait, never an unbounded sleep.
//
// A NOTE ON WHAT IT IS NOT: this is NOT a per-invocation budget (`Budget` owns that) and NOT a
// retry policy (the transport owns that). It is the SHARED, PROCESS-WIDE pace.

import type { RateLimiter, RateLimiterStats } from "./types.ts";

export const JM_JUDGE_RATE_EXHAUSTED = "JM_JUDGE_RATE_EXHAUSTED";

/** A token bucket. `ratePerSec` refills continuously; `burst` is the bucket's depth, so a short
 *  spike up to `burst` is allowed and a sustained rate above `ratePerSec` is not. */
export class TokenBucket implements RateLimiter {
  private tokens: number;
  private last = Date.now();
  private inFlight = 0;
  private peak = 0;
  private waitedMs = 0;
  private granted = 0;
  private waiters: (() => void)[] = [];

  constructor(
    readonly ratePerSec: number,
    readonly burst: number,
    /** THE CONCURRENCY CAP — a DIFFERENT bound from `burst`, and conflating them was a real defect
     *  this class shipped for one test run. `burst` limits the RATE (tokens available at once);
     *  `maxInFlight` limits SIMULTANEOUS calls. MEASURED: with burst=2 and a 1000/s refill, 20
     *  concurrent callers produced `peak=6` — the bucket was doing its job (the refill admitted
     *  them over time) while nothing capped how many were open at once. A rate bound is not a
     *  concurrency bound, and the contract (`test_limiter_caps_concurrency`) requires the latter. */
    readonly maxInFlight: number = burst,
    /** The ceiling on a single `acquire()` wait. A caller past it is REFUSED BY NAME — an
     *  unbounded sleep is a hang wearing a queue's costume. */
    private readonly maxWaitMs = 60_000,
  ) {
    if (!Number.isFinite(ratePerSec) || ratePerSec <= 0) throw new Error(`JM_JUDGE_RATE_INVALID: ratePerSec=${ratePerSec} (must be finite and > 0)`);
    if (!Number.isFinite(burst) || burst < 1) throw new Error(`JM_JUDGE_RATE_INVALID: burst=${burst} (must be >= 1)`);
    if (!Number.isFinite(maxInFlight) || maxInFlight < 1) throw new Error(`JM_JUDGE_RATE_INVALID: maxInFlight=${maxInFlight} (must be >= 1)`);
    this.tokens = burst;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.last) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.ratePerSec);
    this.last = now;
  }

  async acquire(): Promise<void> {
    const started = Date.now();
    for (;;) {
      this.refill();
      // BOTH BOUNDS ARE CHECKED: a free token (the RATE) AND a free slot (the CONCURRENCY).
      if (this.tokens >= 1 && this.inFlight < this.maxInFlight) {
        this.tokens -= 1;
        this.inFlight += 1;
        if (this.inFlight > this.peak) this.peak = this.inFlight;   // THE OBSERVED PEAK
        this.granted += 1;
        this.waitedMs += Date.now() - started;
        return;
      }
      const waited = Date.now() - started;
      if (waited >= this.maxWaitMs) {
        throw new Error(
          `${JM_JUDGE_RATE_EXHAUSTED}: waited ${waited}ms for a token at ${this.ratePerSec}/s (burst ${this.burst}) ` +
          `— raise JM_JUDGE_RATE, or batch more items per request (N items in ONE request cost one token)`,
        );
      }
      // sleep until the bucket would hold a token, bounded by the remaining budget
      const needMs = Math.ceil(((1 - this.tokens) / this.ratePerSec) * 1000);
      await new Promise<void>((r) => setTimeout(r, Math.max(1, Math.min(needMs, this.maxWaitMs - waited))));
    }
  }

  release(): void {
    if (this.inFlight > 0) this.inFlight -= 1;
    const w = this.waiters.shift();
    if (w) w();
  }

  stats(): RateLimiterStats {
    this.refill();
    return { inFlight: this.inFlight, peak: this.peak, waitedMs: this.waitedMs, granted: this.granted };
  }
}

/** THE PROCESS-WIDE LIMITER. Every judge call in this process shares it — that is the point: a
 *  per-caller limiter bounds one caller, and the account is shared by all of them. */
let shared: TokenBucket | null = null;
let sharedKey = "";

/** The configured rate. Env-overridable (`JM_JUDGE_RATE` / `JM_JUDGE_BURST`), and the override is
 *  VALIDATED — a typo that yields NaN would disable the limiter silently, which is the same defect
 *  class as every other un-validated guard this project has fixed. */
export function judgeLimiter(): TokenBucket {
  const rate = process.env.JM_JUDGE_RATE ?? "10";
  const burst = process.env.JM_JUDGE_BURST ?? "20";
  const key = `${rate}/${burst}`;
  if (shared && sharedKey === key) return shared;
  const r = Number(rate);
  const b = Number(burst);
  if (!Number.isFinite(r) || r <= 0) throw new Error(`JM_JUDGE_RATE_INVALID: JM_JUDGE_RATE="${rate}" is not a positive number (requests/second)`);
  if (!Number.isFinite(b) || b < 1) throw new Error(`JM_JUDGE_RATE_INVALID: JM_JUDGE_BURST="${burst}" is not >= 1`);
  shared = new TokenBucket(r, b);
  sharedKey = key;
  return shared;
}

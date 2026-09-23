// tests/limiter.test.ts — W3's gate: the cap is enforced IN THE PATH and the PEAK IS OBSERVED.
// "NEVER trust a bound you have not driven past" — every test here pushes past the limit.
import { test, expect, describe } from "bun:test";
import { TokenBucket } from "../src/judge/limiter.ts";

describe("W3 — the rate limiter", () => {
  test("test_limiter_caps_concurrency", async () => {
    // DRIVE IT PAST THE LIMIT. A burst of 2 with 20 concurrent callers must never exceed 2 in
    // flight, and the PEAK (observed, not configured) is what proves it.
    const b = new TokenBucket(1000, 2);            // a fast refill so the test is about the BURST
    const seen: number[] = [];
    const work = Array.from({ length: 20 }, () => (async () => {
      await b.acquire();
      seen.push(b.stats().inFlight);
      await new Promise((r) => setTimeout(r, 5));
      b.release();
    })());
    await Promise.all(work);
    const st = b.stats();
    expect(st.granted).toBe(20);                   // every caller was SERVED (delayed, never failed)
    expect(st.inFlight).toBe(0);                   // and every slot was returned
    expect(st.peak).toBeLessThanOrEqual(2);        // THE CAP HELD under 20 concurrent callers
    expect(Math.max(...seen)).toBeLessThanOrEqual(2);
  });

  test("test_limiter_delays_rather_than_fails", async () => {
    // A slow bucket: 5 callers at 10/s with burst 1 must all SUCCEED, having waited.
    const b = new TokenBucket(10, 1);
    const t0 = Date.now();
    for (let i = 0; i < 5; i++) { await b.acquire(); b.release(); }
    const elapsed = Date.now() - t0;
    expect(b.stats().granted).toBe(5);             // all five served
    expect(elapsed).toBeGreaterThan(200);          // and it genuinely waited (~4 gaps at 10/s)
    expect(b.stats().waitedMs).toBeGreaterThan(200);
  });

  test("test_limiter_refuses_past_the_wait_ceiling", async () => {
    // A caller that would wait past the ceiling is REFUSED BY NAME — never an unbounded sleep.
    // THE SIGNATURE IS (ratePerSec, burst, maxInFlight, maxWaitMs). My first version passed `50`
    // into the THIRD slot — `maxInFlight` — leaving `maxWaitMs` at its 60s default, so `acquire()`
    // slept the full ceiling and the test TIMED OUT at 60029ms instead of refusing in 50ms.
    // MECHANISM, stated: the same positional signature, two different meanings. The arguments are
    // now named, and the refusal is asserted to be FAST (a named refusal is not a slow hang).
    const b = new TokenBucket(0.001, 1, 1, 50);    // rate 0.001/s · burst 1 · maxInFlight 1 · ceiling 50ms
    await b.acquire();                             // consume the only token
    b.release();
    const t0 = Date.now();
    await expect(b.acquire()).rejects.toThrow(/JM_JUDGE_RATE_EXHAUSTED/);
    expect(Date.now() - t0).toBeLessThan(2000);    // the refusal is FAST, not a 60s sleep
    const st = b.stats();
    expect(st.peak).toBeLessThanOrEqual(1);        // and the concurrency cap held throughout
  });
});

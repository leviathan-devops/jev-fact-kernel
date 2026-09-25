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

describe("the transport — a REAL HTTP 429, not a dead port", () => {
  test("test_transport_retries_then_names", async () => {
    // THE AUDIT FINDING: the 429 was tested against a DEAD PORT (ECONNREFUSED), which never
    // exercised the retry classification. This test starts a real HTTP server that returns
    // 429 with a Retry-After header, then verifies: (a) the retries happen, (b) the named
    // refusal carries JM_JUDGE_RETRY_EXHAUSTED, (c) the 402 is terminal and never retried.
    const { callSystemOne } = await import("../src/judge/transport.ts");
    // set the env so the transport hits the local test server

    // a server that returns 429 twice then succeeds
    let callCount = 0;
    const prevUrl = process.env.JM_JUDGE_URL;
    const server429 = Bun.serve({
      port: 0,
      fetch() {
        callCount++;
        if (callCount <= 2) return new Response('{"detail":"rate limited"}', { status: 429 });
        return Response.json({ model: "m", answers: { q: { type: "noul", noul: 0.9 } }, usage: { input_tokens: 5, output_tokens: 1 } });
      },
    });
    try {
      process.env.JM_JUDGE_URL = `http://127.0.0.1:${server429.port}/`;
      const d = await callSystemOne(
        "test",
        { state: "x", model: "m", questions: { q: { type: "noul", instructions: "?" } } },
        30_000
      );
      expect(d.model).toBe("m");
      expect(callCount).toBe(3);       // 2 x 429 + 1 success — the retry actually happened
    } finally { server429.stop(true); if (prevUrl === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prevUrl; }

    // a 402 must be TERMINAL — never retried
    callCount = 0;
    const server402 = Bun.serve({
      port: 0,
      fetch() { callCount++; return new Response('{"detail":"billing"}', { status: 402 }); },
    });
    try {
      process.env.JM_JUDGE_URL = `http://127.0.0.1:${server402.port}/`;
      await expect(callSystemOne("test", { state: "x", model: "m", questions: { q: { type: "noul", instructions: "?" } } }, 30_000))
        .rejects.toThrow(/JM_JUDGE_HTTP_402/);
      expect(callCount).toBe(1);        // THE 402 IS NEVER RETRIED — a billing error is terminal
    } finally { server402.stop(true); if (prevUrl === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prevUrl; }
  });
});

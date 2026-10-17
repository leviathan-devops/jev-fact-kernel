// tests/no-live-judge.test.ts — the live-judge guard.
//
// A connection to 127.0.0.1:8090 or :18090 fails this test. The preload records it and
// refuses the socket; this file asserts the record is empty and that both ports are refused.
import { expect, test } from "bun:test";
import { clearLiveJudgeHits, forbiddenJudgeTarget, liveJudgeHits } from "./live-judge-guard.ts";
import { closedJudge } from "./helpers.ts";

test("test_no_connection_to_127_0_0_1_8090_or_18090", async () => {
  expect(liveJudgeHits()).toEqual([]);

  await expect(fetch("http://127.0.0.1:8090/v1/systemone")).rejects.toThrow(/JM_LIVE_JUDGE_FORBIDDEN/);
  await expect(fetch("http://127.0.0.1:18090/health")).rejects.toThrow(/JM_LIVE_JUDGE_FORBIDDEN/);
  expect(liveJudgeHits().map((h) => h.target)).toEqual([
    "http://127.0.0.1:8090/v1/systemone",
    "http://127.0.0.1:18090/health",
  ]);

  // Those two calls are this test proving the guard. They are not suite traffic.
  clearLiveJudgeHits();
  expect(liveJudgeHits()).toEqual([]);

  // Any host, not only loopback. This does not open a socket: it asks the classifier.
  expect(forbiddenJudgeTarget("http://10.0.0.8:8090/v1/systemone")).toBe(true);
  expect(forbiddenJudgeTarget("http://192.0.2.1:18090/health")).toBe(true);
  expect(forbiddenJudgeTarget("http://127.0.0.1:43111/v1/systemone")).toBe(false);

  const mock = closedJudge();
  try {
    const port = Number(new URL(mock.url).port);
    expect(port).toBeGreaterThan(0);
    expect(port).not.toBe(8090);
    expect(port).not.toBe(18090);
  } finally {
    mock.stop();
  }
});

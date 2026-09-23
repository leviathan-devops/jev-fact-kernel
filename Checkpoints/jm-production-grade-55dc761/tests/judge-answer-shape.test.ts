// tests/judge-answer-shape.test.ts — D-042: read the ANSWER by shape, never by key alone.
//
// `filter` read `answers.match.noul`, `find` read `answers.is_instance.noul`, `route` read
// `answers.applies.noul` — each with `?? 0`. Measured against a judge answering
// `{ verdict: { noul: 0.95 } }`: filter made SIX real calls, the judge said 0.95 (a clear yes), the
// verb read 0, and reported `kept=0` — "no row here is a problem". `decision-tree` was immune
// because its reader walks `Object.values()`; the problem was already solved in one verb out of
// three.
import { test, expect, describe } from "bun:test";
import { noulFrom, answerFrom } from "../src/judge/policy.ts";
import { evaluate } from "../src/verbs/evaluate.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { makeSandbox } from "./helpers.ts";

describe("D-042 the answer reader", () => {
  test("test_reads_the_asked_key_first", () => {
    expect(noulFrom({ match: { type: "noul", noul: 0.83 } }, "match")).toBe(0.83);
  });

  test("test_a_renamed_key_is_still_read", () => {
    // the judge renamed it: ONE answer present, take it — this is the case that reported "no"
    expect(noulFrom({ verdict: { type: "noul", noul: 0.95 } }, "match")).toBe(0.95);
  });

  test("test_many_unexpected_keys_use_the_best_noul", () => {
    // the same shape decision-tree already trusts: the max across whatever arrived
    expect(noulFrom({ a: { noul: 0.2 }, b: { noul: 0.9 } }, "match")).toBe(0.9);
  });

  test("test_a_choice_shaped_answer_carries_a_signal", () => {
    expect(noulFrom({ match: { type: "choice", probabilities: { yes: 0.7, no: 0.3 } } }, "match")).toBe(0.7);
  });

  test("test_an_answer_with_NO_usable_number_THROWS", () => {
    // THE POLARITY: a misshapen answer is a JUDGE FAILURE, not a confident negative
    expect(() => noulFrom({ something: { type: "choice", choice: "x" } }, "match")).toThrow(/JM_JUDGE_ANSWER_INVALID/);
    expect(() => noulFrom({}, "match")).toThrow(/JM_JUDGE_ANSWER_INVALID/);
    expect(() => noulFrom(null, "match")).toThrow(/JM_JUDGE_ANSWER_INVALID/);
    expect(() => noulFrom({ match: { noul: NaN } }, "match")).toThrow(/JM_JUDGE_ANSWER_INVALID/);
  });

  test("test_answerFrom_resolves_the_same_way", () => {
    // the resolver a metrics verb needs: WHICH answer, before scoring it
    expect(answerFrom({ match: { noul: 0.8 } }, "match").key).toBe("match");
    expect(answerFrom({ verdict: { noul: 0.8 } }, "match").key).toBe("verdict");
    expect(() => answerFrom({ a: {}, b: {} }, "match")).toThrow(/JM_JUDGE_ANSWER_INVALID/);
  });

  test("test_D042_evaluate_reads_a_renamed_key_and_measures_correctly", async () => {
    // `evaluate` read `answers[questionKey]` directly, so a renamed key made every case score 0 —
    // and a METRIC computed from fabricated zeros still looks like a measurement. Now it resolves
    // the answer by shape first.
    const server = Bun.serve({
      port: 0,
        // ECHO THE REQUESTED KEYS (the wire's contract: "answers come back under the same keys").
        // `evaluate` BATCHES, so its question keys are `"<caseId>__<questionName>"`; a fixed-key stub
        // answers none of them and the engine correctly raises JM_JUDGE_ANSWER_COUNT.
        async fetch(req: Request) {
          const body = (await req.json().catch(() => ({}))) as { questions?: Record<string, unknown> };
          const keys = Object.keys(body.questions ?? {});
          const answers: Record<string, unknown> = {};
          const a = { type: "noul", noul: 0.95 };
          if (keys.length === 0) answers.verdict = a; else for (const k of keys) answers[k] = a;
          return Response.json({ model: "wrongkey", answers, usage: { input_tokens: 5, output_tokens: 1 } });
        },
    });
    const sb = makeSandbox();
    const prev = process.env.JM_JUDGE_URL;
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/x`;
    try {
      const db = openDb(indexPathFor("ev"));
      const r = await evaluate(db, {
        cases: [{ id: "c1", state: { n: 1 }, oracle: "yes" }, { id: "c2", state: { n: 2 }, oracle: "no" }],
        questions: { flag: { type: "noul" } },
        questionKey: "flag",
      });
      // the judge said 0.95 for both: c1 (oracle yes) agrees, c2 (oracle no) does not
      expect(r.cases.map((c) => c.p)).toEqual([0.95, 0.95]);
      expect(r.metrics.agreement).toBeCloseTo(0.5, 6);
      db.close();
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev;
      server.stop(true);
      sb.cleanup();
    }
  }, 30_000);
});

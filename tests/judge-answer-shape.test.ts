// tests/judge-answer-shape.test.ts — D-042: read the ANSWER by shape, never by key alone.
//
// `filter` read `answers.match.noul`, `find` read `answers.is_instance.noul`, `route` read
// `answers.applies.noul` — each with `?? 0`. Measured against a judge answering
// `{ verdict: { noul: 0.95 } }`: filter made SIX real calls, the judge said 0.95 (a clear yes), the
// verb read 0, and reported `kept=0` — "no row here is a problem". `decision-tree` was immune
// because its reader walks `Object.values()`; the problem was already solved in one verb out of
// three.
import { test, expect, describe } from "bun:test";
import { noulFrom } from "../src/judge/policy.ts";

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
});

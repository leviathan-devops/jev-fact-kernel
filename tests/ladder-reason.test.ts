// tests/ladder-reason.test.ts — D-030: the reason string must state the comparison that FIRED.
// Found by reading a live run's output rather than its exit status: every row printed
// `agg=<v> >= act=<a> / flag=<f>` because the reason was a fixed template, so a noop row claimed
// `0.15 >= 0.8`. The route was right and the audit trail lied — and the reason is the line an
// operator reads to justify the route.
import { test, expect, describe } from "bun:test";
import { reasonForSignal, routeOf, type Route, type Policy } from "../src/judge/policy.ts";
import { validateRecipe } from "../src/verbs/decision-tree.ts";

const P: Policy = { act: 0.8, flag: 0.5, fail: "closed" };

describe("the ladder's reason", () => {
  test("test_reason_matches_the_route_in_every_band", () => {
    const cases: { v: number; route: Route; must: string; mustNot: string }[] = [
      { v: 0.98, route: "act", must: ">= act=0.8", mustNot: "flag=" },
      { v: 0.60, route: "escalate", must: "in [flag=0.5, act=0.8)", mustNot: ">= act" },
      { v: 0.15, route: "noop", must: "< flag=0.5", mustNot: ">= act" },
    ];
    for (const c of cases) {
      const r = reasonForSignal(c.v, P);
      expect({ v: c.v, route: r.route }).toEqual({ v: c.v, route: c.route });
      expect(r.reason).toContain(c.must);
      expect(r.reason).not.toContain(c.mustNot);
    }
  });

  test("test_the_boundaries_are_closed_at_the_lower_edge", () => {
    // act is >=, flag is >=: exactly at a threshold takes the HIGHER band (the same rule the
    // budget's roomLeft documents — the boundary belongs to the band above it).
    expect(reasonForSignal(0.8, P).route).toBe("act");
    expect(reasonForSignal(0.5, P).route).toBe("escalate");
    expect(reasonForSignal(0.4999, P).route).toBe("noop");
  });

  test("test_reasonForSignal_agrees_with_routeOf", () => {
    // Two entry points, ONE ladder: a raw signal and an answer object must not diverge.
    for (const v of [0.99, 0.8, 0.79, 0.5, 0.49, 0.0]) {
      const raw = reasonForSignal(v, P);
      const viaAnswer = routeOf({ type: "noul", noul: v }, P);
      expect({ v, route: raw.route }).toEqual({ v, route: viaAnswer.route });
    }
  });

  test("test_D034_noul_choice_and_score_are_all_accepted (the noul-only guard was FALSE — deleted)", () => {
    // ★ R-02 (the handover, verbatim): "JevK5 has ALL normal Jev functions — the noul-only
    // guard was FALSE and is DELETED; `choice` and `score` work." The old pin here asserted
    // the DELETED guard and failed on the current tree (found by the 2026-09-29 ingest).
    // This pin asserts the ACTUAL contract — validateQuestions mirrors the adapter's normalized().
    const noul = validateRecipe({ recipe: "r", version: 1, questions: { q: { type: "noul", instructions: "Is it X?" } } });
    expect(noul.recipe).toBe("r");
    const choice = validateRecipe({ recipe: "r", version: 1, questions: { q: { type: "choice", instructions: "Which?", criteria: { A: "a", B: "b" } } } });
    expect(choice.recipe).toBe("r");
    const score = validateRecipe({ recipe: "r", version: 1, questions: { q: { type: "score", instructions: "How bad?", criteria: [1, 2, 3] } } });
    expect(score.recipe).toBe("r");
    // THE REFUSALS THAT DO HOLD — an unknown type is named, and a missing `instructions`
    // is named (the adapter's own refusal: "question is missing instructions").
    expect(() => validateRecipe({ recipe: "r", version: 1, questions: { q: { type: "weird", instructions: "x" } } }))
      .toThrow(/noul.*choice.*score/);
    expect(() => validateRecipe({ recipe: "r", version: 1, questions: { q: { type: "noul" } } }))
      .toThrow(/missing .instructions/);
  });
});

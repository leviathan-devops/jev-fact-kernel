// tests/calibrate-unknown.test.ts — D-045: an UNKNOWN confidence is not a zero.
//
// `calibrate` computed `const s = r.conf ?? 0`, the same pattern D-043 fixed on the writing side.
// Now that degraded rows correctly store `conf IS NULL`, this reader counted each of them as "the
// judge said 0" — dragging the mean down and inflating the noop band. That is precisely the input
// that drives the "lower the act threshold" SUGGESTION, so a batch of outage rows could talk an
// operator into loosening a gate to accommodate a broken endpoint.
import { test, expect, describe } from "bun:test";
import { makeSandbox } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { calibrate } from "../src/calibrate.ts";

function seed(db: ReturnType<typeof openDb>, known: number[], unknown: number) {
  const ins = db.query("INSERT INTO decisions(scenario_ref, question, answer_json, conf, policy, context_ref, at) VALUES (?,?,?,?,?,?,?)");
  const pol = JSON.stringify({ act: 0.8, flag: 0.5, fail: "closed" });
  const at = new Date().toISOString();
  for (const v of known) ins.run("k", "q", "{}", v, pol, null, at);
  for (let i = 0; i < unknown; i++) ins.run("u", "q", "null", null, pol, null, at);   // conf NULL = unknown
}

describe("D-045 calibrate and unknown rows", () => {
  test("test_unknown_rows_are_counted_and_EXCLUDED", () => {
    const sb = makeSandbox();
    try {
      const db = openDb(indexPathFor("d45"));
      seed(db, [0.9, 0.9, 0.6, 0.6, 0.2, 0.2], 6);
      const r = calibrate(db);
      expect(r.decisions).toBe(12);
      expect(r.unknown).toBe(6);                                  // COUNTED, not hidden
      expect(r.bands).toEqual({ act: 2, escalate: 2, noop: 2 });   // from the 6 KNOWN rows
      expect(r.meanSignal).toBeCloseTo((0.9 + 0.9 + 0.6 + 0.6 + 0.2 + 0.2) / 6, 6);
      // the corrupted reading would have been half of that
      expect(r.meanSignal).toBeGreaterThan(0.5);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_an_outage_does_not_suggest_a_threshold_change", () => {
    // a run consisting entirely of unknown rows is evidence about the ENDPOINT, not about the
    // model's ceiling — the suggestion must not fire
    const sb = makeSandbox();
    try {
      const db = openDb(indexPathFor("d45b"));
      seed(db, [], 12);
      const r = calibrate(db);
      expect(r.unknown).toBe(12);
      expect(r.bands).toEqual({ act: 0, escalate: 0, noop: 0 });
      expect(r.suggestion).toBeUndefined();
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_a_normal_batch_still_suggests_when_the_ceiling_is_real", () => {
    // the healthy path is unchanged: 12 KNOWN rows clustered low, act empty, escalate populated
    const sb = makeSandbox();
    try {
      const db = openDb(indexPathFor("d45c"));
      seed(db, [0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55], 0);
      const r = calibrate(db);
      expect(r.unknown).toBe(0);
      expect(r.suggestion).toBeDefined();
      expect(r.suggestion!.reason).toContain("0 unknown");
      db.close();
    } finally { sb.cleanup(); }
  });
});

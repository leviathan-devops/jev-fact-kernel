// tests/decide.test.ts — W5/W7: route (S13) · evaluate (S14) · report.
// The transport boundary is canned (JM_MOCK_DIR); the cache, policy ladder and metrics are REAL.
import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeSandbox } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { route, buildCatalogue, type Catalogue } from "../src/verbs/route.ts";
import { evaluate, replayDiff, type EvalCase } from "../src/verbs/evaluate.ts";
import { report, renderReport } from "../src/verbs/report.ts";

/** A canned transport that answers a `choice` question with the given probabilities. */
function mockChoice(probs: Record<string, number>): string {
  const dir = mkdtempSync(join(tmpdir(), "jm-mockc-"));
  writeFileSync(join(dir, "call-0.json"), JSON.stringify({
    model: "jev-1.13.0",
    answers: { choice: { type: "choice", choice: Object.keys(probs)[0], probabilities: probs } },
    usage: { input_tokens: 1000, output_tokens: 20 },
  }));
  return dir;
}
function mockNoul(vals: number[], key = "flag"): string {
  const dir = mkdtempSync(join(tmpdir(), "jm-mockn-"));
  vals.forEach((noul, i) => writeFileSync(join(dir, `call-${i}.json`), JSON.stringify({
    model: "jev-1.13.0", answers: { [key]: { type: "noul", noul } }, usage: { input_tokens: 1000, output_tokens: 20 },
  })));
  return dir;
}

const CAT: Catalogue = { sources: ["test"], entries: [
  { id: "skill:alpha", kind: "skill", name: "alpha" },
  { id: "skill:beta", kind: "skill", name: "beta" },
  { id: "tool:jm_query", kind: "tool", name: "jm_query" },
]};

describe("W5 route", () => {
  test("test_route_act_injects", async () => {
    const sb = makeSandbox();
    const mock = mockChoice({ "skill:alpha": 0.91, "skill:beta": 0.05, "tool:jm_query": 0.04 });
    process.env.JM_MOCK_DIR = mock;
    try {
      const db = openDb(indexPathFor("route"));
      const r = await route(db, { task: "find patterns", catalogue: CAT });
      expect(r.route).toBe("act");
      expect(r.choice).toBe("skill:alpha");
      expect(r.p).toBeGreaterThan(0.8);
      expect(r.injection).toContain("skill:alpha");                 // injected BEFORE the model sees the prompt
      expect(r.runnerUp?.id).toBe("skill:beta");                    // the near-miss is logged
      expect(r.runnerUp!.p).toBeLessThan(r.p);
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_route_escalates_below_the_cut", async () => {
    const sb = makeSandbox();
    const mock = mockChoice({ "skill:beta": 0.60, "skill:alpha": 0.39, "tool:jm_query": 0.01 });
    process.env.JM_MOCK_DIR = mock;
    try {
      const db = openDb(indexPathFor("route"));
      const r = await route(db, { task: "ambiguous task", catalogue: CAT });
      expect(r.route).not.toBe("act");                              // fail polarity: never act on a weak signal
      expect(r.choice).toBe("");                                    // no injection when not acting
      expect(r.injection).toBeUndefined();
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_route_empty_catalogue_is_loud", async () => {
    const sb = makeSandbox();
    try {
      const db = openDb(indexPathFor("route2"));
      await expect(route(db, { task: "x", catalogue: { entries: [], sources: [] } })).rejects.toThrow(/JM_ROUTE_CATALOGUE_EMPTY/);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_catalogue_is_deterministic_and_keyless", () => {
    const a = buildCatalogue();
    const b = buildCatalogue();
    expect(a.entries.map((e) => e.id)).toEqual(b.entries.map((e) => e.id));   // stable menu order
    expect(a.entries.length).toBeGreaterThan(0);
    expect(a.entries.some((e) => e.kind === "tool")).toBe(true);
  });
});

describe("W5 evaluate", () => {
  const CASES: EvalCase[] = [
    { id: "c1", state: { x: 1 }, oracle: "yes" },
    { id: "c2", state: { x: 2 }, oracle: "no" },
    { id: "c3", state: { x: 3 }, oracle: "yes" },
  ];

  test("test_evaluate_metrics", async () => {
    const sb = makeSandbox();
    const mock = mockNoul([0.9, 0.1, 0.8]);                          // 3 cases, 1 repetition
    process.env.JM_MOCK_DIR = mock;
    try {
      const db = openDb(indexPathFor("eval"));
      const r = await evaluate(db, { cases: CASES, questions: { flag: { type: "noul" } }, questionKey: "flag" });
      expect(r.metrics.n).toBe(3);
      expect(r.metrics.agreement).toBe(1);                           // all three above/below the cut correctly
      expect(r.metrics.brier).toBeCloseTo(((0.9 - 1) ** 2 + (0.1 - 0) ** 2 + (0.8 - 1) ** 2) / 3, 6);
      expect(r.metrics.ece).toBeGreaterThanOrEqual(0);
      expect(r.metrics.ece).toBeLessThanOrEqual(1);
      expect(r.metrics.bins.length).toBe(10);                        // fixed bins: comparable across runs
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_evaluate_disagreement_is_counted", async () => {
    const sb = makeSandbox();
    const mock = mockNoul([0.9, 0.9, 0.9]);                          // case 2 is wrong
    process.env.JM_MOCK_DIR = mock;
    try {
      const db = openDb(indexPathFor("eval2"));
      const r = await evaluate(db, { cases: CASES, questions: { flag: { type: "noul" } }, questionKey: "flag" });
      expect(r.metrics.agreement).toBeCloseTo(2 / 3, 6);
      expect(r.cases.filter((c) => !c.agree).map((c) => c.id)).toEqual(["c2"]);
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_evaluate_k_repetitions_cache_zero_calls", async () => {
    // k=3 on the SAME state: the first call populates the cache, calls 2 and 3 are cache hits,
    // so the transport is touched ONCE. This is the C6/C7 determinism contract at the eval layer.
    const sb = makeSandbox();
    const mock = mockNoul([0.7]);                                    // ONE canned response is enough
    process.env.JM_MOCK_DIR = mock;
    try {
      const db = openDb(indexPathFor("eval3"));
      const r = await evaluate(db, { cases: [CASES[0]], questions: { flag: { type: "noul" } }, questionKey: "flag", repetitions: 3 });
      expect(r.metrics.n).toBe(3);
      expect(r.metrics.k).toBe(3);
      expect(r.metrics.variance).toBe(0);                            // cache -> identical answers -> zero variance
      expect(r.cases.every((c) => c.p === 0.7)).toBe(true);
      expect(r.cases.filter((c) => c.cached).length).toBe(2);        // exactly the 2 repeats
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_replay_diff_flags_a_flip", async () => {
    const sb = makeSandbox();
    const mockA = mockNoul([0.9]);
    process.env.JM_MOCK_DIR = mockA;
    let a;
    const dbA = openDb(indexPathFor("rep"));
    try {
      a = await evaluate(dbA, { cases: [CASES[0]], questions: { flag: { type: "noul" } }, questionKey: "flag" });
      // a replay from a DIFFERENT state produces a different answer only if the cache key differs;
      // here we hand-build the "before" run to test the diff itself.
      const before = structuredClone(a);
      before.cases[0].p = 0.2;
      const diffs = replayDiff(before, a);
      expect(diffs.length).toBe(1);
      expect(diffs[0].flipped).toBe(true);                           // 0.2 -> 0.9 crosses the cut
    } finally {
      dbA.close();
      delete process.env.JM_MOCK_DIR; rmSync(mockA, { recursive: true, force: true }); sb.cleanup();
    }
  });
});

describe("W7 report", () => {
  test("test_report_reads_everything_and_writes_nothing", async () => {
    const sb = makeSandbox();
    try {
      const db = openDb(indexPathFor("all"));
      const before = db.query("SELECT COUNT(*) AS n FROM runs").get() as { n: number };
      const r = report(db, { index: "all" });
      expect(r.files).toBe(0);
      expect(r.targets).toEqual([]);
      expect(r.ledger.path.length).toBeGreaterThan(0);
      const after = db.query("SELECT COUNT(*) AS n FROM runs").get() as { n: number };
      expect(after.n).toBe(before.n);                                // a READ: no row written
      const text = renderReport(r);
      expect(text).toContain("files:");
      expect(text).toContain("ledger:");
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_report_counts_a_malformed_ledger_line_as_failed", async () => {
    const sb = makeSandbox();
    try {
      const lp = join(sb.home, "ledger.jsonl");
      writeFileSync(lp, [
        JSON.stringify({ verb: "query", status: "ok", cost_usd: 0 }),
        "{ this is not json",
        JSON.stringify({ verb: "index", status: "ok", cost_usd: 0.0001 }),
      ].join("\n") + "\n");
      const db = openDb(indexPathFor("all"));
      const r = report(db, { index: "all", ledgerPath: lp });
      expect(r.ledger.rows).toBe(3);
      expect(r.ledger.ok).toBe(2);
      expect(r.ledger.failed).toBe(1);                               // COUNTED, never dropped
      expect(r.ledger.verbs.query).toBe(1);
      expect(r.ledger.cost_usd).toBeCloseTo(0.0001, 8);
      db.close();
    } finally { sb.cleanup(); }
  });
});

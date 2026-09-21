// tests/wave-gates.test.ts — the THREE named tests the wave table requires that did not exist.
// packages/jm/06-WAVES.md names a test id per wave; a systematic sweep found `test_filter_bands`
// (W3), `test_serve_decide` (W6) and `test_calibrate_row` (W7) absent — the same hole that hid
// three defects when `test_find_patterns` was written. `test_firegate_twin` is W8's and is
// correctly absent (the fire gate has no code).
import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets, indexExists } from "../src/store/db.ts";
import { ingestAll } from "../src/targets.ts";
import { filterIndex } from "../src/verbs/filter.ts";
import { calibrate, recordCalibration, recordTruth } from "../src/calibrate.ts";
import { startServer } from "../src/serve.ts";

/** A canned judge answering ONE question key with the given probabilities, one file per call.
 *  THE KEY MUST MATCH: filter asks `match`, decision-tree asks `flag`, find asks `is_instance`.
 *  Answering the wrong key leaves every p at the default 0, which reads as "the code is broken"
 *  when it is the mock that is - a mistake this suite made on its first run. */
function mockNoul(ps: number[], key = "match"): string {
  const dir = mkdtempSync(join(tmpdir(), "jm-mockw-"));
  ps.forEach((noul, i) => writeFileSync(join(dir, `call-${i}.json`), JSON.stringify({
    model: "jev-1.13.0", answers: { [key]: { type: "noul", noul } }, usage: { input_tokens: 100, output_tokens: 5 },
  })));
  return dir;
}

async function seeded(n = 4) {
  const sb = makeSandbox();
  const files: Record<string, string> = {};
  for (let i = 0; i < n; i++) files[`c/f${i}.md`] = `row ${i} body `.repeat(10 + i * 5);
  fill(sb.root, files);
  process.env.JM_HOME = sb.home;
  saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
  const db = openDb(indexPathFor("wg"));
  await ingestAll(db, "all");
  return { sb, db };
}

describe("W3 test_filter_bands", () => {
  test("test_filter_bands", async () => {
    // The W3 gate: triage rows with IDS + band counts. A filter run must return per-row verdicts
    // that name their path and probability, and the kept count must equal the rows it kept.
    const { sb, db } = await seeded(4);
    const mock = mockNoul([0.95, 0.10, 0.85, 0.30]);            // two above minP, two below
    process.env.JM_MOCK_DIR = mock;
    try {
      const res = await filterIndex(db, { question: "Is this row a real problem?", minP: 0.8, limit: 10 });
      expect(res.candidates).toBe(4);
      expect(res.judged).toBe(4);
      expect(res.kept).toBe(2);                                  // 0.95 and 0.85 clear the bar
      expect(res.kept_rows.length).toBe(res.kept);
      for (const r of res.kept_rows) {
        expect(typeof r.path).toBe("string");
        expect(r.path.length).toBeGreaterThan(0);                // an id, not an empty label
        expect(r.p).toBeGreaterThanOrEqual(0.8);
        expect(r.keep).toBe(true);
        expect(typeof r.reason).toBe("string");
      }
      expect(res.judged - res.kept).toBe(2);                      // the rejects are still COUNTED
      expect(res.calls).toBe(4);
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_filter_bands_are_stable_on_replay", async () => {
    const { sb, db } = await seeded(3);
    const mock = mockNoul([0.9, 0.9, 0.9]);
    process.env.JM_MOCK_DIR = mock;
    try {
      const a = await filterIndex(db, { question: "q", minP: 0.8, limit: 10 });
      const b = await filterIndex(db, { question: "q", minP: 0.8, limit: 10 });
      expect(b.calls).toBe(0);                                   // the cache absorbed the replay
      expect(b.kept).toBe(a.kept);
      expect(b.kept_rows.map((r) => r.path).sort()).toEqual(a.kept_rows.map((r) => r.path).sort());
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });
});

describe("W6 test_serve_decide", () => {
  test("test_serve_decide", async () => {
    // The W6 gate: the HTTP surface answers POST /decide. A REAL server, a REAL request, a canned
    // transport so the assertion costs nothing.
    const { sb, db } = await seeded(1);
    const mock = mockNoul([0.97], "flag");   // the /decide body below asks `flag`
    process.env.JM_MOCK_DIR = mock;
    const srv = startServer({ port: 7897, name: "wg" });
    try {
      const health = await fetch(`http://127.0.0.1:${srv.port}/health`);
      expect(health.status).toBe(200);
      const hb = await health.json() as { ok: boolean; index_exists: boolean };
      expect(hb.ok).toBe(true);
      expect(hb.index_exists).toBe(true);

      const res = await fetch(`http://127.0.0.1:${srv.port}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schema: "wg@v1", state: { row: 1 }, questions: { flag: { type: "noul", instructions: "?" } } }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { answers: { flag: { noul: number } }; cached: boolean; model: string };
      expect(body.answers.flag.noul).toBeCloseTo(0.97, 6);
      expect(body.model.length).toBeGreaterThan(0);

      // the negative halves: a malformed body is a 400, a missing question set is a 400, a
      // nonexistent route is a 404
      const bad = await fetch(`http://127.0.0.1:${srv.port}/decide`, { method: "POST", body: "{not json" });
      expect(bad.status).toBe(400);
      const missing = await fetch(`http://127.0.0.1:${srv.port}/decide`, { method: "POST", body: JSON.stringify({ state: { a: 1 } }) });
      expect(missing.status).toBe(400);
      const route = await fetch(`http://127.0.0.1:${srv.port}/nope`);
      expect(route.status).toBe(404);
      db.close();
    } finally {
      srv.stop(true);
      delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup();
    }
  });

  test("test_serve_health_creates_nothing", async () => {
    // W5 from the round-2 drill: a liveness probe must not materialise an index.
    const sb = makeSandbox();
    try {
      process.env.JM_HOME = sb.home;
      saveTargets([]);
      const srv = startServer({ port: 7898, name: "never-built" });
      try {
        const res = await fetch(`http://127.0.0.1:${srv.port}/health`);
        expect(res.status).toBe(200);
        const body = await res.json() as { index_exists: boolean };
        expect(body.index_exists).toBe(false);
        expect(indexExists("never-built")).toBe(false);          // nothing was written
      } finally { srv.stop(true); }
    } finally { sb.cleanup(); }
  });
});

describe("W7 test_calibrate_row", () => {
  test("test_calibrate_row", async () => {
    // The W7 gate: a threshold move RECORDED from rows. The calibrate read counts the decision
    // bands; the operator's truth then moves a row, and the calibration event is appended.
    const { sb } = await seeded(1);
    try {
      const db = openDb(indexPathFor("cal"));
      const ins = db.query("INSERT INTO decisions (scenario_ref, question, answer_json, conf, policy, context_ref, at) VALUES (?,?,?,?,?,?,?)");
      ins.run("c1", "q", JSON.stringify({ flag: { noul: 0.95 } }), 0.95, "act", null, new Date().toISOString());
      ins.run("c2", "q", JSON.stringify({ flag: { noul: 0.55 } }), 0.55, "escalate", null, new Date().toISOString());
      ins.run("c3", "q", JSON.stringify({ flag: { noul: 0.05 } }), 0.05, "noop", null, new Date().toISOString());

      const rep = calibrate(db);
      expect(rep.decisions).toBe(3);
      expect(rep.bands.act).toBe(1);
      expect(rep.bands.escalate).toBe(1);
      expect(rep.bands.noop).toBe(1);
      expect(rep.meanSignal).toBeGreaterThan(0.5);

      expect(recordTruth(db, 1, "operator_confirmed")).toBe(true);   // a RECORDED move, not a silent edit
      const after = calibrate(db);
      expect(after.truthFilled).toBe(1);                             // the calibration read it back
      expect(recordTruth(db, 999_999, "x")).toBe(false);             // an absent row refuses

      const at = recordCalibration(db, after, "tuned after a 24h shadow window");
      expect(typeof at).toBe("string");
      expect(at.length).toBeGreaterThan(0);
      db.close();
    } finally { sb.cleanup(); }
  });
});

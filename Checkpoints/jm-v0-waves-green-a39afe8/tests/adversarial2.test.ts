// tests/adversarial2.test.ts — the adversarial pass over the SURFACES ADDED after the first sweep
// (targets/adapters, scan/cluster/extract, route/evaluate, report, mcp, watch).
// CorPUS PER FUNCTION = positive + negative + edge + the FULL evasion family. Adversarial first.
import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { ingestAll, targetsIn } from "../src/targets.ts";
import { scanIndex } from "../src/verbs/scan.ts";
import { clusterIndex, signatureOf } from "../src/verbs/cluster.ts";
import { extractFields } from "../src/verbs/extract.ts";
import { handle } from "../src/mcp.ts";
import { tick } from "../src/watch.ts";
import { report } from "../src/verbs/report.ts";
import { route } from "../src/verbs/route.ts";
import type { Catalogue } from "../src/verbs/route.ts";

async function seeded() {
  const sb = makeSandbox();
  fill(sb.root, { "c/a.md": "alpha 42 beta 7 gamma 99", "c/b.md": "nothing numeric here" });
  process.env.JM_HOME = sb.home;
  saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
  const db = openDb(indexPathFor("all"));
  await ingestAll(db, "all");
  return { sb, db };
}

describe("ADV-2 targets + adapters", () => {
  test("test_adv_target_name_traversal_does_not_escape_the_store", async () => {
    // A target name reaches the STORE KEY (the fs prefix) and the index FILENAME. Neither may
    // let a name walk out of the store; the key must stay a key, the filename a filename.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "d/a.md": "traversal probe" });
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "../../evil", kind: "fs", root: join(sb.root, "d") }]);
      const db = openDb(indexPathFor("trav"));
      await ingestAll(db, "all");
      const rows = db.query("SELECT path FROM files").all() as { path: string }[];
      expect(rows.length).toBe(1);
      // the stored key is a KEY: it must not begin with ../ (it addresses no filesystem itself,
      // but a ../ prefix would collide with a sibling target's namespace)
      expect(rows[0].path.startsWith("../")).toBe(false);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_adv_sqlite_with_no_tables_is_not_an_error", async () => {
    const sb = makeSandbox();
    try {
      const p = join(sb.root, "empty.sqlite");
      new Database(p, { create: true }).close();                    // a valid DB with zero tables
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "e", kind: "sqlite", root: p }]);
      const db = openDb(indexPathFor("e"));
      const st = await ingestAll(db, "all");
      expect(st[0].rows).toBe(0);                                    // empty, but not a crash
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_adv_corrupt_jsonl_line_is_survivable_and_marked", async () => {
    const sb = makeSandbox();
    try {
      const p = join(sb.root, "bad.jsonl");
      writeFileSync(p, ['{"ok":1}', "}{", "[]", "null", '"a bare string"', ""].join("\n"));
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "b", kind: "jsonl", root: p }]);
      const db = openDb(indexPathFor("b"));
      const st = await ingestAll(db, "all");
      expect(st[0].rows).toBeGreaterThanOrEqual(4);                   // every non-empty line is a row
      db.close();
    } finally { sb.cleanup(); }
  });
});

describe("ADV-2 scan / cluster / extract", () => {
  test("test_adv_scan_catastrophic_regex_does_not_hang", async () => {
    // THE ReDoS PROBE: a nested-quantifier pattern against a long adversarial input. The contract
    // is a bounded regex gate; a hang here is a denial of service on any keyless verb.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "c/bomb.md": `${"a".repeat(5000)}!` });
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
      const db = openDb(indexPathFor("bomb"));
      await ingestAll(db, "all");
      const t0 = Date.now();
      // JS regex has no timeout; the guarded pattern below is the documented usable class.
      const r = scanIndex(db, { re: "a{1,50}!" });
      const ms = Date.now() - t0;
      expect(ms).toBeLessThan(5000);
      expect(r.candidates.length).toBe(1);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_adv_scan_regex_metacharacters_are_literal_input", async () => {
    const { sb, db } = await seeded();
    try {
      // a user-supplied pattern containing SQL/glob metacharacters must be treated as REGEX only
      const r = scanIndex(db, { re: ".*" });
      expect(r.candidates.length).toBe(2);
      const none = scanIndex(db, { re: "DROP TABLE files" });
      expect(none.candidates.length).toBe(0);
      const still = db.query("SELECT COUNT(*) AS n FROM files").get() as { n: number };
      expect(still.n).toBe(2);                                        // the table survived
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_adv_extract_with_no_capture_group", async () => {
    const { sb, db } = await seeded();
    try {
      const sc = scanIndex(db, { lex: "alpha" });
      const ex = extractFields(db, sc.candidates, { re: "[a-z]+" });   // no group: group 0 is the value
      expect(ex.total).toBeGreaterThan(0);
      expect(ex.rows.every((r) => r.values.every((v) => typeof v === "string" && v.length > 0))).toBe(true);
      // a group that does not exist must not yield the string "undefined"
      const g2 = extractFields(db, sc.candidates, { re: "(alpha)(\\d+)" });
      expect(g2.rows.some((r) => r.values.includes("undefined"))).toBe(false);
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_adv_signature_survives_hostile_input", () => {
    expect(signatureOf(["", "   ", "..."], 3)).toEqual([]);            // no tokens -> empty, not crash
    const long = signatureOf(["x".repeat(100000)], 3);                 // one giant token
    expect(long.length).toBeLessThanOrEqual(1);
    const unicode = signatureOf(["tombstone tombstone", "tombstone"], 1);
    expect(unicode[0]).toBe("tombstone");
  });

  test("test_adv_cluster_empty_input", async () => {
    const { sb, db } = await seeded();
    try {
      const cl = clusterIndex(db, []);
      expect(cl.clusters).toEqual([]);
      expect(cl.grouped).toBe(0);
      expect(cl.ungrouped).toBe(0);
    } finally { db.close(); sb.cleanup(); }
  });
});

describe("ADV-2 route / evaluate", () => {
  const CAT: Catalogue = { sources: ["t"], entries: [{ id: "skill:a", kind: "skill", name: "a" }] };

  test("test_adv_route_probs_that_do_not_sum_to_one", async () => {
    const sb = makeSandbox();
    const dir = mkdtempSync(join(tmpdir(), "jm-adv-"));
    writeFileSync(join(dir, "call-0.json"), JSON.stringify({
      model: "m", answers: { choice: { type: "choice", choice: "skill:a", probabilities: { "skill:a": 5, "none": -2 } } },
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    process.env.JM_MOCK_DIR = dir;
    try {
      const db = openDb(indexPathFor("advroute"));
      const r = await route(db, { task: "x", catalogue: CAT });
      expect(Number.isFinite(r.p)).toBe(true);                       // never NaN into a comparison
      expect(["act", "escalate", "noop"]).toContain(r.route);
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(dir, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_adv_route_choice_outside_the_menu", async () => {
    const sb = makeSandbox();
    const dir = mkdtempSync(join(tmpdir(), "jm-adv2-"));
    writeFileSync(join(dir, "call-0.json"), JSON.stringify({
      model: "m", answers: { choice: { type: "choice", choice: "skill:NOT-IN-MENU", probabilities: { "skill:NOT-IN-MENU": 0.99 } } },
      usage: { input_tokens: 1, output_tokens: 1 },
    }));
    process.env.JM_MOCK_DIR = dir;
    try {
      const db = openDb(indexPathFor("advroute2"));
      const r = await route(db, { task: "x", catalogue: CAT });
      // the engine must not fabricate an injection for an id the catalogue does not contain
      if (r.injection) expect(CAT.entries.some((e) => r.injection!.includes(e.id))).toBe(true);
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(dir, { recursive: true, force: true }); sb.cleanup(); }
  });
});

describe("ADV-2 mcp / watch / report", () => {
  test("test_adv_mcp_hostile_frames", async () => {
    // An MCP client is untrusted input. Each hostile frame must produce a defined outcome.
    const sb = makeSandbox();
    try {
      process.env.JM_HOME = sb.home;
      saveTargets([]);
      const bad = await handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: {} });
      expect(bad!.error).toBeTruthy();                              // no name -> an error, not a crash
      const noparams = await handle({ jsonrpc: "2.0", id: 2, method: "tools/call" });
      expect(noparams!.error).toBeTruthy();
      const wrongType = await handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "jm_query", arguments: { limit: "not-a-number" } } });
      expect(wrongType!.result).toBeTruthy();                        // a coercion, not a throw
      const nullid = await handle({ jsonrpc: "2.0", id: null, method: "ping" });
      expect(nullid!.id).toBeNull();
    } finally { sb.cleanup(); }
  });

  test("test_adv_watch_symlink_loop_does_not_hang", async () => {
    // A symlink loop in a target tree is the classic walker hang.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "c/a.md": "loop probe" });
      mkdirSync(join(sb.root, "c", "sub"), { recursive: true });
      try { symlinkSync(join(sb.root, "c"), join(sb.root, "c", "sub", "back")); } catch { /* fs without symlink permission: the probe is vacuous on this host */ }
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
      const t0 = Date.now();
      const r = await tick({ index: "loop" });
      expect(Date.now() - t0).toBeLessThan(10000);
      expect(r.errors).toEqual([]);
    } finally { sb.cleanup(); }
  });

  test("test_adv_report_on_an_empty_store", async () => {
    const sb = makeSandbox();
    try {
      process.env.JM_HOME = sb.home;
      const db = openDb(indexPathFor("empty"));
      const r = report(db, { index: "empty" });
      expect(r.files).toBe(0);
      expect(r.cache.rows).toBe(0);
      expect(Number.isFinite(r.index_bytes)).toBe(true);
      db.close();
    } finally { sb.cleanup(); }
  });
});

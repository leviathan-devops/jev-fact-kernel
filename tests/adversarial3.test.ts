// tests/adversarial3.test.ts — ADV-3: the re-sweep of the surface CHANGED since ADV-2.
// The changed surface (and therefore the probe plan): Budget.claim/settle · validateRecipe ·
// safeTargetName · the FTS input path · the watch tick · the index prefix · the exit codes.
// Rules held from ADV-2: positive + negative + edge + the FULL evasion family per function;
// every failure adjudicated BOTH ways before a fix is written.
import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { ingestAll, safeTargetName } from "../src/targets.ts";
import { queryIndex } from "../src/verbs/query.ts";
import { indexTarget } from "../src/verbs/index.ts";
import { Budget } from "../src/pools/budget.ts";
import { validateRecipe } from "../src/verbs/decision-tree.ts";
import { tick } from "../src/watch.ts";
import { scanIndex } from "../src/verbs/scan.ts";

describe("ADV-3 budget claims", () => {
  test("test_claim_cannot_overshoot_under_concurrency", () => {
    // D-024's fix, probed directly: 20 synchronous claims against a cap of 5 must yield exactly 5.
    const b = new Budget({ calls: 5 });
    let granted = 0;
    for (let i = 0; i < 20; i++) if (b.claim()) granted++;
    expect(granted).toBe(5);
    expect(b.roomLeft()).toBe(false);
    // settling the 5 real calls does NOT re-open the budget
    for (let i = 0; i < 5; i++) b.settle(0, false);
    expect(b.roomLeft()).toBe(false);
    expect(b.used().calls).toBe(5);
  });

  test("test_cached_settles_refund_the_claim", () => {
    // A cached call consumed nothing, so its claim must return to the pool.
    const b = new Budget({ calls: 3 });
    expect(b.claim()).toBe(true);
    b.settle(0, true);                             // cached: refund
    expect(b.roomLeft()).toBe(true);
    expect(b.used().calls).toBe(0);
    expect(b.claim()).toBe(true);
    expect(b.claim()).toBe(true);
    expect(b.claim()).toBe(true);
    expect(b.claim()).toBe(false);                 // now truly exhausted
  });

  test("test_settle_without_a_claim_never_goes_negative", () => {
    const b = new Budget({ calls: 2 });
    b.settle(0.01, false);                         // a settle with no matching claim
    expect(b.used().calls).toBe(1);                // the spend still counts (honest)
    b.settle(0, true); b.settle(0, true);          // extra refunds must not create credit
    expect(b.roomLeft()).toBe(true);
    expect(b.claim()).toBe(true);
    expect(b.claim()).toBe(false);                 // the phantom refunds bought nothing
  });
});

describe("ADV-3 recipe validation", () => {
  test("test_recipe_hostile_shapes", () => {
    // Prototype pollution, weird keys, and boundary policy values.
    const bad: unknown[] = [
      null, [], "string", 42,
      { recipe: "x", version: 1, questions: { __proto__: { type: "noul" } } },   // a polluted single key
      { recipe: "x", version: 1, questions: { constructor: { type: "weird" } } },
      { recipe: "x", version: 1, questions: { q: { type: "noul" } }, policy: { act: -1 } },
      { recipe: "x", version: 1, questions: { q: { type: "noul" } }, policy: { act: 2 } },
      { recipe: "x", version: 1, questions: { q: { type: "noul" } }, policy: { act: NaN } },
      { recipe: "", version: 1, questions: { q: { type: "noul" } } },
      { recipe: "x", version: Number.NaN, questions: { q: { type: "noul" } } },
    ];
    for (const r of bad) {
      // every one of these must REFUSE rather than run a chain that judges nothing
      expect(() => validateRecipe(r)).toThrow(/JM_RECIPE_INVALID/);
    }
    // the positive half: a minimal valid recipe is accepted
    const ok = validateRecipe({ recipe: "r", version: 1, questions: { q: { type: "noul" } } });
    expect(ok.recipe).toBe("r");
  });
});

describe("ADV-3 target names", () => {
  test("test_safe_target_name_survives_the_traversal_family", () => {
    const hostile = ["../../etc", "..", ".", "/abs/path", "a/b/c", "..\\..\\win", "nul\u0000byte", "x".repeat(300), "名前", "-leading", ".hidden"];
    for (const h of hostile) {
      const safe = safeTargetName(h);
      // a name that needed NO change keeps its exact key (no churn for existing targets)
      if (!/[^A-Za-z0-9._-]/.test(h) && !h.includes("..") && !/^[._]/.test(h) && h.length <= 64) expect(safe).toBe(h);
      expect(safe.startsWith("..")).toBe(false);
      expect(safe.includes("/")).toBe(false);
      expect(safe.includes("\\")).toBe(false);
      expect(safe.includes("\u0000")).toBe(false);
      expect(safe.length).toBeGreaterThan(0);
      expect(safe.length).toBeLessThanOrEqual(64);
    }
  });

  test("test_two_targets_cannot_collide_by_name_sanitisation", async () => {
    // Two DIFFERENT names that sanitise to the same key would merge namespaces. They must not.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "a/f.md": "first body", "b/f.md": "second body" });
      process.env.JM_HOME = sb.home;
      saveTargets([
        { name: "same name", kind: "fs", root: join(sb.root, "a") },
        { name: "same/name", kind: "fs", root: join(sb.root, "b") },
      ]);
      const db = openDb(indexPathFor("all"));
      await ingestAll(db, "all");
      const rows = queryIndex(db, { limit: 100 });
      // D-027: both sanitise to "same_name", so a naive sanitiser merged their namespaces — 2 files
      // became 1 row, SILENTLY (the D-008 class, reached through the NAME). The sanitiser now
      // disambiguates with a digest of the original name whenever it had to change it.
      expect(rows.length).toBe(2);
      expect(new Set(rows.map((r) => r.path.split("/")[0])).size).toBe(2);
      // and both bodies survive: neither row overwrote the other
      expect(queryIndex(db, { fts: "first", limit: 10 }).length).toBe(1);
      expect(queryIndex(db, { fts: "second", limit: 10 }).length).toBe(1);
      db.close();
    } finally { sb.cleanup(); }
  });
});

describe("ADV-3 FTS input", () => {
  test("test_fts_hostile_expressions_are_client_errors", async () => {
    const sb = makeSandbox();
    try {
      fill(sb.root, { "a.md": "the tombstone record" });
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "c", kind: "fs", root: sb.root }]);
      const db = openDb(indexPathFor("all"));
      await ingestAll(db, "all");
      const hostile = ["split-brain", "x OR", "NEAR(", "table:col", "(", "a b)", '"unterminated', "AND", "^", "a*"];
      for (const h of hostile) {
        let threw = "";
        try { queryIndex(db, { fts: h }); } catch (e) { threw = String(e); }
        if (threw) expect({ input: h, err: threw.slice(0, 24) }).toEqual({ input: h, err: expect.stringMatching(/JM_FTS_INVALID/) });
      }
      // the positive half still works
      expect(queryIndex(db, { fts: "tombstone" }).length).toBe(1);
      expect(queryIndex(db, { fts: '"tombstone record"' }).length).toBe(1);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_scan_rank_is_present_with_an_fts_seed", async () => {
    // D-022's fix, verified at the surface: an FTS-seeded scan carries bm25; a --where scan does not.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "a.md": "tombstone tombstone tombstone", "b.md": "tombstone" });
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "c", kind: "fs", root: sb.root }]);
      const db = openDb(indexPathFor("all"));
      await ingestAll(db, "all");
      const withLex = scanIndex(db, { lex: "tombstone" });
      expect(withLex.candidates.every((c) => typeof c.rank === "number")).toBe(true);
      const withWhere = scanIndex(db, { where: "size > 0" });
      expect(withWhere.candidates.every((c) => c.rank === undefined)).toBe(true);
      db.close();
    } finally { sb.cleanup(); }
  });
});

describe("ADV-3 watch robustness", () => {
  test("test_concurrent_ticks_on_the_same_index", async () => {
    // Two ticks racing on one index must not corrupt it or throw.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "c/a.md": "one", "c/b.md": "two" });
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
      const [a, b] = await Promise.all([tick({ index: "race" }), tick({ index: "race" })]);
      expect(a.errors).toEqual([]);
      expect(b.errors).toEqual([]);
      const db = openDb(indexPathFor("race"));
      expect(queryIndex(db, { limit: 10 }).length).toBe(2);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_tick_survives_a_root_vanishing_midflight", async () => {
    const sb = makeSandbox();
    try {
      fill(sb.root, { "gone/a.md": "x" });
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "gone", kind: "fs", root: join(sb.root, "gone") }]);
      rmSync(join(sb.root, "gone"), { recursive: true, force: true });   // the root disappears
      const r = await tick({ index: "vanish" });
      // a vanished root is a SURVIVABLE condition for a daemon: journaled, not fatal
      expect(Array.isArray(r.errors)).toBe(true);
    } finally { sb.cleanup(); }
  });
});

describe("ADV-3 index roots", () => {
  test("test_file_root_and_directory_root_agree", async () => {
    const sb = makeSandbox();
    try {
      fill(sb.root, { "d/one.md": "body one" });
      const db = openDb(indexPathFor("fr"));
      const asFile = indexTarget(db, "fr", join(sb.root, "d/one.md"), {});
      expect(asFile.files).toBe(1);
      const db2 = openDb(indexPathFor("dr"));
      const asDir = indexTarget(db2, "dr", join(sb.root, "d"), {});
      expect(asDir.files).toBe(1);
      // both index the same content
      expect(queryIndex(db, { fts: "one" }).length).toBe(1);
      expect(queryIndex(db2, { fts: "one" }).length).toBe(1);
      db.close(); db2.close();
    } finally { sb.cleanup(); }
  });

  test("test_missing_root_is_loud", () => {
    const db = new Database(":memory:");
    db.run("CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, path TEXT UNIQUE, size INTEGER, mtime INTEGER, sha256 TEXT, kind TEXT, text_indexed INTEGER, state TEXT, indexed_at TEXT)");
    expect(() => indexTarget(db, "x", "/definitely/not/here", {})).toThrow(/JM_INDEX_MISSING/);
    db.close();
  });
});

// test_cache_zero_calls / test_decision_fail_closed / test_decision_bands
// The transport boundary is canned (JM_MOCK_DIR); the cache, pool, policy and routing are REAL.
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeSandbox } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { decisionTree, type Recipe } from "../src/verbs/decision-tree.ts";

const RECIPE: Recipe = {
  recipe: "screening-escalate", version: 1, status: "shadow",
  questions: { flag: { type: "noul", instructions: "Is this item a real problem?" } },
  policy: { act: 0.8, flag: 0.5, fail: "closed" },
};

function mockDir(responses: number[]): string {
  const dir = mkdtempSync(join(tmpdir(), "jm-mock-"));
  responses.forEach((noul, i) => writeFileSync(join(dir, `call-${i}.json`),
    JSON.stringify({ model: "jev-1.13.0", answers: { flag: { type: "noul", noul } }, usage: { input_tokens: 1000, output_tokens: 20 } })));
  return dir;
}

test_cache_zero_calls();

function test_cache_zero_calls() {
  test("test_cache_zero_calls", async () => {
    const sb = makeSandbox();
    const mock = mockDir([0.95, 0.62, 0.10]);
    process.env.JM_MOCK_DIR = mock;
    try {
      const rowsPath = join(sb.root, "rows.jsonl");
      writeFileSync(rowsPath, [1, 2, 3].map((n) => JSON.stringify({ id: n, text: `item ${n}` })).join("\n"));
      const db = openDb(indexPathFor("d1"));
      const first = await decisionTree({ db, rowsPath, recipe: RECIPE, outPath: join(sb.root, "d.json"), escalationPath: join(sb.root, "e.jsonl") });
      expect(first.rows).toBe(3);
      expect(first.calls).toBe(3);            // three real (canned) calls
      expect(first.cached).toBe(0);
      expect(first.bands.act).toBe(1);        // 0.95
      expect(first.bands.escalate).toBe(1);   // 0.62
      expect(first.bands.noop).toBe(1);       // 0.10
      expect(first.costUsd).toBeGreaterThan(0);

      const second = await decisionTree({ db, rowsPath, recipe: RECIPE, outPath: join(sb.root, "d2.json") });
      expect(second.calls).toBe(0);           // THE CACHE LAW: identical input, zero calls
      expect(second.cached).toBe(3);
      expect(second.costUsd).toBe(0);
      const a = readFileSync(join(sb.root, "d.json"), "utf8");
      const b = readFileSync(join(sb.root, "d2.json"), "utf8");
      expect(a).toBe(b);                      // byte-identical replay (determinism)
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_decision_fail_closed", async () => {
    const sb = makeSandbox();
    const home = mkdtempSync(join(tmpdir(), "jm-nokey-"));
    const savedHome = process.env.HOME, savedEnv = process.env.TYPESAFE_API_KEY, savedMock = process.env.JM_MOCK_DIR;
    process.env.HOME = home; delete process.env.TYPESAFE_API_KEY; delete process.env.JM_MOCK_DIR;
    try {
      const rowsPath = join(sb.root, "rows.jsonl");
      writeFileSync(rowsPath, JSON.stringify({ id: 1, text: "x" }));
      const outPath = join(sb.root, "should-not-exist.json");
      const db = openDb(indexPathFor("d2"));
      await expect(decisionTree({ db, rowsPath, recipe: RECIPE, outPath })).rejects.toThrow(/JEV_NO_KEY/);
      expect(existsSync(outPath)).toBe(false);   // FAIL-CLOSED: nothing written
      db.close();
    } finally {
      process.env.HOME = savedHome;
      if (savedEnv) process.env.TYPESAFE_API_KEY = savedEnv;
      if (savedMock) process.env.JM_MOCK_DIR = savedMock;
      rmSync(home, { recursive: true, force: true }); sb.cleanup();
    }
  });

  test("test_decision_budget_stop", async () => {
    const sb = makeSandbox();
    const mock = mockDir([0.95, 0.95, 0.95, 0.95, 0.95]);
    process.env.JM_MOCK_DIR = mock;
    try {
      const rowsPath = join(sb.root, "rows.jsonl");
      writeFileSync(rowsPath, [1, 2, 3, 4, 5].map((n) => JSON.stringify({ id: n })).join("\n"));
      const db = openDb(indexPathFor("d3"));
      const r = await decisionTree({ db, rowsPath, recipe: RECIPE, budgetCalls: 2, concurrency: 1 });
      expect(r.budgetStopped).toBe(true);
      expect(r.calls).toBeLessThanOrEqual(2);
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });
}

// test_ledger_rows_match_calls — one row per verb invocation; errors row too; no secrets.
import { test, expect } from "bun:test";
import { makeSandbox } from "./helpers.ts";
import { withLedger, readLedger } from "../src/ledger.ts";

test_ledger_rows_match_calls();

function test_ledger_rows_match_calls() {
  test("test_ledger_rows_match_calls", async () => {
    const sb = makeSandbox();
    try {
      await withLedger("index", { a: 1 }, async () => ({ result: 1, stats: { ok: true } }));
      await withLedger("query", { b: 2 }, async () => ({ result: 2, stats: { rows: 0 } }));
      try {
        await withLedger("boom", {}, async () => { throw new Error("JM_TEST_ERR"); });
      } catch { /* expected */ }
      const rows = readLedger();
      expect(rows.length).toBe(3);                       // one row per call, error included
      expect(rows.map((r) => r.verb).sort()).toEqual(["boom", "index", "query"]);
      expect(rows.find((r) => r.verb === "boom")!.status).toBe("error");
      expect(rows.every((r) => typeof r.cost_usd === "number")).toBe(true);
      const raw = require("node:fs").readFileSync(process.env.JM_LEDGER!, "utf8");
      expect(/(sk-|ghp_|xox[bap]-)/.test(raw)).toBe(false);   // no secret shapes
    } finally { sb.cleanup(); }
  });
}

// tests/guard-query.test.ts — the query verb's WHERE whitelist and its LIMIT guard.
// Two audit findings live here: one fixed (an identity map that could interpolate `undefined`),
// one REFUTED by probe (the "simpler" LIMIT suggestion yields NaN/-1).
import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { indexTarget } from "../src/verbs/index.ts";
import { queryIndex } from "../src/verbs/query.ts";

function seeded(n = 5) {
  const sb = makeSandbox();
  const files: Record<string, string> = {};
  for (let i = 0; i < n; i++) files[`f${i}.md`] = `body number ${i} `.repeat(20 + i * 30);
  fill(sb.root, files);
  const db = openDb(indexPathFor("q"));
  indexTarget(db, "q", sb.root, {});
  return { sb, db };
}

describe("query guards", () => {
  test("test_where_whitelist_is_loud", () => {
    const { sb, db } = seeded();
    try {
      expect(() => queryIndex(db, { where: "size >= 10" })).not.toThrow();
      expect(() => queryIndex(db, { where: "size ~= 10" })).toThrow(/JM_WHERE_INVALID|JM_WHERE_OP/);
      expect(() => queryIndex(db, { where: "password = x" })).toThrow(/JM_WHERE_COLUMN/);
      // an operator that the regex does not even admit must never reach the SQL
      expect(() => queryIndex(db, { where: "size CONTAINS 10" })).toThrow(/JM_WHERE_INVALID/);
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_limit_guard_refuses_nan_and_negatives", () => {
    // The audit called the guard "unnecessarily complex" and suggested
    // `Math.min(Math.floor(raw), 10_000)` — which yields `LIMIT NaN` for NaN and `LIMIT -1`
    // (UNLIMITED in SQLite) for -5. The shipped guard is the correct one; this pin holds it.
    const { sb, db } = seeded(6);
    try {
      expect(queryIndex(db, { limit: NaN }).length).toBe(6);        // NaN -> default 50, not an error
      expect(queryIndex(db, { limit: -5 }).length).toBe(6);         // never "unlimited"
      expect(queryIndex(db, { limit: 2.7 }).length).toBe(2);        // a float floors
      expect(queryIndex(db, { limit: 3 }).length).toBe(3);
      expect(queryIndex(db, { limit: 999_999 }).length).toBe(6);    // capped at 10000, still all 6
    } finally { db.close(); sb.cleanup(); }
  });
});

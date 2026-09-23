// regression.test.ts — one pin per re-audit high. A defect that returns is caught HERE first.
// Each test names the audit id it guards (see AUDIT_SUMMARY.md, second run).
import { test, expect } from "bun:test";
import { makeSandbox } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { queryIndex } from "../src/verbs/query.ts";
import { signalOf } from "../src/judge/policy.ts";
import { Budget } from "../src/pools/budget.ts";

test("test_regress_tombstone_reactivation", () => {
  // H6: a tombstoned file restored with IDENTICAL bytes must leave 'gone'.
  const sb = makeSandbox();
  try {
    const { writeFileSync, utimesSync, rmSync } = require("node:fs");
    const { join } = require("node:path");
    writeFileSync(join(sb.root, "f.json"), '{"a":1}');
    const db = openDb(indexPathFor("reg"));
    const { indexFile } = require("../src/verbs/index.ts") as typeof import("../src/verbs/index.ts");
    indexFile(db, sb.root, join(sb.root, "f.json"), {});
    rmSync(join(sb.root, "f.json"));
    indexTarget(db, "reg", sb.root, {});
    let rows = queryIndex(db, { where: "path='f.json'" });
    expect(rows.length).toBe(0);                       // tombstoned: invisible
    writeFileSync(join(sb.root, "f.json"), '{"a":1}');
    utimesSync(join(sb.root, "f.json"), 9999999999, 9999999999);   // different mtime, same bytes
    indexTarget(db, "reg", sb.root, {});
    rows = queryIndex(db, { where: "path='f.json'" });
    expect(rows.length).toBe(1);                       // REACTIVATED despite the tombstone
    db.close();
  } finally { sb.cleanup(); }
});

test("test_regress_fingerprint_covers_questions", () => {
  // H7: two question sets over identical state must not collide in the cache.
  const { fingerprint } = require("../src/judge/cache.ts") as typeof import("../src/judge/cache.ts");
  const { createHash } = require("node:crypto");
  const q = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
  const fp = (qs: string) => fingerprint("m", `v1#${q(qs)}`, { x: 1 });
  expect(fp('{"a":1}')).not.toBe(fp('{"b":2}'));      // different questions -> different keys
});

test("test_regress_spend_validated", () => {
  // H2: a NaN spend must throw, not poison the budget.
  const b = new Budget({ calls: 100 });
  expect(() => b.spend(NaN)).toThrow(/JM_BUDGET_INVALID/);
  expect(() => b.spend(-1)).toThrow(/JM_BUDGET_INVALID/);
});

test("test_regress_unknown_type_never_routes", () => {
  // policy guard: an unknown answer type must not act on confidence.
  expect(signalOf({ type: "mystery", confidence: 0.99 } as unknown as never)).toBe(0);
});

import { indexTarget } from "../src/verbs/index.ts";

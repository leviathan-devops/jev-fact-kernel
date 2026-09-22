// guards.test.ts — the pins for the medium-frontier fixes (each names the audit class it prevents).
import { test, expect } from "bun:test";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, safeName, resolveTarget, saveTargets, loadTargets } from "../src/store/db.ts";
import { jobDir } from "../src/job/store.ts";
import { signalOf } from "../src/judge/policy.ts";
import { queryIndex } from "../src/verbs/query.ts";
import { indexTarget } from "../src/verbs/index.ts";

test_guard_path_sanitisation();
test_guard_name_collision();
test_guard_signal_edges();
test_guard_limit_clamp();
test_guard_corrupt_registry_is_loud();
test_guard_job_dir_traversal();

function test_guard_path_sanitisation() {
  test("test_guard_path_sanitisation", () => {
    const s = safeName("a/../../etc");
    expect(s).not.toContain("/");                                        // separators collapse
    expect(s).not.toContain("..");                                       // no traversal survives
    expect(s).toMatch(/^[A-Za-z0-9._-]+$/);   // the exact underscore count is incidental; the LAW is: no separator, no traversal
    expect(safeName("x".repeat(200)).length).toBeLessThanOrEqual(64);
    // THE LAW, NOT THE LITERAL. This asserted `safeName("..") === "_"`, which is the INCIDENTAL
    // stem — and the line two above already says the exact characters are incidental. The audit's
    // M-H fix gave a sanitised name a collision-proof suffix (so `my index` and `my/index` no longer
    // share one index file), which changes the stem to `_-<digest>`. The property this test exists
    // for is unchanged and is asserted directly: no traversal, safe charset, bounded.
    expect(safeName("..")).not.toContain("..");
    expect(safeName("..")).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(() => safeName(".")).toThrow(/JM_NAME_INVALID/);   // "." is a directory, never a name
    expect(() => safeName("")).toThrow(/JM_NAME_INVALID/);
    expect(indexPathFor("ok-name").endsWith("ok-name.sqlite")).toBe(true);
  });
}

function test_guard_name_collision() {
  test("test_guard_name_collision", () => {
    const sb = makeSandbox();
    try {
      const a = resolveTarget(sb.root);                     // basename-derived names now carry a root hash
      const b = resolveTarget(sb.root);
      expect(a.name).toBe(b.name);                          // stable for the same root
      expect(a.name).toMatch(/-[0-9a-f]{6}$/);
    } finally { sb.cleanup(); }
  });
}

function test_guard_signal_edges() {
  test("test_guard_signal_edges", () => {
    expect(signalOf({ type: "choice", choice: "x", probabilities: {} })).toBe(0);        // was -Infinity
    expect(signalOf({ type: "noul", noul: NaN })).toBe(0);                               // NaN clamped
    expect(signalOf({ type: "noul", noul: 2 })).toBe(1);                                 // out-of-range clamped
    expect(signalOf({ type: "score", confidence: 0.7 } as unknown as never)).toBe(0);      // unknown type -> noop, not a route
    expect(signalOf(undefined)).toBe(0);
  });
}

function test_guard_limit_clamp() {
  test("test_guard_limit_clamp", () => {
    const sb = makeSandbox();
    try {
      fill(sb.root, { "a.json": '{"k":1}', "b.json": '{"k":2}' });
      const db = openDb(indexPathFor("g1"));
      indexTarget(db, "g1", sb.root, {});
      expect(queryIndex(db, { limit: -1 } as unknown as never).length).toBeLessThanOrEqual(50);   // LIMIT -1 must not mean unlimited
      expect(queryIndex(db, { limit: NaN } as unknown as never).length).toBeLessThanOrEqual(50);
      expect(queryIndex(db, { limit: 1.9 }).length).toBe(1);
      db.close();
    } finally { sb.cleanup(); }
  });
}

function test_guard_corrupt_registry_is_loud() {
  test("test_guard_corrupt_registry_is_loud", () => {
    const sb = makeSandbox();
    try {
      const p = `${sb.home}/targets.json`;
      require("node:fs").writeFileSync(p, "{ not json");
      expect(() => loadTargets()).toThrow(/JM_TARGETS_CORRUPT/);   // never a silent empty registry
      saveTargets([]);                                             // and save still works after
      expect(loadTargets()).toEqual([]);
    } finally { sb.cleanup(); }
  });
}

function test_guard_job_dir_traversal() {
  test("test_guard_job_dir_traversal", () => {
    const d = jobDir("../escape");
    expect(d).not.toContain("..");
    expect(d.endsWith("_escape")).toBe(true);
  });
}

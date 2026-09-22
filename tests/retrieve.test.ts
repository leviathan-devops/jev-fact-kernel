// tests/retrieve.test.ts — W3 gate: scan/cluster/extract are deterministic and keyless.
// ADVERSE FIRST: the invalid-input and no-match cases precede the happy path.
import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { ingestAll } from "../src/targets.ts";
import { scanIndex } from "../src/verbs/scan.ts";
import { queryIndex } from "../src/verbs/query.ts";
import { clusterIndex, signatureOf } from "../src/verbs/cluster.ts";
import { extractFields, renderExtract } from "../src/verbs/extract.ts";

async function seeded() {
  const sb = makeSandbox();
  fill(sb.root, {
    "c/a.md": "the tombstone record for service alpha",
    "c/b.md": "another tombstone: service beta",
    "c/c.md": "an unrelated note about weather",
  });
  process.env.JM_HOME = sb.home;
  saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
  const db = openDb(indexPathFor("all"));
  await ingestAll(db, "all");
  return { sb, db };
}

describe("W3 retrieve", () => {
  test("test_scan_invalid_regex_is_loud", async () => {
    const { sb, db } = await seeded();
    try {
      expect(() => scanIndex(db, { lex: "tombstone", re: "([unclosed" })).toThrow(/JM_SCAN_RE_INVALID/);
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_scan_no_match_is_empty_not_error", async () => {
    const { sb, db } = await seeded();
    try {
      const r = scanIndex(db, { lex: "zzzznothing" });
      expect(r.candidates).toEqual([]);
      expect(r.returned).toBe(0);
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_scan_regex_gate_filters_and_counts", async () => {
    const { sb, db } = await seeded();
    try {
      const loose = scanIndex(db, { lex: "tombstone" });
      expect(loose.candidates.length).toBe(2);                      // both tombstone rows
      const tight = scanIndex(db, { lex: "tombstone", re: "service beta" });
      expect(tight.candidates.length).toBe(1);                      // the regex narrows to one
      expect(tight.candidates[0].path).toContain("b.md");
      expect(tight.candidates[0].hits).toBe(1);
      expect(tight.candidates[0].excerpt).toContain("service beta"); // the excerpt says WHY
      expect(tight.scanned).toBeGreaterThanOrEqual(tight.returned);
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_scan_deterministic_order", async () => {
    const { sb, db } = await seeded();
    try {
      const a = scanIndex(db, { lex: "tombstone" });
      const b = scanIndex(db, { lex: "tombstone" });
      expect(a.candidates.map((c) => c.path)).toEqual(b.candidates.map((c) => c.path));
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_cluster_groups_by_signature", async () => {
    const { sb, db } = await seeded();
    try {
      const sc = scanIndex(db, { lex: "tombstone" });
      const cl = clusterIndex(db, sc.candidates);
      // Both rows live in the SAME source dir with the same kind (fs/text), so the deterministic
      // partition puts them in ONE bucket -> ONE cluster of n=2. (A two-bucket case is covered by
      // test_cluster_splits_by_source below.)
      expect(cl.clusters.length).toBe(1);
      expect(cl.clusters[0].n).toBe(2);
      const total = cl.clusters.reduce((n, c) => n + c.n, 0);
      expect(total).toBe(2);
      for (const c of cl.clusters) {
        expect(c.signature.length).toBeGreaterThan(0);
        expect(c.exemplars.length).toBeGreaterThan(0);
      }
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_cluster_no_model_keyless", async () => {
    const { sb, db } = await seeded();
    // THE KEY IS RESTORED, NOT MERELY DELETED (the D-059 leak class). This test proves the KEYLESS
    // path, and `delete process.env.TYPESAFE_API_KEY` removed a PROCESS-GLOBAL without putting it
    // back — so every later file in the same run inherited a keyless environment. On the host that
    // was MASKED (the key also exists as a file, which `resolveKey` falls back to), which is exactly
    // why the container — where the env var is the ONLY source — exposed it.
    const prevKey = process.env.TYPESAFE_API_KEY;
    try {
      delete process.env.TYPESAFE_API_KEY;
      const sc = scanIndex(db, { lex: "tombstone" });
      const cl = clusterIndex(db, sc.candidates);                    // must not throw without a key
      expect(cl.ms).toBeGreaterThanOrEqual(0);
    } finally {
      if (prevKey === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = prevKey;
      db.close(); sb.cleanup();
    }
  });

  test("test_signature_stopwords_and_order", () => {
    // "tombstone" and "service" are TIED at 2 each; the documented tie-break is ALPHABETICAL,
    // so "service" leads. Adjudicated both ways: the code matches its contract, the first
    // expectation was wrong (it assumed a frequency-only order).
    const sig = signatureOf(["the tombstone for that service", "tombstone service again"], 3);
    expect(sig[0]).toBe("service");                                  // tied -> alphabetical tie-break
    expect(sig[1]).toBe("tombstone");
    expect(sig).not.toContain("the");                                // stopword
    expect(sig).not.toContain("that");
    const again = signatureOf(["the tombstone for that service", "tombstone service again"], 3);
    expect(again).toEqual(sig);                                      // deterministic
    // a CLEAR frequency winner leads
    const clear = signatureOf(["tombstone tombstone tombstone service"], 2);
    expect(clear[0]).toBe("tombstone");
  });

  test("test_cluster_splits_by_source", async () => {
    // Two sources -> two buckets -> two clusters, even with identical text.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "one/a.md": "tombstone record", "two/b.md": "tombstone record" });
      process.env.JM_HOME = sb.home;
      saveTargets([
        { name: "one", kind: "fs", root: join(sb.root, "one") },
        { name: "two", kind: "fs", root: join(sb.root, "two") },
      ]);
      const db = openDb(indexPathFor("all"));
      await ingestAll(db, "all");
      const sc = scanIndex(db, { lex: "tombstone" });
      const cl = clusterIndex(db, sc.candidates);
      expect(cl.clusters.length).toBe(2);
      expect(new Set(cl.clusters.map((c) => c.source)).size).toBe(2);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_extract_regex_and_empty", async () => {
    const { sb, db } = await seeded();
    try {
      const sc = scanIndex(db, { lex: "tombstone" });
      const ex = extractFields(db, sc.candidates, { re: "service (\\w+)" });
      expect(ex.total).toBe(2);
      expect(ex.rowsWithValues).toBe(2);
      expect(ex.empty).toBe(0);
      const none = extractFields(db, [{ path: "c/c.md", size: 1, state: "new", score: 0, hits: 0, excerpt: "" }], { re: "nothinghere" });
      expect(none.total).toBe(0);
      expect(none.empty).toBe(1);                                    // an empty result is COUNTED, not hidden
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_extract_requires_a_spec", async () => {
    const { sb, db } = await seeded();
    try {
      const sc = scanIndex(db, { lex: "tombstone" });
      expect(() => extractFields(db, sc.candidates, {})).toThrow(/JM_EXTRACT_ARGS/);
      expect(() => extractFields(db, sc.candidates, { re: "([bad" })).toThrow(/JM_EXTRACT_RE_INVALID/);
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_extract_render_structures", async () => {
    const { sb, db } = await seeded();
    try {
      const sc = scanIndex(db, { lex: "tombstone" });
      const ex = extractFields(db, sc.candidates, { re: "service (\\w+)" });
      const asJson = renderExtract(ex, "json");
      expect(() => JSON.parse(asJson)).not.toThrow();
      const asMd = renderExtract(ex, "md");
      expect(asMd.startsWith("# extract")).toBe(true);
      expect(asMd).toContain("alpha");
    } finally { db.close(); sb.cleanup(); }
  });

  test("test_same_named_files_across_targets_do_not_collide", async () => {
    // D-008 (CRITICAL, found by this suite): store paths are target-root-relative, so two targets
    // each holding `a.md` collapsed into ONE row and the second read `changed=0` — a SILENT wrong
    // answer (rows lost, nothing reported). The paths are now namespaced by target name.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "one/a.md": "CONTENT-FROM-ONE", "two/a.md": "CONTENT-FROM-TWO" });
      process.env.JM_HOME = sb.home;
      saveTargets([
        { name: "one", kind: "fs", root: join(sb.root, "one") },
        { name: "two", kind: "fs", root: join(sb.root, "two") },
      ]);
      const db = openDb(indexPathFor("all"));
      const stats = await ingestAll(db, "all");
      expect(stats.every((x) => x.changed === 1)).toBe(true);        // BOTH targets wrote
      const rows = queryIndex(db, { limit: 100 });
      expect(rows.length).toBe(2);                                   // two files, two rows
      expect(rows.map((r) => r.path).sort()).toEqual(["one/a.md", "two/a.md"]);
      // and both bodies are findable: neither row was overwritten
      expect(queryIndex(db, { fts: '"CONTENT-FROM-ONE"', limit: 10 }).length).toBe(1);
      expect(queryIndex(db, { fts: '"CONTENT-FROM-TWO"', limit: 10 }).length).toBe(1);
      db.close();
    } finally { sb.cleanup(); }
  });
});

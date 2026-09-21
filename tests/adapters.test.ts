// tests/adapters.test.ts — W2 gate: `--in` resolves, three adapter kinds ingest, a query spans them.
// L2: real modules, a real sandbox, real sqlite/jsonl files — no mocks.
import { test, expect, describe } from "bun:test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, openIndexExisting, indexExists, indexPathFor, saveTargets, loadTargets } from "../src/store/db.ts";
import { targetsIn, ingestTarget, ingestAll, adapterFor, ADAPTERS } from "../src/targets.ts";
import { indexTarget } from "../src/verbs/index.ts";
import { sourceStat } from "../src/adapters/sqlite.ts";
import { queryIndex } from "../src/verbs/query.ts";

/** A fixture sqlite source with two tables (the @ocdb shape, scaled down). */
function makeSourceDb(path: string): void {
  const db = new Database(path, { create: true });
  db.run("CREATE TABLE issues (id INTEGER PRIMARY KEY, title TEXT, body TEXT)");
  db.run("CREATE TABLE notes (id INTEGER PRIMARY KEY, note TEXT)");
  db.run("INSERT INTO issues (title, body) VALUES ('crash on boot', 'segfault in the loader path')");
  db.run("INSERT INTO issues (title, body) VALUES ('slow query plan', 'sequential scan on the big table')");
  db.run("INSERT INTO notes (note) VALUES ('tombstone candidate: dead ref in the index')");
  db.close();
}

function register(home: string, targets: { name: string; kind: "fs" | "jsonl" | "sqlite"; root: string }[]): void {
  process.env.JM_HOME = home;
  saveTargets(targets.map((t) => ({ ...t })));
}

describe("W2 adapters + --in", () => {
  test("test_adapter_delta", async () => {
    const sb = makeSandbox();
    try {
      // --- fixtures: one fs tree, one jsonl, one sqlite source
      fill(sb.root, { "fs/a.md": "alpha tombstone record", "fs/b.md": "beta note" });
      const jsonl = join(sb.root, "rows.jsonl");
      writeFileSync(jsonl, ['{"kind":"evt","msg":"delta one"}', '{"kind":"evt","msg":"delta two"}', "not json at all", ""].join("\n"));
      const srcdb = join(sb.root, "source.sqlite");
      makeSourceDb(srcdb);

      register(sb.home, [
        { name: "fsT", kind: "fs", root: join(sb.root, "fs") },
        { name: "jsonlT", kind: "jsonl", root: jsonl },
        { name: "sqliteT", kind: "sqlite", root: srcdb },
      ]);

      // --- S8: --in resolution
      expect(targetsIn("all").map((t) => t.name).sort()).toEqual(["fsT", "jsonlT", "sqliteT"]);
      expect(targetsIn("fsT,jsonlT").map((t) => t.name)).toEqual(["fsT", "jsonlT"]);
      expect(() => targetsIn("nope")).toThrow(/JM_TARGET_UNKNOWN/);        // LOUD, never a silent subset

      // --- the registry is the store's (one writer), not a second copy
      expect(loadTargets().length).toBe(3);

      // --- S7: every kind exposes enumerate() + text()
      for (const k of ["fs", "jsonl", "sqlite"] as const) {
        expect(typeof ADAPTERS[k].enumerate).toBe("function");
        expect(typeof ADAPTERS[k].text).toBe("function");
      }
      expect(() => adapterFor("carrier-pigeon")).toThrow(/JM_ADAPTER_UNKNOWN/);

      // --- ingest: a query then spans all three kinds
      const db = openDb(indexPathFor("w2-span"));
      const stats = await ingestAll(db, "all");
      expect(stats.length).toBe(3);
      const byName = Object.fromEntries(stats.map((s) => [s.target, s]));
      expect(byName.fsT.rows).toBe(2);
      expect(byName.jsonlT.rows).toBe(3);            // the malformed line is kept, marked — not dropped
      expect(byName.sqliteT.rows).toBe(3);           // 2 issues + 1 note

      const all = queryIndex(db, { limit: 100 });
      const paths = all.map((r: { path: string }) => r.path);
      expect(paths.some((p) => p.startsWith("a.md") || p.endsWith("a.md"))).toBe(true);   // fs
      expect(paths.some((p) => p.includes("rows.jsonl#L"))).toBe(true);                   // jsonl
      expect(paths.some((p) => p.includes("source.sqlite#"))).toBe(true);                 // sqlite

      // one query, three sources: the span is the point
      const span = queryIndex(db, { fts: "tombstone" });
      expect(span.length).toBeGreaterThanOrEqual(2);
      expect(new Set(span.map((r) => r.path.split("#")[0].split("/").pop())).size).toBeGreaterThanOrEqual(2);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_sqlite_source_read_only", async () => {
    // The adapter must NEVER write to a source DB — proven by the file's size+mtime.
    const sb = makeSandbox();
    try {
      const srcdb = join(sb.root, "ro.sqlite");
      makeSourceDb(srcdb);
      register(sb.home, [{ name: "ro", kind: "sqlite", root: srcdb }]);
      const before = sourceStat(srcdb);
      const db = openDb(indexPathFor("ro"));
      const s = await ingestTarget(db, targetsIn("ro")[0]);
      expect(s.rows).toBe(3);
      const after = sourceStat(srcdb);
      expect(after.size).toBe(before.size);
      expect(after.mtimeMs).toBe(before.mtimeMs);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_missing_source_is_loud", async () => {
    const sb = makeSandbox();
    try {
      register(sb.home, [{ name: "ghost", kind: "sqlite", root: join(sb.root, "nope.sqlite") }]);
      const db = openDb(indexPathFor("ghost"));
      await expect(ingestTarget(db, targetsIn("ghost")[0])).rejects.toThrow(/JM_SQLITE_MISSING/);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_malformed_jsonl_line_is_kept", async () => {
    const sb = makeSandbox();
    try {
      const p = join(sb.root, "mixed.jsonl");
      writeFileSync(p, ['{"ok":1}', "{bad json", '{"ok":2}'].join("\n"));
      register(sb.home, [{ name: "m", kind: "jsonl", root: p }]);
      const db = openDb(indexPathFor("m"));
      const s = await ingestTarget(db, targetsIn("m")[0]);
      expect(s.rows).toBe(3);                                   // the bad line is a row, not a crash
      const bad = queryIndex(db, { fts: "__malformed" });
      expect(bad.length).toBe(1);                               // and it is findable
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_row_ingest_incremental", async () => {
    // Regression pin for the sha-on-UPDATE bug found by RUNNING: the upsert wrote sha256 only on
    // the INSERT arm, so `changed` reported every row on every run and the skip could never fire.
    const sb = makeSandbox();
    try {
      const srcdb = join(sb.root, "inc.sqlite");
      makeSourceDb(srcdb);
      register(sb.home, [{ name: "inc", kind: "sqlite", root: srcdb }]);
      const db = openDb(indexPathFor("inc"));
      const t = targetsIn("inc")[0];

      const a = await ingestTarget(db, t);
      expect(a.changed).toBe(3);                    // first pass: everything is new
      const b = await ingestTarget(db, t);
      expect(b.changed).toBe(0);                    // second pass: nothing changed (the skip fires)
      expect(b.rows).toBe(3);                       // ...and the rows are still enumerated

      // mutate exactly one row -> exactly one change
      const src = new Database(srcdb);
      src.run("UPDATE issues SET body = 'a completely new body' WHERE id = 2");
      src.close();
      const c = await ingestTarget(db, t);
      expect(c.changed).toBe(1);

      // the new text is findable and the OLD text is gone from FTS (no stale row)
      expect(queryIndex(db, { fts: '"completely new body"' }).length).toBe(1);
      expect(queryIndex(db, { fts: '"sequential scan"' }).length).toBe(0);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_unknown_index_is_loud_not_empty", async () => {
    // DRILL G1 (silent wrong answer): `jm query typo --fts x` printed nothing, exited 0, and
    // MATERIALISED a phantom index file — an operator could not tell "no matches" from "no such
    // index". A READ verb must refuse a missing index by name.
    const sb = makeSandbox();
    try {
      process.env.JM_HOME = sb.home;
      expect(() => openIndexExisting("nope", indexPathFor("nope"))).toThrow(/JM_INDEX_MISSING/);
      expect(indexExists("nope")).toBe(false);
      saveTargets([{ name: "s", kind: "jsonl", root: join(sb.root, "x.jsonl") }]);
      writeFileSync(join(sb.root, "x.jsonl"), '{"a":1}\n');
      const db = openDb(indexPathFor("real"));
      await ingestAll(db, "s");
      db.close();
      expect(indexExists("real")).toBe(true);
      expect(() => openIndexExisting("real", indexPathFor("real"))).not.toThrow();
    } finally { sb.cleanup(); }
  });

  test("test_single_file_root_indexes_that_file", async () => {
    // DRILL G2b: `jm index <file>` walked a FILE as a directory, found nothing, and reported
    // files=0 exit 0. A file root is one target; its stored path is the BASENAME, never "".
    const sb = makeSandbox();
    try {
      fill(sb.root, { "solo.md": "the solo file body" });
      const db = openDb(indexPathFor("files"));
      const st = indexTarget(db, "solo", join(sb.root, "solo.md"), {});
      expect(st.files).toBe(1);
      expect(st.changed).toBe(1);
      expect(st.textIndexed).toBe(1);
      const rows = queryIndex(db, { limit: 10 });
      expect(rows.length).toBe(1);
      expect(rows[0].path).toBe("solo.md");                    // basename, NOT ""
      expect(queryIndex(db, { fts: "solo", limit: 10 }).length).toBe(1);
      db.close();
    } finally { sb.cleanup(); }
  });
});

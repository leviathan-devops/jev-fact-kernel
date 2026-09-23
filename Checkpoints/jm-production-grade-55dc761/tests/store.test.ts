// test_store_roundtrip — the store spine: create, insert, read back, reject bad input.
import { test, expect } from "bun:test";
import { makeSandbox } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";

test_store_roundtrip();

function test_store_roundtrip() {
  test("test_store_roundtrip", () => {
    const sb = makeSandbox();
    try {
      const db = openDb(indexPathFor("t1"));
      db.run("INSERT INTO files(path, size, mtime, sha256, kind, text_indexed, state, indexed_at) VALUES (?,?,?,?,?,?,?,?)",
        ["a.txt", 3, 1, "abc", "text", 0, "new", new Date().toISOString()]);
      const row = db.query("SELECT path, size FROM files WHERE path = ?").get("a.txt") as { path: string; size: number };
      expect(row.path).toBe("a.txt");
      expect(row.size).toBe(3);
      const v = db.query("SELECT value FROM meta WHERE key='schema_version'").get() as { value: string };
      expect(v.value).toBe("1");
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_store_rejects_bad_input", () => {
    // PROBE-CONTRACT NOTE: SQLite is dynamically typed — a string in an INTEGER column
    // does NOT throw (probe error corrected). The real rejections are UNIQUE + NOT NULL.
    const sb = makeSandbox();
    try {
      const db = openDb(indexPathFor("t1"));
      const ins = "INSERT INTO files(path, size, mtime, sha256, kind, text_indexed, state, indexed_at) VALUES (?,?,?,?,?,?,?,?)";
      db.run(ins, ["a.txt", 3, 1, "abc", "text", 0, "new", "x"]);
      expect(() => db.run(ins, ["a.txt", 4, 2, "def", "text", 0, "new", "y"])).toThrow(); // UNIQUE(path)
      expect(() => db.run(ins, [null, 4, 2, "def", "text", 0, "new", "y"])).toThrow();   // NOT NULL(path)
      db.close();
    } finally { sb.cleanup(); }
  });
}

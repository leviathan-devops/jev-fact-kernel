// test_query_known_rows — where + fts return the known rows; bad columns refuse.
import { test, expect } from "bun:test";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { indexTarget } from "../src/verbs/index.ts";
import { queryIndex } from "../src/verbs/query.ts";

test_query_known_rows();

function test_query_known_rows() {
  test("test_query_known_rows", () => {
    const sb = makeSandbox();
    try {
      fill(sb.root, {
        "big.json": JSON.stringify({ payload: "split brain session bug", n: 1 }, null, 2),
        "small.json": '{"k":1}',
        "doc.md": "# split brain notes\nthe bug",
      });
      const db = openDb(indexPathFor("q"));
      indexTarget(db, "q", sb.root, {});

      const bySize = queryIndex(db, { where: "size>20" });
      expect(bySize.length).toBeGreaterThanOrEqual(1);
      expect(bySize.map((r) => r.path)).toContain("big.json");

      const byFts = queryIndex(db, { fts: "split" });
      expect(byFts.map((r) => r.path).sort()).toEqual(["big.json", "doc.md"]);

      const combined = queryIndex(db, { fts: "split", where: "kind='text'" });
      expect(combined.map((r) => r.path)).toContain("big.json");

      expect(() => queryIndex(db, { where: "password='x'" })).toThrow(/JM_WHERE_COLUMN/);
      expect(() => queryIndex(db, { where: "size >" })).toThrow();
      db.close();
    } finally { sb.cleanup(); }
  });
}

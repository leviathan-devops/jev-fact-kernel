// test_index_incremental — full index, then touch 3 files: delta must equal 3 (C1/C2).
import { test, expect } from "bun:test";
import { utimesSync } from "node:fs";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { indexTarget } from "../src/verbs/index.ts";

test_index_incremental();

function test_index_incremental() {
  test("test_index_incremental", () => {
    const sb = makeSandbox();
    try {
      fill(sb.root, {
        "a.json": '{"k":"alpha"}', "b.json": '{"k":"beta"}', "sub/c.md": "# gamma",
        "sub/d.txt": "delta", "skip.bin": "\u0000\u0001\u0002",
      });
      const db = openDb(indexPathFor("fix"));
      const first = indexTarget(db, "fix", sb.root, {});
      expect(first.files).toBe(5);
      expect(first.changed).toBe(5);
      expect(first.ms).toBeGreaterThanOrEqual(0);

      // unchanged re-run: zero changes (incremental skip)
      const second = indexTarget(db, "fix", sb.root, {});
      expect(second.changed).toBe(0);
      expect(second.files).toBe(5);

      // touch exactly 3 files
      const now = Date.now() / 1000 + 10;
      for (const rel of ["a.json", "b.json", "sub/c.md"]) utimesSync(join(sb.root, rel), now, now);
      const third = indexTarget(db, "fix", sb.root, {});
      expect(third.changed).toBe(3);

      // delete one → tombstone
      const { rmSync } = require("node:fs");
      rmSync(join(sb.root, "skip.bin"));
      const fourth = indexTarget(db, "fix", sb.root, {});
      expect(fourth.files).toBe(4);
      expect(fourth.gone).toBe(1);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_index_fts_text_cap", () => {
    const sb = makeSandbox();
    try {
      fill(sb.root, { "small.md": "# hello world", "big.md": "x".repeat(3000) });
      const db = openDb(indexPathFor("cap"));
      const s = indexTarget(db, "cap", sb.root, { maxTextBytes: 1000 });
      expect(s.textIndexed).toBe(1);         // small only
      expect(s.truncated).toBe(true);        // big.md recorded, never silent
      db.close();
    } finally { sb.cleanup(); }
  });
}

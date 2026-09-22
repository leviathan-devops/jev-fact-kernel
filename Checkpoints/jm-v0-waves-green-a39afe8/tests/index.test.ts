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
      fill(sb.root, { "small.md": "# hello world", "big.md": "alpha ".repeat(600) });   // 3600 chars
      const db = openDb(indexPathFor("cap"));
      const s = indexTarget(db, "cap", sb.root, { maxTextBytes: 1000 });
      // `maxTextBytes` IS A CHUNK SIZE, NOT A SKIP THRESHOLD. It used to drop the text of any file over
      // the cap (`text_indexed=0`), which made every large file INVISIBLE to `query --fts` while still
      // appearing in `files` — measured on a real session directory: 86 of 124 files unsearchable,
      // including the 37.9 MB transcript the operator wanted to search. Both files are now indexed;
      // the large one in chunks.
      expect(s.textIndexed).toBe(2);
      expect(s.truncated).toBe(true);        // still reported: big.md was CHUNKED, not stored whole
      const docs = db.query("SELECT path FROM docs ORDER BY path").all() as { path: string }[];
      expect(docs.length).toBeGreaterThan(2);                                  // small.md + 3 chunks of big.md
      expect(docs.some((d) => d.path === "small.md")).toBe(true);              // a single-chunk file keeps its bare path
      expect(docs.filter((d) => d.path.startsWith("big.md#c")).length).toBe(4); // 3600 chars / 1000 = 4 chunks
      // and the CHUNKED content is genuinely searchable, not merely stored. (The token must be a real
      // WORD: FTS5's default tokenizer drops single-character runs, so a probe of 'xxxx' finds nothing
      // even when the text is indexed — the same class of probe defect this project keeps meeting.)
      const hit = db.query("SELECT COUNT(*) AS n FROM docs_fts WHERE docs_fts MATCH 'alpha'").get() as { n: number };
      expect(hit.n).toBeGreaterThan(0);
      db.close();
    } finally { sb.cleanup(); }
  });
}

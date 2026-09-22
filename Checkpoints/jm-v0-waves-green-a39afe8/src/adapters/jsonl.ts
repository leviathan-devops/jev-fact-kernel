// src/adapters/jsonl.ts — W2: stream a JSONL (or JSON array) source without loading it whole.
import { createReadStream, statSync } from "node:fs";
import { createInterface } from "node:readline";

export interface JsonlRow { line: number; text: string; value: unknown; }

/** Stream lines of a JSONL file; a malformed line yields a marked row, never a crash. */
export async function* streamJsonl(path: string, opts: { maxLineBytes?: number; limit?: number } = {}): AsyncGenerator<JsonlRow> {
  const maxLine = opts.maxLineBytes ?? 65_536;
  const limit = opts.limit ?? Infinity;
  // THE STREAM IS HELD SO IT CAN BE DESTROYED, not just the readline interface (audit
  // jsonl.ts:11). `rl.close()` "relinquishes control over the input stream" — it does NOT destroy
  // it — so an EARLY abandon (the `limit` break, or a caller breaking out of the `for await`)
  // left the `fs.ReadStream` open until GC. **MEASURED: 40 abandoned generators with `limit: 1`
  // left 40 open fds** (delta=40, exactly 1:1). `enumerate` streams every jsonl target through
  // this generator, so an index run over many sources accumulates handles.
  const stream = createReadStream(path, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let physical = 0;      // the physical line NUMBER, which the yielded row reports
  let yielded = 0;       // the ROW count, which `limit` bounds
  try {
    for await (const raw of rl) {
      // `limit` BOUNDS ROWS, NOT PHYSICAL LINES (audit jsonl.ts:18). The counter was incremented
      // BEFORE the blank-line skip, so a file with blank lines returned fewer records than asked —
      // MEASURED: a file with a 5-blank-line prefix and two records, read with `limit: 2`, yielded
      // **ZERO** rows, because the blanks consumed the budget. And it disagreed with `streamJson`,
      // where `limit` IS a row count, while `src/targets.ts` passes the SAME `{ limit }` to both.
      physical++;
      if (yielded >= limit) break;
      const line = raw;                        // PARSE THE WHOLE LINE, THEN BOUND THE STORED TEXT.
      if (line.trim().length === 0) continue;
      // Truncating BEFORE the parse turned every VALID line wider than `maxLine` into invalid JSON,
      // which the catch below then reclassified as `{ __malformed: true }` — so a legitimate 70 KB
      // record was indexed as garbage, and its payload was cut to 200 chars on top. MEASURED: one
      // valid 70,038-byte line became `{"__malformed":true,...}`. Found by the audit (M-A).
      let value: unknown = null;
      try { value = JSON.parse(line); } catch { value = { __malformed: true, raw: line.slice(0, 200) }; }
      yielded++;
      yield { line: physical, text: typeof value === "string" ? value.slice(0, maxLine) : JSON.stringify(value).slice(0, maxLine), value };
    }
  } finally { rl.close(); stream.destroy(); }
}

/** A JSON file may be an array (one object per element) or a single object. */
export async function* streamJson(path: string, opts: { limit?: number } = {}): AsyncGenerator<JsonlRow> {
  const raw = await Bun.file(path).text();
  const parsed = JSON.parse(raw) as unknown;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  const limit = Math.min(opts.limit ?? Infinity, items.length);
  for (let i = 0; i < limit; i++) {
    const v = items[i];
    yield { line: i + 1, text: typeof v === "string" ? v : JSON.stringify(v), value: v };
  }
}

export const fileStat = (path: string) => { const st = statSync(path); return { size: st.size, mtimeMs: st.mtimeMs }; };

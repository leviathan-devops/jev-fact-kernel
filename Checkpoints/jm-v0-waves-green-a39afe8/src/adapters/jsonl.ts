// src/adapters/jsonl.ts — W2: stream a JSONL (or JSON array) source without loading it whole.
import { createReadStream, statSync } from "node:fs";
import { createInterface } from "node:readline";

export interface JsonlRow { line: number; text: string; value: unknown; }

/** Stream lines of a JSONL file; a malformed line yields a marked row, never a crash. */
export async function* streamJsonl(path: string, opts: { maxLineBytes?: number; limit?: number } = {}): AsyncGenerator<JsonlRow> {
  const maxLine = opts.maxLineBytes ?? 65_536;
  const limit = opts.limit ?? Infinity;
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  let n = 0;
  try {
    for await (const raw of rl) {
      if (n >= limit) break;
      n++;
      const line = raw.length > maxLine ? raw.slice(0, maxLine) : raw;
      if (line.trim().length === 0) continue;
      let value: unknown = null;
      try { value = JSON.parse(line); } catch { value = { __malformed: true, raw: line.slice(0, 200) }; }
      yield { line: n, text: typeof value === "string" ? value : JSON.stringify(value).slice(0, maxLine), value };
    }
  } finally { rl.close(); }
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

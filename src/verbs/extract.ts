// src/verbs/extract.ts — W3/S9: structured pulls. Fields, regex patterns, and emitted rows.
// Deterministic; no model. The extractor is the last step before a RESULT artifact.
import type { Database } from "bun:sqlite";
import type { Candidate } from "./scan.ts";

export interface ExtractSpec {
  field?: string;            // a JSON key to pull out of each row's text (jsonl/sqlite rows)
  re?: string;               // a capture-group regex; group 1 (or 0) is emitted
  structure?: "md" | "json";
  maxPerRow?: number;
}

export interface Extracted { path: string; values: string[]; }
export interface ExtractResult {
  rows: Extracted[];
  total: number;             // total values pulled
  rowsWithValues: number;
  empty: number;             // rows that produced nothing
  structure: "md" | "json";
  ms: number;
}

/** Pull structured values from each candidate's indexed text. */
export function extractFields(db: Database, candidates: Candidate[], spec: ExtractSpec = {}): ExtractResult {
  const t0 = Date.now();
  const maxPerRow = spec.maxPerRow ?? 20;
  const structure = spec.structure ?? "json";
  let re: RegExp | null = null;
  if (spec.re) {
    try { re = new RegExp(spec.re, "g"); }
    catch (err) { throw new Error(`JM_EXTRACT_RE_INVALID: ${String(err).slice(0, 120)}`); }
  }
  if (!re && !spec.field) throw new Error("JM_EXTRACT_ARGS: --re or --field is required");

  const textStmt = db.query("SELECT text FROM docs WHERE path = ?");
  const rows: Extracted[] = [];
  let total = 0, empty = 0;
  for (const c of candidates) {
    const doc = textStmt.get(c.path) as { text: string } | null;
    const values: string[] = [];
    if (doc) {
      if (re) {
        for (const m of doc.text.matchAll(re)) {
          const v = (m[1] ?? m[0]).trim();
          if (v) values.push(v);
          if (values.length >= maxPerRow) break;
        }
      } else if (spec.field) {
        // A row's text is "key: value" lines (the sqlite/jsonl adapters' render); pull the named key.
        const rx = new RegExp(`^${spec.field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: (.*)$`, "mi");
        const m = doc.text.match(rx);
        if (m) {
          const raw = m[1].trim();
          try {
            const parsed = JSON.parse(raw) as unknown;
            values.push(typeof parsed === "string" ? parsed : JSON.stringify(parsed));
          } catch { values.push(raw); }
        }
      }
    }
    if (values.length === 0) empty++;
    total += values.length;
    rows.push({ path: c.path, values });
  }
  return { rows, total, rowsWithValues: rows.length - empty, empty, structure, ms: Date.now() - t0 };
}

/** Render an extract result in the requested structure (the RESULT artifact shape). */
export function renderExtract(res: ExtractResult, structure: "md" | "json"): string {
  if (structure === "json") return JSON.stringify(res, null, 2);
  const lines = [`# extract`, ``, `rows with values: ${res.rowsWithValues} / ${res.rows.length} · values: ${res.total} · empty: ${res.empty}`, ``];
  for (const r of res.rows) {
    if (r.values.length === 0) continue;
    lines.push(`- \`${r.path}\``);
    for (const v of r.values.slice(0, 10)) lines.push(`  - ${v.length > 200 ? `${v.slice(0, 200)}…` : v}`);
  }
  return lines.join("\n") + "\n";
}

// src/verbs/extract.ts — W3/S9: structured pulls. Fields, regex patterns, and emitted rows.
// Deterministic; no model. The extractor is the last step before a RESULT artifact.
import type { Database } from "bun:sqlite";
import type { Candidate } from "./scan.ts";

export type Structure = "md" | "json" | "csv";
export interface ExtractSpec {
  field?: string;            // a JSON key to pull out of each row's text (jsonl/sqlite rows)
  re?: string;               // a capture-group regex; group 1 (or 0) is emitted
  structure?: Structure;
  maxPerRow?: number;
}

export interface Extracted { path: string; values: string[]; }
export interface ExtractResult {
  rows: Extracted[];
  total: number;             // total values pulled
  rowsWithValues: number;
  empty: number;             // rows that produced nothing
  structure: Structure;
  ms: number;
}

/** Pull structured values from each candidate's indexed text. */
export function extractFields(db: Database, candidates: Candidate[], spec: ExtractSpec = {}): ExtractResult {
  const t0 = Date.now();
  const maxPerRow = spec.maxPerRow ?? 20;
  const structure: Structure = spec.structure ?? "json";
  let re: RegExp | null = null;
  if (spec.re) {
    try { re = new RegExp(spec.re, "g"); }
    catch (err) { throw new Error(`JM_EXTRACT_RE_INVALID: ${String(err).slice(0, 120)}`); }
  }
  if (!re && !spec.field) throw new Error("JM_EXTRACT_ARGS: --re or --field is required");
  if (!["md", "json", "csv"].includes(structure)) throw new Error(`JM_EXTRACT_STRUCTURE: ${structure} (have: md, json, csv)`);

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
        // A ROW'S TEXT IS NOT ALWAYS "key: value" LINES (audit extract.ts:51). That render is the
        // SQLITE adapter's; the JSONL adapter stores `JSON.stringify(value)`, so `--field name` over
        // a `.jsonl` corpus found nothing — MEASURED: two records with `"name":"alice"` and
        // `"name":"bob"` both yielded `values: []` (`empty: 2`), while `--re '"name":"([^"]+)"'`
        // returned both. The documented "a JSON key to pull out of each row's text" did not hold for
        // the adapter whose rows ARE JSON. So the JSON form is tried FIRST and the rendered-line form
        // is the fallback, which is the order that matches how each adapter writes its text.
        let pulled: string | undefined;
        try {
          const parsed = JSON.parse(doc.text) as unknown;
          if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
            const v = (parsed as Record<string, unknown>)[spec.field];
            if (v !== undefined) pulled = typeof v === "string" ? v : JSON.stringify(v);
          }
        } catch { /* not JSON: fall through to the rendered-line form */ }
        if (pulled === undefined) {
          const rx = new RegExp(`^${spec.field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: (.*)$`, "mi");
          const m = doc.text.match(rx);
          if (m) {
            const raw = m[1].trim();
            try {
              const parsed = JSON.parse(raw) as unknown;
              pulled = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
            } catch { pulled = raw; }
          }
        }
        if (pulled !== undefined) values.push(pulled);
      }
    }
    if (values.length === 0) empty++;
    total += values.length;
    rows.push({ path: c.path, values });
  }
  return { rows, total, rowsWithValues: rows.length - empty, empty, structure, ms: Date.now() - t0 };
}

/** Render an extract result in the requested structure (the RESULT artifact shape).
 *  `csv` is REAL here: header + RFC4180 quoting. (Second-operator drill G9: `--structure csv`
 *  silently rendered markdown — a declared structure that the code did not honour.) */
export function renderExtract(res: ExtractResult, structure: Structure): string {
  if (structure === "json") return JSON.stringify(res, null, 2);
  if (structure === "csv") {
    const q = (v: string): string => `"${v.replace(/"/g, '""')}"`;
    const lines = ["path,value"];
    for (const r of res.rows) for (const v of r.values) lines.push(`${q(r.path)},${q(v)}`);
    return lines.join("\n") + "\n";
  }
  const lines = [`# extract`, ``, `rows with values: ${res.rowsWithValues} / ${res.rows.length} · values: ${res.total} · empty: ${res.empty}`, ``];
  for (const r of res.rows) {
    if (r.values.length === 0) continue;
    lines.push(`- \`${r.path}\``);
    for (const v of r.values.slice(0, 10)) lines.push(`  - ${v.length > 200 ? `${v.slice(0, 200)}…` : v}`);
  }
  return lines.join("\n") + "\n";
}

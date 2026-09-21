// src/calibrate.ts — W7: read the recorded decisions, report the bands, move a threshold on evidence.
import type { Database } from "bun:sqlite";

export interface CalibrationReport {
  decisions: number; bands: { act: number; escalate: number; noop: number };
  /** Rows whose confidence is UNKNOWN (a degraded or errored row: `conf IS NULL`). They are
   *  EXCLUDED from the bands and the mean — counting them as 0 would drag the mean down and, worse,
   *  could TALK THE OPERATOR INTO LOWERING A THRESHOLD because the act band looks empty. (D-045.) */
  unknown: number;
  meanSignal: number; truthFilled: number; truthRate: number;
  suggestion?: { act: number; reason: string };
}

export function calibrate(db: Database): CalibrationReport {
  const exists = db.query("SELECT name FROM sqlite_master WHERE type = ? AND name = ?").get("table", "decisions");
  if (!exists) return { decisions: 0, bands: { act: 0, escalate: 0, noop: 0 }, unknown: 0, meanSignal: 0, truthFilled: 0, truthRate: 0 };
  const rows = db.query("SELECT answer_json, conf, policy FROM decisions").all() as { answer_json: string; conf: number | null; policy: string | null }[];
  const bands = { act: 0, escalate: 0, noop: 0 };
  let sum = 0, n = 0, unknown = 0;
  for (const r of rows) {
    // AN UNKNOWN CONFIDENCE IS NOT A ZERO (D-045). `r.conf ?? 0` counted every degraded/errored
    // row as "the judge said 0" — dragging the mean down and inflating the noop band, which is the
    // exact input that drives the "lower the act threshold" suggestion. Unknown rows are COUNTED
    // and EXCLUDED instead.
    if (r.conf === null) { unknown++; continue; }
    let p: { act?: number; flag?: number } = {};
    try { p = JSON.parse(r.policy ?? "{}") as { act?: number; flag?: number }; } catch { p = {}; }   // one malformed row must not abort calibration
    const s = r.conf;
    sum += s; n++;
    if (s >= (p.act ?? 0.8)) bands.act++; else if (s >= (p.flag ?? 0.5)) bands.escalate++; else bands.noop++;
  }
  const meanSignal = n ? sum / n : 0;
  const truth = db.query("SELECT COUNT(*) AS n FROM decisions WHERE context_ref IS NOT NULL AND context_ref != ''").get() as { n: number };   // '' is not a truth
  const filled = truth.n;
  const report: CalibrationReport = {
    decisions: rows.length, bands, unknown, meanSignal, truthFilled: filled,
    truthRate: rows.length ? filled / rows.length : 0,
  };
  // A SUGGESTION FROM THE ROWS, never from taste: if nothing reaches the act band but the
  // escalate band is crowded, the act threshold is above this model's ceiling for the question.
  // A suggestion drawn mostly from KNOWN rows: a batch that is half unknown is not evidence about
  // the model's ceiling, it is evidence about an outage. (D-045.)
  if (n >= 10 && unknown <= n && bands.act === 0 && bands.escalate > 0) {
    report.suggestion = { act: Math.max(0.5, Number((meanSignal + 0.1).toFixed(2))), reason: `act band empty over ${n} KNOWN rows (${unknown} unknown, excluded); mean signal ${meanSignal.toFixed(2)}` };
  }
  return report;
}

/** Record a calibration event — the ONLY way a threshold moves (evidence or it stays). */
export function recordCalibration(db: Database, report: CalibrationReport, note: string): string {
  const at = new Date().toISOString();
  const payload = JSON.stringify({ report, note, at });
  const key = `calibration:${at}:${Math.random().toString(36).slice(2, 8)}`;   // two events in one ms must not overwrite
  db.run("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [key, payload]);
  return at;
}

export function recordTruth(db: Database, id: number, truth: string): boolean {
  const r = db.run("UPDATE decisions SET context_ref = ? WHERE id = ?", [truth, id]);
  return r.changes > 0;
}

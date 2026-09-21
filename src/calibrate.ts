// src/calibrate.ts — W7: read the recorded decisions, report the bands, move a threshold on evidence.
import type { Database } from "bun:sqlite";

export interface CalibrationReport {
  decisions: number; bands: { act: number; escalate: number; noop: number };
  meanSignal: number; truthFilled: number; truthRate: number;
  suggestion?: { act: number; reason: string };
}

export function calibrate(db: Database): CalibrationReport {
  const rows = db.query("SELECT answer_json, conf, policy FROM decisions").all() as { answer_json: string; conf: number | null; policy: string | null }[];
  const bands = { act: 0, escalate: 0, noop: 0 };
  let sum = 0, n = 0;
  for (const r of rows) {
    const p = JSON.parse(r.policy ?? "{}") as { act?: number; flag?: number };
    const s = r.conf ?? 0;
    sum += s; n++;
    if (s >= (p.act ?? 0.8)) bands.act++; else if (s >= (p.flag ?? 0.5)) bands.escalate++; else bands.noop++;
  }
  const meanSignal = n ? sum / n : 0;
  const truth = db.query("SELECT COUNT(*) AS n FROM decisions WHERE context_ref IS NOT NULL").get() as { n: number };
  const filled = truth.n;
  const report: CalibrationReport = {
    decisions: rows.length, bands, meanSignal, truthFilled: filled,
    truthRate: rows.length ? filled / rows.length : 0,
  };
  // A SUGGESTION FROM THE ROWS, never from taste: if nothing reaches the act band but the
  // escalate band is crowded, the act threshold is above this model's ceiling for the question.
  if (rows.length >= 10 && bands.act === 0 && bands.escalate > 0) {
    report.suggestion = { act: Math.max(0.5, Number((meanSignal + 0.1).toFixed(2))), reason: `act band empty over ${rows.length} rows; mean signal ${meanSignal.toFixed(2)}` };
  }
  return report;
}

/** Record a calibration event — the ONLY way a threshold moves (evidence or it stays). */
export function recordCalibration(db: Database, report: CalibrationReport, note: string): string {
  const at = new Date().toISOString();
  const payload = JSON.stringify({ report, note, at });
  db.run("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [`calibration:${at}`, payload]);
  return at;
}

export function recordTruth(db: Database, id: number, truth: string): boolean {
  const r = db.run("UPDATE decisions SET context_ref = ? WHERE id = ?", [truth, id]);
  return r.changes > 0;
}

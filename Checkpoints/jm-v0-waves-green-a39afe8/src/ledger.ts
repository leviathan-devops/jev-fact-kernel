// src/ledger.ts — the append-only decision/run ledger (L3: no row, no run).
import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

export const ledgerPath = (): string =>
  process.env.JM_LEDGER ?? join(process.env.JM_HOME ?? join(process.env.HOME ?? ".", ".jm"), "ledger.jsonl");

export interface LedgerRow {
  ts: string;
  kind: "run";
  verb: string;
  args: Record<string, unknown>;
  started: string;
  ended: string;
  status: "ok" | "error";
  stats: Record<string, unknown>;
  cost_usd: number;
  calls: number;
  cached: number;
}

export function appendLedger(row: LedgerRow): void {
  const p = ledgerPath();
  mkdirSync(dirname(p), { recursive: true });
  appendFileSync(p, JSON.stringify(row) + "\n");
}

export function readLedger(): LedgerRow[] {
  const p = ledgerPath();
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as LedgerRow; } catch { return null; } })
    .filter((r): r is LedgerRow => r !== null);
}

/** Wrap a verb: times it, writes exactly one ledger row, prints the cost line. */
export async function withLedger<T>(
  verb: string,
  args: Record<string, unknown>,
  fn: () => Promise<{ result: T; stats: Record<string, unknown>; costUsd?: number; calls?: number; cached?: number }>,
): Promise<T> {
  const started = new Date().toISOString();
  let ledgerFailed: string | null = null;
  const ledgerSafe = (row: LedgerRow): void => {
    try { appendLedger(row); } catch (e) { ledgerFailed = String(e).slice(0, 120); }   // H1: the record path must never mask the real error
  };
  try {
    const { result, stats, costUsd = 0, calls = 0, cached = 0 } = await fn();
    const ended = new Date().toISOString();
    ledgerSafe({ ts: ended, kind: "run", verb, args, started, ended, status: "ok", stats, cost_usd: costUsd, calls, cached });
    // "NO ROW, NO RUN" (bible L3) APPLIES TO THE SUCCESS PATH TOO. `ledgerFailed` was inspected only
    // in the catch branch, so a verb that DID ITS WORK but could not write its row returned normally
    // — MEASURED: with an unwritable JM_LEDGER, `jm index` printed `JM_INDEX_OK ... changed=1` and
    // exited 0 with no row anywhere. The ledger is the record of what ran; a run that cannot be
    // recorded must say so rather than report clean success. The work has already happened at this
    // point, so the error says exactly that: completed, unrecorded.
    if (ledgerFailed) throw new Error(`JM_LEDGER_FAILED: ${ledgerFailed} (the run COMPLETED but its ledger row was not written — L3 "no row, no run")`);
    // STDOUT IS DATA, ALWAYS. The cost line is a diagnostic, so it goes to STDERR for EVERY verb
    // and every structure — a csv redirected to a file must contain csv, and a --json payload must
    // parse. (Caught by verifying the operating contract: `extract --structure csv > out.csv`
    // prepended `cost=$…` to the file, corrupting it. D-017.)
    console.error(`cost=$${costUsd.toFixed(6)} calls=${calls} cached=${cached}`);
    return result;
  } catch (err) {
    const ended = new Date().toISOString();
    ledgerSafe({ ts: ended, kind: "run", verb, args, started, ended, status: "error", stats: { error: String(err) }, cost_usd: 0, calls: 0, cached: 0 });
    if (ledgerFailed) throw new Error(`JM_LEDGER_FAILED: ${ledgerFailed} (while reporting: ${String(err).slice(0, 100)})`);
    throw err;
  }
}

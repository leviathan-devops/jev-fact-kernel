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
  // THE OUTCOME IS HELD OUTSIDE THE TRY so the success-path ledger check can run AFTER the catch,
  // where its own throw cannot be swallowed by it.
  let outcome: { result: T; costUsd: number; calls: number; cached: number } | null = null;
  try {
    const { result, stats, costUsd = 0, calls = 0, cached = 0 } = await fn();
    const ended = new Date().toISOString();
    ledgerSafe({ ts: ended, kind: "run", verb, args, started, ended, status: "ok", stats, cost_usd: costUsd, calls, cached });
    outcome = { result, costUsd, calls, cached };
  } catch (err) {
    const ended = new Date().toISOString();
    ledgerSafe({ ts: ended, kind: "run", verb, args, started, ended, status: "error", stats: { error: String(err) }, cost_usd: 0, calls: 0, cached: 0 });
    if (ledgerFailed) throw new Error(`JM_LEDGER_FAILED: ${ledgerFailed} (while reporting: ${String(err).slice(0, 100)})`);
    throw err;
  }
  // "NO ROW, NO RUN" (bible L3) — AND THIS CHECK IS OUTSIDE THE TRY. The first version of it sat
  // INSIDE, so its own `throw` was caught by the `catch` immediately below and re-wrapped: the
  // behaviour was right by ACCIDENT (the catch throws its own `JM_LEDGER_FAILED` when the flag is
  // set) and the message came out doubled and confusing — `JM_LEDGER_FAILED: … (while reporting:
  // Error: JM_LEDGER_FAILED: …)`. **The fix for a swallowed failure contained a swallowed failure.**
  // Found by the third audit pass (scan, ledger.ts:58), on code written the same day.
  if (ledgerFailed) throw new Error(`JM_LEDGER_FAILED: ${ledgerFailed} (the run COMPLETED but its ledger row was not written — L3 "no row, no run")`);
  // STDOUT IS DATA, ALWAYS. The cost line is a diagnostic, so it goes to STDERR for EVERY verb
  // and every structure — a csv redirected to a file must contain csv, and a --json payload must
  // parse. (Caught by verifying the operating contract: `extract --structure csv > out.csv`
  // prepended `cost=$…` to the file, corrupting it. D-017.)
  console.error(`cost=$${outcome!.costUsd.toFixed(6)} calls=${outcome!.calls} cached=${outcome!.cached}`);
  return outcome!.result;
}

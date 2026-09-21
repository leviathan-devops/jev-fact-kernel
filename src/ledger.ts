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
    // MACHINE-READABLE CONTRACT: with --json, stdout stays pure JSON; the cost line goes to stderr.
    const costLine = `cost=$${costUsd.toFixed(6)} calls=${calls} cached=${cached}`;
    if (process.argv.includes("--json")) console.error(costLine); else console.log(costLine);
    return result;
  } catch (err) {
    const ended = new Date().toISOString();
    ledgerSafe({ ts: ended, kind: "run", verb, args, started, ended, status: "error", stats: { error: String(err) }, cost_usd: 0, calls: 0, cached: 0 });
    if (ledgerFailed) throw new Error(`JM_LEDGER_FAILED: ${ledgerFailed} (while reporting: ${String(err).slice(0, 100)})`);
    throw err;
  }
}

// src/watch.ts — the daemon surface (S19, the manager-machine frame).
// One tick = reconcile(desired state from the registry) -> act -> journal. No LLM, no network.
// The tick is IDEMPOTENT: running it twice on an unchanged corpus performs zero writes.
import { appendFileSync, mkdirSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { openDb, indexPathFor, loadTargets } from "./store/db.ts";
import { ingestAll } from "./targets.ts";

export interface WatchOpts { intervalMs?: number; index?: string; once?: boolean; in?: string; }

export const watchDir = (): string =>
  process.env.JM_HOME ? join(process.env.JM_HOME, "watch") : join(homedir(), ".jm", "watch");
export const journalPath = (): string => join(watchDir(), "journal.jsonl");
export const statePath = (): string => join(watchDir(), "state.json");

export interface TickResult {
  at: string; targets: number; rows: number; changed: number; ms: number;
  actions: { target: string; kind: string; changed: number; rows: number }[];
  errors: string[];
}

/** One reconcile tick. Writes a journal row and updates state; never throws on a bad target. */
export async function tick(opts: { index?: string; in?: string } = {}): Promise<TickResult> {
  const t0 = Date.now();
  const at = new Date().toISOString();
  const indexName = opts.index ?? "all";
  const actions: TickResult["actions"] = [];
  const errors: string[] = [];
  let rows = 0, changed = 0, targets = 0;

  const db = openDb(indexPathFor(indexName));
  try {
    const list = loadTargets();
    targets = opts.in && opts.in !== "all"
      ? list.filter((t) => opts.in!.split(",").map((s) => s.trim()).includes(t.name)).length
      : list.length;
    const stats = await ingestAll(db, opts.in ?? "all");
    for (const s of stats) {
      rows += s.rows; changed += s.changed;
      actions.push({ target: s.target, kind: s.kind, changed: s.changed, rows: s.rows });
    }
  } catch (err) {
    errors.push(String(err).slice(0, 200));       // a bad registry/target is journaled, not fatal
  } finally { db.close(); }

  const res: TickResult = { at, targets, rows, changed, ms: Date.now() - t0, actions, errors };
  mkdirSync(watchDir(), { recursive: true });
  appendFileSync(journalPath(), JSON.stringify(res) + "\n");
  const state = { last_tick: at, rows, changed, ms: res.ms, errors: errors.length };
  const tmp = `${statePath()}.tmp-${process.pid}`;
  try { writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n"); renameSync(tmp, statePath()); }
  catch { /* best-effort state pointer; the journal is the durable record */ }
  return res;
}

export function readJournal(limit = 20): TickResult[] {
  const p = journalPath();
  if (!existsSync(p)) return [];
  const lines = readFileSync(p, "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(-limit).map((l) => JSON.parse(l) as TickResult);
}

/** The loop. `once: true` runs a single tick (tests and cron both use this shape). */
export async function watch(opts: WatchOpts = {}): Promise<void> {
  const interval = opts.intervalMs ?? 60_000;
  for (;;) {
    const r = await tick({ index: opts.index, in: opts.in });
    process.stdout.write(`[jm watch] ${r.at} targets=${r.targets} rows=${r.rows} changed=${r.changed} ${r.ms}ms${r.errors.length ? ` errors=${r.errors.length}` : ""}\n`);
    if (opts.once) return;
    await Bun.sleep(interval);
  }
}

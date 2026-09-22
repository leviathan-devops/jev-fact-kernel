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

  // The scope set is computed ONCE: rebuilding it inside the filter callback allocated a new array
  // per element of the registry (an audit flagged it, and it is the kind of waste that hides in a
  // daemon that ticks forever).
  const scope = opts.in && opts.in !== "all"
    ? new Set(opts.in.split(",").map((x) => x.trim()).filter(Boolean))
    : null;
  const db = openDb(indexPathFor(indexName));
  try {
    const list = loadTargets();
    targets = scope ? list.filter((t) => scope.has(t.name)).length : list.length;
    const stats = await ingestAll(db, opts.in ?? "all");
    for (const s of stats) {
      rows += s.rows; changed += s.changed;
      actions.push({ target: s.target, kind: s.kind, changed: s.changed, rows: s.rows });
    }
  } catch (err) {
    // A bad registry/target is JOURNALED, never fatal: a daemon that dies on a bad config cannot
    // reconcile anything. The message is bounded but keeps head AND tail, so a stack's origin and
    // its final cause both survive (a plain slice(0,200) cut the tail off).
    const m = String(err);
    errors.push(m.length <= 500 ? m : `${m.slice(0, 350)} … [${m.length - 450} chars elided] … ${m.slice(-100)}`);
  } finally { db.close(); }

  const res: TickResult = { at, targets, rows, changed, ms: Date.now() - t0, actions, errors };
  mkdirSync(watchDir(), { recursive: true });

  // The state pointer is written FIRST, then the journal. The other order made the two records
  // disagree: the CLI's summary counted a state failure the journal row (written earlier) could
  // not contain. `errors` IS `res.errors` (one array), so pushing to both duplicated the entry.
  const state = { last_tick: at, rows, changed, ms: res.ms, errors: errors.length };
  const tmp = `${statePath()}.tmp-${process.pid}`;
  try { writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n"); renameSync(tmp, statePath()); }
  catch (err) {
    // Best-effort, but NOT SILENT: the failure goes on the tick's own record, and therefore into
    // the journal, so a stale state file is visible rather than mysterious.
    errors.push(`state_file: ${String(err).slice(0, 160)}`);
    state.errors = errors.length;
  }
  appendFileSync(journalPath(), JSON.stringify(res) + "\n");
  return res;
}

/**
 * The journal is APPEND-ONLY, so a TORN LINE IS EXPECTED — a crash mid-append produces exactly the
 * shape that used to kill this read. `lines.map((l) => JSON.parse(l))` threw on the FIRST bad line
 * and returned NOTHING, so one torn entry made every later tick unreadable: the durable record of
 * the daemon's life was lost from the corruption onward (D-058).
 *
 * The rule is the ledger's rule: SKIP the malformed line, COUNT it, and REPORT the count — a silent
 * skip would be its own defect, and the number is what tells an operator the file is damaged.
 */
export function readJournal(limit = 20): { rows: TickResult[]; corrupt: number } {
  const p = journalPath();
  if (!existsSync(p)) return { rows: [], corrupt: 0 };
  const lines = readFileSync(p, "utf8").trim().split("\n").filter(Boolean);
  const rows: TickResult[] = [];
  let corrupt = 0;
  for (const l of lines.slice(-limit)) {
    try { rows.push(JSON.parse(l) as TickResult); }
    catch { corrupt++; }
  }
  return { rows, corrupt };
}

/** The loop. `once: true` runs a single tick (tests and cron both use this shape). */
export async function watch(opts: WatchOpts = {}): Promise<void> {
  const interval = opts.intervalMs ?? 60_000;
  for (;;) {
    // A TRANSIENT FAILURE MUST NOT END THE DAEMON (audit watch.ts:100). `await tick(...)` was
    // unguarded, so ANY throw — `openDb` on a locked or briefly-unavailable store, the journal
    // `appendFileSync` on a full disk — terminated the loop. The process stayed up (a systemd unit
    // reports it as running) while it never reconciled again: the "alive but doing nothing" shape,
    // which is worse than a crash because nothing restarts it. The failure is REPORTED and the
    // loop CONTINUES; `once` still rethrows, so a cron tick surfaces its error by exit code.
    let r: TickResult;
    try {
      r = await tick({ index: opts.index, in: opts.in });
    } catch (err) {
      process.stderr.write(`[jm watch] TICK_FAILED ${new Date().toISOString()} ${String(err).slice(0, 200)}\n`);
      if (opts.once) throw err;
      await Bun.sleep(interval);
      continue;
    }
    process.stdout.write(`[jm watch] ${r.at} targets=${r.targets} rows=${r.rows} changed=${r.changed} ${r.ms}ms${r.errors.length ? ` errors=${r.errors.length}` : ""}\n`);
    if (opts.once) return;
    await Bun.sleep(interval);
  }
}

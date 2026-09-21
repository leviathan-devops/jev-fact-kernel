// src/job/run.ts — the queued executor: enqueue → sweep → claim → work → ack.
// This is the W1 gate's surface: a kill mid-run leaves 'running' rows; resume completes with dup=0.
import { openJob } from "./store.ts";
import { Queue } from "./queue.ts";
import { runPool } from "../pools/pool.ts";

export interface RunResult { jobId: string; resumed: number; processed: number; done: number; failed: number; budgetStopped: boolean; stats: ReturnType<Queue["stats"]>; }

export async function runQueued<I, O>(opts: {
  jobId: string;
  kind: string;
  items: { fingerprint: string; payload: I }[];
  work: (item: I, fingerprint: string) => Promise<O>;
  concurrency?: number;
  stopAfter?: number;   // test hook: stop after N processed (simulates a crash mid-run)
  budgetCalls?: number; // HARD CAP (L3/T4): stop claiming once this many rows are DONE
  stopOnError?: boolean; // when true, a worker failure stops the run (fail-closed callers)
}): Promise<RunResult> {
  const { db } = openJob(opts.jobId);
  const q = new Queue(db, opts.jobId);
  const resumed = q.sweep();                       // RESUME SWEEP: dead 'running' rows → pending
  q.enqueue(opts.kind, opts.items as { fingerprint: string; payload: unknown }[]);

  let processed = 0;
  let budgetStopped = false;
  const budget = opts.stopAfter ?? Infinity;

  for (;;) {
    const doneNow = q.stats().done;
    if (opts.budgetCalls !== undefined && doneNow >= opts.budgetCalls) { budgetStopped = true; break; }
    // EXACT STOP: never claim more than the budget allows (no batch overshoot).
    const room = opts.budgetCalls !== undefined ? Math.max(0, opts.budgetCalls - doneNow) : Infinity;
    const batch = q.claim(Math.min(opts.concurrency ?? 4, 16, room));
    if (batch.length === 0) break;
    const { errors } = await runPool(batch, async (item) => {
      if (processed >= budget) return null;        // simulated crash point: leave the row 'running'
      try {
        const out = await opts.work(item.payload as I, item.fingerprint);
        if (!q.complete(item.id, out)) {   // the row was swept mid-work: someone else owns it now
          throw new Error(`JM_ACK_REFUSED: row ${item.id} left 'running' while we worked it`);
        }
        processed++;
        return out;
      } catch (err) { q.fail(item.id, String(err).slice(0, 200)); throw err; }   // record, never orphan
    }, { concurrency: opts.concurrency });
    if (errors.length > 0 && opts.stopOnError) throw new Error(errors[0].error);
    if (processed >= budget) break;                // rows stay 'running' on purpose
  }

  const stats = q.stats();
  // THE DUP LAW: within the DONE set, rows must equal distinct fingerprints. (Across the
  // whole table, unique fingerprints legitimately exceed done rows mid-run — that is work
  // still outstanding, not duplication.)
  const d = db.query("SELECT COUNT(*) AS n, COUNT(DISTINCT fingerprint) AS uniq FROM queue WHERE state='done'").get() as { n: number; uniq: number };
  if (d.n !== d.uniq) throw new Error(`JM_DUP_VIOLATION: done=${d.n} distinct_done=${d.uniq}`);
  db.close();
  return { jobId: opts.jobId, resumed, processed, done: stats.done, failed: stats.failed, budgetStopped, stats };
}

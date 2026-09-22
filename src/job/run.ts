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
  // THE GUARD WRAPS THE WHOLE BODY. It used to wrap only the TAIL (the stats + dup check), so a
  // `stopOnError` rethrow — or any error from q.sweep()/q.enqueue()/q.claim()/q.stats() — escaped
  // before `db.close()`, leaking the connection. `indexJob.ts` relies on THIS function to close it,
  // and in a long-lived daemon that is one leaked handle per failed job. Found by the audit (H-3).
  try {
    const q = new Queue(db, opts.jobId);
    const resumed = q.sweep();                       // RESUME SWEEP: dead 'running' rows → pending
    q.enqueue(opts.kind, opts.items as { fingerprint: string; payload: unknown }[]);

    let processed = 0;
    let budgetStopped = false;
    const budget = opts.stopAfter ?? Infinity;

    // ATOMIC BUDGET CLAIM: `stopAfter` is a per-run cap on ITEMS WORKED; the check and the
    // increment happen in ONE synchronous block per worker (no await between), so concurrent
    // lanes cannot all pass the check before any of them counts.
    const claimSlot = (): boolean => {
      if (processed >= budget) return false;
      processed++;                    // synchronous: no await between check and increment
      return true;
    };

    for (;;) {
      const doneNow = q.stats().done;
      if (opts.budgetCalls !== undefined && doneNow >= opts.budgetCalls) { budgetStopped = true; break; }
      // EXACT STOP: never claim more than the budget allows (no batch overshoot).
      const room = opts.budgetCalls !== undefined ? Math.max(0, opts.budgetCalls - doneNow) : Infinity;
      const stopRoom = budget !== Infinity ? Math.max(0, budget - processed) : Infinity;
      if (stopRoom === 0) break;
      const batch = q.claim(Math.min(opts.concurrency ?? 4, 16, room, stopRoom));
      if (batch.length === 0) break;
      const { errors } = await runPool(batch, async (item) => {
        if (!claimSlot()) return null;               // simulated crash point: leave the row 'running'
        try {
          const out = await opts.work(item.payload as I, item.fingerprint);
          if (!q.complete(item.id, out)) {   // the row was swept mid-work: someone else owns it now
            throw new Error(`JM_ACK_REFUSED: row ${item.id} left 'running' while we worked it`);
          }
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
    return { jobId: opts.jobId, resumed, processed, done: stats.done, failed: stats.failed, budgetStopped, stats };
  } finally {
    db.close();     // H2: the connection closes on the error path too (no leak)
  }
}

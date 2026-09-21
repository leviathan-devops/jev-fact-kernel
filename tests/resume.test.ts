// test_resume_no_dup — kill mid-run leaves 'running' rows; the sweep resumes; dup=0.
import { test, expect } from "bun:test";
import { makeSandbox } from "./helpers.ts";
import { runQueued } from "../src/job/run.ts";
import { openJob } from "../src/job/store.ts";
import { Queue } from "../src/job/queue.ts";

test_resume_no_dup();

function test_resume_no_dup() {
  test("test_resume_no_dup", async () => {
    const sb = makeSandbox();
    try {
      const items = Array.from({ length: 50 }, (_, i) => ({ fingerprint: `f${i}`, payload: { n: i } }));

      // PASS 1 — DETERMINISTIC CRASH SIMULATION: enqueue, claim 10, complete 1, die.
      // (The first draft leaned on batch-boundary timing — flaky by construction; a real
      // crash is better simulated by explicitly leaving claimed rows un-acked.)
      let worked = 0;
      const { db } = openJob("j1");
      const q1 = new Queue(db, "j1");
      q1.enqueue("unit", items);
      const batch = q1.claim(10);
      expect(batch.length).toBe(10);
      q1.complete(batch[0].id, { crashed: false });
      const stuck = q1.stats().running;         // 9 rows claimed, never acked — the crash
      expect(stuck).toBe(9);
      db.close();                               // the process "dies" here

      // PASS 2 — resume: the sweep returns the stuck rows; everything completes; dup=0.
      const second = await runQueued({
        jobId: "j1", kind: "unit", items, stopAfter: undefined,
        work: async () => { worked++; return { ok: true }; }, concurrency: 4,
      });
      expect(second.resumed).toBe(stuck);       // exactly the orphaned rows came back
      expect(second.stats.done).toBe(50);
      expect(second.stats.pending).toBe(0);
      expect(second.stats.running).toBe(0);
      // pass 1 completed exactly 1 row; pass 2 therefore works exactly 49 (9 resumed + 40 pending).
      // The orphaning is at-least-once by design; the fingerprint UNIQUE keeps it duplicate-free.
      expect(worked).toBe(49);

      const { db: db2 } = openJob("j1");
      const rows = db2.query("SELECT COUNT(*) AS n FROM queue WHERE state='done'").get() as { n: number };
      const uniq = db2.query("SELECT COUNT(DISTINCT fingerprint) AS n FROM queue").get() as { n: number };
      expect(rows.n).toBe(50);
      expect(uniq.n).toBe(50);                  // NO DUPLICATES — the fingerprint UNIQUE is the law
      db2.close();
    } finally { sb.cleanup(); }
  });

  test("test_budget_stop_after_atomic", async () => {
    // The `stopAfter` cap must be ATOMIC with the claim: with concurrency 8 and a cap of 5,
    // the old check-then-act let all lanes pass before any increment (overshoot).
    const sb3 = makeSandbox();
    try {
      const items = Array.from({ length: 40 }, (_, i) => ({ fingerprint: `a${i}`, payload: i }));
      let worked = 0;
      const res = await runQueued({
        jobId: "j4", kind: "unit", items, stopAfter: 5, concurrency: 8,
        work: async () => { worked++; return { ok: true }; },
      });
      expect(worked).toBe(5);                       // EXACT: no overshoot
      expect(res.processed).toBe(5);
    } finally { sb3.cleanup(); }
  });

  test("test_queue_stale_ack_refused", async () => {
    // A stale process whose claimed row was swept and re-claimed must NOT overwrite the live result.
    const sb2 = makeSandbox();
    try {
      const { db } = openJob("j3");
      const q = new Queue(db, "j3");
      q.enqueue("k", [{ fingerprint: "r1", payload: 1 }]);
      const [claimed] = q.claim(1);
      expect(claimed.fingerprint).toBe("r1");
      expect(q.sweep()).toBe(1);                       // someone else sweeps our row back to pending
      expect(q.complete(claimed.id, { stale: true })).toBe(false);   // the stale ack is REFUSED
      const row = db.query("SELECT state, result FROM queue WHERE id = ?").get(claimed.id) as { state: string; result: string | null };
      expect(row.state).toBe("pending");               // and the row is NOT marked done
      expect(row.result).toBeNull();
      db.close();
    } finally { sb2.cleanup(); }
  });

  test("test_queue_fingerprint_idempotent", async () => {
    const sb = makeSandbox();
    try {
      const { db } = openJob("j2");
      const q = new Queue(db, "j2");
      const first = q.enqueue("k", [{ fingerprint: "same", payload: 1 }]);
      expect(first).toEqual({ added: 1, updated: 0, skipped: 0 });
      // a re-enqueue of a PENDING row ADOPTS the new payload (the audit's fix): never stale, never duplicated
      const second = q.enqueue("k", [{ fingerprint: "same", payload: 2 }]);
      expect(second).toEqual({ added: 0, updated: 1, skipped: 0 });
      expect(q.stats().pending).toBe(1);
      db.close();
    } finally { sb.cleanup(); }
  });
}

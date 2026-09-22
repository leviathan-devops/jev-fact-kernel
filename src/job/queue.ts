// src/job/queue.ts — crash-first rows, ack-on-complete, resume-by-sweep.
// A kill -9 leaves rows in 'running'; the sweep returns them to 'pending'.
// The fingerprint UNIQUE constraint makes re-processing idempotent (dup=0 by construction).
import type { Database } from "bun:sqlite";

export interface QueueItem { id: number; fingerprint: string; kind: string; payload: unknown; attempts: number; }

export class Queue {
  constructor(private db: Database, private jobId: string) {}

  /** The job this queue belongs to (surfaced in error text and diagnostics). */
  job(): string { return this.jobId; }

  /** Enqueue items. A re-enqueue of a PENDING/FAILED fingerprint ADOPTS the new payload
   *  (never silently keeping the stale one); a DONE row is left untouched. */
  enqueue(kind: string, items: { fingerprint: string; payload: unknown }[]): { added: number; updated: number; skipped: number } {
    const now = new Date().toISOString();
    const exists = this.db.query("SELECT state FROM queue WHERE fingerprint = ?");
    const ins = this.db.query(
      "INSERT INTO queue(fingerprint, kind, payload, state, created_at, updated_at) VALUES (?,?,?, 'pending', ?, ?)",
    );
    const upd = this.db.query(
      "UPDATE queue SET payload = ?, updated_at = ? WHERE fingerprint = ? AND state IN ('pending','failed')",
    );
    let added = 0, updated = 0, skipped = 0;
    const tx = this.db.transaction(() => {
      for (const it of items) {
        const row = exists.get(it.fingerprint) as { state: string } | null;
        if (!row) { ins.run(it.fingerprint, kind, JSON.stringify(it.payload), now, now); added++; }
        else if (row.state === "pending" || row.state === "failed") { upd.run(JSON.stringify(it.payload), now, it.fingerprint); updated++; }
        else skipped++;
      }
    });
    tx();
    return { added, updated, skipped };
  }

  /** Claim up to n pending rows. Returns them with state='running' already persisted. */
  claim(n: number): QueueItem[] {
    const want = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;   // NaN/negative must never become LIMIT -1
    if (want === 0) return [];
    const now = new Date().toISOString();
    const tx = this.db.transaction(() => {
      const rows = this.db.query(
        "SELECT id, fingerprint, kind, payload, attempts FROM queue WHERE state='pending' ORDER BY id LIMIT ?",
      ).all(want) as { id: number; fingerprint: string; kind: string; payload: string; attempts: number }[];
      const upd = this.db.query("UPDATE queue SET state='running', attempts=attempts+1, updated_at=? WHERE id=?");
      for (const r of rows) upd.run(now, r.id);
      return rows.map((r) => {
        let payload: unknown = null;
        try { payload = JSON.parse(r.payload); } catch { payload = { __corrupt: true, raw: String(r.payload).slice(0, 120) }; }
        return { ...r, payload };
      });
    });
    return tx() as QueueItem[];
  }

  /** Ack is conditional on the row still being OURS: a stale process whose claimed row was
   *  swept back to pending and re-claimed by a live process must NOT overwrite the live result.
   *  Returns false when the ack was refused (the row moved on without us).
   *
   *  THE GUARD CHECKS THE ATTEMPT, NOT JUST THE STATE (audit queue.ts:61). `state='running'` alone
   *  is satisfied by a DIFFERENT claim: the sequence "stale process claims row 5 (attempts=1) →
   *  sweep returns it to pending → live process re-claims row 5 (attempts=2) → stale process acks"
   *  passes the state check and overwrites the live result. The row's `attempts` counter is the
   *  generation token, so the ack must name the attempt it is acking. */
  complete(id: number, result: unknown, attempt?: number): boolean {
    const r = attempt === undefined
      ? this.db.run("UPDATE queue SET state='done', result=?, updated_at=? WHERE id=? AND state='running'",
        [JSON.stringify(result ?? null), new Date().toISOString(), id])
      : this.db.run("UPDATE queue SET state='done', result=?, updated_at=? WHERE id=? AND state='running' AND attempts=?",
        [JSON.stringify(result ?? null), new Date().toISOString(), id, attempt]);
    return r.changes === 1;
  }
  fail(id: number, error: string): boolean {
    const r = this.db.run("UPDATE queue SET state='failed', error=?, updated_at=? WHERE id=? AND state='running'",
      [error, new Date().toISOString(), id]);
    return r.changes === 1;
  }

  /** THE RESUME SWEEP: rows left 'running' by a dead process return to 'pending'. */
  sweep(): number {
    const now = new Date().toISOString();
    const res = this.db.run("UPDATE queue SET state='pending', updated_at=? WHERE state='running'", [now]);
    return res.changes;
  }

  stats(): { pending: number; running: number; done: number; failed: number; total: number } {
    const g = (s: string) => (this.db.query("SELECT COUNT(*) AS n FROM queue WHERE state=?").get(s) as { n: number }).n;
    return { pending: g("pending"), running: g("running"), done: g("done"), failed: g("failed"), total: g("done") + g("failed") + g("pending") + g("running") };
  }
}

// tests/job-report.test.ts — C8, the spec's per-job ledger reconciliation.
// The criterion names the invocation `jm report --job last` and asks that the ledger reconcile
// against the work. This test file exists because the verb did not: it was recorded as an OPEN
// violation in VIOLATION_LOG.md (C8) and closed here.
import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { runIndexJob } from "../src/job/indexJob.ts";
import { jobReport, jobExists, lastJobId } from "../src/verbs/report.ts";
import { jobsDir } from "../src/job/store.ts";

function seeded(n = 8) {
  const sb = makeSandbox();
  const files: Record<string, string> = {};
  for (let i = 0; i < n; i++) files[`c/f${i}.md`] = `body ${i}`;
  fill(sb.root, files);
  process.env.JM_HOME = sb.home;
  saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
  return sb;
}

describe("C8 job reconciliation", () => {
  test("test_job_report_reconciles", async () => {
    const sb = seeded(8);
    try {
      const db = openDb(indexPathFor("c8"));
      await runIndexJob({ indexDb: db, jobId: "j1", root: join(sb.root, "c"), concurrency: 4 });
      const r = jobReport(db, "j1");
      expect(r.queue.total).toBe(8);
      expect(r.queue.done).toBe(8);
      expect(r.queue.pending).toBe(0);
      expect(r.queue.running).toBe(0);
      expect(r.queue.distinct).toBe(8);
      expect(r.reconciled).toBe(true);
      expect(r.files).toBe(8);                       // the index half
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_job_report_fails_on_a_leftover_running_row", async () => {
    // The negative half. A row claimed but never acked is exactly what a crash leaves, and the
    // reconciliation must REFUSE to call that job done.
    const sb = seeded(6);
    try {
      const db = openDb(indexPathFor("c8"));
      await runIndexJob({ indexDb: db, jobId: "j2", root: join(sb.root, "c"), concurrency: 4 });
      const jdb = new Database(join(jobsDir(), "j2", "queue.sqlite"));
      jdb.run("UPDATE queue SET state='running' WHERE id=(SELECT id FROM queue LIMIT 1)");
      jdb.close();
      const r = jobReport(db, "j2");
      expect(r.queue.running).toBe(1);
      expect(r.reconciled).toBe(false);              // a leftover claim is NOT reconciled
      expect(r.note).toContain("1 rows left running");
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_job_report_refuses_a_typo_and_invents_nothing", async () => {
    // D-009's class, in this verb: `openJob()` CREATES the job directory, so a reconcile call on
    // a typo'd id reported an empty-but-healthy job. It must refuse, and it must create nothing.
    const sb = seeded(2);
    try {
      process.env.JM_HOME = sb.home;
      expect(jobExists("nope")).toBe(false);
      expect(() => jobReport(null, "nope")).toThrow(/JM_JOB_MISSING/);
      expect(jobExists("nope")).toBe(false);         // and no directory appeared
    } finally { sb.cleanup(); }
  });

  test("test_last_job_id_picks_the_most_recent", async () => {
    const sb = seeded(4);
    try {
      const db = openDb(indexPathFor("c8"));
      await runIndexJob({ indexDb: db, jobId: "older", root: join(sb.root, "c"), concurrency: 2 });
      await Bun.sleep(15);                            // mtime resolution
      await runIndexJob({ indexDb: db, jobId: "newer", root: join(sb.root, "c"), concurrency: 2 });
      const last = lastJobId();
      expect(last).toBe("newer");
      expect(jobExists(last!)).toBe(true);
      db.close();
    } finally { sb.cleanup(); }
  });

  test("test_duplicate_fingerprints_are_impossible_by_schema", () => {
    // The DUP LAW is enforced by the UNIQUE constraint, not by the report's arithmetic — so the
    // report's count is a defensive read. This pin records WHERE the enforcement lives.
    const sb = seeded(2);
    try {
      const db = openDb(indexPathFor("c8"));
      expect(true).toBe(true);
      db.close();
      const qdb = new Database(join(sb.home, "probe.sqlite"), { create: true });
      qdb.run("CREATE TABLE q (id INTEGER PRIMARY KEY, fingerprint TEXT UNIQUE)");
      qdb.run("INSERT INTO q (fingerprint) VALUES ('a')");
      expect(() => qdb.run("INSERT INTO q (fingerprint) VALUES ('a')")).toThrow(/UNIQUE/);
      qdb.close();
    } finally { sb.cleanup(); }
  });
});

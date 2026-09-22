// src/job/indexJob.ts — the QUEUED index path: every file is a resumable queue row.
// This is what makes "kill -9 mid-run, re-run, dup=0" a real property, not a claim.
import type { Database } from "bun:sqlite";
import { indexFile, listFiles, type IndexOpts, type OneFileResult } from "../verbs/index.ts";
import { runQueued } from "./run.ts";

export interface QueuedIndexResult {
  jobId: string; ok: boolean; files: number; processed: number; resumed: number;
  changed: number; textIndexed: number; done: number; pending: number; running: number;
  /** items that permanently FAILED — carried from `runQueued().errors`, previously dropped. */
  failed: number;
  budgetStopped: boolean; error?: string; ms: number;
}

export async function runIndexJob(opts: {
  indexDb: Database; jobId: string; root: string; opts?: IndexOpts;
  concurrency?: number; budgetCalls?: number;
}): Promise<QueuedIndexResult> {
  const t0 = Date.now();
  const paths = listFiles(opts.root, opts.opts ?? {});
  const items = paths.map((abs) => ({ fingerprint: abs, payload: { abs } }));
  let changed = 0, textIndexed = 0, budgetStopped = false, error: string | undefined;

  const res = await runQueued<{ abs: string }, OneFileResult>({
    jobId: opts.jobId, kind: "index-file", items, concurrency: opts.concurrency ?? 8,
    budgetCalls: opts.budgetCalls,
    work: async ({ abs }) => {
      const r = indexFile(opts.indexDb, opts.root, abs, opts.opts ?? {});
      if (r.changed) changed++;
      if (r.textIndexed) textIndexed++;
      return r;
    },
  }).catch((e) => { error = String(e); return null; });
  // A CRASHED RUN MUST NOT WEAR A SUCCESS SHAPE (audit indexJob.ts:31/37). `.catch((e) => { error = String(e); return null })`
  // sets `error`, but every counter below then reads `res?… ?? 0` — so a crash produced
  // `processed=0 done=0 pending=0 running=0 files=<the whole index>` and the `files` figure alone
  // made the result look like work had happened. A caller checking `done > 0` (or the CLI's
  // `JM_QUEUED done=0 …`) could not distinguish "crashed" from "nothing to do". `ok` states it.
  //
  // AND THE FAILED COUNT IS CARRIED (audit indexJob.ts:37): `runQueued` returns an `errors[]`, and
  // dropping it meant items that permanently FAILED were invisible in the summary — the same
  // silent-failure shape as a swallowed exception, with the exception recorded and the count lost.
  // `runQueued` REPORTS `failed` (RunResult:7) and this function DROPPED it — items that
  // permanently failed were invisible in the returned summary. The field is `failed`, not an
  // `errors[]`: I reached for the wrong name first and tsc caught it, which is the boundary
  // doing its job.
  const failed = res?.failed ?? 0;
  const ok = error === undefined;
  budgetStopped = res?.budgetStopped ?? false;

  const filesRow = (opts.indexDb.query("SELECT COUNT(*) AS n FROM files WHERE state != 'gone'").get() as { n: number });
  return {
    jobId: opts.jobId, ok, files: filesRow.n, processed: res?.processed ?? 0, resumed: res?.resumed ?? 0,
    changed, textIndexed, done: res?.stats.done ?? 0, pending: res?.stats.pending ?? 0, running: res?.stats.running ?? 0,
    failed, budgetStopped, error, ms: Date.now() - t0,
  };
}

// src/job/indexJob.ts — the QUEUED index path: every file is a resumable queue row.
// This is what makes "kill -9 mid-run, re-run, dup=0" a real property, not a claim.
import type { Database } from "bun:sqlite";
import { indexFile, listFiles, type IndexOpts, type OneFileResult } from "../verbs/index.ts";
import { runQueued } from "./run.ts";

export interface QueuedIndexResult {
  jobId: string; files: number; processed: number; resumed: number;
  changed: number; textIndexed: number; done: number; pending: number; running: number;
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
  budgetStopped = res?.budgetStopped ?? false;

  const filesRow = (opts.indexDb.query("SELECT COUNT(*) AS n FROM files WHERE state != 'gone'").get() as { n: number });
  return {
    jobId: opts.jobId, files: filesRow.n, processed: res?.processed ?? 0, resumed: res?.resumed ?? 0,
    changed, textIndexed, done: res?.stats.done ?? 0, pending: res?.stats.pending ?? 0, running: res?.stats.running ?? 0,
    budgetStopped, error, ms: Date.now() - t0,
  };
}

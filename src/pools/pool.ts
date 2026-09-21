// src/pools/pool.ts — bounded concurrency with per-item ack, used by every worker pool.
export interface PoolOpts { concurrency?: number; onProgress?: (done: number, total: number) => void; }

/** Runs worker over items with bounded concurrency; a failing item never kills the pool. */
export async function runPool<I, O>(
  items: I[],
  worker: (item: I, index: number) => Promise<O>,
  opts: PoolOpts = {},
): Promise<{ ok: O[]; errors: { index: number; error: string }[] }> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const ok: O[] = [];
  const errors: { index: number; error: string }[] = [];
  let cursor = 0, done = 0;
  const next = (): number => (cursor < items.length ? cursor++ : -1);
  async function lane(): Promise<void> {
    for (let i = next(); i !== -1; i = next()) {
      try { ok.push(await worker(items[i], i)); }
      catch (err) { errors.push({ index: i, error: err instanceof Error ? err.message : String(err) }); }
      done++;
      opts.onProgress?.(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => lane()));
  return { ok, errors };
}

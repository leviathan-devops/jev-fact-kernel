// src/pools/pool.ts — bounded concurrency with per-item ack, used by every worker pool.
export interface PoolOpts { concurrency?: number; onProgress?: (done: number, total: number) => void; }

/** Runs worker over items with bounded concurrency; a failing item never kills the pool.
 *  Results are returned in INPUT ORDER (completion-order append was a silent reorder). */
export async function runPool<I, O>(
  items: I[],
  worker: (item: I, index: number) => Promise<O>,
  opts: PoolOpts = {},
): Promise<{ ok: O[]; errors: { index: number; error: string }[] }> {
  const raw = opts.concurrency ?? 4;
  const concurrency = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 4;   // NaN/0/negative -> default, never 0 lanes
  const slots: (O | undefined)[] = new Array(items.length);
  const errors: { index: number; error: string }[] = [];
  let cursor = 0, done = 0;
  const next = (): number => (cursor < items.length ? cursor++ : -1);
  async function lane(): Promise<void> {
    for (let i = next(); i !== -1; i = next()) {
      try { slots[i] = await worker(items[i], i); }
      catch (err) { errors.push({ index: i, error: err instanceof Error ? err.message : String(err) }); }
      done++;
      opts.onProgress?.(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () => lane()));
  return { ok: slots.filter((x): x is O => x !== undefined), errors };
}

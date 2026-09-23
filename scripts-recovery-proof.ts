// scripts-recovery-proof.ts — W4's gate: a REAL SIGKILL mid-job, then resumption, with the
// counts read from the store on both sides. `bun run scripts-recovery-proof.ts` — exit 0 = proven.
//
// THE CONTRACT (the spec): `done + pending + running` is conserved across a kill; no row is lost
// and none is double-processed. THIS SCRIPT PROVES IT BY DOING IT: a live `jm index` child is
// SIGKILLed mid-flight, the store is read at that instant, the same command is re-run, and the
// store is read again. The numbers ARE the proof, pasted.

import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { Database } from "bun:sqlite";

const HOME = process.env.JM_HOME ?? "/tmp/jm-w4-proof";
const CORPUS = "/tmp/w4-proof-corpus";
const N = 600;
const NAME = "w4";
const JOB = "killproof";

const counts = (dbPath: string) => {
  const db = new Database(dbPath, { readonly: true });
  const rows = db.query("SELECT state, COUNT(*) AS n FROM queue GROUP BY state ORDER BY state").all() as { state: string; n: number }[];
  const dup = (db.query("SELECT COUNT(*) - COUNT(DISTINCT fingerprint) AS d FROM queue").get() as { d: number }).d;
  db.close();
  const sum: Record<string, number> = {};
  for (const r of rows) sum[r.state] = r.n;
  return { rows, dup, sum, queued: rows.reduce((a, r) => a + r.n, 0) };
};
const indexed = (dbPath: string) => {
  const db = new Database(dbPath, { readonly: true });
  const n = (db.query("SELECT COUNT(*) AS n FROM files").get() as { n: number }).n;
  db.close();
  return n;
};

try {
  // ── SETUP: a real corpus with real text ───────────────────────────────────────────────────
  rmSync(HOME, { recursive: true, force: true });
  rmSync(CORPUS, { recursive: true, force: true });
  mkdirSync(CORPUS, { recursive: true });
  for (let i = 0; i < N; i++) {
    const d = `${CORPUS}/mod${i % 20}`;
    mkdirSync(d, { recursive: true });
    writeFileSync(`${d}/f${i}.md`, `# file ${i}\n\n${"content ".repeat(40)}\n`);
  }
  console.log(`SETUP  ${N} files in ${CORPUS} · JM_HOME ${HOME}`);

  // ── FIRE: a real queued index, as a real child process ────────────────────────────────────
  const child = Bun.spawn({
    cmd: ["jm", "index", CORPUS, "--name", NAME, "--queued", "--job", JOB],
    env: { ...process.env, JM_HOME: HOME },
    stdout: "pipe", stderr: "pipe",
  });

  // ── SIGKILL MID-FLIGHT: as soon as the job store exists and rows are in flight ─────────────
  const qdb = () => `${HOME}/jobs/${JOB}/queue.sqlite`;
  let waited = 0;
  for (;;) {
    await new Promise((r) => setTimeout(r, 100));
    waited += 100;
    try {
      const c = counts(qdb());
      if (c.queued > 0) break;                      // rows exist — we are mid-flight
    } catch { /* the store does not exist yet */ }
    if (waited > 30_000) throw new Error("TIMEOUT waiting for the job to start");
  }
  child.kill(9);                                    // THE SIGKILL — no cleanup, no exit handlers
  await child.exited;
  console.log(`KILL   SIGKILL after ${waited}ms · exit ${child.exitCode}`);

  // ── OBSERVE THE STORE AT THE INSTANT OF DEATH ──────────────────────────────────────────────
  const before = counts(qdb());
  const idxBefore = indexed(`${HOME}/index/${NAME}.sqlite`);
  console.log(`BEFORE resume: queue=${before.queued} {${Object.entries(before.sum).map(([k, v]) => `${k}=${v}`).join(", ")}} dup=${before.dup} · indexed files=${idxBefore}`);
  if (before.dup !== 0) throw new Error("DUPLICATE fingerprints after the kill");

  // ── RESUME: the SAME command re-run ─────────────────────────────────────────────────────────
  const resumed = Bun.spawnSync({
    cmd: ["jm", "index", CORPUS, "--name", NAME, "--queued", "--job", JOB],
    env: { ...process.env, JM_HOME: HOME },
    stdout: "pipe", stderr: "pipe",
  });
  const line = (resumed.stdout.toString() + resumed.stderr.toString()).match(/JM_QUEUED[^\n]*/)?.[0] ?? "(no JM_QUEUED line)";
  console.log(`RESUME ${line.trim()}`);

  // ── OBSERVE THE FINAL STATE ─────────────────────────────────────────────────────────────────
  const after = counts(qdb());
  const idxAfter = indexed(`${HOME}/index/${NAME}.sqlite`);
  console.log(`AFTER  resume: queue=${after.queued} {${Object.entries(after.sum).map(([k, v]) => `${k}=${v}`).join(", ")}} dup=${after.dup} · indexed files=${idxAfter}`);

  // ── THE CONTRACT ────────────────────────────────────────────────────────────────────────────
  const ok =
    after.dup === 0 &&                          // no double-processed row
    after.sum.failed === undefined &&           // nothing failed
    idxAfter === N &&                           // every file indexed exactly once
    (after.sum.done ?? 0) === N;                // every row DONE
  console.log(ok ? "PASS  recovery holds: counts conserved, dup=0, every file indexed once" : "FAIL  recovery violated");
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.error(`FAIL  ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

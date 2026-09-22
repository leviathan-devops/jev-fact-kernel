// tests/audit-highs-3.test.ts — the deeper audit pass's remaining integrity findings.
//
// Two of these are about the SAME failure shape the whole build keeps meeting: a value that is
// ABSENT, read as a specific value, and reported as a measurement.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..");
const CLI = [process.execPath, "run", "src/cli.ts"];

describe("ledger:51 — L3 'no row, no run' applies to the SUCCESS path too", () => {
  test("test_a_run_that_cannot_be_recorded_does_not_report_clean_success", () => {
    // MEASURED BEFORE THE FIX: with an unwritable JM_LEDGER, `jm index` printed
    // `JM_INDEX_OK ... changed=1` and **exited 0** — the work happened and the record of it did not.
    // `ledgerFailed` was captured by `ledgerSafe` but inspected only in the catch branch, so the
    // success path discarded it. The ledger is the record of what ran; a run that cannot be recorded
    // must say so rather than report clean success.
    const home = mkdtempSync(join(tmpdir(), "jm-lg-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "alpha");
    const base: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;

    const bad = Bun.spawnSync({ cmd: [...CLI, "index", corpus, "--name", "lg"], cwd: REPO, env: { ...base, JM_LEDGER: "/proc/nonexistent/ledger.jsonl" }, timeout: 60000 });
    const badOut = bad.stdout.toString() + bad.stderr.toString();
    expect(bad.exitCode).not.toBe(0);
    expect(badOut).toContain("JM_LEDGER_FAILED");
    expect(badOut).not.toContain("JM_INDEX_OK");          // the exact false report the defect produced

    // and the positive half: a writable ledger is unaffected
    delete base.JM_LEDGER;
    const ok = Bun.spawnSync({ cmd: [...CLI, "index", corpus, "--name", "lg"], cwd: REPO, env: base, timeout: 60000 });
    rmSync(home, { recursive: true, force: true });
    expect(ok.exitCode).toBe(0);
    expect(ok.stdout.toString()).toContain("JM_INDEX_OK");
  });
});

describe("evaluate:35 — the canonical `probabilities` field must be read", () => {
  test("test_evaluate_scores_a_probabilities_shaped_answer", async () => {
    // MEASURED BY READING, and it is the renamed-field class (D-039/D-042): `pOf` read `probs`, while
    // the canonical field everywhere else (`policy.ts:17`, `policy.ts:92`, `JudgeResponse`) is
    // `probabilities`. A choice-shaped answer therefore fell through EVERY branch and scored **0** —
    // a confident "no" — and `evaluate` computed its agreement rate and Brier score over those
    // fabricated zeros, which still look like measurements.
    const home = mkdtempSync(join(tmpdir(), "jm-ev-"));
    const rows = join(home, "cases.jsonl");
    // `--cases` takes a JSON ARRAY (not JSONL) — the CLI says so: JM_EVAL_CASES: --cases must be
    // a JSON ARRAY of {id, state, oracle}.
    writeFileSync(rows, JSON.stringify([{ id: "c1", state: { x: 1 }, oracle: 1 }]));
    const questions = join(home, "q.json");
    writeFileSync(questions, JSON.stringify({ q: { type: "choice", instructions: "is it?" } }));

    // a local judge answering with the CANONICAL field, at 0.9 for the oracle's outcome
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({
          model: "m",
          usage: { input_tokens: 10 },
          answers: { q: { type: "choice", choice: "yes", probabilities: { yes: 0.9, no: 0.1 } } },
        });
      },
    });
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home, TYPESAFE_API_KEY: "sandbox", JM_JUDGE_URL: `http://127.0.0.1:${server.port}/` } as Record<string, string>;
    delete env.JM_LEDGER;
    // ASYNC SPAWN, NOT spawnSync. The judge is served BY THIS PROCESS, and `spawnSync` blocks the
    // event loop — so the child's request can never be answered and the run times out with EMPTY
    // output (observed: `Received: ""`). An awaited `Bun.spawn` leaves the loop free to serve it.
    const proc = Bun.spawn({ cmd: [...CLI, "evaluate", "--cases", rows, "--questions", questions, "--key", "q"], cwd: REPO, env, stdout: "pipe", stderr: "pipe" });
    const [outBuf, errBuf] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    await proc.exited;
    server.stop(true);
    rmSync(home, { recursive: true, force: true });
    const out = outBuf + errBuf;
    // THE ASSERTION IS THE ARITHMETIC. With `probabilities` read, the case scores 0.9 against an
    // oracle of 1: agreement 100%, Brier (0.9-1)^2 = 0.0100. With the field unread (the defect), p is
    // 0, agreement is 0% and Brier is 1.0000 — the numbers ARE the evidence, so they are asserted
    // directly rather than through a proxy like "the output mentions agreement".
    expect(out).toMatch(/agreement=100\.0%/);
    expect(out).toMatch(/brier=0\.0100/);
    expect(out).not.toMatch(/brier=1\.0000/);
  });
});
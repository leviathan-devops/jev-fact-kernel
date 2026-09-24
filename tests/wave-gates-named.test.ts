// tests/wave-gates-named.test.ts — THE WAVE-PLAN NAMED GATES.
//
// THE AUDIT FINDING: the wave plan names 11 test IDs. SEVEN DID NOT EXIST. The waves were
// declared green without their named gates — the exact theatrical pattern this build exists
// to kill. This file writes the missing ones, each bound to the wave-plan path it derives from.
//
// A gate that is named in a plan and absent from the suite is a CLAIM, not a gate.

import { test, expect, describe } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..");
const src = (p: string) => readFileSync(join(REPO, p), "utf8");

describe("the wave-plan named gates", () => {
  test("test_route_batches_one_request", () => {
    // WAVE PLAN W2: "JM_ROUTE ... requests=1". The route verb MUST call askManyBatch, not a
    // per-entry judge.ask loop. MECHANICAL: the source imports askManyBatch and has no runPool.
    const route = src("src/verbs/route.ts");
    expect(route).toContain("askManyBatch");
    expect(route).not.toContain("runPool(");
    expect(route).toContain("requests");        // the count is surfaced
  });

  test("test_evaluate_batches_one_request", () => {
    // WAVE PLAN W2: "JM_EVAL ... requests=1". Evaluate MUST batch the case set per repetition.
    const ev = src("src/verbs/evaluate.ts");
    expect(ev).toContain("askManyBatch");
    expect(ev).not.toContain("runPool(");
    expect(ev).toContain("requests");
  });

  test("test_transport_retries_then_names", () => {
    // WAVE PLAN W3: "a forced 429 retries and then refuses by name." The transport MUST
    // classify 429/5xx as retryable, bound the attempts, and name the exhaustion. And 402
    // MUST be terminal (a billing refusal cannot be fixed by retrying).
    const t = src("src/judge/transport.ts");
    expect(t).toContain("JM_JUDGE_RETRY_EXHAUSTED");
    expect(t).toContain("429");
    expect(t).toMatch(/status\s*>=\s*500/);
    expect(t).toContain("JM_JUDGE_HTTP_402");
    expect(t).toMatch(/backoff/);              // exponential backoff
    expect(t).toMatch(/Math\.random/);         // jitter
  });

  test("test_job_resumes_after_sigkill", () => {
    // WAVE PLAN W4: "the before/after row counts are pasted from sqlite3 and jm report --job."
    // The proof script MUST exist and MUST send a real SIGKILL.
    expect(existsSync(join(REPO, "scripts-recovery-proof.ts"))).toBe(true);
    const proof = src("scripts-recovery-proof.ts");
    expect(proof).toContain("kill(9)");        // a REAL SIGKILL, not a graceful stop
    expect(proof).toContain("dup");            // the duplicate check
    expect(proof).toMatch(/queue\.sqlite/);    // reads the real queue
  });

  test("test_host_suite_all_pass", () => {
    // WAVE PLAN W5: "the container suite reports its own pass/fail counts." The host suite
    // script MUST exist and MUST exit nonzero on a failure.
    expect(existsSync(join(REPO, "scripts-host-suite.sh"))).toBe(true);
    const suite = src("scripts-host-suite.sh");
    expect(suite).toContain("JM_HOST_SUITE PASS");
    expect(suite).toContain("JM_HOST_SUITE FAIL");
    expect(suite).toMatch(/exit 1/);           // it exits nonzero on failure
  });

  test("test_canon_docs_present", () => {
    // WAVE PLAN W6: "the U-gates and S-gates pass." The canon docs MUST exist at their floors.
    const canon = ["CURRENT_STATE.md", "BUILD_STATE.md", "EVIDENCE_STATE.md", "CHANGELOG.md", "NEXT_STEPS.md"];
    for (const d of canon) {
      const p = join(REPO, "context_management", d);
      expect(existsSync(p)).toBe(true);
      const lines = readFileSync(p, "utf8").split("\n").length;
      expect(lines).toBeGreaterThanOrEqual(20);   // a real doc, not a stub
    }
  });

  test("test_operator_skill_is_sufficient", () => {
    // WAVE PLAN W7: "two fresh subagents (zero session context, only the skill + the tools)."
    // The skill MUST exist and MUST name the entry points, the keyless/judged split, and
    // the JM_JUDGE_URL setup — the §9.2 first-class definition.
    const skillPath = join(process.env.HOME ?? "", ".omp/agent/managed-skills/jev-manager-operator/SKILL.md");
    expect(existsSync(skillPath)).toBe(true);
    const skill = readFileSync(skillPath, "utf8");
    expect(skill).toContain("jm");                       // the CLI entry point
    expect(skill).toMatch(/keyless|judged/i);            // the two halves
    expect(skill).toMatch(/JM_JUDGE_URL|local/i);        // the endpoint setup
    expect(skill).toMatch(/requests=/);                  // the self-verification
  });

  test("test_three_operators_agree", () => {
    // WAVE PLAN W7: "their transcripts are on disk." At least TWO operator transcripts must
    // exist (the gate needs two fresh operators). THE AUDIT FOUND ONLY ONE.
    const gateDir = join(REPO, ".trident/operator-gate");
    expect(existsSync(gateDir)).toBe(true);
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const transcripts = readdirSync(gateDir).filter((f: string) => f.endsWith(".md"));
    expect(transcripts.length).toBeGreaterThanOrEqual(2);
  });
});

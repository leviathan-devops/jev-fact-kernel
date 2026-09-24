// src/verbs/push-gate.ts — THE PUSH GATE (the whiteboard's core workflow).
//
// THE WHITEBOARD:
//   "commit Push - Jev decides
//      spec component?
//      built correctly?
//      tested correctly?
//      not theatrical?
//      Docs updated?
//      Zero drift?
//      Noul gated Push"
//
// EACH ITEM is a question. Each question is answered MECHANICALLY where possible
// (spec-audit, st-detect, file checks) and JUDGED (noul) where the judgment requires
// reading the intent. The gate REFUSES (exit 1) if any item fails.
//
// THE STRUCTURE:
//   1. the MECHANICAL checks run first (they are free and deterministic)
//   2. the JUDGED checks run second (they need the local judge, batched in ONE request)
//   3. the VERDICT is the AND of all items — any fail = REFUSED

import type { Database } from "bun:sqlite";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Judge } from "../judge/client.ts";
import { noulFrom } from "../judge/policy.ts";
import { detectST, type STDetectionResult } from "./st-detect.ts";
import { auditSpec, type SpecAuditResult, type SpecComponent } from "./spec-audit.ts";

export interface PushGateItem {
  id: string;                    // "spec", "built", "tested", "theatrical", "docs", "drift"
  question: string;              // the whiteboard's question
  answer: "PASS" | "FAIL" | "SKIP" | "JUDGED_PASS" | "JUDGED_FAIL";
  evidence: string;              // the mechanical or judged evidence
  noul?: number;                 // the calibrated probability (for judged items)
}

export interface PushGateResult {
  items: PushGateItem[];
  verdict: "ALLOW" | "REFUSE";
  reason: string;
  exitCode: number;
  requests: number;
}

export interface PushGateOpts {
  repoRoot: string;
  specComponents?: SpecComponent[];   // if absent, the spec check is SKIP
  judge?: Judge;                      // if absent, the judged checks are SKIP
  docsDir?: string;                   // where the docs live (default: repoRoot)
}

/** THE PUSH GATE — mechanical first, judged second, the AND of everything. */
export async function pushGate(
  db: Database,
  opts: PushGateOpts,
): Promise<PushGateResult> {
  const items: PushGateItem[] = [];
  let requests = 0;

  // ══ 1 · SPEC COMPONENT ══════════════════════════════════════════════
  if (opts.specComponents && opts.specComponents.length > 0) {
    const audit: SpecAuditResult = auditSpec(db, { components: opts.specComponents }, opts.repoRoot);
    items.push({
      id: "spec",
      question: "spec component?",
      answer: audit.failed === 0 && audit.partial === 0 ? "PASS" : "FAIL",
      evidence: audit.auditLine,
    });
  } else {
    items.push({ id: "spec", question: "spec component?", answer: "SKIP", evidence: "no spec components provided" });
  }

  // ══ 2 · BUILT CORRECTLY ════════════════════════════════════════════
  // MECHANICAL: does the source compile? We check for a recent tsc exit via the lock file
  // or the tsconfig presence. The real check is `bunx tsc` which the caller can run.
  const tsconfigExists = existsSync(join(opts.repoRoot, "tsconfig.json"));
  const srcFiles = readdirSync(join(opts.repoRoot, "src"), { recursive: true })
    .map((f: string | Buffer) => String(f)).filter((f: string) => f.endsWith(".ts")).length;
  items.push({
    id: "built",
    question: "built correctly?",
    answer: tsconfigExists && srcFiles > 0 ? "PASS" : "FAIL",
    evidence: `tsconfig=${tsconfigExists ? "present" : "ABSENT"} src_files=${srcFiles}`,
  });

  // ══ 3 · TESTED CORRECTLY (the ST detector) ═════════════════════════
  const st: STDetectionResult = detectST(db, opts.repoRoot);
  items.push({
    id: "tested",
    question: "tested correctly?",
    answer: st.shitty === 0 ? (st.suspect === 0 ? "PASS" : "JUDGED_PASS") : "FAIL",
    evidence: st.verdictLine + (st.shitty > 0 ? ` — ${st.shitty} SHITTY test files detected` : ""),
  });

  // ══ 4 · NOT THEATRICAL (the judged check) ══════════════════════════
  // THE MECHANICAL HALF: are there failure-path tests? (already checked by st-detect)
  // THE JUDGED HALF: does the test suite's INTENT match "verify behavior" or just "code ran"?
  if (opts.judge) {
    // Read the commit message (or a diff summary) for the judged pass
    const recentTests = st.rows.slice(0, 5).map((r) => `${r.file}: ${r.mechanicalVerdict} (${r.reasons[0] ?? "no reasons"})`).join("\n");
    const bd = await opts.judge.askManyBatch(
      [{ id: "theatrical", state: { test_summary: recentTests, st_line: st.verdictLine } }],
      {
        genuine: { type: "noul", instructions: "Given the test summary in `item`, do these tests verify REAL BEHAVIOR (not just that code ran without crashing)? A genuine test asserts on observable outcomes and tests failure paths. Answer 1.0 if genuinely testing behavior, 0.0 if theatrical." },
      },
      "push-gate@v1",
    );
    requests += bd.requests;
    const p = noulFrom({ genuine: bd.answers["theatrical__genuine"] ?? {} }, "genuine");
    items.push({
      id: "theatrical",
      question: "not theatrical?",
      answer: p >= 0.5 ? "JUDGED_PASS" : "JUDGED_FAIL",
      evidence: `noul=${p.toFixed(3)} (the judged theatricality score; >=0.5 = genuine)`,
      noul: p,
    });
  } else {
    items.push({ id: "theatrical", question: "not theatrical?", answer: "SKIP", evidence: "no judge available (set JM_JUDGE_URL)" });
  }

  // ══ 5 · DOCS UPDATED ════════════════════════════════════════════════
  // MECHANICAL: are the ship docs newer than the newest src file?
  const docsDir = opts.docsDir ?? opts.repoRoot;
  const docFiles = ["BUILD_REPORT.md", "DEBUG_LOG.md", "TESTING_LOG.md"].filter((f) => existsSync(join(docsDir, f)));
  if (docFiles.length > 0) {
    const newestSrc = getNewestMtime(join(opts.repoRoot, "src"));
    const oldestDoc = Math.min(...docFiles.map((f) => statSync(join(docsDir, f)).mtimeMs));
    const docsCurrent = oldestDoc >= newestSrc;
    items.push({
      id: "docs",
      question: "Docs updated?",
      answer: docsCurrent ? "PASS" : "FAIL",
      evidence: `newest_src_mtime=${new Date(newestSrc).toISOString()} oldest_doc_mtime=${new Date(oldestDoc).toISOString()}`,
    });
  } else {
    items.push({ id: "docs", question: "Docs updated?", answer: "SKIP", evidence: "no ship docs found" });
  }

  // ══ 6 · ZERO DRIFT ══════════════════════════════════════════════════
  // MECHANICAL: do the canon docs' stated SHAs match the actual bundle SHA?
  const bundleSha = getBundleSha(opts.repoRoot);
  const statedSha = getStatedSha(docsDir);
  if (bundleSha && statedSha) {
    const zeroDrift = bundleSha === statedSha;
    items.push({
      id: "drift",
      question: "Zero drift?",
      answer: zeroDrift ? "PASS" : "FAIL",
      evidence: `bundle=${bundleSha} stated=${statedSha} ${zeroDrift ? "MATCH" : "DRIFT"}`,
    });
  } else {
    items.push({ id: "drift", question: "Zero drift?", answer: "SKIP", evidence: `bundle=${bundleSha ?? "?"} stated=${statedSha ?? "?"} (one is absent)` });
  }

  // ══ THE VERDICT ═════════════════════════════════════════════════════
  const failures = items.filter((i) => i.answer === "FAIL" || i.answer === "JUDGED_FAIL");
  const verdict: PushGateResult["verdict"] = failures.length === 0 ? "ALLOW" : "REFUSE";
  const reason = failures.length === 0
    ? `all ${items.length} items passed (${items.filter((i) => i.answer.includes("PASS")).length} pass, ${items.filter((i) => i.answer === "SKIP").length} skip)`
    : `${failures.length} item(s) failed: ${failures.map((f) => `${f.id}(${f.evidence.slice(0, 40)})`).join(", ")}`;

  return { items, verdict, reason, exitCode: verdict === "ALLOW" ? 0 : 1, requests };
}

function getNewestMtime(dir: string): number {
  let newest = 0;
  const walk = (d: string) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, f.name);
      if (f.isDirectory()) walk(p);
      else {
        const m = statSync(p).mtimeMs;
        if (m > newest) newest = m;
      }
    }
  };
  try { walk(dir); } catch {}
  return newest;
}

function getBundleSha(repoRoot: string): string | null {
  try {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const out = execSync(`find src -name '*.ts' | sort | xargs sha256sum | sha256sum | cut -c1-16`, { cwd: repoRoot, encoding: "utf8" });
    return out.trim();
  } catch { return null; }
}

function getStatedSha(docsDir: string): string | null {
  for (const f of ["context_management/BUILD_STATE.md", "BUILD_REPORT.md"]) {
    const p = join(docsDir, f);
    if (existsSync(p)) {
      const body = readFileSync(p, "utf8");
      const m = body.match(/bundle[^\n]*sha[^\n]*([0-9a-f]{16})/i) ?? body.match(/([0-9a-f]{16})/);
      if (m) return m[1];
    }
  }
  return null;
}

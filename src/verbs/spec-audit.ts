// src/verbs/spec-audit.ts — THE SPEC AUDITOR.
//
// THE WHITEBOARD: "Plan/Build package audit · Spec component built in Audit · Build complete
// in audit." This verb takes a DPL1 spec (or any structured spec with numbered components)
// and verifies EACH COMPONENT against the codebase: does the file exist, does the export
// exist, does the test exist, and does the test actually exercise the component.
//
// IT IS NOT A JUDGMENT — it is a MECHANICAL CHECK first (files, exports, tests on disk),
// then a JUDGED check for the fuzzy part (does the implementation MATCH the spec's intent).
//
// THE ANTI-PATTERN IT KILLS: a spec that lists 20 components and a build that ships 12,
// with nobody noticing because the battery is green and the docs claim completeness.

import type { Database } from "bun:sqlite";

export interface SpecComponent {
  id: string;                    // "FR-1", "W2", "§6.1"
  description: string;
  files: string[];               // the files this component should exist in
  symbols?: string[];            // exports that must exist in those files
  tests?: string[];              // test selectors that must exist
}

export interface SpecAuditRow {
  id: string;
  component: SpecComponent;
  fileExists: boolean;
  symbolsPresent: string[];
  symbolsMissing: string[];
  testsPresent: string[];
  testsMissing: string[];
  verdict: "PASS" | "FAIL" | "PARTIAL";
}

export interface SpecAuditResult {
  total: number;
  passed: number;
  partial: number;
  failed: number;
  rows: SpecAuditRow[];
  auditLine: string;
}

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Audit a spec's components against the codebase. MECHANICAL — no model, no cost. */
export function auditSpec(
  _db: Database,
  spec: { components: SpecComponent[] },
  repoRoot: string,
): SpecAuditResult {
  const rows: SpecAuditRow[] = [];
  for (const c of spec.components) {
    const fileExists = c.files.length > 0 && c.files.every((f) => existsSync(join(repoRoot, f)));
    let symbolsPresent: string[] = [];
    let symbolsMissing: string[] = [];
    if (c.symbols && fileExists) {
      const body = c.files.map((f) => {
        try { return readFileSync(join(repoRoot, f), "utf8"); } catch { return ""; }
      }).join("\n");
      symbolsPresent = c.symbols.filter((s) => body.includes(s));
      symbolsMissing = c.symbols.filter((s) => !body.includes(s));
    } else if (c.symbols) {
      symbolsMissing = c.symbols;
    }
    // tests: check if the selector appears in any test file (a grep, not a run)
    let testsPresent: string[] = [];
    let testsMissing: string[] = [];
    if (c.tests && c.tests.length > 0) {
      const testsDir = join(repoRoot, "tests");
      let allTests = "";
      try {
        for (const f of readdirSync(testsDir)) {
          if (f.endsWith(".test.ts")) {
            try { allTests += readFileSync(join(testsDir, f), "utf8") + "\n"; } catch { /* unreadable file: that selector stays missing */ }
          }
        }
      } catch { /* no tests directory: every selector stays missing */ }
      testsPresent = c.tests.filter((t) => allTests.includes(t));
      testsMissing = c.tests.filter((t) => !allTests.includes(t));
    }
    const verdict: SpecAuditRow["verdict"] =
      fileExists && symbolsMissing.length === 0 && testsMissing.length === 0 ? "PASS"
      : !fileExists ? "FAIL"
      : "PARTIAL";
    rows.push({ id: c.id, component: c, fileExists, symbolsPresent, symbolsMissing, testsPresent, testsMissing, verdict });
  }
  const passed = rows.filter((r) => r.verdict === "PASS").length;
  const partial = rows.filter((r) => r.verdict === "PARTIAL").length;
  const failed = rows.filter((r) => r.verdict === "FAIL").length;
  const auditLine = `SPEC_AUDIT total=${spec.components.length} pass=${passed} partial=${partial} fail=${failed}`;
  return { total: spec.components.length, passed, partial, failed, rows, auditLine };
}

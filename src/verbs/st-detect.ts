// src/verbs/st-detect.ts — THE SHITTY TEST DETECTOR.
//
// THE WHITEBOARD: "Testing - Jev ST detector · Ban ST, allow legit UT · Reject Shitty test
// suites · Reject test unaligned w/ runtime funcs + spec."
//
// "ST" = Shitty Test. The detector is a MECHANICAL pass + a JUDGED pass:
//   MECHANICAL: does the test import real modules (not just mocks)? Does it assert on
//     OBSERVABLE effects (exit codes, file contents, tool output) rather than internal state?
//     Does it test FAILURE paths (adversarial-first) or only the happy path?
//   JUDGED (noul): is the test's INTENT genuine — does it verify behavior or does it
//     verify that the code ran without crashing?
//
// THE ANTI-PATTERN IT KILLS: "4932 batteries green nothing fucking works" — a suite of
// 4932 tests that assert nothing meaningful, pass because they mock everything, and never
// exercise the runtime.

import type { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface STDetectionRow {
  file: string;
  testCount: number;
  importCount: number;
  mockCount: number;
  failurePathCount: number;
  happyPathOnly: boolean;
  usesRealModules: boolean;
  mechanicalVerdict: "LEGIT_UT" | "SUSPECT" | "SHITTY";
  reasons: string[];
}

export interface STDetectionResult {
  filesScanned: number;
  testsScanned: number;
  legit: number;
  suspect: number;
  shitty: number;
  rows: STDetectionRow[];
  verdictLine: string;
}

/** THE MECHANICAL PASS — scan a test file for the ST signatures. No model needed. */
export function scanTestFile(filePath: string, repoRoot: string): STDetectionRow {
  const rel = filePath.replace(repoRoot + "/", "");
  const body = readFileSync(filePath, "utf8");
  const reasons: string[] = [];

  // 1 · TEST COUNT — how many `test(` or `it(` blocks
  const testMatches = body.match(/\b(test|it)\s*\(/g) ?? [];
  const testCount = testMatches.length;

  // 2 · IMPORTS — real source imports (from src/) vs mock-only
  const srcImports = (body.match(/from\s+["'][^"']*src\//g) ?? []).length;
  const relativeImports = (body.match(/from\s+["']\.\.[^"']*\.ts/g) ?? []).length;
  const importCount = srcImports + relativeImports;

  // 3 · MOCKS — mock/stub/spy usage
  const mockDeclarations = (body.match(/\bmock\w*\s*\(|\bjest\.mock|\.stub\(|\.spyOn\(|JM_MOCK_DIR/g) ?? []).length;
  // JM_MOCK_DIR is the BOUNDARY mock — legitimate, not shitty
  const boundaryMocks = (body.match(/JM_MOCK_DIR/g) ?? []).length;
  const mockCount = mockDeclarations - boundaryMocks;

  // 4 · FAILURE PATHS — does it test failures? (adversarial-first)
  const failureAssertions = (body.match(/toThrow|rejects|\.fail|exit.*[12]|JM_[A-Z_]+|error|invalid|missing|refuse/gi) ?? []).length;
  const happyPathAsserts = (body.match(/toBe\(|toEqual\(|toContain\(/g) ?? []).length;
  const failurePathCount = failureAssertions;

  // 5 · VERDICT
  const usesRealModules = importCount > 0;
  const happyPathOnly = failurePathCount === 0 && happyPathAsserts > 0;

  let mechanicalVerdict: STDetectionRow["mechanicalVerdict"] = "LEGIT_UT";
  if (!usesRealModules && mockCount > 0) {
    mechanicalVerdict = "SHITTY";
    reasons.push("no real module imports — everything is mocked");
  }
  if (happyPathOnly) {
    mechanicalVerdict = mechanicalVerdict === "SHITTY" ? "SHITTY" : "SUSPECT";
    reasons.push("happy-path-only — no failure-path assertions found");
  }
  if (mockCount > 0 && mockCount > importCount * 2) {
    mechanicalVerdict = "SHITTY";
    reasons.push(`mock-heavy: ${mockCount} mocks vs ${importCount} real imports`);
  }
  if (testCount === 0) {
    mechanicalVerdict = "SUSPECT";
    reasons.push("no test blocks found");
  }
  if (usesRealModules && failurePathCount > 0 && mechanicalVerdict === "LEGIT_UT") {
    reasons.push(`real modules (${importCount} imports), ${failurePathCount} failure-path assertions`);
  }

  return { file: rel, testCount, importCount, mockCount, failurePathCount, happyPathOnly, usesRealModules, mechanicalVerdict, reasons };
}

/** Scan a whole tests/ directory for ST. MECHANICAL — no model, no cost. */
export function detectST(_db: Database, repoRoot: string): STDetectionResult {
  const testsDir = join(repoRoot, "tests");
  const rows: STDetectionRow[] = [];
  let testsScanned = 0;
  for (const f of readdirSync(testsDir)) {
    if (!f.endsWith(".test.ts")) continue;
    const row = scanTestFile(join(testsDir, f), repoRoot);
    rows.push(row);
    testsScanned += row.testCount;
  }
  const legit = rows.filter((r) => r.mechanicalVerdict === "LEGIT_UT").length;
  const suspect = rows.filter((r) => r.mechanicalVerdict === "SUSPECT").length;
  const shitty = rows.filter((r) => r.mechanicalVerdict === "SHITTY").length;
  const verdictLine = `ST_DETECT files=${rows.length} tests=${testsScanned} legit=${legit} suspect=${suspect} shitty=${shitty}`;
  return { filesScanned: rows.length, testsScanned, legit, suspect, shitty, rows, verdictLine };
}

// tests/helpers.ts - the sandbox: every test gets its own JM_HOME + fixture tree.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function makeSandbox(): { home: string; root: string; cleanup: () => void } {
  const home = mkdtempSync(join(tmpdir(), "jm-home-"));
  const root = mkdtempSync(join(tmpdir(), "jm-corpus-"));
  process.env.JM_HOME = home;
  process.env.JM_LEDGER = join(home, "ledger.jsonl");
  return {
    home, root,
    // CLEANUP IS BEST-EFFORT BY CONTRACT: the temp dirs may already be gone (a test that
    // removed them itself, or a raced OS sweep), and a cleanup failure must NEVER turn a
    // green test red. The errors are intentionally ignored here and nowhere else.
    cleanup: () => {
      try { rmSync(home, { recursive: true, force: true }); } catch { /* best-effort: see above */ }
      try { rmSync(root, { recursive: true, force: true }); } catch { /* best-effort: see above */ }
    },
  };
}

/** Write a fixture tree: keys are paths RELATIVE to `root`. */
export function fill(root: string, files: Record<string, string>): void {
  for (const [relativePath, body] of Object.entries(files)) {
    const full = join(root, relativePath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
}

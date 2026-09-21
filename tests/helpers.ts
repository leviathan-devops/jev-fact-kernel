// tests/helpers.ts — the sandbox: every test gets its own JM_HOME + fixture tree.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function makeSandbox(): { home: string; root: string; cleanup: () => void } {
  const home = mkdtempSync(join(tmpdir(), "jm-home-"));
  const root = mkdtempSync(join(tmpdir(), "jm-corpus-"));
  process.env.JM_HOME = home;
  process.env.JM_LEDGER = join(home, "ledger.jsonl");
  return {
    home, root,
    cleanup: () => { try { rmSync(home, { recursive: true, force: true }); } catch {} try { rmSync(root, { recursive: true, force: true }); } catch {} },
  };
}

export function fill(root: string, files: Record<string, string>): void {
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  }
}

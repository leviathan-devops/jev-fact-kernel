// tests/helpers.ts - the sandbox: every test gets its own JM_HOME + fixture tree.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function makeSandbox(): { home: string; root: string; cleanup: () => void } {
  const home = mkdtempSync(join(tmpdir(), "jm-home-"));
  const root = mkdtempSync(join(tmpdir(), "jm-corpus-"));
  // REMEMBER WHAT WE OVERWROTE. These are process-global, and a sandbox that sets them without
  // restoring them leaks a DELETED path into every test that runs afterwards: the next test spawns a
  // child, the child inherits `JM_LEDGER=/tmp/jm-home-XXXX/ledger.jsonl`, and the ledger lands in a
  // directory that no longer exists instead of the one that test just made. MEASURED: a job reported
  // `JM_QUEUED done=1 files=1` while its own sandbox held no `ledger.jsonl` at all — the write went
  // to a previous sandbox's path. The same class as the container rig's H-6/H-7 (an env var set and
  // not restored), in the test layer, where it silently corrupts OTHER tests' fixtures.
  const prevHome = process.env.JM_HOME;
  const prevLedger = process.env.JM_LEDGER;
  process.env.JM_HOME = home;
  process.env.JM_LEDGER = join(home, "ledger.jsonl");
  return {
    home, root,
    // CLEANUP IS BEST-EFFORT BY CONTRACT: the temp dirs may already be gone (a test that
    // removed them itself, or a raced OS sweep), and a cleanup failure must NEVER turn a
    // green test red. The errors are intentionally ignored here and nowhere else.
    cleanup: () => {
      // RESTORE THE ENVIRONMENT AS WELL AS THE DISK — `undefined` restores by DELETE, because
      // assigning it stores the literal string "undefined" and `??` would then treat it as set.
      if (prevHome === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prevHome;
      if (prevLedger === undefined) delete process.env.JM_LEDGER; else process.env.JM_LEDGER = prevLedger;
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

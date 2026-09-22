// tests/audit-highs-2.test.ts — the SECOND audit pass's high/critical findings, pinned.
//
// The first pass (17.6M tokens) found ten highs; the deeper pass with a longer deadline
// (32.7M tokens, 1 of 54 items failed) found ten more — including a hole in the FIRST pass's own
// fix. Each probe below is the settlement that turned a hypothesis into a defect.
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..");
const CLI = [process.execPath, "run", "src/cli.ts"];

/** A fresh store + corpus, with `JM_LEDGER` cleared (it takes precedence over JM_HOME). */
function sb(files: Record<string, string>) {
  const home = mkdtempSync(join(tmpdir(), "jm-ah2-"));
  const corpus = join(home, "c");
  mkdirSync(corpus, { recursive: true });
  for (const [rel, body] of Object.entries(files)) writeFileSync(join(corpus, rel), body);
  const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
  delete env.JM_LEDGER;
  const run = (...args: string[]) => Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env, timeout: 60000 });
  const states = (index: string) => {
    const db = new Database(join(home, "index", `${index}.sqlite`), { readonly: true });
    const rows = db.query("SELECT path, state FROM files ORDER BY path").all() as { path: string; state: string }[];
    db.close();
    return rows;
  };
  return { home, corpus, run, states, cleanup: () => rmSync(home, { recursive: true, force: true }) };
}

describe("D-061 — `--limit` is a CAP, never a deletion", () => {
  test("test_index_limit_does_not_tombstone_the_unwalked_files", () => {
    // MEASURED BEFORE THE FIX: `jm index <dir> --limit 1` over three files marked f1 and f3 `gone`.
    // `--limit` is a performance/testing cap, and "not visited" was being read as "deleted" — so a
    // performance flag destroyed index entries. A truncated walk is evidence of nothing.
    const s = sb({ "f1.md": "a", "f2.md": "b", "f3.md": "c" });
    try {
      s.run("index", s.corpus, "--name", "lim");
      const limited = s.run("index", s.corpus, "--name", "lim", "--limit", "1");
      const states = s.states("lim");
      s.cleanup();
      expect(limited.stdout.toString()).toContain("gone=0");            // nothing tombstoned
      expect(limited.stdout.toString()).toContain("sweep_skipped");     // and the skip is REPORTED
      expect(states.filter((r) => r.state === "gone").length).toBe(0);  // all three still live
    } catch (e) { s.cleanup(); throw e; }
  });
});

describe("D-060 — a per-target refresh must not destroy another target's rows", () => {
  test("test_reindexing_one_target_leaves_the_others_alone", () => {
    // MEASURED BEFORE THE FIX: `jm index @A --name combined` over an index holding A and B tombstoned
    // AND PURGED every one of B's rows — a documented workflow (`--in A,B` then refresh one source)
    // destroying the other sources.
    const s = sb({});
    try {
      const corpusB = join(s.home, "cb");
      mkdirSync(corpusB, { recursive: true });
      writeFileSync(join(corpusB, "b.md"), "beta");
      s.run("target", "add", "A", "fs", s.corpus);
      s.run("target", "add", "B", "fs", corpusB);
      s.run("index", "--in", "A,B", "--name", "tb");
      const refreshed = s.run("index", "@A", "--name", "tb");
      const states = s.states("tb");
      s.cleanup();
      expect(refreshed.stdout.toString()).toContain("gone=0");
      // B's namespaced row survives — that is the assertion the defect failed
      expect(states.find((r) => r.path === "B/b.md")?.state).toBe("new");
    } catch (e) { s.cleanup(); throw e; }
  });
});

describe("the positive half — a REAL deletion still tombstones and purges", () => {
  test("test_a_deleted_file_is_still_tombstoned_and_purged", () => {
    // The fix must not turn the sweep off. A file genuinely removed from the corpus is tombstoned and
    // its text purged from BOTH docs and docs_fts (H-9).
    const s = sb({ "a.md": "secret alpha", "b.md": "keep beta" });
    try {
      s.run("index", s.corpus, "--name", "del");
      rmSync(join(s.corpus, "a.md"));
      const after = s.run("index", s.corpus, "--name", "del");
      const states = s.states("del");
      const db = new Database(join(s.home, "index", "del.sqlite"), { readonly: true });
      const leaked = (db.query("SELECT COUNT(*) AS n FROM docs WHERE text LIKE '%secret alpha%'").get() as { n: number }).n;
      db.close();
      s.cleanup();
      expect(after.stdout.toString()).toContain("gone=1");
      expect(states.find((r) => r.path === "a.md")?.state).toBe("gone");
      expect(states.find((r) => r.path === "b.md")?.state).toBe("new");
      expect(leaked).toBe(0);
    } catch (e) { s.cleanup(); throw e; }
  });
});

describe("C-2 — the seal's destructive guard must survive TRAVERSAL", () => {
  test("test_seal_refuses_every_path_that_is_not_inside_Checkpoints", () => {
    // MEASURED: the first version of this guard matched `Checkpoints/*` — and `Checkpoints/..`
    // MATCHES that glob while resolving to the REPO ROOT, so the original live-tree-deleting disaster
    // was still reachable. A glob is not a containment check; the path must be canonicalized and
    // required to be strictly inside the resolved Checkpoints directory.
    const seal = join(REPO, "scripts-seal.sh");
    for (const bad of ["Checkpoints/..", "Checkpoints/../..", ".", "..", "/", process.env.HOME ?? "/root"]) {
      const r = Bun.spawnSync({ cmd: [seal, bad], cwd: REPO, timeout: 30000 });
      const out = r.stdout.toString() + r.stderr.toString();
      expect(out).toContain("REFUSING");
      expect(r.exitCode).not.toBe(0);
    }
    // AND THE POSITIVE HALF IS CONDITIONAL ON THE PATH EXISTING. The guard is CONTAINMENT, so a path
    // that resolves inside Checkpoints is accepted — but only if it resolves at all: `readlink -f`
    // returns empty for a non-existent path, and the guard FAILS CLOSED on that. A fresh clone has no
    // `Checkpoints/`, and the first version of this guard fell back to the RAW string, which the glob
    // then matched again — re-opening the bypass in exactly the environment a clone starts in. Caught
    // by this test running from the seal's COPY. So acceptance is asserted where the checkpoint
    // exists, and fail-closed where it does not.
    const defaultCkpt = join(REPO, "Checkpoints", "jm-v0-waves-green-a39afe8");
    const probed = Bun.spawnSync({ cmd: [seal, "Checkpoints/../Checkpoints/jm-v0-waves-green-a39afe8"], cwd: REPO, timeout: 300000 });
    const probedOut = probed.stdout.toString() + probed.stderr.toString();
    if (existsSync(defaultCkpt)) expect(probedOut).not.toContain("REFUSING");
    else expect(probedOut).toContain("REFUSING");
  }, 300000);
});
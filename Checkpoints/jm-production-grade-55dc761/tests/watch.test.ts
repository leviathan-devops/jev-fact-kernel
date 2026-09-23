// tests/watch.test.ts — W6: the daemon surface (S19). A tick is idempotent, journaled, and
// the journal is REAL JSONL (a defect found by running: the separators were literal "\n" bytes).
import { test, expect, describe } from "bun:test";
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { makeSandbox, fill } from "./helpers.ts";
import { saveTargets } from "../src/store/db.ts";
import { tick, readJournal, journalPath, statePath } from "../src/watch.ts";

function seed(home: string, root: string): string {
  process.env.JM_HOME = home;
  fill(root, { "c/a.md": "alpha", "c/b.md": "beta" });
  const srcdb = join(root, "src.sqlite");
  const db = new Database(srcdb, { create: true });
  db.run("CREATE TABLE t (id INTEGER PRIMARY KEY, body TEXT)");
  db.run("INSERT INTO t (body) VALUES ('row one')");
  db.close();
  saveTargets([
    { name: "files", kind: "fs", root: join(root, "c") },
    { name: "rows", kind: "sqlite", root: srcdb },
  ]);
  return srcdb;
}

describe("W6 watch daemon", () => {
  test("test_watch_tick_idempotent", async () => {
    const sb = makeSandbox();
    try {
      seed(sb.home, sb.root);
      const a = await tick();
      expect(a.targets).toBe(2);
      expect(a.changed).toBe(3);                        // 2 files + 1 row
      expect(a.errors).toEqual([]);
      const b = await tick();
      expect(b.changed).toBe(0);                        // IDEMPOTENT: nothing changed
      expect(b.rows).toBe(3);
    } finally { sb.cleanup(); }
  });

  test("test_watch_journal_is_real_jsonl", async () => {
    // REGRESSION PIN for the literal-escape defect: the journal must be newline-delimited JSON
    // that ANY consumer can read (jq, wc -l), not one line joined by backslash-n bytes.
    const sb = makeSandbox();
    try {
      seed(sb.home, sb.root);
      await tick();
      await tick();
      const raw = readFileSync(journalPath(), "utf8");
      expect(raw.includes("\\n")).toBe(false);          // no literal backslash-n anywhere
      const lines = raw.split("\n").filter(Boolean);
      expect(lines.length).toBe(2);                      // two ticks, two lines
      for (const l of lines) expect(() => JSON.parse(l)).not.toThrow();
      expect(readJournal(5).rows.length).toBe(2);
    } finally { sb.cleanup(); }
  });

  test("test_watch_tick_survives_a_bad_registry", async () => {
    // A broken registry is JOURNALED as an error, never a crash: a daemon that dies on a bad
    // config cannot reconcile anything.
    const sb = makeSandbox();
    try {
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "ghost", kind: "sqlite", root: join(sb.root, "does-not-exist.sqlite") }]);
      const r = await tick();
      expect(r.errors.length).toBe(1);
      expect(r.errors[0]).toMatch(/JM_SQLITE_MISSING/);
      expect(readJournal(1).rows[0].errors.length).toBe(1);   // and it is on the record
    } finally { sb.cleanup(); }
  });

  test("test_watch_in_scope_limits_targets", async () => {
    const sb = makeSandbox();
    try {
      seed(sb.home, sb.root);
      const r = await tick({ in: "files" });
      expect(r.targets).toBe(1);
      expect(r.actions.length).toBe(1);
      expect(r.actions[0].target).toBe("files");
    } finally { sb.cleanup(); }
  });

  test("test_watch_records_a_state_file_failure", async () => {
    // An audit flagged the state-file catch as a silent swallow. The fix records the failure ON
    // the tick (and therefore in the journal) — and the first version of that fix was itself
    // wrong: it wrote the journal BEFORE the state attempt, so the two records disagreed, and it
    // pushed into `errors` and `res.errors` (the SAME array), duplicating the entry.
    const sb = makeSandbox();
    try {
      seed(sb.home, sb.root);
      await tick();                                         // a clean tick writes a clean record
      const clean = readJournal(1).rows[0];
      expect(clean.errors).toEqual([]);

      // make the state pointer unwritable: a DIRECTORY at the state path
      rmSync(statePath(), { force: true, recursive: true });
      mkdirSync(statePath(), { recursive: true });
      const r = await tick();
      expect(r.errors.length).toBe(1);                      // exactly once, not duplicated
      expect(r.errors[0]).toMatch(/state_file/);
      const last = readJournal(1).rows[0];
      expect(last.errors.length).toBe(1);                   // and the JOURNAL carries it too
      expect(last.errors[0]).toMatch(/state_file/);
      rmSync(statePath(), { force: true, recursive: true });
    } finally { sb.cleanup(); }
  });
});

describe("D-058 — a torn journal line must not erase the record after it", () => {
  test("test_journal_survives_a_torn_line", async () => {
    // The journal is APPEND-ONLY, so a crash mid-append leaves exactly one malformed line. The
    // reader used `lines.map((l) => JSON.parse(l))`, which threw on the FIRST bad line and returned
    // NOTHING — so one torn entry made every later tick unreadable and the daemon's durable record
    // was lost from the corruption onward. Found by probing the watch surface adversarially.
    const sb = makeSandbox();
    try {
      const dir = join(sb.root, "c");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "a.md"), "a body");
      saveTargets([{ name: "w", kind: "fs", root: dir }]);
      await tick({ in: "w" });
      // a torn append, then a good entry
      const jp = join(process.env.JM_HOME ?? "", "watch", "journal.jsonl");
      appendFileSync(jp, '{"at":"2026-01-01T00:00:00.000Z","targets":1,"ro');
      appendFileSync(jp, '\n{"at":"2026-01-01T01:00:00.000Z","targets":9,"rows":9,"changed":9,"ms":1,"actions":[],"errors":[]}\n');

      const { rows, corrupt } = readJournal(10);
      expect(corrupt).toBe(1);                       // the damage is COUNTED, never swallowed
      expect(rows.length).toBe(2);                   // the good entries survive, before AND after
      expect(rows[1].targets).toBe(9);               // the entry AFTER the torn line is readable
    } finally { sb.cleanup(); }
  });
});

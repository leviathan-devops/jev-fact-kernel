// tests/container/harness.ts — THE CONTAINER RIG (spec §9, angles T1–T8).
// T10 was added for C14's remaining half: the REGISTERED MCP launcher, invoked by absolute path
// from a FOREIGN working directory — the way an MCP client actually starts it.
// Standalone: no bun:test, no host paths, no host key, no host skills dir. Run it inside a
// container and it proves the engine in an environment the host cannot provide for itself.
//
// A passToken is emitted ONLY by running the check that it names — it cannot be typed into
// existence. Every scenario prints its token on pass and the failToken on failure, and the
// process exits non-zero if any scenario failed.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";

import { openDb, indexPathFor } from "../../src/store/db.ts";
import { indexTarget } from "../../src/verbs/index.ts";
import { queryIndex } from "../../src/verbs/query.ts";
import { decisionTree, validateRecipe, type Recipe } from "../../src/verbs/decision-tree.ts";
import { runQueued } from "../../src/job/run.ts";
import { runIndexJob } from "../../src/job/indexJob.ts";
import { openJob } from "../../src/job/store.ts";
import { ingestAll, targetsIn, safeTargetName } from "../../src/targets.ts";
import { scanIndex } from "../../src/verbs/scan.ts";
import { extractFields, renderExtract } from "../../src/verbs/extract.ts";
import { saveTargets, loadTargets } from "../../src/store/db.ts";

const results: { id: string; ok: boolean; token: string; note: string }[] = [];
function record(id: string, ok: boolean, token: string, note: string): void {
  results.push({ id, ok, token, note });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${token}  ${note}`);
}

/** A container-local sandbox. Nothing outside /tmp is touched. */
function sandbox(): { home: string; root: string } {
  const home = mkdtempSync(join(tmpdir(), "jm-ct-home-"));
  const root = mkdtempSync(join(tmpdir(), "jm-ct-tree-"));
  process.env.JM_HOME = home;
  process.env.JM_LEDGER = join(home, "ledger.jsonl");
  return { home, root };
}

function makeTree(root: string, name: string, n: number, body = "tombstone record for the container proof"): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i++) writeFileSync(join(dir, `f${String(i).padStart(4, "0")}.md`), `${body} item ${i}\n`);
  return dir;
}

// ---------------------------------------------------------------- T1 · fresh index
function T1(): void {
  const { home, root } = sandbox();
  const dir = makeTree(root, "corpus", 500);
  saveTargets([{ name: "ct", kind: "fs", root: dir }]);
  const db = openDb(indexPathFor("ct"));
  const st = indexTarget(db, "ct", dir, {});
  const rows = queryIndex(db, { limit: 10000 }).length;
  db.close();
  const ok = st.files === 500 && rows === 500;
  record("T1", ok, ok ? "JM_INDEX_OK files=500" : "JM_INDEX_PARTIAL", `files=${st.files} rows=${rows} home=${home}`);
  rmSync(home, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------- T2 · incremental
function T2(): void {
  const { home, root } = sandbox();
  const dir = makeTree(root, "corpus", 500);
  saveTargets([{ name: "ct", kind: "fs", root: dir }]);
  const db = openDb(indexPathFor("ct"));
  indexTarget(db, "ct", dir, {});
  // touch exactly three files: a NEW mtime is what the incremental check reads
  const later = new Date(Date.now() + 5000);
  for (const i of [7, 111, 499]) utimesSync(join(dir, `f${String(i).padStart(4, "0")}.md`), later, later);
  const st2 = indexTarget(db, "ct", dir, {});
  db.close();
  const ok = st2.changed === 3;
  record("T2", ok, ok ? "JM_INDEX_DELTA=3" : "JM_INDEX_DELTA=500", `changed=${st2.changed}`);
  rmSync(home, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------- T3 · cache determinism
async function T3(): Promise<void> {
  const { home, root } = sandbox();
  // 100 DISTINCT states so the cache is exercised, with 100 canned responses: the container has
  // no key, and a cache proof must not depend on one.
  const mock = mkdtempSync(join(tmpdir(), "jm-ct-mock-"));
  for (let i = 0; i < 100; i++) {
    writeFileSync(join(mock, `call-${i}.json`), JSON.stringify({
      model: "ct-mock", answers: { flag: { type: "noul", noul: 0.9 } }, usage: { input_tokens: 10, output_tokens: 2 },
    }));
  }
  process.env.JM_MOCK_DIR = mock;
  const rows = join(root, "rows.jsonl");
  writeFileSync(rows, Array.from({ length: 100 }, (_, i) => JSON.stringify({ i, title: `item ${i}`, body: `body ${i}` })).join("\n") + "\n");
  const recipe: Recipe = validateRecipe({ recipe: "ct", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "closed" } });
  const db = openDb(indexPathFor("ct"));
  const a = await decisionTree({ db, rowsPath: rows, recipe, concurrency: 4 });
  const b = await decisionTree({ db, rowsPath: rows, recipe, concurrency: 4 });
  db.close();
  delete process.env.JM_MOCK_DIR;
  rmSync(mock, { recursive: true, force: true }); rmSync(home, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true });
  const ok = a.calls === 100 && b.calls === 0 && b.cached === 100;
  record("T3", ok, ok ? "JM_CACHE_HITS=100 JM_JUDGE_CALLS=0" : "JM_JUDGE_CALLS=100", `first=${a.calls} second=${b.calls} cached=${b.cached}`);
}

// ---------------------------------------------------------------- T4 · fail-closed
async function T4(): Promise<void> {
  const { home, root } = sandbox();
  const rows = join(root, "rows.jsonl");
  writeFileSync(rows, Array.from({ length: 100 }, (_, i) => JSON.stringify({ i, title: `t${i}` })).join("\n") + "\n");
  const recipe: Recipe = validateRecipe({ recipe: "ct", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "closed" } });
  const db = openDb(indexPathFor("ct"));
  const savedKey = process.env.TYPESAFE_API_KEY;
  const savedHome = process.env.HOME;
  delete process.env.TYPESAFE_API_KEY;
  process.env.HOME = join(home, "nokey");            // no env key AND no key file: truly keyless
  let exit = 0;
  let msg = "";
  try { await decisionTree({ db, rowsPath: rows, recipe, concurrency: 1 }); }
  catch (e) { exit = 2; msg = String(e); }
  // RESTORE BY DELETE WHEN IT WAS UNSET. `process.env.X = undefined` stores the literal string
  // "undefined", and `resolveKey()` treats any non-empty trimmed value as a present key — so this
  // line handed T5–T10 a bogus key and silently defeated every keyless expectation downstream. A
  // rig that runs keyless must be able to PROVE it is keyless. Found by the audit (H-6).
  if (savedKey === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = savedKey;
  if (savedHome === undefined) delete process.env.HOME; else process.env.HOME = savedHome;
  const written = (db.query("SELECT COUNT(*) AS n FROM decisions").get() as { n: number }).n;
  db.close();
  rmSync(home, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true });
  const ok = exit === 2 && written === 0 && /JEV_NO_KEY/.test(msg);
  record("T4", ok, ok ? "JM_EXIT=2 JM_DECISIONS_WRITTEN=0" : "JM_DECISIONS_WRITTEN=100", `exit=${exit} written=${written}`);
}

// ---------------------------------------------------------------- T5 · crash-resume (a REAL kill -9)
async function T5(): Promise<void> {
  const { home, root } = sandbox();
  const dir = makeTree(root, "corpus", 400);
  saveTargets([{ name: "ct", kind: "fs", root: dir }]);
  const cli = join(import.meta.dir, "..", "..", "src", "cli.ts");
  // THE REAL THING: spawn the queued index, kill -9 it mid-run, then re-run the SAME job. A hook
  // cannot prove this — only a process that dies without unwinding leaves the true crash state.
  const child = Bun.spawn(["bun", cli, "index", "@ct", "--queued", "--job", "ct-crash"], {
    stdout: "ignore", stderr: "ignore", env: { ...process.env },
  });
  // Kill exactly WHEN WORK IS IN FLIGHT: poll the job store for a 'running' row rather than
  // guessing a sleep. Killing before the first claim proves nothing (measured: a 320ms guess
  // killed it during TS startup, leaving 0 orphans and a vacuous pass).
  let waited = 0;
  for (;;) {
    let running = 0;
    try {
      const { db: probe } = openJob("ct-crash");
      running = (probe.query("SELECT COUNT(*) AS n FROM queue WHERE state='running'").get() as { n: number }).n;
      probe.close();
    } catch { /* the job db does not exist yet */ }
    if (running > 0) break;
    if (waited > 20000) throw new Error("T5: the child never claimed a row in 20s — the rig cannot prove resume");
    await Bun.sleep(50); waited += 50;
  }
  child.kill(9);                                          // SIGKILL: no cleanup, no ack, mid-claim
  await child.exited;
  const { db: db0 } = openJob("ct-crash");    // the queue is the JOB store's table, not the index's
  const orphaned = (db0.query("SELECT COUNT(*) AS n FROM queue WHERE state='running'").get() as { n: number }).n;
  const doneBefore = (db0.query("SELECT COUNT(*) AS n FROM queue WHERE state='done'").get() as { n: number }).n;
  db0.close();
  // re-run the same job to completion
  const res = await runIndexJob({ indexDb: openDb(indexPathFor("ct")), jobId: "ct-crash", root: dir, concurrency: 4 });
  const { db } = openJob("ct-crash");
  const d = db.query("SELECT COUNT(*) AS n, COUNT(DISTINCT fingerprint) AS uniq FROM queue WHERE state='done'").get() as { n: number; uniq: number };
  db.close();
  rmSync(home, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true });
  // THE LABEL MUST NAME WHICH CHECK FAILED. It read `JM_RESUME_DUP>0` for BOTH `d.n !== 400` and
  // `d.n !== d.uniq`, so a run that resumed INCOMPLETELY reported a duplicate — and duplicates are
  // structurally impossible here (`fingerprint` is UNIQUE), which sent the investigation after a
  // defect that cannot exist. A failure label that names the wrong cause is an instrument defect: it
  // makes the real one harder to find than no label at all.
  const complete = d.n === 400;
  const distinctOk = d.n === d.uniq;
  const ok = orphaned > 0 && complete && distinctOk;
  record("T5", ok, ok ? "JM_RESUME_OK dup=0" : (!complete ? "JM_RESUME_INCOMPLETE" : "JM_RESUME_DUP>0"),
    `SIGKILLed with ${orphaned} orphaned (${doneBefore} already done) -> resumed, done=${d.n} distinct=${d.uniq}${complete ? "" : " (INCOMPLETE: expected 400)"}`);
}

// ---------------------------------------------------------------- T6 · budget cap
async function T6(): Promise<void> {
  const { home, root } = sandbox();
  const dir = makeTree(root, "corpus", 100);
  saveTargets([{ name: "ct", kind: "fs", root: dir }]);
  const db = openDb(indexPathFor("ct"));
  const res = await runIndexJob({ indexDb: db, jobId: "ct-cap", root: dir, concurrency: 4, budgetCalls: 5 });
  const { db: jdb } = openJob("ct-cap");
  const done = (jdb.query("SELECT COUNT(*) AS n FROM queue WHERE state='done'").get() as { n: number }).n;
  jdb.close();
  db.close();
  rmSync(home, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true });
  const ok = res.budgetStopped === true && done === 5;
  record("T6", ok, ok ? "JM_BUDGET_STOPPED calls=5" : "JM_BUDGET_IGNORED", `stopped=${res.budgetStopped} done=${done}`);
}

// ---------------------------------------------------------------- T7 · adversarial
async function T7(): Promise<void> {
  const { home, root } = sandbox();
  const dir = join(root, "hostile");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "zero.md"), "");                                    // 0-byte
  writeFileSync(join(dir, "binary.bin"), Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x80]));   // non-utf8
  writeFileSync(join(dir, "huge.md"), "x".repeat(3 * 1024 * 1024));           // over the text cap
  // A NUL cannot exist in a path on any POSIX FS, so it is not a valid probe. The reachable
  // hostile names are: a maximum-length name, one with newlines/emoji, and a leading dot.
  writeFileSync(join(dir, `${"n".repeat(250)}.md`), "a maximum-length filename");   // 254 chars
  writeFileSync(join(dir, "new\nline 🧨 emoji.md"), "a name with a newline and an emoji");
  writeFileSync(join(dir, ".hidden-with-dots..md"), "a dot-heavy name");
  const corrupt = join(root, "corrupt.jsonl");
  writeFileSync(corrupt, '{"ok":1}\nnot json at all\n[]\nnull\n');
  const emptyDb = join(root, "empty.sqlite");
  new Database(emptyDb, { create: true }).close();                            // valid DB, zero tables
  saveTargets([
    { name: "hostile", kind: "fs", root: dir },
    { name: "corrupt", kind: "jsonl", root: corrupt },
    { name: "emptydb", kind: "sqlite", root: emptyDb },
  ]);
  let threw = "";
  try {
    const db = openDb(indexPathFor("ct"));
    await ingestAll(db, "all");
    const sc = scanIndex(db, { lex: "x" });
    extractFields(db, sc.candidates, { re: "x+" });
    renderExtract({ rows: [], total: 0, rowsWithValues: 0, empty: 0, structure: "csv", ms: 0 }, "csv");
    // the traversal-shaped target name must stay a KEY, not a path fragment
    const safe = safeTargetName("../../evil");
    if (safe.startsWith("../")) throw new Error("TRAVERSAL_ESCAPED");
    db.close();
  } catch (e) { threw = String(e); }
  rmSync(home, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true });
  const ok = threw === "";
  record("T7", ok, ok ? "JM_ADVERSARIAL_SURVIVED" : "JM_THREW", threw || "no throw across 7 hostile inputs");
}


// ---------------------------------------------------------------- T10 · the REGISTERED launcher, from a FOREIGN cwd
//
// NAMED T10, NOT T8: the spec's §9 reserves T8 (fire-gate twin) and T9 (token cap) for the parked
// W8 layer. Reusing the number would make this rig's count read as covering an angle it does not
// touch — the same class of error as a test that passes for the wrong reason.
//
// C14's remaining half is "an OMP session calls jev_find". The protocol is already proven; what this
// angle adds is the part a registration can actually get WRONG: the launcher an MCP client invokes
// by ABSOLUTE PATH is started with an arbitrary working directory. A server whose entry point
// resolves its own files relative to the CALLER's cwd works perfectly in the author's shell and
// fails inside every client. This angle starts it from `/`, far from the tree, and asserts:
//   (a) tools/list answers with the four tools                    -- the launcher resolves its own root
//   (b) tools/call jev_query returns a real row                    -- a real stdio round trip
//   (c) tools/call jev_find with NO key is a NAMED refusal         -- the negative half, never a silent empty
async function T10(): Promise<void> {
  const { home, root } = sandbox();
  const dir = join(root, "corpus");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "a.md"), "the ledger records every judge call");
  writeFileSync(join(dir, "b.md"), "an unrelated note about packaging");
  const launcher = join(process.cwd(), "scripts-jm-mcp.sh");
  if (!existsSync(launcher)) { record("T10", false, "JM_LAUNCHER_MISSING", launcher); return; }

  const call = (lines: string[]) => {
    const r = Bun.spawnSync({
      cmd: [launcher], stdin: Buffer.from(lines.join("\n") + "\n"),
      cwd: "/",                                   // THE POINT: a foreign working directory
      // TYPESAFE_API_KEY IS THE KEY ENV VAR (`src/judge/key.ts`). The first draft blanked
      // `JM_JUDGE_KEY`, which grep shows is read NOWHERE in src/ — so a real key from the host
      // environment (or the "undefined" leaked by T4) was inherited by the child and the keyless
      // assertion could pass for the wrong reason. HOME is redirected too, so the key FILE cannot
      // resolve either: "no key" has to mean NO KEY. Found by the audit (H-7).
      env: { ...process.env, JM_HOME: home, HOME: home, PATH: process.env.PATH ?? "", TYPESAFE_API_KEY: "" },
      timeout: 20000,
    });
    return r.stdout.toString();
  };
  const IN = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"rig","version":"1"}}}';
  const NOTE = '{"jsonrpc":"2.0","method":"notifications/initialized"}';

  // (a) the launcher resolves its own root from a foreign cwd
  const listed = call([IN, NOTE, '{"jsonrpc":"2.0","id":2,"method":"tools/list"}']);
  const four = ["jev_query", "jev_find", "jev_decide", "jev_index"].every((t) => listed.includes(t));

  // index the corpus so jev_query has something to read.
  // NOTE FOR THE NEXT READER: `jm index` takes a PATH, and a REGISTERED target needs the `@`
  // prefix (`jm index @name`). The first draft of this angle used `targets add` (plural) — the
  // verb is `target add` (singular) — and spent a cycle chasing a probe bug that looked like a
  // product bug. The index call below avoids the target registry entirely.
  const idx = Bun.spawnSync({ cmd: ["bun", "run", "src/cli.ts", "index", dir, "--name", "ct8"], cwd: process.cwd(), env: { ...process.env, JM_HOME: home, HOME: home } });
  if (idx.exitCode !== 0) { record("T10", false, "JM_RIG_INDEX_FAILED", idx.stderr.toString().slice(0, 200)); return; }

  // (b) a real stdio round trip, still from /
  // THE ASSERTION PARSES THE PROTOCOL, it does not regex the wire. Two drafts of this angle were
  // wrong for the same reason — reading raw bytes instead of the message they carry:
  //   draft 1 asserted the response contains "ledger"; the phrase that MATCHED lives in the file's
  //           content, while the ROW carries path/size/rank, so a working round trip read as a fail;
  //   draft 2 regexed `"n": 1` against bytes where every quote is ESCAPED (`\"n\": 1`), so it
  //           could never match.
  // Parse the envelope, parse the tool's text payload, assert the VALUE.
  const queried = call([IN, NOTE, '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"jev_query","arguments":{"index":"ct8","fts":"ledger"}}}']);
  const toolPayload = (raw: string, id: number): { n?: number; isError?: boolean; text: string } => {
    const line = raw.split("\n").find((l) => l.includes(`"id":${id}`));
    if (!line) return { text: "" };
    try {
      const env = JSON.parse(line) as { result?: { isError?: boolean; content?: { text?: string }[] } };
      const text = env.result?.content?.[0]?.text ?? "";
      let n: number | undefined;
      try { n = (JSON.parse(text) as { n?: number }).n; } catch { /* not a JSON payload */ }
      return { n, isError: env.result?.isError, text };
    } catch { return { text: "" }; }
  };
  const q = toolPayload(queried, 3);
  const gotRow = q.n === 1 && q.text.includes("a.md");

  // (c) THE NEGATIVE HALF: no key -> a NAMED refusal, never an empty success
  // THE ARGUMENT IS `phrase`, WHICH IS WHAT `jev_find` READS (`src/mcp.ts`: `const phrase = args.phrase`).
  // The first draft sent `query`, so the call threw `JM_ARGS: phrase required` BEFORE any key
  // resolution — and because that arrives as `isError: true`, the assertion below passed on it. The
  // angle proved a missing argument, not a missing key: the vacuous pass this whole rig exists to
  // catch, inside the rig. Found by the audit (H-8).
  const denied = call([IN, NOTE, '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"jev_find","arguments":{"index":"ct8","phrase":"notes about packaging"}}}']);
  const d = toolPayload(denied, 4);
  // AND THE REFUSAL MUST NAME THE KEY. `isError` alone is not evidence of a KEY refusal — any error
  // satisfies it. This is the same discipline the session applies everywhere else: the assertion
  // names the thing it is testing.
  const namedRefusal = d.isError === true && /JEV_NO_KEY|TYPESAFE_API_KEY/i.test(d.text);

  rmSync(home, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true });
  const ok = four && gotRow && namedRefusal;
  record("T10", ok,
    ok ? "JM_LAUNCHER_FOREIGN_CWD_OK tools=4 row=1 keyless=NAMED" : (four ? "" : "TOOLS_LOST ") + (gotRow ? "" : "NO_ROW ") + (namedRefusal ? "" : "KEYLESS_SILENT"),
    // the angle carries its own evidence: the raw round trip, so a failure here is readable
    // without re-running anything.
    `tools=${four} row=${gotRow} namedRefusal=${namedRefusal} :: ${queried.replace(/\s+/g, " ").slice(0, 220)}`);
}

// ---------------------------------------------------------------- the rig
async function main(): Promise<number> {
  console.log(`JM CONTAINER RIG — bun ${Bun.version} · node ${process.version} · cwd ${process.cwd()}`);
  console.log(`hosts file / key / skills are NOT used: JM_HOME is under ${tmpdir()}, HOME is redirected for the keyless angle\n`);
  T1();
  T2();
  await T3();
  await T4();
  await T5();
  await T6();
  await T7();
  await T10();
  const failed = results.filter((r) => !r.ok);
  console.log(`\nJM_CONTAINER_RIG ${failed.length === 0 ? "PASS" : "FAIL"} — ${results.length - failed.length}/${results.length} angles`);
  if (failed.length) console.log(`failed: ${failed.map((f) => `${f.id}(${f.token})`).join(" ")}`);
  return failed.length === 0 ? 0 : 1;
}

process.exit(await main());

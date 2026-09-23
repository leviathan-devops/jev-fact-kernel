#!/usr/bin/env bun
// src/cli.ts — the JM CLI router. Every run prints its cost line and writes ONE ledger row.
import { openDb, openIndexExisting, indexPathFor, indexExists, resolveTarget, loadTargets, saveTargets, targetsPath, reconcileRoots, type Target } from "./store/db.ts";
import { targetsIn, ingestAll, safeTargetName } from "./targets.ts";
import type { Database } from "bun:sqlite";
import { resolveKey } from "./judge/key.ts";
import { JEV_NO_KEY } from "./judge/client.ts";
import { serveStdio } from "./mcp.ts";
import { scanIndex } from "./verbs/scan.ts";
import { clusterIndex } from "./verbs/cluster.ts";
import { extractFields, renderExtract, type Structure } from "./verbs/extract.ts";
import { route, buildCatalogue } from "./verbs/route.ts";
import { evaluate, replayDiff } from "./verbs/evaluate.ts";
import { report, renderReport, jobReport, renderJobReport, lastJobId } from "./verbs/report.ts";
import { watch, tick, readJournal } from "./watch.ts";
import { indexTarget } from "./verbs/index.ts";
import { runIndexJob } from "./job/indexJob.ts";
import { decisionTree, validateRecipe, type Recipe } from "./verbs/decision-tree.ts";
import { filterIndex } from "./verbs/filter.ts";
import { find } from "./verbs/find.ts";
import { startServer } from "./serve.ts";
import { calibrate, recordTruth, recordCalibration } from "./calibrate.ts";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { queryIndex } from "./verbs/query.ts";
import { withLedger } from "./ledger.ts";

const argv = process.argv.slice(2);
const verb = argv[0];

function flag(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
const has = (name: string) => argv.includes(`--${name}`);
// A JUDGED VERB MUST RESOLVE ITS KEY BEFORE IT OPENS A STORE (D-055). policy.ts: a missing key is
// fatal REGARDLESS of fail polarity, so a refused run has no work to do — but `openDb` CREATES the
// file, so the refusal used to leave an empty index behind that then reported healthy and answered
// every query with zero rows. A keyless engine now creates NO artifacts.
function judgeKeyMissing(): boolean {
  // JM_MOCK_DIR IS A LEGITIMATE KEYLESS MODE, and a guard that forgot it is a regression: the judge
  // itself returns "mock" as the key when JM_MOCK_DIR is set (judge/client.ts:36) and the transport
  // short-circuits to canned fixtures (judge/transport.ts:37). A guard that consulted only
  // resolveKey() refused runs the judge would have served. Found by the audit (A-4); the suite
  // missed it because its mock-transport tests also carry a real key in the environment.
  if (process.env.JM_MOCK_DIR) return false;
  if (resolveKey()) return false;
  console.error(`JM_ERROR: ${JEV_NO_KEY}: no TYPESAFE_API_KEY and no ~/.config/typesafe/key`);
  return true;
}

const VALUE_FLAGS = new Set(["name", "include", "exclude", "limit", "where", "fts", "tag", "rows", "recipe", "context", "criteria", "out", "escalation", "concurrency", "budget-calls", "job", "question", "min-p", "common", "structure", "in", "index", "port", "truth", "truth-value", "apply-note", "phrase",
  // FLAGS THE VERBS ACTUALLY CONSUME BUT WHICH WERE ABSENT HERE (audit M-B): `positionals()`
  // only skips the next token for names in this set, so the VALUE of any missing flag was
  // treated as a POSITIONAL. `jm scan <idx> --lex tombstone` therefore put "tombstone" in
  // positionals — harmless for `scan` (it ignores extras) and a real bug for any verb that
  // reads positional[1], which is exactly the kind of defect that hides behind one verb.
  "lex", "re", "min", "field", "include-glob", "exclude-glob",
  // THE REST OF THEM, taken from the CODE rather than from a reading of it: every remaining name that
  // `flag("…")` actually consumes. The first pass added four (`lex`, `re`, `min`, `field`) and missed
  // these eight, so `--cases`, `--interval`, `--k`, `--key`, `--questions`, `--replay`, `--schema` and
  // `--task` still leaked their VALUES into positionals — and `evaluate --cases <file>` is exactly the
  // kind of call where a stray positional matters. **A hand-maintained set that must mirror the code
  // will drift from it; the remedy is to derive it, and this comment is the note that it was derived.**
  "cases", "interval", "k", "key", "questions", "replay", "schema", "task"]);
function positionals(): string[] {
  const out: string[] = [];
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const nm = a.slice(2);
      if (VALUE_FLAGS.has(nm) && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) i++;
      continue;
    }
    out.push(a);
  }
  return out;
}
const positional = positionals();

function usage(): void {
  console.log(`jm — the targetable decision engine

  jm index <path|@target> [--name N] [--include G,G] [--exclude G,G] [--limit N] [--json]
  jm index @<target> --queued [--job ID] [--concurrency N] [--budget-calls N]   resumable, crash-safe
  jm query <name|@target> [--where "size>2000"] [--fts "phrase"] [--tag k=v] [--limit N] [--json]
  jm index --in a,b|all [--name N]                 multi-target ingest (fs | jsonl | sqlite)
  jm query --in a,b|all [--fts P] [--where W]      query the multi-target index
  jm target add <name> <kind> <root> | jm target ls | jm target rm <name>
  jm scan <index> [--lex P] [--re R] [--limit N] [--json]      seeds -> candidates (keyless)
  jm cluster <index> [--lex P] [--re R] [--min N] [--json]     group candidates (no model)
  jm extract <index> --re R|--field K [--lex P] [--out F]      structured pulls -> result
  jm filter <index> --question "..." [--fts X] [--min-p P]     judge candidates -> kept bands (needs a key)
  jm find "<phrase>" --in <index> [--common N] [--out F]       the 9-stage chain -> patterns (needs a key)
  jm decision-tree --rows F --recipe F [--out F]               rows + recipe -> decisions (needs a key)
  jm route --task "..." [--catalogue] [--json]               catalogue Choice + injection
  jm evaluate --cases F --questions F --key K [--k N]         metrics + --replay diff
  jm report [index] [--json]                                  status over the store + ledger
  jm report --job <id|last> [--name I] [--json]               per-job reconciliation (queue vs ledger)
  jm mcp                                           MCP tool surface on stdio (jev_query, jev_find, jev_decide, jev_index)
  jm watch [--once] [--interval MS] [--in a,b] [--name I]   the reconcile daemon (journal per tick)
  jm journal [--limit N] [--json]                  the watch journal
  jm serve [--port N] [--name I]                   the HTTP surface (POST /decide, /find)
  jm calibrate [--name I] [--apply [--apply-note S]] [--truth ID --truth-value V]
                                                   band counts; --apply records a calibration row
`);
}


/** THE EXIT-CODE POLICY, in one place. 2 = a CLIENT error (your arguments, or the key is absent)
 *  — every JM_* code the engine raises for bad input, plus JEV_NO_KEY. 1 = a RUNTIME failure
 *  (the environment is at fault). Before this, the same class of error returned 1 from one verb
 *  and 2 from another — an operator could not branch on the code. (D-018, found by verifying the
 *  operating contract's exit-code table against the engine.) */
function exitCodeFor(err: unknown): number {
  const m = String(err);
    // `[A-Z0-9_]+`, NOT `[A-Z_]+`: the codes carry digits (`JM_JUDGE_HTTP_500`), and omitting them
  // made a fail-closed judge outage exit 1 ("error") instead of 2 ("refused/fail-closed", the
  // spec's own word for it). Measured: a 500 under `fail: "closed"` returned 1.
  return /JM_[A-Z0-9_]+:|JEV_NO_KEY/.test(m) ? 2 : 1;
}

async function main(): Promise<number> {
  if (!verb || has("help")) { usage(); return verb ? 0 : 2; }

  if (verb === "target") {
    const sub = argv[1];
    if (sub === "ls") {
      const list = loadTargets();
      console.log(list.map((t) => `${t.name}\t${t.kind}\t${t.root}`).join("\n") || "(no targets)");
      console.log(`registry ${targetsPath()}`);
      return 0;
    }
    if (sub === "add") {
      const [name, kind, root] = [argv[2], argv[3], argv[4]];
      if (!name || !kind || !root) { console.error("usage: jm target add <name> <kind> <root>"); return 2; }
      // THE KIND IS VALIDATED, NOT CAST (audit cli.ts:132). `kind as Target["kind"]` told the type
      // system to trust an operator-supplied string, so `jm target add x bogus /path` registered a
      // target whose kind has NO ADAPTER — and the mistake surfaced much later, at index time, as a
      // failure with no connection to the command that caused it. The cast removed exactly the check
      // that would have caught it. This is the same "accepted garbage" class as the budget key, the
      // recipe `fail` value and the job id.
      const KINDS = ["fs", "jsonl", "sqlite"];
      if (!KINDS.includes(kind)) {
        console.error(`JM_TARGET_KIND: "${kind}" has no adapter (known: ${KINDS.join(", ")})`);
        return 2;
      }
      // THE TILDE IS EXPANDED ONCE, HERE, FOR EVERYTHING THAT FOLLOWS (audit cli.ts:121). The
      // existence check expanded it and the REGISTRY then stored the RAW `~/…`, so the stored pointer
      // and the validated path disagreed: validation passed against `$HOME/...` while every later
      // reader had to expand it again — and any reader that forgot saw a path that does not exist.
      // Storing the ABSOLUTE path is what makes "the registry stores pointers" true.
      const expandedRoot = root.replace(/^~(?=\/|$)/, homedir());
      if (!existsSync(expandedRoot)) {
        console.error(`JM_TARGET_MISSING: ${root} does not exist (the registry stores pointers, not promises)`);
        return 2;
      }
      const list = loadTargets().filter((t) => t.name !== name);
      list.push({ name, kind: kind as Target["kind"], root: expandedRoot });
      saveTargets(list);
      // NAME THE REGISTRY THAT WAS WRITTEN. A registry is a pointer store, and an operator with two
      // stores (a scratch JM_HOME and the real ~/.jm) cannot tell from `target X -> root` WHICH one
      // took the write. The second-operator drill wrote into the operator's real registry exactly
      // this way — its `export JM_HOME` did not survive to the next shell call, and nothing in the
      // output ever named the file. Printing it costs one line and makes the mistake impossible to
      // miss. (`target ls` prints it too, below.)
      console.log(`target ${name} (${kind}) -> ${root}`);
      console.log(`registry ${targetsPath()}`);
      return 0;
    }
    if (sub === "rm" || sub === "remove") {
      const name = argv[2];
      if (!name) { console.error("usage: jm target rm <name>"); return 2; }
      const before = loadTargets();
      const after = before.filter((t) => t.name !== name);
      if (after.length === before.length) { console.error(`JM_TARGET_UNKNOWN: ${name}`); return 2; }   // LOUD, client error
      saveTargets(after);
      console.log(`removed ${name}`);
      return 0;
    }
    usage(); return 2;
  }

  if (verb === "index") {
    // `--in a,b|all` (W2/S8): ingest every resolved target through its adapter into ONE index.
    if (flag("in") !== undefined) {
      // FAIL LOUD on an unsupported combination: `--in` runs the batch ingest, which has no queue,
      // so `--queued`/`--job` were previously ACCEPTED AND IGNORED — the caller believed they had
      // a resumable job and got a fire-and-forget batch.
      if (has("queued") || flag("job") !== undefined) {
        console.error("JM_ARGS: --in cannot be combined with --queued/--job (the batch path has no queue). Use the single-target form: jm index @<target> --queued --job <id>");
        return 2;
      }
      const spec = flag("in")!;
      const indexName = flag("name") ?? (spec === "all" ? "all" : spec.split(",").map((x) => x.trim()).join("+"));
      // RESOLVE BEFORE OPENING (D-054): `openDb` creates the file, so `--in nosuchtarget` used to
      // exit 2 and STILL leave `zzz.sqlite` behind — which then answered `query zzz` at exit 0 with
      // zero rows, making "no such target" and "no matches" indistinguishable again. The MCP
      // surface already resolved first; the CLI did not.
      targetsIn(spec);
      const db = openDb(indexPathFor(indexName));
      try {
        // This is the PER-TARGET ARRAY (one entry per resolved target), not a stats object — the
        // old name made an auditor read it as one and file a HIGH that execution refutes.
        const perTarget = await withLedger("index", { in: spec, name: indexName }, async () => {
          const r = await ingestAll(db, spec, { rebuild: has("rebuild") });
          return { result: r, stats: { targets: r.length, rows: r.reduce((n, x) => n + x.rows, 0) }, costUsd: 0 };
        });
        db.close();
        if (has("json")) console.log(JSON.stringify(perTarget, null, 2));
        else for (const r of perTarget) console.log(`${r.target}\t${r.kind}\trows=${r.rows}\tchanged=${r.changed}\t${r.ms}ms`);
        return 0;
      } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
    }
    const arg = positional[0];
    if (!arg) { console.error("JM_ARGS: jm index <path|@target> [--in a,b|all]"); return 2; }
    // `@target` DISPATCHES BY KIND: a sqlite/jsonl target goes through its adapter (rows), not
    // through the fs walker over the DB file. (Second-operator drill G2: `jm index @sqldb`
    // indexed the .sqlite FILE as one row and reported success.)
    if (arg.startsWith("@")) {
      const t = loadTargets().find((x) => x.name === arg.slice(1));
      if (!t) { console.error(`JM_TARGET_UNKNOWN: ${arg}`); return 2; }
      if (t.kind !== "fs") {
        const idxName = flag("name") ?? t.name;
        const db0 = openDb(indexPathFor(idxName));
        try {
          const r = await withLedger("index", { target: t.name, kind: t.kind, name: idxName }, async () => {
            const st = await ingestAll(db0, t.name, { rebuild: has("rebuild") });
            return { result: st, stats: { targets: st.length, rows: st.reduce((n, x) => n + x.rows, 0) }, costUsd: 0 };
          });
          db0.close();
          if (has("json")) console.log(JSON.stringify(r, null, 2));
          else for (const x of r) console.log(`${x.target}\t${x.kind}\trows=${x.rows}\tchanged=${x.changed}\t${x.ms}ms`);
          return 0;
        } catch (err) { db0.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
      }
    }
    const { name, root } = resolveTarget(arg);
    const indexName = flag("name") ?? name;
    const dbPath = indexPathFor(indexName);
    const db = openDb(dbPath);
    // A TARGET IS ALWAYS NAMESPACED; ONLY A DIRECT PATH IS BARE. `jm index @A` used to write BARE
    // paths while `jm index --in A` wrote `A/`-prefixed ones — the SAME target with TWO path-spaces,
    // which is the duplication defect at its source (the operator's store held 68 bare + 57
    // `reports/`-prefixed rows over one directory). The documented workflow `--in A,B` then `@A`
    // only ever ASSERTED that B survived, so nobody noticed A was landing twice. One rule now.
    const prefix = arg.startsWith("@") ? `${safeTargetName(name)}/` : "";
    const opts = {
      include: flag("include")?.split(","),
      exclude: flag("exclude")?.split(","),
      limit: flag("limit") ? Number(flag("limit")) : undefined,
      prefix,
    };
    if (has("queued")) {
      const jobId = flag("job") ?? `idx-${indexName}`;
      // THE QUEUED FUNNEL RECONCILES TOO — its worker calls indexFile directly and bypasses both
      // other funnels, so the guard has to fire here or the third path stays unguarded.
      reconcileRoots(db, [{ prefix, root: resolve(root) }], has("rebuild"));
      const q = await withLedger("index", { arg, name: indexName, root, queued: true, job: jobId }, async () => {
        const r = await runIndexJob({
          indexDb: db, jobId,
          root, opts, concurrency: flag("concurrency") ? Number(flag("concurrency")) : 8,
          budgetCalls: flag("budget-calls") ? Number(flag("budget-calls")) : undefined,
        });
        return { result: r, stats: { ...r } as Record<string, unknown>, costUsd: 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(q, null, 2));
      // `ok` AND `failed` ARE ON THE LINE (audit indexJob.ts:31/37): without them a crashed run
      // printed `done=0 … files=<the whole index>` and a scripted caller could not tell it from an
      // empty job. The error is also COLLAPSED TO ONE LINE — an error carrying a newline made the
      // whole JM_QUEUED line unparseable, which is the same defect one level up.
      else console.log(`JM_QUEUED ok=${q.ok} done=${q.done} failed=${q.failed} pending=${q.pending} running=${q.running} files=${q.files} resumed=${q.resumed} budget_stopped=${q.budgetStopped}${q.error ? " error=" + String(q.error).replace(/\s+/g, " ").slice(0, 160) : ""} ms=${q.ms}`);
      return q.budgetStopped ? 3 : 0;
    }
    const stats = await withLedger("index", { arg, name: indexName, root }, async () => {
      const s = indexTarget(db, indexName, root, { ...opts, rebuild: has("rebuild") });
      return { result: s, stats: { ...s } as Record<string, unknown>, costUsd: 0 };
    });
    db.close();
    if (has("json")) console.log(JSON.stringify({ index: indexName, db: dbPath, ...stats }, null, 2));
    else console.log(`JM_INDEX_OK files=${stats.files} changed=${stats.changed} gone=${stats.gone} text=${stats.textIndexed} ms=${stats.ms} db=${dbPath}${stats.sweep_skipped ? ` sweep_skipped="${stats.sweep_skipped}"` : ""}`);
    return 0;
  }

  if (verb === "query") {
    const arg = positional[0];
    const inSpec = flag("in");
    if (!arg && inSpec === undefined) { console.error("JM_ARGS: jm query <name|@target> | jm query --in a,b|all"); return 2; }
    let indexName = arg ?? "";
    if (inSpec !== undefined) {
      indexName = flag("name") ?? (inSpec === "all" ? "all" : inSpec.split(",").map((x) => x.trim()).join("+"));
    } else if (arg.startsWith("@")) indexName = resolveTarget(arg).name;
    const db = openIndexExisting(indexName, indexPathFor(indexName));   // G1: a typo is LOUD
    try {
      const rows = await withLedger("query", { index: indexName, where: flag("where"), fts: flag("fts"), tag: flag("tag"), limit: flag("limit"), json: has("json") }, async () => {
        const r = queryIndex(db, { where: flag("where"), fts: flag("fts"), tag: flag("tag"), limit: flag("limit") ? Number(flag("limit")) : undefined });
        return { result: r, stats: { rows: r.length }, costUsd: 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(rows, null, 2));
      else for (const r of rows) console.log(`${r.size}\t${r.state}\t${r.path}`);
      return 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "decision-tree") {
    const rowsPath = flag("rows");
    const recipePath = flag("recipe");
    if (!rowsPath || !recipePath) { console.error("JM_ARGS: jm decision-tree --rows F --recipe F [--context F] [--criteria F] [--out F]"); return 2; }
    let recipe: Recipe;
    try { recipe = validateRecipe(JSON.parse(readFileSync(recipePath, "utf8"))); }
    catch (err) { console.error(`JM_ERROR: ${String(err)}`); return 2; }   // a bad recipe is a CLIENT error, before any work
    if (judgeKeyMissing()) return 2;                       // D-055: refuse BEFORE creating an index
    const db = openDb(indexPathFor(flag("name") ?? "decisions"));
    try {
      const res = await withLedger("decision-tree", { rows: rowsPath, recipe: recipePath, name: flag("name") ?? "decisions" }, async () => {
        const r = await decisionTree({
          db, rowsPath, recipe,
          contextPath: flag("context"), criteriaPath: flag("criteria"),
          outPath: flag("out"), escalationPath: flag("escalation"),
          concurrency: flag("concurrency") ? Number(flag("concurrency")) : 6,
          budgetCalls: flag("budget-calls") ? Number(flag("budget-calls")) : undefined,
        });
        return { result: r, stats: { ...r } as Record<string, unknown>, costUsd: r.costUsd, calls: r.calls, cached: r.cached };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(res, null, 2));
      else console.log(`JM_DECISIONS rows=${res.rows} decided=${res.decisions} act=${res.bands.act} escalate=${res.bands.escalate} noop=${res.bands.noop} calls=${res.calls} cached=${res.cached} requests=${res.requests}` + (res.budgetStopped ? " BUDGET_STOPPED" : ""));
      return res.budgetStopped ? 3 : 0;
    } catch (err) {
      db.close();
      console.error(`JM_ERROR: ${err instanceof Error ? err.message : String(err)}`);
      return exitCodeFor(err);   // ONE policy: 2 = client error or fail-closed refusal, 1 = runtime
    }
  }

  if (verb === "filter") {
    const indexName = positional[0];
    const question = flag("question");
    if (!indexName || !question) { console.error("JM_ARGS: jm filter <index> --question \"…\" [--fts X] [--min-p 0.8]"); return 2; }
    // A READ VERB REFUSES A MISSING INDEX (D-056): `openDb` created `typo.sqlite`, and the typo then
    // answered at EXIT 0 with zero rows — the D-009/D-028 class, fixed on the MCP surface and missed
    // here. `query` and `scan` already used the refusing open; `filter` and `find` did not.
    if (judgeKeyMissing()) return 2;
    // `filter` IS A JUDGED VERB and must refuse a missing key like its siblings — and it must do so
    // BEFORE the store is opened, for the same reason `find` does: the check is free, the store
    // touch is not, and two judged verbs answering differently for one situation is its own defect
    // (a keyless `filter` on a missing index said JM_INDEX_MISSING while `find` said JEV_NO_KEY).
    // Without the guard at all, a keyless run whose candidate query returns ZERO rows never reached
    // the judge and exited 0 with `kept=0` — "no key" indistinguishable from "no matches", the
    // D-009/D-028 class this whole change exists to close. Found by the audit (A-2).
    //
    // THEN THE INDEX (D-056). `openDb` created `typo.sqlite`, and the typo then answered at EXIT 0
    // with zero rows — the D-009/D-028 class, fixed on the MCP surface and missed here. `query` and
    // `scan` already used the refusing open; `filter` and `find` did not.
    const filterIdx = indexName.startsWith("@") ? indexName.slice(1) : indexName;
    const db = openIndexExisting(filterIdx, indexPathFor(filterIdx));
    try {
      const res = await withLedger("filter", { index: indexName, question }, async () => {
        const r = await filterIndex(db, {
          fts: flag("fts"), where: flag("where"), question, minP: flag("min-p") ? Number(flag("min-p")) : undefined,
          limit: flag("limit") ? Number(flag("limit")) : undefined,
          budgetCalls: flag("budget-calls") ? Number(flag("budget-calls")) : undefined,
        });
        return { result: r, stats: { candidates: r.candidates, judged: r.judged, kept: r.kept }, costUsd: r.costUsd, calls: r.calls, cached: r.kept_rows.filter((x) => x.cached).length };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(res, null, 2));
      else { console.log(`JM_FILTER candidates=${res.candidates} judged=${res.judged} kept=${res.kept} calls=${res.calls} requests=${res.requests} batch=${res.calls > 0 ? (res.calls / Math.max(1, res.requests)).toFixed(0) : 0}/req`); for (const r of res.kept_rows.slice(0, 10)) console.log(`  p=${r.p.toFixed(2)} ${r.path}`); }
      return res.budgetStopped ? 3 : 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "find") {
    const phrase = positional[0] ?? flag("phrase");
    if (!phrase) { console.error("JM_ARGS: jm find \"<phrase>\" --in <index> [--common N] [--structure md|json] [--out F]"); return 2; }
    // THE KEY IS RESOLVED FIRST — before the mkdir and before the open. `resolveKey()` is
    // side-effect-free, so hoisting it costs nothing; leaving it below meant a keyless `find`
    // still created `$JM_HOME/find` and mutated an existing store (WAL conversion / schema pass)
    // before refusing, and reported JM_INDEX_MISSING ahead of JEV_NO_KEY. Found by the audit (A-3).
    if (judgeKeyMissing()) return 2;
    mkdirSync(join(process.env.JM_HOME ?? join(homedir(), ".jm"), "find"), { recursive: true });   // G13: the artifact home exists
    const indexArg = flag("in") ?? flag("index") ?? "shadow";
    const indexName = indexArg.startsWith("@") ? indexArg.slice(1) : indexArg;
    // A READ VERB REFUSES A MISSING INDEX (D-056): see `filter` above — same defect, same fix.
    const db = openIndexExisting(indexName, indexPathFor(indexName));
    try {
      const res = await withLedger("find", { phrase, index: indexName }, async () => {
        const r = await find(db, {
          phrase, common: flag("common") ? Number(flag("common")) : undefined,
          structure: (flag("structure") as "md" | "json") ?? "md",
          outPath: flag("out") ?? join(process.env.JM_HOME ?? join(homedir(), ".jm"), "find", `find-${Date.now()}.md`),
          minP: flag("min-p") ? Number(flag("min-p")) : undefined,
          limit: flag("limit") ? Number(flag("limit")) : undefined,
          budgetCalls: flag("budget-calls") ? Number(flag("budget-calls")) : undefined,
        });
        return { result: r, stats: { trend: r.trend }, costUsd: r.costUsd, calls: r.calls, cached: 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify({ trend: res.trend, clusters: res.clusters, patterns: res.patterns }, null, 2));
      else console.log(`JM_FIND trend: ${res.trend} · out=${res.out}`);
      return res.budgetStopped ? 3 : 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "scan") {
    // W3/S9: seeds -> candidates. Keyless and deterministic.
    const indexName = flag("name") ?? (positional[0] ?? "all");
    const db = openIndexExisting(indexName, indexPathFor(indexName));   // G1: a typo is LOUD
    try {
      const r = await withLedger("scan", { index: indexName, lex: flag("lex"), re: flag("re"), where: flag("where"), limit: flag("limit") }, async () => {
        const res = scanIndex(db, { lex: flag("lex"), re: flag("re"), where: flag("where"), limit: flag("limit") ? Number(flag("limit")) : undefined });
        return { result: res, stats: { scanned: res.scanned, returned: res.returned, truncated: res.truncated }, costUsd: 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(r, null, 2));
      else for (const c of r.candidates) console.log(`${c.hits}\t${c.size}\t${c.path}\t${c.excerpt.slice(0, 90)}`);
      return 0;
    } catch (err) {
      // THE STORE IS CLOSED ON THE ERROR PATH TOO (audit cli.ts:383/423). Every sibling verb
      // (`query`, `filter`, `find`, `route`, `evaluate`, `report`, `decision-tree`) closes it in
      // its catch; `scan` and `cluster` returned without closing, leaking one sqlite handle per
      // failed invocation. In a long-lived caller (the daemon, a shell loop) that is a leak that
      // grows with every typo.
      db.close();
      console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err);
    }
  }

  if (verb === "cluster") {
    // W3/S10: group the scan's candidates. No model.
    const indexName = flag("name") ?? (positional[0] ?? "all");
    const db = openIndexExisting(indexName, indexPathFor(indexName));   // G1: a typo is LOUD
    try {
      const r = await withLedger("cluster", { index: indexName, lex: flag("lex"), re: flag("re"), where: flag("where"), limit: flag("limit"), min: flag("min") }, async () => {
        const sc = scanIndex(db, { lex: flag("lex"), re: flag("re"), where: flag("where"), limit: flag("limit") ? Number(flag("limit")) : undefined });
        const cl = clusterIndex(db, sc.candidates, { minSize: flag("min") ? Number(flag("min")) : undefined });
        return { result: { scan: { scanned: sc.scanned, returned: sc.returned }, ...cl }, stats: { clusters: cl.clusters.length, grouped: cl.grouped }, costUsd: 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(r, null, 2));
      else for (const c of r.clusters) console.log(`n=${c.n}\t${c.kind}\t${c.source}\t[${c.signature.slice(0, 4).join(",")}]\t${c.exemplars.map((e) => e.path.split("/").pop()).join(", ")}`);
      return 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "extract") {
    // W3/S9: structured pulls from the scan's candidates -> the RESULT artifact.
    const indexName = flag("name") ?? (positional[0] ?? "all");
    if (!flag("re") && !flag("field")) { console.error("JM_ARGS: jm extract --re <regex|--field K> [--lex L] [--out F]"); return 2; }
    const db = openIndexExisting(indexName, indexPathFor(indexName));   // G1: a typo is LOUD
    try {
      // G9: the structure comes from --structure, else from --out's extension, else json.
      const outExt = flag("out")?.toLowerCase();
      const inferred: Structure | undefined = outExt?.endsWith(".csv") ? "csv" : outExt?.endsWith(".md") ? "md" : outExt?.endsWith(".json") ? "json" : undefined;
      const structure: Structure = (flag("structure") as Structure) ?? inferred ?? "json";
      const r = await withLedger("extract", { index: indexName, re: flag("re"), field: flag("field"), lex: flag("lex"), where: flag("where"), limit: flag("limit"), structure, out: flag("out") }, async () => {
        const sc = scanIndex(db, { lex: flag("lex"), re: flag("re"), where: flag("where"), limit: flag("limit") ? Number(flag("limit")) : undefined });
        const ex = extractFields(db, sc.candidates, { re: flag("re"), field: flag("field"), structure });
        return { result: ex, stats: { rows: ex.rows.length, values: ex.total, empty: ex.empty, structure }, costUsd: 0 };
      });
      db.close();
      const out = renderExtract(r, structure);
      if (flag("out")) { writeFileSync(flag("out")!, out); console.log(`wrote ${flag("out")} (${r.total} values, ${r.rowsWithValues} rows)`); }
      else process.stdout.write(out + (out.endsWith("\n") ? "" : "\n"));
      return 0;
    } catch (err) {
      // THE STORE IS CLOSED ON THE ERROR PATH TOO (audit cli.ts:383/423). Every sibling verb
      // (`query`, `filter`, `find`, `route`, `evaluate`, `report`, `decision-tree`) closes it in
      // its catch; `scan` and `cluster` returned without closing, leaking one sqlite handle per
      // failed invocation. In a long-lived caller (the daemon, a shell loop) that is a leak that
      // grows with every typo.
      db.close();
      console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err);
    }
  }

  if (verb === "route") {
    // W5/S13: the catalogue Choice. Needs a key (fail polarity: exit 2 without one).
    if (has("catalogue")) { const c = buildCatalogue(); console.log(JSON.stringify(c, null, 2)); return 0; }   // no key, no judge: a pure read
    const task = flag("task") ?? positional.join(" ");
    if (!task) { console.error("JM_ARGS: jm route --task \"<task>\" [--catalogue]"); return 2; }
    if (judgeKeyMissing()) return 2;                       // D-055: refuse BEFORE creating an index
    const db = openDb(indexPathFor(flag("name") ?? "decisions"));
    try {
      const r = await withLedger("route", { task, context: flag("context"), name: flag("name") ?? "decisions" }, async () => {
        const res = await route(db, { task, context: flag("context") });
        return { result: res, stats: { route: res.route, p: res.p, candidates: res.candidates }, costUsd: res.costUsd, calls: res.calls, cached: res.cached ? 1 : 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(r, null, 2));
      else {
        console.log(`route=${r.route} choice=${r.choice || "(none)"} p=${r.p.toFixed(3)} requests=${r.requests}${r.runnerUp ? ` runner-up=${r.runnerUp.id}(${r.runnerUp.p.toFixed(3)})` : ""}`);
        console.log(`judged: ${r.rated.length} of a ${r.candidates}-entry catalogue (shortlist: ${r.shortlist.slice(0, 4).join(", ")}${r.shortlist.length > 4 ? ", …" : ""})`);
        console.log(`reason: ${r.reason}`);
        if (r.injection) console.log(`injection: ${r.injection}`);
      }
      return 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "evaluate") {
    // W5/S14: fixed cases + oracle labels -> metrics. `--replay B` diffs two runs.
    const casesPath = flag("cases");
    const qPath = flag("questions");
    if (!casesPath || !qPath) { console.error("JM_ARGS: jm evaluate --cases F --questions F --key K [--k N] [--replay F]"); return 2; }
    // A malformed --cases/--questions file is a CLIENT error: name it, do not leak a SyntaxError
    // through the top-level boundary (an audit flagged the parse sitting outside any try).
    let cases: unknown; let questions: Record<string, unknown>;
    try {
      cases = JSON.parse(readFileSync(casesPath, "utf8"));
      questions = JSON.parse(readFileSync(qPath, "utf8")) as Record<string, unknown>;
    } catch (err) {
      console.error(`JM_EVAL_JSON: ${String(err).slice(0, 160)}`);
      return 2;
    }
    if (!Array.isArray(cases)) { console.error("JM_EVAL_CASES: --cases must be a JSON ARRAY of {id, state, oracle}"); return 2; }
    const key = flag("key") ?? Object.keys(questions)[0];
    if (judgeKeyMissing()) return 2;                       // D-055: refuse BEFORE creating an index
    const db = openDb(indexPathFor(flag("name") ?? "decisions"));
    try {
      const r = await withLedger("evaluate", { cases: casesPath, k: flag("k") }, async () => {
        const res = await evaluate(db, { cases, questions, questionKey: key, repetitions: flag("k") ? Number(flag("k")) : undefined, schema: flag("schema") });
        return { result: res, stats: { n: res.metrics.n, agreement: res.metrics.agreement, brier: res.metrics.brier }, costUsd: res.metrics.costUsdTotal, calls: res.metrics.n, cached: res.cases.filter((c) => c.cached).length };
      });
      db.close();
      let replay: unknown = null;
      if (flag("replay")) {
        const prev = JSON.parse(readFileSync(flag("replay")!, "utf8")) as typeof r;
        replay = replayDiff(prev, r);
      }
      if (has("json")) console.log(JSON.stringify({ ...r, replay }, null, 2));
      else {
        const m = r.metrics;
        console.log(`n=${m.n} k=${m.k} requests=${r.requests} agreement=${(m.agreement * 100).toFixed(1)}% brier=${m.brier.toFixed(4)} ece=${m.ece.toFixed(4)} variance=${m.variance.toFixed(5)}`);
        console.log(`latency=${m.latencyMsMean.toFixed(0)}ms $/call=${m.costPerCall.toFixed(8)} total=$${m.costUsdTotal.toFixed(6)}`);
        if (Array.isArray(replay)) { console.log(`replay diffs: ${(replay as unknown[]).length}`); for (const d of replay as { id: string; from: number; to: number; flipped: boolean }[]) console.log(`  ${d.id} ${d.from} -> ${d.to}${d.flipped ? " FLIPPED" : ""}`); }
      }
      return 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "report") {
    // C8: `jm report --job <id|last>` — the PER-JOB reconciliation the spec names. It REPLACED a
    // recorded open violation, so the branch comes first: with --job, the index argument is
    // irrelevant and an index that does not exist must not block a queue-only read.
    if (flag("job") !== undefined) {
      const want = flag("job")!;
      const jobId = want === "last" ? lastJobId() : want;
      if (!jobId) { console.error("JM_JOB_NONE: no job has a queue yet (run `jm index @t --queued --job <id>`)"); return 2; }
      const idxName = flag("name") ?? "all";
      let jr;
      // THE STORE HANDED TO `jobReport` IS CLOSED HERE (audit cli.ts:504). `jobReport` closes only the
      // queue db it opens itself (`report.ts:129`) and never closes the `db` ARGUMENT, so this handle
      // leaked on every `report --job` — the one verb whose store lifetime the CALLER owns.
      let reportDb: Database | null = null;
      try {
        if (indexExists(idxName)) reportDb = openDb(indexPathFor(idxName));
        jr = jobReport(reportDb, jobId);
      } catch (err) {
        reportDb?.close();
        console.error(`JM_ERROR: ${String(err)}`);
        return 2;                                   // a client named a job that is not there
      }
      reportDb?.close();
      if (has("json")) console.log(JSON.stringify(jr, null, 2));
      else console.log(renderJobReport(jr));
      return jr.reconciled ? 0 : 3;   // a duplicate or a running row is a NON-ZERO reconciliation
    }
    // W7: a READ-ONLY status report (index · ledger · registry).
    const repName = flag("name") ?? (positional[0] ?? "all");
    const db = openIndexExisting(repName, indexPathFor(repName));   // G1: a typo is LOUD
    try {
      const r = await withLedger("report", { index: flag("name") ?? positional[0] ?? "all" }, async () => {
        const res = report(db, { index: flag("name") ?? (positional[0] ?? "all") });
        return { result: res, stats: { files: res.files, runs: res.runs, ledger: res.ledger.rows }, costUsd: 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(r, null, 2));
      else console.log(renderReport(r));
      return 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "mcp") {
    // The MCP surface on stdio: an agent (OMP, Claude, any MCP client) calls jm_* tools.
    await serveStdio();
    return 0;
  }

  if (verb === "watch") {
    // The daemon surface: `--once` for a single reconcile tick (tests/cron), else the loop.
    const r = await watch({ intervalMs: flag("interval") ? Number(flag("interval")) : undefined, index: flag("name"), once: has("once"), in: flag("in") });
    return 0;
  }

  if (verb === "journal") {
    const { rows, corrupt } = readJournal(flag("limit") ? Number(flag("limit")) : 20);
    // A TORN LINE IS REPORTED, NEVER SWALLOWED (D-058). The journal is append-only, so a crash
    // mid-append leaves one malformed line; the reader skips it and this line says so. A silent skip
    // would make a damaged journal indistinguishable from a short one.
    if (corrupt > 0) console.error(`JM_JOURNAL_CORRUPT: ${corrupt} malformed line(s) skipped (a torn append is expected in an append-only log)`);
    if (has("json")) console.log(JSON.stringify(rows, null, 2));
    // THE errors COLUMN IS CARRIED (same finding as the live tick render): the journal row has held
    // `errors: string[]` all along — `watch.ts:20,52` — and this render dropped it, so the tick that
    // FAILED and the tick that did nothing looked identical from the journal. Joined into one field
    // so the TSV stays one-row-per-tick (a newline inside the message would break the shape).
    else for (const r of rows) console.log(`${r.at}\ttargets=${r.targets}\trows=${r.rows}\tchanged=${r.changed}\t${r.ms}ms${r.errors && r.errors.length ? "\terrors=" + r.errors.join(" | ").replace(/\s+/g, " ").slice(0, 300) : ""}`);
    return 0;
  }

  if (verb === "serve") {
    const srv = startServer({ port: flag("port") ? Number(flag("port")) : 7777, name: flag("name") ?? "decisions" });
    console.log(`JM_SERVE listening on http://127.0.0.1:${srv.port} (pid ${process.pid})`);
    return await new Promise<number>(() => {});   // run until killed
  }

  if (verb === "calibrate") {
    // ARGUMENT VALIDATION COMES FIRST — it is the same invariant from the other side (D-056's fix
    // opened the store before this check, so `calibrate --truth abc` began answering
    // JM_INDEX_MISSING instead of naming the bad argument; the pre-existing cli-contract test caught
    // it immediately). Validate the input, THEN touch the disk.
    const rawId = has("truth") ? (flag("truth") ?? "") : null;
    let truthId = 0;
    if (rawId !== null) {
      truthId = Number(rawId);
      // NaN reaching SQLite compares as NULL, so a typo'd id silently matched nothing. Refuse it.
      if (!Number.isInteger(truthId) || truthId < 0) { console.error(`JM_ARGS: --truth <id> must be a non-negative integer (got "${rawId}")`); return 2; }
    }
    // --apply RECORDS a row, so it may create the store; a plain calibrate READS it (D-056), and a
    // read that creates is the phantom class. `calibrate` with no store has zero rows, not a new file.
    // ONLY --apply CREATES. `--truth` is NOT a write: `recordTruth` runs `UPDATE decisions SET
    // context_ref …` (calibrate.ts:58-61), which can never insert the row it targets — so a
    // `--truth` run against an absent store would create a schema-initialised file and then fail
    // with JM_TRUTH_MISSING. That is the phantom the D-054/D-055/D-056 invariant forbids, and it
    // was re-introduced by the first version of this very fix. Found by the audit (A-1).
    const calIdx = flag("name") ?? "decisions";
    const db = has("apply") ? openDb(indexPathFor(calIdx)) : openIndexExisting(calIdx, indexPathFor(calIdx));
    if (rawId !== null) {
      const id = truthId;
      const val = flag("truth-value") ?? "operator_confirmed";
      const ok = recordTruth(db, id, val);
      if (!ok) { console.error(`JM_TRUTH_MISSING: no decision row with id=${id}`); db.close(); return 2; }   // the caller named a row that is not there: a CLIENT error
      console.log(`JM_TRUTH id=${id} -> ${val} (recorded)`);
      db.close(); return 0;
    }
    const rep = calibrate(db);
    if (has("apply")) {
      const note = flag("apply-note") ?? "manual calibration event";
      const at = recordCalibration(db, rep, note);
      console.log(`JM_CALIBRATION_ROW ${at} — ${note}`);
    }
    db.close();
    if (has("json")) console.log(JSON.stringify(rep, null, 2));
    else {
      console.log(`JM_CALIBRATE decisions=${rep.decisions} act=${rep.bands.act} escalate=${rep.bands.escalate} noop=${rep.bands.noop} mean=${rep.meanSignal.toFixed(2)} truth=${rep.truthFilled}`);
      if (rep.suggestion) console.log(`  SUGGESTION act=${rep.suggestion.act} — ${rep.suggestion.reason}`);
    }
    return 0;
  }

  usage(); return 2;
}

main().then((code) => process.exit(code)).catch((err) => {
  // The LAST error boundary: a throw that escaped a verb's own catch (e.g. an open that happens
  // BEFORE the try) still gets the documented exit code. Before this it was always 1, so a
  // typo'd index exited 1 on one path and 2 on another (D-018).
  console.error(`JM_ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(exitCodeFor(err));
});

#!/usr/bin/env bun
// src/cli.ts — the JM CLI router. Every run prints its cost line and writes ONE ledger row.
import { openDb, openIndexExisting, indexPathFor, indexExists, resolveTarget, loadTargets, saveTargets, type Target } from "./store/db.ts";
import { targetsIn, ingestAll } from "./targets.ts";
import { serveStdio } from "./mcp.ts";
import { scanIndex } from "./verbs/scan.ts";
import { clusterIndex } from "./verbs/cluster.ts";
import { extractFields, renderExtract, type Structure } from "./verbs/extract.ts";
import { route, buildCatalogue } from "./verbs/route.ts";
import { evaluate, replayDiff } from "./verbs/evaluate.ts";
import { report, renderReport } from "./verbs/report.ts";
import { watch, tick, readJournal } from "./watch.ts";
import { indexTarget } from "./verbs/index.ts";
import { runIndexJob } from "./job/indexJob.ts";
import { decisionTree, validateRecipe, type Recipe } from "./verbs/decision-tree.ts";
import { filterIndex } from "./verbs/filter.ts";
import { find } from "./verbs/find.ts";
import { startServer } from "./serve.ts";
import { calibrate, recordTruth, recordCalibration } from "./calibrate.ts";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
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
const VALUE_FLAGS = new Set(["name", "include", "exclude", "limit", "where", "fts", "tag", "rows", "recipe", "context", "criteria", "out", "escalation", "concurrency", "budget-calls", "job", "question", "min-p", "common", "structure", "in", "index", "port", "truth", "truth-value", "apply-note", "phrase"]);
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
  jm route --task "..." [--catalogue] [--json]               catalogue Choice + injection
  jm evaluate --cases F --questions F --key K [--k N]         metrics + --replay diff
  jm report [index] [--json]                                  status over the store + ledger
  jm mcp                                           MCP tool surface on stdio (jm_query, jm_find, jm_decide, jm_index)
  jm watch [--once] [--interval MS] [--in a,b]     the reconcile daemon (journal per tick)
  jm journal [--limit N] [--json]                  the watch journal
`);
}


/** THE EXIT-CODE POLICY, in one place. 2 = a CLIENT error (your arguments, or the key is absent)
 *  — every JM_* code the engine raises for bad input, plus JEV_NO_KEY. 1 = a RUNTIME failure
 *  (the environment is at fault). Before this, the same class of error returned 1 from one verb
 *  and 2 from another — an operator could not branch on the code. (D-018, found by verifying the
 *  operating contract's exit-code table against the engine.) */
function exitCodeFor(err: unknown): number {
  const m = String(err);
  return /JM_[A-Z_]+:|JEV_NO_KEY/.test(m) ? 2 : 1;
}

async function main(): Promise<number> {
  if (!verb || has("help")) { usage(); return verb ? 0 : 2; }

  if (verb === "target") {
    const sub = argv[1];
    if (sub === "ls") {
      const list = loadTargets();
      console.log(list.map((t) => `${t.name}\t${t.kind}\t${t.root}`).join("\n") || "(no targets)");
      return 0;
    }
    if (sub === "add") {
      const [name, kind, root] = [argv[2], argv[3], argv[4]];
      if (!name || !kind || !root) { console.error("usage: jm target add <name> <kind> <root>"); return 2; }
      // FAIL WHERE THE MISTAKE IS MADE: registering a root that does not exist used to succeed
      // silently, so the surprise arrived at INDEX time (the drill's G2b). A registry is a
      // pointer store, and a pointer to nothing is a client error at the moment it is written.
      if (!existsSync(root.replace(/^~(?=\/|$)/, homedir()))) {
        console.error(`JM_TARGET_MISSING: ${root} does not exist (the registry stores pointers, not promises)`);
        return 2;
      }
      const list = loadTargets().filter((t) => t.name !== name);
      list.push({ name, kind: kind as Target["kind"], root });
      saveTargets(list);
      console.log(`target ${name} (${kind}) -> ${root}`);
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
      const db = openDb(indexPathFor(indexName));
      try {
        const stats = await withLedger("index", { in: spec, name: indexName }, async () => {
          const r = await ingestAll(db, spec);
          return { result: r, stats: { targets: r.length, rows: r.reduce((n, x) => n + x.rows, 0) }, costUsd: 0 };
        });
        db.close();
        if (has("json")) console.log(JSON.stringify(stats, null, 2));
        else for (const r of stats) console.log(`${r.target}\t${r.kind}\trows=${r.rows}\tchanged=${r.changed}\t${r.ms}ms`);
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
            const st = await ingestAll(db0, t.name);
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
    const opts = {
      include: flag("include")?.split(","),
      exclude: flag("exclude")?.split(","),
      limit: flag("limit") ? Number(flag("limit")) : undefined,
    };
    if (has("queued")) {
      const q = await withLedger("index", { arg, name: indexName, root, queued: true }, async () => {
        const r = await runIndexJob({
          indexDb: db, jobId: flag("job") ?? `idx-${indexName}`,
          root, opts, concurrency: flag("concurrency") ? Number(flag("concurrency")) : 8,
          budgetCalls: flag("budget-calls") ? Number(flag("budget-calls")) : undefined,
        });
        return { result: r, stats: { ...r } as Record<string, unknown>, costUsd: 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(q, null, 2));
      else console.log(`JM_QUEUED done=${q.done} pending=${q.pending} running=${q.running} files=${q.files} resumed=${q.resumed} budget_stopped=${q.budgetStopped}${q.error ? " error=" + q.error : ""} ms=${q.ms}`);
      return q.budgetStopped ? 3 : 0;
    }
    const stats = await withLedger("index", { arg, name: indexName, root }, async () => {
      const s = indexTarget(db, indexName, root, opts);
      return { result: s, stats: { ...s } as Record<string, unknown>, costUsd: 0 };
    });
    db.close();
    if (has("json")) console.log(JSON.stringify({ index: indexName, db: dbPath, ...stats }, null, 2));
    else console.log(`JM_INDEX_OK files=${stats.files} changed=${stats.changed} gone=${stats.gone} text=${stats.textIndexed} ms=${stats.ms} db=${dbPath}`);
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
    const db = openDb(indexPathFor(flag("name") ?? "decisions"));
    try {
      const res = await withLedger("decision-tree", { rows: rowsPath, recipe: recipePath }, async () => {
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
      else console.log(`JM_DECISIONS rows=${res.rows} decided=${res.decisions} act=${res.bands.act} escalate=${res.bands.escalate} noop=${res.bands.noop} calls=${res.calls} cached=${res.cached}` + (res.budgetStopped ? " BUDGET_STOPPED" : ""));
      return res.budgetStopped ? 3 : 0;
    } catch (err) {
      db.close();
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`JM_ERROR: ${msg}`);
      return msg.includes("JEV_NO_KEY") ? 2 : 1;   // FAIL-CLOSED (L4)
    }
  }

  if (verb === "filter") {
    const indexName = positional[0];
    const question = flag("question");
    if (!indexName || !question) { console.error("JM_ARGS: jm filter <index> --question \"…\" [--fts X] [--min-p 0.8]"); return 2; }
    const db = openDb(indexPathFor(indexName.startsWith("@") ? indexName.slice(1) : indexName));
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
      else { console.log(`JM_FILTER candidates=${res.candidates} judged=${res.judged} kept=${res.kept}`); for (const r of res.kept_rows.slice(0, 10)) console.log(`  p=${r.p.toFixed(2)} ${r.path}`); }
      return res.budgetStopped ? 3 : 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "find") {
    const phrase = positional[0] ?? flag("phrase");
    if (!phrase) { console.error("JM_ARGS: jm find \"<phrase>\" --in <index> [--common N] [--structure md|json] [--out F]"); return 2; }
    mkdirSync(join(process.env.JM_HOME ?? join(homedir(), ".jm"), "find"), { recursive: true });   // G13: the artifact home exists
    const indexArg = flag("in") ?? flag("index") ?? "shadow";
    const indexName = indexArg.startsWith("@") ? indexArg.slice(1) : indexArg;
    const db = openDb(indexPathFor(indexName));
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
    } catch (err) { console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
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
    } catch (err) { console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "route") {
    // W5/S13: the catalogue Choice. Needs a key (fail polarity: exit 2 without one).
    if (has("catalogue")) { const c = buildCatalogue(); console.log(JSON.stringify(c, null, 2)); return 0; }   // no key, no judge: a pure read
    const task = flag("task") ?? positional.join(" ");
    if (!task) { console.error("JM_ARGS: jm route --task \"<task>\" [--catalogue]"); return 2; }
    const db = openDb(indexPathFor(flag("name") ?? "decisions"));
    try {
      const r = await withLedger("route", { task, context: flag("context") }, async () => {
        const res = await route(db, { task, context: flag("context") });
        return { result: res, stats: { route: res.route, p: res.p, candidates: res.candidates }, costUsd: res.costUsd, calls: res.calls, cached: res.cached ? 1 : 0 };
      });
      db.close();
      if (has("json")) console.log(JSON.stringify(r, null, 2));
      else {
        console.log(`route=${r.route} choice=${r.choice || "(none)"} p=${r.p.toFixed(3)}${r.runnerUp ? ` runner-up=${r.runnerUp.id}(${r.runnerUp.p.toFixed(3)})` : ""}`);
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
    const cases = JSON.parse(readFileSync(casesPath, "utf8"));
    const questions = JSON.parse(readFileSync(qPath, "utf8"));
    const key = flag("key") ?? Object.keys(questions)[0];
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
        console.log(`n=${m.n} k=${m.k} agreement=${(m.agreement * 100).toFixed(1)}% brier=${m.brier.toFixed(4)} ece=${m.ece.toFixed(4)} variance=${m.variance.toFixed(5)}`);
        console.log(`latency=${m.latencyMsMean.toFixed(0)}ms $/call=${m.costPerCall.toFixed(8)} total=$${m.costUsdTotal.toFixed(6)}`);
        if (Array.isArray(replay)) { console.log(`replay diffs: ${(replay as unknown[]).length}`); for (const d of replay as { id: string; from: number; to: number; flipped: boolean }[]) console.log(`  ${d.id} ${d.from} -> ${d.to}${d.flipped ? " FLIPPED" : ""}`); }
      }
      return 0;
    } catch (err) { db.close(); console.error(`JM_ERROR: ${String(err)}`); return exitCodeFor(err); }
  }

  if (verb === "report") {
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
    const rows = readJournal(flag("limit") ? Number(flag("limit")) : 20);
    if (has("json")) console.log(JSON.stringify(rows, null, 2));
    else for (const r of rows) console.log(`${r.at}\ttargets=${r.targets}\trows=${r.rows}\tchanged=${r.changed}\t${r.ms}ms`);
    return 0;
  }

  if (verb === "serve") {
    const srv = startServer({ port: flag("port") ? Number(flag("port")) : 7777, name: flag("name") ?? "decisions" });
    console.log(`JM_SERVE listening on http://127.0.0.1:${srv.port} (pid ${process.pid})`);
    return await new Promise<number>(() => {});   // run until killed
  }

  if (verb === "calibrate") {
    const db = openDb(indexPathFor(flag("name") ?? "decisions"));
    if (has("truth")) {
      const [id, val] = [Number(flag("truth")), flag("truth-value") ?? "operator_confirmed"];
      const ok = recordTruth(db, id, val);
      console.log(`JM_TRUTH id=${id} -> ${val} (${ok ? "recorded" : "no such row"})`);
      db.close(); return ok ? 0 : 1;
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

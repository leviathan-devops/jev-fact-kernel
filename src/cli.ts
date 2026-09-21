#!/usr/bin/env bun
// src/cli.ts — the JM CLI router. Every run prints its cost line and writes ONE ledger row.
import { openDb, indexPathFor, resolveTarget, loadTargets, saveTargets, type Target } from "./store/db.ts";
import { indexTarget } from "./verbs/index.ts";
import { runIndexJob } from "./job/indexJob.ts";
import { decisionTree, type Recipe } from "./verbs/decision-tree.ts";
import { filterIndex } from "./verbs/filter.ts";
import { find } from "./verbs/find.ts";
import { startServer } from "./serve.ts";
import { calibrate, recordTruth, recordCalibration } from "./calibrate.ts";
import { readFileSync } from "node:fs";
import { queryIndex } from "./verbs/query.ts";
import { withLedger, readLedger } from "./ledger.ts";

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
  jm query <name|@target> [--where "size>2000"] [--fts "phrase"] [--tag k=v] [--limit N] [--json]
  jm target add <name> <kind> <root> | jm target ls
  jm report [--json]
`);
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
      const list = loadTargets().filter((t) => t.name !== name);
      list.push({ name, kind: kind as Target["kind"], root });
      saveTargets(list);
      console.log(`target ${name} (${kind}) -> ${root}`);
      return 0;
    }
    usage(); return 2;
  }

  if (verb === "index") {
    const arg = positional[0];
    if (!arg) { console.error("JM_ARGS: jm index <path|@target>"); return 2; }
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
    if (!arg) { console.error("JM_ARGS: jm query <name|@target>"); return 2; }
    let indexName = arg;
    if (arg.startsWith("@")) indexName = resolveTarget(arg).name;
    const db = openDb(indexPathFor(indexName));
    const rows = await withLedger("query", { index: indexName, where: flag("where"), fts: flag("fts"), tag: flag("tag") }, async () => {
      const r = queryIndex(db, { where: flag("where"), fts: flag("fts"), tag: flag("tag"), limit: flag("limit") ? Number(flag("limit")) : undefined });
      return { result: r, stats: { rows: r.length }, costUsd: 0 };
    });
    db.close();
    if (has("json")) console.log(JSON.stringify(rows, null, 2));
    else for (const r of rows) console.log(`${r.size}\t${r.state}\t${r.path}`);
    return 0;
  }

  if (verb === "decision-tree") {
    const rowsPath = flag("rows");
    const recipePath = flag("recipe");
    if (!rowsPath || !recipePath) { console.error("JM_ARGS: jm decision-tree --rows F --recipe F [--context F] [--criteria F] [--out F]"); return 2; }
    const recipe = JSON.parse(readFileSync(recipePath, "utf8")) as Recipe;
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
    } catch (err) { db.close(); const m = String(err); console.error(`JM_ERROR: ${m}`); return m.includes("JEV_NO_KEY") ? 2 : 1; }
  }

  if (verb === "find") {
    const phrase = positional[0] ?? flag("phrase");
    if (!phrase) { console.error("JM_ARGS: jm find \"<phrase>\" --in <index> [--common N] [--structure md|json] [--out F]"); return 2; }
    const indexArg = flag("in") ?? flag("index") ?? "shadow";
    const indexName = indexArg.startsWith("@") ? indexArg.slice(1) : indexArg;
    const db = openDb(indexPathFor(indexName));
    try {
      const res = await withLedger("find", { phrase, index: indexName }, async () => {
        const r = await find(db, {
          phrase, common: flag("common") ? Number(flag("common")) : undefined,
          structure: (flag("structure") as "md" | "json") ?? "md",
          outPath: flag("out") ?? `/tmp/jm-find-${Date.now()}.md`,
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
    } catch (err) { db.close(); const m = String(err); console.error(`JM_ERROR: ${m}`); return m.includes("JEV_NO_KEY") ? 2 : 1; }
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

  if (verb === "report") {
    const rows = readLedger();
    const byVerb: Record<string, number> = {};
    for (const r of rows) byVerb[r.verb] = (byVerb[r.verb] ?? 0) + 1;
    const totalCost = rows.reduce((a, r) => a + (r.cost_usd ?? 0), 0);
    if (has("json")) console.log(JSON.stringify({ rows: rows.length, byVerb, totalCost }, null, 2));
    else {
      console.log(`runs=${rows.length} cost=$${totalCost.toFixed(6)}`);
      for (const [k, v] of Object.entries(byVerb)) console.log(`  ${k}: ${v}`);
    }
    return 0;
  }

  usage(); return 2;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(`JM_ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

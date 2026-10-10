// @bun
// jev-manager — the deployed bundle of index.ts.source (the hardened 2026-10-07 build, r2).
// AUDIT HARDENING (qwen-code-audit sessions 685c7e4d + 970204df → all critical/high fixed):
//   · buildArgs completed for evaluate/watch/spec-audit/push-gate/st-detect
//   · file params: statSync.isFile + R_OK + leading-dash guards + out-parent isDirectory
//   · timeout/abort/errno are FAILURES, never exit 0 — errno/signal/killed surfaced
//   · --json integrity: raw stdout only (no stderr splice, no marker), surrogate-safe truncation
//   · caller abort is JEV_CANCELLED, never JEV_JUDGE_DOWN
//   · judge probe: finally-cleanup + non-JSON named + abort distinguished + health URL override
//   · JUDGE_BASE trailing-slash safe · JUDGED_SET/JUDGE_NEEDED are Sets
//   · activation re-assert SERIALIZED through a promise chain · pi surface typeof-guarded
//   · watch without `once` refuses · route requires `question` · explicit 0 forwarded
//   · `i` DECLINED as a defect: the OMP harness intent field, kept, not forwarded.
import { execFile } from "child_process";
import { isAbsolute, resolve } from "path";
import { homedir } from "os";
import { constants } from "fs";
import { stat, access, realpath } from "fs/promises";

const JM_BIN = process.env.JM_BIN || resolve(homedir(), ".local/bin/jm");
const JM_HOME = process.env.JM_HOME || resolve(homedir(), ".jm");
const JM_JUDGE_URL = process.env.JM_JUDGE_URL || "http://127.0.0.1:8090/v1/systemone";
const JUDGE_BASE = (() => {
  let base = JM_JUDGE_URL.replace(/\/+$/, "");
  if (base.endsWith("/v1/systemone")) base = base.slice(0, -"/v1/systemone".length);
  return base.replace(/\/+$/, "");
})();
const JUDGE_HEALTH_URL = process.env.JM_JUDGE_HEALTH_URL || `${JUDGE_BASE}/health`;
const MAX_OUT = 48000;
const KEYLESS = ["index", "query", "scan", "cluster", "extract", "report", "target", "watch"];
const JUDGED = ["filter", "find", "decision-tree", "route", "evaluate"];
const GATES = ["push-gate", "st-detect", "spec-audit"];
const VERBS = [...KEYLESS, ...JUDGED, ...GATES];
const JUDGED_SET = new Set(JUDGED);
const JUDGE_NEEDED = new Set([...JUDGED_SET, "push-gate"]);
const DASH_GUARDED = [
  "target", "phrase", "index", "path", "spec", "rows", "recipe", "out", "cases", "questions", "qkey",
  "fts", "where", "lex", "re", "field", "question",
];
const NUMERIC_GUARDED = ["limit", "common", "k", "interval"];

function textResult(text, details = {}) {
  return { content: [{ type: "text", text }], details };
}

// Surrogate-safe slice — never splits a surrogate pair; no marker injected into the payload.
function truncate(s) {
  if (s.length <= MAX_OUT) return s;
  let end = MAX_OUT;
  const last = s.charCodeAt(end - 1);
  // A trailing HIGH surrogate is the orphan (its low partner sits past the cut) — drop it. A
  // trailing LOW surrogate means its high partner is INSIDE the slice — the pair is complete.
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return s.slice(0, end);
}

function refusal(code, message, extra = {}) {
  return textResult(`${code}: ${message}`, { ok: false, error: code, ...extra });
}

function run(args, cwd, signal, timeoutMs = 180000) {
  return new Promise((res) => {
    execFile(
      JM_BIN,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 32000000,
        signal,
        cwd,
        // EXPLICIT UTF-8 (audit r6): without it, Node's child_process yields Buffers and the
        // string helpers downstream (charCodeAt/slice/trim) break.
        encoding: "utf8",
        env: {
          ...process.env,
          JM_HOME,
          JM_JUDGE_URL,
          NO_COLOR: "1",
        },
      },
      (err, stdout, stderr) => {
        // EXIT TRUTH: err present => failure; a timeout-kill/abort carries no numeric code.
        const e = err;
        let code = 0;
        if (e) code = typeof e.code === "number" ? e.code : 1;
        res({
          code,
          errno: e && typeof e.code === "string" ? e.code : null,
          signal: e?.signal ?? null,
          killed: e?.killed === true,
          stdout: stdout || "",
          stderr: stderr || "",
        });
      },
    );
  });
}

async function ensureJudge(signal) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 90000);
  const onAbort = () => ac.abort();
  try {
    if (signal) {
      if (signal.aborted) ac.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    const r = await fetch(JUDGE_HEALTH_URL, { signal: ac.signal });
    if (!r.ok) return `the judge at ${JUDGE_BASE} answered HTTP ${r.status}`;
    let body;
    try {
      body = await r.json();
    } catch {
      return `the judge at ${JUDGE_BASE} answered a non-JSON body`;
    }
    if (body.ok !== true) return `the judge at ${JUDGE_BASE} reported ${JSON.stringify(body)}`;
    return null;
  } catch (e) {
    // CALLER ABORT IS NOT AN OUTAGE.
    if (signal?.aborted) return "__CALLER_CANCELLED__";
    return `the judge at ${JUDGE_BASE} is unreachable (${String(e)})`;
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", onAbort);
  }
}

function buildArgs(params) {
  const a = [params.verb];
  const p = params;
  switch (p.verb) {
    case "index":
      if (p.target) a.push(p.target);
      if (p.index) a.push("--name", p.index);
      break;
    case "query":
      if (p.index) a.push(p.index);
      if (p.fts) a.push("--fts", p.fts);
      if (p.where) a.push("--where", p.where);
      if (p.limit !== undefined) a.push("--limit", String(p.limit));
      break;
    case "scan":
    case "cluster":
      if (p.index) a.push(p.index);
      if (p.lex) a.push("--lex", p.lex);
      if (p.re) a.push("--re", p.re);
      if (p.limit !== undefined) a.push("--limit", String(p.limit));
      break;
    case "extract":
      if (p.index) a.push(p.index);
      if (p.re) a.push("--re", p.re);
      if (p.field) a.push("--field", p.field);
      if (p.limit !== undefined) a.push("--limit", String(p.limit));
      break;
    case "filter":
      if (p.index) a.push(p.index);
      if (p.question) a.push("--question", p.question);
      if (p.fts) a.push("--fts", p.fts);
      if (p.min_p !== undefined) a.push("--min-p", String(p.min_p));
      if (p.limit !== undefined) a.push("--limit", String(p.limit));
      break;
    case "find":
      if (p.phrase) a.push(p.phrase);
      a.push("--in", p.index || "all");
      if (p.common !== undefined) a.push("--common", String(p.common));
      if (p.min_p !== undefined) a.push("--min-p", String(p.min_p));
      break;
    case "decision-tree":
      if (p.rows) a.push("--rows", p.rows);
      if (p.recipe) a.push("--recipe", p.recipe);
      if (p.out) a.push("--out", p.out);
      break;
    case "route":
      if (p.question) a.push("--task", p.question);
      break;
    case "report":
      if (p.index) a.push(p.index);
      break;
    case "target":
      if (p.path) a.push(p.path);
      break;
    // COMPLETED COVERAGE (audit H1): previously fell through to default, params dropped.
    case "evaluate":
      if (p.cases) a.push("--cases", p.cases);
      if (p.questions) a.push("--questions", p.questions);
      if (p.qkey) a.push("--key", p.qkey);
      if (p.k !== undefined) a.push("--k", String(p.k));
      break;
    case "watch":
      if (p.once) a.push("--once");
      if (p.interval !== undefined) a.push("--interval", String(p.interval));
      if (p.index) a.push("--name", p.index);
      break;
    case "spec-audit":
      if (p.spec) a.push(p.spec);
      break;
    case "push-gate":
      if (p.spec) a.push("--spec", p.spec);
      break;
    case "st-detect":
      break;
    default:
      break;
  }
  if (p.json) a.push("--json");
  return a;
}

function jev_manager_default(pi) {
  pi.log?.("[jev-manager] ENTERED - registering the jev tool");
  const z = pi.zod;
  pi.setLabel("Jev decision engine (local judge + indexed corpora)");
  pi.registerTool({
    name: "jev",
    label: "jev",
    loadMode: "essential",
    defaultInactive: false,
    description:
      "The local Jev decision engine: index a corpus, narrow it for FREE with keyless verbs, " +
      "then ask a calibrated question about the survivors. USE THIS BEFORE DECIDING ANYTHING " +
      "THAT IS A JUDGEMENT \u2014 classification, prioritisation, is-this-X, should-I-Y, which-of-N, " +
      "how-confident \u2014 and BEFORE reading many files to find the few that matter. " +
      "VERBS: index (build/refresh, keyless) \xB7 query (FTS/where, keyless) \xB7 scan (keyword+excerpt, " +
      "keyless) \xB7 cluster (signature groups, keyless) \xB7 extract (regex -> structured rows, keyless) \xB7 " +
      "report (index state, keyless) \xB7 filter (JUDGED narrowing with probabilities) \xB7 find (JUDGED " +
      "9-stage pattern chain) \xB7 decision-tree (JUDGED batch classification from a recipe) \xB7 " +
      "route (JUDGED tool selection) \xB7 evaluate (JUDGED calibration) \xB7 push-gate / st-detect / " +
      "spec-audit (mechanical gates). " +
      "THE JUDGE IS LOCAL AND FREE \u2014 no api key, no billing, no quota; ~100ms warm, ~22s for 100 " +
      "candidates in ONE request. " +
      "ASK ONE THING: a compound 'X or Y' question caps the score below 0.5 and clears no real " +
      "threshold. Sweep the threshold and read max/spread before you trust a min_p. " +
      "READ THE TREND on find: 'N judged \xB7 1 request' is healthy; 'N requests' means the " +
      "endpoint is the llama.cpp backend, not the adapter.",
    parameters: z.object({
      // `i` — the OMP harness intent field (kept per convention; not forwarded to the CLI).
      i: z.string().optional().describe("one line: what you are looking for and why"),
      verb: z
        .enum([...VERBS])
        .describe(
          "index|query|scan|cluster|extract|report|target|watch (keyless) | filter|find|" +
            "decision-tree|route|evaluate (judged) | push-gate|st-detect|spec-audit (gates)",
        ),
      index: z.string().optional().describe("index name (query/scan/cluster/extract/filter/report/watch --name)"),
      fts: z.string().optional().describe('FTS5 MATCH phrase, e.g. theatrical or "exact phrase"'),
      where: z.string().optional().describe("SQL predicate on the files row, e.g. size>20000"),
      lex: z.string().optional().describe("keyword for scan/cluster (excerpts returned)"),
      re: z.string().optional().describe("regex for scan/cluster/extract"),
      field: z.string().optional().describe("JSON field to pull (extract from jsonl/sqlite)"),
      question: z.string().optional().describe("filter/route: ONE specific claim. Compound 'X or Y' questions score mid-range and " + "clear nothing \u2014 state a single thing the text either is or is not"),
      phrase: z.string().optional().describe("find: the X to hunt across the corpus"),
      common: z.number().optional().describe("find: minimum support n for a pattern (default 2)"),
      min_p: z.number().optional().describe("decision threshold. DERIVE it: sweep 0.2/0.4/0.6/0.8 and read max + spread. " + "max < 0.5 means the QUESTION is broken, not the threshold"),
      limit: z.number().optional().describe("max rows (query/scan/filter)"),
      target: z.string().optional().describe("index: path or @target to ingest"),
      path: z.string().optional().describe("target subcommand argument"),
      rows: z.string().optional().describe("decision-tree: rows file (json array or jsonl)"),
      recipe: z.string().optional().describe("decision-tree: recipe file"),
      out: z.string().optional().describe("decision-tree: where to write the decisions"),
      cases: z.string().optional().describe("evaluate: cases file (json)"),
      questions: z.string().optional().describe("evaluate: questions file (json)"),
      qkey: z.string().optional().describe("evaluate: the question-key column name (--key)"),
      spec: z.string().optional().describe("spec-audit/push-gate: the spec.json path"),
      once: z.boolean().optional().describe("watch: a single reconcile tick (the daemon loop belongs in a terminal)"),
      k: z.number().optional().describe("evaluate: repetitions (--k)"),
      interval: z.number().optional().describe("watch: tick interval in ms"),
      json: z.boolean().optional().describe("machine-readable stdout (stderr is carried in details, never spliced)"),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      try {
        let binOk = false;
        try {
          const binReal = await realpath(JM_BIN);
          const st = await stat(binReal);
          // A file the group/world can rewrite is not a trusted executable (audit r4).
          binOk = st.isFile() && (st.mode & 0o022) === 0;
          if (binOk) await access(binReal, constants.X_OK);
        } catch {
          binOk = false;
        }
        if (!binOk) {
          return refusal("JEV_CLI_MISSING", `no executable jm at ${JM_BIN}. Install it (JARVIS_WORKSPACE/Shared_Workspace/JevManager) or set JM_BIN.`);
        }
        const verb = params.verb;
        if (!VERBS.includes(verb)) {
          return refusal("JEV_BAD_VERB", `${verb} is not a verb. Known: ${VERBS.join(", ")}`);
        }
        const cwd = ctx?.cwd || process.cwd();
        const resolvedParams = { ...params };
        if (verb === "filter" && !params.question) {
          return refusal("JEV_NEED_QUESTION", "filter needs `question` \u2014 ONE specific claim, not 'X or Y'.");
        }
        if (verb === "route" && !params.question) {
          return refusal("JEV_NEED_QUESTION", "route needs `question` \u2014 the task to route.");
        }
        if (verb === "find" && !params.phrase) {
          return refusal("JEV_NEED_PHRASE", "find needs `phrase` \u2014 the X to hunt.");
        }
        if (verb === "decision-tree" && (!params.rows || !params.recipe)) {
          return refusal("JEV_NEED_ROWS_RECIPE", "decision-tree needs both `rows` and `recipe`.");
        }
        if (verb === "index" && !params.target) {
          return refusal("JEV_NEED_TARGET", "index needs `target` \u2014 a path or @target name.");
        }
        if (verb === "index" && params.target && !params.target.startsWith("@")) {
          // A named path must exist before the ingest starts (audit r4) and is canonicalized (r6).
          const tPath = isAbsolute(params.target) ? params.target : resolve(cwd, params.target);
          try {
            await stat(tPath);
            resolvedParams.target = await realpath(tPath);
          } catch {
            return refusal("JEV_TARGET_MISSING", `target path not found: ${tPath}`);
          }
        }
        if (verb === "evaluate" && (!params.cases || !params.questions || !params.qkey)) {
          return refusal("JEV_NEED_EVAL_ARGS", "evaluate needs `cases`, `questions` and `qkey` (the question-key column).");
        }
        if (verb === "spec-audit" && !params.spec) {
          return refusal("JEV_NEED_SPEC", "spec-audit needs `spec` \u2014 the spec.json path.");
        }
        if (verb === "watch" && !params.once) {
          return refusal("JEV_WATCH_NEEDS_ONCE", "watch runs a daemon loop that outlives a tool call \u2014 pass once:true for a single tick, or run `jm watch` in a terminal.");
        }
        // INPUT SHAPE GUARDS (audit H4/M): leading '-' on guarded values; non-integer numerics.
        for (const f of DASH_GUARDED) {
          const v = params[f];
          if (typeof v === "string" && v.startsWith("-")) {
            return refusal("JEV_BAD_ARG", `${f} must not start with '-' (it would be parsed as a CLI flag): ${v}`);
          }
        }
        for (const f of NUMERIC_GUARDED) {
          const v = params[f];
          if (v !== undefined && (!Number.isInteger(v) || v < 0)) {
            return refusal("JEV_BAD_NUM", `${f} must be a non-negative integer`);
          }
        }
        if (params.min_p !== undefined && (!Number.isFinite(params.min_p) || params.min_p < 0 || params.min_p > 1)) {
          return refusal("JEV_BAD_NUM", "min_p must be within [0, 1]");
        }
        // FILE PARAMS: async stat + R_OK + realpath canonicalization — the CLI receives the
        // CANONICAL paths, so the checked and executed targets are the same string.
        const fileParams = [
          ["rows", params.rows],
          ["recipe", params.recipe],
          ["cases", params.cases],
          ["questions", params.questions],
          ["spec", params.spec],
        ];
        for (const [field, value] of fileParams) {
          if (!value) continue;
          const candidate = isAbsolute(value) ? value : resolve(cwd, value);
          let canonical;
          try {
            if (!(await stat(candidate)).isFile()) throw new Error("not a file");
            await access(candidate, constants.R_OK);
            canonical = await realpath(candidate);
          } catch {
            return refusal("JEV_FILE_MISSING", `${field} is not a readable file: ${candidate}`);
          }
          resolvedParams[field] = canonical;
        }
        if (params.out) {
          const candidate = isAbsolute(params.out) ? params.out : resolve(cwd, params.out);
          const parent = resolve(candidate, "..");
          let parentOk = false;
          try {
            parentOk = (await stat(parent)).isDirectory();
            if (parentOk) await access(parent, constants.W_OK);
          } catch {
            parentOk = false;
          }
          if (!parentOk) {
            return refusal("JEV_OUT_DIR_MISSING", `out parent is not a writable directory: ${parent}`);
          }
          resolvedParams.out = candidate;
        }
        if (JUDGE_NEEDED.has(verb)) {
          const bad = await ensureJudge(signal);
          if (bad) {
            if (bad === "__CALLER_CANCELLED__" || signal?.aborted) {
              return refusal("JEV_CANCELLED", "the call was cancelled by the caller");
            }
            return refusal("JEV_JUDGE_DOWN", `${bad}. Judged verbs cannot run. The keyless verbs still work (query/scan/extract/cluster).`);
          }
        }
        const args = buildArgs(resolvedParams);
        const { code, stdout, stderr, errno, signal: runSignal, killed } = await run(args, cwd, signal);
        // CALLER ABORT IS NOT AN EXIT (audit r3): an aborted execFile carries errno=ABORT_ERR /
        // a signal and no numeric code — it must not be dressed as a CLI failure.
        if (signal?.aborted) {
          return refusal("JEV_CANCELLED", "the call was cancelled by the caller");
        }
        // --json INTEGRITY: stdout raw in json mode; stderr carried in details; truncation flagged.
        const out = stdout.trim();
        const err = stderr.trim();
        const jsonMode = params.json === true;
        const errSuffix = err ? `\n[stderr]\n${err}` : "";
        const text = jsonMode ? out : [out, errSuffix].join("");
        const totalChars = text.length;
        const truncated = totalChars > MAX_OUT;
        const details = {
          ok: code === 0,
          verb,
          exit: code,
          errno,
          signal: runSignal,
          killed,
          args,
          truncated,
          totalChars,
          stderr: err || null,
        };
        if (code !== 0) {
          const why = [errno ? `errno=${errno}` : "", runSignal ? `signal=${runSignal}` : "", killed ? "killed=true" : ""]
            .filter(Boolean)
            .join(" ");
          if (jsonMode) {
            // A machine caller parses stdout: the failure is an in-band JSON envelope.
            return textResult(
              JSON.stringify({ ok: false, verb, exit: code, errno, signal: runSignal, killed, stderr: err ? truncate(err) : null, stdout: truncate(out) }),
              { ...details, ok: false },
            );
          }
          const first = (err || out).split("\n").find((l) => l.includes("JM_")) || err || out;
          const joined = [out, err ? `\n[stderr]\n${err}` : ""].join("");
          return textResult(truncate(`JEV_EXIT_${code}${why ? ` (${why})` : ""} (verb=${verb})\n${first}\n\n--- full ---\n${joined}`), { ...details, ok: false });
        }
        if (!text.trim()) {
          if (jsonMode) {
            // The machine caller gets the same envelope shape as every other failure (audit r6).
            return textResult(
              JSON.stringify({ ok: false, error: "JEV_EMPTY_OUTPUT", verb, exit: 0, errno: null, signal: null, killed: false, stderr: err ? truncate(err) : null, stdout: "" }),
              { ...details, ok: false },
            );
          }
          return textResult(`JEV_EMPTY_OUTPUT (verb=${verb}) \u2014 exit 0 with no output`, { ...details, ok: false });
        }
        if (jsonMode && truncated) {
          // A sliced JSON document is unparseable; the machine caller gets the SAME envelope shape.
          return textResult(
            JSON.stringify({ ok: false, error: "JEV_OUTPUT_TOO_LARGE", verb, exit: 0, errno: null, signal: null, killed: false, stderr: err ? truncate(err) : null, stdout: truncate(out) }),
            { ...details, ok: false },
          );
        }
        return textResult(
          truncate(text) + (truncated && !jsonMode ? `\n[truncated: shown ${MAX_OUT} of ${totalChars} chars]` : ""),
          details,
        );
      } catch (e) {
        return refusal("JEV_ERROR", String(e));
      }
    },
  });
  // ACTIVATION LAW: a resumed session restores its own active set, so a NEW tool can load
  // yet stay inactive (reachable only as an xd:// mount). The registering extension owns
  // activation (per the ToolDefinition contract). session_start fires after the runtime
  // binds, so this is the one moment the API is live. NOTE: any later setActiveToolsByName
  // (goal mode applies [...previousTools, "goal"]) can strip a late-registered tool, so we
  // also re-assert idempotently on before_agent_start — always with a receipt. SERIALIZED:
  // activations chain through one promise (factory scope), so concurrent hooks queue.
  let assertChain = Promise.resolve();
  function assertJev(tag, quietWhenPresent) {
    assertChain = assertChain.then(async () => {
      try {
        if (typeof pi.getActiveTools !== "function" || typeof pi.setActiveTools !== "function") return;
        const active = pi.getActiveTools();
        if (!Array.isArray(active)) return;
        if (!active.includes("jev")) {
          await pi.setActiveTools([...active, "jev"]);
          // VERIFY-AFTER-WRITE (audit r4): a concurrent writer can strip the addition between the
          // read and the write; re-read once and retry — a one-step compare-and-set.
          const after = pi.getActiveTools();
          if (Array.isArray(after) && !after.includes("jev")) {
            await pi.setActiveTools([...after, "jev"]);
          }
          console.error(`[jev-manager] jev ${tag}`);
        } else if (!quietWhenPresent) {
          console.error("[jev-manager] jev already in the active set");
        }
      } catch (e) {
        console.error("[jev-manager] activation skipped:", String(e));
      }
    });
    return assertChain;
  }
  if (typeof pi.on === "function") {
    pi.on("session_start", () => assertJev("activated into the session's tool set", false));
    pi.on("before_agent_start", () => assertJev("re-asserted into the active set", true));
  }
  console.error("[jev-manager] registered jev (loadMode=essential)");
  pi.log?.("[jev-manager] REGISTERED - the jev tool is in the surface");
}
export { jev_manager_default as default };

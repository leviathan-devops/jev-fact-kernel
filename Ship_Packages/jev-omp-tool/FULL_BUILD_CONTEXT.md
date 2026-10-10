# FULL_BUILD_CONTEXT — the jev OMP tool (ship package v1.0, 2026-10-07)

> The cold-start context for a fresh agent or engineer: everything needed to understand, operate,
> debug, and re-verify the jev OMP tool WITHOUT this session. The full source is embedded at the
> end (§8) — the key-files reference is the artifact itself, not a summary of it.

## 1 · PROJECT IDENTITY

- **The tool:** `jev` — the Jev decision engine as a first-class OMP tool. One native schema entry
  (27 params, 16 verbs) over the `jm` CLI. Keyless verbs narrow a corpus for FREE; judged verbs
  ask the LOCAL judge calibrated questions; three mechanical gates (push-gate/st-detect/spec-audit)
  enforce process law.
- **The engine:** the JevManager project — `jm` at `~/.local/bin/jm`; the index store at `~/.jm`
  (bun:sqlite, incremental by content sha); the judge at `127.0.0.1:8090/v1/systemone`
  (llama.cpp-backed; ~100ms warm; NO billing — the cost line is a SAVINGS figure).
- **The host:** OMP (`omp` binary) — the extension lives at
  `~/.omp/agent/extensions/jev-manager/` and is declared in `~/.omp/agent/config.yml`.
- **The lineage:** the tool was built 2026-10-04..07; the registration saga + the audit arc are
  the DEBUG_LOG's EN-115..117; the checkpoint
  `jm-jev-omp-tool-registration-hardened-verified-20261007` seals the verified state.

## 2 · ARCHITECTURE OVERVIEW

```
OMP session (TUI host)
  └─ wire tool schema (FROZEN at construction; rebuilt on setActiveTools)
       └─ `jev` (loadMode: essential, defaultInactive: false)
            └─ execute() pipeline:
                 0 the tool exists (async stat+X_OK+realpath+mode on JM_BIN)
                 1 per-verb required args → named refusals
                 1b input-shape guards (leading-dash · integers · min_p)
                 1c file params (stat.isFile + R_OK + realpath → canonical paths to the CLI)
                 2 judge warm-up for JUDGED + push-gate (bounded /health probe)
                 3 execFile(jm, args, {utf8, 180s, 32MB, pinned env})
                 4 evidence (exit truth · json envelopes · surrogate-safe truncation)
```

## 3 · THE REGISTRATION CONTRACT (the law — full detail in register/REGISTRATION.md)

1. `loadMode: "essential"` + `defaultInactive: false` — OMP force-includes the tool at session
   construction (`sdk.ts:2984-2997`); `essential` never mounts under `xd://` (`xdev.ts:81-84`).
2. The activation handlers own delivery across a live session's lifetime: `session_start` (both-
   branch receipt) + `before_agent_start` (serialized idempotent re-assert, CAS-verified) —
   because later `setActiveToolsByName` calls (goal mode's `[...previousTools,"goal"]`) can strip
   a late tool.
3. Receipts to `console.error`; stdout may be a protocol channel.

## 4 · OPERATIONAL KNOWLEDGE

- **Run it:** call the `jev` tool with a `verb`; keyless first (`query`/`scan`/`extract`), judged
  when a calibrated answer is needed (`filter`/`find`/`decision-tree`).
- **The threshold law:** ask ONE claim per question (compound 'X or Y' caps below 0.5); sweep
  `min_p` and read max/spread; `max < 0.5` means the QUESTION is broken.
- **The judge:** local + free; the first call after idle costs ~54s (VRAM reload) — the wrapper
  pre-warms with a bounded /health probe; a down judge refuses `JEV_JUDGE_DOWN` by name.
- **The store:** `~/.jm`; `report` shows index/ledger state; `JM_HOME` overrides.

## 5 · THE MEASURED TRAPS (do not relearn these)

1. **The stale-process trap:** a running OMP never re-reads extension files. After ANY change:
   restart. Check `stat -c %y <file>` vs `ps -o lstart <pid>` FIRST.
2. **The model self-report trap:** "not in my tool list" is NOT evidence. `/dump` (the wire
   schema) or the transcript's toolCalls is.
3. **The silent-handler trap:** an activation handler that only logs when it ACTS hides the
   present-then-stripped case. Log both branches.
4. **The xd:// fallback trap:** a `discoverable` tool still EXECUTES via `write xd://jev {...}` —
   a working call is not proof of top-level registration. Verify the wire schema.

## 6 · COMPACTION RECOVERY GUIDE

A fresh agent resuming this work:
1. Read this file + register/REGISTRATION.md + artifacts/AUDIT_LEDGER.md.
2. Verify the install: `bash register/verify-registration.sh` (fresh-boot receipts) + a `/dump`
   wire-schema grep for `"name":"jev"`.
3. The audit retry (lane-blocked): `qwen-code-audit scan provider=poolside-laguna-s` over a
   two-file scratch repo; adjudicate any findings with probes.
4. The known open items: the audit lane retry; the three declined findings (documented); the
   optional .bak cleanup in the live extension dir.

## 7 · KNOWN BUGS / HONEST GAPS

- The audit's later rounds BLOCKED (lane) — retry named; the gate is NOT claimed PASS.
- The three declined findings carry their evidence (SQL passthrough — the CLI binds parameters;
  `out` containment — the CLI's contract; target traversal — the tool's indexing purpose).
- The runtime dependency (`jm`) is not vendored in this package — the checkpoint carries the
  engine's full source tree; DEPLOY.sh points at it.

## 8 · KEY FILES REFERENCE — THE FULL SOURCE (index.ts.source, embedded verbatim)

```ts
// jev-manager — the Jev decision engine as a FIRST-CLASS OMP tool, sibling to bash/grep/read.
// Auto-discovered from ~/.omp/agent/extensions/jev-manager/index.ts
//
// WHY A NATIVE TOOL AND NOT ONLY THE MCP SERVER:
//   The MCP surface carries 4 tools (index/query/find/decide). The CLI carries the rest of the
//   engine — scan, cluster, extract, filter, decision-tree, route, evaluate, push-gate. A native
//   tool has no MCP process to spawn, no schema tax on every turn, and it can pin the endpoint in
//   its own env (the hook lesson: an env the author does not control is an env that silently
//   points at the wrong endpoint).
//
// THE JUDGE IS LOCAL AND FREE. Nothing here bills. The `cost_usd` field the CLI prints is
// computed as tokens x the HOSTED api's published rate — a SAVINGS figure, never a charge.
//
// AUDIT HARDENING (2026-10-07; qwen-code-audit sessions 685c7e4d + 970204df → all critical/high fixed):
//   · buildArgs completed for evaluate/watch/spec-audit/push-gate/st-detect (H1)
//   · file params validated: statSync.isFile + R_OK + leading-dash guards + out-parent isDirectory (H2/H4)
//   · timeout/abort/errno are FAILURES, never exit 0 — errno/signal/killed surfaced (H3)
//   · --json integrity: raw stdout only (no stderr splice, no marker), surrogate-safe truncation,
//     stderr carried in details (H-r2)
//   · caller abort is JEV_CANCELLED, never JEV_JUDGE_DOWN (H-r1)
//   · judge probe: finally-cleanup + non-JSON body named + abort distinguished (M)
//   · JUDGE_BASE trailing-slash safe + JM_JUDGE_HEALTH_URL override (M/low)
//   · activation re-assert SERIALIZED through a promise chain (factory-scope, one per load) (M)
//   · pi surface guarded: on/getActiveTools/setActiveTools checked with typeof (M)
//   · watch without `once` refuses (the daemon loop outlives this wrapper) (M)
//   · route requires `question` like filter (M) · explicit 0 forwarded for limit/common (low)
//   · `i` DECLINED as a defect: the OMP harness intent field, kept, deliberately not forwarded.
import { execFile } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import { homedir } from "node:os";
import { constants } from "node:fs";
import { stat, access, realpath } from "node:fs/promises";

const JM_BIN = process.env.JM_BIN || resolve(homedir(), ".local/bin/jm");
const JM_HOME = process.env.JM_HOME || resolve(homedir(), ".jm");
// PINNED, NOT INHERITED. An unset JM_JUDGE_URL sends every judged call to the public api, which
// answers HTTP 402 (terminal by design, never retried). The tool owns its endpoint.
const JM_JUDGE_URL = process.env.JM_JUDGE_URL || "http://127.0.0.1:8090/v1/systemone";
// Trailing-slash safe: any base form resolves to the same probe target. A non-standard deployment
// under a different prefix overrides the probe URL outright (audit low).
const JUDGE_BASE = (() => {
  let base = JM_JUDGE_URL.replace(/\/+$/, "");
  if (base.endsWith("/v1/systemone")) base = base.slice(0, -"/v1/systemone".length);
  return base.replace(/\/+$/, "");
})();
const JUDGE_HEALTH_URL = process.env.JM_JUDGE_HEALTH_URL || `${JUDGE_BASE}/health`;

const MAX_OUT = 48_000;

// Keyless verbs cost nothing and never touch the judge. Judged verbs do. push-gate drives the
// Judge inside the CLI, so it joins the probe set (audit M); spec-audit/st-detect are pure.
const KEYLESS = ["index", "query", "scan", "cluster", "extract", "report", "target", "watch"] as const;
const JUDGED = ["filter", "find", "decision-tree", "route", "evaluate"] as const;
const GATES = ["push-gate", "st-detect", "spec-audit"] as const;
const VERBS = [...KEYLESS, ...JUDGED, ...GATES] as const;
type Verb = (typeof VERBS)[number];

// A Set, not a plain object: `JUDGED_SET["toString"]` on an object literal is truthy via the
// prototype (audit M) — a Set has no prototype surface.
const JUDGED_SET = new Set<string>(JUDGED);
const JUDGE_NEEDED = new Set<string>([...JUDGED_SET, "push-gate"]);

// Fields whose values must never begin with '-' — they are pushed positionally, as bare paths, or
// as option values a hand-rolled parser may re-scan for flags (audit H4 + follow-up M).
const DASH_GUARDED = [
  "target", "phrase", "index", "path", "spec", "rows", "recipe", "out", "cases", "questions", "qkey",
  "fts", "where", "lex", "re", "field", "question",
] as const;
const NUMERIC_GUARDED = ["limit", "common", "k", "interval"] as const;

function textResult(text: string, details: Record<string, unknown> = {}) {
  return { content: [{ type: "text" as const, text }], details };
}

// Surrogate-safe byte-cap slice. The old marker was an HTML comment appended to sliced stdout,
// which corrupted --json exactly when output was large (audit M/r2). Truncation is reported in
// `details` (truncated/totalChars) and, for human-mode output only, as a plain trailing line.
function truncate(s: string): string {
  if (s.length <= MAX_OUT) return s;
  let end = MAX_OUT;
  const last = s.charCodeAt(end - 1);
  // A trailing HIGH surrogate is the orphan (its low partner sits past the cut) — drop it. A
  // trailing LOW surrogate means its high partner is INSIDE the slice — the pair is complete,
  // and decrementing would orphan the high half instead (audit r6).
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return s.slice(0, end);
}

/** A LOUD, NAMED REFUSAL. Every failure path returns one of these — never a bare stack. */
function refusal(code: string, message: string, extra: Record<string, unknown> = {}) {
  return textResult(`${code}: ${message}`, { ok: false, error: code, ...extra });
}

interface RunResult {
  code: number;
  errno: string | null;
  signal: string | null;
  killed: boolean;
  stdout: string;
  stderr: string;
}

function run(args: string[], cwd: string, signal?: AbortSignal, timeoutMs = 180_000) {
  return new Promise<RunResult>((res) => {
    execFile(
      JM_BIN,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 32_000_000,
        signal,
        cwd,
        // EXPLICIT UTF-8 (audit r6): without it, Node's child_process yields Buffers and the
        // string helpers downstream (charCodeAt/slice/trim) break. Bun defaults to utf8, but the
        // contract must not depend on the runtime's default.
        encoding: "utf8",
        env: {
          ...process.env,
          JM_HOME,
          JM_JUDGE_URL,
          // `jm` writes the human-readable cost line to stderr; stdout stays clean JSON.
          // A caller merging the two produces a parse failure, so keep them separate here.
          NO_COLOR: "1",
        },
      },
      (err: unknown, stdout: string, stderr: string) => {
        // EXIT TRUTH (audit H3): a timeout-kill or AbortSignal abort carries NO numeric `code`
        // (execFile sets killed/signalCode instead), and `e?.code ?? 0` mapped that to exit 0 —
        // a caller saw ok:true over a dead run. err present => failure; the errno string and the
        // signal are surfaced instead of being flattened.
        const e = err as { code?: number | string; signal?: string; killed?: boolean } | null;
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

/** THE WARM-UP. The first call after idle costs ~54 s (the model reloads to VRAM) and can trip
 *  JM_JUDGE_RETRY_EXHAUSTED. A bounded /health probe before a judged run removes the class.
 *  (Audit: the timer + the abort listener are released on EVERY path — finally — a non-JSON body
 *  is named, and a CALLER cancellation is reported as such, never as an outage.) */
async function ensureJudge(signal?: AbortSignal): Promise<string | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 90_000);
  const onAbort = () => ac.abort();
  try {
    if (signal) {
      if (signal.aborted) ac.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
    const r = await fetch(JUDGE_HEALTH_URL, { signal: ac.signal });
    if (!r.ok) return `the judge at ${JUDGE_BASE} answered HTTP ${r.status}`;
    let body: { ok?: boolean; model?: string };
    try {
      body = (await r.json()) as { ok?: boolean; model?: string };
    } catch {
      return `the judge at ${JUDGE_BASE} answered a non-JSON body`;
    }
    if (body.ok !== true) return `the judge at ${JUDGE_BASE} reported ${JSON.stringify(body)}`;
    return null;
  } catch (e) {
    // CALLER ABORT IS NOT AN OUTAGE (audit r1): the caller's signal aborted the probe.
    if (signal?.aborted) return "__CALLER_CANCELLED__";
    return `the judge at ${JUDGE_BASE} is unreachable (${String(e)})`;
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", onAbort);
  }
}

interface JevParams {
  i?: string;
  verb: Verb;
  index?: string;
  fts?: string;
  where?: string;
  lex?: string;
  re?: string;
  field?: string;
  question?: string;
  phrase?: string;
  common?: number;
  min_p?: number;
  limit?: number;
  target?: string;
  path?: string;
  rows?: string;
  recipe?: string;
  out?: string;
  cases?: string;
  questions?: string;
  qkey?: string;
  spec?: string;
  once?: boolean;
  k?: number;
  interval?: number;
  json?: boolean;
}

function buildArgs(params: JevParams): string[] {
  const a: string[] = [params.verb];
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
    // ── COMPLETED COVERAGE (audit H1): these five verbs previously fell through to `default`
    //    and ran as bare `jm <verb> [--json]` with every verb-specific param silently dropped.
    case "evaluate":
      // jm evaluate --cases F --questions F --key K [--k N]   (the calibration metrics verb)
      if (p.cases) a.push("--cases", p.cases);
      if (p.questions) a.push("--questions", p.questions);
      if (p.qkey) a.push("--key", p.qkey);
      if (p.k !== undefined) a.push("--k", String(p.k));
      break;
    case "watch":
      // jm watch [--once] [--interval MS] [--name I]   (single tick only — see the execute guard)
      if (p.once) a.push("--once");
      if (p.interval !== undefined) a.push("--interval", String(p.interval));
      if (p.index) a.push("--name", p.index);
      break;
    case "spec-audit":
      // jm spec-audit <spec.json>   (positional)
      if (p.spec) a.push(p.spec);
      break;
    case "push-gate":
      // jm push-gate [--spec F]   (cwd-scoped checklist; optional spec components)
      if (p.spec) a.push("--spec", p.spec);
      break;
    case "st-detect":
      // jm st-detect   (cwd-scoped; no args)
      break;
    default:
      break;
  }
  if (p.json) a.push("--json");
  return a;
}

export default function (pi: {
  zod: { object: Function; string: Function; number: Function; boolean: Function; enum: Function };
  setLabel: (s: string) => void;
  registerTool: (t: Record<string, unknown>) => void;
  getActiveTools?: () => string[];
  setActiveTools?: (names: string[]) => Promise<void>;
  on?: (event: string, handler: () => void | Promise<void>) => void;
  log?: (...args: unknown[]) => void;
}) {
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
      "THAT IS A JUDGEMENT — classification, prioritisation, is-this-X, should-I-Y, which-of-N, " +
      "how-confident — and BEFORE reading many files to find the few that matter. " +
      "VERBS: index (build/refresh, keyless) · query (FTS/where, keyless) · scan (keyword+excerpt, " +
      "keyless) · cluster (signature groups, keyless) · extract (regex -> structured rows, keyless) · " +
      "report (index state, keyless) · filter (JUDGED narrowing with probabilities) · find (JUDGED " +
      "9-stage pattern chain) · decision-tree (JUDGED batch classification from a recipe) · " +
      "route (JUDGED tool selection) · evaluate (JUDGED calibration) · push-gate / st-detect / " +
      "spec-audit (mechanical gates). " +
      "THE JUDGE IS LOCAL AND FREE — no api key, no billing, no quota; ~100ms warm, ~22s for 100 " +
      "candidates in ONE request. " +
      "ASK ONE THING: a compound 'X or Y' question caps the score below 0.5 and clears no real " +
      "threshold. Sweep the threshold and read max/spread before you trust a min_p. " +
      "READ THE TREND on find: 'N judged · 1 request' is healthy; 'N requests' means the " +
      "endpoint is the llama.cpp backend, not the adapter.",
    parameters: z.object({
      // `i` — the OMP harness intent field (per-call convention on every tool). It is deliberately
      // NOT forwarded to the CLI: the engine has no use for it, and dropping it from the schema
      // would violate the harness convention. (Audit M "dead param" — DECLINED, reason above.)
      i: z.string().optional().describe("one line: what you are looking for and why"),
      verb: z
        .enum([...VERBS])
        .describe(
          "index|query|scan|cluster|extract|report|target|watch (keyless) | filter|find|" +
            "decision-tree|route|evaluate (judged) | push-gate|st-detect|spec-audit (gates)",
        ),
      index: z.string().optional().describe("index name (query/scan/cluster/extract/filter/report/watch --name)"),
      fts: z.string().optional().describe("FTS5 MATCH phrase, e.g. theatrical or \"exact phrase\""),
      where: z.string().optional().describe("SQL predicate on the files row, e.g. size>20000"),
      lex: z.string().optional().describe("keyword for scan/cluster (excerpts returned)"),
      re: z.string().optional().describe("regex for scan/cluster/extract"),
      field: z.string().optional().describe("JSON field to pull (extract from jsonl/sqlite)"),
      question: z
        .string()
        .optional()
        .describe(
          "filter/route: ONE specific claim. Compound 'X or Y' questions score mid-range and " +
            "clear nothing — state a single thing the text either is or is not",
        ),
      phrase: z.string().optional().describe("find: the X to hunt across the corpus"),
      common: z.number().optional().describe("find: minimum support n for a pattern (default 2)"),
      min_p: z
        .number()
        .optional()
        .describe(
          "decision threshold. DERIVE it: sweep 0.2/0.4/0.6/0.8 and read max + spread. " +
            "max < 0.5 means the QUESTION is broken, not the threshold",
        ),
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
    async execute(
      _toolCallId: string,
      params: JevParams,
      signal?: AbortSignal,
      _onUpdate?: unknown,
      ctx?: { cwd?: string },
    ) {
      try {
        // ── 0 · THE TOOL EXISTS (audit r3: isFile + X_OK — a directory or a non-executable
        //    refuses by NAME here instead of surfacing later as an opaque errno) ───────────────
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
          return refusal(
            "JEV_CLI_MISSING",
            `no executable jm at ${JM_BIN}. Install it (JARVIS_WORKSPACE/Shared_Workspace/JevManager) or set JM_BIN.`,
          );
        }
        const verb = params.verb;
        if (!(VERBS as readonly string[]).includes(verb)) {
          return refusal("JEV_BAD_VERB", `${verb} is not a verb. Known: ${VERBS.join(", ")}`);
        }
        const cwd = ctx?.cwd || process.cwd();
        const resolvedParams: JevParams = { ...params };

        // ── 1 · ARGS BEFORE THE TOOL (the most common failure cause is the wrong input) ────────
        if (verb === "filter" && !params.question) {
          return refusal(
            "JEV_NEED_QUESTION",
            "filter needs `question` — ONE specific claim, not 'X or Y'.",
          );
        }
        if (verb === "route" && !params.question) {
          return refusal("JEV_NEED_QUESTION", "route needs `question` — the task to route.");
        }
        if (verb === "find" && !params.phrase) {
          return refusal("JEV_NEED_PHRASE", "find needs `phrase` — the X to hunt.");
        }
        if (verb === "decision-tree" && (!params.rows || !params.recipe)) {
          return refusal("JEV_NEED_ROWS_RECIPE", "decision-tree needs both `rows` and `recipe`.");
        }
        if (verb === "index" && !params.target) {
          return refusal("JEV_NEED_TARGET", "index needs `target` — a path or @target name.");
        }
        if (verb === "index" && params.target && !params.target.startsWith("@")) {
          // A named path must exist before the ingest starts (audit r4) and is canonicalized like
          // every other path param (audit r6) — the CLI receives the canonical target.
          const tPath = isAbsolute(params.target) ? params.target : resolve(cwd, params.target);
          try {
            await stat(tPath);
            resolvedParams.target = await realpath(tPath);
          } catch {
            return refusal("JEV_TARGET_MISSING", `target path not found: ${tPath}`);
          }
        }
        if (verb === "evaluate" && (!params.cases || !params.questions || !params.qkey)) {
          return refusal(
            "JEV_NEED_EVAL_ARGS",
            "evaluate needs `cases`, `questions` and `qkey` (the question-key column).",
          );
        }
        if (verb === "spec-audit" && !params.spec) {
          return refusal("JEV_NEED_SPEC", "spec-audit needs `spec` — the spec.json path.");
        }
        if (verb === "watch" && !params.once) {
          // The daemon loop outlives this wrapper (the per-call ceiling kills it as JEV_EXIT_*).
          // Single ticks are the supported shape here; the loop belongs in a terminal.
          return refusal(
            "JEV_WATCH_NEEDS_ONCE",
            "watch runs a daemon loop that outlives a tool call — pass once:true for a single tick, or run `jm watch` in a terminal.",
          );
        }

        // ── 1b · INPUT SHAPE GUARDS (audit H4/M): a leading '-' on any guarded value is a CLI
        //    flag in disguise; non-integer numerics are backend errors in disguise. Both are
        //    refused by name BEFORE the subprocess starts. ─────────────────────────────────────
        const raw = params as unknown as Record<string, unknown>;
        for (const f of DASH_GUARDED) {
          const v = raw[f];
          if (typeof v === "string" && v.startsWith("-")) {
            return refusal(
              "JEV_BAD_ARG",
              `${f} must not start with '-' (it would be parsed as a CLI flag): ${v}`,
            );
          }
        }
        for (const f of NUMERIC_GUARDED) {
          const v = raw[f];
          if (v !== undefined && (!Number.isInteger(v) || (v as number) < 0)) {
            return refusal("JEV_BAD_NUM", `${f} must be a non-negative integer`);
          }
        }
        if (params.min_p !== undefined && (!Number.isFinite(params.min_p) || params.min_p < 0 || params.min_p > 1)) {
          return refusal("JEV_BAD_NUM", "min_p must be within [0, 1]");
        }

        // ── 1c · FILE PARAMS EXIST AND ARE FILES (audit H2 + r2/r3): async stat + R_OK +
        //    realpath canonicalization — the CLI receives the CANONICAL paths, so the checked
        //    and executed targets are the same string. (A swap between check and exec is
        //    inherent to path-based input; the canonical target narrows the window.) ──────────
        const fileParams: Array<[string, string | undefined]> = [
          ["rows", params.rows],
          ["recipe", params.recipe],
          ["cases", params.cases],
          ["questions", params.questions],
          ["spec", params.spec],
        ];
        for (const [field, value] of fileParams) {
          if (!value) continue;
          const candidate = isAbsolute(value) ? value : resolve(cwd, value);
          let canonical: string;
          try {
            if (!(await stat(candidate)).isFile()) throw new Error("not a file");
            await access(candidate, constants.R_OK);
            canonical = await realpath(candidate);
          } catch {
            return refusal("JEV_FILE_MISSING", `${field} is not a readable file: ${candidate}`);
          }
          (resolvedParams as unknown as Record<string, unknown>)[field] = canonical;
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

        // ── 2 · WARM THE JUDGE BEFORE A JUDGED RUN (the ~54 s cold start) ──────────────────────
        if (JUDGE_NEEDED.has(verb)) {
          const bad = await ensureJudge(signal);
          if (bad) {
            if (bad === "__CALLER_CANCELLED__" || signal?.aborted) {
              return refusal("JEV_CANCELLED", "the call was cancelled by the caller");
            }
            return refusal(
              "JEV_JUDGE_DOWN",
              `${bad}. Judged verbs cannot run. The keyless verbs still work (query/scan/extract/cluster).`,
            );
          }
        }

        // ── 3 · THE RUN ────────────────────────────────────────────────────────────────────────
        const args = buildArgs(resolvedParams);
        // The cold-start probe already warmed the model, so the per-call ceiling can be generous
        // without inviting a hung run.
        const { code, stdout, stderr, errno, signal: runSignal, killed } = await run(args, cwd, signal);
        // CALLER ABORT IS NOT AN EXIT (audit r3): an aborted execFile carries errno=ABORT_ERR /
        // a signal and no numeric code — it must not be dressed as a CLI failure.
        if (signal?.aborted) {
          return refusal("JEV_CANCELLED", "the call was cancelled by the caller");
        }

        // ── 4 · EVIDENCE, ALWAYS — even on a refusal. The caller needs the named error. ────────
        // --json INTEGRITY (audit r2): stdout is returned RAW in json mode — stderr is carried in
        // `details.stderr` instead of being spliced into the payload, and truncation is flagged
        // rather than annotated. Human mode keeps the concatenated form.
        const out = stdout.trim();
        const err = stderr.trim();
        const jsonMode = params.json === true;
        const errSuffix = err ? `\n[stderr]\n${err}` : "";
        const text = jsonMode ? out : [out, errSuffix].join("");
        const totalChars = text.length;
        const truncated = totalChars > MAX_OUT;
        const details: Record<string, unknown> = {
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
            // A machine caller parses stdout: the failure is an in-band JSON envelope, never a
            // spliced human string (audit r3).
            return textResult(
              JSON.stringify({
                ok: false,
                verb,
                exit: code,
                errno,
                signal: runSignal,
                killed,
                stderr: err ? truncate(err) : null,
                stdout: truncate(out),
              }),
              { ...details, ok: false },
            );
          }
          const first = (err || out).split("\n").find((l) => l.includes("JM_")) || err || out;
          const joined = [out, err ? `\n[stderr]\n${err}` : ""].join("");
          return textResult(
            truncate(`JEV_EXIT_${code}${why ? ` (${why})` : ""} (verb=${verb})\n${first}\n\n--- full ---\n${joined}`),
            { ...details, ok: false },
          );
        }
        if (!text.trim()) {
          if (jsonMode) {
            // The machine caller gets the same envelope shape as every other failure (audit r6).
            return textResult(
              JSON.stringify({
                ok: false,
                error: "JEV_EMPTY_OUTPUT",
                verb,
                exit: 0,
                errno: null,
                signal: null,
                killed: false,
                stderr: err ? truncate(err) : null,
                stdout: "",
              }),
              { ...details, ok: false },
            );
          }
          return textResult(`JEV_EMPTY_OUTPUT (verb=${verb}) — exit 0 with no output`, {
            ...details,
            ok: false,
          });
        }
        if (jsonMode && truncated) {
          // A sliced JSON document is unparseable; the machine caller gets the SAME envelope
          // shape as every other failure (audit r4) — never a bare text line.
          return textResult(
            JSON.stringify({
              ok: false,
              error: "JEV_OUTPUT_TOO_LARGE",
              verb,
              exit: 0,
              errno: null,
              signal: null,
              killed: false,
              stderr: err ? truncate(err) : null,
              stdout: truncate(out),
            }),
            { ...details, ok: false },
          );
        }
        return textResult(
          truncate(text) +
            (truncated && !jsonMode ? `\n[truncated: shown ${MAX_OUT} of ${totalChars} chars]` : ""),
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
  // also re-assert idempotently on before_agent_start — always with a receipt.
  // SERIALIZED (audit M): activations chain through one promise (factory scope — one chain per
  // extension load), so a before_agent_start racing session_start queues instead of clobbering.
  let assertChain: Promise<void> = Promise.resolve();
  function assertJev(tag: string, quietWhenPresent: boolean): Promise<void> {
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
  // The host surface is optional (audit M): a host without `on` must not throw at module init.
  if (typeof pi.on === "function") {
    pi.on("session_start", () => assertJev("activated into the session's tool set", false));
    pi.on("before_agent_start", () => assertJev("re-asserted into the active set", true));
  }
  console.error("[jev-manager] registered jev (loadMode=essential)");
  pi.log?.("[jev-manager] REGISTERED - the jev tool is in the surface");
}
```

## 9 · THE BUNDLE (index.js) — THE DEPLOYED ARTIFACT

The byte-identical behavior of the source above, compiled to the bundle form (the file that actually loads). Delivered as `register/jev-manager/index.js` (sha256 `64d69fa2…`).

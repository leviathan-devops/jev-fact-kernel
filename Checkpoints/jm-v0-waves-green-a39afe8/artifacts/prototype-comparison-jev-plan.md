# THE PROTOTYPE COMPARISON — and the one capability JM genuinely lacks

**Origin.** A web agent built `omp-jev-plan` in ~30 minutes after reading a chat history of
derailments (`Downloads/omp-jev-plan.zip`, `Downloads/JEV_PLAN_SETUP_AND_OPERATORS_MANUAL.md`).
Audited by a fresh subagent (read-only), then every load-bearing claim re-verified first-hand by the
primary agent. This file records the comparison because ONE of its findings bears directly on the
parked W8 layer and the operator's F1/F6 ruling.

---

## PART 1 — THE INVENTORY, MEASURED

```
$ find /tmp/jevproto/omp-jev-plan -type f
  ./FORENSIC.md                                  38 L
  ./package.json                                 13 L
  ./README.md                                    80 L
  ./extensions/jev-plan.ts                      656 L
  ./skills/jev-plan/SKILL.md                     30 L
  ./JEV_PLAN_SETUP_AND_OPERATORS_MANUAL.md      427 L
  --------------------------------------------- 1,244 L total
```

**`package.json`, verbatim — NO `scripts` key at all:**

```json
{
  "name": "omp-jev-plan",
  "version": "0.1.0",
  "private": true,
  "description": "Host-side Jev plan lock and decision gates for Oh My Pi",
  "license": "MIT",
  "omp": {
    "install": [
      { "src": "extensions/jev-plan.ts", "dest": "agent/extensions/jev-plan.ts" },
      { "src": "skills/jev-plan/SKILL.md", "dest": "agent/skills/jev-plan/SKILL.md" }
    ]
  }
}
```

**There are no test files.** `find . -name '*test*'` returns nothing; every "test" hit in the source is
the English word inside a prompt string.

---

## PART 2 — IT RUNS. VERIFIED, NOT ASSERTED.

A fake OMP host was built (`pi.registerCommand` / `pi.on` / `pi.registerTool` / a `zod` proxy) and the
extension loaded against it:

```
$ bun /tmp/fakehost2.ts
  COMMANDS (5): jev-plan, jev-status, jev-unlock, jev-off, jev-on
  HOOKS    (5): session_start, input, before_agent_start, tool_result, tool_call
```

Its gates were then probed with no `TYPESAFE_API_KEY` set:

```
  write a file with NO code            -> BLOCKED
  write a file WITH code               -> BLOCKED
  bash: an rm command                  -> allowed
  bash: a normal build command         -> allowed
  spawn a subagent                     -> BLOCKED
```

**It is a real, runnable interceptor.** The mechanism, verbatim:

```ts
// extensions/jev-plan.ts:514-524
function block(_ctx: unknown, s: SessionState, reason: string) {
  s.blocks += 1;
  s.lastBlock = reason;
  persist();
  try {
    pi.sendMessage(
      { customType: "jev-plan-block", content: `[jev-plan BLOCK] ${reason}`, display: true, attribution: "jev-plan" },
      { triggerTurn: false },
    );
  } catch {
    /* ignore */
  }
  return { block: true, reason: `[jev-plan] ${reason}` };
}
```

It is not a document and not a scaffold — it executes and it blocks.

---

## PART 3 — ITS OWN HEADER, VERBATIM (what it claims to be)

```ts
/**
 * omp-jev-plan — host-side plan lock + decision gates.
 * Jev judges. This file blocks. The coding model does not self-grade.
 *
 * Copy to ~/.omp/agent/extensions/jev-plan.ts and /reload.
 * Requires TYPESAFE_API_KEY. Fail-closed on write/task/complete if Jev is down.
 */
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const MODEL = process.env.JEV_MODEL || "jev-1.13.0";
const ENDPOINT = process.env.TYPESAFE_URL || "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 8_000;

const WRITE_TOOLS = new Set(["write", "edit", "replace", "apply_patch", "create_file", "notebook_edit"]);
const SPAWN_TOOLS = new Set(["task", "subagent", "default.task"]);
const COMPLETE_TOOLS = new Set(["complete_goal", "goal", "update_goal"]);
const READ_TOOLS = new Set(["read", "grep", "find", "ls", "glob", "search"]);

const THEATRICAL_NAMES =
  /^(Warhead|ProofLock|FallHunter|FallAuditor|BlindReprobe|Theatricality|RipwireOpenGrokPlan)/i;
```

## PART 3b — ITS STATE MACHINE, VERBATIM

```ts
type Intent = "answer" | "plan" | "implement" | "port" | "audit" | "stop";

type Lock = {
  text: string;
  lockedAt: string;
  scores: Record<string, unknown>;
};

type SessionState = {
  enabled: boolean;
  lastUser: string;
  lastUserAt: string;
  intent: Intent;                 // the classified turn
  intentConfidence: number;
  lock: Lock | null;              // the /jev-plan lock, required before writes
  inFlightSpawns: number;         // the spawn cap counter
  lastBlock: string;
  blocks: number;
};

type JevAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: "score"; score: number; confidence: number };
```

Six intents, a lock gate, a spawn counter. That is the whole design — and it is a **real** design, in
656 lines, with no tests.

---

## PART 4 — THE CAPABILITY MATRIX (every row measured)

| dimension | omp-jev-plan | JevManager | evidence |
|---|---|---|---|
| source | 656 L, 1 file | 4,329 L, 34 files | `wc -l`, `git ls-files` |
| tests | **0** | 224 pass / 0 fail, 44 files | `find -name '*test*'` → empty; `bun test` |
| corpus search | **ABSENT** | FTS5 + chunking, 124/124 files | `grep -c "sqlite\|fts\|corpus"` → 0 |
| judge client | PRESENT — `jev-1.13.0`, `api.typesafe.ai/v1/systemone:13`, key `TYPESAFE_API_KEY\|JEV_API_KEY:183` | PRESENT, live-verified | `:12-13,183` |
| **cache** | **ABSENT** — `grep -c cache` → **0**; a fresh `fetch` per call (`:188`) | dedup, measured 100 calls → 0 | rig T3 |
| ledger | PARTIAL — `decisions.jsonl` + `state.json`, **no cost field** (`grep -c cost` → 0) | `ledger.jsonl` + cost + calls | `:62,101` |
| **budget** | **ABSENT** — `grep -c "budget\|Budget"` → **0** | calls + usd caps, enforced + key-validated | rig T6 |
| policy | writes fail-closed `:508-511`, reads fail-open `:476` | fatal for missing KEY **and** unmeasured COST | README:64-65 |
| surfaces | **1** (the OMP extension) | 4 (CLI / HTTP / MCP / daemon) | — |
| verbs | 5 commands + 5 hooks | 17 CLI verbs + 4 MCP tools | `jm` usage dump |
| spec | a 427-line manual, thresholds *"calibrate later"* | DPL1 spec §8 C1–C20 binding | — |
| independent audit | **ABSENT** (`FORENSIC.md` is its INPUT) | 3 passes, 263 findings | `artifacts/audit-*` |

The grep evidence, verbatim:

```
$ cd /tmp/jevproto/omp-jev-plan
$ for k in cache Cache budget Budget ledger decisions.jsonl cost; do
    printf "  %-16s %s hit(s)\n" "$k" "$(grep -c "$k" extensions/jev-plan.ts)"
  done
  cache            0 hit(s)
  Cache            0 hit(s)
  budget           0 hit(s)
  Budget           0 hit(s)
  ledger           0 hit(s)
  decisions.jsonl  1 hit(s)
  cost             0 hit(s)
```

---

## PART 5 — **THE FINDING THAT MATTERS: IT CAN BLOCK A TOOL CALL. JM CANNOT.**

```
┌─ THE ONE REAL GAP ──────────────────────────────────────────────────────┐
│                                                                         │
│  omp-jev-plan   pi.on("tool_call") -> { block: true }                   │
│    A HOST-LEVEL MECHANICAL INTERCEPTOR. The coding model cannot          │
│    override it. The write does not happen.                              │
│                                                                         │
│  JevManager     guides what the model CHOOSES to call (filter/find/     │
│    decision-tree/route), and refuses its OWN operations — but it has    │
│    NO hook into another process's tool surface. If the model decides    │
│    to write a fabricated report, JM's verdict is advisory to it, not    │
│    law.                                                                 │
│                                                                         │
│  THE OPERATOR'S REQUIREMENT, VERBATIM:                                  │
│    "jev in the loop evidence-action based FIREWALLS"                    │
│  -> the prototype has the FIREWALL half. JM has the DECISION-ENGINE     │
│     half. They are COMPLEMENTARY, not competing.                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**This is exactly what the parked W8 layer (C15–C18, the fire gate) is specified to be.** That layer is
blocked on the operator's F1/F6 rulings, **not on capability** — and the prototype is 30-minute
evidence that the layer is buildable, alongside evidence about what it looks like when built thin.

---

## PART 6 — AND ITS DEFECT, WHICH IS JM'S CENTRAL LESSON

```ts
// extensions/jev-plan.ts:212
function noul(a: JevAnswer | undefined) {
  return a && a.type === "noul" ? a.noul : 0.5;
}
```

**An absent or unrecognised answer becomes `0.5` — a fabricated mid-confidence, acted upon.** That is
the *exact* class JevManager spent four separate fixes on:

| JM's fix | the same class |
|---|---|
| D-042 | a renamed answer key read as `0` → four verbs fabricated metrics |
| D-043 | the stored confidence regex-parsed from prose → degraded rows stored `conf=0` |
| D-045 | an UNKNOWN confidence read as zero → bands and mean computed over fabricated rows |
| D-046 | a usage-less call billed at `$0` → the USD cap could never fire |

JM's four answer-readers now **throw** on an unusable answer and the fail polarity decides; a judge
that says nothing produces a marked row or a refusal, **never a decision.**

Second: its gate model is **all-or-nothing**. With no key, *every* `write` was blocked — including a
legitimate code write. Fail-closed is correct; **blanket**-closed is not operable. JM's equivalent
separates "no key" (always fatal) from "could not read the answer" (polarity-dependent), which is the
difference between a gate and a wall.

Third: `inFlightSpawns` is memory-only (`:76` — `const { inFlightSpawns: _, ...disk } = s;`), so **the
spawn cap resets across a restart.** JM's equivalent state lives in SQLite with a real resume sweep
(rig T5 proves it across a `kill -9`).

---

## PART 7 — THE HONEST VERDICT

| question | answer |
|---|---|
| Is the prototype real? | **Yes** — it runs, registers 5 hooks, and blocks tool calls |
| Is it a competitor to JM? | **No** — it shares ~5% of JM's concerns and none of its data path |
| Does it do anything JM cannot? | **Yes, one thing: intercept and block another process's tool call** |
| Does JM do anything it cannot? | **Yes — everything else**: search, cache, ledger, budget, four surfaces, tests, spec, audit |
| Which is more useful today? | **JM for the operator's stated use case** (point at X, extract all Y); the prototype has no corpus path at all |
| What should happen next? | **the W8 ruling.** The prototype is a sketch of the layer JM has specified and parked. The question is not whether to build it — it is **F1 (embedding) and F6 (pi wrap points)**, already recorded as the blocker. |

**STATUS: recorded as a finding. No JM code changes** — the gap is W8's, W8 is parked on an
operator-owned ruling, and building an unruled interceptor is precisely the scope-invention this
build's own laws forbid. The prototype does not change what JM must become; it makes the W8 decision
concrete.

---

## PART 8 — WHAT JM WOULD NEED, IF W8 IS RULED (recorded for the decision, not built)

The prototype's 656 lines show the shape; JM's existing machinery covers the parts it lacks. A W8
built on JM would be:

| the prototype's part | JM's existing equivalent |
|---|---|
| `pi.on("tool_call") -> {block:true}` | **WOULD BE NEW** — the hook, and it is the whole point of W8 |
| `noul(answer) ?? 0.5` | `noulFrom` / `answerFrom` by SHAPE, throwing on unusable (D-042) |
| intent classified per turn by Jev | `decision-tree` with a recipe + band thresholds |
| `decisions.jsonl` | `ledger.jsonl` with cost + calls, plus the C8 reconciliation |
| (no cache) | the judge cache with the endpoint in the fingerprint (D-044) |
| (no budget) | `Budget` with key-validated caps, claim/settle (D-024, D-046) |
| `inFlightSpawns` in memory | the job queue in SQLite with the resume sweep (rig T5) |
| (no tests) | 224, and the container rig that proves them in a second environment |
| a 427-line manual | the DPL1 spec §8 C1–C20 + the three audit passes |

**One line of that table is new work.** Everything else already exists, tested — which is the
strongest argument for building W8 *on* JM rather than beside it.

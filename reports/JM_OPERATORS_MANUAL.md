# JEV MANAGER — OPERATOR'S MANUAL

**The practical guide to every use case.**

<!-- OM-CHUNK-1 -->

## THE QUICK-START

```bash
export JM_JUDGE_URL=http://127.0.0.1:8090/v1/systemone
jm index /your/data --name mydata
jm query mydata --fts "what you're looking for"
jm filter mydata --question "your yes/no question" --fts "search terms"
```

## THE MENTAL MODEL

```
YOU HAVE DATA → INDEX IT → NARROW IT (free) → JUDGE IT (the model) → DECIDE
                                                       ↓
                                              The calibrated probability
                                              tells you what to do
```

**The two halves:**
- **KEYLESS** (query, scan, cluster, extract): free, instant, deterministic. No model needed.
- **JUDGED** (filter, find, decision-tree, route, evaluate): through JevK5 on your GPU, ~1s,
  $0, calibrated probabilities.

**The rule of thumb:** if you can find it with a regex or a keyword, use the keyless verbs. If
you need to DECIDE something (is this a failure? is this a duplicate? should I act?), use the
judged verbs.

---

## USE CASE 1 · EXTRACT STRUCTURED DATA FROM ANY CORPUS

**You want:** all error codes, all API endpoints, all dates, all names from a set of files.

```bash
jm index /path/to/logs --name logs
jm extract logs --re "ERROR \[([A-Z_]+)\] (.+)" --limit 100
```

**The pattern:** any regex you would write in `grep -oE`, but with structured JSON output.
The `--field` flag extracts a JSON field from JSONL/SQLite sources.

**Variations:**
- Extract all TODO comments: `jm extract logs --re "TODO: (.+)"`
- Extract all URLs: `jm extract logs --re "https?://[^\s]+"`
- Extract all function names: `jm extract code --re "function ([a-zA-Z_]+)"`
- Extract all error codes: `jm extract logs --re "E[A-Z]+[0-9]+"`

---

## USE CASE 2 · FIND EVERY INSTANCE OF A PATTERN

**You want:** every file that mentions "authentication failure" or "timeout" or "memory leak".

```bash
jm index /path/to/codebase --name code
jm query code --fts "authentication failure" --limit 50
jm scan code --lex "timeout" --limit 30
```

**The difference between query and scan:**
- `query --fts` does full-text search with BM25 ranking (relevance-ordered)
- `scan --lex` does keyword matching with excerpts (shows you the context)

---

## USE CASE 3 · GROUP SIMILAR THINGS

**You want:** cluster similar files by their content signatures.

```bash
jm cluster code --lex "error" --min 2
```

**Output:** signature groups — files that share the same token signatures are grouped together.
Useful for finding duplicate code, similar bug reports, or related documentation.

---

## USE CASE 4 · FILTER A LARGE SET DOWN TO WHAT MATTERS (THE JUDGED FILTER)

**You want:** from 10,000 files, keep only the ones that describe a security vulnerability.

```bash
jm index /path/to/all/files --name all
jm filter all --question "does this file describe a security vulnerability?" \
  --fts "security vulnerability exploit" --limit 200
```

**Output:** each file with a calibrated probability `p=0.88` (88% confident it IS a vulnerability).
Files above your threshold are KEPT; below are rejected with their score.

**The batching:** 200 files are judged in ONE request (`requests=1`). The cost is ~$0.

---

## USE CASE 5 · FIND RECURRING PATTERNS

**You want:** identify bug patterns that appear across multiple files.

```bash
jm find "connection timeout" --in all --common 3
```

**Output:** patterns where at least 3 files mention the same thing, with exemplar file IDs.
The 9-stage chain: seeds → candidates → judged → clustered → patterns.

---

## USE CASE 6 · MAKE DECISIONS (THE GATE)

**You want:** decide whether each item in a list should be acted on, reviewed, or ignored.

```bash
# Create a rows file
echo '{"id":"1","body":"The database is down"}' > /tmp/rows.jsonl
echo '{"id":"2","body":"All tests passed"}' >> /tmp/rows.jsonl

# Create a recipe
echo '{"recipe":"triage","version":1,"questions":{"urgent":{"type":"noul","instructions":"Is this urgent?"}},"policy":{"act":0.8,"flag":0.5,"fail":"closed"}}' > /tmp/recipe.json

# Decide
jm decision-tree --rows /tmp/rows.jsonl --recipe /tmp/recipe.json
```

**Output:** `act=1 escalate=0 noop=1` — the first row is urgent (act), the second is not (noop).

**The policy ladder:**
- `p >= act (0.8)` → **act** — do this now
- `p >= flag (0.5)` → **escalate** — review before acting
- `p < flag` → **noop** — not actionable

---

## USE CASE 7 · SELECT THE RIGHT TOOL FOR A TASK

**You want:** given a task description, which tool/skill should handle it?

```bash
jm route --task "find every missing credential in the codebase"
```

**Output:** `route=act choice=skill:security-audit p=0.92` — the engine selected the security
audit skill at 92% confidence from a catalogue of 650+ entries.

---

## USE CASE 8 · EVALUATE CALIBRATION

**You want:** measure whether the judge's probabilities are trustworthy.

```bash
jm evaluate --cases labeled_cases.json --questions questions.json --key is_failure
```

**Output:** `agreement=83.3% brier=0.1332 ece=0.0327` — the judge agrees with your labels 83%
of the time, with well-calibrated probabilities (ECE close to 0 is good).

---

## USE CASE 9 · GATE A COMMIT (THE PUSH GATE)

**You want:** refuse commits that lack evidence, have shitty tests, or have documentation drift.

```bash
jm push-gate
```

**Output:** `PUSH_GATE ALLOW` or `PUSH_GATE REFUSE exit=1` with the named failure:
- `spec component?` — does the spec component exist?
- `built correctly?` — does the code compile?
- `tested correctly?` — are the tests real (not shitty)?
- `not theatrical?` — does the judged theatricality score pass?
- `Docs updated?` — are the docs newer than the code?
- `Zero drift?` — does the stated SHA match the actual bundle?

**Install as a git pre-commit hook:**
```bash
echo '#!/usr/bin/env bash' > .git/hooks/pre-commit
echo 'export JM_JUDGE_URL=http://127.0.0.1:8090/v1/systemone' >> .git/hooks/pre-commit
echo 'jm push-gate' >> .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## USE CASE 10 · DETECT SHITTY TESTS

**You want:** find tests that prove nothing (mock-heavy, happy-path-only).

```bash
jm st-detect
```

**Output:** every test file classified as LEGIT_UT, SUSPECT, or SHITTY with the specific reasons.

---

## USE CASE 11 · AUDIT SPEC COMPLIANCE

**You want:** verify that every component in your spec actually exists in the codebase.

```bash
jm spec-audit spec.json
```

**The spec format:**
```json
{"components":[
  {"id":"W1","description":"the frozen contracts",
   "files":["src/judge/types.ts"],
   "symbols":["AskItem","AskManyResult"],
   "tests":["test_interfaces_exported"]}
]}
```

---

## USE CASE 12 · POINT IT AT A GIT REPO AND GET COMMIT DATA

```bash
cd /your/repo
jm index . --name repo
jm query repo --fts "fix" --limit 50
git log --oneline --since="2026-09-23" | head -50
```

---

## USE CASE 13 · PARSE RAW SESSION DATA FOR MACRO PATTERNS

```bash
jm index /path/to/sessions --name sessions
jm scan sessions --lex "theatrical" --limit 20
jm cluster sessions --lex "derailment" --min 2
jm extract sessions --re "F-[0-9]+" --limit 100
```

---

## USE CASE 14 · BUILD A KNOWLEDGE INDEX FROM ANY DOCUMENTATION

```bash
jm index /path/to/docs --name knowledge
jm query knowledge --fts "how does authentication work"
jm cluster knowledge --lex "authentication" --min 2
```

---

## USE CASE 15 · MONITOR A CODEBASE OVER TIME

```bash
# Set up a watch daemon
jm target add mycode fs /path/to/code
jm watch --in mycode --name monitored

# Or run a single tick
jm watch --in mycode --name monitored --once
```

---

## USE CASE 16 · PLUG IT INTO AN AGENT (MCP)

The MCP server is already registered as `jev-manager`. In any OMP session:

```
jev_index({"in": "mycorpus", "index": "working"})
jev_query({"index": "working", "fts": "the specific thing"})
jev_find({"phrase": "the pattern", "index": "working"})
jev_decide({"state": {"situation": "..."}, "questions": {"act": {"type": "noul", "instructions": "should the agent act?"}}})
```

---

## USE CASE 17 · PRIORITIZE A BACKLOG

```bash
# Create rows from your backlog items
for item in "fix the login bug" "update the docs" "refactor the API"; do
  echo "{\"id\":\"$item\",\"body\":\"$item\"}"
done > /tmp/backlog.jsonl

# Create a priority recipe
echo '{"recipe":"priority","version":1,"questions":{"high":{"type":"noul","instructions":"Is this urgent and blocking other work?"}},"policy":{"act":0.7,"flag":0.4,"fail":"closed"}}' > /tmp/priority.json

# Prioritize
jm decision-tree --rows /tmp/backlog.jsonl --recipe /tmp/priority.json
```

---

## USE CASE 18 · DETECT DOCUMENTATION DRIFT

```bash
jm push-gate
# The "Zero drift?" item compares the actual bundle SHA vs the stated SHA
```

---

## USE CASE 19 · EVALUATE WHETHER A CHANGE IS SAFE TO DEPLOY

```bash
echo '{"id":"deploy","body":"The change modifies the auth middleware but all 247 tests pass and the spec audit is green"}' > /tmp/deploy.jsonl
echo '{"recipe":"deploy","version":1,"questions":{"safe":{"type":"noul","instructions":"Given the test results and spec compliance, is this safe to deploy?"}},"policy":{"act":0.8,"flag":0.5,"fail":"closed"}}' > /tmp/deploy-recipe.json
jm decision-tree --rows /tmp/deploy.jsonl --recipe /tmp/deploy-recipe.json
```

---

## USE CASE 20 · CRASH-SAFE BULK INDEXING

```bash
# Index with the crash-safe queue
jm index /massive/corpus --name big --queued --job myjob

# If it crashes, resume with the SAME command
jm index /massive/corpus --name big --queued --job myjob

# Check the reconciliation
jm report --job myjob
```

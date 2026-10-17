# jev-manager-operator

The operator skill for JM. A fresh session has this file and the `jm` binary. It does not have
the conversation that built the tool.

Install path, when an agent host loads managed skills:
`~/.omp/agent/managed-skills/jev-manager-operator/SKILL.md`
The copy that ships in the repo — the one the suite gates — is
`skills/jev-manager-operator/SKILL.md`.

## The two halves

**Keyless** — no judge, no key, deterministic: `query`, `scan`, `cluster`, `extract`, `index`,
`target`, `report`, `watch`, `journal`. Use these to narrow a corpus.

**Judged** — one model call, batched: `filter`, `find`, `decision-tree`, `route`, `evaluate`,
and the judged half of `push-gate`. Each of these prints `requests=` (round trips, not rows).
A run that judged N rows in one HTTP request shows `requests=1`. Read that number. A `requests=`
that grew with the row count means the batch was dropped.

## The judge endpoint

Set `JM_JUDGE_URL` to the local judge's `/v1/systemone` before any judged verb. An unset
`JM_JUDGE_URL` sends the call to the public API, which answers HTTP 402. A 402 is terminal:
the transport names `JM_JUDGE_HTTP_402` and does not retry it.

The test suite never dials the live judge. Every judge call in the tests goes to a mock bound
with `port: 0`, or to `JM_MOCK_DIR` (canned files, no socket). Do not point a test at
`127.0.0.1:8090` or `:18090`.

## Entry points

```
jm index <path|@target> [--name N]
jm query <name> [--where "size>2000"] [--fts "phrase"]
jm scan <index> [--lex P] [--re R]          keyless
jm cluster <index> [--lex P] [--min N]      keyless, no model
jm extract <index> --re R|--field K         keyless
jm filter <index> --question "..."          judged
jm find "<phrase>" --in <index>             judged
jm decision-tree --rows F --recipe F        judged
jm route --task "..."                       judged
jm evaluate --cases F --questions F         judged
jm push-gate                                mechanical, then judged
jm spec-audit <spec.json>
jm st-detect <tests-dir>
jm mcp                                      jev_query, jev_find, jev_decide, jev_index
```

Exit 2 is a client error (`JM_*` or `JEV_NO_KEY`). Exit 1 is a runtime failure.

## A recipe

`decision-tree` reads a recipe file. `questions` is a non-empty object. Each question has
`type` (`noul`, `choice`, or `score`) and `instructions`. `choice` and `score` also need
`criteria` with at least two options — the field is `criteria`, not `options`. `policy.fail`
is exactly `open` or `closed`. `policy.act` and `policy.flag` are numbers in `[0,1]`, and
`flag` must not exceed `act`.

A question type outside those three is `JM_RECIPE_INVALID` at load, before any network call.

## Refusals worth naming

| code | when |
|---|---|
| `JEV_NO_KEY` | judged verb, no key, and `JM_MOCK_DIR` is unset |
| `JM_WHERE_VALUE` | a numeric column compared to a non-numeric `--where` value |
| `JM_INDEX_MISSING` | the index or the root is not there |
| `JM_JUDGE_HTTP_402` | billing refusal; not retried |
| `JM_JUDGE_RETRY_EXHAUSTED` | 429 / 5xx / network, attempts used up |
| `JM_JUDGE_USAGE_MISSING` | the response had no `usage` block |
| `JM_RECIPE_INVALID` | the recipe failed validation |
| `JM_BUDGET_INVALID` | unknown or non-numeric budget cap |

## Checking your own work

On a judged command, the stdout line carries `requests=`. Quote it. A keyless command must not
be reported as a judgement, and a judgement that never printed `requests=` was not read.

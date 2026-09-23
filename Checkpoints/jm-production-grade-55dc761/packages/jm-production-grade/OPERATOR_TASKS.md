# THE TWO OPERATOR TASKS — what a FRESH agent must complete with the shipped artifacts ONLY

Each task is given to a subagent with ZERO conversation context. The subagent receives:
(a) the skill name `jev-manager-operator`, (b) the task text below, and (c) NOTHING ELSE.
It may read the skill and call the tools. It may not ask a question that the skill answers.

## TASK A — "find every instance of a failure shape across a corpus, then judge them"
```
Point at /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JARVIS/reports, find every file that
discusses a defect or failure, and decide which of them describe a FAILURE CLASS (a defect that
recurred) rather than a one-off bug. Report the paths you kept, with the reason.
```
WHAT IT TESTS: index -> keyless narrowing (scan/cluster/extract) -> judged filter in ONE batch ->
reading `requests=` -> the kept rows. A fresh agent must pick `filter` (judged) not `scan`
(keyless) for the second half, and must know the difference FROM THE SKILL ALONE.

## TASK B — "gate a commit on whether its message carries evidence"
```
In a scratch git repo, install a pre-commit hook that REFUSES a commit whose staged content claims
a result without naming what ran and what passed. Prove it blocks one commit and allows another.
Report the two exit codes.
```
WHAT IT TESTS: building a recipe (a `noul` question + a policy), running `decision-tree` over rows,
and reading the exit code. A fresh agent must learn the recipe shape and the `noul`-only constraint
FROM THE SKILL ALONE — including that `choice` is refused at load.

## THE SCORING (the gate is binary)
| what | pass |
|---|---|
| found the tools without being told | the first tool call names the right surface |
| completed the task | the task's own output is correct and complete |
| read the result | it quotes `requests=` / the exit code / the counts |
| no undocumented failure | every error it hit was named in the skill |
| reproducible | a THIRD operator gets the same answer for the same input |

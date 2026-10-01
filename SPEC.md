job: fence
seat: jev-fact-kernel
mission: >
  Build the five-tier fact kernel so a false claim is mechanically detectable and blockable at
  the moment it is made, and a lying LSP server cannot register. The judge is the LOCAL Jev at
  :8090. Every probe ships one POSITIVE and one NEGATIVE control in fixtures/. An unread path
  returns UNMEASURED (exit 2), never clean.
steps:
  - id: FR-10
    what: T0 returns UNMEASURED on an unread path + the pattern set reduced by precision
    done_when: fixtures/broken-probe.py -> exit 1 AND fixtures/clean-probe.py -> exit 0 AND /tmp/NOPE.py -> exit 2
    state: DONE
  - id: FR-13
    what: the control set ships WITH the kernel — the T4 adversarial fixtures
    done_when: fixtures/lying-server (declares 23) -> BLOCK AND fixtures/honest-server (declares 0) -> PASS
    state: IN_PROGRESS
  - id: FR-6a
    what: rewrite Q3, widen the control set, re-derive the threshold
    done_when: the Q3 gap >= 0.10 measured on a widened set
    state: TODO
  - id: FR-5
    what: kernel/tier4/{file,test,spec,hash,wire}.py
    done_when: each probe carries a POS and a NEG control, both green
    state: TODO
  - id: FR-4
    what: the router cascade — NONE vs CHECKABLE first, then the 7 kinds
    done_when: 7/8 on the 8-span set
    state: TODO
  - id: FR-8
    what: wire T4-CAP into LSP registration; T0 + T4-FILE/HASH into tool_call
    done_when: a lying server is REFUSED at registration; a phantom artifact blocks the call
    state: TODO
  - id: FR-12
    what: the full battery — every SC green with tool-result tokens
    done_when: every FR-12 SC passes with its named token
    state: TODO
gate: >
  scripts-spec-gate.sh — a commit touching kernel/ or extensions/fact-firewall/ that names no
  FR/SC is REFUSED by .git-hooks/commit-msg.
evidence: context_management/RUNNING_DEBUG_LOG.md · .omp/run/fact-firewall.jsonl

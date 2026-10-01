# BUILD_STATE — the fact kernel

**Spec:** specs/DPL1_JEV_FACT_KERNEL.md · sha256-16 `1f0339511782204f` (SPEC-AUDIT APPROVED 0/8)
**Spec gate:** scripts-spec-gate.sh + .git-hooks/commit-msg — REFUSE on no FR, PASS on FR (driven both ways)
**Battery:** `bash kernel/battery.sh` → PASS=10 FAIL=0 UNMEASURED=0
**The ledger:** ~/.omp/run/fact-firewall.jsonl
**The checkpoint:** Checkpoints/jev-fact-kernel-<TOKEN>/CHECKPOINT_MANIFEST.md

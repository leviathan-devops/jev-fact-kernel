# pattern-header.sh — the GATE-HEADER STANDARD (W1 interfaces wave).
#
# SOURCED library, NOT an executable hook. Every gate sources it:
#   source "$(dirname "$0")/lib/pattern-header.sh"
#   pattern_header W-13 119 "a src/**/*.ts diff" "silent-fallback" "pre-commit"
#
# THE LAW (DPL1 §5 + §9): a gate is a (predicate x artifact-class) pair.
# The predicate is the easy half; naming the artifact class it applies to is
# the half that gets skipped — and skipping it produced both defects found
# this session (W-1 fired on every src/ commit in a repo with no extensions/
# dir; W-9 demanded a 100-line GitHub PR template). Every gate header MUST
# name (a) its Jev count — the measured occurrences in the 298-file corpus —
# and (b) the ARTIFACT CLASS its predicate applies to.
#
# DISCIPLINE: this file NEVER `set -e` — a sourced `set -e` would kill the
# caller on the first failing grep. Functions are `set -u`-safe (`${1:?...}`
# guards) and use no bare pipelines, so callers under `set -uo pipefail`
# source this safely.

# pattern_header <ID> <JEV_N> <ARTIFACT_CLASS> <THE_PATTERN_NAME> <THE_SURFACE>
# Prints the standard 5-line gate header to stdout.
pattern_header() {
  local id="${1:?"pattern_header <ID> <JEV_N> <ARTIFACT_CLASS> <PATTERN_NAME> <SURFACE>"}"
  local jev_n="${2:?"pattern_header <ID> <JEV_N> <ARTIFACT_CLASS> <PATTERN_NAME> <SURFACE>"}"
  local artifact_class="${3:?"pattern_header <ID> <JEV_N> <ARTIFACT_CLASS> <PATTERN_NAME> <SURFACE>"}"
  local pattern_name="${4:?"pattern_header <ID> <JEV_N> <ARTIFACT_CLASS> <PATTERN_NAME> <SURFACE>"}"
  local surface="${5:?"pattern_header <ID> <JEV_N> <ARTIFACT_CLASS> <PATTERN_NAME> <SURFACE>"}"
  printf '# GATE %s — %s\n' "$id" "$pattern_name"
  printf '# JEV COUNT: %s   (the measured occurrences in the 298-file corpus)\n' "$jev_n"
  printf '# ARTIFACT CLASS: %s\n' "$artifact_class"
  printf '# SURFACE: %s\n' "$surface"
  printf '# PREDICATE READS: %s — NEVER prose\n' "$artifact_class"
}

# gate_reject <ID> <THE_REASON> — prints REJECT(<ID>): <reason> to stderr,
# sets FAIL=1 (the pre-commit accumulation contract: return 0 so later
# checks still run; the caller exits 1 iff FAIL != 0 at the end).
# gate_init — THE CALLER'S CONTRACT (ocr round-3): the caller MUST initialize
# FAIL=0 before any gate runs, then read it after. This lib deliberately does
# NOT assign FAIL at source time (a sourced init would clobber a caller's
# running count across multiple checks). Both hooks do `FAIL=0` at the top
# (.githooks/pre-commit:7, .githooks/pre-push:59).
gate_init() { FAIL=0; }

gate_reject() {
  local id="${1:?"gate_reject <ID> <REASON>"}"
  local reason="${2:?"gate_reject <ID> <REASON>"}"
  printf 'REJECT(%s): %s\n' "$id" "$reason" >&2
  FAIL=1
  return 0
}

# gate_pass <ID> — prints "<ID>: PASS" to stdout.
gate_pass() {
  local id="${1:?"gate_pass <ID>"}"
  printf '%s: PASS\n' "$id"
}

# header_ok <a gate file> — exit 0 iff the file carries all 5 header lines,
# exit 1 otherwise (missing file included).
# NOTE: shebang check removed — this is a SOURCED library; the caller
# (pre-commit, pre-push) validates shebangs on executable hooks.
header_ok() {
  local f="${1:?"header_ok <gate-file>"}"
  [ -f "$f" ] || return 1
  # FIXED 2026-09-23 (ocr round-3, corrected): the old form grepped the WHOLE
  # file, so a stray `# GATE ` line anywhere (a comment, a string) passed. But
  # this repo's convention puts each gate's header INLINE with the gate (e.g.
  # .githooks/pre-commit:111-115), not at the top of the file — so a `head -n N`
  # window is WRONG (it broke the real pre-commit check).
  # The correct predicate: the 5 labels must form a CONTIGUOUS BLOCK in ORDER,
  # anywhere in the file. A stray line elsewhere cannot satisfy an ordered
  # 5-line run. (awk, because the sequence — not the membership — is the check.)
  awk '
    /^# GATE /            { n=1; next }
    n==1 && /^# JEV COUNT: /        { n=2; next }
    n==2 && /^# ARTIFACT CLASS: /   { n=3; next }
    n==3 && /^# SURFACE: /          { n=4; next }
    n==4 && /^# PREDICATE READS: /  { found=1; exit 0 }
    { if (n>0) n=0 }
    END { exit(found ? 0 : 1) }
  ' "$f" || return 1
  return 0
}

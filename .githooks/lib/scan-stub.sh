#!/usr/bin/env bash
# GATE W-14 — no-stub
# JEV COUNT: 68   (the measured occurrences in the 298-file corpus)
# ARTIFACT CLASS: a staged src/**/*.ts diff
# SURFACE: pre-commit
# PREDICATE READS: a staged src/**/*.ts diff — NEVER prose
#
# scan-stub.sh — NO-STUB family scanner (Jev 68).
# SOURCED library exporting `scan_stub <file>`.
# Prints one `STUB:<file>:<line>:<matched text>` line per hit to stdout
# and returns the hit count as the exit code (capped at 255).
#
# SCOPED: the caller (pre-commit) invokes this ONLY for staged
# src/**/*.ts files. This library does NOT enforce scope itself — it scans
# whatever file it is given — so the artifact-class guard lives in pre-commit.
# NEVER point this at Checkpoints/** copies, *.md docs, or test fixtures.
#
# DISCIPLINE: no `set -e` (sourced under `set -uo pipefail` must survive a
# failing grep). All greps guarded with `|| true`.

# scan_stub <file> — scan one .ts/.js file for stub shapes.
# Output: one STUB: line per hit. Exit code: hit count (capped at 255).
scan_stub() {
  local f="${1:?"scan_stub <file>"}"
  [ -f "$f" ] || return 0
  local hits=0

  # 1. `stubbed: true` literal (incl. `return { stubbed: true }`).
  while IFS= read -r line; do
    printf 'STUB:%s:%s\n' "$f" "$line"
    hits=$((hits + 1))
  done < <(grep -nE 'stubbed[[:space:]]*:[[:space:]]*true' "$f" 2>/dev/null || true)

  # 2. `// TODO: implement` / `// FIXME: implement` on/near a function body.
  #    FIXED: make colon optional, case-insensitive, require word boundary
  #    so "todo" in "outline" / "baritone" doesn't match.
  while IFS= read -r line; do
    printf 'STUB:%s:%s\n' "$f" "$line"
    hits=$((hits + 1))
  done < <(grep -inE '//[[:space:]]*(TODO|FIXME)[[:space:]]*:?[[:space:]]*\bimplement\b' "$f" 2>/dev/null || true)

  # 3. A function whose body is ONLY a NotImplemented throw:
  #    `throw new Error("not implemented")` / `throw new NotImplemented...`.
  #    FIXED: only flag when the throw is the sole statement in the function
  #    body — a defensive/unreachable throw in a real function is not a stub.
  local in_func=0 func_start=0 func_body="" brace_depth=0
  local lineno=0 line="" fname="" throw_lineno=0
  while IFS= read -r line || [ -n "$line" ]; do
    lineno=$((lineno + 1))
    if [ "$in_func" -eq 0 ]; then
      # Detect function start.
      if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+([a-zA-Z0-9_]+) ]]; then
        in_func=1; func_start="$lineno"; func_body="$line"
        fname="${BASH_REMATCH[3]}"
        brace_depth=$(_stub_brace_depth "$line")  # Net braces on this line (opening counted)
        # If body closes on same line, check immediately (don't wait for else branch).
        if [ "$brace_depth" -le 0 ]; then
          local stripped
          stripped=$(printf '%s' "$func_body" | sed -E 's|//.*$||g; s|/\*.*\*/||g' | sed -E 's/^[^{]*\{//; s/\}[^}]*$//' | tr -d '[:space:]();' || true)
          local stripped_core
          stripped_core=$(printf '%s' "$stripped" | sed -E 's/Error$//; s/NotImplementedError$//' || true)
          if [[ "$stripped_core" =~ ^thrownewNotImplemented$ ]] || \
             [[ "$stripped_core" =~ ^thrownewError\"notimplemented\"$ ]]; then
            printf 'STUB:%s:%d:throw new NotImplemented in function %s\n' "$f" "$func_start" "$fname"
            hits=$((hits + 1))
          fi
          in_func=0; func_body=""; brace_depth=0
        fi
      fi
    else
      func_body="${func_body}
${line}"
      brace_depth=$((brace_depth + $(_stub_brace_depth "$line")))
      if [ "$brace_depth" -le 0 ]; then
        # Function body closed — check if it's throw-only.
        # Strip comments, whitespace, braces, parens.
        local stripped
        stripped=$(printf '%s' "$func_body" | sed -E 's|//.*$||g; s|/\*.*\*/||g' | sed -E 's/^[^{]*\{//; s/\}[^}]*$//' | tr -d '[:space:]();' || true)
        # Check: the remaining body should be ONLY a throw statement.
        # Strip Error/NotImplementedError suffixes to get the core throw shape.
        local stripped_core
        stripped_core=$(printf '%s' "$stripped" | sed -E 's/Error$//; s/NotImplementedError$//' || true)
        if [[ "$stripped_core" =~ ^thrownewNotImplemented$ ]] || \
           [[ "$stripped_core" =~ ^thrownewError\"notimplemented\"$ ]]; then
          throw_lineno=$func_start
          printf 'STUB:%s:%d:throw new NotImplemented in function %s\n' "$f" "$throw_lineno" "$fname"
          hits=$((hits + 1))
        fi
        in_func=0; func_body=""; brace_depth=0
      fi
    fi
  done < "$f"

  # 4. `/* PROPOSED — empty */` / `/* PLACEHOLDER */` markers.
  while IFS= read -r line; do
    printf 'STUB:%s:%s\n' "$f" "$line"
    hits=$((hits + 1))
  done < <(grep -nE '/\*[[:space:]]*(PROPOSED[[:space:]]*—[[:space:]]*empty|PLACEHOLDER)[[:space:]]*\*/' "$f" 2>/dev/null || true)

  # Cap: bash exit codes wrap above 255; cap at 255 (callers use stdout
  # lines as the record, but the exit code must be reliable).
  if [ "$hits" -gt 255 ]; then hits=255; fi
  return "$hits"
}

# _stub_brace_depth <line> — net `{` minus `}` count on one line (helper).
_stub_brace_depth() {
  # FIXED 2026-09-23 (ocr round-3): the old form spawned 6 subprocesses
  # (printf/tr/wc x2) PER LINE — ~6000 fork+exec for a 1000-line file, the
  # dominant cost of a pre-commit hook. Pure-bash parameter expansion: delete
  # every non-brace char, then take the string length. Zero forks.
  local l="${1:-}"
  # FIXED 2026-09-23 (ocr confirm HIGH): a brace inside a STRING LITERAL or a
  # COMMENT was counted — `return "}";` skewed the depth and could close a body
  # early (a missed real stub = a false green). Strip single-line strings and
  # comments first. FAST PATH: a line with no brace returns 0 with ZERO forks
  # (most lines), so the fork cost stays off the hot path.
  if [[ "$l" != *"{"* && "$l" != *"}"* ]]; then printf '0'; return; fi
  l=$(printf '%s' "$l" | sed -E "s/\"[^\"]*\"//g; s/'[^']*'//g; s|//.*$||")
  # ALSO FIXED (a PRE-EXISTING bug): `c="${l//[^}]/}"` never worked — bash reads the
  # `}` inside `[^}]` as the expansion TERMINATOR, so the pattern became `[^` and c
  # was garbage (net = nonsense -> the multi-line body detection was unreliable).
  # Escape the brace: `${l//\}/}` (remove `}`) and `${l//\{/}` (remove `{`).
  local op="${l//\}/}" cl="${l//\{/}"
  printf '%d' "$(( ${#op} - ${#cl} ))"
}

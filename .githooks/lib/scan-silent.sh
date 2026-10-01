#!/usr/bin/env bash
# GATE W-13 — silent-fallback
# JEV COUNT: 119   (the measured occurrences in the 298-file corpus)
# ARTIFACT CLASS: a staged src/**/*.ts diff
# SURFACE: pre-commit
# PREDICATE READS: a staged src/**/*.ts diff — NEVER prose
#
# scan-silent.sh — SILENT-FALLBACK family scanner (Jev 119, highest count).
# SOURCED library exporting `scan_silent <file>`.
# Prints one `SILENT-FALLBACK:<file>:<line>:<matched text>` line per hit
# to stdout and returns the hit count as the exit code (capped at 125).
#
# SCOPED: the caller (pre-commit) invokes this ONLY for staged
# src/**/*.ts files. This library does NOT enforce scope itself — it scans
# whatever file it is given — so the artifact-class guard lives in pre-commit.
# NEVER point this at Checkpoints/** copies, *.md docs, or test fixtures.
#
# DISCIPLINE: no `set -e` (sourced under `set -uo pipefail` must survive a
# failing grep). All greps guarded with `|| true`. No awk/getline — a
# pure-bash line loop, so there is no stdin-consumption hang.

# scan_silent <file> — scan one .ts/.js file for silent-fallback shapes.
# Output: one SILENT-FALLBACK: line per hit. Exit code: hit count (capped at 125).
scan_silent() {
  local f="${1:?"scan_silent <file>"}"
  [ -f "$f" ] || return 0
  local hits=0
  local line=""
  local lineno=0

  # 1. Empty catch: `catch {}` / `catch (e) {}` on one line.
  while IFS= read -r line; do
    printf 'SILENT-FALLBACK:%s:%s\n' "$f" "$line"
    hits=$((hits + 1))
  done < <(grep -nE 'catch[[:space:]]*(\([^)]*\))?[[:space:]]*\{\s*\}' "$f" 2>/dev/null || true)

  # 2. Comment-only catch: a `catch (...) {` whose body (possibly across
  #    lines) holds only comments/blank — no throw, no console/logger/report.
  #    Pure-bash brace-depth state machine. One-line `catch {}` hits belong
  #    to rule 1; here we flag multi-line comment-only bodies plus one-line
  #    `catch (e) { /* ignore */ }` shapes (rule 1 cannot see the comment).
  local in_catch=0 depth=0 start=0 body="" has_code=0
  lineno=0
  while IFS= read -r line || [ -n "$line" ]; do
    lineno=$((lineno + 1))
    if [ "$in_catch" -eq 0 ]; then
      if [[ "$line" =~ catch[[:space:]]*(\([^\)]*\))?[[:space:]]*\{ ]]; then
        in_catch=1; start="$lineno"; body="$line"; has_code=0
        depth=$(_brace_depth "$line")
        if [ "$depth" -le 0 ]; then
          # one-line catch: rule 1 counted the truly-empty ones; flag it
          # here only if it carries a comment and no rethrow/log.
          if [[ "$line" == *'/*'* || "$line" == *'//'* ]]; then
            if [[ "$line" != *throw* && "$line" != *console.* && "$line" != *logger.* && "$line" != *report* && "$line" != *rethrow* ]]; then
              # skip the truly-empty shape (rule 1 already reported it)
              stripped="$(printf '%s' "$line" | sed -E 's|/\*.*\*/||g; s|//.*$||g' | tr -d '[:space:]{}' || true)"
              stripped_nocatch="$(printf '%s' "$stripped" | sed -E 's/^.*catch//' || true)"
              # FIXED 2026-09-23 (the audit's DEFECT G): drop the
              # `stripped_nocatch` non-empty requirement. Measured gap:
              # `catch{ /* ignore */ }` (no paren binding) stripped to a bare
              # `catch`, so `stripped_nocatch` was empty and the line escaped
              # BOTH rules — an unnamed comment-only catch that never fired.
              # Rule 1 still owns the comment-FREE `catch {}` shape, so no
              # double count.
              if true; then
                # FIXED 2026-09-23 (audit DEFECT F): a comment that NAMES the
                # reason is a DOCUMENTED ignore, not a silent swallow. Measured:
                # `catch { /* already dead */ }` on a best-effort kill.
                if [[ "$line" =~ (already|expected|intentional|best.?effort|no.?op|deliberate|consumed|by.design|on.purpose|benign|idempotent|harmless|available|absent|optional|missing|not.found|non.?fatal|unreachable|no.artifact|nothing.to) ]]; then
                  : # named reason -> documented ignore
                else
                  printf 'SILENT-FALLBACK:%s:%d:%s\n' "$f" "$start" "catch with comment-only body (no rethrow/log)"
                  hits=$((hits + 1))
                fi
              fi
            fi
          fi
          in_catch=0
        fi
      fi
    else
      body="${body}
${line}"
      depth=$((depth + $(_brace_depth "$line")))
      if [ "$depth" -le 0 ]; then
        in_catch=0
        code="$(printf '%s' "$body" | sed -E 's|/\*.*\*/||g; s|//.*$||g' || true)"
        if [[ "$code" != *throw* && "$code" != *console.* && "$code" != *logger.* && "$code" != *report* && "$code" != *rethrow* ]]; then
          stripped="$(printf '%s' "$code" | tr -d '[:space:]{}();' || true)"
          stripped_nocatch="$(printf '%s' "$stripped" | sed -E 's/^.*catch//' || true)"
          if [ -z "$stripped_nocatch" ] && ! [[ "$body" =~ (already|expected|intentional|best.?effort|no.?op|deliberate|consumed|by.design|on.purpose|benign|idempotent|harmless|available|absent|optional|missing|not.found|non.?fatal|unreachable|no.artifact|nothing.to) ]]; then
            : # truly empty multi-line catch — still silent; flag it (rule 1
              # only sees one-line shapes, so no double count here)
            printf 'SILENT-FALLBACK:%s:%d:%s\n' "$f" "$start" "empty catch body spanning lines (no rethrow/log)"
            hits=$((hits + 1))
          else
            # non-empty but no rethrow/log — could be a silent literal
            # return (rule 5 reports the literal itself); flag the shape.
            printf 'SILENT-FALLBACK:%s:%d:%s\n' "$f" "$start" "catch body with no rethrow/log"
            hits=$((hits + 1))
          fi
        fi
      fi
    fi
  done < "$f"

  # 3. `?? <literal>` masking a failure inside a check/verify/gate function.
  #    FIXED: scoped to the CURRENT function body, not file-wide. If the
  #    `??` literal appears outside a check-function, it's a legitimate
  #    default (e.g. `opts.fetchFn ?? fetch`).
  local RE_QQ='\?\?[[:space:]]*(0|""|'"''"'|\[\]|\{\})'
  local -a LINES=()
  mapfile -t LINES < "$f"
  local in_func=0 func_name="" check_func=0 func_brace=0
  lineno=0
  while IFS= read -r line || [ -n "$line" ]; do
    lineno=$((lineno + 1))
    if [ "$in_func" -eq 0 ]; then
      if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?(async[[:space:]]+)?function[[:space:]]+([a-zA-Z0-9_]+) ]]; then
        in_func=1; func_name="${BASH_REMATCH[3]}"
        # Check if this function name matches the check/verify pattern.
        if [[ "$func_name" =~ (check|verify|gate|assert|validate|ensure) ]]; then
          check_func=1
        else
          check_func=0
        fi
        func_brace=$(_brace_depth "$line")
      fi
    else
      func_brace=$((func_brace + $(_brace_depth "$line")))
      if [ "$func_brace" -le 0 ]; then
        in_func=0; check_func=0
      fi
    fi
    # Only flag ?? if we're inside a check-function's body.
    # FIXED 2026-09-23: the INLINE form `=~ ...(0|""|''|...)` is a bash trap —
    # inside `[[ =~ ]]` the pattern is UNQUOTED, so `""` and `''` are stripped to
    # empty strings, giving the alternation two EMPTY branches that match
    # anything -> `?? FENCE_DEFAULT` fired. Putting the pattern in a VARIABLE
    # preserves the quote characters. (Proven: inline matched `?? x` for all x;
    # variable matches only the literals.)
    # FIXED 2026-09-23 (the audit's DEFECT E): a `?? <literal>` that is
    # IMMEDIATELY followed by LOUD handling is NOT a silent fallback. Measured:
    # `const invariant = ...pop() ?? ""; if (!invariant) throw new Error(...)` —
    # the default is a sentinel the next line converts into a loud error. The
    # rule now LOOKS AHEAD one non-empty line and skips when that line throws /
    # rejects / records a reason / tests emptiness. (Proven by adjudicating
    # src/verdict.ts:143,153,180 — all three are followed by loud handling.)
    # FIXED: skip comment-only lines — a comment that mentions `?? ""` is prose,
    # not a silent fallback (measured: a doc-comment tripped the rule).
    if [[ "$line" =~ ^[[:space:]]*(//|/\*|\*) ]]; then
      :
    elif [ "$check_func" -eq 1 ] && [[ "$line" =~ $RE_QQ ]]; then
      NEXT="${LINES[$lineno]:-} ${LINES[$((lineno + 1))]:-} ${LINES[$((lineno + 2))]:-}"
      if [[ "$NEXT" =~ (throw|REJECT|reason[[:space:]]*=|!\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\)|\.length[[:space:]]*(===|==|>)[[:space:]]*0|return[[:space:]]+new[[:space:]]+Error) ]]; then
        : # loud handling follows — NOT a silent fallback
      else
        printf 'SILENT-FALLBACK:%s:%s\n' "$f" "$line"
        hits=$((hits + 1))
      fi
    fi
  done < "$f"

  # 4. `|| true` following a command-shaped call.
  #    FIXED: only flag when the LHS looks like a command (not a comment
  #    or a variable assignment in boolean context like `flag || true`).
  while IFS= read -r line; do
    # Skip comment-only lines.
    [[ "$line" =~ ^[[:space:]]*(//|\*) ]] && continue
    # Require a command-like token before || (alphanumeric followed by
    # whitespace/args, not just `identifier || true` which is boolean).
    if [[ "$line" =~ [a-zA-Z_][a-zA-Z0-9_]*[[:space:]]+\|\|[[:space:]]*true ]]; then
      printf 'SILENT-FALLBACK:%s:%s\n' "$f" "$line"
      hits=$((hits + 1))
    fi
  done < <(grep -nE '\|\|[[:space:]]*true' "$f" 2>/dev/null || true)

  # 5. Pass-shaped literal returned on an error path:
  #    `return { ok: true ...}` / `return { success: true ...}` with a catch
  #    present in the file.
  #    FIXED: scoped to returns INSIDE the catch body (tracked by rule 2's
  #    state machine). File-wide correlation caused false positives.
  #    We re-scan tracking catch blocks; any return {ok/success:true} inside
  #    a catch is flagged.
  local in_catch_r=0 depth_r=0
  lineno=0
  while IFS= read -r line || [ -n "$line" ]; do
    lineno=$((lineno + 1))
    if [ "$in_catch_r" -eq 0 ]; then
      if [[ "$line" =~ catch[[:space:]]*(\([^\)]*\))?[[:space:]]*\{ ]]; then
        in_catch_r=1
        depth_r=$(_brace_depth "$line")
      fi
    else
      depth_r=$((depth_r + $(_brace_depth "$line")))
      # Flag return { ok/success: true } inside a catch body.
      if [[ "$line" =~ return[[:space:]]*\{[^}]*(ok[[:space:]]*:[[:space:]]*true|success[[:space:]]*:[[:space:]]*true) ]]; then
        printf 'SILENT-FALLBACK:%s:%s\n' "$f" "$line"
        hits=$((hits + 1))
      fi
      if [ "$depth_r" -le 0 ]; then
        in_catch_r=0
      fi
    fi
  done < "$f"

  # cap: exit codes wrap above 255; cap at 125 (callers use stdout lines
  # as the record, but the exit code must be reliable).
  if [ "$hits" -gt 125 ]; then hits=125; fi
  return "$hits"
}

# _brace_depth <line> — net `{` minus `}` count on one line (helper).
# NOTE: counts braces in strings/comments too — an acceptable approximation
# for the silent-fallback scanner (the catch state machine tracks depth
# across lines, so per-line noise averages out).
_brace_depth() {
  local l="${1:-}"
  local opens=0 closes=0
  opens=$(printf '%s' "$l" | tr -cd '{' | wc -c || true)
  closes=$(printf '%s' "$l" | tr -cd '}' | wc -c || true)
  opens=$(printf '%s' "$opens" | tr -d ' ' || true)
  closes=$(printf '%s' "$closes" | tr -d ' ' || true)
  printf '%d' "$((opens - closes))"
}

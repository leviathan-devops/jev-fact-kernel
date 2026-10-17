#!/usr/bin/env bash
# GATE W-3 — phantom-completion
# JEV COUNT: 70   (the measured occurrences in the 298-file corpus)
# ARTIFACT CLASS: a pushed commit range
# SURFACE: pre-push
# PREDICATE READS: a pushed commit range — NEVER prose
#
# scan-phantom.sh — the PHANTOM-COMPLETION family (Jev 70).
#
# WHAT IT CATCHES: a commit whose message claims completion or creation
# but whose diff is empty (no files changed), or that claims a file was
# created but the file does not exist in the pushed tree.
#
# ARTIFACT CLASS: a pushed commit range (the diff under inspection).
#
# USAGE: source this file, then call scan_phantom <commit_range>
#   commit_range: a git revision range (e.g. origin/main..HEAD)
#   Outputs one PHANTOM-DIFF:<sha>:<subject> line per hit, exit 0 always
#   (the caller decides whether to reject).

# scan_phantom <commit_range> — scan a commit range for phantom completions.
scan_phantom() {
  local COMMIT_RANGE="${1:?"scan_phantom <commit_range> required"}"

  # Regex for completion / creation claims in the subject line.
  # FIRING 008 / FIXED (2026-09-22): allow claim word ANYWHERE after the
  # semantic prefix (not just immediately after the colon).
  local CLAIM_RE='^[a-z]+(\([^)]*\))?:[[:space:]].*(complete[d]?|done|finished|implemented|added|built|landed|shipped|delivered)'

  # Regex for "created <file>" / "added <file>" / "wrote <file>" in the body.
  # FIXED 2026-09-23 (a real push false-positive): the verbs had NO WORD
  # BOUNDARY, so `overwrote ticks.log` matched `wrote` and the gate flagged a
  # phantom. `\b` anchors each verb. Also: a claim about a GITIGNORED file
  # (runtime/ticks.log, store.sqlite) is a RUNTIME artifact, never a repo
  # phantom — the check now skips those.
  local FILE_CLAIM_RE='\b(created|added|wrote|built|deployed)[[:space:]]+([^ ]+\.[a-z]{1,4})'

  # FIRING 010 / FIXED (2026-10-02 — measured on jev-fact-kernel@49b4e2e, a legitimate
  # runtime-verification commit with an 18-file diff that BLOCKED a live push): a claim whose
  # grammatical SUBJECT is a TOOL or PROCESS — "The enroll wrote projects.json FRESH", "the daemon
  # created store.sqlite" — is a RUNTIME NARRATION about what a program DID, not a claim that
  # THIS COMMIT adds the file. The gate read it as a phantom because projects.json is absent from
  # the tree (it lives in the kernel, a different repo). A first-person/implicit-subject claim
  # ("created src/gate.ts") still fires. The claim's subject must be the commit — never a named
  # tool. Lines carrying a tool-subject claim are dropped BEFORE the claim scan.
  local TOOL_SUBJECT_RE='(the|a|an)[[:space:]]+[a-z0-9_.-]+[[:space:]]+(created|added|wrote|built|deployed)[[:space:]]'

  local ORPHANS=0

  # Resolve the range into individual commit SHAs.
  local SHAS
  SHAS=$(git rev-list "$COMMIT_RANGE" 2>/dev/null) || {
    # If rev-list fails (bad range), try treating it as a single sha.
    SHAS="$COMMIT_RANGE"
  }

  local SHA SUBJECT STAT BODY

  for SHA in $SHAS; do
    SUBJECT=$(git log -1 --format='%s' "$SHA" 2>/dev/null) || continue

    # --- CHECK 1: completion claim with empty diff ---
    if printf '%s\n' "$SUBJECT" | grep -qiE "$CLAIM_RE"; then
      # FIRING 009 / FIXED (2026-09-22): git diff --root is NOT a valid flag
      # and silently returns empty, making every commit look like a phantom.
      # git show --stat is correct for root commits (no parent), normal commits,
      # and empty commits alike.
      STAT=$(git show --stat --format="" "$SHA" 2>/dev/null)
      if [ -z "$STAT" ]; then
        printf 'PHANTOM-DIFF:%s:%s\n' "$SHA" "$SUBJECT"
        ORPHANS=$((ORPHANS + 1))
      fi
    fi

    # --- CHECK 2: claimed file creation but file does not exist ---
    BODY=$(git log -1 --format='%b' "$SHA" 2>/dev/null) || continue
    # FIRING 010: a tool-subject narration line ("The enroll wrote projects.json") never reaches
    # the claim scan — see TOOL_SUBJECT_RE.
    local CLAIM_BODY
    CLAIM_BODY=$(printf '%s\n' "$BODY" | grep -viE "$TOOL_SUBJECT_RE" || true)
    # FIRING 011 / FIXED (2026-10-02 — measured live on jev-fact-kernel@2ab67d4): a claim inside a
    # QUOTATION is a REFERENCE, never an assertion. The commit's body quoted the fence's MOTIVATING
    # EXAMPLE — 'ST-403b IS THE MOTIVATING CASE: "I created `kernel/fact-firewall.ts` and wired it
    # into the CLI"' — and the gate flagged the quoted hypothetical as the commit's own artifact
    # claim. The source-kind law (own_utterance is actionable; a quotation is recorded, never acted
    # on) applies to a commit body too. QUOTED SPANS ARE STRIPPED before the claim scan; the
    # markdown backtick CHARACTERS are stripped (not their content) so a backticked REAL path still
    # resolves and a backticked ABSENT path still fires.
    CLAIM_BODY=$(printf '%s\n' "$CLAIM_BODY" | sed -E 's/"[^"]*"//g; s/'"'"'[^'"'"']*'"'"'//g; s/`//g')
    if printf '%s\n' "$CLAIM_BODY" | grep -qiE "$FILE_CLAIM_RE"; then
      # Use process substitution to avoid subshell ORPHANS loss.
      while IFS= read -r match; do
        local CLAIMED_FILE
        CLAIMED_FILE=$(printf '%s' "$match" | awk '{print $NF}')
        # a gitignored path is runtime state, not a repo file — never a phantom
        if git -C "$(git rev-parse --show-toplevel 2>/dev/null)" check-ignore -q "$CLAIMED_FILE" 2>/dev/null; then
          continue
        fi
        if ! git cat-file -e "$SHA:$CLAIMED_FILE" 2>/dev/null; then
          printf 'PHANTOM-DIFF:%s:%s (claimed %s does not exist)\n' "$SHA" "$SUBJECT" "$CLAIMED_FILE"
          ORPHANS=$((ORPHANS + 1))
        fi
      done < <(printf '%s\n' "$CLAIM_BODY" | grep -oiE "$FILE_CLAIM_RE")
    fi
  done

  return 0
}

# Main guard: only run when executed directly, not when sourced.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  scan_phantom "${1:?scan_phantom.sh: commit_range required}"
fi

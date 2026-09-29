// src/verbs/excerpt.ts — WHAT THE JUDGE IS SHOWN, AND WHAT THE HUMAN READS.
//
// Both must contain the MATCH. Two defects of the same class were found by measuring this on the
// real corpus (a 157 MB index of 11,832 opencode session files plus rows from four databases):
//
//   D-031 (find)  the judge got the document's first 1,200 chars while the phrase sat at char
//                 1267/1267/9224 — so it was asked "is this an instance of X?" while being shown
//                 text without X, and the chain returned 0 patterns for EVERY phrase.
//   D-032 (filter) the same head-slice at 1,500 chars: 4 of 6 candidates had their match OUTSIDE
//                 the excerpt (one at char 58,842).
//
// The corpus makes this worst-case: an opencode session file begins with a {file, patch,
// additions} JSON preamble, so the head is metadata, and metadata is never the content.

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "what", "when",
  "where", "which", "have", "has", "was", "were", "are", "its", "bug", "issue"]);

/** The tokens a phrase contributes as seeds: lowercased, no stopwords, longer than 3 chars.
 *  Falls back to the whole phrase when nothing survives, so a seed set is never empty. */
export function seedsOf(phrase: string): string[] {
  const toks = Array.from(new Set(phrase.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 3 && !STOP.has(t))));
  return toks.length > 0 ? toks : [phrase.toLowerCase()];
}

/** The earliest position at which any seed occurs, or -1. */
function firstHit(text: string, seeds: string[]): number {
  const low = text.toLowerCase();
  let at = -1;
  for (const s of seeds) {
    const i = low.indexOf(s.toLowerCase());
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  return at;
}

/** The excerpt a JUDGE is shown: centred on the first seed occurrence so the text that caused the
 *  match is IN the window. A short document is returned whole; with no seed present the head is
 *  returned, because a --where-only candidate has nothing to centre on. */
export function excerptAround(text: string, seeds: string[], max: number): string {
  if (text.length <= max) return text;
  const at = firstHit(text, seeds);
  if (at < 0) return text.slice(0, max);
  const half = Math.floor(max / 2);
  const start = Math.max(0, Math.min(at - half, text.length - max));
  return text.slice(start, start + max);
}

/** The QUOTE a HUMAN reads: it must START at the match, not at the head of the centred window.
 *  Centring alone was necessary but not sufficient — the quotes still began ~600 chars before the
 *  hit, so a reader could not see why the row matched. */
export function quoteAround(text: string, seeds: string[], len: number): string {
  const at = firstHit(text, seeds);
  return at >= 0 ? text.slice(at, at + len) : text.slice(0, len);
}

// src/store/db.ts — open/init the index store; resolve index paths + targets.
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.ts";

export const jmHome = (): string => process.env.JM_HOME ?? join(process.env.HOME ?? ".", ".jm");
export const indexDir = (): string => join(jmHome(), "index");
export const targetsPath = (): string => join(jmHome(), "targets.json");

export type TargetKind = "fs" | "sqlite" | "jsonl";
export interface Target { name: string; kind: TargetKind; root: string; opts?: Record<string, unknown>; }

export function openDb(path: string): Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  // ORDER MATTERS: the timeout must be in force BEFORE the pragma that needs a lock. Setting
  // `journal_mode = WAL` first meant the one statement most likely to contend ran unprotected —
  // measured: with the timeout set after it, ONE of four simultaneous indexers still died with
  // `database is locked`. (D-035; both other openers in this codebase have the timeout too, and
  // the STORE — the most contended file of the three — was the one missing it.)
  db.run("PRAGMA busy_timeout = 5000");
  // WAL IS PERSISTENT, SO SETTING IT IS A ONE-TIME MIGRATION — and the migration needs an EXCLUSIVE
  // lock that `busy_timeout` does not reliably wait out. Setting it unconditionally made FOUR
  // simultaneous opens on a FRESH database race for that lock: measured under load, rounds 5 and 7
  // of 8 lost a run to `database is locked` even WITH the timeout in force. Reading the current
  // mode first means only the first process converts; the others see "wal" and do nothing. The
  // setter is wrapped because losing the race is not an error: the winner's conversion is
  // persistent, so the loser simply proceeds against a database that is already in WAL.
  const mode = (db.query("PRAGMA journal_mode").get() as { journal_mode?: string } | null)?.journal_mode;
  if (mode !== "wal") {
    try { db.run("PRAGMA journal_mode = WAL"); }
    catch { /* another process won the conversion; WAL persists, so this is not a failure */ }
  }
  db.run(SCHEMA_SQL);
  // ATOMIC, NOT CHECK-THEN-INSERT (D-038). Reading first and inserting only when absent is a
  // TOCTOU race: four concurrent CLI runs all read "no row", all four inserted, and three died on
  // `UNIQUE constraint failed: meta.key` at exit 1. Measured over six rounds of four simultaneous
  // indexers: rounds 1-5 clean, round 6 lost a run. `INSERT OR IGNORE` is idempotent and lets the
  // database arbitrate the race instead of the application.
  db.run("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
  // ...AND THE VERSION IS READ BACK (audit schema.ts:4). It was written and never compared, so a
  // future `SCHEMA_VERSION` bump would REUSE an old store silently: `SCHEMA_SQL` is all
  // `CREATE TABLE IF NOT EXISTS`, which leaves an existing table's shape untouched, so the code would
  // run against a schema it was not written for and the first symptom would be a confusing
  // `no such column` from deep inside a verb. A store built by a different version is refused BY NAME,
  // with the remedy in the message, at the one moment the operator can act on it.
  const stored = (db.query("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value?: string } | null)?.value;
  const storedVersion = stored === undefined ? SCHEMA_VERSION : Number(stored);
  if (!Number.isFinite(storedVersion) || storedVersion !== SCHEMA_VERSION) {
    db.close();
    throw new Error(`JM_SCHEMA_MISMATCH: ${path} was built with schema v${stored} but this build expects v${SCHEMA_VERSION} — re-index into a fresh store (the old one needs an explicit migration)`);
  }
  return db;
}

/** Sanitise a caller-supplied index name: no path separators, no traversal, bounded length. */
export function safeName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.\.+/g, "_").slice(0, 64);
  if (!cleaned || cleaned === "." || cleaned === "..") throw new Error(`JM_NAME_INVALID: "${name}"`);
  // COLLISION-PROOF, the same fix `safeTargetName` carries for D-027. `my index` and `my/index` both
  // sanitised to `my_index`, so two DIFFERENT index names resolved to ONE file — MEASURED: the second
  // `jm index --name "my/index"` reported `JM_INDEX_OK ... changed=0` while writing into the first
  // index's file, and `ls index/` showed a single `my_index.sqlite`. An operator naming two indexes
  // that differ only in punctuation silently got one. A name that was ALREADY safe is returned
  // UNCHANGED, so every existing index keeps its filename and `indexPathFor` stays deterministic.
  if (cleaned === name) return cleaned;
  return `${cleaned.slice(0, 48)}-${createHash("sha256").update(name).digest("hex").slice(0, 8)}`;
}
export const indexPathFor = (name: string): string => join(indexDir(), `${safeName(name)}.sqlite`);

/** A READ-ONLY open: the index must already exist. Creating a phantom index on a typo turned
 *  "no such index" into "no matches" with exit 0 — a silent wrong answer (second-operator drill,
 *  G1). Writers use openDb(); readers use this. */
export function openIndexExisting(name: string, dbPath: string): Database {
  if (!existsSync(dbPath)) {
    throw new Error(`JM_INDEX_MISSING: no index "${name}" at ${dbPath} — build it first (jm index --in all --name ${name})`);
  }
  return openDb(dbPath);
}

/** True when the index file exists (for a caller that wants to report rather than throw). */
export function indexExists(name: string): boolean {
  return existsSync(indexPathFor(name));
}

export function loadTargets(): Target[] {
  const p = targetsPath();
  if (!existsSync(p)) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(p, "utf8")); }
  catch { throw new Error(`JM_TARGETS_CORRUPT: ${p} is not valid JSON`); }   // LOUD: never a silent empty registry
  // VALID JSON IS NOT A VALID REGISTRY (audit db.ts:79). The parse result was cast straight to
  // `Target[]`, so `{}`, `null` or `"x"` — all valid JSON — sailed through and the failure surfaced
  // far away as `undefined is not a function` on `.find()` or `.filter()`. A file whose SHAPE is
  // wrong is as corrupt as one whose syntax is, and it is named the same way.
  if (!Array.isArray(parsed)) {
    throw new Error(`JM_TARGETS_CORRUPT: ${p} must be a JSON ARRAY of targets (found ${parsed === null ? "null" : typeof parsed})`);
  }
  for (const [i, t] of parsed.entries()) {
    const ok = t !== null && typeof t === "object"
      && typeof (t as Target).name === "string" && (t as Target).name.length > 0
      && typeof (t as Target).kind === "string"
      && typeof (t as Target).root === "string";
    if (!ok) throw new Error(`JM_TARGETS_CORRUPT: ${p} entry ${i} is not {name,kind,root} strings`);
  }
  return parsed as Target[];
}

export function saveTargets(list: Target[]): void {
  const p = targetsPath();
  mkdirSync(dirname(p), { recursive: true });
  // WRITE-THEN-RENAME (audit db.ts:76/86). `writeFileSync(p, …)` truncates the live file and rewrites
  // it in place, so a crash, an ENOSPC, or a killed process mid-write leaves a TRUNCATED or EMPTY
  // registry — and every target the operator defined is gone. Callers do read-modify-write
  // (`loadTargets()` → mutate → `saveTargets()`), which widens the window. `rename(2)` is atomic on
  // the same filesystem, so a reader sees either the old file or the new one, never a half-written one.
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(list, null, 2) + "\n");   // sync: errors throw, never swallowed
  renameSync(tmp, p);
}

/** THE NAMESPACES AN INDEX HOLDS — recorded per (PREFIX -> ROOT), and why.
 *
 *  FOUND BY RUNNING EVERY MCP USE CASE against the live store: every search returned each hit TWICE.
 *  The index held 125 rows for 68 real files — 68 bare (a bare-path run) and 57 `reports/`-prefixed
 *  (a target run) over the SAME directory. `files.path` is the row key and carries NO provenance, and
 *  the tombstone sweep only touches its own namespace (D-060/D-061), so two path-spaces coexist
 *  forever and nothing reconciles them. The operator asked for "point at X, find all of Y" and got
 *  every Y twice.
 *
 *  THE IDENTITY IS THE NAMESPACE, NOT THE RUN. A bare-path walk owns the prefix `""`; target Y owns
 *  `Y/`. That granularity is load-bearing: it is what lets the DOCUMENTED per-target refresh
 *  (`--in A,B` then `@A --name combined`, D-060) keep working — `A/` is unchanged, so the run is
 *  idempotent for its own namespace and the sweep never touches `B/`.
 *
 *  REFUSED, in two cases:
 *    · a recorded prefix whose ROOT MOVED          -> the same namespace now names different content
 *    · a NEW prefix whose ROOT IS ALREADY RECORDED -> the same directory under a second path-space,
 *      which is exactly the duplication this found (bare + `reports/` over one directory)
 *  `--rebuild` is the operator's explicit authority to replace: the rows and the record are cleared
 *  first, so what is left is the run's own sources and nothing else.
 *
 *  THE ROOTS ARE VALIDATED BEFORE ANYTHING IS WRITTEN. A refusal must not have touched the disk
 *  (D-054/D-055/D-056); a run whose root does not exist throws the engine's own missing-root token
 *  and leaves the store byte-identical. */
export interface NamespaceEntry {
  prefix: string;
  root: string;
  /** The adapter that will read this root. ONLY an `fs` (or unspecified) root is validated HERE —
   *  `JM_INDEX_MISSING` is the fs walker's token. A `sqlite`/`jsonl` root is validated by its OWN
   *  adapter, whose token is the one a caller already handles (proven consumers:
   *  `src/adapters/sqlite.ts:11` throws `JM_SQLITE_MISSING`; `tests/adapters.test.ts:108` asserts it
   *  from `ingestTarget`, and `test_watch_tick_survives_a_bad_registry` asserts it from the watch
   *  tick). Pre-validating with the fs token would answer a documented scenario with the wrong name. */
  kind?: "fs" | "sqlite" | "jsonl";
}

export function reconcileRoots(db: Database, entries: NamespaceEntry[], rebuild = false): "recorded" | "same" | "rebuilt" {
  // 1 · VALIDATE FIRST — before a single write, and with the token the KIND owns.
  for (const e of entries) {
    if ((e.kind === undefined || e.kind === "fs") && !existsSync(e.root)) {
      throw new Error(`JM_INDEX_MISSING: ${e.root} does not exist`);
    }
  }
  const stored = (db.query("SELECT value FROM meta WHERE key = 'roots'").get() as { value?: string } | null)?.value;
  let rec: Record<string, string> = {};
  if (stored !== undefined) {
    try { const parsed = JSON.parse(stored) as unknown; if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) rec = parsed as Record<string, string>; }
    catch { rec = {}; }
  }
  // 3 · THE CONFLICTS, decided before any mutation.
  // HOW MANY ROWS ARE ACTUALLY THERE. `--rebuild` means REPLACE WHAT IS HERE, so the purge has to
  // fire for a store that has rows but no record too — exactly the OLD store this check was written
  // for. (A ROW COUNT IS NOT A REFUSAL TRIGGER: `indexFile` is a shared internal —
  // `tests/regression.test.ts:19` seeds a row by calling it directly — so rows may legitimately exist
  // before any target-level record. Refusing on them broke that consumer; purging them on an explicit
  // `--rebuild` does not.)
  const rows = (db.query("SELECT COUNT(*) AS n FROM files").get() as { n: number }).n;
  const conflicts: string[] = [];
  for (const e of entries) {
    if (rec[e.prefix] !== undefined) {
      if (rec[e.prefix] !== e.root) conflicts.push(`namespace "${e.prefix || "(bare)"}" was rooted at ${rec[e.prefix]}, this run would root it at ${e.root}`);
    } else if (Object.values(rec).includes(e.root)) {
      const owner = Object.entries(rec).find(([, r]) => r === e.root)?.[0] ?? "?";
      conflicts.push(`root ${e.root} is already indexed as "${owner || "(bare)"}" and this run would add it again as "${e.prefix || "(bare)"}" — the same directory in two path-spaces`);
    }
  }
  if (conflicts.length && !rebuild) {
    throw new Error(
      `JM_INDEX_ROOTS_CHANGED: ${conflicts.join("; ")}. Stored paths are RELATIVE TO THE ROOT WALKED, so ` +
      `this would ADD a second copy rather than update the corpus. Re-index into a fresh store ` +
      `(--name <new>), or pass --rebuild to replace what is here.`,
    );
  }
  if (rebuild && (conflicts.length > 0 || rows > 0)) {
    purgeIndex(db);                                   // the operator authorised the replacement
    db.run("DELETE FROM meta WHERE key = 'roots'");
    rec = {};
  }
  const next = { ...rec };
  for (const e of entries) next[e.prefix] = e.root;
  db.run("INSERT OR REPLACE INTO meta(key, value) VALUES ('roots', ?)", [JSON.stringify(next)]);
  if (rebuild) return "rebuilt";
  return conflicts.length ? "rebuilt" : (stored === undefined ? "recorded" : "same");
}

/** Clear every ROW SPACE of an index. Meta (schema_version, roots) belongs to the caller — the run
 *  logs (runs/decisions/cache) are the engine's own history and are NOT a row space. */
export function purgeIndex(db: Database): void {
  db.run("DELETE FROM files");
  db.run("DELETE FROM docs");
  db.run("DELETE FROM docs_fts");
  db.run("DELETE FROM tags");
}

/** Resolve an argument to {name, root}: `@name` via the registry, else a path. */
export function resolveTarget(arg: string): { name: string; root: string } {
  if (arg.startsWith("@")) {
    const t = loadTargets().find((x) => x.name === arg.slice(1));
    if (!t) throw new Error(`JM_TARGET_UNKNOWN: ${arg} is not in ${targetsPath()}`);
    if (!existsSync(t.root)) throw new Error(`JM_TARGET_MISSING: ${t.name} -> ${t.root} does not exist`);
    return { name: t.name, root: t.root };
  }
  const root = resolve(arg);
  if (!existsSync(root)) throw new Error(`JM_TARGET_MISSING: ${root} does not exist`);
  const stem = (basename(root) || "root").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 40);
  const tag = createHash("sha256").update(root).digest("hex").slice(0, 6);   // /a/proj and /b/proj must not collide
  return { name: `${stem}-${tag}`, root };
}

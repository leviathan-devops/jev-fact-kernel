// src/store/db.ts — open/init the index store; resolve index paths + targets.
import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, basename, resolve } from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.ts";

export const jmHome = (): string => process.env.JM_HOME ?? join(process.env.HOME ?? ".", ".jm");
export const indexDir = (): string => join(jmHome(), "index");
export const targetsPath = (): string => join(jmHome(), "targets.json");

export type TargetKind = "fs" | "sqlite" | "jsonl";
export interface Target { name: string; kind: TargetKind; root: string; opts?: Record<string, unknown>; }

export function openDb(path: string): Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run(SCHEMA_SQL);
  const row = db.query("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value?: string } | null;
  if (!row) db.run("INSERT INTO meta(key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
  return db;
}

export const indexPathFor = (name: string): string => join(indexDir(), `${name}.sqlite`);

export function loadTargets(): Target[] {
  const p = targetsPath();
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, "utf8")) as Target[]; } catch { return []; }
}

export function saveTargets(list: Target[]): void {
  const p = targetsPath();
  mkdirSync(dirname(p), { recursive: true });
  Bun.write(p, JSON.stringify(list, null, 2) + "\n");
}

/** Resolve an argument to {name, root}: `@name` via the registry, else a path. */
export function resolveTarget(arg: string): { name: string; root: string } {
  if (arg.startsWith("@")) {
    const t = loadTargets().find((x) => x.name === arg.slice(1));
    if (!t) throw new Error(`JM_TARGET_UNKNOWN: ${arg} is not in ${targetsPath()}`);
    return { name: t.name, root: t.root };
  }
  const root = resolve(arg);
  if (!existsSync(root)) throw new Error(`JM_TARGET_MISSING: ${root} does not exist`);
  return { name: basename(root) || "root", root };
}

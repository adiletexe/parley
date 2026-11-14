/* SQLite through Node's built-in node:sqlite (Node 22.5+): no native module to compile on the 1-vCPU box.
   One file, WAL. Every table is keyed by person_id; a person is a guest until they leave an email. */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';

const DIR = process.env.DATA_DIR || './data';
mkdirSync(DIR, {recursive: true});
export const db = new DatabaseSync(join(DIR, 'parley.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  email TEXT, name TEXT,
  quiz_json TEXT,
  demo INTEGER NOT NULL DEFAULT 0,
  plan_tier TEXT, plan_started TEXT, plan_until TEXT,
  time_offset_days INTEGER NOT NULL DEFAULT 0,   -- demo time-travel: shifts this person's "now"
  free_replies_used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, occurred_at TEXT NOT NULL, channel TEXT NOT NULL,
  title TEXT NOT NULL, text TEXT NOT NULL, category TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]',
  amount_cents INTEGER, analysis_id TEXT, source TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_person ON entries(person_id, occurred_at);
CREATE TABLE IF NOT EXISTS drills (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  day INTEGER NOT NULL, created_at TEXT NOT NULL, json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkouts (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tier TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, json TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, person_id TEXT, at TEXT NOT NULL, name TEXT NOT NULL, json TEXT
);
`);

export const newId = (prefix = '') => prefix + randomBytes(9).toString('base64url');
export const nowIso = () => new Date().toISOString();

export type PersonRow = {
  id: string; created_at: string; email: string | null; name: string | null; quiz_json: string | null; demo: number;
  plan_tier: string | null; plan_started: string | null; plan_until: string | null; time_offset_days: number; free_replies_used: number;
};

export function getPerson(id: string): PersonRow | undefined {
  return db.prepare('SELECT * FROM people WHERE id = ?').get(id) as PersonRow | undefined;
}
export function createPerson(demo = false): PersonRow {
  const id = newId('p_');
  db.prepare('INSERT INTO people (id, created_at, demo) VALUES (?, ?, ?)').run(id, nowIso(), demo ? 1 : 0);
  return getPerson(id)!;
}
/** The person's "now": real time, shifted by demo time-travel days. */
export function personNow(p: PersonRow): Date {
  return new Date(Date.now() + p.time_offset_days * 86_400_000);
}
export function track(personId: string | null, name: string, data?: unknown) {
  db.prepare('INSERT INTO events (person_id, at, name, json) VALUES (?, ?, ?, ?)').run(personId, nowIso(), name, data ? JSON.stringify(data) : null);
}

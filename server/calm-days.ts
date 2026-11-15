/* Calm days, the streak behind the Course tab. A plan day counts when the person did that day's lesson (or any
   course practice) OR sent a reply through Parley that reads calm. Counted here in code from stored rows; the
   model is never asked. Days are 24-hour steps from plan start on the person's own clock (personNow), the same
   count /api/me reports, so the demo clock moves the streak too.
   Also owns the course's own tables: finished module/daily sessions and the "try it today" tasks. */
import {db, personNow, type PersonRow} from './db.js';
import type {Analysis} from '../shared/types.js';

db.exec(`
CREATE TABLE IF NOT EXISTS course_done (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  ref TEXT NOT NULL, created_at TEXT NOT NULL, correct INTEGER NOT NULL, total INTEGER NOT NULL, json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS course_done_person ON course_done (person_id, ref);
CREATE TABLE IF NOT EXISTS course_tasks (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  ref TEXT NOT NULL, created_at TEXT NOT NULL, task TEXT NOT NULL, did TEXT NOT NULL, topic TEXT,
  tried INTEGER, answered_at TEXT
);
CREATE INDEX IF NOT EXISTS course_tasks_person ON course_tasks (person_id, created_at);
`);

export const DAY = 86_400_000;
export const startMs = (p: PersonRow) => new Date(p.plan_started ?? p.created_at).getTime();
export const dayOfMs = (p: PersonRow, t: number) => Math.floor((t - startMs(p)) / DAY) + 1;
export const dayOfIso = (p: PersonRow, iso: string) => dayOfMs(p, new Date(iso).getTime());
export const todayOf = (p: PersonRow) => dayOfMs(p, personNow(p).getTime());
/** A moment inside plan day `d`, for its weekday label ("Mon"): now, moved by whole days. Not the day's start: a plan
    bought at 9pm has its days begin at 9pm, so the start of today is yesterday's date and every label read a day early. */
export const dayStartIso = (p: PersonRow, d: number) => new Date(personNow(p).getTime() + (d - todayOf(p)) * DAY).toISOString();

/* A sent reply that reads hot. Narrow on purpose: Parley's own suggestions never trip it, a heated text does. */
const HOT = [
  /\b(lol|lmao|lmfao|smh|wtf|istg)\b/i,
  /\b(?!(?:I|OK|AM|PM|ET|GAL|PDF)\b)[A-Z]{2,}\b/,
  /\?\?|!!/,
  /\b(you|u) (always|never)\b/i,
  /\b(court|lawyer|attorney|motion)\b/i,
  /\b(pathetic|unhinged|idiot|jealous|selfish|psycho)\b/i,
];
export const readsHot = (text: string) => HOT.some((r) => r.test(text));

export interface SentReply { at: string; text: string; calm: boolean; viaParley: boolean }

/** Replies the person sent, with a calm/hot read. "Through Parley" = copied from the coach (or the sample case's
    replies, which stand in for that). A reply that is the user's own draft the coach flagged high is never calm. */
export function sentReplies(p: PersonRow, fromIso?: string, toIso?: string): SentReply[] {
  const rows = db.prepare("SELECT occurred_at, text, analysis_id, source FROM entries WHERE person_id = ? AND kind = 'message_out' ORDER BY occurred_at").all(p.id) as
    {occurred_at: string; text: string; analysis_id: string | null; source: string}[];
  const flagged = new Set<string>();
  for (const r of db.prepare('SELECT id, json FROM analyses WHERE person_id = ?').all(p.id) as {id: string; json: string}[]) {
    try {
      const a = JSON.parse(r.json) as Analysis;
      if (a.draft && a.lens.some((f) => f.severity === 'high')) flagged.add(`${r.id}|${a.draft.trim()}`);
    } catch { /* a broken row is not a calm one */ }
  }
  return rows.filter((r) => (!fromIso || r.occurred_at >= fromIso) && (!toIso || r.occurred_at < toIso)).map((r) => {
    const own = r.analysis_id ? flagged.has(`${r.analysis_id}|${r.text.trim()}`) : false;
    return {at: r.occurred_at, text: r.text, calm: !own && !readsHot(r.text), viaParley: r.source === 'coach' || r.source === 'demo'};
  });
}

/** Plan days that were calm: a lesson or practice done, or a calm reply sent through Parley. */
export function calmDaySet(p: PersonRow): Set<number> {
  const days = new Set<number>();
  for (const r of db.prepare('SELECT created_at FROM plan_sessions WHERE person_id = ?').all(p.id) as {created_at: string}[]) days.add(dayOfIso(p, r.created_at));
  for (const r of db.prepare('SELECT created_at FROM course_done WHERE person_id = ?').all(p.id) as {created_at: string}[]) days.add(dayOfIso(p, r.created_at));
  for (const s of sentReplies(p)) if (s.viaParley && s.calm) days.add(dayOfIso(p, s.at));
  return days;
}

export interface Streak { days: number; today: boolean; last7: {day: number; at: string; calm: boolean; today: boolean}[] }

export function streakOf(p: PersonRow): Streak {
  const set = calmDaySet(p);
  const today = todayOf(p);
  let n = 0;
  for (let d = set.has(today) ? today : today - 1; d >= 1 && set.has(d); d--) n++;
  // Always seven slots: the last week, or, in the first week, days 1 to 7 with the ones still ahead left empty.
  const from = Math.max(1, today - 6);
  const last7 = Array.from({length: 7}, (_, i) => from + i)
    .map((d) => ({day: d, at: dayStartIso(p, d), calm: d <= today && set.has(d), today: d === today}));
  return {days: n, today: set.has(today), last7};
}

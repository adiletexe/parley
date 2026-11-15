import type {Hono} from 'hono';
import {db, getPerson, newId, personNow, track, type PersonRow} from '../db.js';
import {hasAccess, planDay, PAYWALL} from '../me.js';
import type {Category, QuizAnswers} from '../../shared/types.js';
import {BANK_POOL, dayPack, type PoolQ, type Trigger} from '../drill-bank.js';
import {COURSE_DAYS, COURSE_WEEKS, DID, MODULES, YOU, courseDay, moduleLesson, moduleOf, type CourseModule, type LessonText} from '../course-content.js';
import {DAY, dayOfIso, dayStartIso, sentReplies, streakOf, todayOf} from '../calm-days.js';
import {listEntries, isTense} from '../journal-store.js';
import {localDay} from '../pdf.js';
import {gradeDraft} from '../prompts/reply.js';
import {sessionFor} from './plan.js';
import type {SessionView} from '../plan-content.js';
import {existsSync, readFileSync, statSync} from 'node:fs';

/* The Course tab around the path: one lesson player for every kind of day (a course day, a seasonal module day,
   the daily practice after day 28), the "try it today" tasks and their check-ins, the week badge, the Sunday
   summary and the modules. Everything is chosen and counted here in code from stored rows and static content;
   the only model call is the optional "write your own" verdict, and it answers in words. */

const quizOf = (p: PersonRow): QuizAnswers => { try { return p.quiz_json ? JSON.parse(p.quiz_json) as QuizAnswers : {}; } catch { return {}; } };
const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : typeof v === 'string' ? [v] : []);
const tzOf = (p: PersonRow) => (p.demo ? 'America/New_York' : 'UTC');
const localDate = (p: PersonRow, d = personNow(p)) => localDay(d.toISOString(), tzOf(p));

/* ---------- the practice pool: the bank's scenarios plus the modules' own, each tagged with a topic ---------- */
const MODULE_POOL: PoolQ[] = MODULES.flatMap((m) => m.days.map((d, i) => ({
  key: `m-${m.id}-${i + 1}`, trigger: d.q.trigger, them: [...d.q.them],
  options: d.q.opts.map(([text, tag], k) => ({text, good: k === d.q.good, tag})) as PoolQ['options'],
})));
const POOL: PoolQ[] = [...BANK_POOL, ...MODULE_POOL];

/** A small seeded shuffle, so the same ref always gives the same five texts (the answers are checked against it). */
function seeded(seed: string) {
  let h = 2166136261;
  for (let k = 0; k < seed.length; k++) h = Math.imul(h ^ seed.charCodeAt(k), 16777619);
  return () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle<T>(xs: T[], seed: string): T[] {
  const rnd = seeded(seed), o = [...xs];
  for (let k = o.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [o[k], o[j]] = [o[j], o[k]]; }
  return o;
}
/** Five texts, `quota` per topic first, the rest from anywhere; never the same text twice, never one in `skip`. */
function pick(quota: [Trigger, number][], seed: string, skip: string[] = []): PoolQ[] {
  const out: PoolQ[] = [];
  const free = shuffle(POOL.filter((q) => !skip.includes(q.key)), seed);
  for (const [t, n] of quota) for (const q of free) { if (out.filter((x) => x.trigger === t).length >= n || out.length >= 5) break; if (q.trigger === t && !out.includes(q)) out.push(q); }
  for (const q of free) { if (out.length >= 5) break; if (!out.includes(q)) out.push(q); }
  return out;
}
const asSession = (day: number, skill: string, rule: string, ref: string, qs: PoolQ[]): SessionView => ({
  day, skill, rule, questions: qs.map((q) => ({id: `${ref}#${q.key}`, trigger: q.trigger, them: [...q.them], options: q.options.map((o) => ({...o}))})),
});

/* ---------- practice days 29+ (server/practice/days-*.json, written separately) ----------
   One entry per plan day: {day, module, title, chat[], drill{them[], options[], why[]}, tryToday}. Read tolerantly
   (an option may be a string or {text, good, tag}; the good one may be marked on the option or as drill.good) and
   re-read when a file changes. A missing file or day falls back to the bank, picked by their record's topics. */
export interface PracticeDay { day: number; module: string; title: string; chat: string[]; q: PoolQ | null; tryToday: string }
const PRACTICE_FILES = ['server/practice/days-029-118.json', 'server/practice/days-119-210.json'];
let practiceCache: {key: string; days: Map<number, PracticeDay>} = {key: '', days: new Map()};
function practiceDays(): Map<number, PracticeDay> {
  const live = PRACTICE_FILES.filter((f) => existsSync(f));
  const key = live.map((f) => `${f}:${statSync(f).mtimeMs}`).join('|');
  if (key === practiceCache.key) return practiceCache.days;
  const days = new Map<number, PracticeDay>();
  for (const f of live) {
    let rows: unknown;
    try { rows = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.error('[practice] bad file', f, (e as Error).message); continue; }
    const list = Array.isArray(rows) ? rows : Array.isArray((rows as {days?: unknown[]})?.days) ? (rows as {days: unknown[]}).days : [];
    for (const r of list as Record<string, unknown>[]) {
      const day = Number(r?.day);
      if (!Number.isInteger(day) || day < 29) continue;
      const d = (r.drill ?? {}) as Record<string, unknown>;
      const them = Array.isArray(d.them) ? d.them.map(String).filter(Boolean) : [];
      const why = Array.isArray(d.why) ? d.why.map(String) : [];
      const goodIx = Number(d.good ?? d.answer ?? d.correct);
      const options = (Array.isArray(d.options) ? d.options : []).slice(0, 3).map((o, i) => {
        const obj: Record<string, unknown> = typeof o === "object" && o ? o as Record<string, unknown> : {text: o};
        const good = typeof obj.good === 'boolean' ? obj.good : i === goodIx;
        return {text: String(obj.text ?? ''), good, tag: String(obj.tag ?? obj.why ?? why[i] ?? (good ? 'The calm one' : 'Feeds the fight'))};
      });
      const q = them.length && options.length === 3 && options.filter((o) => o.good).length === 1
        ? {key: `p${day}`, trigger: 'schedule' as Trigger, them, options: options as PoolQ['options']} : null;
      const chat = (Array.isArray(r.chat) ? r.chat : []).map((c) => (typeof c === 'string' ? c : String((c as {text?: unknown})?.text ?? ''))).filter(Boolean);
      days.set(day, {day, module: String(r.module ?? ''), title: String(r.title ?? `Day ${day}`), chat, q, tryToday: String(r.tryToday ?? '')});
    }
  }
  practiceCache = {key, days};
  return days;
}
export const practiceDay = (day: number) => practiceDays().get(day) ?? null;

/* ---------- daily practice after day 28: the topics of their own record ---------- */
const CAT_TOPIC: Partial<Record<Category, Trigger>> = {schedule: 'schedule', logistics: 'schedule', money: 'money', new_partner: 'partner', school: 'school', health: 'health'};
const TOPIC_WORD: Record<Trigger, string> = {schedule: 'the schedule', money: 'money', partner: 'a new partner', school: 'school', health: 'health', messenger: 'the kids in the middle'};
const QUIZ_TOPIC: Record<string, Trigger> = {schedule: 'schedule', money: 'money', partner: 'partner', school: 'school', messenger: 'messenger'};

export function dailyPlan(p: PersonRow) {
  const since = new Date(personNow(p).getTime() - 30 * DAY).toISOString();
  const counts = new Map<Trigger, number>();
  for (const e of listEntries(p.id, {from: since, kinds: ['message_in']})) {
    const t = CAT_TOPIC[e.category] ?? (/emma|noah|the kids|says u|told (me|him|her)/i.test(e.text) ? 'messenger' : undefined);
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  let from: 'record' | 'quiz' | 'bank' = 'record';
  let ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (total < 4) {
    // A thin record: lean on what they told the quiz, then on the bank's own mix.
    const q = list(quizOf(p).triggers).map((t) => QUIZ_TOPIC[t]).filter((t): t is Trigger => !!t);
    ranked = q.map((t, i) => [t, q.length - i] as [Trigger, number]);
    from = ranked.length ? 'quiz' : 'bank';
  }
  const sum = ranked.reduce((a, [, n]) => a + n, 0) || 1;
  const quota: [Trigger, number][] = ranked.slice(0, 3).map(([t, n]) => [t, Math.max(1, Math.round((5 * n) / sum))]);
  return {from, topics: ranked.slice(0, 3).map(([t]) => TOPIC_WORD[t]), quota};
}

/* ---------- seasonal modules: open by the calendar or by what they told us ---------- */
function inWindow(m: CourseModule, p: PersonRow): boolean {
  if (!m.window) return false;
  const [y, mo, d] = localDate(p).split('-').map(Number); void y;
  const v = mo * 100 + d, a = m.window[0][0] * 100 + m.window[0][1], b = m.window[1][0] * 100 + m.window[1][1];
  return a <= b ? v >= a && v <= b : v >= a || v <= b;
}
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const doneRefs = (p: PersonRow) => new Set((db.prepare('SELECT DISTINCT ref FROM course_done WHERE person_id = ?').all(p.id) as {ref: string}[]).map((r) => r.ref));

export function modulesOf(p: PersonRow) {
  const quiz = quizOf(p);
  const done = doneRefs(p);
  const partner = list(quiz.triggers).includes('partner') || listEntries(p.id, {category: 'new_partner'}).length > 0;
  const court = ['mediation', 'active', 'hearing', 'modification', 'gal'].includes(String(quiz.court ?? ''));
  const rows = MODULES.map((m) => {
    const dn = m.days.filter((_, i) => done.has(`mod:${m.id}:${i + 1}`)).length;
    let open = dn > 0, why = '';
    if (m.window) {
      const now = inWindow(m, p);
      open ||= now;
      why = now ? `Open now, from ${MONTH[m.window[0][0] - 1]} ${m.window[0][1]}` : `Opens ${MONTH[m.window[0][0] - 1]} ${m.window[0][1]}`;
    } else if (m.id === 'partner') { open ||= partner; why = partner ? 'Open: a new partner came up' : 'Opens when a new partner comes up'; }
    else if (m.id === 'mediation') { open ||= court; why = court ? 'Open: you have mediation or a case' : 'Opens before mediation'; }
    return {id: m.id, title: m.title, sub: m.sub, icon: m.icon, open, why, done: dn, total: m.days.length, days: m.days.map((d) => d.title), seasonal: !!m.window && inWindow(m, p)};
  });
  // Next up: an open module that is in season first, then any open one; never a finished one.
  const next = rows.filter((r) => r.open && r.done < r.total).sort((a, b) => Number(b.seasonal) - Number(a.seasonal))[0];
  return {modules: rows, next: next ? {...next, nextDay: next.done + 1, dayTitle: moduleOf(next.id)!.days[next.done].title} : null};
}

/* ---------- the Sunday summary ---------- */
export function weekSummary(p: PersonRow) {
  const now = personNow(p);
  const from = new Date(now.getTime() - 7 * DAY);
  const all = listEntries(p.id);
  const ins = all.filter((e) => e.kind === 'message_in' && e.occurredAt >= from.toISOString() && e.occurredAt < now.toISOString());
  const outs = all.filter((e) => e.kind === 'message_out');
  const sent = sentReplies(p, from.toISOString(), now.toISOString());
  // Bait left alone: a tense message with no reply from them in the next 24 hours.
  const skipped = ins.filter((e) => isTense(e) && !outs.some((o) => o.occurredAt > e.occurredAt && new Date(o.occurredAt).getTime() - new Date(e.occurredAt).getTime() < DAY));
  const lessons = (db.prepare('SELECT COUNT(*) n FROM plan_sessions WHERE person_id = ? AND created_at >= ? AND created_at < ?').get(p.id, from.toISOString(), now.toISOString()) as {n: number}).n
    + (db.prepare('SELECT COUNT(*) n FROM course_done WHERE person_id = ? AND created_at >= ? AND created_at < ?').get(p.id, from.toISOString(), now.toISOString()) as {n: number}).n;
  const day = planDay(p);
  const coming: string[] = [];
  if (day < COURSE_DAYS) coming.push(`Day ${day + 1}: ${courseDay(day + 1).title}`);
  if (day + 1 < COURSE_DAYS) coming.push(`Day ${day + 2}: ${courseDay(day + 2).title}`);
  if (day >= COURSE_DAYS) coming.push('Daily practice from your own record');
  const next = modulesOf(p).next;
  if (next) coming.push(`${next.title} module is open`);
  const tz = tzOf(p);
  const f = localDay(from.toISOString(), tz), t = localDay(now.toISOString(), tz);
  return {
    from: from.toISOString(), to: now.toISOString(),
    messages: ins.length, calm: sent.filter((s) => s.calm).length, hot: sent.filter((s) => !s.calm).length, skipped: skipped.length, lessons,
    coming,
    pdf: `/api/timeline/pdf?from=${f}&to=${t}`,
  };
}

/* ---------- one lesson, whatever kind of day it is ---------- */
type Ref = {kind: 'day'; day: number} | {kind: 'mod'; m: CourseModule; n: number} | {kind: 'daily'; date: string};
function parseRef(s: string, p: PersonRow): Ref | null {
  let m = /^day:(\d{1,2})$/.exec(s);
  if (m) { const day = Number(m[1]); return day >= 1 && day <= COURSE_DAYS ? {kind: 'day', day} : null; }
  m = /^mod:([a-z]+):([1-5])$/.exec(s);
  if (m) { const mod = moduleOf(m[1]); return mod ? {kind: 'mod', m: mod, n: Number(m[2])} : null; }
  m = /^daily:(\d{4}-\d{2}-\d{2})$/.exec(s);
  if (m) return m[1] === localDate(p) ? {kind: 'daily', date: m[1]} : null;
  return null;
}
const refKey = (r: Ref) => (r.kind === 'day' ? `day:${r.day}` : r.kind === 'mod' ? `mod:${r.m.id}:${r.n}` : `daily:${r.date}`);
const topTrigger = (p: PersonRow) => list(quizOf(p).triggers)[0];

interface Pack { ref: string; kind: Ref['kind']; label: string; title: string; lesson: LessonText | null; session: SessionView; you?: string; did: string; week?: number; topics?: string[]; from?: string; chat?: string[]; tryToday?: string }

function packOf(r: Ref, p: PersonRow): Pack {
  const ref = refKey(r);
  if (r.kind === 'day') {
    const l = courseDay(r.day, topTrigger(p));
    return {ref, kind: 'day', label: `Day ${r.day}`, title: l.title, lesson: l, session: sessionFor(p, r.day, dayPack(r.day)), you: YOU[r.day - 1], did: DID[r.day - 1], week: l.week};
  }
  if (r.kind === 'mod') {
    const l = moduleLesson(r.m, r.n);
    // The module's own other four texts first (on topic for the season), then one from the pool on its main topic.
    const own = MODULE_POOL.filter((q) => q.key.startsWith(`m-${r.m.id}-`) && q.key !== `m-${r.m.id}-${r.n}`);
    const qs = [...own, ...pick([[r.m.triggers[0], 1]], ref, MODULE_POOL.map((q) => q.key)).slice(0, 5 - own.length)];
    return {ref, kind: 'mod', label: `${r.m.title} · Day ${r.n}`, title: l.title, lesson: l, session: asSession(0, r.m.title, l.idea, ref, qs), you: l.learned[0], did: l.title};
  }
  const plan = dailyPlan(p);
  const pd = practiceDay(planDay(p));
  // The day's own written text first (when the practice files have this day), then texts like their record's.
  const qs = [...(pd?.q ? [pd.q] : []), ...pick(plan.quota, `${p.id}|${ref}`)].slice(0, 5);
  return {ref, kind: 'daily', label: pd ? `Day ${pd.day}${pd.module ? ` · ${pd.module}` : ''}` : 'Daily practice', title: pd?.title ?? 'Five texts like yours', lesson: null,
    chat: pd?.chat ?? [], tryToday: pd?.tryToday || undefined,
    session: asSession(0, 'Daily practice', 'Pause, find the ask, keep it short.', ref, qs), did: pd?.title ?? 'Answered a real text the calm way', topics: plan.topics, from: plan.from};
}

function allowed(r: Ref, p: PersonRow): string | null {
  if (r.kind === 'day' && r.day > planDay(p)) return `Day ${r.day} opens on its day.`;
  if (r.kind === 'mod' && !modulesOf(p).modules.find((m) => m.id === r.m.id)?.open) return 'This module is not open yet.';
  if (r.kind === 'daily' && planDay(p) <= COURSE_DAYS && !p.demo) return 'Daily practice starts after day 28.';
  return null;
}

/** Yesterday's (or any earlier) task they haven't said anything about: the chat opens by asking. */
function pendingCheckIn(p: PersonRow) {
  const today = todayOf(p);
  const rows = db.prepare('SELECT id, ref, created_at, task FROM course_tasks WHERE person_id = ? AND tried IS NULL ORDER BY created_at DESC LIMIT 1').all(p.id) as {id: string; ref: string; created_at: string; task: string}[];
  const r = rows[0];
  return r && dayOfIso(p, r.created_at) < today ? {id: r.id, task: r.task} : null;
}

export default function register(app: Hono) {
  app.get('/api/course', (c) => {
    const p = getPerson(c.get('person').id)!;
    const day = planDay(p);
    const local = new Date(personNow(p).toLocaleString('en-US', {timeZone: tzOf(p)}));
    const sunday = local.getDay() === 0;
    const plan = dailyPlan(p);
    const ref = `daily:${localDate(p)}`;
    const {modules, next} = modulesOf(p);
    return c.json({
      day, total: COURSE_DAYS, finished: day > COURSE_DAYS, demo: !!p.demo, now: personNow(p).toISOString(),
      streak: streakOf(p),
      // Every Sunday once there is a week to look back on; always for the jury's sample case.
      summary: (sunday && day >= 3) || p.demo ? {...weekSummary(p), sunday} : null,
      modules, next,
      daily: day > COURSE_DAYS || p.demo ? {ref, topics: plan.topics, from: plan.from, done: doneRefs(p).has(ref),
        today: day > COURSE_DAYS ? practiceDay(day) && {day, module: practiceDay(day)!.module, title: practiceDay(day)!.title} : null,
        next: day >= COURSE_DAYS && practiceDay(day + 1) ? {day: day + 1, module: practiceDay(day + 1)!.module, title: practiceDay(day + 1)!.title} : null} : null,
      weeksDone: COURSE_WEEKS.filter((w) => day > w.week * 7).map((w) => w.week),
    });
  });

  app.get('/api/course/lesson', (c) => {
    const p = getPerson(c.get('person').id)!;
    const r = parseRef(c.req.query('ref') ?? '', p);
    if (!r) return c.json({error: 'That lesson is not part of the course.'}, 400);
    if (!hasAccess(p)) return c.json(PAYWALL, 402);
    const no = allowed(r, p);
    if (no) return c.json({error: no}, 403);
    const pack = packOf(r, p);
    return c.json({...pack, checkIn: pendingCheckIn(p), streak: streakOf(p).days});
  });

  app.post('/api/course/done', async (c) => {
    const p = getPerson(c.get('person').id)!;
    const b = await c.req.json().catch(() => ({})) as {ref?: string; answers?: {id?: unknown; picked?: unknown}[]; topic?: string};
    const r = parseRef(String(b.ref ?? ''), p);
    if (!r) return c.json({error: 'That lesson is not part of the course.'}, 400);
    const no = allowed(r, p);
    if (no) return c.json({error: no}, 403);
    const pack = packOf(r, p);
    const byId = new Map(pack.session.questions.map((q) => [q.id, q]));
    const picks: {id: string; picked: number; good: boolean}[] = [];
    for (const a of Array.isArray(b.answers) ? b.answers : []) {
      const q = byId.get(String(a?.id ?? '')), k = Number(a?.picked);
      if (!q || picks.some((x) => x.id === q.id) || !Number.isInteger(k) || k < 0 || k >= q.options.length) return c.json({error: "Those answers don't match this lesson."}, 400);
      picks.push({id: q.id, picked: k, good: q.options[k].good});
    }
    if (picks.length !== pack.session.questions.length) return c.json({error: 'Answer every message first.'}, 400);
    const at = personNow(p).toISOString();
    const correct = picks.filter((x) => x.good).length, total = picks.length;
    // A course day is stored where the path reads it (plan_sessions), so the path, the badge and the streak agree.
    if (r.kind === 'day') {
      db.prepare('INSERT INTO plan_sessions (id, person_id, day, created_at, correct, total, json) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(newId('s_'), p.id, r.day, at, correct, total, JSON.stringify({picks, skill: pack.session.skill, course: true}));
    } else {
      db.prepare('INSERT INTO course_done (id, person_id, ref, created_at, correct, total, json) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(newId('c_'), p.id, pack.ref, at, correct, total, JSON.stringify({picks}));
    }
    const topic = typeof b.topic === 'string' ? b.topic.slice(0, 40) : null;
    const task = pack.lesson?.try ?? pack.tryToday;
    if (task && !db.prepare('SELECT 1 FROM course_tasks WHERE person_id = ? AND ref = ?').get(p.id, pack.ref)) {
      db.prepare('INSERT INTO course_tasks (id, person_id, ref, created_at, task, did, topic) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(newId('t_'), p.id, pack.ref, at, task, pack.did, topic);
    }
    track(p.id, 'course_done', {ref: pack.ref, correct, total});
    const st = streakOf(p);
    return c.json({ok: true, streak: st, correct, total});
  });

  /* "Did you get to try it?" A yes puts the day on the "you used it for real" calendar. */
  app.post('/api/course/checkin', async (c) => {
    const p = getPerson(c.get('person').id)!;
    const b = await c.req.json().catch(() => ({})) as {id?: string; tried?: boolean};
    const res = db.prepare('UPDATE course_tasks SET tried = ?, answered_at = ? WHERE id = ? AND person_id = ?')
      .run(b.tried ? 1 : 0, personNow(p).toISOString(), String(b.id ?? ''), p.id);
    if (!res.changes) return c.json({error: 'That task is not here any more.'}, 404);
    track(p.id, 'course_checkin', {tried: !!b.tried});
    return c.json({ok: true});
  });

  /* Write your own reply inside the lesson: one model call, the verdict comes back in words (never the number). */
  app.post('/api/course/write', async (c) => {
    const p = getPerson(c.get('person').id)!;
    const b = await c.req.json().catch(() => ({})) as {ref?: string; draft?: string};
    const r = parseRef(String(b.ref ?? ''), p);
    const draft = typeof b.draft === 'string' ? b.draft.trim() : '';
    if (!r || r.kind === 'daily') return c.json({error: 'Writing your own is part of a lesson.'}, 400);
    if (allowed(r, p)) return c.json({error: allowed(r, p)}, 403);
    if (draft.length < 3) return c.json({error: 'Write a reply first, even one line.'}, 400);
    if (draft.length > 800) return c.json({error: 'That is long. Try it in a few short lines.'}, 400);
    const today = (db.prepare("SELECT COUNT(*) n FROM events WHERE person_id = ? AND name = 'course_write' AND at >= ?").get(p.id, new Date(Date.now() - DAY).toISOString()) as {n: number}).n;
    if (today >= 10) return c.json({error: "That's plenty of writing for one day. Come back tomorrow."}, 429);
    const l = packOf(r, p).lesson!;
    const scenario = [`Lesson: "${l.title}". The idea: ${l.idea}`, `${l.from ?? 'The other parent'} sent these texts, in order:\n"""${l.them.join('\n') || '(no reply yet to: ' + (l.mine ?? '') + ')'}"""`,
      `A calm reply here: "${l.calm || 'no reply at all'}".`].join('\n');
    let g: Awaited<ReturnType<typeof gradeDraft>>;
    try { g = await gradeDraft({scenario, draft}); } catch (e) {
      console.error('[course] grade failed', (e as Error).message);
      return c.json({error: "We couldn't read that just now. Your reply is still here, try again in a minute."}, 503);
    }
    const low = draft.toLowerCase();
    const flags = (g.lens ?? []).filter((f) => f?.phrase && low.includes(f.phrase.toLowerCase())).slice(0, 3);
    const score = Math.max(0, Math.min(100, Number(g.score) || 0));
    // The number picks the words and stays here.
    const verdict = flags.some((f) => f.severity === 'high') || score < 60 ? 'bad' : score < 80 ? 'risky' : 'good';
    track(p.id, 'course_write', {ref: refKey(r), verdict});
    return c.json({verdict, flags: flags.map((f) => ({phrase: f.phrase, severity: f.severity, why: f.why, fix: f.fix})), better: String(g.better ?? '').trim()});
  });

  /* The week badge: the skills that week added, and the days they tried it for real. */
  app.get('/api/course/week', (c) => {
    const p = getPerson(c.get('person').id)!;
    const n = Math.floor(Number(c.req.query('n')));
    const w = COURSE_WEEKS.find((x) => x.week === n);
    if (!w) return c.json({error: 'That week is not part of the course.'}, 400);
    const day = planDay(p);
    if (day <= (n - 1) * 7) return c.json({error: 'That week has not started yet.'}, 403);
    const sessions = db.prepare('SELECT day FROM plan_sessions WHERE person_id = ?').all(p.id) as {day: number}[];
    const doneDays = new Set(sessions.map((s) => s.day));
    const tasks = db.prepare("SELECT ref, created_at, did, tried FROM course_tasks WHERE person_id = ? AND ref LIKE 'day:%'").all(p.id) as {ref: string; created_at: string; did: string; tried: number | null}[];
    const tried = new Map(tasks.filter((t) => t.tried === 1).map((t) => [Number(t.ref.slice(4)), t]));
    const first = (n - 1) * 7 + 1;
    const skills = Array.from({length: 7}, (_, i) => first + i).map((d) => ({day: d, you: YOU[d - 1], done: doneDays.has(d), open: d <= day}));
    const cal = Array.from({length: 14}, (_, i) => first + i).filter((d) => d <= COURSE_DAYS)
      .map((d) => ({day: d, at: dayStartIso(p, d), lesson: doneDays.has(d), tried: tried.has(d), today: d === day}));
    const log = [...tried.entries()].filter(([d]) => d >= first && d < first + 7).sort((a, b) => a[0] - b[0])
      .map(([d, t]) => ({day: d, did: t.did, at: t.created_at}));
    const nw = COURSE_WEEKS.find((x) => x.week === n + 1);
    return c.json({
      week: n, title: w.title, sub: w.sub, finished: day > n * 7, skills, cal, log,
      next: nw ? {week: nw.week, title: nw.title, day: n * 7 + 1, dayTitle: courseDay(n * 7 + 1).title, inDays: Math.max(0, n * 7 + 1 - day)} : null,
    });
  });
}

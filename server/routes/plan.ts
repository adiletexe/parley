import type {Hono} from 'hono';
import {db, newId, personNow, getPerson, track, type PersonRow} from '../db.js';
import {hasAccess, planDay, planState, PAYWALL} from '../me.js';
import type {Analysis, LensFlag, QuizAnswers} from '../../shared/types.js';
import {
  LESSONS, TOTAL_DAYS, WEEKS, TRIGGER_LABEL, drillFor, lessonFor, triggerFromQuiz,
  type DayStatus, type DrillAttempt, type PlanView, type SessionView, type Trigger,
} from '../plan-content.js';
import {gradeDraft} from '../prompts/reply.js';
import {dayPack, type DayPack, type Trigger as BankTrigger} from '../drill-bank.js';

/* The daily choice session: five messages from the other parent, three replies each, pick the one you'd send.
   The bank says which is good; this file only orders, checks, counts and stores. One row per finished session. */
db.exec(`CREATE TABLE IF NOT EXISTS plan_sessions (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  correct INTEGER NOT NULL,
  total INTEGER NOT NULL,
  json TEXT NOT NULL
)`);
db.exec('CREATE INDEX IF NOT EXISTS plan_sessions_person ON plan_sessions (person_id, day)');

/* The 28-day plan. Days are 24-hour steps from plan start on the person's own clock (personNow), the same count
   /api/me reports, so demo time-travel unlocks days here too. Everything the page shows — streak, calm days,
   weekly numbers, first → best — is counted here from stored rows; the model only grades a draft. */

const DAY = 86_400_000;
const MAX_ATTEMPTS_PER_DAY = 8;
const RENEWAL: Record<string, string> = {'1w': '$29.99 every 4 weeks', '4w': '$29.99 every 4 weeks', '12w': '$69.99 every 12 weeks', year: 'yearly'};

const startMs = (p: PersonRow) => new Date(p.plan_started ?? p.created_at).getTime();
const dayOfMs = (p: PersonRow, t: number) => Math.floor((t - startMs(p)) / DAY) + 1;
// No free days: the whole plan is behind the paywall (gate in server/index.ts). Kept as a check here too.
const hasFullAccess = hasAccess;

function quizOf(p: PersonRow): QuizAnswers | undefined {
  try { return p.quiz_json ? JSON.parse(p.quiz_json) as QuizAnswers : undefined; } catch { return undefined; }
}

const BANK_TRIGGERS: BankTrigger[] = ['schedule', 'money', 'partner', 'school', 'messenger', 'health'];
/** The quiz's first "what sets it off" answer that the bank writes questions for ('past' has none). */
function bankTriggerOf(quiz: QuizAnswers | undefined): BankTrigger | undefined {
  const v = (quiz as Record<string, unknown> | undefined)?.triggers;
  for (const t of Array.isArray(v) ? v : [v]) if (BANK_TRIGGERS.includes(t as BankTrigger)) return t as BankTrigger;
}

interface SessionRow {id: string; day: number; at: string; correct: number; total: number}
export function listSessions(personId: string): SessionRow[] {
  return db.prepare('SELECT id, day, created_at at, correct, total FROM plan_sessions WHERE person_id = ? ORDER BY created_at').all(personId) as unknown as SessionRow[];
}

/** One point per plan day with a session: the FIRST session's score, so "practice again" can't inflate the line. */
function skillTrend(sessions: SessionRow[], skill?: string) {
  const first = new Map<number, SessionRow>();
  for (const r of sessions) if (!first.has(r.day)) first.set(r.day, r);
  const pts = [...first.values()].sort((a, b) => a.day - b.day)
    .map((r) => ({day: r.day, pct: Math.round((r.correct / Math.max(1, r.total)) * 100), skill: dayPack(r.day).skill}));
  const same = skill ? pts.filter((p) => p.skill === skill) : [];
  return (same.length >= 2 ? same : pts).map(({day, pct}) => ({day, pct}));
}

/** The demo case's history: a finished session on `day` with `correct` right answers, as the page would have sent it. */
export function seedSession(personId: string, day: number, at: string, correct: number) {
  const pack = dayPack(day);
  const picks = pack.questions.map((q, i) => {
    const want = i < correct;
    const picked = Math.max(0, q.options.findIndex((o) => o.good === want));
    return {id: q.id, picked, good: q.options[picked].good};
  });
  const n = picks.filter((x) => x.good).length;
  db.prepare('INSERT INTO plan_sessions (id, person_id, day, created_at, correct, total, json) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(newId('s_'), personId, day, at, n, picks.length, JSON.stringify({picks, skill: pack.skill, demo: true}));
}

function sessionFor(p: PersonRow, day: number, pack: DayPack): SessionView {
  const top = bankTriggerOf(quizOf(p));
  const qs = [...pack.questions].sort((a, b) => Number(b.trigger === top) - Number(a.trigger === top));
  return {day, skill: pack.skill, rule: pack.rule,
    questions: qs.map((q) => ({id: q.id, trigger: q.trigger, them: [...q.them], options: q.options.map((o) => ({text: o.text, tag: o.tag, good: o.good}))}))};
}

export function listAttempts(personId: string): DrillAttempt[] {
  const rows = db.prepare('SELECT json FROM drills WHERE person_id = ? ORDER BY day, created_at').all(personId) as {json: string}[];
  return rows.map((r) => JSON.parse(r.json) as DrillAttempt);
}

/** Calm days: a plan day with practice (a drill, the coach, a coach-logged message) and no sent reply that carried
    a high-severity flag. A sent reply counts as risky only when what was logged is the user's own flagged draft. */
function activity(p: PersonRow, attempts: DrillAttempt[]) {
  const active = new Set<number>();
  const risky = new Set<number>();
  for (const a of attempts) active.add(dayOfMs(p, new Date(a.at).getTime()));
  // A finished choice session is practice too; it is stamped on the person's own clock, like drills.
  for (const r of listSessions(p.id)) active.add(dayOfMs(p, new Date(r.at).getTime()));

  const analyses = db.prepare('SELECT id, created_at, json FROM analyses WHERE person_id = ?').all(p.id) as {id: string; created_at: string; json: string}[];
  const byId = new Map<string, Analysis>();
  for (const r of analyses) {
    let a: Analysis | undefined;
    try { a = JSON.parse(r.json) as Analysis; } catch { continue; }
    byId.set(r.id, a);
    // Analyses are stamped with the real clock. For a demo person, ones made by the jury happened on the shifted clock.
    const shift = p.demo && !a.demo ? p.time_offset_days * DAY : 0;
    active.add(dayOfMs(p, new Date(r.created_at).getTime() + shift));
  }
  const outs = db.prepare("SELECT occurred_at, text, analysis_id, source FROM entries WHERE person_id = ? AND kind = 'message_out'").all(p.id) as
    {occurred_at: string; text: string; analysis_id: string | null; source: string}[];
  for (const e of outs) {
    const d = dayOfMs(p, new Date(e.occurred_at).getTime());
    if (e.source === 'coach') active.add(d);
    const a = e.analysis_id ? byId.get(e.analysis_id) : undefined;
    if (a?.draft && a.draft.trim() === e.text.trim() && a.lens.some((f) => f.severity === 'high')) risky.add(d);
  }
  return {active, risky};
}

function windowCount(sql: string, personId: string, from: number, to: number) {
  return (db.prepare(sql).get(personId, new Date(from).toISOString(), new Date(to).toISOString()) as {n: number}).n;
}

/** One stop on the Practice path. `state` is what the node looks like; the score is the BEST finished session of
    that plan day (first-session scores stay on the skill line). A catch-up session counts here under its own day. */
export interface PathDay {
  day: number; week: number; title: string; milestone: boolean;
  state: 'done' | 'today' | 'missed' | 'future' | 'paywall';
  correct?: number; total?: number; rounds: number;
}
/** /api/plan as the Practice home gets it: the plan view plus the path and each week's skill. */
export type PlanHome = PlanView & {
  path: PathDay[];
  /** Per plan week: the average first-session % over that week's days (the bank rotates its sets day by day, so
      this is the week's days, not one pack's skill), null before any of them is practised. */
  weekSkill: {week: number; pct: number | null; practised: number}[];
};

function pathOf(p: PersonRow, sessions: SessionRow[], day: number, full: boolean): Pick<PlanHome, 'path' | 'weekSkill'> {
  const by = new Map<number, SessionRow[]>();
  for (const r of sessions) by.set(r.day, [...(by.get(r.day) ?? []), r]);
  const path: PathDay[] = LESSONS.map((l) => {
    const rows = by.get(l.day) ?? [];
    const best = rows.reduce<SessionRow | undefined>((a, r) => (!a || r.correct > a.correct ? r : a), undefined);
    const state: PathDay['state'] = !full ? 'paywall' : best ? 'done' : l.day === day ? 'today' : l.day < day ? 'missed' : 'future';
    return {day: l.day, week: l.week, title: l.title, milestone: l.day % 7 === 0, state,
      correct: best?.correct, total: best?.total, rounds: rows.length};
  });
  const weekSkill = WEEKS.map((w) => {
    const firsts = path.filter((d) => d.week === w.week).map((d) => by.get(d.day)?.[0]).filter((r): r is SessionRow => !!r);
    const pct = firsts.length ? Math.round(firsts.reduce((a, r) => a + r.correct / Math.max(1, r.total), 0) / firsts.length * 100) : null;
    return {week: w.week, pct, practised: firsts.length};
  });
  return {path, weekSkill};
}

export function planView(p: PersonRow, wantDay?: number): PlanHome {
  const now = personNow(p);
  const day = planDay(p);
  const full = hasFullAccess(p);
  const quiz = quizOf(p);
  const quizTrigger = triggerFromQuiz(quiz as Record<string, unknown> | undefined);
  const attempts = listAttempts(p.id);
  const byDay = new Map<number, DrillAttempt[]>();
  for (const a of attempts) byDay.set(a.day, [...(byDay.get(a.day) ?? []), a]);

  const {active, risky} = activity(p, attempts);
  const calm = (d: number) => active.has(d) && !risky.has(d);
  const activeToday = calm(day);
  let streak = 0;
  for (let d = activeToday ? day : day - 1; d >= 1 && calm(d); d--) streak++;
  const calmList = [...active].filter((d) => d >= 1 && d <= day && calm(d)).sort((a, b) => a - b);
  const calmDays = calmList.length;

  const today = Math.min(day, TOTAL_DAYS);
  const days = LESSONS.map((l) => {
    const tries = byDay.get(l.day) ?? [];
    const status: DayStatus = !full ? 'locked' : l.day > day ? 'upcoming' : tries.length ? 'done' : l.day === today ? 'today' : 'open';
    return {day: l.day, week: l.week, title: l.title, status,
      first: tries[0]?.score, best: tries.length ? Math.max(...tries.map((t) => t.score)) : undefined};
  });

  const s = startMs(p);
  const weeks = WEEKS.map((w) => {
    const from = s + (w.week - 1) * 7 * DAY, to = s + w.week * 7 * DAY;
    const wd = days.filter((d) => d.week === w.week && d.best !== undefined);
    return {
      ...w,
      drills: wd.length,
      avgBest: wd.length ? Math.round(wd.reduce((a, d) => a + d.best!, 0) / wd.length) : null,
      replies: windowCount('SELECT COUNT(*) n FROM analyses WHERE person_id = ? AND created_at >= ? AND created_at < ?', p.id, from, to),
      entries: windowCount('SELECT COUNT(*) n FROM entries WHERE person_id = ? AND occurred_at >= ? AND occurred_at < ?', p.id, from, to),
      current: Math.ceil(today / 7) === w.week,
    };
  });

  const trend = days.filter((d) => d.best !== undefined).map((d) => ({day: d.day, first: d.first!, best: d.best!}));

  const viewDay = Math.min(Math.max(1, wantDay && Number.isFinite(wantDay) ? Math.floor(wantDay) : today), TOTAL_DAYS);
  const locked: PlanView['locked'] = !full ? 'paywall' : viewDay > day ? 'upcoming' : undefined;
  // A drill is written in the person's own trigger once they've told us; the attempts keep the message they actually saw.
  const d = drillFor(viewDay, quizTrigger);
  const tries = byDay.get(viewDay) ?? [];

  let renewal: PlanView['renewal'] = null;
  if (planState(p) === 'active' && p.plan_until) {
    const daysLeft = Math.max(0, Math.ceil((new Date(p.plan_until).getTime() - now.getTime()) / DAY));
    renewal = {until: p.plan_until, daysLeft, price: RENEWAL[p.plan_tier ?? ''] ?? '', remind: daysLeft <= 3};
  }

  const sessions = listSessions(p.id);
  const todayPack = dayPack(day);
  const sessionLocked = !full;
  const doneToday = sessions.filter((r) => r.day === day);

  return {
    ...pathOf(p, sessions, day, full),
    session: sessionLocked ? null : sessionFor(p, day, todayPack),
    sessionToday: doneToday.length ? {correct: Math.max(...doneToday.map((r) => r.correct)), total: doneToday[0].total, rounds: doneToday.length} : null,
    skill: todayPack.skill, rule: todayPack.rule,
    skillTrend: skillTrend(sessions, todayPack.skill),
    day, viewDay, total: TOTAL_DAYS, access: full ? 'full' : 'free', demo: !!p.demo, now: now.toISOString(),
    trigger: d.trigger, triggerLabel: TRIGGER_LABEL[d.trigger], personalised: !!quizTrigger,
    streak, calmDays, activeToday, calmList, days, weeks,
    lesson: locked ? null : lessonFor(viewDay),
    locked,
    drill: locked ? null : {message: tries[0]?.message ?? d.message, task: d.task, goal: d.goal, attempts: tries},
    trend,
    firstScore: trend.length ? trend[0].first : null,
    latestScore: trend.length ? trend[trend.length - 1].best : null,
    renewal,
  };
}

/** Keep only flags whose phrase is really in the draft, and a score in 0..100 — the model writes, our code checks. */
function clean(draft: string, g: {score: number; lens: LensFlag[]; better: string}) {
  const low = draft.toLowerCase();
  const lens = (Array.isArray(g.lens) ? g.lens : []).filter((f) => f && typeof f.phrase === 'string' && f.phrase.trim() && low.includes(f.phrase.trim().toLowerCase()));
  const score = Math.max(0, Math.min(100, Math.round(Number(g.score) || 0)));
  return {score, lens, better: String(g.better ?? '').trim()};
}

export default function register(app: Hono) {
  app.get('/api/plan', (c) => {
    const p = getPerson(c.get('person').id)!;
    const want = c.req.query('day') ? Number(c.req.query('day')) : undefined;
    return c.json(planView(p, want));
  });

  /* A past day's session, for "Catch up" on a missed day and "Practice again" on a finished one. Same pack as that
     day had; the path asks for it, today's comes with /api/plan. */
  app.get('/api/plan/session', (c) => {
    const p = getPerson(c.get('person').id)!;
    const day = Math.floor(Number(c.req.query('day')));
    if (!(day >= 1 && day <= TOTAL_DAYS)) return c.json({error: 'That day is not part of the plan.'}, 400);
    if (!hasFullAccess(p)) return c.json(PAYWALL, 402);
    if (day > planDay(p)) return c.json({error: `Day ${day} unlocks on its day.`}, 403);
    return c.json(sessionFor(p, day, dayPack(day)));
  });

  app.post('/api/plan/session', async (c) => {
    const p = getPerson(c.get('person').id)!;
    const b = await c.req.json().catch(() => ({})) as {day?: number; answers?: {id?: unknown; picked?: unknown}[]};
    const day = Math.floor(Number(b.day));
    const today = planDay(p);
    if (!(day >= 1)) return c.json({error: 'That day is not part of the plan.'}, 400);
    if (!hasFullAccess(p)) return c.json(PAYWALL, 402);
    if (day > today) return c.json({error: `Day ${day} unlocks on its day.`}, 403);
    // A past day is a catch-up or a repeat: it scores under its own day, and (stamped now) counts as today's practice.

    const pack = dayPack(day);
    const byId = new Map(pack.questions.map((q) => [q.id, q]));
    const answers = Array.isArray(b.answers) ? b.answers : [];
    const seen = new Set<string>();
    const picks: {id: string; picked: number; good: boolean}[] = [];
    for (const a of answers) {
      const id = String(a?.id ?? ''), picked = Number(a?.picked);
      const q = byId.get(id);
      if (!q || seen.has(id) || !Number.isInteger(picked) || picked < 0 || picked >= q.options.length) return c.json({error: 'Those answers do not match today\'s session.'}, 400);
      seen.add(id);
      picks.push({id, picked, good: q.options[picked].good});
    }
    if (picks.length !== pack.questions.length) return c.json({error: 'Answer every message first.'}, 400);

    const before = listSessions(p.id);
    const firstTimeToday = !before.some((r) => r.day === day);
    const correct = picks.filter((x) => x.good).length, total = picks.length;
    const at = personNow(p).toISOString();
    const id = newId('s_');
    db.prepare('INSERT INTO plan_sessions (id, person_id, day, created_at, correct, total, json) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, p.id, day, at, correct, total, JSON.stringify({picks, skill: pack.skill}));
    track(p.id, 'plan_session', {day, correct, total, first: firstTimeToday});

    const v = planView(p);
    return c.json({correct, total, firstTimeToday, streak: v.streak, skill: pack.skill, skillTrend: v.skillTrend});
  });

  app.post('/api/plan/drill', async (c) => {
    const p = getPerson(c.get('person').id)!;
    const b = await c.req.json().catch(() => ({})) as {day?: number; draft?: string};
    const day = Math.floor(Number(b.day));
    const draft = typeof b.draft === 'string' ? b.draft.trim() : '';
    if (!(day >= 1 && day <= TOTAL_DAYS)) return c.json({error: 'That day is not part of the plan.'}, 400);
    if (draft.length < 3) return c.json({error: 'Write a reply first — even one line.'}, 400);
    if (draft.length > 1500) return c.json({error: 'That reply is very long. Try saying it in a few sentences.'}, 400);
    if (!hasFullAccess(p)) return c.json(PAYWALL, 402);
    if (day > planDay(p)) return c.json({error: `Day ${day} unlocks on its day.`}, 403);

    const prior = listAttempts(p.id).filter((a) => a.day === day);
    if (prior.length >= MAX_ATTEMPTS_PER_DAY) return c.json({error: 'That is plenty of practice for one day. Come back tomorrow for the next drill.'}, 429);

    const lesson = lessonFor(day);
    const message = prior[0]?.message ?? drillFor(day, triggerFromQuiz(quizOf(p) as Record<string, unknown> | undefined)).message;
    const trigger = (prior[0]?.trigger ?? drillFor(day, triggerFromQuiz(quizOf(p) as Record<string, unknown> | undefined)).trigger) as Trigger;
    const scenario = [
      `Plan day ${day}: "${lesson.title}" — skill: ${lesson.skill}.`,
      `Task: ${lesson.drill.task}`,
      `What a good reply does here: ${lesson.drill.goal}`,
      `The other parent sent these texts (one per line, in order):\n"""${message}"""`,
    ].join('\n');

    let g: ReturnType<typeof clean>;
    try { g = clean(draft, await gradeDraft({scenario, draft})); } catch (e) {
      console.error('[plan] grade failed', e);
      return c.json({error: 'The grader could not read your reply just now. Your draft is still here — try again in a minute.'}, 503);
    }
    const at = personNow(p).toISOString();
    const row: DrillAttempt = {id: newId('d_'), day, attempt: prior.length + 1, at, draft, score: g.score, lens: g.lens, better: g.better, trigger, message};
    db.prepare('INSERT INTO drills (id, person_id, day, created_at, json) VALUES (?, ?, ?, ?, ?)').run(row.id, p.id, day, at, JSON.stringify(row));
    track(p.id, 'plan_drill', {day, attempt: row.attempt, score: row.score});

    const all = [...prior, row];
    return c.json({attempt: row, first: all[0].score, best: Math.max(...all.map((a) => a.score)), attempts: all.length});
  });

  /* A daily calendar reminder, no email needed: floating local time (no TZ), so the phone puts it at 19:00 wherever it is. */
  app.get('/api/plan/ics', (c) => {
    const p = getPerson(c.get('person').id)!;
    const m = /^(\d{1,2}):(\d{2})$/.exec(c.req.query('time') ?? '19:00');
    const hh = m ? Math.min(23, Number(m[1])) : 19, mm = m ? Math.min(59, Number(m[2])) : 0;
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.req.query('date') ?? '');
    const date = dm ? `${dm[1]}${dm[2]}${dm[3]}` : personNow(p).toISOString().slice(0, 10).replace(/-/g, '');
    const left = Math.max(7, TOTAL_DAYS - Math.min(planDay(p), TOTAL_DAYS) + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${date}T${pad(hh)}${pad(mm)}00`;
    const endMin = hh * 60 + mm + 5;
    const end = `${date}T${pad(Math.floor(endMin / 60) % 24)}${pad(endMin % 60)}00`;
    const host = c.req.header('x-forwarded-host') ?? c.req.header('host') ?? 'localhost';
    const proto = c.req.header('x-forwarded-proto') ?? (c.req.url.startsWith('https') ? 'https' : 'http');
    const link = `${proto}://${host}/app/plan`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Parley//Calm plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${p.id}-plan@parley`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DTEND:${end}`,
      `RRULE:FREQ=DAILY;COUNT=${left}`,
      'SUMMARY:Parley: 2-minute calm practice',
      `DESCRIPTION:Today's lesson and one short drill.\\n${link}`,
      `URL:${link}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Parley: 2-minute calm practice', 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR', '',
    ].join('\r\n');
    track(p.id, 'plan_ics', {time: `${pad(hh)}:${pad(mm)}`});
    return c.body(ics, 200, {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="parley-daily-reminder.ics"',
    });
  });
}

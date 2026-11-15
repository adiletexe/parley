import type {Hono} from 'hono';
import type {Category, QuizAnswers} from '../../shared/types.js';
import {db, getPerson, track, type PersonRow} from '../db.js';
import {hardestOf, meaningOf, skillsOf, type Skill} from '../../shared/starting-point.js';

/* The 1-minute check. Answers are kept as given (people.quiz_json); everything the rest of the app personalises
   with — conflict level, top trigger, what matters most — is DERIVED here in code, never asked of the model,
   so the same answers always give the same plan. Option ids are the ones Quiz.tsx sends. */

export type ConflictLevel = 'low' | 'medium' | 'high';
export interface QuizProfile {
  conflictLevel: ConflictLevel;
  conflictScore: number;          // 0..10, what the level was cut from
  topTrigger: string;             // option id, e.g. 'money'
  topTriggerLabel: string;        // plain words, e.g. 'Money and shared costs'
  topTriggerCategory: Category;   // the journal/plan category it maps to (PLAN picks drills by it)
  courtStage: string;             // option id: none | mediation | active | hearing | modification
  courtStageLabel: string;
  focus: string;                  // what matters most, given the court stage
  goal: string;                   // option id
  goalLabel: string;
  minutesPerWeek: number;         // midpoint of the bucket they picked; 0 when not asked (the short quiz drops it)
  tensePerWeek: number;           // illustrative starting point for the reveal chart
  kids?: string;
  role?: 'mom' | 'dad';           // screen 1. Stored for segmenting, never said back on a page
  ageBand?: '25_34' | '35_45';
  skills: Skill[];                // "your starting point": five skills in words (shared/starting-point.ts)
  hardest: string;
  meaning: string;
}

// ages, channels, support and time were asked by the longer quiz; they are still accepted and read, never required.
const KEYS: Record<string, 'one' | 'many' | 'text'> = {
  role: 'one', age: 'one',
  kids: 'one', ages: 'many', channels: 'many', tension: 'one', triggers: 'many', reaction: 'one', bait: 'one', asks: 'one', kidsnews: 'one',
  court: 'one', support: 'one', time: 'one', goal: 'one', name: 'text',
};

export const TRIGGERS: Record<string, {label: string; category: Category}> = {
  schedule: {label: 'Schedule changes and handoffs', category: 'schedule'},
  money: {label: 'Money and shared costs', category: 'money'},
  partner: {label: 'A new partner', category: 'new_partner'},
  school: {label: 'School and health decisions', category: 'school'},
  messenger: {label: 'The kids carrying messages', category: 'other'},
  past: {label: 'Old arguments coming back', category: 'accusation'},
};
const COURT: Record<string, {label: string; focus: string; weight: number}> = {
  none: {label: 'No court involvement', focus: 'Keeping things calm so it stays out of court', weight: 0},
  mediation: {label: 'In mediation', focus: 'Showing you can cooperate, in writing', weight: 1},
  active: {label: 'Active custody case', focus: 'Every message court-safe, every exchange on a dated record', weight: 2},
  hearing: {label: 'Hearing coming up', focus: 'A clean, court-ready timeline before the hearing', weight: 2},
  modification: {label: 'Changing the current order', focus: 'A dated record of what is actually happening now', weight: 2},
  gal: {label: 'GAL or evaluator involved', focus: 'Calm, consistent messages an evaluator can read', weight: 2},
};
const GOALS: Record<string, string> = {
  fewer_fights: 'Fewer fights',
  record: 'A clean record for court',
  peace: 'Peace of mind',
  kids: 'Keeping the kids out of it',
};
const TENSION: Record<string, {score: number; perWeek: number}> = {
  rarely: {score: 0, perWeek: 1}, monthly: {score: 1, perWeek: 2}, weekly: {score: 3, perWeek: 4}, daily: {score: 5, perWeek: 9},
};
const TIME: Record<string, number> = {lt1: 30, '1to3': 120, '3to6': 270, '6plus': 420};

const one = (v: QuizAnswers[string]) => (typeof v === 'string' ? v : undefined);
const many = (v: QuizAnswers[string]) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []);

export function deriveProfile(a: QuizAnswers): QuizProfile {
  const tension = TENSION[one(a.tension) ?? ''] ?? TENSION.weekly;
  const triggers = many(a.triggers).filter((t) => t in TRIGGERS);
  const court = one(a.court) ?? 'none';
  const reactions = many(a.reaction);
  // Each ingredient is something that, in the user's own words, makes the next message harder to answer well.
  let score = tension.score;
  score += Math.min(2, Math.max(0, triggers.length - 1));
  score += COURT[court]?.weight ?? 0;
  // The old quiz asked about a GAL separately; the short one folds it into the court question.
  if (court !== 'gal' && (a.support === 'gal' || a.support === 'both')) score += 1;
  if (reactions.includes('fast') || reactions.includes('long')) score += 1;
  if (triggers.includes('messenger')) score += 1;
  score = Math.min(10, score);
  const level: ConflictLevel = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
  // Triggers are stored in the order they were tapped; the first tap is the one on their mind.
  const top = triggers[0] ?? 'schedule';
  const goal = one(a.goal) ?? 'peace';
  return {
    conflictLevel: level,
    conflictScore: score,
    topTrigger: top,
    topTriggerLabel: TRIGGERS[top].label,
    topTriggerCategory: TRIGGERS[top].category,
    courtStage: court in COURT ? court : 'none',
    courtStageLabel: (COURT[court] ?? COURT.none).label,
    focus: (COURT[court] ?? COURT.none).focus,
    goal: goal in GOALS ? goal : 'peace',
    goalLabel: GOALS[goal] ?? GOALS.peace,
    minutesPerWeek: TIME[one(a.time) ?? ''] ?? 0,
    tensePerWeek: tension.perWeek,
    kids: one(a.kids),
    role: a.role === 'mom' || a.role === 'dad' ? a.role : undefined,
    ageBand: a.age === '25_34' || a.age === '35_45' ? a.age : undefined,
    skills: skillsOf(a),
    hardest: hardestOf(a),
    meaning: meaningOf(skillsOf(a)),
  };
}

/** Keep only known keys and sane values: this is user input that later lands in prompts and on pages. */
function clean(input: unknown): QuizAnswers {
  const out: QuizAnswers = {};
  if (!input || typeof input !== 'object') return out;
  for (const [k, kind] of Object.entries(KEYS)) {
    const v = (input as Record<string, unknown>)[k];
    if (kind === 'many' && Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 10);
    else if (kind === 'one' && typeof v === 'string') out[k] = v.slice(0, 40);
    else if (kind === 'text' && typeof v === 'string') { const t = v.replace(/\s+/g, ' ').trim().slice(0, 40); if (t) out[k] = t; }
  }
  return out;
}

function saved(p: PersonRow): QuizAnswers | null {
  try { return p.quiz_json ? (JSON.parse(p.quiz_json) as QuizAnswers) : null; } catch { return null; }
}

export default function register(app: Hono) {
  /* Saved after every answer (merged), so leaving halfway still personalises what they see next. */
  app.post('/api/quiz', async (c) => {
    const p = c.get('person');
    const body = (await c.req.json().catch(() => ({}))) as {answers?: unknown; done?: boolean};
    const incoming = clean(body.answers);
    const answers = {...(saved(p) ?? {}), ...incoming};
    // A name field sent empty means "skip" (or "forget it"), not "keep the old one".
    const sentName = !!body.answers && typeof body.answers === 'object' && 'name' in body.answers;
    if (sentName && !incoming.name) delete answers.name;
    db.prepare('UPDATE people SET quiz_json = ? WHERE id = ?').run(JSON.stringify(answers), p.id);
    if (sentName) db.prepare('UPDATE people SET name = ? WHERE id = ?').run((incoming.name as string | undefined) ?? null, p.id);
    if (body.done) track(p.id, 'quiz_complete', {answers: Object.keys(answers).length});
    return c.json({answers, profile: deriveProfile(answers)});
  });

  app.get('/api/quiz', (c) => {
    const p = getPerson(c.get('person').id)!;
    const answers = saved(p);
    return c.json({answers, profile: answers ? deriveProfile(answers) : null, name: p.name ?? undefined});
  });
}

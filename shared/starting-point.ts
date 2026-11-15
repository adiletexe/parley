/* "Your starting point": five communication skills in words, read from the quiz answers in code (no model, no
   numbers). The quiz page and the server read the same table, so a result never differs between the two. Each
   level is a word: Needs work, Getting there, Strong. These are skills, and skills move. */
import type {QuizAnswers} from './types.js';

export type Level = 'work' | 'there' | 'strong';
export const LEVEL_WORD: Record<Level, string> = {work: 'Needs work', there: 'Getting there', strong: 'Strong'};
export const LEVEL_TONE: Record<Level, 'warn' | 'amber' | 'ok'> = {work: 'warn', there: 'amber', strong: 'ok'};

export type SkillId = 'pause' | 'bait' | 'short' | 'asks' | 'kids';
export interface Skill { id: SkillId; label: string; icon: string; level: Level; where: string }

const one = (v: QuizAnswers[string]) => (typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined);
const many = (v: QuizAnswers[string]) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []);
const down = (l: Level): Level => (l === 'strong' ? 'there' : 'work');

export function skillsOf(a: QuizAnswers): Skill[] {
  const react = one(a.reaction), bait = one(a.bait), asks = one(a.asks), kids = one(a.kidsnews);
  const pause: Level = react === 'fast' ? 'work' : react === 'quiet' || react === 'friend' ? 'strong' : 'there';
  const b: Level = bait === 'ask' ? 'strong' : bait === 'jab' ? 'work' : 'there';
  const short: Level = react === 'long' || bait === 'both' ? (react === 'long' ? 'work' : 'there') : react === 'fast' ? 'there' : 'strong';
  const ask: Level = asks === 'time' ? 'strong' : asks === 'talk' ? 'work' : 'there';
  let k: Level = kids === 'check' ? 'strong' : kids === 'vent' ? 'work' : 'there';
  if (many(a.triggers).includes('messenger') && k !== 'work') k = down(k);
  return [
    {id: 'pause', label: 'Pausing before you reply', icon: 'timer', level: pause, where: 'the pause (Day 2)'},
    {id: 'bait', label: 'Not taking the bait', icon: 'no-bait', level: b, where: 'not taking the bait (Week 2)'},
    {id: 'short', label: 'Keeping it short', icon: 'brief', level: short, where: 'short replies (Day 4)'},
    {id: 'asks', label: 'Asking for things clearly', icon: 'boundary', level: ask, where: 'clear asks (Week 3)'},
    {id: 'kids', label: 'Keeping kids out of it', icon: 'goal-kids', level: k, where: 'keeping the kids out of it (Week 4)'},
  ];
}

/** "What this means", in one plain sentence. */
export function meaningOf(skills: Skill[]): string {
  const weak = skills.find((s) => s.level === 'work') ?? skills.find((s) => s.level === 'there');
  if (!weak) return 'You already have most of this. The course keeps it steady on the hard days.';
  return `Your course leans on ${weak.where}. Skills you already have get fewer days.`;
}

const TRIGGER_WORD: Record<string, string> = {
  schedule: 'The schedule', money: 'Money', partner: 'The new partner', school: 'School and health', messenger: 'The kids in the middle', past: 'The past',
};
/** "Hardest for you": the first two things they said set it off. */
export function hardestOf(a: QuizAnswers): string {
  const t = many(a.triggers).map((x) => TRIGGER_WORD[x]).filter(Boolean).slice(0, 2);
  if (!t.length) return 'Everyday logistics';
  return t.length === 1 ? t[0] : `${t[0]} and ${t[1].toLowerCase()}`;
}

/** The onboarding's "Day 1 you": the reply their own answer describes, next to the calm one. */
export function dayOneReply(a: QuizAnswers): {them: string[]; before: string; after: string} {
  const react = one(a.reaction);
  const them = ['so now SHE gets to come to the recital?', 'didnt even ask me', 'unbelievable'];
  const before = react === 'long'
    ? "she's been in their life for a year, you need to get over it. and fyi you never ask ME about anything either, so"
    : react === 'quiet'
      ? '(three hours later) fine. whatever. do what you want'
      : "wow. maybe if you weren't so jealous this wouldn't be a thing";
  return {them, before, after: "I'll be there at 6 with the kids. See you there."};
}

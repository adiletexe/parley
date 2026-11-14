/* The reply coach's engine. ONE model call per analysis: the model reads the other parent's message (or a
   screenshot of it), writes three replies and reads the user's draft through a family-court judge's eyes.
   Our code then checks what the model can't be trusted to: word counts, that every flagged phrase really
   occurs in the text it flags, that the scores agree with the flags, and that nothing hostile slipped into
   a reply. PLAN imports gradeDraft for drills; DEMO imports analyzeMessage to seed the sample case. */
import {geminiJSON, type AiImage} from '../ai.js';
import type {Analysis, Category, LensFlag, ReplyVariant} from '../../shared/types.js';

export const CATEGORIES: Category[] = ['schedule', 'money', 'health', 'school', 'new_partner', 'accusation', 'logistics', 'other'];

/* ---------- the prompt ---------- */

const VOICE = `
You are Parley's reply coach: a calm, sharp friend who knows how US family courts read co-parenting messages
(Bill Eddy's BIFF: Brief, Informative, Friendly, Firm; "gray rock" for pure provocation; parallel parenting).
The user is a parent raising kids in two homes. "The other parent" sent them a message. You write replies the USER
can send as-is, and you read the user's own draft the way a family-court judge, GAL or custody evaluator would.
You are not a lawyer and never give legal advice or predict outcomes.`;

const REPLY_RULES = `
HOW A PARLEY REPLY IS WRITTEN (every rule matters; a judge may read this reply out loud one day)
1. Answer only the concrete asks: times, places, pickups, money, school, health, what the kids need. Ignore insults,
   character attacks, old fights, opinions about the user's new partner, and anything said to provoke. Do not defend,
   justify, explain or apologise for anything that isn't a concrete ask. Never repeat or quote their insults.
2. NEVER INVENT FACTS. No times, dates, days, amounts, places, names, prior agreements, court orders, parenting-plan
   terms or receipts unless they appear in the message, the user's draft or the user's notes. When a reply needs a
   fact you don't have, write a short bracketed placeholder the user fills in: [time], [day], [amount], [place].
   At most two placeholders per reply. Prefer wording that needs none ("Can you send the invoice?").
3. NEVER ADMIT OR CONCEDE beyond what the user said. Don't agree with an accusation, don't promise to "do better",
   don't confirm being late, rude or wrong. Don't deny things you don't know about either: leave them out.
   Where they accuse, it's enough to move to the practical next step.
4. Child-focused: keep the kids at the centre and out of the adult conflict. Use the kids' names only if given.
   If the other parent threatens to tell the kids adult things, or uses them as messengers, the reply says calmly,
   once, that adult matters stay between the parents.
5. Tone: plain, warm-neutral US English, like a polite text to a coworker. Contractions are fine.
   NEVER use: "you always", "you never", "as usual", "per my last", "as I've said", "as I already told you",
   "again,", "clearly", "obviously", "just so you know", "for the record", "with all due respect", "I'm sure you",
   "unlike you", "I hope you", "some of us", "actually", "frankly", sarcasm, rhetorical questions, ALL CAPS,
   exclamation marks, emojis, therapy-speak ("I hear that you're feeling"), lectures about co-parenting, mentions
   of lawyers, court, police, judges, contempt or "documenting" (that reads as a threat).
6. Don't open with "Thanks for your message" or "I understand" when the message was hostile. Open with the answer.
   No greetings or sign-offs unless the message had them. If the message itself was friendly, a brief thanks is fine.
7. Three versions, each a complete message the user could send:
   - brief: one or two sentences, 25 words or fewer. Just the answer.
   - neutral: the BIFF version, 20-60 words: the answer, the one useful fact, a friendly close that invites a
     practical reply (not a question about feelings).
   - firm: 20-60 words, still polite: a clear boundary or decision plus ONE concrete next step with a deadline or
     time (use a placeholder like [day] if none was given). Firm is calm and final, never hostile or threatening.
8. If there is nothing to answer (pure venting or provocation), the replies are gray rock: short, neutral,
   information-free acknowledgements, e.g. "Got it." / "Noted. I'll see the kids at pickup on [day]." Never react to the bait.
9. Never write anything that could be read as a threat, an insult, guilt-tripping or keeping score.`;

const LENS_RULES = `
JUDGE'S LENS (reading the user's draft)
Flag the specific words a family-court judge would hold against the writer, plus what reads well.
- "phrase" MUST be copied character-for-character from the draft: same case, same punctuation, 2-14 words,
  a contiguous span that exists in the draft. Never paraphrase, never join two separate parts, never fix typos.
- severity "high": threats (court, police, lawyer, "you'll regret", withholding the kids or money), insults,
  name-calling, profanity, telling the other parent what the kids will be told, using the kids as messengers or
  weapons, disparaging the other parent's parenting, ultimatums over parenting time, admitting fault beyond the facts.
- severity "medium": absolutes ("you always", "you never", "every single time"), sarcasm, blame, dragging up old
  fights, over-explaining or defending, shouting (caps, "!!"), passive-aggressive phrases ("as usual", "per my last",
  "typical", "nice try"), emotional venting, rhetorical questions, demands with no reason or option.
- severity "good": specific, dated, child-focused, offers a practical solution, polite and firm. At most 2 good flags.
- "issue": 2-6 word label ("Reads as a threat", "Absolute claim", "Brings up old fights", "Child-focused").
- "why": one plain sentence on how a judge or evaluator reads it (they look at which parent keeps conflict low and
  supports the kids' relationship with the other parent). General information, not legal advice.
- "fix": for high/medium only, the replacement words for that phrase (or "Cut it." if it should go).
- Max 6 flags. Flag the most damaging first. Don't flag the same words twice.
- "draftScore" 0-100 court-safety: 90-100 exemplary BIFF; 70-89 fine with small issues; 40-69 risky (blame, sarcasm,
  absolutes, too long); 0-39 damaging (threats, insults, kids used as weapons).`;

const ANALYZE_TASK = `
WHAT TO RETURN (JSON, fields in this order)
- transcript: if a screenshot is attached, the other parent's most recent message(s) the user needs to answer,
  copied exactly (in chat screenshots the other parent's bubbles are usually on the left / grey; the user's are on the
  right / colored). Separate messages with a newline. If no screenshot, return "".
- stripped: exact words from their message you left out of "facts" because they are insults, blame, sarcasm or old
  history (max 5, each copied verbatim, 1-10 words). [] if none.
- facts: "Just the facts": their message with every insult, accusation about character and old history removed;
  only what concerns the kids, the schedule or money. One or two plain sentences, 35 words max, starting with
  "They". Never add facts. If nothing is left, write "No request. Only blame or venting."
- asks: each concrete request or question that needs an answer, as a short imperative phrase (max 4).
  e.g. "Confirm pickup time on Friday". [] if none.
- heat: 0-100 hostility of THEIR message (0 friendly, 30 tense, 60 hostile, 85+ threats or abuse).
- category: one of schedule, money, health, school, new_partner, accusation, logistics, other.
- advice: "reply" if there are asks; "brief_ack" if it needs only a short acknowledgement (information given, or an
  ask buried in venting); "no_reply" if it is pure provocation with nothing to answer.
- adviceWhy: one short sentence explaining the advice, addressed to the user ("You only need to answer the pickup time.").
- brief, neutral, firm: the three replies (see the rules).
- lens: if the user gave a draft, flags on the DRAFT (see Judge's lens). If no draft, 1-2 "good" flags on phrases
  copied exactly from your NEUTRAL reply, saying what makes it court-safe.
- draftScore: court-safety of the user's draft, 0-100. If no draft, 0.
- incident: worthLogging true only when their message contains something a parent should keep a dated record of:
  a threat (to withhold the kids, to involve the kids in adult conflict, to go to court/police as intimidation),
  a missed or late pickup or a no-show, denied or cancelled parenting time, disparaging the user to the kids, a
  safety or health concern, harassment or profanity, or refusing an agreed payment. Otherwise false.
  title: neutral, 3-8 words ("Threatened to tell kids about dispute"). note: one or two neutral factual sentences
  quoting the key words. If not worth logging, title "" and note "".`;

/* Two worked examples: the model copies tone from examples far more reliably than from rules. */
const EXAMPLES = `
EXAMPLES OF THE TONE (not templates; never reuse their facts)
Their message: "You were late AGAIN. The kids waited 40 minutes. Do you even care? Will you be on time Friday or not?"
  brief: "I'll be there at pickup on Friday at [time]."
  neutral: "I'll be at pickup on Friday at [time]. If anything changes on my end, I'll text you right away so the kids aren't left waiting."
  firm: "I'll be there Friday at [time]. If traffic ever makes me late, I'll text you as soon as I know. Let's keep messages to the pickup details."
  (No apology, no admission, no defence of Sunday, nothing about "do you even care".)
Their message: "You're a joke of a parent. Everyone sees it."
  advice: no_reply. brief: "Got it." neutral: "I've read your message. I'll see the kids at pickup as planned."
Their message: "If you say no I'm telling the kids it's your fault."
  a reply includes, once and calmly: "Please keep the kids out of this. It's between us."`;

const ANALYZE_SYSTEM = [VOICE, REPLY_RULES, EXAMPLES, LENS_RULES, ANALYZE_TASK].join('\n');

const LENS_ITEM = {
  type: 'object',
  properties: {
    phrase: {type: 'string'},
    severity: {type: 'string', enum: ['high', 'medium', 'good']},
    issue: {type: 'string'},
    why: {type: 'string'},
    fix: {type: 'string'},
  },
  required: ['phrase', 'severity', 'issue', 'why'],
  propertyOrdering: ['phrase', 'severity', 'issue', 'why', 'fix'],
};

const ANALYZE_SCHEMA = {
  type: 'object',
  properties: {
    transcript: {type: 'string'},
    stripped: {type: 'array', items: {type: 'string'}},
    facts: {type: 'string'},
    asks: {type: 'array', items: {type: 'string'}},
    heat: {type: 'integer'},
    category: {type: 'string', enum: CATEGORIES},
    advice: {type: 'string', enum: ['reply', 'brief_ack', 'no_reply']},
    adviceWhy: {type: 'string'},
    brief: {type: 'string'},
    neutral: {type: 'string'},
    firm: {type: 'string'},
    lens: {type: 'array', items: LENS_ITEM},
    draftScore: {type: 'integer'},
    incident: {
      type: 'object',
      properties: {worthLogging: {type: 'boolean'}, title: {type: 'string'}, note: {type: 'string'}},
      required: ['worthLogging', 'title', 'note'],
      propertyOrdering: ['worthLogging', 'title', 'note'],
    },
  },
  required: ['transcript', 'stripped', 'facts', 'asks', 'heat', 'category', 'advice', 'adviceWhy', 'brief', 'neutral', 'firm', 'lens', 'draftScore', 'incident'],
  propertyOrdering: ['transcript', 'stripped', 'facts', 'asks', 'heat', 'category', 'advice', 'adviceWhy', 'brief', 'neutral', 'firm', 'lens', 'draftScore', 'incident'],
};

interface RawAnalysis {
  transcript: string; stripped: string[]; facts: string; asks: string[]; heat: number; category: string;
  advice: string; adviceWhy: string; brief: string; neutral: string; firm: string; lens: LensFlag[];
  draftScore: number; incident: {worthLogging: boolean; title: string; note: string};
}

/* ---------- code-side checks (the model is not trusted with these) ---------- */

export const wordCount = (s: string) => (s.trim().match(/[A-Za-z0-9$£€\[\]][^\s]*/g) ?? []).length;

/** Phrases a reply must never contain. Used to clean the model's replies and to score drafts in code. */
export const HOSTILE_PATTERNS: {re: RegExp; issue: string; severity: 'high' | 'medium'}[] = [
  {re: /\byou (always|never)\b/i, issue: 'Absolute claim', severity: 'medium'},
  {re: /\b(every single time|as usual|typical)\b/i, issue: 'Keeps score', severity: 'medium'},
  {re: /\b(per my last|as i(?:'ve| have)? (?:already )?(?:said|told you|mentioned))\b/i, issue: 'Passive-aggressive', severity: 'medium'},
  {re: /\b(obviously|clearly|frankly|with all due respect|for the record|just so you know|nice try)\b/i, issue: 'Passive-aggressive', severity: 'medium'},
  {re: /\b(lawyer|attorney|court|judge|police|cops|contempt|custody evaluator)\b/i, issue: 'Reads as a threat', severity: 'high'},
  {re: /\b(idiot|stupid|crazy|psycho|pathetic|loser|liar|deadbeat|bitch|ass(hole)?|f+u+c+k\w*|shit\w*|damn)\b/i, issue: 'Insult', severity: 'high'},
  {re: /!{2,}|\b[A-Z]{5,}\b/, issue: 'Shouting', severity: 'medium'},
];

const norm = (s: string) =>
  s.replace(/[\u2018\u2019\u02bc]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();

/** Find `phrase` in `text`, forgiving only quotes, dashes, spacing, case and stray end punctuation.
    Returns the span exactly as it is in the text, or null — so the UI can underline it. */
export function locate(text: string, phrase: string): string | null {
  const p = norm(phrase).replace(/^["'.,;:!?\s]+|["'.,;:!?\s]+$/g, '');
  if (p.length < 2) return null;
  // Build a regex over the normalised phrase that tolerates the same variations in the original text.
  const esc = p.split(' ').map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['\u2018\u2019\u02bc]").replace(/"/g, '["\u201c\u201d]').replace(/-/g, '[-\u2013\u2014]'),
  ).join('\\s+');
  const m = new RegExp(esc, 'i').exec(text);
  return m ? m[0] : null;
}

/** Keep only flags whose phrase really occurs in `text`, rewritten to the exact span; dedupe overlaps. */
export function verifyFlags(text: string, flags: LensFlag[], max = 6): LensFlag[] {
  const out: LensFlag[] = [];
  const taken: [number, number][] = [];
  for (const f of flags ?? []) {
    if (!f || typeof f.phrase !== 'string') continue;
    const span = locate(text, f.phrase);
    if (!span) continue;
    const at = text.indexOf(span);
    if (taken.some(([a, b]) => at < b && at + span.length > a)) continue;
    const sev = f.severity === 'high' || f.severity === 'medium' || f.severity === 'good' ? f.severity : 'medium';
    out.push({
      phrase: span, severity: sev,
      issue: clip(f.issue || (sev === 'good' ? 'Reads well' : 'Risky'), 40),
      why: clip(f.why || '', 220),
      ...(sev !== 'good' && f.fix ? {fix: clip(f.fix, 160)} : {}),
    });
    taken.push([at, at + span.length]);
  }
  const rank = {high: 0, medium: 1, good: 2} as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, max);
}

/** Catch what the model missed: hostile patterns the code can see for itself. Added as flags on the draft. */
export function patternFlags(text: string, existing: LensFlag[]): LensFlag[] {
  const add: LensFlag[] = [];
  for (const p of HOSTILE_PATTERNS) {
    const m = p.re.exec(text);
    if (!m) continue;
    const at = m.index, end = at + m[0].length;
    const covered = [...existing, ...add].some((f) => {
      const i = text.indexOf(f.phrase);
      return i >= 0 && at < i + f.phrase.length && end > i;
    });
    if (covered) continue;
    add.push({phrase: m[0], severity: p.severity, issue: p.issue, why: WHY[p.issue] ?? 'A judge reads this as raising the conflict.', fix: 'Cut it.'});
  }
  return add;
}
const WHY: Record<string, string> = {
  'Absolute claim': '"Always" and "never" are easy to disprove with one example, and they cost you credibility.',
  'Keeps score': 'Keeping score reads as resentment, not as focus on the kids.',
  'Passive-aggressive': 'Judges read this as sarcasm, even when it is meant politely.',
  'Reads as a threat': 'Mentioning court or police in a schedule message reads as intimidation.',
  'Insult': 'Name-calling is the first thing quoted back to a judge.',
  'Shouting': 'Caps and exclamation marks read as anger on paper.',
};

/** Court-safety score from the flags, so the number always agrees with what the user sees. */
export function scoreFromFlags(flags: LensFlag[], words: number): number {
  let s = 100;
  for (const f of flags) s -= f.severity === 'high' ? 30 : f.severity === 'medium' ? 13 : 0;
  if (words > 120) s -= 10; else if (words > 80) s -= 5;
  return clamp(s, 3, 100);
}
function blendScore(model: number, flags: LensFlag[], words: number): number {
  const fromFlags = scoreFromFlags(flags, words);
  let s = Number.isFinite(model) && model > 0 ? Math.round(model * 0.5 + fromFlags * 0.5) : fromFlags;
  const highs = flags.filter((f) => f.severity === 'high').length;
  const meds = flags.filter((f) => f.severity === 'medium').length;
  if (highs) s = Math.min(s, 60 - 12 * (highs - 1));
  else if (meds) s = Math.min(s, 88 - 6 * (meds - 1));
  return clamp(Math.round(s), 3, 100);
}

/** Last-resort cleanup of a reply the model wrote: the phrases rule 5 bans, removed rather than shipped. */
export function cleanReply(s: string): string {
  let t = norm(s || '');
  t = t.replace(/^(thanks|thank you) for (your|the) (message|text|email)[.,!]?\s*/i, '');
  t = t.replace(/\b(as i(?:'ve| have)? (?:already )?(?:said|mentioned|told you)|per my last (?:message|text|email)?|just so you know|for the record|to be clear),?\s*/gi, '');
  t = t.replace(/!+/g, '.').replace(/\.{2,}/g, '.').replace(/\s+([.,])/g, '$1');
  t = t.replace(/(^|[.?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
  return t.trim();
}

/** Score the suggested reply in code: it should be near-perfect, and this says honestly when it isn't. */
function replyScore(text: string, kind: 'brief' | 'neutral' | 'firm'): number {
  const flags = patternFlags(text, []);
  const words = wordCount(text);
  let s = scoreFromFlags(flags, words);
  if (kind === 'brief' && words > 25) s -= 4;
  if (words > 70) s -= 6;
  s -= Math.max(0, (text.match(/\[[^\]]+\]/g) ?? []).length - 1) * 2;   // a reply full of blanks is less finished
  return clamp(s, 3, 98);
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '\u2026' : s);
const variant = (s: string): ReplyVariant => { const text = cleanReply(s); return {text, words: wordCount(text)}; };

/* ---------- public API ---------- */

export interface AnalyzeInput { incoming: string; draft?: string; context?: string; images?: AiImage[] }

/** The analysis plus two optional extras the UI uses (shared Analysis has them as optional fields). */
export type AnalysisOut = Omit<Analysis, 'id' | 'createdAt'>;

/** What the code had to correct on a call — read by scripts/eval-reply.ts, never sent to the browser. */
export interface AnalyzeStats { flagsFromModel: number; flagsDropped: number; flagsAddedByCode: number; ms: number }

export async function analyzeMessage(input: AnalyzeInput): Promise<AnalysisOut> {
  return (await analyzeWithStats(input)).analysis;
}

export async function analyzeWithStats(input: AnalyzeInput): Promise<{analysis: AnalysisOut; stats: AnalyzeStats}> {
  const stats: AnalyzeStats = {flagsFromModel: 0, flagsDropped: 0, flagsAddedByCode: 0, ms: 0};
  const incoming = (input.incoming || '').trim().slice(0, 6000);
  const draft = (input.draft || '').trim().slice(0, 4000) || undefined;
  const context = (input.context || '').trim().slice(0, 1500) || undefined;
  if (!incoming && !input.images?.length) throw new Error('Paste their message or add a screenshot.');

  const prompt = [
    incoming ? `THE OTHER PARENT'S MESSAGE:\n"""\n${incoming}\n"""` : `THE OTHER PARENT'S MESSAGE: in the attached screenshot.`,
    context ? `USER'S NOTES (facts the user knows; you may use them):\n"""\n${context}\n"""` : '',
    draft ? `THE USER'S OWN DRAFT REPLY (read it through the Judge's lens):\n"""\n${draft}\n"""` : 'The user gave no draft.',
  ].filter(Boolean).join('\n\n');

  const t0 = Date.now();
  const raw = await geminiJSON<RawAnalysis>({system: ANALYZE_SYSTEM, prompt, schema: ANALYZE_SCHEMA, images: input.images, temperature: 0.35});
  stats.ms = Date.now() - t0;

  const theirs = incoming || norm(raw.transcript || '');
  if (!theirs) throw new Error("We couldn't read a message in that screenshot. Try pasting the text instead.");
  const brief = variant(raw.brief), neutral = variant(raw.neutral), firm = variant(raw.firm);
  const category = (CATEGORIES as string[]).includes(raw.category) ? (raw.category as Category) : 'other';
  const asks = (raw.asks ?? []).map((a) => clip(norm(a), 120)).filter(Boolean).slice(0, 4);
  let advice = (['reply', 'brief_ack', 'no_reply'] as const).find((a) => a === raw.advice) ?? 'reply';
  if (advice === 'no_reply' && asks.length) advice = 'brief_ack';   // something was asked: never tell them to ignore it

  let lens: LensFlag[];
  let draftScore: number | undefined;
  if (draft) {
    lens = verifyFlags(draft, raw.lens);
    stats.flagsFromModel = raw.lens?.length ?? 0;
    stats.flagsDropped = stats.flagsFromModel - lens.length;
    const extra = patternFlags(draft, lens);
    stats.flagsAddedByCode = extra.length;
    lens = [...lens, ...extra].slice(0, 7);
    draftScore = blendScore(raw.draftScore, lens, wordCount(draft));
  } else {
    lens = verifyFlags(neutral.text, (raw.lens ?? []).filter((f) => f.severity === 'good'), 2);
  }

  const stripped = (raw.stripped ?? []).map((s) => locate(theirs, s)).filter((s): s is string => !!s).slice(0, 5);
  const inc = raw.incident;
  const analysis: AnalysisOut = {
    incoming: theirs,
    facts: clip(norm(raw.facts || ''), 280),
    asks,
    heat: clamp(Math.round(raw.heat), 0, 100),
    category,
    advice,
    adviceWhy: clip(norm(raw.adviceWhy || ''), 200),
    variants: {brief, neutral, firm},
    ...(draft ? {draft, draftScore} : {}),
    lens,
    stripped,
    replyScore: replyScore(neutral.text, 'neutral'),
    incident: inc?.worthLogging && inc.title ? {worthLogging: true, title: clip(norm(inc.title), 80), note: clip(norm(inc.note || ''), 400)} : {worthLogging: false, title: '', note: ''},
  };
  return {analysis, stats};
}

/* ---------- drills (PLAN) ---------- */

const GRADE_SYSTEM = [VOICE, REPLY_RULES, EXAMPLES, LENS_RULES, `
TASK: the user is practising. They got a message from the other parent (the scenario) and wrote a reply (the draft).
Return:
- lens: flags on the DRAFT (see Judge's lens). Include 1-2 "good" flags when something genuinely works.
- score: court-safety of the draft, 0-100 (the draftScore rubric). Be honest: a reply that takes the bait scores low
  even if it is polite; a short, factual, child-focused reply that answers the ask scores 90+.
- better: the reply you would send instead, following every reply rule (BIFF, 15-50 words). Keep the facts the user
  used if they are safe; don't invent new ones.`].join('\n');

const GRADE_SCHEMA = {
  type: 'object',
  properties: {lens: {type: 'array', items: LENS_ITEM}, score: {type: 'integer'}, better: {type: 'string'}},
  required: ['lens', 'score', 'better'],
  propertyOrdering: ['lens', 'score', 'better'],
};

export async function gradeDraft(input: {scenario: string; draft: string}): Promise<{score: number; lens: LensFlag[]; better: string}> {
  const draft = (input.draft || '').trim().slice(0, 4000);
  if (!draft) return {score: 0, lens: [], better: ''};
  const raw = await geminiJSON<{lens: LensFlag[]; score: number; better: string}>({
    system: GRADE_SYSTEM,
    prompt: `THE OTHER PARENT'S MESSAGE (scenario):\n"""\n${(input.scenario || '').slice(0, 3000)}\n"""\n\nTHE USER'S DRAFT REPLY:\n"""\n${draft}\n"""`,
    schema: GRADE_SCHEMA, temperature: 0.3,
  });
  let lens = verifyFlags(draft, raw.lens);
  lens = [...lens, ...patternFlags(draft, lens)].slice(0, 7);
  return {score: blendScore(raw.score, lens, wordCount(draft)), lens, better: cleanReply(raw.better || '')};
}

/* The reply coach's engine. ONE model call per analysis: the model reads the other parent's message (or a
   screenshot of it), writes three replies and reads the user's draft through a family-court judge's eyes.
   Our code then checks what the model can't be trusted to: word counts, that every flagged phrase really
   occurs in the text it flags, that the scores agree with the flags, and that nothing hostile slipped into
   a reply. PLAN imports gradeDraft for drills; DEMO imports analyzeMessage to seed the sample case. */
import {geminiJSON, type AiImage} from '../ai.js';
import type {Analysis, Category, LensFlag, ReplyVariant} from '../../shared/types.js';
// The burst splitter is shared with the compose screen, so the preview there splits exactly the way we do here.
import {splitBurst, type Burst} from '../../src/pages/app/reply/burst.js';

export {splitBurst};

export const CATEGORIES: Category[] = ['schedule', 'money', 'health', 'school', 'new_partner', 'accusation', 'logistics', 'other'];

/* ---------- the prompt ---------- */

const VOICE = `
You are Parley's reply coach: a calm, sharp friend who knows how US family courts read co-parenting messages
(Bill Eddy's BIFF: Brief, Informative, Friendly, Firm; "gray rock" for pure provocation; parallel parenting).
The user is a parent raising kids in two homes. "The other parent" texted them. You write replies the USER can send
as-is from their phone, and you read the user's own draft the way a family-court judge, GAL or custody evaluator would.
You are not a lawyer and never give legal advice or predict outcomes.`;

const READING_RULES = `
HOW TO READ WHAT THEY SENT (real people don't text like a textbook)
- It usually arrives as a BURST: 2-4 texts in a row, sometimes a follow-up much later ("hello??" 20 minutes after
  nothing). The burst is ONE turn in the conversation. Read all of it, then answer it ONCE, as one text back.
  Never answer text by text, never number your answers, never write "to your first question".
- Lowercase, run-ons, typos and shorthand are normal: u, ur, r, idk, idc, rn, tbh, ngl, fr, smh, omw, wya, bc/cuz,
  prob, tmrw, pls, thx, k, kk. Read them for what they mean; don't judge spelling.
- Tone lives in the small things. Treat these as pressure or hostility cues when they raise "heat":
  a cold "k." / "noted." / "fine. whatever." / a lone "👍"; "lol" / "lmao" aimed at the user (mocking);
  🙄 🙃 😂 🤦; CAPS words ("AGAIN"); "???", "!!", "hello??", "answer me", a lone "?" as its own text;
  sugar-coating with a sting ("Just a friendly reminder 🙂 that SOME of us pay on time"); a later follow-up that
  only exists to push for an answer. A long late-night run-on that drags up the past usually buries ONE real ask:
  find it.
- When a kid is used as the messenger ("emma says u told her..."), that is the thing to handle calmly, once.`;

const REPLY_RULES = `
HOW A PARLEY REPLY IS WRITTEN (a judge may read it out loud one day, and it must still sound like a person)
1. Answer only the concrete asks: times, places, pickups, money, school, health, what the kids need. Ignore insults,
   character attacks, old fights, opinions about the user's new partner, and anything said to provoke. Do not defend,
   justify, explain or apologise for anything that isn't a concrete ask. Never repeat or quote their insults.
SHORTHAND (read it like a person would): lmk/lmk asap = a real request that needs an answer; ik/ikr = I know; idk/idc = I don't know/care; wtv, "k.", "fine." = dismissive; istg = escalating; nvm = they dropped the ask or are guilt-tripping (still answer any logistics left); dw = don't worry (often sarcastic); wyd/wya = what are you doing/where are you (an ask); tmrw/tn/wknd = tomorrow/tonight/weekend (use those as the time they named); b4 = before; w/ = with; rq = real quick; lol/lmao after a jab = mockery, not humor. Never use shorthand in OUR replies.
2. NEVER INVENT FACTS. No times, dates, days, amounts, places, names, prior agreements, court orders, parenting-plan
   terms or receipts unless they appear in their texts, the user's draft or the user's notes. When a reply needs a
   fact you don't have, write a short bracketed placeholder the user fills in: [time], [day], [amount], [place].
   At most two placeholders per reply. Prefer wording that needs none ("Can you send me the invoice?").
   Never state what the user already did ("I've paid", "I sent it", "I was there") unless their draft or notes say so.
   If THEY named a time, day or place in their texts, you may use it ("back by 6 Sunday works") instead of a placeholder.
3. NEVER ADMIT FAULT OR CONCEDE THEIR FRAMING, unless the user's own draft or notes already say it. Don't agree with
   an accusation, don't apologise ("sorry", "my bad", "I should have"), don't confirm being late, rude or wrong, and
   don't make promises that accept their version of events: no "Next time I'll check with you before…", "I'll make
   sure to ask first", "I'll do better", "It won't happen again". A judge reads those as an admission. Don't deny
   things you don't know about either: leave them out and move to the practical next step.
4. Child-focused: keep the kids at the centre and out of the adult conflict. Use the kids' names only if given.
   If the other parent threatens to tell the kids adult things, or passes adult stuff through the kids, the reply
   says calmly, once, in plain words: "Let's keep the kids out of this. It's between us."
5. VOICE: a calm, kind adult texting from their phone. Not a lawyer, not HR, not a customer-service email.
   - Contractions always: I'll, I'm, can't, don't, that's, it's, won't, let's. Plain short words. 1-3 short sentences.
   - Natural openers are good: "Got it." "Ok." "Sounds good." "Yep, 5 works." "Thanks for letting me know."
   - Sentence case, normal punctuation. No emoji, no "lol", no shorthand (never "u", "ur", "pls", "thx", "rn", "idk"):
     casual but clean, because a judge may read it.
   - NEVER write these stiff phrases: "I acknowledge", "acknowledged", "per our agreement", "kindly", "please be
     advised", "as previously stated", "moving forward", "going forward", "I hope this message finds you",
     "I understand your frustration", "thank you for your message", "regarding", "in regards to", "with regard to",
     "I wanted to reach out", "please note", "at your earliest convenience", "I would appreciate it if",
     "rest assured", "furthermore", "however," at the start, "in the future" (say "next time"), "ensure" (say
     "make sure"), "inform" (say "let you know"), "require" (say "need"), "provide" (say "send"/"give"),
     "attend" (say "go to"/"be at"), "regarding" (say "about").
   - Also never: "you always", "you never", "as usual", "per my last", "as I've said", "as I already told you",
     "again,", "clearly", "obviously", "just so you know", "for the record", "with all due respect", "I'm sure you",
     "unlike you", "I hope you", "some of us", "actually", "frankly", sarcasm, rhetorical questions, ALL CAPS,
     exclamation marks, therapy-speak ("I hear you", "I hear the concern", "I hear that you're feeling"), lectures about co-parenting, mentions of
     lawyers, court, police, judges, contempt or "documenting" (that reads as a threat).
   - Never curt-hostile either: the whole reply is never just "k", "Ok." or "Noted." (that reads cold).
     "Noted, thanks." or "Got it, thanks." is fine for gray rock.
6. Don't open with "Thanks for your message" or "I understand" when they were hostile. Open with the answer.
   No greetings or sign-offs. If they were friendly, a quick "Thanks" is fine.
7. Three versions, each one complete text the user could send:
   - brief: one or two short sentences, 20 words or fewer. Just the answer.
   - neutral: the BIFF version, 12-40 words, 1-3 sentences: the answer, the one useful fact, and if it helps a
     practical next step. No question about feelings.
   - firm: 12-45 words, still kind: a clear boundary or decision plus ONE concrete next step with a time or day
     (use a placeholder like [day] if none was given). Calm and final, never hostile or threatening.
8. If there is nothing to answer (pure venting or provocation), the replies are gray rock: short, plain,
   information-free, e.g. "Got it, thanks." / "Ok. I'll see the kids at pickup on [day]." Never react to the bait.
9. Never write anything that could be read as a threat, an insult, guilt-tripping or keeping score.`;

const LENS_RULES = `
JUDGE'S LENS (reading the user's draft)
Flag the specific words a family-court judge would hold against the writer, plus what reads well. Drafts are often
typed fast and slangy ("u literally never pay", "lmao ok", "wow. ok.") — read them exactly as written.
- "phrase" MUST be copied character-for-character from the draft: same case, same spelling ("u" stays "u"), same
  punctuation and emoji, 1-14 words, a contiguous span that exists in the draft. Never paraphrase, never join two
  separate parts, never fix typos.
- severity "high": threats (court, police, lawyer, "you'll regret", withholding the kids or money), insults,
  name-calling, profanity ("wtf", "bs"), telling the other parent what the kids will be told, using the kids as
  messengers or weapons, disparaging the other parent's parenting ("maybe if u actually showed up"), ultimatums over
  parenting time, admitting fault beyond the facts.
- severity "medium": absolutes ("you always", "u never", "every single time"), sarcasm, blame, dragging up old
  fights, over-explaining or defending, shouting (caps, "!!", "???"), passive-aggressive phrases ("as usual",
  "per my last", "typical", "nice try", "here we go", "wow. ok."), "lol"/"lmao"/"smh" or 🙄🙃😂 in a reply to a tense
  message (reads as mocking), a cold one-word "k." or "fine.", emotional venting, rhetorical questions, demands with
  no reason or option.
- severity "good": specific, dated, child-focused, offers a practical solution, polite and firm. At most 2 good flags.
- "issue": 2-6 word label ("Reads as a threat", "Absolute claim", "Reads as mocking", "Child-focused").
- "why": one plain sentence on how a judge or evaluator reads it (they look at which parent keeps conflict low and
  supports the kids' relationship with the other parent). General information, not legal advice. Plain words.
- "fix": for high/medium only, the replacement words in the reply voice above (or "Cut it." if it should go).
- Max 6 flags. Flag the most damaging first. Don't flag the same words twice.
- "draftScore" 0-100 court-safety: 90-100 exemplary BIFF; 70-89 fine with small issues; 40-69 risky (blame, sarcasm,
  mocking, absolutes, too long); 0-39 damaging (threats, insults, kids used as weapons).`;

const ANALYZE_TASK = `
WHAT TO RETURN (JSON, fields in this order)
- transcript: if a screenshot is attached, the other parent's most recent burst of texts the user needs to answer
  (in chat screenshots their bubbles are usually on the left / grey; the user's are on the right / colored). One
  bubble per line, copied exactly, each line starting with its time if the screenshot shows one ("9:41 PM ur late").
  If no screenshot, return "".
- stripped: exact words from their texts you left out of "facts" because they are insults, blame, sarcasm, jabs or
  old history (max 5, each copied verbatim from ONE text, 1-10 words). [] if none.
- facts: "Just the facts": what's left once the jabs and history are gone, in plain casual English, the way a friend
  would sum it up: "They want to know if you're coming Saturday at 10." 1-2 short sentences, 30 words max,
  starting with "They". No legal words, no "the other parent states". Never add facts.
  If nothing is left, write "Nothing to answer. It's just venting."
- asks: each concrete thing they asked for or that needs deciding, as a short plain phrase (max 4), e.g. "when
  you'll get there", "paying half of soccer", "who has the kids Saturday". An accusation is not an ask. [] if none.
- heat: 0-100 hostility of the WHOLE burst (0 friendly, 30 tense, 60 hostile, 85+ threats or abuse). The cues above
  count: a cold "k." after a fight, mocking "lol", 🙄, "hello??" all raise it.
- category: one of schedule, money, health, school, new_partner, accusation, logistics, other.
- advice: "reply" if there are asks; "brief_ack" if it needs only a short acknowledgement (information given, or an
  ask buried in venting); "no_reply" if it is pure provocation with nothing to answer.
- adviceWhy: one short plain sentence to the user ("You only need to answer when you'll get there.").
- brief, neutral, firm: the three replies (see the rules). Each answers the whole burst once.
- lens: if the user gave a draft, flags on the DRAFT (see Judge's lens). If no draft, 1-2 "good" flags on phrases
  copied exactly from your NEUTRAL reply, saying what makes it court-safe.
- draftScore: court-safety of the user's draft, 0-100. If no draft, 0.
- incident: worthLogging true only when their texts contain something a parent should keep a dated record of:
  a threat (to withhold the kids, to involve the kids in adult conflict, to go to court/police as intimidation),
  a missed or late pickup or a no-show, denied or cancelled parenting time, disparaging the user to the kids, a
  safety or health concern, harassment or profanity, or refusing an agreed payment. Otherwise false.
  title: neutral, 3-8 words ("Said they'd tell the kids about the dispute"). note: one or two neutral factual
  sentences quoting the key words. If not worth logging, title "" and note "".`;

/* Worked examples: the model copies tone from examples far more reliably than from rules. */
const EXAMPLES = `
EXAMPLES OF THE VOICE (not templates; never reuse their facts)
Their burst:
  [9:41 PM] ur seriously 40 min late AGAIN
  [9:41 PM] emma is sitting here crying
  [9:58 PM] hello??
  facts: "They want to know when you'll get there. Emma's waiting."
  brief: "On my way, [minutes] out."
  neutral: "I'm on my way, about [minutes] out. Tell Emma I'll be there soon."
  firm: "I'm on my way, [minutes] out. If I'm ever running late, I'll text you before pickup."
  (One text back for three bubbles. No apology for being late unless the user gave one, no defence, nothing about "AGAIN".)
Their burst:
  [2:04 PM] Just a friendly reminder 🙂
  [2:04 PM] soccer is $240 and SOME of us actually pay on time
  neutral: "Thanks. I'll Venmo my $120 half today."   (Half of a number they gave is fine; the jab is ignored.)
Their burst:
  k.
  neutral: "Got it, thanks. I'll have the kids ready at [time]."   (Cold, but there's nothing to argue with.)
Their burst:
  ur a joke of a parent
  everyone sees it lol
  advice: no_reply. brief: "Got it." neutral: "Ok. I'll see the kids at pickup on [day]."
Their burst:
  emma says u told her im the reason we split
  if u say no to the swap im telling her the truth about u
  a reply includes, once and calmly: "Let's keep the kids out of this. It's between us."
Stiff vs human (always write the right-hand one):
  "I acknowledge receipt of your message regarding pickup." → "Got it. I'll be there at 5."
  "Per our agreement, I will attend the conference." → "I'll be at the conference."
  "Moving forward, kindly inform me in advance." → "Next time, can you give me a heads up?"
  "I understand your frustration. I will ensure she has her medication." → "She'll have her medicine with her."
Conceding vs answering (they said "u signed him up without asking me"):
  WRONG: "Got it. Next time I'll check with you before signing him up. Can we split it?"  (admits fault)
  RIGHT: "Soccer is [amount] for the season. Can you let me know by [day] if you'll cover half?"`;

const ANALYZE_SYSTEM = [VOICE, READING_RULES, REPLY_RULES, EXAMPLES, LENS_RULES, ANALYZE_TASK].join('\n');

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
  {re: /\b(you|u) (?:literally |just |seriously )?(always|never)\b/i, issue: 'Absolute claim', severity: 'medium'},
  {re: /\b(every single time|as usual|typical)\b/i, issue: 'Keeps score', severity: 'medium'},
  {re: /\b(per my last|as i(?:'ve| have)? (?:already )?(?:said|told you|mentioned))\b/i, issue: 'Passive-aggressive', severity: 'medium'},
  {re: /\b(obviously|clearly|frankly|with all due respect|for the record|just so you know|nice try)\b/i, issue: 'Passive-aggressive', severity: 'medium'},
  {re: /\b(lawyer|attorney|court|judge|police|cops|contempt|custody evaluator)\b/i, issue: 'Reads as a threat', severity: 'high'},
  {re: /\b(idiot|stupid|crazy|psycho|pathetic|loser|liar|deadbeat|bitch|ass(hole)?|f+u+c+k\w*|shit\w*|damn)\b/i, issue: 'Insult', severity: 'high'},
  {re: /!{2,}|\?{3,}|\b[A-Z]{5,}\b/, issue: 'Shouting', severity: 'medium'},
  // Texting tics that read as mocking in a reply to a tense message: "lol", "lmao", an eye-roll.
  {re: /\b(lol|lmao|lmfao|smh|here we go|wow\. ok)\b|[\u{1F644}\u{1F643}\u{1F602}\u{1F923}\u{1F926}]/iu, issue: 'Reads as mocking', severity: 'medium'},
  {re: /\b(wtf|stfu|bs)\b/i, issue: 'Insult', severity: 'high'},
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
    // A "shouting" flag must point at the shouting itself (caps or "!!"), not at the words next to it.
    if (/shout/i.test(f.issue || '') && !/!{2,}|\b[A-Z]{4,}\b/.test(span)) continue;
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
    if (covered || [...existing, ...add].some((f) => f.issue === p.issue)) continue;
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
  'Reads as mocking': 'A "lol" or an eye-roll in a tense exchange reads as mocking the other parent.',
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

/* Our replies must sound like a person texting, not HR. The model is told so, and this is where the code checks.
   Repairs are only the ones that can't change meaning (drop "Kindly", "Regarding" → "about", I will → I'll);
   anything else ("I acknowledge…", "Per our agreement…") is sent back to the model once to be rewritten. */
const STIFF_REPAIRS: [RegExp, string][] = [
  [/\b(?:kindly|please be advised(?: that)?|please note(?: that)?|as previously stated|moving forward|going forward|rest assured(?: that)?),?\s*/gi, ''],
  [/\b(?:in regards? to|with regards? to|regarding)\b/gi, 'about'],
  [/\bat your earliest convenience\b/gi, 'when you can'],
];
const CONTRACT: [RegExp, string][] = [
  [/\bI am(?= [a-z])/g, "I'm"], [/\bI will(?= [a-z])/g, "I'll"], [/\bI would(?= [a-z])/g, "I'd"],
  [/\b([Ww]e|[Yy]ou|[Tt]hey|[Ss]he|[Hh]e) will(?= [a-z])/g, "$1'll"], [/\b([Yy]ou|[Ww]e|[Tt]hey) are(?= [a-z])/g, "$1're"],
  [/\b([Ii]t|[Tt]hat|[Tt]here|[Ss]he|[Hh]e) is(?= [a-z])/g, "$1's"], [/\b([Ll])et us\b/g, "$1et's"],
  [/\b([Dd])o not\b/g, "$1on't"], [/\b([Dd])oes not\b/g, "$1oesn't"], [/\b([Dd])id not\b/g, "$1idn't"], [/\b([Cc])annot\b/g, "$1an't"],
  [/\b([Ww])ill not\b/g, "$1on't"], [/\b([Ii])s not\b/g, "$1sn't"], [/\b([Aa])re not\b/g, "$1ren't"], [/\b([Ww])as not\b/g, "$1asn't"],
  [/\b([Cc])ould not\b/g, "$1ouldn't"], [/\b([Ww])ould not\b/g, "$1ouldn't"], [/\b([Hh])ave not\b/g, "$1aven't"],
];
/** Stiff phrases the code can't repair without changing what's said: the model rewrites the reply instead. */
export const STIFF = /\b(i acknowledge|acknowledged|per (?:our|the) (?:agreement|parenting plan|order)|kindly|please be advised|as previously (?:stated|mentioned)|moving forward|going forward|i hope this (?:message|text|email) finds you|i understand your frustration|thank you for your (?:message|text|email)|thanks for your (?:message|text|email)|regarding|in regards? to|with regards? to|i wanted to reach out|please note|at your earliest convenience|i would appreciate it|rest assured|furthermore|i hear (?:you|that|the|your))\b/i;
/** Texting shorthand and tics we read in THEIR texts but never write in ours. */
export const SHORTHAND = /\b(u|ur|r|lol|lmao|idk|idc|rn|tbh|ngl|fr|smh|omw|wya|bc|cuz|tmrw|pls|plz|thx|kk|wtf)\b/i;
export const EMOJI = /\p{Extended_Pictographic}/u;
/** A whole reply that is one cold word reads as hostile. */
const COLD = /^(k|kk|ok|okay|noted|fine|sure|whatever)\.?$/i;

/** Last-resort cleanup of a reply the model wrote: banned phrases removed, contractions made, no emoji. */
export function cleanReply(s: string): string {
  let t = norm(s || '').replace(/\p{Extended_Pictographic}️?/gu, '');
  t = t.replace(/^(thanks|thank you) for (your|the) (message|text|email)[.,!]?\s*/i, '');
  t = t.replace(/\b(as i(?:'ve| have)? (?:already )?(?:said|mentioned|told you)|per my last (?:message|text|email)?|just so you know|for the record|to be clear),?\s*/gi, '');
  for (const [re, to] of STIFF_REPAIRS) t = t.replace(re, to);
  for (const [re, to] of CONTRACT) t = t.replace(re, to);
  t = t.replace(/!+/g, '.').replace(/\.{2,}/g, '.').replace(/\s+([.,?])/g, '$1').replace(/\s{2,}/g, ' ');
  t = t.replace(/(^|[.?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
  t = t.trim();
  if (COLD.test(t)) t = /^noted/i.test(t) ? 'Noted, thanks.' : 'Got it, thanks.';
  return t;
}

/** Words that admit fault or accept their framing ("Next time I'll check with you first"). A judge reads them as an
    admission, so a reply may only say them when the user's own draft or notes already did. */
export const CONCEDE = /\b(sorry|apologi[sz]e|my bad|my fault|i should have|i shouldn'?t have|i was wrong|won'?t happen again|i'?ll do better|next time,? i'?ll (?:check|ask|talk|run it by|make sure|let you know before)|i'?ll make sure to (?:ask|check)|i'?ll (?:check|ask) (?:with )?you (?:first|before))\b/i;

/** What is wrong with a reply's voice, in words the model can act on. [] = fine. `userSaid` is the user's own draft and
    notes: an apology they already wrote is theirs to keep. */
export function voiceProblems(text: string, kind: 'brief' | 'neutral' | 'firm', userSaid = ''): string[] {
  const out: string[] = [];
  const cm = CONCEDE.exec(text);
  if (cm && !new RegExp(cm[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(userSaid)) out.push(`admits fault or concedes their framing ("${cm[0]}") — answer the practical part only`);
  const st = STIFF.exec(text); if (st) out.push(`stiff phrase "${st[0]}" — say it the way a person texts`);
  const sh = SHORTHAND.exec(text); if (sh) out.push(`shorthand "${sh[0]}" — write it out`);
  if (EMOJI.test(text)) out.push('emoji — none in our replies');
  const w = wordCount(text);
  if (kind === 'brief' && w > 20) out.push(`${w} words — brief must be 20 or fewer`);
  if (kind !== 'brief' && w > 50) out.push(`${w} words — keep it to 1-3 short sentences`);
  if ((text.match(/[.?](\s|$)/g) ?? []).length > 4) out.push('too many sentences — one short text, not a letter');
  if (/(^|\s)(1[.)]|first,|to your first)/i.test(text)) out.push('answers the texts one by one — answer the burst once');
  const hp = HOSTILE_PATTERNS.find((p) => p.re.test(text)); if (hp) out.push(`${hp.issue.toLowerCase()} — "${hp.re.exec(text)![0]}"`);
  return out;
}

/** If a reply is still too long for "brief" after a rewrite, keep whole sentences up to 20 words. */
function trimBrief(t: string): string {
  if (wordCount(t) <= 20) return t;
  const parts = t.match(/[^.?]+[.?]*/g) ?? [t];
  let out = '';
  for (const p of parts) { const next = (out + ' ' + p.trim()).trim(); if (out && wordCount(next) > 20) break; out = next; }
  return out;
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

export interface AnalyzeInput { incoming: string; bubbles?: string[]; draft?: string; context?: string; images?: AiImage[] }

/** The analysis plus two optional extras the UI uses (shared Analysis has them as optional fields). */
export type AnalysisOut = Omit<Analysis, 'id' | 'createdAt'>;

/** What the code had to correct on a call — read by scripts/eval-reply.ts, never sent to the browser. */
export interface AnalyzeStats { flagsFromModel: number; flagsDropped: number; flagsAddedByCode: number; ms: number; rewrites: number; rewriteWhy: string[] }

export async function analyzeMessage(input: AnalyzeInput): Promise<AnalysisOut> {
  return (await analyzeWithStats(input)).analysis;
}

/** The burst as the model reads it: numbered texts in order, with their times when we know them. */
function burstBlock(b: Burst): string {
  const lines = b.bubbles.map((t, i) => `[${i + 1}${b.times[i] ? ` · ${b.times[i]}` : ''}] ${t}`);
  const head = b.bubbles.length > 1
    ? `THE OTHER PARENT'S TEXTS — one burst of ${b.bubbles.length}, sent in this order. Answer them ONCE, as one text back:`
    : `THE OTHER PARENT'S TEXT:`;
  const before = b.earlier.length ? `EARLIER IN THE CHAT (context only, already answered):\n${b.earlier.join('\n')}\n\n` : '';
  return `${before}${head}\n"""\n${lines.join('\n')}\n"""`;
}

const REWRITE_SCHEMA = {
  type: 'object',
  properties: {brief: {type: 'string'}, neutral: {type: 'string'}, firm: {type: 'string'}},
  required: ['brief', 'neutral', 'firm'],
  propertyOrdering: ['brief', 'neutral', 'firm'],
};

export async function analyzeWithStats(input: AnalyzeInput): Promise<{analysis: AnalysisOut; stats: AnalyzeStats}> {
  const stats: AnalyzeStats = {flagsFromModel: 0, flagsDropped: 0, flagsAddedByCode: 0, ms: 0, rewrites: 0, rewriteWhy: []};
  const given = (input.bubbles ?? []).map((b) => (b || '').trim()).filter(Boolean).slice(0, 12);
  let burst: Burst = given.length
    ? {bubbles: given.map((b) => b.slice(0, 2000)), times: given.map(() => ''), earlier: []}
    : splitBurst((input.incoming || '').slice(0, 6000));
  const draft = (input.draft || '').trim().slice(0, 4000) || undefined;
  const context = (input.context || '').trim().slice(0, 1500) || undefined;
  if (!burst.bubbles.length && !input.images?.length) throw new Error('Paste their message or add a screenshot.');

  const prompt = [
    burst.bubbles.length ? burstBlock(burst) : `THE OTHER PARENT'S TEXTS: in the attached screenshot.`,
    context ? `USER'S NOTES (facts the user knows; you may use them):\n"""\n${context}\n"""` : '',
    draft ? `THE USER'S OWN DRAFT REPLY (read it through the Judge's lens, exactly as typed):\n"""\n${draft}\n"""` : 'The user gave no draft.',
  ].filter(Boolean).join('\n\n');

  const t0 = Date.now();
  const raw = await geminiJSON<RawAnalysis>({system: ANALYZE_SYSTEM, prompt, schema: ANALYZE_SCHEMA, images: input.images, temperature: 0.35});

  if (!burst.bubbles.length) burst = splitBurst((raw.transcript || '').trim());
  if (!burst.bubbles.length) throw new Error("We couldn't read a message in that screenshot. Try pasting the text instead.");
  const theirs = burst.bubbles.join('\n\n');

  // The voice is checked in code; a reply that still reads stiff (or texts like them) goes back once to be rewritten.
  let texts = {brief: cleanReply(raw.brief), neutral: cleanReply(raw.neutral), firm: cleanReply(raw.firm)};
  const userSaid = [draft ?? '', context ?? ''].join(' ');
  const problems = (['brief', 'neutral', 'firm'] as const).flatMap((k) => voiceProblems(texts[k], k, userSaid).map((p) => `${k}: ${p}`));
  if (problems.length) {
    stats.rewrites = 1; stats.rewriteWhy = problems;
    try {
      const fixed = await geminiJSON<{brief: string; neutral: string; firm: string}>({
        system: [VOICE, REPLY_RULES, EXAMPLES].join('\n'),
        prompt: `${burstBlock(burst)}\n\nYOUR THREE REPLIES:\n${JSON.stringify(texts)}\n\nTHESE BREAK THE VOICE RULES:\n- ${problems.join('\n- ')}\n\n`
          + 'Rewrite all three so they keep the same facts and placeholders but follow every rule. Change only what you must.',
        schema: REWRITE_SCHEMA, temperature: 0.3,
      });
      const next = {brief: cleanReply(fixed.brief), neutral: cleanReply(fixed.neutral), firm: cleanReply(fixed.firm)};
      for (const k of ['brief', 'neutral', 'firm'] as const) {
        if (next[k] && voiceProblems(next[k], k, userSaid).length <= voiceProblems(texts[k], k, userSaid).length) texts[k] = next[k];
      }
    } catch (e) { console.warn('[reply] voice rewrite failed:', (e as Error).message.slice(0, 160)); }
  }
  texts = {...texts, brief: trimBrief(texts.brief)};
  stats.ms = Date.now() - t0;
  const brief = variant(texts.brief), neutral = variant(texts.neutral), firm = variant(texts.firm);

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

  // A stripped phrase is looked up text by text, so the strike-through never spans two bubbles.
  const stripped = (raw.stripped ?? []).map((s) => burst.bubbles.map((b) => locate(b, s)).find(Boolean) ?? null)
    .filter((s): s is string => !!s).filter((s, i, all) => all.indexOf(s) === i).slice(0, 5);
  const inc = raw.incident;
  const analysis: AnalysisOut = {
    incoming: theirs,
    bubbles: burst.bubbles,
    ...(burst.times.some(Boolean) ? {bubbleTimes: burst.times} : {}),
    facts: clip(norm(raw.facts || ''), 280),
    asks,
    heat: Math.max(clamp(Math.round(raw.heat), 0, 100), heatFloor(theirs)),
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

const GRADE_SYSTEM = [VOICE, READING_RULES, REPLY_RULES, EXAMPLES, LENS_RULES, `
TASK: the user is practising. They got a message from the other parent (the scenario) and wrote a reply (the draft).
Return:
- lens: flags on the DRAFT (see Judge's lens). Include 1-2 "good" flags when something genuinely works.
- score: court-safety of the draft, 0-100 (the draftScore rubric). Be honest: a reply that takes the bait scores low
  even if it is polite; a short, factual, child-focused reply that answers the ask scores 90+.
- better: the reply you would send instead, following every reply rule and the voice (BIFF, plain texting English,
  contractions, 10-40 words, no emoji or shorthand). Keep the facts the user used if they are safe; don't invent new ones.`].join('\n');

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

/** Cues the model tends to under-read: a sworn ultimatum or a threat to withhold the kids is hostile whatever the wording. */
function heatFloor(text: string): number {
  if (/\b(keep(ing)? (them|the kids)|won'?t see (them|the kids)|full custody|call (the )?(cops|police))\b/i.test(text)) return 75;
  if (/\b(istg|i swear( to god)?|one more time|im done|i'?m done|last warning)\b/i.test(text)) return 65;
  return 0;
}

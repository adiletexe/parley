/* The content bank for daily Practice: tap-the-best-reply scenarios, 5 a day.
   For now FOUR days are written, one per week theme of plan-content.ts (1 Brief & facts, 2 Don't take
   the bait, 3 Boundaries & firm requests, 4 Court-ready habits), so the first days already show the range.
   BANK still has 28 entries: day N reuses written day ((N-1) % 4) + 1 under its own day number and ids,
   until the rest are written. Exactly one option per question is the calm reply; the other two are the
   tempting things a stressed parent really sends, and the week-4 ones are close calls on purpose (one small
   slip each: a jab, a defence tacked on, a vague time). General communication practice, not legal advice.

   Everything here follows docs/VOICE.md. Their side is a BURST — the texts as they arrive, 1–4 bubbles, in real
   phone voice (lowercase, u/ur, caps for emphasis, the odd emoji). All three replies are written in the SAME
   casual texting register — lowercase starts, "ok", "yep", "fyi", light shorthand (u, thx, tmrw, b4, w/) in
   any of them — because when the good one was the only tidy sentence it could be picked by its tone, without
   reading it. So the choice is made on CONTENT: at most one wrong option per question is openly heated; the
   other is calm and wrong (gives in, accepts the blame, vague on the time, answers a different thing, a polite
   dig). Week 4 has no heated one at all. The good one is still ≤ 20 words, no emoji, lol or caps, no admission.
   The page shuffles the order per question (Session.tsx), so position never tells either. */

export type Trigger = 'schedule' | 'money' | 'partner' | 'school' | 'messenger' | 'health';
export interface ChoiceOption { text: string; good: boolean; tag: string }
/** `them` is the burst: the other parent's texts in the order they arrived, one string per bubble. */
export interface ChoiceQ { id: string; trigger: Trigger; them: string[]; options: [ChoiceOption, ChoiceOption, ChoiceOption] }
export interface DayPack { day: number; week: 1 | 2 | 3 | 4; skill: string; rule: string; questions: ChoiceQ[] }

type Opt = [text: string, tag: string];
type RawQ = {trigger: Trigger; them: string[]; good: 0 | 1 | 2; opts: [Opt, Opt, Opt]};

const SKILL = {1: 'Brief & factual', 2: 'Not taking the bait', 3: 'Clear boundaries', 4: 'Court-ready habits'} as const;

const Q = (trigger: Trigger, them: string[], good: 0 | 1 | 2, a: Opt, b: Opt, c: Opt): RawQ => ({trigger, them, good, opts: [a, b, c]});

/** The written days, in order. Each samples one week's theme. */
const WRITTEN: {week: 1 | 2 | 3 | 4; rule: string; qs: RawQ[]}[] = [
  {week: 1, rule: 'Answer the question. Skip the history.', qs: [
    Q('schedule', ['u were 25 min late sunday', 'AGAIN', 'ngl im over it. 5 sharp this sunday or im not waiting around. yes or no?'], 0,
      ["yes, 5 sharp this sunday at ur place. i'll be there", 'Just the answer'],
      ["there was a crash on 95 last time, it wasn't on purpose. i'll try for 5", 'Explains and hedges'],
      ['lmao ok. like ur never late. ill be there when i get there', 'Keeps score back']),
    Q('partner', ['hey so ur girlfriend posted MY kids on instagram', 'take it down rn pls', 'and is she coming to the recital w/ u or what. lmk'], 2,
      ["it's just one zoo pic, everyone posts their kids. and no she's not coming", 'Waves it off'],
      ["idc, she can post wtv she wants on her own page. and yes she's coming", 'Picks a fight'],
      ["ok i asked her to take it down today. and no, she won't be at the recital", 'Both asks answered']),
    Q('school', ['noahs teacher emailed ME bc u never answer', 'reading log signed by friday. can u manage that 🙃'], 1,
      ["hmm i do answer the school, i think they have my old email. i'll check w/ the office", 'Answers a different thing'],
      ["yep i'll sign it tonight and send it back w/ noah thursday", 'Answers only the ask'],
      ['can i manage a signature? wow. ya i think ill survive', 'Sarcasm reads badly']),
    Q('messenger', ['noah says u told him im the reason u missed his game', 'nice.', 'r u coming sat at 10 or not'], 2,
      ['i NEVER said that. we both know who put that in his head', 'Denies and accuses'],
      ["hey can we not ask noah what i say about u? it puts him in the middle", 'Skips the real ask'],
      ["yes i'll be there saturday at 10 for his game. see u there", 'Just the answer']),
    Q('health', ['U FORGOT THE INHALER AGAIN', 'seriously??', 'he couldve ended up in the ER', 'bring it to school b4 8 tmrw'], 0,
      ["yep i'll drop the inhaler at the front office b4 8 tmrw", 'Does what was asked'],
      ['i didnt forget it, u never packed it. dont use the ER to guilt trip me', 'Takes the bait'],
      ["ok i'll try to get it there in the morning, crazy week", 'Vague, all about you']),
  ]},
  {week: 2, rule: 'Boring is safe. Give them nothing to grab.', qs: [
    Q('money', ['must be nice going to cancun while im scraping by for YOUR kids', 'saw the pics btw 😂'], 2,
      ["i saved up all year for that trip fyi. it didn't come out of the kids' money", 'Justifies the trip'],
      ['maybe if u budgeted for once u wouldnt be scraping by', 'Takes the bait'],
      ['ok. fyi the september support payment went out on the 1st', 'Flat and factual']),
    Q('partner', ['Ur new wife is SO classy 🙂', 'the kids must be thrilled lol'], 1,
      ['at least she shows up on time lmao. the kids actually like her', 'Bites back'],
      ["pickup's still 6 on friday at school. see u then", 'Nothing to grab'],
      ["hey she's really trying w/ the kids. it'd mean a lot if u gave her a chance", 'Hands them a topic']),
    Q('schedule', ['k.', 'dw about it', 'enjoy ur quiet wknd while the kids cry about u. great parenting'], 0,
      ["ok. i'll call them saturday at 6 like we planned. they can call me anytime", 'Calm and kind'],
      ["that really hurts to read. i'm doing my best w/ them, i promise", 'Shows the hurt'],
      ['they can call me wtv time they want. unless ur blocking that too', 'Sneaky dig']),
    Q('messenger', ['noah told me u cried at pickup 😂', 'pathetic', 'maybe get some help fr', 'nvm not my problem anymore'], 2,
      ['at least i have feelings unlike some people. must be nice', 'Takes the bait'],
      ["it was just a hard goodbye, that's all. i'm ok. thx for checking i guess", 'Explains, then a dig'],
      ['ok. see u friday at 5 for pickup', 'Gray rock']),
    Q('school', ['guess ur too busy to look at emmas report card', 'its on the fridge at MY house ofc'], 1,
      ["i'm not too busy. i asked u for a copy on the 3rd and the 10th and heard nothing", 'Over-explains'],
      ["can u text me a photo of it tonight? i'd like to see it", 'Neutral and useful'],
      ['ikr. everything is always at YOUR house 🙄 shocker', 'Sarcasm reads badly']),
  ]},
  {week: 3, rule: 'Meet a threat with calm, never a counter-threat.', qs: [
    Q('schedule', ['istg if ur late ONE more time', 'im keeping them', 'and u can see them when I say so'], 2,
      ["ok ok, keep them this wknd if it's easier. i don't want a fight", 'Gives in to it'],
      ['keep them?? over 5 min?? ur unhinged', 'Matches the threat'],
      ["ok. i'll be at the exchange friday at 5 like always", 'Calm, then logistics']),
    Q('money', ['600 by tn.', 'or i tell the kids exactly why theres no christmas this year'], 0,
      ["pls leave the kids out of money stuff. i'll send my $300 half by friday", 'Firm, kids out'],
      ['go ahead tell them. then ill tell them a few things about u', 'Mirrors the threat'],
      ["ok i'll send the whole 600 tonight. pls just don't say anything to them", 'The threat worked']),
    Q('partner', ['if ur girlfriend shows up to the recital im gonna make a scene. promise'], 1,
      ['make a scene and ill film the whole thing for the judge', 'Threat for a threat'],
      ["i'll be at emma's recital at 6 and i'll keep it calm", 'Calm, still shows up'],
      ["ok i'll just skip the recital this time so there's no drama for emma", 'Gives up the recital']),
    Q('messenger', ['keep it up', 'ill tell noah u never wanted him', 'ur choice'], 2,
      ["pls don't tell him that, it's not true. i'll do wtv u want, just don't", 'Begs, gives in'],
      ['tell him wtv u want. hell figure out the truth someday', 'Dares them'],
      ["pls keep noah out of this. i'll pick him up friday at 5", 'Kids out, plan on']),
    Q('school', ['tbh i cant even. her grades dropped AGAIN and its bc of ur house, no homework no bedtime nothing, if her report card is bad im gonna go for full custody so get it together'], 0,
      ["i want emma doing well too. i'll check her homework every night on my days", 'Shared goal, a plan'],
      ['go for it. my lawyer will be hearing about this', 'Lawyer threat'],
      ["ur right, my house has been a mess lately. i'll try to do better i guess", 'Accepts the blame']),
  ]},
  {week: 4, rule: 'Answer an accusation with one fact they can check.', qs: [
    Q('schedule', ['u didnt even show up sat', 'the kids waited an HOUR', 'unreal'], 1,
      ["i was there at 10 and waited. u must've had the wrong time again", 'Fact plus a jab'],
      ['i was at the school lot at 10 and texted u at 10:05. sunday instead?', 'Checkable fact, next step'],
      ["hmm that's not what happened, i was there. can we talk about it later?", 'Denies, no facts']),
    Q('money', ['2 months. no support. dont even try to deny it.'], 0,
      ['both payments went thru aug 1 and sept 1. i can send u the bank screenshots', 'Dates they can check'],
      ['i paid both months. check ur account b4 u say that pls', 'Right, but defensive'],
      ["i'm pretty sure i paid both. i'll look into it when i get a sec", 'Vague, no proof']),
    Q('health', ['u sent noah to school w/ a fever??', 'the nurse had to call ME', 'at work'], 2,
      ["he had no fever when he left at 7:30. i'm not a bad parent", 'Fact, then defends'],
      ['he seemed fine this morning. kids get sick during the day, it happens', 'Explains it away'],
      ["he was 98.6 at 7:30. thx for getting him, i'll keep him home tmrw", 'Fact, thanks, plan']),
    Q('messenger', ['emma says u left her home alone for 3 hrs', 'explain.', 'now pls'], 1,
      ["emma's mixed up. her aunt was there the whole time and she knows it", 'Contradicts the child'],
      ["her aunt maria was w/ her from 4 to 7. i can send u maria's number", 'Fact they can verify'],
      ["she wasn't alone, i promise. i'd never do that to her, u know that", 'Promises, no fact']),
    Q('partner', ['ur boyfriend yelled at noah at the park', 'everyone saw btw', 'idk who he thinks he is'], 0,
      ["i was there, dan called noah back from the street. i'll handle it myself next time", 'Fact, owns the fix'],
      ["he didn't yell, he's honestly the calmest person i know. he'd never", 'Defends, no fact'],
      ["who saw it? i'd rather hear it from them directly if that's ok", 'Interrogates the source']),
  ]},
];

const pack = (day: number): DayPack => {
  const w = WRITTEN[(day - 1) % WRITTEN.length];
  return {
    day, week: w.week, skill: SKILL[w.week], rule: w.rule,
    questions: w.qs.map((q, j) => ({
      id: `d${day}q${j + 1}`,
      trigger: q.trigger,
      them: [...q.them],
      options: q.opts.map(([text, tag], k) => ({text, good: k === q.good, tag})) as ChoiceQ['options'],
    })),
  };
};

export const BANK: DayPack[] = Array.from({length: 28}, (_, i) => pack(i + 1));

export function dayPack(day: number): DayPack {
  const d = Math.min(28, Math.max(1, Math.round(Number.isFinite(day) ? day : 1)));
  return BANK[d - 1];
}

/* ---- self-check: `npx tsx server/drill-bank.ts` prints the problems, or "drill bank: ok" ----
   Counts are done here, not trusted to the writer. A burst is 1–4 bubbles, each ≤ 25 words (a lone bubble — the
   midnight essay — may run to the burst's 45), the whole burst ≤ 45. The calm reply: ≤ 20 words, no emoji, no
   lol/lmao, no shouted word. No option uses the stiff phrases VOICE.md bans — a stiff option is as easy to spot as
   a heated one. HEAT marks an openly heated option (shouting, lol/smh, "??", emoji): at most one per question, none
   in week 4. And the good reply is the longest of the three (by characters) in at most 8 of the 20 questions, and
   the shortest in at most 8 — once the tidy one stopped being the tell, the short one started to be. Tags
   ≤ 4 words, rules ≤ 12. */
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const EMOJI = /\p{Extended_Pictographic}/u;
const LAUGH = /\b(lol|lmao|lmfao)\b/i;
const SHOUT = /\b[A-Z]{2,}\b/;
const HEAT = /\b[A-Z]{2,}\b|\b(lol|lmao|lmfao|smh|istg)\b|\?\?|\p{Extended_Pictographic}/u;
const STIFF = /i acknowledge|per our agreement|kindly|please be advised|as previously stated|moving forward|hope this message finds|i understand your frustration|thank you for your message|\bregarding\b|in regards to/i;
const LONGEST_MAX = 8;

export function bankProblems(): string[] {
  const out: string[] = [];
  if (WRITTEN.length !== 4) out.push(`expected 4 written days, found ${WRITTEN.length}`);
  WRITTEN.forEach((w, d) => {
    const where = (j: number) => `day ${d + 1} q${j + 1}`;
    if (w.qs.length !== 5) out.push(`day ${d + 1}: ${w.qs.length} questions, want 5`);
    if (words(w.rule) > 12) out.push(`day ${d + 1}: rule is ${words(w.rule)} words (max 12)`);
    w.qs.forEach((q, j) => {
      const n = q.them.length;
      if (n < 1 || n > 4) out.push(`${where(j)}: burst has ${n} bubbles (1–4)`);
      q.them.forEach((b, k) => {
        const cap = n === 1 ? 45 : 25;
        if (!b.trim()) out.push(`${where(j)}: bubble ${k + 1} is empty`);
        if (words(b) > cap) out.push(`${where(j)}: bubble ${k + 1} is ${words(b)} words (max ${cap})`);
      });
      const total = q.them.reduce((s, b) => s + words(b), 0);
      if (total > 45) out.push(`${where(j)}: burst is ${total} words (max 45)`);
      const good = q.opts[q.good][0];
      if (words(good) > 20) out.push(`${where(j)}: good reply is ${words(good)} words (max 20)`);
      if (EMOJI.test(good)) out.push(`${where(j)}: good reply has an emoji`);
      if (LAUGH.test(good)) out.push(`${where(j)}: good reply laughs`);
      if (SHOUT.test(good)) out.push(`${where(j)}: good reply shouts a word`);
      const hot = q.opts.filter(([t]) => HEAT.test(t)).length;
      if (HEAT.test(good)) out.push(`${where(j)}: good reply reads heated`);
      if (hot > (w.week === 4 ? 0 : 1)) out.push(`${where(j)}: ${hot} heated options (max ${w.week === 4 ? 0 : 1})`);
      if (/^(k|ok|noted)\.?$/i.test(good.trim())) out.push(`${where(j)}: good reply is a bare "${good}"`);
      q.opts.forEach(([text, tag], k) => {
        if (!text.trim()) out.push(`${where(j)}: option ${k + 1} is empty`);
        if (STIFF.test(text)) out.push(`${where(j)}: option ${k + 1} uses a stiff phrase`);
        if (words(tag) > 4) out.push(`${where(j)}: tag "${tag}" is ${words(tag)} words (max 4)`);
      });
      if (new Set(q.opts.map(([t]) => t)).size !== 3) out.push(`${where(j)}: two options are the same`);
    });
  });
  const longest = WRITTEN.flatMap((w) => w.qs).filter((q) => q.opts.every(([t], k) => k === q.good || t.length < q.opts[q.good][0].length)).length;
  const shortest = WRITTEN.flatMap((w) => w.qs).filter((q) => q.opts.every(([t], k) => k === q.good || t.length > q.opts[q.good][0].length)).length;
  if (shortest > LONGEST_MAX) out.push(`the good reply is the shortest in ${shortest} of 20 questions (max ${LONGEST_MAX}) — short is a tell too`);
  if (longest > LONGEST_MAX) out.push(`the good reply is the longest in ${longest} of 20 questions (max ${LONGEST_MAX})`);
  for (const p of BANK) {
    if (p.questions.filter((q) => q.options.filter((o) => o.good).length === 1).length !== p.questions.length) out.push(`day ${p.day}: a question without exactly one good option`);
  }
  return out;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const p = bankProblems();
  const qs = WRITTEN.flatMap((w) => w.qs);
  if (p.length) { console.error(`drill bank: ${p.length} problem(s)\n  ` + p.join('\n  ')); process.exit(1); }
  const sizes = qs.map((q) => q.them.length);
  console.log(`drill bank: ok — ${qs.length} written scenarios, ${BANK.length} days; bubbles per burst: ` +
    [1, 2, 3, 4].map((n) => `${n}×${sizes.filter((s) => s === n).length}`).join(' ') +
    `; good reply longest in ${qs.filter((q) => q.opts.every(([t], k) => k === q.good || t.length < q.opts[q.good][0].length)).length}/${qs.length}`);
}

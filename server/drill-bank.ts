/* The content bank for daily Practice: tap-the-best-reply scenarios, 5 a day.
   For now FOUR days are written, one per week theme of plan-content.ts (1 Brief & facts, 2 Don't take
   the bait, 3 Boundaries & firm requests, 4 Court-ready habits), so the first days already show the range.
   BANK still has 28 entries: day N reuses written day ((N-1) % 4) + 1 under its own day number and ids,
   until the rest are written. Exactly one option per question is the calm reply; the other two are the
   tempting things a stressed parent really sends, and the week-4 ones are close calls on purpose (one small
   slip each: a jab, a defence tacked on, a vague time). General communication practice, not legal advice.

   Everything here follows docs/VOICE.md. Their side is a BURST — the texts as they arrive, 1–4 bubbles, in real
   phone voice (lowercase, u/ur, caps for emphasis, the odd emoji). Our good reply is a calm adult on a phone:
   contractions, ≤ 20 words, no lawyer/HR phrases, no emoji or shorthand. The self-check at the bottom holds it. */

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
      ['Yes, 5:00 this Sunday at your place.', 'Just the answer'],
      ['there was a crash on 95 not that ud believe me. ill prolly make 5', 'Explains and hedges'],
      ['lmao ok. like ur never late', 'Keeps score back']),
    Q('partner', ['hey so ur girlfriend posted MY kids on instagram', 'take it down rn pls', 'and is she coming to the recital w/ u or what. lmk'], 2,
      ['omg it was one zoo pic. everyone posts their kids. relax lol', 'Waves it off'],
      ['idc, she can post wtv she wants on her own page', 'Picks a fight'],
      ["I asked her to take it down today. She won't be at the recital.", 'Both asks answered']),
    Q('school', ['noahs teacher emailed ME bc u never answer', 'reading log signed by friday. can u manage that 🙃'], 1,
      ['I answer every email!! maybe the school has the wrong address, which YOU gave them btw. I even checked my spam', 'Over-explains the past'],
      ["Yep, I'll sign it and send it back with Noah on Thursday.", 'Answers only the ask'],
      ['can i manage a signature? wow. ya i think ill survive smh', 'Sarcasm reads badly']),
    Q('messenger', ['noah says u told him im the reason u missed his game', 'nice.', 'r u coming sat at 10 or not'], 2,
      ['i NEVER said that. someone put that in his head and we both know who', 'Denies and accuses'],
      ['why r u grilling noah about what i say?? leave him out of it', 'Opens a new fight'],
      ["Yes, I'll be at the game Saturday at 10.", 'Just the answer']),
    Q('health', ['U FORGOT THE INHALER AGAIN', 'seriously??', 'he couldve ended up in the ER', 'bring it to school b4 8 tmrw'], 0,
      ["I'll drop the inhaler at the school office before 8 tomorrow.", 'Does what was asked'],
      ['i didnt forget it, u never packed it. dont use the ER to guilt trip me', 'Takes the bait'],
      ['ill try but my mornings are insane rn and ive had the worst week', 'Vague, all about you']),
  ]},
  {week: 2, rule: 'Boring is safe. Give them nothing to grab.', qs: [
    Q('money', ['must be nice going to cancun while im scraping by for YOUR kids', 'saw the pics btw 😂'], 2,
      ['i saved for a yr for that trip tbh. not that its any of ur business', 'Justifies, then snaps'],
      ['maybe if u budgeted for once u wouldnt be scraping by', 'Takes the bait'],
      ['Noted. The September support payment went out on the 1st.', 'Flat and factual']),
    Q('partner', ['Ur new wife is SO classy 🙂', 'the kids must be thrilled lol'], 1,
      ['at least she shows up on time lmao', 'Bites back'],
      ["Pickup's still 6:00 Friday at school.", 'Nothing to grab'],
      ['pls stop stalking my wifes instagram. its creepy', 'Hands them a fight']),
    Q('schedule', ['k.', 'dw about it', 'enjoy ur quiet wknd while the kids cry about u. great parenting'], 0,
      ["I'll call them Saturday at 6 like we planned.", 'Calm and kind'],
      ['wow. ok. thats low even for u', 'Shows the hurt'],
      ['they can call me wtv time they want. unless ur blocking that too', 'Sneaky dig']),
    Q('messenger', ['noah told me u cried at pickup 😂', 'pathetic', 'maybe get some help fr', 'nvm not my problem anymore'], 2,
      ['at least i have feelings unlike some people', 'Takes the bait'],
      ['so ur using noah to spy on me now?? classy', 'Accuses back'],
      ['Okay. See you Friday at 5.', 'Gray rock']),
    Q('school', ['guess ur too busy to look at emmas report card', 'its on the fridge at MY house ofc'], 1,
      ['im not too busy. ive asked u for a copy for 2 weeks, i texted on the 3rd AND the 10th and u ignored both', 'Over-explains'],
      ['Thanks. Could you send me a photo of it tonight?', 'Neutral and useful'],
      ['ikr. everything is at YOUR house 🙄', 'Sarcasm reads badly']),
  ]},
  {week: 3, rule: 'Meet a threat with calm, never a counter-threat.', qs: [
    Q('schedule', ['istg if ur late ONE more time', 'im keeping them', 'and u can see them when I say so'], 2,
      ['lol try it and see what happens', 'Matches the threat'],
      ['keep them?? over 5 min?? ur unhinged', 'Insults back'],
      ["Okay. I'll be at the exchange Friday at 5:00.", 'Calm, then logistics']),
    Q('money', ['600 by tn.', 'or i tell the kids exactly why theres no christmas this year'], 0,
      ["Please leave the kids out of money. I'll send my $300 half by Friday.", 'Firm, kids out'],
      ['go ahead tell them. then ill tell them about u', 'Mirrors the threat'],
      ['fine. sending all 600 now. happy?', 'The threat worked']),
    Q('partner', ['if ur girlfriend shows up to the recital im gonna make a scene. promise'], 1,
      ['make a scene and ill film it for the judge', 'Threat for a threat'],
      ["I'll be at Emma's recital at 6, and I'll keep things calm.", 'Calm, still shows up'],
      ['pls dont do this. it would destroy emma and u know it', 'Guilt trip back']),
    Q('messenger', ['keep it up', 'ill tell noah u never wanted him', 'ur choice'], 2,
      ['u wouldnt dare. thats sick', 'Reacts to the threat'],
      ['tell him wtv u want. hell know the truth someday', 'Dares them'],
      ["Please keep Noah out of this. I'll pick him up Friday at 5.", 'Kids out, plan on']),
    Q('school', ['tbh i cant even. her grades dropped AGAIN and its bc of ur house, no homework no bedtime nothing, if her report card is bad im gonna go for full custody so get it together'], 0,
      ["I want Emma doing well too. I'll check her homework every night on my days.", 'Shared goal, a plan'],
      ['go for it. my lawyer will hear about this', 'Lawyer threat'],
      ['her grades are FINE. ur making stuff up to scare me like always', 'Argues and accuses']),
  ]},
  {week: 4, rule: 'Answer an accusation with one fact they can check.', qs: [
    Q('schedule', ['u didnt even show up sat', 'the kids waited an HOUR', 'unreal'], 1,
      ["I was there at 10 and waited. You must've had the wrong time, as usual.", 'Fact plus a jab'],
      ['I was at the school lot at 10 and texted you at 10:05. Sunday instead?', 'Checkable fact, next step'],
      ['thats a lie and u know it smh', 'Denial, no facts']),
    Q('money', ['2 months. no support. dont even try to deny it.'], 0,
      ['Payments went out Aug 1 and Sept 1 by bank transfer. I can send the confirmations.', 'Dates they can check'],
      ['I paid both months. Check your account before you accuse me.', 'Right, but defensive'],
      ['i paid. ur just trying to make me look bad for the GAL', 'Reads their motive']),
    Q('health', ['u sent noah to school w/ a fever??', 'the nurse had to call ME', 'at work'], 2,
      ["He had no fever when he left at 7:30. I'm not a bad parent.", 'Fact, then defends'],
      ['He was fine this morning. Kids get sick during the day, it happens.', 'Explains it away'],
      ["He was 98.6 at 7:30. Thanks for getting him. I'll keep him home tomorrow.", 'Fact, thanks, plan']),
    Q('messenger', ['emma says u left her home alone for 3 hrs', 'explain.', 'now pls'], 1,
      ["Emma's mistaken. Her aunt was there the whole time and Emma knows it.", 'Contradicts the child'],
      ["Her aunt Maria was with her from 4 to 7 while I worked. Happy to share Maria's number.", 'Fact they can verify'],
      ['why do u believe literally everything she says', 'Questions their judgment']),
    Q('partner', ['ur boyfriend yelled at noah at the park', 'everyone saw btw', 'idk who he thinks he is'], 0,
      ["I was there. Dan called Noah back from the street. I'll handle it myself next time.", 'Fact, owns the fix'],
      ["He didn't yell. He's literally the calmest person I know.", 'Defends, no fact'],
      ['everyone?? who is everyone. ur friends?', 'Interrogates the source']),
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
   texting shorthand, none of the stiff phrases VOICE.md bans. Tags ≤ 4 words, rules ≤ 12. */
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const EMOJI = /\p{Extended_Pictographic}/u;
const SHORTHAND = /\b(u|ur|r|idk|idc|rn|tbh|ngl|fr|smh|omw|wya|bc|cuz|prob|tmrw|pls|plz|thx|lol|lmao|k|kk|btw)\b/i;
const STIFF = /i acknowledge|per our agreement|kindly|please be advised|as previously stated|moving forward|hope this message finds|i understand your frustration|thank you for your message|\bregarding\b|in regards to/i;

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
      if (SHORTHAND.test(good)) out.push(`${where(j)}: good reply uses texting shorthand`);
      if (STIFF.test(good)) out.push(`${where(j)}: good reply uses a stiff phrase`);
      if (/^(k|ok|noted)\.?$/i.test(good.trim())) out.push(`${where(j)}: good reply is a bare "${good}"`);
      q.opts.forEach(([text, tag], k) => {
        if (!text.trim()) out.push(`${where(j)}: option ${k + 1} is empty`);
        if (words(tag) > 4) out.push(`${where(j)}: tag "${tag}" is ${words(tag)} words (max 4)`);
      });
      if (new Set(q.opts.map(([t]) => t)).size !== 3) out.push(`${where(j)}: two options are the same`);
    });
  });
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
    [1, 2, 3, 4].map((n) => `${n}×${sizes.filter((s) => s === n).length}`).join(' '));
}

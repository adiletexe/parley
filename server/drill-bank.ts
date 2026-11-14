/* The content bank for daily Practice: tap-the-best-reply scenarios, 5 a day.
   For now FOUR days are written, one per week theme of plan-content.ts (1 Brief & facts, 2 Don't take
   the bait, 3 Boundaries & firm requests, 4 Court-ready habits), so the first days already show the range.
   BANK still has 28 entries: day N reuses written day ((N-1) % 4) + 1 under its own day number and ids,
   until the rest are written. Exactly one option per question is the BIFF reply; the other two are the
   tempting things a stressed parent really sends, and the week-4 ones are close calls on purpose (one small
   slip each: a jab, a defence tacked on, a vague time). General communication practice, not legal advice. */

export type Trigger = 'schedule' | 'money' | 'partner' | 'school' | 'messenger' | 'health';
export interface ChoiceOption { text: string; good: boolean; tag: string }
export interface ChoiceQ { id: string; trigger: Trigger; them: string; options: [ChoiceOption, ChoiceOption, ChoiceOption] }
export interface DayPack { day: number; week: 1 | 2 | 3 | 4; skill: string; rule: string; questions: ChoiceQ[] }

type Opt = [text: string, tag: string];
type RawQ = {trigger: Trigger; them: string; good: 0 | 1 | 2; opts: [Opt, Opt, Opt]};

const SKILL = {1: 'Brief & factual', 2: 'Not taking the bait', 3: 'Clear boundaries', 4: 'Court-ready habits'} as const;

const Q = (trigger: Trigger, them: string, good: 0 | 1 | 2, a: Opt, b: Opt, c: Opt): RawQ => ({trigger, them, good, opts: [a, b, c]});

/** The written days, in order. Each samples one week's theme. */
const WRITTEN: {week: 1 | 2 | 3 | 4; rule: string; qs: RawQ[]}[] = [
  {week: 1, rule: 'Answer the question, skip the history.', qs: [
    Q('schedule', "You were 25 minutes late Sunday. Again. Confirm 5:00 sharp this Sunday or I'm done waiting.", 0,
      ['Confirmed: 5:00 this Sunday at your place.', 'Answers only the ask'],
      ["There was a crash on I-95. Not that you'd believe me. I'll try for 5.", 'Explains and hedges'],
      ["You've been late plenty of times too, so let's not.", 'Keeps score back']),
    Q('partner', "Your girlfriend posted my kids on Instagram. Take it down. And is she coming to the recital?", 2,
      ['It was one picture of them at the zoo. Everyone posts pictures. Relax.', 'Minimizes their concern'],
      ['She can post what she wants on her own account.', 'Picks a fight'],
      ["I've asked her to take it down today. She won't be at the recital.", 'Both asks answered']),
    Q('school', "Noah's teacher emailed ME because you never answer. Reading log signed by Friday. Can you manage that?", 1,
      ['I answer every email I get. Maybe the school has the wrong address, since you gave it to them.', 'Defends the past'],
      ["Yes, I'll sign it and send it back with Noah Thursday.", 'Answers only the ask'],
      ['Can I manage that? Wow. Yes, I think I can manage a signature.', 'Sarcasm reads badly']),
    Q('messenger', "Noah says you told him I'm the reason you missed his game. Are you coming Saturday at 10 or not?", 2,
      ['I never said that. Noah misheard, or someone put the idea in his head.', 'Denies and accuses'],
      ['Why are you asking Noah what I say? Leave him out of it.', 'Opens a new fight'],
      ["Yes, I'll be at the game Saturday at 10.", 'Just the answer']),
    Q('health', "You forgot the inhaler AGAIN. He could've ended up in the ER. Bring it to school before 8.", 0,
      ["I'll drop the inhaler at the school office before 8 tomorrow.", 'Does what was asked'],
      ["I didn't forget it, you never packed it. Don't use the ER to guilt-trip me.", 'Takes the bait'],
      ["I'll try, but my mornings are crazy and I've had a really hard week.", 'Vague and self-focused']),
  ]},
  {week: 2, rule: 'Boring is safe: no reaction, nothing to grab.', qs: [
    Q('money', "Must be nice having all that money for your vacation while I'm scraping by for the kids.", 2,
      ["I saved for a year for that trip. Not that it's your business.", 'Justifies, then snaps'],
      ["Maybe if you budgeted better you wouldn't be scraping by.", 'Takes the bait'],
      ['Noted. The September support payment went out on the 1st.', 'Flat and factual']),
    Q('partner', "Your new wife is SO classy. Saw her pics. The kids must be thrilled lol.", 1,
      ['At least she shows up on time. Anyway.', 'Bites back'],
      ['Pickup is still 6:00 Friday at school.', 'Nothing to grab'],
      ["Please stop stalking my wife's social media. It's creepy.", 'Hands them a fight']),
    Q('schedule', "Hope you enjoy your quiet weekend while the kids cry about missing you. Really great parenting.", 0,
      ["I'll call them Saturday at 6 like we planned.", 'Flat and kind'],
      ["That's a low blow, even for you.", 'Shows the hurt'],
      ["They can call me anytime, unless you're blocking that too.", 'Sly insinuation']),
    Q('messenger', "Noah told me you cried at pickup. Pathetic. Maybe get some help?", 2,
      ["I'm human. At least I have feelings, unlike you.", 'Takes the bait'],
      ['Wow. Using Noah to spy on me now? Classy.', 'Accuses back'],
      ['Okay. See you Friday at 5.', 'Gray rock']),
    Q('school', "I guess you're too busy to look at Emma's report card. It's on the fridge at MY house, obviously.", 1,
      ["I'm not too busy. I've been asking you for a copy for two weeks.", 'Defends the past'],
      ['Thanks. Could you send a photo of it tonight?', 'Neutral and useful'],
      ['Obviously. Everything is at YOUR house.', 'Sarcasm reads badly']),
  ]},
  {week: 3, rule: 'Meet a threat with calm, not a counter-threat.', qs: [
    Q('schedule', "If you're late ONE more time I'm keeping them and you can see them when I say.", 2,
      ['Try it and see what happens.', 'Matches the threat'],
      ["Keep them? Over five minutes? You're unhinged.", 'Insults back'],
      ["Noted. I'll be at the exchange Friday at 5:00 sharp.", 'Noted, then logistics']),
    Q('money', "Pay the full $600 by tonight or I'm telling the kids exactly why there's no Christmas.", 0,
      ["Please keep the kids out of money. I'll send my $300 share by Friday.", 'Firm, kids out'],
      ["Go ahead, tell them. Then I'll tell them about you.", 'Mirrors the threat'],
      ['Fine. Sending all $600 now.', 'The threat worked']),
    Q('partner', "If your girlfriend shows up at the recital, I'll make a scene. Promise.", 1,
      ["Make a scene and I'll film it for the judge.", 'Threat for a threat'],
      ["Noted. I'll be at the recital for Emma at 6, and I'll keep things calm.", 'Stays calm, shows up'],
      ['Please don\'t. It would destroy Emma, and you know it.', 'Guilt trip back']),
    Q('messenger', "Keep it up and I'll tell Noah you never wanted him. Your choice.", 2,
      ["You wouldn't dare. That's sick.", 'Reacts to the threat'],
      ["Tell him whatever. He'll know the truth someday.", 'Dares them'],
      ["Please keep Noah out of adult conflict. I'll pick him up Friday at 5.", 'Kids out, plan on']),
    Q('school', "If Emma's grades drop again, I'm going for full custody. Get it together.", 0,
      ["I want Emma doing well too. I'll check her homework every night on my days.", 'Shared goal, a plan'],
      ['Go for it. My lawyer is ready when you are.', 'Lawyer threat'],
      ["Her grades are fine. You're making things up to scare me.", 'Argues and accuses']),
  ]},
  {week: 4, rule: 'Answer an accusation with one checkable fact.', qs: [
    Q('schedule', "You didn't show up Saturday. The kids waited an hour for you.", 1,
      ["I was there at 10 and waited. You must've had the wrong time, as usual.", "Fact plus 'as usual'"],
      ['I was at the school lot at 10:00 and texted you at 10:05. Reschedule for Sunday?', 'Checkable fact, next step'],
      ["That's a lie and you know it.", 'Denial, no facts']),
    Q('money', "You haven't paid support in two months. Don't even try to deny it.", 0,
      ['Payments went out Aug 1 and Sept 1 by bank transfer. I can send the confirmations.', 'Dates you can check'],
      ['I paid both months. Check your account before accusing me.', 'Right, but defensive'],
      ["I paid. You're just trying to make me look bad.", 'Reads their motive']),
    Q('health', "You sent Noah to school with a fever and the nurse had to call me.", 2,
      ["He had no fever when he left at 7:30. I'm not a bad parent.", 'Fact, then defends'],
      ['He was fine in the morning. Kids get sick during the day.', 'Explains it away'],
      ["His temperature was 98.6 at 7:30. Thanks for getting him; I'll keep him home tomorrow.", 'Fact, thanks, plan']),
    Q('messenger', "Emma said you left her home alone for three hours. Explain yourself.", 1,
      ["Emma's mistaken. Her aunt was there the whole time, and Emma knows it.", 'Contradicts the child'],
      ["Her aunt Maria was with her from 4 to 7 while I worked. Happy to share Maria's number.", 'Fact they can verify'],
      ['Why do you believe everything she says?', 'Questions their judgment']),
    Q('partner', "Your boyfriend yelled at Noah at the park. Everyone saw it.", 0,
      ["I was there. Dan called Noah back from the street. I'll ask him to let me handle it.", 'Fact, owns the fix'],
      ["He didn't yell. He's the calmest person I know.", 'Defends, no fact'],
      ["Everyone saw? Who's everyone? Your friends?", 'Interrogates the source']),
  ]},
];

const pack = (day: number): DayPack => {
  const w = WRITTEN[(day - 1) % WRITTEN.length];
  return {
    day, week: w.week, skill: SKILL[w.week], rule: w.rule,
    questions: w.qs.map((q, j) => ({
      id: `d${day}q${j + 1}`,
      trigger: q.trigger,
      them: q.them,
      options: q.opts.map(([text, tag], k) => ({text, good: k === q.good, tag})) as ChoiceQ['options'],
    })),
  };
};

export const BANK: DayPack[] = Array.from({length: 28}, (_, i) => pack(i + 1));

export function dayPack(day: number): DayPack {
  const d = Math.min(28, Math.max(1, Math.round(Number.isFinite(day) ? day : 1)));
  return BANK[d - 1];
}

/* Runs the reply coach against the live model on 29 realistic bursts (docs/VOICE.md: lowercase, shorthand, double and
   triple texts, cold "k.", sugar-coated 🙂, midnight essays, kids as messengers) and checks, in code, the rules a reply
   must keep — including that it sounds like a person, not HR.
   Usage: npx tsx scripts/eval-reply.ts [--only 3,7] [--quiet]
   Exit code 1 if any rule fails, so a prompt change that makes replies worse is caught before it ships. */
import '../server/env.js';
import {analyzeWithStats, CONCEDE, EMOJI, HOSTILE_PATTERNS, SHORTHAND, STIFF} from '../server/prompts/reply.js';

interface Case {
  name: string; incoming: string; bubbles?: number; draft?: string; context?: string;
  expectFlags?: string[]; expectIncident?: boolean; expectAdvice?: string[]; minHeat?: number;
  /** Shorthand that carries meaning: an ask the model must find (`lmk asap`), and the neutral reply must answer it. */
  expectAsk?: RegExp; replyAnswers?: RegExp;
  /** A withdrawn ask with a guilt jab (`nvm`): the reply may offer logistics but must not grovel. */
  noOverApology?: boolean;
}

const CASES: Case[] = [
  {name: 'rapid-fire late', bubbles: 3, minHeat: 40,
    incoming: "9:41 PM ur seriously 40 min late AGAIN\n9:41 PM emma is sitting here crying\n9:58 PM hello??"},
  {name: 'friendly reminder 🙂', bubbles: 2, minHeat: 30,
    incoming: "Just a friendly reminder 🙂\n\nsoccer is $240 and SOME of us actually pay on time"},
  {name: 'soccer + slang draft', bubbles: 3,
    incoming: "im not paying half of soccer\nu signed him up without even asking me\ntypical.",
    draft: "lmao ok. u literally never pay for anything so idk why im surprised. pay ur half by friday or im taking it to my lawyer",
    expectFlags: ['u literally never pay', 'my lawyer', 'lmao']},
  {name: 'soccer signed up without asking', bubbles: 1,
    incoming: "I'm not paying half of soccer. You signed him up without asking me. Typical. You never think about anyone but yourself."},
  {name: 'cold k.', bubbles: 1, expectAdvice: ['brief_ack', 'no_reply', 'reply'],
    incoming: "k."},
  {name: 'cold after swap', bubbles: 3,
    incoming: "[11/12, 6:02 PM] Jordan: fine. whatever.\n[11/12, 6:02 PM] Jordan: take them sat then\n[11/12, 6:40 PM] Jordan: but im getting them back by 6 sunday not 8"},
  {name: 'new partner threat', bubbles: 3, expectIncident: true, minHeat: 60,
    incoming: "i dont want that guy anywhere near my kids\nu barely know him\nif hes at ur place this weekend im keeping them. period."},
  {name: 'tell the kids + slang draft', bubbles: 2, expectIncident: true,
    incoming: "need to switch weekends, work trip on the 14th\nif u say no im telling the kids its bc u dont care about my job",
    draft: "omg here we go. fine swap. but if u tell them that ur gonna regret it fr. ur pathetic for even saying it 🙄",
    expectFlags: ['regret it', 'pathetic', '🙄']},
  {name: 'fever', bubbles: 3,
    incoming: "emma had a 102 fever when u dropped her off\nand u didnt say a word??\ndid u give her anything or not"},
  {name: 'pure insult lol', bubbles: 2, expectAdvice: ['no_reply', 'brief_ack'],
    incoming: "ur a joke of a parent\neveryone sees it lol"},
  {name: 'lawyer + ask', bubbles: 2,
    incoming: "my lawyer is gonna hear about the dentist thing dont bother explaining\n\njust send me the dentists number so i can call them myself"},
  {name: 'thanksgiving logistics sting', bubbles: 2,
    incoming: "thanksgiving is mine this yr. picking them up wed after school, back sunday 5pm\ndont make it a whole thing like last yr"},
  {name: 'braces midnight essay', bubbles: 1,
    incoming: "1:12 AM so the orthodontist says noah needs braces which is $4,800 and honestly i shouldnt even have to ask but ur paying half obviously since ur the one who never makes him brush when hes at ur place and i'm the one who takes him to every single appointment while u do whatever u do, so i need an answer this week not in a month like the camp thing",
    draft: "Im not paying a dime until I see the quote myself. Maybe if u fed him less sugar he wouldnt need braces"},
  {name: 'conference hidden', bubbles: 3,
    incoming: "why did i have to hear about the conference from the teacher\nu hid it on purpose\nwhen is the next one"},
  {name: 'kid as messenger', bubbles: 2, expectIncident: true,
    incoming: "noah told me u called me crazy in front of him\nstop poisoning my kids against me. im writing all of this down"},
  {name: 'missed call', bubbles: 4, minHeat: 30,
    incoming: "7:04 PM they were supposed to call me at 7\n7:20 PM ??\n7:45 PM wow ok\n8:10 PM so ur just not letting them call me now"},
  {name: 'support late', bubbles: 3,
    incoming: "wheres the support\nit was due on the 1st\nim not ur bank"},
  {name: 'dentist ramble', bubbles: 1,
    incoming: "ever since u moved out u made every single thing harder. the school forms, soccer, letting them stay up til 11 on ur weekends. my mom saw u on ur phone the whole party. whatever im not gonna fight about it. lily has the dentist tues at 3:30, can u take her or do i have to take off work AGAIN. also she needs new cleats"},
  {name: 'guilt trip', bubbles: 2,
    incoming: "emma cried all night bc she misses me\nhope ur happy 🙃"},
  {name: 'friendly logistics', bubbles: 2, expectAdvice: ['reply', 'brief_ack'],
    incoming: "hey can u grab emmas jacket from my car at pickup\nback seat. thx"},
  {name: 'florida + passports', bubbles: 3,
    incoming: "taking the kids to florida for spring break\nim telling u not asking\nneed the passports from ur place by next week and dont play games like last time"},
  {name: 'withholding kids + draft', bubbles: 2, expectIncident: true,
    incoming: "u wont see them this weekend if u dont send the $300 for camp by friday\nur choice 👍",
    draft: "wtf?? u cant keep them from me thats against the order and ill call the police. ill pay when i get the receipt like we agreed",
    expectFlags: ["ill call the police", 'wtf']},
  {name: 'drinking accusation', bubbles: 2, expectIncident: true,
    incoming: "u were drunk at pickup i could smell it\nthe kids arent getting in the car with u next time"},
  {name: 'last minute cancel', bubbles: 2,
    incoming: "cant take them sat something came up\ndeal with it"},
  {name: 'recital + sarcasm draft', bubbles: 2,
    incoming: "wow thanks for finally answering. only took u 3 days\nr u coming to the recital on the 9th or not",
    draft: "lol sorry some of us actually work. yes im coming to the recital, i already told emma"},
  {name: 'therapist', bubbles: 3,
    incoming: "[11/10, 4:15 PM] Sam: found a therapist for emma\n[11/10, 4:15 PM] Sam: first session thurs at 4\n[11/10, 4:16 PM] Sam: i dont need ur permission and i dont want u calling her"},
  // Shorthand that carries the meaning (VOICE.md §1): `lmk asap` is the real ask, `nvm` withdraws it with a guilt
  // jab, `istg` is escalation.
  {name: 'lmk asap is the ask', bubbles: 3,
    incoming: "ugh they moved my shift again\ncan u take them tmrw b4 school\nlmk asap",
    expectAsk: /tomorrow|tmrw|before school|b4 school|morning|take them/i, replyAnswers: /tomorrow|before school|morning|drop|take them|\[/i},
  {name: 'nvm withdrawal + guilt', bubbles: 2, noOverApology: true,
    incoming: "was gonna ask u to switch wknds\nnvm ik ur 'busy'"},
  {name: 'istg escalation', bubbles: 3, minHeat: 60,
    incoming: "istg if ur late one more time…\nim done sitting in that parking lot w/ them\nnot gonna keep doing this"},
];

const BANNED = /\b(you always|you never|as usual|per my last|as i(?:'ve| have)? (?:already )?(?:said|told you)|obviously|clearly|frankly|for the record|just so you know|with all due respect|i hear that you|lawyer|attorney|court|judge|police)\b|!/i;
const STOP = new Set('the and for you your with that this from have will what when then them they need about make able know'.split(' '));
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').map(Number) : null;
const quiet = args.includes('--quiet');

let fails = 0;
const failLines: string[] = [];
function check(name: string, ok: boolean, what: string) {
  if (!ok) { fails++; failLines.push(`  FAIL [${name}] ${what}`); }
  if (!quiet || !ok) console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${what}`);
}

/** Numbers, money and times in a reply must come from what the user gave us. */
function invented(reply: string, source: string): string[] {
  const toks = reply.replace(/\[[^\]]*\]/g, '').match(/\$?\d[\d,.:]*(?:\s?(?:am|pm))?/gi) ?? [];
  const src = source.toLowerCase().replace(/,/g, '');
  // Half of an amount they named ("my $120 half" of $240) is arithmetic, not invention.
  const halves = new Set((src.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => String(Number(n) / 2)));
  return toks.filter((t) => {
    const k = t.toLowerCase().replace(/[,.]$/, '').replace(/,/g, '').replace(/\s?(am|pm)$/, '').replace(/:00$/, '');
    return !src.includes(k) && !halves.has(k.replace(/^\$/, ''));
  });
}

async function runOne(c: Case, i: number) {
  const t0 = Date.now();
  const {analysis: a, stats} = await analyzeWithStats({incoming: c.incoming, draft: c.draft, context: c.context});
  return {c, i, a, stats, ms: Date.now() - t0};
}

const picked = CASES.map((c, i) => ({c, i: i + 1})).filter(({i}) => !only || only.includes(i));
const results: Awaited<ReturnType<typeof runOne>>[] = [];

// One case first, alone: if no model answers (no key, credits out), say so once instead of 25 stack traces.
const PROVIDER_DOWN = /GEMINI_API_KEY|ANTHROPIC|not set|\b(401|402|403|429)\b|credits|quota|RESOURCE_EXHAUSTED|fetch failed|ENOTFOUND/i;
{
  const first = picked.shift();
  if (first) {
    try { results.push(await runOne(first.c, first.i)); } catch (e) {
      const msg = (e as Error).message ?? String(e);
      if (PROVIDER_DOWN.test(msg)) {
        console.log(`No AI provider answered, so nothing was evaluated.\n  ${msg.replace(/\s+/g, ' ').slice(0, 240)}\nTop up the Gemini key or put a working ANTHROPIC key in .env, then run: npx tsx scripts/eval-reply.ts`);
        process.exit(2);
      }
      fails++; failLines.push(`  FAIL [${first.c.name}] error ${msg.slice(0, 200)}`);
    }
  }
}
const queue = [...picked];
await Promise.all(Array.from({length: 5}, async () => {
  while (queue.length) {
    const {c, i} = queue.shift()!;
    try { results.push(await runOne(c, i)); } catch (e) { fails++; failLines.push(`  FAIL [${c.name}] error ${(e as Error).message}`); console.log(`#${i} ${c.name}: ERROR ${(e as Error).message}`); }
  }
}));

results.sort((x, y) => x.i - y.i);
const times: number[] = [];
let rewrites = 0;
for (const {c, i, a, stats, ms} of results) {
  times.push(ms);
  console.log(`\n#${i} ${c.name}  (${(ms / 1000).toFixed(1)}s, heat ${a.heat}, ${a.category}, ${a.advice})`);
  (a.bubbles ?? [a.incoming]).forEach((b, k) => console.log(`   THEY ${a.bubbleTimes?.[k] || ''}> ${b}`));
  console.log(`   FACTS: ${a.facts}`);
  console.log(`   STRIPPED: ${JSON.stringify(a.stripped)}`);
  console.log(`   ASKS: ${JSON.stringify(a.asks)}`);
  console.log(`   WHY: ${a.adviceWhy}`);
  for (const k of ['brief', 'neutral', 'firm'] as const) console.log(`   ${k.toUpperCase()} (${a.variants[k].words}w): ${a.variants[k].text}`);
  if (a.incident?.worthLogging) console.log(`   INCIDENT: ${a.incident.title} — ${a.incident.note}`);
  if (c.draft) {
    console.log(`   DRAFT: ${c.draft}`);
    console.log(`   DRAFT SCORE: ${a.draftScore}  (model flags ${stats.flagsFromModel}, dropped ${stats.flagsDropped}, added by code ${stats.flagsAddedByCode})`);
  }
  for (const f of a.lens) console.log(`   LENS ${f.severity}: "${f.phrase}" — ${f.issue}. ${f.why}${f.fix ? ` Fix: ${f.fix}` : ''}`);
  console.log(`   REPLY SCORE: ${a.replyScore}${stats.rewrites ? `  (rewritten once: ${stats.rewriteWhy.join('; ')})` : ''}`);
  rewrites += stats.rewrites;

  const source = [c.incoming, c.draft ?? '', c.context ?? ''].join(' ');
  if (c.bubbles !== undefined) check(c.name, (a.bubbles?.length ?? 1) === c.bubbles, `read as ${c.bubbles} text(s) (${a.bubbles?.length ?? 1})`);
  if (c.minHeat !== undefined) check(c.name, a.heat >= c.minHeat, `heat ≥ ${c.minHeat} from the cues (${a.heat})`);
  check(c.name, a.variants.brief.words <= 20, `brief ≤ 20 words (${a.variants.brief.words})`);
  check(c.name, a.variants.neutral.words <= 50 && a.variants.firm.words <= 50, `neutral/firm ≤ 50 words (${a.variants.neutral.words}/${a.variants.firm.words})`);
  check(c.name, !STIFF.test(a.facts) && !SHORTHAND.test(a.facts), `facts in plain English${STIFF.exec(a.facts) || SHORTHAND.exec(a.facts) ? ` ("${(STIFF.exec(a.facts) || SHORTHAND.exec(a.facts))![0]}")` : ''}`);
  for (const k of ['brief', 'neutral', 'firm'] as const) {
    const t = a.variants[k].text;
    const m = BANNED.exec(t);
    check(c.name, !m, `${k}: no banned phrase${m ? ` (found "${m[0]}")` : ''}`);
    // No admission of fault or promise that accepts their framing, unless the user's own draft/notes said it.
    const cm = CONCEDE.exec(t);
    const theirOwn = cm && (c.draft ?? '').concat(' ', c.context ?? '').toLowerCase().includes(cm[0].toLowerCase());
    check(c.name, !cm || !!theirOwn, `${k}: no admission or concession${cm && !theirOwn ? ` (found "${cm[0]}")` : ''}`);
    const st = STIFF.exec(t);
    check(c.name, !st, `${k}: no stiff phrase${st ? ` (found "${st[0]}")` : ''}`);
    const sh = SHORTHAND.exec(t);
    check(c.name, !sh && !EMOJI.test(t), `${k}: no emoji or shorthand${sh ? ` (found "${sh[0]}")` : EMOJI.test(t) ? ' (emoji)' : ''}`);
    check(c.name, !/\n/.test(t) && !/(^|\s)(1[.)]|to your first)/i.test(t) && (t.match(/[.?](\s|$)/g) ?? []).length <= 4, `${k}: one text back, not bubble by bubble`);
    check(c.name, !/\b(I will|I am|do not|cannot|I would|it is|that is|let us)\s+[a-z]/.test(t), `${k}: uses contractions`);
    const hp = HOSTILE_PATTERNS.find((p) => p.re.test(t));
    check(c.name, !hp, `${k}: no hostile pattern${hp ? ` (${hp.issue})` : ''}`);
    const inv = invented(t, source);
    check(c.name, inv.length === 0, `${k}: no invented numbers${inv.length ? ` (${inv.join(', ')})` : ''}`);
    const copied = (a.stripped ?? []).filter((s) => s.split(/\s+/).length >= 2 && t.toLowerCase().includes(s.toLowerCase()));
    check(c.name, copied.length === 0, `${k}: no insult copied${copied.length ? ` (${copied.join(' | ')})` : ''}`);
  }
  if (a.asks.length) {
    check(c.name, a.advice !== 'no_reply', 'asks present → not "no reply"');
    const words = a.asks.join(' ').toLowerCase().match(/[a-z]{4,}/g)?.filter((w) => !STOP.has(w)) ?? [];
    const hit = words.some((w) => a.variants.neutral.text.toLowerCase().includes(w.slice(0, 5)));
    check(c.name, hit, 'neutral reply addresses an ask (shares a keyword)');
  }
  if (c.expectAsk) check(c.name, a.asks.some((q) => c.expectAsk!.test(q)), `asks include ${c.expectAsk}`);
  if (c.replyAnswers) check(c.name, c.replyAnswers.test(a.variants.neutral.text), `neutral reply answers it (${c.replyAnswers})`);
  if (c.noOverApology) {
    const all = (['brief', 'neutral', 'firm'] as const).map((k) => a.variants[k].text);
    const grovel = all.find((t) => /apolog|my fault|i feel (?:bad|terrible|awful)|so sorry|sorry.*sorry/i.test(t));
    check(c.name, !grovel, `no over-apology${grovel ? ` ("${grovel}")` : ''}`);
    check(c.name, all.filter((t) => /\bsorry\b/i.test(t)).length <= 1, 'at most one variant says sorry');
  }
  if (c.expectAdvice) check(c.name, c.expectAdvice.includes(a.advice), `advice in ${c.expectAdvice.join('/')}`);
  if (c.expectIncident !== undefined) check(c.name, !!a.incident?.worthLogging === c.expectIncident, `incident worthLogging = ${c.expectIncident}`);
  for (const e of c.expectFlags ?? []) {
    const ok = a.lens.some((f) => f.severity !== 'good' && (f.phrase.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(f.phrase.toLowerCase())));
    check(c.name, ok, `flags "${e}"`);
  }
  if (c.draft) {
    check(c.name, a.lens.every((f) => c.draft!.includes(f.phrase)), 'every flag phrase occurs in the draft');
    check(c.name, (a.draftScore ?? 0) < (a.replyScore ?? 0), `suggested reply scores above the draft (${a.replyScore} > ${a.draftScore})`);
  } else {
    check(c.name, a.lens.every((f) => a.variants.neutral.text.includes(f.phrase)), 'every lens phrase occurs in the neutral reply');
  }
}

times.sort((a, b) => a - b);
console.log(`\nvoice rewrites needed: ${rewrites}/${results.length}`);
console.log(`\n${results.length} cases · median ${(times[Math.floor(times.length / 2)] / 1000).toFixed(1)}s · max ${(times[times.length - 1] / 1000).toFixed(1)}s`);
console.log(fails ? `${fails} failed:\n${failLines.join('\n')}` : 'all good');
process.exit(fails ? 1 : 0);

/* Runs the reply coach against the live model on 25 realistic messages and checks, in code, the rules a
   reply must keep. Usage: npx tsx scripts/eval-reply.ts [--only 3,7] [--quiet]
   Exit code 1 if any rule fails, so a prompt change that makes replies worse is caught before it ships. */
import '../server/env.js';
import {analyzeWithStats, HOSTILE_PATTERNS, wordCount} from '../server/prompts/reply.js';

interface Case { name: string; incoming: string; draft?: string; context?: string; expectFlags?: string[]; expectIncident?: boolean; expectAdvice?: string[] }

const CASES: Case[] = [
  {name: 'late pickup', incoming: "You were 40 minutes late AGAIN on Sunday. The kids sat there with their shoes on waiting for you. Do you even care? Pickup is at 5, not whenever you feel like it. Will you be there on time this Friday or not?",
    expectIncident: false},
  {name: 'soccer fees', incoming: "I'm not paying half of soccer. You signed him up without asking me. Typical. You never think about anyone but yourself.",
    draft: "You always do this. I told you about soccer in August and you said fine. Typical. I'll see you in court if you don't pay your half by Friday!!",
    expectFlags: ['You always do this', "I'll see you in court"]},
  {name: 'new partner', incoming: "I don't want that man anywhere near my kids. I don't know him and neither do you really. If he's at the house this weekend I'm keeping them.",
    expectIncident: true},
  {name: 'weekend swap + kids threat', incoming: "I need to switch weekends, I have a work trip the 14th. If you say no I'm telling the kids it's because you don't care about my job and you're being difficult. Let me know today.",
    draft: "Fine, swap. But if you tell the kids anything like that I swear you will regret it. You are pathetic for even saying it.",
    expectFlags: ['you will regret it', 'You are pathetic'], expectIncident: true},
  {name: 'fever accusation', incoming: "Emma had a 102 fever when you dropped her off and you didn't say a word. What kind of parent sends a sick kid to school? I had to leave work to get her. Did you give her anything or not?"},
  {name: 'pure insult', incoming: "You're a joke of a parent. Everyone sees it. The kids will figure it out too eventually.",
    expectAdvice: ['no_reply', 'brief_ack']},
  {name: 'lawyer threat', incoming: "My lawyer is going to hear about how you handled the dentist thing. Don't bother explaining. Just send me the dentist's number so I can call them myself."},
  {name: 'thanksgiving', incoming: "Thanksgiving is mine this year, it's an odd year. I'm picking them up Wednesday after school and bringing them back Sunday. Don't make this a fight like last year."},
  {name: 'braces', incoming: "The orthodontist says Noah needs braces, $4,800. You'll pay half obviously since you're the one who always forgets to make him brush. I need an answer this week.",
    draft: "I'm not paying a dime until I see the quote myself. Maybe if you fed him less sugar he wouldn't need braces."},
  {name: 'school conference', incoming: "Why did I have to hear from the teacher that there was a parent-teacher conference? You hid it from me on purpose. When is the next one?"},
  {name: 'poisoning accusation', incoming: "Noah told me you called me crazy in front of him. Stop poisoning my kids against me. I'm writing all this down.",
    expectIncident: true},
  {name: 'phone calls', incoming: "You didn't let them call me last night. Again. They're supposed to be able to call me at 7. What happened?"},
  {name: 'child support late', incoming: "Where's the support payment? It was due on the 1st. I'm not your bank. Pay it."},
  {name: 'long ramble', incoming: "I can't believe I even have to write this. Ever since you moved out you've made every single thing harder, from the school forms to the stupid soccer schedule to the way you let them stay up until 11 on your weekends. My mom said she saw you on your phone the whole time at the birthday party. Whatever. I'm not going to fight about it. Anyway Lily has a dentist appointment on Tuesday at 3:30 and you need to tell me if you can take her or if I have to take off work again like always. Also she needs new cleats."},
  {name: 'guilt trip', incoming: "Emma cried all night because she misses me. Hope you're happy keeping her from me for a whole week."},
  {name: 'friendly logistics', incoming: "Hey, can you grab Emma's jacket from my car at pickup? It's in the back seat. Thanks"},
  {name: 'travel consent', incoming: "I'm taking the kids to Florida for spring break. I'm telling you, not asking. I need the passports from your place by next week, and don't play games like last time."},
  {name: 'screen time criticism', incoming: "They came back glued to their iPads again. Do you just park them in front of a screen all weekend? It's lazy parenting. They also said they had pizza three nights in a row."},
  {name: 'haircut', incoming: "You cut Noah's hair without asking me?? His hair is NOT yours to decide. You had no right."},
  {name: 'withholding kids', incoming: "You won't see them this weekend if you don't pay me the $300 for camp by Friday. Your choice.",
    draft: "You can't keep them from me, that's against the order and I'll call the police. I'll pay when I get the receipt like we agreed.",
    expectFlags: ["I'll call the police"], expectIncident: true},
  {name: 'relocation', incoming: "FYI I got a job in Denver. We're moving in June. We'll figure out your time later."},
  {name: 'drinking accusation', incoming: "You were drunk at pickup. I could smell it. I'm not letting the kids get in the car with you next time.",
    expectIncident: true},
  {name: 'last minute cancel', incoming: "Can't take them Saturday, something came up. Deal with it."},
  {name: 'sarcastic delay', incoming: "Wow, thanks for finally answering. Only took you 3 days. So are you coming to the recital on the 9th or not?",
    draft: "Sorry, I've been busy actually working. Yes I'll be at the recital, as I already told Emma."},
  {name: 'counselor', incoming: "I found a therapist for Emma. First session is Thursday at 4. I don't need your permission and I don't want you calling her."},
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
  return toks.filter((t) => !src.includes(t.toLowerCase().replace(/[,.]$/, '').replace(/,/g, '').replace(/\s?(am|pm)$/, '')));
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
for (const {c, i, a, stats, ms} of results) {
  times.push(ms);
  console.log(`\n#${i} ${c.name}  (${(ms / 1000).toFixed(1)}s, heat ${a.heat}, ${a.category}, ${a.advice})`);
  console.log(`   THEY: ${c.incoming}`);
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
  console.log(`   REPLY SCORE: ${a.replyScore}`);

  const source = [c.incoming, c.draft ?? '', c.context ?? ''].join(' ');
  check(c.name, a.variants.brief.words <= 30, `brief ≤ 30 words (${a.variants.brief.words})`);
  check(c.name, a.variants.neutral.words <= 75 && a.variants.firm.words <= 75, `neutral/firm ≤ 75 words (${a.variants.neutral.words}/${a.variants.firm.words})`);
  for (const k of ['brief', 'neutral', 'firm'] as const) {
    const t = a.variants[k].text;
    const m = BANNED.exec(t);
    check(c.name, !m, `${k}: no banned phrase${m ? ` (found "${m[0]}")` : ''}`);
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
console.log(`\n${results.length} cases · median ${(times[Math.floor(times.length / 2)] / 1000).toFixed(1)}s · max ${(times[times.length - 1] / 1000).toFixed(1)}s`);
console.log(fails ? `${fails} failed:\n${failLines.join('\n')}` : 'all good');
process.exit(fails ? 1 : 0);

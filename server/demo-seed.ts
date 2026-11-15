/* The jury's sample case: Alex and Jordan, two homes, Emma (8) and Noah (5), an active custody case with a GAL.
   Six weeks of a believable record — late handoffs, a soccer-fee dispute, a threat to "tell the kids", a fever
   accusation — seeded as DATA (source 'demo'). The coach analyses in it are not canned: three of the real messages
   go through the real analyzeMessage when the case is opened. The plan started 11 days ago, with ten days of drill
   history that climbs from a shaky first attempt, so today's drill (day 12) is the jury's to do. */
import {db, type PersonRow} from './db.js';
import {addEntry} from './journal-store.js';
import {analyzeMessage, type AnalyzeInput} from './prompts/reply.js';
import {drillFor} from './plan-content.js';
import {seedSession} from './routes/plan.js';
import {COURSE, DID} from './course-content.js';
import type {Analysis, Category, Channel, Entry, EntryKind, LensFlag} from '../shared/types.js';
import {newId} from './db.js';

const DAY = 86_400_000;
const HOUR = 3_600_000;
// Times are written in US Eastern wall-clock (the case is in the US); stored as UTC. The offset is looked up per date:
// a fixed 5 h put every October entry an hour late (EDT), so "Late pickup — 22 minutes" showed at 6:22 for a 5:00 handoff.
function etOffset(utcMs: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return Math.round((utcMs - wall) / HOUR) * HOUR;
}

export const DEMO_QUIZ = {
  kids: '2', ages: ['5to9'], channels: ['sms'], tension: 'weekly', triggers: ['schedule', 'money', 'messenger'],
  reaction: 'long', bait: 'both', asks: 'talk', kidsnews: 'ask', court: 'active', support: 'gal', time: '3to6', goal: 'record', name: 'Alex',
};

type Seed = {ago: number; at: string; kind: EntryKind; channel: Channel; category: Category; title: string; text: string; tags?: string[]; cents?: number; key?: string};

/** Midnight-ish anchor so "3 days ago at 17:40 ET" lands on a sensible wall-clock time. */
function when(now: number, ago: number, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now - ago * DAY);
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const wall = base + (h * 60 + m) * 60_000;
  return Math.min(now - 10 * 60_000, wall + etOffset(wall + 5 * HOUR));
}

/* Jordan texts the way people do (docs/VOICE.md): bursts of short bubbles, lowercase, "u", caps for emphasis. A burst
   is ONE message_in entry with a bubble per line, so the Record and the PDF show it as it arrived and the counts and
   patterns see one message, not four. Alex's replies are a calm adult on a phone. Incidents and expenses are plain,
   factual English — what a GAL would want to read, not legalese. */
const ENTRIES: Seed[] = [
  {ago: 41, at: '17:05', kind: 'message_in', channel: 'sms', category: 'schedule', title: 'Jordan: pickup moved to 6 today',
    text: 'cant get off work til 6\npickup is 6 today\ndeal w/ it', tags: ['tense']},
  {ago: 41, at: '17:12', kind: 'message_out', channel: 'sms', category: 'schedule', title: 'Alex: ok, 6:00 at the school',
    text: "Ok, I'll be at the school at 6."},
  {ago: 39, at: '18:31', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 31 minutes',
    text: 'Pickup was set for 6:00 pm at Lincoln Elementary (Jordan moved it from 5:00 that afternoon). Jordan got there at 6:31. Emma and Noah waited in the school office with me.', tags: ['late_pickup']},
  {ago: 38, at: '21:14', kind: 'message_in', channel: 'sms', category: 'accusation', title: 'Jordan: says I turned the school against her',
    text: 'the office lady gave me a look tn\nik u told them stuff about me\nu ALWAYS make me look like the bad parent', tags: ['tense']},
  {ago: 38, at: '21:20', kind: 'message_out', channel: 'sms', category: 'accusation', title: 'Alex (before Parley): heated reply',
    text: "lmao maybe if u werent ALWAYS late nobody would look at u\nidk what ur talking about, i didnt tell anyone anything. u did that urself\nthe kids sat there for half an hour. AGAIN."},
  {ago: 36, at: '09:02', kind: 'expense', channel: 'other', category: 'money', title: 'Emma — fall soccer sign-up', cents: 24000,
    text: "Paid $240 for Emma's fall soccer (Riverside Youth Soccer). Receipt saved. Our parenting plan splits activities 50/50."},
  {ago: 35, at: '19:40', kind: 'message_out', channel: 'sms', category: 'money', title: 'Alex: soccer was $240, half is $120',
    text: "Emma's fall soccer was $240, receipt attached. Your half is $120. Could you send it by the 30th?"},
  {ago: 35, at: '22:03', kind: 'message_in', channel: 'sms', category: 'money', title: "Jordan: won't pay half of soccer", key: 'soccer',
    text: "im not paying half of soccer\nu signed her up without even asking me. typical\nu never think about anyone but urself\nwant her in every activity under the sun? then u pay for it lol", tags: ['tense']},
  {ago: 33, at: '17:46', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 46 minutes',
    text: 'Dinner handoff, set for 5:00 pm at my apartment. Jordan got there at 5:46 and did not text beforehand. Noah asked twice if Mom was coming.', tags: ['late_pickup']},
  {ago: 31, at: '12:15', kind: 'note', channel: 'phone', category: 'school', title: "Call with Emma's teacher (Ms. Rivera)",
    text: "Ms. Rivera said Emma is doing well in reading but is a bit tired on Mondays. She suggested the same bedtime in both homes. I said I'd pass it on to Jordan."},
  {ago: 31, at: '12:40', kind: 'message_out', channel: 'sms', category: 'school', title: 'Alex: passed on the teacher\'s feedback',
    text: "Ms. Rivera called. Emma's doing well in reading, just a bit tired on Mondays. She suggested the same bedtime at both houses. I do 8:30 for Noah and 9 for Emma. Happy to match yours."},
  {ago: 31, at: '20:55', kind: 'message_in', channel: 'sms', category: 'school', title: 'Jordan: "don\'t tell me how to run my house"',
    text: 'dont tell me how to run my house\nshes tired bc u let her stay up on ur wknds 🙄', tags: ['tense']},
  {ago: 28, at: '17:22', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 22 minutes',
    text: 'Handoff, 5:00 pm at Lincoln Elementary. Jordan got there at 5:22.', tags: ['late_pickup']},
  {ago: 27, at: '10:10', kind: 'expense', channel: 'other', category: 'health', title: 'Noah — dentist co-pay', cents: 18000,
    text: 'Paid the $180 co-pay at Bright Smiles Pediatric Dentistry (cleaning and one filling). Receipt saved.'},
  {ago: 27, at: '10:20', kind: 'message_out', channel: 'sms', category: 'health', title: 'Alex: dentist was $180, half is $90',
    text: "Noah's dentist visit on the 3rd was $180, receipt attached. Your half is $90. Could you send it by the 17th?"},
  {ago: 26, at: '23:41', kind: 'message_in', channel: 'sms', category: 'money', title: 'Jordan: "I\'m not a bank"',
    text: 'every week its another bill from u\nim not a bank\nmaybe stop taking him to the most expensive dentist in town smh', tags: ['tense']},
  {ago: 24, at: '18:00', kind: 'incident', channel: 'in_person', category: 'other', title: 'Comment in front of the kids at handoff',
    text: 'At the 6:00 pm handoff, in front of Emma and Noah, Jordan said: "Ask your dad why we can\'t afford soccer." Emma looked at the ground and got in the car. I didn\'t respond.', tags: ['in_front_of_kids']},
  {ago: 21, at: '17:38', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 38 minutes',
    text: 'Handoff, 5:00 pm. Jordan got there at 5:38. She texted "omw" at 5:30.', tags: ['late_pickup']},
  {ago: 19, at: '20:12', kind: 'message_in', channel: 'sms', category: 'new_partner', title: 'Jordan: upset Sam came to soccer',
    text: "emma says ur 'friend' sam came to her game??\ni dont want a stranger at my daughters games\nwho else have u introduced them to. like wyd", tags: ['tense']},
  {ago: 19, at: '20:40', kind: 'message_out', channel: 'sms', category: 'new_partner', title: 'Alex: short reply about the game',
    text: "Sam came to one game and sat with me. I'll keep doing all the pickups and drop-offs myself."},
  {ago: 17, at: '09:30', kind: 'note', channel: 'other', category: 'money', title: 'Soccer and dentist halves still unpaid',
    text: 'Still no payment for the $120 soccer half or the $90 dentist half. I asked for both by text and sent the receipts.'},
  {ago: 14, at: '17:27', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 27 minutes',
    text: 'Handoff, 5:00 pm at Lincoln Elementary. Jordan got there at 5:27.', tags: ['late_pickup']},
  {ago: 12, at: '08:05', kind: 'message_in', channel: 'sms', category: 'health', title: 'Jordan: says Noah came back with a fever', key: 'fever',
    text: "u sent noah back w/ a fever and didnt even tell me??\nwhat kinda parent does that\ni had to leave work\nthis is going in my notes for the GAL", tags: ['tense']},
  {ago: 12, at: '08:40', kind: 'message_out', channel: 'sms', category: 'health', title: 'Alex: his temperature and the time',
    text: "He was 98.8 when I checked at 7:10 and he ate breakfast. Thanks for picking him up. I can take him to the pediatrician tomorrow if he's still warm."},
  {ago: 9, at: '17:52', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 52 minutes',
    text: 'Handoff, 5:00 pm. Jordan got there at 5:52 and did not text. The kids had dinner with me while we waited.', tags: ['late_pickup']},
  {ago: 7, at: '19:15', kind: 'message_in', channel: 'sms', category: 'schedule', title: 'Jordan: wants Thanksgiving weekend', key: 'swap',
    text: "taking the kids to my sisters for thanksgiving wknd\nik its technically ur yr\ndont make this a thing or ill tell them ur the reason they cant see their cousins", tags: ['tense']},
  {ago: 5, at: '17:00', kind: 'incident', channel: 'other', category: 'schedule', title: 'No-show at handoff',
    text: "Handoff, 5:00 pm at Lincoln Elementary. Jordan didn't come and didn't text. I kept the kids and texted her at 5:45.", tags: ['no_show']},
  {ago: 5, at: '17:45', kind: 'message_out', channel: 'sms', category: 'schedule', title: 'Alex: the kids are with me tonight',
    text: "The kids are with me tonight. Next exchange is the usual 6:00 unless you want a different time."},
  {ago: 4, at: '22:30', kind: 'message_in', channel: 'sms', category: 'accusation', title: 'Jordan: threat to tell the kids', key: 'threat',
    text: "u think ur so perfect w/ ur little texts lol\nkeep it up and ill tell emma and noah exactly why their dad left\nlets see how bad they want to come to ur place then", tags: ['tense', 'threat']},
  {ago: 4, at: '22:35', kind: 'incident', channel: 'sms', category: 'accusation', title: 'Threat to pull the kids in',
    text: 'At 10:30 pm Jordan texted that she would tell Emma and Noah "exactly why their dad left." I didn\'t reply that night.', tags: ['threat']},
  {ago: 2, at: '18:19', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 19 minutes',
    text: 'Handoff, 6:00 pm at my apartment. Jordan got there at 6:19.', tags: ['late_pickup']},
  {ago: 2, at: '19:20', kind: 'expense', channel: 'other', category: 'school', title: 'Emma — field trip and art supplies', cents: 4600,
    text: 'Paid $46: the science museum field trip ($20) and the art supply list ($26). Receipts saved.'},
  {ago: 1, at: '20:48', kind: 'message_in', channel: 'sms', category: 'school', title: 'Jordan: parent-teacher conference Thursday',
    text: "conference is thurs 4:15\nim going ofc\nu can come if u want but dont start anything in front of ms rivera"},
  {ago: 1, at: '21:05', kind: 'message_out', channel: 'sms', category: 'school', title: 'Alex: will be there Thursday at 4:15',
    text: "Thanks for letting me know. I'll be there Thursday at 4:15."},
];

/** The three messages the real coach reads when the case opens; one carries Alex's own (risky) first draft. */
const COACHED: {key: string; draft?: string; ago: number}[] = [
  {key: 'soccer', ago: 34, draft: "wow. u literally agreed to soccer in june. u never pay for anything and im done covering for u. pay the 120 or ill see u in court"},
  {key: 'threat', ago: 3},
  {key: 'swap', ago: 1},
];

/* Ten days of plan practice. Every first attempt shows the old habit; the retry shows the lesson landing. */
type SeedTry = {draft: string; score: number; lens: LensFlag[]; better: string};
const DRILLS: Record<number, SeedTry[]> = {
  1: [
    {draft: "Of course I'm taking them, I've never once cancelled last minute, that was you in August. I'll be there at 5 like always.", score: 41,
      lens: [{phrase: "I've never once cancelled last minute", severity: 'medium', issue: 'Absolute claim', why: '"Never" is easy to disprove and pulls in old history.', fix: 'Drop it.'},
        {phrase: 'that was you in August', severity: 'high', issue: 'Counter-accusation', why: 'Reads as score-keeping, not co-parenting.', fix: 'Leave the past out.'}],
      better: "Yes, I'll pick them up Friday at 5:00 at school."},
    {draft: "Yes, I'll pick them up Friday at 5:00 at school.", score: 88, lens: [{phrase: "I'll pick them up Friday at 5:00", severity: 'good', issue: 'Clear and dated', why: 'Answers the question with a time and place.'}],
      better: "Yes, I'll pick them up Friday at 5:00 at school."},
  ],
  2: [
    {draft: "I wasn't late because I wanted to be, there was an accident on 95. And the kids weren't crying. 5:00 is fine.", score: 52,
      lens: [{phrase: 'And the kids weren\'t crying', severity: 'medium', issue: 'Arguing the details', why: 'Disputing their account invites another round.', fix: 'Skip it.'}],
      better: "Confirmed: 5:00 this Sunday."},
    {draft: "Confirmed: I'll be there at 5:00 this Sunday.", score: 86, lens: [], better: "Confirmed: I'll be there at 5:00 this Sunday."},
  ],
  3: [{draft: "The exchange has been at the library on Main since September. I'll be there Friday at 5:00 as usual.", score: 79,
    lens: [{phrase: 'since September', severity: 'good', issue: 'Specific', why: 'Points to an established arrangement with a date.'}],
    better: "The exchange has been at the Main St. library since September. I'll be there Friday at 5:00."}],
  4: [
    {draft: "Great, glad you finally decided to share them!! Sunday works I guess.", score: 47,
      lens: [{phrase: 'glad you finally decided to share them!!', severity: 'high', issue: 'Sarcasm', why: 'Sarcasm reads as hostility when printed.', fix: 'Thanks for letting me know.'}],
      better: "Thanks for letting me know. I'll pick them up Sunday at 10."},
    {draft: "Thanks for letting me know. I'll pick them up Sunday at 10 from your place.", score: 84, lens: [], better: "Thanks for letting me know. I'll pick them up Sunday at 10."},
  ],
  5: [{draft: "Thanks for the swap. I'll take them Saturday the 18th from 10 to 6 and you'll have them the following weekend.", score: 80, lens: [],
    better: "Thanks. I'll have them Saturday the 18th, 10 to 6; you'll have them the 25th."}],
  7: [
    {draft: "That's not your decision. It's my year and if you take them I'll file a motion.", score: 58,
      lens: [{phrase: "I'll file a motion", severity: 'high', issue: 'Reads as a threat', why: 'Judges weigh which parent keeps conflict low.', fix: 'State the schedule and your plan.'}],
      better: "The parenting plan has Thanksgiving with me this year. I'll pick the kids up Wednesday at 5."},
    {draft: "Our parenting plan has Thanksgiving with me this year. I'll pick them up Wednesday the 26th at 5:00. If you'd like to trade for Christmas Eve, I'm open to talking about it.", score: 90,
      lens: [{phrase: 'Our parenting plan has Thanksgiving with me this year', severity: 'good', issue: 'Plan as referee', why: 'Neutral, verifiable, not personal.'}], better: ''},
  ],
  8: [{draft: "Pickup is at 5:00 Friday. I'll text when I'm 10 minutes away.", score: 85, lens: [], better: "Pickup is at 5:00 Friday. I'll text when I'm 10 minutes away."}],
  9: [{draft: "Okay. Back Sunday at 6.", score: 89, lens: [], better: "Okay. Back Sunday at 6."}],
  10: [
    {draft: "I wasn't late and I'll bring the car seat. Halloween — I'd like them 4 to 8.", score: 68,
      lens: [{phrase: "I wasn't late", severity: 'medium', issue: 'Defending', why: 'Answers a point you could leave alone.', fix: 'Skip it.'}],
      better: "For Halloween, I'd like to have them from 4 to 8. Does that work?"},
    {draft: "For Halloween, I'd like to have them from 4:00 to 8:00 and drop them back at your place. Does that work?", score: 87, lens: [], better: ''},
  ],
  11: [{draft: "Received. Pickup is still 5:00.", score: 91, lens: [{phrase: 'Received.', severity: 'good', issue: 'Brief acknowledgement', why: 'Nothing to argue with.'}], better: 'Received. Pickup is still 5:00.'}],
};

export async function seedDemo(p: PersonRow): Promise<{entries: number; analyses: number; analysisErrors: number}> {
  const now = Date.now();
  const start = now - 11 * DAY - 3 * HOUR;
  db.prepare("UPDATE people SET name = 'Alex', quiz_json = ?, plan_tier = '4w', plan_started = ?, plan_until = ?, time_offset_days = 0 WHERE id = ?")
    .run(JSON.stringify(DEMO_QUIZ), new Date(start).toISOString(), new Date(start + 28 * DAY).toISOString(), p.id);

  const ids = new Map<string, Entry>();
  for (const e of ENTRIES) {
    const entry = addEntry(p.id, {
      kind: e.kind, occurredAt: new Date(when(now, e.ago, e.at)).toISOString(), channel: e.channel, title: e.title, text: e.text,
      category: e.category, tags: e.tags ?? [], amountCents: e.cents, source: 'demo',
    });
    if (e.key) ids.set(e.key, entry);
  }

  // The real coach, run on three of the case's real messages. If the model is down, the case still opens without them.
  let analysisErrors = 0;
  const results = await Promise.allSettled(COACHED.map(async (c) => {
    const msg = ids.get(c.key)!;
    // The burst goes in as its bubbles (shared Analysis.bubbles), joined by blank lines for `incoming`.
    const bubbles = msg.text.split('\n').map((b) => b.trim()).filter(Boolean);
    const input: AnalyzeInput & {bubbles?: string[]} = {incoming: bubbles.join('\n\n'), bubbles, draft: c.draft,
      context: 'Co-parents Alex (the user) and Jordan; kids Emma (8) and Noah (5); active custody case, a GAL is appointed.'};
    const a = await analyzeMessage(input);
    const at = new Date(Math.min(now - 30 * 60_000, new Date(msg.occurredAt).getTime() + 25 * 60_000));
    const full: Analysis = {...a, bubbles: a.bubbles ?? bubbles, id: newId('a_'), createdAt: at.toISOString(), demo: true};
    db.prepare('INSERT INTO analyses (id, person_id, created_at, json) VALUES (?, ?, ?, ?)').run(full.id, p.id, full.createdAt, JSON.stringify(full));
    db.prepare('UPDATE entries SET analysis_id = ? WHERE id = ?').run(full.id, msg.id);
    // The soccer reply was sent from the coach's neutral version; the threat got no reply (it went in the journal).
    if (c.key === 'soccer') {
      addEntry(p.id, {kind: 'message_out', occurredAt: new Date(at.getTime() + 5 * 60_000).toISOString(), channel: 'sms', category: 'money',
        title: 'Alex: soccer reply (written with the coach)', text: full.variants.neutral.text, tags: [], analysisId: full.id, source: 'demo'});
    }
    return full;
  }));
  for (const r of results) if (r.status === 'rejected') { analysisErrors++; console.error('[demo] analyze failed', r.reason); }

  for (const [dayStr, tries] of Object.entries(DRILLS)) {
    const day = Number(dayStr);
    const {message, trigger} = drillFor(day, 'schedule');
    tries.forEach((t, i) => {
      const at = new Date(start + (day - 1) * DAY + (13 + i * 0.2) * HOUR).toISOString();
      const row = {id: newId('d_'), day, attempt: i + 1, at, draft: t.draft, score: t.score, lens: t.lens, better: t.better, trigger, message, demo: true};
      db.prepare('INSERT INTO drills (id, person_id, day, created_at, json) VALUES (?, ?, ?, ?, ?)').run(row.id, p.id, day, at, JSON.stringify(row));
    });
  }

  // Choice sessions on the days the case practised (day 6 was missed), getting steadier; today's is the jury's to do.
  const SESSIONS: Record<number, number> = {1: 2, 2: 3, 3: 3, 4: 3, 5: 4, 7: 3, 8: 4, 9: 4, 10: 5, 11: 4};
  for (const [d, n] of Object.entries(SESSIONS)) {
    const day = Number(d);
    seedSession(p.id, day, new Date(start + (day - 1) * DAY + 12.5 * HOUR).toISOString(), n);
  }

  // Each practised day left a "try it today" task. Alex tried five of them for real; yesterday's is still open, so
  // today's lesson opens by asking about it.
  const TRIED = new Set([2, 3, 5, 9, 10]);
  for (const d of Object.keys(SESSIONS).map(Number)) {
    const at = new Date(start + (d - 1) * DAY + 12.6 * HOUR).toISOString();
    const tried = d === 11 ? null : TRIED.has(d) ? 1 : 0;
    db.prepare('INSERT INTO course_tasks (id, person_id, ref, created_at, task, did, topic, tried, answered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(newId('t_'), p.id, `day:${d}`, at, COURSE[d - 1].try, DID[d - 1], 'schedule', tried, tried === null ? null : new Date(start + d * DAY + 9 * HOUR).toISOString());
  }

  const entries = (db.prepare('SELECT COUNT(*) n FROM entries WHERE person_id = ?').get(p.id) as {n: number}).n;
  return {entries, analyses: results.length - analysisErrors, analysisErrors};
}

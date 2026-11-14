/* The jury's sample case: Alex and Jordan, two homes, Emma (8) and Noah (5), an active custody case with a GAL.
   Six weeks of a believable record — late handoffs, a soccer-fee dispute, a threat to "tell the kids", a fever
   accusation — seeded as DATA (source 'demo'). The coach analyses in it are not canned: three of the real messages
   go through the real analyzeMessage when the case is opened. The plan started 11 days ago, with ten days of drill
   history that climbs from a shaky first attempt, so today's drill (day 12) is the jury's to do. */
import {db, type PersonRow} from './db.js';
import {addEntry} from './journal-store.js';
import {analyzeMessage} from './prompts/reply.js';
import {drillFor} from './plan-content.js';
import {seedSession} from './routes/plan.js';
import type {Analysis, Category, Channel, Entry, EntryKind, LensFlag} from '../shared/types.js';
import {newId} from './db.js';

const DAY = 86_400_000;
const HOUR = 3_600_000;
// Times are written in US Eastern (the case is in the US); stored as UTC.
const ET = 5 * HOUR;

export const DEMO_QUIZ = {
  kids: '2', ages: ['5to9'], channels: ['sms'], tension: 'weekly', triggers: ['schedule', 'money', 'messenger'],
  reaction: ['long', 'fast'], court: 'active', support: 'gal', time: '3to6', goal: 'record', name: 'Alex',
};

type Seed = {ago: number; at: string; kind: EntryKind; channel: Channel; category: Category; title: string; text: string; tags?: string[]; cents?: number; key?: string};

/** Midnight-ish anchor so "3 days ago at 17:40 ET" lands on a sensible wall-clock time. */
function when(now: number, ago: number, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(now - ago * DAY);
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.min(now - 10 * 60_000, base + (h * 60 + m) * 60_000 + ET);
}

const ENTRIES: Seed[] = [
  {ago: 41, at: '17:05', kind: 'message_in', channel: 'sms', category: 'schedule', title: 'Jordan: pickup moved to 6, "deal with it"',
    text: "I'm not getting off work until 6. Pickup is 6 today, deal with it.", tags: ['tense']},
  {ago: 41, at: '17:12', kind: 'message_out', channel: 'sms', category: 'schedule', title: 'Alex: okay, 6:00 at the school',
    text: "Okay. I'll be at the school at 6:00."},
  {ago: 39, at: '18:31', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 31 minutes',
    text: 'Scheduled handoff 6:00 pm at Lincoln Elementary (moved from 5:00 by Jordan). Jordan arrived 6:31 pm. Emma and Noah waited in the office with me.', tags: ['late_pickup']},
  {ago: 38, at: '21:14', kind: 'message_in', channel: 'sms', category: 'accusation', title: 'Jordan: "you turned the school against me"',
    text: "The office lady gave me a look tonight. I know you told them stuff about me. You always make me look like the bad parent.", tags: ['tense']},
  {ago: 38, at: '21:20', kind: 'message_out', channel: 'sms', category: 'accusation', title: 'Alex (before Parley): long heated reply',
    text: "Maybe if you weren't ALWAYS late nobody would look at you. I didn't tell anyone anything, you did that yourself. The kids sat there for half an hour. Again."},
  {ago: 36, at: '09:02', kind: 'expense', channel: 'other', category: 'money', title: 'Emma — fall soccer registration', cents: 24000,
    text: 'Paid $240 for Emma\'s fall soccer league (Riverside Youth Soccer). Receipt saved. Parenting plan: extracurriculars split 50/50.'},
  {ago: 35, at: '19:40', kind: 'message_out', channel: 'sms', category: 'money', title: 'Alex: soccer $240, half is $120',
    text: "Emma's fall soccer was $240 (receipt attached). Your half is $120. Could you send it by the 30th?"},
  {ago: 35, at: '22:03', kind: 'message_in', channel: 'sms', category: 'money', title: "Jordan: won't pay half of soccer", key: 'soccer',
    text: "I'm not paying half of soccer. You signed her up without asking me. Typical. You never think about anyone but yourself. If you want her in every activity under the sun, you pay for it.", tags: ['tense']},
  {ago: 33, at: '17:46', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 46 minutes',
    text: 'Wednesday dinner handoff, scheduled 5:00 pm at my apartment. Jordan arrived 5:46 pm, no message beforehand. Noah asked twice if Mom was coming.', tags: ['late_pickup']},
  {ago: 31, at: '12:15', kind: 'note', channel: 'phone', category: 'school', title: 'Call with Emma\'s teacher (Ms. Rivera)',
    text: 'Ms. Rivera said Emma is doing well in reading, a bit tired on Mondays. Suggested a consistent bedtime in both homes. I said I would share this with Jordan.'},
  {ago: 31, at: '12:40', kind: 'message_out', channel: 'sms', category: 'school', title: 'Alex: shared teacher feedback',
    text: "Ms. Rivera called: Emma is doing well in reading and a bit tired on Mondays. She suggested the same bedtime in both homes. I do 8:30 for Noah, 9:00 for Emma — happy to match yours."},
  {ago: 31, at: '20:55', kind: 'message_in', channel: 'sms', category: 'school', title: 'Jordan: "don\'t tell me how to parent"',
    text: "Don't tell me how to run my house. She's tired because you let her stay up on your weekends.", tags: ['tense']},
  {ago: 28, at: '17:22', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 22 minutes',
    text: 'Friday handoff 5:00 pm at Lincoln Elementary. Jordan arrived 5:22 pm.', tags: ['late_pickup']},
  {ago: 27, at: '10:10', kind: 'expense', channel: 'other', category: 'health', title: 'Noah — dentist co-pay', cents: 18000,
    text: 'Paid $180 co-pay at Bright Smiles Pediatric Dentistry (cleaning + one filling). Receipt saved.'},
  {ago: 27, at: '10:20', kind: 'message_out', channel: 'sms', category: 'health', title: 'Alex: dentist co-pay, half is $90',
    text: "Noah's dentist visit on the 3rd was $180 (receipt attached). Your half is $90. Could you send it by the 17th?"},
  {ago: 26, at: '23:41', kind: 'message_in', channel: 'sms', category: 'money', title: 'Jordan: "I\'m not a bank"',
    text: "Every week it's another bill from you. I'm not a bank. Maybe stop taking him to the most expensive dentist in town.", tags: ['tense']},
  {ago: 24, at: '18:00', kind: 'incident', channel: 'in_person', category: 'other', title: 'Comment in front of the kids at handoff',
    text: 'At the 6:00 pm handoff Jordan said, in front of Emma and Noah, "Ask your dad why we can\'t afford soccer." Emma looked at the ground and got in the car. I did not respond.', tags: ['in_front_of_kids']},
  {ago: 21, at: '17:38', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 38 minutes',
    text: 'Wednesday handoff 5:00 pm. Jordan arrived 5:38 pm. Texted at 5:30 "on my way".', tags: ['late_pickup']},
  {ago: 19, at: '20:12', kind: 'message_in', channel: 'sms', category: 'new_partner', title: 'Jordan: objects to Sam at soccer',
    text: "Emma says your 'friend' Sam came to her game. I don't want a stranger at my daughter's games. Who else have you introduced them to?", tags: ['tense']},
  {ago: 19, at: '20:40', kind: 'message_out', channel: 'sms', category: 'new_partner', title: 'Alex: brief reply about the game',
    text: "Sam came to watch one game and sat with me. I'll keep handling all pickups and drop-offs myself."},
  {ago: 17, at: '09:30', kind: 'note', channel: 'other', category: 'money', title: 'Soccer reimbursement still unpaid',
    text: 'No payment yet for the $120 soccer half or the $90 dentist half. Both were requested by text with receipts.'},
  {ago: 14, at: '17:27', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 27 minutes',
    text: 'Friday handoff 5:00 pm at Lincoln Elementary. Jordan arrived 5:27 pm.', tags: ['late_pickup']},
  {ago: 12, at: '08:05', kind: 'message_in', channel: 'sms', category: 'health', title: 'Jordan: fever accusation', key: 'fever',
    text: "You sent Noah back with a fever and didn't even tell me. What kind of parent does that? I had to leave work. This is going in my notes for the GAL.", tags: ['tense']},
  {ago: 12, at: '08:40', kind: 'message_out', channel: 'sms', category: 'health', title: 'Alex: temperature and times',
    text: "His temperature was 98.8 when I checked at 7:10 this morning and he ate breakfast. Thanks for picking him up. I'll keep a thermometer in his backpack and can take him to the pediatrician tomorrow if he still has a fever."},
  {ago: 9, at: '17:52', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 52 minutes',
    text: 'Wednesday handoff 5:00 pm. Jordan arrived 5:52 pm. No message. Kids had dinner with me while waiting.', tags: ['late_pickup']},
  {ago: 7, at: '19:15', kind: 'message_in', channel: 'sms', category: 'schedule', title: 'Jordan: wants to swap Thanksgiving weekend', key: 'swap',
    text: "I'm taking the kids to my sister's for Thanksgiving weekend. I know it's technically your year. Don't make this a thing or I'll tell them you're the reason they can't see their cousins.", tags: ['tense']},
  {ago: 5, at: '17:00', kind: 'incident', channel: 'other', category: 'schedule', title: 'No-show at Friday handoff',
    text: 'Scheduled Friday handoff 5:00 pm at Lincoln Elementary. Jordan did not come and did not message. I kept the kids and texted at 5:45.', tags: ['no_show']},
  {ago: 5, at: '17:45', kind: 'message_out', channel: 'sms', category: 'schedule', title: 'Alex: kids are with me tonight',
    text: "The kids are with me tonight. Next exchange is Sunday at 6:00 unless you'd like to set another time."},
  {ago: 4, at: '22:30', kind: 'message_in', channel: 'sms', category: 'accusation', title: 'Jordan: threat to tell the kids', key: 'threat',
    text: "You think you're so perfect with your little texts. Keep it up and I'll tell Emma and Noah exactly why their dad left. Let's see how much they want to come to your place then.", tags: ['tense', 'threat']},
  {ago: 4, at: '22:35', kind: 'incident', channel: 'sms', category: 'accusation', title: 'Threat to involve the children',
    text: 'Jordan texted at 10:30 pm threatening to tell Emma and Noah "exactly why their dad left". No reply sent that night.', tags: ['threat']},
  {ago: 2, at: '17:19', kind: 'incident', channel: 'in_person', category: 'schedule', title: 'Late pickup — 19 minutes',
    text: 'Sunday handoff 6:00 pm at my apartment. Jordan arrived 6:19 pm.', tags: ['late_pickup']},
  {ago: 2, at: '19:20', kind: 'expense', channel: 'other', category: 'school', title: 'Emma — field trip & art supplies', cents: 4600,
    text: 'Paid $46: science-museum field trip ($20) and art supplies list ($26). Receipts saved.'},
  {ago: 1, at: '20:48', kind: 'message_in', channel: 'sms', category: 'school', title: 'Jordan: parent-teacher conference',
    text: "Conference is Thursday at 4:15. I'm going. You can come if you want, but don't start anything in front of Ms. Rivera."},
  {ago: 1, at: '21:05', kind: 'message_out', channel: 'sms', category: 'school', title: 'Alex: will attend Thursday 4:15',
    text: "Thanks for letting me know. I'll be there Thursday at 4:15."},
];

/** The three messages the real coach reads when the case opens; one carries Alex's own (risky) first draft. */
const COACHED: {key: string; draft?: string; ago: number}[] = [
  {key: 'soccer', ago: 34, draft: "Wow. You literally agreed to soccer in June. You never pay for anything and I'm done covering for you. Pay the $120 or I'll see you in court."},
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
    const a = await analyzeMessage({incoming: msg.text, draft: c.draft, context: 'Co-parents Alex (the user) and Jordan; kids Emma (8) and Noah (5); active custody case, a GAL is appointed.'});
    const at = new Date(Math.min(now - 30 * 60_000, new Date(msg.occurredAt).getTime() + 25 * 60_000));
    const full: Analysis = {...a, id: newId('a_'), createdAt: at.toISOString(), demo: true};
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

  const entries = (db.prepare('SELECT COUNT(*) n FROM entries WHERE person_id = ?').get(p.id) as {n: number}).n;
  return {entries, analyses: results.length - analysisErrors, analysisErrors};
}

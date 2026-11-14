/* The private record: every message, incident, note and expense a person keeps, in one table (`entries`).
   Other modules write through addEntry (the coach logs both sides of an exchange, the demo seeds a case)
   and read through listEntries / findPatterns (the timeline and its PDF). Patterns are counted here, in code —
   the model never decides what the record "shows". */
import type {Category, Channel, Entry, EntryKind, Pattern} from '../shared/types.js';
import {db, newId, nowIso} from './db.js';
import {looksTense} from './import/classify.js';

type Row = {
  id: string; person_id: string; kind: string; occurred_at: string; channel: string; title: string; text: string;
  category: string; tags: string; amount_cents: number | null; analysis_id: string | null; source: string; created_at: string;
};

const KINDS: EntryKind[] = ['message_in', 'message_out', 'incident', 'note', 'expense'];
const CATEGORIES: Category[] = ['schedule', 'money', 'health', 'school', 'new_partner', 'accusation', 'logistics', 'other'];
const CHANNELS: Channel[] = ['sms', 'whatsapp', 'email', 'ofw', 'talkingparents', 'in_person', 'phone', 'other'];

export const isKind = (v: unknown): v is EntryKind => KINDS.includes(v as EntryKind);
export const isCategory = (v: unknown): v is Category => CATEGORIES.includes(v as Category);
export const isChannel = (v: unknown): v is Channel => CHANNELS.includes(v as Channel);

function toEntry(r: Row): Entry {
  let tags: string[] = [];
  try { tags = JSON.parse(r.tags) as string[]; } catch { /* a bad row keeps no tags rather than breaking the list */ }
  return {
    id: r.id, kind: r.kind as EntryKind, occurredAt: r.occurred_at, channel: r.channel as Channel,
    title: r.title, text: r.text, category: r.category as Category, tags,
    amountCents: r.amount_cents ?? undefined, analysisId: r.analysis_id ?? undefined,
    source: r.source as Entry['source'], createdAt: r.created_at,
  };
}

/** Untitled entries get the first line of their text, cut at a word, so the list never shows a blank row. */
export function titleFrom(text: string, max = 70): string {
  const line = text.trim().split(/\n/)[0].replace(/\s+/g, ' ');
  if (line.length <= max) return line || 'Untitled';
  const cut = line.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).replace(/[,.;:\s]+$/, '') + '…';
}

export function addEntry(personId: string, e: Omit<Entry, 'id' | 'createdAt'>): Entry {
  const id = newId('e_');
  const createdAt = nowIso();
  const occurred = new Date(e.occurredAt);
  db.prepare(`INSERT INTO entries (id, person_id, kind, occurred_at, channel, title, text, category, tags, amount_cents, analysis_id, source, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, personId,
    isKind(e.kind) ? e.kind : 'note',
    isNaN(occurred.getTime()) ? createdAt : occurred.toISOString(),
    isChannel(e.channel) ? e.channel : 'other',
    (e.title || titleFrom(e.text || '')).slice(0, 200),
    e.text ?? '',
    isCategory(e.category) ? e.category : 'other',
    JSON.stringify(e.tags ?? []),
    e.amountCents ?? null, e.analysisId ?? null, e.source ?? 'manual', createdAt,
  );
  return getEntry(personId, id)!;
}

export function getEntry(personId: string, id: string): Entry | undefined {
  const r = db.prepare('SELECT * FROM entries WHERE person_id = ? AND id = ?').get(personId, id) as Row | undefined;
  return r ? toEntry(r) : undefined;
}

/** Chronological (oldest first). `from`/`to` are ISO dates or datetimes; a bare `to` date includes that whole day. */
export function listEntries(personId: string, opts: {from?: string; to?: string; kinds?: EntryKind[]; category?: Category} = {}): Entry[] {
  const where = ['person_id = ?'];
  const args: (string | number)[] = [personId];
  if (opts.from) { where.push('occurred_at >= ?'); args.push(new Date(opts.from).toISOString()); }
  if (opts.to) {
    const to = /^\d{4}-\d{2}-\d{2}$/.test(opts.to) ? new Date(new Date(opts.to).getTime() + 86_400_000) : new Date(opts.to);
    where.push('occurred_at < ?'); args.push(to.toISOString());
  }
  const kinds = (opts.kinds ?? []).filter(isKind);
  if (kinds.length) { where.push(`kind IN (${kinds.map(() => '?').join(',')})`); args.push(...kinds); }
  if (opts.category && isCategory(opts.category)) { where.push('category = ?'); args.push(opts.category); }
  const rows = db.prepare(`SELECT * FROM entries WHERE ${where.join(' AND ')} ORDER BY occurred_at ASC, created_at ASC`).all(...args) as Row[];
  return rows.map(toEntry);
}

export function updateEntry(personId: string, id: string, patch: Partial<Omit<Entry, 'id' | 'createdAt' | 'source'>>): Entry | undefined {
  const cur = getEntry(personId, id);
  if (!cur) return undefined;
  const next = {...cur, ...patch};
  const occurred = new Date(next.occurredAt);
  db.prepare(`UPDATE entries SET kind = ?, occurred_at = ?, channel = ?, title = ?, text = ?, category = ?, tags = ?, amount_cents = ?
              WHERE person_id = ? AND id = ?`).run(
    isKind(next.kind) ? next.kind : cur.kind,
    isNaN(occurred.getTime()) ? cur.occurredAt : occurred.toISOString(),
    isChannel(next.channel) ? next.channel : cur.channel,
    (next.title || titleFrom(next.text)).slice(0, 200),
    next.text ?? '',
    isCategory(next.category) ? next.category : cur.category,
    JSON.stringify(Array.isArray(next.tags) ? next.tags : cur.tags),
    next.amountCents ?? null, personId, id,
  );
  return getEntry(personId, id);
}

export function deleteEntry(personId: string, id: string): boolean {
  return db.prepare('DELETE FROM entries WHERE person_id = ? AND id = ?').run(personId, id).changes > 0;
}

/* ---------- patterns, counted in code ---------- */

const LATE = /\blate\b|running behind|\bdelay(ed)?\b|\d+\s*(min|mins|minutes)\s+(late|behind)/i;
const NO_SHOW = /no[- ]show|didn'?t show|did not show|never showed|didn'?t come|did not come|missed (the )?(pickup|pick-up|drop-?off|exchange|visit|handoff)/i;
const HANDOFF = /pick ?up|pick-up|drop ?off|drop-off|exchange|hand ?off|handoff|handover|custody swap/i;
const MISSED_PAY = /missed (a |the )?payment|didn'?t pay|did not pay|hasn'?t paid|has not paid|unpaid|owes?\b|refus\w* to pay|late payment|support (is |was )?late/i;
const IN_FRONT = /in front of (the )?(kids|children|emma|noah|our)|front of the kids|told the (kids|children)|tell the (kids|children)|said to the (kids|children)/i;

const CAT_LABEL: Record<Category, string> = {
  schedule: 'schedule', money: 'money', health: 'health', school: 'school', new_partner: 'a new partner',
  accusation: 'accusations', logistics: 'logistics', other: 'other',
};

const blob = (e: Entry) => `${e.title}\n${e.text}\n${e.tags.join(' ')}`;
export const isTense = (e: Entry) => e.kind === 'message_in' && (e.tags.includes('tense') || looksTense(e.text));
const isHandoff = (e: Entry) => (e.kind === 'incident' || e.kind === 'note') &&
  (e.tags.includes('late_pickup') || e.tags.includes('no_show') || e.tags.includes('handoff') || HANDOFF.test(blob(e)) || LATE.test(blob(e)) || NO_SHOW.test(blob(e)));
const isLate = (e: Entry) => e.tags.includes('late_pickup') || (e.kind === 'incident' && LATE.test(blob(e)) && HANDOFF.test(blob(e)));
const isNoShow = (e: Entry) => e.tags.includes('no_show') || (e.kind === 'incident' && NO_SHOW.test(blob(e)));

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const weekKey = (iso: string) => { const d = new Date(iso); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'});

/** Patterns a person (or a GAL) would want to see, strongest first. Each one cites the entries it counts. */
export function findPatterns(entries: Entry[]): Pattern[] {
  const out: Pattern[] = [];
  const sorted = [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  // Handoffs: of the last 10 handoff-related logs, how many were late / no-shows.
  const handoffs = sorted.filter(isHandoff).slice(-10);
  const late = handoffs.filter(isLate);
  if (late.length >= 2) out.push({
    label: 'Late pickups',
    detail: `${late.length} of the last ${plural(handoffs.length, 'logged handoff')} started late.`,
    count: late.length, entryIds: late.map((e) => e.id),
  });
  const noShows = sorted.filter(isNoShow);
  if (noShows.length >= 1) out.push({
    label: 'Missed handoffs',
    detail: `${plural(noShows.length, 'handoff')} where the other parent did not show, last on ${fmtDay(noShows.at(-1)!.occurredAt.slice(0, 10))}.`,
    count: noShows.length, entryIds: noShows.map((e) => e.id),
  });

  // Most tense topic: category with the most tense incoming messages (or incidents, if there are no messages).
  const tense = sorted.filter(isTense);
  const pool = tense.length >= 2 ? tense : sorted.filter((e) => e.kind === 'incident');
  const byCat = new Map<Category, Entry[]>();
  for (const e of pool) if (e.category !== 'other') byCat.set(e.category, [...(byCat.get(e.category) ?? []), e]);
  const top = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (top && top[1].length >= 2) {
    const share = Math.round((top[1].length / pool.length) * 100);
    out.push({
      label: `Most tense topic: ${CAT_LABEL[top[0]]}`,
      detail: `${top[1].length} of ${plural(pool.length, tense.length >= 2 ? 'tense message' : 'incident')} (${share}%) are about ${CAT_LABEL[top[0]]}.`,
      count: top[1].length, entryIds: top[1].map((e) => e.id),
    });
  }

  // Tense messages per week: the last four calendar weeks that have any messages, and the direction.
  if (tense.length >= 2) {
    const weeks = new Map<string, Entry[]>();
    for (const e of sorted.filter((x) => x.kind === 'message_in')) weeks.set(weekKey(e.occurredAt), weeks.get(weekKey(e.occurredAt)) ?? []);
    for (const e of tense) weeks.get(weekKey(e.occurredAt))!.push(e);
    const last = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-4);
    if (last.length >= 2) {
      const counts = last.map(([, es]) => es.length);
      const dir = counts.at(-1)! > counts[0] ? 'rising' : counts.at(-1)! < counts[0] ? 'falling' : 'steady';
      out.push({
        label: 'Tense messages per week',
        detail: `${counts.join(' → ')} over the weeks of ${last.map(([w]) => fmtDay(w)).join(', ')} — ${dir}.`,
        count: tense.length, entryIds: last.flatMap(([, es]) => es.map((e) => e.id)),
      });
    }
  }

  const front = sorted.filter((e) => e.tags.includes('in_front_of_kids') || (e.kind !== 'message_out' && IN_FRONT.test(blob(e))));
  if (front.length >= 1) out.push({
    label: 'Conflict in front of the children',
    detail: `${plural(front.length, 'time')} the children were present for, or pulled into, the conflict.`,
    count: front.length, entryIds: front.map((e) => e.id),
  });

  const missedPay = sorted.filter((e) => e.tags.includes('missed_payment') || ((e.kind === 'incident' || e.kind === 'expense') && MISSED_PAY.test(blob(e))));
  if (missedPay.length >= 1) {
    const cents = missedPay.reduce((s, e) => s + (e.amountCents ?? 0), 0);
    out.push({
      label: 'Missed payments',
      detail: `${plural(missedPay.length, 'missed or late payment')}${cents ? `, $${(cents / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} in total` : ''}.`,
      count: missedPay.length, entryIds: missedPay.map((e) => e.id),
    });
  }

  const sched = sorted.filter((e) => e.tags.includes('schedule_change') || (e.kind === 'incident' && e.category === 'schedule' && !isHandoff(e)));
  if (sched.length >= 2) out.push({
    label: 'Schedule changes',
    detail: `${plural(sched.length, 'last-minute schedule change')} logged.`,
    count: sched.length, entryIds: sched.map((e) => e.id),
  });

  // Response time: how quickly the person answers after a message comes in (their own habit, a plan skill).
  const gaps: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].kind !== 'message_in') continue;
    const next = sorted.slice(i + 1).find((e) => e.kind === 'message_in' || e.kind === 'message_out');
    if (next?.kind === 'message_out') gaps.push((new Date(next.occurredAt).getTime() - new Date(sorted[i].occurredAt).getTime()) / 60_000);
  }
  if (gaps.length >= 3) {
    const fast = gaps.filter((g) => g < 10).length;
    const med = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    out.push({
      label: 'Your reply time',
      detail: `Median ${med < 60 ? `${Math.round(med)} min` : `${(med / 60).toFixed(1)} h`}; ${fast} of ${gaps.length} replies went out within 10 minutes.`,
      count: gaps.length, entryIds: [],
    });
  }

  return out;
}

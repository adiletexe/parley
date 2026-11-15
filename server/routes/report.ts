/* AI reports over the record: "Summary for my lawyer", "This month in brief", "Patterns & concerns".
   The model only words what the record already says. It gets the entries as compact numbered lines (E-n is the same
   exhibit number the all-time PDF prints) and the patterns counted in code, and our code then drops any bullet that
   cites an exhibit it wasn't given or a number that isn't in the data. One answer is kept per person, kind, range and
   record fingerprint, so pressing the same button twice — or the jury pressing it — costs one model call. */
import type {Hono} from 'hono';
import type {Entry} from '../../shared/types.js';
import {geminiJSON} from '../ai.js';
import {db, nowIso, personNow, track} from '../db.js';
import {findPatterns, listEntries} from '../journal-store.js';
import {CATEGORY_LABEL, CHANNEL_LABEL, fingerprint, localDay, safeTz} from '../pdf.js';

db.exec(`
CREATE TABLE IF NOT EXISTS record_reports (
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, range_key TEXT NOT NULL, entry_count INTEGER NOT NULL, fingerprint TEXT NOT NULL,
  json TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (person_id, kind, range_key)
);`);

type Kind = 'lawyer' | 'month' | 'patterns';
const KINDS: Kind[] = ['lawyer', 'month', 'patterns'];
const MAX_LINES = 150;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export interface Report { title: string; bullets: string[]; caution: string; from: string; to: string; entries: number; cached?: boolean }

const ASK: Record<Kind, string> = {
  lawyer: 'Write a short factual summary a family-law attorney could skim in one minute before a call: what kinds of events the record holds, the main repeated issues, and the most significant dated events. Lead with the most significant facts.',
  month: 'Write a brief recap of this period only: what happened, in rough date order, and what changed compared with the start of the period. Keep it calm and plain.',
  patterns: 'List the repeated patterns the record shows (timing of handoffs, money, tense messages, the children being present or pulled in, schedule changes), each with how often it happened. Note anything that occurs repeatedly and could concern the children, stated only as what the entries say.',
};

const SYSTEM = `You summarize a parent's private co-parenting record (a dated log of messages and events) for that parent.
Rules — follow every one:
- Use ONLY the entries and counted facts you are given. Never invent events, dates, names, amounts or counts. Every number you write must appear in the data.
- Cite the exhibit numbers that support each bullet, in the form (E-12) or (E-3, E-9). Cite only exhibit numbers that appear in the data.
- Neutral, factual, plain everyday US English, the way you'd explain it to a smart friend: short sentences, common words.
  No legalese: never "the respondent", "the minor child", "the parties", "subsequently", "pursuant to", "aforementioned",
  "stated that", "failed to", "proceeded to". Write "Pickup started 40 minutes late (E-4)", not "The other parent failed to
  arrive at the designated exchange time". Don't label tone or character ("heated", "abusive", "manipulative", "narcissist") — quote or describe what was said or done.
- Write about what happened between the parents, not about how entries are written or formatted.
- Refer to people as "the other parent" and "you", or by the names used in the entries. Messages marked IN are from the other parent; OUT are from you.
- Never give legal advice, never predict outcomes, never say what a court or judge will do, never recommend filing anything.
- 3 to 7 bullets, each at most 25 words.
- "title": at most 8 words. "caution": one short plain sentence to the person, e.g. "This sums up your own record and isn't legal advice, so have your attorney check the cited exhibits."`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {type: 'STRING'},
    bullets: {type: 'ARRAY', items: {type: 'STRING'}},
    caution: {type: 'STRING'},
  },
  required: ['title', 'bullets', 'caution'],
};

type ModelOut = {title?: string; bullets?: string[]; caution?: string};
const inflight = new Map<string, Promise<ModelOut>>();

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const money = (c: number) => '$' + (c / 100).toLocaleString('en-US', {minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2});

/** Every number a bullet may use: the ones in the data we sent, written with or without thousands separators. */
function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const raw = m[0].replace(/,$/, '');
    out.add(raw); out.add(raw.replace(/,/g, ''));
    const n = Number(raw.replace(/,/g, ''));
    if (Number.isFinite(n)) { out.add(String(n)); if (Number.isInteger(n)) out.add(n.toFixed(2)); }
  }
  return out;
}

function line(e: Entry, ex: number, tz: string) {
  const when = new Date(e.occurredAt).toLocaleString('en-US', {timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
  const dir = e.kind === 'message_in' ? 'IN' : e.kind === 'message_out' ? 'OUT' : e.kind.toUpperCase();
  const amt = e.amountCents != null ? ` ${money(e.amountCents)}` : '';
  const tags = e.tags.filter((t) => !['imported', 'handoff'].includes(t));
  const text = e.text.replace(/\s*\n\s*/g, ' / ').replace(/\s+/g, ' ');
  return `E-${ex} | ${when} | ${dir} | ${CHANNEL_LABEL[e.channel] ?? e.channel} | ${CATEGORY_LABEL[e.category] ?? e.category}${amt}${tags.length ? ` | tags: ${tags.join(',')}` : ''} | ${clip(e.title, 90)} | ${clip(text, 260)}`;
}

export default function register(app: Hono) {
  app.post('/api/record/report', async (c) => {
    const person = c.get('person');
    const b = await c.req.json().catch(() => ({})) as {kind?: string; from?: string; to?: string; tz?: string};
    const kind = KINDS.find((k) => k === b.kind);
    if (!kind) return c.json({error: 'Choose a report.'}, 400);
    const tz = person.demo ? 'America/New_York' : safeTz(b.tz);
    const now = personNow(person);

    // Exhibit numbers come from the whole record, oldest = E-1, exactly as the Record page and its PDF number them.
    const all = listEntries(person.id);
    const exhibit = new Map(all.map((e, i) => [e.id, i + 1]));
    let from = b.from && YMD.test(b.from) ? b.from : undefined;
    const to = b.to && YMD.test(b.to) ? b.to : undefined;
    if (kind === 'month' && !from) from = localDay(new Date(now.getTime() - 29 * 86_400_000).toISOString(), tz);
    const inRange = all.filter((e) => { const d = localDay(e.occurredAt, tz); return (!from || d >= from) && (!to || d <= to); });
    if (inRange.length < 3) {
      return c.json({error: kind === 'month' ? 'There are fewer than 3 entries in the last 30 days, not enough for a recap yet.' : 'Add a few more entries first. A report needs at least 3.'}, 422);
    }

    const fp = fingerprint(inRange);
    const rangeKey = `${from ?? ''}..${to ?? ''}`;
    const hit = db.prepare('SELECT json, entry_count, fingerprint FROM record_reports WHERE person_id = ? AND kind = ? AND range_key = ?')
      .get(person.id, kind, rangeKey) as {json: string; entry_count: number; fingerprint: string} | undefined;
    if (hit && hit.entry_count === inRange.length && hit.fingerprint === fp) {
      track(person.id, 'record_report', {kind, cached: true});
      return c.json({...(JSON.parse(hit.json) as Report), cached: true});
    }

    const recent = inRange.slice(-MAX_LINES);
    const patterns = findPatterns(inRange).map((p) => {
      const ex = p.entryIds.map((id) => exhibit.get(id)).filter((n): n is number => !!n);
      return `- ${p.label}: ${p.detail}${ex.length ? ` Exhibits: ${ex.map((n) => `E-${n}`).join(', ')}.` : ''}`;
    });
    const count = (k: Entry['kind']) => inRange.filter((e) => e.kind === k).length;
    const expense = inRange.reduce((s, e) => s + (e.kind === 'expense' ? e.amountCents ?? 0 : 0), 0);
    const first = localDay(inRange[0].occurredAt, tz), last = localDay(inRange.at(-1)!.occurredAt, tz);
    const facts = [
      `Period: ${first} to ${last}. Entries: ${inRange.length} (${count('message_in')} messages IN from the other parent, ${count('message_out')} OUT from you, ${count('incident')} incidents, ${count('expense')} expenses, ${count('note')} notes).`,
      expense ? `Expenses logged in total: ${money(expense)}.` : '',
      recent.length < inRange.length ? `Only the most recent ${recent.length} entries are listed below; the counts above cover all ${inRange.length}.` : '',
    ].filter(Boolean).join('\n');
    const data = `COUNTED FACTS (computed in code, exact):\n${facts}\n\nPATTERNS (computed in code, exact):\n${patterns.join('\n') || '- none'}\n\nENTRIES (exhibit | when | direction/kind | channel | topic | title | text):\n${recent.map((e) => line(e, exhibit.get(e.id)!, tz)).join('\n')}`;

    // Two presses (or React's dev double-effect) while the first is still being written share that one call.
    const flightKey = `${person.id}|${kind}|${rangeKey}|${fp}`;
    let call = inflight.get(flightKey);
    const shared = !!call;
    if (!call) {
      call = geminiJSON<ModelOut>({system: SYSTEM, prompt: `${ASK[kind]}\n\n${data}`, schema: SCHEMA, temperature: 0.2, timeoutMs: 60_000})
        .finally(() => inflight.delete(flightKey));
      inflight.set(flightKey, call);
    }
    let out: ModelOut;
    try {
      out = await call;
    } catch (e) {
      const st = (e as {status?: number}).status;
      console.error('[report]', kind, (e as Error).message.slice(0, 200));
      return c.json({error: st === 429 ? (e as Error).message : 'We couldn’t write the report right now. Please try again.'}, st === 429 ? 429 : 502);
    }

    // Keep only what the record supports: cited exhibits must be ones we sent, every other number must be in the data.
    const sent = new Set(recent.map((e) => exhibit.get(e.id)!));
    for (const p of findPatterns(inRange)) for (const id of p.entryIds) { const n = exhibit.get(id); if (n) sent.add(n); }
    const known = numbersIn(data);
    const bullets = (out.bullets ?? []).map((s) => s.trim().replace(/^[-•*]\s*/, '')).filter((s) => {
      if (!s || words(s) > 40) return false;
      const cites = [...s.matchAll(/E-(\d+)/g)].map((m) => Number(m[1]));
      if (cites.some((n) => !sent.has(n))) return false;
      const bare = s.replace(/E-\d+/g, '');
      return [...bare.matchAll(/\d[\d,]*(?:\.\d+)?/g)].every((m) => known.has(m[0].replace(/,$/, '')) || known.has(m[0].replace(/,/g, '').replace(/,$/, '')));
    }).slice(0, 7);
    if (!bullets.length) return c.json({error: 'The report didn’t check out against your record, so we didn’t show it. Please try again.'}, 502);

    const report: Report = {
      title: clip((out.title ?? '').trim() || {lawyer: 'Summary for your lawyer', month: 'The last 30 days', patterns: 'Patterns and concerns'}[kind], 80),
      bullets,
      caution: clip((out.caution ?? '').trim(), 240) || 'A summary of your own record, not legal advice. Check each cited exhibit before relying on it.',
      from: first, to: last, entries: inRange.length,
    };
    db.prepare(`INSERT INTO record_reports (person_id, kind, range_key, entry_count, fingerprint, json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (person_id, kind, range_key) DO UPDATE SET entry_count = excluded.entry_count, fingerprint = excluded.fingerprint, json = excluded.json, created_at = excluded.created_at`)
      .run(person.id, kind, rangeKey, inRange.length, fp, JSON.stringify(report), nowIso());
    track(person.id, 'record_report', {kind, cached: false, shared, bullets: bullets.length, dropped: (out.bullets?.length ?? 0) - bullets.length});
    return c.json(report);
  });
}

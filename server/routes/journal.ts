/* The journal API: a private, dated record (entries), imports from where the messages already live, and the
   patterns counted over it. Imports go in two steps — read the file, then ask which sender is the other parent —
   so the read is kept for a day in journal_imports and confirmed by id. */
import type {Context, Hono} from 'hono';
import {z} from 'zod';
import type {Category, Channel, Entry, EntryKind} from '../../shared/types.js';
import {db, newId, nowIso, personNow, track, type PersonRow} from '../db.js';
import {addEntry, deleteEntry, findPatterns, getEntry, isCategory, isKind, listEntries, titleFrom, updateEntry} from '../journal-store.js';
import {decodeExport, parseWhatsApp} from '../import/whatsapp.js';
import {guessCategory, looksTense} from '../import/classify.js';
import {neutralize, readPdf, readScreenshots, type ReadMessage} from '../import/ai-read.js';

db.exec(`
CREATE TABLE IF NOT EXISTS journal_imports (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, json TEXT NOT NULL
);`);

/** One message, whatever it was read from. `undated` = the source showed no date and the import day stands in. */
interface Msg { at: string; sender: string; text: string; subject?: string; media?: boolean; undated?: boolean }
interface Pending { source: Entry['source']; channel: Channel; filename: string; messages: Msg[] }

const MB = 1024 * 1024;
const MAX_IMPORT = 5000;

const KINDS = ['message_in', 'message_out', 'incident', 'note', 'expense'] as const;
const CATS = ['schedule', 'money', 'health', 'school', 'new_partner', 'accusation', 'logistics', 'other'] as const;
const CHANNELS = ['sms', 'whatsapp', 'email', 'ofw', 'talkingparents', 'in_person', 'phone', 'other'] as const;

const EntryIn = z.object({
  kind: z.enum(KINDS),
  occurredAt: z.string().refine((s) => !isNaN(Date.parse(s)), 'Pick a valid date and time.'),
  channel: z.enum(CHANNELS).default('in_person'),
  title: z.string().trim().max(200).default(''),
  text: z.string().trim().max(20_000).default(''),
  category: z.enum(CATS).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  amountCents: z.number().int().min(0).max(100_000_000).nullish(),
});

function bad(c: Context, error: string, status: 400 | 404 | 413 | 422 | 502 = 400) { return c.json({error}, status); }

function stats(entries: Entry[]) {
  const n = (k: EntryKind) => entries.filter((e) => e.kind === k).length;
  return {
    total: entries.length,
    messages: n('message_in') + n('message_out'),
    messagesIn: n('message_in'),
    incidents: n('incident'),
    expenses: n('expense'),
    expenseCents: entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + (e.amountCents ?? 0), 0),
    notes: n('note'),
    first: entries[0]?.occurredAt ?? null,
    last: entries.at(-1)?.occurredAt ?? null,
  };
}

function filterEntries(all: Entry[], q: {kind?: string; category?: string; q?: string}) {
  let out = all;
  const kinds = (q.kind ?? '').split(',').filter(isKind);
  if (kinds.length) out = out.filter((e) => kinds.includes(e.kind));
  if (q.category && isCategory(q.category)) out = out.filter((e) => e.category === q.category);
  const words = (q.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) out = out.filter((e) => { const h = `${e.title}\n${e.text}\n${e.tags.join(' ')}`.toLowerCase(); return words.every((w) => h.includes(w)); });
  return out;
}

/* ---------- imports: read → pending → confirm ---------- */

function savePending(person: PersonRow, p: Pending) {
  db.prepare("DELETE FROM journal_imports WHERE created_at < ?").run(new Date(Date.now() - 86_400_000).toISOString());
  const id = newId('imp_');
  db.prepare('INSERT INTO journal_imports (id, person_id, created_at, json) VALUES (?, ?, ?, ?)').run(id, person.id, nowIso(), JSON.stringify(p));
  return id;
}

function preview(id: string, p: Pending) {
  const counts = new Map<string, number>();
  for (const m of p.messages) counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
  const senders = [...counts.entries()].map(([name, count]) => ({name, count})).sort((a, b) => b.count - a.count);
  const dated = p.messages.filter((m) => !m.undated).map((m) => m.at).sort();
  // A screenshot read says who is "Me"; the other side is then the obvious guess.
  const guess = senders.find((s) => s.name !== 'Me' && senders.some((x) => x.name === 'Me'))?.name;
  return {
    importId: id, source: p.source, channel: p.channel, filename: p.filename,
    total: p.messages.length, senders, suggestedOther: guess ?? null,
    from: dated[0] ?? null, to: dated.at(-1) ?? null,
    undated: p.messages.filter((m) => m.undated).length,
    tense: p.messages.filter((m) => looksTense(m.text)).length,
    sample: p.messages.slice(-4).map((m) => ({...m, text: m.text.slice(0, 280)})),
  };
}

function commit(person: PersonRow, p: Pending, otherParent: string, me?: string[]) {
  const existing = new Set(listEntries(person.id, {kinds: ['message_in', 'message_out']}).map((e) => `${e.kind}|${e.occurredAt.slice(0, 16)}|${e.text.slice(0, 200)}`));
  let added = 0, duplicates = 0, skipped = 0;
  const label = otherParent === 'Them' ? 'the other parent' : otherParent;
  for (const m of p.messages) {
    const mine = me?.length ? me.includes(m.sender) : m.sender !== otherParent;
    const kind: EntryKind | null = m.sender === otherParent ? 'message_in' : mine ? 'message_out' : null;
    if (!kind) { skipped++; continue; }
    const key = `${kind}|${m.at.slice(0, 16)}|${m.text.slice(0, 200)}`;
    if (existing.has(key)) { duplicates++; continue; }
    existing.add(key);
    const tags = ['imported'];
    if (kind === 'message_in' && looksTense(m.text)) tags.push('tense');
    if (m.media) tags.push('attachment');
    if (m.undated) tags.push('date_unknown');
    const dir = kind === 'message_in' ? `Message from ${label}` : `Message to ${label}`;
    addEntry(person.id, {
      kind, occurredAt: m.at, channel: p.channel,
      title: m.subject ? `${dir}: “${titleFrom(m.subject, 60)}”` : dir,
      text: m.text, category: guessCategory(`${m.subject ?? ''} ${m.text}`), tags, source: p.source,
    });
    added++;
  }
  return {added, duplicates, skipped};
}

/** A transcribed date + time → ISO, on the person's clock; an undated message is pinned to the import day at noon. */
function stamp(m: ReadMessage, tzMin: number, today: string): {at: string; undated: boolean} {
  const date = m.date ?? today;
  const [h, min] = (m.time ?? '12:00').split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, min) + tzMin * 60_000;
  return isNaN(ms) ? {at: new Date(Date.parse(today)).toISOString(), undated: true} : {at: new Date(ms).toISOString(), undated: !m.date};
}

const platformChannel = (p: string): Channel => {
  const s = (p || '').toLowerCase();
  if (s.includes('family') || s.includes('ofw')) return 'ofw';
  if (s.includes('talking')) return 'talkingparents';
  if (s.includes('whatsapp')) return 'whatsapp';
  if (s.includes('mail')) return 'email';
  if (s.includes('sms') || s.includes('imessage') || s.includes('text')) return 'sms';
  return 'other';
};

const files = (v: unknown): File[] => (Array.isArray(v) ? v : [v]).filter((x): x is File => typeof x === 'object' && x !== null && 'arrayBuffer' in x);
const localToday = (person: PersonRow, tz: number) => new Date(personNow(person).getTime() - tz * 60_000).toISOString().slice(0, 10);

export default function register(app: Hono) {
  app.get('/api/journal', (c) => {
    const person = c.get('person');
    const all = listEntries(person.id);
    const q = c.req.query();
    const ranged = q.from || q.to ? listEntries(person.id, {from: q.from || undefined, to: q.to || undefined}) : all;
    const entries = [...filterEntries(ranged, q)].reverse(); // newest first for the list
    return c.json({entries, stats: stats(all), patterns: findPatterns(all), now: personNow(person).toISOString()});
  });

  app.get('/api/journal/patterns', (c) => c.json({patterns: findPatterns(listEntries(c.get('person').id))}));

  app.post('/api/journal', async (c) => {
    const person = c.get('person');
    const parsed = EntryIn.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return bad(c, parsed.error.issues[0]?.message ?? 'Some fields are missing.', 422);
    const b = parsed.data;
    if (!b.text && !b.title) return bad(c, 'Write a line about what happened.', 422);
    if (b.kind === 'expense' && !b.amountCents) return bad(c, 'Add the amount for this expense.', 422);
    const entry = addEntry(person.id, {
      kind: b.kind, occurredAt: b.occurredAt, channel: b.channel, title: b.title || titleFrom(b.text),
      text: b.text || b.title, category: b.category ?? guessCategory(`${b.title} ${b.text}`), tags: b.tags,
      amountCents: b.amountCents ?? undefined, source: 'manual',
    });
    track(person.id, 'journal_add', {kind: entry.kind, tags: entry.tags});
    return c.json({entry});
  });

  app.patch('/api/journal/:id', async (c) => {
    const person = c.get('person');
    if (!getEntry(person.id, c.req.param('id'))) return bad(c, 'That entry no longer exists.', 404);
    const parsed = EntryIn.partial().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return bad(c, parsed.error.issues[0]?.message ?? 'Some fields are invalid.', 422);
    const {amountCents, ...rest} = parsed.data;
    const patch: Partial<Entry> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (amountCents !== undefined) patch.amountCents = amountCents ?? undefined;
    return c.json({entry: updateEntry(person.id, c.req.param('id'), patch)});
  });

  app.delete('/api/journal/:id', (c) => {
    const ok = deleteEntry(c.get('person').id, c.req.param('id'));
    return ok ? c.json({ok: true}) : bad(c, 'That entry no longer exists.', 404);
  });

  app.post('/api/journal/neutral', async (c) => {
    const b = await c.req.json().catch(() => ({})) as {text?: string; kind?: string};
    const text = (b.text ?? '').trim();
    if (text.length < 3) return bad(c, 'Write what happened first, then make it neutral.', 422);
    if (text.length > 4000) return bad(c, 'That note is long. Keep it under 4,000 characters.', 413);
    try {
      const r = await neutralize(text, b.kind);
      track(c.get('person').id, 'journal_neutral');
      return c.json({
        text: r.text.trim(), title: titleFrom(r.title || r.text, 80),
        category: isCategory(r.category) ? r.category : guessCategory(text) as Category,
        removed: (r.removed ?? []).filter((w) => w && text.toLowerCase().includes(w.toLowerCase())).slice(0, 8),
      });
    } catch (e) {
      console.error('[journal] neutral', e);
      return bad(c, 'We couldn’t rewrite that right now. Your note is unchanged. Try again in a moment.', 502);
    }
  });

  app.post('/api/journal/import/whatsapp', async (c) => {
    const person = c.get('person');
    const form = await c.req.parseBody({all: true});
    const [file] = files(form.file);
    if (!file) return bad(c, 'Choose the WhatsApp export (.txt or .zip).');
    if (file.size > 25 * MB) return bad(c, 'That file is over 25 MB. Export the chat “Without media” and try again.', 413);
    let chat;
    try {
      chat = parseWhatsApp(decodeExport(Buffer.from(await file.arrayBuffer()), file.name), Number(form.tz) || 0);
    } catch (e) { return bad(c, (e as Error).message, 422); }
    if (!chat.messages.length) return bad(c, 'We couldn’t find any messages in that file. In WhatsApp, open the chat → ⋯ → Export chat, and upload the file it makes.', 422);
    const pending: Pending = {source: 'import_whatsapp', channel: 'whatsapp', filename: file.name, messages: chat.messages.slice(-MAX_IMPORT)};
    const id = savePending(person, pending);
    track(person.id, 'journal_import_read', {source: 'whatsapp', n: chat.messages.length});
    const other = typeof form.otherParent === 'string' ? form.otherParent : '';
    if (other) return confirmImport(c, id, other);
    return c.json({...preview(id, pending), truncated: chat.messages.length > MAX_IMPORT, dayFirst: chat.dayFirst});
  });

  app.post('/api/journal/import/pdf', async (c) => {
    const person = c.get('person');
    const form = await c.req.parseBody({all: true});
    const [file] = files(form.file);
    if (!file) return bad(c, 'Choose the PDF export.');
    if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return bad(c, 'That isn’t a PDF. Export your messages as PDF from OurFamilyWizard or TalkingParents.');
    if (file.size > 15 * MB) return bad(c, 'That PDF is over 15 MB. Export a shorter date range and import it in parts.', 413);
    const tz = Number(form.tz) || 0;
    const today = localToday(person, tz);
    try {
      const r = await readPdf(Buffer.from(await file.arrayBuffer()), today);
      if (!r.messages.length) return bad(c, 'We couldn’t find messages in that PDF. Is it a message export rather than a calendar or expense report?', 422);
      const pending: Pending = {
        source: 'import_pdf', channel: platformChannel(r.platform), filename: file.name,
        messages: r.messages.map((m) => ({...stamp(m, tz, today), sender: m.sender, text: m.text, subject: m.subject})),
      };
      track(person.id, 'journal_import_read', {source: 'pdf', n: pending.messages.length});
      return c.json(preview(savePending(person, pending), pending));
    } catch (e) {
      console.error('[journal] pdf', e);
      return bad(c, 'We couldn’t read that PDF right now. Try again, or import a shorter date range.', 502);
    }
  });

  app.post('/api/journal/import/screenshot', async (c) => {
    const person = c.get('person');
    const form = await c.req.parseBody({all: true});
    const imgs = [...files(form.image), ...files(form.images)];
    if (!imgs.length) return bad(c, 'Choose one or more screenshots.');
    if (imgs.length > 8) return bad(c, 'Up to 8 screenshots at a time.');
    for (const f of imgs) {
      if (!/^image\//.test(f.type)) return bad(c, `${f.name} isn’t an image.`);
      if (f.size > 8 * MB) return bad(c, `${f.name} is over 8 MB.`, 413);
    }
    const tz = Number(form.tz) || 0;
    const today = localToday(person, tz);
    try {
      const images = await Promise.all(imgs.map(async (f) => ({mimeType: f.type, dataBase64: Buffer.from(await f.arrayBuffer()).toString('base64')})));
      const r = await readScreenshots(images, today);
      if (!r.messages.length) return bad(c, 'We couldn’t find message bubbles in those screenshots.', 422);
      const pending: Pending = {
        source: 'screenshot', channel: platformChannel(r.platform) === 'other' ? 'sms' : platformChannel(r.platform), filename: imgs.map((f) => f.name).join(', '),
        messages: r.messages.map((m) => ({...stamp(m, tz, today), sender: m.sender, text: m.text})),
      };
      track(person.id, 'journal_import_read', {source: 'screenshot', n: pending.messages.length});
      return c.json(preview(savePending(person, pending), pending));
    } catch (e) {
      console.error('[journal] screenshot', e);
      return bad(c, 'We couldn’t read those screenshots right now. Try again in a moment.', 502);
    }
  });

  app.post('/api/journal/import/:id', async (c) => {
    const b = await c.req.json().catch(() => ({})) as {otherParent?: string; me?: string[]};
    if (!b.otherParent) return bad(c, 'Choose which sender is the other parent.', 422);
    return confirmImport(c, c.req.param('id'), b.otherParent, Array.isArray(b.me) ? b.me : undefined);
  });

  app.delete('/api/journal/import/:id', (c) => {
    db.prepare('DELETE FROM journal_imports WHERE id = ? AND person_id = ?').run(c.req.param('id'), c.get('person').id);
    return c.json({ok: true});
  });
}

function confirmImport(c: Context, id: string, otherParent: string, me?: string[]) {
  const person = c.get('person');
  const row = db.prepare('SELECT json FROM journal_imports WHERE id = ? AND person_id = ?').get(id, person.id) as {json: string} | undefined;
  if (!row) return bad(c, 'This import expired. Upload the file again.', 404);
  const p = JSON.parse(row.json) as Pending;
  if (!p.messages.some((m) => m.sender === otherParent)) return bad(c, `No messages from “${otherParent}” in this file.`, 422);
  const r = commit(person, p, otherParent, me);
  db.prepare('DELETE FROM journal_imports WHERE id = ?').run(id);
  track(person.id, 'journal_import', {source: p.source, ...r});
  return c.json({...r, source: p.source});
}

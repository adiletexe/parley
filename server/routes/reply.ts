/* The reply coach API. One model call per analysis; the result is stored so it can be reopened, used and logged.
   Every route here needs an active plan or the demo case (the paywall gate in server/index.ts, and again below). */
import type {Context, Hono} from 'hono';
import type {Analysis, Channel, Entry} from '../../shared/types.js';
import {db, getPerson, newId, nowIso, personNow, track, type PersonRow} from '../db.js';
import {hasAccess, PAYWALL} from '../me.js';
import {analyzeMessage} from '../prompts/reply.js';
import {addEntry, titleFrom} from '../journal-store.js';
import type {AiImage} from '../ai.js';

/** Which journal entries a used analysis produced, so copying twice never logs twice. */
db.exec(`
CREATE TABLE IF NOT EXISTS reply_logs (
  analysis_id TEXT PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  in_entry TEXT, out_entry TEXT, incident_entry TEXT, variant TEXT, at TEXT NOT NULL
);`);

const MB = 1024 * 1024;
const CHANNELS: Channel[] = ['sms', 'whatsapp', 'email', 'ofw', 'talkingparents', 'in_person', 'phone', 'other'];
const VARIANTS = ['brief', 'neutral', 'firm'] as const;
type Variant = (typeof VARIANTS)[number];
type LogRow = {analysis_id: string; in_entry: string | null; out_entry: string | null; incident_entry: string | null; variant: string | null};


function loadAnalysis(personId: string, id: string): Analysis | undefined {
  const r = db.prepare('SELECT json FROM analyses WHERE id = ? AND person_id = ?').get(id, personId) as {json: string} | undefined;
  return r ? (JSON.parse(r.json) as Analysis) : undefined;
}
function getLog(id: string) {
  return db.prepare('SELECT * FROM reply_logs WHERE analysis_id = ?').get(id) as LogRow | undefined;
}
/** What the browser needs to know about an analysis it already has: has it been logged, and as what. */
function withLog(a: Analysis) {
  const l = getLog(a.id);
  return {...a, usedVariant: (l?.variant as Variant | null) ?? undefined, logged: {exchange: !!l?.out_entry, incident: !!l?.incident_entry}};
}

/** Model failures in words a parent can act on; the details go to the log. */
function aiError(c: Context, e: unknown) {
  const msg = (e as Error)?.message ?? '';
  console.error('[reply] analyze failed:', msg.slice(0, 300));
  if (/^(Paste|We couldn't)/.test(msg)) return c.json({error: msg}, 422);
  if (/aborted|timeout/i.test(msg)) return c.json({error: 'That took too long. Please try again, it usually takes under 15 seconds.'}, 504);
  return c.json({error: "The reply coach couldn't answer just now. Please try again in a minute."}, 503);
}

async function readInput(c: Context): Promise<{incoming: string; draft: string; context: string; images: AiImage[]} | string> {
  const type = c.req.header('content-type') ?? '';
  if (type.includes('multipart/form-data')) {
    const form = await c.req.formData().catch(() => null);
    if (!form) return 'That upload could not be read. Please try again.';
    const images: AiImage[] = [];
    for (const f of form.getAll('image')) {
      if (typeof f === 'string') continue;
      if (!/^image\/(png|jpe?g|webp|heic|heif|gif)$/i.test(f.type)) return 'Screenshots must be PNG, JPG, WEBP or HEIC images.';
      if (f.size > 8 * MB) return 'That screenshot is over 8 MB. Try a smaller one.';
      images.push({mimeType: f.type, dataBase64: Buffer.from(await f.arrayBuffer()).toString('base64')});
      if (images.length >= 3) break;
    }
    const s = (k: string) => { const v = form.get(k); return typeof v === 'string' ? v : ''; };
    return {incoming: s('incoming'), draft: s('draft'), context: s('context'), images};
  }
  const b = await c.req.json().catch(() => null) as {incoming?: unknown; draft?: unknown; context?: unknown} | null;
  if (!b) return 'Send the message as JSON or as a form.';
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  return {incoming: s(b.incoming), draft: s(b.draft), context: s(b.context), images: []};
}

export default function register(app: Hono) {
  app.post('/api/reply/analyze', async (c) => {
    const person = getPerson(c.get('person').id)!;
    // Checked again here, not only in the gate: this is the call that spends money on the model.
    if (!hasAccess(person)) {
      track(person.id, 'reply_paywall');
      return c.json(PAYWALL, 402);
    }
    const input = await readInput(c);
    if (typeof input === 'string') return c.json({error: input}, 400);
    if (!input.incoming.trim() && !input.images.length) return c.json({error: 'Paste their message or add a screenshot.'}, 400);
    if (input.incoming.length > 6000) return c.json({error: 'That message is very long. Paste the part you need to answer (up to about 1,000 words).'}, 413);

    let out;
    try { out = await analyzeMessage(input); } catch (e) { return aiError(c, e); }

    const a: Analysis = {id: newId('a_'), createdAt: personNow(person).toISOString(), ...out, ...(person.demo ? {demo: true} : {})};
    db.prepare('INSERT INTO analyses (id, person_id, created_at, json) VALUES (?, ?, ?, ?)').run(a.id, person.id, nowIso(), JSON.stringify(a));
    track(person.id, 'reply_analyzed', {heat: a.heat, advice: a.advice, draft: !!a.draft, image: input.images.length > 0, category: a.category});
    return c.json(withLog(a));
  });

  /** Copying or saving a reply logs both sides of the exchange to the journal, once. */
  app.post('/api/reply/:id/use', async (c) => {
    const person = getPerson(c.get('person').id)!;
    const a = loadAnalysis(person.id, c.req.param('id'));
    if (!a) return c.json({error: 'That reply is no longer here. Write a new one.'}, 404);
    const b = await c.req.json().catch(() => ({})) as {variant?: string; text?: string; channel?: string};
    const variant: Variant = VARIANTS.includes(b.variant as Variant) ? (b.variant as Variant) : 'neutral';
    const channel: Channel = CHANNELS.includes(b.channel as Channel) ? (b.channel as Channel) : 'sms';
    // The user may have edited the reply before copying; log what they actually sent.
    const text = (typeof b.text === 'string' && b.text.trim() ? b.text.trim() : a.variants[variant].text).slice(0, 4000);

    const prev = getLog(a.id);
    if (prev?.out_entry) {
      // Already logged: keep the record honest with the latest version they copied rather than adding a duplicate.
      db.prepare('UPDATE entries SET text = ?, title = ?, tags = ? WHERE id = ? AND person_id = ?').run(text, titleFrom(text), JSON.stringify(['coach', variant]), prev.out_entry, person.id);
      db.prepare('UPDATE reply_logs SET variant = ? WHERE analysis_id = ?').run(variant, a.id);
      return c.json({ok: true, already: true, entryIds: [prev.in_entry, prev.out_entry].filter(Boolean)});
    }
    const now = personNow(person).getTime();
    const base = {channel, category: a.category, analysisId: a.id, source: 'coach' as Entry['source']};
    const inE = addEntry(person.id, {
      ...base, kind: 'message_in', occurredAt: new Date(now - 60_000).toISOString(),
      title: a.facts && !/^No request/i.test(a.facts) ? a.facts : '',
      text: a.incoming, tags: ['coach', ...(a.heat >= 50 ? ['tense'] : [])],
    });
    const outE = addEntry(person.id, {...base, kind: 'message_out', occurredAt: new Date(now).toISOString(), title: '', text, tags: ['coach', variant]});
    db.prepare(`INSERT INTO reply_logs (analysis_id, person_id, in_entry, out_entry, variant, at) VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(analysis_id) DO UPDATE SET in_entry = excluded.in_entry, out_entry = excluded.out_entry, variant = excluded.variant`)
      .run(a.id, person.id, inE.id, outE.id, variant, nowIso());
    track(person.id, 'reply_used', {variant, edited: text !== a.variants[variant].text});
    return c.json({ok: true, entryIds: [inE.id, outE.id]});
  });

  /** One tap: their message becomes a neutral incident on the record (e.g. a threat to involve the kids). */
  app.post('/api/reply/:id/incident', async (c) => {
    const person = getPerson(c.get('person').id)!;
    const a = loadAnalysis(person.id, c.req.param('id'));
    if (!a) return c.json({error: 'That reply is no longer here.'}, 404);
    const b = await c.req.json().catch(() => ({})) as {channel?: string};
    const prev = getLog(a.id);
    if (prev?.incident_entry) return c.json({ok: true, already: true, entryId: prev.incident_entry});
    const inc = a.incident?.worthLogging ? a.incident : {title: 'Message from the other parent', note: ''};
    const e = addEntry(person.id, {
      kind: 'incident', occurredAt: personNow(person).toISOString(),
      channel: CHANNELS.includes(b.channel as Channel) ? (b.channel as Channel) : 'sms',
      title: inc.title, text: [inc.note, `Their message: "${a.incoming}"`].filter(Boolean).join('\n\n'),
      category: a.category, tags: ['coach'], analysisId: a.id, source: 'coach',
    });
    db.prepare(`INSERT INTO reply_logs (analysis_id, person_id, incident_entry, at) VALUES (?, ?, ?, ?)
                ON CONFLICT(analysis_id) DO UPDATE SET incident_entry = excluded.incident_entry`).run(a.id, person.id, e.id, nowIso());
    track(person.id, 'reply_incident');
    return c.json({ok: true, entryId: e.id});
  });

  app.get('/api/reply/recent', (c) => {
    const person = c.get('person');
    const rows = db.prepare('SELECT json FROM analyses WHERE person_id = ? ORDER BY created_at DESC LIMIT 12').all(person.id) as {json: string}[];
    const items = rows.map((r) => JSON.parse(r.json) as Analysis).map((a) => {
      const l = getLog(a.id);
      return {id: a.id, createdAt: a.createdAt, facts: a.facts, incoming: a.incoming.slice(0, 160), category: a.category, heat: a.heat, advice: a.advice,
        draftScore: a.draftScore, usedVariant: l?.variant ?? null, demo: !!a.demo};
    });
    return c.json({items});
  });

  app.get('/api/reply/:id', (c) => {
    const a = loadAnalysis(c.get('person').id, c.req.param('id'));
    return a ? c.json(withLog(a)) : c.json({error: 'Not found'}, 404);
  });
}

/* The court-ready timeline: the person's record, filtered to a period and topics, numbered as exhibits, and the PDF.
   Exhibit numbers are positions in the filtered, chronological list — the page and the PDF number the same way
   because both come from timelineFor(). A share link is a token that re-makes the PDF from the live record with
   the filters it was made with, so a lawyer's copy is always current and its fingerprint shows when it changed. */
import type {Context, Hono} from 'hono';
import {randomBytes} from 'node:crypto';
import type {Category, Entry, Pattern} from '../../shared/types.js';
import {db, getPerson, nowIso, personNow, track, type PersonRow} from '../db.js';
import {findPatterns, isCategory, listEntries} from '../journal-store.js';
import {buildTimelinePdf, fingerprint, localDay, safeTz} from '../pdf.js';

db.exec(`
CREATE TABLE IF NOT EXISTS timeline_shares (
  token TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL, params TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS timeline_shares_person ON timeline_shares(person_id);
`);

const SHARE_DAYS = 30;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

interface Params { from?: string; to?: string; categories: Category[]; tz: string }

function parseParams(q: Record<string, string | undefined>): Params {
  const from = q.from && YMD.test(q.from) ? q.from : undefined;
  let to = q.to && YMD.test(q.to) ? q.to : undefined;
  if (from && to && to < from) to = from;
  const categories = [...new Set((q.categories ?? '').split(',').map((s) => s.trim()).filter(isCategory))];
  return {from, to, categories, tz: safeTz(q.tz)};
}
/** The sample case lives in US Eastern time; whoever opens it (a judge in Almaty included) sees its own clock. */
const caseTz = (p: Params, person: {demo: number}): Params => (person.demo ? {...p, tz: 'America/New_York'} : p);

/** Patterns as the timeline shows them: only ones that rest on entries in this view (the reply-time habit is a
 *  coaching number, not evidence), with their exhibit numbers. */
export interface TimelinePattern extends Pattern { exhibits: number[] }

function timelineFor(personId: string, p: Params) {
  // The day boundaries are the person's own (their tz), not UTC, so "Oct 3" means the Oct 3 they lived.
  const entries = listEntries(personId).filter((e) => {
    const day = localDay(e.occurredAt, p.tz);
    return (!p.from || day >= p.from) && (!p.to || day <= p.to) && (!p.categories.length || p.categories.includes(e.category));
  });
  const exhibit = new Map(entries.map((e, i) => [e.id, i + 1]));
  const patterns: TimelinePattern[] = findPatterns(entries)
    .map((pt) => ({...pt, exhibits: pt.entryIds.map((id) => exhibit.get(id)).filter((n): n is number => !!n)}))
    .filter((pt) => pt.exhibits.length > 0);
  return {entries, patterns, fingerprint: fingerprint(entries)};
}

async function pdfFor(person: PersonRow, p: Params) {
  const {entries, patterns, fingerprint: fp} = timelineFor(person.id, p);
  const now = personNow(person);
  const bytes = await buildTimelinePdf({
    entries, patterns, from: p.from, to: p.to, categories: p.categories, generatedAt: now, tz: p.tz,
    preparedFor: person.name ?? undefined, demo: !!person.demo, fingerprint: fp,
  });
  return {bytes, filename: `parley-timeline-${localDay(now.toISOString(), p.tz)}.pdf`, count: entries.length};
}

function sendPdf(c: Context, bytes: Uint8Array, filename: string, disposition: 'attachment' | 'inline') {
  return c.body(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, 200, {
    'content-type': 'application/pdf',
    'content-disposition': `${disposition}; filename="${filename}"`,
    'cache-control': 'private, no-store',
    'x-robots-tag': 'noindex, nofollow',
  });
}

type ShareRow = {token: string; person_id: string; created_at: string; expires_at: string; params: string; views: number};

function activeShare(personId: string): ShareRow | undefined {
  return db.prepare('SELECT * FROM timeline_shares WHERE person_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1')
    .get(personId, nowIso()) as ShareRow | undefined;
}
// Behind the TLS proxy the request URL is the proxy's plain-http hop, so the public origin comes from its headers.
// The page builds the link from its own origin anyway; `url` is for API callers.
function origin(c: Context) {
  const u = new URL(c.req.url);
  const proto = c.req.header('x-forwarded-proto')?.split(',')[0].trim() || u.protocol.replace(':', '');
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || u.host;
  return `${proto}://${host}`;
}
const shareOut = (c: Context, s: ShareRow) => ({
  path: `/api/timeline/share/${s.token}`,
  url: `${origin(c)}/api/timeline/share/${s.token}`,
  expiresAt: s.expires_at, createdAt: s.created_at, views: s.views, params: JSON.parse(s.params) as Params,
});

export default function register(app: Hono) {
  app.get('/api/timeline', (c) => {
    const person = c.get('person');
    const p = caseTz(parseParams(c.req.query()), c.get('person'));
    const {entries, patterns, fingerprint: fp} = timelineFor(person.id, p);
    const all = listEntries(person.id);
    const count = (k: Entry['kind']) => entries.filter((e) => e.kind === k).length;
    const share = activeShare(person.id);
    return c.json({
      params: p,
      entries: entries.map((e, i) => ({...e, exhibit: i + 1})),
      patterns,
      counts: {
        total: entries.length, messages: count('message_in') + count('message_out'), incidents: count('incident'),
        expenses: count('expense'), notes: count('note'),
        expenseCents: entries.reduce((s, e) => s + (e.kind === 'expense' ? e.amountCents ?? 0 : 0), 0),
      },
      // The whole record's span, so the page can offer "all time" and sensible date bounds.
      range: {first: all[0]?.occurredAt ?? null, last: all.at(-1)?.occurredAt ?? null, total: all.length},
      fingerprint: fp,
      share: share ? shareOut(c, share) : null,
    });
  });

  app.get('/api/timeline/pdf', async (c) => {
    const person = c.get('person');
    const p = caseTz(parseParams(c.req.query()), c.get('person'));
    const {bytes, filename, count} = await pdfFor(person, p);
    track(person.id, 'timeline_pdf', {entries: count, from: p.from, to: p.to, categories: p.categories});
    return sendPdf(c, bytes, filename, 'attachment');
  });

  // One live link per person: making a new one retires the old, so there is never a forgotten copy out there.
  app.post('/api/timeline/share', async (c) => {
    const person = c.get('person');
    const b = await c.req.json().catch(() => ({})) as Record<string, string | undefined>;
    const p = caseTz(parseParams(b), c.get('person'));
    db.prepare('DELETE FROM timeline_shares WHERE person_id = ?').run(person.id);
    const token = randomBytes(24).toString('base64url');
    const created = nowIso();
    const expires = new Date(Date.now() + SHARE_DAYS * 86_400_000).toISOString();
    db.prepare('INSERT INTO timeline_shares (token, person_id, created_at, expires_at, params) VALUES (?, ?, ?, ?, ?)')
      .run(token, person.id, created, expires, JSON.stringify(p));
    track(person.id, 'timeline_share_created', {categories: p.categories, from: p.from, to: p.to});
    return c.json(shareOut(c, activeShare(person.id)!));
  });

  app.delete('/api/timeline/share', (c) => {
    const person = c.get('person');
    db.prepare('DELETE FROM timeline_shares WHERE person_id = ?').run(person.id);
    track(person.id, 'timeline_share_revoked');
    return c.json({ok: true});
  });

  // Read-only, for whoever holds the link (the lawyer has no Parley session of their own and needs none).
  app.get('/api/timeline/share/:token', async (c) => {
    const token = c.req.param('token');
    const s = /^[\w-]{20,64}$/.test(token)
      ? db.prepare('SELECT * FROM timeline_shares WHERE token = ? AND expires_at > ?').get(token, nowIso()) as ShareRow | undefined
      : undefined;
    const owner = s ? getPerson(s.person_id) : undefined;
    if (!s || !owner) {
      return c.html('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Link expired</title>' +
        '<body style="font:16px/1.5 system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f4f5fa;color:#1d1f2b">' +
        '<div style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:22px">This link has expired or was turned off.</h1>' +
        '<p style="color:#666a7a">Ask the person who shared it to send a new one.</p></div>', 404);
    }
    db.prepare('UPDATE timeline_shares SET views = views + 1 WHERE token = ?').run(token);
    track(owner.id, 'timeline_share_viewed');
    const {bytes, filename} = await pdfFor(owner, caseTz(JSON.parse(s.params) as Params, owner));
    return sendPdf(c, bytes, filename, 'inline');
  });
}

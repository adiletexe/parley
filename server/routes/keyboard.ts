/* The Parley Keyboard (iOS roadmap prototype, a separate repo): a keyboard extension has no web cookie, so it names
   itself by a random device id the container app made, and we keep a person per device here.
   Same paywall as the web app: the device's person needs an active plan (or to be the demo case), and even then
   each device gets KB_DAILY_LIMIT analyses a day. */
import type {Hono} from 'hono';
import {db, createPerson, getPerson, newId, nowIso, personNow, track} from '../db.js';
import {analyzeMessage} from '../prompts/reply.js';
import type {Analysis} from '../../shared/types.js';
import {hasAccess, PAYWALL} from '../me.js';
import {syncRenewals} from './billing.js';

db.exec(`
CREATE TABLE IF NOT EXISTS kb_devices (
  device TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kb_usage (
  device TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device, day)
);`);

const KB_DAILY_LIMIT = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function personFor(device: string) {
  const row = db.prepare('SELECT person_id FROM kb_devices WHERE device = ?').get(device) as {person_id: string} | undefined;
  const existing = row && getPerson(row.person_id);
  if (existing) return existing;
  const p = createPerson(false);
  db.prepare('INSERT OR REPLACE INTO kb_devices (device, person_id, created_at) VALUES (?, ?, ?)').run(device, p.id, nowIso());
  track(p.id, 'kb_device_new');
  return p;
}

export default function register(app: Hono) {
  app.post('/api/kb/analyze', async (c) => {
    const b = await c.req.json().catch(() => null) as {incoming?: unknown; draft?: unknown; device?: unknown} | null;
    if (!b) return c.json({error: 'Send the message as JSON.'}, 400);
    const device = typeof b.device === 'string' ? b.device.toLowerCase() : '';
    if (!UUID.test(device)) return c.json({error: 'Open the Parley Keyboard app once so it can set itself up.'}, 400);
    const incoming = typeof b.incoming === 'string' ? b.incoming : '';
    const draft = typeof b.draft === 'string' ? b.draft.slice(0, 4000) : '';
    if (!incoming.trim()) return c.json({error: 'Copy their texts first, then tap Paste their texts.'}, 400);
    if (incoming.length > 6000) return c.json({error: 'That message is very long. Copy just the part you need to answer.'}, 413);

    // No plan, no model call — checked before the day's count, so a locked device doesn't burn its tries.
    if (!hasAccess(syncRenewals(personFor(device)))) return c.json(PAYWALL, 402);

    // Count the call before the model runs, so a burst of parallel taps can't slip past the limit.
    const day = new Date().toISOString().slice(0, 10);
    db.prepare(`INSERT INTO kb_usage (device, day, count) VALUES (?, ?, 1)
                ON CONFLICT(device, day) DO UPDATE SET count = count + 1`).run(device, day);
    const used = (db.prepare('SELECT count FROM kb_usage WHERE device = ? AND day = ?').get(device, day) as {count: number}).count;
    if (used > KB_DAILY_LIMIT) {
      return c.json({error: `That's ${KB_DAILY_LIMIT} replies today, the keyboard demo's daily limit. It resets tomorrow.`, rateLimited: true}, 429);
    }

    const person = personFor(device);
    let out;
    try {
      out = await analyzeMessage({incoming, draft});
    } catch (e) {
      // A failed call shouldn't eat one of the day's tries.
      db.prepare('UPDATE kb_usage SET count = count - 1 WHERE device = ? AND day = ?').run(device, day);
      const msg = (e as Error)?.message ?? '';
      console.error('[kb] analyze failed:', msg.slice(0, 300));
      if (/^(Paste|We couldn't)/.test(msg)) return c.json({error: msg}, 422);
      if (/aborted|timeout/i.test(msg)) return c.json({error: 'That took too long. Please try again.'}, 504);
      return c.json({error: "Parley couldn't answer just now. Please try again in a minute."}, 503);
    }

    // Kept like any other analysis, so the same person could later see it on the web.
    const a: Analysis = {id: newId('a_'), createdAt: personNow(person).toISOString(), ...out};
    db.prepare('INSERT INTO analyses (id, person_id, created_at, json) VALUES (?, ?, ?, ?)').run(a.id, person.id, nowIso(), JSON.stringify(a));
    track(person.id, 'kb_analyzed', {heat: a.heat, advice: a.advice, draft: !!a.draft});

    return c.json({
      id: a.id,
      brief: a.variants.brief.text,
      neutral: a.variants.neutral.text,
      firm: a.variants.firm.text,
      verdict: a.adviceWhy,
      advice: a.advice,
      heat: a.heat,
      bubbles: a.bubbles ?? [a.incoming],
      ...(a.draft && typeof a.draftScore === 'number' ? {draftScore: a.draftScore} : {}),
      ...(typeof a.replyScore === 'number' ? {replyScore: a.replyScore} : {}),
      left: KB_DAILY_LIMIT - used,
    });
  });
}

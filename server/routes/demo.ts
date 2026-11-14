import type {Hono} from 'hono';
import {createPerson, db, getPerson, track} from '../db.js';
import {setPersonCookie} from '../session.js';
import {toMe} from '../me.js';
import {seedDemo} from '../demo-seed.js';

/* The jury's one click: a fresh demo person (demo=1) with its own sample case, its own clock and an active plan.
   The cookie moves to the demo person; nothing of the visitor's own guest data is touched or mixed in.
   Time-travel shifts only a demo person's clock — real accounts never move. */

const MAX_OFFSET = 40;

export default function register(app: Hono) {
  app.post('/api/demo/start', async (c) => {
    const from = c.get('person');
    const p = createPerson(true);
    const seeded = await seedDemo(p);
    setPersonCookie(c, p.id);
    track(p.id, 'demo_start', {from: from.id, ...seeded});
    return c.json({ok: true, me: toMe(getPerson(p.id)!), ...seeded});
  });

  app.post('/api/demo/forward', async (c) => {
    const p = getPerson(c.get('person').id)!;
    if (!p.demo) return c.json({error: 'Time travel is only for the demo case.'}, 403);
    const b = await c.req.json().catch(() => ({})) as {days?: number; reset?: boolean};
    const days = Math.round(Number(b.days ?? 7));
    if (!b.reset && (!Number.isFinite(days) || days === 0 || Math.abs(days) > 30)) return c.json({error: 'Pick between 1 and 30 days.'}, 400);
    const offset = b.reset ? 0 : Math.max(0, Math.min(MAX_OFFSET, p.time_offset_days + days));
    db.prepare('UPDATE people SET time_offset_days = ? WHERE id = ?').run(offset, p.id);
    track(p.id, 'demo_forward', {days: b.reset ? 'reset' : days, offset});
    return c.json({ok: true, offset, me: toMe(getPerson(p.id)!)});
  });
}

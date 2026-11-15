/* Parley server: JSON API under /api, the built web app (dist/) for everything else. */
import './env.js';
import {Hono, type Context} from 'hono';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';
import {readFileSync, existsSync} from 'node:fs';
import {session} from './session.js';
import {getPerson, track} from './db.js';
import {toMe, hasAccess, PAYWALL} from './me.js';
import {syncRenewals} from './routes/billing.js';
import quiz from './routes/quiz.js';
import billing from './routes/billing.js';
import reply from './routes/reply.js';
import journal from './routes/journal.js';
import timeline from './routes/timeline.js';
import plan from './routes/plan.js';
import demo from './routes/demo.js';
import report from './routes/report.js';
import keyboard from './routes/keyboard.js';
import course from './routes/course.js';

const app = new Hono();
// A lawyer opening a shared timeline link isn't a Parley user: no guest row, no cookie. The keyboard names itself by device.
app.use('/api/*', (c, next) => (c.req.path.startsWith('/api/timeline/share/') || c.req.path.startsWith('/api/kb/') ? next() : session(c, next)));

app.get('/api/health', (c) => c.json({ok: true}));
app.post('/api/event', async (c) => {
  const b = await c.req.json().catch(() => ({})) as {name?: string; data?: unknown};
  if (typeof b.name === 'string' && b.name.length < 60) track(c.get('person').id, b.name, b.data);
  return c.json({ok: true});
});
app.get('/api/me', (c) => c.json(toMe(syncRenewals(getPerson(c.get('person').id)!))));

/* Hard paywall: everything the product does sits behind an active plan (or the demo case), checked here once for
   every route of the paid modules so no endpoint can be forgotten. Renewals are rolled first, so a plan that
   renewed overnight is not mistaken for a lapsed one. The lawyer's read-only share link stays open: it is the
   payer's own record, already paid for. */
const PAID = /^\/api\/(reply|journal|timeline|plan|record|course)(\/|$)/;
app.use('/api/*', async (c, next) => {
  if (!PAID.test(c.req.path) || c.req.path.startsWith('/api/timeline/share/')) return next();
  const p = syncRenewals(getPerson(c.get('person').id)!);
  if (!hasAccess(p)) {
    track(p.id, 'paywall_api', {path: c.req.path});
    return c.json(PAYWALL, 402);
  }
  c.set('person', p);
  return next();
});

for (const register of [quiz, billing, reply, journal, timeline, plan, demo, report, keyboard, course]) register(app);

app.notFound((c) => (c.req.path.startsWith('/api/') ? c.json({error: 'Not found'}, 404) : spa(c)));
app.onError((err, c) => {
  console.error('[error]', c.req.method, c.req.path, err);
  return c.json({error: 'Something went wrong on our side. Please try again.'}, 500);
});

// Built web app: hashed assets are immutable, everything else falls back to index.html (client routing).
app.use('/assets/*', serveStatic({root: './dist', onFound: (_p, c) => { c.header('cache-control', 'public, max-age=31536000, immutable'); }}));
app.use('/*', serveStatic({root: './dist'}));
app.get('*', (c) => spa(c));

function spa(c: Context) {
  const f = './dist/index.html';
  return existsSync(f) ? c.html(readFileSync(f, 'utf8')) : c.text('Run `npm run build` (or `npm run dev`).', 404);
}

const port = Number(process.env.PORT || 8787);
serve({fetch: app.fetch, port, hostname: '127.0.0.1'}, () => console.log(`parley api on :${port}`));

/* Parley server: JSON API under /api, the built web app (dist/) for everything else. */
import './env.js';
import {Hono, type Context} from 'hono';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';
import {readFileSync, existsSync} from 'node:fs';
import {session} from './session.js';
import {getPerson, track} from './db.js';
import {toMe} from './me.js';
import quiz from './routes/quiz.js';
import billing from './routes/billing.js';
import reply from './routes/reply.js';
import journal from './routes/journal.js';
import timeline from './routes/timeline.js';
import plan from './routes/plan.js';
import demo from './routes/demo.js';
import report from './routes/report.js';

const app = new Hono();
// A lawyer opening a shared timeline link isn't a Parley user: no guest row, no cookie.
app.use('/api/*', (c, next) => (c.req.path.startsWith('/api/timeline/share/') ? next() : session(c, next)));

app.get('/api/health', (c) => c.json({ok: true}));
app.post('/api/event', async (c) => {
  const b = await c.req.json().catch(() => ({})) as {name?: string; data?: unknown};
  if (typeof b.name === 'string' && b.name.length < 60) track(c.get('person').id, b.name, b.data);
  return c.json({ok: true});
});
app.get('/api/me', (c) => c.json(toMe(getPerson(c.get('person').id)!)));

for (const register of [quiz, billing, reply, journal, timeline, plan, demo, report]) register(app);

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

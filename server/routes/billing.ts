/* Billing: the plans, a built-in TEST checkout (no Polar, no Stripe — neither is available to us; the case FAQ
   accepts a working paywall with a simulated checkout), plan status, one-click cancel, and the privacy pair:
   export everything as JSON, delete everything.

   The test checkout takes test cards ONLY. A real-looking card number is refused rather than "charged", so nobody
   types their real card into a page that will never charge it — and we never store more than the last four digits.

   Renewal is simulated lazily: when a paid period has run out on the person's own clock (demo time-travel included)
   and the plan was not cancelled, the next period is added and a 'renewal' checkout row is written. That happens on
   every billing call, so Settings always shows a plan that behaves the way the paywall promised. */
import type {Context, Hono} from 'hono';
import {deleteCookie} from 'hono/cookie';
import {db, getPerson, newId, nowIso, personNow, track, type PersonRow} from '../db.js';
import {planState} from '../me.js';

export type Tier = '1w' | '4w' | '12w';
export interface PlanOffer {
  tier: Tier;
  name: string;              // "4 weeks"
  priceCents: number;        // charged today
  days: number;              // first period
  renewCents: number;        // every renewal
  renewDays: number;         // renewal period
  renewLabel: string;        // "4 weeks"
  perDayCents: number;       // today's price per day of the first period, rounded
  popular?: boolean;
}

const offer = (tier: Tier, name: string, priceCents: number, days: number, renewCents: number, renewDays: number, renewLabel: string, popular = false): PlanOffer =>
  ({tier, name, priceCents, days, renewCents, renewDays, renewLabel, perDayCents: Math.round(priceCents / days), ...(popular ? {popular} : {})});

export const PLANS: PlanOffer[] = [
  offer('1w', '1 week', 699, 7, 2999, 28, '4 weeks'),
  offer('4w', '4 weeks', 1999, 28, 2999, 28, '4 weeks', true),
  offer('12w', '12 weeks', 4999, 84, 6999, 84, '12 weeks'),
];
const planOf = (t: unknown) => PLANS.find((p) => p.tier === t);

export const TEST_CARD = '4242 4242 4242 4242';
const DECLINE_CARD = '4000000000000002';   // the usual "card declined" test number, so the error path can be seen too
const REFUND_DAYS = 14;
const REMIND_DAYS = 3;
const DAY = 86_400_000;

/* One row per person: what the people row cannot say (cancelled? what does it renew at?). */
db.exec(`
CREATE TABLE IF NOT EXISTS subscriptions (
  person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  tier TEXT NOT NULL, status TEXT NOT NULL,           -- 'active' | 'canceled'
  renew_cents INTEGER NOT NULL, renew_days INTEGER NOT NULL,
  first_paid_at TEXT NOT NULL, canceled_at TEXT, updated_at TEXT NOT NULL
);
`);

type SubRow = {person_id: string; tier: string; status: string; renew_cents: number; renew_days: number; first_paid_at: string; canceled_at: string | null; updated_at: string};
const getSub = (id: string) => db.prepare('SELECT * FROM subscriptions WHERE person_id = ?').get(id) as SubRow | undefined;
type CheckoutRow = {id: string; tier: string; provider: string; status: string; created_at: string; json: string | null};

/** Roll a lapsed, not-cancelled plan into its next period(s). Returns the fresh person row. */
function syncRenewals(p: PersonRow): PersonRow {
  const sub = getSub(p.id);
  if (!sub || sub.status !== 'active' || !p.plan_until) return p;
  const now = personNow(p).getTime();
  let until = new Date(p.plan_until).getTime();
  let n = 0;
  while (until <= now && n < 60) {   // cap: a person who time-travels a year does not get 60 rows
    const at = new Date(until).toISOString();
    until += sub.renew_days * DAY;
    n++;
    db.prepare('INSERT INTO checkouts (id, person_id, tier, provider, status, created_at, json) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(newId('co_'), p.id, sub.tier, 'test', 'renewal', at, JSON.stringify({amountCents: sub.renew_cents, periodDays: sub.renew_days, test: true}));
  }
  if (!n) return p;
  db.prepare('UPDATE people SET plan_until = ? WHERE id = ?').run(new Date(until).toISOString(), p.id);
  track(p.id, 'billing_renewed', {count: n, tier: sub.tier});
  return getPerson(p.id)!;
}

function status(p: PersonRow) {
  const sub = getSub(p.id);
  const state = planState(p);
  const now = personNow(p);
  const tier = (p.plan_tier ?? sub?.tier) as Tier | undefined;
  const plan = planOf(tier);
  const canceled = sub?.status === 'canceled';
  const until = p.plan_until ?? undefined;
  const daysLeft = until ? Math.max(0, Math.ceil((new Date(until).getTime() - now.getTime()) / DAY)) : 0;
  // A plan with no subscription row was granted, not bought (the demo case): it does not renew and cannot be cancelled.
  const renews = state === 'active' && !!sub && !canceled;
  const history = (db.prepare('SELECT * FROM checkouts WHERE person_id = ? ORDER BY created_at DESC LIMIT 20').all(p.id) as CheckoutRow[])
    .map((r) => {
      const j = r.json ? JSON.parse(r.json) as {amountCents?: number; last4?: string; reason?: string} : {};
      return {id: r.id, at: r.created_at, tier: r.tier, status: r.status, amountCents: j.amountCents ?? 0, last4: j.last4, reason: j.reason};
    });
  const firstPaid = sub ? new Date(sub.first_paid_at).getTime() : 0;
  return {
    state,
    tier,
    name: plan?.name,
    startedAt: p.plan_started ?? undefined,
    until,
    daysLeft,
    granted: state === 'active' && !sub,
    canceled,
    canceledAt: sub?.canceled_at ?? undefined,
    renews,
    renewsAt: renews ? until : undefined,
    renewCents: sub?.renew_cents ?? plan?.renewCents,
    renewLabel: plan?.renewLabel,
    reminderDue: renews && daysLeft <= REMIND_DAYS,
    refundableUntil: sub ? new Date(firstPaid + REFUND_DAYS * DAY).toISOString() : undefined,
    email: p.email ?? undefined,
    demo: !!p.demo,
    now: now.toISOString(),
    history,
  };
}
export type BillingStatus = ReturnType<typeof status>;

/* ---- card checks (test mode) ---- */
function luhn(num: string): boolean {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = +num[num.length - 1 - i];
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}
type CardErr = {field: 'number' | 'exp' | 'cvc'; error: string};
function checkCard(b: {number?: unknown; exp?: unknown; cvc?: unknown}, now: Date): CardErr | {number: string} {
  const number = String(b.number ?? '').replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(number)) return {field: 'number', error: 'Enter the full card number.'};
  if (!luhn(number)) return {field: 'number', error: 'That card number has a typo — check the digits.'};
  if (number !== TEST_CARD.replace(/ /g, '') && number !== DECLINE_CARD)
    return {field: 'number', error: `This is a test checkout — please don't use a real card. Use ${TEST_CARD}.`};
  const m = /^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/.exec(String(b.exp ?? '').trim());
  if (!m) return {field: 'exp', error: 'Enter the expiry as MM / YY.'};
  const month = +m[1];
  const year = m[2].length === 2 ? 2000 + +m[2] : +m[2];
  if (month < 1 || month > 12) return {field: 'exp', error: 'The month should be 01 to 12.'};
  // A card is good through the last day of its expiry month.
  if (new Date(Date.UTC(year, month, 1)).getTime() <= now.getTime()) return {field: 'exp', error: 'That card has expired — use any future date.'};
  if (year > now.getUTCFullYear() + 20) return {field: 'exp', error: 'That expiry year looks wrong.'};
  if (!/^\d{3,4}$/.test(String(b.cvc ?? '').trim())) return {field: 'cvc', error: 'The CVC is the 3 digits on the back.'};
  return {number};
}

/* ---- export / delete: every table that carries a person_id, whoever created it ---- */
function personTables(): {table: string; col: string}[] {
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[]).map((t) => t.name);
  const out: {table: string; col: string}[] = [];
  for (const t of tables) {
    if (t === 'people' || !/^[A-Za-z0-9_]+$/.test(t)) continue;
    const fk = (db.prepare(`PRAGMA foreign_key_list("${t}")`).all() as {table: string; from: string}[]).find((f) => f.table === 'people');
    if (fk && /^[A-Za-z0-9_]+$/.test(fk.from)) out.push({table: t, col: fk.from});
    else if ((db.prepare(`PRAGMA table_info("${t}")`).all() as {name: string}[]).some((c) => c.name === 'person_id')) out.push({table: t, col: 'person_id'});
  }
  return out;
}
const parseJsonCols = (row: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && (k === 'json' || k.endsWith('_json') || k === 'tags')) {
      try { out[k] = JSON.parse(v); continue; } catch { /* keep the string */ }
    }
    out[k] = v;
  }
  return out;
};

const fmtUsd = (c: number) => `$${(c / 100).toFixed(2)}`;
const err = (c: Context, error: string, code: 400 | 404 | 409 = 400, extra: Record<string, unknown> = {}) => c.json({error, ...extra}, code);

export default function register(app: Hono) {
  app.get('/api/billing/plans', (c) => c.json({
    plans: PLANS, testMode: true, testCard: TEST_CARD, refundDays: REFUND_DAYS, remindDays: REMIND_DAYS,
  }));

  app.get('/api/billing/status', (c) => c.json(status(syncRenewals(getPerson(c.get('person').id)!))));

  app.post('/api/billing/test-pay', async (c) => {
    const b = await c.req.json().catch(() => ({})) as {tier?: string; number?: string; exp?: string; cvc?: string};
    const plan = planOf(b.tier);
    if (!plan) return err(c, 'Pick a plan first.');
    let p = syncRenewals(getPerson(c.get('person').id)!);
    const now = personNow(p);
    const card = checkCard(b, now);
    if ('error' in card) return err(c, card.error, 400, {field: card.field});
    const last4 = card.number.slice(-4);

    if (card.number === DECLINE_CARD) {
      db.prepare('INSERT INTO checkouts (id, person_id, tier, provider, status, created_at, json) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(newId('co_'), p.id, plan.tier, 'test', 'declined', now.toISOString(), JSON.stringify({amountCents: plan.priceCents, last4, reason: 'card_declined', test: true}));
      track(p.id, 'checkout_declined', {tier: plan.tier});
      return err(c, `Your card was declined (test card ending ${last4}). Nothing was charged — try ${TEST_CARD}.`, 400, {field: 'number'});
    }

    // Buying while a plan runs adds the new period after it, so nobody loses days they already paid for.
    const active = planState(p) === 'active';
    const from = active && p.plan_until ? new Date(p.plan_until) : now;
    const until = new Date(from.getTime() + plan.days * DAY).toISOString();
    const started = active && p.plan_started ? p.plan_started : now.toISOString();
    const at = now.toISOString();
    const checkoutId = newId('co_');
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE people SET plan_tier = ?, plan_started = ?, plan_until = ? WHERE id = ?').run(plan.tier, started, until, p.id);
      db.prepare(`INSERT INTO subscriptions (person_id, tier, status, renew_cents, renew_days, first_paid_at, canceled_at, updated_at)
                  VALUES (?, ?, 'active', ?, ?, ?, NULL, ?)
                  ON CONFLICT(person_id) DO UPDATE SET tier = excluded.tier, status = 'active', renew_cents = excluded.renew_cents,
                    renew_days = excluded.renew_days, canceled_at = NULL, updated_at = excluded.updated_at`)
        .run(p.id, plan.tier, plan.renewCents, plan.renewDays, at, nowIso());
      db.prepare('INSERT INTO checkouts (id, person_id, tier, provider, status, created_at, json) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(checkoutId, p.id, plan.tier, 'test', 'paid', at, JSON.stringify({amountCents: plan.priceCents, last4, renewCents: plan.renewCents, renewDays: plan.renewDays, until, test: true}));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    track(p.id, 'checkout_paid', {tier: plan.tier, amountCents: plan.priceCents, extended: active});
    p = getPerson(p.id)!;
    return c.json({ok: true, checkoutId, receipt: `${fmtUsd(plan.priceCents)} paid with test card ending ${last4}`, status: status(p)});
  });

  app.post('/api/billing/cancel', (c) => {
    const p = syncRenewals(getPerson(c.get('person').id)!);
    const sub = getSub(p.id);
    if (!sub || planState(p) !== 'active') return err(c, 'There is no paid plan to cancel.', 409);
    if (sub.status !== 'canceled') {
      db.prepare("UPDATE subscriptions SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE person_id = ?").run(personNow(p).toISOString(), nowIso(), p.id);
      track(p.id, 'plan_canceled', {tier: sub.tier});
    }
    return c.json(status(getPerson(p.id)!));
  });

  // Undo for the cancel above, while the paid period is still running.
  app.post('/api/billing/resume', (c) => {
    const p = syncRenewals(getPerson(c.get('person').id)!);
    const sub = getSub(p.id);
    if (!sub || planState(p) !== 'active') return err(c, 'This plan has already ended — pick a new one on the pricing page.', 409);
    if (sub.status === 'canceled') {
      db.prepare("UPDATE subscriptions SET status = 'active', canceled_at = NULL, updated_at = ? WHERE person_id = ?").run(nowIso(), p.id);
      track(p.id, 'plan_resumed', {tier: sub.tier});
    }
    return c.json(status(getPerson(p.id)!));
  });

  // Optional email from /welcome: "send me the plan & renewal reminders". No mail is sent in this build.
  app.post('/api/billing/email', async (c) => {
    const b = await c.req.json().catch(() => ({})) as {email?: unknown};
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) return err(c, 'That email address looks incomplete.');
    db.prepare('UPDATE people SET email = ? WHERE id = ?').run(email || null, c.get('person').id);
    return c.json({ok: true, email: email || undefined});
  });

  app.get('/api/me/export', (c) => {
    const p = getPerson(c.get('person').id)!;
    const data: Record<string, unknown> = {
      exportedAt: nowIso(),
      note: 'Everything Parley stores about you. Parley is not a law firm and doesn\'t give legal advice.',
      person: parseJsonCols(p as unknown as Record<string, unknown>),
    };
    for (const {table, col} of personTables()) {
      data[table] = (db.prepare(`SELECT * FROM "${table}" WHERE "${col}" = ?`).all(p.id) as Record<string, unknown>[]).map(parseJsonCols);
    }
    track(p.id, 'data_exported');
    c.header('content-disposition', `attachment; filename="parley-my-data-${nowIso().slice(0, 10)}.json"`);
    c.header('cache-control', 'no-store');
    return c.body(JSON.stringify(data, null, 2), 200, {'content-type': 'application/json; charset=utf-8'});
  });

  app.post('/api/me/delete', async (c) => {
    const b = await c.req.json().catch(() => ({})) as {confirm?: unknown};
    if (b.confirm !== true) return err(c, 'Confirm the deletion first.');
    const id = c.get('person').id;
    // Children first (not every module's table cascades, and events has no foreign key at all), then the person.
    db.exec('BEGIN');
    try {
      for (const {table, col} of personTables()) db.prepare(`DELETE FROM "${table}" WHERE "${col}" = ?`).run(id);
      db.prepare('DELETE FROM people WHERE id = ?').run(id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    deleteCookie(c, 'parley_pid', {path: '/'});
    return c.json({ok: true});
  });
}

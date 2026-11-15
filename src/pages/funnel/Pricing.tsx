/* /pricing — the paywall, then the built-in TEST checkout as a sheet over it.
   Hard paywall, no free tier and no free trial (the Finelo/Coursiv model): a paid introductory period, then the
   plan renews on its own. The intro price is big above the CTA and the renewal price sits right under the CTA at
   the same size. Honest by construction: the guarantee has no
   conditions, and there are no reviews, press logos, promo codes or countdowns that are not real. */
import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Logo} from '../../components/Logo';
import {Icon, type IconId} from '../../components/Icon';
import {api, ApiError, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import {addDays, firstPeriod, longDate, renewalLine, termsLine, shortDate, usd, planTitle, type BillingStatus, type PlanOffer, type PlansRes, type Tier} from './billing-api';
import './billing.css';

export default function Pricing() {
  const {me} = useMe();
  const [plans, setPlans] = useState<PlansRes | null>(null);
  const [loadErr, setLoadErr] = useState('');
    const [tier, setTier] = useState<Tier>('4w');
  const [checkout, setCheckout] = useState(false);

  const load = () => {
    setLoadErr('');
    api<PlansRes>('/api/billing/plans').then(setPlans).catch((e: Error) => setLoadErr(e.message));
  };
  useEffect(() => {
    load();
    track('paywall_view');
  }, []);

  const plan = plans?.plans.find((p) => p.tier === tier);
  const open = (from: string) => { track('checkout_open', {tier, from}); setCheckout(true); };
  const name = me?.name?.trim();
  const active = me?.plan.state === 'active';

  return (
    <div className="bl-page">
      <header className="bl-top">
        <Logo to="/" />
        <div className="bl-top-r">
          <span className="chip chip-amber">Test mode</span>
          <Link to="/" className="btn btn-quiet">Not now</Link>
        </div>
      </header>

      <main className="bl-wrap">
        <section className="bl-hero fade-in">
          <h1>{name ? `${name}, your` : 'Your'} course, <span className="gt">step by step</span></h1>
          <p>No surprises. Here's exactly what happens.</p>
        </section>

        {active && me?.plan.until && (
          <div className="bl-active">
            <Icon id="crown" size={32} />
            <div>Your plan is active until <b>{longDate(me.plan.until)}</b>. Buying again adds the time after it. <Link to="/app/settings">Manage plan</Link></div>
          </div>
        )}

        {loadErr ? (
          <div className="card"><p className="bl-err">{loadErr}</p><button className="btn btn-ghost" style={{marginTop: 10}} onClick={load}>Try again</button></div>
        ) : !plans || !plan ? (
          <div className="card bl-center" style={{minHeight: 220}}><span className="spin" /></div>
        ) : (
          <Steps plans={plans} tier={tier} setTier={setTier} plan={plan} now={me?.now ?? new Date().toISOString()} onGo={() => open('top')} />
        )}

        <section className="card">
          <h2 className="bl-h2">What you <span className="gt">get</span></h2>
          <div className="bl-rows">
            <Row icon="path" title="The 28-day course" sub="A 1-minute lesson a day as a short chat, then practice on texts like yours, and one small thing to try for real." />
            <Row icon="reply" title="The reply tool, unlimited" sub="Paste their message, get a short, calm reply in seconds, child-focused, no bait taken." />
            <Row icon="judge-lens" title="Your own draft, checked" sub="Risky phrases underlined before you send, with why and a safer wording." />
            <Row icon="record" title="A dated record and a PDF for your lawyer" sub="Every exchange and incident in one private place, with exhibit numbers." />
          </div>
        </section>

        <section className="card bl-guarantee">
          <Icon id="refund" size={52} />
          <div>
            <b>14-day money-back guarantee, no conditions</b>
            <span>Ask within 14 days of your first payment and you get all of it back. No forms, no questions.</span>
          </div>
        </section>

        <section className="card">
          <div className="bl-row">
            <Icon id="lock" size={40} />
            <div>
              <b>Private by design</b>
              <span>The other parent never sees Parley and is never contacted. We don't sell or share your data. Download it or delete everything in one click from Settings.</span>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="bl-h2">Questions</h2>
          <div className="bl-faq">
            <details>
              <summary>Is this legal advice?</summary>
              <p>No. Parley is not a law firm and doesn't give legal advice. It helps you write calm, factual messages and keep an organised record. For decisions about your case, talk to a family-law attorney.</p>
            </details>
            <details>
              <summary>Can the other parent see it?</summary>
              <p>No. Parley never messages anyone. You copy the reply and send it yourself, from the app you already use. Your journal and timeline are private to you.</p>
            </details>
            <details>
              <summary>Will a court accept the PDF?</summary>
              <p>Courts decide what evidence they admit, and rules differ by state. The PDF is a clean, dated, chronological summary with exhibit numbers and an integrity fingerprint, the kind of organised record lawyers ask clients to keep. Show it to your attorney.</p>
            </details>
            <details>
              <summary>Is there a free trial?</summary>
              <p>No. The first price is a smaller introductory price for your first period. After that the plan renews at the regular price until you cancel, and the app stays locked if it doesn't renew. Changed your mind? Ask within 14 days of your first payment and you get all of it back.</p>
            </details>
            <details>
              <summary>How do I cancel?</summary>
              <p>Settings → Cancel in one click. Your plan stays on until the end of the period you paid for, and nothing renews after that. We remind you in the app 3 days before each renewal.</p>
            </details>
          </div>
        </section>

        {plans && plan && (
          <section className="card">
            <h2 className="bl-h2">Pick your <span className="gt">plan</span></h2>
            <Picker plans={plans.plans} tier={tier} setTier={setTier} plan={plan} onGo={() => open('bottom')} />
          </section>
        )}

        <p className="bl-legal">
          Parley is not a law firm and doesn't give legal advice. Prices in US dollars. This build uses a test checkout. No real card is charged.
          {' '}Just looking? <Link to="/demo">Open the sample case</Link>
        </p>
      </main>

      {checkout && plans && plan && (
        <Checkout plan={plan} testCard={plans.testCard} now={me?.now ?? new Date().toISOString()} active={!!active} activeUntil={me?.plan.until} onClose={() => setCheckout(false)} />
      )}
    </div>
  );
}

/* The paywall as an honest timeline: what is charged today, when the refund window closes, when we remind them,
   when it renews and at what price. Dates are real (from the person's own clock); days follow the plan picked. */
function Steps({plans, tier, setTier, plan, now, onGo}: {plans: PlansRes; tier: Tier; setTier: (t: Tier) => void; plan: PlanOffer; now: string; onGo: () => void}) {
  const at = (d: number) => shortDate(addDays(now, d));
  const renew = plan.days;
  const events = [
    {day: 0, h: `Today · ${usd(plan.priceCents)}`, p: plan.days >= 28 ? 'Day 1 opens. All 4 weeks and the reply tool unlock.' : 'Day 1 opens, with the reply tool.'},
    {day: plans.refundDays, h: `Day ${plans.refundDays} · Refund window ends`, p: `Not for you? Full refund until ${at(plans.refundDays)}, no questions.`},
    {day: renew - plans.remindDays, h: `Day ${renew - plans.remindDays} · Reminder`, p: `We remind you ${plans.remindDays} days before you renew.`},
    {day: renew, h: `Day ${renew} · ${usd(plan.renewCents)}`, p: `Renews ${at(renew)}, then every ${plan.renewLabel} until you cancel.`},
  ].sort((x, y) => x.day - y.day);
  const others = plans.plans.filter((p) => p.tier !== tier);
  return (
    <section className="bl-steps">
      <div className="card bl-sel">
        <span className="bl-badge">{plan.days === 28 ? '28-day course' : plan.days === 7 ? 'Start with a week' : '12-week course'}</span>
        <div><b>{plan.days === 7 ? 'First week' : `First ${plan.name}`}</b><small>{plan.days >= 28 ? 'All 28 days + the reply tool' : 'Days 1 to 7 + the reply tool'}</small></div>
        <div className="bl-sel-p"><b>{usd(plan.priceCents)}</b><small>then {usd(plan.renewCents)} / {plan.renewLabel.replace('weeks', 'wks')}</small></div>
      </div>
      <ol className="card bl-tl">
        {events.map((e, i) => <li key={e.h} className={i === 0 ? 'now' : ''}><i aria-hidden="true" /><b>{e.h}</b><span>{e.p}</span></li>)}
      </ol>
      <div className="bl-trust">
        <span><Icon id="refund" size={20} />{plans.refundDays}-day refund</span>
        <span><Icon id="one-click" size={20} />Cancel in one click</span>
      </div>
      <button className="btn btn-primary btn-lg btn-block" onClick={onGo}>Start Day 1 · {usd(plan.priceCents)}</button>
      <p className="bl-intro bl-then">{usd(plan.priceCents)} today, {renewalLine(plan)}</p>
      <div className="bl-other">
        <span>Other plans</span>
        {others.map((p) => (
          <button key={p.tier} className="chip" onClick={() => { setTier(p.tier); track('plan_select', {tier: p.tier}); }}>
            {p.days === 7 ? '1 week' : p.name} · {usd(p.priceCents)}
          </button>
        ))}
      </div>
    </section>
  );
}

function Picker({plans, tier, setTier, plan, onGo}: {plans: PlanOffer[]; tier: Tier; setTier: (t: Tier) => void; plan: PlanOffer; onGo: () => void}) {
  return (
    <div className="bl-cta">
      <div className="bl-plans" role="radiogroup">
        {plans.map((p) => (
          <button key={p.tier} type="button" role="radio" aria-checked={p.tier === tier}
            className={'bl-plan' + (p.tier === tier ? ' on' : '') + (p.popular ? ' pop' : '')}
            onClick={() => { setTier(p.tier); track('plan_select', {tier: p.tier}); }}>
            {p.popular && <span className="bl-badge">Most popular</span>}
            <span className="bl-radio" />
            <span>
              <span className="bl-plan-name">{p.name}</span>
              <span className="bl-plan-sub" style={{display: 'block'}}><b>{usd(p.priceCents)}</b> for the {firstPeriod(p)} · then {usd(p.renewCents)} / {p.renewLabel}</span>
            </span>
            <span className="bl-perday"><b>{usd(p.perDayCents)}</b><span>per day</span></span>
          </button>
        ))}
      </div>
      <p className="bl-intro"><b>{usd(plan.priceCents)}</b> for your {firstPeriod(plan)}</p>
      <button className="btn btn-primary btn-lg" onClick={onGo}>Get my plan</button>
      <p className="bl-intro bl-then">{renewalLine(plan)}</p>
      <p className="bl-terms">{termsLine(plan)}</p>
      <div className="bl-trust">
        <span><Icon id="refund" size={20} />14-day money-back</span>
        <span><Icon id="lock" size={20} />Private</span>
        <span><Icon id="one-click" size={20} />Cancel in one click</span>
      </div>
    </div>
  );
}

function Row({icon, title, sub}: {icon: IconId; title: string; sub: string}) {
  return <div className="bl-row"><Icon id={icon} size={40} /><div><b>{title}</b><span>{sub}</span></div></div>;
}

/* ---------------- test checkout ---------------- */
type Field = 'number' | 'exp' | 'cvc';
const TEST_NUMBERS = ['4242424242424242', '4000000000000002'];

function luhn(num: string) {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = +num[num.length - 1 - i];
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}
const fmtNumber = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
function fmtExp(v: string, prev: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (v.length < prev.length) return v;                 // let backspace through the " / "
  if (d.length === 1 && +d > 1) return `0${d} / `;
  if (d.length >= 2) return `${d.slice(0, 2)} / ${d.slice(2)}`;
  return d;
}

/** Same rules as the server; a real-looking card never leaves the browser. */
function validate(number: string, exp: string, cvc: string, testCard: string, now: Date): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  const n = number.replace(/\D/g, '');
  if (n.length < 13) e.number = 'Enter the full card number.';
  else if (!luhn(n)) e.number = 'That card number has a typo. Check the digits.';
  else if (!TEST_NUMBERS.includes(n)) e.number = `This is a test checkout, so please don't use a real card. Use ${testCard}.`;
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(exp.trim());
  if (!m) e.exp = 'Enter the expiry as MM / YY.';
  else if (+m[1] < 1 || +m[1] > 12) e.exp = 'The month should be 01 to 12.';
  else if (Date.UTC(2000 + +m[2], +m[1], 1) <= now.getTime()) e.exp = 'That card has expired. Use any future date.';
  if (!/^\d{3,4}$/.test(cvc)) e.cvc = 'The CVC is the 3 digits on the back.';
  return e;
}

function Checkout({plan, testCard, now, active, activeUntil, onClose}: {plan: PlanOffer; testCard: string; now: string; active: boolean; activeUntil?: string; onClose: () => void}) {
  const nav = useNavigate();
  const {refresh} = useMe();
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [errs, setErrs] = useState<Partial<Record<Field, string>>>({});
  const [serverErr, setServerErr] = useState('');
  const [phase, setPhase] = useState<'form' | 'paying' | 'done'>('form');
  const firstRef = useRef<HTMLInputElement>(null);

  const periodStart = active && activeUntil ? activeUntil : now;
  const firstRenewal = useMemo(() => addDays(periodStart, plan.days), [periodStart, plan.days]);

  useEffect(() => {
    firstRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase === 'form') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose, phase]);

  const fill = () => {
    const d = new Date(now);
    setNumber(testCard);
    setExp(`${String(d.getMonth() + 1).padStart(2, '0')} / ${String((d.getFullYear() + 3) % 100).padStart(2, '0')}`);
    setCvc('123');
    setErrs({});
    setServerErr('');
    track('checkout_fill_test_card');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerErr('');
    const v = validate(number, exp, cvc, testCard, new Date(now));
    setErrs(v);
    if (Object.keys(v).length) return;
    setPhase('paying');
    const started = Date.now();
    try {
      await api<{ok: true; status: BillingStatus}>('/api/billing/test-pay', {body: {tier: plan.tier, number, exp, cvc}});
      // A beat on "Processing" so the state is readable; the request itself is what we waited for.
      await new Promise((r) => setTimeout(r, Math.max(0, 900 - (Date.now() - started))));
      await refresh();
      setPhase('done');
      setTimeout(() => nav('/welcome'), 1100);
    } catch (err) {
      setPhase('form');
      const field = err instanceof ApiError ? (err.data as {field?: Field})?.field : undefined;
      if (field) setErrs({[field]: err instanceof Error ? err.message : 'Payment failed.'});
      else setServerErr(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    }
  };

  return (
    <div className="bl-sheet-bg" onMouseDown={(e) => { if (e.target === e.currentTarget && phase === 'form') onClose(); }}>
      <div className="bl-sheet" role="dialog" aria-modal="true" aria-labelledby="bl-co-title">
        {phase === 'done' ? (
          <div className="bl-done" aria-live="polite">
            <div className="bl-check">✓</div>
            <h3>Payment confirmed</h3>
            <p>Test payment of {usd(plan.priceCents)} went through. Opening your plan…</p>
          </div>
        ) : (
          <>
            <div className="bl-sheet-h">
              <h2 id="bl-co-title"><Icon id="secure-card" size={30} />Checkout</h2>
              <button className="bl-x" onClick={onClose} disabled={phase === 'paying'} aria-label="Close checkout">×</button>
            </div>

            <div className="bl-test" role="note">
              <span><b>Test mode</b>: use card <b>{testCard}</b>, any future date, any CVC. No real money moves.</span>
              <button type="button" className="btn" onClick={fill} disabled={phase === 'paying'}>Fill test card</button>
            </div>

            <div className="bl-order">
              <div><span>Parley · {planTitle(plan.tier)}</span><span>{usd(plan.priceCents)}</span></div>
              <div><span>{active ? 'Starts after your current plan' : 'Starts'}</span><span>{active ? shortDate(activeUntil) : 'Today'}</span></div>
              <div><span>Then from {shortDate(firstRenewal)}</span><span>{usd(plan.renewCents)} / {plan.renewLabel}</span></div>
              <div className="bl-total"><span>Due today</span><span>{usd(plan.priceCents)}</span></div>
            </div>

            <form className="bl-form" onSubmit={submit} noValidate>
              <label className="bl-lbl">Card number
                <span className="bl-card-in">
                  <input ref={firstRef} className={'field' + (errs.number ? ' bad' : '')} inputMode="numeric" autoComplete="off" placeholder="1234 1234 1234 1234"
                    value={number} onChange={(e) => setNumber(fmtNumber(e.target.value))} aria-invalid={!!errs.number} />
                  {number.startsWith('4') && <span className="bl-brand">VISA</span>}
                </span>
                {errs.number && <span className="bl-err">{errs.number}</span>}
              </label>
              <div className="bl-two">
                <label className="bl-lbl">Expiry
                  <input className={'field' + (errs.exp ? ' bad' : '')} inputMode="numeric" autoComplete="off" placeholder="MM / YY"
                    value={exp} onChange={(e) => setExp(fmtExp(e.target.value, exp))} aria-invalid={!!errs.exp} />
                  {errs.exp && <span className="bl-err">{errs.exp}</span>}
                </label>
                <label className="bl-lbl">CVC
                  <input className={'field' + (errs.cvc ? ' bad' : '')} inputMode="numeric" autoComplete="off" placeholder="123"
                    value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-invalid={!!errs.cvc} />
                  {errs.cvc && <span className="bl-err">{errs.cvc}</span>}
                </label>
              </div>
              {serverErr && <p className="bl-err" role="alert">{serverErr} <button type="submit" className="btn btn-quiet" style={{padding: '2px 6px'}}>Try again</button></p>}
              <button className="btn btn-primary btn-lg bl-pay" type="submit" disabled={phase === 'paying'}>
                {phase === 'paying' ? <><span className="spin" />Processing…</> : <>Pay {usd(plan.priceCents)}</>}
              </button>
              <p className="bl-terms"><b>{usd(plan.priceCents)} today</b>, {renewalLine(plan)}.</p>
              <p className="bl-small">Cancel in one click in Settings. We remind you 3 days before each renewal. 14-day money-back guarantee, no conditions. Parley is not a law firm and doesn't give legal advice.</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

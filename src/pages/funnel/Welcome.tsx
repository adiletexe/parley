/* /welcome — after the test checkout: what was bought, exactly when it renews and for how much, and Day 1. */
import {useEffect, useState, type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {Logo} from '../../components/Logo';
import {Icon} from '../../components/Icon';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import {clearPending, peekPending} from '../../lib/pending';
import {longDate, planTitle, usd, type BillingStatus} from './billing-api';
import './billing.css';

export default function Welcome() {
  const {me, refresh} = useMe();
  const [st, setSt] = useState<BillingStatus | null>(null);
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailErr, setEmailErr] = useState('');
  // The message they pasted on the landing before paying: answering it is the first thing the plan does.
  const [pending] = useState(peekPending);

  const load = () => {
    setErr('');
    api<BillingStatus>('/api/billing/status').then((s) => { setSt(s); setEmail(s.email ?? ''); setSaved(!!s.email); }).catch((e: Error) => setErr(e.message));
  };
  useEffect(() => { load(); track('welcome_view'); }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setEmailErr('');
    setSaving(true);
    try {
      await api('/api/billing/email', {body: {email}});
      setSaved(true);
      void refresh();
      track('welcome_email_saved');
    } catch (x) {
      setEmailErr(x instanceof Error ? x.message : 'Could not save that. Try again.');
    } finally { setSaving(false); }
  };

  const lastPaid = st?.history.find((h) => h.status === 'paid');
  const name = me?.name?.trim();

  return (
    <div className="bl-page">
      <header className="bl-top"><Logo to="/app/reply" /></header>
      <main className="bl-wrap">
        {err ? (
          <div className="card"><p className="bl-err">{err}</p><button className="btn btn-ghost" style={{marginTop: 10}} onClick={load}>Try again</button></div>
        ) : !st ? (
          <div className="bl-center"><span className="spin" /></div>
        ) : st.state !== 'active' ? (
          <div className="card bl-welcome-hero">
            <Icon id="lock" size={72} />
            <h1>No active plan <span className="gt">yet</span></h1>
            <p>Pick a plan to open calm replies, your record and all 28 days of practice.</p>
            <div className="bl-actions" style={{justifyContent: 'center'}}>
              <Link to="/pricing" className="btn btn-primary btn-lg">See plans</Link>
            </div>
          </div>
        ) : (
          <>
            <section className="bl-welcome-hero fade-in">
              <Icon id="party" size={72} />
              <h1>You're in{name ? `, ${name}` : ''}. <span className="gt">Day 1</span> of 28 starts now.</h1>
              <p>One short lesson and a few practice texts a day, about three minutes. The same time each day makes it stick.</p>
            </section>

            <section className="card">
              <div className="card-h"><Icon id="receipt" size={24} />Your plan</div>
              <dl className="bl-dl">
                <div><dt>Plan</dt><dd>{planTitle(st.tier)}</dd></div>
                {lastPaid && <div><dt>Paid today</dt><dd>{usd(lastPaid.amountCents)}{lastPaid.last4 ? ` · test card ·· ${lastPaid.last4}` : ''}</dd></div>}
                {st.renews && st.renewCents != null ? (
                  <div><dt>Next renewal</dt><dd>{usd(st.renewCents)} on {longDate(st.renewsAt)}</dd></div>
                ) : (
                  <div><dt>Active until</dt><dd>{longDate(st.until)}</dd></div>
                )}
                {st.renews && <div><dt>After that</dt><dd>{usd(st.renewCents ?? 0)} every {st.renewLabel} until you cancel</dd></div>}
                {st.refundableUntil && <div><dt>Money-back, no conditions</dt><dd>until {longDate(st.refundableUntil)}</dd></div>}
              </dl>
              <p className="bl-note">Cancel any time in <Link to="/app/settings">Settings</Link>, one click, and nothing renews after the period you paid for. We remind you 3 days before each renewal.</p>
            </section>

            <section className="card">
              <div className="card-h"><Icon id="calendar" size={24} />Reminders</div>
              <p style={{fontWeight: 700}}>Send me the plan & renewal reminders</p>
              <form className="bl-email" onSubmit={save}>
                <input className="field" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com (optional)"
                  value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} aria-label="Email" />
                <button className="btn btn-ghost" disabled={saving || !email.trim()}>{saving ? <span className="spin" /> : 'Save'}</button>
              </form>
              {emailErr && <p className="bl-err" style={{marginTop: 8}}>{emailErr}</p>}
              {saved && !emailErr && <p className="bl-ok">Saved.</p>}
              <p className="bl-note">This build doesn't send email yet, we'll remind you here in the app, in Settings, 3 days before each renewal.</p>
            </section>

            <section className="card">
              <h2 className="bl-h2">Your first <span className="gt">10 minutes</span></h2>
              <div className="bl-rows">
                <div className="bl-row"><Icon id="path" size={40} /><div><b>Do Day 1</b><span>A 2-minute lesson on brief, factual replies, then one drill read the way a judge would read it.</span></div></div>
                <div className="bl-row"><Icon id="reply" size={40} /><div><b>Answer the message you're dreading</b><span>Paste it into the reply coach. Replies are unlimited now.</span></div></div>
                <div className="bl-row"><Icon id="record" size={40} /><div><b>Start the record</b><span>Log the last incident or import a chat, the timeline builds itself from there.</span></div></div>
              </div>
            </section>

            {pending ? (
              <>
                <Link to={'/app/reply?text=' + encodeURIComponent(pending)} className="btn btn-primary btn-lg btn-block" onClick={() => { clearPending(); track('welcome_pending_reply'); }}>Answer the message you pasted</Link>
                <Link to="/app/plan" className="btn btn-ghost btn-lg btn-block">Start Day 1 instead</Link>
              </>
            ) : (
              <Link to="/app/plan" className="btn btn-primary btn-lg btn-block">Start Day 1</Link>
            )}
            <p className="bl-legal">Parley is not a law firm and doesn't give legal advice.{me?.demo ? ' Demo case, test payment only.' : ' Test payment, no real card was charged.'}</p>
          </>
        )}
      </main>
    </div>
  );
}

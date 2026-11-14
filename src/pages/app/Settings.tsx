/* /app/settings — plan status, one-click cancel (ends at period end), billing history, and privacy:
   download everything as JSON, delete everything. Both confirmations live inside the page, never confirm(). */
import {useEffect, useState, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {Icon} from '../../components/Icon';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import {longDate, planTitle, shortDate, usd, type BillingStatus} from '../funnel/billing-api';
import '../funnel/billing.css';

export default function Settings() {
  const {me, refresh} = useMe();
  const [st, setSt] = useState<BillingStatus | null>(null);
  const [err, setErr] = useState('');
  const [ask, setAsk] = useState<'cancel' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [actErr, setActErr] = useState('');
  const [deleted, setDeleted] = useState(false);

  const load = () => {
    setErr('');
    api<BillingStatus>('/api/billing/status').then(setSt).catch((e: Error) => setErr(e.message));
  };
  // Re-read whenever the person's clock moves (demo time-travel), so renewals show up.
  useEffect(load, [me?.id, me?.now?.slice(0, 10)]);

  const act = async (path: string, after: (s: BillingStatus) => void) => {
    setBusy(true);
    setActErr('');
    try { after(await api<BillingStatus>(path, {method: 'POST'})); }
    catch (e) { setActErr(e instanceof Error ? e.message : 'That did not work. Try again.'); }
    finally { setBusy(false); }
  };
  const cancel = () => act('/api/billing/cancel', (s) => { setSt(s); setAsk(null); void refresh(); });
  const resume = () => act('/api/billing/resume', (s) => { setSt(s); void refresh(); });

  const del = async () => {
    setBusy(true);
    setActErr('');
    try {
      await api('/api/me/delete', {body: {confirm: true}});
      setDeleted(true);
      setAsk(null);
      await refresh();   // the server forgot us; this makes a fresh, empty guest
    } catch (e) {
      setActErr(e instanceof Error ? e.message : 'Could not delete. Try again.');
    } finally { setBusy(false); }
  };

  if (deleted) {
    return (
      <div className="bl-settings fade-in">
        <section className="card bl-welcome-hero">
          <Icon id="trash" size={72} />
          <h1>Everything is <span className="gt">deleted</span>.</h1>
          <p>Your replies, journal, timeline, plan progress and billing records are gone from Parley, and this browser no longer holds your session.</p>
          <Link to="/" className="btn btn-primary btn-lg">Back to the start</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="bl-settings">
      <header>
        <h1>Privacy <span className="gt">&</span> plan</h1>
        <p>Your plan, your data, and the two buttons that should always be easy to find.</p>
      </header>

      <section className="card">
        {err ? (
          <><p className="bl-err">{err}</p><button className="btn btn-ghost" style={{marginTop: 10}} onClick={load}>Try again</button></>
        ) : !st ? (
          <div className="bl-center" style={{minHeight: 140}}><span className="spin" /></div>
        ) : (
          <PlanCard st={st} ask={ask} setAsk={setAsk} busy={busy} actErr={ask !== 'delete' ? actErr : ''} cancel={cancel} resume={resume} />
        )}
      </section>

      {st && st.history.length > 0 && (
        <section className="card">
          <div className="card-h"><Icon id="receipt" size={24} />Billing history · test mode</div>
          <div className="bl-hist">
            {st.history.map((h) => (
              <div key={h.id}>
                <div>
                  <b>{h.status === 'renewal' ? 'Renewal' : h.status === 'paid' ? 'Payment' : 'Declined'} · {planTitle(h.tier)}</b>
                  <span style={{display: 'block'}}>{longDate(h.at)}{h.last4 ? ` · test card ·· ${h.last4}` : ''}</span>
                </div>
                <b className={h.status === 'declined' ? 'no' : ''}>{h.status === 'declined' ? 'Not charged' : usd(h.amountCents)}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-h"><Icon id="lock" size={24} />Your data</div>
        <div className="bl-privacy">
          <div className="bl-privacy-row">
            <Icon id="download" size={40} />
            <div><b>Download my data</b><span>Everything Parley stores about you, as one JSON file.</span></div>
            <a className="btn btn-ghost" href="/api/me/export" download onClick={() => track('settings_export')}>Download JSON</a>
          </div>
          <div className="bl-privacy-row">
            <Icon id="trash" size={40} />
            <div><b>Delete everything</b><span>Your account, replies, journal, timeline, plan progress and billing records. This can't be undone.</span></div>
            <button className="btn btn-ghost" style={{color: 'var(--warn)'}} onClick={() => { setActErr(''); setAsk(ask === 'delete' ? null : 'delete'); }} disabled={busy}>Delete everything</button>
          </div>
        </div>
        {ask === 'delete' && (
          <div className="bl-confirm danger" role="alertdialog" aria-labelledby="bl-del-t">
            <b id="bl-del-t">Delete everything for good?</b>
            <ul>
              <li>Every reply, journal entry, incident and timeline is removed.</li>
              <li>Your 28-day plan progress and drill answers are removed.</li>
              {st?.state === 'active' && <li>Your plan ends now and never renews.</li>}
              <li>Download your data first if you might need it for court.</li>
            </ul>
            {actErr && <p className="bl-err">{actErr}</p>}
            <div className="bl-actions" style={{marginTop: 4}}>
              <button className="btn bl-btn-danger" onClick={del} disabled={busy}>{busy ? <span className="spin" /> : 'Yes, delete everything'}</button>
              <button className="btn btn-ghost" onClick={() => setAsk(null)} disabled={busy}>Keep my data</button>
            </div>
          </div>
        )}
        <p className="bl-note">The other parent never sees Parley and is never contacted. We don't sell or share your data.</p>
      </section>

      <p className="bl-legal">Parley is not a law firm and doesn't give legal advice.</p>
    </div>
  );
}

function PlanCard({st, ask, setAsk, busy, actErr, cancel, resume}: {
  st: BillingStatus; ask: 'cancel' | 'delete' | null; setAsk: (a: 'cancel' | 'delete' | null) => void; busy: boolean; actErr: string; cancel: () => void; resume: () => void;
}) {
  const head = (chip: ReactNode, title: string) => (
    <div className="bl-plan-head">
      <h2><Icon id="crown" size={40} />{title}</h2>
      {chip}
    </div>
  );

  if (st.state !== 'active') {
    return (
      <>
        {head(<span className="chip chip-amber">{st.state === 'expired' ? 'Ended' : 'No plan'}</span>, st.state === 'expired' ? 'Your plan has ended' : 'No plan yet')}
        <p style={{color: 'var(--mute)'}}>
          {st.state === 'expired'
            ? `It ended on ${longDate(st.until)}. Your record is still here: pick a plan to open it again, or download it below.`
            : 'Calm replies, the judge\'s lens, your record and all 28 days of practice come with a plan. Plans start at $6.99 for the first week.'}
        </p>
        <div className="bl-actions"><Link to="/pricing" className="btn btn-primary">See plans</Link></div>
      </>
    );
  }

  if (st.granted) {
    return (
      <>
        {head(<span className="chip chip-ok">Active</span>, 'Demo plan')}
        <dl className="bl-dl">
          <div><dt>Status</dt><dd>Included with the sample case</dd></div>
          <div><dt>Active until</dt><dd>{longDate(st.until)}</dd></div>
          <div><dt>Renews</dt><dd>No — nothing to cancel</dd></div>
        </dl>
        <p className="bl-note">Want to see the checkout? <Link to="/pricing">Open the paywall</Link> and pay with the test card.</p>
      </>
    );
  }

  return (
    <>
      {head(st.canceled ? <span className="chip chip-amber">Ends {shortDate(st.until)}</span> : <span className="chip chip-ok">Active</span>, planTitle(st.tier))}
      {st.reminderDue && (
        <div className="bl-remind" role="status">
          <Icon id="calendar" size={32} />
          <span><b>Renewal reminder:</b> your plan renews in {st.daysLeft} day{st.daysLeft === 1 ? '' : 's'}, on {longDate(st.renewsAt)}, for {usd(st.renewCents ?? 0)}. Cancel below if you don't want it.</span>
        </div>
      )}
      <dl className="bl-dl">
        <div><dt>Started</dt><dd>{longDate(st.startedAt)}</dd></div>
        {st.canceled ? (
          <>
            <div><dt>Ends</dt><dd>{longDate(st.until)} · {st.daysLeft} day{st.daysLeft === 1 ? '' : 's'} left</dd></div>
            <div><dt>Next charge</dt><dd>None — cancelled {st.canceledAt ? shortDate(st.canceledAt) : ''}</dd></div>
          </>
        ) : (
          <>
            <div><dt>Next renewal</dt><dd>{longDate(st.renewsAt)}</dd></div>
            <div><dt>Renewal price</dt><dd>{usd(st.renewCents ?? 0)} every {st.renewLabel}</dd></div>
          </>
        )}
        {st.refundableUntil && new Date(st.refundableUntil) > new Date(st.now) && (
          <div><dt>Money-back, no conditions</dt><dd>until {longDate(st.refundableUntil)}</dd></div>
        )}
      </dl>

      {actErr && <p className="bl-err" style={{marginTop: 10}}>{actErr}</p>}
      {st.canceled ? (
        <div className="bl-actions">
          <button className="btn btn-primary" onClick={resume} disabled={busy}>{busy ? <span className="spin" /> : 'Keep my plan after all'}</button>
        </div>
      ) : ask === 'cancel' ? (
        <div className="bl-confirm" role="alertdialog" aria-labelledby="bl-cancel-t">
          <b id="bl-cancel-t">Cancel your plan?</b>
          <p>You keep everything until {longDate(st.until)}. After that nothing renews and you won't be charged again. Your journal and timeline stay yours.</p>
          <div className="bl-actions" style={{marginTop: 4}}>
            <button className="btn bl-btn-danger" onClick={cancel} disabled={busy}>{busy ? <span className="spin" /> : 'Yes, cancel'}</button>
            <button className="btn btn-ghost" onClick={() => setAsk(null)} disabled={busy}>Keep my plan</button>
          </div>
        </div>
      ) : (
        <div className="bl-actions">
          <button className="btn btn-ghost" onClick={() => setAsk('cancel')}>Cancel in one click</button>
          <Link to="/app/plan" className="btn btn-quiet">Go to today's plan</Link>
        </div>
      )}
    </>
  );
}

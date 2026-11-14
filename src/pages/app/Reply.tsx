/* The reply coach: paste (or screenshot) what the other parent sent, get a calm reply, see your own draft the way a
   judge would, and keep both sides on the record. One model call per analysis. One job per screen: the empty screen
   takes their message, the result hands back a reply. */
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import type {Channel} from '../../../shared/types';
import {api, ApiError, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import {Compose, type ComposeValue} from './reply/Compose';
import {Result, type AnalysisView} from './reply/Result';
import type {Sample, SampleShot} from './reply/samples';
import './Reply.css';

interface Recent { id: string; createdAt: string; facts: string; incoming: string; heat: number; advice: string; usedVariant: string | null }

const STEPS = ['Reading their texts', 'Leaving out the jabs', 'Finding what needs an answer', 'Writing one calm reply, three ways'];
const CHANNEL_KEY = 'parley.channel';

function lastChannel(): Channel {
  try { const c = localStorage.getItem(CHANNEL_KEY); if (c === 'whatsapp' || c === 'sms' || c === 'email' || c === 'ofw') return c; } catch { /* private mode */ }
  return 'sms';
}
const blank = (): ComposeValue => ({incoming: '', draft: '', images: [], channel: lastChannel()});

export default function Reply() {
  const {me, refresh} = useMe();
  const [params, setParams] = useSearchParams();
  const [form, setFormState] = useState<ComposeValue>(() => ({...blank(), incoming: params.get('text') ?? ''}));
  const [result, setResult] = useState<AnalysisView | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [paywall, setPaywall] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [editing, setEditing] = useState(true);
  const started = useRef<string | null>(null);

  const setForm = useCallback((v: ComposeValue) => {
    setFormState(v);
    try { localStorage.setItem(CHANNEL_KEY, v.channel); } catch { /* private mode */ }
  }, []);

  const loadSide = useCallback(() => {
    api<{items: Recent[]}>('/api/reply/recent').then((r) => setRecent(r.items)).catch(() => {});
  }, []);
  useEffect(loadSide, [loadSide]);

  const run = useCallback(async (v: ComposeValue) => {
    setBusy(true); setError(''); setStep(0);
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1 + (v.draft.trim() ? 1 : 0))), 1800);
    try {
      let a: AnalysisView;
      if (v.images.length) {
        const fd = new FormData();
        for (const f of v.images) fd.append('image', f);
        fd.append('incoming', v.incoming);
        fd.append('draft', v.draft);
        a = await api<AnalysisView>('/api/reply/analyze', {form: fd});
      } else {
        a = await api<AnalysisView>('/api/reply/analyze', {body: {incoming: v.incoming, draft: v.draft}});
      }
      setResult(a); setEditing(false); setPaywall(false);
      setParams({id: a.id}, {replace: true});
      requestAnimationFrame(() => window.scrollTo({top: 0, behavior: 'smooth'}));
      void refresh(); loadSide();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) { setPaywall(true); track('reply_paywall_seen'); }
      else setError((e as Error).message || 'Something went wrong. Please try again.');
    } finally { clearInterval(tick); setBusy(false); }
  }, [refresh, loadSide, setParams]);

  // Arrivals: ?text= from the landing runs at once (the first wow), ?id= reopens a past reply, ?new=1 starts over.
  useEffect(() => {
    const key = params.toString();
    if (started.current === key) return;
    started.current = key;
    const text = params.get('text'), id = params.get('id');
    if (params.get('new')) { setResult(null); setEditing(true); setFormState(blank()); setError(''); setParams({}, {replace: true}); return; }
    if (text && text.trim()) { const v = {...blank(), incoming: text}; setFormState(v); void run(v); return; }
    if (id && id !== result?.id) {
      api<AnalysisView>(`/api/reply/${id}`).then((a) => { setResult(a); setEditing(false); setFormState((f) => ({...f, incoming: a.incoming, draft: a.draft ?? '', images: []})); })
        .catch(() => setParams({}, {replace: true}));
    }
  }, [params, run, setParams, result?.id]);

  function sample(s: Sample) {
    const v = {incoming: s.incoming, draft: s.draft ?? '', images: [], channel: s.channel};
    setForm(v);
    track('reply_sample', {label: s.label});
    void run(v);
  }

  // A sample screenshot goes through the same upload as one a person picks: fetched as a file, read by the model.
  async function sampleShot(s: SampleShot) {
    setError('');
    try {
      const blob = await fetch(s.src).then((r) => { if (!r.ok) throw new Error(); return r.blob(); });
      const f = new File([blob], s.src.split('/').pop() || 'sample.png', {type: blob.type || 'image/png'});
      const v: ComposeValue = {incoming: '', draft: '', images: [f], channel: 'sms'};
      setForm(v);
      track('reply_sample', {label: s.label, shot: true});
      void run(v);
    } catch { setError("The sample screenshot didn't load. Check your connection and try again."); }
  }

  const unlimited = !!me && (me.demo || me.plan.state === 'active');
  const left = me && !unlimited ? me.freeRepliesLeft : null;
  const steps = form.draft.trim() ? [...STEPS, 'Reading your draft like a judge'] : STEPS;
  const showResult = !!result && !editing;
  const edit = () => { if (!result) return; setEditing(true); setFormState((f) => ({...f, incoming: result.incoming, draft: result.draft ?? '', images: []})); };

  return (
    <div className="rc">
      <div className="rc-main">
        {showResult ? (
          <header className="rc-top">
            <button className="rc-back" onClick={() => setParams({new: '1'})}>‹ New message</button>
            <h1 className="rc-sr">Your calm reply</h1>
            <button className="rc-link" onClick={edit}>{result!.draft ? 'Edit and check again' : '+ Check my own draft'}</button>
          </header>
        ) : (
          <header className="rc-head">
            <h1>What did they <span className="gt">send?</span></h1>
          </header>
        )}

        {paywall && (
          <section className="card rc-paywall fade-in">
            <div>
              <b>You've used your 3 free replies.</b>
              <p>The 28-day calm plan gives you unlimited replies, the judge's read on every draft and a court-ready record.</p>
            </div>
            <Link className="btn btn-primary" to="/pricing" onClick={() => track('reply_paywall_click')}>See plans</Link>
          </section>
        )}

        {showResult ? (
          <Result key={result!.id} a={result!} channel={form.channel} onUpdate={(next) => { setResult(next); loadSide(); }} />
        ) : (
          <>
            <Compose value={form} onChange={setForm} onSubmit={() => run(form)} onSample={sample} onShot={(s) => void sampleShot(s)} busy={busy} />
            {busy && (
              <div className="card rc-loading fade-in" aria-live="polite">
                {steps.map((s, i) => (
                  <div key={s} className={'rc-step' + (i < step ? ' done' : i === step ? ' now' : '')}>
                    {i < step ? <i className="rc-tick" /> : i === step ? <span className="spin" /> : <i className="rc-wait" />}{s}
                  </div>
                ))}
              </div>
            )}
            {error && (
              <div className="card rc-error fade-in" role="alert">
                <p>{error}</p>
                <button className="btn btn-ghost" onClick={() => run(form)} disabled={busy}>Try again</button>
              </div>
            )}
          </>
        )}

        <p className="rc-foot">
          {left !== null && !paywall && <>{left > 0 ? `${left} free ${left === 1 ? 'reply' : 'replies'} left` : 'That was your last free reply'} · <Link to="/pricing">Unlimited with the plan</Link><br /></>}
          {!showResult && <>Private. The other parent never sees Parley.<br /></>}
          Parley is not a law firm and doesn't give legal advice.
        </p>
      </div>

      {/* Desktop only, and quiet on purpose: where to go next, and a way back to the last few replies. */}
      <aside className="rc-side">
        {me && (
          <Link to="/app/plan" className="rc-today">
            <span>Day {Math.min(me.day, 28)} of 28</span>
            <b>Today's 2-min drill →</b>
          </Link>
        )}
        {recent.length > 0 && (
          <nav className="rc-recent" aria-label="Recent replies">
            <span className="rc-side-h">Recent</span>
            {recent.slice(0, 3).map((r) => (
              <button key={r.id} className={'rc-recent-i' + (result?.id === r.id && showResult ? ' on' : '')} onClick={() => setParams({id: r.id})}>
                <span>{r.facts || r.incoming}</span>
                <small>{new Date(r.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: me?.tz})}{r.usedVariant ? ' · saved' : ''}</small>
              </button>
            ))}
          </nav>
        )}
      </aside>
    </div>
  );
}

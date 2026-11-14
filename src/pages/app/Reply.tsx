/* The reply coach: paste (or screenshot) what the other parent sent, get three calm replies, see your own draft
   the way a judge would, and keep both sides on the record. One model call per analysis. */
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Icon} from '../../components/Icon';
import {api, ApiError, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import {Compose, type ComposeValue} from './reply/Compose';
import {Result, type AnalysisView} from './reply/Result';
import type {Sample} from './reply/samples';
import './Reply.css';

interface Recent { id: string; createdAt: string; facts: string; incoming: string; heat: number; advice: string; usedVariant: string | null }
interface CaseFile { stats: {messages: number; incidents: number; expenses: number}; patterns: {label: string; detail: string}[] }

const STEPS = ['Reading their message', 'Stripping the insults', 'Finding what needs an answer', 'Writing three calm replies'];

export default function Reply() {
  const {me, refresh} = useMe();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState<ComposeValue>({incoming: params.get('text') ?? '', draft: '', image: null});
  const [result, setResult] = useState<AnalysisView | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [paywall, setPaywall] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [editing, setEditing] = useState(true);
  const started = useRef<string | null>(null);

  const loadSide = useCallback(() => {
    api<{items: Recent[]}>('/api/reply/recent').then((r) => setRecent(r.items)).catch(() => {});
    api<CaseFile>('/api/journal').then(setCaseFile).catch(() => setCaseFile(null));
  }, []);
  useEffect(loadSide, [loadSide]);

  const run = useCallback(async (v: ComposeValue) => {
    setBusy(true); setError(''); setStep(0);
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1 + (v.draft.trim() ? 1 : 0))), 1800);
    try {
      let a: AnalysisView;
      if (v.image) {
        const fd = new FormData();
        fd.append('image', v.image);
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
    if (params.get('new')) { setResult(null); setEditing(true); setForm({incoming: '', draft: '', image: null}); setError(''); setParams({}, {replace: true}); return; }
    if (text && text.trim()) { const v = {incoming: text, draft: '', image: null}; setForm(v); void run(v); return; }
    if (id && id !== result?.id) {
      api<AnalysisView>(`/api/reply/${id}`).then((a) => { setResult(a); setEditing(false); setForm({incoming: a.incoming, draft: a.draft ?? '', image: null}); })
        .catch(() => setParams({}, {replace: true}));
    }
  }, [params, run, setParams, result?.id]);

  function sample(s: Sample) {
    const v = {incoming: s.incoming, draft: s.draft ?? '', image: null};
    setForm(v);
    track('reply_sample', {label: s.label});
    void run(v);
  }

  const unlimited = !!me && (me.demo || me.plan.state === 'active');
  const left = me && !unlimited ? me.freeRepliesLeft : null;
  const steps = form.draft.trim() ? [...STEPS, "Reading your draft like a judge"] : STEPS;

  return (
    <div className="rc">
      <div className="rc-main">
        <header className="rc-head">
          <p className="rc-crumb">Reply coach{result ? ` · ${result.category.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())}` : ''}</p>
          <h1>{result && !editing ? <>Here's a reply <span className="gt">that holds up</span>.</> : <>Read it the way <span className="gt">a judge will</span>.</>}</h1>
          {(!result || editing) && <p className="rc-sub">Paste what they sent. Get a calm, brief reply in seconds, and see how your own draft would read in court.</p>}
        </header>

        {paywall && (
          <section className="card rc-paywall fade-in">
            <Icon id="crown" size={40} />
            <div>
              <b>You've used your 3 free replies.</b>
              <p>Unlock the 28-day calm plan for unlimited replies, the Judge's lens on every draft, your court-ready timeline and daily drills.</p>
            </div>
            <Link className="btn btn-primary" to="/pricing" onClick={() => track('reply_paywall_click')}>See plans</Link>
          </section>
        )}

        {result && !editing ? (
          <>
            <Result key={result.id} a={result} onUpdate={(next) => { setResult(next); loadSide(); }} onEdit={() => { setEditing(true); setForm({incoming: result.incoming, draft: result.draft ?? '', image: null}); }} />
            <div className="rc-again">
              <button className="btn btn-ghost" onClick={() => { setEditing(true); setForm({incoming: result.incoming, draft: result.draft ?? '', image: null}); }}>Edit and check again</button>
              <button className="btn btn-quiet" onClick={() => { setParams({new: '1'}); }}>New message</button>
            </div>
          </>
        ) : (
          <>
            <Compose value={form} onChange={setForm} onSubmit={() => run(form)} onSample={sample} busy={busy} />
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

        {left !== null && !paywall && (
          <p className="rc-left">{left > 0 ? <>{left} free {left === 1 ? 'reply' : 'replies'} left · </> : <>That was your last free reply · </>}<Link to="/pricing">Unlimited with the plan</Link></p>
        )}
        <p className="rc-legal">Parley is not a law firm and doesn't give legal advice.</p>
      </div>

      <aside className="rc-side">
        {caseFile && caseFile.stats.messages + caseFile.stats.incidents > 0 && (
          <section className="card rc-case">
            <div className="card-h">Your case file</div>
            <dl>
              <div><dt>Messages logged</dt><dd>{caseFile.stats.messages}</dd></div>
              <div><dt>Incidents</dt><dd>{caseFile.stats.incidents}</dd></div>
              {caseFile.stats.expenses > 0 && <div><dt>Expenses</dt><dd>{caseFile.stats.expenses}</dd></div>}
            </dl>
            {caseFile.patterns[0] && <p className="rc-pattern"><b>{caseFile.patterns[0].label}</b>{caseFile.patterns[0].detail}</p>}
            <Link to="/app/journal" className="btn btn-quiet rc-side-link">Open journal →</Link>
          </section>
        )}
        <section className="card rc-recent">
          <div className="card-h">Recent replies</div>
          {recent.length === 0 ? <p className="rc-empty">Your replies show up here, so you can reopen and reuse them.</p> : (
            <ul>
              {recent.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <button className={'rc-recent-i' + (result?.id === r.id ? ' on' : '')} onClick={() => setParams({id: r.id})}>
                    <i className={'rc-heat ' + (r.heat >= 55 ? 'hot' : r.heat >= 30 ? 'warm' : 'cool')} />
                    <span>{r.facts || r.incoming}</span>
                    <small>{new Date(r.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}{r.usedVariant ? ' · logged' : ''}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

/* The 1-minute check (/quiz and /quiz/:step). Screen 1 is where ads land, sold the way Coursiv and Finelo sell
   theirs (a "28-day challenge" headline over four illustrated cards: who you are, roughly how old), one tap and
   you are in. Then behaviour questions, one per screen, big icon cards, auto-advance on a single choice; an insight
   (a long reply next to a short one); "your starting point" as five skills in words; a real "building your course".
   Every answer is saved to the server as it is given (POST /api/quiz merges), so /your-plan and the paywall
   can personalise even if someone leaves halfway. Facts on insight screens come only from the spec's list. */
import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {Icon, type IconId} from '../../components/Icon';
import {Logo} from '../../components/Logo';
import {ChannelIcon} from '../../components/ChannelIcon';
import type {Channel} from '../../../shared/types';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import type {QuizAnswers} from '../../../shared/types';
import {LEVEL_TONE, LEVEL_WORD, hardestOf, meaningOf, skillsOf} from '../../../shared/starting-point';
import momYoung from '../../assets/people/mom-25-34.svg';
import momOlder from '../../assets/people/mom-35-45.svg';
import dadYoung from '../../assets/people/dad-25-34.svg';
import dadOlder from '../../assets/people/dad-35-45.svg';
import './funnel.css';

type Opt = {id: string; label: string; sub?: string; icon: IconId; channel?: Channel};
type Q = {kind: 'q'; id: string; mode: 'one' | 'many'; title: ReactNode; sub?: string; options: Opt[]; side: string};
type Insight = {kind: 'insight'; id: string};
type Step = {kind: 'start'; id: 'who'} | Q | Insight | {kind: 'name'; id: 'name'} | {kind: 'result'; id: 'result'} | {kind: 'build'; id: 'build'};

const QS: Record<string, Q> = {
  triggers: {kind: 'q', id: 'triggers', mode: 'many', side: 'Sets it off', title: <>What usually <span className="gt">sets it off</span>?</>,
    sub: 'Pick all that apply. Start with the biggest one.',
    options: [
      {id: 'schedule', label: 'Schedule changes', sub: 'Swaps, late pickups, holidays', icon: 'tr-schedule'},
      {id: 'money', label: 'Money and shared costs', sub: 'Support, fees, who pays what', icon: 'tr-money'},
      {id: 'partner', label: 'A new partner', sub: 'Who is around the kids', icon: 'tr-partner'},
      {id: 'school', label: 'School and health', sub: 'Decisions, appointments, meds', icon: 'tr-school'},
      {id: 'messenger', label: 'The kids carrying messages', sub: '"Tell your mom…" "Ask your dad…"', icon: 'tr-messenger'},
      {id: 'past', label: 'Old arguments', sub: 'Things from before coming back', icon: 'tr-past'},
    ]},
  reaction: {kind: 'q', id: 'reaction', mode: 'one', side: 'First move', title: <>When they text something <span className="gt">unfair</span>, what do you usually do?</>,
    sub: 'Be honest. Nobody sees this but you.',
    options: [
      {id: 'fast', label: 'Answer right away', sub: 'And say exactly what I think', icon: 're-fast'},
      {id: 'long', label: 'Write a long explanation', sub: 'So they finally get it', icon: 're-long'},
      {id: 'quiet', label: 'Go quiet for hours', sub: 'Then answer when I have to', icon: 're-quiet'},
      {id: 'friend', label: 'Screenshot it to a friend', sub: 'Before I decide what to say', icon: 're-friend'},
    ]},
  bait: {kind: 'q', id: 'bait', mode: 'one', side: 'The jab', title: <>A normal question comes with a <span className="gt">jab</span> at the end. You answer…</>,
    sub: '"what time r u dropping them sat? try to be on time for once"',
    options: [
      {id: 'ask', label: 'The question', sub: 'And leave the jab alone', icon: 'on-point'},
      {id: 'both', label: 'Both, to be fair', sub: 'Point by point', icon: 'scripts'},
      {id: 'jab', label: 'The jab first', sub: "It can't go unanswered", icon: 'no-bait'},
    ]},
  asks: {kind: 'q', id: 'asks', mode: 'one', side: 'Asking', title: <>When you need something from them, how do you <span className="gt">ask</span>?</>,
    options: [
      {id: 'time', label: 'With a day and a time', sub: '"Can you confirm by Thu 6pm?"', icon: 'calendar'},
      {id: 'talk', label: '"We need to talk"', sub: 'Then see where it goes', icon: 'chat'},
      {id: 'hint', label: 'I hint and hope', sub: 'Asking feels like a fight', icon: 're-quiet'},
      {id: 'none', label: "I don't ask", sub: 'I just do it myself', icon: 'solo'},
    ]},
  kidsnews: {kind: 'q', id: 'kidsnews', mode: 'one', side: 'Kids', title: <>When the kids bring news from <span className="gt">the other home</span>, you…</>,
    options: [
      {id: 'check', label: 'Check it with the other parent', sub: 'Adult to adult', icon: 'two-homes'},
      {id: 'ask', label: 'Ask the kids for more', sub: 'To get the full story', icon: 'kids'},
      {id: 'vent', label: 'Say what I really think', sub: 'They should know', icon: 'flame'},
      {id: 'let', label: 'Let it go', sub: 'Not worth it', icon: 'smile'},
    ]},
  court: {kind: 'q', id: 'court', mode: 'one', side: 'Court', title: <>Where do things stand with <span className="gt">the court</span>?</>,
    sub: 'This decides what your course puts first.',
    options: [
      {id: 'none', label: 'No court involvement', sub: 'We work it out between us', icon: 'court-none'},
      {id: 'mediation', label: 'Mediation', sub: 'Working with a mediator', icon: 'court-mediation'},
      {id: 'active', label: 'Active custody case', sub: 'A case is open, maybe with a lawyer', icon: 'court-active'},
      {id: 'hearing', label: 'A hearing is coming up', sub: 'A date is on the calendar', icon: 'court-hearing'},
      {id: 'modification', label: 'Changing the current order', sub: 'Modification', icon: 'court-modify'},
      {id: 'gal', label: 'A GAL or evaluator is involved', sub: 'Appointed by the court', icon: 'gal'},
    ]},
  goal: {kind: 'q', id: 'goal', mode: 'one', side: 'Goal', title: <>What would help <span className="gt">most</span> right now?</>,
    options: [
      {id: 'fewer_fights', label: 'Fewer fights', sub: 'Shorter threads, less back-and-forth', icon: 'goal-calm'},
      {id: 'record', label: 'A clean record for court', sub: 'Everything dated, in one place', icon: 'goal-record'},
      {id: 'peace', label: 'Peace of mind', sub: 'Less dread when the phone buzzes', icon: 'goal-peace'},
      {id: 'kids', label: 'Keeping the kids out of it', sub: 'They should not carry this', icon: 'goal-kids'},
    ]},
};

const STEPS: Step[] = [
  {kind: 'start', id: 'who'},
  QS.reaction,
  {kind: 'insight', id: 'short'},
  QS.bait, QS.triggers, QS.asks, QS.kidsnews, QS.court, QS.goal,
  {kind: 'name', id: 'name'},
  {kind: 'result', id: 'result'},
  {kind: 'build', id: 'build'},
];
const asked = (s: Step) => s.kind === 'q' || s.kind === 'name' || s.kind === 'start';
const QUESTION_COUNT = STEPS.filter(asked).length;

/* Screen 1. Kept as role + age band in the answers; the role is never said back to anyone. */
const WHO: {role: 'mom' | 'dad'; age: '25_34' | '35_45'; label: string; img: string}[] = [
  {role: 'mom', age: '25_34', label: 'Mom · 25 to 34', img: momYoung},
  {role: 'mom', age: '35_45', label: 'Mom · 35 to 45', img: momOlder},
  {role: 'dad', age: '25_34', label: 'Dad · 25 to 34', img: dadYoung},
  {role: 'dad', age: '35_45', label: 'Dad · 35 to 45', img: dadOlder},
];
const STORE = 'parley_quiz';

function loadLocal(): QuizAnswers {
  try { return JSON.parse(sessionStorage.getItem(STORE) || '{}') as QuizAnswers; } catch { return {}; }
}
const labelOf = (qid: string, id: string) => QS[qid]?.options.find((o) => o.id === id)?.label ?? id;
const asList = (v: QuizAnswers[string]) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []);

export default function Quiz() {
  const params = useParams();
  const nav = useNavigate();
  const {pathname} = useLocation();
  const {refresh} = useMe();
  const idx = Math.min(STEPS.length, Math.max(1, Number(params.step) || 1)) - 1;
  const step = STEPS[idx];
  const [answers, setAnswers] = useState<QuizAnswers>(loadLocal);
  const leaving = useRef(false);

  // Pick up answers saved on the server (another tab, or a reload after sessionStorage was cleared).
  useEffect(() => {
    if (Object.keys(answers).length) return;
    api<{answers: QuizAnswers | null}>('/api/quiz').then((r) => { if (r.answers) setAnswers((a) => ({...r.answers, ...a})); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    leaving.current = false;
    window.scrollTo(0, 0);
    track(idx === 0 ? 'quiz_start' : 'quiz_step', {step: idx + 1, id: step.id, bare: pathname === '/quiz' || undefined});
  }, [idx, step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function save(patch: QuizAnswers) {
    setAnswers((a) => {
      const next = {...a, ...patch};
      try { sessionStorage.setItem(STORE, JSON.stringify(next)); } catch { /* private mode: server copy is enough */ }
      return next;
    });
    return api('/api/quiz', {body: {answers: patch}}).catch(() => {});
  }
  const go = (n: number) => nav(n <= 0 ? '/quiz' : `/quiz/${n + 1}`);
  const next = () => { if (leaving.current) return; leaving.current = true; go(idx + 1); };

  const qNumber = STEPS.slice(0, idx + 1).filter(asked).length;
  const pct = Math.round(((idx + (step.kind === 'build' ? 1 : 0)) / (STEPS.length - 1)) * 100);

  if (step.kind === 'start') {
    return <Start onPick={(w) => { if (leaving.current) return; leaving.current = true; track('quiz_answer', {id: 'who', value: `${w.role}_${w.age}`}); void save({role: w.role, age: w.age}); setTimeout(() => go(1), 220); }} />;
  }

  return (
    <div className="fn-quiz">
      <header className="fn-qtop">
        <div className="fn-qtop-l">
          {step.kind !== 'build' && (
            <button className="fn-back" aria-label="Back" onClick={() => go(idx - 1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          <Logo />
        </div>
        <div className="fn-qprog" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span className="fn-qcount">{step.kind === 'q' || step.kind === 'name' ? `${qNumber} of ${QUESTION_COUNT}` : step.kind === 'build' ? 'Almost there' : step.kind === 'result' ? 'Your result' : "You're not alone in this"}</span>
          <i className="fn-qbar"><i style={{width: `${Math.max(4, pct)}%`}} /></i>
        </div>
      </header>

      <div className="fn-qbody">
        <main className="fn-qmain fade-in" key={idx}>
          {step.kind === 'q' && <Question q={step} value={answers[step.id]} onPick={async (v, advance) => { const p = save({[step.id]: v}); if (advance) { track('quiz_answer', {id: step.id, value: v}); setTimeout(next, 260); } return p; }} onContinue={() => { track('quiz_answer', {id: step.id, value: answers[step.id]}); next(); }} />}
          {step.kind === 'insight' && <InsightScreen id={step.id} answers={answers} onNext={next} />}
          {step.kind === 'name' && <NameStep initial={typeof answers.name === 'string' ? answers.name : ''} onDone={async (name) => { await save({name}); next(); }} />}
          {step.kind === 'result' && <Result answers={answers} onNext={() => { track('quiz_result_view'); next(); }} />}
          {step.kind === 'build' && <Build answers={answers} onDone={async () => { await refresh(); nav('/your-plan'); }} />}
        </main>
        <aside className="fn-qside">
          <SideCard answers={answers} building={step.kind === 'build'} />
        </aside>
      </div>
    </div>
  );
}

function Question({q, value, onPick, onContinue}: {q: Q; value: QuizAnswers[string]; onPick: (v: string | string[], advance: boolean) => unknown; onContinue: () => void}) {
  const picked = asList(value);
  const [flash, setFlash] = useState<string | null>(null);
  function tap(id: string) {
    if (q.mode === 'one') { setFlash(id); void onPick(id, true); return; }
    // Kept in tap order: the first trigger tapped is the one the plan leads with.
    const nextList = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    void onPick(nextList, false);
  }
  return (
    <>
      <h1 className="fn-qh">{q.title}</h1>
      {q.sub && <p className="fn-qsub">{q.sub}</p>}
      <div className={'fn-opts' + (q.options.length > 4 ? ' fn-opts-dense' : '')} role={q.mode === 'one' ? 'radiogroup' : 'group'}>
        {q.options.map((o) => {
          const on = q.mode === 'one' ? (flash ?? value) === o.id : picked.includes(o.id);
          return (
            <button key={o.id} className={'fn-opt' + (on ? ' on' : '')} role={q.mode === 'one' ? 'radio' : 'checkbox'} aria-checked={on} onClick={() => tap(o.id)}>
              {o.channel ? <span className="fn-chan"><ChannelIcon channel={o.channel} size={26} /></span> : <Icon id={o.icon} size={44} />}
              <span className="fn-opt-t"><b>{o.label}</b>{o.sub && <small>{o.sub}</small>}</span>
              <i className={'fn-tick' + (q.mode === 'many' ? ' sq' : '')} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {q.mode === 'many' && (
        <div className="fn-qcta">
          <button className="btn btn-primary btn-lg btn-block" disabled={!picked.length} onClick={onContinue}>Continue</button>
          {!picked.length && <p className="fn-qhint">Pick at least one</p>}
        </div>
      )}
    </>
  );
}

function NameStep({initial, onDone}: {initial: string; onDone: (name: string) => Promise<void>}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const submit = async (v: string) => { if (busy) return; setBusy(true); await onDone(v.trim()); };
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(name); }}>
      <h1 className="fn-qh">Last one. What should we <span className="gt">call you</span>?</h1>
      <p className="fn-qsub">Optional. Only used to greet you in the app. A first name or a nickname is plenty.</p>
      <input className="field fn-name" autoFocus maxLength={40} placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
      <div className="fn-qcta">
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <span className="spin" /> : 'See my starting point'}</button>
        <button type="button" className="btn btn-quiet btn-block" disabled={busy} onClick={() => void submit('')}>Skip</button>
      </div>
    </form>
  );
}

/* ---------- insight screens: one idea, one small picture, a sourced fact or a plainly-worded principle ---------- */

function InsightScreen({onNext}: {id: string; answers: QuizAnswers; onNext: () => void}) {
  return (
    <div className="fn-ins">
      <h1 className="fn-qh">Long replies feel fair. They usually make the <span className="gt">thread longer</span>.</h1>
      <div className="card fn-ls">
        <div className="fn-ls-col">
          <small>A long reply</small>
          <p className="fn-lb them">ur late AGAIN</p>
          <p className="fn-lb you">ok first of all i was not late, the school let out at 3:15 and nobody told me about the change, so</p>
          <p className="fn-lb them">here we go</p>
          <p className="fn-lb them">always an excuse w u</p>
          <p className="fn-lb them">and what about last month??</p>
          <p className="fn-lb you dots"><i /><i /><i /></p>
          <b className="warn">Keeps going</b>
        </div>
        <div className="fn-ls-col">
          <small>A short one</small>
          <p className="fn-lb them">ur late AGAIN</p>
          <p className="fn-lb you">On my way, 10 min out.</p>
          <p className="fn-lb them">k.</p>
          <b className="ok">Done</b>
        </div>
        <p className="fn-ls-note">Every extra sentence is something new to argue with. Answering only what they asked is a skill, and it can be practised.</p>
      </div>
      <div className="card fn-ls-next"><Icon id="brief" size={40} /><span><small>In your course</small><b>Week 1 · One message, not five</b></span></div>
      <div className="fn-qcta"><button className="btn btn-primary btn-lg btn-block" onClick={onNext} autoFocus>Continue</button></div>
    </div>
  );
}

/* ---------- "your starting point": five skills in words, read from the answers in code ---------- */

function Result({answers, onNext}: {answers: QuizAnswers; onNext: () => void}) {
  const skills = skillsOf(answers);
  return (
    <div className="fn-res">
      <h1 className="fn-qh">Your <span className="gt">starting point</span></h1>
      <p className="fn-qsub">Based on your answers. These are skills, and skills move.</p>
      <div className="card fn-res-list">
        {skills.map((k) => (
          <div key={k.id} className="fn-res-row">
            <Icon id={k.icon as IconId} size={36} />
            <b>{k.label}</b>
            <span className={`chip chip-${LEVEL_TONE[k.level]}`}>{LEVEL_WORD[k.level]}</span>
          </div>
        ))}
      </div>
      <div className="card fn-res-card"><Icon id={(QS.triggers.options.find((o) => o.id === (Array.isArray(answers.triggers) ? answers.triggers[0] : answers.triggers))?.icon ?? 'tr-schedule') as IconId} size={40} /><span><small>Hardest for you</small><b>{hardestOf(answers)}</b></span></div>
      <div className="card fn-res-card"><Icon id="path" size={40} /><span><small>What this means</small><b>{meaningOf(skills)}</b></span></div>
      <div className="fn-qcta"><button className="btn btn-primary btn-lg btn-block" onClick={onNext}>Build my course</button></div>
    </div>
  );
}

/* ---------- the side card: their answers filling in, like larpmotion's "your workspace" ---------- */

function SideCard({answers, building}: {answers: QuizAnswers; building: boolean}) {
  const rows = ['reaction', 'triggers', 'court', 'goal'].map((k) => {
    const v = asList(answers[k]);
    return {k, label: QS[k].side, value: v.length ? (k === 'triggers' ? labelOf(k, v[0]) : v.map((x) => labelOf(k, x)).join(', ')) : ''};
  });
  return (
    <div className="card fn-side">
      <div className="card-h"><Icon id="path" size={24} />{building ? 'Building your course' : 'Your course'}</div>
      {rows.map((r) => (
        <div key={r.k} className="fn-side-row"><span>{r.label}</span><b className={r.value ? '' : 'empty'}>{r.value || '·'}</b></div>
      ))}
      <p className="fn-side-note"><Icon id="lock" size={22} />Private. Only you see your answers.</p>
    </div>
  );
}

/* ---------- "building your course": real steps from their answers, ~6 s, then Day 1 ---------- */

function Build({answers, onDone}: {answers: QuizAnswers; onDone: () => Promise<void>}) {
  const react = typeof answers.reaction === 'string' ? labelOf('reaction', answers.reaction).toLowerCase() : '';
  const steps = useMemo(() => [
    react ? `Starting from "${react}"` : 'Reading your answers',
    `More days on ${hardestOf(answers).toLowerCase()}`,
    "Writing practice texts in your co-parent's style",
    'Setting your pace: 3 minutes a day',
  ], [react, answers]);
  const [t, setT] = useState(0);
  const [err, setErr] = useState('');
  const saved = useRef<Promise<unknown> | null>(null);

  async function finish() {
    setErr('');
    try {
      await (saved.current ??= api('/api/quiz', {body: {answers: {}, done: true}}));
      track('quiz_done');
      await onDone();
    } catch {
      saved.current = null;
      setErr('We could not save your answers. Check your connection and try again.');
    }
  }

  useEffect(() => {
    saved.current = api('/api/quiz', {body: {answers: {}, done: true}});
    saved.current.catch(() => {});
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const e = (performance.now() - start) / 6000;
      setT(Math.min(1, e));
      if (e < 1) raf = requestAnimationFrame(tick); else void finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ease so the bar moves like work being done: quick start, a pause on each step, a short finish.
  const pct = Math.round(100 * (1 - Math.pow(1 - t, 1.6)));
  const doneCount = Math.floor(t * steps.length + 0.0001);
  const name = typeof answers.name === 'string' && answers.name ? `, ${answers.name}` : '';
  return (
    <div className="fn-build">
      <div className="fn-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <defs><linearGradient id="fn-rg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#7c5cf0" /><stop offset="1" stopColor="#3f8df5" /></linearGradient></defs>
          <circle cx="60" cy="60" r="52" className="bg" />
          <circle cx="60" cy="60" r="52" className="fg" strokeDasharray={`${(pct / 100) * 326.7} 326.7`} />
        </svg>
        <b><Icon id="path" size={64} /></b>
      </div>
      <h1 className="fn-qh" style={{textAlign: 'center'}}>Building your <span className="gt">course</span>{name}</h1>
      <p className="fn-qsub" style={{marginTop: -12, textAlign: 'center'}}>Picking 28 lessons from what you told us.</p>
      <ul className="card fn-bsteps">
        {steps.map((s, i) => (
          <li key={s} className={i < doneCount ? 'done' : i === doneCount ? 'now' : ''}>
            <i>{i < doneCount ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : i === doneCount ? <span className="spin" /> : null}</i>
            {s}
          </li>
        ))}
      </ul>
      <i className="fn-qbar fn-build-bar"><i style={{width: `${Math.max(4, pct)}%`}} /></i>
      <div className="card fn-wait"><Icon id="shield" size={40} /><span><small>While you wait</small><b>The other parent never sees Parley. Nothing is sent to them.</b></span></div>
      {err && (
        <div className="fn-err">{err} <button className="btn btn-ghost" onClick={() => void finish()}>Try again</button></div>
      )}
      <p className="fn-legal">Parley is not a law firm and doesn't give legal advice. <Link to="/">Home</Link></p>
    </div>
  );
}

/* ---------- screen 1: where ads land. No paste box: the first tap is the first answer. ---------- */

function Start({onPick}: {onPick: (w: (typeof WHO)[number]) => void}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="fn-quiz fn-s1">
      <header className="fn-s1-top">
        <Logo />
        <Link to="/demo" className="fn-s1-demo" onClick={() => track('quiz_demo_link')}><span className="fn-dot" />Jury demo</Link>
      </header>
      <main className="fn-s1-in fade-in">
        <span className="fn-s1-kick">3 minutes a day · 28 days</span>
        <h1 className="fn-s1-h fn-s1-caps">28-day <span className="gt">calm</span> <span style={{whiteSpace: 'nowrap'}}>co-parenting</span> challenge</h1>
        <p className="fn-s1-sub">Stay calm with the other parent, one short lesson a day. Pick yours to start.</p>
        <div className="fn-s1-grid" role="radiogroup" aria-label="Who are you">
          {WHO.map((w) => {
            const id = `${w.role}_${w.age}`;
            return (
              <button key={id} className={'fn-s1-card' + (picked === id ? ' on' : '')} role="radio" aria-checked={picked === id}
                onClick={() => { setPicked(id); onPick(w); }}>
                <img src={w.img} alt="" width={240} height={240} />
                <span className="fn-s1-bar"><b>{w.label}</b><i aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </i></span>
              </button>
            );
          })}
        </div>
        <p className="fn-s1-legal">By continuing you agree to our <Link to="/#faq">Terms</Link> and <Link to="/#privacy">Privacy Policy</Link></p>
      </main>
      <footer className="fn-s1-foot">
        <Link to="/" onClick={() => track('quiz_about_link')}>See how it works</Link>
        <p>Parley is not a law firm and doesn't give legal advice.</p>
      </footer>
    </div>
  );
}

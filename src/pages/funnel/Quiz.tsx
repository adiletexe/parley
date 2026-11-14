/* The 1-minute check (/quiz/:step): one question per screen, big icon cards, auto-advance on a single choice,
   an insight screen after every two or three questions, then a real "building your plan" step.
   Every answer is saved to the server as it is given (POST /api/quiz merges), so /your-plan and the paywall
   can personalise even if someone leaves halfway. Facts on insight screens come only from the spec's list. */
import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {Icon, type IconId} from '../../components/Icon';
import {Logo} from '../../components/Logo';
import {ChannelIcon} from '../../components/ChannelIcon';
import type {Channel} from '../../../shared/types';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import type {QuizAnswers} from '../../../shared/types';
import './funnel.css';

type Opt = {id: string; label: string; sub?: string; icon: IconId; channel?: Channel};
type Q = {kind: 'q'; id: string; mode: 'one' | 'many'; title: ReactNode; sub?: string; options: Opt[]; side: string};
type Insight = {kind: 'insight'; id: string};
type Step = Q | Insight | {kind: 'name'; id: 'name'} | {kind: 'build'; id: 'build'};

const QS: Record<string, Q> = {
  kids: {kind: 'q', id: 'kids', mode: 'one', side: 'Kids', title: <>How many kids move between <span className="gt">two homes</span>?</>,
    sub: 'So the examples you practice with sound like your family.',
    options: [
      {id: '1', label: 'One', sub: 'One child', icon: 'kids-1'},
      {id: '2', label: 'Two', sub: 'Two children', icon: 'kids-2'},
      {id: '3plus', label: 'Three or more', sub: 'A full house', icon: 'kids-3'},
    ]},
  ages: {kind: 'q', id: 'ages', mode: 'many', side: 'Ages', title: <>How <span className="gt">old</span> are they?</>,
    sub: 'Pick all that apply.',
    options: [
      {id: 'u5', label: 'Under 5', sub: 'Naps, daycare, handoffs', icon: 'age-baby'},
      {id: '5to9', label: '5 to 9', sub: 'School runs and practices', icon: 'age-school'},
      {id: '10to13', label: '10 to 13', sub: 'Phones, opinions, activities', icon: 'age-tween'},
      {id: '14plus', label: '14 and older', sub: 'Their own plans and voice', icon: 'age-teen'},
    ]},
  channels: {kind: 'q', id: 'channels', mode: 'many', side: 'Messages on', title: <>Where do most messages with <span className="gt">the other parent</span> happen?</>,
    sub: 'Pick all that apply.',
    options: [
      {id: 'sms', label: 'Text messages', sub: 'iMessage or SMS', icon: 'ch-text'},
      {id: 'whatsapp', label: 'WhatsApp', sub: 'Chats and voice notes', icon: 'ask', channel: 'whatsapp'},
      {id: 'email', label: 'Email', sub: 'Longer back-and-forth', icon: 'ch-email'},
      {id: 'ofw', label: 'OurFamilyWizard', sub: 'Co-parenting app', icon: 'ch-ofw'},
      {id: 'talkingparents', label: 'TalkingParents', sub: 'Co-parenting app', icon: 'ch-tp'},
      {id: 'in_person', label: 'In person or by phone', sub: 'Mostly at handoffs', icon: 'ch-inperson'},
    ]},
  tension: {kind: 'q', id: 'tension', mode: 'one', side: 'Tense messages', title: <>How often do messages <span className="gt">turn tense</span>?</>,
    options: [
      {id: 'rarely', label: 'Rarely', sub: 'Mostly logistics', icon: 'freq-rare'},
      {id: 'monthly', label: 'A few times a month', sub: 'Usually around something specific', icon: 'freq-month'},
      {id: 'weekly', label: 'Every week', sub: 'There is usually something', icon: 'freq-week'},
      {id: 'daily', label: 'Most days', sub: 'Hard to get a break', icon: 'freq-daily'},
    ]},
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
  reaction: {kind: 'q', id: 'reaction', mode: 'many', side: 'First move', title: <>When a hard message lands, what do you <span className="gt">usually do</span>?</>,
    sub: 'There is no wrong answer. Most people do a mix.',
    options: [
      {id: 'fast', label: 'Reply right away', sub: 'Get it over with', icon: 're-fast'},
      {id: 'long', label: 'Write a long explanation', sub: 'So it is finally understood', icon: 're-long'},
      {id: 'quiet', label: 'Go quiet for a while', sub: 'Until it feels safe to answer', icon: 're-quiet'},
      {id: 'friend', label: 'Ask a friend first', sub: '"Does this sound okay?"', icon: 're-friend'},
      {id: 'lawyer', label: 'Run it by my lawyer', sub: 'When it feels serious', icon: 're-lawyer'},
    ]},
  court: {kind: 'q', id: 'court', mode: 'one', side: 'Court', title: <>Where do things stand with <span className="gt">the court</span>?</>,
    sub: 'This decides what your plan puts first.',
    options: [
      {id: 'none', label: 'No court involvement', sub: 'We work it out between us', icon: 'court-none'},
      {id: 'mediation', label: 'Mediation', sub: 'Working with a mediator', icon: 'court-mediation'},
      {id: 'active', label: 'Active custody case', sub: 'A case is open now', icon: 'court-active'},
      {id: 'hearing', label: 'A hearing is coming up', sub: 'A date is on the calendar', icon: 'court-hearing'},
      {id: 'modification', label: 'Changing the current order', sub: 'Modification', icon: 'court-modify'},
    ]},
  support: {kind: 'q', id: 'support', mode: 'one', side: 'Support', title: <>Is anyone else <span className="gt">involved</span>?</>,
    options: [
      {id: 'lawyer', label: 'A lawyer', sub: 'Family-law attorney', icon: 'lawyer'},
      {id: 'gal', label: 'A GAL or custody evaluator', sub: 'Appointed by the court', icon: 'gal'},
      {id: 'both', label: 'Both', sub: 'A lawyer and a GAL or evaluator', icon: 'lawyer-gal'},
      {id: 'nobody', label: 'Not right now', sub: 'Handling it myself', icon: 'solo'},
    ]},
  time: {kind: 'q', id: 'time', mode: 'one', side: 'Time a week', title: <>How much of your week do these messages <span className="gt">take</span>?</>,
    sub: 'Reading, re-reading, drafting, and the hour after.',
    options: [
      {id: 'lt1', label: 'Under an hour', icon: 'time-1'},
      {id: '1to3', label: '1 to 3 hours', icon: 'time-3'},
      {id: '3to6', label: '3 to 6 hours', icon: 'time-6'},
      {id: '6plus', label: 'More than 6 hours', icon: 'time-6p'},
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
  QS.kids, QS.ages, QS.channels,
  {kind: 'insight', id: 'record'},
  QS.tension, QS.triggers, QS.reaction,
  {kind: 'insight', id: 'judge'},
  QS.court, QS.support,
  {kind: 'insight', id: 'lawyer'},
  QS.time, QS.goal,
  {kind: 'insight', id: 'biff'},
  {kind: 'name', id: 'name'},
  {kind: 'build', id: 'build'},
];
const QUESTION_COUNT = STEPS.filter((s) => s.kind === 'q' || s.kind === 'name').length;
const STORE = 'parley_quiz';

function loadLocal(): QuizAnswers {
  try { return JSON.parse(sessionStorage.getItem(STORE) || '{}') as QuizAnswers; } catch { return {}; }
}
const labelOf = (qid: string, id: string) => QS[qid]?.options.find((o) => o.id === id)?.label ?? id;
const asList = (v: QuizAnswers[string]) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []);

export default function Quiz() {
  const params = useParams();
  const nav = useNavigate();
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
    track(idx === 0 ? 'quiz_start' : 'quiz_step', {step: idx + 1, id: step.id});
  }, [idx, step.id]);

  function save(patch: QuizAnswers) {
    setAnswers((a) => {
      const next = {...a, ...patch};
      try { sessionStorage.setItem(STORE, JSON.stringify(next)); } catch { /* private mode: server copy is enough */ }
      return next;
    });
    return api('/api/quiz', {body: {answers: patch}}).catch(() => {});
  }
  const go = (n: number) => nav(n < 0 ? '/' : `/quiz/${n + 1}`);
  const next = () => { if (leaving.current) return; leaving.current = true; go(idx + 1); };

  const qNumber = STEPS.slice(0, idx + 1).filter((s) => s.kind === 'q' || s.kind === 'name').length;
  const pct = Math.round(((idx + (step.kind === 'build' ? 1 : 0)) / (STEPS.length - 1)) * 100);

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
          <span className="fn-qcount">{step.kind === 'q' || step.kind === 'name' ? `${qNumber} of ${QUESTION_COUNT}` : step.kind === 'build' ? 'Almost there' : 'Good to know'}</span>
          <i className="fn-qbar"><i style={{width: `${Math.max(4, pct)}%`}} /></i>
        </div>
      </header>

      <div className="fn-qbody">
        <main className="fn-qmain fade-in" key={idx}>
          {step.kind === 'q' && <Question q={step} value={answers[step.id]} onPick={async (v, advance) => { const p = save({[step.id]: v}); if (advance) { track('quiz_answer', {id: step.id, value: v}); setTimeout(next, 260); } return p; }} onContinue={() => { track('quiz_answer', {id: step.id, value: answers[step.id]}); next(); }} />}
          {step.kind === 'insight' && <InsightScreen id={step.id} answers={answers} onNext={next} />}
          {step.kind === 'name' && <NameStep initial={typeof answers.name === 'string' ? answers.name : ''} onDone={async (name) => { await save({name}); next(); }} />}
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
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <span className="spin" /> : 'Build my plan'}</button>
        <button type="button" className="btn btn-quiet btn-block" disabled={busy} onClick={() => void submit('')}>Skip</button>
      </div>
    </form>
  );
}

/* ---------- insight screens: one idea, one small picture, a sourced fact or a plainly-worded principle ---------- */

function InsightScreen({id, answers, onNext}: {id: string; answers: QuizAnswers; onNext: () => void}) {
  const triggers = asList(answers.triggers);
  const reactions = asList(answers.reaction);
  const court = typeof answers.court === 'string' ? answers.court : 'none';
  let body: ReactNode;
  if (id === 'record') {
    const ch = asList(answers.channels).filter((c) => c !== 'in_person');
    body = (
      <>
        <div className="fn-ins-vis"><RecordVisual channels={ch.length ? ch : ['sms', 'email']} /></div>
        <h1 className="fn-qh">Your messages are <span className="gt">already a record</span>.</h1>
        <p className="fn-qsub">Any text, chat or email can be screenshotted and read in court, sometimes months later. Parley keeps every exchange in one private, dated place, and works solo: the other parent never has to join anything.</p>
        <p className="fn-fact"><Icon id="app-cost" size={28} /><span>Shared co-parenting apps like OurFamilyWizard cost <b>$110–300 a year per parent</b>, and both parents have to sign up.</span></p>
      </>
    );
  } else if (id === 'judge') {
    const t = triggers[0];
    body = (
      <>
        <div className="fn-ins-vis"><JudgeVisual /></div>
        <h1 className="fn-qh">{t ? <>Tense messages about <span className="gt">{TRIGGER_WORD[t] ?? 'the schedule'}</span> are common. Your reply is what counts.</> : <>A judge reads <span className="gt">your</span> messages too.</>}</h1>
        <p className="fn-qsub">In many states, judges weigh which parent supports the child's relationship with the other parent. A calm, brief reply to a hostile message tends to read well. A heated one can cost credibility.</p>
        <p className="fn-fact"><Icon id="judge-lens" size={28} /><span>Parley shows you how your own draft might read to a judge <b>before</b> you send it, phrase by phrase.</span></p>
      </>
    );
  } else if (id === 'lawyer') {
    const inCourt = court === 'active' || court === 'hearing' || court === 'modification';
    body = (
      <>
        <div className="fn-ins-vis"><CostVisual /></div>
        <h1 className="fn-qh">{inCourt ? <>Your lawyer shouldn't have to read <span className="gt">every text</span>.</> : <>Calm, written, dated: what keeps it <span className="gt">out of court</span>.</>}</h1>
        <p className="fn-qsub">{inCourt
          ? 'Lawyers often bill for the time spent reading messages. A clean, dated timeline with the facts pulled out turns a pile of screenshots into a few pages.'
          : 'Contested custody is slow and expensive. Short, factual messages and a tidy record make it easier to settle things between the two of you.'}</p>
        <p className="fn-fact"><Icon id="legal-fees" size={28} /><span>Average divorce attorney fees run about <b>$11,300</b> <small>(Martindale-Nolo)</small>.</span></p>
      </>
    );
  } else {
    const line = reactions.includes('fast') ? 'Replying right away is the most natural thing in the world. The plan builds a short pause into it, so the reply you send is the one you meant.'
      : reactions.includes('long') ? 'Long explanations come from wanting to be understood. The plan helps you say the same thing in under 25 words, which is much harder to argue with.'
      : reactions.includes('quiet') ? 'Going quiet protects you. The plan helps you tell which messages need an answer, and which can safely get none.'
      : 'The plan trains one piece of it a day, with a short lesson and a practice message to answer.';
    body = (
      <>
        <div className="fn-ins-vis"><BiffVisual /></div>
        <h1 className="fn-qh">Brief. Informative. Friendly. Firm. <span className="gt">BIFF</span>.</h1>
        <p className="fn-qsub">BIFF is a method from mediator and author Bill Eddy for answering hostile messages. {line}</p>
        <p className="fn-fact"><Icon id="path" size={28} /><span>Your 28 days: <b>brief and factual</b>, <b>not taking the bait</b>, <b>firm boundaries</b>, <b>court-ready habits</b>.</span></p>
      </>
    );
  }
  return (
    <div className="fn-ins">
      {body}
      <div className="fn-qcta"><button className="btn btn-primary btn-lg btn-block" onClick={onNext} autoFocus>Got it</button></div>
    </div>
  );
}

const TRIGGER_WORD: Record<string, string> = {schedule: 'the schedule', money: 'money', partner: 'a new partner', school: 'school and health', messenger: 'the kids', past: 'the past'};
const CHANNEL_SHORT: Record<string, string> = {sms: 'Text', whatsapp: 'WhatsApp', email: 'Email', ofw: 'OFW', talkingparents: 'TalkingParents'};

function RecordVisual({channels}: {channels: string[]}) {
  const rows = [['Mon', '7:42 PM'], ['Wed', '3:15 PM'], ['Fri', '6:05 PM']];
  return (
    <div className="fn-vrec">
      <div className="fn-vrec-in">{channels.slice(0, 4).map((c, i) => <span key={c} style={{animationDelay: `${i * 90}ms`}}>{CHANNEL_SHORT[c] ?? c}</span>)}</div>
      <svg className="fn-vrec-arrow" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 12h32m-8-8 8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <div className="fn-vrec-log">
        <b>Your record</b>
        {rows.map(([d, t], i) => (
          <div key={d} className="fn-vrec-row" style={{animationDelay: `${300 + i * 140}ms`}}><em>E-{i + 1}</em><span>{d} · {t}</span><i /></div>
        ))}
      </div>
    </div>
  );
}

function JudgeVisual() {
  return (
    <div className="fn-vjudge">
      <div className="fn-vb them">You never think about anyone but yourself. Typical.</div>
      <div className="fn-vb you bad"><span><span className="fn-hl">You always do this</span>, so don't lecture me.</span><em className="chip chip-warn">Reads as hostile</em></div>
      <div className="fn-vb you good">Got it. I'll have them ready at 5:30 on Friday.<em className="chip chip-ok">Calm, on topic</em></div>
    </div>
  );
}

function CostVisual() {
  return (
    <div className="fn-vcost">
      <div className="fn-vcost-pile">{Array.from({length: 7}).map((_, i) => <i key={i} style={{transform: `rotate(${(i % 3) * 4 - 4}deg) translate(${(i % 2) * 8}px, ${i * 7}px)`}} />)}</div>
      <svg className="fn-vrec-arrow" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 12h32m-8-8 8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <div className="fn-vcost-page">
        <b>Timeline</b>
        {['E-1', 'E-2', 'E-3', 'E-4'].map((e) => <div key={e}><em>{e}</em><i /></div>)}
        <small>PDF · dated</small>
      </div>
    </div>
  );
}

function BiffVisual() {
  const L: [string, string][] = [['B', 'Brief'], ['I', 'Informative'], ['F', 'Friendly'], ['F', 'Firm']];
  return <div className="fn-vbiff">{L.map(([l, w], i) => <div key={i} style={{animationDelay: `${i * 110}ms`}}><b>{l}</b><span>{w}</span></div>)}</div>;
}

/* ---------- the side card: their answers filling in, like larpmotion's "your workspace" ---------- */

function SideCard({answers, building}: {answers: QuizAnswers; building: boolean}) {
  const rows = ['kids', 'channels', 'tension', 'triggers', 'court', 'goal'].map((k) => {
    const v = asList(answers[k]);
    return {k, label: QS[k].side, value: v.length ? (k === 'triggers' ? labelOf(k, v[0]) : v.map((x) => labelOf(k, x)).join(', ')) : ''};
  });
  return (
    <div className="card fn-side">
      <div className="card-h"><Icon id="path" size={24} />{building ? 'Building your plan' : 'Your plan'}</div>
      {rows.map((r) => (
        <div key={r.k} className="fn-side-row"><span>{r.label}</span><b className={r.value ? '' : 'empty'}>{r.value || '·'}</b></div>
      ))}
      <p className="fn-side-note"><Icon id="lock" size={22} />Private. Only you see your answers.</p>
    </div>
  );
}

/* ---------- "building your plan": real steps, ~6 s, and the checks Parley actually runs (no reviews) ---------- */

function Build({answers, onDone}: {answers: QuizAnswers; onDone: () => Promise<void>}) {
  const trig = asList(answers.triggers)[0];
  const steps = useMemo(() => [
    'Reading your answers',
    `Choosing practice messages about ${trig ? TRIGGER_WORD[trig] : 'everyday logistics'}`,
    'Ordering 28 lessons for where things stand',
    'Setting up your private record',
    'Tuning the judge’s-lens checks',
  ], [trig]);
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
  const CHECKS: [IconId, string, string][] = [
    ['brief', 'Brief', 'Under 25 words when it can be'],
    ['no-absolutes', 'No "you always" or "you never"', 'Absolutes read as attacks in court'],
    ['on-point', 'Only what was asked', 'Answers the request, skips the bait'],
    ['no-threat', 'Nothing that reads as a threat', 'Flagged before you send'],
  ];
  return (
    <div className="fn-build">
      <div className="fn-ring" style={{['--p' as string]: pct}}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <defs><linearGradient id="fn-rg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#7c5cf0" /><stop offset="1" stopColor="#3f8df5" /></linearGradient></defs>
          <circle cx="60" cy="60" r="52" className="bg" />
          <circle cx="60" cy="60" r="52" className="fg" strokeDasharray={`${(pct / 100) * 326.7} 326.7`} />
        </svg>
        <b>{pct}%</b>
      </div>
      <h1 className="fn-qh" style={{textAlign: 'center'}}>Building your <span className="gt">calm plan</span>{typeof answers.name === 'string' && answers.name ? `, ${answers.name}` : ''}</h1>
      <ul className="fn-bsteps">
        {steps.map((s, i) => (
          <li key={s} className={i < doneCount ? 'done' : i === doneCount ? 'now' : ''}>
            <i>{i < doneCount ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : i === doneCount ? <span className="spin" /> : null}</i>
            {s}
          </li>
        ))}
      </ul>
      <div className="fn-bchecks">
        <div className="card-h">What Parley checks in every reply</div>
        {CHECKS.map(([ic, h, s]) => (
          <div key={h} className="fn-bcheck"><Icon id={ic} size={36} /><span><b>{h}</b><small>{s}</small></span></div>
        ))}
      </div>
      {err && (
        <div className="fn-err">{err} <button className="btn btn-ghost" onClick={() => void finish()}>Try again</button></div>
      )}
      <p className="fn-legal">Parley is not a law firm and doesn't give legal advice. <Link to="/">Home</Link></p>
    </div>
  );
}

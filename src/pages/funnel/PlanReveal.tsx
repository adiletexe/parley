/* /your-plan: the two screens between "building your course" and the paywall (onboarding B).
   1. "Day 1 starts tonight": the 28 days filling in on a calendar, and Day 1 with why it was picked for them.
   2. "By day 28, this is how you reply": the reply their own quiz answer describes, next to the calm one.
   Everything personal is read from the saved answers in code; nothing here is a promise or a score. */
import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Icon} from '../../components/Icon';
import {Logo} from '../../components/Logo';
import {api, track} from '../../lib/api';
import type {QuizAnswers} from '../../../shared/types';
import {dayOneReply, hardestOf, skillsOf, type SkillId} from '../../../shared/starting-point';
import './funnel.css';

const WEEKS = ['Stop the spiral', "Don't take the bait", 'Boundaries', 'Kids first'];

const WHY_DAY1: Record<string, string> = {
  long: 'you said you write long replies. Day 1 shows what a long reply gives them to argue with.',
  fast: 'you said you answer right away. Day 1 is the one question to ask before you do.',
  quiet: 'you said you go quiet for hours. Day 1 shows how one short line ends it sooner.',
  friend: 'you said you check with a friend first. Day 1 gives you the question a good friend would ask.',
};

const BY_28: Record<SkillId, string> = {
  pause: 'Waiting ten minutes before a hard reply',
  bait: 'Answering the ask and skipping the jab',
  short: 'Saying it in one or two lines',
  asks: 'Asking with a day and a time',
  kids: 'Keeping the kids out of the middle',
};

type Data = {answers: QuizAnswers | null; name?: string};

export default function PlanReveal() {
  const nav = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [step, setStep] = useState(1);
  const load = () => { setErr(''); api<Data>('/api/quiz').then(setData).catch(() => setErr('We could not load your course. Check your connection and try again.')); };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (data?.answers) { track('plan_reveal_view', {step}); window.scrollTo(0, 0); } }, [data, step]);

  if (err) return <div className="fn-rev fn-center"><div className="card fn-err-card"><p>{err}</p><button className="btn btn-primary" onClick={load}>Try again</button></div></div>;
  if (!data) return <div className="fn-rev fn-center"><span className="spin" /></div>;
  if (!data.answers) {
    return (
      <div className="fn-rev fn-center">
        <div className="card fn-err-card">
          <Icon id="path" size={48} />
          <h2>Your course starts with a 1-minute check</h2>
          <p>A few quick questions about how messages go, and we build the 28 days around them.</p>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/quiz')}>Take the 1-minute check</button>
        </div>
      </div>
    );
  }
  const a = data.answers;
  return (
    <div className="fn-rev">
      <header className="fn-qtop">
        <div className="fn-qtop-l">
          {step === 2 && <button className="fn-back" aria-label="Back" onClick={() => setStep(1)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>}
          <Logo />
        </div>
        <span className="chip chip-ok">Ready</span>
      </header>
      <main className="fn-ob fade-in" key={step}>
        {step === 1 ? <DayOne answers={a} name={data.name} onNext={() => setStep(2)} /> : <ByDay28 answers={a} onNext={() => { track('plan_reveal_cta', {where: 'price'}); nav('/pricing'); }} />}
      </main>
    </div>
  );
}

function DayOne({answers, name, onNext}: {answers: QuizAnswers; name?: string; onNext: () => void}) {
  const react = typeof answers.reaction === 'string' ? answers.reaction : '';
  return (
    <>
      <h1 className="fn-qh">{name ? `${name}, day 1` : 'Day 1'} starts <span className="gt">tonight</span></h1>
      <div className="card fn-cal" aria-label="Your 28 days">
        <div className="fn-cal-grid">
          {Array.from({length: 28}, (_, i) => (
            <span key={i} className={`fn-cal-d w${Math.floor(i / 7) + 1}` + (i === 0 ? ' one' : '')} style={{animationDelay: `${i * 45}ms`}}>{i + 1}</span>
          ))}
        </div>
        <div className="fn-cal-legend">{WEEKS.map((w, i) => <span key={w}><i className={`w${i + 1}`} />{w}</span>)}</div>
      </div>
      <div className="card fn-d1">
        <small>Day 1 · tonight</small>
        <b>Why replies blow up</b>
        <div className="fn-d1-chips"><span><Icon id="book" size={22} />1-min lesson</span><span><Icon id="target" size={22} />2-min practice</span></div>
        <p>Picked for you: {WHY_DAY1[react] ?? 'it starts where most hard threads start.'} Your practice texts lean on {hardestOf(answers).toLowerCase()}.</p>
      </div>
      <div className="fn-qcta"><button className="btn btn-primary btn-lg btn-block" onClick={onNext}>Continue</button></div>
    </>
  );
}

function ByDay28({answers, onNext}: {answers: QuizAnswers; onNext: () => void}) {
  const ex = dayOneReply(answers);
  // The three skills furthest from "Strong" are the ones day 28 is about.
  const rank = {work: 0, there: 1, strong: 2} as const;
  const also = [...skillsOf(answers)].sort((x, y) => rank[x.level] - rank[y.level]).slice(0, 3);
  return (
    <>
      <h1 className="fn-qh">By day 28, <span className="gt">this</span> is how you reply</h1>
      <div className="card fn-b28">
        <div className="fn-b28-them">{ex.them.map((b) => <p key={b} className="fn-lb them">{b}</p>)}<em>8:14 PM</em></div>
        <small className="warn">Day 1 you</small>
        <p className="fn-lb you before">{ex.before}</p>
        <small className="acc">Day 28 you</small>
        <p className="fn-lb you">{ex.after}</p>
      </div>
      <div className="card fn-also">
        <small>Also by day 28</small>
        {also.map((s) => <p key={s.id}><i aria-hidden="true" />{BY_28[s.id]}</p>)}
      </div>
      <div className="card fn-res-card fn-bonus"><Icon id="reply" size={40} /><span><small>Bonus</small><b>Reply tool for real messages, any time</b></span></div>
      <div className="fn-qcta">
        <button className="btn btn-primary btn-lg btn-block" onClick={onNext}>See my course price</button>
        <p className="fn-legal">A goal, not a promise. Parley is not a law firm and doesn't give legal advice. <Link to="/demo">Sample case</Link></p>
      </div>
    </>
  );
}

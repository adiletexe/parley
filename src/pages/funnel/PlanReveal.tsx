/* /your-plan: what the quiz answers add up to. Everything personal here is computed by the server
   (GET /api/quiz → profile), the chart is explicitly a goal, not a promise or a measurement. */
import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Icon, type IconId} from '../../components/Icon';
import {Logo} from '../../components/Logo';
import {api, track} from '../../lib/api';
import type {QuizAnswers} from '../../../shared/types';
import type {QuizProfile} from '../../../server/routes/quiz';
import './funnel.css';

const LEVEL: Record<QuizProfile['conflictLevel'], {word: string; line: string; chip: string}> = {
  low: {word: 'Low', line: 'Mostly logistics, with the odd flare-up. The plan keeps it that way.', chip: 'chip-ok'},
  medium: {word: 'Medium', line: 'Regular friction around a few topics. Very workable with the right habits.', chip: 'chip-amber'},
  high: {word: 'High', line: 'Frequent, heated messages. This is exactly what the plan is built for.', chip: 'chip-warn'},
};

const WEEKS: {n: number; icon: IconId; title: string; sub: string}[] = [
  {n: 1, icon: 'brief', title: 'Brief & factual', sub: 'Say it in 25 words. Keep only the facts.'},
  {n: 2, icon: 'no-bait', title: "Don't take the bait", sub: 'Gray rock for provocations. Answer only the ask.'},
  {n: 3, icon: 'boundary', title: 'Boundaries & firm requests', sub: 'Clear asks with a deadline, no threats.'},
  {n: 4, icon: 'timeline', title: 'Court-ready habits', sub: 'Log it the same day. Build the timeline.'},
];

function focusLines(a: QuizAnswers, p: QuizProfile): string[] {
  const r = Array.isArray(a.reaction) ? a.reaction : [];
  const out: string[] = [];
  if (r.includes('fast')) out.push('A short pause routine before you hit send');
  if (r.includes('long')) out.push('Replies under 25 words that still say everything');
  if (r.includes('quiet')) out.push('Knowing when a message needs no reply at all');
  if (r.includes('friend') || r.includes('lawyer')) out.push('A second opinion in seconds: the judge’s lens on your draft');
  out.push(`Practice messages about ${p.topTriggerLabel.toLowerCase()}`);
  if (p.courtStage === 'active' || p.courtStage === 'hearing' || p.courtStage === 'modification') out.push('A dated, court-ready PDF timeline of every exchange');
  else out.push('A private, dated record, kept in case you ever need it');
  if (Array.isArray(a.triggers) && a.triggers.includes('messenger')) out.push('Ways to keep the kids out of the message chain');
  return out.slice(0, 4);
}

const hours = (m: number) => (m < 60 ? `${m} min` : `${Math.round((m / 60) * 10) / 10} h`);

export default function PlanReveal() {
  const nav = useNavigate();
  const [data, setData] = useState<{answers: QuizAnswers | null; profile: QuizProfile | null; name?: string} | null>(null);
  const [err, setErr] = useState('');
  const load = () => { setErr(''); api<{answers: QuizAnswers | null; profile: QuizProfile | null; name?: string}>('/api/quiz').then(setData).catch(() => setErr('We could not load your plan. Check your connection and try again.')); };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (data?.profile) track('plan_reveal_view', {level: data.profile.conflictLevel, trigger: data.profile.topTrigger, court: data.profile.courtStage}); }, [data]);

  if (err) return <div className="fn-rev fn-center"><div className="card fn-err-card"><p>{err}</p><button className="btn btn-primary" onClick={load}>Try again</button></div></div>;
  if (!data) return <div className="fn-rev fn-center"><span className="spin" /></div>;
  if (!data.answers || !data.profile) {
    return (
      <div className="fn-rev fn-center">
        <div className="card fn-err-card">
          <Icon id="path" size={48} />
          <h2>Your plan starts with a 1-minute check</h2>
          <p>Eleven quick questions about your situation, and we build the 28 days around them.</p>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/quiz')}>Take the 1-minute check</button>
        </div>
      </div>
    );
  }
  const {answers, profile: p} = data;
  const name = data.name;
  const lvl = LEVEL[p.conflictLevel];
  const goalMinutes = Math.max(20, Math.round(p.minutesPerWeek * 0.35 / 10) * 10);
  const cta = (where: string) => track('plan_reveal_cta', {where});

  return (
    <div className="fn-rev">
      <header className="fn-qtop"><div className="fn-qtop-l"><Logo /></div><Link className="fn-toplink" to="/demo">Sample case for judges</Link></header>
      <main className="fn-rev-in">
        <section className="fn-rev-hero fade-in">
          <span className="fn-pill"><Icon id="party" size={26} />Your plan is ready</span>
          <h1>{name ? <>{name}, here's your <span className="gt">calm plan</span>.</> : <>Here's your <span className="gt">calm plan</span>.</>}</h1>
          <p>28 days, a few minutes a day, built around what you told us.</p>
        </section>

        <div className="fn-rev-grid">
          <section className="card fn-prof">
            <div className="card-h"><Icon id="you-here" size={24} />Where you are today</div>
            <div className="fn-level">
              <div>
                <small>Message tension</small>
                <b>{lvl.word}</b>
              </div>
              <div className="fn-meter" aria-hidden="true"><i style={{width: `${Math.max(12, p.conflictScore * 10)}%`}} /></div>
              <p>{lvl.line}</p>
            </div>
            <dl className="fn-dl">
              <div><dt><Icon id="trigger" size={30} />What sets it off most</dt><dd>{p.topTriggerLabel}</dd></div>
              <div><dt><Icon id="court-active" size={30} />Where things stand</dt><dd>{p.courtStageLabel}</dd></div>
              <div><dt><Icon id="goal" size={30} />What matters most now</dt><dd>{p.focus}</dd></div>
              <div><dt><Icon id="time-3" size={30} />Time on messages</dt><dd>~{hours(p.minutesPerWeek)} a week <span className="fn-arrow">→</span> goal: under {hours(goalMinutes)}</dd></div>
            </dl>
          </section>

          <section className="card fn-chart-card">
            <div className="card-h"><Icon id="chart" size={24} />Tense messages per week</div>
            <TenseChart start={p.tensePerWeek} />
            <p className="fn-chart-note">Your goal, not a promise. It's illustrative: shorter, calmer replies tend to mean shorter threads. You'll see your real numbers in the journal.</p>
          </section>
        </div>

        <section className="card fn-focus">
          <div className="card-h"><Icon id="heart" size={24} />Made for you: {p.goalLabel.toLowerCase()}</div>
          <ul>{focusLines(answers, p).map((l) => <li key={l}><i aria-hidden="true" />{l}</li>)}</ul>
        </section>

        <section className="fn-weeks">
          <h2>What's in your <span className="gt">28 days</span></h2>
          <div className="fn-weeks-grid">
            {WEEKS.map((w) => (
              <div key={w.n} className="card fn-week">
                <Icon id={w.icon} size={44} />
                <small>Week {w.n}</small>
                <b>{w.title}</b>
                <p>{w.sub}</p>
              </div>
            ))}
          </div>
          <div className="fn-tools">
            {([['reply', 'Reply coach', 'Calm replies in seconds'], ['record', 'Private record', 'Every exchange, dated'], ['pdf', 'PDF for your lawyer', 'Numbered, in date order']] as [IconId, string, string][]).map(([ic, t, s]) => (
              <div key={t} className="fn-tool"><Icon id={ic} size={36} /><span><b>{t}</b><small>{s}</small></span></div>
            ))}
          </div>
        </section>

        <section className="fn-rev-cta">
          <Link to="/pricing" className="btn btn-primary btn-lg" onClick={() => cta('unlock')}>Unlock my plan</Link>
          <p>From $6.99 for your first week. Cancel in one click. Parley is not a law firm and doesn't give legal advice.</p>
        </section>
      </main>
    </div>
  );
}

/* Week 1 → 4 bars, starting from their own answer and easing down to roughly a third. */
function TenseChart({start}: {start: number}) {
  const vals = [start, start * 0.75, start * 0.5, start * 0.35].map((v) => Math.max(0.5, Math.round(v * 2) / 2));
  const max = Math.max(...vals);
  return (
    <div className="fn-chart">
      {vals.map((v, i) => (
        <div key={i} className={'fn-bar' + (i === 3 ? ' goal' : '')}>
          <em>{i === 3 ? `~${v}` : v}</em>
          <i style={{height: `${(v / max) * 100}%`, animationDelay: `${i * 120}ms`}} />
          <span>Week {i + 1}</span>
        </div>
      ))}
    </div>
  );
}

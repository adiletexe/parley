/* /app/plan — the 28-day calm-communication plan: day counter, calm-day streak, today's lesson and drill,
   progress from the first drill to now, a calendar reminder, and (demo only) a clock the jury can push forward. */
import {useCallback, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Icon} from '../../components/Icon';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import type {PlanView} from '../../../server/plan-content';
import {DrillCard} from './plan/Drill';
import {DemoClock, Reminder, RenewalNote, Ring, Score, Trend} from './plan/parts';
import './plan/plan.css';

export default function Plan() {
  const {refresh} = useMe();
  const [params, setParams] = useSearchParams();
  const want = params.get('day');
  const [view, setView] = useState<PlanView | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try { setView(await api<PlanView>('/api/plan' + (want ? `?day=${encodeURIComponent(want)}` : ''))); }
    catch (e) { setErr((e as Error).message); }
  }, [want]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { track('plan_view'); }, []);

  if (err && !view) return (
    <div className="pl card"><p>We couldn't load your plan. {err}</p><button className="btn btn-ghost" onClick={() => void load()}>Try again</button></div>
  );
  if (!view) return <div className="pl-loading"><span className="spin" /></div>;

  const today = Math.min(view.day, view.total);
  const isToday = view.viewDay === today;
  const week = Math.ceil(view.viewDay / 7);
  const weekInfo = view.weeks[week - 1];
  const nextDay = today < view.total ? today + 1 : null;
  const pick = (d: number) => { setParams(d === today ? {} : {day: String(d)}); window.scrollTo({top: 0, behavior: 'smooth'}); };
  const moved = () => { setParams({}); void load(); void refresh(); };
  const doneDays = view.days.filter((d) => d.best !== undefined).length;

  return (
    <div className="pl fade-in">
      {view.demo && <DemoClock now={view.now} onMoved={moved} />}

      <header className="pl-head">
        <Ring value={today} total={view.total} />
        <div className="pl-head-t">
          <span className="pl-eyebrow">28-day calm plan · Week {Math.ceil(today / 7) > 4 ? 4 : Math.ceil(today / 7)}</span>
          <h1>{view.day > view.total ? <>Plan <span className="gt">complete</span>.</> : <>Day {today} of {view.total}. <span className="gt">Keep it calm.</span></>}</h1>
          <div className="pl-head-chips">
            <span className="chip chip-ok"><Icon id="flame" size={18} />{view.streak} calm day{view.streak === 1 ? '' : 's'} in a row</span>
            <span className="chip">{doneDays} drill{doneDays === 1 ? '' : 's'} done</span>
            {view.access === 'free' && <span className="chip chip-amber">Free preview: days 1–2</span>}
          </div>
        </div>
      </header>

      {view.renewal?.remind && <RenewalNote renewal={view.renewal} />}

      <div className="pl-grid">
        <div className="pl-main">
          {!isToday && (
            <button className="pl-back" onClick={() => pick(today)}>← Back to today (day {today})</button>
          )}

          {view.locked === 'paywall' && (
            <section className="card pl-lock">
              <Icon id="lock" size={40} />
              <h2>Day {view.viewDay} is part of the <span className="gt">full plan</span>.</h2>
              <p className="pl-mute">Days 1–2 are free. The full 28 days — a lesson and a graded drill every day, your streak and your progress — come with a plan.</p>
              <div className="pl-lock-b">
                <Link to="/pricing" className="btn btn-primary">Unlock all 28 days</Link>
                <button className="btn btn-ghost" onClick={() => pick(1)}>Open day 1</button>
              </div>
            </section>
          )}
          {view.locked === 'upcoming' && (
            <section className="card pl-lock">
              <Icon id="timer" size={40} />
              <h2>Day {view.viewDay} unlocks in {view.viewDay - view.day} day{view.viewDay - view.day === 1 ? '' : 's'}.</h2>
              <p className="pl-mute">One lesson a day sticks better than a weekend binge. Today's is waiting.</p>
              <div className="pl-lock-b"><button className="btn btn-primary" onClick={() => pick(today)}>Go to today</button></div>
            </section>
          )}

          {view.lesson && (
            <section className="card pl-lesson">
              <div className="card-h"><Icon id="book" size={24} />{isToday ? "Today's lesson" : `Day ${view.viewDay} lesson`} · {view.lesson.minutes} min
                <span className="chip pl-chip-right">{view.lesson.skill}</span>
              </div>
              <span className="pl-week">Week {week} · {weekInfo?.title}</span>
              <h2>{view.lesson.title}</h2>
              <div className="pl-read">{view.lesson.read.map((p, i) => <p key={i}>{p}</p>)}</div>
              <div className="pl-example">
                <div className="pl-ex-them"><span>They wrote</span><p>{view.lesson.example.them}</p></div>
                <div className="pl-ex-row">
                  <div className="pl-ex-bad"><span>Instead of</span><p>{view.lesson.example.bad}</p></div>
                  <div className="pl-ex-good"><span>Try</span><p>{view.lesson.example.good}</p></div>
                </div>
                <p className="pl-ex-why"><Icon id="scale" size={22} />{view.lesson.example.why}</p>
              </div>
            </section>
          )}

          {view.drill && (
            <DrillCard day={view.viewDay} drill={view.drill} isToday={isToday} nextDay={nextDay}
              personal={view.personalised} triggerLabel={view.triggerLabel} onGraded={() => void load()} />
          )}
        </div>

        <aside className="pl-side">
          <div className="card pl-side-card">
            <div className="card-h"><Icon id="flame" size={24} />Calm days</div>
            <div className="pl-big"><b>{view.streak}</b><span>in a row{view.activeToday ? ', today included' : view.streak ? ' — practise today to keep it' : view.calmDays ? ` · ${view.calmDays} calm days so far. Today's drill starts a new run.` : " — today's drill starts it"}</span></div>
            <div className="pl-dots" aria-label={`${view.calmDays} calm days so far`}>
              {Array.from({length: view.total}, (_, i) => i + 1).map((d) => (
                <i key={d} className={d > view.day ? 'up' : view.calmList.includes(d) ? 'on' : ''} title={`Day ${d}`} />
              ))}
            </div>
            <p className="pl-mute pl-small">A calm day: you practised (a drill or the reply coach) and sent nothing a judge would flag.</p>
          </div>

          <div className="card pl-side-card">
            <div className="card-h"><Icon id="target" size={24} />Your progress</div>
            {view.firstScore !== null && view.latestScore !== null ? (
              <>
                <div className="pl-from">
                  <div><span>First drill</span><Score value={view.firstScore} size="sm" /></div>
                  <i>→</i>
                  <div><span>Latest best</span><Score value={view.latestScore} size="sm" /></div>
                </div>
                <Trend trend={view.trend} total={view.total} />
                <p className="pl-mute pl-small">Best score per day; dotted line is your first try that day.</p>
              </>
            ) : <p className="pl-mute">Do today's drill to see your score here — then watch it move.</p>}
            <ul className="pl-weeks">
              {view.weeks.map((w) => (
                <li key={w.week} className={w.current ? 'on' : ''}>
                  <div><b>Week {w.week}</b><span>{w.title}</span></div>
                  <div className="pl-weeks-n">
                    <span>{w.drills}/7 drills</span>
                    {w.avgBest !== null && <span>avg {w.avgBest}</span>}
                    {(w.replies > 0 || w.entries > 0) && <span>{w.replies} repl{w.replies === 1 ? 'y' : 'ies'} · {w.entries} logged</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Reminder day={today} total={view.total} />

          <div className="card pl-side-card">
            <div className="card-h"><Icon id="calendar" size={24} />All 28 days</div>
            {[1, 2, 3, 4].map((w) => (
              <div key={w} className="pl-days">
                <span className="pl-days-w">W{w}</span>
                {view.days.filter((d) => d.week === w).map((d) => {
                  return (
                    <button key={d.day} className={`pl-day pl-day-${d.status}` + (d.day === view.viewDay ? ' sel' : '')}
                      disabled={d.status === 'upcoming'} onClick={() => pick(d.day)}
                      title={`Day ${d.day}: ${d.title}${d.best !== undefined ? ` — best ${d.best}` : d.status === 'locked' ? ' (full plan)' : d.status === 'upcoming' ? ' (upcoming)' : ''}`}>
                      {d.status === 'locked' ? <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0110 0v3M5 10h14v11H5z" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg> : d.day}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      </div>
      <p className="pl-legal">Parley is not a law firm and doesn't give legal advice. Lessons are general communication skills.</p>
    </div>
  );
}

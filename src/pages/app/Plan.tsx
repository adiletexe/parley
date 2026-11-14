/* /app/plan (tab "Practice") — one task today, progress in numbers. Day N of 28 and the streak on top; today's drill
   is the page; the skill line, the lesson, the 28 days and the reminder are one quiet row each that open in place.
   Demo people get a small "Demo clock" menu by the header instead of a slab over the page. */
import {useCallback, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Icon} from '../../components/Icon';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import type {PlanView} from '../../../server/plan-content';
import {DrillCard} from './plan/Drill';
import {AllDays, DemoClock, Lesson, Reminder, RenewalNote, Ring, scoreTone, Spark} from './plan/parts';
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
    <div className="pl card"><p>We couldn't load your practice. {err}</p><button className="btn btn-ghost" onClick={() => void load()}>Try again</button></div>
  );
  if (!view) return <div className="pl-loading"><span className="spin" /></div>;

  const today = Math.min(view.day, view.total);
  const isToday = view.viewDay === today;
  const done = view.day > view.total;
  const todayWeek = view.weeks[Math.min(4, Math.ceil(today / 7)) - 1];
  const viewWeek = view.weeks[Math.ceil(view.viewDay / 7) - 1];
  const nextDay = today < view.total ? today + 1 : null;
  // The skill line is the week's skill when this week has drills (its first try → its latest best), else the whole run.
  const wk = Math.ceil(view.viewDay / 7);
  const weekTrend = view.trend.filter((t) => Math.ceil(t.day / 7) === wk);
  const skill = weekTrend.length
    ? {title: viewWeek?.title, from: weekTrend[0].first, to: weekTrend[weekTrend.length - 1].best, trend: weekTrend, n: weekTrend.length, scope: 'this week'}
    : {title: view.trend.length ? 'Calm replies' : viewWeek?.title, from: view.firstScore, to: view.latestScore, trend: view.trend, n: view.trend.length, scope: 'so far'};
  const pick = (d: number) => { setParams(d === today ? {} : {day: String(d)}); window.scrollTo({top: 0, behavior: 'smooth'}); };
  const moved = () => { setParams({}); void load(); void refresh(); };
  const minutes = view.lesson?.minutes ?? 2;

  return (
    <div className="pl fade-in">
      <header className="pl-top">
        <Ring value={today} total={view.total} />
        <div className="pl-top-t">
          <h1>{done ? 'Plan complete' : `Day ${today} of ${view.total}`}</h1>
          <span className="pl-mute">{todayWeek?.title}{!done && <span className="pl-nw"> · {minutes} min</span>}{view.access === 'free' && <span className="pl-nw"> · free: days 1–2</span>}</span>
        </div>
        <div className="pl-top-r">
          <span className="chip chip-ok pl-streak" title={`${view.streak} calm day${view.streak === 1 ? '' : 's'} in a row`}>
            <Icon id="flame" size={20} />{view.streak} day{view.streak === 1 ? '' : 's'}
          </span>
        </div>
        {view.demo && <DemoClock now={view.now} onMoved={moved} />}
      </header>

      {view.renewal?.remind && <RenewalNote renewal={view.renewal} />}

      <div className="pl-grid">
        <div className="pl-main">
          {!isToday && <button className="pl-back" onClick={() => pick(today)}>← Back to today (day {today})</button>}

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

          {view.drill && (
            <DrillCard day={view.viewDay} drill={view.drill} isToday={isToday} nextDay={nextDay}
              personal={view.personalised} triggerLabel={view.triggerLabel} onGraded={() => void load()} />
          )}
        </div>

        <aside className="pl-side">
          <section className="card pl-skill">
            <div className="pl-skill-top">
              <div className="pl-skill-t">
                <b>{skill.title}</b>
                <span className="pl-mute">{skill.from !== null && skill.n ? `${skill.n} drill${skill.n === 1 ? '' : 's'} ${skill.scope} · first → best` : 'Your score shows up after today\'s drill'}</span>
              </div>
              {skill.from !== null && skill.to !== null && skill.n > 0 && (
                <span className="pl-skill-n" aria-label={`First try ${skill.from}, latest best ${skill.to}`}><span>{skill.from}</span><i>→</i><b className={`pl-tone-${scoreTone(skill.to)}`}>{skill.to}</b></span>
              )}
            </div>
            {skill.trend.length > 1 && <Spark trend={skill.trend} />}
            <AllDays view={view} onPick={pick} />
          </section>

          {view.lesson && <Lesson lesson={view.lesson} label={isToday ? `Today's ${view.lesson.minutes}-min lesson` : `Day ${view.viewDay} lesson · ${view.lesson.minutes} min`} />}
          <Reminder day={today} total={view.total} />
        </aside>
      </div>
      <p className="pl-legal">Parley is not a law firm and doesn't give legal advice. Lessons are general communication skills.</p>
    </div>
  );
}

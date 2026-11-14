/* /app/plan (tab "Practice") — one action per screen. Home: the day, the streak, today's rule in one line and one
   button. The session: five messages, tap the reply you'd send. The end: the score, one word, the streak. Writing
   your own reply is a bonus after that, never the page. Demo people get a small "Demo clock" menu by the header. */
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Icon} from '../../components/Icon';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import type {PlanView, SessionResult} from '../../../server/plan-content';
import {BonusDrill} from './plan/Drill';
import {DemoClock, Reminder, RenewalNote, Ring, Spark} from './plan/parts';
import {End, Session, type Pick} from './plan/Session';
import './plan/plan.css';

type Mode = {k: 'home'} | {k: 'session'} | {k: 'end'; result: SessionResult; picks: Pick[]; streakBefore: number};

export default function Plan() {
  const {refresh} = useMe();
  const [view, setView] = useState<PlanView | null>(null);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<Mode>({k: 'home'});
  const [bonus, setBonus] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try { setView(await api<PlanView>('/api/plan')); }
    catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { track('plan_view'); }, []);

  const done = useCallback((result: SessionResult, picks: Pick[]) => {
    setMode({k: 'end', result, picks, streakBefore: view?.streak ?? 0});
    setBonus(false);
    void load(); void refresh();
  }, [view?.streak, load, refresh]);

  if (err && !view) return (
    <div className="pl card"><p>We couldn't load your practice. {err}</p><button className="btn btn-ghost" onClick={() => void load()}>Try again</button></div>
  );
  if (!view) return <div className="pl-loading"><span className="spin" /></div>;

  const today = Math.min(view.day, view.total);
  const finished = view.day > view.total;
  const moved = () => { setMode({k: 'home'}); setBonus(false); void load(); void refresh(); };
  const start = () => { setBonus(false); setMode({k: 'session'}); track('plan_session_start', {day: view.day}); window.scrollTo({top: 0}); };
  const t = view.skillTrend;
  const pct = t.length ? t[t.length - 1].pct : null;
  const bonusCard = bonus && view.drill ? <BonusDrill day={view.viewDay} drill={view.drill} /> : null;

  return (
    <div className="pl fade-in">
      <header className="pl-top">
        <Ring value={today} total={view.total} />
        <h1>{finished ? 'Plan complete' : <>Day {today} <span className="pl-of">of {view.total}</span></>}</h1>
        <span className="chip chip-ok pl-streak" title={`${view.streak} calm day${view.streak === 1 ? '' : 's'} in a row`}>
          <Icon id="flame" size={20} />{view.streak} day{view.streak === 1 ? '' : 's'}
        </span>
        {view.demo && <DemoClock now={view.now} onMoved={moved} />}
      </header>

      {mode.k === 'session' && view.session && (
        <Session session={view.session} onExit={() => setMode({k: 'home'})} onDone={done} />
      )}

      {mode.k === 'end' && (
        <>
          <End result={mode.result} picks={mode.picks} streakBefore={mode.streakBefore} hasBonus={!!view.drill}
            bonusOpen={bonus} onBonus={() => { setBonus(true); track('plan_bonus_open', {day: view.day}); }}
            onDone={() => { setMode({k: 'home'}); setBonus(false); window.scrollTo({top: 0}); }} />
          {bonusCard}
        </>
      )}

      {mode.k === 'home' && (
        <>
          {view.renewal?.remind && <RenewalNote renewal={view.renewal} />}

          {view.session ? (
            <section className="card pl-home">
              <p className="pl-rule">{view.rule}</p>
              {view.sessionToday ? (
                <>
                  <p className="pl-done"><Icon id="party" size={28} />Done today ✓ · {view.sessionToday.correct}/{view.sessionToday.total}</p>
                  <div className="pl-home-b">
                    <button className="btn btn-primary btn-lg" onClick={start}>Practice again</button>
                    {view.drill && !bonus && <button className="btn btn-ghost" onClick={() => setBonus(true)}><Icon id="pencil" size={22} />Write your own reply</button>}
                  </div>
                </>
              ) : (
                <button className="btn btn-primary btn-lg pl-start" onClick={start}>Start today's 2-minute session</button>
              )}
            </section>
          ) : (
            <section className="card pl-home pl-lock">
              <Icon id="lock" size={40} />
              <p className="pl-rule">Day {today} is in the <span className="gt">full plan</span>.</p>
              <Link to="/pricing" className="btn btn-primary btn-lg">Unlock all {view.total} days</Link>
            </section>
          )}

          {bonusCard}

          <section className="card pl-skill" aria-label="Your skill">
            <Icon id="target" size={28} />
            <b>{view.skill}</b>
            {pct !== null ? <span className="pl-skill-n">{pct}%</span> : <span className="pl-mute pl-small">after today</span>}
            {t.length > 1 && <Spark trend={t} />}
          </section>

          <Reminder />
        </>
      )}

      <p className="pl-legal">Parley is not a law firm and doesn't give legal advice.</p>
    </div>
  );
}

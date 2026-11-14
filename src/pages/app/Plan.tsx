/* /app/plan (tab "Practice"). Home: a path of the 28 days in four week sections — done days green with their
   score, today big with "Start · 2 min", missed days to catch up, later days locked. The session: five messages,
   tap the reply you'd send. The end: the score, one word, the streak; back home today's node has turned green.
   Writing your own reply is a bonus after that, never the page. Demo people get a small "Demo clock" pill. */
import {useCallback, useEffect, useState} from 'react';
import {Icon} from '../../components/Icon';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import type {SessionResult, SessionView} from '../../../server/plan-content';
import type {PlanHome} from '../../../server/routes/plan';
import {BonusDrill} from './plan/Drill';
import {DemoClock, Reminder, RenewalNote} from './plan/parts';
import {PathHome, type PathAct} from './plan/Path';
import {End, Session, type Pick} from './plan/Session';
import './plan/plan.css';

type Mode = {k: 'home'} | {k: 'session'; session: SessionView}
  | {k: 'end'; session: SessionView; result: SessionResult; picks: Pick[]; streakBefore: number};

export default function Plan() {
  const {refresh} = useMe();
  const [view, setView] = useState<PlanHome | null>(null);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<Mode>({k: 'home'});
  const [bonus, setBonus] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [opening, setOpening] = useState<string>('');

  const load = useCallback(async () => {
    setErr('');
    try { setView(await api<PlanHome>('/api/plan')); }
    catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { track('plan_view'); }, []);

  const done = useCallback((session: SessionView) => (result: SessionResult, picks: Pick[]) => {
    setMode({k: 'end', session, result, picks, streakBefore: view?.streak ?? 0});
    setBonus(false);
    void load(); void refresh();
  }, [view?.streak, load, refresh]);

  if (err && !view) return (
    <div className="pl card"><p>We couldn't load your practice. {err}</p><button className="btn btn-ghost" onClick={() => void load()}>Try again</button></div>
  );
  if (!view) return <div className="pl-loading"><span className="spin" /></div>;

  const today = Math.min(view.day, view.total);
  const finished = view.day > view.total;
  const perDay = view.session?.questions.length ?? 5;
  const moved = () => { setMode({k: 'home'}); setBonus(false); setCelebrate(null); void load(); void refresh(); };
  const begin = (session: SessionView) => {
    setBonus(false); setCelebrate(null); setMode({k: 'session', session});
    track('plan_session_start', {day: session.day, catchUp: session.day !== view.day});
    window.scrollTo({top: 0});
  };
  const act = async (a: PathAct) => {
    if (a.k === 'bonus') { setBonus(true); track('plan_bonus_open', {day: view.day}); return; }
    if (a.k === 'start') { if (view.session) begin(view.session); return; }
    setOpening(String(a.day)); setErr('');
    try { begin(await api<SessionView>(`/api/plan/session?day=${a.day}`)); }
    catch (e) { setErr((e as Error).message); }
    finally { setOpening(''); }
  };
  const home = (day?: number) => {
    setMode({k: 'home'}); setBonus(false); setCelebrate(day ?? null); window.scrollTo({top: 0});
  };
  const bonusCard = bonus && view.drill ? <BonusDrill day={view.viewDay} drill={view.drill} /> : null;

  return (
    <div className="pl fade-in">
      <header className="pl-top">
        <h1>Practice</h1>
        <span className="chip chip-ok pl-streak" title={`${view.streak} calm day${view.streak === 1 ? '' : 's'} in a row`}>
          <Icon id="flame" size={20} />{view.streak} day{view.streak === 1 ? '' : 's'}
        </span>
        <Reminder />
        {view.demo && <DemoClock now={view.now} onMoved={moved} />}
      </header>

      {mode.k === 'session' && (
        <Session key={mode.session.day} session={mode.session} onExit={() => home()} onDone={done(mode.session)} />
      )}

      {mode.k === 'end' && (
        <>
          <End result={mode.result} picks={mode.picks} streakBefore={mode.streakBefore}
            hasBonus={!!view.drill && mode.session.day === view.day}
            bonusOpen={bonus} onBonus={() => { setBonus(true); track('plan_bonus_open', {day: view.day}); }}
            doneLabel={mode.session.day === view.day ? 'Done — see you tomorrow' : 'Back to my path'}
            onDone={() => home(mode.session.day)} />
          {bonusCard}
        </>
      )}

      {mode.k === 'home' && (
        <>
          <p className="pl-line">
            {finished ? <>All {view.total} days done · keep any day fresh</> : <><b>Day {today} of {view.total}</b> · {perDay} messages a day, about 2 min</>}
          </p>
          {view.renewal?.remind && <RenewalNote renewal={view.renewal} />}
          {err && <p className="pl-err" role="alert">{err}</p>}
          {opening && <p className="pl-mute pl-small pl-opening"><span className="spin" />Opening day {opening}</p>}
          {bonusCard}
          <PathHome key={view.day} view={view} onAct={(a) => void act(a)} celebrate={celebrate} hasBonus={!!view.drill} />
        </>
      )}

      <p className="pl-legal">Parley is not a law firm and doesn't give legal advice.</p>
    </div>
  );
}

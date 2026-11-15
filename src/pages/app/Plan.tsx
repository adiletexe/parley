/* /app/plan, the Course tab. Home: the streak bar on top, then the Duolingo-style path of the 28 days (four weeks,
   done days marked "Day N · Done", a finished week's badge to tap). Around it: the Sunday summary, "next up" (a
   seasonal module), daily practice after day 28 and the modules. A day opens as a short chat with the coach
   (course/DayChat.tsx). Demo people get the "Demo clock" pill to move the sample case through the days. */
import {useCallback, useEffect, useState} from 'react';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import type {PlanHome} from '../../../server/routes/plan';
import {DemoClock, Reminder, RenewalNote} from './plan/parts';
import {PathHome, type PathAct} from './plan/Path';
import {DayChat} from './course/DayChat';
import {WeekSheet} from './course/WeekSheet';
import {DailyCard, ModuleView, ModulesCard, NextModule, RoadCard, StreakBar, SummaryCard} from './course/parts';
import type {CourseHome, LessonPack} from './course/types';
import './plan/plan.css';
import './course/course.css';

type Mode = {k: 'home'} | {k: 'lesson'; pack: LessonPack} | {k: 'week'; n: number} | {k: 'module'; id: string};

export default function Plan() {
  const {me, refresh} = useMe();
  const [view, setView] = useState<PlanHome | null>(null);
  const [home, setHome] = useState<CourseHome | null>(null);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<Mode>({k: 'home'});
  const [opening, setOpening] = useState('');
  const [celebrate, setCelebrate] = useState<number | null>(null);

  const load = useCallback(async () => {
    setErr('');
    try {
      const [v, h] = await Promise.all([api<PlanHome>('/api/plan'), api<CourseHome>('/api/course')]);
      setView(v); setHome(h);
    } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { track('course_view'); }, []);

  const open = async (ref: string) => {
    setOpening(ref); setErr('');
    try {
      const pack = await api<LessonPack>(`/api/course/lesson?ref=${encodeURIComponent(ref)}`);
      setMode({k: 'lesson', pack}); window.scrollTo({top: 0});
      track('course_lesson_open', {ref});
    } catch (e) { setErr((e as Error).message); }
    finally { setOpening(''); }
  };
  const back = (day?: number) => { setMode({k: 'home'}); setCelebrate(day ?? null); window.scrollTo({top: 0}); void load(); void refresh(); };

  if (err && !view) return (
    <div className="pl card"><p>We couldn't load your course. {err}</p><button className="btn btn-ghost" onClick={() => void load()}>Try again</button></div>
  );
  if (!view || !home) return <div className="pl-loading"><span className="spin" /></div>;

  if (mode.k === 'lesson') {
    const pack = mode.pack;
    return <div className="pl"><DayChat key={pack.ref} pack={pack} onExit={() => back()} onDone={() => back(pack.kind === 'day' ? Number(pack.ref.slice(4)) : undefined)} /></div>;
  }
  if (mode.k === 'week') return <div className="pl"><WeekSheet n={mode.n} tz={me?.tz} onClose={() => back()} /></div>;
  if (mode.k === 'module') {
    const m = home.modules.find((x) => x.id === mode.id);
    if (m) return <div className="pl"><ModuleView m={m} titles={m.days} onBack={() => back()} onDay={(n) => void open(`mod:${m.id}:${n}`)} /></div>;
  }

  const today = Math.min(view.day, view.total);
  const finished = view.day > view.total;
  const week = view.weeks.find((w) => w.week === Math.ceil(today / 7));
  const act = (a: PathAct) => {
    if (a.k === 'week') { setMode({k: 'week', n: a.week}); return; }
    if (a.k === 'start') { void open(`day:${today}`); return; }
    if (a.k === 'day') void open(`day:${a.day}`);
  };
  const moved = () => { setCelebrate(null); void load(); void refresh(); };
  // After the 28 days (and always in the sample case, so the jury can see it): what keeps going.
  const after = finished || home.demo;

  return (
    <div className="pl fade-in">
      <header className="pl-top cr-top">
        <div className="cr-title">
          <small>{finished ? 'Course complete · keep it going' : `Week ${week?.week} · ${week?.title}`}</small>
          <h1>{finished ? 'Your course' : <>Day {today} of {view.total}</>}</h1>
        </div>
        <Reminder />
        {view.demo && <DemoClock now={view.now} onMoved={moved} />}
      </header>

      <StreakBar streak={home.streak} tz={me?.tz} />
      {view.renewal?.remind && <RenewalNote renewal={view.renewal} />}
      {err && <p className="pl-err" role="alert">{err}</p>}
      {opening && <p className="pl-mute pl-small pl-opening"><span className="spin" />Opening</p>}

      {finished && home.daily && <DailyCard d={home.daily} finished onStart={() => void open(home.daily!.ref)} />}
      {after && home.next && <NextModule m={home.next} onStart={() => void open(`mod:${home.next!.id}:${home.next!.nextDay}`)} />}
      {home.summary && <SummaryCard s={home.summary} tz={me?.tz} demo={home.demo} />}

      <PathHome key={view.day} view={view} onAct={act} celebrate={celebrate} hasBonus={false} weeksDone={home.weeksDone} />

      <RoadCard road={home.road ?? []} day={home.day} />
      {!finished && home.daily && <DailyCard d={home.daily} finished={false} onStart={() => void open(home.daily!.ref)} />}
      <ModulesCard modules={home.modules} onOpen={(id) => setMode({k: 'module', id})} />

      <p className="pl-legal">A course about communication. Not legal advice, not therapy, and not a court-ordered parenting class. Parley is not a law firm and doesn't give legal advice.</p>
    </div>
  );
}

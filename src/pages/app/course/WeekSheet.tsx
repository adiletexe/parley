/* The end of a week (Progress C): the week's badge with the skills it added, in words, then "you used it for
   real", a two-week calendar of lessons done and tasks tried, the log of what they tried, and the next week. */
import {useEffect, useState} from 'react';
import {Icon, type IconId} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import type {WeekView} from './types';

const WEEK_ICON: Record<number, IconId> = {1: 'brief', 2: 'no-bait', 3: 'boundary', 4: 'timeline'};
const Tick = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const day = (iso: string, tz?: string, o: Intl.DateTimeFormatOptions = {weekday: 'short'}) => new Date(iso).toLocaleDateString('en-US', {...o, timeZone: tz});

export function WeekSheet({n, tz, onClose}: {n: number; tz?: string; onClose: () => void}) {
  const [v, setV] = useState<WeekView | null>(null);
  const [err, setErr] = useState('');
  const [page, setPage] = useState<1 | 2>(1);
  useEffect(() => {
    api<WeekView>(`/api/course/week?n=${n}`).then(setV).catch((e: Error) => setErr(e.message));
    track('course_week_open', {week: n});
  }, [n]);
  useEffect(() => { window.scrollTo({top: 0}); }, [page]);

  if (err) return <section className="card cw"><p>{err}</p><button className="btn btn-ghost" onClick={onClose}>Back to the path</button></section>;
  if (!v) return <div className="pl-loading"><span className="spin" /></div>;

  if (page === 1) {
    const got = v.skills.filter((s) => s.done).length;
    return (
      <section className="cw fade-in" aria-label={`Week ${v.week} badge`}>
        <button className="pl-x cw-x" onClick={onClose} aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg></button>
        <span className="cw-badge"><Icon id="party" size={84} /></span>
        <small className="cs-kick">Week {v.week} badge</small>
        <h1>{v.title}</h1>
        <ul className="card cw-skills">
          {v.skills.map((s) => (
            <li key={s.day} className={s.done ? 'done' : ''}>
              <i>{s.done ? <Tick /> : null}</i>
              <span>{s.you}{!s.done && <small>{s.open ? 'Still practising · catch up any time' : `Day ${s.day}`}</small>}</span>
            </li>
          ))}
        </ul>
        {got < 7 && <p className="cr-fine">A skill you skipped still counts once you catch up on its day.</p>}
        <button className="btn btn-primary btn-lg btn-block" onClick={() => setPage(2)}>See how you used it</button>
      </section>
    );
  }

  const first = v.cal[0];
  return (
    <section className="cw fade-in" aria-label="You used it for real">
      <header className="cw-top"><button className="cr-back" onClick={() => setPage(1)} aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button><h2>You used it for real</h2></header>
      <div className="card cw-cal">
        <div className="cw-grid">
          {v.cal.slice(0, 7).map((d) => <span key={`h${d.day}`} className="cw-wd">{day(d.at, tz, {weekday: 'narrow'})}</span>)}
          {v.cal.map((d) => <span key={d.day} className={'cw-d' + (d.tried ? ' tried' : d.lesson ? ' lesson' : '') + (d.today ? ' today' : '')}>{d.day}</span>)}
        </div>
        <div className="cw-legend"><span><i className="lesson" />Lesson done</span><span><i className="tried" />Tried it for real</span></div>
        {first && <span className="sr-only">Starts {day(first.at, tz, {month: 'short', day: 'numeric'})}</span>}
      </div>
      <ul className="card cw-log">
        {v.log.length ? v.log.map((x) => (
          <li key={x.day}><Icon id="target" size={34} /><span><b>{x.did}</b><small>{day(x.at, tz)} · Day {x.day} task</small></span></li>
        )) : <li className="cw-none">No real-life tries logged this week yet. Each lesson ends with one small thing to try, and the next day asks how it went.</li>}
      </ul>
      {v.next && (
        <div className="card cw-next">
          <Icon id={WEEK_ICON[v.next.week] ?? 'path'} size={44} />
          <span><b>Week {v.next.week} · {v.next.title}</b><small>{v.next.inDays <= 0 ? `Open now, from Day ${v.next.day}: ${v.next.dayTitle}` : v.next.inDays === 1 ? `Opens tomorrow with Day ${v.next.day}, ${v.next.dayTitle}` : `Opens in ${v.next.inDays} days with Day ${v.next.day}`}</small></span>
        </div>
      )}
      <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>Back to the path</button>
    </section>
  );
}

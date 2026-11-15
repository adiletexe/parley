/* The Course home around the path: the streak bar, the Sunday summary, "next up" (a seasonal module), daily
   practice after day 28, the modules list and one module's five days. Counts come from the server; nothing here is
   a score. */
import {Icon, type IconId} from '../../../components/Icon';
import type {CourseHome, ModuleRow, Streak, Summary} from './types';

const WD = (iso: string, tz?: string) => new Date(iso).toLocaleDateString('en-US', {weekday: 'narrow', timeZone: tz});
const MD = (iso: string, tz?: string) => new Date(iso).toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: tz});
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const Tick = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function StreakBar({streak, tz}: {streak: Streak; tz?: string}) {
  return (
    <section className="card cr-streak" aria-label="Calm days">
      <span className="cr-flame"><Icon id="flame" size={40} /></span>
      <div className="cr-streak-t">
        <b>{streak.days ? `${plural(streak.days, 'calm day')} in a row` : 'Start your streak today'}</b>
        <small>A day counts when you do the lesson or send a calm reply through Parley.</small>
      </div>
      <ol className="cr-dots">
        {streak.last7.map((d) => (
          <li key={d.day} className={(d.calm ? 'calm' : '') + (d.today ? ' today' : '')} title={`Day ${d.day}`}>
            <i>{d.calm ? <Tick /> : null}</i><span>{WD(d.at, tz)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SummaryCard({s, tz, demo}: {s: Summary; tz?: string; demo: boolean}) {
  const rows: [IconId, string][] = [
    ['inbox', `${plural(s.messages, 'message')} came in`],
    ['reply', `You answered ${s.calm} calmly`],
    ['no-bait', `You left ${plural(s.skipped, 'jab')} alone`],
    ['path', `${plural(s.lessons, 'lesson')} done`],
  ];
  if (s.hot) rows.splice(2, 0, ['flame', `${plural(s.hot, 'reply', 'replies')} ran hot`]);
  return (
    <section className="card cr-sum" aria-label="Your week">
      <div className="cr-sum-h">
        <span><small>{s.sunday ? 'Sunday summary' : demo ? 'Weekly summary · every Sunday' : 'Your week'}</small><b>{MD(s.from, tz)} to {MD(s.to, tz)}</b></span>
        <Icon id="chart" size={40} />
      </div>
      {s.messages || s.lessons || s.calm
        ? <ul className="cr-sum-rows">{rows.map(([ic, t]) => <li key={t}><Icon id={ic} size={30} />{t}</li>)}</ul>
        : <p className="cr-quiet">A quiet week: nothing came in and no lessons yet. The next text you get is a good one to practise on.</p>}
      {s.coming.length > 0 && (
        <div className="cr-sum-next"><small>Coming up</small>{s.coming.map((c) => <p key={c}>{c}</p>)}</div>
      )}
      <a className="btn btn-ghost btn-block" href={s.pdf} download><Icon id="pdf" size={24} />Send to my lawyer</a>
      <p className="cr-fine">A PDF of this week's record, dated and numbered, to forward yourself.</p>
    </section>
  );
}

export function NextModule({m, onStart}: {m: NonNullable<CourseHome['next']>; onStart: () => void}) {
  return (
    <section className="card cr-next" aria-label="Next up">
      <Icon id={m.icon as IconId} size={52} />
      <div><small>Next up · {m.title} module</small><b>Day {m.nextDay} · {m.dayTitle}</b><span>{m.sub}</span></div>
      <button className="btn btn-primary" onClick={onStart}>{m.done ? 'Continue' : 'Start'}</button>
    </section>
  );
}

export function DailyCard({d, finished, onStart}: {d: NonNullable<CourseHome['daily']>; finished: boolean; onStart: () => void}) {
  const from = d.from === 'record' ? 'Picked from your record' : d.from === 'quiz' ? 'Picked from what you told us' : 'From the practice bank';
  return (
    <section className="card cr-daily" aria-label="Daily practice">
      <div><small>{d.today ? `Day ${d.today.day}${d.today.module ? ` · ${d.today.module}` : ''}` : finished ? 'Daily practice' : 'After day 28 · daily practice'}</small>
        <b>{d.today?.title ?? 'Five texts like yours'}</b>
        <span>{from}{d.topics.length ? `: mostly ${d.topics.slice(0, 2).join(' and ')}` : ''}.{d.next ? ` Tomorrow: ${d.next.title}.` : ''}</span></div>
      <button className={'btn ' + (d.done ? 'btn-ghost' : 'btn-primary')} onClick={onStart}>{d.done ? 'Again' : 'Start · 2 min'}</button>
    </section>
  );
}

export function ModulesCard({modules, onOpen}: {modules: ModuleRow[]; onOpen: (id: string) => void}) {
  return (
    <section className="card cr-mods" aria-label="Seasonal modules">
      <div className="card-h"><Icon id="calendar" size={24} />Seasonal modules · 5 days each</div>
      {modules.map((m) => (
        <button key={m.id} className={'cr-mod' + (m.open ? '' : ' shut')} disabled={!m.open} onClick={() => onOpen(m.id)}>
          <Icon id={m.icon as IconId} size={36} />
          <span><b>{m.title}</b><small>{m.why}</small></span>
          <em>{m.done >= m.total ? 'Done' : m.done ? `${m.done} of ${m.total} days` : m.open ? 'Open' : ''}</em>
        </button>
      ))}
    </section>
  );
}

export function ModuleView({m, titles, onBack, onDay}: {m: ModuleRow; titles: string[]; onBack: () => void; onDay: (n: number) => void}) {
  return (
    <section className="cr-modv fade-in">
      <button className="cr-back" onClick={onBack}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>Course</button>
      <div className="cr-modv-h"><Icon id={m.icon as IconId} size={64} /><small>{m.why}</small><h1>{m.title} <span className="gt">module</span></h1><p>{m.sub}</p></div>
      <ol className="card cr-modv-days">
        {titles.map((t, i) => {
          const n = i + 1, done = n <= m.done, now = n === m.done + 1;
          return (
            <li key={t} className={done ? 'done' : now ? 'now' : ''}>
              <i>{done ? <Tick /> : n}</i>
              <span><b>Day {n} · {t}</b><small>{done ? 'Done' : now ? '1-min lesson, 2-min practice' : 'Any time'}</small></span>
              <button className={'btn ' + (now ? 'btn-primary' : 'btn-ghost')} onClick={() => onDay(n)}>{done ? 'Again' : 'Start'}</button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

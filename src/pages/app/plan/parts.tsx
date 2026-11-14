/* Small pieces of the Practice page: the day ring, the score badge, the skill sparkline, the rows that open in place
   (all 28 days, the lesson, the reminder), the renewal note and the demo clock menu. */
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {Icon, type IconId} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import type {Lesson as LessonT, PlanView} from '../../../../server/plan-content';

export function Ring({value, total, size = 52}: {value: number; total: number; size?: number}) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r, f = Math.min(1, value / total);
  return (
    <svg className="pl-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id="pl-ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c5cf0" /><stop offset="1" stopColor="#3f8df5" /></linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#pl-ring-g)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="pl-ring-n">{Math.min(value, total)}</text>
    </svg>
  );
}

export const scoreTone = (s: number) => (s >= 80 ? 'ok' : s >= 60 ? 'amber' : 'warn');
export const scoreWord = (s: number) => (s >= 80 ? 'Court-safe' : s >= 60 ? 'Getting there' : 'A judge would wince');

export function Score({value, size = 'lg'}: {value: number; size?: 'lg' | 'sm'}) {
  return <span className={`pl-score pl-score-${size} pl-${scoreTone(value)}`}>{value}</span>;
}

/** Best score per drilled day, first drill to latest on x: a line, not a chart. */
export function Spark({trend}: {trend: PlanView['trend']}) {
  const W = 300, H = 44, pad = 4, d0 = trend[0].day, span = Math.max(1, trend[trend.length - 1].day - d0);
  const x = (d: number) => pad + ((d - d0) / span) * (W - pad * 2);
  const lo = Math.min(...trend.map((t) => t.best)), hi = Math.max(lo + 10, ...trend.map((t) => t.best));
  const y = (s: number) => H - pad - ((s - lo) / (hi - lo)) * (H - pad * 2);
  const d = trend.map((t, i) => `${i ? 'L' : 'M'}${x(t.day).toFixed(1)},${y(t.best).toFixed(1)}`).join(' ');
  const last = trend[trend.length - 1];
  return (
    <svg className="pl-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Best drill score by day, ${trend[0].best} to ${last.best}`}>
      <defs><linearGradient id="pl-spark-g" x1="0" x2="1"><stop offset="0" stopColor="#7c5cf0" /><stop offset="1" stopColor="#3f8df5" /></linearGradient></defs>
      <path d={d} fill="none" stroke="url(#pl-spark-g)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** A quiet row that opens in place. Native <details>, so it works with keyboard and screen readers for free. */
function Row({icon, label, className, onOpen, children}: {icon: IconId; label: string; className?: string; onOpen?: () => void; children: ReactNode}) {
  return (
    <details className={'card pl-row ' + (className ?? '')} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) onOpen?.(); }}>
      <summary><Icon id={icon} size={24} /><span>{label}</span><i aria-hidden="true">›</i></summary>
      <div className="pl-row-b">{children}</div>
    </details>
  );
}

/** "See all 28 days": the weekly table and the day grid, behind one link inside the skill card. */
export function AllDays({view, onPick}: {view: PlanView; onPick: (d: number) => void}) {
  return (
    <details className="pl-all">
      <summary>See all {view.total} days <i aria-hidden="true">›</i></summary>
      <div className="pl-all-b">
        {[1, 2, 3, 4].map((w) => (
          <div key={w} className="pl-days">
            <span className="pl-days-w">W{w}</span>
            {view.days.filter((d) => d.week === w).map((d) => (
              <button key={d.day} className={`pl-day pl-day-${d.status}` + (d.day === view.viewDay ? ' sel' : '')}
                disabled={d.status === 'upcoming'} onClick={() => onPick(d.day)}
                aria-label={`Day ${d.day}: ${d.title}${d.best !== undefined ? `, best ${d.best}` : d.status === 'locked' ? ', full plan' : d.status === 'upcoming' ? ', upcoming' : ''}`}
                title={`Day ${d.day}: ${d.title}${d.best !== undefined ? ` — best ${d.best}` : d.status === 'locked' ? ' (full plan)' : d.status === 'upcoming' ? ' (upcoming)' : ''}`}>
                {d.status === 'locked' ? <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0110 0v3M5 10h14v11H5z" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg> : d.day}
              </button>
            ))}
          </div>
        ))}
        <ul className="pl-weeks">
          {view.weeks.map((w) => (
            <li key={w.week} className={w.current ? 'on' : ''}>
              <b>Week {w.week}</b><span className="pl-weeks-t">{w.title}</span>
              <span className="pl-weeks-n">{w.drills}/7{w.avgBest !== null ? ` · avg ${w.avgBest}` : ''}</span>
            </li>
          ))}
        </ul>
        <p className="pl-mute pl-small">{view.calmDays} calm day{view.calmDays === 1 ? '' : 's'} so far. A calm day: you practised (a drill or the reply coach) and sent nothing a judge would flag.</p>
      </div>
    </details>
  );
}

export function Lesson({lesson, label}: {lesson: LessonT; label: string}) {
  return (
    <Row icon="book" label={label} className="pl-lesson" onOpen={() => track('plan_lesson_open', {day: lesson.day})}>
      <span className="chip">{lesson.skill}</span>
      <h2>{lesson.title}</h2>
      <div className="pl-read">{lesson.read.map((p, i) => <p key={i}>{p}</p>)}</div>
      <div className="pl-example">
        <div className="pl-ex-them"><span>They wrote</span><p>{lesson.example.them}</p></div>
        <div className="pl-ex-bad"><span>Instead of</span><p>{lesson.example.bad}</p></div>
        <div className="pl-ex-good"><span>Try</span><p>{lesson.example.good}</p></div>
        <p className="pl-ex-why"><Icon id="scale" size={22} />{lesson.example.why}</p>
      </div>
    </Row>
  );
}

export function Reminder({day, total}: {day: number; total: number}) {
  const [time, setTime] = useState('19:00');
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const href = `/api/plan/ics?time=${encodeURIComponent(time)}&date=${date}`;
  return (
    <Row icon="calendar" label="Remind me daily">
      <p className="pl-mute pl-small">Two minutes a day, {day < total ? `through day ${total}` : 'to keep the habit'}. Works with iPhone, Android and Google Calendar — no email needed.</p>
      <div className="pl-remind-row">
        <label className="pl-remind-time">
          <span>Remind me at</span>
          <input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value || '19:00')} />
        </label>
        <a className="btn btn-ghost" href={href} download="parley-daily-reminder.ics" onClick={() => track('plan_ics_click', {time})}>
          <Icon id="download" size={22} />Add to my calendar
        </a>
      </div>
    </Row>
  );
}

/** Demo people only: a pill by the header that opens three moves of the sample case's clock. */
export function DemoClock({now, onMoved}: {now: string; onMoved: () => void}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  async function move(body: {days?: number; reset?: boolean}, key: string) {
    setBusy(key); setErr('');
    try { await api('/api/demo/forward', {body}); setOpen(false); onMoved(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }
  const date = new Date(now).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
  return (
    <div className="pl-clock" ref={box}>
      <button className="pl-clock-pill" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <Icon id="clock" size={20} />Demo clock<i aria-hidden="true">▾</i>
      </button>
      {open && (
        <div className="pl-clock-menu fade-in" role="menu">
          <span className="pl-clock-now">Sample case · today is {date}</span>
          <button role="menuitem" disabled={!!busy} onClick={() => move({days: 1}, '1')}>{busy === '1' ? <span className="spin" /> : null}+1 day</button>
          <button role="menuitem" disabled={!!busy} onClick={() => move({days: 7}, '7')}>{busy === '7' ? <span className="spin" /> : null}+7 days</button>
          <button role="menuitem" disabled={!!busy} onClick={() => move({reset: true}, 'r')}>{busy === 'r' ? <span className="spin" /> : null}Back to today</button>
          {err && <p className="pl-clock-err">{err}</p>}
        </div>
      )}
    </div>
  );
}

export function RenewalNote({renewal}: {renewal: NonNullable<PlanView['renewal']>}) {
  const when = new Date(renewal.until).toLocaleDateString('en-US', {month: 'long', day: 'numeric'});
  return (
    <div className="card pl-renew fade-in">
      <Icon id="clock" size={32} />
      <div>
        <b>Your plan renews {renewal.daysLeft === 0 ? 'today' : `in ${renewal.daysLeft} day${renewal.daysLeft === 1 ? '' : 's'}`}, on {when}{renewal.price ? ` — ${renewal.price}` : ''}.</b>
        <p>This is the reminder we promised. Keep going, or cancel in one click.</p>
      </div>
      <Link to="/app/settings" className="btn btn-ghost">Manage plan</Link>
    </div>
  );
}

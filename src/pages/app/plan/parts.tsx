/* Small pieces of the plan page: the progress ring, the score badge, the trend sparkline, the reminder and the demo clock. */
import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Icon} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import type {PlanView} from '../../../../server/plan-content';

export function Ring({value, total, size = 92}: {value: number; total: number; size?: number}) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r, f = Math.min(1, value / total);
  return (
    <svg className="pl-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id="pl-ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c5cf0" /><stop offset="1" stopColor="#3f8df5" /></linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#pl-ring-g)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="pl-ring-n">{Math.min(value, total)}</text>
      <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" className="pl-ring-of">of {total}</text>
    </svg>
  );
}

export const scoreTone = (s: number) => (s >= 80 ? 'ok' : s >= 60 ? 'amber' : 'warn');
export const scoreWord = (s: number) => (s >= 80 ? 'Court-safe' : s >= 60 ? 'Getting there' : 'A judge would wince');

export function Score({value, size = 'lg'}: {value: number; size?: 'lg' | 'sm'}) {
  return <span className={`pl-score pl-score-${size} pl-${scoreTone(value)}`}>{value}</span>;
}

/** Best score per drilled day (solid) over first attempts (faint), days 1–28 on x. */
export function Trend({trend, total}: {trend: PlanView['trend']; total: number}) {
  const W = 300, H = 92, pad = 8;
  const x = (d: number) => pad + ((d - 1) / (total - 1)) * (W - pad * 2);
  const y = (s: number) => H - pad - (s / 100) * (H - pad * 2);
  const path = (k: 'first' | 'best') => trend.map((t, i) => `${i ? 'L' : 'M'}${x(t.day).toFixed(1)},${y(t[k]).toFixed(1)}`).join(' ');
  return (
    <svg className="pl-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Drill scores by day">
      <defs><linearGradient id="pl-trend-g" x1="0" x2="1"><stop offset="0" stopColor="#7c5cf0" /><stop offset="1" stopColor="#3f8df5" /></linearGradient></defs>
      {[80, 60].map((v) => <line key={v} x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 4" />)}
      {trend.length > 1 && <path d={path('first')} fill="none" stroke="var(--faint)" strokeWidth="1.5" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />}
      {trend.length > 1 && <path d={path('best')} fill="none" stroke="url(#pl-trend-g)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
      {trend.map((t) => <circle key={t.day} cx={x(t.day)} cy={y(t.best)} r="3" fill="#5b6cf6" />)}
    </svg>
  );
}

export function Reminder({day, total}: {day: number; total: number}) {
  const [time, setTime] = useState('19:00');
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const href = `/api/plan/ics?time=${encodeURIComponent(time)}&date=${date}`;
  return (
    <div className="card pl-side-card">
      <div className="card-h"><Icon id="calendar" size={24} />Daily reminder</div>
      <p className="pl-mute">Two minutes a day, {day < total ? `through day ${total}` : 'to keep the habit'}. Works with iPhone, Android and Google Calendar — no email needed.</p>
      <div className="pl-remind-row">
        <label className="pl-remind-time">
          <span>Remind me at</span>
          <input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value || '19:00')} />
        </label>
        <a className="btn btn-ghost pl-remind-btn" href={href} download="parley-daily-reminder.ics" onClick={() => track('plan_ics_click', {time})}>
          <Icon id="download" size={22} />Add to my calendar
        </a>
      </div>
    </div>
  );
}

export function DemoClock({now, onMoved}: {now: string; onMoved: () => void}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  async function move(body: {days?: number; reset?: boolean}, key: string) {
    setBusy(key); setErr('');
    try { await api('/api/demo/forward', {body}); onMoved(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }
  const date = new Date(now).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
  return (
    <div className="pl-clock">
      <div className="pl-clock-t"><b>Demo clock</b><span>Sample case · today is {date}</span></div>
      <div className="pl-clock-b">
        <button className="btn pl-clock-btn" disabled={!!busy} onClick={() => move({days: 1}, '1')}>{busy === '1' ? <span className="spin" /> : '+1 day'}</button>
        <button className="btn pl-clock-btn pl-clock-main" disabled={!!busy} onClick={() => move({days: 7}, '7')}>{busy === '7' ? <span className="spin" /> : '+7 days'}</button>
        <button className="btn pl-clock-btn pl-clock-quiet" disabled={!!busy} onClick={() => move({reset: true}, 'r')}>{busy === 'r' ? <span className="spin" /> : 'Back to today'}</button>
      </div>
      {err && <p className="pl-clock-err">{err}</p>}
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

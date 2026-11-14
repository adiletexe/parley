/* Small pieces of the Practice page: the day ring, the score badge, the skill sparkline, the reminder row,
   the renewal note and the demo clock menu. */
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {Icon, type IconId} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import type {PlanView} from '../../../../server/plan-content';

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

/** Today's skill, first session per day: a line, not a chart. */
export function Spark({trend}: {trend: PlanView['skillTrend']}) {
  const W = 120, H = 32, pad = 3, d0 = trend[0].day, span = Math.max(1, trend[trend.length - 1].day - d0);
  const x = (d: number) => pad + ((d - d0) / span) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / 100) * (H - pad * 2);
  const d = trend.map((t, i) => `${i ? 'L' : 'M'}${x(t.day).toFixed(1)},${y(t.pct).toFixed(1)}`).join(' ');
  const last = trend[trend.length - 1];
  return (
    <svg className="pl-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Session score by day, ${trend[0].pct}% to ${last.pct}%`}>
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

export function Reminder() {
  const [time, setTime] = useState('19:00');
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const href = `/api/plan/ics?time=${encodeURIComponent(time)}&date=${date}`;
  return (
    <Row icon="calendar" label="Remind me daily">
      <div className="pl-remind-row">
        <label className="pl-remind-time">
          <span>At</span>
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

/* Small pieces of the Practice page: the judge's verdict, the reminder sheet,
   the renewal note and the demo clock menu. */
import {useEffect, useRef, useState, type RefObject} from 'react';
import {Link} from 'react-router-dom';
import {Icon} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import {VERDICT_TEXT, VERDICT_TONE, type Verdict} from '../../../lib/verdict';
import type {PlanView} from '../../../../server/plan-content';

/** The judge's read of a draft as one coloured line: a dot, then the words. Never a number. */
export function VerdictLine({v}: {v: Verdict}) {
  return <b className={`pl-verdict pl-tone-${VERDICT_TONE[v]}`}><i aria-hidden="true" />{VERDICT_TEXT[v]}</b>;
}

/** "Remind me daily": a calendar button in the top bar that opens a small sheet with the time and the .ics link. */
export function Reminder() {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState('19:00');
  const box = useRef<HTMLDivElement>(null);
  useOutside(open, box, () => setOpen(false));
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const href = `/api/plan/ics?time=${encodeURIComponent(time)}&date=${date}`;
  return (
    <div className="pl-clock pl-remind" ref={box}>
      <button className="pl-icon-btn" aria-expanded={open} aria-haspopup="dialog" aria-label="Remind me daily" title="Remind me daily"
        onClick={() => setOpen((o) => !o)}>
        <Icon id="calendar" size={28} />
      </button>
      {open && (
        <div className="pl-clock-menu pl-remind-menu fade-in" role="dialog" aria-label="Remind me daily">
          <b className="pl-remind-h">Remind me daily</b>
          <span className="pl-clock-now">A 3-minute nudge in your own calendar. No email needed.</span>
          <label className="pl-remind-time">
            <span>At</span>
            <input type="time" className="field" value={time} onChange={(e) => setTime(e.target.value || '19:00')} />
          </label>
          <a className="btn btn-primary" href={href} download="parley-daily-reminder.ics" onClick={() => { track('plan_ics_click', {time}); setOpen(false); }}>
            <Icon id="download" size={22} />Add to my calendar
          </a>
        </div>
      )}
    </div>
  );
}

function useOutside(open: boolean, box: RefObject<HTMLDivElement>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open, box, close]);
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
        <Icon id="clock" size={20} />Demo<span className="pl-clock-w"> clock</span><i aria-hidden="true">▾</i>
      </button>
      {open && (
        <div className="pl-clock-menu fade-in" role="menu">
          <span className="pl-clock-now">Sample case · today is {date}</span>
          <button role="menuitem" disabled={!!busy} onClick={() => move({days: 1}, '1')}>{busy === '1' ? <span className="spin" /> : null}+1 day</button>
          <button role="menuitem" disabled={!!busy} onClick={() => move({days: 7}, '7')}>{busy === '7' ? <span className="spin" /> : null}+7 days</button>
          <button role="menuitem" disabled={!!busy} onClick={() => move({days: 17}, '17')}>{busy === '17' ? <span className="spin" /> : null}+17 days (past day 28)</button>
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
        <b>Your plan renews {renewal.daysLeft === 0 ? 'today' : `in ${renewal.daysLeft} day${renewal.daysLeft === 1 ? '' : 's'}`}, on {when}{renewal.price ? `, ${renewal.price}` : ''}.</b>
        <p>This is the reminder we promised. Keep going, or cancel in one click.</p>
      </div>
      <Link to="/app/settings" className="btn btn-ghost">Manage plan</Link>
    </div>
  );
}

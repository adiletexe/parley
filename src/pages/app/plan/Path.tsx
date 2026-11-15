/* The Course home: four weeks as a path of days, Duolingo-shaped but quieter. Each week opens with a tinted
   banner (its skill in a word, or seven dots when folded; never a %); the days sit on a gentle sine with a dotted line between
   them. A node tells its state by shape and colour before anyone reads it: green check = done, big gradient with
   a bubble = today, grey outline = missed (tap to catch up), grey lock = later, lilac lock = needs a plan (unreachable now: the shell locks the whole page without one).
   Positions are computed here, not by CSS, so the line and the nodes are drawn from the same numbers. */
import {useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {Link} from 'react-router-dom';
import {Icon, type IconId} from '../../../components/Icon';
import type {PathDay, PlanHome} from '../../../../server/routes/plan';

const SIZE = {node: 56, today: 76, milestone: 64};
const STEP = 100;      // centre to centre, vertically
const BUBBLE = 40;     // extra room above today for its "Start · 2 min" bubble
const WEEK_ICON: Record<number, IconId> = {1: 'brief', 2: 'no-bait', 3: 'boundary', 4: 'timeline'};

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A week's first tries in a word. The % stays on the server; the founder's rule is no scores on screen. */
const weekWord = (pct: number) => (pct >= 80 ? 'Going well' : pct >= 60 ? 'Getting there' : 'Keep at it');
/** A done day's picks in words, not "4 of 5 right". */
const dayWord = (c: number, t: number) => (c >= t ? 'All calm picks' : c >= t - 1 ? 'Mostly calm picks' : 'Worth another go');

export type PathAct = {k: 'start'} | {k: 'day'; day: number} | {k: 'bonus'} | {k: 'week'; week: number};

export function PathHome({view, onAct, celebrate, hasBonus, weeksDone = []}: {
  view: PlanHome; onAct: (a: PathAct) => void; celebrate: number | null; hasBonus: boolean; weeksDone?: number[];
}) {
  const today = view.day;
  const curWeek = today > view.total ? 4 : Math.ceil(today / 7);
  const [open, setOpen] = useState<Set<number>>(() => new Set([curWeek]));
  const [tip, setTip] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // A finished session: tomorrow's node says so on its own.
  useEffect(() => {
    if (celebrate && celebrate === today && today < view.total) setTip(today + 1);
  }, [celebrate, today, view.total]);

  // Today might sit below the fold on a phone: bring it up once, without a jump if it is already in view.
  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>('[data-today]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > innerHeight - 110 || r.top < 0) el.scrollIntoView({block: 'center', behavior: reduced() ? 'auto' : 'smooth'});
  }, []);

  useEffect(() => {
    if (tip === null) return;
    const away = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.pl-tip') && !t.closest('.pl-node')) setTip(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setTip(null); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [tip]);

  const toggle = (w: number) => setOpen((s) => { const n = new Set(s); if (n.has(w)) n.delete(w); else n.add(w); return n; });

  return (
    <div className="pl-path-home" ref={root}>
      {view.weeks.map((w) => {
        const days = view.path.filter((d) => d.week === w.week);
        const skill = view.weekSkill.find((s) => s.week === w.week);
        const isOpen = open.has(w.week);
        const doneN = days.filter((d) => d.state === 'done').length;
        return (
          <section key={w.week} className={`pl-week pl-week-${w.week}` + (isOpen ? ' open' : '')} aria-label={`Week ${w.week}`}>
            <button className="pl-banner" aria-expanded={isOpen} onClick={() => toggle(w.week)}>
              <Icon id={WEEK_ICON[w.week]} size={40} />
              <span className="pl-banner-t">
                <b>Week {w.week} · {w.title}</b>
                <span>{w.sub}</span>
                {!isOpen && (
                  <span className="pl-banner-dots" aria-label={`7 days, ${doneN} done`}>
                    <em>7 days</em>
                    {days.map((d) => <i key={d.day} className={d.state} />)}
                  </span>
                )}
              </span>
              <span className="pl-banner-v">{skill?.pct != null ? weekWord(skill.pct) : ''}</span>
              <i className="pl-chev" aria-hidden="true">›</i>
            </button>
            {isOpen && (
              <Track demo={view.demo} days={days} today={today} now={view.now} tip={tip} setTip={setTip} onAct={onAct}
                celebrate={celebrate} hasBonus={hasBonus} weekDone={weeksDone.includes(w.week)} />
            )}
          </section>
        );
      })}
    </div>
  );
}

function Track({days, today, now, tip, setTip, onAct, celebrate, hasBonus, weekDone, demo}: {
  demo: boolean; days: PathDay[]; today: number; now: string; tip: number | null; setTip: (d: number | null) => void;
  onAct: (a: PathAct) => void; celebrate: number | null; hasBonus: boolean; weekDone: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(340);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const amp = w < 420 ? 62 : 92;
  const layout = useMemo(() => {
    let y = 52;
    return days.map((d, i) => {
      const big = d.state === 'today' || (d.day === today && d.state === 'paywall');
      const size = big ? SIZE.today : d.milestone ? SIZE.milestone : SIZE.node;
      if (big) y += BUBBLE;
      if (i > 0) y += STEP + (big ? 4 : 0);
      // The phase runs on across weeks (day − 1), so week 2's path continues where week 1's left off.
      return {d, size, big, x: w / 2 + amp * Math.sin((d.day - 1) * 0.95), y};
    });
  }, [days, today, w, amp]);
  const height = (layout.length ? layout[layout.length - 1].y : 0) + 86;

  const seg = layout.slice(1).map((b, i) => {
    const a = layout[i], my = (a.y + b.y) / 2;
    return {d: `M${a.x.toFixed(1)},${a.y} C${a.x.toFixed(1)},${my} ${b.x.toFixed(1)},${my} ${b.x.toFixed(1)},${b.y}`,
      lit: a.d.state === 'done' && (b.d.state === 'done' || b.d.state === 'today')};
  });

  return (
    <div className="pl-track" ref={box} style={{height}}>
      <svg className="pl-line" width={w} height={height} aria-hidden="true">
        {seg.map((s, i) => <path key={i} d={s.d} className={s.lit ? 'lit' : ''} />)}
      </svg>
      {layout.map(({d, size, big, x, y}) => (
        <Node key={d.day} d={d} size={size} big={big} x={x} y={y} w={w} today={today} now={now}
          tipOpen={tip === d.day} setTip={setTip} onAct={onAct} pop={celebrate === d.day && d.state === 'done'} hasBonus={hasBonus}
          badge={weekDone && d.milestone} demo={demo} />
      ))}
    </div>
  );
}

const Check = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Lock = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>;
const Trophy = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4.5a5 5 0 0 1-10 0V4z" fill="currentColor" /><path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5a3 3 0 0 1-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10.5 13.2h3l.5 3.3h-4zM8 17h8a1 1 0 0 1 1 1v2H7v-2a1 1 0 0 1 1-1z" fill="currentColor" /></svg>;

function when(day: number, today: number, now: string) {
  if (day === today + 1) return 'Unlocks tomorrow';
  const t = new Date(new Date(now).getTime() + (day - today) * 86_400_000);
  return `Unlocks ${t.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}`;
}

function Node({d, size, big, x, y, w, today, now, tipOpen, setTip, onAct, pop, hasBonus, badge, demo}: {
  demo: boolean; d: PathDay; size: number; big: boolean; x: number; y: number; w: number; today: number; now: string;
  tipOpen: boolean; setTip: (d: number | null) => void; onAct: (a: PathAct) => void; pop: boolean; hasBonus: boolean; badge: boolean;
}) {
  const isToday = d.day === today;
  // A finished week's last stop is its badge: tap it for the skills it added and the days you tried them for real.
  const label = badge ? `Week ${d.week} done · tap` : d.state === 'done' ? `Day ${d.day} · Done`
    : d.state === 'today' ? `Day ${d.day} · today`
    : d.state === 'missed' ? `Day ${d.day} · catch up`
    : d.state === 'paywall' ? 'With a plan'
    : `Day ${d.day}`;
  const aria = d.state === 'done' ? `Day ${d.day}, done`
    : d.state === 'today' ? `Day ${d.day}, today. Start the 2-minute session`
    : d.state === 'missed' ? `Day ${d.day}, missed. Catch up`
    : d.state === 'paywall' ? `Day ${d.day}, with a plan`
    : `Day ${d.day}, ${when(d.day, today, now).toLowerCase()}`;

  const glyph = badge ? <Icon id="party" size={Math.round(size * 0.7)} /> : d.milestone && d.state !== 'missed' ? <Trophy />
    : d.state === 'done' ? <Check />
    : d.state === 'future' || d.state === 'paywall' ? <Lock />
    : <span>{d.day}</span>;

  const click = () => {
    if (badge) { setTip(null); onAct({k: 'week', week: d.week}); return; }
    if (d.state === 'today') { setTip(null); onAct({k: 'start'}); return; }
    setTip(tipOpen ? null : d.day);
  };

  // The tooltip hangs under the node, kept inside the column.
  const tipW = Math.min(250, w - 8);
  const tipX = Math.max(4, Math.min(w - tipW - 4, x - tipW / 2));

  return (
    <>
      <div className={'pl-stop' + (pop ? ' pop' : '')} style={{left: x, top: y}} {...(isToday ? {'data-today': ''} : {})}>
        {big && (
          <span className={'pl-bubble' + (d.state === 'paywall' ? ' pay' : '')} aria-hidden="true">
            {d.state === 'paywall' ? 'Unlock with a plan' : 'Start · 3 min'}
          </span>
        )}
        <button className={`pl-node ${d.state}` + (d.milestone ? ' ms' : '') + (big ? ' big' : '') + (badge ? ' badge' : '')}
          style={{width: size, height: size}} aria-label={aria} aria-expanded={d.state === 'today' ? undefined : tipOpen} onClick={click}>
          {glyph}
          {d.milestone && d.state === 'done' && <em className="pl-ms-n">{d.day}</em>}
        </button>
        {pop && <span className="pl-burst-dots" aria-hidden="true">{Array.from({length: 10}, (_, k) => <i key={k} style={{'--a': `${k * 36}deg`} as CSSProperties} />)}</span>}
        <span className={`pl-nl ${d.state}` + (badge ? ' badge' : '')}>{label}</span>
      </div>
      {tipOpen && (
        <div className="pl-tip fade-in" role="dialog" aria-label={`Day ${d.day}`} style={{left: tipX, top: y + size / 2 + 34, width: tipW, '--ax': `${x - tipX}px`} as CSSProperties}>
          <b>Day {d.day} · {d.title}</b>
          {d.state === 'done' && (
            <>
              <span className="pl-tip-score"><Check />{d.correct != null ? dayWord(d.correct, d.total ?? 5) : 'Done'}</span>
              <button className="btn btn-primary" onClick={() => { setTip(null); onAct(isToday ? {k: 'start'} : {k: 'day', day: d.day}); }}>Do it again</button>
              {isToday && hasBonus && <button className="btn btn-ghost" onClick={() => { setTip(null); onAct({k: 'bonus'}); }}><Icon id="pencil" size={22} />Write your own reply</button>}
            </>
          )}
          {d.state === 'missed' && (
            <>
              <span>You skipped this one. It still counts.</span>
              <button className="btn btn-primary" onClick={() => { setTip(null); onAct({k: 'day', day: d.day}); }}>Catch up · 2 min</button>
            </>
          )}
          {d.state === 'future' && <span className="pl-tip-when"><Lock />{when(d.day, today, now)}</span>}
          {d.state === 'future' && demo && <button className="btn btn-ghost" onClick={() => { setTip(null); onAct({k: 'day', day: d.day}); }}>Preview this day · jury demo</button>}
          {d.state === 'paywall' && (
            <>
              <span>The course comes with a plan.</span>
              <Link to="/pricing" className="btn btn-primary">See plans</Link>
            </>
          )}
        </div>
      )}
    </>
  );
}

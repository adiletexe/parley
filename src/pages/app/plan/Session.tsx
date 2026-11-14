/* The daily session: five messages, three replies each, tap the one you'd send. One action per screen —
   the bubble, the question, three cards; the tag under a card is the only explanation anyone gets. */
import {useCallback, useEffect, useRef, useState} from 'react';
import {Icon} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import type {SessionResult, SessionView} from '../../../../server/plan-content';

export type Pick = {id: string; picked: number; good: boolean};

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz = (ms: number | number[]) => { try { if (!reduced()) navigator.vibrate?.(ms); } catch { /* no vibration here */ } };

export function Dots({total, picks, at}: {total: number; picks: Pick[]; at?: number}) {
  return (
    <ol className="pl-dots" aria-label={`Message ${Math.min((at ?? picks.length) + 1, total)} of ${total}`}>
      {Array.from({length: total}, (_, i) => (
        <li key={i} className={i < picks.length ? (picks[i].good ? 'ok' : 'bad') : i === at ? 'now' : ''} />
      ))}
    </ol>
  );
}

export function Session({session, onExit, onDone}: {
  session: SessionView; onExit: () => void; onDone: (r: SessionResult, picks: Pick[]) => void;
}) {
  const qs = session.questions;
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const q = qs[i];
  const mine = picks[i];
  const last = i === qs.length - 1;

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // On a phone the button lands under the tab bar; bring it up once there is something to press.
  const nextBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (mine) nextBtn.current?.scrollIntoView({block: 'nearest', behavior: reduced() ? 'auto' : 'smooth'}); }, [mine]);

  const submit = useCallback(async (all: Pick[]) => {
    setBusy(true); setErr('');
    try {
      const r = await api<SessionResult>('/api/plan/session', {body: {day: session.day, answers: all.map(({id, picked}) => ({id, picked}))}});
      onDone(r, all);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }, [session.day, onDone]);

  const next = useCallback(() => {
    window.clearTimeout(timer.current);
    if (picks.length <= i || busy) return;
    if (last) void submit(picks);
    else setI(i + 1);
  }, [picks, i, last, busy, submit]);

  function choose(k: number) {
    if (mine || busy) return;
    const good = q.options[k].good;
    const all = [...picks, {id: q.id, picked: k, good}];
    setPicks(all);
    buzz(good ? 12 : [18, 40, 18]);
    track('plan_session_pick', {day: session.day, q: i + 1, good});
    // A right answer moves on by itself; a wrong one waits, so the good card can be read.
    if (good) timer.current = window.setTimeout(() => { if (last) void submit(all); else setI((n) => n + 1); }, 1200);
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (['1', '2', '3'].includes(e.key)) choose(Number(e.key) - 1);
      else if (e.key === 'Enter' && mine) { e.preventDefault(); next(); }
      else if (e.key === 'Escape') onExit();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });

  return (
    <section className="card pl-sess fade-in" aria-label="Today's session">
      <div className="pl-sess-top">
        <button className="pl-x" onClick={onExit} aria-label="Leave the session">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
        <Dots total={qs.length} picks={picks} at={i} />
      </div>

      <div className="pl-q" key={q.id}>
        <div className="pl-them"><p>{q.them}</p></div>
        <h2 className="pl-ask">Which would you send?</h2>
        <div className="pl-opts" role="group" aria-label="Three replies">
          {q.options.map((o, k) => {
            const state = !mine ? '' : k === mine.picked ? (o.good ? 'ok' : 'bad') : o.good ? 'ok reveal' : 'dim';
            return (
              <button key={k} className={'pl-opt ' + state} disabled={!!mine} aria-pressed={mine?.picked === k} onClick={() => choose(k)}>
                <span className="pl-opt-k" aria-hidden="true">
                  {state.startsWith('ok') ? <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : state === 'bad' ? <svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg> : null}
                </span>
                <span className="pl-opt-t">
                  {o.text}
                  {(state === 'ok' || state === 'bad' || state === 'ok reveal') && <em>{o.tag}</em>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="pl-sr" aria-live="polite">{mine ? `${mine.good ? 'Good choice' : 'Not that one'}: ${q.options[mine.picked].tag}` : ''}</p>

      <div className="pl-sess-foot">
        {mine && (
          <button ref={nextBtn} className={'btn btn-lg pl-next ' + (mine.good ? 'btn-primary' : 'pl-next-warn')} disabled={busy} onClick={next}>
            {busy ? <><span className="spin" />Counting</> : last ? 'See my result' : 'Next'}
          </button>
        )}
        {err && <p className="pl-err">{err} <button className="pl-link" onClick={() => void submit(picks)}>Retry</button></p>}
      </div>
    </section>
  );
}

const VERDICT = (c: number, t: number) => (c >= t ? 'Flawless' : c === t - 1 ? 'Calm' : c === t - 2 ? 'Getting there' : 'Tricky one');

export function End({result, picks, streakBefore, onBonus, bonusOpen, hasBonus, onDone}: {
  result: SessionResult; picks: Pick[]; streakBefore: number; onBonus: () => void; bonusOpen: boolean; hasBonus: boolean; onDone: () => void;
}) {
  const t = result.skillTrend;
  const lastPt = t[t.length - 1], prevPt = t[t.length - 2];
  const delta = result.firstTimeToday && lastPt && prevPt ? lastPt.pct - prevPt.pct : null;
  const up = result.streak > streakBefore;
  const verdict = VERDICT(result.correct, result.total);
  return (
    <section className="card pl-end fade-in" aria-label="Session result">
      <Dots total={result.total} picks={picks} />
      <p className="pl-end-n"><b>{result.correct}</b><span> / {result.total}</span></p>
      <h2 className={'pl-end-v' + (result.correct >= result.total - 1 ? ' gt' : '')}>{verdict}</h2>
      <div className="pl-end-chips">
        {delta ? (
          <span className={'chip ' + (delta >= 0 ? 'chip-ok' : 'chip-warn')}>{delta >= 0 ? '+' : '−'}{Math.abs(delta)}% {result.skill}</span>
        ) : (
          <span className="chip">{result.skill} · {lastPt?.pct ?? Math.round((result.correct / result.total) * 100)}%</span>
        )}
        <span className="chip chip-ok pl-streak"><Icon id="flame" size={20} />{result.streak} day{result.streak === 1 ? '' : 's'}{up ? ' · +1' : ''}</span>
      </div>
      {!result.firstTimeToday && <p className="pl-mute pl-small">Practice round. Today's first score stays on your line.</p>}
      <div className="pl-end-b">
        <button className="btn btn-primary btn-lg" onClick={onDone}>Done — see you tomorrow</button>
        {hasBonus && !bonusOpen && <button className="btn btn-ghost" onClick={onBonus}><Icon id="pencil" size={22} />Bonus: write your own reply</button>}
      </div>
    </section>
  );
}

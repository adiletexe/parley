/* The daily session: five messages, three replies each, tap the one you'd send. One action per screen —
   their texts, the question, three replies; the tag under a reply is the only explanation anyone gets.
   Their side arrives the way it does on a phone (docs/VOICE.md): a burst of bubbles, each after a moment of
   "typing…" as long as the text takes to read, and only then the three replies, one at a time, in an order
   shuffled per question. A tap or Space shows it all; reduced motion shows it all at once. */
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Icon} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import type {SessionResult, SessionView} from '../../../../server/plan-content';
import {VERDICT_TONE, type Verdict} from '../../../lib/verdict';

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

/** Their texts as stacked grey bubbles on the left. `shown` bubbles are visible; `typing` adds the dots after them. */
export function Burst({bubbles, shown = bubbles.length, typing = false}: {bubbles: string[]; shown?: number; typing?: boolean}) {
  return (
    <div className="pl-burst" role="log" aria-live="polite" aria-label="Their texts">
      {bubbles.slice(0, shown).map((b, k) => <p key={k} className="pl-them">{b}</p>)}
      {typing && <p className="pl-them pl-typing" aria-label="typing"><i /><i /><i /></p>}
    </div>
  );
}

/** A plan-content drill message is the same burst with one bubble per line. */
export const bubblesOf = (message: string) => message.split('\n').map((b) => b.trim()).filter(Boolean);

/* Reading pace. The first version gave each bubble ~0.5s, so the next one landed while the last was still being
   read and the replies were up the instant the burst ended. Now the dots last about as long as the bubble takes
   to read (typing longer for a longer text), the burst settles before the next dots start, and the question waits
   a breath after the last bubble before the replies come in one at a time. */
const typingMs = (text: string) => Math.min(2400, 700 + 30 * text.length);
// The question follows the last text almost at once; the replies then come slowly, one at a time, so each gets read.
const GAP_MS = 500, ASK_MS = 350, OPT_FIRST_MS = 300, OPT_MS = 1100;

/** A stable shuffle per question: the order is drawn from the id (which carries the day), so a reload shows the
    same order and the position of the good reply never tells. Returns display slot → option index. */
export function orderFor(id: string, n: number): number[] {
  let h = 2166136261;
  for (let k = 0; k < id.length; k++) h = Math.imul(h ^ id.charCodeAt(k), 16777619);
  const rnd = () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const o = Array.from({length: n}, (_, k) => k);
  for (let k = n - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [o[k], o[j]] = [o[j], o[k]]; }
  return o;
}

export function Session({session, onExit, onDone}: {
  session: SessionView; onExit: () => void; onDone: (r: SessionResult, picks: Pick[]) => void;
}) {
  const qs = session.questions;
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const q = qs[i];
  const mine = picks[i];
  const last = i === qs.length - 1;
  const total = q.them.length;
  const nOpts = q.options.length;
  const order = useMemo(() => orderFor(q.id, nOpts), [q.id, nOpts]);
  // What of this message is on screen: bubbles, the dots, the question, and how many replies. Replies can be
  // picked as soon as they show.
  const [view, setView] = useState(() => (reduced() ? {shown: total, typing: false, ask: true, opts: nOpts} : {shown: 0, typing: false, ask: false, opts: 0}));
  const done = view.opts >= nOpts;
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach((x) => window.clearTimeout(x)); timers.current = []; };
  const skip = useCallback(() => { clear(); setView({shown: total, typing: false, ask: true, opts: nOpts}); }, [total, nOpts]);

  // Layout effect: the next message's bubbles must not flash in for a frame before the typing starts.
  useLayoutEffect(() => {
    clear();
    if (reduced()) { setView({shown: total, typing: false, ask: true, opts: nOpts}); return; }
    setView({shown: 0, typing: true, ask: false, opts: 0});
    const at = (t: number, f: () => void) => timers.current.push(window.setTimeout(f, t));
    let t = 0;
    q.them.forEach((b, k) => {
      if (k > 0) { t += GAP_MS; at(t, () => setView((v) => ({...v, typing: true}))); }
      t += typingMs(b);
      at(t, () => setView((v) => ({...v, shown: k + 1, typing: false})));
    });
    t += ASK_MS;
    at(t, () => setView((v) => ({...v, ask: true})));
    for (let k = 1; k <= nOpts; k++) at(t + OPT_FIRST_MS + (k - 1) * OPT_MS, () => setView((v) => ({...v, opts: k})));
    return clear;
  }, [q.id, total, nOpts]);

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
    if (picks.length <= i || busy) return;
    if (last) void submit(picks);
    else setI(i + 1);
  }, [picks, i, last, busy, submit]);

  function choose(k: number) {
    if (mine || busy || order.indexOf(k) >= view.opts) return;
    const good = q.options[k].good;
    setPicks([...picks, {id: q.id, picked: k, good}]);
    buzz(good ? 12 : [18, 40, 18]);
    track('plan_session_pick', {day: session.day, q: i + 1, good});
    // No auto-advance, right or wrong: the tag under each reply is the lesson, and it needs reading. Next moves on.
  }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      // 1–3 name the slots as drawn, not the options as written.
      if (['1', '2', '3'].includes(e.key)) { const k = order[Number(e.key) - 1]; if (k !== undefined) choose(k); }
      else if (e.key === ' ' && !done) { e.preventDefault(); skip(); }
      else if (e.key === 'Enter' && mine) { e.preventDefault(); next(); }
      else if (e.key === 'Escape') onExit();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });

  return (
    // A tap anywhere skips the pacing: some people read faster than the dots.
    <section className="card pl-sess fade-in" aria-label={`Day ${session.day} session`} onClick={() => { if (!done) skip(); }}>
      <div className="pl-sess-top">
        <button className="pl-x" onClick={onExit} aria-label="Leave the session">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
        <Dots total={qs.length} picks={picks} at={i} />
      </div>

      <div className="pl-q" key={q.id}>
        <div className="pl-chat">
          <Burst bubbles={q.them} shown={view.shown} typing={view.typing} />
        </div>
        {view.ask && (
          <>
            <h2 className="pl-ask">Which would you send?</h2>
            <div className="pl-opts" role="group" aria-label="Three replies">
              {order.slice(0, view.opts).map((k) => {
                const o = q.options[k];
                const state = !mine ? '' : k === mine.picked ? (o.good ? 'ok' : 'bad') : o.good ? 'ok reveal' : 'dim';
                const told = state === 'ok' || state === 'bad' || state === 'ok reveal';
                return (
                  <button key={k} className={'pl-opt ' + state} disabled={!!mine}
                    aria-pressed={mine?.picked === k} onClick={() => choose(k)}>
                    <span className="pl-opt-t">{o.text}</span>
                    {told && (
                      <em>
                        {state.startsWith('ok') ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
                        {o.tag}
                      </em>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
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

/* The end says how it went in words: a headline and the judge's read of the picks. The count of right picks only
   chooses the words, it is never shown (the founder's rule: no scores in the app). */
const HEADLINE = (c: number, t: number) => (c >= t ? 'Calm all the way' : c === t - 1 ? 'Mostly calm' : c === t - 2 ? 'Getting there' : 'A tricky one');
const READ = (c: number, t: number): Verdict => (c >= t - 1 ? 'good' : c === t - 2 ? 'risky' : 'bad');
const READ_TEXT: Record<Verdict, string> = {
  good: 'A judge would read your replies well',
  risky: 'A judge might read some of these badly',
  bad: 'A judge would read most of these badly',
};

export function End({result, picks, onBonus, bonusOpen, hasBonus, onDone, doneLabel = 'Done, see you tomorrow'}: {
  result: SessionResult; picks: Pick[]; streakBefore: number; onBonus: () => void; bonusOpen: boolean; hasBonus: boolean; onDone: () => void;
  doneLabel?: string;
}) {
  const t = result.skillTrend;
  const lastPt = t[t.length - 1], prevPt = t[t.length - 2];
  const better = !!(result.firstTimeToday && lastPt && prevPt && lastPt.pct > prevPt.pct);
  const read = READ(result.correct, result.total);
  return (
    <section className="card pl-end fade-in" aria-label="Session result">
      <Dots total={result.total} picks={picks} />
      <h2 className={'pl-end-v' + (read === 'good' ? ' gt' : '')}>{HEADLINE(result.correct, result.total)}</h2>
      <b className={`pl-verdict pl-tone-${VERDICT_TONE[read]}`}><i aria-hidden="true" />{READ_TEXT[read]}</b>
      <div className="pl-end-chips">
        <span className={'chip' + (better ? ' chip-ok' : '')}>{result.skill}{better ? ' · better than last time' : ''}</span>
        <span className="chip chip-ok pl-streak"><Icon id="flame" size={20} />{result.streak}-day streak</span>
      </div>
      {!result.firstTimeToday && <p className="pl-mute pl-small">Practice round. Your first try today is the one that stays on your path.</p>}
      <div className="pl-end-b">
        <button className="btn btn-primary btn-lg" onClick={onDone}>{doneLabel}</button>
        {hasBonus && !bonusOpen && <button className="btn btn-ghost" onClick={onBonus}><Icon id="pencil" size={22} />Bonus: write your own reply</button>}
      </div>
    </section>
  );
}

/* Today's drill, the whole point of the Practice page: their message → your reply → the judge's read → try again →
   first score vs best score. The fails-trains-succeeds proof lives here, so the first try stays on screen. */
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Icon} from '../../../components/Icon';
import {api, ApiError} from '../../../lib/api';
import type {DrillAttempt, PlanView} from '../../../../server/plan-content';
import {Score, scoreTone, scoreWord} from './parts';

type Drill = NonNullable<PlanView['drill']>;

export function DrillCard({day, drill, isToday, nextDay, personal, triggerLabel, onGraded}: {
  day: number; drill: Drill; isToday: boolean; nextDay: number | null; personal: boolean; triggerLabel: string; onGraded: () => void;
}) {
  const [attempts, setAttempts] = useState<DrillAttempt[]>(drill.attempts);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{msg: string; paywall?: boolean} | null>(null);
  useEffect(() => { setAttempts(drill.attempts); setDraft(''); setErr(null); }, [day, drill.attempts]);

  const last = attempts[attempts.length - 1];
  const first = attempts[0];
  const best = attempts.length ? Math.max(...attempts.map((a) => a.score)) : null;
  const gained = attempts.length > 1 && best !== null && best > first.score;

  async function check() {
    if (draft.trim().length < 3 || busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{attempt: DrillAttempt}>('/api/plan/drill', {body: {day, draft}});
      setAttempts((a) => [...a, r.attempt]);
      setDraft('');
      onGraded();
    } catch (e) {
      setErr({msg: (e as Error).message, paywall: e instanceof ApiError && e.status === 402});
    } finally { setBusy(false); }
  }

  return (
    <section className="card pl-drill">
      <div className="card-h"><Icon id="target" size={24} />{isToday ? "Today's drill" : `Day ${day} drill`}
        {personal && <span className="pl-chip-right">Written around {triggerLabel}</span>}
      </div>
      <p className="pl-task">{drill.task}</p>

      <div className="pl-bubble">
        <span className="pl-bubble-h">They wrote</span>
        <p>{drill.message}</p>
      </div>

      {last && (
        <div className="pl-result fade-in" key={last.id}>
          <div className="pl-result-top">
            <Score value={last.score} />
            <div className="pl-result-t">
              <b className={`pl-tone-${scoreTone(last.score)}`}>{scoreWord(last.score)}</b>
              <span className="pl-mute">Try {last.attempt} · court-safety score, 0–100</span>
            </div>
            {gained && <span className="pl-gain"><span>{first.score}</span><i>→</i><b>{best}</b></span>}
          </div>
          <blockquote className="pl-yours">{last.draft}</blockquote>
          {last.lens.length > 0 && (
            <ul className="pl-flags">
              {last.lens.map((f, i) => (
                <li key={i} className={f.severity === 'good' ? 'pl-flag-ok' : 'pl-flag-warn'}>
                  <b>“{f.phrase}”</b>
                  <span>{f.issue}. {f.why}{f.fix ? <> <i>Try: {f.fix}</i></> : null}</span>
                </li>
              ))}
            </ul>
          )}
          {last.better && last.better.trim() !== last.draft.trim() && (
            <div className="pl-better">
              <span className="pl-better-h">A calmer version</span>
              <p>{last.better}</p>
            </div>
          )}
        </div>
      )}

      <label className={'pl-label' + (attempts.length ? '' : ' pl-sr')} htmlFor="pl-draft">{attempts.length ? 'Try again' : 'Your reply'}</label>
      <textarea id="pl-draft" className="field pl-textarea" value={draft} maxLength={1500}
        placeholder={attempts.length ? 'Rewrite it with what the judge flagged in mind…' : 'Your reply — what you would actually send…'}
        onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void check(); }} />
      <div className="pl-actions">
        <button className="btn btn-primary pl-check" disabled={busy || draft.trim().length < 3} onClick={() => void check()}>
          {busy ? <><span className="spin" />Reading it like a judge…</> : attempts.length ? 'Check again' : 'Check my reply'}
        </button>
        {last && !draft && <button className="btn btn-quiet" disabled={busy} onClick={() => setDraft(last.draft)}>Edit my last try</button>}
      </div>
      {err && (
        <p className="pl-err">{err.msg} {err.paywall ? <Link to="/pricing">See plans</Link> : <button className="pl-link" onClick={() => void check()}>Retry</button>}</p>
      )}

      {isToday && best !== null && best >= 70 && (
        <div className="pl-tomorrow fade-in">
          <Icon id="party" size={32} />
          <div>
            <b>Day {day} done{gained ? ` · ${first.score} → ${best}` : ''}.</b>
            <span>{nextDay ? `Come back tomorrow: Day ${nextDay} unlocks.` : 'That was the last day of the plan. Every message from here is practice.'}</span>
          </div>
        </div>
      )}
    </section>
  );
}

/* The bonus after a session: today's drill message, write your own reply, the judge's read. Only what THIS person
   typed here is ever shown as "yours" — seeded demo tries and the drill's own task text never are (they once were). */
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {api, ApiError} from '../../../lib/api';
import type {DrillAttempt, PlanView} from '../../../../server/plan-content';
import {judge, RANK} from '../../../lib/verdict';
import {VerdictLine} from './parts';
import {Burst, bubblesOf} from './Session';

type Drill = NonNullable<PlanView['drill']>;

export function BonusDrill({day, drill}: {day: number; drill: Drill}) {
  const [tries, setTries] = useState<DrillAttempt[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{msg: string; paywall?: boolean} | null>(null);
  useEffect(() => { setTries([]); setDraft(''); setErr(null); }, [day]);

  const last = tries[tries.length - 1];
  const lastV = last ? judge(last.score, last.lens) : null;
  // Said in words when a retry reads better than the first try; no "first → best" numbers.
  const better = !!lastV && tries.length > 1 && RANK[lastV] > RANK[judge(tries[0].score, tries[0].lens)];

  async function check() {
    const text = draft.trim();
    if (text.length < 3 || busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{attempt: DrillAttempt}>('/api/plan/drill', {body: {day, draft: text}});
      // What we show is what was typed, not whatever the row carries back.
      setTries((a) => [...a, {...r.attempt, draft: text}]);
      setDraft('');
    } catch (e) {
      setErr({msg: (e as Error).message, paywall: e instanceof ApiError && e.status === 402});
    } finally { setBusy(false); }
  }

  return (
    <section className="card pl-bonus fade-in" aria-label="Bonus: write your own reply">
      <Burst bubbles={bubblesOf(tries[0]?.message ?? drill.message)} />

      {last && (
        <div className="pl-result fade-in" key={last.id}>
          <div className="pl-result-top">
            <VerdictLine v={lastV!} />
            {better && <span className="pl-gain">Better than your first try</span>}
          </div>
          <p className="pl-yours">{last.draft}</p>
          {last.lens.filter((f) => f.severity !== 'good').length > 0 && (
            <ul className="pl-flags">
              {last.lens.filter((f) => f.severity !== 'good').map((f, i) => (
                <li key={i}><b>“{f.phrase}”</b><span>{f.issue}. {f.why}</span>{f.fix && <span className="pl-fix"><em>Instead:</em> {f.fix}</span>}</li>
              ))}
            </ul>
          )}
          {last.better && last.better.trim() !== last.draft.trim() && <p className="pl-better">{last.better}</p>}
        </div>
      )}

      <label className="pl-sr" htmlFor="pl-draft">Your reply</label>
      <textarea id="pl-draft" className="field pl-textarea" value={draft} maxLength={1500}
        placeholder={last ? 'Try it again…' : 'What would you send?'}
        onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void check(); }} />
      <div className="pl-actions">
        <button className="btn btn-primary pl-check" disabled={busy || draft.trim().length < 3} onClick={() => void check()}>
          {busy ? <><span className="spin" />Reading it like a judge</> : last ? 'Check again' : 'Check it'}
        </button>
      </div>
      {err && <p className="pl-err">{err.msg} {err.paywall ? <Link to="/pricing">See plans</Link> : <button className="pl-link" onClick={() => void check()}>Retry</button>}</p>}
    </section>
  );
}

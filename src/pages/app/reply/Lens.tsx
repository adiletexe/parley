import type {ReactNode} from 'react';
import type {LensFlag} from '../../../../shared/types';
import {Icon} from '../../../components/Icon';

/** The draft with each flagged phrase underlined in place. Phrases are verified on the server to occur verbatim. */
export function Highlighted({text, flags}: {text: string; flags: LensFlag[]}) {
  const spans: {at: number; end: number; f: LensFlag}[] = [];
  for (const f of flags) {
    const at = text.indexOf(f.phrase);
    if (at < 0 || spans.some((s) => at < s.end && at + f.phrase.length > s.at)) continue;
    spans.push({at, end: at + f.phrase.length, f});
  }
  spans.sort((a, b) => a.at - b.at);
  const out: ReactNode[] = [];
  let i = 0;
  spans.forEach((s, k) => {
    if (s.at > i) out.push(text.slice(i, s.at));
    out.push(
      <mark key={k} className={'rc-hl rc-hl-' + s.f.severity} tabIndex={0} data-tip={`${s.f.issue}. ${s.f.why}`}>
        {text.slice(s.at, s.end)}
      </mark>,
    );
    i = s.end;
  });
  if (i < text.length) out.push(text.slice(i));
  return <p className="rc-hl-text">{out}</p>;
}

function tone(score: number) { return score >= 85 ? 'ok' : score >= 60 ? 'amber' : 'warn'; }
function verdict(score: number) {
  return score >= 85 ? 'Court-safe' : score >= 60 ? 'Mostly fine' : score >= 35 ? 'Risky' : 'Would hurt you';
}

export function Score({label, score}: {label: string; score: number}) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className={'rc-score rc-' + tone(score)}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 32 32)" />
      </svg>
      <b>{score}</b>
      <div><span>{label}</span><strong>{verdict(score)}</strong></div>
    </div>
  );
}

export function Lens({draft, flags, draftScore, replyScore}: {draft: string; flags: LensFlag[]; draftScore: number; replyScore?: number}) {
  const risky = flags.filter((f) => f.severity !== 'good');
  return (
    <section className="card rc-lens fade-in">
      <div className="card-h"><Icon id="scale" size={24} />Judge's lens · your draft</div>
      <div className="rc-scores">
        <Score label="Your draft" score={draftScore} />
        {replyScore !== undefined && <Score label="Parley's reply" score={replyScore} />}
      </div>
      <div className="rc-draftbox"><Highlighted text={draft} flags={flags} /></div>
      {risky.length === 0 && <p className="rc-clean">Nothing here a judge would hold against you. Keep it this short.</p>}
      <ul className="rc-flags">
        {flags.map((f, i) => (
          <li key={i} className={'rc-flag rc-flag-' + f.severity}>
            <span className="rc-flag-ic" aria-hidden="true">{f.severity === 'good' ? '✓' : '!'}</span>
            <div>
              <b>“{f.phrase}”</b> <span className="rc-flag-issue">{f.issue}</span>
              <p>{f.why}</p>
              {f.fix && <p className="rc-fix"><span>Instead:</span> {f.fix}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="rc-fine">How a judge might read it — general information, not legal advice.</p>
    </section>
  );
}

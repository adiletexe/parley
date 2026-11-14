import type {ReactNode} from 'react';
import type {LensFlag} from '../../../../shared/types';

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

/** The draft with its flags: inline underlines, then the list with why and what to say instead. Shown inside the
    result's collapsed "Your draft" row, so it carries no card or header of its own. */
export function Lens({draft, flags}: {draft: string; flags: LensFlag[]}) {
  const risky = flags.filter((f) => f.severity !== 'good');
  return (
    <div className="rc-lens fade-in">
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
      <p className="rc-fine">How a judge might read it. General information, not legal advice.</p>
    </div>
  );
}

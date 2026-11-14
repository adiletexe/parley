/* What the record shows, counted on the server in code. Tapping a pattern filters the list to the entries it counts. */
import type {Pattern} from '../../../../shared/types';
import {Icon, type IconId} from '../../../components/Icon';

const ICON = (label: string): IconId =>
  /late|missed hand/i.test(label) ? 'clock' : /tense topic/i.test(label) ? 'flame' : /per week/i.test(label) ? 'bolt'
    : /children/i.test(label) ? 'family' : /payment/i.test(label) ? 'receipt' : /schedule/i.test(label) ? 'calendar' : /reply time/i.test(label) ? 'timer' : 'target';

export function Patterns({patterns, entryCount, active, onPick}: {patterns: Pattern[]; entryCount: number; active: string | null; onPick: (p: Pattern | null) => void}) {
  return (
    <section className="card jr-patterns">
      <div className="card-h"><Icon id="search" size={24} />Patterns</div>
      {patterns.length === 0 ? (
        <p className="jr-sub">
          {entryCount < 5
            ? 'Patterns appear once there are a few entries: late pickups, the topics that turn tense, and whether things are calming down.'
            : 'No repeating pattern yet. Keep logging handoffs and messages — counts show up here as soon as something repeats.'}
        </p>
      ) : (
        <ul className="jr-plist">
          {patterns.map((p) => {
            const on = active === p.label;
            const canFilter = p.entryIds.length > 0;
            return (
              <li key={p.label}>
                <button className={'jr-pat' + (on ? ' on' : '')} disabled={!canFilter} onClick={() => onPick(on ? null : p)} aria-pressed={on}>
                  <Icon id={ICON(p.label)} size={32} />
                  <span><b>{p.label}</b><small>{p.detail}</small></span>
                  {canFilter && <em>{on ? 'Clear' : 'Show'}</em>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="jr-foot">Counted from your entries, not guessed. A pattern lists exactly which entries it counts.</p>
    </section>
  );
}

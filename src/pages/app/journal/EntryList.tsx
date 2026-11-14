/* The record itself: newest first, grouped by month, each row opens to the full text with Edit / Delete. */
import {useMemo, useState} from 'react';
import type {Entry} from '../../../../shared/types';
import {api, ApiError} from '../../../lib/api';
import {Icon} from '../../../components/Icon';
import {EntryForm} from './EntryForm';
import {CATEGORY, CHANNEL, KIND, SOURCE, TAG_LABEL, VISIBLE_TAGS, fmtDate, fmtTime, money, monthKey, monthLabel} from './util';

const PAGE = 120;

export function EntryList({entries, now, filtered, onChanged, onDeleted, onClear}: {
  entries: Entry[]; now: string; filtered: boolean;
  onChanged: (e: Entry) => void; onDeleted: (id: string) => void; onClear: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const months = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries.slice(0, limit)) { const k = monthKey(e.occurredAt); m.set(k, [...(m.get(k) ?? []), e]); }
    return [...m.entries()];
  }, [entries, limit]);

  async function del(id: string) {
    setBusy(true); setError('');
    try { await api(`/api/journal/${id}`, {method: 'DELETE'}); onDeleted(id); setConfirmDel(null); setOpen(null); }
    catch (e) {
      // Gone already (another tab deleted it): the list should just catch up.
      if (e instanceof ApiError && e.status === 404) { onDeleted(id); setConfirmDel(null); setOpen(null); }
      else setError((e as Error).message);
    }
    setBusy(false);
  }

  if (!entries.length) {
    return (
      <div className="jr-empty">
        <Icon id={filtered ? 'search' : 'book'} size={48} />
        <b>{filtered ? 'Nothing matches these filters' : 'Your journal is empty'}</b>
        <span>{filtered ? 'Try another word, or clear the filters.' : 'Log the next handoff with one tap above, or import a WhatsApp chat to start with the history you already have.'}</span>
        {filtered && <button className="btn btn-ghost" onClick={onClear}>Clear filters</button>}
      </div>
    );
  }

  return (
    <div className="jr-list">
      {months.map(([key, list]) => (
        <section key={key} className="jr-month">
          <h3 className="jr-month-h">{monthLabel(key)}<span>{list.length}</span></h3>
          <ul>
            {list.map((e) => {
              const isOpen = open === e.id;
              const tags = e.tags.filter((t) => VISIBLE_TAGS.includes(t));
              if (editing === e.id) return (
                <li key={e.id} className="jr-row editing">
                  <EntryForm entry={e} now={now} onCancel={() => setEditing(null)} onSaved={(x) => { onChanged(x); setEditing(null); }} />
                </li>
              );
              return (
                <li key={e.id} className={'jr-row' + (isOpen ? ' open' : '')}>
                  <button className="jr-row-main" onClick={() => { setOpen(isOpen ? null : e.id); setConfirmDel(null); }} aria-expanded={isOpen}>
                    <Icon id={KIND[e.kind].icon} size={36} />
                    <span className="jr-row-body">
                      <b>{e.title}</b>
                      {!isOpen && e.text && e.text !== e.title && <span className="jr-snip">{e.text}</span>}
                      <span className="jr-meta">
                        {fmtDate(e.occurredAt, {weekday: 'short', month: 'short', day: 'numeric'})} · {fmtTime(e.occurredAt)} · {CHANNEL[e.channel]}
                      </span>
                      <span className="jr-chips">
                        <span className="chip jr-cat">{CATEGORY[e.category]}</span>
                        {tags.map((t) => <span key={t} className={'chip ' + (t === 'tense' || t === 'in_front_of_kids' ? 'chip-warn' : t === 'date_unknown' ? 'chip-amber' : 'jr-tag')}>{TAG_LABEL[t] ?? t}</span>)}
                        {e.source === 'demo' && <span className="chip chip-amber">Sample</span>}
                      </span>
                    </span>
                    {e.amountCents != null && <span className="jr-amt">{money(e.amountCents)}</span>}
                  </button>
                  {isOpen && (
                    <div className="jr-detail fade-in">
                      {e.text && <p className={e.kind.startsWith('message') ? 'jr-quote' : 'jr-text'}>{e.text}</p>}
                      <p className="jr-prov">{KIND[e.kind].label} · {SOURCE[e.source]} · logged {fmtDate(e.createdAt)}</p>
                      {confirmDel === e.id ? (
                        <div className="jr-confirm" role="alertdialog" aria-label="Delete this entry?">
                          <span>Delete this entry for good? It won’t be on your timeline anymore.</span>
                          <button className="btn jr-danger" disabled={busy} onClick={() => del(e.id)}>{busy ? <span className="spin" /> : 'Delete'}</button>
                          <button className="btn btn-quiet" onClick={() => setConfirmDel(null)}>Keep it</button>
                        </div>
                      ) : (
                        <div className="jr-row-actions">
                          <button className="btn btn-ghost" onClick={() => setEditing(e.id)}>Edit</button>
                          <button className="btn btn-quiet" onClick={() => setConfirmDel(e.id)}>Delete</button>
                        </div>
                      )}
                      {error && confirmDel === e.id && <p className="jr-error" role="alert">{error}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {entries.length > limit && (
        <button className="btn btn-ghost btn-block" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, entries.length - limit)} more ({entries.length - limit} left)</button>
      )}
    </div>
  );
}

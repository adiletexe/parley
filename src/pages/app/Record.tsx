/* /app/record — the journal and the court timeline as one screen: everything that happened, in order, numbered as
   exhibits exactly as the PDF numbers them, ready for a lawyer.
   Two reads: GET /api/timeline gives the entries of the current period + topics with their exhibit numbers (the same
   list the PDF prints, so E-7 here is E-7 there); GET /api/journal gives the patterns of the whole record and the
   person's "now" for the log form. Type, search and a pattern only narrow what is on screen — the PDF covers the
   period and topics, which is why only those two travel in the PDF link. Filters live in the URL. */
import {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useSearchParams} from 'react-router-dom';
import type {Category, Entry, EntryKind, Pattern} from '../../../shared/types';
import {Icon} from '../../components/Icon';
import {ChannelTag} from '../../components/ChannelIcon';
import {api, ApiError, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import {EntryForm} from './journal/EntryForm';
import {ImportPanel} from './journal/ImportPanel';
import {ICON as patternIcon} from './journal/Patterns';
import {CATEGORY, PRESETS, SOURCE, TAG_LABEL, VISIBLE_TAGS, entryKind, fmtDate, fmtTime, money, type JournalData, type Preset} from './journal/util';
import './journal/journal.css';
import './Record.css';

type RdEntry = Entry & {exhibit: number};
interface Share { path: string; url: string; expiresAt: string; createdAt: string; views: number }
interface TimelineRes {
  entries: RdEntry[];
  range: {first: string | null; last: string | null; total: number};
  fingerprint: string;
  share: Share | null;
}

const TYPES: {id: string; label: string; kinds: EntryKind[]}[] = [
  {id: 'all', label: 'All', kinds: []},
  {id: 'messages', label: 'Messages', kinds: ['message_in', 'message_out']},
  {id: 'incidents', label: 'Incidents', kinds: ['incident']},
  {id: 'expenses', label: 'Expenses', kinds: ['expense']},
  {id: 'notes', label: 'Notes', kinds: ['note']},
];
const CATS = Object.keys(CATEGORY) as Category[];
const PERIODS = [['all', 'All time'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['custom', 'Custom']] as const;
type Period = (typeof PERIODS)[number][0];
// The sheet's first screen: what just happened, one tap each. Note and import are the "something else" rows.
const LOG_TILES = ['late', 'noshow', 'schedule', 'kids', 'expense', 'payment'];

/** YYYY-MM-DD of an instant in the display zone (tz.ts makes toLocale* use it). */
const ymd = (d: Date) => d.toLocaleDateString('en-CA');
const fDay = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
const short = (iso: string) => fmtDate(iso, {month: 'short', day: 'numeric'});
const monthOf = (iso: string) => fmtDate(iso, {month: 'long', year: 'numeric'});

type SheetState = null | {kind: 'log'; preset?: Preset} | {kind: 'import'} | {kind: 'filter'} | {kind: 'share'};

export default function Record() {
  const {me} = useMe();
  const [sp, setSp] = useSearchParams();
  const tz = me?.tz || (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();

  // ---- filters (URL) ----
  const period = (PERIODS.some(([k]) => k === sp.get('period')) ? sp.get('period') : 'all') as Period;
  const cats = useMemo(() => (sp.get('categories') ?? '').split(',').filter((c): c is Category => c in CATEGORY), [sp]);
  const type = TYPES.some((t) => t.id === sp.get('type')) ? sp.get('type')! : 'all';
  const q = sp.get('q') ?? '';
  const patternLabel = sp.get('pattern');
  const customFrom = sp.get('from') ?? '';
  const customTo = sp.get('to') ?? '';
  const today = useMemo(() => (me?.now ? new Date(me.now) : new Date()), [me?.now]);
  const {from, to} = useMemo(() => {
    if (period === '30' || period === '90') return {from: ymd(new Date(today.getTime() - (Number(period) - 1) * 86_400_000)), to: ymd(today)};
    if (period === 'custom') return {from: customFrom, to: customTo};
    return {from: '', to: ''};
  }, [period, customFrom, customTo, today]);
  const query = useMemo(() => {
    const x = new URLSearchParams({tz});
    if (from) x.set('from', from);
    if (to) x.set('to', to);
    if (cats.length) x.set('categories', cats.join(','));
    return x.toString();
  }, [from, to, cats, tz]);
  const set = useCallback((patch: Record<string, string | null>) => {
    setSp((cur) => {
      const next = new URLSearchParams(cur);
      for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
      return next;
    }, {replace: true});
  }, [setSp]);

  // ---- data ----
  const [journal, setJournal] = useState<JournalData | null>(null);
  const [tl, setTl] = useState<TimelineRes | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const loadJournal = useCallback(async () => {
    try { setJournal(await api<JournalData>('/api/journal')); } catch (e) { setError((e as Error).message); }
  }, []);
  const loadTl = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    try { setTl(await api<TimelineRes>(`/api/timeline?${query}`, {signal})); setError(''); }
    catch (e) { if (!signal?.aborted) setError((e as Error).message); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [query]);
  useEffect(() => { void loadJournal(); track('record_view'); }, [loadJournal]);
  useEffect(() => { const ac = new AbortController(); void loadTl(ac.signal); return () => ac.abort(); }, [loadTl]);
  const reload = () => { void loadJournal(); void loadTl(); };

  // ---- sheet ----
  const [sheet, setSheet] = useState<SheetState>(() => {
    const p = PRESETS.find((x) => x.id === sp.get('log'));
    return p ? {kind: 'log', preset: p} : null;
  });
  const openSheet = (s: SheetState) => {
    setSheet(s);
    if (sp.has('log')) set({log: null});
  };
  const [flash, setFlash] = useState('');
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(''), 3500); return () => clearTimeout(t); }, [flash]);

  // ---- what is on screen ----
  const patterns = useMemo(() => (journal?.patterns ?? []).filter((p) => p.entryIds.length > 0), [journal]);
  const pattern = patterns.find((p) => p.label === patternLabel) ?? null;
  const shown = useMemo(() => {
    let out = [...(tl?.entries ?? [])].reverse(); // newest first; exhibits stay oldest = E-1
    if (pattern) { const ids = new Set(pattern.entryIds); out = out.filter((e) => ids.has(e.id)); }
    const kinds = TYPES.find((t) => t.id === type)!.kinds;
    if (kinds.length) out = out.filter((e) => kinds.includes(e.kind));
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length) out = out.filter((e) => { const h = `${e.title}\n${e.text}`.toLowerCase(); return words.every((w) => h.includes(w)); });
    return out;
  }, [tl, pattern, type, q]);
  const months = useMemo(() => {
    const g: {month: string; items: RdEntry[]}[] = [];
    for (const e of shown) { const m = monthOf(e.occurredAt); if (g.at(-1)?.month !== m) g.push({month: m, items: []}); g.at(-1)!.items.push(e); }
    return g;
  }, [shown]);

  const activeFilters = (period !== 'all' ? 1 : 0) + (cats.length ? 1 : 0) + (type !== 'all' ? 1 : 0) + (q ? 1 : 0);
  const narrowed = activeFilters > 0 || !!pattern;
  const clearAll = () => setSp(new URLSearchParams(), {replace: true});
  const pickPattern = (p: Pattern) => { set({pattern: pattern?.label === p.label ? null : p.label}); };

  function saved(e: Entry, created: boolean) {
    if (created) { setSheet(null); setFlash(e.title || 'Entry saved'); }
    reload();
  }

  const pdfHref = `/api/timeline/pdf?${query}`;
  const viewCount = tl?.entries.length ?? 0;
  const pdfClick = () => track('timeline_pdf_click', {entries: viewCount, from: 'record'});
  const empty = tl && tl.range.total === 0;
  const [firstD, lastD] = tl?.entries.length ? [short(tl.entries[0].occurredAt), short(tl.entries.at(-1)!.occurredAt)] : ['', ''];
  const span = firstD === lastD ? firstD : `${firstD} – ${lastD}`;
  const summary = narrowed
    ? `${shown.length} of ${viewCount} ${viewCount === 1 ? 'entry' : 'entries'}`
    : `${viewCount} ${viewCount === 1 ? 'entry' : 'entries'}${span ? ` · ${span}` : ''}`;

  // ---- render ----
  const header = (
    <header className="rd-head">
      <div className="rd-head-t">
        <h1>Record</h1>
        <p>Everything that happened, in order — numbered for your lawyer.</p>
      </div>
      {tl && !empty && (
        <div className="rd-head-acts">
          <button type="button" className="btn rd-share-btn" onClick={() => openSheet({kind: 'share'})}>
            <Icon id="lock" size={22} />Share
          </button>
          <a className="btn rd-pdf-btn" href={pdfHref} download onClick={pdfClick} aria-disabled={!viewCount}>
            <Icon id="pdf" size={22} />PDF for lawyer
          </a>
        </div>
      )}
      {tl && (
        <button type="button" className="btn btn-primary rd-log-d" onClick={() => openSheet({kind: 'log'})}>
          <span className="rd-plus" aria-hidden="true">+</span>Log what happened
        </button>
      )}
    </header>
  );

  let body: ReactNode;
  if (!tl && error) {
    body = (
      <div className="card rd-err">
        <b>We couldn’t open your record.</b><span>{error}</span>
        <button type="button" className="btn btn-ghost" onClick={reload}>Try again</button>
      </div>
    );
  } else if (!tl) {
    body = <div className="rd-loading"><span className="spin" /> Opening your record…</div>;
  } else if (empty) {
    body = (
      <section className="card rd-empty fade-in">
        <Icon id="record" size={56} />
        <h2>Your record starts here</h2>
        <p>Every late pickup, message and expense you add gets a date, a time and an exhibit number — E-1, E-2… — in calm,
          factual language. When you need it, it becomes one PDF for your lawyer.</p>
        <div className="rd-empty-acts">
          <button type="button" className="btn btn-primary" onClick={() => openSheet({kind: 'log'})}><span className="rd-plus" aria-hidden="true">+</span>Log what happened</button>
          <button type="button" className="btn btn-ghost" onClick={() => openSheet({kind: 'import'})}><Icon id="chat" size={24} />Import a chat</button>
        </div>
        <p className="rd-privacy"><Icon id="lock" size={20} />Private to you. The other parent never sees Parley.</p>
      </section>
    );
  } else {
    const top = patterns.slice(0, 2);
    body = (
      <div className={'rd-grid' + (busy ? ' rd-busy' : '')}>
        <div className="rd-main">
          {top.length > 0 && (
            <div className="rd-pats rd-pats-m">
              {top.map((p) => <PatternCard key={p.label} p={p} on={pattern?.label === p.label} onPick={() => pickPattern(p)} />)}
            </div>
          )}

          <div className="rd-bar">
            <span className="rd-sum">{summary}</span>
            <button type="button" className={'btn rd-filter-btn' + (activeFilters ? ' on' : '')} onClick={() => openSheet({kind: 'filter'})} aria-haspopup="dialog">
              <Icon id="search" size={22} />Filter{activeFilters ? <span className="rd-badge">{activeFilters}</span> : null}
            </button>
          </div>
          {narrowed && (
            <div className="rd-active">
              {pattern && <ActiveChip onClear={() => set({pattern: null})}>{pattern.label}</ActiveChip>}
              {period !== 'all' && <ActiveChip onClear={() => set({period: null, from: null, to: null})}>{period === 'custom' ? `${from ? fDay(from) : 'Start'} – ${to ? fDay(to) : 'today'}` : PERIODS.find(([k]) => k === period)![1]}</ActiveChip>}
              {cats.length > 0 && <ActiveChip onClear={() => set({categories: null})}>{cats.map((c) => CATEGORY[c]).join(', ')}</ActiveChip>}
              {type !== 'all' && <ActiveChip onClear={() => set({type: null})}>{TYPES.find((t) => t.id === type)!.label}</ActiveChip>}
              {q && <ActiveChip onClear={() => set({q: null})}>“{q}”</ActiveChip>}
              {activeFilters + (pattern ? 1 : 0) > 1 && <button type="button" className="rd-clear-all" onClick={clearAll}>Clear all</button>}
            </div>
          )}
          {flash && <p className="rd-flash fade-in" role="status"><span className="chip chip-ok">Saved</span>{flash}</p>}
          {error && <div className="card rd-err rd-err-inline"><span>{error}</span><button type="button" className="btn btn-ghost" onClick={reload}>Try again</button></div>}

          {shown.length === 0 ? (
            <div className="card rd-none">
              <Icon id="search" size={44} />
              <b>Nothing matches</b>
              <span>No entries in this view. Try another word or a longer period.</span>
              <button type="button" className="btn btn-ghost" onClick={clearAll}>Show everything</button>
            </div>
          ) : (
            <Feed months={months} now={journal?.now ?? today.toISOString()} onChanged={reload} />
          )}
          <p className="rd-foot">Times in {tz.replace(/_/g, ' ')}. Exhibit numbers match the PDF: oldest = E-1. Parley is not a law firm and doesn’t give legal advice.</p>
        </div>

        <aside className="rd-side">
          <section className="card rd-lawyer">
            <div className="card-h"><Icon id="scale" size={24} />For your lawyer</div>
            <p className="rd-lawyer-p">{viewCount} {viewCount === 1 ? 'entry' : 'entries'}{from || to || cats.length ? ' in this view' : ''}, numbered E-1 to E-{Math.max(1, viewCount)}, with patterns and the full text of each.</p>
            {viewCount > 0
              ? <a className="btn btn-primary btn-block" href={pdfHref} download onClick={pdfClick}><Icon id="pdf" size={22} />Download PDF</a>
              : <p className="rd-lawyer-none">Nothing to export in this view.</p>}
            <button type="button" className="btn btn-ghost btn-block" onClick={() => openSheet({kind: 'share'})}><Icon id="lock" size={22} />{tl.share ? 'Share link is on' : 'Share a read-only link'}</button>
            <p className="rd-fp" title="SHA-256 of exactly these entries. It is printed on every page of the PDF; any edit changes it.">
              <Icon id="shield" size={20} /><span>Fingerprint <code>{tl.fingerprint.slice(0, 10)}…{tl.fingerprint.slice(-6)}</code></span>
            </p>
          </section>
          {patterns.length > 0 && (
            <section className="card rd-sidepats">
              <div className="card-h"><Icon id="target" size={24} />Patterns</div>
              <div className="rd-pats">
                {patterns.slice(0, 3).map((p) => <PatternCard key={p.label} p={p} on={pattern?.label === p.label} onPick={() => pickPattern(p)} />)}
              </div>
              <p className="rd-foot">Counted from your entries, not guessed. Tap one to see exactly which entries it counts.</p>
            </section>
          )}
        </aside>
      </div>
    );
  }

  return (
    <div className="rd fade-in">
      {header}
      {body}

      {/* Portalled: .fade-in leaves a transform on the page, which would pin "fixed" children to it, not the screen. */}
      {tl && !empty && createPortal(
        <button type="button" className="btn btn-primary rd-fab" onClick={() => openSheet({kind: 'log'})}>
          <span className="rd-plus" aria-hidden="true">+</span>Log what happened
        </button>, document.body,
      )}

      {sheet?.kind === 'log' && (
        <Sheet title={sheet.preset ? sheet.preset.label : 'What happened?'} onClose={() => setSheet(null)}
          onBack={sheet.preset ? () => setSheet({kind: 'log'}) : undefined}>
          {sheet.preset ? (
            <EntryForm key={sheet.preset.id} preset={sheet.preset} now={journal?.now ?? today.toISOString()}
              onSaved={saved} onCancel={() => setSheet({kind: 'log'})} />
          ) : (
            <LogPicker onPick={(p) => setSheet({kind: 'log', preset: p})} onImport={() => setSheet({kind: 'import'})} />
          )}
        </Sheet>
      )}
      {sheet?.kind === 'import' && (
        <Sheet title="Import a chat" onClose={() => setSheet(null)} onBack={() => setSheet({kind: 'log'})}>
          <ImportPanel bare onImported={reload} />
        </Sheet>
      )}
      {sheet?.kind === 'filter' && tl && (
        <Sheet title="Filter" onClose={() => setSheet(null)}>
          <FilterBody period={period} from={customFrom} to={customTo} cats={cats} type={type} q={q} set={set}
            firstDay={tl.range.first ? ymd(new Date(tl.range.first)) : ymd(today)} today={ymd(today)} />
          <div className="rd-sheet-foot">
            <button type="button" className="btn btn-quiet" onClick={() => setSp((cur) => { const n = new URLSearchParams(); if (cur.get('pattern')) n.set('pattern', cur.get('pattern')!); return n; }, {replace: true})}>Reset</button>
            <button type="button" className="btn btn-primary" onClick={() => setSheet(null)}>
              {busy ? <span className="spin" /> : `Show ${shown.length} ${shown.length === 1 ? 'entry' : 'entries'}`}
            </button>
          </div>
        </Sheet>
      )}
      {sheet?.kind === 'share' && tl && (
        <Sheet title="Share with your lawyer" onClose={() => setSheet(null)}>
          <ShareBody share={tl.share} query={query} onChange={(s) => setTl((d) => (d ? {...d, share: s} : d))} />
        </Sheet>
      )}
    </div>
  );
}

function PatternCard({p, on, onPick}: {p: Pattern; on: boolean; onPick: () => void}) {
  return (
    <button type="button" className={'rd-pat' + (on ? ' on' : '')} onClick={onPick} aria-pressed={on}>
      <Icon id={patternIcon(p.label)} size={36} />
      <span className="rd-pat-t"><b>{p.label}</b><small>{p.detail}</small></span>
      <em>{on ? 'Clear' : `See ${p.entryIds.length}`}</em>
    </button>
  );
}

function ActiveChip({children, onClear}: {children: ReactNode; onClear: () => void}) {
  return (
    <span className="rd-chip">
      <span>{children}</span>
      <button type="button" onClick={onClear} aria-label="Remove this filter">×</button>
    </span>
  );
}

/** The feed: month headings, one row per entry, a row opens to the full text with Edit / Delete. */
function Feed({months, now, onChanged}: {months: {month: string; items: RdEntry[]}[]; now: string; onChanged: () => void}) {
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(150);
  let left = limit;

  async function del(id: string) {
    setBusy(true); setError('');
    try { await api(`/api/journal/${id}`, {method: 'DELETE'}); setConfirmDel(null); setOpen(null); onChanged(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 404) { setConfirmDel(null); setOpen(null); onChanged(); }
      else setError((e as Error).message);
    }
    setBusy(false);
  }
  const total = months.reduce((s, m) => s + m.items.length, 0);

  return (
    <div className="rd-feed">
      {months.map((m) => {
        if (left <= 0) return null;
        const items = m.items.slice(0, left);
        left -= items.length;
        return (
          <section key={m.month} className="rd-month">
            <h2 className="rd-month-h">{m.month}<span>{m.items.length}</span></h2>
            <ol className="card rd-rows">
              {items.map((e) => {
                const k = entryKind(e);
                const isOpen = open === e.id;
                const tags = e.tags.filter((t) => VISIBLE_TAGS.includes(t) && TAG_LABEL[t] !== k.label);
                if (editing === e.id) return (
                  <li key={e.id} className="rd-row editing">
                    <EntryForm entry={e} now={now} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />
                  </li>
                );
                return (
                  <li key={e.id} id={`rd-e${e.exhibit}`} className={'rd-row' + (isOpen ? ' open' : '') + (e.kind === 'incident' ? ' inc' : '')}>
                    <button type="button" className="rd-row-main" onClick={() => { setOpen(isOpen ? null : e.id); setConfirmDel(null); setError(''); }} aria-expanded={isOpen}>
                      <Icon id={k.icon} size={40} />
                      <span className="rd-row-b">
                        <b className="rd-row-t">{e.title || k.label}</b>
                        <span className="rd-row-m">
                          <span className="rd-kind">{k.label}</span>
                          <span className="rd-dot">·</span><ChannelTag channel={e.channel} />
                        </span>
                        <span className="rd-row-d">{fmtDate(e.occurredAt, {weekday: 'short', month: 'short', day: 'numeric'})}, {fmtTime(e.occurredAt)}</span>
                        {/* No "Sample" chip per row: the shell's sample-case banner already says it once. */}
                        {tags.length > 0 && (
                          <span className="rd-tags">
                            {tags.map((t) => <span key={t} className={'chip ' + (t === 'tense' || t === 'in_front_of_kids' ? 'chip-warn' : t === 'date_unknown' ? 'chip-amber' : 'rd-tag')}>{TAG_LABEL[t] ?? t}</span>)}
                          </span>
                        )}
                      </span>
                      <span className="rd-row-r">
                        <span className="rd-ex" title="Exhibit number in the PDF">E-{e.exhibit}</span>
                        {e.amountCents != null && <span className="rd-amt">{money(e.amountCents)}</span>}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="rd-detail fade-in">
                        {e.text && <p className={e.kind.startsWith('message') ? 'rd-quote' : 'rd-text'}>{e.text}</p>}
                        <p className="rd-prov">{CATEGORY[e.category]} · {SOURCE[e.source]} · logged {fmtDate(e.createdAt)}</p>
                        {confirmDel === e.id ? (
                          <div className="rd-confirm" role="alertdialog" aria-label="Delete this entry?">
                            <span>Delete this entry for good? It won’t be in the PDF anymore, and the exhibits after it renumber.</span>
                            <button type="button" className="btn rd-danger" disabled={busy} onClick={() => void del(e.id)}>{busy ? <span className="spin" /> : 'Delete'}</button>
                            <button type="button" className="btn btn-quiet" onClick={() => setConfirmDel(null)}>Keep it</button>
                          </div>
                        ) : (
                          <div className="rd-acts">
                            <button type="button" className="btn btn-ghost" onClick={() => setEditing(e.id)}><Icon id="pencil" size={20} />Edit</button>
                            <button type="button" className="btn btn-quiet" onClick={() => setConfirmDel(e.id)}><Icon id="trash" size={20} />Delete</button>
                          </div>
                        )}
                        {error && confirmDel === e.id && <p className="jr-error" role="alert">{error}</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {total > limit && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setLimit((l) => l + 150)}>Show {Math.min(150, total - limit)} more ({total - limit} left)</button>
      )}
    </div>
  );
}

function LogPicker({onPick, onImport}: {onPick: (p: Preset) => void; onImport: () => void}) {
  const tiles = LOG_TILES.map((id) => PRESETS.find((p) => p.id === id)!).filter(Boolean);
  const note = PRESETS.find((p) => p.id === 'note')!;
  return (
    <div className="rd-pick">
      <div className="rd-tiles">
        {tiles.map((p) => (
          <button key={p.id} type="button" className="rd-tile" onClick={() => onPick(p)}>
            <Icon id={p.icon} size={44} /><span>{p.label}</span>
          </button>
        ))}
      </div>
      <div className="rd-rowopts">
        <button type="button" className="rd-opt" onClick={() => onPick(note)}>
          <Icon id={note.icon} size={36} /><span><b>Something else — a note</b><small>Anything worth a date and a time</small></span><i aria-hidden="true">›</i>
        </button>
        <button type="button" className="rd-opt" onClick={onImport}>
          <Icon id="chat" size={36} /><span><b>Import a chat</b><small>WhatsApp, OurFamilyWizard or TalkingParents PDF, screenshots</small></span><i aria-hidden="true">›</i>
        </button>
      </div>
      <p className="rd-privacy"><Icon id="lock" size={20} />Only you can see this. The other parent never sees Parley.</p>
    </div>
  );
}

function FilterBody({period, from, to, cats, type, q, set, firstDay, today}: {
  period: Period; from: string; to: string; cats: Category[]; type: string; q: string;
  set: (p: Record<string, string | null>) => void; firstDay: string; today: string;
}) {
  const toggleCat = (c: Category) => {
    const next = cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    set({categories: next.length && next.length < CATS.length ? next.join(',') : null});
  };
  return (
    <div className="rd-fil">
      <label className="rd-fil-g">
        <span className="rd-fil-l">Search</span>
        <input className="field" type="search" placeholder="Words, e.g. soccer" value={q} onChange={(e) => set({q: e.target.value || null})} />
      </label>
      <div className="rd-fil-g">
        <span className="rd-fil-l">Type</span>
        <div className="rd-seg" role="group" aria-label="Type">
          {TYPES.map((t) => <button key={t.id} type="button" className={type === t.id ? 'on' : ''} aria-pressed={type === t.id} onClick={() => set({type: t.id === 'all' ? null : t.id})}>{t.label}</button>)}
        </div>
      </div>
      <div className="rd-fil-g">
        <span className="rd-fil-l">Period</span>
        <div className="rd-seg" role="group" aria-label="Period">
          {PERIODS.map(([k, l]) => (
            <button key={k} type="button" className={period === k ? 'on' : ''} aria-pressed={period === k}
              onClick={() => (k === 'custom' ? set({period: 'custom', from: from || firstDay, to: to || today}) : set({period: k === 'all' ? null : k, from: null, to: null}))}>{l}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="rd-dates">
            <label>From<input type="date" className="field" value={from} max={to || undefined} onChange={(e) => set({from: e.target.value || null})} /></label>
            <label>To<input type="date" className="field" value={to} min={from || undefined} onChange={(e) => set({to: e.target.value || null})} /></label>
          </div>
        )}
      </div>
      <div className="rd-fil-g">
        <span className="rd-fil-l">Topics</span>
        <div className="rd-cats">
          <button type="button" className={!cats.length ? 'on' : ''} aria-pressed={!cats.length} onClick={() => set({categories: null})}>All</button>
          {CATS.map((c) => <button key={c} type="button" className={cats.includes(c) ? 'on' : ''} aria-pressed={cats.includes(c)} onClick={() => toggleCat(c)}>{CATEGORY[c]}</button>)}
        </div>
      </div>
      <p className="rd-fil-note">Period and topics also shape the PDF and renumber its exhibits. Type and search only narrow this list.</p>
    </div>
  );
}

/** A read-only link to the live PDF, for a lawyer or GAL. One at a time; turning it off kills it at once. */
function ShareBody({share, query, onChange}: {share: Share | null; query: string; onChange: (s: Share | null) => void}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const link = share ? window.location.origin + share.path : '';
  const create = async () => {
    setBusy(true); setErr('');
    try { onChange(await api<Share>('/api/timeline/share', {body: Object.fromEntries(new URLSearchParams(query))})); }
    catch (e) { setErr((e as Error).message || 'Could not make a link.'); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    setBusy(true); setErr('');
    try { await api('/api/timeline/share', {method: 'DELETE'}); onChange(null); }
    catch (e) { setErr((e as Error).message || 'Could not turn the link off.'); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setErr('Copy did not work here — select the link and copy it by hand.'); }
  };
  return (
    <div className="rd-shr">
      {share ? (
        <>
          <p>Anyone with this link can open the PDF, read-only. It always shows your latest record, with the period and topics you had when you made it.</p>
          <div className="rd-link">
            <input className="field" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
            <button type="button" className="btn btn-ghost" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <p className="rd-shr-meta">Expires {short(share.expiresAt)} · opened {share.views} {share.views === 1 ? 'time' : 'times'}</p>
          <div className="rd-shr-acts">
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void create()}>Update to this view</button>
            <button type="button" className="btn btn-quiet rd-off" disabled={busy} onClick={() => void revoke()}>Turn off link</button>
          </div>
        </>
      ) : (
        <>
          <p>A private link to the PDF for your attorney or GAL — no account needed on their side. Lasts 30 days; turn it off any time.</p>
          <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void create()}>
            {busy ? <span className="spin" /> : <Icon id="lock" size={22} />}Create a read-only link
          </button>
        </>
      )}
      {err && <p className="jr-error" role="alert">{err}</p>}
    </div>
  );
}

/** Bottom sheet on a phone, a centred dialog on a computer. Escape and the backdrop close it. */
function Sheet({title, onClose, onBack, children}: {title: string; onClose: () => void; onBack?: () => void; children: ReactNode}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [onClose]);
  return createPortal(
    <div className="rd-veil" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rd-sheet fade-in" role="dialog" aria-modal="true" aria-label={title}>
        <div className="rd-sheet-h">
          {onBack ? <button type="button" className="btn btn-quiet rd-sheet-x" onClick={onBack}>‹ Back</button> : <span />}
          <b>{title}</b>
          <button type="button" className="btn btn-quiet rd-sheet-x" onClick={onClose}>Close</button>
        </div>
        <div className="rd-sheet-b">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

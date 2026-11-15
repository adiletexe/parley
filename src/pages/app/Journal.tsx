/* /app/journal — the private, dated record: quick log, imports, patterns counted in code, and every entry,
   editable. Filtering happens here in the browser over the whole record, so it is instant; the server's
   filters on GET /api/journal are for other callers. */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import type {Category, Entry, EntryKind, Pattern} from '../../../shared/types';
import {api, track} from '../../lib/api';
import {Icon} from '../../components/Icon';
import {EntryForm} from './journal/EntryForm';
import {EntryList} from './journal/EntryList';
import {ImportPanel} from './journal/ImportPanel';
import {Patterns} from './journal/Patterns';
import {CATEGORY, PRESETS, fmtDate, money, type JournalData, type Preset} from './journal/util';
import './journal/journal.css';

const KIND_FILTERS: {id: string; label: string; kinds: EntryKind[]}[] = [
  {id: 'all', label: 'All', kinds: []},
  {id: 'messages', label: 'Messages', kinds: ['message_in', 'message_out']},
  {id: 'incidents', label: 'Incidents', kinds: ['incident']},
  {id: 'expenses', label: 'Expenses', kinds: ['expense']},
  {id: 'notes', label: 'Notes', kinds: ['note']},
];

export default function Journal() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<JournalData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [preset, setPreset] = useState<Preset | null>(() => PRESETS.find((p) => p.id === params.get('log')) ?? null);
  const [flash, setFlash] = useState('');
  const [kindF, setKindF] = useState('all');
  const [catF, setCatF] = useState<Category | ''>('');
  const [q, setQ] = useState('');
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const listTop = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { setData(await api<JournalData>('/api/journal')); setLoadError(''); }
    catch (e) { setLoadError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); track('journal_view'); }, [load]);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(''), 3500); return () => clearTimeout(t); }, [flash]);

  const shown = useMemo(() => {
    if (!data) return [];
    let out = data.entries;
    if (pattern) { const ids = new Set(pattern.entryIds); out = out.filter((e) => ids.has(e.id)); }
    const kinds = KIND_FILTERS.find((k) => k.id === kindF)!.kinds;
    if (kinds.length) out = out.filter((e) => kinds.includes(e.kind));
    if (catF) out = out.filter((e) => e.category === catF);
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length) out = out.filter((e) => { const h = `${e.title}\n${e.text}`.toLowerCase(); return words.every((w) => h.includes(w)); });
    return out;
  }, [data, pattern, kindF, catF, q]);

  const filtered = !!pattern || kindF !== 'all' || !!catF || !!q;
  const clearFilters = () => { setPattern(null); setKindF('all'); setCatF(''); setQ(''); };

  function pickPreset(p: Preset) {
    setPreset(preset?.id === p.id ? null : p);
    if (params.has('log')) { params.delete('log'); setParams(params, {replace: true}); }
  }

  function saved(e: Entry, created: boolean) {
    setData((d) => d && {...d, entries: created ? [e, ...d.entries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) : d.entries.map((x) => (x.id === e.id ? e : x))});
    if (created) { setPreset(null); setFlash(`Saved: ${e.title}`); }
    void load(); // stats and patterns are counted on the server
  }

  if (!data) {
    return (
      <div className="jr">
        <Header />
        {loadError ? (
          <div className="card jr-loaderr"><b>We couldn’t open your journal.</b><span>{loadError}</span><button className="btn btn-ghost" onClick={() => { setLoadError(''); void load(); }}>Try again</button></div>
        ) : (
          <div className="jr-loading"><span className="spin" /> Opening your journal…</div>
        )}
      </div>
    );
  }

  const s = data.stats;
  return (
    <div className="jr">
      <Header hasEntries={s.total > 0} />

      <div className="jr-stats">
        <Stat icon="messages" n={s.messages.toLocaleString('en-US')} label="Messages" sub={s.messages ? `${s.messagesIn} received` : 'none yet'} />
        <Stat icon="flag" n={String(s.incidents)} label="Incidents" sub={s.incidents ? 'logged by you' : 'none yet'} />
        <Stat icon="dollar" n={String(s.expenses)} label="Expenses" sub={s.expenses ? `${money(s.expenseCents)} total` : 'none yet'} />
        <Stat icon="calendar" n={s.first && s.last ? `${Math.max(1, Math.round((Date.parse(s.last) - Date.parse(s.first)) / 86_400_000) + 1)} days` : '·'} label="Covering"
          sub={s.first && s.last ? `${fmtDate(s.first, {month: 'short', day: 'numeric'})} – ${fmtDate(s.last, {month: 'short', day: 'numeric'})}` : 'no entries yet'} />
      </div>

      <div className="jr-layout">
        <div className="jr-main">
          <section className="card jr-quick">
            <div className="card-h"><Icon id="bolt" size={24} />Quick log</div>
            <div className="jr-presets">
              {PRESETS.map((p) => (
                <button key={p.id} className={'jr-preset' + (preset?.id === p.id ? ' on' : '')} onClick={() => pickPreset(p)} aria-pressed={preset?.id === p.id}>
                  <Icon id={p.icon} size={34} /><span>{p.label}</span>
                </button>
              ))}
            </div>
            {preset && <EntryForm key={preset.id} preset={preset} now={data.now} onSaved={saved} onCancel={() => setPreset(null)} />}
            {flash && <p className="jr-flash fade-in" role="status"><span className="chip chip-ok">Saved</span>{flash.replace(/^Saved: /, '')}</p>}
          </section>

          <section className="card jr-record" ref={listTop}>
            <div className="jr-record-h">
              <div className="card-h"><Icon id="record" size={24} />Your record</div>
              {s.total > 0 && <span className="jr-count">{filtered ? `${shown.length} of ${s.total}` : `${s.total} entries`}</span>}
            </div>
            {s.total > 0 && (
              <div className="jr-filters">
                <div className="jr-seg" role="tablist" aria-label="Entry type">
                  {KIND_FILTERS.map((k) => <button key={k.id} role="tab" aria-selected={kindF === k.id} className={kindF === k.id ? 'on' : ''} onClick={() => setKindF(k.id)}>{k.label}</button>)}
                </div>
                <div className="jr-filter-row">
                  <input className="field jr-search" type="search" placeholder="Search words, e.g. soccer" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entries" />
                  <select className="field jr-catsel" value={catF} onChange={(e) => setCatF(e.target.value as Category | '')} aria-label="Topic">
                    <option value="">All topics</option>
                    {(Object.keys(CATEGORY) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY[c]}</option>)}
                  </select>
                </div>
                {pattern && (
                  <div className="jr-patbar"><span>Showing the {pattern.entryIds.length} entries counted in <b>{pattern.label}</b></span><button className="btn btn-quiet" onClick={() => setPattern(null)}>Clear</button></div>
                )}
              </div>
            )}
            <EntryList entries={shown} now={data.now} filtered={filtered} onClear={clearFilters}
              onChanged={(e) => saved(e, false)}
              onDeleted={(id) => { setData((d) => d && {...d, entries: d.entries.filter((x) => x.id !== id)}); void load(); }} />
          </section>
        </div>

        <aside className="jr-side">
          <Patterns patterns={data.patterns} entryCount={s.total} active={pattern?.label ?? null}
            onPick={(p) => { setPattern(p); if (p) { setKindF('all'); setCatF(''); setQ(''); listTop.current?.scrollIntoView({behavior: 'smooth', block: 'start'}); } }} />
          <ImportPanel onImported={() => void load()} />
          <p className="jr-privacy"><Icon id="lock" size={22} />Private to you. The other parent never sees Parley. Parley is not a law firm and doesn’t give legal advice.</p>
        </aside>
      </div>
    </div>
  );
}

function Header({hasEntries}: {hasEntries?: boolean}) {
  return (
    <header className="jr-head">
      <div>
        <p className="jr-eyebrow">Journal</p>
        <h1>Every handoff, <span className="gt">on the record</span>.</h1>
        <p className="jr-lede">A private, dated log of messages, incidents and expenses, kept in calm, factual language a judge can read.</p>
      </div>
      {hasEntries && <Link to="/app/record" className="btn btn-ghost jr-tl"><Icon id="timeline" size={26} />Court timeline</Link>}
    </header>
  );
}

function Stat({icon, n, label, sub}: {icon: 'messages' | 'flag' | 'dollar' | 'calendar'; n: string; label: string; sub: string}) {
  return (
    <div className="jr-stat">
      <Icon id={icon} size={34} />
      <div><b>{n}</b><span>{label}</span><small>{sub}</small></div>
    </div>
  );
}

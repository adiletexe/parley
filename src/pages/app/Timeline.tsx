/* Court timeline: the journal filtered to a period and topics, numbered as exhibits exactly as the PDF numbers them
   (both come from GET /api/timeline), with the patterns on top and the PDF one click away. Filters live in the URL
   so a reload or a shared screen keeps them. */
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import type {Category, Channel, Entry, EntryKind, Pattern} from '../../../shared/types';
import {Icon, type IconId} from '../../components/Icon';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import './Timeline.css';

type TlEntry = Entry & {exhibit: number};
type TlPattern = Pattern & {exhibits: number[]};
interface Share { path: string; url: string; expiresAt: string; createdAt: string; views: number }
interface TimelineRes {
  entries: TlEntry[];
  patterns: TlPattern[];
  counts: {total: number; messages: number; incidents: number; expenses: number; notes: number; expenseCents: number};
  range: {first: string | null; last: string | null; total: number};
  fingerprint: string;
  share: Share | null;
}

const CATS: [Category, string][] = [
  ['schedule', 'Schedule'], ['money', 'Money'], ['health', 'Health'], ['school', 'School'],
  ['new_partner', 'New partner'], ['accusation', 'Accusation'], ['logistics', 'Logistics'], ['other', 'Other'],
];
const CAT_LABEL = Object.fromEntries(CATS) as Record<Category, string>;
const KIND: Record<EntryKind, {label: string; icon: IconId}> = {
  message_in: {label: 'Message received', icon: 'inbox'}, message_out: {label: 'Message sent', icon: 'reply'},
  incident: {label: 'Incident', icon: 'flag'}, note: {label: 'Note', icon: 'pencil'}, expense: {label: 'Expense', icon: 'dollar'},
};
const CHANNEL: Record<Channel, string> = {
  sms: 'Text', whatsapp: 'WhatsApp', email: 'Email', ofw: 'OurFamilyWizard', talkingparents: 'TalkingParents',
  in_person: 'In person', phone: 'Phone', other: 'Other',
};
const PERIODS = [['all', 'All time'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['custom', 'Custom']] as const;
type Period = (typeof PERIODS)[number][0];

const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'});
const fTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
const fMonth = (iso: string) => new Date(iso).toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
const fDay = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
const money = (c: number) => '$' + (c / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

function patternIcon(label: string): IconId {
  const l = label.toLowerCase();
  if (l.includes('late')) return 'clock';
  if (l.includes('missed handoff') || l.includes('schedule')) return 'calendar';
  if (l.includes('tense')) return 'flame';
  if (l.includes('children') || l.includes('kids')) return 'kids';
  if (l.includes('payment') || l.includes('money')) return 'dollarx';
  return 'chart';
}

/** "E-3, E-7, E-9–E-12" — the same collapsing the PDF uses. */
function exhibitRuns(nums: number[]): string[] {
  const s = [...new Set(nums)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    if (j - i >= 2) out.push(`E-${s[i]}–${s[j]}`); else for (let k = i; k <= j; k++) out.push(`E-${s[k]}`);
    i = j;
  }
  return out;
}

export default function Timeline() {
  const {me} = useMe();
  const [sp, setSp] = useSearchParams();
  const period = (PERIODS.some(([k]) => k === sp.get('period')) ? sp.get('period') : 'all') as Period;
  const cats = useMemo(() => (sp.get('categories') ?? '').split(',').filter((c): c is Category => c in CAT_LABEL), [sp]);
  const customFrom = sp.get('from') ?? '';
  const customTo = sp.get('to') ?? '';

  // "Today" is the person's own clock (demo time-travel moves it), in their own time zone.
  const today = useMemo(() => (me?.now ? new Date(me.now) : new Date()), [me?.now]);
  const {from, to} = useMemo(() => {
    if (period === '30' || period === '90') {
      const f = new Date(today); f.setDate(f.getDate() - (Number(period) - 1));
      return {from: ymd(f), to: ymd(today)};
    }
    if (period === 'custom') return {from: customFrom, to: customTo};
    return {from: '', to: ''};
  }, [period, customFrom, customTo, today]);

  const query = useMemo(() => {
    const q = new URLSearchParams({tz: TZ});
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    if (cats.length) q.set('categories', cats.join(','));
    return q.toString();
  }, [from, to, cats]);

  const [data, setData] = useState<TimelineRes | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try { setData(await api<TimelineRes>(`/api/timeline?${query}`, {signal})); }
    catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Could not load your timeline.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [query]);
  useEffect(() => { const ac = new AbortController(); void load(ac.signal); return () => ac.abort(); }, [load]);
  useEffect(() => { track('timeline_view'); }, []);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    setSp(next, {replace: true});
  };
  const toggleCat = (c: Category) => {
    const next = cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c];
    set({categories: next.length && next.length < CATS.length ? next.join(',') : null});
  };
  const choosePeriod = (p: Period) => {
    if (p === 'custom') {
      // Start the custom range from what is on screen, so switching to it changes nothing until a date is moved.
      const first = data?.range.first ? ymd(new Date(data.range.first)) : ymd(today);
      set({period: 'custom', from: from || first, to: to || ymd(today)});
    } else set({period: p === 'all' ? null : p, from: null, to: null});
  };
  const resetFilters = () => setSp(new URLSearchParams(), {replace: true});

  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const months = useMemo(() => {
    const g: {month: string; items: TlEntry[]}[] = [];
    for (const e of data?.entries ?? []) {
      const m = fMonth(e.occurredAt);
      if (g.at(-1)?.month !== m) g.push({month: m, items: []});
      g.at(-1)!.items.push(e);
    }
    return g;
  }, [data]);

  const jumpTo = (n: number) => {
    const el = document.getElementById(`tl-e${n}`);
    if (!el) return;
    el.scrollIntoView({behavior: 'smooth', block: 'center'});
    el.classList.remove('tl-flash'); void el.offsetWidth; el.classList.add('tl-flash');
  };

  const periodText = from || to
    ? `${from ? fDay(from) : 'the start'} – ${to ? fDay(to) : 'today'}`
    : data?.range.first ? `${fDay(ymd(new Date(data.range.first)))} – ${fDay(ymd(new Date(data.range.last!)))}` : 'All time';
  const filtered = !!(from || to || cats.length);
  const nothingYet = data && data.range.total === 0;

  return (
    <div className="tl fade-in">
      <header className="tl-head">
        <p className="tl-crumb">Court timeline</p>
        <h1>A record that <span className="gt">holds up</span>.</h1>
        <p className="tl-sub">Every message and incident from your journal, in date order, numbered as exhibits, the way a lawyer or a GAL wants to read it.</p>
      </header>

      {nothingYet ? (
        <div className="card tl-empty">
          <Icon id="record" size={56} />
          <h2>Your timeline builds itself from your journal</h2>
          <p>Log a late pickup, import a WhatsApp chat, or copy a reply from the coach, each one lands here with a date and an exhibit number.</p>
          <div className="tl-empty-acts">
            <Link to="/app/record" className="btn btn-primary">Open the journal</Link>
            <Link to="/app/reply" className="btn btn-ghost">Write a reply</Link>
          </div>
        </div>
      ) : (
        <>
          <section className="card tl-filters" aria-label="Filters">
            <div className="tl-frow">
              <span className="tl-flabel">Period</span>
              <div className="tl-seg" role="group" aria-label="Period">
                {PERIODS.map(([k, l]) => (
                  <button key={k} type="button" className={'tl-segb' + (period === k ? ' on' : '')} aria-pressed={period === k} onClick={() => choosePeriod(k)}>{l}</button>
                ))}
              </div>
              {period === 'custom' && (
                <div className="tl-dates">
                  <label><span>From</span><input type="date" className="field" value={customFrom} max={customTo || undefined} onChange={(e) => set({from: e.target.value || null})} /></label>
                  <label><span>To</span><input type="date" className="field" value={customTo} min={customFrom || undefined} onChange={(e) => set({to: e.target.value || null})} /></label>
                </div>
              )}
            </div>
            <div className="tl-frow">
              <span className="tl-flabel">Topics</span>
              <div className="tl-cats">
                <button type="button" className={'tl-cat' + (!cats.length ? ' on' : '')} aria-pressed={!cats.length} onClick={() => set({categories: null})}>All</button>
                {CATS.map(([c, l]) => (
                  <button key={c} type="button" className={'tl-cat' + (cats.includes(c) ? ' on' : '')} aria-pressed={cats.includes(c)} onClick={() => toggleCat(c)}>{l}</button>
                ))}
              </div>
            </div>
          </section>

          {error && !data ? (
            <div className="card tl-error">
              <p>{error}</p>
              <button type="button" className="btn btn-ghost" onClick={() => void load()}>Try again</button>
            </div>
          ) : !data ? (
            <div className="tl-loading"><span className="spin" /></div>
          ) : (
            <div className={'tl-grid' + (loading ? ' tl-busy' : '')}>
              <aside className="tl-side">
                <div className="card tl-export">
                  <div className="card-h"><Icon id="pdf" size={24} />Court-ready PDF</div>
                  <p className="tl-period">{periodText}{cats.length ? ` · ${cats.map((c) => CAT_LABEL[c]).join(', ')}` : ''}</p>
                  <div className="tl-stats">
                    <div><b>{data.counts.total}</b><span>entries</span></div>
                    <div><b>{data.counts.messages}</b><span>messages</span></div>
                    <div><b>{data.counts.incidents}</b><span>incidents</span></div>
                    <div><b>{data.counts.expenseCents ? money(data.counts.expenseCents) : data.counts.expenses}</b><span>{data.counts.expenseCents ? 'in expenses' : 'expenses'}</span></div>
                  </div>
                  {data.counts.total > 0 ? (
                    <a className="btn btn-primary btn-lg btn-block" href={`/api/timeline/pdf?${query}`} download onClick={() => track('timeline_pdf_click', {entries: data.counts.total})}>
                      <Icon id="download" size={22} />Download PDF
                    </a>
                  ) : (
                    <p className="tl-none">Nothing to export in this view.</p>
                  )}
                  <p className="tl-what">Cover page, patterns, a dated log with exhibit numbers E-1…E-{Math.max(1, data.counts.total)}, and every entry in full. US Letter.</p>
                  <div className="tl-fp" title="SHA-256 of exactly these entries. It is printed on every page of the PDF; any edit changes it.">
                    <Icon id="fingerprint" size={22} />
                    <div><span>Integrity fingerprint (SHA-256)</span><code>{data.fingerprint.slice(0, 16)}…{data.fingerprint.slice(-8)}</code></div>
                  </div>
                </div>

                {data.counts.total > 0 && <ShareCard share={data.share} query={query} onChange={(s) => setData((d) => (d ? {...d, share: s} : d))} />}

                {data.patterns.length > 0 && (
                  <div className="card tl-patterns">
                    <div className="card-h"><Icon id="chart" size={24} />Patterns in this record</div>
                    <ul>
                      {data.patterns.map((p) => (
                        <li key={p.label}>
                          <Icon id={patternIcon(p.label)} size={34} />
                          <div>
                            <b>{p.label}</b>
                            <p>{p.detail}</p>
                            <div className="tl-refs">
                              {exhibitRuns(p.exhibits).slice(0, 8).map((r) => (
                                <button key={r} type="button" className="tl-ref" onClick={() => jumpTo(Number(r.slice(2).split('–')[0]))}>{r}</button>
                              ))}
                              {exhibitRuns(p.exhibits).length > 8 && <span className="tl-more">+{exhibitRuns(p.exhibits).length - 8} more</span>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="tl-note">Counted in code from your entries, not guessed by AI. Each pattern cites its exhibits.</p>
                  </div>
                )}
              </aside>

              <section className="tl-list" aria-label="Chronological timeline">
                {error && <div className="card tl-error tl-inline"><p>{error}</p><button type="button" className="btn btn-ghost" onClick={() => void load()}>Try again</button></div>}
                {data.entries.length === 0 ? (
                  <div className="card tl-empty tl-empty-sm">
                    <Icon id="search" size={44} />
                    <h2>Nothing in this view</h2>
                    <p>No entries match {filtered ? 'these dates and topics' : 'yet'}.</p>
                    {filtered && <button type="button" className="btn btn-ghost" onClick={resetFilters}>Show everything</button>}
                  </div>
                ) : (
                  months.map((m) => (
                    <div key={m.month} className="tl-month">
                      <h2 className="tl-mhead">{m.month}<span>{m.items.length}</span></h2>
                      <ol className="card tl-rows">
                        {m.items.map((e) => {
                          const isOpen = open.has(e.id);
                          const body = e.text.trim();
                          const showBody = body && body !== e.title.trim();
                          return (
                            <li key={e.id} id={`tl-e${e.exhibit}`} className={'tl-row tl-k-' + e.kind}>
                              <div className="tl-ex">E-{e.exhibit}</div>
                              <div className="tl-when">
                                <b>{fDate(e.occurredAt)}</b>
                                <span>{fTime(e.occurredAt)}</span>
                              </div>
                              <div className="tl-body">
                                <div className="tl-meta">
                                  <Icon id={KIND[e.kind].icon} size={22} />
                                  <span className="tl-kind">{KIND[e.kind].label}</span>
                                  <span className="tl-dot">·</span>
                                  <span>{CHANNEL[e.channel]}</span>
                                  <span className={'chip tl-chip' + (e.kind === 'incident' ? ' chip-warn' : '')}>{CAT_LABEL[e.category]}</span>
                                  {e.amountCents ? <span className="chip chip-amber tl-chip">{money(e.amountCents)}</span> : null}
                                </div>
                                <p className="tl-title">{e.title}</p>
                                {showBody && (
                                  <>
                                    <p className={'tl-text' + (isOpen ? ' open' : '')}>{body}</p>
                                    {body.length > 160 && (
                                      <button type="button" className="tl-toggle" onClick={() => toggleOpen(e.id)} aria-expanded={isOpen}>
                                        {isOpen ? 'Show less' : 'Show full text'}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ))
                )}
                <p className="tl-disclaimer">Times are shown in your time zone ({TZ}). Parley is not a law firm and doesn't give legal advice, ask your attorney how to use this record.</p>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** A read-only link to the live PDF, for a lawyer or GAL. One at a time; turning it off kills it at once. */
function ShareCard({share, query, onChange}: {share: Share | null; query: string; onChange: (s: Share | null) => void}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const link = share ? window.location.origin + share.path : '';

  const create = async () => {
    setBusy(true); setErr('');
    try {
      const q = Object.fromEntries(new URLSearchParams(query));
      onChange(await api<Share>('/api/timeline/share', {body: q}));
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not make a link.'); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    setBusy(true); setErr('');
    try { await api('/api/timeline/share', {method: 'DELETE'}); onChange(null); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not turn the link off.'); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!share) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setErr('Copy did not work here, select the link and copy it by hand.'); }
  };

  return (
    <div className="card tl-share">
      <div className="card-h"><Icon id="lawyer" size={24} />Share with my lawyer</div>
      {share ? (
        <>
          <p className="tl-share-p">Anyone with this link can open the PDF (read-only). It always shows your latest record, with the filters you had when you made it.</p>
          <div className="tl-link">
            <input className="field" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
            <button type="button" className="btn btn-ghost" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <p className="tl-share-meta">
            Expires {new Date(share.expiresAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} · opened {share.views} {share.views === 1 ? 'time' : 'times'}
          </p>
          <div className="tl-share-acts">
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void create()}>Update to this view</button>
            <button type="button" className="btn btn-quiet tl-off" disabled={busy} onClick={() => void revoke()}>Turn off link</button>
          </div>
        </>
      ) : (
        <>
          <p className="tl-share-p">A private link to this PDF for your attorney or GAL, no account needed on their side. Lasts 30 days; turn it off any time.</p>
          <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => void create()}>
            {busy ? <span className="spin" /> : null}Create a read-only link
          </button>
        </>
      )}
      {err && <p className="tl-err">{err}</p>}
    </div>
  );
}

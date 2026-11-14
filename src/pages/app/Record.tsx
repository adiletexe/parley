/* /app/record — the record as the chat it mostly is: the other parent's texts on the left (a burst is one entry with
   a bubble per line), what you sent on the right, and everything else (late pickups, expenses, notes) as small
   centred pills between them, each with its exhibit number. Exhibits are positions in the whole record, oldest = E-1,
   from GET /api/timeline with no filters — the same list the PDF prints, so E-7 here is E-7 there.
   It mostly fills itself: the reply coach logs both sides, and screenshots / exports are imported from here. Writing
   an entry by hand is one row in the upload sheet, not a button over the chat.
   The chat scrolls inside its own box (not the window), so the header, the calendar and the pattern chips stay put
   while it moves; the box is sized to the screen in a layout effect. */
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import type {Entry, Pattern} from '../../../shared/types';
import {Icon, type IconId} from '../../components/Icon';
import {api, ApiError, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import {EntryForm} from './journal/EntryForm';
import {ImportPanel, type Source} from './journal/ImportPanel';
import {CATEGORY, CHANNEL, PRESETS, SOURCE, entryKind, fmtDate, fmtTime, money, type JournalData, type Preset} from './journal/util';
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
type Tone = 'amber' | 'pink' | 'green' | 'grey' | 'blue';
type ReportKind = 'lawyer' | 'month' | 'patterns';
interface Report { title: string; bullets: string[]; caution: string; from: string; to: string; entries: number; cached?: boolean }

const REPORTS: {id: ReportKind; icon: IconId; title: string; sub: string}[] = [
  {id: 'lawyer', icon: 'scale', title: 'Summary for my lawyer', sub: 'The main facts, with exhibit numbers'},
  {id: 'month', icon: 'calendar', title: 'This month in brief', sub: 'What happened in the last 30 days'},
  {id: 'patterns', icon: 'target', title: 'Patterns & concerns', sub: 'What keeps repeating, and how often'},
];
const LOG_TILES = ['late', 'noshow', 'schedule', 'kids', 'expense', 'payment'];

type SheetState =
  | null | {kind: 'add'} | {kind: 'import'; start?: Source; only?: Source[]} | {kind: 'log'; preset?: Preset}
  | {kind: 'share'} | {kind: 'report'; which?: ReportKind};

/* ---------- dates: entries get a display-zone day (tz.ts patches toLocale*); calendar math is on plain YYYY-MM-DD ---------- */
const ymd = (d: Date) => d.toLocaleDateString('en-CA');
const dayOf = (iso: string) => ymd(new Date(iso));
const kDate = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const kAdd = (k: string, n: number) => new Date(kDate(k).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const kWeek = (k: string) => kAdd(k, -kDate(k).getUTCDay()); // US weeks start on Sunday
const kMonth = (k: string) => k.slice(0, 8) + '01';
const kMonthAdd = (k: string, n: number) => { const d = kDate(kMonth(k)); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
const kFmt = (k: string, o: Intl.DateTimeFormatOptions) => kDate(k).toLocaleDateString('en-US', {...o, timeZone: 'UTC'});

/** What colour an entry is, on the calendar and on its pill: late / no-show amber, money green (unpaid pink),
 *  conflict pink, messages grey. */
function toneOf(e: Entry): Tone {
  if (e.kind === 'expense') return 'green';
  if (e.kind === 'message_in') return e.tags.includes('tense') ? 'pink' : 'grey';
  if (e.kind === 'message_out') return 'grey';
  if (e.kind === 'note') return 'blue';
  if (e.tags.includes('missed_payment') || e.tags.includes('in_front_of_kids')) return 'pink';
  if (e.tags.some((t) => ['late_pickup', 'no_show', 'schedule_change'].includes(t))) return 'amber';
  return 'pink';
}
const DOT_ORDER: Tone[] = ['amber', 'pink', 'green', 'grey'];

/** The other parent's name: the quiz if it ever asks, the sample case's Jordan, or the "Name:" the coach and the
 *  demo put on received messages. Otherwise the page is just "Your record". */
function otherName(entries: Entry[], quiz: Record<string, unknown> | undefined, demo: boolean): string | null {
  const q = quiz?.otherName ?? quiz?.other_name;
  if (typeof q === 'string' && q.trim()) return q.trim().slice(0, 24);
  if (demo) return 'Jordan';
  const n = new Map<string, number>();
  for (const e of entries) {
    const m = e.kind === 'message_in' ? /^([A-Z][\w'’-]{1,20}):\s/.exec(e.title) : null;
    if (m && !['Them', 'Other', 'Me'].includes(m[1])) n.set(m[1], (n.get(m[1]) ?? 0) + 1);
  }
  const top = [...n.entries()].sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 2 ? top[0] : null;
}

/** A pattern as a chip: the number first, a few words, and exactly the entries it counts. */
interface Chip { id: string; label: string; tone: Tone; ids: string[] }
function chipsFrom(patterns: Pattern[], entries: Entry[]): Chip[] {
  const out: Chip[] = [];
  const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
  for (const p of patterns) {
    if (!p.entryIds.length) continue;
    const ids = p.entryIds;
    let label = '', tone: Tone = 'pink';
    if (p.label === 'Late pickups') { const of = /of the last (\d+)/.exec(p.detail)?.[1]; label = of ? `${p.count}/${of} pickups late` : plural(p.count, 'late pickup'); tone = 'amber'; }
    else if (p.label === 'Missed handoffs') { label = plural(p.count, 'no-show'); tone = 'amber'; }
    else if (p.label.startsWith('Most tense topic')) label = `Tense topic: ${p.label.split(': ')[1]}`;
    else if (p.label === 'Tense messages per week') label = plural(ids.length, 'tense text');
    else if (p.label === 'Conflict in front of the children') label = `${p.count}× in front of the kids`;
    else if (p.label === 'Missed payments') label = plural(p.count, 'missed payment');
    else if (p.label === 'Schedule changes') { label = plural(p.count, 'schedule change'); tone = 'amber'; }
    else label = p.label;
    out.push({id: p.label, label, tone, ids});
  }
  const exp = entries.filter((e) => e.kind === 'expense' && e.amountCents);
  if (exp.length) {
    const chip: Chip = {id: 'expenses', label: `${money(exp.reduce((s, e) => s + (e.amountCents ?? 0), 0))} shared costs`, tone: 'green', ids: exp.map((e) => e.id)};
    out.splice(Math.min(1, out.length), 0, chip);
  }
  return out;
}

/** The chat box fills the screen down to the tab bar (phones) or the page's bottom padding (computers). */
function useFillHeight(ref: RefObject<HTMLElement>, deps: unknown[]) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const main = el.closest('.shell-main');
      const pad = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(460, window.innerHeight - top - pad)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function Record() {
  const {me} = useMe();
  const tz = me?.tz || (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  const today = useMemo(() => ymd(me?.now ? new Date(me.now) : new Date()), [me?.now]);

  // ---- data ----
  const [journal, setJournal] = useState<JournalData | null>(null);
  const [tl, setTl] = useState<TimelineRes | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [t, j] = await Promise.all([
        api<TimelineRes>(`/api/timeline?${new URLSearchParams({tz})}`),
        api<JournalData>('/api/journal'),
      ]);
      setTl(t); setJournal(j); setError('');
      return t;
    } catch (e) { setError((e as Error).message); return null; }
  }, [tz]);
  useEffect(() => { void load(); track('record_view'); }, [load]);

  const entries = useMemo(() => tl?.entries ?? [], [tl]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const days = useMemo(() => {
    const g: {key: string; items: RdEntry[]}[] = [];
    for (const e of entries) { const k = dayOf(e.occurredAt); if (g.at(-1)?.key !== k) g.push({key: k, items: []}); g.at(-1)!.items.push(e); }
    return g;
  }, [entries]);
  const dots = useMemo(() => {
    const m = new Map<string, Tone[]>();
    for (const d of days) {
      const set = new Set<Tone>(d.items.map(toneOf).map((t): Tone => (t === 'blue' ? 'grey' : t)));
      m.set(d.key, DOT_ORDER.filter((t) => set.has(t)));
    }
    return m;
  }, [days]);
  const chips = useMemo(() => chipsFrom(journal?.patterns ?? [], entries), [journal, entries]);
  const name = useMemo(() => otherName(entries, me?.quiz, !!me?.demo), [entries, me?.quiz, me?.demo]);
  const firstDay = days[0]?.key ?? today, lastDay = days.at(-1)?.key ?? today;

  // ---- the scroller ----
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useFillHeight(rootRef, [!!tl, !!me?.demo]);
  const [visibleDay, setVisibleDay] = useState<string | null>(null);
  const [flashDay, setFlashDay] = useState<string | null>(null);
  const [flashEntry, setFlashEntry] = useState<string | null>(null);
  const firstScroll = useRef(false);
  useLayoutEffect(() => { // a chat opens at the newest message
    const s = scrollRef.current;
    if (!s || !days.length || firstScroll.current) return;
    firstScroll.current = true;
    s.scrollTop = s.scrollHeight;
    setVisibleDay(days.at(-1)!.key);
  }, [days]);
  const onScroll = useCallback(() => {
    const s = scrollRef.current;
    if (!s) return;
    const secs = s.querySelectorAll<HTMLElement>('[data-day]');
    let cur: string | null = null;
    for (const el of secs) { if (el.offsetTop - s.scrollTop <= 60) cur = el.dataset.day!; else break; }
    setVisibleDay(cur ?? secs[0]?.dataset.day ?? null);
  }, []);
  const rafRef = useRef(0);
  const scrolled = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(onScroll); };

  const jumpDay = useCallback((k: string, smooth = true) => {
    const s = scrollRef.current;
    const el = s?.querySelector<HTMLElement>(`[data-day="${k}"]`);
    if (!s || !el) return;
    s.scrollTo({top: Math.max(0, el.offsetTop - 8), behavior: smooth ? 'smooth' : 'auto'});
    setFlashDay(null);
    requestAnimationFrame(() => setFlashDay(k));
  }, []);
  const jumpEntry = useCallback((id: string) => {
    const s = scrollRef.current;
    const el = s?.querySelector<HTMLElement>(`[data-entry="${id}"]`);
    if (!s || !el) return;
    s.scrollTo({top: Math.max(0, el.offsetTop - s.clientHeight / 2 + el.offsetHeight / 2), behavior: 'smooth'});
    setFlashEntry(null);
    requestAnimationFrame(() => setFlashEntry(id));
  }, []);
  useEffect(() => { if (!flashDay) return; const t = setTimeout(() => setFlashDay(null), 1800); return () => clearTimeout(t); }, [flashDay]);
  useEffect(() => { if (!flashEntry) return; const t = setTimeout(() => setFlashEntry(null), 1800); return () => clearTimeout(t); }, [flashEntry]);

  // ---- a pattern chip highlights its entries; ‹ › steps through them ----
  const [chipId, setChipId] = useState<string | null>(null);
  const [hlAt, setHlAt] = useState(0);
  const chip = chips.find((c) => c.id === chipId) ?? null;
  const hits = useMemo(() => (chip ? chip.ids.filter((id) => byId.has(id)).sort((a, b) => byId.get(a)!.exhibit - byId.get(b)!.exhibit) : []), [chip, byId]);
  const hitSet = useMemo(() => new Set(hits), [hits]);
  const pickChip = (c: Chip) => {
    if (chipId === c.id) { setChipId(null); return; }
    setChipId(c.id);
    const list = c.ids.filter((id) => byId.has(id)).sort((a, b) => byId.get(a)!.exhibit - byId.get(b)!.exhibit);
    setHlAt(list.length - 1);
    if (list.length) jumpEntry(list.at(-1)!);
    track('record_chip', {chip: c.id});
  };
  const stepHit = (d: number) => { const i = Math.min(hits.length - 1, Math.max(0, hlAt + d)); setHlAt(i); jumpEntry(hits[i]); };

  // ---- calendar ----
  const [calMonth, setCalMonth] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  useEffect(() => { setAnchor(null); }, [visibleDay]);
  const anchorDay = anchor ?? visibleDay ?? lastDay;
  const pickDay = (k: string) => { jumpDay(k); setCalMonth(false); track('record_calendar_jump'); };

  // ---- sheets ----
  const [sheet, setSheet] = useState<SheetState>(null);
  const [flash, setFlash] = useState('');
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(''), 3500); return () => clearTimeout(t); }, [flash]);
  const reload = () => { void load(); };

  // After an import: refresh, then scroll to the newest day the import brought in.
  const imported = async () => {
    const t = await load();
    const fresh = (t?.entries ?? []).filter((e) => e.source === 'screenshot' || e.source === 'import_whatsapp' || e.source === 'import_pdf');
    if (!fresh.length) return;
    const newest = fresh.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt;
    const batch = fresh.filter((e) => Math.abs(new Date(e.createdAt).getTime() - new Date(newest).getTime()) < 10_000);
    const last = batch.reduce((a, b) => (a.occurredAt > b.occurredAt ? a : b));
    setTimeout(() => jumpDay(dayOf(last.occurredAt)), 120);
  };
  function saved(e: Entry, created: boolean) {
    if (created) { setSheet(null); setFlash(e.title || 'Entry saved'); }
    void load().then(() => { if (created) setTimeout(() => jumpEntry(e.id), 120); });
  }

  const pdfHref = `/api/timeline/pdf?${new URLSearchParams({tz})}`;
  const pdfClick = () => track('timeline_pdf_click', {entries: entries.length, from: 'record'});
  const empty = tl && tl.range.total === 0;
  const sub = entries.length
    ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · ${kFmt(firstDay, {month: 'short', day: 'numeric'})}${firstDay === lastDay ? '' : ` – ${kFmt(lastDay, {month: 'short', day: 'numeric'})}`}`
    : 'Fills itself from your replies and screenshots';
  const openScreens = () => { setSheet({kind: 'import', start: 'screenshot'}); track('record_upload_open'); };

  // ---- render ----
  const header = (
    <header className="rd-head">
      <span className="rd-ava" aria-hidden="true">{name ? name[0].toUpperCase() : <Icon id="record" size={30} />}</span>
      <div className="rd-head-t">
        <h1>{name ?? 'Your record'}</h1>
        <p>{sub}</p>
      </div>
      {!empty && tl && (
        <a className="btn rd-pdf-btn" href={pdfHref} download onClick={pdfClick} aria-disabled={!entries.length}>
          <Icon id="pdf" size={22} />PDF
        </a>
      )}
      <button type="button" className="btn rd-icon-btn" onClick={() => setSheet({kind: 'add'})} aria-label="Add to your record: screenshots, exports or a note" title="Add screenshots, an export or a note">
        <Icon id="upload" size={24} />
      </button>
    </header>
  );

  let chat: ReactNode;
  if (!tl && error) {
    chat = (
      <div className="rd-center">
        <div className="card rd-err">
          <b>We couldn’t open your record.</b><span>{error}</span>
          <button type="button" className="btn btn-ghost" onClick={reload}>Try again</button>
        </div>
      </div>
    );
  } else if (!tl) {
    chat = <div className="rd-center rd-loading"><span className="spin" /> Opening your record…</div>;
  } else if (empty) {
    chat = (
      <div className="rd-center">
        <section className="rd-empty fade-in">
          <Icon id="record" size={56} />
          <h2>Your record fills itself</h2>
          <p>Every reply you write with Parley lands here, dated, with their message next to it. Add screenshots of your chat
            with the other parent and we’ll read them in too.</p>
          <p>Each message and event gets an exhibit number — E-1, E-2… — so it’s one PDF for your lawyer when you need it.</p>
          <div className="rd-empty-acts">
            <button type="button" className="btn btn-primary" onClick={openScreens}><Icon id="camera" size={24} />Upload screenshots</button>
            <button type="button" className="btn btn-ghost" onClick={() => setSheet({kind: 'import', only: ['whatsapp', 'pdf']})}><Icon id="chat" size={24} />WhatsApp or OFW export</button>
          </div>
          <button type="button" className="btn btn-quiet" onClick={() => setSheet({kind: 'log'})}>+ Write a note instead</button>
          <p className="rd-privacy"><Icon id="lock" size={20} />Private to you. The other parent never sees Parley.</p>
        </section>
      </div>
    );
  } else {
    chat = (
      <Chat days={days} name={name} now={journal?.now ?? new Date().toISOString()} onChanged={reload}
        flashDay={flashDay} flashEntry={flashEntry} hits={chip ? hitSet : null} current={chip ? hits[hlAt] : null} tz={tz} />
    );
  }

  const reportsCard = (
    <section className="card rd-side-card">
      <div className="card-h"><Icon id="bolt" size={24} />AI reports</div>
      <div className="rd-rep-btns">
        {REPORTS.map((r) => (
          <button key={r.id} type="button" className="rd-opt" onClick={() => setSheet({kind: 'report', which: r.id})}>
            <Icon id={r.icon} size={32} /><span><b>{r.title}</b><small>{r.sub}</small></span><i aria-hidden="true">›</i>
          </button>
        ))}
      </div>
      <p className="rd-foot">Written from your entries only, with exhibit numbers. Not legal advice.</p>
    </section>
  );

  return (
    <div className="rd fade-in" ref={rootRef}>
      <div className="rd-col">
        {header}
        {tl && !empty && (
          <>
            <div className="rd-cal-m">
              <Calendar mode={calMonth ? 'month' : 'week'} anchor={anchorDay} setAnchor={setAnchor} dots={dots} today={today}
                selected={visibleDay} first={firstDay} last={lastDay} onPick={pickDay} onToggle={() => setCalMonth((m) => !m)} />
            </div>
            <div className="rd-chips" role="toolbar" aria-label="Patterns in your record">
              <button type="button" className="rd-chipb rd-chip-ai" onClick={() => setSheet({kind: 'report'})}>
                <span aria-hidden="true">✦</span>Reports
              </button>
              {chips.map((c) => (
                <button key={c.id} type="button" className={`rd-chipb t-${c.tone}` + (chipId === c.id ? ' on' : '')} aria-pressed={chipId === c.id} onClick={() => pickChip(c)}>
                  {c.label}
                </button>
              ))}
            </div>
            {chip && (
              <div className="rd-hl fade-in" role="status">
                <span className="rd-hl-t"><b>{chip.label}</b> · {hits.length ? `${hlAt + 1} of ${hits.length}` : 'none here'}</span>
                <button type="button" className="rd-hl-b" onClick={() => stepHit(-1)} disabled={hlAt <= 0} aria-label="Earlier">‹</button>
                <button type="button" className="rd-hl-b" onClick={() => stepHit(1)} disabled={hlAt >= hits.length - 1} aria-label="Later">›</button>
                <button type="button" className="rd-hl-x" onClick={() => setChipId(null)}>Done</button>
              </div>
            )}
          </>
        )}
        <div className="rd-scroll" ref={scrollRef} onScroll={scrolled}>
          {chat}
        </div>
        {flash && <p className="rd-flash fade-in" role="status"><span className="chip chip-ok">Saved</span>{flash}</p>}
        {tl && !empty && (
          <div className="rd-compose">
            <button type="button" className="rd-field" onClick={openScreens}>
              <Icon id="camera" size={26} /><span>Upload screenshots of your chat</span>
            </button>
            <button type="button" className="rd-plus-btn" onClick={() => setSheet({kind: 'add'})} aria-label="More ways to add: export or a note">+</button>
          </div>
        )}
      </div>

      {tl && !empty && (
        <aside className="rd-side">
          <section className="card rd-side-card rd-cal-card">
            <Calendar mode="month" anchor={anchorDay} setAnchor={setAnchor} dots={dots} today={today}
              selected={visibleDay} first={firstDay} last={lastDay} onPick={pickDay} />
          </section>
          {reportsCard}
          <section className="card rd-side-card">
            <div className="card-h"><Icon id="scale" size={24} />For your lawyer</div>
            <p className="rd-lawyer-p">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}, numbered E-1 to E-{entries.length}, with patterns and the full text of each.</p>
            <a className="btn btn-primary btn-block" href={pdfHref} download onClick={pdfClick}><Icon id="pdf" size={22} />Download PDF</a>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setSheet({kind: 'share'})}><Icon id="lock" size={22} />{tl.share ? 'Share link is on' : 'Share a read-only link'}</button>
            <p className="rd-fp" title="SHA-256 of exactly these entries. It is printed on every page of the PDF; any edit changes it.">
              <Icon id="shield" size={20} /><span>Fingerprint <code>{tl.fingerprint.slice(0, 10)}…{tl.fingerprint.slice(-6)}</code></span>
            </p>
          </section>
          <p className="rd-foot">Times in {tz.replace(/_/g, ' ')}. Exhibit numbers match the PDF: oldest = E-1. Parley is not a law firm and doesn’t give legal advice.</p>
        </aside>
      )}

      {sheet?.kind === 'add' && (
        <Sheet title="Add to your record" onClose={() => setSheet(null)}>
          <div className="rd-rowopts">
            <button type="button" className="rd-opt rd-opt-main" onClick={openScreens}>
              <Icon id="camera" size={40} /><span><b>Screenshots of your chat</b><small>Texts, iMessage, Messenger — up to 8 at a time</small></span><i aria-hidden="true">›</i>
            </button>
            <button type="button" className="rd-opt" onClick={() => setSheet({kind: 'import', only: ['whatsapp', 'pdf']})}>
              <Icon id="chat" size={40} /><span><b>WhatsApp export or OFW PDF</b><small>Also TalkingParents message reports</small></span><i aria-hidden="true">›</i>
            </button>
            <button type="button" className="rd-opt" onClick={() => setSheet({kind: 'log'})}>
              <Icon id="pencil" size={40} /><span><b>+ Note</b><small>A late pickup, a no-show, an expense — by hand</small></span><i aria-hidden="true">›</i>
            </button>
            <button type="button" className="rd-opt" onClick={() => setSheet({kind: 'share'})}>
              <Icon id="lock" size={40} /><span><b>Share with your lawyer</b><small>{tl?.share ? 'Your read-only link is on' : 'A read-only link to the PDF'}</small></span><i aria-hidden="true">›</i>
            </button>
          </div>
          <p className="rd-privacy"><Icon id="lock" size={20} />Only you can see this. The other parent never sees Parley.</p>
        </Sheet>
      )}
      {sheet?.kind === 'import' && (
        <Sheet title={sheet.start === 'screenshot' ? 'Upload screenshots' : 'Import a chat'} onClose={() => setSheet(null)} onBack={() => setSheet({kind: 'add'})}>
          <ImportPanel bare start={sheet.start} only={sheet.only} onImported={() => void imported()} />
        </Sheet>
      )}
      {sheet?.kind === 'log' && (
        <Sheet title={sheet.preset ? sheet.preset.label : 'Add a note'} onClose={() => setSheet(null)}
          onBack={sheet.preset ? () => setSheet({kind: 'log'}) : () => setSheet({kind: 'add'})}>
          {sheet.preset ? (
            <EntryForm key={sheet.preset.id} preset={sheet.preset} now={journal?.now ?? new Date().toISOString()}
              onSaved={saved} onCancel={() => setSheet({kind: 'log'})} />
          ) : (
            <LogPicker onPick={(p) => setSheet({kind: 'log', preset: p})} />
          )}
        </Sheet>
      )}
      {sheet?.kind === 'share' && tl && (
        <Sheet title="Share with your lawyer" onClose={() => setSheet(null)}>
          <ShareBody share={tl.share} query={new URLSearchParams({tz}).toString()} onChange={(s) => setTl((d) => (d ? {...d, share: s} : d))} />
        </Sheet>
      )}
      {sheet?.kind === 'report' && (
        <Sheet title={sheet.which ? REPORTS.find((r) => r.id === sheet.which)!.title : 'AI reports'} onClose={() => setSheet(null)}
          onBack={sheet.which ? () => setSheet({kind: 'report'}) : undefined}>
          {sheet.which
            ? <ReportBody key={sheet.which} kind={sheet.which} tz={tz} onExhibit={(n) => { const e = entries.find((x) => x.exhibit === n); if (e) { setSheet(null); setTimeout(() => jumpEntry(e.id), 60); } }} />
            : (
              <div className="rd-rowopts">
                {REPORTS.map((r) => (
                  <button key={r.id} type="button" className="rd-opt" onClick={() => setSheet({kind: 'report', which: r.id})}>
                    <Icon id={r.icon} size={40} /><span><b>{r.title}</b><small>{r.sub}</small></span><i aria-hidden="true">›</i>
                  </button>
                ))}
                <p className="rd-foot">Written from your entries only, citing exhibit numbers. Parley doesn’t give legal advice.</p>
              </div>
            )}
        </Sheet>
      )}
    </div>
  );
}

/* ---------- the chat ---------- */

function Chat({days, name, now, onChanged, flashDay, flashEntry, hits, current, tz}: {
  days: {key: string; items: RdEntry[]}[]; name: string | null; now: string; onChanged: () => void;
  flashDay: string | null; flashEntry: string | null; hits: Set<string> | null; current: string | null; tz: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const thisYear = new Date(now).getFullYear();

  async function del(id: string) {
    setBusy(true); setError('');
    try { await api(`/api/journal/${id}`, {method: 'DELETE'}); setConfirmDel(null); setOpen(null); onChanged(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 404) { setConfirmDel(null); setOpen(null); onChanged(); }
      else setError((e as Error).message);
    }
    setBusy(false);
  }
  const toggle = (id: string) => { setOpen(open === id ? null : id); setConfirmDel(null); setError(''); };
  // An opened entry's details land under it; bring them into view when they open below the fold.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => document.querySelector(`[data-entry="${open}"] .rd-det`)?.scrollIntoView({block: 'nearest', behavior: 'smooth'}));
  }, [open]);

  const detail = (e: RdEntry) => (
    <div className={'rd-det fade-in' + (e.kind === 'message_out' ? ' r' : e.kind === 'message_in' ? ' l' : '')}>
      {!e.kind.startsWith('message') && e.text && <p className="rd-det-text">{e.text}</p>}
      <p className="rd-det-meta">
        <b>E-{e.exhibit}</b> · {fmtDate(e.occurredAt, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'})}, {fmtTime(e.occurredAt)} · {CHANNEL[e.channel]} · {CATEGORY[e.category]}
        {e.amountCents != null ? ` · ${money(e.amountCents)}` : ''}<br />{SOURCE[e.source]}
      </p>
      {confirmDel === e.id ? (
        <div className="rd-confirm" role="alertdialog" aria-label="Delete this entry?">
          <span>Delete this for good? It won’t be in the PDF anymore, and the exhibits after it renumber.</span>
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
  );

  return (
    <div className={'rd-chat' + (hits ? ' rd-hlmode' : '')}>
      {days.map((d) => {
        const date = kDate(d.key);
        const label = kFmt(d.key, {weekday: 'short', month: 'short', day: 'numeric', ...(date.getUTCFullYear() !== thisYear ? {year: 'numeric'} : {})});
        return (
          <section key={d.key} data-day={d.key} className={'rd-day' + (flashDay === d.key ? ' flash' : '')}>
            <div className="rd-sep"><span>{label}</span></div>
            {d.items.map((e) => {
              const cls = (hits ? (hits.has(e.id) ? ' hit' : ' dim') : '') + (current === e.id || flashEntry === e.id ? ' cur' : '');
              if (editing === e.id) return (
                <div key={e.id} data-entry={e.id} className="rd-editing">
                  <EntryForm entry={e} now={now} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />
                </div>
              );
              const isOpen = open === e.id;
              if (e.kind === 'message_in' || e.kind === 'message_out') {
                const inc = e.kind === 'message_in';
                const lines = inc ? e.text.split(/\n+/).map((s) => s.trim()).filter(Boolean) : [e.text.trim()];
                const bubbles = lines.length ? lines : [e.title];
                return (
                  <div key={e.id} data-entry={e.id} className={'rd-msg ' + (inc ? 'in' : 'out') + cls}>
                    <button type="button" className="rd-bubbles" onClick={() => toggle(e.id)} aria-expanded={isOpen}
                      aria-label={`${inc ? (name ?? 'The other parent') : 'You'}, ${fmtTime(e.occurredAt)}, exhibit E-${e.exhibit}`}>
                      {bubbles.map((b, i) => <span key={i} className="rd-bub">{b}</span>)}
                    </button>
                    <span className="rd-meta">
                      {e.tags.includes('tense') && inc && <i className="rd-tense">Tense</i>}
                      {fmtTime(e.occurredAt)} · <b>E-{e.exhibit}</b>
                    </span>
                    {isOpen && detail(e)}
                  </div>
                );
              }
              const k = entryKind(e);
              return (
                <div key={e.id} data-entry={e.id} className={'rd-sys' + cls}>
                  <button type="button" className={`rd-pill t-${toneOf(e)}`} onClick={() => toggle(e.id)} aria-expanded={isOpen}>
                    <Icon id={k.icon} size={22} />
                    <span className="rd-pill-t">{e.title || k.label}</span>
                    {e.amountCents != null && <span className="rd-pill-a">{money(e.amountCents)}</span>}
                    <span className="rd-pill-x">E-{e.exhibit}</span>
                  </button>
                  {isOpen && detail(e)}
                </div>
              );
            })}
          </section>
        );
      })}
      <p className="rd-foot rd-chat-foot">Times in {tz.replace(/_/g, ' ')}. Numbered as in the PDF: oldest = E-1.</p>
    </div>
  );
}

/* ---------- calendar: a week strip on phones (with a month toggle), a month grid beside the chat on computers ---------- */

function Calendar({mode, anchor, setAnchor, dots, today, selected, first, last, onPick, onToggle}: {
  mode: 'week' | 'month'; anchor: string; setAnchor: (k: string) => void; dots: Map<string, Tone[]>; today: string;
  selected: string | null; first: string; last: string; onPick: (k: string) => void; onToggle?: () => void;
}) {
  const start = mode === 'week' ? kWeek(anchor) : kMonth(anchor);
  const cells: (string | null)[] = [];
  if (mode === 'week') for (let i = 0; i < 7; i++) cells.push(kAdd(start, i));
  else {
    const lead = kDate(start).getUTCDay();
    for (let i = 0; i < lead; i++) cells.push(null);
    const next = kMonthAdd(start, 1);
    for (let k = start; k < next; k = kAdd(k, 1)) cells.push(k);
    while (cells.length % 7) cells.push(null);
  }
  const prev = mode === 'week' ? kAdd(start, -7) : kMonthAdd(start, -1);
  const next = mode === 'week' ? kAdd(start, 7) : kMonthAdd(start, 1);
  const end = last > today ? last : today;
  const canPrev = start > (mode === 'week' ? kWeek(first) : kMonth(first));
  const canNext = next <= (mode === 'week' ? end : kMonth(end));
  const title = mode === 'week'
    ? `${kFmt(start, {month: 'short', day: 'numeric'})} – ${kFmt(kAdd(start, 6), {month: kAdd(start, 6).slice(5, 7) === start.slice(5, 7) ? undefined : 'short', day: 'numeric'})}`
    : kFmt(start, {month: 'long', year: 'numeric'});

  return (
    <div className={'rd-cal ' + mode}>
      <div className="rd-cal-h">
        <button type="button" className="rd-cal-nav" onClick={() => setAnchor(prev)} disabled={!canPrev} aria-label={mode === 'week' ? 'Previous week' : 'Previous month'}>‹</button>
        <b>{title}</b>
        <button type="button" className="rd-cal-nav" onClick={() => setAnchor(next)} disabled={!canNext} aria-label={mode === 'week' ? 'Next week' : 'Next month'}>›</button>
        {onToggle && (
          <button type="button" className="rd-cal-tog" onClick={onToggle} aria-expanded={mode === 'month'}>
            <Icon id="calendar" size={20} />{mode === 'month' ? 'Week' : 'Month'}
          </button>
        )}
      </div>
      <div className="rd-cal-g" role="grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="rd-cal-wd" aria-hidden="true">{d}</span>)}
        {cells.map((k, i) => {
          if (!k) return <span key={i} />;
          const ds = dots.get(k);
          return (
            <button key={k} type="button" disabled={!ds} onClick={() => onPick(k)}
              className={'rd-cal-d' + (k === today ? ' today' : '') + (k === selected ? ' sel' : '') + (ds ? ' has' : '')}
              aria-label={kFmt(k, {weekday: 'long', month: 'long', day: 'numeric'}) + (ds ? '' : ', nothing logged')} aria-current={k === selected ? 'date' : undefined}>
              {mode === 'week' && <span className="wd">{kFmt(k, {weekday: 'short'})}</span>}
              <span className="n">{Number(k.slice(8))}</span>
              <span className="dots">{(ds ?? []).slice(0, 3).map((t) => <i key={t} className={'t-' + t} />)}</span>
            </button>
          );
        })}
      </div>
      {mode === 'month' && (
        <p className="rd-cal-key"><i className="t-amber" />Late / no-show <i className="t-green" />Money <i className="t-pink" />Conflict <i className="t-grey" />Messages</p>
      )}
    </div>
  );
}

/* ---------- AI report ---------- */

function ReportBody({kind, tz, onExhibit}: {kind: ReportKind; tz: string; onExhibit: (n: number) => void}) {
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setR(null); setErr('');
    api<Report>('/api/record/report', {body: {kind, tz}})
      .then((x) => { if (live) { setR(x); track('record_report_view', {kind, cached: !!x.cached}); } })
      .catch((e) => { if (live) setErr((e as Error).message); });
    return () => { live = false; };
  }, [kind, tz, n]);

  const copy = async () => {
    if (!r) return;
    const text = `${r.title}\n${kFmt(r.from, {month: 'short', day: 'numeric', year: 'numeric'})} – ${kFmt(r.to, {month: 'short', day: 'numeric', year: 'numeric'})} · ${r.entries} entries\n\n${r.bullets.map((b) => `• ${b}`).join('\n')}\n\n${r.caution}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setErr('Copy did not work here — select the text and copy it by hand.'); }
  };

  if (err && !r) return (
    <div className="rd-rep">
      <p className="jr-error" role="alert">{err}</p>
      <button type="button" className="btn btn-ghost" onClick={() => setN((x) => x + 1)}>Try again</button>
    </div>
  );
  if (!r) return <div className="rd-rep rd-loading"><span className="spin" /> Reading your record…</div>;
  // "(E-12)" and "E-3, E-9" become taps that close the sheet and show that entry in the chat.
  const cite = (s: string) => s.split(/(E-\d+)/g).map((p, i) => (/^E-\d+$/.test(p)
    ? <button key={i} type="button" className="rd-cite" onClick={() => onExhibit(Number(p.slice(2)))}>{p}</button>
    : <span key={i}>{p}</span>));
  return (
    <div className="rd-rep fade-in">
      <h3 className="rd-rep-h">{r.title}</h3>
      <p className="rd-rep-sub">{kFmt(r.from, {month: 'short', day: 'numeric'})} – {kFmt(r.to, {month: 'short', day: 'numeric', year: 'numeric'})} · {r.entries} entries</p>
      <ul className="rd-rep-l">{r.bullets.map((b, i) => <li key={i}>{cite(b)}</li>)}</ul>
      <p className="rd-rep-c"><Icon id="shield" size={20} />{r.caution}</p>
      <div className="rd-rep-acts">
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
        <span className="rd-foot">Tap an exhibit number to see it in the chat.</span>
      </div>
      {err && <p className="jr-error" role="alert">{err}</p>}
    </div>
  );
}

function LogPicker({onPick}: {onPick: (p: Preset) => void}) {
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
      <button type="button" className="rd-opt" onClick={() => onPick(note)}>
        <Icon id={note.icon} size={36} /><span><b>Something else</b><small>Anything worth a date and a time</small></span><i aria-hidden="true">›</i>
      </button>
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
          <p>Anyone with this link can open the PDF, read-only. It always shows your latest record.</p>
          <div className="rd-link">
            <input className="field" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
            <button type="button" className="btn btn-ghost" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <p className="rd-shr-meta">Expires {fmtDate(share.expiresAt, {month: 'short', day: 'numeric'})} · opened {share.views} {share.views === 1 ? 'time' : 'times'}</p>
          <div className="rd-shr-acts">
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

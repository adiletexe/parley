/* /app/record — the record as the chat it mostly is, and nothing else in the chat: the other parent's texts on the
   left (a burst is one entry with a bubble per line), what you sent on the right. A phone should read in one glance —
   name, dates, chat, upload — so everything that is not a message (late pickups, expenses, notes) and every count
   (the patterns) lives in Reports and the PDF, with an amber dot on the calendar for the day it happened. It used to
   sit in the chat as pills and above it as a row of chips; the founder's verdict on that screen was "too many things".
   Risky words (a threat, an insult, pressure) are underlined inside their bubble (journal/risk.ts) instead of being
   items of their own. Messages are final — there is no Edit; tapping one shows its exhibit number, time and source,
   with Delete tucked behind ⋯ for privacy. Exhibits are positions in the whole record, oldest = E-1, from
   GET /api/timeline with no filters — the same list the PDF prints, so E-7 here is E-7 there.
   The chat scrolls inside its own box (not the window), so the header and the calendar stay put while it moves; the
   box is sized to the screen in a layout effect. */
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import type {Entry} from '../../../shared/types';
import {Icon, type IconId} from '../../components/Icon';
import {api, ApiError, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import {EntryForm} from './journal/EntryForm';
import {ImportPanel, type Source} from './journal/ImportPanel';
import {splitRisks, type RiskHit} from './journal/risk';
import {PRESETS, SOURCE, entryKind, fmtDate, fmtTime, type Preset} from './journal/util';
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
type Tone = 'amber' | 'grey';
type ReportKind = 'lawyer' | 'month' | 'patterns';
interface Report { title: string; bullets: string[]; caution: string; from: string; to: string; entries: number; cached?: boolean }

const REPORTS: {id: ReportKind; icon: IconId; title: string; sub: string}[] = [
  {id: 'lawyer', icon: 'scale', title: 'Summary for my lawyer', sub: 'The main facts, with exhibit numbers'},
  {id: 'month', icon: 'calendar', title: 'This month in brief', sub: 'What happened in the last 30 days'},
  {id: 'patterns', icon: 'target', title: 'Patterns & concerns', sub: 'What keeps repeating, and how often'},
];
const LOG_TILES = ['late', 'noshow', 'schedule', 'kids', 'expense', 'payment'];

type SheetState =
  | null | {kind: 'upload'} | {kind: 'import'; start?: Source; only?: Source[]} | {kind: 'log'; preset?: Preset}
  | {kind: 'share'} | {kind: 'report'; which?: ReportKind};

const isMsg = (e: Entry) => e.kind === 'message_in' || e.kind === 'message_out';

/* ---------- dates: entries get a display-zone day (tz.ts patches toLocale*); calendar math is on plain YYYY-MM-DD ---------- */
const ymd = (d: Date) => d.toLocaleDateString('en-CA');
const dayOf = (iso: string) => ymd(new Date(iso));
const kDate = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const kAdd = (k: string, n: number) => new Date(kDate(k).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const kWeek = (k: string) => kAdd(k, -kDate(k).getUTCDay()); // US weeks start on Sunday
const kMonth = (k: string) => k.slice(0, 8) + '01';
const kMonthAdd = (k: string, n: number) => { const d = kDate(kMonth(k)); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
const kFmt = (k: string, o: Intl.DateTimeFormatOptions) => kDate(k).toLocaleDateString('en-US', {...o, timeZone: 'UTC'});

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
  const now = me?.now ?? new Date().toISOString();

  // ---- data ----
  const [tl, setTl] = useState<TimelineRes | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const t = await api<TimelineRes>(`/api/timeline?${new URLSearchParams({tz})}`);
      setTl(t); setError('');
      return t;
    } catch (e) { setError((e as Error).message); return null; }
  }, [tz]);
  useEffect(() => { void load(); track('record_view'); }, [load]);

  const entries = useMemo(() => tl?.entries ?? [], [tl]);
  const msgs = useMemo(() => entries.filter(isMsg), [entries]);
  // The chat's days hold messages only; the calendar's dots come from everything.
  const days = useMemo(() => {
    const g: {key: string; items: RdEntry[]}[] = [];
    for (const e of msgs) { const k = dayOf(e.occurredAt); if (g.at(-1)?.key !== k) g.push({key: k, items: []}); g.at(-1)!.items.push(e); }
    return g;
  }, [msgs]);
  const logged = useMemo(() => {
    const m = new Map<string, RdEntry[]>();
    for (const e of entries) if (!isMsg(e)) { const k = dayOf(e.occurredAt); m.set(k, [...(m.get(k) ?? []), e]); }
    return m;
  }, [entries]);
  const dots = useMemo(() => {
    const m = new Map<string, Tone[]>();
    for (const d of days) m.set(d.key, ['grey']);
    for (const k of logged.keys()) m.set(k, [...(m.get(k) ?? []), 'amber']);
    return m;
  }, [days, logged]);
  const name = useMemo(() => otherName(entries, me?.quiz, !!me?.demo), [entries, me?.quiz, me?.demo]);
  const allDays = useMemo(() => [...dots.keys()].sort(), [dots]);
  const firstDay = allDays[0] ?? today, lastDay = allDays.at(-1) ?? today;
  const msgFirst = days[0]?.key ?? firstDay, msgLast = days.at(-1)?.key ?? lastDay;

  // ---- the scroller ----
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useFillHeight(rootRef, [!!tl, !!me?.demo]);
  const [visibleDay, setVisibleDay] = useState<string | null>(null);
  const [flashDay, setFlashDay] = useState<string | null>(null);
  const [flashEntry, setFlashEntry] = useState<string | null>(null);
  const [flash, setFlash] = useState<{tag: string; text: string} | null>(null);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 4000); return () => clearTimeout(t); }, [flash]);
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
    if (s.scrollTop + s.clientHeight >= s.scrollHeight - 4 && secs.length) cur = secs[secs.length - 1].dataset.day!; // at the bottom, the last day is the one on screen
    setVisibleDay(cur ?? secs[0]?.dataset.day ?? null);
  }, []);
  const rafRef = useRef(0);
  const scrolled = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(onScroll); };

  /** Scroll to a day. A day with nothing texted (only something logged) is not in the chat: go to the nearest day
   *  that is, and say in one line what was logged, since that lives in Reports. */
  const jumpDay = useCallback((k: string, smooth = true) => {
    const s = scrollRef.current;
    if (!s || !days.length) return;
    let target = k;
    if (!days.some((d) => d.key === k)) {
      target = days.find((d) => d.key > k)?.key ?? days.at(-1)!.key;
      const what = logged.get(k);
      if (what?.length) setFlash({tag: kFmt(k, {month: 'short', day: 'numeric'}), text: `${what.map((e) => e.title || entryKind(e).label).join(' · ')} — it’s in your Reports`});
    }
    const el = s.querySelector<HTMLElement>(`[data-day="${target}"]`);
    if (!el) return;
    s.scrollTo({top: Math.max(0, el.offsetTop - 8), behavior: smooth ? 'smooth' : 'auto'});
    setFlashDay(null);
    requestAnimationFrame(() => setFlashDay(target));
  }, [days, logged]);
  const jumpEntry = useCallback((id: string) => {
    const s = scrollRef.current;
    const el = s?.querySelector<HTMLElement>(`[data-entry="${id}"]`);
    if (!s || !el) { const e = entries.find((x) => x.id === id); if (e) jumpDay(dayOf(e.occurredAt)); return; }
    s.scrollTo({top: Math.max(0, el.offsetTop - s.clientHeight / 2 + el.offsetHeight / 2), behavior: 'smooth'});
    setFlashEntry(null);
    requestAnimationFrame(() => setFlashEntry(id));
  }, [entries, jumpDay]);
  useEffect(() => { if (!flashDay) return; const t = setTimeout(() => setFlashDay(null), 1800); return () => clearTimeout(t); }, [flashDay]);
  useEffect(() => { if (!flashEntry) return; const t = setTimeout(() => setFlashEntry(null), 1800); return () => clearTimeout(t); }, [flashEntry]);

  // ---- calendar ----
  const [calMonth, setCalMonth] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  useEffect(() => { setAnchor(null); }, [visibleDay]);
  const anchorDay = anchor ?? visibleDay ?? lastDay;
  const pickDay = (k: string) => { jumpDay(k); setCalMonth(false); track('record_calendar_jump'); };

  // ---- sheets ----
  const [sheet, setSheet] = useState<SheetState>(null);
  const reload = () => { void load(); };
  const openReports = () => { setSheet({kind: 'report'}); track('record_reports_open'); };

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
  // Something written down by hand is not a message, so it never shows in the chat — say where it went.
  function saved(e: Entry, created: boolean) {
    if (created) { setSheet(null); setFlash({tag: 'Saved', text: `${e.title || 'Your note'} — it’s in your Reports and the PDF`}); }
    void load();
  }

  const pdfHref = `/api/timeline/pdf?${new URLSearchParams({tz})}`;
  const pdfClick = () => track('timeline_pdf_click', {entries: entries.length, from: 'record'});
  const empty = tl && tl.range.total === 0;
  const range = `${kFmt(msgFirst, {month: 'short', day: 'numeric'})}${msgFirst === msgLast ? '' : ` – ${kFmt(msgLast, {month: 'short', day: 'numeric'})}`}`;
  // two nowrap halves, so a narrow phone breaks it at the dot instead of cutting the dates off
  const sub: ReactNode = msgs.length
    ? <><span>{msgs.length} {msgs.length === 1 ? 'message' : 'messages'}</span> · <span>{range}</span></>
    : entries.length ? 'No messages yet — upload a screenshot' : 'Fills itself from your replies and screenshots';
  const openUpload = () => { setSheet({kind: 'upload'}); track('record_upload_open'); };

  // ---- render ----
  const header = (
    <header className="rd-head">
      <span className="rd-ava" aria-hidden="true">{name ? name[0].toUpperCase() : <Icon id="record" size={30} />}</span>
      <div className="rd-head-t">
        <h1>{name ?? 'Your record'}</h1>
        <p>{sub}</p>
      </div>
      {!empty && tl && (
        <>
          <button type="button" className="rd-rep-pill" onClick={openReports}><span aria-hidden="true">✦</span>Reports</button>
          <a className="btn rd-pdf-btn" href={pdfHref} download onClick={pdfClick} aria-disabled={!entries.length}>
            <Icon id="pdf" size={22} />PDF
          </a>
        </>
      )}
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
  } else if (empty || !days.length) {
    chat = (
      <div className="rd-center">
        <section className="rd-empty fade-in">
          <Icon id="record" size={56} />
          <h2>Your record fills itself</h2>
          <p>Every reply you write with Parley lands here, dated, with their message next to it. Add screenshots of your chat
            with the other parent and we’ll read them in too.</p>
          <p>Each message gets an exhibit number, so it’s one PDF for your lawyer when you need it.</p>
          <div className="rd-empty-acts">
            <button type="button" className="btn btn-primary" onClick={() => setSheet({kind: 'import', start: 'screenshot', only: ['screenshot']})}><Icon id="camera" size={24} />Upload screenshots</button>
            <button type="button" className="btn btn-ghost" onClick={() => setSheet({kind: 'import', only: ['whatsapp', 'pdf']})}><Icon id="chat" size={24} />WhatsApp or OFW export</button>
          </div>
          <button type="button" className="btn btn-quiet" onClick={() => setSheet({kind: 'log'})}>Write down something that happened</button>
          <p className="rd-privacy"><Icon id="lock" size={20} />Private to you. The other parent never sees Parley.</p>
        </section>
      </div>
    );
  } else {
    chat = <Chat days={days} name={name} now={now} onChanged={reload} flashDay={flashDay} flashEntry={flashEntry} onReports={openReports} />;
  }

  return (
    <div className="rd fade-in" ref={rootRef}>
      <div className="rd-col">
        {header}
        {tl && !empty && (
          <div className="rd-cal-m">
            <Calendar mode={calMonth ? 'month' : 'week'} anchor={anchorDay} setAnchor={setAnchor} dots={dots} today={today}
              selected={visibleDay} first={firstDay} last={lastDay} onPick={pickDay} onToggle={() => setCalMonth((m) => !m)} />
          </div>
        )}
        <div className="rd-scroll" ref={scrollRef} onScroll={scrolled}>
          {chat}
        </div>
        {flash && <p className="rd-flash fade-in" role="status"><span className="chip chip-ok">{flash.tag}</span><span>{flash.text}</span></p>}
        {tl && !empty && (
          <button type="button" className="btn btn-primary rd-upload" onClick={openUpload}>
            <Icon id="camera" size={26} />Upload screenshots
          </button>
        )}
      </div>

      {tl && !empty && (
        <aside className="rd-side">
          <section className="card rd-side-card rd-cal-card">
            <Calendar mode="month" anchor={anchorDay} setAnchor={setAnchor} dots={dots} today={today}
              selected={visibleDay} first={firstDay} last={lastDay} onPick={pickDay} />
          </section>
          <section className="card rd-side-card">
            <div className="card-h"><span className="rd-spark" aria-hidden="true">✦</span>Reports</div>
            <div className="rd-rep-btns">
              {REPORTS.map((r) => (
                <button key={r.id} type="button" className="rd-opt" onClick={() => setSheet({kind: 'report', which: r.id})}>
                  <Icon id={r.icon} size={32} /><span><b>{r.title}</b><small>{r.sub}</small></span><i aria-hidden="true">›</i>
                </button>
              ))}
            </div>
            <div className="rd-side-acts">
              <a className="btn btn-ghost" href={pdfHref} download onClick={pdfClick}><Icon id="pdf" size={22} />PDF</a>
              <button type="button" className="btn btn-ghost" onClick={() => setSheet({kind: 'share'})}><Icon id="lock" size={22} />{tl.share ? 'Link is on' : 'Share'}</button>
            </div>
            <p className="rd-foot">Late pickups, expenses and notes are counted here and in the PDF. Not legal advice.</p>
          </section>
        </aside>
      )}

      {sheet?.kind === 'upload' && (
        <Sheet title="Upload screenshots" onClose={() => setSheet(null)}>
          <ImportPanel bare start="screenshot" only={['screenshot']} onImported={() => void imported()} />
          <div className="rd-more">
            <button type="button" className="rd-row" onClick={() => setSheet({kind: 'import', only: ['whatsapp', 'pdf']})}>
              <Icon id="chat" size={28} /><span>WhatsApp export or OFW PDF</span><i aria-hidden="true">›</i>
            </button>
            <button type="button" className="rd-row" onClick={() => setSheet({kind: 'log'})}>
              <Icon id="pencil" size={28} /><span>Write down something that happened</span><i aria-hidden="true">›</i>
            </button>
            <button type="button" className="rd-row" onClick={() => setSheet({kind: 'share'})}>
              <Icon id="lock" size={28} /><span>Share with your lawyer</span><i aria-hidden="true">›</i>
            </button>
          </div>
          <p className="rd-privacy"><Icon id="lock" size={20} />Only you can see this. The other parent never sees Parley.</p>
        </Sheet>
      )}
      {sheet?.kind === 'import' && (
        <Sheet title={sheet.start === 'screenshot' ? 'Upload screenshots' : 'Import a chat'} onClose={() => setSheet(null)} onBack={empty ? undefined : () => setSheet({kind: 'upload'})}>
          <ImportPanel bare start={sheet.start} only={sheet.only} onImported={() => void imported()} />
        </Sheet>
      )}
      {sheet?.kind === 'log' && (
        <Sheet title={sheet.preset ? sheet.preset.label : 'What happened?'} onClose={() => setSheet(null)}
          onBack={sheet.preset ? () => setSheet({kind: 'log'}) : empty ? undefined : () => setSheet({kind: 'upload'})}>
          {sheet.preset ? (
            <EntryForm key={sheet.preset.id} preset={sheet.preset} now={now} onSaved={saved} onCancel={() => setSheet({kind: 'log'})} />
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
        <Sheet title={sheet.which ? REPORTS.find((r) => r.id === sheet.which)!.title : 'Reports'} onClose={() => setSheet(null)}
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
                <p className="rd-foot">Written from your whole record — messages, late pickups, expenses, notes — citing exhibit numbers. Parley doesn’t give legal advice.</p>
              </div>
            )}
        </Sheet>
      )}
    </div>
  );
}

/* ---------- the chat: bubbles only ---------- */

function Chat({days, name, now, onChanged, flashDay, flashEntry, onReports}: {
  days: {key: string; items: RdEntry[]}[]; name: string | null; now: string; onChanged: () => void;
  flashDay: string | null; flashEntry: string | null; onReports: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [tip, setTip] = useState<{id: string; hit: RiskHit} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const thisYear = new Date(now).getFullYear();

  async function del(id: string) {
    setBusy(true); setError('');
    try { await api(`/api/journal/${id}`, {method: 'DELETE'}); setOpen(null); onChanged(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 404) { setOpen(null); onChanged(); }
      else setError((e as Error).message);
    }
    setBusy(false);
  }
  const toggle = (id: string) => { setOpen(open === id ? null : id); setMenu(false); setConfirmDel(false); setError(''); setTip(null); };
  const showTip = (id: string, hit: RiskHit) => {
    setTip(tip?.id === id && tip.hit.start === hit.start ? null : {id, hit}); setOpen(null);
    track('record_risk_tap', {kind: hit.kind});
  };
  // An opened entry's line lands under it; bring it into view when it opens below the fold.
  useEffect(() => {
    const id = open ?? tip?.id;
    if (!id) return;
    requestAnimationFrame(() => document.querySelector(`[data-entry="${id}"] .rd-det, [data-entry="${id}"] .rd-tip`)?.scrollIntoView({block: 'nearest', behavior: 'smooth'}));
  }, [open, tip]);

  const detail = (e: RdEntry) => (
    <div className="rd-det fade-in">
      <p className="rd-det-meta">
        <b>E-{e.exhibit}</b> · {fmtDate(e.occurredAt, {weekday: 'short', month: 'short', day: 'numeric'})}, {fmtTime(e.occurredAt)} · {SOURCE[e.source]}
      </p>
      <span className="rd-det-more">
        <button type="button" className="rd-dots" onClick={() => { setMenu((m) => !m); setConfirmDel(false); }} aria-expanded={menu} aria-label="More">⋯</button>
        {menu && !confirmDel && <button type="button" className="rd-menu fade-in" onClick={() => setConfirmDel(true)}><Icon id="trash" size={20} />Delete</button>}
      </span>
      {confirmDel && (
        <div className="rd-confirm fade-in" role="alertdialog" aria-label="Delete this message?">
          <span>Delete this for good? It won’t be in the PDF anymore, and the exhibit numbers after it shift.</span>
          <button type="button" className="btn rd-danger" disabled={busy} onClick={() => void del(e.id)}>{busy ? <span className="spin" /> : 'Delete'}</button>
          <button type="button" className="btn btn-quiet" onClick={() => { setConfirmDel(false); setMenu(false); }}>Keep it</button>
        </div>
      )}
      {error && <p className="jr-error" role="alert">{error}</p>}
    </div>
  );

  // their bubble with the risky words marked; a mark is its own button, so tapping it doesn't open the bubble
  const marked = (e: RdEntry, text: string) => splitRisks(text).map((p, i) => (typeof p === 'string' ? p : (
    <mark key={i} role="button" tabIndex={0} className={'rd-risk k-' + p.kind + (tip?.id === e.id && tip.hit.start === p.start ? ' on' : '')}
      onClick={(ev) => { ev.stopPropagation(); showTip(e.id, p); }}
      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); showTip(e.id, p); } }}>{p.text}</mark>
  )));

  return (
    <div className="rd-chat">
      {days.map((d) => {
        const date = kDate(d.key);
        const label = kFmt(d.key, {weekday: 'short', month: 'short', day: 'numeric', ...(date.getUTCFullYear() !== thisYear ? {year: 'numeric'} : {})});
        return (
          <section key={d.key} data-day={d.key} className={'rd-day' + (flashDay === d.key ? ' flash' : '')}>
            <div className="rd-sep"><span>{label}</span></div>
            {d.items.map((e) => {
              const inc = e.kind === 'message_in';
              const lines = inc ? e.text.split(/\n+/).map((s) => s.trim()).filter(Boolean) : [e.text.trim()];
              const bubbles = lines.length ? lines : [e.title];
              const isOpen = open === e.id;
              return (
                <div key={e.id} data-entry={e.id} className={'rd-msg ' + (inc ? 'in' : 'out') + (flashEntry === e.id ? ' cur' : '') + (isOpen ? ' open' : '')}>
                  <div className="rd-bubbles" role="button" tabIndex={0} onClick={() => toggle(e.id)} aria-expanded={isOpen}
                    onKeyDown={(ev) => { if (ev.target === ev.currentTarget && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); toggle(e.id); } }}
                    aria-label={`${inc ? (name ?? 'The other parent') : 'You'}, ${fmtTime(e.occurredAt)}`}>
                    {bubbles.map((b, i) => <span key={i} className="rd-bub">{inc ? marked(e, b) : b}</span>)}
                  </div>
                  {tip?.id === e.id && (
                    <p className={'rd-tip fade-in k-' + tip.hit.kind} role="status">
                      <b>{tip.hit.label}</b> · <button type="button" onClick={onReports}>it’s in your Reports</button>
                    </p>
                  )}
                  {isOpen ? detail(e) : <span className="rd-meta">{fmtTime(e.occurredAt)}</span>}
                </div>
              );
            })}
          </section>
        );
      })}
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
              <span className="dots">{(ds ?? []).map((t) => <i key={t} className={'t-' + t} />)}</span>
            </button>
          );
        })}
      </div>
      {mode === 'month' && (
        <p className="rd-cal-key"><i className="t-grey" />Messages <i className="t-amber" />Something logged</p>
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

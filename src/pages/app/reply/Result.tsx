/* The result has one job: hand over a reply that is safe to send. It reads like the chat it came from: their texts with
   what we ignored struck out, our reply as the blue bubble on the right, one verdict line under it. The choices (tone,
   your own draft, Copy) sit in one dock at the bottom of the screen, where the thumb already is. The blanks we never
   guess (dates, times, amounts) are dashed chips in the bubble: tap one and type. */
import {Fragment, useLayoutEffect, useRef, useState, type KeyboardEvent} from 'react';
import {Link} from 'react-router-dom';
import type {Analysis, Channel} from '../../../../shared/types';
import {CHANNEL_LABEL} from '../../../components/ChannelIcon';
import {api, track} from '../../../lib/api';
import {useMe} from '../../../lib/me';
import {judge, VERDICT_TEXT, VERDICT_TONE} from '../../../lib/verdict';
import {Highlighted, Lens} from './Lens';

export type AnalysisView = Analysis & {logged?: {exchange: boolean; incident: boolean}};
type Variant = 'brief' | 'neutral' | 'firm';

const TABS: {k: Variant; label: string; hint: string}[] = [
  {k: 'brief', label: 'Brief', hint: 'Just the answer'},
  {k: 'neutral', label: 'Neutral', hint: 'Brief, factual, friendly, firm'},
  {k: 'firm', label: 'Firm', hint: 'A clear boundary and one next step'},
];

const words = (s: string) => (s.trim().match(/\S+/g) ?? []).length;
// What a person's own edit can add back in. The model's replies are scored on the server; an edit is not, so the
// verdict only has to catch the obvious things a judge underlines.
const HOSTILE = /\b(you always|you never|typical|pathetic|ridiculous|stupid|liar|crazy|whatever|see you in court|you'?ll regret|lawyer)\b|!!|\?\?/i;
// A blank the model left for the person: "[minutes]", "[date]". One line, never nested.
const SLOT = /\[[^\]\n]{1,40}\]/g;

function verdict(a: Analysis, tab: Variant, text: string, edited: boolean): {ok: boolean; text: string} {
  if (edited && HOSTILE.test(text)) return {ok: false, text: 'Your edit has words a judge could read as hostile'};
  if (edited && words(text) > 90) return {ok: false, text: 'Long replies read as arguing. A judge prefers short'};
  const score = a.replyScore ?? 90;
  if (score < 70) return {ok: false, text: 'A judge might still read this as tense. Brief is the safest'};
  // A friendly message isn't a court moment: say it plainly instead of invoking a judge.
  if (a.heat < 25) return {ok: true, text: 'Friendly and easy. Good to send'};
  if (a.advice === 'no_reply') return {ok: true, text: "You don't have to answer. If you do, this reads calm"};
  if (tab === 'firm') return {ok: true, text: 'Calm and firm. A judge would read it well'};
  return {ok: true, text: 'Calm and about the kids. A judge would read it well'};
}

/** Who sent it, when we know: the quiz if it ever asks, or the sample case's Jordan. Never guessed from the text. */
function sender(quiz: Record<string, unknown> | undefined, demo: boolean): string {
  const q = quiz?.otherName ?? quiz?.other_name;
  if (typeof q === 'string' && q.trim()) return q.trim().slice(0, 24);
  return demo ? 'Jordan' : '';
}

/** Their message with the stripped words struck, so the user sees what we chose to ignore. */
function Theirs({text, stripped}: {text: string; stripped: string[]}) {
  const flags = stripped.map((p) => ({phrase: p, severity: 'medium' as const, issue: 'Left out', why: 'Insult, blame or old history. Not something to answer.'}));
  return <Highlighted text={text} flags={flags} />;
}

/** The reply as it will be sent, with each [blank] as a chip. Tapping a chip opens a small field in its place; tapping
    anywhere else on the bubble edits the whole text. */
function Bubble({text, onChange, editing, setEditing}: {text: string; onChange: (t: string) => void; editing: boolean; setEditing: (on: boolean) => void}) {
  const [filling, setFilling] = useState<number | null>(null);
  const [val, setVal] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  // The field grows to fit: a scrolling box hides the end of the reply right where the date or amount usually is.
  useLayoutEffect(() => { const el = area.current; if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }, [text, editing]);
  useLayoutEffect(() => { if (editing) { const el = area.current; el?.focus(); el?.setSelectionRange(el.value.length, el.value.length); } }, [editing]);

  if (editing) {
    return (
      <textarea ref={area} id="rc-reply" className="rc-me rc-me-edit" value={text} rows={1} spellCheck aria-label="Your reply"
        onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)} onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }} />
    );
  }

  const commit = (n: number) => {
    const v = val.trim();
    if (v) { let i = -1; onChange(text.replace(SLOT, (m) => (++i === n ? v : m))); track('reply_slot_fill'); }
    setFilling(null); setVal('');
  };
  const parts: (string | {slot: string; n: number})[] = [];
  let at = 0, n = 0;
  for (const m of text.matchAll(SLOT)) {
    if (m.index! > at) parts.push(text.slice(at, m.index));
    parts.push({slot: m[0].slice(1, -1), n: n++});
    at = m.index! + m[0].length;
  }
  if (at < text.length) parts.push(text.slice(at));

  return (
    <div id="rc-reply" className="rc-me" role="button" tabIndex={0} aria-label="Your reply. Tap to edit it."
      onClick={(e) => { if (!(e.target as HTMLElement).closest('.rc-slot')) setEditing(true); }}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setEditing(true); } }}>
      {parts.map((p, i) => typeof p === 'string' ? <Fragment key={i}>{p}</Fragment> : filling === p.n ? (
        <input key={i} className="rc-slot rc-slot-in" autoFocus value={val} placeholder={p.slot} aria-label={`Fill in ${p.slot}`}
          size={Math.max(p.slot.length, val.length, 3) + 1}
          onChange={(e) => setVal(e.target.value)} onBlur={() => commit(p.n)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); commit(p.n); } if (e.key === 'Escape') { setVal(''); setFilling(null); } }} />
      ) : (
        <button key={i} type="button" className="rc-slot" onClick={() => { setFilling(p.n); setVal(''); }} aria-label={`Fill in ${p.slot}`}>{p.slot}</button>
      ))}
    </div>
  );
}

export function Result({a, channel, onUpdate, onDraft}: {a: AnalysisView; channel: Channel; onUpdate: (a: AnalysisView) => void; onDraft: () => void}) {
  const {me} = useMe();
  const [tab, setTab] = useState<Variant>(a.usedVariant ?? 'brief');
  const [texts, setTexts] = useState<Record<Variant, string>>({brief: a.variants.brief.text, neutral: a.variants.neutral.text, firm: a.variants.firm.text});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<'copy' | 'save' | 'incident' | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [lensOpen, setLensOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const text = texts[tab];
  const setText = (t: string) => setTexts((x) => ({...x, [tab]: t}));
  const edited = text !== a.variants[tab].text;
  const v = verdict(a, tab, text, edited);
  // The demo case lives in its own zone and on its own clock (time travel); show "now" the way the server sees it.
  const tz = me?.tz;
  const skew = me ? Math.round((Date.parse(me.now) - Date.now()) / 3.6e6) * 3.6e6 : 0;
  const fmt = (d: Date) => d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', timeZone: tz}) + ', ' + d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', timeZone: tz});

  async function log(kind: 'copy' | 'save') {
    setBusy(kind); setErr('');
    try {
      if (kind === 'copy') {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {
          // Clipboard blocked (http, old Safari): open the text as a field and select it so a long-press / Cmd+C works.
          setEditing(true);
          requestAnimationFrame(() => (document.getElementById('rc-reply') as HTMLTextAreaElement | null)?.select?.());
        }
      }
      await api(`/api/reply/${a.id}/use`, {body: {variant: tab, text, channel}});
      setSavedAt(new Date(Date.now() + skew));
      onUpdate({...a, usedVariant: tab, logged: {exchange: true, incident: !!a.logged?.incident}});
      track('reply_' + kind, {variant: tab, edited, channel});
    } catch (e) {
      setErr((e as Error).message || 'Could not save to your record. Please try again.');
    } finally { setBusy(null); }
  }

  async function logIncident() {
    setBusy('incident'); setErr('');
    try {
      await api(`/api/reply/${a.id}/incident`, {body: {channel}});
      onUpdate({...a, logged: {exchange: !!a.logged?.exchange, incident: true}});
    } catch (e) {
      setErr((e as Error).message || 'Could not log it. Please try again.');
    } finally { setBusy(null); }
  }

  // Their burst as the texts they sent (older analyses have one bubble). The time is the one the chat export showed
  // under the last bubble; without one, when it was pasted.
  const bubbles = a.bubbles?.length ? a.bubbles : [a.incoming];
  const lastTime = a.bubbleTimes?.[bubbles.length - 1] || '';
  const who = sender(me?.quiz, !!me?.demo);

  const hasDraft = !!a.draft && a.draftScore !== undefined;
  const saved = savedAt || a.logged?.exchange;
  // The draft's score stays on the server's side of the screen: the person gets the judge's word for it.
  const dv = hasDraft ? judge(a.draftScore!, a.lens) : null;

  return (
    <div className="rc-result">
      <p className="rc-day">{[who, CHANNEL_LABEL[channel], lastTime || fmt(new Date(a.createdAt))].filter(Boolean).join(' · ')}</p>
      <div className="rc-they fade-in">
        {bubbles.map((b, i) => <div key={i} className="rc-bubble"><Theirs text={b} stripped={a.stripped ?? []} /></div>)}
      </div>
      {a.advice === 'no_reply' && a.asks.length === 0 && a.adviceWhy && <p className="rc-why">{a.adviceWhy}</p>}

      <div className="rc-mine fade-in">
        <Bubble text={text} onChange={setText} editing={editing} setEditing={setEditing} />
        <p className={'rc-check ' + (v.ok ? 'ok' : 'warn')}><i aria-hidden="true" />{v.text}</p>
      </div>

      {hasDraft && (
        <section className={'card rc-drafted' + (lensOpen ? ' open' : '')}>
          <button className="rc-drafted-row" aria-expanded={lensOpen} onClick={() => { setLensOpen(!lensOpen); if (!lensOpen) track('reply_lens_open'); }}>
            <span className="rc-drafted-h">Your draft</span>
            {dv && <span className={'rc-drafted-s rc-' + VERDICT_TONE[dv]}><i aria-hidden="true" />{VERDICT_TEXT[dv]}</span>}
            <i className="rc-chev" aria-hidden="true" />
          </button>
          {lensOpen && <Lens draft={a.draft!} flags={a.lens} />}
        </section>
      )}

      {a.incident?.worthLogging && (
        <p className="rc-incident">
          Worth logging: <b>{a.incident.title}</b> ·{' '}
          {a.logged?.incident
            ? <Link to="/app/record">Logged · View</Link>
            : <button className="rc-link" onClick={logIncident} disabled={!!busy}>{busy === 'incident' ? <span className="spin" /> : null}Log it</button>}
        </p>
      )}

      <section className="rc-dock" aria-label="Send it">
        <div className="rc-dock-top">
          <div className="rc-tone" role="tablist" aria-label="Tone">
            {TABS.map((t) => (
              <button key={t.k} role="tab" aria-selected={tab === t.k} className={tab === t.k ? 'on' : ''} onClick={() => { setTab(t.k); setEditing(false); }} title={t.hint}>{t.label}</button>
            ))}
          </div>
          <button className="rc-link rc-owndraft" onClick={onDraft}>{a.draft ? 'Edit my draft' : 'My own draft'}</button>
        </div>
        <button className="btn btn-primary btn-lg rc-copy" onClick={() => log('copy')} disabled={!!busy || !text.trim()}>
          {busy === 'copy' ? <span className="spin" /> : null}{copied ? 'Copied' : 'Copy reply'}
        </button>
        <p className="rc-under">
          {saved
            ? <span className="rc-saved" role="status">✓ Saved to your record{savedAt ? ` · ${fmt(savedAt)}` : ''} · <Link to="/app/record">View</Link></span>
            : <span>Copying saves both messages to your record · <button className="rc-link" onClick={() => log('save')} disabled={!!busy}>Save without copying</button></span>}
          {edited && <> · <button className="rc-link" onClick={() => setText(a.variants[tab].text)}>Undo my edits</button></>}
        </p>
        {err && <p className="rc-err-line" role="alert">{err}</p>}
      </section>
    </div>
  );
}

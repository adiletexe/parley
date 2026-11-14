/* The result has one job: hand over a reply that is safe to send. Their message with what we ignored struck out,
   one line on what actually needs an answer, the reply, one verdict line, Copy. Everything else is a line you can
   open, not a card that competes with the reply. */
import {useLayoutEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import type {Analysis, Channel} from '../../../../shared/types';
import {ChannelTag} from '../../../components/ChannelIcon';
import {Icon} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import {useMe} from '../../../lib/me';
import {Highlighted, Lens, tone} from './Lens';

export type AnalysisView = Analysis & {logged?: {exchange: boolean; incident: boolean}; freeRepliesLeft?: number | null};
type Variant = 'brief' | 'neutral' | 'firm';

const TABS: {k: Variant; label: string; hint: string}[] = [
  {k: 'brief', label: 'Brief', hint: 'Just the answer'},
  {k: 'neutral', label: 'Neutral', hint: 'BIFF: brief, informative, friendly, firm'},
  {k: 'firm', label: 'Firm', hint: 'A clear boundary and one next step'},
];

const words = (s: string) => (s.trim().match(/\S+/g) ?? []).length;
// What a person's own edit can add back in. The model's replies are scored on the server; an edit is not, so the
// verdict only has to catch the obvious things a judge underlines.
const HOSTILE = /\b(you always|you never|typical|pathetic|ridiculous|stupid|liar|crazy|whatever|see you in court|you'?ll regret|lawyer)\b|!!|\?\?/i;

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

/** The model writes asks as instructions ("Respond to refusal to split soccer cost") or questions. After "They need
    an answer about:" only the topic should be left, starting lower-case. Acronyms stay as they are. */
const askCase = (q: string) => {
  const t = q.replace(/^(please\s+)?(respond|reply|answer)( to)?\s+|^address\s+|^(confirm|clarify)\s+(?=whether|if|who|what|when)/i, '').replace(/\.$/, '');
  return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
};

/** Their message with the stripped words struck, so the user sees what we chose to ignore. */
function Theirs({text, stripped}: {text: string; stripped: string[]}) {
  const flags = stripped.map((p) => ({phrase: p, severity: 'medium' as const, issue: 'Left out', why: 'Insult, blame or old history — not something to answer.'}));
  return <Highlighted text={text} flags={flags} />;
}

export function Result({a, channel, onUpdate}: {a: AnalysisView; channel: Channel; onUpdate: (a: AnalysisView) => void}) {
  const {me} = useMe();
  const [tab, setTab] = useState<Variant>(a.usedVariant ?? (a.advice === 'reply' ? 'neutral' : 'brief'));
  const [texts, setTexts] = useState<Record<Variant, string>>({brief: a.variants.brief.text, neutral: a.variants.neutral.text, firm: a.variants.firm.text});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<'copy' | 'save' | 'incident' | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [lensOpen, setLensOpen] = useState(false);

  const text = texts[tab];
  // The reply grows to fit: a scrolling box hides the end of the reply right where the date or amount usually is.
  const box = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const el = box.current; if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; }, [text]);
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
          // Clipboard blocked (http, old Safari): select the text so a long-press / Cmd+C still works.
          (document.getElementById('rc-reply') as HTMLTextAreaElement | null)?.select();
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

  // Their burst as the texts they sent (older analyses have one bubble). The time under the last one is the one the
  // chat export showed; without one, when it was pasted.
  const bubbles = a.bubbles?.length ? a.bubbles : [a.incoming];
  const lastTime = a.bubbleTimes?.[bubbles.length - 1] || '';

  const risky = a.lens.filter((f) => f.severity !== 'good').length;
  const hasDraft = !!a.draft && a.draftScore !== undefined;
  const saved = savedAt || a.logged?.exchange;

  return (
    <div className="rc-result">
      <div className="rc-they fade-in">
        {bubbles.map((b, i) => <div key={i} className="rc-bubble"><Theirs text={b} stripped={a.stripped ?? []} /></div>)}
        <p className="rc-bubble-meta"><ChannelTag channel={channel} /> · {lastTime || fmt(new Date(a.createdAt))}</p>
      </div>
      <p className="rc-asks">
        {a.asks.length > 0
          ? <>They need an answer about: <b>{a.asks.map(askCase).join(' · ')}</b></>
          : <>{a.adviceWhy}</>}
      </p>

      <section className="card rc-replycard fade-in">
        <div className="rc-seg" role="tablist" aria-label="Tone">
          {TABS.map((t) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)} title={t.hint}>{t.label}</button>
          ))}
        </div>
        {/* The reply is the text you'll send, so it looks like one: your bubble, on the right. Tap to edit. */}
        <div className="rc-out">
          <textarea ref={box} id="rc-reply" className="rc-reply" value={text} rows={2} spellCheck
            onChange={(e) => setTexts({...texts, [tab]: e.target.value})} aria-label="Your reply (you can edit it)" />
          <span className="rc-out-meta">{edited ? 'Edited' : 'Tap to edit'}</span>
        </div>
        {/\[[^\]]+\]/.test(text) && <p className="rc-fill">Fill in the <b>[brackets]</b> before you send — we never guess dates, times or amounts.</p>}
        <p className={'rc-verdict ' + (v.ok ? 'ok' : 'warn')}><Icon id="scale" size={22} />{v.text}</p>
        <button className="btn btn-primary btn-lg rc-copy" onClick={() => log('copy')} disabled={!!busy || !text.trim()}>
          {busy === 'copy' ? <span className="spin" /> : null}{copied ? 'Copied' : 'Copy reply'}
        </button>
        <div className="rc-under">
          {saved
            ? <span className="rc-saved" role="status">✓ Saved to your record{savedAt ? ` · ${fmt(savedAt)}` : ''} · <Link to="/app/record">View</Link></span>
            : <span>Copying saves both messages to your record · <button className="rc-link" onClick={() => log('save')} disabled={!!busy}>Save without copying</button></span>}
          {edited && <button className="rc-link" onClick={() => setTexts({...texts, [tab]: a.variants[tab].text})}>Undo my edits</button>}
        </div>
        {err && <p className="rc-err-line" role="alert">{err}</p>}
      </section>

      {hasDraft && (
        <section className={'card rc-drafted' + (lensOpen ? ' open' : '')}>
          <button className="rc-drafted-row" aria-expanded={lensOpen} onClick={() => { setLensOpen(!lensOpen); if (!lensOpen) track('reply_lens_open'); }}>
            <span className="rc-drafted-h">Your draft</span>
            <span className="rc-drafted-n">
              <b className={'rc-' + tone(a.draftScore!)}>{a.draftScore}</b>
              {a.replyScore !== undefined && <> → <b className={'rc-' + tone(a.replyScore)}>{a.replyScore}</b></>}
            </span>
            <span className="rc-drafted-s">{risky > 0 ? `${risky} phrase${risky === 1 ? '' : 's'} a judge would read badly` : 'Nothing a judge would hold against you'}</span>
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
    </div>
  );
}

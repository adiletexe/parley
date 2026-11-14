import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import type {Analysis, Channel} from '../../../../shared/types';
import {Icon} from '../../../components/Icon';
import {api, track} from '../../../lib/api';
import {Highlighted, Lens} from './Lens';

export type AnalysisView = Analysis & {logged?: {exchange: boolean; incident: boolean}; freeRepliesLeft?: number | null};
type Variant = 'brief' | 'neutral' | 'firm';

const TABS: {k: Variant; label: string; tag: string; hint: string}[] = [
  {k: 'brief', label: 'Brief', tag: 'Just the answer', hint: 'Just the answer'},
  {k: 'neutral', label: 'Neutral', tag: 'BIFF', hint: 'BIFF: brief, informative, friendly, firm'},
  {k: 'firm', label: 'Firm', tag: 'Boundary + next step', hint: 'A clear boundary and one next step'},
];
const CHANNELS: {k: Channel; label: string}[] = [
  {k: 'sms', label: 'Text'}, {k: 'whatsapp', label: 'WhatsApp'}, {k: 'email', label: 'Email'},
  {k: 'ofw', label: 'OurFamilyWizard'}, {k: 'talkingparents', label: 'TalkingParents'}, {k: 'other', label: 'Other'},
];
const ADVICE: Record<Analysis['advice'], {label: string; cls: string}> = {
  reply: {label: 'Worth a reply', cls: 'chip'},
  brief_ack: {label: 'A short acknowledgement is enough', cls: 'chip chip-amber'},
  no_reply: {label: 'No reply needed', cls: 'chip chip-ok'},
};
const CAT: Record<Analysis['category'], string> = {
  schedule: 'Schedule', money: 'Money', health: 'Health', school: 'School', new_partner: 'New partner',
  accusation: 'Accusation', logistics: 'Logistics', other: 'Other',
};

function heatLabel(h: number) { return h >= 80 ? 'Hostile' : h >= 55 ? 'Heated' : h >= 30 ? 'Tense' : 'Calm'; }
const words = (s: string) => (s.trim().match(/\S+/g) ?? []).length;

/** Their message with the stripped words greyed and struck, so the user sees what we chose to ignore. */
function Theirs({text, stripped}: {text: string; stripped: string[]}) {
  const flags = stripped.map((p) => ({phrase: p, severity: 'medium' as const, issue: 'Left out', why: 'Insult, blame or old history — not something to answer.'}));
  return <div className="rc-theirs"><Highlighted text={text} flags={flags} /></div>;
}

export function Result({a, onEdit, onUpdate}: {a: AnalysisView; onEdit: () => void; onUpdate: (a: AnalysisView) => void}) {
  const [tab, setTab] = useState<Variant>(a.usedVariant ?? (a.advice === 'reply' ? 'neutral' : 'brief'));
  const [texts, setTexts] = useState<Record<Variant, string>>({brief: a.variants.brief.text, neutral: a.variants.neutral.text, firm: a.variants.firm.text});
  const [channel, setChannel] = useState<Channel>('sms');
  const [note, setNote] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [busy, setBusy] = useState<'copy' | 'save' | 'incident' | null>(null);

  useEffect(() => { if (!note || note.kind === 'err') return; const t = setTimeout(() => setNote(null), 5000); return () => clearTimeout(t); }, [note]);

  const text = texts[tab];
  const edited = text !== a.variants[tab].text;
  const n = words(text);

  async function log(kind: 'copy' | 'save') {
    setBusy(kind);
    try {
      if (kind === 'copy') {
        try { await navigator.clipboard.writeText(text); } catch {
          // Clipboard blocked (http, old Safari): select the text so a long-press / Cmd+C still works.
          (document.getElementById('rc-reply') as HTMLTextAreaElement | null)?.select();
        }
      }
      const r = await api<{already?: boolean}>(`/api/reply/${a.id}/use`, {body: {variant: tab, text, channel}});
      onUpdate({...a, usedVariant: tab, logged: {exchange: true, incident: !!a.logged?.incident}});
      setNote({kind: 'ok', text: kind === 'copy'
        ? (r.already ? 'Copied. Your journal entry is updated to this version.' : 'Copied. Both messages are saved to your journal.')
        : (r.already ? 'Your journal entry is updated to this version.' : 'Saved. Both messages are in your journal.')});
      track('reply_' + kind, {variant: tab, edited});
    } catch (e) {
      setNote({kind: 'err', text: (e as Error).message || 'Could not save to your journal. Please try again.'});
    } finally { setBusy(null); }
  }

  async function logIncident() {
    setBusy('incident');
    try {
      await api(`/api/reply/${a.id}/incident`, {body: {channel}});
      onUpdate({...a, logged: {exchange: !!a.logged?.exchange, incident: true}});
    } catch (e) {
      setNote({kind: 'err', text: (e as Error).message || 'Could not log it. Please try again.'});
    } finally { setBusy(null); }
  }

  const adv = ADVICE[a.advice];
  const when = new Date(a.createdAt);

  return (
    <div className="rc-result">
      <section className="card rc-they fade-in">
        <div className="card-h rc-they-h">
          <Icon id="chat" size={24} />They wrote · {when.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} {when.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}
          <select className="rc-channel" value={channel} onChange={(e) => setChannel(e.target.value as Channel)} aria-label="Where they sent it">
            {CHANNELS.map((c) => <option key={c.k} value={c.k}>{c.label}</option>)}
          </select>
        </div>
        <Theirs text={a.incoming} stripped={a.stripped ?? []} />
        <div className="rc-facts">
          <span className="rc-facts-h">Just the facts</span>
          <p>{a.facts}</p>
          {a.asks.length > 0 && (
            <ul className="rc-asks">{a.asks.map((q, i) => <li key={i}>{q}</li>)}</ul>
          )}
        </div>
        <div className="rc-meta">
          <span className={adv.cls}>{adv.label}</span>
          <span className={'chip ' + (a.heat >= 55 ? 'chip-warn' : a.heat >= 30 ? 'chip-amber' : 'chip-ok')}>{heatLabel(a.heat)} · {a.heat}/100</span>
          <span className="chip rc-chip-plain">{CAT[a.category]}</span>
        </div>
        {a.adviceWhy && <p className="rc-why">{a.adviceWhy}</p>}
      </section>

      <section className="card rc-replycard fade-in">
        <div className="rc-tabs-row">
          <div className="rc-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.k} role="tab" aria-selected={tab === t.k} className={'rc-tab' + (tab === t.k ? ' on' : '')} onClick={() => setTab(t.k)} title={t.hint}>{t.label}</button>
            ))}
          </div>
          <span className="rc-count">{TABS.find((t) => t.k === tab)!.tag} · {n} words · reads in {Math.max(3, Math.round(n / 4))} s</span>
        </div>
        {a.advice === 'no_reply' && <p className="rc-gray">You don't have to answer this. If you choose to, keep it this flat:</p>}
        <textarea id="rc-reply" className="field rc-reply" value={text} rows={Math.min(8, Math.max(3, Math.ceil(text.length / 70)))}
          onChange={(e) => setTexts({...texts, [tab]: e.target.value})} aria-label="Your reply (you can edit it)" />
        {/\[[^\]]+\]/.test(text) && <p className="rc-fill">Fill in the <b>[brackets]</b> before you send — we never guess dates, times or amounts.</p>}
        <div className="rc-actions">
          <button className="btn btn-primary" onClick={() => log('copy')} disabled={!!busy || !text.trim()}>
            {busy === 'copy' ? <span className="spin" /> : null}Copy reply
          </button>
          <button className="btn btn-ghost" onClick={() => log('save')} disabled={!!busy || !text.trim()}>
            {busy === 'save' ? <span className="spin" /> : null}Save to journal
          </button>
          {edited && <button className="btn btn-quiet" onClick={() => setTexts({...texts, [tab]: a.variants[tab].text})}>Undo my edits</button>}
          <span className="rc-auto">{a.logged?.exchange ? <><i className="rc-dot" />In your journal</> : 'Logged to your journal when copied'}</span>
        </div>
        {note && <p className={'rc-note rc-note-' + note.kind} role="status">{note.text}</p>}
      </section>

      {a.incident?.worthLogging && (
        <section className="card rc-incident fade-in">
          <Icon id="flag" size={36} />
          <div>
            <b>Worth keeping on the record</b>
            <p>{a.incident.title}. {a.incident.note}</p>
          </div>
          {a.logged?.incident
            ? <Link className="btn btn-ghost" to="/app/journal">Logged · view</Link>
            : <button className="btn btn-ghost" onClick={logIncident} disabled={!!busy}>{busy === 'incident' ? <span className="spin" /> : null}Log this as an incident</button>}
        </section>
      )}

      {a.draft && a.draftScore !== undefined
        ? <Lens draft={a.draft} flags={a.lens} draftScore={a.draftScore} replyScore={a.replyScore} />
        : a.lens.length > 0 && (
          <section className="card rc-lens fade-in">
            <div className="card-h"><Icon id="scale" size={24} />Judge's lens · why this reply holds up</div>
            <ul className="rc-flags">
              {a.lens.map((f, i) => (
                <li key={i} className="rc-flag rc-flag-good">
                  <span className="rc-flag-ic" aria-hidden="true">✓</span>
                  <div><b>“{f.phrase}”</b> <span className="rc-flag-issue">{f.issue}</span><p>{f.why}</p></div>
                </li>
              ))}
            </ul>
            <button className="btn btn-quiet rc-try-draft" onClick={onEdit}>Paste your own draft to check it →</button>
          </section>
        )}
    </div>
  );
}

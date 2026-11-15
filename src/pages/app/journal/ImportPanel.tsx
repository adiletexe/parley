/* Bring in the record that already exists. Step 1 reads the file and shows who is in it; step 2 asks which
   sender is the other parent (the only thing the file can't tell us), then writes the entries. */
import {useRef, useState} from 'react';
import {api} from '../../../lib/api';
import {Icon, type IconId} from '../../../components/Icon';
import {CHANNEL, fmtDate} from './util';
import type {Channel} from '../../../../shared/types';

export type Source = 'whatsapp' | 'pdf' | 'screenshot';
interface Preview {
  importId: string; channel: Channel; filename: string; total: number; senders: {name: string; count: number}[];
  suggestedOther: string | null; from: string | null; to: string | null; undated: number; tense: number;
  sample: {at: string; sender: string; text: string}[]; truncated?: boolean;
}
interface Result { added: number; duplicates: number; skipped: number }

const SOURCES: {id: Source; icon: IconId; title: string; sub: string; accept: string; multiple?: boolean; how: string[]}[] = [
  {id: 'whatsapp', icon: 'import-chat', title: 'WhatsApp chat', sub: 'The .txt or .zip from “Export chat”', accept: '.txt,.zip,text/plain,application/zip',
    how: ['Open the chat with the other parent.', 'iPhone: tap their name → Export Chat → Without Media. Android: ⋮ → More → Export chat → Without media.', 'Save the file, then choose it here. It’s read on our server and never shared.']},
  {id: 'pdf', icon: 'pdf', title: 'OurFamilyWizard or TalkingParents', sub: 'A PDF message report', accept: 'application/pdf,.pdf',
    how: ['OurFamilyWizard: Message Board → Reports → Message Report → PDF.', 'TalkingParents: Records → Messages → choose a date range → Download PDF.', 'Big history? Export a few months at a time.']},
  {id: 'screenshot', icon: 'camera', title: 'Screenshots', sub: 'Texts, iMessage, Messenger, up to 8', accept: 'image/*', multiple: true,
    how: ['Take screenshots of the conversation, oldest first.', 'Include the date headers if you can, we use them to date each message.', 'Messages on the right are treated as yours.']},
];

/** Minutes behind UTC (getTimezoneOffset's sign) in the zone the app shows dates in. The sample case lives in US
 *  Eastern (tz.ts makes Intl use it), so a screenshot's "9:41 PM" must be read as Eastern there, not the browser's. */
function zoneOffset(): number {
  const d = new Date();
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})
    .formatToParts(d).map((x) => [x.type, x.value]));
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return Math.floor((d.getTime() - wall) / 60_000); // d carries seconds, wall does not
}

/** `bare`: no card and no heading, for a sheet that already has both. `start` opens straight on one source;
 *  `only` limits the list "All import options" goes back to; with one source there is no list to go back to. */
export function ImportPanel({onImported, bare, start, only}: {onImported: () => void; bare?: boolean; start?: Source; only?: Source[]}) {
  const [source, setSource] = useState<Source | null>(start ?? null);
  const sources = only ? SOURCES.filter((s) => only.includes(s.id)) : SOURCES;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [other, setOther] = useState('');
  const [me, setMe] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cfg = SOURCES.find((s) => s.id === source);

  function reset(to: Source | null = null) {
    if (preview) void api(`/api/journal/import/${preview.importId}`, {method: 'DELETE'}).catch(() => {});
    setSource(to); setPreview(null); setResult(null); setError(''); setOther(''); setMe('');
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !cfg) return;
    const form = new FormData();
    if (cfg.id === 'screenshot') for (const f of [...files].slice(0, 8)) form.append('image', f);
    else form.append('file', files[0]);
    form.append('tz', String(zoneOffset()));
    setBusy(true); setError(''); setResult(null);
    try {
      const p = await api<Preview>(`/api/journal/import/${cfg.id}`, {form});
      setPreview(p);
      setOther(p.suggestedOther ?? (p.senders.length === 1 ? p.senders[0].name : ''));
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  async function confirm() {
    if (!preview || !other) return;
    setBusy(true); setError('');
    try {
      const r = await api<Result>(`/api/journal/import/${preview.importId}`, {body: {otherParent: other, me: me ? [me] : undefined}});
      setResult(r); setPreview(null); onImported();
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  const group = (preview?.senders.length ?? 0) > 2;

  return (
    <section className={bare ? 'jr-import' : 'card jr-import'}>
      {!bare && <div className="card-h"><Icon id="upload" size={24} />Import messages</div>}

      {!source && (
        <>
          <p className="jr-sub">Your messages are already scattered across apps. Bring them into one dated record.</p>
          <div className="jr-opts">
            {sources.map((s) => (
              <button key={s.id} className="jr-opt" onClick={() => reset(s.id)}>
                <Icon id={s.icon} size={40} /><span><b>{s.title}</b><small>{s.sub}</small></span><i aria-hidden="true">›</i>
              </button>
            ))}
          </div>
        </>
      )}

      {cfg && !preview && !result && (
        <div className="fade-in">
          {sources.length > 1 && <button className="btn btn-quiet jr-back" onClick={() => reset()}>‹ All import options</button>}
          <h3 className="jr-h3">{cfg.title}</h3>
          <ol className="jr-how">{cfg.how.map((h) => <li key={h}>{h}</li>)}</ol>
          <input ref={input} type="file" hidden accept={cfg.accept} multiple={cfg.multiple} onChange={(e) => void upload(e.target.files)} />
          <button className="btn btn-primary btn-block" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <><span className="spin" /> {cfg.id === 'whatsapp' ? 'Reading the chat…' : 'Reading every message… this can take 20–40 seconds'}</> : cfg.multiple ? 'Choose screenshots' : 'Choose file'}
          </button>
          {error && <p className="jr-error" role="alert">{error}</p>}
        </div>
      )}

      {preview && (
        <div className="fade-in">
          <button className="btn btn-quiet jr-back" onClick={() => reset(source)}>‹ Choose another file</button>
          <h3 className="jr-h3">Found {preview.total.toLocaleString('en-US')} messages</h3>
          <p className="jr-sub">
            {preview.from && preview.to ? `${fmtDate(preview.from)} – ${fmtDate(preview.to)} · ` : ''}{CHANNEL[preview.channel]}
            {preview.tense > 0 && <> · <span className="jr-tense-n">{preview.tense} read as tense</span></>}
          </p>
          {preview.truncated && <p className="jr-note">This chat is long, so we’ll bring in the most recent 5,000 messages.</p>}
          {preview.undated > 0 && <p className="jr-note">{preview.undated} message{preview.undated === 1 ? '' : 's'} had no visible date, so we dated {preview.undated === 1 ? 'it' : 'them'} today and marked {preview.undated === 1 ? 'it' : 'them'} “Date not shown”. You can fix the date after importing.</p>}

          <p className="jr-q">Which one is the other parent?</p>
          <div className="jr-senders" role="radiogroup">
            {preview.senders.map((s) => (
              <button key={s.name} role="radio" aria-checked={other === s.name} className={'jr-sender' + (other === s.name ? ' on' : '')} onClick={() => { setOther(s.name); if (me === s.name) setMe(''); }}>
                <Icon id="user" size={30} /><span><b>{s.name === 'Them' ? 'The other person (left bubbles)' : s.name === 'Me' ? 'Me (right bubbles)' : s.name}</b><small>{s.count} message{s.count === 1 ? '' : 's'}</small></span>
              </button>
            ))}
          </div>
          {group && other && (
            <>
              <p className="jr-q">And which one is you?</p>
              <select className="field" value={me} onChange={(e) => setMe(e.target.value)}>
                <option value="">Everyone else in the chat</option>
                {preview.senders.filter((s) => s.name !== other).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <p className="jr-hint">Messages from anyone else are left out.</p>
            </>
          )}

          {preview.sample.length > 0 && (
            <div className="jr-sample">
              <span className="jr-hint">Most recent</span>
              {preview.sample.map((m, i) => (
                <div key={i} className={'jr-bubble' + (m.sender === other ? ' in' : '')}>
                  <small>{m.sender} · {fmtDate(m.at, {month: 'short', day: 'numeric'})}</small>{m.text}
                </div>
              ))}
            </div>
          )}
          {error && <p className="jr-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={!other || busy} onClick={confirm}>
            {busy ? <><span className="spin" /> Adding to your record…</> : other ? `Import ${preview.total.toLocaleString('en-US')} messages` : 'Choose the other parent first'}
          </button>
        </div>
      )}

      {result && (
        <div className="jr-done fade-in">
          <Icon id="party" size={44} />
          <div>
            <b>{result.added ? `${result.added.toLocaleString('en-US')} messages added` : 'Nothing new to add'}</b>
            <span>
              {result.duplicates > 0 && `${result.duplicates} were already in your record and were skipped. `}
              {result.skipped > 0 && `${result.skipped} from other people were left out. `}
              {result.added > 0 && 'Patterns are updated.'}
            </span>
          </div>
          <button className="btn btn-ghost" onClick={() => reset(sources.length > 1 ? null : sources[0].id)}>Import more</button>
        </div>
      )}
    </section>
  );
}

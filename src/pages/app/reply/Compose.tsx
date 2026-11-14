/* The one job of the empty screen: get their message in. Most people already HAVE it — as a chat on their phone — so
   the way in is a screenshot: one big card that takes a drop, a tap (the photo picker on a phone) or a paste anywhere
   on the page. Typing is the quiet second door, a messenger bar that opens into a field. People send bursts, not
   letters: paste several texts and the preview shows them as the separate bubbles we'll read — split by the same
   code the server uses. Where it came from is guessed (a screenshot is a text by default) and only asked for small. */
import {useEffect, useMemo, useRef, useState, type DragEvent} from 'react';
import type {Channel} from '../../../../shared/types';
import {ChannelIcon} from '../../../components/ChannelIcon';
import {splitBurst} from './burst';
import {SAMPLES, SHOTS, type Sample, type SampleShot} from './samples';

export interface ComposeValue { incoming: string; draft: string; images: File[]; channel: Channel }

const MAX_IMG = 8 * 1024 * 1024;
export const MAX_SHOTS = 3;   // the server reads at most three per reply
const SOURCES: {k: Channel; label: string}[] = [
  {k: 'sms', label: 'Text'}, {k: 'whatsapp', label: 'WhatsApp'}, {k: 'email', label: 'Email'}, {k: 'ofw', label: 'OurFamilyWizard'},
];
const PASTE_KEY = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘V' : 'Ctrl+V';

export function Compose({value, onChange, onSubmit, onSample, onShot, busy, openDraft}: {
  value: ComposeValue;
  onChange: (v: ComposeValue) => void;
  onSubmit: () => void;
  onSample: (s: Sample) => void;
  onShot: (s: SampleShot) => void;
  busy: boolean;
  openDraft?: boolean;   // arrived from the result's "My own draft": the draft field is what they came for
}) {
  const [showDraft, setShowDraft] = useState(!!value.draft || !!openDraft);
  const [imgErr, setImgErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sheet, setSheet] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const blurT = useRef<number>();
  // The paste listener lives on the document and outlives renders: it reads the value through a ref.
  const live = useRef({value, onChange, busy});
  live.current = {value, onChange, busy};

  useEffect(() => { if (value.draft) setShowDraft(true); }, [value.draft]);

  const previews = useMemo(() => value.images.map((f) => URL.createObjectURL(f)), [value.images]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function add(list: Iterable<File> | null | undefined) {
    setImgErr('');
    const {value: v, onChange: set} = live.current;
    const files = [...(list ?? [])];
    if (!files.length) return;
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) { setImgErr('That file is not an image. Use a screenshot (PNG or JPG).'); return; }
    const ok = imgs.filter((f) => f.size <= MAX_IMG);
    if (ok.length < imgs.length) setImgErr('A screenshot over 8 MB was left out. Try a smaller one.');
    const room = MAX_SHOTS - v.images.length;
    if (ok.length > room) setImgErr(`Up to ${MAX_SHOTS} screenshots per reply — the first ${MAX_SHOTS} are in.`);
    if (room > 0 && ok.length) set({...v, images: [...v.images, ...ok.slice(0, room)]});
  }
  const remove = (i: number) => { setImgErr(''); onChange({...value, images: value.images.filter((_, k) => k !== i)}); };

  // A screenshot pasted anywhere on the page lands here; plain text pastes are left to whatever field has focus.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (live.current.busy) return;
      const imgs = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (!imgs.length) return;
      e.preventDefault();
      add(imgs);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const ready = !!(value.incoming.trim() || value.images.length);
  const burst = useMemo(() => splitBurst(value.incoming), [value.incoming]);
  const open = typing || !!value.incoming;
  const has = value.images.length > 0;
  // The collapse waits a beat: if the bar shrank on mousedown, the button under the pointer would move before the click.
  const focusIn = () => { clearTimeout(blurT.current); setTyping(true); };
  const focusOut = () => { blurT.current = window.setTimeout(() => setTyping(false), 220); };

  const dragProps = {
    onDragOver: (e: DragEvent) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setDrag(true); } },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); },
    onDrop: (e: DragEvent) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); },
  };

  const source = (
    <label className="rc-srcpick">
      <ChannelIcon channel={value.channel} size={14} />
      <span>Source:</span>
      <select value={value.channel} onChange={(e) => onChange({...value, channel: e.target.value as Channel})} aria-label="Where they sent it">
        {SOURCES.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <form className="rc-compose" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) onSubmit(); }}>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />

        {!has ? (
          <button type="button" className={'rc-drop' + (drag ? ' on' : '')} onClick={() => file.current?.click()} disabled={busy} {...dragProps}>
            <DropArt />
            <b className="rc-drop-t">{drag ? 'Let go to add it' : 'Drop a screenshot of the chat'}</b>
            <span className="rc-drop-s">or tap to choose<span className="rc-drop-k"> · paste works too ({PASTE_KEY})</span></span>
          </button>
        ) : (
          <div className={'rc-shots' + (drag ? ' on' : '')} {...dragProps}>
            <div className="rc-thumbs">
              {previews.map((u, i) => (
                <figure key={u} className="rc-thumb fade-in">
                  <img src={u} alt={`Screenshot ${i + 1}`} />
                  {!busy && <button type="button" className="rc-thumb-x" onClick={() => remove(i)} aria-label={`Remove screenshot ${i + 1}`}><XGlyph /></button>}
                </figure>
              ))}
              {value.images.length < MAX_SHOTS && !busy && (
                <button type="button" className="rc-thumb rc-thumb-add" onClick={() => file.current?.click()} aria-label="Add another screenshot">
                  <PlusGlyph /><span>Add</span>
                </button>
              )}
            </div>
            <div className="rc-shots-meta">
              <span>{value.images.length === 1 ? "We'll read the texts off it" : `${value.images.length} screenshots · read in order`}</span>
              {source}
            </div>
          </div>
        )}
        {imgErr && <p className="rc-err-line" role="alert">{imgErr}</p>}

        {!has && !busy && SHOTS[0] && (
          <button type="button" className="rc-try" onClick={() => onShot(SHOTS[0])}>
            <img src={SHOTS[0].src} alt="" />No screenshot handy? <b>Try a sample one</b>
          </button>
        )}

        <div className="rc-or" aria-hidden="true"><span>{has ? 'and' : 'or'}</span></div>

        <div className={'rc-bar' + (open ? ' open' : '')} onClick={() => input.current?.focus()}>
          <BubbleGlyph />
          <textarea ref={input} id="rc-in" className="rc-in" rows={open ? 4 : 1} maxLength={6000} aria-label="Their message"
            placeholder={has ? "Anything it doesn't show (optional)" : open ? 'Paste what they sent…\nSent a few texts in a row? One per line.' : 'Type or paste their texts…'}
            value={value.incoming} onChange={(e) => onChange({...value, incoming: e.target.value})} onFocus={focusIn} onBlur={focusOut}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ready && !busy) onSubmit(); }} />
        </div>

        {burst.bubbles.length > 1 && (
          <div className="rc-preview fade-in" aria-label={`Read as ${burst.bubbles.length} texts`}>
            <span className="rc-preview-h">{burst.bubbles.length} texts · we'll answer them once</span>
            {burst.bubbles.map((b, i) => <p key={i} className="rc-preview-b">{b}</p>)}
          </div>
        )}
        {open && !has && <div className="rc-bar-src fade-in">{source}</div>}

        {showDraft && (
          <div className="rc-draft fade-in">
            <label className="rc-draft-l" htmlFor="rc-draft">Your draft <span>we'll read it like a judge</span></label>
            <textarea id="rc-draft" className="field" rows={3} maxLength={4000} placeholder="What you were about to send…" autoFocus={!value.draft}
              value={value.draft} onChange={(e) => onChange({...value, draft: e.target.value})} />
          </div>
        )}

        <button className="btn btn-primary btn-lg rc-go" disabled={!ready || busy}>
          {busy ? <><span className="spin" /> Calming it down…</> : 'Calm it down'}
        </button>
        {!showDraft && !busy && <button type="button" className="rc-link rc-adddraft" onClick={() => setShowDraft(true)}>+ Add my draft to check it</button>}
      </form>

      {!busy && (
        <button type="button" className="rc-ex" onClick={() => setSheet(true)} aria-haspopup="dialog">
          Or try an example <i className="rc-chev-r" aria-hidden="true" />
        </button>
      )}
      {sheet && <Examples onClose={() => setSheet(false)} onSample={(s) => { setSheet(false); onSample(s); }} onShot={(s) => { setSheet(false); onShot(s); }} />}
    </>
  );
}

/* The examples, out of the way until asked for: a sheet from the bottom on a phone, a small dialog on a desk. Every
   one runs through the real model — the screenshots through the real image path. */
function Examples({onClose, onSample, onShot}: {onClose: () => void; onSample: (s: Sample) => void; onShot: (s: SampleShot) => void}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    box.current?.querySelector<HTMLElement>('button')?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="rc-sheet-bg" onClick={onClose}>
      <div ref={box} className="rc-sheet" role="dialog" aria-modal="true" aria-labelledby="rc-sheet-h" onClick={(e) => e.stopPropagation()}>
        <div className="rc-sheet-top">
          <h2 id="rc-sheet-h">Try an example</h2>
          <button type="button" className="rc-sheet-x" onClick={onClose} aria-label="Close"><XGlyph /></button>
        </div>
        <p className="rc-sheet-h">Screenshots</p>
        <div className="rc-sheet-shots">
          {SHOTS.map((s) => (
            <button type="button" key={s.src} className="rc-sheet-shot" onClick={() => onShot(s)}>
              <img src={s.src} alt={s.alt} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <p className="rc-sheet-h">Pasted texts</p>
        <ul className="rc-sheet-list">
          {SAMPLES.map((s) => (
            <li key={s.label}>
              <button type="button" onClick={() => onSample(s)}>
                <ChannelIcon channel={s.channel} size={16} />
                <span>“{s.label}”</span>
                {s.draft && <em>+ my draft</em>}
                <i className="rc-chev-r" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* A phone screenshot of a chat, with a second one behind it: the thing they're about to give us. */
function DropArt() {
  return (
    <svg className="rc-drop-art" viewBox="0 0 168 128" width="168" height="128" aria-hidden="true">
      <defs>
        <linearGradient id="rc-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c5cf0" /><stop offset=".5" stopColor="#5b6cf6" /><stop offset="1" stopColor="#3f8df5" /></linearGradient>
        <filter id="rc-sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#1d1f2b" floodOpacity=".13" /></filter>
      </defs>
      <g transform="rotate(9 112 66)" opacity=".75">
        <rect x="88" y="16" width="56" height="100" rx="12" fill="#fff" filter="url(#rc-sh)" />
        <rect x="96" y="34" width="30" height="9" rx="4.5" fill="#e3e5ee" />
        <rect x="96" y="47" width="22" height="9" rx="4.5" fill="#e3e5ee" />
        <rect x="112" y="66" width="24" height="9" rx="4.5" fill="#c9d6fb" />
      </g>
      <g transform="rotate(-6 64 64)">
        <rect x="34" y="8" width="66" height="114" rx="14" fill="#fff" filter="url(#rc-sh)" />
        <rect x="56" y="14" width="22" height="4" rx="2" fill="#e3e5ee" />
        <g className="rc-art-b1"><rect x="42" y="30" width="44" height="13" rx="6.5" fill="#e9eaf1" /></g>
        <g className="rc-art-b2"><rect x="42" y="47" width="34" height="13" rx="6.5" fill="#e9eaf1" /></g>
        <g className="rc-art-b3"><rect x="42" y="64" width="40" height="13" rx="6.5" fill="#e9eaf1" /><rect x="47" y="69" width="18" height="3" rx="1.5" fill="#e2508f" opacity=".55" /></g>
        <g className="rc-art-b4"><rect x="58" y="86" width="34" height="13" rx="6.5" fill="url(#rc-g)" /></g>
      </g>
      <g className="rc-art-up">
        <circle cx="128" cy="100" r="17" fill="url(#rc-g)" />
        <circle cx="128" cy="100" r="17" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M128 108v-15M122 98.5l6-6 6 6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const XGlyph = () => <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
const PlusGlyph = () => <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
const BubbleGlyph = () => (
  <svg className="rc-bar-ic" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 3.8V16A3.5 3.5 0 0 1 4 12.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M8.5 8.5h7M8.5 11.5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

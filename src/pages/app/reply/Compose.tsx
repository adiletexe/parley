/* The one job of the empty screen: get their message in. One field, where it came from as a chip, one button.
   The draft and the screenshot are there but cost nothing until asked for. */
import {useEffect, useRef, useState} from 'react';
import type {Channel} from '../../../../shared/types';
import {ChannelIcon} from '../../../components/ChannelIcon';
import {Icon} from '../../../components/Icon';
import {SAMPLES, type Sample} from './samples';

export interface ComposeValue { incoming: string; draft: string; image: File | null; channel: Channel }

const MAX_IMG = 8 * 1024 * 1024;
const SOURCES: {k: Channel; label: string}[] = [
  {k: 'whatsapp', label: 'WhatsApp'}, {k: 'sms', label: 'Text'}, {k: 'email', label: 'Email'}, {k: 'ofw', label: 'OurFamilyWizard'},
];

export function Compose({value, onChange, onSubmit, onSample, busy}: {
  value: ComposeValue;
  onChange: (v: ComposeValue) => void;
  onSubmit: () => void;
  onSample: (s: Sample) => void;
  busy: boolean;
}) {
  const [showDraft, setShowDraft] = useState(!!value.draft);
  const [imgErr, setImgErr] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (value.draft) setShowDraft(true); }, [value.draft]);
  useEffect(() => {
    if (!value.image) { setPreview(null); return; }
    const u = URL.createObjectURL(value.image);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [value.image]);
  // Autofocus only with a mouse and a wide screen: on a phone it throws the keyboard over the samples.
  useEffect(() => { if (window.matchMedia('(min-width: 861px) and (pointer: fine)').matches) input.current?.focus(); }, []);

  function pick(f: File | undefined | null) {
    setImgErr('');
    if (!f) return;
    if (!f.type.startsWith('image/')) { setImgErr('That file is not an image. Use a screenshot (PNG or JPG).'); return; }
    if (f.size > MAX_IMG) { setImgErr('That screenshot is over 8 MB. Try a smaller one.'); return; }
    onChange({...value, image: f});
  }

  const ready = !!(value.incoming.trim() || value.image);

  return (
    <>
      <form className={'rc-compose card' + (drag ? ' on' : '')} onSubmit={(e) => { e.preventDefault(); if (ready && !busy) onSubmit(); }}
        onPaste={(e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); pick(f); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}>
        <textarea ref={input} id="rc-in" className="field rc-in" rows={4} maxLength={6000} aria-label="Their message"
          placeholder={value.image ? 'Anything the screenshot does not show (optional)' : 'Paste their message…'}
          value={value.incoming} onChange={(e) => onChange({...value, incoming: e.target.value})}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ready && !busy) onSubmit(); }} />

        <div className="rc-src" role="group" aria-label="Where they sent it">
          {SOURCES.map((s) => (
            <button type="button" key={s.k} className={'rc-src-chip' + (value.channel === s.k ? ' on' : '')} aria-pressed={value.channel === s.k}
              onClick={() => onChange({...value, channel: s.k})}>
              <ChannelIcon channel={s.k} size={15} />{s.label}
            </button>
          ))}
          {preview ? (
            <span className="rc-src-chip on rc-shot">
              <img src={preview} alt="" />Screenshot
              <button type="button" className="rc-shot-x" onClick={() => onChange({...value, image: null})} aria-label="Remove screenshot">×</button>
            </span>
          ) : (
            <button type="button" className="rc-src-chip" onClick={() => file.current?.click()}>
              <Icon id="camera" size={18} />Screenshot
            </button>
          )}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        {imgErr && <p className="rc-err-line">{imgErr}</p>}

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
        {!showDraft && <button type="button" className="rc-link" onClick={() => setShowDraft(true)}>+ Add my draft to check it</button>}
      </form>

      {!busy && <div className="rc-samples">
        <span className="rc-samples-h">Try one</span>
        <div className="rc-chips">
          {SAMPLES.map((s) => (
            <button type="button" key={s.label} className="rc-sample" disabled={busy} onClick={() => onSample(s)}
              title={s.draft ? 'Comes with a first draft to check' : undefined}>
              “{s.label}”{s.draft && <em>+ draft</em>}
            </button>
          ))}
        </div>
      </div>}
    </>
  );
}

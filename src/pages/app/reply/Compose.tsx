import {useEffect, useRef, useState} from 'react';
import {Icon} from '../../../components/Icon';
import {SAMPLES, type Sample} from './samples';

export interface ComposeValue { incoming: string; draft: string; image: File | null }

const MAX_IMG = 8 * 1024 * 1024;

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

  useEffect(() => { if (value.draft) setShowDraft(true); }, [value.draft]);
  useEffect(() => {
    if (!value.image) { setPreview(null); return; }
    const u = URL.createObjectURL(value.image);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [value.image]);

  function pick(f: File | undefined | null) {
    setImgErr('');
    if (!f) return;
    if (!f.type.startsWith('image/')) { setImgErr('That file is not an image. Use a screenshot (PNG or JPG).'); return; }
    if (f.size > MAX_IMG) { setImgErr('That screenshot is over 8 MB. Try a smaller one.'); return; }
    onChange({...value, image: f});
  }

  const ready = !!(value.incoming.trim() || value.image);

  return (
    <form className="rc-compose card" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) onSubmit(); }}
      onPaste={(e) => { const f = [...e.clipboardData.files].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); pick(f); } }}>
      <label className="rc-label" htmlFor="rc-in"><Icon id="chat" size={28} />What they sent</label>
      <div className={'rc-drop' + (drag ? ' on' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}>
        <textarea id="rc-in" className="field rc-in" rows={5} maxLength={6000}
          placeholder={value.image ? 'Optional: anything the screenshot does not show' : 'Paste their message here. Insults and all — we strip them out.'}
          value={value.incoming} onChange={(e) => onChange({...value, incoming: e.target.value})}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ready && !busy) onSubmit(); }} />
        <div className="rc-shot">
          {preview ? (
            <div className="rc-thumb">
              <img src={preview} alt="Screenshot to read" />
              <span>{value.image?.name || 'Screenshot'}</span>
              <button type="button" className="btn-quiet btn" onClick={() => onChange({...value, image: null})}>Remove</button>
            </div>
          ) : (
            <button type="button" className="rc-upload" onClick={() => file.current?.click()}>
              <Icon id="upload" size={26} /><span><b>Or add a screenshot</b> — we read the chat for you</span>
            </button>
          )}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        {imgErr && <p className="rc-err-line">{imgErr}</p>}
      </div>

      {showDraft ? (
        <div className="rc-draft fade-in">
          <label className="rc-label" htmlFor="rc-draft"><Icon id="scale" size={28} />Your draft <span className="rc-opt">optional — we'll read it like a judge</span></label>
          <textarea id="rc-draft" className="field" rows={3} maxLength={4000} placeholder="What you were about to send…"
            value={value.draft} onChange={(e) => onChange({...value, draft: e.target.value})} />
        </div>
      ) : (
        <button type="button" className="rc-add-draft" onClick={() => setShowDraft(true)}>
          <Icon id="scale" size={26} /><span><b>Already wrote a reply?</b> See how a judge would read it</span>
        </button>
      )}

      <div className="rc-go">
        <button className="btn btn-primary btn-lg" disabled={!ready || busy}>
          {busy ? <><span className="spin" /> Writing…</> : 'Write my reply'}
        </button>
        <span className="rc-hint">Private. The other parent never sees Parley.</span>
      </div>

      <div className="rc-samples">
        <span className="rc-samples-h">Try an example</span>
        <div className="rc-chips">
          {SAMPLES.map((s) => (
            <button type="button" key={s.label} className="rc-sample" disabled={busy} onClick={() => onSample(s)}>
              <Icon id={s.icon} size={22} />{s.label}{s.draft && <em>+ draft</em>}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

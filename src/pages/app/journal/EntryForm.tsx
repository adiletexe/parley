/* One form for logging and for editing. The "Make it neutral" button rewrites the note in factual language
   and keeps the original one tap away, the person decides what goes on the record, not the model. */
import {useState, type FormEvent} from 'react';
import type {Category, Channel, Entry, EntryKind} from '../../../../shared/types';
import {api} from '../../../lib/api';
import {Icon} from '../../../components/Icon';
import {CATEGORY, CHANNEL, KIND, fromLocalInput, parseMoney, toLocalInput, type Preset} from './util';

interface Props {
  preset?: Preset;
  entry?: Entry;
  now: string;
  onSaved: (e: Entry, created: boolean) => void;
  onCancel: () => void;
}

export function EntryForm({preset, entry, now, onSaved, onCancel}: Props) {
  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? preset?.kind ?? 'note');
  const [when, setWhen] = useState(toLocalInput(entry?.occurredAt ?? now));
  const [title, setTitle] = useState(entry?.title ?? preset?.title ?? '');
  const [text, setText] = useState(entry?.text ?? '');
  const [channel, setChannel] = useState<Channel>(entry?.channel ?? preset?.channel ?? 'in_person');
  const [category, setCategory] = useState<Category>(entry?.category ?? preset?.category ?? 'other');
  const [amount, setAmount] = useState(entry?.amountCents != null ? (entry.amountCents / 100).toFixed(2) : '');
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState<'' | 'save' | 'neutral'>('');
  const [error, setError] = useState('');
  const [neutral, setNeutral] = useState<{before: string; removed: string[]} | null>(null);

  const showAmount = kind === 'expense' || !!preset?.amount || entry?.amountCents != null;
  const isMessage = kind === 'message_in' || kind === 'message_out';

  async function makeNeutral() {
    setBusy('neutral'); setError('');
    try {
      const r = await api<{text: string; title: string; category: Category; removed: string[]}>('/api/journal/neutral', {body: {text, kind}});
      setNeutral({before: text, removed: r.removed});
      setText(r.text);
      if (!title.trim() || title === preset?.title) setTitle(r.title);
      if (category === 'other') setCategory(r.category);
    } catch (e) { setError((e as Error).message); }
    setBusy('');
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!text.trim() && !title.trim()) { setError('Write a line about what happened.'); return; }
    const cents = showAmount ? parseMoney(amount) : null;
    if (kind === 'expense' && !cents) { setError('Add the amount, e.g. 120 or 45.50.'); return; }
    const mins = Number(minutes);
    const finalTitle = preset?.minutes && mins > 0 && title === preset.title ? `Pickup started ${mins} minutes late` : title.trim();
    const body = {kind, occurredAt: fromLocalInput(when), channel, category, title: finalTitle, text: text.trim(),
      tags: entry?.tags ?? preset?.tags ?? [], amountCents: cents};
    setBusy('save'); setError('');
    try {
      const r = entry
        ? await api<{entry: Entry}>(`/api/journal/${entry.id}`, {method: 'PATCH', body})
        : await api<{entry: Entry}>('/api/journal', {body});
      onSaved(r.entry, !entry);
    } catch (e) { setError((e as Error).message); setBusy(''); }
  }

  return (
    <form className="jr-form fade-in" onSubmit={submit}>
      <div className="jr-form-head">
        <Icon id={preset?.icon ?? KIND[kind].icon} size={36} />
        <div>
          <b>{entry ? 'Edit entry' : preset?.label ?? 'New entry'}</b>
          <span>{entry ? 'Changes are saved to your private record.' : 'Only you can see this. Write it the way you’d want a judge to read it.'}</span>
        </div>
      </div>

      <div className="jr-grid">
        {entry && (
          <label className="jr-lab">Type
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as EntryKind)}>
              {(Object.keys(KIND) as EntryKind[]).map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}
            </select>
          </label>
        )}
        <label className="jr-lab jr-when">When
          <input className="field" type="datetime-local" required value={when} max={toLocalInput(now).slice(0, 10) + 'T23:59'} onChange={(e) => setWhen(e.target.value)} />
        </label>
        {preset?.minutes && !entry && (
          <label className="jr-lab">Minutes late
            <input className="field" type="number" inputMode="numeric" min={1} max={600} placeholder="e.g. 40" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
        )}
        {showAmount && (
          <label className="jr-lab">Amount
            <div className="jr-money"><span>$</span><input className="field" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </label>
        )}
        <label className="jr-lab">{isMessage ? 'Sent through' : 'Where / how'}
          <select className="field" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            {(Object.keys(CHANNEL) as Channel[]).map((c) => <option key={c} value={c}>{CHANNEL[c]}</option>)}
          </select>
        </label>
        <label className="jr-lab">Topic
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {(Object.keys(CATEGORY) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY[c]}</option>)}
          </select>
        </label>
      </div>

      <label className="jr-lab">Title
        <input className="field" maxLength={200} placeholder="One neutral line, e.g. “Soccer cleats left at my house”" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="jr-lab">{isMessage ? 'Message' : 'What happened'}
        <textarea className="field" rows={5} maxLength={20000} placeholder={preset?.placeholder ?? 'What happened, when, and who was there. Stick to what you saw and heard.'}
          value={text} onChange={(e) => { setText(e.target.value); setNeutral(null); }} />
      </label>

      {!isMessage && (
        <div className="jr-neutral">
          {neutral ? (
            <div className="jr-neutral-done fade-in">
              <span className="chip chip-ok">Rewritten in neutral language</span>
              {neutral.removed.length > 0 && <span className="jr-removed">Took out: {neutral.removed.map((w) => <s key={w}>{w}</s>)}</span>}
              <button type="button" className="btn btn-quiet" onClick={() => { setText(neutral.before); setNeutral(null); }}>Undo</button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost" disabled={busy !== '' || text.trim().length < 3} onClick={makeNeutral}>
              {busy === 'neutral' ? <><span className="spin" /> Rewriting…</> : 'Make it neutral'}
            </button>
          )}
          <span className="jr-hint">Facts, times and direct quotes. No labels, no guesses about motives.</span>
        </div>
      )}

      {error && <p className="jr-error" role="alert">{error}</p>}

      <div className="jr-form-actions">
        <button className="btn btn-primary" disabled={busy !== ''}>{busy === 'save' ? <><span className="spin" /> Saving…</> : entry ? 'Save changes' : 'Add to record'}</button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

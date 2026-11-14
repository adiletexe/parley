import type {Category, Channel, Entry, EntryKind, Pattern} from '../../../../shared/types';
import type {IconId} from '../../../components/Icon';

export interface JournalStats {
  total: number; messages: number; messagesIn: number; incidents: number; expenses: number; expenseCents: number; notes: number;
  first: string | null; last: string | null;
}
export interface JournalData { entries: Entry[]; stats: JournalStats; patterns: Pattern[]; now: string }

export const KIND: Record<EntryKind, {label: string; plural: string; icon: IconId}> = {
  message_in: {label: 'Message received', plural: 'Received', icon: 'chat'},
  message_out: {label: 'Message sent', plural: 'Sent', icon: 'scripts'},
  incident: {label: 'Incident', plural: 'Incidents', icon: 'flag'},
  note: {label: 'Note', plural: 'Notes', icon: 'book'},
  expense: {label: 'Expense', plural: 'Expenses', icon: 'receipt'},
};

export const CATEGORY: Record<Category, string> = {
  schedule: 'Schedule', money: 'Money', health: 'Health', school: 'School', new_partner: 'New partner',
  accusation: 'Accusation', logistics: 'Logistics', other: 'Other',
};

export const CHANNEL: Record<Channel, string> = {
  in_person: 'In person', sms: 'Text', whatsapp: 'WhatsApp', email: 'Email', phone: 'Phone call',
  ofw: 'OurFamilyWizard', talkingparents: 'TalkingParents', other: 'Other',
};

export const SOURCE: Record<Entry['source'], string> = {
  manual: 'Logged by you', coach: 'From the reply coach', import_whatsapp: 'Imported from WhatsApp',
  import_pdf: 'Imported from a PDF', screenshot: 'Read from a screenshot', demo: 'Sample data',
};

/** Quick-log presets: one tap opens the form already shaped for the thing that just happened. */
export interface Preset {
  id: string; label: string; icon: IconId; kind: EntryKind; title: string; category: Category; tags: string[];
  channel: Channel; placeholder: string; amount?: boolean; minutes?: boolean;
}
export const PRESETS: Preset[] = [
  {id: 'late', label: 'Late pickup', icon: 'clock', kind: 'incident', title: 'Pickup started late', category: 'schedule', tags: ['late_pickup', 'handoff'], channel: 'in_person', minutes: true,
    placeholder: 'Where the handoff was, the agreed time, when they arrived, and what the kids were doing while they waited.'},
  {id: 'noshow', label: 'No-show', icon: 'timer', kind: 'incident', title: 'Other parent did not come to the handoff', category: 'schedule', tags: ['no_show', 'handoff'], channel: 'in_person',
    placeholder: 'The agreed time and place, how long you waited, and any message you got before or after.'},
  {id: 'kids', label: 'In front of the kids', icon: 'family', kind: 'incident', title: 'Conflict in front of the children', category: 'other', tags: ['in_front_of_kids'], channel: 'in_person',
    placeholder: 'The exact words, in quotes, if you remember them. Who was there, and how the kids reacted.'},
  {id: 'payment', label: 'Missed payment', icon: 'receipt', kind: 'incident', title: 'Payment not received', category: 'money', tags: ['missed_payment'], channel: 'other', amount: true,
    placeholder: 'What the payment was for, when it was due, and any message about it.'},
  {id: 'schedule', label: 'Schedule change', icon: 'calendar', kind: 'incident', title: 'Schedule changed at short notice', category: 'schedule', tags: ['schedule_change'], channel: 'sms',
    placeholder: 'What the schedule was, what changed, how much notice you got, and how it was sent.'},
  {id: 'expense', label: 'Expense', icon: 'split', kind: 'expense', title: '', category: 'money', tags: [], channel: 'other', amount: true,
    placeholder: 'What it was for and which child. Note who paid and whether you asked to split it.'},
  {id: 'note', label: 'Note', icon: 'book', kind: 'note', title: '', category: 'other', tags: [], channel: 'in_person',
    placeholder: 'What happened, when, and who was there. Stick to what you saw and heard.'},
];

export const TAG_LABEL: Record<string, string> = {
  tense: 'Tense', late_pickup: 'Late pickup', no_show: 'No-show', in_front_of_kids: 'In front of the kids', missed_payment: 'Missed payment',
  schedule_change: 'Schedule change', attachment: 'Had an attachment', date_unknown: 'Date not shown', handoff: 'Handoff', imported: 'Imported',
};
/** Tags worth a chip on the row; the rest are bookkeeping. */
export const VISIBLE_TAGS = ['tense', 'late_pickup', 'no_show', 'in_front_of_kids', 'missed_payment', 'schedule_change', 'date_unknown'];

export const money = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', {minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2});
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric', year: 'numeric'}) => new Date(iso).toLocaleDateString('en-US', opts);
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
export const monthKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const monthLabel = (key: string) => new Date(key + '-15T12:00:00').toLocaleDateString('en-US', {month: 'long', year: 'numeric'});

/** ISO → the value a <input type="datetime-local"> wants, in the browser's zone. */
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fromLocalInput = (v: string) => new Date(v).toISOString();

export function parseMoney(v: string): number | null {
  const n = Number(v.replace(/[$,\s]/g, ''));
  return v.trim() && isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

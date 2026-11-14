/* One pasted message, split into the texts it was sent as (docs/VOICE.md: people send bursts, not letters).
   Shared by the compose screen's live preview and the server (server/prompts/reply.ts), so both split the same way.
   Pure: no imports, no DOM. */
export interface Burst { bubbles: string[]; times: string[]; sender?: string; earlier: string[] }

const TIME = String.raw`\d{1,2}[:.]\d{2}(?::\d{2})?\s*(?:[AaPp]\.?[Mm]\.?)?`;
const DATE = String.raw`\d{1,4}[/.-]\d{1,2}(?:[/.-]\d{2,4})?`;
const NAME = String.raw`[A-Z][\p{L}'.-]{0,20}(?: [A-Z][\p{L}'.-]{0,20}){0,2}|[Mm]e|[Yy]ou`;
// "[11/14, 9:41 PM] Jordan: …" (WhatsApp iOS) · "11/14/26, 9:41 PM - Jordan: …" (Android) · "9:41 PM ur late" · "Jordan: …"
const EXPORT_LINE = new RegExp(String.raw`^\s*(?:\[\s*(?:${DATE},?\s*)?(${TIME})\s*\]|(?:${DATE},?\s*)?(${TIME})(?:\s*[-–—:]\s*|\s+))?\s*(?:(${NAME}):\s+)?(.*)$`, 'u');
const TIME_ONLY = new RegExp(String.raw`^\s*\[?\s*(?:${DATE},?\s*)?(${TIME})\s*\]?\s*$`, 'u');
const tidyTime = (t: string) => t.replace(/\s*([AaPp])\.?\s*[Mm]\.?$/, (_m, x: string) => ' ' + x.toUpperCase() + 'M').replace(/^(\d{1,2})\.(\d{2})/, '$1:$2').trim();

export function splitBurst(text: string): Burst {
  const raw = (text || '').replace(/\r\n?/g, '\n').replace(/\u200e|\u200f/g, '').trim();
  if (!raw) return {bubbles: [], times: [], earlier: []};
  const lines = raw.split('\n').map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const parsed = nonEmpty.map((l) => {
    if (TIME_ONLY.test(l)) return {time: tidyTime(TIME_ONLY.exec(l)![1]), name: '', body: '', timeOnly: true};
    const m = EXPORT_LINE.exec(l)!;
    const time = m[1] || m[2] || '';
    // A bare "Name: …" only counts as a sender when it looks like one (short, capitalised) — "Pickup: 5" is text.
    return {time: time ? tidyTime(time) : '', name: m[3] || '', body: (m[4] ?? l).trim(), timeOnly: false};
  });
  const tagged = parsed.filter((p) => p.time || p.timeOnly).length;
  const named = parsed.filter((p) => p.name).length;
  const names = new Set(parsed.map((p) => p.name).filter(Boolean));
  // One line that starts with a clock ("1:12 AM so the orthodontist…") is one text with a time on it.
  const oneTimed = nonEmpty.length === 1 && !!parsed[0].time && /^\s*(\[|\d{1,4}[/.-]|\d{1,2}[:.]\d{2}(?::\d{2})?\s*[AaPp]\.?\s*[Mm])/.test(nonEmpty[0]);
  const isExport = oneTimed || nonEmpty.length > 1 && (tagged >= Math.ceil(nonEmpty.length / 2) || (named >= Math.ceil(nonEmpty.length / 2) && names.size <= 3));

  let items: {time: string; name: string; body: string}[];
  if (isExport) {
    items = [];
    let pending = '';
    for (const p of parsed) {
      if (p.timeOnly) { pending = p.time; continue; }
      if (!p.time && !p.name && items.length && !pending) { items[items.length - 1].body += '\n' + p.body; continue; }   // a wrapped line
      if (p.body) items.push({time: p.time || pending, name: p.name, body: p.body});
      pending = '';
    }
  } else if (/\n\s*\n/.test(raw)) {
    items = raw.split(/\n\s*\n/).map((b) => ({time: '', name: '', body: b.trim()})).filter((b) => b.body);
  } else if (nonEmpty.length > 1 && !looksWrapped(nonEmpty)) {
    items = nonEmpty.map((b) => ({time: '', name: '', body: b}));
  } else {
    items = [{time: '', name: '', body: nonEmpty.join(' ')}];
  }

  // A pasted conversation: answer the last run from one sender; what came before is context, not the ask.
  let earlier: string[] = [];
  let sender: string | undefined;
  const senders = new Set(items.map((i) => i.name).filter(Boolean));
  if (senders.size > 1) {
    sender = items[items.length - 1].name;
    let k = items.length - 1;
    while (k > 0 && items[k - 1].name === sender) k--;
    earlier = items.slice(0, k).map((i) => `${/^(me|you)$/i.test(i.name) ? 'The user' : i.name || 'Them'}: ${i.body}`);
    items = items.slice(k);
  } else if (senders.size === 1) sender = [...senders][0];

  if (items.length > 12) items = [...items.slice(0, 11), {...items[items.length - 1], body: items.slice(11).map((i) => i.body).join('\n')}];
  return {bubbles: items.map((i) => i.body), times: items.map((i) => i.time), sender, earlier: earlier.slice(-8)};
}

/** An email or a note pasted with hard line breaks is one message, not ten texts: three or more lines, every one but
    the last about the same long width, running on into the next. Two long lines are still two texts — people send
    those all the time. */
function looksWrapped(lines: string[]): boolean {
  if (lines.length < 3) return false;
  return lines.slice(0, -1).every((l) => l.length >= 60 && l.length <= 100 && !/[.?!…)\p{Extended_Pictographic}]$/u.test(l));
}

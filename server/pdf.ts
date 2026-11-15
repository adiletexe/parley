/* The court-ready timeline as a PDF (pdf-lib, standard fonts, US Letter).
   Laid out for the person who receives it — a family lawyer, a GAL, a mediator: a cover that says what this is and
   what period it covers, the patterns with the exhibits they rest on, one chronological table with exhibit numbers,
   and every entry in full in an appendix. Every page carries its number and the SHA-256 fingerprint of the exact
   records it was made from, so two copies can be told apart at a glance.
   The standard fonts are WinAnsi only: anything they cannot draw (emoji, Cyrillic, CJK…) is replaced before it
   reaches pdf-lib, which would otherwise throw and fail the whole download over one character. */
import {createHash} from 'node:crypto';
import {PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB} from 'pdf-lib';
import type {Category, Channel, Entry, EntryKind, Pattern} from '../shared/types.js';

export const KIND_LABEL: Record<EntryKind, string> = {
  message_in: 'Message received', message_out: 'Message sent', incident: 'Incident', note: 'Note', expense: 'Expense',
};
export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: 'Text message', whatsapp: 'WhatsApp', email: 'Email', ofw: 'OurFamilyWizard', talkingparents: 'TalkingParents',
  in_person: 'In person', phone: 'Phone call', other: 'Other',
};
export const CATEGORY_LABEL: Record<Category, string> = {
  schedule: 'Schedule', money: 'Money', health: 'Health', school: 'School', new_partner: 'New partner',
  accusation: 'Accusation', logistics: 'Logistics', other: 'Other',
};
const SOURCE_LABEL: Record<Entry['source'], string> = {
  manual: 'Logged by hand', coach: 'Logged from the reply coach', import_whatsapp: 'Imported from a WhatsApp export',
  import_pdf: 'Imported from a PDF export', screenshot: 'Read from a screenshot', demo: 'Sample data (demo)',
};

/** SHA-256 over the records exactly as they go into the document, in exhibit order. Any edit, addition or
 *  removal gives a different fingerprint; the same records give the same one whenever the PDF is made. */
export function fingerprint(entries: Entry[]): string {
  const canon = entries.map((e) => ({
    id: e.id, kind: e.kind, occurredAt: e.occurredAt, channel: e.channel, title: e.title, text: e.text,
    category: e.category, amountCents: e.amountCents ?? null, source: e.source, createdAt: e.createdAt,
  }));
  return createHash('sha256').update(JSON.stringify(canon)).digest('hex');
}

/** A time zone the runtime knows, or UTC. The browser sends its own so dates read as the person lived them. */
export function safeTz(tz: string | undefined): string {
  if (!tz) return 'UTC';
  try { new Intl.DateTimeFormat('en-US', {timeZone: tz}); return tz; } catch { return 'UTC'; }
}
/** YYYY-MM-DD of an instant, in a time zone (en-CA formats as ISO dates). */
export function localDay(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(iso));
}

export interface TimelineDoc {
  entries: Entry[];               // chronological; exhibit E-n is entries[n-1]
  patterns: Pattern[];
  from?: string;                  // YYYY-MM-DD, as filtered (absent = from the first entry)
  to?: string;
  categories: Category[];         // empty = all
  generatedAt: Date;
  tz: string;
  preparedFor?: string;
  demo: boolean;
  fingerprint: string;
}

/* ---------- text safety ---------- */

const REPLACE: Record<string, string> = {
  '‐': '-', '‑': '-', '‒': '-', '―': '-', '−': '-', '⁃': '-',
  '′': "'", '″': '"', '‵': "'", 'ʼ': "'", ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ',
  '←': '<-', '→': '->', '↔': '<->', '⇒': '=>', '≤': '<=', '≥': '>=', '≠': '!=', '≈': '~',
  '✓': 'v', '✔': 'v', '✕': 'x', '✖': 'x', '✗': 'x', '•': '•', '●': '•', '▪': '•', '⁃ ': '-',
  '‚': ',', '„': '"', '‹': '<', '›': '>', '№': 'No.', '™': '(TM)',
};
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;   // flags are pairs of regional indicators, not pictographs
// Letters with no WinAnsi form and no decomposition. Cyrillic is transliterated (it is the likeliest non-Latin script
// in a US record after Spanish, which WinAnsi already covers) so a message stays readable instead of a row of ?.
const TRANSLIT: Record<string, string> = {
  'Ł': 'L', 'ł': 'l', 'Đ': 'D', 'đ': 'd', 'Ħ': 'H', 'ħ': 'h', 'ı': 'i', 'ŀ': 'l', 'Ŀ': 'L', 'ĸ': 'k', 'Ŋ': 'N', 'ŋ': 'n', 'Œ': 'OE', 'œ': 'oe',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L',
  'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh',
  'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya', 'І': 'I', 'Ї': 'Yi', 'Є': 'Ye', 'Ґ': 'G', 'Қ': 'Q', 'Ң': 'N',
  'Ө': 'O', 'Ұ': 'U', 'Ү': 'U', 'Һ': 'H', 'Ә': 'A', 'Ғ': 'Gh',
};
for (const [k, v] of Object.entries({...TRANSLIT})) { const lo = k.toLowerCase(); if (lo !== k && !(lo in TRANSLIT)) TRANSLIT[lo] = v.toLowerCase(); }
const INVISIBLE = /[​-‍⁠︀-️\u{1f3fb}-\u{1f3ff}\u{e0020}-\u{e007f}]/gu;

function makeSanitiser(font: PDFFont) {
  const ok = new Set(font.getCharacterSet());
  return (s: string): string => {
    s = s.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(INVISIBLE, '');
    let out = '';
    let lastEmoji = false;
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (ch === '\n') { out += ch; lastEmoji = false; continue; }
      if (cp < 32 || (cp >= 0x7f && cp < 0xa0)) continue;
      if (ok.has(cp)) { out += ch; lastEmoji = false; continue; }
      if (REPLACE[ch] !== undefined && [...REPLACE[ch]].every((c) => ok.has(c.codePointAt(0)!))) { out += REPLACE[ch]; lastEmoji = false; continue; }
      if (TRANSLIT[ch] !== undefined) { out += TRANSLIT[ch]; lastEmoji = false; continue; }
      if (EMOJI.test(ch)) { if (!lastEmoji) out += '[emoji]'; lastEmoji = true; continue; }
      // Accented letters outside WinAnsi (e.g. Polish, Czech) keep their base letter.
      const base = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
      if (base && [...base].every((c) => ok.has(c.codePointAt(0)!))) { out += base; lastEmoji = false; continue; }
      out += '?';
      lastEmoji = false;
    }
    return out;
  };
}

/* ---------- layout ---------- */

const W = 612, H = 792, M = 54;          // US Letter, 0.75" margins
const CW = W - 2 * M;
const TOP = H - 64;                       // below the running header
const BOTTOM = 66;                        // above the footer
const INK = rgb(0.11, 0.12, 0.17);
const MUTE = rgb(0.40, 0.42, 0.48);
const FAINT = rgb(0.62, 0.64, 0.70);
const RULE = rgb(0.86, 0.87, 0.91);
const ZEBRA = rgb(0.965, 0.968, 0.98);
const BAND = rgb(0.93, 0.94, 1);
const ACC = rgb(0.30, 0.34, 0.80);
const WARN = rgb(0.72, 0.18, 0.40);

interface Fonts { reg: PDFFont; bold: PDFFont; ital: PDFFont; mono: PDFFont }

class Writer {
  page!: PDFPage;
  y = TOP;
  pages: PDFPage[] = [];
  clean: (s: string) => string;
  constructor(public pdf: PDFDocument, public f: Fonts) { this.clean = makeSanitiser(f.reg); }

  newPage() { this.page = this.pdf.addPage([W, H]); this.pages.push(this.page); this.y = TOP; return this.page; }
  /** Room for `h` points, or a fresh page (the callback redraws a table header, a "continued" line…). */
  ensure(h: number, onBreak?: () => void): boolean {
    if (this.y - h >= BOTTOM) return false;
    this.newPage();
    onBreak?.();
    return true;
  }
  text(s: string, x: number, y: number, font: PDFFont, size: number, color: RGB = INK) {
    const t = this.clean(s);
    if (t) this.page.drawText(t, {x, y, font, size, color});
  }
  width(s: string, font: PDFFont, size: number) { return font.widthOfTextAtSize(this.clean(s), size); }

  /** Word-wrapped lines; a word longer than the line (a URL) is broken by characters. Keeps paragraph breaks. */
  wrap(s: string, font: PDFFont, size: number, maxW: number): string[] {
    const lines: string[] = [];
    for (const para of this.clean(s).split('\n')) {
      if (!para.trim()) { lines.push(''); continue; }
      let line = '';
      for (const word of para.split(/ +/)) {
        const cand = line ? line + ' ' + word : word;
        if (font.widthOfTextAtSize(cand, size) <= maxW) { line = cand; continue; }
        if (line) lines.push(line);
        if (font.widthOfTextAtSize(word, size) <= maxW) { line = word; continue; }
        let chunk = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxW) { lines.push(chunk); chunk = ''; }
          chunk += ch;
        }
        line = chunk;
      }
      lines.push(line);
    }
    while (lines.length > 1 && lines.at(-1) === '') lines.pop();
    return lines;
  }
  /** Draws already-clean lines (from wrap) without sanitising them twice. */
  lines(ls: string[], x: number, font: PDFFont, size: number, lh: number, color: RGB = INK) {
    for (const l of ls) { if (l) this.page.drawText(l, {x, y: this.y - size, font, size, color}); this.y -= lh; }
  }
  rule(y: number, x1 = M, x2 = W - M, color = RULE, t = 0.6) {
    this.page.drawLine({start: {x: x1, y}, end: {x: x2, y}, thickness: t, color});
  }
}

/* ---------- formatting ---------- */

function fmt(tz: string) {
  const date = new Intl.DateTimeFormat('en-US', {timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'});
  const time = new Intl.DateTimeFormat('en-US', {timeZone: tz, hour: 'numeric', minute: '2-digit'});
  const month = new Intl.DateTimeFormat('en-US', {timeZone: tz, month: 'long', year: 'numeric'});
  const zone = (d: Date) => new Intl.DateTimeFormat('en-US', {timeZone: tz, timeZoneName: 'short'}).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? tz;
  return {
    date: (iso: string) => date.format(new Date(iso)),
    time: (iso: string) => time.format(new Date(iso)),
    month: (iso: string) => month.format(new Date(iso)),
    full: (iso: string) => `${date.format(new Date(iso))}, ${time.format(new Date(iso))}`,
    zone,
  };
}
const dayLabel = (ymd: string) => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
const money = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** "E-3, E-7, E-9 to E-12" — consecutive runs collapsed so a long pattern stays one line. */
export function exhibitList(nums: number[]): string {
  const s = [...new Set(nums)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j - i >= 2 ? `E-${s[i]} to E-${s[j]}` : j > i ? `E-${s[i]}, E-${s[j]}` : `E-${s[i]}`);
    i = j;
  }
  return out.join(', ');
}

/* ---------- the document ---------- */

export async function buildTimelinePdf(d: TimelineDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const f: Fonts = {
    reg: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    ital: await pdf.embedFont(StandardFonts.HelveticaOblique),
    mono: await pdf.embedFont(StandardFonts.Courier),
  };
  const w = new Writer(pdf, f);
  const t = fmt(d.tz);
  const E = d.entries;
  const exhibit = new Map(E.map((e, i) => [e.id, i + 1]));
  const first = E[0]?.occurredAt, last = E.at(-1)?.occurredAt;
  const period = d.from || d.to
    ? `${d.from ? dayLabel(d.from) : first ? t.date(first) : 'the first entry'} to ${d.to ? dayLabel(d.to) : last ? t.date(last) : 'today'}`
    : first ? `${t.date(first)} to ${t.date(last!)}` : 'No entries';
  const zone = t.zone(d.generatedAt);
  const title = 'Co-Parenting Communication Record';

  pdf.setTitle(`${title}${d.preparedFor ? ' · ' + w.clean(d.preparedFor) : ''}`);
  pdf.setAuthor(d.preparedFor ? w.clean(d.preparedFor) : 'Parley user');
  pdf.setSubject(`Chronological timeline, ${w.clean(period)}. SHA-256 ${d.fingerprint}`);
  pdf.setCreator('Parley');
  pdf.setProducer('Parley (pdf-lib)');
  pdf.setCreationDate(d.generatedAt);

  const count = (k: EntryKind) => E.filter((e) => e.kind === k).length;
  const courtPatterns = d.patterns.filter((p) => p.entryIds.some((id) => exhibit.has(id)));

  /* ----- cover ----- */
  w.newPage();
  const pg = w.page;
  pg.drawRectangle({x: 0, y: H - 6, width: W, height: 6, color: ACC});
  w.text('PARLEY', M, H - 52, f.bold, 10, ACC);
  w.text('Private record kept by one parent', W - M - w.width('Private record kept by one parent', f.reg, 9), H - 52, f.reg, 9, MUTE);
  if (d.demo) {
    const tag = 'SAMPLE CASE · DEMO DATA, NOT A REAL PERSON';
    const tw = w.width(tag, f.bold, 9);
    pg.drawRectangle({x: M, y: H - 92, width: tw + 16, height: 18, color: rgb(1, 0.91, 0.95)});
    w.text(tag, M + 8, H - 86, f.bold, 9, WARN);
  }
  w.y = H - 116;
  for (const l of w.wrap(title, f.bold, 30, CW)) { w.text(l, M, w.y - 30, f.bold, 30); w.y -= 36; }
  w.y -= 4;
  w.text('Chronological timeline with numbered exhibits', M, w.y - 14, f.reg, 14, MUTE);
  w.y -= 34;

  const facts: [string, string][] = [
    ['Prepared by', d.preparedFor?.trim() || 'The parent who kept this record'],
    ['Period covered', period],
    ['Topics', d.categories.length ? d.categories.map((c) => CATEGORY_LABEL[c]).join(', ') : 'All topics'],
    ['Entries', E.length ? `${plural(E.length, 'entry', 'entries')}, numbered E-1 to E-${E.length} in date order` : 'No entries in this period'],
    ['Generated', `${t.full(d.generatedAt.toISOString())} ${zone}`],
    ['Times shown in', `${d.tz} (${zone})`],
  ];
  w.rule(w.y);
  for (const [k, v] of facts) {
    const ls = w.wrap(v, f.reg, 11, CW - 130);
    w.text(k, M, w.y - 17, f.bold, 9, MUTE);
    w.y -= 6;
    w.lines(ls, M + 130, f.reg, 11, 15);
    w.y -= 5;
    w.rule(w.y);
  }
  w.y -= 22;

  // Four counts, as boxes.
  const stats: [string, number][] = [['Messages', count('message_in') + count('message_out')], ['Incidents', count('incident')], ['Expenses', count('expense')], ['Notes', count('note')]];
  const bw = (CW - 3 * 12) / 4;
  stats.forEach(([label, n], i) => {
    const x = M + i * (bw + 12);
    pg.drawRectangle({x, y: w.y - 54, width: bw, height: 54, color: ZEBRA, borderColor: RULE, borderWidth: 0.6});
    w.text(String(n), x + 12, w.y - 29, f.bold, 20);
    w.text(label, x + 12, w.y - 45, f.reg, 9, MUTE);
  });
  w.y -= 76;

  w.text('About this document', M, w.y - 11, f.bold, 11);
  w.y -= 20;
  const about = [
    'This is a private, dated record of co-parenting communication and events, kept by one parent in Parley. Messages are reproduced as received or sent; incidents and notes are that parent\'s own written account, recorded in neutral language.',
    'Section 1 summarises patterns counted from the entries. Section 2 lists every entry in date order with an exhibit number. The Appendix reproduces each entry in full, with when it happened, when it was logged and how it was recorded.',
    'The SHA-256 fingerprint in every footer is calculated from the exact entries in this document. Any later edit, addition or removal produces a different fingerprint, so copies made from different versions of the record can be told apart.',
  ];
  for (const para of about) { w.lines(w.wrap(para, f.reg, 9, CW), M, f.reg, 9, 12.5, INK); w.y -= 5; }
  const lossy = (s: string) => w.clean(s) !== s.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  if (E.some((e) => lossy(e.text) || lossy(e.title))) {
    w.lines(w.wrap('Some characters (such as emoji) cannot be printed in this format: emoji appear as [emoji], Cyrillic letters are transliterated, and anything else is shown as ?. The original text is kept unchanged in the record.', f.ital, 8.5, CW), M, f.ital, 8.5, 12, MUTE);
  }

  // Disclaimer at the foot of the cover, above the footer (or right under the text, if a long name pushed it down).
  const dy = Math.min(BOTTOM + 8, w.y - 12 - 40);
  pg.drawRectangle({x: M, y: dy, width: CW, height: 40, color: ZEBRA});
  w.text('Prepared with Parley. Not legal advice.', M + 12, dy + 24, f.bold, 9.5);
  w.text('Parley is not a law firm and doesn\'t give legal advice. Ask your attorney how to use this record in your case.', M + 12, dy + 10, f.reg, 8.5, MUTE);

  /* ----- section 1: summary ----- */
  // A section starts on a fresh page unless the last one has more than half a page left: no near-empty pages.
  const section = () => { if (w.y - BOTTOM < (TOP - BOTTOM) / 2) w.newPage(); else { w.y -= 24; w.rule(w.y, M, W - M, RULE, 1); w.y -= 22; } };
  const heading = (n: string, s: string, sub?: string) => {
    w.text(n, M, w.y - 10, f.bold, 9, ACC);
    w.text(s, M, w.y - 32, f.bold, 20);
    w.y -= 42;
    if (sub) { w.lines(w.wrap(sub, f.reg, 9.5, CW), M, f.reg, 9.5, 13, MUTE); }
    w.y -= 10;
  };
  w.newPage();
  heading('SECTION 1', 'Summary', `${plural(E.length, 'entry', 'entries')} from ${period}.`);

  // Counts by type and by topic, side by side.
  const tableAt = (x: number, width: number, head: string, rows: [string, string][]) => {
    let y = w.y;
    w.text(head, x, y - 9, f.bold, 8, MUTE);
    y -= 16;
    for (const [k, v] of rows) {
      w.page.drawLine({start: {x, y}, end: {x: x + width, y}, thickness: 0.6, color: RULE});
      w.text(k, x, y - 13, f.reg, 10);
      w.text(v, x + width - w.width(v, f.bold, 10), y - 13, f.bold, 10);
      y -= 19;
    }
    w.page.drawLine({start: {x, y}, end: {x: x + width, y}, thickness: 0.6, color: RULE});
    return y;
  };
  const kinds = (Object.keys(KIND_LABEL) as EntryKind[]).filter((k) => count(k)).map((k): [string, string] => [KIND_LABEL[k], String(count(k))]);
  const cats = (Object.keys(CATEGORY_LABEL) as Category[]).map((c): [Category, number] => [c, E.filter((e) => e.category === c).length])
    .filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([c, n]): [string, string] => [CATEGORY_LABEL[c], String(n)]);
  const half = (CW - 24) / 2;
  const y1 = tableAt(M, half, 'ENTRIES BY TYPE', kinds.length ? kinds : [['No entries', '0']]);
  const y2 = tableAt(M + half + 24, half, 'ENTRIES BY TOPIC', cats.length ? cats : [['No entries', '0']]);
  w.y = Math.min(y1, y2) - 14;
  const spent = E.filter((e) => e.kind === 'expense' && e.amountCents).reduce((s, e) => s + (e.amountCents ?? 0), 0);
  if (spent) { w.text(`Expenses recorded: ${money(spent)} in total.`, M, w.y - 10, f.reg, 10, MUTE); w.y -= 22; }
  w.y -= 14;

  w.text('Patterns in the record', M, w.y - 13, f.bold, 13);
  w.y -= 22;
  w.lines(w.wrap('Counted by Parley from the entries in this document, using fixed rules (not an AI judgement). Each pattern lists the exhibits it rests on so it can be checked against the entries themselves.', f.reg, 9, CW), M, f.reg, 9, 12.5, MUTE);
  w.y -= 8;
  if (!courtPatterns.length) {
    w.text('No recurring pattern stands out in this period.', M, w.y - 11, f.ital, 10, MUTE);
    w.y -= 20;
  }
  for (const p of courtPatterns) {
    const refs = exhibitList(p.entryIds.map((id) => exhibit.get(id)).filter((n): n is number => !!n));
    const detail = w.wrap(p.detail, f.reg, 10, CW - 24);
    const refLines = w.wrap('Exhibits: ' + refs, f.reg, 8.5, CW - 24);
    const h = 18 + detail.length * 14 + refLines.length * 12 + 14;
    w.ensure(h);
    w.page.drawRectangle({x: M, y: w.y - h + 4, width: 3, height: h - 8, color: ACC});
    w.text(p.label, M + 14, w.y - 12, f.bold, 11);
    w.y -= 18;
    w.lines(detail, M + 14, f.reg, 10, 14);
    w.lines(refLines, M + 14, f.reg, 8.5, 12, MUTE);
    w.y -= 14;
  }

  /* ----- section 2: chronological log ----- */
  section();
  heading('SECTION 2', 'Chronological log', `Every entry in date order. Times in ${d.tz} (${zone}). Full texts are in the Appendix under the same exhibit number.`);
  const col = {ex: M + 6, when: M + 50, type: M + 140, entry: M + 236};
  const entryW = W - M - col.entry - 6;
  const tableHead = () => {
    w.page.drawRectangle({x: M, y: w.y - 20, width: CW, height: 20, color: INK});
    for (const [x, s] of [[col.ex, 'EXHIBIT'], [col.when, 'DATE & TIME'], [col.type, 'TYPE & CHANNEL'], [col.entry, 'ENTRY']] as [number, string][]) {
      w.text(s, x, w.y - 13.5, f.bold, 7.5, rgb(1, 1, 1));
    }
    w.y -= 20;
  };
  tableHead();
  if (!E.length) { w.text('No entries in this period.', M + 6, w.y - 20, f.ital, 10, MUTE); w.y -= 30; }
  let month = '';
  E.forEach((e, i) => {
    const m = t.month(e.occurredAt);
    const titleLs = w.wrap(e.title, f.bold, 9, entryW);
    const body = e.text.replace(/\s+/g, ' ').trim();
    const sameAsTitle = !body || body === e.title.replace(/\s+/g, ' ').trim() || (e.title.endsWith('…') && body.startsWith(e.title.slice(0, -1)));
    let ex = sameAsTitle ? [] : w.wrap(body, f.reg, 8.5, entryW);
    if (ex.length > 3) { ex = ex.slice(0, 3); ex[2] = ex[2].replace(/\s*\S*$/, '') + ' ... (full text in Appendix)'; ex = w.wrap(ex.join(' '), f.reg, 8.5, entryW); }
    const meta = [CATEGORY_LABEL[e.category], e.amountCents ? money(e.amountCents) : ''].filter(Boolean).join(' · ');
    const h = 10 + titleLs.length * 11.5 + ex.length * 11 + 12 + 4;
    const bandH = m !== month ? 22 : 0;
    if (w.ensure(h + bandH, tableHead)) month = '';
    if (m !== month) {
      month = m;
      w.page.drawRectangle({x: M, y: w.y - 22, width: CW, height: 22, color: BAND});
      w.text(m, M + 6, w.y - 15, f.bold, 9, ACC);
      w.y -= 22;
    }
    if (i % 2) w.page.drawRectangle({x: M, y: w.y - h, width: CW, height: h, color: ZEBRA});
    const top = w.y - 8;
    w.text(`E-${i + 1}`, col.ex, top - 9, f.bold, 9.5);
    w.text(t.date(e.occurredAt), col.when, top - 9, f.reg, 8.5);
    w.text(t.time(e.occurredAt), col.when, top - 20.5, f.reg, 8.5, MUTE);
    w.text(KIND_LABEL[e.kind], col.type, top - 9, f.reg, 8.5, e.kind === 'incident' ? WARN : INK);
    w.text(CHANNEL_LABEL[e.channel], col.type, top - 20.5, f.reg, 8.5, MUTE);
    w.y = top;
    w.lines(titleLs, col.entry, f.bold, 9, 11.5);
    w.lines(ex, col.entry, f.reg, 8.5, 11, INK);
    w.text(meta, col.entry, w.y - 8, f.reg, 7.5, MUTE);
    w.y = top - h + 8;
    w.rule(w.y);
  });

  /* ----- appendix: full texts ----- */
  section();
  heading('APPENDIX', 'Full entries', 'Each entry exactly as recorded, with when it happened and when it was logged.');
  const textW = CW - 16;
  E.forEach((e, i) => {
    const head = `E-${i + 1}`;
    const metaLine = `${t.full(e.occurredAt)} · ${KIND_LABEL[e.kind]} · ${CHANNEL_LABEL[e.channel]} · ${CATEGORY_LABEL[e.category]}`;
    const metaLs = w.wrap(metaLine, f.reg, 8.5, CW - 70);
    const titleLs = w.wrap(e.title, f.bold, 10.5, textW);
    const bodyLs = e.text.trim() ? w.wrap(e.text.trim(), f.reg, 10, textW) : [];
    const foot = `${SOURCE_LABEL[e.source] ?? 'Logged'}${e.createdAt ? ` on ${t.full(e.createdAt)}` : ''}${e.amountCents ? ` · Amount: ${money(e.amountCents)}` : ''}`;
    const headH = 8 + Math.max(1, metaLs.length) * 11 + 8;
    const footLs = w.wrap(foot, f.ital, 8, textW);
    // A short entry stays on one page whole; a long one keeps its header, title and first three lines together.
    const whole = headH + titleLs.length * 14 + 2 + bodyLs.length * 14 + 2 + footLs.length * 11;
    w.ensure(bodyLs.length <= 8 ? whole : headH + titleLs.length * 14 + 3 * 14 + 16);
    const drawHead = (cont: boolean) => {
      const hh = 8 + (cont ? 11 : Math.max(1, metaLs.length) * 11) + 8;
      w.page.drawRectangle({x: M, y: w.y - hh, width: CW, height: hh, color: BAND});
      w.text(head, M + 8, w.y - 17.5, f.bold, 11, ACC);
      w.y -= 8;
      if (cont) w.lines(['(continued)'], M + 62, f.ital, 8.5, 11, MUTE);
      else w.lines(metaLs, M + 62, f.reg, 8.5, 11, INK);
      w.y -= 8 + 8;
    };
    drawHead(false);
    w.lines(titleLs, M + 8, f.bold, 10.5, 14);
    w.y -= 2;
    for (const l of bodyLs) {
      if (w.ensure(14)) { drawHead(true); if (!l) continue; }   // no blank line at the top of a continued page
      w.lines([l], M + 8, f.reg, 10, 14);
    }
    if (w.ensure(2 + footLs.length * 11)) drawHead(true);
    w.y -= 2;
    w.lines(footLs, M + 8, f.ital, 8, 11, MUTE);
    w.y -= 18;
  });
  if (!E.length) { w.text('No entries in this period.', M, w.y - 11, f.ital, 10, MUTE); }

  /* ----- running header and footer on every page, now that the count is known ----- */
  const total = w.pages.length;
  w.pages.forEach((p, i) => {
    w.page = p;
    if (i > 0) {
      w.text(title, M, H - 36, f.bold, 8, MUTE);
      const r = w.clean(period);
      w.text(r, W - M - f.reg.widthOfTextAtSize(r, 8), H - 36, f.reg, 8, MUTE);
      w.rule(H - 44);
    }
    w.rule(48);
    w.text('Prepared with Parley. Not legal advice', M, 36, f.reg, 7.5, MUTE);
    const pn = `Page ${i + 1} of ${total}`;
    w.text(pn, W - M - f.bold.widthOfTextAtSize(pn, 7.5), 36, f.bold, 7.5, INK);
    p.drawText('SHA-256', {x: M, y: 24, font: f.bold, size: 6.5, color: FAINT});
    p.drawText(d.fingerprint, {x: M + 34, y: 24, font: f.mono, size: 6.5, color: MUTE});
  });

  return pdf.save();
}

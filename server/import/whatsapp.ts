/* WhatsApp "Export chat" parsed in code — no model, no upload anywhere else.
   iPhone exports are a .zip holding _chat.txt (even "Without media"); Android exports are a bare .txt.
   Line formats seen in the wild (the locale decides the order and the clock):
     [1/15/24, 6:42:13 PM] Jordan: text        iPhone, US
     1/15/24, 6:42 PM - Jordan: text           Android, US
     [15/01/2024, 18:42:13] Jordan: text       iPhone, 24h, day first
     15.01.24, 18:42 - Jordan: text            Android, dotted
   A message continues on the following lines until the next stamped line. */
import {inflateRawSync} from 'node:zlib';

export interface ChatMessage { at: string; sender: string; text: string; media: boolean }
export interface ParsedChat { messages: ChatMessage[]; senders: {name: string; count: number}[]; dayFirst: boolean; skipped: number }

// U+200E (LRM) and friends are sprinkled through iPhone exports; U+202F (narrow no-break space) sits before AM/PM.
const INVISIBLE = /[‎‏‪-‮⁦-⁩﻿]/g;
const STAMP = /^\[?(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]?\s*(?:[-–—]\s*)?(.*)$/;
const MEDIA = /^(<?(media|image|video|audio|sticker|gif|document|contact card) omitted>?|<attached: .+>|.+\.(jpe?g|png|heic|mp4|opus|pdf|vcf) \(file attached\))$/i;
const SYSTEM = /end-to-end encrypted|created group|added you|changed (the|this) group|changed their phone|security code|left$|joined using|deleted this message|this message was deleted|disappearing messages|missed (voice|video) call/i;

/** Pull _chat.txt (or the only .txt) out of a WhatsApp .zip without a zip library: read the central directory, inflate one entry. */
export function textFromZip(buf: Buffer): string {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This zip file looks damaged. Try exporting the chat again.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  let best: {name: string; method: number; size: number; offset: number} | undefined;
  for (let i = 0; i < count && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    if (/\.txt$/i.test(name) && !name.startsWith('__MACOSX') && (!best || /_chat\.txt$/i.test(name))) best = {name, method, size, offset};
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (!best) throw new Error('No chat text inside this zip. It should contain a file named _chat.txt.');
  const lh = best.offset;
  const start = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28);
  const data = buf.subarray(start, start + best.size);
  if (best.method === 0) return data.toString('utf8');
  if (best.method === 8) return inflateRawSync(data).toString('utf8');
  throw new Error('This zip uses a compression we can’t read. Export the chat again, or upload the .txt inside it.');
}

export function decodeExport(buf: Buffer, filename: string): string {
  const zip = buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50;
  if (zip || /\.zip$/i.test(filename)) return textFromZip(buf);
  return buf.toString('utf8');
}

/**
 * @param tzOffsetMin the browser's `getTimezoneOffset()` — WhatsApp stamps are the phone's local time with no zone.
 */
export function parseWhatsApp(raw: string, tzOffsetMin = 0): ParsedChat {
  const lines = raw.replace(INVISIBLE, '').replace(/ | /g, ' ').split(/\r?\n/);
  type Raw = {a: number; b: number; c: number; h: number; m: number; s: number; ampm?: string; rest: string};
  const stamped: Raw[] = [];
  let cur: Raw | undefined;
  for (const line of lines) {
    const m = STAMP.exec(line);
    if (m) {
      cur = {a: +m[1], b: +m[2], c: +m[3], h: +m[4], m: +m[5], s: m[6] ? +m[6] : 0, ampm: m[7], rest: m[8]};
      stamped.push(cur);
    } else if (cur) cur.rest += '\n' + line;
  }
  // Day-first if any line's first number can't be a month, or the second number can't be a day-of-month... it always can,
  // so the only proof is a first number over 12. A US export never has one; a European one has one by the 13th of a month.
  const yearFirst = stamped.some((r) => r.a > 31);
  const dayFirst = !yearFirst && stamped.some((r) => r.a > 12);

  const messages: ChatMessage[] = [];
  let skipped = 0;
  for (const r of stamped) {
    const colon = r.rest.indexOf(': ');
    if (colon <= 0 || colon > 60) { skipped++; continue; } // system line: no "Name: "
    const sender = r.rest.slice(0, colon).replace(/^~\s*/, '').trim();
    const text = r.rest.slice(colon + 2).trim();
    if (!text || SYSTEM.test(text)) { skipped++; continue; }
    let [y, mo, d] = yearFirst ? [r.a, r.b, r.c] : dayFirst ? [r.c, r.b, r.a] : [r.c, r.a, r.b];
    if (y < 100) y += 2000;
    let h = r.h;
    if (r.ampm) { const pm = /p/i.test(r.ampm); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    const ms = Date.UTC(y, mo - 1, d, h, r.m, r.s) + tzOffsetMin * 60_000;
    if (isNaN(ms) || mo < 1 || mo > 12 || d < 1 || d > 31) { skipped++; continue; }
    const media = MEDIA.test(text);
    messages.push({at: new Date(ms).toISOString(), sender, text: media ? '[Attachment not included in the export]' : text, media});
  }
  const counts = new Map<string, number>();
  for (const m of messages) counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1);
  const senders = [...counts.entries()].map(([name, count]) => ({name, count})).sort((a, b) => b.count - a.count);
  return {messages, senders, dayFirst, skipped};
}

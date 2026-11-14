/* Exports and screenshots the code can't parse are READ by the model and nothing more: it transcribes who said
   what and when. Our code then decides direction, topic, tone and duplicates, exactly as for a WhatsApp export. */
import {geminiJSON, type AiImage} from '../ai.js';

export interface ReadMessage { sender: string; side?: 'left' | 'right'; date: string | null; time: string | null; text: string; subject?: string }

const MSG_SCHEMA = {
  type: 'object',
  properties: {
    platform: {type: 'string', description: 'ourfamilywizard, talkingparents, sms, imessage, whatsapp, email, other'},
    messages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sender: {type: 'string', description: 'Name exactly as printed. For a phone screenshot without names: "Them" for left/grey bubbles, "Me" for right/colored bubbles.'},
          side: {type: 'string', enum: ['left', 'right', 'none']},
          date: {type: 'string', nullable: true, description: 'YYYY-MM-DD, or null when no date can be worked out'},
          time: {type: 'string', nullable: true, description: '24-hour HH:MM, or null'},
          subject: {type: 'string', nullable: true},
          text: {type: 'string', description: 'The message body, verbatim. No summary, no corrections.'},
        },
        required: ['sender', 'side', 'date', 'time', 'text'],
      },
    },
  },
  required: ['platform', 'messages'],
};

const SYSTEM = `You transcribe co-parenting message records for a parent's private, dated journal. Accuracy is everything: this record may be shown to a family court.
Rules:
- Transcribe every message, in chronological order (oldest first), verbatim — keep spelling, capitals, punctuation. Never summarize, translate, soften or fix.
- Never invent a date, time, name or word. If a date or time is not visible and cannot be worked out from headers on the page, use null.
- Resolve relative dates ("Today", "Yesterday", "Tue") against the reference date you are given; only when the header makes it unambiguous.
- Skip app chrome: navigation, "Read 3:42 PM", "Delivered", reactions, typing indicators, page headers/footers, legal boilerplate.
- One item per message. A forwarded or quoted earlier message inside a message stays part of that message's text.`;

export async function readPdf(pdf: Buffer, refDate: string): Promise<{platform: string; messages: ReadMessage[]}> {
  const r = await geminiJSON<{platform: string; messages: (ReadMessage & {side: string})[]}>({
    system: SYSTEM,
    prompt: `This PDF is an export from a co-parenting app (OurFamilyWizard, TalkingParents or similar) or an email/SMS printout. Transcribe every message with its sender name exactly as printed, its sent date and time, and its subject if there is one. Reference date: ${refDate}.`,
    schema: MSG_SCHEMA,
    images: [{mimeType: 'application/pdf', dataBase64: pdf.toString('base64')}],
    temperature: 0,
    timeoutMs: 120_000,
  });
  return {platform: r.platform, messages: clean(r.messages)};
}

export async function readScreenshots(images: AiImage[], refDate: string): Promise<{platform: string; messages: ReadMessage[]}> {
  const r = await geminiJSON<{platform: string; messages: (ReadMessage & {side: string})[]}>({
    system: SYSTEM,
    prompt: `These are ${images.length} screenshot(s) of a conversation on a phone, in the order given. Transcribe every message bubble. Bubbles on the right (colored) were sent by the phone's owner: sender "Me", side "right". Bubbles on the left were sent by the other person: use their name if the screen shows it in the header, otherwise "Them", side "left". If screenshots overlap, transcribe repeated messages once. Reference date (the day the screenshots were taken): ${refDate}.`,
    schema: MSG_SCHEMA,
    images,
    temperature: 0,
    timeoutMs: 90_000,
  });
  return {platform: r.platform, messages: clean(r.messages)};
}

function clean(ms: (ReadMessage & {side: string})[]): ReadMessage[] {
  return (ms ?? [])
    .map((m) => ({
      sender: String(m.sender ?? '').trim() || 'Unknown',
      side: m.side === 'left' || m.side === 'right' ? m.side : undefined,
      date: typeof m.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : null,
      time: typeof m.time === 'string' && /^\d{1,2}:\d{2}$/.test(m.time) ? m.time.padStart(5, '0') : null,
      subject: m.subject ? String(m.subject).trim() : undefined,
      text: String(m.text ?? '').trim(),
    }))
    .filter((m) => m.text);
}

/* "Make it neutral": the note a parent writes at 11pm, rewritten the way a GAL would want to read it. */
export interface Neutral { text: string; title: string; category: string; removed: string[] }

export async function neutralize(text: string, kindHint?: string): Promise<Neutral> {
  return geminiJSON<Neutral>({
    system: `You help a co-parent keep a factual journal that a guardian ad litem, custody evaluator or family-court judge could read. Rewrite their note in neutral, factual, first-person language.
Rules:
- Keep every fact they gave: who, what, when, where, how long, amounts, what the children saw or said. Never add a fact, time, name, amount or motive that is not in the note.
- Remove opinions, insults, labels and diagnoses ("narcissist", "drunk again", "as usual"), mind-reading ("she did it on purpose"), exaggeration ("always", "never") and sarcasm. If a label stands for something observable that the note describes, keep the observation instead.
- Words someone actually said stay as a direct quote in quotation marks, verbatim, even if rude — a quote is evidence; a paraphrase is opinion.
- Refer to people as they do in the note (a name, "the other parent", "my son"). Use the children's names if given.
- Plain US English, past tense, short sentences, no headings, no legal conclusions, no advice. Usually 1–4 sentences.
- "title": one neutral line under 70 characters, e.g. "Pickup started 40 minutes late".
- "category": one of schedule, money, health, school, new_partner, accusation, logistics, other.
- "removed": the opinion words or phrases you took out, short, verbatim from the note (empty if none).`,
    prompt: `${kindHint ? `Entry type: ${kindHint}\n` : ''}Note:\n"""${text}"""`,
    schema: {
      type: 'object',
      properties: {text: {type: 'string'}, title: {type: 'string'}, category: {type: 'string'}, removed: {type: 'array', items: {type: 'string'}}},
      required: ['text', 'title', 'category', 'removed'],
    },
    temperature: 0.2,
  });
}

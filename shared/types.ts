/* Contracts shared by the server and the web app. Change a shape here, and both sides fail to typecheck until they agree. */

export type Category = 'schedule' | 'money' | 'health' | 'school' | 'new_partner' | 'accusation' | 'logistics' | 'other';
export type Channel = 'sms' | 'whatsapp' | 'email' | 'ofw' | 'talkingparents' | 'in_person' | 'phone' | 'other';

/** One risky (or exemplary) phrase, read the way a family-court judge would. */
export interface LensFlag {
  phrase: string;               // exact words from the text being checked
  severity: 'high' | 'medium' | 'good';
  issue: string;                // short label, e.g. "Reads as a threat"
  why: string;                  // one sentence, plain English
  fix?: string;                 // suggested replacement, when severity is not 'good'
}

export interface ReplyVariant { text: string; words: number }

/** What the reply coach returns for one incoming message (and, optionally, the user's own draft). */
export interface Analysis {
  id: string;
  createdAt: string;
  incoming: string;                       // their message, as given
  facts: string;                          // their message with insults and history stripped: only what concerns the child
  asks: string[];                         // concrete requests/questions that need an answer
  heat: number;                           // 0 calm … 100 hostile, of THEIR message
  category: Category;
  advice: 'reply' | 'brief_ack' | 'no_reply';
  adviceWhy: string;
  variants: { brief: ReplyVariant; neutral: ReplyVariant; firm: ReplyVariant };
  draft?: string;                         // the user's own draft, if they gave one
  draftScore?: number;                    // 0..100 court-safety of the draft (100 = exemplary)
  lens: LensFlag[];                       // flags on the draft if given, else on the recommended variant
  incident?: { worthLogging: boolean; title: string; note: string };  // e.g. a threat to involve the kids
  demo?: boolean;
}

export type EntryKind = 'message_in' | 'message_out' | 'incident' | 'note' | 'expense';

export interface Entry {
  id: string;
  kind: EntryKind;
  occurredAt: string;            // ISO, when it happened (not when logged)
  channel: Channel;
  title: string;                 // one line, neutral
  text: string;                  // full text / description, neutral language for incidents
  category: Category;
  tags: string[];
  amountCents?: number;          // expenses
  analysisId?: string;
  source: 'manual' | 'coach' | 'import_whatsapp' | 'import_pdf' | 'screenshot' | 'demo';
  createdAt: string;
}

export interface Pattern { label: string; detail: string; count: number; entryIds: string[] }

export type PlanState = 'none' | 'active' | 'expired';

export interface Me {
  id: string;
  demo: boolean;
  name?: string;
  email?: string;
  quiz?: QuizAnswers;
  plan: { state: PlanState; tier?: '1w' | '4w' | '12w' | 'year'; until?: string; startedAt?: string };
  day: number;                   // day of the 28-day plan (1-based), honours demo time-travel
  now: string;                   // server "now" for this person (demo time-travel shifts it)
  freeRepliesLeft: number;
}

export interface QuizAnswers {
  [key: string]: string | string[] | number | undefined;
}

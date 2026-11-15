/* Risky words inside the other parent's bubbles, found in the browser with no model call: a threat, an insult, or
   pressure to answer now. The Record underlines them in place instead of listing them as separate items, the
   counting belongs to Reports and the PDF. Deliberately narrow: a phrase is marked only when it reads the same way
   out of context, because a false pink underline ("traffic was crazy") costs more trust than a missed one. */

export type RiskKind = 'threat' | 'insult' | 'pressure';
export interface RiskHit { start: number; end: number; kind: RiskKind; label: string }

const KIDS = String.raw`(?:the kids|our kids|ur kids|your kids|the children|them|[a-z]+ and [a-z]+)`;
const RULES: {kind: RiskKind; label: string; re: RegExp}[] = [
  // threat — the kids pulled in, kept, or kept away; the law brought into a text
  {kind: 'threat', label: 'Threat to involve the kids', re: new RegExp(String.raw`\b(?:i'?ll|i will|im gonna|i'm gonna|gonna) tell ${KIDS}\b`, 'gi')},
  {kind: 'threat', label: 'Threat to involve the kids', re: /\bwhy (?:their|ur|your) (?:dad|mom|father|mother) left\b/gi},
  {kind: 'threat', label: 'Threat to involve the kids', re: /\b(?:ur|you'?re|your) the reason (?:they|the kids)\b/gi},
  {kind: 'threat', label: 'Threat to keep the kids', re: new RegExp(String.raw`\b(?:i'?ll|i will|im gonna|i'm gonna|gonna|im|i'm) keep(?:ing)? ${KIDS}\b`, 'gi')},
  {kind: 'threat', label: 'Threat to keep the kids', re: /\b(?:take|taking) (?:them|the kids) away\b/gi},
  {kind: 'threat', label: 'Threat to keep the kids away', re: /\b(?:won'?t|wont|will never|never gonna|not gonna|never) see (?:them|the kids|ur kids|your kids|the children)\b(?: again)?/gi},
  {kind: 'threat', label: 'Talks about custody', re: /\b(?:full|sole) custody\b/gi},
  {kind: 'threat', label: 'Brings in court or a lawyer', re: /\b(?:see (?:u|you) in court|take (?:u|you) to court|my (?:lawyer|attorney)|(?:a |ur |your )?(?:lawyer|attorney)|(?<!tennis |basketball |food )court)\b/gi},
  {kind: 'threat', label: 'Brings in court or a lawyer', re: /\b(?:notes for|tell|telling) the GAL\b/gi},
  {kind: 'threat', label: 'Threat to call the police', re: /\b(?:call(?:ing)? )?(?:the )?(?:cops|police|cps)\b/gi},
  // insult — name-calling and digs at their parenting
  {kind: 'insult', label: 'Insult', re: /\b(?:pathetic|unhinged|psycho|deadbeat|loser|useless|idiot|a joke)\b/gi},
  {kind: 'insult', label: 'Sarcastic dig', re: /\bclassy\b(?:\s*🙂)?|\bso perfect\b|\btypical\b/gi},
  {kind: 'insult', label: 'Dig at your parenting', re: /\b(?:great|amazing|nice|wonderful) parenting\b|\bwhat kind(?:a| of) (?:a )?(?:parent|mother|father|mom|dad)\b|\b(?:bad|terrible|worst|horrible) parent\b/gi},
  // pressure — demanding an answer, or a deadline with an "or"
  {kind: 'pressure', label: 'Pushing for an answer now', re: /\bhello\s*\?+|\banswer me\b|\bpick up (?:ur|your) phone\b|(?:^|\s)\?{2,}(?=\s|$)|\?{3,}/gi},
  {kind: 'pressure', label: 'Pushing for an answer now', re: /\bnow (?:pls|plz|please)\b|\basap\b|\bdeal w(?:\/|ith) it\b/gi},
  {kind: 'pressure', label: 'A deadline with an “or”', re: /\b(?:by|before) (?:tn|tonight|tmrw|tmr|tomorrow|today|\d{1,2}(?::\d\d)?\s*(?:am|pm)?)\b[^\n.!?]{0,30}?\bor\b(?: (?:else|ill|i'?ll|i will))?|\bor else\b|\bdont make this a thing\b/gi},
];
const RANK: Record<RiskKind, number> = {threat: 0, insult: 1, pressure: 2};

/** Every risky stretch in one bubble, in order and never overlapping (a threat wins over a dig on the same words). */
export function findRisks(text: string): RiskHit[] {
  const all: RiskHit[] = [];
  for (const r of RULES) {
    r.re.lastIndex = 0;
    for (const m of text.matchAll(r.re)) {
      let start = m.index ?? 0, end = start + m[0].length;
      while (start < end && /\s/.test(text[start])) start++; // the "??" rule eats the space before it
      if (end > start) all.push({start, end, kind: r.kind, label: r.label});
    }
  }
  all.sort((a, b) => RANK[a.kind] - RANK[b.kind] || (b.end - b.start) - (a.end - a.start));
  const kept: RiskHit[] = [];
  for (const h of all) if (!kept.some((k) => h.start < k.end && k.start < h.end)) kept.push(h);
  kept.sort((a, b) => a.start - b.start);
  // "ill tell them ur the reason they" is one threat, not two marks side by side
  const merged: RiskHit[] = [];
  for (const h of kept) {
    const p = merged.at(-1);
    if (p && p.label === h.label && !text.slice(p.end, h.start).trim()) p.end = h.end;
    else merged.push({...h});
  }
  return merged;
}

/** A bubble cut into plain runs and risky runs, for rendering. */
export function splitRisks(text: string): (string | RiskHit & {text: string})[] {
  const out: (string | RiskHit & {text: string})[] = [];
  let at = 0;
  for (const h of findRisks(text)) {
    if (h.start > at) out.push(text.slice(at, h.start));
    out.push({...h, text: text.slice(h.start, h.end)});
    at = h.end;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

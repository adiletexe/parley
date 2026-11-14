/* How a judge would read a draft, in words. The founder's rule: no number is ever shown for a reply, a drill or a
   day. The server still keeps a 0-100 court-safety score; it only picks the word here, and a phrase flagged as
   high risk keeps a draft out of "good" whatever the number says, so the verdict never contradicts the flags. */
import type {LensFlag} from '../../shared/types';

export type Verdict = 'good' | 'risky' | 'bad';

export function judge(score: number, flags: LensFlag[] = []): Verdict {
  const v: Verdict = score >= 80 ? 'good' : score >= 60 ? 'risky' : 'bad';
  return v === 'good' && flags.some((f) => f.severity === 'high') ? 'risky' : v;
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  good: 'A judge would read this well',
  risky: 'A judge might read this badly',
  bad: 'A judge would read this badly',
};

/** The colour class suffix each verdict wears: green, amber, pink. */
export const VERDICT_TONE: Record<Verdict, 'ok' | 'amber' | 'warn'> = {good: 'ok', risky: 'amber', bad: 'warn'};

export const RANK: Record<Verdict, number> = {bad: 0, risky: 1, good: 2};

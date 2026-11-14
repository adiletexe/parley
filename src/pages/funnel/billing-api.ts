/* Client side of server/routes/billing.ts: the shapes the pages read, and the formatting they share. */
export type Tier = '1w' | '4w' | '12w';
export interface PlanOffer {
  tier: Tier; name: string; priceCents: number; days: number;
  renewCents: number; renewDays: number; renewLabel: string; perDayCents: number; popular?: boolean;
}
export interface PlansRes { plans: PlanOffer[]; testMode: boolean; testCard: string; refundDays: number; remindDays: number }

export interface BillingStatus {
  state: 'none' | 'active' | 'expired';
  tier?: Tier; name?: string; startedAt?: string; until?: string; daysLeft: number;
  granted: boolean; canceled: boolean; canceledAt?: string;
  renews: boolean; renewsAt?: string; renewCents?: number; renewLabel?: string; reminderDue: boolean;
  refundableUntil?: string; email?: string; demo: boolean; now: string;
  history: {id: string; at: string; tier: string; status: 'paid' | 'renewal' | 'declined' | string; amountCents: number; last4?: string}[];
}

/** What GET /api/quiz returns (built by FUNNEL); every field may be missing. */
export interface QuizProfile {
  conflictLevel?: 'low' | 'medium' | 'high';
  topTrigger?: string; courtStage?: string; goal?: string; minutesPerWeek?: number;
  topTriggerLabel?: string; courtStageLabel?: string; goalLabel?: string; focus?: string; tensePerWeek?: number;
}

export const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const longDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}) : '';
export const shortDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : '';
export const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();

/** "first week" / "first 4 weeks": the introductory period a plan's price pays for. */
export const firstPeriod = (p: PlanOffer) => (p.days === 7 ? 'first week' : `first ${p.name}`);
/** The words that sit under every CTA, the same size as the introductory price above it (Finelo-style). */
export const renewalLine = (p: PlanOffer) => `then ${usd(p.renewCents)} every ${p.renewLabel} until you cancel`;
/** The small print under that, which is still not small: no free trial, how to cancel, the reminder. */
export const termsLine = (p: PlanOffer) =>
  `No free trial: you pay ${usd(p.priceCents)} today for your ${firstPeriod(p)}, and the plan renews on its own. Cancel in one click in Settings. We remind you 3 days before each renewal.`;

/* Quiz values come from another module; known ones get a human label, anything else is de-snaked. */
const LABELS: Record<string, string> = {
  schedule: 'Schedule changes', schedule_changes: 'Schedule changes', money: 'Money', new_partner: 'A new partner',
  school: 'School', health: 'Health', school_health: 'School & health', kids_messengers: 'Kids as messengers', messengers: 'Kids as messengers',
  none: 'No court case', mediation: 'Mediation', active: 'Active case', active_case: 'Active case', hearing: 'Hearing soon',
  hearing_soon: 'Hearing soon', modification: 'Modification',
  fewer_fights: 'Fewer fights', record: 'A clean record for court', clean_record: 'A clean record for court', court_record: 'A clean record for court',
  peace: 'Peace of mind', peace_of_mind: 'Peace of mind', protect_kids: 'Keep the kids out of it', kids: 'Keep the kids out of it',
};
export function label(v?: string): string {
  if (!v) return '';
  if (LABELS[v]) return LABELS[v];
  const s = v.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "4 weeks" → "4-week plan"; a tier id works too. */
export const planTitle = (nameOrTier?: string) => {
  const n = /^(\d+)\s*w(?:eeks?)?$/.exec((nameOrTier ?? '').trim());
  return n ? `${n[1]}-week plan` : 'Calm plan';
};

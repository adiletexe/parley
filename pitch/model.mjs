// Parley unit economics: Meta ads → web quiz → paywall → subscription.
// Every input is a named assumption; pitch/research/*.md holds the source for each.
// Run: node pitch/model.mjs            (prints the three scenarios as a table)
//      node pitch/model.mjs --json     (for the deck)

export const PRICE = {
  // what a first purchase is worth, by plan, and the share of buyers who pick it
  plans: [
    {id: '1w', first: 6.99, mix: 0.25},   // then $29.99 / 4 wks
    {id: '4w', first: 19.99, mix: 0.6},   // most popular, preselected
    {id: '12w', first: 49.99, mix: 0.15}, // then $69.99 / 12 wks
  ],
  renew4w: 29.99,
  renew12w: 69.99,
};

// Scenario inputs. Filled from research/benchmarks.md; edit there first, then here.
export const SCENARIOS = {
  // Sources: research/benchmarks.md. CPM/CTR: LocaliQ-WordStream 2026, SuperAds/Triple Whale 2025-26.
  // Funnel: Adapty Mar 2025 quiz-funnel benchmarks, FunnelFox State of Web2App 2026.
  // Renewals: RevenueCat State of Subscription Apps 2025 (61.7% first renewal; we take less for web intro→full price).
  pessimistic: {cpm: 25, ctr: 0.008, quizStart: 0.40, quizDone: 0.45, paywallView: 0.70, paywallBuy: 0.04, firstRenew: 0.25, monthlyKeep: 0.80, refunds: 0.08},
  conservative:{cpm: 18, ctr: 0.012, quizStart: 0.55, quizDone: 0.60, paywallView: 0.80, paywallBuy: 0.08, firstRenew: 0.40, monthlyKeep: 0.88, refunds: 0.05},
  // Market average = the published medians themselves, paid ads only:
  // CPM $15.06 (Triple Whale Aug 2025–Jul 2026), link CTR 1.77% (LocaliQ/WordStream 2026, Legal),
  // renewals from RevenueCat 2025 (61.7% → 53.4% → 17% at 12 months ⇒ ~0.89 kept per period), first renewal cut to 50% for web intro→full price.
  market:      {cpm: 15.06, ctr: 0.0177, quizStart: 0.55, quizDone: 0.60, paywallView: 0.80, paywallBuy: 0.08, firstRenew: 0.50, monthlyKeep: 0.89, refunds: 0.05},
  optimistic:  {cpm: 12, ctr: 0.018, quizStart: 0.75, quizDone: 0.80, paywallView: 0.90, paywallBuy: 0.10, firstRenew: 0.55, monthlyKeep: 0.92, refunds: 0.03},
};

export const COSTS = {
  stripePct: 0.029, stripeFixed: 0.30,  // per charge, Stripe US standard
  aiPerReply: 0.06,                     // Claude Opus 5.5 at $4/$20 per M tokens: ~7k in + ~1.5k out per reply
  repliesPerMonth: 30,                  // an active parent, assumed
};

const HORIZON_MONTHS = 24; // LTV is capped at two years; nothing after counts

export function run(s) {
  const cpc = s.cpm / 1000 / s.ctr;
  const buyPerClick = s.quizStart * s.quizDone * s.paywallView * s.paywallBuy;
  const paidCac = cpc / buyPerClick;
  const cac = paidCac * (1 - (s.organicShare || 0)); // blended: unpaid buyers cost nothing to acquire

  // Revenue per buyer: first payment (plan mix), then 4-week renewals.
  // The first renewal is the big drop (firstRenew); after that each period keeps monthlyKeep.
  let first = 0;
  for (const p of PRICE.plans) first += p.first * p.mix;
  let renewals = 0, alive = s.firstRenew, periods = 0;
  for (let m = 1; m < HORIZON_MONTHS; m++) {
    renewals += alive; periods++;
    alive *= s.monthlyKeep;
    if (alive < 0.005) break;
  }
  const avgRenewPrice = PRICE.renew4w; // 12-week plan renews at about the same per-4-weeks ($69.99/3 = $23.33); kept simple and conservative-up
  const gross = first + renewals * avgRenewPrice;
  const charges = 1 + renewals;
  const fees = gross * COSTS.stripePct + charges * COSTS.stripeFixed;
  const refunds = first * s.refunds;
  const paidMonths = 1 + renewals;
  const ai = paidMonths * COSTS.repliesPerMonth * COSTS.aiPerReply;
  const ltv = gross - fees - refunds - ai;

  // Payback: months of net revenue until CAC is covered
  let cum = first - first * s.refunds - first * COSTS.stripePct - COSTS.stripeFixed - COSTS.repliesPerMonth * COSTS.aiPerReply, payback = cum >= cac ? 0 : null, a = s.firstRenew;
  for (let m = 1; payback === null && m <= HORIZON_MONTHS; m++) {
    cum += a * (avgRenewPrice * (1 - COSTS.stripePct) - COSTS.stripeFixed - COSTS.repliesPerMonth * COSTS.aiPerReply);
    if (cum >= cac) payback = m;
    a *= s.monthlyKeep;
  }

  // $100M ARR: paying subscribers needed at the 4-week price (13 renewals a year)
  const arrPerSub = avgRenewPrice * 13;
  const subsFor100M = 100e6 / arrPerSub;

  return {cpc, clicksPerBuyer: 1 / buyPerClick, paidCac, cac, first, renewals, paidMonths, gross, fees, refunds, ai, ltv, ratio: ltv / cac, payback, subsFor100M};
}

const r2 = (n) => Math.round(n * 100) / 100;
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = Object.fromEntries(Object.entries(SCENARIOS).map(([k, s]) => [k, run(s)]));
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else {
    const rows = ['cpc', 'clicksPerBuyer', 'paidCac', 'cac', 'first', 'paidMonths', 'gross', 'ai', 'ltv', 'ratio', 'payback', 'subsFor100M'];
    console.log('metric'.padEnd(16) + Object.keys(out).map((k) => k.padStart(14)).join(''));
    for (const r of rows) console.log(r.padEnd(16) + Object.values(out).map((o) => String(o[r] === null ? '>24' : r2(o[r])).padStart(14)).join(''));
  }
}

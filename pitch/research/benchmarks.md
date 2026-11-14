# Parley — public benchmarks for the unit economics

Collected 2026-11-14. Every row has a source. **[est]** = a third-party estimate or a figure I could only
read second-hand (through a search summary, not the primary page); check it before it goes on a slide.
**not found** = searched and not found in a citable form; nothing was invented to fill it.

Caveat that applies to the whole file: RevenueCat and Adapty are mostly **in-app** (App Store / Google Play)
data. Parley is web-only. FunnelFox is the one source built on web-to-app funnels. Where they disagree, both are shown.

---

## 1. Meta ads, US

| metric | value | source | note |
|---|---|---|---|
| CTR, traffic campaigns, all industries | **1.93%** (prior year 1.71%) | Facebook Ads Benchmarks 2026, LocaliQ / WordStream, updated 23 Sep 2026 — https://localiq.com/blog/facebook-advertising-benchmarks/ | US advertisers. Period not stated on the page |
| CPC, traffic campaigns, all industries | **$0.60** (prior year $0.70) | same | |
| CTR / CPC, leads campaigns | **2.70% / $1.80** (prior 2.59% / $1.92) | same | lead CVR 8.54%, CPL $27.39 |
| Education & Instruction | traffic CTR **1.50%**, CPC **$0.70**; leads CTR 1.74%, CPC $1.72, CVR 15.87%, CPL $26.31 | same | closest category to a 28-day practice |
| Personal Services | traffic CTR 1.93%, CPC $0.67; leads CTR 2.24%, CPL $38.09 | same | |
| Attorneys & Legal Services | traffic CTR 1.77%, CPC $0.69 | same | closest category to "court-safe" |
| Health & Fitness | traffic CTR 1.86%, CPC $0.64; leads CTR 3.09%, CPL $27.11 | same | |
| Implied CPM, traffic, all industries | **≈ $11.60** | derived: CPC × CTR × 1000 = 0.60 × 1.93% × 1000 | derived, not published. Education ≈ $10.50 |
| CPM, US Facebook, 2025 | **$22.20** annual average; $20.41 in Jan, peak $28.09 in Nov 2025 | attributed to SuperAds by a secondary benchmark page (search result, Influee/Visiblefactors-type pages) | **[est]** read second-hand; Q4 peak matters for launch timing |
| CPM, overall, Aug 2025–Jul 2026 | **$15.06** | Facebook Ad Benchmarks by Industry, Triple Whale, 2026 — https://triplewhale.com/blog/facebook-ads-benchmarks | **[est]** page refused direct fetch; figure from search summary. Triple Whale = mostly e-commerce accounts (~35k) |
| CTR, CPC, CPM ranges | CTR ~0.9% (0.5–1.6% typical), CPC $1.72, CPM $5–18 | Facebook ads metrics, Superads, Jun 2025 — https://www.superads.ai/blog/facebook-ads-metrics | global, not US |
| US-weighted, Q1–Q2 2026 | CPM ~$13.05, CTR ~1.05%, CPC ~$1.40 | AdRiseLab via Creatify blog — https://creatify.ai/blog/what-is-a-good-cpc-cpm-and-ctr-for-meta-ads | **[est]** secondary |

Reading: LocaliQ's CTR is traffic-objective and includes cheap clicks; a purchase-optimised Meta campaign
(what a quiz funnel runs) sees higher CPM and lower link CTR. That is why the base case below uses CPM $18 and link CTR 1.2%, not $11.60 and 1.93%.

---

## 2. Web-to-app / quiz-funnel conversion

| metric | value | source | note |
|---|---|---|---|
| Ad click → landing page | 3–8% benchmark, 12%+ top | What is web-to-app and how does it work, Adapty, Mar 2025 (mod. Jan 2026) — https://adapty.io/blog/what-is-web-to-app-and-how-does-it-work/ | Adapty's own row label; reads like ad CTR |
| Landing → quiz start | **40–60%**, top 75%+ | same | |
| Quiz completion | **50–70%**, top 85%+ | same | |
| Quiz → paywall view | 70–85%, top 95%+ | same | |
| Paywall → purchase | **2–5%**, top 8–12% | same | conflicts with FunnelFox's implied 23% below — definitions differ |
| Web purchase → app install | 90–95%, top 98%+ | same | not needed for Parley (no app) |
| Share of funnel users who reach the paywall | **13%** | State of Web2App 2026, FunnelFox, Jan 2026 (2025 data) — https://funnelfox.com/state-of-web2app-2026 | most drop-off is in the quiz, not at checkout |
| Funnel session → purchase | **3.0%** web vs 1.5% in-app | same | 3% / 13% ⇒ ~23% of paywall viewers buy (derived) |
| Best case, solo PM funnel | up to **5%** CR to purchase at $9.99/wk | FunnelFox blog — https://blog.funnelfox.com/web-funnels-for-content-web-app/ | case study, vendor's own |
| Plan mix, web2app revenue | 1 month **48.8%**, 1 week 30.5%, 1 year 12.2%, 3 months 8.4% | State of Web2App 2026, FunnelFox | share of REVENUE, not of purchases |
| Trial structure, web2app revenue | no trial 56.8%, paid trial 28.9%, free trial 14.3% | same | Parley's discounted first period = "paid trial" |
| Payment failures | 30–50% of initiated payments fail; retries recover up to 17.5% of failed subs, +15–20% revenue | same | dunning matters on web |
| Payment-method mix | Apple Pay 60%, cards 20%, PayPal 18%, Google Pay 2% | same | |
| Web share of subscription-app revenue | 3.2% global, **4.9% North America** | State of Subscription Apps 2026, RevenueCat — https://www.revenuecat.com/state-of-subscription-apps-2026-business | 115k+ apps, $16B+ |
| Web2App market | $60B+ in 2025; US **63.7%** | State of Web2App 2026, FunnelFox | FunnelFox estimate **[est]** |
| Adoption | 82% of top-grossing apps used web2app in 2025 (≈46% in 2024) | same | |
| Paywall → paid, 30 days, US median (in-app) | **2.75%** (top-10% Europe 5.71%) | State of Paywalls 2026, Adapty — https://adapty.io/state-of-paywalls-2026/ | in-app; onboarding paywall 0.85% of views vs 0.23% later |
| Typical price points | $6.99/wk, $9.99/mo, $39.99/yr | same | Parley's $6.99 week matches the market median |
| Revenue by plan (in-app) | weekly 62%, annual 21%, monthly 12% | same | |
| Annual pre-selected | 69% pick annual vs 28% when monthly is default | Adapty 2025 data via RocketShip HQ | **[est]** secondary — default plan steers mix |
| Ad click → quiz start, Meta specifically | **not found** | — | no public source separates it from landing → quiz start |
| Intro-offer → full-price renewal (web) | **not found** as a published number | — | the first-renewal figures in §3 are all-plan, in-app |

---

## 3. Retention, refunds, trial → paid

| metric | value | source | note |
|---|---|---|---|
| First renewal, all plans | **61.7%** (prior year 64.9%); second renewal 53.4% | State of Subscription Apps 2025, RevenueCat — https://www.revenuecat.com/state-of-subscription-apps-2025/ | in-app; not intro-price specific |
| 12-month retention, monthly plans | **17.0%** (prior 18.8%) | same | yearly 44.1%, weekly 3.4% |
| 12-month retention, monthly, by price | low 22.5%, mid 16.4%, **high 12.2%** | same | Parley's $29.99 / 4 wks is "high" |
| 12-month retention, monthly, hard paywall | median 12.8% vs freemium 9.3% | same | Parley = hard paywall |
| Monthly plan retention curve (web) | 100% → **~10%** by month 12 | State of Web2App 2026, FunnelFox | weekly 100% → ~3% |
| Yearly plans renew | 83.4% | RevenueCat SOSA 2026 via secondary article | **[est]** — another summary says 24–47% stay at first annual renewal; contradictory, don't use |
| Refund rate by category | **Education 4.86%**, Health & Fitness 4.71%, Business/Gaming 2.67–2.88%, Travel 1.51% | RevenueCat SOSA 2025 | in-app |
| Refund rate by paywall | **hard paywall 5.8%** vs freemium 3.4% | same | |
| Refund timing (web) | 92% in first month; median ~1.6 days; ~half in week 1; annual plans refund 18× more than weekly | State of Web2App 2026, FunnelFox | |
| Trial → paid, by category | Health & Fitness 39.9% median (top-10% 68.3%), Travel 48.7%, Media 43.8% | RevenueCat SOSA 2025 | 2026 edition: H&F 37.7%, North America 34.2% |
| Trial → paid, US median | **26.2%** (H&F 33.3%) | State of Paywalls 2026, Adapty | |
| Download → paid D35, hard vs freemium | 12.11% vs 2.18% | RevenueCat SOSA 2025 | |
| Realized LTV / payer, monthly plans | H&F **$24.23**, Business $18.76, North America $17.02 median | RevenueCat SOSA 2026 | in-app, gross |
| Realized LTV / payer, 1 year | high-priced apps $55.21 median, low-priced $8.08 | RevenueCat SOSA 2025 | |
| LTV, web | blended median ~**$67** at month 12; H&F web $80–90 vs app $40–45; ARPPU $27–31 | State of Web2App 2026, FunnelFox | |
| Education/Productivity/Lifestyle monthly retention | **not found** in the public previews | — | only in the full PDFs (RevenueCat 330 pp) |

---

## 4. LTV:CAC and payback

| metric | value | source | note |
|---|---|---|---|
| LTV:CAC target | **3:1** | David Skok, SaaS Metrics 2.0 (forEntrepreneurs) — origin of the rule; repeated by app-growth vendors (e.g. Admiral Media, https://admiral.media/cac-payback-period-mobile-apps/) | SaaS rule; should use gross-margin LTV |
| CAC payback | **< 12 months** common target | same vendors | |
| Web2app practice | payback on first purchase / within 30–90 days | **not found** as a published benchmark | practitioner logic only — a 4-week product with ~10% month-12 retention cannot wait 12 months |

---

## 5. Market sizing and competitors

| metric | value | source | note |
|---|---|---|---|
| Divorces & annulments, 2024 | **662,950** (2.3 / 1,000) | Provisional number of divorces and annulments 2000–2024, CDC/NCHS NVSS — https://www.cdc.gov/nchs/data/dvs/marriage-divorce/national-marriage-divorce-rates-00-24.pdf | **excludes CA, HI, IN, MN, NM** — undercount. 2023: 672,502; 2022: 673,989 |
| Divorces, 2024, all states (ACS) | 986,810 | Marriage-Divorce Ratio 2024, NCFMR Bowling Green — https://www.bgsu.edu/ncfmr/resources/data/family-profiles/fp-25-32 | survey-based; read second-hand |
| Custodial parents | **12.9 million** parents with **21.9 million** children (April 2018) | Custodial Mothers and Fathers and Their Child Support: 2017, Census P60-269 (2020) — https://www.census.gov/content/dam/Census/library/publications/2020/demo/p60-269.pdf | 20.1% fathers. The 2022 edition (P60-285, 2025) exists but its headline count was **not readable** here |
| Children under 21 living with one parent, other parent elsewhere | **about 1 in 4** (2022) | Custodial Parents and Their Child Support: 2022, Census P60-285, 2025 — https://www.census.gov/library/publications/2025/demo/p60-285.html | |
| Children in single-parent households | 25% (2023), from 9% in 1960 | Census CPS via NIUSSP — https://www.niussp.org/family-and-households/americas-single-parent-households-and-missing-fathers/ | includes never-married |
| Children living with one parent and no other adult | 23% (world's highest; global avg ~7%) | Pew Research Center, 2019 | |
| High-conflict share | ~**10%** "substantial" legal conflict, ~15% "intense" | Johnston, "High-Conflict Divorce", The Future of Children, 1994 (as quoted by Justice Canada review) | **[est]** read through a secondary summary |
| High-conflict share, range | **5–15%** depending on definition; ~¼ highly conflicted 3.5 years after separation (one measure) | High-conflict Separation and Divorce: Options for Consideration, Justice Canada, 2004 — https://justice.gc.ca/eng/rp-pr/fl-lf/divorce/2004_1/p4.html | report itself says no clear criteria exist |
| Contested custody cases per year (US) | **not found** | — | no national court statistic; "90% settle" figures circulate only on aggregators without a study |
| Divorce cost, went to trial on ≥1 issue | **$20,400** avg; $23,300 for ≥2 issues; ~18 months | Martindale-Nolo divorce survey, 2019, via Nolo — https://www.nolo.com/legal-encyclopedia/ctp/cost-of-divorce.html | page refused direct fetch; **[est]** figures from search summary |
| Lawyer hourly rate, all US | **$349** (Jan 2025); $362 later in 2026 | Clio Legal Trends — https://www.clio.com/blog/lawyer-statistics ; state pages https://www.clio.com/resources/legal-trends/compare-lawyer-rates/ | |
| Family lawyer hourly, California | **$409** | Clio compare lawyer rates (CA) — https://clio.com/resources/legal-trends/compare-lawyer-rates/ca | national family-law figure ($312, 2024) only second-hand **[est]** |
| OurFamilyWizard price, per parent | basic **$110/yr**, Essentials $149.99/yr, Premium $216/yr, Max $299.88/yr | OFW Plans & Pricing — https://www.ourfamilywizard.com/pricing | each parent pays; often court-ordered |
| OurFamilyWizard scale | "trusted by millions for over 20 years" | same | no user count published |
| OurFamilyWizard revenue | $8.3M run-rate 2023 (Latka); $6.2M (ZoomInfo); $10–15M (Similarweb); $11.6M (Bitscale) | getlatka.com/companies/ourfamilywizard; zoominfo.com; similarweb.com | **[est]** all third-party; LeadIQ's $50–100M is an outlier. Backed by Spectrum Equity |
| TalkingParents | Essentials $7/mo or $77/yr, Enhanced $16/mo or $176/yr, Ultimate $32/mo or $352/yr | TalkingParents Pricing and Plans — https://support.talkingparents.com/hc/en-us/articles/32745147514263-Pricing-and-Plans | paid subscription required since 30 Mar 2026 |
| AppClose | $7.99/mo monthly, $83.88/yr ($6.99/mo), $5.99/mo on 2-yr | AppClose pricing — https://appclose.com/pricing | |
| BestInterest | Connect ~$9.99/mo; "up to $15/mo" | review sites / AlternativeTo | **[est]**; official page not checked |
| Sensor Tower / Growjo revenue for these apps | **not found** | — | |

Derived sizing (logic, not a source): 12.9M custodial parents ≈ 12.9M two-home families ≈ ~25M parents.
At 5–15% high-conflict ⇒ **0.65–1.9M families / 1.3–3.9M parents**; ~10% ⇒ ~1.3M families. New entrants per year:
~660k–990k divorces (share with minor children **not found** here) + non-marital separations (not counted by CDC).
Price anchor: OFW $110–300/yr **per parent**, a lawyer $349/hour — Parley's $29.99/4 wks ≈ $390/yr is above OFW's top tier, below 1.2 hours of a lawyer.

---

## 6. Payment fees

| metric | value | source | note |
|---|---|---|---|
| US card, domestic | **2.9% + $0.30** | Stripe Pricing — https://stripe.com/pricing | |
| International card | +1.5% | same | |
| Currency conversion | +1% | same | |
| Stripe Billing (subscriptions) | **0.7%** of billing volume (pay-as-you-go) | same | |
| Dispute | $15 per dispute (+$15 to respond, refunded if won) | same | |
| Web vs store fees | processors 2–5% vs stores 15–30% | Adapty, 2025 (above) | |

Effective fee per charge (2.9% + $0.30 + 0.7%): $6.99 → **7.9%**; $19.99 → **5.1%**; $29.99 → **4.6%**; $49.99 → **4.2%**; $69.99 → **4.0%**.

---

## Recommended assumptions

| assumption | pessimistic | base | optimistic | why |
|---|---|---|---|---|
| CPM (Meta, US) | $25 | **$18** | $12 | $22.20 2025 US avg (SuperAds, est), $15.06 (Triple Whale), $11.60 implied traffic (LocaliQ); Q4 is the peak |
| Link CTR | 0.8% | **1.2%** | 1.8% | LocaliQ traffic 1.50–1.93%; purchase campaigns lower; Superads 0.9% |
| ⇒ CPC | $3.13 | **$1.50** | $0.67 | derived |
| Click → quiz start | 40% | **55%** | 75% | Adapty 40–60%, top 75%+ |
| Quiz completion | 45% | **60%** | 80% | Adapty 50–70%, top 85%+; FunnelFox: most loss is here |
| Quiz end → paywall view | 70% | **80%** | 90% | Adapty 70–85% |
| Paywall → purchase | 4% | **8%** | 10% | Adapty 2–5% (top 8–12%) vs FunnelFox implied ~23%; base sits between |
| ⇒ click → purchase | 0.50% | **2.1%** | 5.4% | FunnelFox: 3% median session→purchase, best ~5% |
| ⇒ CAC | ~$625 | **~$71** | ~$12 | CPC ÷ click→purchase; pessimistic case kills the model — the test budget should find out which world we are in |
| Plan mix (1 wk / 4 wk / 12 wk), by purchases | 40 / 50 / 10 | **25 / 60 / 15** | 15 / 60 / 25 | FunnelFox revenue mix 1-mo 48.8%, 1-wk 30.5%, 3-mo 8.4%; default selection steers it (Adapty) |
| First renewal (intro → $29.99 / $69.99) | 25% | **40%** | 55% | RevenueCat 61.7% all plans, but a price step-up and a high price lower it; no public intro→full figure |
| Per-period retention after first renewal (4-wk periods) | 80% | **88%** | 92% | lands month-12 near 10% (FunnelFox monthly) to 17% (RevenueCat monthly; 12.2% high-priced) |
| Refunds | 8% | **5%** | 3% | RevenueCat Education 4.86%, hard paywall 5.8%; 92% of web refunds in month 1 |
| Payment fees | 8% | **5.5%** | 4.5% | Stripe 2.9% + $0.30 + 0.7% Billing; +1.5% intl, disputes $15 |
| Failed renewals not recovered | 15% | **8%** | 4% | FunnelFox: 30–50% of payments fail first try, retries recover much of it |

# Market tools: Similarweb, Sensor Tower, AppMagic, TikTok Creative Center, Meta Ad Library, Google Trends

Checked 15 Nov 2026 (Astana morning), from Kazakhstan, in the team's signed-in Chrome. Every number below is what the tool itself showed; all traffic, download and revenue figures are **the tool's estimates**, not reported financials. Screenshots in `img/`.

---

## 1. Similarweb — BLOCKED

`similarweb.com/website/<domain>/` would not load from this network: Chrome shows an error page, and a plain request times out after 15 s. So **no Similarweb figures for any of the six domains** (ourfamilywizard.com, talkingparents.com, bestinterest.app, custodylogs.com, disputebuddy.co, appclose.com). Retry over a VPN if needed.

What a web search surfaced instead (second-hand, not verified on the page):

| Figure | Source | Note |
|---|---|---|
| ourfamilywizard.com "1.2M" on Similarweb's company page; revenue estimate $10–15M (Nov 2025) | https://www.similarweb.com/company/ourfamilywizard.com (search snippet, 15 Nov 2026) | Snippet does not say whether 1.2M is monthly visits. The $10–15M is already in `benchmarks.md`. |
| ourfamilywizard.com ~781K visits in April 2025, −17% vs March | Semrush, https://es.semrush.com/website/ourfamilywizard.com/overview (search snippet) | Semrush, not Similarweb; 18 months old. |

**Do not put a traffic-source split (paid social / search / direct) in the deck — we don't have one.**

---

## 2. Sensor Tower (free overview pages) — works, ranges only

Free page shows **iOS App Store only, worldwide, last month (Oct 2026)**, as ranges. RPD, DAU, time spent are behind sign-in. Revenue = App Store in-app purchases only; anything billed on the web (Stripe/Paddle) is invisible to it.

| App | App Store ID | Downloads (WW, last month) | Revenue (WW, last month) | Category rank, US today | Top countries | Advertising | Screenshot |
|---|---|---|---|---|---|---|---|
| OurFamilyWizard | 497405393 | 5K–50K | **$100K–$500K** | #202 Productivity (downloads) | US, UK, Canada | Active | img/st-ofw.jpg |
| TalkingParents | 1092220726 | < 5K | **$100K–$500K** | N/A | US, UK, Australia | Active | img/st-talkingparents.jpg |
| AppClose | 1019290876 | 5K–50K | $100K–$500K | N/A | US, UK, Australia | Active | img/st-appclose.jpg |
| BestInterest for Coparents | 6503981502 | < 5K | **< $5K** | N/A | Estonia, Zimbabwe, Denmark (sic) | **Inactive** | img/st-bestinterest.jpg |
| Finelo: Master Trading (Zimran) | 6670422243 | 5K–50K | **$100K–$500K** | **#34 Education (downloads)** | US, UK, Australia | Active | img/st-finelo.jpg |
| Coursiv – AI Certificates (Zimran) | 6758934906 | 5K–50K | $5K–$50K | N/A | US, India, Mexico | Inactive | img/st-coursiv.jpg |

URL pattern: `https://app.sensortower.com/overview/<id>?country=US`, checked 15 Nov 2026.

**Read it right:** Finelo and Coursiv sell mostly through the web quiz → web paywall (Zimran's whole model), so App Store revenue is the small tail. Even that tail is $100K–$500K/month for Finelo. Same for BestInterest: "< $5K" on iOS says nothing about its web subscriptions. No last-12-months or US-only figures on the free page.

### App Store ratings counts (public iTunes Search API, 15 Nov 2026)
A rough proxy for installed base. `https://itunes.apple.com/search?country=us&entity=software&term=<name>`

| App | Ratings (US store) | Avg |
|---|---|---|
| OurFamilyWizard | 57,321 | 4.59 |
| AppClose | 39,652 | 4.74 |
| TalkingParents | 28,754 | 4.38 |
| BestInterest | 240 | 4.52 |
| Finelo | 103,953 | 4.59 |
| Coursiv | 3,209 | 4.77 |

---

## 3. AppMagic — revenue/downloads LOCKED

`https://appmagic.rocks/iphone/ourfamilywizard-co-parent-app/497405393` (15 Nov 2026): Revenue, Downloads and RpD all say "Log in to unlock" (img/appmagic-ofw-locked.jpg). We did not sign in. What *is* visible is OFW's in-app price list:

| OFW in-app product | Price |
|---|---|
| Essentials | $149.99 |
| Premium | $219.00 |
| Max | $299.99 |
| **ToneMeter™** (their AI tone checker add-on) | **$9.99** |
| MyFiles 3 GB upgrade | $22.99 |

So the market leader already charges separately for an AI "is my message hostile?" tool — a paid-for version of our Judge's lens, but only inside OFW, where both parents must be signed up.

---

## 4. TikTok Creative Center — mostly LOCKED

| Page | Result | URL (15 Nov 2026) |
|---|---|---|
| Trend hashtags, US | Only top 3 shown logged out (#veteransday 68.8M views, etc.); no search; a hashtag's own page (`/hashtag/coparenting/…`) redirects back to the list | https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en?countryCode=US |
| Top Ads, US, keyword "coparenting" | Keyword is ignored logged out; shows 4 generic ads with "Top x% CTR" badges only; "Log in to access all Top Ads" | https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?region=US&keyword=coparenting |
| Keyword Insights | Redirects to the TikTok One sign-in suite, blank | https://ads.tiktok.com/business/creativecenter/keyword-insights/pc/en?region=US |

No industry CTR/CPA benchmarks visible without an account. Nothing for co-parenting/divorce/custody. Keep using the ~5B #coparenting views figure already in `organic-and-ads.md`.

---

## 5. Meta Ad Library — new: how long the top ads have run

Same searches as `ad-library.md` (US, active, exact phrase), now **sorted by impressions** and read for "Started running on". 15 Nov 2026.

| Advertiser | Active | Top-impression ads started | Oldest active ad | Note | URL |
|---|---|---|---|---|---|
| OurFamilyWizard | ~75 | Oct 2 – Oct 29, 2026 (the #1 ad: Oct 2, **14 ads use this creative**) | May 20, 2026 | Rotates creatives every few weeks; 26 of 32 loaded started in Oct | https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=%22OurFamilyWizard%22&search_type=keyword_exact_phrase&sort_data[mode]=total_impressions&sort_data[direction]=desc |
| TalkingParents | ~43 | Oct 20–21, 2026 | Aug 28, 2026 | All 43 started within the last ~11 weeks | same, q="TalkingParents" |
| **CustodyLogs** | ~53 | **Jul 17, Jun 16, Jul 31, 2026** (top 3 by impressions) | **Feb 12, 2026** | Its biggest ads have run **4–5 months non-stop** | same, q="CustodyLogs" |

Screenshots: img/adlib-ofw-dates.jpg, img/adlib-custodylogs-dates.jpg.

Meaning: nobody keeps paying for a Meta ad for five months if it loses money. CustodyLogs — a small one-time-purchase "get court-ready" product with long-story ads — has kept its top creatives live since June–July. That is evidence the **"court-ready evidence" angle converts on Meta in the US**.

---

## 6. Google Trends — US, past 5 years (14 Nov 2021 – 8 Nov 2026), weekly

Values are Google's 0–100 index (100 = the peak week of that query/comparison). Pulled from the Trends page's own data on 15 Nov 2026. Screenshots: img/gtrends-apps-5y.jpg, img/gtrends-coparenting-5y.jpg, img/gtrends-divorce-custody-5y.jpg, img/gtrends-states.jpg.

### Direction (each term on its own scale)

| Term | Avg first 52 wks (Nov 21–Nov 22) | Avg last 52 wks (Nov 25–Nov 26) | Change | Peak week |
|---|---|---|---|---|
| custody | 33.9 | 53.9 | **+59%** | Sep 7, 2025 |
| co-parenting | 14.7 | 55.7 | **+279%** | Jun 14, 2026 |
| how to respond to ex | 28.0 | 64.1 | **+129%** | Mar 22, 2026 |
| divorce | 41.4 | 54.4 | +31% | Jun 14, 2026 |
| ourfamilywizard | 68.3 | 59.7 | −13% | Mar 8, 2026 |
| co-parenting app | 0 | 11.8 | from zero (too small to index before 2025) | Jun 7, 2026 |
| co-parenting with a narcissist | — | — | too small for Google to index | — |

Yearly averages (co-parenting): 2022 14.4 · 2023 14.6 · 2024 15.1 · 2025 28.8 · 2026 56.9. Custody: 34.0 · 34.3 · 33.5 · 44.3 · 54.8. The co-parenting line peaks in June 2026 and then drops back sharply around Aug 2026 (see chart), so part of the 2026 level is a bump, not a steady trend.

Caveat: several unrelated family terms rose together in 2025–26; part of that may be Google's own sampling changes. Say "searches for co-parenting roughly tripled since 2022 (Google Trends index)", not "the market tripled".

### Brands, compared on one scale (US, 5 yrs)
Averages: **ourfamilywizard 62.5, talkingparents 20.2, co-parenting app 2.7.** People search the brand OFW ~3× more than TalkingParents and ~20× more than the generic "co-parenting app". TalkingParents is growing (13.8 → 23.8); OFW is flat-to-down. URL: https://trends.google.com/trends/explore?date=today%205-y&geo=US&q=co-parenting%20app,ourfamilywizard,talkingparents

### Seasonality (monthly average of the weekly index)

| Term | Low months | High months |
|---|---|---|
| divorce | Dec 42.6, Nov 43.4 | **Jul 52.7, Aug 50.4, Jun 50.3**; Jan only 45.2 |
| custody | Dec 34.3, Nov 35.8 | Aug 42.5, Jul 41.9, Jun 41.8 |
| co-parenting | Oct 19.6 | **Jun 33.6, May 32.5** |
| ourfamilywizard | Dec 54.5 | Jun 68.5, Apr 67.1 |

**No January search spike** (the "divorce month" is a filings effect, not a search one). Searches peak **May–August** — summer parenting schedules, school-break handovers. Plan heavier ad spend for May–Aug; Nov–Dec are the slowest months.

### Top states (5 yrs)
- custody: Minnesota 100, Wyoming 71, New Mexico 67, Ohio 56, Oklahoma 54
- ourfamilywizard: Wisconsin 100, Minnesota 95, New Mexico 80, Louisiana 61, Indiana 57
- In the 4-term comparison (custody vs divorce share): Minnesota, New Mexico, Ohio, Oregon, Pennsylvania lead for custody.

URL for the custody/divorce chart: https://trends.google.com/trends/explore?date=today%205-y&geo=US&q=custody,co-parenting,how%20to%20respond%20to%20ex,divorce

---

## What this means for the deck

1. **"Finelo earns $100K–$500K a month from the App Store alone (Sensor Tower, Oct 2026) — and that is the small part; its money comes from the web quiz funnel we copy."** Same range as OurFamilyWizard's App Store revenue. (img/st-finelo.jpg)
2. **"The incumbents' apps make $100K–$500K/month each on iOS; BestInterest, the closest product to ours, makes under $5K and isn't advertising."** OFW, TalkingParents and AppClose all in the same band; BestInterest inactive. (Sensor Tower, Oct 2026)
3. **"OurFamilyWizard already sells an AI tone checker (ToneMeter, $9.99) — but only works if both parents are on OFW."** Proves people pay for exactly our feature. (AppMagic price list)
4. **"CustodyLogs has run its top 'get court-ready' ads on Meta for 4–5 months straight"** — the evidence angle is profitable in paid social. (Meta Ad Library, 15 Nov 2026)
5. **"US searches for 'co-parenting' roughly tripled since 2022; 'custody' +59%; 'how to respond to ex' doubled — and they peak in May–August, not January."** (Google Trends, index, US, 5 yrs)

Not usable: Similarweb visits and traffic-source split (blocked from KZ), AppMagic and TikTok numbers (login walls).

### Niche line (organisers' format)
**Subscription web app for US parents in a custody dispute who have to keep answering the other parent's texts without hurting their case.**

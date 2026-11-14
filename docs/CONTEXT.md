# Parley: everything you need to know (team handoff)

Written 15 Nov 2026. **Deadline: 12:00, 15 Nov 2026** (resubmitting before then is allowed; they review the latest version).

---

## 1. The hackathon

**Business Cup 2.0 "From zero to product"**, a 24-hour hackathon run by Zimran with AIESEC and Nazarbayev University. The brief is a Canva deck plus a FAQ PDF (`Business Cup 2.0 _ FAQ по кейсу.pdf`, ~100 Q&As).

**The task:** build a web product that solves a basic pain for **US adults aged 25–45**, one they will pay for. Pick one track: Money, Entertainment or **Skills** (we picked Skills: "what adults try to master and keep failing at").

**Pass / fail:**
- B2C only.
- **Web only.** A native mobile app fails automatically.
- Submit all 3 items: a **deck** (PDF, English, max 10 slides including the title), a **live production link** the jury can use end to end with **no sign-up**, and a **public GitHub repo**.

**Scoring:**

| Weight | Criterion | What it covers |
|---|---|---|
| **40%** | Does it work? | Works in production, real core value (not faked or hardcoded), UX and code quality. They read the repo. |
| **20%** | What do we sell? | Value and retention: why the user pays, why they come back. |
| **15%** | Who do we sell to? | The problem and the user. |
| **15%** | Why does it make money? | Big niche, $100M ARR long term, LTV > CAC. |
| **10%** | Is it new? | Originality. |

**What the FAQ adds:**
- The deck needs real numbers: price, **CAC assumptions by channel, retention, LTV**, with sources. They point to RevenueCat and Adapty reports. Full TAM/SAM/SOM is not required.
- Renewals matter more than daily use. "Opened once a week but renewed for six months" beats "daily habit, churns in a month".
- It must not be a ChatGPT wrapper. The value is what sits around the model: a structured path, accumulated data, progress, personalisation.
- At least one return mechanic must actually work in the product.
- The strongest proof of value is "the user fails, trains, then succeeds".
- A working paywall with a clear price is the minimum. A test checkout the jury can complete is a plus.
- A guest or demo mode is fine, but it must be labelled as demo and run the real logic.
- Videos don't play in the PDF, so show screenshots in the deck.
- The live pitch is **5 minutes plus 2 minutes of questions**, in Kazakh, Russian or English.

---

## 2. The idea: Parley

**One line:** an AI helper for US parents raising kids in two homes. It turns the other parent's hostile texts into calm, court-safe replies, shows how a judge would read *your* draft, keeps a dated record for the lawyer, and trains the skill in a 28-day daily practice.

**Why this pain matters:**
- In US custody cases the texts between parents become evidence.
- Judges look at which parent keeps the peace for the kids ("friendly parent" factors in many states).
- One angry text can cost parenting time, joint decision-making, or legal fees.
- The other parent often provokes on purpose.

**Who it's for:**
- **Most desperate:** parents in an active custody case or modification, with a high-conflict ex.
- **When they buy:** the lawyer says "document everything", a hearing date is set, or a custody evaluator or guardian ad litem is appointed.

**Why not the existing tools:**
- OurFamilyWizard ($110–300/yr per parent) and TalkingParents ($77–352/yr) only work if **both** parents sign up, and a hostile ex can just refuse.
- ChatGPT's replies come out long and formal (they read passive-aggressive), and it keeps no record.
- BestInterest ($10–30/mo) is the closest product, but it runs no Meta ads.

**Ad and copy rule:** never claim a personal trait ("Are you divorced?"). It breaks Meta policy. Always write "the other parent", "co-parenting", "two homes".

---

## 3. Where things are

| | |
|---|---|
| **Live site** | https://parley.adiletfndr.com (also https://77-42-12-77.sslip.io) |
| **Jury path** | https://parley.adiletfndr.com/demo, then "Open the sample case" |
| **Repo** | github.com/adiletexe/parley. **Still PRIVATE; make it public before submitting.** |
| **Deck** | `pitch/Parley-deck.pdf` (source `pitch/deck.html`, render with `pitch/render.cjs`) |
| **Pitch script** | `pitch/script.md` (~5 min, with answers to likely questions) |
| **Numbers model** | `pitch/model.mjs` (`node pitch/model.mjs`) |
| **Research** | `pitch/research/benchmarks.md`, `organic-and-ads.md`, `ad-library.md` |
| **Product spec** | `docs/SPEC.md` (original build spec for all modules) |
| **Voice rules** | `docs/VOICE.md` (how every text in the app must sound; read before writing any copy) |
| **Server** | Hetzner CPX12, Helsinki, 77.42.12.77, Caddy (HTTPS), systemd unit `parley`, app in `/opt/parley`. SSH access: ask Adilet. |
| **DNS** | Namecheap, A record `parley` → 77.42.12.77 on adiletfndr.com |

**Test payment:** card `4242 4242 4242 4242`, any future date, any CVC. No real money moves.

---

## 4. The product (what's built and working)

There are three tabs.

### Reply (`/app/reply`)
- **Input:** drop a screenshot of the chat (two sample screenshots are built in) or type/paste their texts. Several texts in a row count as one "burst".
- **What comes back:**
  - Their texts with the bait crossed out.
  - "They need an answer about…".
  - Three tones: Brief, Neutral, Firm.
  - An editable reply bubble and a Copy button. Copying saves both messages to the record.
- **Judge's lens:** add your own draft to see every risky phrase underlined, why a judge would read it badly, what to say instead, and a score from your draft to ours (e.g. 21 → 98).
- **No free tier:** without an active plan every paid call returns 402 and the app shows a locked card that leads to /pricing. The demo case is the exception.

### Record (`/app/record`)
- The chat with the other parent, by date. Risky words are highlighted; tap one to see why.
- "Upload screenshots" (a sheet also has WhatsApp/OFW import and "write down something that happened").
- AI Reports, a week/month calendar, and **PDF for the lawyer**: numbered exhibits E-1…, a SHA-256 fingerprint on every page, and a read-only share link.
- Each message's ⋯ menu: Copy text, Fix text (for screenshot misreads, marked "edited"), Delete.

### Practice (`/app/plan`), the Skills track
- A Duolingo-style path:
  - 4 week sections: Brief & facts → Don't take the bait → Boundaries & firm requests → Court-ready habits.
  - Day nodes: done, today, catch-up, locked; milestones.
  - Streak and a calendar reminder (.ics).
- **Each session:** 5 realistic texts from the other parent arrive at reading pace. Pick the reply you'd send out of 3. All 3 are written in the same casual voice, so the right one can't be guessed from tone. Feedback explains why. A bonus "write your own" is graded by the AI.
- `server/drill-bank.ts` has 20 hand-written scenarios (4 days × 5); days 5–28 cycle them. More can be added.

### Also
- **Funnel (hard paywall, Finelo/Coursiv model):** landing → 1-minute quiz → plan reveal → paywall → test checkout → welcome → app. No product before paying: every landing CTA leads into the quiz. A message pasted on the landing is kept in the browser and answered right after checkout (no AI call before payment).
- **Plans:** no free trial, a paid introductory period, then auto-renew. 1 wk $6.99, **4 wks $19.99 (most popular)**, 12 wks $49.99; renews at $29.99 / 4 wks (or $69.99 / 12 wks). The paywall shows the intro price big above the CTA and "then $29.99 every 4 weeks until you cancel" under it at the same size. 14-day refund, one-click cancel, reminder 3 days before renewal.
- **Settings:** cancel, export data, delete everything.
- **Demo:** fully unlocked without paying (the jury rule). Creates a labelled sample case (Alex and Jordan, kids Emma 8 and Noah 5, six weeks of messages), day 12 of the plan, a demo clock (+7 days), and America/New_York time.

### AI
- `server/ai.ts` calls **Claude Opus 5.5** (`claude-opus-5-5`, $4/$20 per M tokens) with structured JSON output. Gemini is the fallback.
- About **$0.06 per reply**. The daily cap is `AI_DAILY_CAP` (400).
- **Our code checks the model's output:**
  - A flagged phrase must really occur in the text.
  - `heatFloor()` raises the heat on threats.
  - No invented times or amounts ([placeholders] instead).
  - Voice rules: no u/ur/lol, no apologies or admissions, no legalese.
- `scripts/eval-reply.ts` runs 32 hostile cases and checks the rules.

### Stack and running it
- **Stack:** Vite + React 18 + TypeScript; Hono on Node 22; SQLite (`node:sqlite`); pdf-lib; cookie guest sessions.
- **Run it:**
  ```bash
  npm install
  cp .env.example .env    # put ANTHROPIC_API_KEY in it; never commit .env
  npm run dev             # web :5173, API :8787
  ```
- **Deploy:** `deploy/deploy.sh` builds locally, rsyncs to the box and restarts.

**Design ("Dusk"):**
- Plus Jakarta Sans, white cards on #f4f5fa.
- One lilac→blue gradient, for actions only. Pink = a judge would read this badly; green = safe.
- Pastel 3D icon tiles. The night slab #0d0e1a is for the landing hero.
- Must work at 375 px.

**Copy voice:** see `docs/VOICE.md`.
- The other parent's texts look like real phones: bursts, lowercase, ik/lmk/wtv/istg, caps.
- Our replies mirror their register. Only neutral shorthand (ok, thx, tmrw); no u/ur.
- Explanations sound like a smart friend, never a lawyer or a bot.

---

## 5. Research and the numbers in the deck

**Meta Ad Library (US, active ads, 14 Nov 2026):**

| Competitor | Active ads | What they run |
|---|---|---|
| OurFamilyWizard | ~75 | Polished influencer videos |
| TalkingParents | ~43 | Corporate carousels, stock photos |
| CustodyLogs | ~53 | Long stories, one-time purchase |
| Dispute Buddy | ~51 | Founder story |
| AppClose | ~3 | — |
| BestInterest | 0 | — |

**Nobody runs a quiz funnel or lo-fi native statics.** Zimran's Finelo does exactly that: Notes-app, handwritten and Paint-style statics from persona pages, dozens of tests a day, then a 13-question quiz. That playbook in an empty niche is our marketing story.

**Supporting data:**
- **Ad formats:** text-only ads have an 11.6% hit rate vs 7.0% for high-production (Motion Creative Benchmarks 2026, 550K ads).
- **Audience:** #coparenting has ~5B TikTok views.
- **Sharing:** Instagram Reels ads and TikTok Spark Ads can be shared like normal posts.
- **Weak social presence:** OFW has 21.5K Instagram followers against 1M+ users.
- **Against us:**
  - No public test of Notes-style ads specifically.
  - Narrow tags (#grayrock) are small.
  - "Divorced" targeting is likely gone from Meta, so we plan broad targeting and let the creative find people.

**Unit economics, paid ads only, all from published medians** (`pitch/model.mjs`, sources in `benchmarks.md`):
- **Funnel:**
  - CPM $15.06 (Triple Whale) and link CTR 1.77% (LocaliQ 2026, Legal).
  - Quiz start 55%, finish 60%, see the price 80% (Adapty).
  - 8% of those who see the price pay.
  - That's 1 buyer per 47 clicks, so **CAC ≈ $40**.
- **LTV:**
  - $21 first payment (plan mix) plus $29.99 renewals.
  - First renewal 50% (RevenueCat says 61.7%; we cut it for a web intro price), then 89% kept each period.
  - About 5 paid months.
  - Minus Stripe 2.9%+30¢, 5% refunds and AI cost, that's **LTV ≈ $132**.
- **Result:** **3.3×, payback ~2 months**.

**Downside cases:**

| Case | CAC | LTV | LTV/CAC |
|---|---|---|---|
| Below average on every step | $71 | $103 | 1.45× |
| Bad case | $620 | — | — |

The bad case is why we test with $3K first and stop if CAC > $100.

**$100M ARR:**
- 257K paying parents × $29.99 × 13 = $100M. That's about 2% of 12.9M US custodial parents (Census).
- Holding that base needs ~49K new customers a month, about $2M a month in ads against ~$8.3M monthly revenue.

**Other market facts:**
- ~663K divorces in 2024 (CDC; undercount).
- About 10–15% of separations are high-conflict.
- A US lawyer averages $349/hr (Clio 2025).

---

## 6. The deck (10 slides, `pitch/Parley-deck.pdf`)

Dark "keynote" look in Parley's palette, with drawn iPhone 15 Pro frames around real screenshots.

1. Cover
2. The problem (an angry text circled as "Exhibit 12" next to Parley's calm version, plus market stats)
3. Competitors table
4. Reply + judge's lens
5. Record + PDF
6. Practice (Skills)
7. Marketing (competitor ads vs Zimran's lo-fi ads vs ours, plus proof numbers)
8. Unit economics funnel
9. Path to $100M + prices
10. Try it now (link and the 5 steps for the jury)

Plain English everywhere. The founder's feedback was "no mysterious words", so keep it that way.

---

## 7. Decisions already made (don't relitigate)

- **Track:** Skills. **Product:** web only. The iOS keyboard prototype lives in a separate private repo (`adiletexe/parley-keyboard`) and is **not** part of the submission, because a native app is an automatic fail.
- **AI:** Claude instead of Gemini (Gemini credits ran out).
- **Unit economics:** paid ads only. Organic is a bonus, never part of the math.
- **Design:** dark keynote style in the site's own palette (chosen over editorial and case-file variants).
- **Copy:** real texting language everywhere. Wrong drill options must sound as human as the right one.

## 8. Still to do before 12:00

- [ ] **Make the GitHub repo public**, then check it opens logged out.
- [ ] Rehearse the 5-minute script (`pitch/script.md`). Translate it if pitching in Russian or Kazakh.
- [ ] Final look through the deck PDF.
- [ ] Submit the deck PDF, the live link and the repo link via the captain's submission form.
- [ ] Optional: walk the jury path on the live site once more (`/demo` → reply → record PDF → practice → test checkout).

Parley is not a law firm and doesn't give legal advice.

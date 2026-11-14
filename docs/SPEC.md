# Parley — build spec (read fully before writing code)

## What it is
Web app for **US parents (25–45) raising kids in two homes** who have to keep messaging the other parent.
Core job: **paste (or screenshot) the other parent's message → get a calm, brief, court-safe reply in seconds, see how a family-court judge would read your own draft, and keep every exchange on a private, dated record** that becomes a court-ready PDF timeline. A **28-day calm-communication plan** trains the skill (track: **Skills** — "what adults try to master and keep failing at").

Hackathon: Zimran "Business Cup 2.0". Judged on: Product works end-to-end in production 40% · Value & retention 20% · Problem & user 15% · Business potential 15% · Originality 10%. Pass/fail: B2C, web only (no native app), deck + live link + public repo.
Rules from the organisers' FAQ that shape the build:
- The jury opens the link and goes through the core flow **without signing up**. Guest session is automatic. A one-click **demo** with sample data is allowed and must be **labelled as demo**; sample inputs must go through the **real** logic (no canned outputs).
- "Not a ChatGPT wrapper": value = structured path, accumulated data, progress, personalisation over time. LLM is the engine; the product is what's around it.
- At least one **return mechanic must work in the product** (plan day counter, streak, reminders, accumulating record).
- Strongest evidence of value: **user fails → trains → then succeeds on a new similar task**.
- Working paywall with clear price is the minimum; **test-mode checkout the jury can complete** is a plus; show the test card on screen.
- Hide buttons that don't work. One flow that works beats ten that don't.
- Mobile-adaptive is a plus. UI in **English (US)**. Disclaimer: **"Parley is not a law firm and doesn't give legal advice."**
- Don't collect unnecessary personal data. Secrets only on the server.

## Users & pains (voice of customer, use this language)
Most desperate segment: parents in active custody litigation or modification with a high-conflict ex. Purchase triggers: lawyer says "document everything", a hearing date, a GAL/custody evaluator appointed, the ex refuses OurFamilyWizard.
Pains: the ex baits and drags up old fights; every text may be screenshotted and read in court; dreading the next message ("walking on eggshells"); long hostile messages, unsure whether to reply at all; lawyers bill per email read; records scattered across SMS/WhatsApp/email/OFW; OFW costs $110–300/yr **per parent** and both must join.
Why not plain ChatGPT (lawyers & parents say): replies come out bloated/formal and read as passive-aggressive; chats with public bots aren't privileged; it doesn't know the history; no log, no timeline.
Vocabulary: high-conflict, BIFF (Brief, Informative, Friendly, Firm — Bill Eddy), gray rock, parallel parenting, paper trail, document everything, court-ready, custody journal, pattern, stick to the facts, don't take the bait, "the other parent", GAL, custody evaluator.
Consequences of bad messages in US family court (general info, not advice): judges weigh which parent supports the child's relationship with the other parent ("friendly parent" factors in many states); hostile texts can cost parenting time or joint decision-making, credibility, attorney's fees; threats can lead to protective orders.
**Ad/copy rule:** never assert the viewer's personal attributes ("Are you divorced?"). Say "the other parent", "co-parenting", "two homes".

Market facts (cite in UI only where noted): 12.9M custodial parents (US Census); ~672K divorces/yr (CDC 2023); ~100K contested custody cases/yr; average divorce attorney fees ~$11,300 (Martindale-Nolo); OFW $110–300/yr per parent; TalkingParents $77–352/yr; BestInterest $9.99–29.99/mo.

## Design system — larpmotion style A, "Dusk" skin (MUST follow)
- Tokens: `src/styles/tokens.css`. Atoms: `src/styles/base.css` (`.card .card-h .btn .btn-primary .btn-ghost .btn-quiet .btn-lg .field .chip .chip-warn .chip-ok .chip-amber .gt .spin .fade-in`). Font Plus Jakarta Sans. Paper `--bg`, white 24px-radius cards with `--shadow`, one gradient `--grad` (lilac→blue) for primary actions only. `--warn` (pink) = risky phrase; `--ok` (green) = safe phrase.
- Icons: `<Icon id="chat" size={32}/>` from `src/components/Icon.tsx` (pastel 3D tiles). Use them for option cards, section headers, list items. **No emoji as icons.**
- Headlines: 800 weight, tight tracking, one gradient word via `<span className="gt">`. Calm, warm, plain English. Short sentences.
- Layout feel: like the larpmotion onboarding — generous white cards, soft shadows, 14–24px radii, big tappable option cards with an icon tile on the left, title + one-line subtitle.
- Dark slabs (`--night`) only for the landing hero and final CTA.
- Every screen must work at 375px wide (no horizontal scroll) and look intentional at 1440px.
- Put component CSS in a `.css` file next to your page (plain CSS, class names prefixed with your module, e.g. `.rc-` for reply coach). Don't edit shared CSS; if you need a new shared atom, note it in your report.
- Loading states with `.spin`, errors in plain words with a retry. No dead buttons.

Reference screenshots of the target look: `/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/coparent-design/2-dusk-app.jpg`, `2-dusk-landing.jpg`, `A-onboarding-icons-1.png`, `A-onboarding-icons-2.png` (read them with the Read tool). The mock HTML: `/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/coparent-design/variants.html`.

## Architecture
- Web: Vite + React 18 + react-router 6, TypeScript. Routes are fixed in `src/main.tsx` (don't change them):
  `/` Landing · `/quiz` and `/quiz/:step` · `/your-plan` plan reveal · `/pricing` paywall · `/welcome` post-purchase · `/demo` one-click demo · `/app/reply` · `/app/journal` · `/app/timeline` · `/app/plan` · `/app/settings`.
- `src/lib/api.ts` → `api<T>(path, {body|form})`, `track(name, data)`. `src/lib/me.tsx` → `useMe()` gives `{me, refresh}` (`Me` in `shared/types.ts`).
- Server: Hono on Node 22 (`server/index.ts`), cookie guest session (`c.get('person')` is the PersonRow). SQLite via `node:sqlite` (`server/db.ts`: `db`, `newId`, `nowIso`, `getPerson`, `personNow`, `track`). **Always use `personNow(person)` for "now"** — demo time-travel shifts it.
- AI: `server/ai.ts` → `geminiJSON<T>({system, prompt, schema, images?, temperature?})` (Gemini 3.5 Flash, JSON schema output; images/PDF as base64 inline data). Key is in `.env` (already present locally). The model writes; **our code validates, counts, scores and stores** (e.g. word counts, pattern detection, streaks are computed in code).
- Shared contracts: `shared/types.ts` (Analysis, LensFlag, Entry, Me…). If you must extend a type, add optional fields only and say so in your report.
- New tables: create them in YOUR route module with `db.exec('CREATE TABLE IF NOT EXISTS …')` at import time. Don't edit `server/db.ts`.
- No new npm dependencies. If something is truly needed, stop and report instead of installing.
- Free tier: 3 coach replies (`people.free_replies_used`, `FREE_REPLIES` in `server/me.ts`); after that the coach shows the paywall. Active plan = unlimited. Demo person = unlimited.

## File ownership (only touch your files)
| Module | Files |
|---|---|
| FUNNEL | `src/pages/funnel/Landing.tsx`, `Quiz.tsx`, `PlanReveal.tsx`, their css, `server/routes/quiz.ts` |
| BILLING | `src/pages/funnel/Pricing.tsx`, `Welcome.tsx`, `src/pages/app/Settings.tsx`, css, `server/routes/billing.ts` |
| REPLY | `src/pages/app/Reply.tsx` (+ subcomponents in `src/pages/app/reply/`), css, `server/routes/reply.ts`, `server/prompts/reply.ts`, `scripts/eval-reply.ts` |
| JOURNAL | `src/pages/app/Journal.tsx` (+ `src/pages/app/journal/`), css, `server/routes/journal.ts`, `server/journal-store.ts` (exported helpers others may import: `addEntry`, `listEntries`, `findPatterns`), `server/import/*` |
| TIMELINE | `src/pages/app/Timeline.tsx`, css, `server/routes/timeline.ts`, `server/pdf.ts` |
| PLAN+DEMO | `src/pages/app/Plan.tsx` (+ `src/pages/app/plan/`), `src/pages/funnel/Demo.tsx`, css, `server/routes/plan.ts`, `server/routes/demo.ts`, `server/plan-content.ts`, `server/demo-seed.ts` |

Cross-module calls: import exported helpers (e.g. REPLY calls JOURNAL's `addEntry` from `server/journal-store.ts`). JOURNAL writes `journal-store.ts` first thing, with this exact API, so others can code against it:
```ts
export function addEntry(personId: string, e: Omit<Entry, 'id' | 'createdAt'>): Entry
export function listEntries(personId: string, opts?: {from?: string; to?: string; kinds?: EntryKind[]; category?: Category}): Entry[]
export function findPatterns(entries: Entry[]): Pattern[]
```
REPLY exports from `server/prompts/reply.ts`: `analyzeMessage(input: {incoming: string; draft?: string; context?: string; images?: AiImage[]}): Promise<Omit<Analysis,'id'|'createdAt'>>` and `gradeDraft(input: {scenario: string; draft: string}): Promise<{score: number; lens: LensFlag[]; better: string}>` — PLAN uses `gradeDraft` for drills, DEMO uses `analyzeMessage` to seed.

## Module briefs

### FUNNEL (landing → quiz → plan reveal)
- Landing `/`: dark hero (like `2-dusk-landing.jpg`): "Read it the way **a judge will**. Before you hit send." Paste box: typing/pasting a message and pressing "Write my reply" goes to `/app/reply?text=…` (works instantly as guest — first wow in 10 seconds). Secondary CTA "Take the 1-minute check" → `/quiz`. Then sections: how it works (3 steps with icon tiles), a live before/after example, "why not just ChatGPT" (3 points), privacy ("the other parent never sees Parley"), pricing teaser, FAQ (incl. legal disclaimer), final dark CTA. A visible "Jury / demo: open a sample case →" link to `/demo` (top bar).
- Quiz `/quiz/:step`: Finelo-style: progress bar + step counter, one question per screen, big option cards with icon tiles, auto-advance on single choice, multi-select with "Continue", back arrow. After every 2–3 questions an **insight screen** (fact + small chart/visual, plain language, sourced facts only — use the facts above; otherwise phrase as a principle, not a statistic). 10–12 questions, all about the user's real situation, used later to personalise: kids' ages/count; how you communicate (text/WhatsApp/email/OFW/TalkingParents); how often messages turn tense; what sets it off (schedule changes, money, new partner, school/health, the kids being used as messengers); how you usually react (reply fast, write long explanations, go silent, ask friends); court status (none / mediation / active case / hearing soon / modification); is there a lawyer/GAL; what you want most (fewer fights, a clean record for court, peace of mind, protect the kids from conflict); how much time messages eat per week; first name (optional). Store answers via `POST /api/quiz` (save into `people.quiz_json`, name into `people.name`).
- "Building your plan…" loader (real progress steps, ~6s, with 2–3 short testimonials clearly fictional-free: use principles, not fake reviews — e.g. what Parley checks) → `/your-plan`: personalised summary from answers (conflict level computed in code, top trigger, court status → what matters most), a simple chart "tense messages per week" week 1→4 (illustrative, labelled "your goal"), what's in the 28-day plan, CTA "Unlock my plan" → `/pricing`, secondary "Try the reply coach free" → `/app/reply`.
- Server `server/routes/quiz.ts`: `POST /api/quiz {answers}`, `GET /api/quiz` → saved answers + derived profile `{conflictLevel: 'low'|'medium'|'high', topTrigger, courtStage, goal, minutesPerWeek}` (computed in code).

### BILLING (paywall, checkout, post-purchase, settings)
- Paywall `/pricing` (long scroll, FunnelFox layout, honest): headline "Your calm co-parenting plan is ready{, name}", summary chips from quiz profile, before/after chart, 3 plan cards — **1 week $6.99 → renews $29.99/4 wks; 4 weeks $19.99 (MOST POPULAR, preselected) → renews $29.99/4 wks; 12 weeks $49.99 → renews $69.99/12 wks** — with per-day price; directly under the CTA, same size: "$19.99 today, then $29.99 every 4 weeks until you cancel. Cancel in one click in Settings. We remind you 3 days before each renewal." 4 benefits (icon tiles), "14-day money-back guarantee, no conditions", privacy line, FAQ (Is this legal advice? Can the other parent see it? Will a court accept the PDF? How do I cancel?), repeated plan picker + CTA at the bottom. A 15-minute "plan held" timer is allowed only if it's real (stored server-side per person, never resets) — optional. No fake reviews, no fake press logos, no fake "promo applied".
- Checkout: **built-in test checkout only** (no Polar/Stripe — Stripe isn't available to us; the FAQ accepts a working paywall + simulated test checkout). Make it look and behave like a real checkout page (`/pricing` → checkout step on the same page or a sheet): order summary, a clean card form on our page that shows "Test mode — use card 4242 4242 4242 4242, any future date, any CVC", validates (Luhn, expiry), and activates the plan server-side (`plan_tier`, `plan_started`, `plan_until` from `personNow`). Both paths end at `/welcome`. Record in `checkouts` table.
- `/welcome`: confirmation with exact renewal date/price, "Day 1 of 28" start, optional email field "Send me the plan & renewal reminders" (stores `people.email`; no email is sent in this build — say "We'll remind you here in the app" if no mail provider), button → `/app/plan`.
- `/app/settings`: plan status, next renewal date & price, **Cancel in one click** (sets plan to end at period end; confirm inside the page), privacy: "Download my data (JSON)", "Delete everything" (deletes the person and cascades; confirm inside the page). Legal disclaimer.
- Endpoints: `GET /api/billing/plans`, `POST /api/billing/test-pay {tier, card…}`, `GET /api/billing/status`, `POST /api/billing/cancel`, `GET /api/me/export`, `POST /api/me/delete`.

### REPLY (the core — quality matters most)
- `/app/reply`: two inputs: "What they sent" (textarea; also **upload a screenshot** — image → Gemini reads it) and optional "Your draft (optional)". Prefill from `?text=`. Button "Write my reply". Sample chips "Try an example" (5 realistic messages: late pickup, soccer fees, new partner, weekend swap with threat to tell the kids, fever accusation) that run through the real model.
- Result view (like `2-dusk-app.jpg`): their message with a **"Just the facts"** version (insults stripped) + the asks; advice badge (reply / brief acknowledgement / no reply needed + why); tabs **Brief / Neutral / Firm** with the reply, word count; **Copy reply** (copying logs both messages to the journal automatically and says so); "Save to journal"; if a draft was given: **Judge's lens** — highlight risky phrases inline in the draft (pink underline with tooltip), list flags with why + fix, and a **court-safety score 0–100** for the draft vs. the suggested reply. If `incident.worthLogging`, offer "Log this as an incident" (one tap → JOURNAL `addEntry` kind incident).
- After 3 free replies (non-active, non-demo) → inline paywall card linking to `/pricing` (keep the result they already got visible).
- `server/prompts/reply.ts`: carefully engineered system prompt (BIFF, gray rock for pure provocation, child-focused, no admissions beyond facts, no sarcasm, no legal advice, mirror US English, keep facts the user gave, never invent facts/dates/amounts — use [placeholders] when needed, respond to the asks only, firm = clear boundary + deadline, brief ≤ 25 words). Strict JSON schema. Post-process in code: word counts, ensure each flag phrase actually occurs in the text (drop ones that don't), clamp scores, compute `draftScore` from flags if needed.
- `scripts/eval-reply.ts`: 25 realistic hostile/manipulative messages (varied categories), run them, print outputs, and check rules in code (brief ≤ 30 words, no "you always/never", no insults copied, asks addressed). Iterate on the prompt until it reads like a calm, smart family-law-savvy friend. Paste 3 best examples into your report.
- `server/routes/reply.ts`: `POST /api/reply/analyze` (JSON `{incoming, draft?}` or multipart with `image`) → `Analysis` (saved in `analyses`); `POST /api/reply/:id/use {variant}` → logs `message_in` + `message_out` entries; `GET /api/reply/recent`.

### JOURNAL (private dated record + imports + patterns)
- `/app/journal`: header stats (messages, incidents, expenses, date range), **Quick log** row of icon buttons (Late pickup / No-show / Said something in front of the kids / Missed payment / Schedule change / Note) → small form with when (default now), what happened (neutral-language helper: a "Make it neutral" button that rewrites the note in factual language via Gemini), channel; **Import** panel: WhatsApp chat export `.txt` (parse in code: dates, sender, text; ask which sender is the other parent), OFW / TalkingParents PDF export (send the PDF to Gemini as inline data to extract messages with timestamps), screenshots (Gemini reads them). Entry list grouped by month with filters (kind, category, search). **Patterns** card computed in code (e.g. "Late pickups: 7 of the last 10 handoffs", "Most tense topic: money", "Tense messages per week" trend). Entries are editable/deletable.
- `server/journal-store.ts` (write FIRST, exact API above), `server/routes/journal.ts`: `GET /api/journal`, `POST /api/journal`, `PATCH/DELETE /api/journal/:id`, `POST /api/journal/neutral {text}`, `POST /api/journal/import/whatsapp` (multipart), `POST /api/journal/import/pdf`, `POST /api/journal/import/screenshot`, `GET /api/journal/patterns`.

### TIMELINE (court-ready output)
- `/app/timeline`: date-range + category filters, preview of the chronological timeline (date, time, channel, neutral title, exhibit numbers E-1, E-2…), summary at top (counts, patterns from JOURNAL `findPatterns`), "Download PDF". Optional: "Share with my lawyer" read-only link (`/api/timeline/share/:token` serving the PDF) — only if it fully works.
- `server/pdf.ts` with pdf-lib: cover page (case summary, date range, generated-on, "Prepared with Parley — not legal advice"), summary of patterns, chronological log table with exhibit numbers, full message texts in an appendix, page numbers, and an **integrity fingerprint** (SHA-256 of the entries JSON) printed on every page footer. Clean typography (Helvetica is fine), US Letter.
- Endpoints: `GET /api/timeline?from&to&categories`, `GET /api/timeline/pdf?…` (application/pdf, attachment filename `parley-timeline-YYYY-MM-DD.pdf`).

### PLAN + DEMO (retention mechanic + jury path)
- `/app/plan`: "Day N of 28" header with progress ring, streak ("calm days" = days with ≥1 drill or coach use and no flagged high-severity sent reply — compute in code), **today's lesson** (2–3 min read: one BIFF/gray-rock skill, with an example) and **today's drill**: a realistic message from the other parent (personalised to the quiz's top trigger) → user writes a reply → `gradeDraft` scores it with Judge's-lens flags → user can retry → show improvement (first score → best score). This is the "fails, trains, succeeds on a new task" proof. A weekly progress card (drills done, average score trend over days, replies written, entries logged). 28 lesson/drill pairs in `server/plan-content.ts` (4 weeks: week 1 Brief & facts, week 2 Don't take the bait / gray rock, week 3 Boundaries & firm requests, week 4 Documentation & court-ready habits). Locked future days show as upcoming.
- **Reminders**: "Add a daily 2-minute reminder to my calendar" → downloads an `.ics` with a daily recurring event at the chosen time (works on iPhone/Android/Google without email). Also a "Come back tomorrow: Day N+1 unlocks" state.
- Free users see days 1–2; days 3+ require an active plan (paywall link).
- **Demo** `/demo`: one click "Open the sample case" → `POST /api/demo/start` creates a demo person (demo=1, plan active, sets cookie), seeds a realistic case over the past ~6 weeks (two co-parents, kids Emma 8 and Noah 5, 30–40 journal entries: messages in/out, late pickups, an expense dispute, a threat to tell the kids; several analyses created by calling the REAL `analyzeMessage` on 2–3 sample messages — seed the rest of the journal as data, labelled `source: 'demo'`), plan started 11 days ago with drills history. Then redirect to `/app/reply`. The demo page explains to the jury in 4 lines what to try, in order (reply coach → journal patterns → timeline PDF → plan drill → pricing test checkout with card 4242…).
- **Time travel (demo only)**: `POST /api/demo/forward {days: 7}` shifts `time_offset_days` so the jury can see a week pass (new plan days unlock, streak, renewal reminder). Show a small control on `/app/plan` when `me.demo`.
- Endpoints: `GET /api/plan` (day, streak, today lesson+drill, history), `POST /api/plan/drill {day, draft}` → grade + store, `GET /api/plan/ics?time=19:00`, `POST /api/demo/start`, `POST /api/demo/forward`.

## How to verify your module (agents)
- `npx tsc --noEmit` must pass for your files.
- Run the API on your own port: `PORT=<yours> DATA_DIR=./data-<module> npx tsx server/index.ts` and curl your endpoints (use a cookie jar). Ports: FUNNEL 8791, BILLING 8792, REPLY 8793, JOURNAL 8794, TIMELINE 8795, PLAN 8796.
- `npx vite build` must succeed at the end (other modules may still be stubs; that's fine).
- Don't run `npm run dev` on 5173/8787 (the lead uses them). Don't commit — the lead commits.
- Report: what you built, endpoints, anything unfinished, any shared change you needed.

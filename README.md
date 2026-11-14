# Parley

**Calm, court-safe replies to the other parent — and a private, dated record that holds up.**

Parents raising kids in two homes have to keep messaging each other, and in a custody dispute any message can end up in front of a judge. Parley reads the other parent's message (text or screenshot), strips the insults down to what actually needs an answer, writes a short reply in three tones, shows how a judge would read *your own* draft, and logs every exchange to a private journal that becomes a court-ready PDF timeline. A 28-day plan trains the skill so the parent needs the coach less over time.

Track: **Skills** · Business Cup 2.0 (Zimran)

**Live:** https://parley.adiletfndr.com — the jury path (/demo) needs no sign-up and no card.

## For the jury (2 minutes)
1. Open **/demo** → "Open the sample case" (clearly labelled demo data: six weeks of a real-looking case, day 12 of the plan).
2. **Reply coach** — tap an example with "+ draft" (or paste your own message). Every reply is generated live.
3. **Journal** — patterns computed from the record (late pickups, tense topics, missed payments).
4. **Court timeline** — download the PDF (exhibit numbers, SHA-256 fingerprint on every page).
5. **28-day plan** — write today's drill, get graded, retry, watch the score climb. Use the demo clock (+7 days) to see a week pass.
6. **Pricing** — test checkout: card `4242 4242 4242 4242`, any future date, any CVC. No real money moves.

Or start from the landing page as a new visitor: landing → 1-minute check → personal plan → paywall → test checkout → welcome → the app.

## How it makes money
A hard paywall with no free tier and no free trial, the model Zimran's Finelo and Coursiv use: a paid introductory period, then the plan renews on its own until you cancel.

| Plan | First period | Then |
|---|---|---|
| 1 week | $6.99 | $29.99 every 4 weeks |
| **4 weeks** (most popular) | $19.99 | $29.99 every 4 weeks |
| 12 weeks | $49.99 | $69.99 every 12 weeks |

14-day money-back guarantee, one-click cancel in Settings, a reminder 3 days before each renewal. Every paid endpoint (replies, record, imports, reports, PDF, practice, keyboard) answers **402** without an active plan — one gate in `server/index.ts`; the app shows a locked card that leads to /pricing. The demo case (/demo) is the one exception, so the jury can use everything without paying. Text pasted on the landing is not run before payment: it is kept in the browser and answered right after checkout.

## What's real
- Replies, "just the facts", asks, Judge's-lens flags and screenshot reading are model calls on the user's input (Claude Opus 5.5 with structured outputs; Gemini as a fallback).
- Our code then checks the model: every flagged phrase must occur in the text, hostile patterns the model missed are added, word counts and court-safety scores are computed, invented numbers are rejected.
- Journal patterns, streaks, plan days, renewals and the PDF are plain code over the stored record.
- `scripts/eval-reply.ts` runs 25 hostile messages through the coach and checks the rules (brevity, no insults echoed, no invented facts, asks answered).

## Stack
Vite + React 18 + TypeScript · Hono on Node 22 · SQLite (`node:sqlite`) · pdf-lib · Anthropic SDK (Claude) / Gemini REST. One VPS (Hetzner) behind Caddy.

## Run locally
```bash
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY (or GEMINI_API_KEY)
npm run dev            # web on :5173, API on :8787
```
Production build: `npm run build && npm start`. Deploy: `deploy/deploy.sh` (box set up once with `deploy/provision.sh`).

## Privacy
No account or email needed (a private cookie keeps your session); the other parent never sees Parley. "Download my data" and "Delete everything" are in Settings. Secrets live only in the server's `.env`.

Parley is not a law firm and doesn't give legal advice.

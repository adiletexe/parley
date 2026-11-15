# Parley becomes a 28-day course (proposal mockups)

Founder's idea: the core product is a **28-day calm co-parenting course** that teaches real skills (not only how to text). The screenshot reply tool and the record stay as **extra tools** ("for when a real message comes in"). Zimran's Coursiv / Finelo sell exactly this shape: a "28-day challenge" as the product.

Read first: /Users/adiletaussarbekov/Desktop/parley/docs/CONTEXT.md, docs/VOICE.md, docs/SPEC.md design section; current app: src/pages/funnel/Quiz.tsx, PlanReveal.tsx, Pricing.tsx, src/pages/app/Plan.tsx + plan/*, server/plan-content.ts, server/drill-bank.ts; screenshots in pitch/ux/entry/built/ and pitch/shots/.

## Curriculum (draft, refine it)
4 weeks × 7 days, each day = a 1-minute lesson (one idea, one example) + 2-minute practice (the existing 5-text drill or a small exercise) + optional "try it today" task.
- Week 1 · **Stop the spiral**: why replies blow up; pause before you answer; reply to the ask, not the jab; brief and factual; no "you always/never"; one message, not five; when not to answer at all.
- Week 2 · **Don't take the bait**: spotting bait; guilt trips; the past dragged up; the new partner; kids used as messengers; threats ("I'll take you to court"); gray rock.
- Week 3 · **Boundaries without a fight**: firm requests with a time; saying no calmly; schedule changes; money and expenses; handoffs; what to do when they don't answer; sticking to the parenting plan.
- Week 4 · **Kids first, record kept**: talking to your kids about two homes; never venting to the kids; keeping a calm record; what a lawyer actually needs; preparing for mediation; your 28-day review; staying calm long-term.

## Legal guardrails (must hold in every screen and line)
- Education about communication, not legal advice. No state-specific legal instructions, no predicting case outcomes. Keep "Parley is not a law firm and doesn't give legal advice."
- Never "court-approved", never imply it replaces or counts as a court-ordered parenting class. Don't promise custody results.
- Not therapy: calming techniques ok, no claims to treat anxiety or trauma.
- Don't name lessons "BIFF" (registered mark of High Conflict Institute); describe the idea in our own words.
- No numeric scores anywhere (founder rule): verdicts in words only.
- No em dashes. Plain conversational US English.

## Deliverable
Static mockups at 390×844 (phones) in the Parley design system (Plus Jakarta Sans, #f4f5fa, white cards, lilac→blue gradient for the primary action only; inline the icon sprites src/icons.svg.html + src/icons-parley.svg.html if you want icons). For each flow below, **3 variants (A, B, C)**, each variant shown as 3 to 4 consecutive screens. Render with puppeteer (NODE_PATH="/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/node_modules", deviceScaleFactor 2) and PIL contact sheets with labels. Look at every PNG, fix layout issues. Don't edit app source. Don't commit.

# Brief for slide variants (read fully)

You are designing ONE slide of the Parley pitch deck, in **5 different variants** (different design AND different copy), so the founder can pick. 1920×1080, rendered to PNG.

## Context
- Product: Parley, a web app for US parents raising kids in two homes. It turns the other parent's hostile texts into calm replies that won't hurt them in custody court, shows how a judge would read your own draft, keeps a dated record → PDF for the lawyer, and teaches the skill in a 2-minute daily practice (28 days). Hackathon: Zimran Business Cup 2.0, Skills track. Live: parley.adiletfndr.com. Read `/Users/adiletaussarbekov/Desktop/parley/docs/CONTEXT.md`.
- Jury criteria (show the one your slide covers): Does it work (40%), What do we sell / value & retention (20%), Who do we sell to / problem & user (15%), Why does it make money / $100M ARR, LTV > CAC (15%), Is it new (10%).
- Current deck (what the founder is unhappy with): `/Users/adiletaussarbekov/Desktop/parley/pitch/deck.html`, renders in `pitch/check/slide-*.png`. Older versions he partly liked: `pitch/old/*.pdf`.
- Facts & sources (use only these, never invent numbers): `pitch/research/benchmarks.md`, `cases.md`, `market-tools.md`, `ad-library.md`, `organic-and-ads.md`, `pitch/model.mjs` (run `node pitch/model.mjs`), `pitch/script.md`.
- Product screenshots (390×844 @2x): `pitch/shots/*.png`. Real-looking iPhone frame: `pitch/design-options/iphone.css` + `iphone.js` (usage in their header comment). Competitor ad images: `pitch/research/img/`.

## The founder's feedback (follow strictly)
1. **Copy must be conversational and self-explanatory.** Someone who sees the slide for 5 seconds understands it without the speaker. No cryptic slogans ("Drop. Read. Reply.", "answer bait calmly", "Every text, dated." are examples of what he hates). No choppy fragment-sentences. Headings and subheadings read like a person talking: e.g. "Parents lose time with their kids over a single angry text", "Who we're building this for".
2. **Never use em dashes (—) or en dashes as punctuation.** Use commas, periods, colons, or "and".
3. **No AI-slop layouts**: no rows of identical cards with identical padding, no equal 3-up/4-up card grids as the main idea, no gradient text gimmicks, no glow blobs, no emoji, no generic icon tiles. Vary scale and hierarchy; let one thing dominate; use real product screenshots, real texts, real numbers, annotations, charts, editorial typography. Think Stripe/Linear/Apple keynote, a good annual report, or a well-designed magazine page.
4. Big numbers are good when they carry meaning (he liked "$40 → $132 → 3.3×" big).
5. Personas: no invented names. Say "Mom, 36" / "Dad, 38" and title the slide plainly (e.g. "Our ideal customer").
6. Slide 1 specifically: stacked cards / carousel feel, ONE real text thread centered and dominant, the costly message circled with a red pen-style circle and an arrow to a note like "this text cost him custody"; other real case cards stacked behind, faded.
7. Palette: you may use the current dark Parley palette (night #0d0e1a, accent #5b6cf6, pink #e2508f, green #1fa572, Plus Jakarta Sans) OR propose light/editorial palettes in some variants. At least 2 of your 5 variants should differ in visual style from the current deck.

## ROUND 2 — the most important rule (overrides anything above)
The founder rejected round 1: **too much text on every slide.** People in the audience won't read. Now:
- **Headline: max 8 words**, plain and conversational, understandable alone. Optional one subline, max 12 words.
- **Everything else on the slide: max ~20 words total**, as short labels (2–5 words) attached to visuals. No paragraphs, no bullet lists, no sentences in body text, no footnote essays (a single tiny source line is fine).
- **Show, don't tell:** infographics, arrows, flow diagrams, charts drawn to scale, big numbers with a 2–4 word label, real product screenshots with 1–3 short callouts, before → after, icons-as-illustrations only if bespoke and meaningful. One visual idea per slide, clearly dominant.
- The slide must make sense in 3 seconds to someone who never heard the pitch.
- Still: no em dashes, no identical card grids, no slop. Round 1 sheets are in your folder's `sheet.png` if it exists — look at what was too wordy and do the opposite.
- Write round 2 to `variants2.html`, PNGs `r2-1.png … r2-5.png`, sheet `sheet2.png` (don't overwrite round 1).

## Output
- Folder: `/Users/adiletaussarbekov/Desktop/parley/pitch/variants/sN/` (N = your slide number). One HTML file `variants.html` with 5 `<section class="slide">` (1920×1080 each), link fonts from Google Fonts, reference images with relative paths like `../../shots/x.png` (the file lives two levels below pitch/).
- Render with puppeteer: `NODE_PATH="/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/node_modules" node render.cjs` (write your own small render.cjs in your folder: open the HTML via file://, wait for fonts, screenshot each `.slide` to `vN-1.png … vN-5.png` at deviceScaleFactor 1, then a contact sheet `sheet.png` (5 slides in a grid, ~2400px wide, labels A–E) — use Python PIL for the sheet). Render at most twice more after fixes; close the browser each time (other agents render too; keep it light).
- LOOK at every PNG yourself and fix overflow, overlaps, cut text, tiny unreadable text (min 18px for small print, 28px+ for main copy), and em dashes.
- Don't touch any file outside your folder. Don't commit.
- Reply with ≤12 lines: the sheet path, and for each variant A–E: one line on the design idea + its exact headline.

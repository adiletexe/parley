# Round 3 brief: 5 creative layouts per slide, in the v2 design

The founder chose ONE design direction: the dark deck v2.
- Source: `/Users/adiletaussarbekov/Desktop/parley/pitch/old/deck-v2.html` (paths already relative to pitch/old/), PDF: `pitch/old/Parley-deck-v2-dark.pdf`. **Read its CSS and look at the PDF/its slides first.**
- Keep exactly its visual language: Plus Jakarta Sans 400–800, tight-tracked 800 headlines with a muted second half, small uppercase accent kicker (#5b6cf6 family), the Parley mark (gradient rounded square + "Parley"), night background #0d0e1a with the soft lilac wash top right, white 28px-radius cards with soft shadows (on light slides), pink #e2508f = risky/bad, green #1fa572 = safe/good, lilac→blue gradient (#7c5cf0 → #5b6cf6 → #3f8df5) for the one hero element, real iPhone frames (`pitch/design-options/iphone.css` + `iphone.js`) around real screenshots (`pitch/shots/*.png`).
- **Alternate dark and light**: of your 5 variants, at least 2 must be light (paper #f4f5fa, ink #1d1f2b, white cards) and at least 2 dark. Same fonts and accents.

What he wants now: **more creative layouts within that design**: different compositions, infographics, charts drawn to scale, arrows, diagrams, big numbers, annotated screenshots, overlapping phones, split screens, timelines, before/after. Not 5 recolours of one layout.

Rules that still hold:
- Minimal text: headline ≤ 8–10 words (conversational, understandable alone), everything else short labels (2–6 words), total body text ≈ 25 words max. No paragraphs, no bullet lists.
- No em dashes or en dashes anywhere (write "$110 to $300").
- No rows of identical equal cards as the main idea; vary scale; one dominant element.
- Only real, sourced facts: `pitch/research/*.md`, `node pitch/model.mjs` (market column), `pitch/script.md` (v5, the talk track; your slide must match what's said there).
- Real texts only from `pitch/research/cases.md`; censor profanity with *.

Output: folder `pitch/variants/r3/sN/` (N = slide number in the NEW order below). One `variants.html` with 5 `<section class="slide">` 1920×1080 (relative paths: `../../../shots/x.png`, `../../../design-options/iphone.css`). Write your own render.cjs (puppeteer via `NODE_PATH="/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/node_modules"`, deviceScaleFactor 1, screenshot each `.slide` to `v1.png … v5.png`, close the browser) and a PIL contact sheet `sheet.png` (2 columns, labels A to E, ~2400px wide). At most 3 renders total; look at every PNG and fix overflow, overlaps, cut text, text under 18px. Touch nothing outside your folder. Don't commit.

Reply in ≤8 lines: sheet path, and per variant A to E: dark/light + one line on the layout idea + headline.

## The new slide order (script v5)
1. Parley: what it is (cover)
2. A real case (the texts that cost a dad custody, other real cases behind)
3. The problem (25M parents in two homes, texts become evidence in court)
4. What Parley does (angry text in, bait crossed out, calm reply out; judge's lens on your draft)
5. The skill we teach (Skills track; 2 min a day, 28 days, 21 → 98)
6. Why they keep paying (dated record, one PDF for the lawyer, months-long case, 50% / 89% / ~5 months)
7. Who we sell to (ICP: mom or dad 25 to 45, high-conflict ex, 1 to 2M families, buys when the lawyer says "document everything")
8. What's new (competitors need both parents; Parley needs one)
9. How we get customers (Zimran's playbook: plain ads + quiz; competitors polished, none with a quiz; 11.6% vs 7%)
10. The money + close ($40 → $132 → 3.3×, payback ~2 months, $100M = 257K = 1% of parents; live link parley.adiletfndr.com, no sign-up, test card 4242 4242 4242 4242, github.com/adiletexe/parley, "Parley is not a law firm and doesn't give legal advice.")

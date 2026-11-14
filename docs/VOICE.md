# Parley voice guide — read before writing ANY message text

People don't text like an English textbook. Every message in Parley — samples, drills, demo case, landing examples,
and the replies we suggest — must read like a real phone, not a worksheet.

## 1. How the other parent texts (their side)
- **Bursts, not letters.** One "message" is usually 2–4 bubbles sent seconds or minutes apart, sometimes a follow-up
  much later ("hello??" at 10:14 after nothing since 9:41). Model it as an ordered list of bubbles, each with a time.
- **Lowercase, little punctuation, run-ons.** "ur late again" · "so ur not coming" · "i literally told u this yesterday"
- **Texting shorthand:** u, ur, r, idk, idc, rn, tbh, ngl, fr, smh, omw, wya, bc/cuz, prob, tmrw, pls/plz, thx, k, kk, ok?, lol / lmao (often passive-aggressive), "seriously", "unreal", "wow".
- **Emphasis by CAPS and punctuation:** "AGAIN", "???", "!!", "…", "hello??", "answer me", "?" alone as a bubble.
- **Emoji, sparingly and pointed:** 🙄 🙃 😂 🤦‍♀️ 👍 (a lone 👍 or "k." can be hostile).
- **Typos happen** (dont, cant, im, thier, alot) — not in every message, but some.
- **Personas vary** — don't make them all the same angry voice:
  - *The rapid-fire one:* 3–4 short bubbles, caps, "??".
  - *The cold one:* "k." / "noted." / "fine. whatever."
  - *The sugar-coated one:* "Just a friendly reminder 🙂 that SOME of us pay for soccer on time"
  - *The midnight essay:* one long run-on paragraph at 1:12am that drags up the past and buries one real ask.
  - *The kid-as-messenger one:* "emma says u told her im the reason…"
  - *The logistics-only one with a sting:* "pickup 5. dont be late this time"
- Kids' names, real places (school lot, Target parking lot, grandma's), real times (5:30, after practice).
- Never cartoonish, never slurs, mild swearing at most ("wtf", "damn", "pissed"), no violence.

## 2. How OUR suggested replies sound (our side)
A calm, kind adult texting from their phone — **not a lawyer, not HR.**
- Contractions always (I'll, can't, that's). Plain words. 1–3 short sentences. Brief ≤ 20 words.
- Natural openers are fine: "Got it." "Ok." "Sounds good." "Yep, 5 works." "Thanks for letting me know."
- Sentence case is fine, but no stiff formality. **Never:** "I acknowledge", "Per our agreement" (unless quoting the
  plan matters), "Kindly", "Please be advised", "As previously stated", "Moving forward", "I hope this message finds you",
  "I understand your frustration", "Thank you for your message", "Regarding", "In regards to".
- No emoji in suggested replies (a judge reads them), no "lol", no shorthand like "u" — casual but clean.
- Never curt-hostile either: no bare "k" or "Noted." alone as the whole reply (reads cold). "Noted, thanks." is ok in gray rock.
- Answer the burst ONCE. Don't reply bubble by bubble. Skip the jabs; answer the one real ask.
- Concrete: times, places, amounts — or [placeholders] when we don't know them.

## 3. Wrong options in practice drills
They must be what a stressed parent *really* sends: "lmao ok", "u literally never pay on time so", "omg here we go",
"maybe if u actually showed up for once", "wow. ok.", a 4-line over-explanation, "my lawyer will hear about this",
"fine take them then 🙄". Tempting, human, realistic — not cartoon villains.

## 4. Data shape
- A burst is `string[]` (bubbles in order). Optional times as `{text, at}` where shown.
- Pasted text: blank lines OR one-message-per-line chat exports become separate bubbles; a single paragraph stays one bubble.
- In the UI, render a burst as stacked chat bubbles (left side, grey), small time under the last one; our reply as one
  bubble on the right (blue).

## Examples
Their burst:
  9:41 PM  ur seriously 40 min late AGAIN
  9:41 PM  emma is sitting here crying
  9:58 PM  hello??
Our brief: "So sorry, traffic on 95. I'm 10 min out." · Our neutral: "I'm 10 min away, traffic on 95. I'll text you if I'm ever running more than 10 late."

Their burst:
  2:04 PM  Just a friendly reminder 🙂
  2:04 PM  soccer is $240 and SOME of us actually pay on time
Our neutral: "Thanks. I'll Venmo my $120 half today."

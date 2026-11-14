/* The landing (/). Hard paywall, Finelo-style: no product before paying, so every CTA leads into the 1-minute quiz
   → plan → paywall. The paste box still takes their message, but nothing runs on it yet: the text is kept in this
   browser (src/lib/pending.ts) and the paid app answers it first thing after checkout. The jury skips all of this
   through the sample case (/demo), which is linked in the hero and the top bar. */
import {useEffect, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Icon, type IconId} from '../../components/Icon';
import {Logo} from '../../components/Logo';
import {track} from '../../lib/api';
import {keepPending} from '../../lib/pending';
import './funnel.css';

// The example is a real burst (docs/VOICE.md): three texts in a row, lowercase, a jab and an eye-roll.
const EXAMPLE_BURST = ['im not paying half of soccer', 'u signed her up without even asking me', 'typical. 🙄'];
const EXAMPLE = EXAMPLE_BURST.join('\n');
// The first draft is what a stressed parent really sends back, typed fast.
const DRAFT_PARTS: {t: string; flag?: string}[] = [
  {t: 'wow. '},
  {t: 'u ALWAYS do this', flag: 'An absolute. Reads as an attack, not a fact.'},
  {t: '. '},
  {t: 'maybe if u actually showed up to a game ud know why it matters', flag: 'A dig at their parenting. Judges notice these.'},
  {t: '. pay ur half '},
  {t: 'or im taking it to my lawyer', flag: 'Can read as a threat.'},
];
const REPLY = "Soccer's $180 for the fall. Here's the receipt. Can you let me know by Friday if you'll cover half?";
const REPLY_WORDS = REPLY.split(/\s+/).length;
// A run of texts from one sender, drawn the way a phone draws it: stacked, rounded on the outside only.
const stack = {display: 'grid', gap: 4, justifyItems: 'start', alignContent: 'start'} as const;
const bubbleR = (i: number, big = false) => {
  const r = big ? 20 : 18;
  return {borderRadius: `${i === 0 ? r : 6}px ${r}px ${r}px 6px`, padding: big ? '10px 16px' : '9px 14px'};
};

export default function Landing() {
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [hint, setHint] = useState(false);
  const [tab, setTab] = useState<'draft' | 'parley'>('draft');
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { track('landing_view', {ref: document.referrer ? new URL(document.referrer).hostname : undefined}); }, []);
  // Grow the paste box with what was pasted, up to a few lines; it starts as one line like a search field.
  useEffect(() => { const el = box.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 168) + 'px'; }, [text]);

  function submit() {
    const t = text.trim();
    if (!t) { setHint(true); box.current?.focus(); return; }
    track('landing_paste', {chars: t.length});
    keepPending(t);
    nav('/quiz');
  }
  const toQuiz = (where: string) => track('landing_quiz_cta', {where});

  return (
    <div className="fn-land">
      <section className="fn-hero">
        <nav className="fn-nav">
          <Logo light />
          <div className="fn-nav-r">
            <Link to="/demo" className="fn-nav-demo" onClick={() => track('landing_demo_link')}><span className="fn-dot" /><span>Jury demo<span className="fn-hide-s">: sample case</span></span></Link>
            <Link to="/quiz" className="fn-nav-try" onClick={() => toQuiz('nav')}>Get my plan</Link>
          </div>
        </nav>

        <div className="fn-hero-in">
          <span className="fn-hchip"><Icon id="two-homes" size={28} />For parents raising kids in two homes</span>
          <h1>Read it the way <span className="gt">a judge will</span>.<br />Before you hit send.</h1>
          <p className="fn-hsub">Paste the other parent's message. Parley writes a calm, brief, court-safe reply in seconds and keeps every word on a private, dated record.</p>

          <form className={'fn-paste' + (hint ? ' hint' : '')} onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <Icon id="paste" size={36} className="fn-paste-ico" />
            <textarea
              ref={box} rows={1} value={text} aria-label="The other parent's message"
              placeholder="Paste what they sent…"
              onChange={(e) => { setText(e.target.value); setHint(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            />
            <button className="fn-go" type="submit">Write my reply <span aria-hidden="true">→</span></button>
          </form>
          <div className="fn-hmeta">
            {hint
              ? <span className="fn-hhint">Paste a message first, or <button type="button" onClick={() => { setText(EXAMPLE); setHint(false); box.current?.focus(); }}>use an example</button></span>
              : <span className="fn-ticks"><span>1-minute setup first</span><span>Works solo</span><span>Private by default</span><span>Court-ready PDF</span></span>}
          </div>
          <Link to="/demo" className="fn-hquiz" onClick={() => track('landing_demo_link', {where: 'hero'})}>Jury / demo: open a sample case <span aria-hidden="true">→</span></Link>
        </div>

        <div className="fn-hero-peek" aria-hidden="true">
          <div className="fn-peek">
            <div className="fn-peek-h"><Icon id="inbox" size={24} /><span>They wrote · Text</span></div>
            <div style={stack}>
              {EXAMPLE_BURST.map((b, i) => <div key={i} className="fn-peek-them" style={bubbleR(i)}>{b}</div>)}
            </div>
            <div className="fn-peek-facts"><b>Just the facts</b> They don't want to pay half of soccer. They weren't asked first.</div>
            <div className="fn-peek-reply">
              <div className="fn-peek-tabs"><span className="on">Brief</span><span>Neutral</span><span>Firm</span></div>
              <p>{REPLY}</p>
              <div className="fn-peek-foot"><span className="chip chip-ok">A judge would read this well</span><span className="fn-peek-w">{REPLY_WORDS} words</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="fn-stats fn-wrap">
        {[
          ['12.9M', 'custodial parents in the US', 'US Census'],
          ['~100K', 'contested custody cases a year', 'est.'],
          ['$11,300', 'average divorce attorney fees', 'Martindale-Nolo'],
        ].map(([n, l, s]) => (
          <div key={n} className="fn-stat"><b>{n}</b><span>{l}</span><small>{s}</small></div>
        ))}
      </section>

      <section className="fn-sec fn-wrap">
        <div className="fn-sec-h">
          <span className="fn-eyebrow">How it works</span>
          <h2>Three steps. <span className="gt">Ten seconds.</span></h2>
        </div>
        <div className="fn-steps">
          {([
            ['paste', 'Paste or screenshot', 'Drop in their text, WhatsApp, email or a screenshot. No need to explain the backstory.'],
            ['judge-lens', 'Read it like a judge', 'Get the facts without the insults, the actual asks, and a calm reply. Check your own draft for phrases a judge would read badly.'],
            ['record', 'Keep the record', 'Every exchange lands on a private, dated record. Turn it into a court-ready PDF timeline when you need it.'],
          ] as [IconId, string, string][]).map(([ic, h, p], i) => (
            <div key={h} className="card fn-step">
              <div className="fn-step-n">{i + 1}</div>
              <Icon id={ic} size={52} />
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="fn-sec fn-wrap fn-ex">
        <div className="fn-sec-h">
          <span className="fn-eyebrow">Example</span>
          <h2>Same message. <span className="gt">Two replies.</span></h2>
          <p>Which one would you want a judge to read?</p>
        </div>
        <div className="fn-ex-grid">
          <div className="card fn-ex-them">
            <div className="card-h"><Icon id="inbox" size={24} />They wrote</div>
            <div style={stack}>
              {EXAMPLE_BURST.map((b, i) => <p key={i} className="fn-bubble" style={bubbleR(i, true)}>{b}</p>)}
            </div>
            <div className="fn-ex-facts">
              <small>Just the facts</small>
              <p>They don't want to pay half of soccer, because they weren't asked first.</p>
              <small>What needs an answer</small>
              <p>Who pays for soccer.</p>
            </div>
          </div>
          <div className="card fn-ex-out">
            <div className="fn-seg" role="tablist">
              <button role="tab" aria-selected={tab === 'draft'} className={tab === 'draft' ? 'on' : ''} onClick={() => setTab('draft')}>The first draft</button>
              <button role="tab" aria-selected={tab === 'parley'} className={tab === 'parley' ? 'on' : ''} onClick={() => { setTab('parley'); track('landing_example_toggle'); }}>With Parley</button>
            </div>
            {tab === 'draft' ? (
              <div className="fn-ex-body fade-in" key="d">
                <p className="fn-draft">{DRAFT_PARTS.map((p, i) => p.flag ? <mark key={i} title={p.flag}>{p.t}</mark> : <span key={i}>{p.t}</span>)}</p>
                <ul className="fn-flags">{DRAFT_PARTS.filter((p) => p.flag).map((p) => <li key={p.t}><b>"{p.t}"</b>{p.flag}</li>)}</ul>
                <JudgeRead bad />
              </div>
            ) : (
              <div className="fn-ex-body fade-in" key="p">
                <p className="fn-draft good">{REPLY}</p>
                <ul className="fn-flags ok"><li><b>{REPLY_WORDS} words</b>Brief, plain, sounds like a person.</li><li><b>One clear ask, one date</b>Firm without a threat.</li><li><b>No history, no labels</b>Nothing to argue with.</li></ul>
                <JudgeRead />
              </div>
            )}
            <Link to="/quiz" className="btn btn-primary btn-block" onClick={() => toQuiz('example')}>Get replies like this</Link>
          </div>
        </div>
      </section>

      <section className="fn-sec fn-wrap">
        <div className="fn-sec-h">
          <span className="fn-eyebrow">Why not just ChatGPT?</span>
          <h2>A chatbot writes a reply. <span className="gt">Parley builds your case.</span></h2>
        </div>
        <div className="fn-why">
          {([
            ['brief', 'Short, not stiff', 'General chatbots tend to write long, formal replies that can read as passive-aggressive. Parley aims for under 25 words, plain and kind.'],
            ['judge-lens', 'Checks your words, not just theirs', 'The judge’s lens flags the phrases in your own draft that a family court could read badly, and says why.'],
            ['timeline', 'Remembers everything', 'Every exchange is dated and kept in one place, with patterns spotted for you and a timeline ready for your lawyer.'],
          ] as [IconId, string, string][]).map(([ic, h, p]) => (
            <div key={h} className="fn-why-i"><Icon id={ic} size={48} /><div><h3>{h}</h3><p>{p}</p></div></div>
          ))}
        </div>
      </section>

      <section className="fn-sec fn-wrap">
        <div className="card fn-priv">
          <div className="fn-priv-l">
            <span className="fn-eyebrow">Privacy</span>
            <h2>The other parent <span className="gt">never sees Parley</span>.</h2>
            <p>Nothing is sent to anyone. You copy the reply and send it yourself, from your own phone.</p>
            <ul>
              <li><Icon id="solo" size={30} />Works solo. Nobody else has to join or pay.</li>
              <li><Icon id="no-signup" size={30} />No account and no email needed.</li>
              <li><Icon id="trash" size={30} />Download or delete everything, any time.</li>
            </ul>
          </div>
          <div className="fn-priv-r" aria-hidden="true">
            <div className="fn-priv-phone">
              <div className="fn-priv-bar"><Icon id="lock" size={20} />Only you</div>
              <div className="fn-priv-msg them">Pickup is 5, not 5:30. Again.</div>
              <div className="fn-priv-msg you">Understood. I'll be there at 5 on Friday.</div>
              <div className="fn-priv-logged"><Icon id="record" size={20} />Logged · Fri 4:12 PM</div>
            </div>
          </div>
        </div>
      </section>

      <section className="fn-sec fn-wrap">
        <div className="fn-sec-h">
          <span className="fn-eyebrow">Pricing</span>
          <h2>Pick a plan. <span className="gt">Stay calm</span> for less.</h2>
          <p>Shared co-parenting apps cost $110–300 a year per parent, and both of you have to join. Parley is just for you.</p>
        </div>
        <div className="fn-price">
          {([
            ['plan-1w', '1 week', '$6.99', 'first week', '$29.99 every 4 weeks', false],
            ['plan-4w', '4 weeks', '$19.99', 'first 4 weeks', '$29.99 every 4 weeks', true],
            ['plan-12w', '12 weeks', '$49.99', 'first 12 weeks', '$69.99 every 12 weeks', false],
          ] as [IconId, string, string, string, string, boolean][]).map(([ic, name, price, first, then, hot]) => (
            <div key={name} className={'card fn-price-c' + (hot ? ' hot' : '')}>
              {hot && <span className="fn-price-tag">Most popular</span>}
              <Icon id={ic} size={44} />
              <h3>{name}</h3>
              <b className="fn-price-n">{price} <small>{first}</small></b>
              <Link to="/quiz" className={'btn btn-block ' + (hot ? 'btn-primary' : 'btn-ghost')} onClick={() => toQuiz('pricing')}>Get my plan</Link>
              <p className="fn-price-fine">then {then} until you cancel</p>
            </div>
          ))}
        </div>
        <p className="fn-price-all">Every plan has unlimited replies and checks, all 28 days of practice and the court-ready PDF. 14-day money-back guarantee. Cancel in one click.</p>
      </section>

      <section className="fn-sec fn-wrap fn-faq">
        <div className="fn-sec-h"><span className="fn-eyebrow">Questions</span><h2>Good to <span className="gt">know</span></h2></div>
        <div className="fn-faq-l">
          {([
            ['Is Parley legal advice?', "No. Parley is not a law firm and doesn't give legal advice. It helps you write calmer messages and keep an organised record. For advice about your case, talk to a family-law attorney."],
            ['Will the other parent know I use it?', 'No. Parley never contacts anyone. You copy the reply and send it yourself, the same way you always do.'],
            ['Does the other parent need to sign up?', 'No. Parley works solo. Unlike shared co-parenting apps, nobody else has to join or pay.'],
            ['Will a court accept the PDF?', "That's up to the court and your attorney. Parley gives you a clean, chronological record with dates, exhibit numbers and the full message text, which is the kind of summary lawyers ask for."],
            ['What happens to my messages?', 'They are used to write your reply and to build your private record. You can download all of it, or delete all of it, in Settings at any time.'],
            ['Is there a free version or a free trial?', "No. You pay a small introductory price for your first week, 4 weeks or 12 weeks, then the plan renews until you cancel. If it isn't for you, ask within 14 days and you get all of it back."],
            ['Can I cancel?', 'Yes, in one click in Settings. We remind you 3 days before each renewal.'],
          ] as [string, string][]).map(([q, a]) => (
            <details key={q} className="fn-qa" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) track('landing_faq', {q}); }}>
              <summary>{q}<i aria-hidden="true" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="fn-final">
        <div className="fn-final-in">
          <h2>The next message is coming.<br /><span className="gt">Be ready for it.</span></h2>
          <p>Paste it into Parley before you answer. Ten seconds, every time.</p>
          <div className="fn-final-b">
            <button className="btn btn-primary btn-lg" onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setTimeout(() => box.current?.focus(), 400); }}>Write my reply</button>
            <Link to="/quiz" className="btn btn-lg fn-btn-dark" onClick={() => toQuiz('final')}>Take the 1-minute check</Link>
          </div>
        </div>
        <footer className="fn-foot">
          <Logo light />
          <nav>
            <Link to="/demo">Jury / demo: sample case</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/app/settings">Privacy</Link>
          </nav>
          <p>Parley is not a law firm and doesn't give legal advice. Examples on this page are illustrative.</p>
        </footer>
      </section>
    </div>
  );
}

/** The judge's read in words, the way the app gives it. No numbers: the founder's rule. */
function JudgeRead({bad}: {bad?: boolean}) {
  return <p className={'fn-score' + (bad ? ' bad' : '')}><i aria-hidden="true" />{bad ? 'A judge would read this badly' : 'A judge would read this well'}</p>;
}

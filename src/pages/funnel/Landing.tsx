/* The landing (/). The first wow has to come in ten seconds: paste their message, press the button, and the reply
   coach runs it for real as a guest (/app/reply?text=…). Everything else on the page backs that up. */
import {useEffect, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Icon, type IconId} from '../../components/Icon';
import {Logo} from '../../components/Logo';
import {track} from '../../lib/api';
import './funnel.css';

const EXAMPLE = "I'm not paying half of soccer. You signed her up without asking me. Typical. You never think about anyone but yourself.";
const DRAFT_PARTS: {t: string; flag?: string}[] = [
  {t: 'Wow. '},
  {t: 'You ALWAYS do this', flag: 'An absolute. Reads as an attack, not a fact.'},
  {t: '. '},
  {t: "Maybe if you actually showed up to a game you'd know why it matters", flag: 'A dig at their parenting. Judges notice these.'},
  {t: '. Pay your half '},
  {t: "or I'll take it to my lawyer", flag: 'Can read as a threat.'},
  {t: '.'},
];
const REPLY = "Fall soccer is $180. I've attached the receipt. Please let me know by Friday whether you'll cover half.";

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
    nav('/app/reply?text=' + encodeURIComponent(t.slice(0, 4000)));
  }
  const toQuiz = (where: string) => track('landing_quiz_cta', {where});

  return (
    <div className="fn-land">
      <section className="fn-hero">
        <nav className="fn-nav">
          <Logo light />
          <div className="fn-nav-r">
            <Link to="/demo" className="fn-nav-demo" onClick={() => track('landing_demo_link')}><span className="fn-dot" /><span>Sample case<span className="fn-hide-s"> for judges</span></span></Link>
            <Link to="/app/reply" className="fn-nav-try">Try it free</Link>
          </div>
        </nav>

        <div className="fn-hero-in">
          <span className="fn-hchip"><Icon id="family" size={28} />For parents raising kids in two homes</span>
          <h1>Read it the way <span className="gt">a judge will</span>.<br />Before you hit send.</h1>
          <p className="fn-hsub">Paste the other parent's message. Parley writes a calm, brief, court-safe reply in seconds and keeps every word on a private, dated record.</p>

          <form className={'fn-paste' + (hint ? ' hint' : '')} onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <Icon id="reply" size={36} className="fn-paste-ico" />
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
              : <span className="fn-ticks"><span>Free, no sign-up</span><span>Works solo</span><span>Private by default</span><span>Court-ready PDF</span></span>}
          </div>
          <Link to="/quiz" className="fn-hquiz" onClick={() => toQuiz('hero')}>Or take the 1-minute check and get a 28-day plan <span aria-hidden="true">→</span></Link>
        </div>

        <div className="fn-hero-peek" aria-hidden="true">
          <div className="fn-peek">
            <div className="fn-peek-h"><Icon id="reply" size={24} /><span>They wrote · Text</span></div>
            <div className="fn-peek-them">{EXAMPLE}</div>
            <div className="fn-peek-facts"><b>Just the facts</b> Doesn't want to split the soccer fee. Says they weren't asked first.</div>
            <div className="fn-peek-reply">
              <div className="fn-peek-tabs"><span className="on">Brief</span><span>Neutral</span><span>Firm</span></div>
              <p>{REPLY}</p>
              <div className="fn-peek-foot"><span className="chip chip-ok">Court-safety 94</span><span className="fn-peek-w">18 words</span></div>
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
            ['reply', 'Paste or screenshot', 'Drop in their text, WhatsApp, email or a screenshot. No need to explain the backstory.'],
            ['scale', 'Read it like a judge', 'Get the facts without the insults, the actual asks, and a calm reply. Check your own draft for phrases a judge would read badly.'],
            ['book', 'Keep the record', 'Every exchange lands on a private, dated record. Turn it into a court-ready PDF timeline when you need it.'],
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
            <div className="card-h"><Icon id="reply" size={24} />They wrote</div>
            <p className="fn-bubble">{EXAMPLE}</p>
            <div className="fn-ex-facts">
              <small>Just the facts</small>
              <p>Doesn't want to split the soccer fee. Says they weren't asked before sign-up.</p>
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
                <Score n={28} bad />
              </div>
            ) : (
              <div className="fn-ex-body fade-in" key="p">
                <p className="fn-draft good">{REPLY}</p>
                <ul className="fn-flags ok"><li><b>18 words</b>Brief and on topic.</li><li><b>One clear ask, one date</b>Firm without a threat.</li><li><b>No history, no labels</b>Nothing to argue with.</li></ul>
                <Score n={94} />
              </div>
            )}
            <button className="btn btn-primary btn-block" onClick={() => { track('landing_example_try'); nav('/app/reply?text=' + encodeURIComponent(EXAMPLE)); }}>Run this message for real</button>
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
            ['bolt', 'Short, not stiff', 'General chatbots tend to write long, formal replies that can read as passive-aggressive. Parley aims for under 25 words, plain and kind.'],
            ['scale', 'Checks your words, not just theirs', 'The judge’s lens flags the phrases in your own draft that a family court could read badly, and says why.'],
            ['receipt', 'Remembers everything', 'Every exchange is dated and kept in one place, with patterns spotted for you and a timeline ready for your lawyer.'],
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
              <li><Icon id="user" size={30} />Works solo. Nobody else has to join or pay.</li>
              <li><Icon id="lock" size={30} />No sign-up to start. No email needed.</li>
              <li><Icon id="trash" size={30} />Download or delete everything, any time.</li>
            </ul>
          </div>
          <div className="fn-priv-r" aria-hidden="true">
            <div className="fn-priv-phone">
              <div className="fn-priv-bar"><Icon id="lock" size={20} />Only you</div>
              <div className="fn-priv-msg them">Pickup is 5, not 5:30. Again.</div>
              <div className="fn-priv-msg you">Understood. I'll be there at 5 on Friday.</div>
              <div className="fn-priv-logged"><Icon id="book" size={20} />Logged · Fri 4:12 PM</div>
            </div>
          </div>
        </div>
      </section>

      <section className="fn-sec fn-wrap">
        <div className="fn-sec-h">
          <span className="fn-eyebrow">Pricing</span>
          <h2>Start free. <span className="gt">Stay calm</span> for less.</h2>
          <p>Shared co-parenting apps cost $110–300 a year per parent, and both of you have to join. Parley is just for you.</p>
        </div>
        <div className="fn-price">
          <div className="card fn-price-c">
            <Icon id="smile" size={44} />
            <h3>Free</h3>
            <b className="fn-price-n">$0</b>
            <ul><li>3 calm replies</li><li>Judge's lens on your draft</li><li>Private journal</li></ul>
            <Link to="/app/reply" className="btn btn-ghost btn-block">Try the reply coach</Link>
          </div>
          <div className="card fn-price-c hot">
            <span className="fn-price-tag">Most popular</span>
            <Icon id="crown" size={44} />
            <h3>4-week calm plan</h3>
            <b className="fn-price-n">$19.99 <small>first 4 weeks</small></b>
            <ul><li>Unlimited replies and checks</li><li>28-day plan with daily practice</li><li>Court-ready PDF timeline</li></ul>
            <Link to="/quiz" className="btn btn-primary btn-block" onClick={() => toQuiz('pricing')}>Get my plan</Link>
            <p className="fn-price-fine">Then $29.99 every 4 weeks. Cancel in one click.</p>
          </div>
        </div>
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
          <p>Paste it into Parley before you answer. It takes ten seconds, and it's free.</p>
          <div className="fn-final-b">
            <button className="btn btn-primary btn-lg" onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setTimeout(() => box.current?.focus(), 400); }}>Write my reply</button>
            <Link to="/quiz" className="btn btn-lg fn-btn-dark" onClick={() => toQuiz('final')}>Take the 1-minute check</Link>
          </div>
        </div>
        <footer className="fn-foot">
          <Logo light />
          <nav>
            <Link to="/demo">Sample case for judges</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/app/settings">Privacy</Link>
          </nav>
          <p>Parley is not a law firm and doesn't give legal advice. Examples on this page are illustrative.</p>
        </footer>
      </section>
    </div>
  );
}

function Score({n, bad}: {n: number; bad?: boolean}) {
  return (
    <div className={'fn-score' + (bad ? ' bad' : '')}>
      <span>Court-safety</span>
      <i><i style={{width: `${n}%`}} /></i>
      <b>{n}</b>
    </div>
  );
}

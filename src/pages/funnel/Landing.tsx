/* The landing (/). Hard paywall, Finelo-style: no product before paying, so every button goes to the 1-minute quiz
   (/quiz) → plan → paywall. Written for a stressed parent reading it on a phone at night: plain words, short,
   one button. The jury skips all of this through the sample case (/demo) in the top bar. */
import {useEffect} from 'react';
import {Link} from 'react-router-dom';
import {Icon, type IconId} from '../../components/Icon';
import {Logo} from '../../components/Logo';
import {track} from '../../lib/api';
import './funnel.css';

// Real-sounding bursts (docs/VOICE.md): texts in a row, lowercase, jabs. Each shows the reply you want to send
// (crossed out) and the one you send instead, in plain texting voice.
const CHATS: {who: string; when: string; burst: string[]; angry: string; calm: string}[] = [
  {who: 'Jordan', when: 'Tue 9:41 PM', burst: ['im not paying half of soccer', 'u signed her up without even asking me', 'typical. 🙄'],
    angry: 'wow. u ALWAYS do this. pay ur half or im taking it to my lawyer', calm: 'fall soccer is $180, sent you the receipt. can you do your $90 by friday?'},
  {who: 'Sam', when: 'Fri 5:42 PM', burst: ['ur seriously 40 min late AGAIN', 'emma is sitting here crying', 'hello??'],
    angry: 'maybe if u didnt set pickup in rush hour id be on time', calm: "on my way, 10 min out. tell emma i'm almost there"},
  {who: 'Alex', when: 'Wed 8:15 PM', burst: ['so ur new bf is picking the kids up now??', 'i never agreed to that'],
    angry: "who i date is none of ur business. get over it", calm: "got it. i'll do pickup myself on saturday at 10."},
  {who: 'Jordan', when: 'Thu 11:48 PM', burst: ['im keeping them this weekend', 'u can take it up with the judge'],
    angry: 'try it and see what happens', calm: "the schedule has them with me this weekend. i'll be there friday at 5."},
];

const FAQ: [string, string, string?][] = [
  ['Is Parley legal advice?', "No. Parley is not a law firm and doesn't give legal advice. It helps you write calmer messages and keep your texts in order. For advice about your case, talk to a family-law attorney."],
  ['Will the other parent know I use it?', 'No. Parley never contacts anyone. You copy the reply and send it yourself, like you always do. They never have to join anything.', 'privacy'],
  ['What happens to my messages?', 'They are used to write your reply and to keep your own record. Only you see them. You can download or delete all of it in Settings, any time.'],
  ['Is there a free trial?', "No. You pay a small price for your first week or first 4 weeks, then it renews until you cancel. Not for you? Ask within 14 days and you get all of it back."],
  ['How do I cancel?', 'One click in Settings. We remind you 3 days before each renewal.'],
];

export default function Landing() {
  useEffect(() => { track('landing_view', {ref: document.referrer ? new URL(document.referrer).hostname : undefined}); }, []);
  // The quiz's legal line links to /#faq and /#privacy; the router does not scroll to a hash by itself.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el) return;
    if (el instanceof HTMLDetailsElement) el.open = true;
    requestAnimationFrame(() => el.scrollIntoView({block: 'center'}));
  }, []);
  const go = (where: string) => track('landing_quiz_cta', {where});
  const Cta = ({where, dark}: {where: string; dark?: boolean}) => (
    <Link to="/quiz" className={'btn btn-primary btn-lg fn-cta' + (dark ? ' on-dark' : '')} onClick={() => go(where)}>Get my plan · 1-minute quiz</Link>
  );

  return (
    <div className="fn-land">
      <section className="fn-hero">
        <nav className="fn-nav">
          <Logo light />
          <div className="fn-nav-r">
            <Link to="/demo" className="fn-nav-demo" onClick={() => track('landing_demo_link')}><span className="fn-dot" /><span>Jury demo<span className="fn-hide-s">: sample case</span></span></Link>
          </div>
        </nav>

        <div className="fn-hero-in">
          <h1>Your ex knows how to push your buttons. <span className="gt">A judge will read what you send back.</span></h1>
          <p className="fn-hsub">Parley helps you answer calmly, keeps the texts in order for your lawyer, and teaches you to stay out of the fight. A few minutes a day.</p>
          <Cta where="hero" />
          <div className="fn-hmeta"><span className="fn-ticks"><span>Works without the other parent</span><span>Only you see it</span><span>Cancel any time</span></span></div>
        </div>

        {/* One chat, the way it looks on a phone: their burst, the reply you almost sent (crossed out in pen),
            the one you sent instead. Labels are handwritten notes, not UI chrome. */}
        <div className="fn-chats" aria-label="Examples">
          {CHATS.map((c, k) => (
            <div className="fn-chat" key={k}>
              <div className="fn-chat-top"><span className="fn-chat-av">{c.who[0]}</span><b>{c.who}</b><small>{c.when}</small></div>
              <div className="fn-chat-body">
                {c.burst.map((b, i) => <p key={i} className="fn-chat-in">{b}</p>)}
                <div className="fn-chat-row"><span className="fn-chat-note bad">what you want to send</span><p className="fn-chat-out struck">{c.angry}</p></div>
                <div className="fn-chat-row"><span className="fn-chat-note">what you send instead</span><p className="fn-chat-out">{c.calm}</p></div>
                <small className="fn-chat-meta">Delivered</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="fn-sec fn-wrap">
        <div className="fn-sec-h"><h2>How it <span className="gt">works</span></h2></div>
        <div className="fn-steps">
          {([
            ['paste', 'Paste what they sent', 'Or a screenshot. No backstory needed.'],
            ['reply', 'Get a calm reply', "Short, kind, and only about what they actually asked. We also tell you if your own draft could hurt you."],
            ['path', 'Get better at it', 'A few minutes of practice a day for 28 days, and every text kept in order in case your lawyer asks.'],
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

      <section className="fn-sec fn-wrap">
        <div className="fn-sec-h"><h2>Why not just <span className="gt">ChatGPT</span>, or a co-parenting app?</h2></div>
        <div className="fn-why">
          {([
            ['brief', 'ChatGPT sounds like a lawyer', 'Its replies come out long and stiff, and stiff can read as passive-aggressive. Parley keeps it short and human.'],
            ['timeline', 'ChatGPT forgets', 'Parley remembers every exchange, with the date, so you are not digging through screenshots the night before a hearing.'],
            ['solo', 'Apps like OurFamilyWizard need both of you', 'They cost $110 to $300 a year per parent and the other parent has to sign up. Parley is just for you.'],
          ] as [IconId, string, string][]).map(([ic, h, p]) => (
            <div key={h} className="fn-why-i"><Icon id={ic} size={48} /><div><h3>{h}</h3><p>{p}</p></div></div>
          ))}
        </div>
      </section>

      <section className="fn-sec fn-wrap">
        <div className="card fn-l-price">
          <div>
            <h2>Everything in <span className="gt">one plan</span></h2>
            <p>Unlimited calm replies, 28 days of practice and your texts in order for court.</p>
          </div>
          <div className="fn-l-price-r">
            <b>$19.99 <small>for your first 4 weeks</small></b>
            <span>then $29.99 every 4 weeks until you cancel</span>
            <Cta where="pricing" />
            <small>Or try a week for $6.99. 14-day money-back guarantee.</small>
          </div>
        </div>
      </section>

      <section className="fn-sec fn-wrap fn-faq" id="faq">
        <div className="fn-sec-h"><h2>Questions</h2></div>
        <div className="fn-faq-l">
          {FAQ.map(([q, a, id]) => (
            <details key={q} id={id} className="fn-qa" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) track('landing_faq', {q}); }}>
              <summary>{q}<i aria-hidden="true" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="fn-final">
        <div className="fn-final-in">
          <h2>The next text is coming.<br /><span className="gt">Be ready for it.</span></h2>
          <p>Eight quick questions, then your plan.</p>
          <Cta where="final" dark />
        </div>
        <footer className="fn-foot">
          <Logo light />
          <nav>
            <Link to="/demo">Jury demo: sample case</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/app/settings">Privacy</Link>
          </nav>
          <p>Parley is not a law firm and doesn't give legal advice. Examples on this page are illustrative.</p>
        </footer>
      </section>
    </div>
  );
}

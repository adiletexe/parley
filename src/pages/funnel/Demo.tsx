/* /demo — the jury's one click into a believable case. A separate demo person with sample data, clearly labelled;
   the sample messages go through the real coach and the real grader. */
import {useState} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import {Logo} from '../../components/Logo';
import {Icon, type IconId} from '../../components/Icon';
import {api, track} from '../../lib/api';
import {useMe} from '../../lib/me';
import './demo.css';

const TRY: {icon: IconId; title: string; sub: string; to: string}[] = [
  {icon: 'path', title: 'Course', sub: "Day 12 of 28: today's lesson is a short chat, then 5 texts to practise on. Tap the Week 1 badge, read the Sunday summary, open the Holidays module.", to: '/app/plan'},
  {icon: 'clock', title: 'After day 28', sub: 'Demo clock, "+17 days": daily practice from the case\'s own record and the next module.', to: '/app/plan'},
  {icon: 'reply', title: 'Reply', sub: 'Tap a sample message, then add a draft of your own to see how a judge would read it.', to: '/app/reply'},
  {icon: 'record', title: 'Record', sub: 'Six weeks on record: the patterns (late pickups, an unpaid fee), then the PDF for a lawyer.', to: '/app/record'},
  {icon: 'secure-card', title: 'Pricing test checkout', sub: 'Test card 4242 4242 4242 4242, any future date, any CVC.', to: '/pricing'},
];

export default function Demo() {
  const nav = useNavigate();
  const {me, refresh} = useMe();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function start() {
    setBusy(true); setErr('');
    track('demo_click');
    try {
      await api('/api/demo/start', {body: {}});
      await refresh();
      nav('/app/plan');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="dm">
      <header className="dm-top">
        <Logo />
        <span className="chip chip-amber">Demo · sample data</span>
      </header>

      <main className="dm-main">
        <section className="dm-hero fade-in">
          <span className="dm-eyebrow">For the jury</span>
          <h1>Open a <span className="gt">sample case</span>.</h1>
          <p className="dm-lede">One click puts you inside a realistic co-parenting case, six weeks in. No sign-up. Everything you try runs through the real product.</p>

          <div className="card dm-case">
            <div className="card-h"><Icon id="two-homes" size={24} />The sample case</div>
            <ul>
              <li><b>Alex</b> (you) and <b>Jordan</b>, the other parent, two homes</li>
              <li><b>Emma, 8</b> and <b>Noah, 5</b></li>
              <li>Active custody case, a GAL appointed</li>
              <li>Six weeks on record: messages, late pickups, expenses; day 12 of the 28-day course</li>
            </ul>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => void start()} disabled={busy}>
              {busy ? <><span className="spin" />Building the case…</> : 'Open the sample case'}
            </button>
            {busy && <p className="dm-wait">About 15 seconds: three of the case's messages are going through the real reply coach.</p>}
            {err && <p className="dm-err">{err} <button className="dm-link" onClick={() => void start()}>Try again</button></p>}
            <p className="dm-note">The demo is a separate, clearly labelled account. {me && !me.demo ? 'Anything you made as a guest stays as it was.' : ''}</p>
          </div>
        </section>

        <section className="dm-try">
          <h2>What to try, <span className="gt">in order</span></h2>
          <ol>
            {TRY.map((t, i) => (
              <li key={t.title} className="card dm-step">
                <span className="dm-n">{i + 1}</span>
                <Icon id={t.icon} size={40} />
                <div>
                  <b>{t.title}</b>
                  <span>{t.sub}</span>
                </div>
                {me?.demo && <Link className="dm-go" to={t.to} aria-label={`Open ${t.title}`}>Open →</Link>}
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="dm-foot">Parley is not a law firm and doesn't give legal advice. Names and events in the sample case are fictional.</footer>
    </div>
  );
}

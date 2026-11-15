/* The signed-in shell: sidebar on desktop, bottom tab bar on phones. Pages render inside <Outlet/>.
   No free tier: without a plan (and outside the demo case) Course, Reply and Record show one friendly locked
   card that sends the visitor to /pricing. The server refuses those calls with 402 either way. */
import {NavLink, Outlet, Link, useLocation} from 'react-router-dom';
import {Icon, type IconId} from './Icon';
import {Logo} from './Logo';
import {useMe} from '../lib/me';
import './app-shell.css';

const NAV: {to: string; label: string; icon: IconId; short: string}[] = [
  {to: '/app/plan', label: 'Course', short: 'Course', icon: 'path'},
  {to: '/app/reply', label: 'Reply', short: 'Reply', icon: 'reply'},
  {to: '/app/record', label: 'Record', short: 'Record', icon: 'record'},
];

const LOCKED: Record<string, {h: string; p: string}> = {
  '/app/reply': {h: 'Calm replies come with your plan', p: 'Paste their texts, get a short, calm reply in seconds, and see how a judge would read your own draft.'},
  '/app/record': {h: 'Your record comes with your plan', p: 'Every exchange on one dated record, with patterns spotted for you and a PDF ready for your lawyer.'},
  '/app/plan': {h: 'The course comes with your plan', p: 'Three minutes a day for 28 days: a short lesson as a chat, then real texts from the other parent to practise on.'},
};

function Locked({path, ended}: {path: string; ended: boolean}) {
  const t = LOCKED[path] ?? LOCKED['/app/reply'];
  return (
    <section className="card shell-locked fade-in">
      <Icon id="lock" size={56} />
      <h1>{ended ? 'Your plan has ended' : t.h}</h1>
      <p>{ended ? 'Pick a plan to keep going. Everything you saved is still here.' : t.p}</p>
      <Link to="/pricing" className="btn btn-primary btn-lg btn-block">See plans</Link>
      <small>From $6.99 for your first week. Cancel in one click.<br /><Link to="/demo">Just looking? Open the sample case</Link></small>
    </section>
  );
}

export function AppShell() {
  const {me} = useMe();
  const {pathname} = useLocation();
  const active = me?.plan.state === 'active';
  const locked = !!me && !me.access && pathname !== '/app/settings';
  return (
    <div className="shell">
      <aside className="shell-side">
        <div className="shell-logo"><Logo to="/app/plan" /></div>
                <nav className="shell-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({isActive}) => 'shell-link' + (isActive ? ' on' : '')}>
              <Icon id={n.icon} size={30} />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="shell-foot">
          {me && (
            <Link to={active ? '/app/settings' : '/pricing'} className="shell-plan">
              <b>{active ? (me.day > 28 ? 'Course complete' : `Day ${me.day} of 28`) : me.plan.state === 'expired' ? 'Your plan has ended' : 'No plan yet'}</b>
              <span>{active ? (me.day > 28 ? 'Daily practice and modules' : '28-day calm course') : 'See plans'}</span>
              {active && <i className="shell-bar"><i style={{width: `${Math.min(100, (Math.min(me.day, 28) / 28) * 100)}%`}} /></i>}
            </Link>
          )}
          <Link to="/app/settings" className="shell-link"><Icon id="lock" size={30} />Privacy & plan</Link>
        </div>
      </aside>
      <main className="shell-main">{me?.demo && <div className="shell-demo"><b>Sample case</b> · demo data, everything runs live · <Link to="/demo">What to try</Link></div>}{me ? (locked ? <Locked path={pathname} ended={me.plan.state === 'expired'} /> : <Outlet />) : <div style={{minHeight: '50vh', display: 'grid', placeItems: 'center'}}><span className="spin" /></div>}</main>
      <nav className="shell-tabs" aria-label="Sections">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({isActive}) => 'shell-tab' + (isActive ? ' on' : '')}>
            <Icon id={n.icon} size={26} /><span>{n.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* The signed-in shell: sidebar on desktop, bottom tab bar on phones. Pages render inside <Outlet/>. */
import {NavLink, Outlet, Link} from 'react-router-dom';
import {Icon, type IconId} from './Icon';
import {Logo} from './Logo';
import {useMe} from '../lib/me';
import './app-shell.css';

const NAV: {to: string; label: string; icon: IconId; short: string}[] = [
  {to: '/app/reply', label: 'Reply', short: 'Reply', icon: 'reply'},
  {to: '/app/record', label: 'Record', short: 'Record', icon: 'record'},
  {to: '/app/plan', label: 'Practice', short: 'Practice', icon: 'target'},
];

export function AppShell() {
  const {me} = useMe();
  const active = me?.plan.state === 'active';
  return (
    <div className="shell">
      <aside className="shell-side">
        <div className="shell-logo"><Logo to="/app/reply" /></div>
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
              <b>{active ? `Day ${Math.min(me.day, 28)} of 28` : me.freeRepliesLeft > 0 ? `${me.freeRepliesLeft} free replies left` : 'Free replies used'}</b>
              <span>{active ? 'Calm communication plan' : 'Unlock the full plan'}</span>
              <i className="shell-bar"><i style={{width: `${active ? Math.min(100, (Math.min(me.day, 28) / 28) * 100) : 100 - (me.freeRepliesLeft / 3) * 100}%`}} /></i>
            </Link>
          )}
          <Link to="/app/settings" className="shell-link"><Icon id="lock" size={30} />Privacy & plan</Link>
        </div>
      </aside>
      <main className="shell-main">{me?.demo && <div className="shell-demo"><b>Sample case</b> · demo data, everything runs live · <Link to="/demo">What to try</Link></div>}{me ? <Outlet /> : <div style={{minHeight: '50vh', display: 'grid', placeItems: 'center'}}><span className="spin" /></div>}</main>
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

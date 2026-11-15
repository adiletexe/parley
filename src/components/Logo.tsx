import {Link} from 'react-router-dom';

/* The Parley mark (public/logo.svg, from the founder's Canva deck): two rounded squares, one turned 45 degrees, woven.
   Drawn in currentColor so it sits white on dark slabs and in ink or gradient on light pages. */
export function Mark({size = 28}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5.6" aria-hidden="true">
      <defs><mask id="pm-a" maskUnits="userSpaceOnUse"><rect width="100" height="100" fill="#fff"/><circle cx="17.0" cy="36.33" r="6.4399999999999995" fill="#000"/><circle cx="63.67" cy="17.0" r="6.4399999999999995" fill="#000"/><circle cx="83.0" cy="63.67" r="6.4399999999999995" fill="#000"/><circle cx="36.33" cy="83.0" r="6.4399999999999995" fill="#000"/></mask><mask id="pm-b" maskUnits="userSpaceOnUse"><rect width="100" height="100" fill="#fff"/><circle cx="36.33" cy="17.0" r="6.4399999999999995" fill="#000"/><circle cx="83.0" cy="36.33" r="6.4399999999999995" fill="#000"/><circle cx="63.67" cy="83.0" r="6.4399999999999995" fill="#000"/><circle cx="17.0" cy="63.67" r="6.4399999999999995" fill="#000"/></mask></defs>
  <rect x="17.0" y="17.0" width="66" height="66" rx="10" mask="url(#pm-a)"/>
  <g mask="url(#pm-b)"><rect x="17.0" y="17.0" width="66" height="66" rx="10" transform="rotate(45 50 50)"/></g>
    </svg>
  );
}

export function Logo({to = '/', light = false}: {to?: string; light?: boolean}) {
  return (
    <Link to={to} className="logo" style={{display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: light ? '#fff' : 'var(--ink)', font: '800 20px var(--font)', letterSpacing: '-.02em'}}>
      <span style={{color: light ? '#fff' : 'var(--acc)', display: 'grid'}}><Mark size={32} /></span>
      Parley
    </Link>
  );
}

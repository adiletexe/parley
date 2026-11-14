import {Link} from 'react-router-dom';

export function Logo({to = '/', light = false}: {to?: string; light?: boolean}) {
  return (
    <Link to={to} className="logo" style={{display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: light ? '#fff' : 'var(--ink)', font: '800 20px var(--font)', letterSpacing: '-.02em'}}>
      <span style={{width: 34, height: 34, borderRadius: 11, background: 'var(--grad)', display: 'grid', placeItems: 'center', boxShadow: '0 6px 18px var(--glow)'}}>
        <svg width="20" height="20" aria-hidden="true"><use href="#p-mark" /></svg>
      </span>
      Parley
    </Link>
  );
}

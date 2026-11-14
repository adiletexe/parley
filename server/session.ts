/* A person is created on first visit (guest) and remembered by an httpOnly cookie. No password, no login wall:
   the jury goes through the whole flow without signing up (case FAQ Q54/Q65). */
import type {Context, Next} from 'hono';
import {getCookie, setCookie} from 'hono/cookie';
import {createPerson, getPerson, type PersonRow} from './db.js';

const COOKIE = 'parley_pid';

declare module 'hono' {
  interface ContextVariableMap { person: PersonRow }
}

export async function session(c: Context, next: Next) {
  let p = getCookie(c, COOKIE) ? getPerson(getCookie(c, COOKIE)!) : undefined;
  if (!p) {
    p = createPerson(false);
    setPersonCookie(c, p.id);
  }
  c.set('person', p);
  await next();
}

export function setPersonCookie(c: Context, id: string) {
  setCookie(c, COOKIE, id, {httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 365, secure: c.req.url.startsWith('https')});
}

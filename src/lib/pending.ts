/* The message a visitor pasted on the landing, carried through quiz → paywall → checkout so the first thing the
   paid app does is answer it. No AI runs before payment; this only remembers the text in this browser. */
const KEY = 'parley_pending_text';

export function keepPending(text: string) {
  try { localStorage.setItem(KEY, text.slice(0, 4000)); } catch { /* private mode: they paste it again */ }
}
export function peekPending(): string {
  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
}
export function clearPending() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

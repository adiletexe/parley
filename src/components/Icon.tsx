/* Pastel 3D icon tiles from the inline sprite in index.html (larpmotion style A).
   Available ids: chat book calendar target heart clock lock upload download search family smile bolt timer user home
   scripts crown flame party ask split trash shield scale receipt flag,
   and Parley's own: reply (speech bubble) record (dated ledger) pencil (note) dollar (expense) dollarx (missed payment)
   noshow (person + x) kids (children + !) pdf (document download) camera (screenshot). Use the one that names the action.
   The second block (icons-parley.svg.html, drawn by scripts/build-icons.mjs) is one picture per meaning — kids-1…3,
   ages, channels, triggers, reactions, court stages, hourglasses, goals, plan weeks. Prefer it: a reused icon makes a
   person read the wrong thing (a heart for "one child", a split for TalkingParents). docs/ICONS.md says what is where. */
export type IconId =
  | 'chat' | 'book' | 'calendar' | 'target' | 'heart' | 'clock' | 'lock' | 'upload' | 'download' | 'search' | 'family'
  | 'smile' | 'bolt' | 'timer' | 'user' | 'home' | 'scripts' | 'crown' | 'flame' | 'party' | 'ask' | 'split' | 'trash'
  | 'shield' | 'scale' | 'receipt' | 'flag'
  | 'reply' | 'record' | 'pencil' | 'dollar' | 'dollarx' | 'noshow' | 'kids' | 'pdf' | 'camera' | 'inbox'
  | 'kids-1' | 'kids-2' | 'kids-3' | 'age-baby' | 'age-school' | 'age-tween' | 'age-teen'
  | 'ch-text' | 'ch-email' | 'ch-ofw' | 'ch-tp' | 'ch-inperson' | 'ch-phone'
  | 'freq-rare' | 'freq-month' | 'freq-week' | 'freq-daily'
  | 'tr-schedule' | 'tr-money' | 'tr-partner' | 'tr-school' | 'tr-messenger' | 'tr-past'
  | 're-fast' | 're-long' | 're-quiet' | 're-friend' | 're-lawyer'
  | 'court-none' | 'court-mediation' | 'court-active' | 'court-hearing' | 'court-modify'
  | 'lawyer' | 'gal' | 'lawyer-gal' | 'solo' | 'time-1' | 'time-3' | 'time-6' | 'time-6p'
  | 'goal-calm' | 'goal-record' | 'goal-peace' | 'goal-kids' | 'app-cost' | 'legal-fees' | 'judge-lens' | 'path'
  | 'brief' | 'no-absolutes' | 'on-point' | 'no-threat' | 'no-bait' | 'boundary' | 'timeline' | 'you-here'
  | 'trigger' | 'gauge' | 'goal' | 'chart' | 'refund' | 'one-click' | 'secure-card' | 'two-homes' | 'paste'
  | 'no-signup' | 'messages' | 'import-chat' | 'fingerprint' | 'plan-1w' | 'plan-4w' | 'plan-12w';

export function Icon({id, size = 32, className}: {id: IconId; size?: number; className?: string}) {
  return (
    <svg className={'ico ' + (className ?? '')} width={size} height={size} aria-hidden="true">
      <use href={`#i-${id}`} />
    </svg>
  );
}

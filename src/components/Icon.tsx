/* Pastel 3D icon tiles from the inline sprite in index.html (larpmotion style A).
   Available ids: chat book calendar target heart clock lock upload download search family smile bolt timer user home
   scripts crown flame party ask split trash shield scale receipt flag,
   and Parley's own: reply (speech bubble) record (dated ledger) pencil (note) dollar (expense) dollarx (missed payment)
   noshow (person + x) kids (children + !) pdf (document download) camera (screenshot). Use the one that names the action. */
export type IconId =
  | 'chat' | 'book' | 'calendar' | 'target' | 'heart' | 'clock' | 'lock' | 'upload' | 'download' | 'search' | 'family'
  | 'smile' | 'bolt' | 'timer' | 'user' | 'home' | 'scripts' | 'crown' | 'flame' | 'party' | 'ask' | 'split' | 'trash'
  | 'shield' | 'scale' | 'receipt' | 'flag'
  | 'reply' | 'record' | 'pencil' | 'dollar' | 'dollarx' | 'noshow' | 'kids' | 'pdf' | 'camera';

export function Icon({id, size = 32, className}: {id: IconId; size?: number; className?: string}) {
  return (
    <svg className={'ico ' + (className ?? '')} width={size} height={size} aria-hidden="true">
      <use href={`#i-${id}`} />
    </svg>
  );
}

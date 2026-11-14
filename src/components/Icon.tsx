/* Pastel 3D icon tiles from the inline sprite in index.html (larpmotion style A).
   Available ids: chat book calendar target heart clock lock upload download search family smile bolt timer user home
   scripts crown flame party ask split trash shield scale receipt flag. */
export type IconId =
  | 'chat' | 'book' | 'calendar' | 'target' | 'heart' | 'clock' | 'lock' | 'upload' | 'download' | 'search' | 'family'
  | 'smile' | 'bolt' | 'timer' | 'user' | 'home' | 'scripts' | 'crown' | 'flame' | 'party' | 'ask' | 'split' | 'trash'
  | 'shield' | 'scale' | 'receipt' | 'flag';

export function Icon({id, size = 32, className}: {id: IconId; size?: number; className?: string}) {
  return (
    <svg className={'ico ' + (className ?? '')} width={size} height={size} aria-hidden="true">
      <use href={`#i-${id}`} />
    </svg>
  );
}

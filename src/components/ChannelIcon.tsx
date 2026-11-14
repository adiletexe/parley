/* Where a message came from. WhatsApp is shown with its official glyph (simple-icons, unmodified, brand colour) next to
   the word "WhatsApp" — Meta's brand rules allow showing it to indicate compatibility, never as our own mark.
   Apple's Messages icon may not be imitated, so texts get a neutral bubble labelled "Text". OurFamilyWizard's and
   TalkingParents' logos are trademarks and are not drawn; each gets a picture of what it IS — a calendar two parents
   share, a recorded call-and-chat with a lock. From 22 px up every channel but WhatsApp is its pastel tile from the
   sprite; below that a tile is mush, so the same idea is drawn flat in one colour. */
import type {Channel} from '../../shared/types';
import {Icon, type IconId} from './Icon';

const TILE: Record<Exclude<Channel, 'whatsapp'>, IconId> = {
  sms: 'ch-text', email: 'ch-email', ofw: 'ch-ofw', talkingparents: 'ch-tp', in_person: 'ch-inperson', phone: 'ch-phone', other: 'messages',
};

const WA = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: 'Text', whatsapp: 'WhatsApp', email: 'Email', ofw: 'OurFamilyWizard', talkingparents: 'TalkingParents',
  in_person: 'In person', phone: 'Phone call', other: 'Other',
};

export function ChannelIcon({channel, size = 16}: {channel: Channel; size?: number}) {
  const box = {width: size, height: size, flex: 'none' as const, display: 'inline-block', verticalAlign: '-0.15em'};
  if (channel !== 'whatsapp' && size >= 22) return <Icon id={TILE[channel]} size={size} />;
  switch (channel) {
    case 'whatsapp':
      return <svg viewBox="0 0 24 24" style={box} aria-hidden="true"><path d={WA} fill="#25D366" /></svg>;
    case 'sms': // a bubble with typing dots, blue so it is not Apple's green
      return <svg viewBox="0 0 24 24" style={box} aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v7a3.5 3.5 0 0 1-3.5 3.5H11l-5 4v-4.2A3.5 3.5 0 0 1 4 12.5z" fill="#3b78ee" /><circle cx="8.5" cy="9" r="1.5" fill="#fff" /><circle cx="12" cy="9" r="1.5" fill="#fff" /><circle cx="15.5" cy="9" r="1.5" fill="#fff" /></svg>;
    case 'email':
      return <svg viewBox="0 0 24 24" style={box} aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="3" fill="#5b6cf6" /><path d="M4 7.5l8 5.5 8-5.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
    case 'phone':
      return <svg viewBox="0 0 24 24" style={box} aria-hidden="true"><path d="M6.6 3.5l2.6-.5 1.6 4-2 1.5a11 11 0 0 0 6.7 6.7l1.5-2 4 1.6-.5 2.6a2 2 0 0 1-2 1.6A15.5 15.5 0 0 1 5 5.5a2 2 0 0 1 1.6-2z" fill="#1fa572" /></svg>;
    case 'in_person':
      return <svg viewBox="0 0 24 24" style={box} aria-hidden="true"><circle cx="7" cy="7" r="3.3" fill="#c98a00" /><path d="M1 20.5c0-3.8 2.7-6.5 6-6.5s6 2.7 6 6.5z" fill="#c98a00" /><circle cx="17" cy="7" r="3.3" fill="#e0731c" /><path d="M11 20.5c0-3.8 2.7-6.5 6-6.5s6 2.7 6 6.5z" fill="#e0731c" /></svg>;
    case 'ofw': // a calendar two parents share
      return <svg viewBox="0 0 24 24" style={box} aria-hidden="true"><rect x="2" y="4" width="17" height="16" rx="3.5" fill="#18a06a" /><rect x="2" y="9" width="17" height="11" rx="2" fill="#d6f3e5" /><rect x="5.5" y="2" width="2.4" height="5" rx="1.2" fill="#2a2b3d" /><rect x="13.1" y="2" width="2.4" height="5" rx="1.2" fill="#2a2b3d" /><circle cx="16" cy="18" r="4.6" fill="#fff" /><circle cx="14.3" cy="18" r="2.7" fill="#7c5cf0" /><circle cx="18.6" cy="18" r="2.7" fill="#ee4f36" /></svg>;
    case 'talkingparents': // a recorded call and chat, locked
      return <svg viewBox="0 0 24 24" style={box} aria-hidden="true"><path d="M5 2.5h12a3.5 3.5 0 0 1 3.5 3.5v6a3.5 3.5 0 0 1-3.5 3.5H9.5L5 19v-3.5A3.5 3.5 0 0 1 1.5 12V6A3.5 3.5 0 0 1 5 2.5z" fill="#7c5cf0" /><circle cx="15.8" cy="7" r="2" fill="#ff4d4d" /><path d="M5.5 6.4h6M5.5 10.2h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /><path d="M16.3 17.2v-1.4a2.2 2.2 0 0 1 4.4 0v1.4" fill="none" stroke="#2a2b3d" strokeWidth="1.6" /><rect x="14.8" y="17" width="7.4" height="5.8" rx="1.6" fill="#2a2b3d" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" style={box} aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v7a3.5 3.5 0 0 1-3.5 3.5H11l-5 4v-4.2A3.5 3.5 0 0 1 4 12.5z" fill="#c9c3e0" /><circle cx="8.5" cy="9" r="1.4" fill="#fff" /><circle cx="12" cy="9" r="1.4" fill="#fff" /><circle cx="15.5" cy="9" r="1.4" fill="#fff" /></svg>;
  }
}

/** Icon + word, the way a source should always be shown (icons alone are guessed right ~60% of the time). */
export function ChannelTag({channel}: {channel: Channel}) {
  return <span style={{display: 'inline-flex', alignItems: 'center', gap: 5}}><ChannelIcon channel={channel} />{CHANNEL_LABEL[channel]}</span>;
}

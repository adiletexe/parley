/* "Try one": six realistic bursts the way people really text (docs/VOICE.md), labelled by a short quote from each.
   They run through the real model, like anything a person pastes, and are split into bubbles by the same code.
   Two carry a slangy first draft so the Judge's lens has something real to read. */
import type {Channel} from '../../../../shared/types';

export interface Sample { label: string; channel: Channel; incoming: string; draft?: string }

export const SAMPLES: Sample[] = [
  {label: '40 min late AGAIN', channel: 'sms',
    incoming: '9:41 PM ur seriously 40 min late AGAIN\n9:41 PM emma is sitting here crying\n9:58 PM hello?? wya'},
  {label: 'Friendly reminder 🙂', channel: 'sms',
    incoming: "2:04 PM Just a friendly reminder 🙂\n2:04 PM soccer is $240 and SOME of us actually pay on time",
    draft: "lol ok. maybe if u actually told me about stuff b4 signing him up i'd pay on time. send the receipt 🙄"},
  {label: "I'll tell the kids", channel: 'whatsapp',
    incoming: "gotta switch wknds, work trip on the 14th\nif u say no im telling the kids its bc u dont care about my job\nlmk today",
    draft: "omg here we go. fine swap. but if u tell them that ur gonna regret it. ur pathetic for even saying it"},
  {label: 'Not near my kids', channel: 'whatsapp',
    incoming: "idc what u say, i dont want that guy anywhere near my kids\nu barely know him\nif hes at ur place this wknd im keeping them. period."},
  {label: 'fine. wtv.', channel: 'sms',
    incoming: "6:02 PM fine. wtv.\n6:02 PM take them sat then\n6:40 PM but im getting them back by 6 sun not 8. not gonna argue bout it"},
  {label: 'Emma says u told her', channel: 'sms',
    incoming: "emma says u told her im the reason we split\nreally?? wow\nkeep the adult stuff out of it. and is she still going to grandmas sun or nah. lmk rq"},
];

/* Sample phone screenshots of a chat with the other parent (public/samples/), made up for trying the app: nobody in
   them is real. Reply and Record both offer them; tapping one fetches the PNG and sends it through the same upload a
   person's own screenshot takes, so the model reads the bubbles off the picture. The texts sit at the top of each
   phone, so thumbnails crop to the top. */
export interface SampleShot { label: string; src: string; alt: string; channel: Channel }

export const SHOTS: SampleShot[] = [
  {label: '40 min late AGAIN', src: '/samples/late-pickup.png', channel: 'sms',
    alt: 'Sample iMessage thread: "ur seriously 40 min late AGAIN", "emma is sitting here crying", "hello??", "answer me".'},
  {label: 'Soccer money', src: '/samples/soccer-money.png', channel: 'sms',
    alt: 'Sample iMessage thread: "soccer is $240 and SOME of us actually pay on time", a reply "I paid last month", then "lmk when ur sending ur half".'},
  {label: 'New partner at pickup', src: '/samples/new-partner.png', channel: 'whatsapp',
    alt: 'Sample WhatsApp chat: "so ur new bf is picking the kids up now??", "istg if he shows up saturday im calling my lawyer".'},
  {label: 'Keeping them this weekend', src: '/samples/weekend-threat.png', channel: 'sms',
    alt: 'Sample iMessage thread: "im keeping them this weekend", "u can take it up with the judge", "or i can just tell them why ur never around".'},
  {label: 'A friendly one', src: '/samples/friendly-hi.png', channel: 'sms',
    alt: 'Sample iMessage thread: "hey whatsup", "noah left his inhaler in my car, want me to drop it by?".'},
  {label: '102 fever', src: '/samples/fever.png', channel: 'whatsapp',
    alt: 'Sample WhatsApp chat: "she came back with a 102 fever", "did u even check on her", "this is exactly why the kids should be with me".'},
];

/* A WhatsApp "Export chat" .txt with a made-up other parent (Alex), read by the same parser as a real export. */
export const SAMPLE_EXPORT = {src: '/samples/whatsapp-export.txt', name: 'WhatsApp Chat with Alex.txt'};

/** Fetches a sample file the way a person would pick it: a File, ready for the real upload. */
export async function sampleFile(src: string, name = src.split('/').pop() || 'sample', type?: string): Promise<File> {
  const r = await fetch(src);
  if (!r.ok) throw new Error('The sample did not load. Check your connection and try again.');
  const blob = await r.blob();
  return new File([blob], name, {type: type ?? (blob.type || 'application/octet-stream')});
}

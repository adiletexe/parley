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

/* Two phone screenshots of a chat (public/samples/, drawn from these same bursts with a little history above them).
   Tapping one fetches the PNG and sends it through the real upload, the model reads the bubbles off the picture. */
export interface SampleShot { label: string; src: string; alt: string }

export const SHOTS: SampleShot[] = [
  {label: '40 min late AGAIN', src: '/samples/late.png',
    alt: 'A text thread: "ur seriously 40 min late AGAIN", "emma is sitting here crying", then "hello?? wya".'},
  {label: 'Emma says u told her', src: '/samples/grandma.png',
    alt: 'A text thread: "emma says u told her im the reason we split", "really?? wow", "keep the adult stuff out of it.", "and is she still going to grandmas sun or nah. lmk rq".'},
];

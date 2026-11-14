/* "Try one": five realistic messages, labelled by a short quote from each. They run through the real model, like
   anything a person pastes. Two carry a first draft so the Judge's lens has something to read. */
import type {Channel} from '../../../../shared/types';

export interface Sample { label: string; channel: Channel; incoming: string; draft?: string }

export const SAMPLES: Sample[] = [
  {label: '40 min late AGAIN', channel: 'sms',
    incoming: "You were 40 minutes late AGAIN on Sunday. The kids sat by the door with their shoes on waiting for you. Do you even care? Pickup is at 5, not whenever you feel like it. Are you going to be on time Friday or not?"},
  {label: 'Not paying soccer', channel: 'whatsapp',
    incoming: "I'm not paying half of soccer. You signed Noah up without asking me. Typical. You never think about anyone but yourself.",
    draft: "You always do this. I told you about soccer in August and you said fine. Typical. I'll see you in court if you don't pay your half by Friday!!"},
  {label: "I'll tell the kids", channel: 'sms',
    incoming: "I need to switch weekends, I have a work trip on the 14th. If you say no I'm telling the kids it's because you don't care and you're being difficult. Let me know today.",
    draft: "Fine, swap. But if you tell the kids anything like that you will regret it. Honestly you are pathetic for even saying it."},
  {label: 'Not near my kids', channel: 'whatsapp',
    incoming: "I don't want that man anywhere near my kids. You barely know him. If he's at your place this weekend I'm keeping them home."},
  {label: 'Sent her in sick', channel: 'email',
    incoming: "Emma had a 102 fever when you dropped her off and you didn't say a word. What kind of parent sends a sick kid to school? I had to leave work. Did you give her any medicine or not?"},
];

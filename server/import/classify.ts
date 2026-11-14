/* Topic of a message, guessed in code from its words. Cheap, explainable, and good enough to group a
   two-year WhatsApp export by what the fights are about — the model is never called per imported line. */
import type {Category} from '../../shared/types.js';

const RULES: [Category, RegExp][] = [
  ['money', /\$\s?\d|\bpay(ing|ment|ments|ed)?\b|\bmoney\b|\bfees?\b|\bcost(s)?\b|\bbill(s|ed)?\b|\breimburs|\bsupport\b|\bvenmo\b|\bzelle\b|\breceipt|\bowe|\bhalf of\b|\bsplit\b|\bexpens|\btuition\b|\bdaycare\b/i],
  ['schedule', /\bpick ?up|\bpick-up|\bdrop ?off|\bdrop-off|\bweekend|\bswap|\bschedule|\bholiday|\bthanksgiving|\bchristmas|\bspring break|\bsummer|\bvacation|\blate\b|\brunning behind|\btraffic|\bon time|\bovernight|\bexchange|\bmy (day|week|time)|\byour (day|week|time)|\bparenting time|\bcustody time/i],
  ['health', /\bdoctor|\bdr\.?\s|\bpediatric|\bfever|\bsick|\bmedic(ine|ation|al)|\bhospital|\ber\b|\burgent care|\bdentist|\bappointment|\ballerg|\binhaler|\bantibiotic|\btherap|\bcounsel(or|ing)|\bflu\b|\bcovid|\bvaccin/i],
  ['school', /\bschool|\bteacher|\bhomework|\bclass(es)?\b|\bgrades?\b|\breport card|\bconference|\bfield trip|\bprincipal|\bpta\b|\bbus\b|\bsemester|\bspelling|\breading log|\bpicture day/i],
  ['new_partner', /\bboyfriend|\bgirlfriend|\bnew partner|\bfianc|\bdating|\bnew (wife|husband|man|woman)|\bstep-?(mom|dad|mother|father)|\bstrangers? around|\bsleep(s|ing)? over\b/i],
  ['accusation', /\byou (always|never)\b|\bliar\b|\blying\b|\bunfit\b|\bneglect|\bbad (mother|father|parent)|\bdrunk|\bdrinking|\babuse|\bbrainwash|\bmanipulat|\balienat|\bturn(ing)? (them|the kids) against|\bcps\b|\bcall(ing)? the police|\bsee you in court|\bmy lawyer|\byour fault/i],
  ['logistics', /\bjacket|\bclothes|\bbackpack|\bshoes|\bcar seat|\bpassport|\bcharger|\bipad|\bphone\b|\bpacked|\bbring\b|\bforgot|\blunch|\bpractice|\bsoccer|\bbaseball|\bdance|\bpiano|\bswim|\bbirthday party|\bride\b|\bcarpool/i],
];

export function guessCategory(text: string): Category {
  // Accusations outrank the topic they ride on: "you never pay for anything" is read in court as the accusation.
  // A new partner outranks the pickup it is about, for the same reason.
  for (const first of ['accusation', 'new_partner'] as Category[]) if (RULES.find(([c]) => c === first)![1].test(text)) return first;
  for (const [cat, re] of RULES) if (re.test(text)) return cat;
  return 'other';
}

/* A message reads as tense when it attacks the person, threatens court/police/the kids, or shouts.
   Same wording a judge would notice; counted by findPatterns via the 'tense' tag. */
const TENSE = [
  /\byou (always|never)\b/i,
  /\b(typical|ridiculous|unbelievable|deal with it|pathetic|liar|lying|crazy|psycho|idiot|stupid|useless|worthless|selfish|disgusting|loser|joke|deadbeat|unfit)\b/i,
  /\b(bitch|asshole|f+u+c+k|shit|damn you|screw you)/i,
  /\bsee you in court\b|\bmy lawyer\b|\bcall(ing)? (the )?(police|cops|cps)\b|\btake (you|this) to court\b|\bfull custody\b/i,
  /\b(i'?ll|i will|gonna) tell the (kids|children)\b|\bthe kids will know\b/i,
  /\byou'?ll regret\b|\bor else\b|\blast warning\b|\bdon'?t test me\b/i,
  /[!?]{3,}/,
  /\b[A-Z]{3,}\b(?:[^a-z]*\b[A-Z]{3,}\b){2,}/,
];
export const looksTense = (text: string) => TENSE.some((re) => re.test(text));

/* The 28-day calm-communication plan: one short lesson and one drill a day, four themed weeks.
   Each drill has the same skill written five ways, one per thing that most often sets the conversation off
   (from the quiz's "what sets it off"), so a person practises on the kind of message they actually get.
   The lessons teach BIFF (Bill Eddy: Brief, Informative, Friendly, Firm) and gray rock; general information,
   not legal advice. */

export type Trigger = 'schedule' | 'money' | 'partner' | 'school' | 'kids';
export const TRIGGERS: Trigger[] = ['schedule', 'money', 'partner', 'school', 'kids'];
export const TRIGGER_LABEL: Record<Trigger, string> = {
  schedule: 'schedule changes', money: 'money', partner: 'a new partner', school: 'school & health', kids: 'the kids used as messengers',
};

export interface Lesson {
  day: number;
  week: number;
  title: string;
  skill: string;            // the one thing this day trains, as a chip
  minutes: number;
  read: string[];           // 2–4 short paragraphs
  example: {them: string; bad: string; good: string; why: string};
  drill: {task: string; goal: string; messages: Record<Trigger, string>};
}

export const WEEKS = [
  {week: 1, title: 'Brief & facts', sub: 'Say less, say it clearly, answer what was asked.'},
  {week: 2, title: "Don't take the bait", sub: 'Gray rock: boring is safe, history is off the agenda.'},
  {week: 3, title: 'Boundaries & firm requests', sub: 'Clear asks, deadlines, and saying no without a fight.'},
  {week: 4, title: 'Court-ready habits', sub: 'Dates, receipts, and a record that speaks for you.'},
];

const L = (l: Lesson) => l;

export const LESSONS: Lesson[] = [
  // ---------------- Week 1 — Brief & facts ----------------
  L({day: 1, week: 1, title: 'The short reply wins', skill: 'Brief', minutes: 2,
    read: [
      'Every extra sentence is one more thing the other parent can argue with — and one more line a judge reads. A long reply feels safer while you write it. It rarely is.',
      'Aim for under 40 words. Answer the practical question, give the one fact that matters, and stop. If you feel the urge to add "and another thing", that is the part to delete.',
      'Brief is not cold. It is respectful of everyone\'s time, including the court\'s.',
    ],
    example: {
      them: "Seriously? You're changing pickup AGAIN? This is exactly why the kids can't count on you.",
      bad: "I'm not changing anything 'again', I've changed it twice in six months and both times it was because of work, which you know because I told you. Unlike you I actually give notice...",
      good: "Work moved my shift on Friday. Could I pick up at 6:00 instead of 5:00? If not, I'll ask my sister to get them at 5.",
      why: 'One fact, one ask, one backup plan. Nothing to argue with.',
    },
    drill: {task: 'Reply in 40 words or fewer. Answer the practical question only.', goal: 'Under 40 words, one clear answer, no defending yourself.',
      messages: {
        schedule: "Are you even taking them this weekend or are you going to cancel last minute like always? I need to know by tonight, I have plans.",
        money: "The dentist bill came. $180. I assume you'll pretend you never got it like last time?",
        partner: "Is HE going to be there this weekend? Because I don't want my kids around someone I've never met.",
        school: "Parent-teacher conference is Thursday. Not that you care, but are you coming or not?",
        kids: "Emma says you told her she can skip practice at your place. Nice. Are you taking her Saturday or not?",
      }}}),
  L({day: 2, week: 1, title: 'Find the ask', skill: 'Just the facts', minutes: 2,
    read: [
      'Hostile messages bury the real question under noise: blame, history, sarcasm. Your job is to dig out the ask — the one thing that actually needs an answer — and answer only that.',
      'Try it: cross out every word that is about you, the past, or feelings. What is left is usually one sentence about a time, a place, money, or the kids. That sentence is your whole agenda.',
      'If there is no ask at all, you may not need to reply. We will practise that in week 2.',
    ],
    example: {
      them: "Typical. You forgot the inhaler AGAIN. Noah could have ended up in the ER. Bring it to school tomorrow before 8.",
      bad: "I didn't 'forget' it, you never packed it in the first place, and don't use the ER to guilt-trip me.",
      good: "I'll drop the inhaler at the school office before 8 tomorrow.",
      why: 'The ask was "inhaler at school before 8". That is the entire reply.',
    },
    drill: {task: 'Answer only the real ask. Ignore everything else.', goal: 'The ask is answered; no reply to the insults or the history.',
      messages: {
        schedule: "You were 25 minutes late on Sunday. Again. The kids sat in the car crying. I need you to confirm 5:00 sharp this Sunday or I'm done waiting.",
        money: "Half of soccer is $120. You signed them up without asking me, so honestly you should pay all of it. When are you sending it?",
        partner: "Your girlfriend posted my kids on Instagram. Take it down. And tell me if she's going to be at the recital.",
        school: "Noah's teacher emailed ME because you never answer. He needs the reading log signed by Friday. Can you manage that?",
        kids: "Noah told me you said I'm 'the reason' you can't come to his game. Are you coming to the game Saturday at 10 or not?",
      }}}),
  L({day: 3, week: 1, title: 'Facts, not feelings', skill: 'Informative', minutes: 3,
    read: [
      'Informative means the reply carries useful information: dates, times, places, amounts. Facts move a conversation forward. Feelings — yours or the ones you assign to them — move it backward.',
      'Swap "you always make me look bad" for "pickup is at 5:00 at the school gate." Swap "I can\'t believe you" for nothing at all.',
      'A judge reading your messages later is looking for one thing: which parent keeps it about the child. Facts are how that shows.',
    ],
    example: {
      them: "You obviously don't care about Emma's birthday party since you never RSVP'd.",
      bad: "Of course I care, how dare you say that, I've been at every birthday since she was born.",
      good: "Emma and I will be at the party Saturday at 2:00. I'll bring the gift we talked about.",
      why: 'Shows you care through facts, without arguing about caring.',
    },
    drill: {task: 'Reply with at least one concrete fact (a date, time, place or amount). No feelings words.', goal: 'Contains a specific fact; no "I feel / you make me / I can\'t believe".',
      messages: {
        schedule: "I'm not driving to your side of town anymore. Figure out the exchange yourself.",
        money: "Where's the child support? It's the 5th. I'm not a bank.",
        partner: "I'm not okay with your boyfriend driving my kids. Who is picking them up Friday?",
        school: "The school says Emma missed two days while at your house. What happened?",
        kids: "Noah came back saying he doesn't have to listen to me at your house. When were you planning to tell me what he's allowed to do?",
      }}}),
  L({day: 4, week: 1, title: 'One friendly line', skill: 'Friendly', minutes: 2,
    read: [
      'A single warm line at the start lowers the temperature: "Thanks for letting me know." "Good to hear she liked the trip." One line. Not three.',
      'Friendly is not agreeing, apologising, or flattering. Over-the-top warmth reads as sarcasm, and sarcasm reads terribly in court.',
      'If nothing friendly is true, a neutral "Thanks for the update" is enough.',
    ],
    example: {
      them: "FYI Noah has a fever. Not that you'd notice.",
      bad: "Wow, thanks SO much for the update, really appreciate the extra comment!!",
      good: "Thanks for telling me. Is he okay to come Friday, or should we wait until he's fever-free for 24 hours?",
      why: 'Plain thanks, then straight to the child.',
    },
    drill: {task: 'Open with one genuinely friendly or neutral line, then answer. No sarcasm.', goal: 'One short warm/neutral line, no sarcasm or exclamation-mark irony.',
      messages: {
        schedule: "We're back from the lake a day early. I guess you can have them Sunday if you're not too busy.",
        money: "I paid for the school photos since SOMEONE never does. You owe me $34.",
        partner: "Since you clearly don't care what I think, I'm telling you anyway: Emma doesn't like your girlfriend.",
        school: "Emma got an A on her science project. I helped her all weekend, obviously.",
        kids: "Emma wants to show you her new bike. She asked me to ask you since you never answer her.",
      }}}),
  L({day: 5, week: 1, title: 'Close the loop', skill: 'Firm', minutes: 2,
    read: [
      'End your reply so that it does not invite a new round. "Let me know if that works" is fine. "Don\'t you think that\'s fair?" is an invitation to argue.',
      'Firm means clear: what you will do, by when. No rhetorical questions, no "we\'ll see", no hints.',
      'A good closing line is often the plan B: "If not, I\'ll do X." Now there is nothing left to negotiate.',
    ],
    example: {
      them: "Whatever. Do what you want, you always do.",
      bad: "What's that supposed to mean? Why do you always have to make everything a fight?",
      good: "I'll pick them up at 5:00 Friday at school as scheduled.",
      why: 'States the plan and ends there.',
    },
    drill: {task: 'Reply and end with a clear next step or plan B. No questions that invite debate.', goal: 'Ends with a concrete next step; no rhetorical questions.',
      messages: {
        schedule: "Fine, swap weekends, but don't expect me to do you favors after this.",
        money: "I'll pay my half of camp when I feel like it. You can wait.",
        partner: "If your new girlfriend is coming to the game I'm not going. Your choice.",
        school: "I signed Noah up for tutoring Tuesdays. You can drive him on your weeks, or not, whatever.",
        kids: "Emma says she wants to live with me. Maybe you should think about why.",
      }}}),
  L({day: 6, week: 1, title: "Don't JADE", skill: 'No defending', minutes: 3,
    read: [
      'JADE: Justify, Argue, Defend, Explain. It is the natural reaction to an accusation — and it hands the other parent four new things to dispute.',
      'You do not need their agreement on what happened. You need the child-related question handled. Your record will show the rest.',
      'Notice the urge to start a sentence with "I only…", "The reason…", "Actually…". Delete that sentence.',
    ],
    example: {
      them: "You let them stay up until midnight. That's why Noah was a wreck at school.",
      bad: "Actually they were in bed by 9:30, the reason Noah was tired is he had a nightmare, and I only let Emma read because...",
      good: "Bedtime is 8:30 for Noah and 9:00 for Emma at my house. Happy to keep the same times as yours if you send them.",
      why: 'No defence. A fact and a child-focused offer.',
    },
    drill: {task: 'Reply to the accusation without justifying, arguing, defending or explaining.', goal: 'No "actually / the reason / I only / that\'s not true".',
      messages: {
        schedule: "You 'forgot' it was my weekend? You did it on purpose to keep them from my mom's birthday.",
        money: "You spent the support money on yourself. Emma's shoes have holes in them.",
        partner: "You introduced the kids to your boyfriend way too early. Real mature.",
        school: "Noah failed his spelling test because you don't practise with him. Thanks a lot.",
        kids: "Emma came home crying because you yelled at her. What is wrong with you?",
      }}}),
  L({day: 7, week: 1, title: 'The screenshot test', skill: 'Read it like a judge', minutes: 2,
    read: [
      'Before you send anything, imagine it printed as Exhibit 14, read out loud by someone who has never met either of you. Would you be comfortable?',
      'Check three things: Is there anything that sounds like a threat? Anything sarcastic? Anything about the other parent rather than the children?',
      'This week you practised brief, informative, friendly and firm. Today, put them together.',
    ],
    example: {
      them: "I'm keeping them an extra night. Deal with it.",
      bad: "Try it and see what happens. My lawyer will love this.",
      good: "The schedule has them back with me at 6:00 tonight. Please let me know by 4:00 if something has come up for the kids.",
      why: 'Firm and factual. Reads well as an exhibit.',
    },
    drill: {task: 'Write a full BIFF reply: brief, informative, one friendly line, firm close.', goal: 'All four BIFF parts; nothing you would mind a judge reading.',
      messages: {
        schedule: "I'm taking the kids to my parents' for Thanksgiving. I know it's your year. Sue me.",
        money: "I'm not paying half of the braces. You picked the orthodontist without asking me.",
        partner: "If your new partner moves in, I'm going back to court. The kids don't need a stranger in the house.",
        school: "I'm switching Emma to the other school. It's better. I don't need your permission.",
        kids: "Noah said you told him I'm lying about the trip. Stop putting him in the middle or I will.",
      }}}),

  // ---------------- Week 2 — Don't take the bait ----------------
  L({day: 8, week: 2, title: 'Spot the hook', skill: 'Bait words', minutes: 2,
    read: [
      'Bait has a sound: "always", "never", "typical", "as usual", "of course you did". These words are built to make you defend your whole history.',
      'When you see one, name it to yourself — "that\'s a hook" — and step around it. The hook is not on the agenda.',
      'Your reply should contain none of their bait words, and none of your own.',
    ],
    example: {
      them: "You NEVER tell me anything about their doctor appointments. Typical.",
      bad: "I never tell you? I ALWAYS tell you. You never read your messages!",
      good: "Noah's checkup is Tuesday the 14th at 3:30 at Dr. Patel's. You're welcome to join.",
      why: 'No "always/never" back. Just the information.',
    },
    drill: {task: 'Reply without using "always", "never", "typical" or any blame word.', goal: 'No absolutes, no blame, no mirroring their tone.',
      messages: {
        schedule: "Of course you're late again. You've never once been on time in your life.",
        money: "Typical. You always have money for yourself and never for the kids.",
        partner: "As usual your new boyfriend comes before your own children.",
        school: "You never check the school portal. Emma missed a field trip because of you. Again.",
        kids: "The kids always come back from your place exhausted and rude. Every single time.",
      }}}),
  L({day: 9, week: 2, title: 'Gray rock', skill: 'Gray rock', minutes: 3,
    read: [
      'Gray rock means being as interesting as a gray rock: no emotion, no reaction, nothing to grab. It is for messages that exist mostly to provoke.',
      'A gray-rock reply is short and flat: "Noted." "Okay." "I\'ll have them ready at 5." No exclamation marks, no emoji, no opinions.',
      'It can feel unnatural. That is the point — a reaction is what the provocation is fishing for.',
    ],
    example: {
      them: "Must be nice having so much free time to play dad on weekends while I do all the real work.",
      bad: "Free time? I work 50 hours a week! You have no idea what I do for them.",
      good: "Okay. I'll have them back Sunday at 6.",
      why: 'Nothing to react to. The logistics still get handled.',
    },
    drill: {task: 'Write a gray-rock reply: flat, short, no emotion, no opinion.', goal: 'Under 20 words, no emotion words, no punctuation drama.',
      messages: {
        schedule: "Enjoy your weekend with them. Hope it's worth it since it's the only time you bother.",
        money: "Must be nice to buy them toys while I'm paying for actual groceries.",
        partner: "Saw your new girlfriend at Target. Classy. Hope the kids like her more than I do.",
        school: "I went to the school play alone. Again. But I'm sure you were very busy.",
        kids: "Emma says your house is boring. Can't say I'm surprised.",
      }}}),
  L({day: 10, week: 2, title: 'One topic only', skill: 'Stay on topic', minutes: 2,
    read: [
      'A hostile message often bundles five complaints. Answering all five makes a long, defensive reply. Answer the one that concerns the children this week.',
      'The other topics are not lost: if they matter, they go in your journal, not your reply.',
      'One message, one topic. Short replies are easier to keep calm.',
    ],
    example: {
      them: "You were late, you forgot his jacket, your mom was rude to me, and Emma needs $40 for the field trip by Friday.",
      bad: "I was 5 minutes late because of traffic, the jacket is in his backpack, my mom wasn't rude...",
      good: "I'll send $20 for my half of the field trip by Thursday.",
      why: 'Answers the time-sensitive child item. The rest stays out.',
    },
    drill: {task: 'Pick the one child-related item that needs an answer and reply to only that.', goal: 'Exactly one topic addressed; the rest left alone.',
      messages: {
        schedule: "You missed the swap time, you didn't bring the car seat, your house is a mess, and I need to know if you're doing Halloween or not.",
        money: "You're behind on support, you bought Emma a phone without asking, and the co-pay for Noah's visit is $35. Pay it.",
        partner: "Your boyfriend was at the exchange, which is not okay, you look ridiculous, and Noah needs his soccer cleats back by Saturday.",
        school: "You never answer the teacher, you let Emma skip homework, and the field trip form needs a signature by Wednesday.",
        kids: "The kids are disrespectful after your weekends, you badmouth me, and Noah forgot his inhaler at your place. I need it tonight.",
      }}}),
  L({day: 11, week: 2, title: 'When not to reply', skill: 'No reply / brief ack', minutes: 2,
    read: [
      'Not every message needs an answer. If there is no question, no request, and nothing about the children\'s safety or schedule, silence is a complete reply.',
      'When something needs acknowledging but not discussing, use a brief acknowledgement: "Received." "Thanks, noted."',
      'Today\'s drill: write the reply you would send — and if the right answer is a brief acknowledgement, write that.',
    ],
    example: {
      them: "Just so you know, everyone at church thinks you're a terrible parent.",
      bad: "I don't care what your church friends think. At least I don't gossip about you.",
      good: "(No reply — nothing here concerns the children.)",
      why: 'No ask, no child issue. Silence keeps you out of it.',
    },
    drill: {task: 'Decide: brief acknowledgement or a short answer. Write what you would actually send (5–20 words).', goal: 'Minimal reply that handles only what must be handled.',
      messages: {
        schedule: "Just letting you know I think this whole schedule is a joke and the judge was biased. Anyway, pickup is still 5.",
        money: "I want you to know I'm keeping track of every dollar I spend on them. Every. Dollar.",
        partner: "My lawyer says your new partner is a problem. Just thought you should know.",
        school: "FYI I'll be at the school concert. Try not to embarrass the kids.",
        kids: "The kids told me all about your weekend. Interesting choices.",
      }}}),
  L({day: 12, week: 2, title: 'History is not on the agenda', skill: 'No relitigating', minutes: 3,
    read: [
      'The marriage, the separation, who said what in 2021 — none of it is a topic for co-parenting messages. When the other parent drags up the past, the past stays there.',
      'You do not need to correct the record. Your journal is the record. Your reply is only about the next pickup, the next bill, the next school form.',
      'A useful phrase in your head (not your message): "That\'s a past conversation. What do the kids need this week?"',
    ],
    example: {
      them: "You walked out on this family and now you want a say in summer camp?",
      bad: "I didn't walk out, you know exactly why I left and I'm not going to let you rewrite history.",
      good: "For camp, I'd like Emma to do the two-week art camp in July. I can cover the deposit. What dates work for you?",
      why: 'Ignores the history completely and moves to the decision.',
    },
    drill: {task: 'Reply without touching the past. Only this week, only the kids.', goal: 'No mention of the relationship, the separation or old events.',
      messages: {
        schedule: "After everything you did, you think you get Christmas morning? Give me one reason.",
        money: "You left me with the debt and now you want me to split ballet? Unbelievable.",
        partner: "You were seeing him before we split, weren't you. And now the kids have to meet him.",
        school: "You never went to a single school meeting when we were married. Why start now?",
        kids: "Noah asked why you left. I told him the truth. Your turn to explain yourself.",
      }}}),
  L({day: 13, week: 2, title: 'The new-partner hook', skill: 'Keep partners out', minutes: 2,
    read: [
      'New partners are one of the hottest triggers in co-parenting. Messages about them are rarely about logistics and almost always about hurt.',
      'Keep partners out of your replies unless there is a real child-related question (who is driving, who is supervising). Answer that question with facts. Do not defend the person, and do not attack theirs.',
      'If your parenting plan or order says something about introductions or overnight guests, follow it and refer to it — no more.',
    ],
    example: {
      them: "I don't want that woman anywhere near my kids.",
      bad: "That woman has a name, and she's been nothing but kind to them, unlike some people.",
      good: "I'll do pickup and drop-off myself. The kids are with me the whole weekend.",
      why: 'Answers the underlying worry (who is with the kids) and nothing else.',
    },
    drill: {task: 'Reply without defending or criticising any partner. Answer only the practical concern.', goal: 'No opinion about any partner; one practical answer.',
      messages: {
        schedule: "Is your boyfriend doing the exchange again? Because if he is, I'm not handing them over.",
        money: "I'm not paying half of anything while your girlfriend lives there for free.",
        partner: "Emma says your new girlfriend tucks her in. That's MY job. Stop it.",
        school: "Your new partner showed up at the school pickup. The teacher asked me who she was. Explain.",
        kids: "Noah called your boyfriend 'dad' by accident and cried about it. Happy now?",
      }}}),
  L({day: 14, week: 2, title: 'The late-night message', skill: 'Pause, then reply', minutes: 2,
    read: [
      'Messages that arrive late at night are often the most heated — and replies written late at night are the ones people regret.',
      'Unless it is urgent for the kids, it can wait until morning. Draft now if it helps you sleep; send after coffee, after reading it once more.',
      'This week\'s skills, together: spot the hook, stay gray, one topic, no history.',
    ],
    example: {
      them: "(11:48 pm) I can't believe you. Lying awake because of you again. You've ruined everything and the kids see it.",
      bad: "(11:52 pm) Ruined everything? Look in a mirror.",
      good: "(8:10 am) Morning. Pickup is still 5:00 today at school.",
      why: 'Next-morning, gray, one topic.',
    },
    drill: {task: 'This came in at 11:48 pm. Write the reply you would send in the morning.', goal: 'Calm, short, ignores the bait, handles any real logistics.',
      messages: {
        schedule: "(11:48 pm) You think you can just change Sunday because you feel like it?? The kids were counting on it. You're selfish. Answer me.",
        money: "(11:48 pm) I just saw the bill. You charged the kids' card for YOUR stuff didn't you. I'm done. Answer me.",
        partner: "(11:48 pm) Why is she posting photos with MY kids at midnight? Answer me right now.",
        school: "(11:48 pm) Emma just told me she's failing math and you KNEW. You hid it. What else are you hiding?",
        kids: "(11:48 pm) Noah called me crying from your house. What did you do? Call me NOW.",
      }}}),

  // ---------------- Week 3 — Boundaries & firm requests ----------------
  L({day: 15, week: 3, title: 'A boundary is what you will do', skill: 'Boundaries', minutes: 3,
    read: [
      'A boundary is not "you must stop yelling." You can\'t control that. A boundary is what you will do: "I\'ll answer messages about the kids by text. I won\'t continue phone calls that turn into arguments."',
      'State it once, calmly, without threat. Then follow it every time. Consistency does the work.',
      'Boundaries about channels (text, not calls), times (not after 9 pm), and topics (kids only) are the most useful.',
    ],
    example: {
      them: "Pick up the phone! I've called you six times!",
      bad: "Stop harassing me or I'm calling the police.",
      good: "I'll answer anything about the kids by text so we both have it in writing. What do you need for Saturday?",
      why: 'A boundary about yourself, plus an open door for the real question.',
    },
    drill: {task: 'Set one calm boundary about what YOU will do, then handle the real question.', goal: 'Boundary phrased as your own action, no threat.',
      messages: {
        schedule: "I'm calling you tonight to sort out the holidays and you'd better answer this time.",
        money: "Call me so we can discuss money. I'm not doing this over text.",
        partner: "I'm coming to the door at pickup to meet your boyfriend whether you like it or not.",
        school: "I'll be texting the kids' teacher about you too since you won't listen to me.",
        kids: "I'm going to keep calling Emma on your nights until you answer me.",
      }}}),
  L({day: 16, week: 3, title: 'Ask with a date', skill: 'Requests + deadline', minutes: 2,
    read: [
      'A request without a date is a wish. A firm request has three parts: what, by when, and what you will do if there is no answer.',
      '"Please send your half ($60) by Friday the 22nd. If I don\'t hear back, I\'ll note it and raise it at mediation." Clear, polite, finished.',
      'Deadlines also help your record: they show you asked reasonably and gave time.',
    ],
    example: {
      them: "I'll get you the passport eventually.",
      bad: "Eventually? Seriously? You're impossible.",
      good: "I need Emma's passport by Monday the 4th for the trip we agreed on. I can pick it up from your porch Sunday evening.",
      why: 'What, when, and an easy way to make it happen.',
    },
    drill: {task: 'Make one clear request with a specific date or time.', goal: 'A specific ask + a specific date; polite; no threat.',
      messages: {
        schedule: "Yeah yeah, I'll tell you about the summer schedule when I know.",
        money: "I'll pay you back for the glasses at some point. Stop nagging.",
        partner: "I'll think about whether the kids can go to your partner's family thing. Don't rush me.",
        school: "I'll sign the permission slip when I get around to it.",
        kids: "I'll give Noah's tablet back when he's earned it. It's at my house, deal with it.",
      }}}),
  L({day: 17, week: 3, title: 'Let the plan be the referee', skill: 'Point to the order', minutes: 2,
    read: [
      'If you have a parenting plan or court order, it can do the arguing for you. "Per our parenting plan, section 4…" is not personal — it is the agreement you both live under.',
      'Quote or paraphrase it briefly. Don\'t interpret it aggressively, and don\'t threaten with it.',
      'If you don\'t have a plan yet, refer to the pattern you have both been following: "As we\'ve done since September…"',
    ],
    example: {
      them: "I'm keeping them for spring break. I deserve it after this year.",
      bad: "You don't 'deserve' anything, read the order, my lawyer will be in touch.",
      good: "Our parenting plan has spring break with me in even years. I'll pick them up Saturday the 15th at 10.",
      why: 'The plan decides; you just follow it.',
    },
    drill: {task: 'Reply by pointing calmly to the parenting plan (or your usual arrangement).', goal: 'References the plan/arrangement neutrally; no threat, no lawyer talk.',
      messages: {
        schedule: "I'm taking them for the whole first week of summer. Don't bother arguing.",
        money: "I'm not paying for extracurriculars anymore. They're your idea.",
        partner: "From now on your boyfriend can't be at your house on your weekends. My rule.",
        school: "I'm the one who decides about school. I'm their real parent.",
        kids: "The kids don't have to come to you if they don't want to. Emma doesn't want to.",
      }}}),
  L({day: 18, week: 3, title: 'Kids are not messengers', skill: 'Adults talk to adults', minutes: 3,
    read: [
      'When messages arrive through the children — "Mom says you owe her money", "Dad says I can stay longer" — the kids are carrying adult weight.',
      'Gently move the conversation back to the adults: "Please message me directly about schedule changes so the kids don\'t have to carry it." Don\'t blame, don\'t ask the kids to carry an answer back.',
      'Courts pay close attention to whether a parent keeps kids out of the middle.',
    ],
    example: {
      them: "Didn't Emma tell you? I said she's staying with me Sunday night.",
      bad: "Emma is eight. Stop using her as your secretary.",
      good: "Emma mentioned it. Please message me directly about changes so she doesn't have to. Sunday at 6 still works for me.",
      why: 'Redirects to adults, kindly, and answers.',
    },
    drill: {task: 'Reply in a way that moves the conversation back to the adults, without blame.', goal: 'Asks for direct communication; no blame; kids kept out.',
      messages: {
        schedule: "I told Noah to tell you I'm picking them up early Friday. Did he not say?",
        money: "Emma will tell you how much you owe for her ballet. She knows.",
        partner: "I asked the kids to let you know I'm not comfortable with your partner. They said they would.",
        school: "Noah was supposed to give you the report card. Not my problem if he didn't.",
        kids: "Emma says you said she can get a phone. Tell her yourself that you're wrong.",
      }}}),
  L({day: 19, week: 3, title: 'No, kindly', skill: 'Declining', minutes: 2,
    read: [
      'You are allowed to say no to a swap, an extra night, or a change. A good no is short and does not over-explain: "That doesn\'t work for me this time."',
      'Offer an alternative only if you genuinely mean it. Never pretend to consider something you\'ve already decided.',
      'Explanations invite negotiation. One reason, at most.',
    ],
    example: {
      them: "I need you to take them Wednesday. My plans changed.",
      bad: "I'm sorry, I really wish I could, it's just that I have this thing and my boss is really strict and...",
      good: "Wednesday doesn't work for me this week. Thursday I could do from 4.",
      why: 'A clean no and a genuine alternative.',
    },
    drill: {task: 'Say no clearly and kindly. At most one reason; an alternative only if real.', goal: 'Clear "no", no over-explaining, no apology spiral.',
      messages: {
        schedule: "Take them this Saturday too. You owe me after last month.",
        money: "I need you to cover all of camp this year. I'm short. You can afford it.",
        partner: "Bring the kids to my boyfriend's birthday on your Sunday. It's important to me.",
        school: "You're doing all the school runs next month. I'm busy.",
        kids: "Noah wants an extra night with me on your week. You're going to say yes, right?",
      }}}),
  L({day: 20, week: 3, title: "Threats: don't match, document", skill: 'Threat response', minutes: 3,
    read: [
      '"I\'ll take you to court." "I\'ll tell the kids what you did." Threats are designed to make you scramble. Don\'t answer the threat; answer the child-related part, if any.',
      'Never threaten back. A threat in your own handwriting is the most damaging thing a judge can read.',
      'Log the threat in your journal with the date and exact words. That is how you respond to it.',
    ],
    example: {
      them: "Keep this up and I'll tell the kids exactly why their dad left.",
      bad: "Go ahead, and I'll tell them about you. Let's see who they believe.",
      good: "Please keep adult matters between us. I'll have them ready at 5 on Friday.",
      why: 'One calm sentence about the kids; the threat goes in the journal.',
    },
    drill: {task: 'Reply to a threat without matching it. Child focus only.', goal: 'No counter-threat, no lawyer/court talk, stays calm.',
      messages: {
        schedule: "Cancel on me one more time and I'll make sure you never get another weekend.",
        money: "Pay up by Friday or I'm telling the judge you abandoned them financially.",
        partner: "If she's there when I drop off, I'm calling the cops. Try me.",
        school: "If you show up at the school meeting, I'll make a scene in front of the teacher.",
        kids: "Keep it up and I'll tell the kids what kind of person you really are.",
      }}}),
  L({day: 21, week: 3, title: 'Two good options', skill: 'Offer choices', minutes: 2,
    read: [
      'People argue less when they get to choose. Instead of one proposal that can be rejected, offer two you can genuinely live with.',
      '"I can do pickup at 5 at school, or at 6 at your house. Which works better?" Both are fine for you; they get a say.',
      'This week together: boundaries, dates, the plan as referee, kids out of the middle, kind no, calm under threat, two options.',
    ],
    example: {
      them: "I'm not driving all the way to you again.",
      bad: "Fine, I'll do all the driving forever, as usual.",
      good: "I can meet halfway at the library on Main at 5, or pick up from your place at 6. Which do you prefer?",
      why: 'Two workable choices, nothing to fight about.',
    },
    drill: {task: 'Reply with two concrete options you could live with, and ask them to choose.', goal: 'Exactly two specific options; neutral; firm on the essentials.',
      messages: {
        schedule: "The exchange time doesn't work for me anymore. Figure something out.",
        money: "I can't pay the $300 for Noah's camp at once. Your problem.",
        partner: "I don't want your partner at the handoff. Not negotiable.",
        school: "I'm not doing the Tuesday school run anymore. Work changed.",
        kids: "Emma wants to call me every night at your place but you make it impossible.",
      }}}),

  // ---------------- Week 4 — Court-ready habits ----------------
  L({day: 22, week: 4, title: 'Confirm it in writing', skill: 'Written confirmation', minutes: 2,
    read: [
      'Phone calls and doorstep conversations disappear. When you agree something out loud, send a short confirmation: "To confirm what we discussed at pickup: …"',
      'Keep it factual and neutral, and let them correct it: "Let me know if I\'ve got anything wrong."',
      'This turns a vague memory into a dated record — without sounding like you are building a case.',
    ],
    example: {
      them: "(at pickup) Fine, you can have them for your mom's birthday, whatever.",
      bad: "(text) Just so you can't deny it later, you agreed I get them Saturday.",
      good: "(text) To confirm what we discussed at pickup: I'll have the kids Saturday the 9th from 10 to 6 for my mom's birthday. Let me know if I got anything wrong.",
      why: 'A neutral record of the agreement, with a chance to correct it.',
    },
    drill: {task: 'Write a short written confirmation of what was agreed in person.', goal: 'Starts with "To confirm", states date/time/what, invites correction, no accusation.',
      messages: {
        schedule: "(said at pickup) Okay, you take them the 23rd to the 26th and I get New Year's. Don't make me regret it.",
        money: "(said on the phone) Fine, we'll split the braces 60/40, you pay 60. I'll send the first payment next month.",
        partner: "(said at the door) Alright, your partner can drive them to swim on Thursdays. Only Thursdays.",
        school: "(said after the meeting) Okay, Emma does tutoring Mondays, you drive, I pay.",
        kids: "(said at pickup) Fine, Noah can call me at 7 on your nights. Just make sure he does.",
      }}}),
  L({day: 23, week: 4, title: 'Dates, times, amounts', skill: 'Precise details', minutes: 2,
    read: [
      'The messages a GAL or custody evaluator finds most useful are the boring ones: "Picked up at 5:42 pm, scheduled 5:00." "Sent $120 on Oct 3."',
      'Use exact dates ("Friday, March 14") instead of "this weekend". Exact amounts instead of "half". Exact times instead of "late".',
      'Precision also prevents misunderstandings — which prevents the next fight.',
    ],
    example: {
      them: "You owe me for some school stuff.",
      bad: "I don't owe you anything, I paid for stuff too.",
      good: "Could you send the receipts? I'll pay my half within 7 days of getting them. My records show I paid $46 for the art supplies on Sept 12.",
      why: 'Every claim has a date and a number.',
    },
    drill: {task: 'Reply using exact dates, times or amounts. No vague words like "late", "soon" or "half".', goal: 'At least two specific details; no vague time/money words.',
      messages: {
        schedule: "You were super late last week and I'm sick of it. Be on time this weekend.",
        money: "You still owe me for a bunch of stuff from the summer.",
        partner: "Your girlfriend kept the kids out late again on Saturday. Not okay.",
        school: "You missed some of the school stuff this month, again.",
        kids: "Noah says he hasn't talked to you in ages. Maybe call him sometime.",
      }}}),
  L({day: 24, week: 4, title: 'Expenses with receipts', skill: 'Reimbursement requests', minutes: 2,
    read: [
      'Money fights shrink when every request looks the same: what it was for, the date, the total, their share, a receipt, and a reasonable deadline.',
      '"Noah\'s co-pay at Dr. Patel, Oct 3: $70. Your half is $35, receipt attached. Could you send it by Oct 17?" No commentary.',
      'Log the request and the payment in your journal. Patterns of non-payment become obvious without you saying a word.',
    ],
    example: {
      them: "Why should I pay for the soccer cleats? I didn't pick them.",
      bad: "Because they're your son's feet?? Are you serious right now?",
      good: "The cleats were $64 on Sept 2 (receipt attached). Our plan splits extracurricular costs 50/50, so your half is $32. Could you send it by Sept 20?",
      why: 'Everything a judge needs, nothing to fight over.',
    },
    drill: {task: 'Write a reimbursement request: item, date, total, their share, receipt, deadline.', goal: 'All six parts; no commentary on their behaviour.',
      messages: {
        schedule: "I'm not paying for the extra daycare day. That was your schedule change, not mine.",
        money: "Send me receipts for everything or I'm not paying a cent. Everything.",
        partner: "I'm not paying for anything your girlfriend bought them.",
        school: "What do you mean I owe for the school trip? Nobody told me.",
        kids: "Emma says you bought her new glasses. If you want money for them, you should have asked first.",
      }}}),
  L({day: 25, week: 4, title: 'Answer an accusation with facts', skill: 'Factual response', minutes: 3,
    read: [
      'Some accusations are serious enough that silence could look like agreement: neglect, safety, health. Answer them — once, with facts, without heat.',
      'State what happened with times and details, what you did, and what you will do next. No counter-accusation.',
      'Then log it. If it ever matters, your calm, dated answer is far stronger than an angry one.',
    ],
    example: {
      them: "You sent Noah to school with a 102 fever. What kind of parent does that?",
      bad: "He did NOT have a fever, you're making this up to make me look bad.",
      good: "His temperature was 98.9 at 7:15 this morning. The nurse called me at 11 and I picked him up at 11:40. He's resting at home and I'll keep him home tomorrow.",
      why: 'Times, readings, actions, next step. Nothing to dispute.',
    },
    drill: {task: 'Answer the accusation once, with times and details. No counter-accusation.', goal: 'Specific facts, what you did, next step; no blame back.',
      messages: {
        schedule: "You left the kids alone in the car at the exchange. Noah told me. That's neglect.",
        money: "You didn't buy Noah's medication this month. He ran out at your house.",
        partner: "Your boyfriend yelled at Emma. She's scared to go back. What are you doing about it?",
        school: "Emma says you never make her do homework. Her teacher is worried. This is on you.",
        kids: "Noah came back with a bruise on his arm. What happened at your house?",
      }}}),
  L({day: 26, week: 4, title: 'Log it, then answer it', skill: 'Reply vs record', minutes: 2,
    read: [
      'Your reply and your record do different jobs. The reply moves the week forward. The record — your journal — keeps the facts.',
      'When something worth remembering happens (a no-show, a threat, a missed payment), the reply stays short and neutral, and the details go in the journal with the date and time.',
      'That way you never need to "win" in a message. The pattern speaks later.',
    ],
    example: {
      them: "Didn't show because something came up. Not that it's your business.",
      bad: "Third no-show this month!! I'm keeping a list and the judge will see it!!",
      good: "Okay. The kids are with me tonight; next exchange is Sunday at 6. (Journal: no-show, Fri 5:00, scheduled exchange, third this month.)",
      why: 'A calm reply. The count lives in the record, not the message.',
    },
    drill: {task: 'Write the short neutral reply you would send. (Keep the score-keeping for your journal.)', goal: 'No counting, no "again", no "I\'m keeping track"; next step only.',
      messages: {
        schedule: "Not coming tonight. Something came up. Sunday maybe.",
        money: "Support's going to be late this month. You'll get it when you get it.",
        partner: "I let my new partner pick them up today since you weren't answering. Whatever.",
        school: "Didn't make it to the conference. Tell me what they said I guess.",
        kids: "Told the kids they can call me whenever they want from your house. Don't stop them.",
      }}}),
  L({day: 27, week: 4, title: 'The calm handoff', skill: 'Logistics only', minutes: 2,
    read: [
      'Handoffs are where conflict happens in front of the kids. The message before a handoff should be pure logistics: time, place, what\'s in the bag.',
      'If a handoff is regularly tense, propose a neutral spot (school, a library) or a curbside exchange, by message, in advance.',
      'Kids remember the handoff more than the weekend. Keep it boring.',
    ],
    example: {
      them: "Bring them at 6 and don't come to the door this time.",
      bad: "I'll come to the door if I want, they're my kids too.",
      good: "I'll have them at the curb at 6:00 with their backpacks and Noah's inhaler.",
      why: 'Logistics only; agrees to a calmer exchange.',
    },
    drill: {task: 'Write a pure-logistics handoff message (time, place, what\'s coming).', goal: 'Time + place + items; nothing else.',
      messages: {
        schedule: "Exchange is at 5 tomorrow. Don't be late and don't bring drama.",
        money: "When you drop off, bring the $60 for the field trip. Cash.",
        partner: "When you drop them off Sunday, come alone.",
        school: "Drop them at school Monday, and make sure Emma has her project. Last time she didn't.",
        kids: "Noah says he left his blanket at your place. He can't sleep without it. Bring it.",
      }}}),
  L({day: 28, week: 4, title: 'Your playbook', skill: 'Everything together', minutes: 3,
    read: [
      'Four weeks: brief, factual, friendly, firm. Spot the hook, gray rock, one topic, no history. Boundaries, dates, the plan as referee, kids out of the middle. Confirmations, precise details, receipts, a record that speaks for you.',
      'Today\'s drill is the hardest kind of message. Compare your score with your day-1 drill. That difference is the skill you built.',
      'Keep going: every message from here is practice, and every calm reply is one more page of a record you will be glad to have.',
    ],
    example: {
      them: "You've turned the kids against me, you're behind on everything, and if you don't let me have them for the holidays I'll make your life hell in court.",
      bad: "I've turned them against you? You did that yourself. Go ahead and take me to court, I'd love that.",
      good: "For the holidays, the parenting plan has the kids with me Dec 24–26 this year and with you Dec 31–Jan 2. I'll pick them up Dec 24 at 10 am.",
      why: 'Every hook ignored; plan, dates, next step.',
    },
    drill: {task: 'The final drill. Use everything: BIFF, no bait, one topic, specific details.', goal: 'A reply you would be proud to see as an exhibit.',
      messages: {
        schedule: "You've been late 5 times, you cancel constantly, and now you want the long weekend? Over my dead body. I'll call my lawyer Monday.",
        money: "You're $400 behind, you buy yourself new things every week, and if you don't pay by Friday I'm going to the judge and telling him everything.",
        partner: "You chose that person over your kids. They're crying every time they come back. If she's there this weekend, they're not coming. Period.",
        school: "Emma is failing because of you, you never read the teacher's emails, and I'm enrolling her in a new school whether you agree or not.",
        kids: "Noah says he hates going to your house and I'm not going to force him anymore. Maybe ask yourself why your own son doesn't want to see you.",
      }}}),
];

export const TOTAL_DAYS = LESSONS.length;
export const lessonFor = (day: number) => LESSONS[Math.min(Math.max(1, day), TOTAL_DAYS) - 1];

/** The quiz stores answers under keys the FUNNEL module picks; read the trigger from anything that looks like one. */
export function triggerFromQuiz(quiz: Record<string, unknown> | undefined): Trigger | undefined {
  if (!quiz) return;
  const keys = Object.keys(quiz).sort((a, b) => score(b) - score(a));
  function score(k: string) { return /topTrigger/i.test(k) ? 3 : /trigger/i.test(k) ? 2 : /sets|off|topic/i.test(k) ? 1 : 0; }
  for (const k of keys) {
    if (score(k) === 0) continue;
    const v = quiz[k];
    const vals = Array.isArray(v) ? v : [v];
    for (const x of vals) { const t = matchTrigger(String(x ?? '')); if (t) return t; }
  }
}
export function matchTrigger(s: string): Trigger | undefined {
  const x = s.toLowerCase();
  if (/sched|swap|time|pickup|holiday/.test(x)) return 'schedule';
  if (/money|pay|support|expens|fee|cost/.test(x)) return 'money';
  if (/partner|boyfriend|girlfriend|new_?p/.test(x)) return 'partner';
  if (/school|health|doctor|medical/.test(x)) return 'school';
  if (/messeng|kids|child|middle/.test(x)) return 'kids';
}

/** The drill message for a day: the person's own trigger, or a rotation so a guest still sees variety. */
export function drillFor(day: number, trigger?: Trigger) {
  const l = lessonFor(day);
  const t = trigger ?? TRIGGERS[(day - 1) % TRIGGERS.length];
  return {trigger: t, message: l.drill.messages[t], task: l.drill.task, goal: l.drill.goal};
}

/* ---- API shapes for /api/plan (the page imports these as types only) ---- */
export interface DrillAttempt {
  id: string; day: number; attempt: number; at: string; draft: string; score: number;
  lens: import('../shared/types.js').LensFlag[]; better: string; trigger: Trigger; message: string; demo?: boolean;
}
export type DayStatus = 'done' | 'today' | 'open' | 'upcoming' | 'locked';
/** Today's choice session as the page gets it. `good` travels too: the feedback is instant and there is nothing to win. */
export interface SessionView {
  day: number; skill: string; rule: string;
  questions: {id: string; trigger: import('./drill-bank.js').Trigger; them: string; options: {text: string; tag: string; good: boolean}[]}[];
}
export interface SessionResult {
  correct: number; total: number; firstTimeToday: boolean; streak: number; skill: string; skillTrend: {day: number; pct: number}[];
}
export interface PlanView {
  session: SessionView | null;  // today's session; null while the day is behind the paywall
  sessionToday: {correct: number; total: number; rounds: number} | null;  // best of today's finished sessions
  skill: string; rule: string;  // today's pack
  skillTrend: {day: number; pct: number}[];  // first session's % per day, today's skill when it has 2+ points
  day: number;                 // the person's current plan day (may run past 28)
  viewDay: number;             // the day shown
  total: number;
  access: 'full' | 'free';
  demo: boolean;
  now: string;
  trigger: Trigger; triggerLabel: string; personalised: boolean;
  streak: number; calmDays: number; activeToday: boolean;
  calmList: number[];          // plan days that were calm (practised, no risky reply sent), up to today
  days: {day: number; week: number; title: string; status: DayStatus; first?: number; best?: number}[];
  weeks: {week: number; title: string; sub: string; drills: number; avgBest: number | null; replies: number; entries: number; current: boolean}[];
  lesson: Lesson | null;
  locked?: 'upcoming' | 'paywall';
  drill: {message: string; task: string; goal: string; attempts: DrillAttempt[]} | null;
  trend: {day: number; first: number; best: number}[];
  firstScore: number | null; latestScore: number | null;
  renewal: {until: string; daysLeft: number; price: string; remind: boolean} | null;
}

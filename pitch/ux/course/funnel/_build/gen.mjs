// Builds ../variants.html: quiz + onboarding mockups for the 28-day course framing.
// node gen.mjs && node render.mjs && python3 sheets.py
import fs from 'node:fs';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '../../../../..'); // parley/
const sprite = fs.readFileSync(path.join(root, 'src/icons.svg.html'), 'utf8') + fs.readFileSync(path.join(root, 'src/icons-parley.svg.html'), 'utf8');
const people = (n) => '../../../../src/assets/people/' + n + '.svg';

const ic = (id, s = 44) => `<svg class="ic" width="${s}" height="${s}"><use href="#${id.startsWith('p-') ? id : 'i-' + id}"/></svg>`;
const logo = `<span class="logo"><span class="lm"><svg width="20" height="20" viewBox="0 0 24 24"><use href="#p-mark"/></svg></span>Parley</span>`;
const qbar = (n, of, label = '') => `<div class="qtop"><span class="back"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${logo}<div class="prog"><span>${label || n + ' of ' + of}</span><i><b style="width:${Math.round(n / of * 100)}%"></b></i></div></div>`;
const opt = (icon, t, s, sel = false, kind = 'radio') => `<div class="opt${sel ? ' sel' : ''}">${ic(icon, 44)}<div><b>${t}</b>${s ? `<small>${s}</small>` : ''}</div><span class="${kind}${sel ? ' on' : ''}"></span></div>`;
const legal = `<p class="legal">Parley is not a law firm and doesn't give legal advice.</p>`;
const them = (bubbles, at) => `<div class="burst">${bubbles.map((b) => `<span class="bub">${b}</span>`).join('')}${at ? `<em>${at}</em>` : ''}</div>`;
const mine = (t, cls = '') => `<div class="mine ${cls}"><span class="bub me">${t}</span></div>`;
const verdict = (w, k) => `<span class="chip ${k}">${w}</span>`;
const cta = (t, sub = '') => `<div class="cta"><span class="btn-primary">${t}</span>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;

const ph = (id, title, body, cls = '') => ({ id, title, html: `<section class="phone ${cls}" id="${id}"><div class="haze"></div>${body}</section>` });

/* ---------------- QUIZ ---------------- */
const quizA = [
  ph('qa1', 'Pick yours', `
  <div class="top">${logo}<span class="pill">Sample case</span></div>
  <div class="center pad">
    <span class="eyebrow">28-day calm co-parenting course</span>
    <h1 class="h1c">Stay calm with your ex.<br><span class="gt">Learn it in 28 days.</span></h1>
    <p class="lead">3 minutes a day · Pick yours to start</p>
  </div>
  <div class="who">
    ${[['mom-25-34', 'Mom · 25 to 34', 'v'], ['mom-35-45', 'Mom · 35 to 45', 'p'], ['dad-25-34', 'Dad · 25 to 34', 's'], ['dad-35-45', 'Dad · 35 to 45', 'm']].map(([f, l]) => `<div class="wc"><img src="${people(f)}" alt=""><div class="wl">${l}<span class="go">›</span></div></div>`).join('')}
  </div>
  <p class="terms">By continuing you agree to our <u>Terms</u> and <u>Privacy Policy</u></p>
  ${legal}`),
  ph('qa2', 'Skill question', `
  ${qbar(3, 10)}
  <div class="pad"><h2>When they text something <span class="gt">unfair</span>, what do you usually do?</h2>
  <p class="q-sub">Be honest. Nobody sees this but you.</p></div>
  <div class="opts">
    ${opt('re-fast', 'Answer right away', 'And say exactly what I think')}
    ${opt('re-long', 'Write a long explanation', 'So they finally get it', true)}
    ${opt('re-quiet', 'Go quiet for hours', 'Then answer when I have to')}
    ${opt('re-friend', 'Screenshot it to a friend', 'Before I decide what to say')}
  </div>`),
  ph('qa3', 'Insight', `
  ${qbar(4, 10)}
  <div class="pad"><span class="chip">You're not alone in this</span>
  <h2 style="margin-top:12px">Long replies feel fair. They usually make the <span class="gt">thread longer</span>.</h2></div>
  <div class="card ins">
    <div class="split2">
      <div><p class="k">A long reply</p><div class="mini">${them(['ur late AGAIN'])}${mine('ok first of all I was not late, the school let out at 3:15 and...', 'tiny')}${them(['here we go', 'always an excuse w u', 'and what about last month??'])}${mine('...', 'tiny')}</div><p class="tail warn">Keeps going</p></div>
      <div><p class="k">A short one</p><div class="mini">${them(['ur late AGAIN'])}${mine('On my way, 10 min out.', 'tiny')}${them(['k.'])}</div><p class="tail ok">Done</p></div>
    </div>
    <p class="note">Every extra sentence is something new to argue with. Answering only what they asked is a skill, and it can be practised.</p>
  </div>
  <div class="card row lesson">${ic('brief', 40)}<div><small>In your course</small><b>Week 1 · One message, not five</b></div></div>
  ${cta('Continue')}`),
  ph('qa4', 'Your starting point', `
  ${qbar(10, 10, 'Your result')}
  <div class="pad"><h2>Your <span class="gt">starting point</span></h2><p class="q-sub">Based on your answers. These are skills, and skills move.</p></div>
  <div class="card list">
    ${[['re-quiet', 'Pausing before you reply', 'Needs work', 'warn'], ['no-bait', 'Not taking the bait', 'Needs work', 'warn'], ['brief', 'Keeping it short', 'Getting there', 'amber'], ['boundary', 'Asking for things clearly', 'Getting there', 'amber'], ['two-homes', 'Keeping kids out of it', 'Strong', 'ok']].map(([i, t, w, k]) => `<div class="lr">${ic(i, 36)}<b>${t}</b>${verdict(w, k)}</div>`).join('')}
  </div>
  <div class="card row soft">${ic('tr-money', 40)}<div><small>Hardest for you</small><b>Money and the new partner</b></div></div>
  <div class="card row lesson">${ic('path', 40)}<div><small>What this means</small><b>Your course opens with the pause. Skills you already have get fewer days.</b></div></div>
  ${cta('Build my course')}`),
];

const quizB = [
  ph('qb1', 'Skill check intro', `
  <div class="top">${logo}<span class="pill">Sample case</span></div>
  <div class="pad" style="margin-top:8px"><span class="eyebrow">28-day calm co-parenting course</span>
  <h1>How calm are your replies, <span class="gt">really?</span></h1>
  <p class="lead l">4 real texts. Pick what you'd send. We'll show you where your course starts.</p></div>
  <div class="card phonecard">
    <p class="k">Co-parent · 9:41 PM</p>
    ${them(['so ur not coming sat??', 'emma has been asking all week', 'unreal'], '9:41 PM')}
    <div class="typing"><i></i><i></i><i></i></div>
  </div>
  <div class="seg"><span class="on">I'm a mom</span><span>I'm a dad</span></div>
  ${cta('Start the skill check', 'About 2 minutes · No sign-up')}
  ${legal}`),
  ph('qb2', 'Scenario question', `
  ${qbar(1, 4, 'Text 1 of 4')}
  <div class="pad"><span class="chip">Skill · Not taking the bait</span><h2 style="margin-top:10px">They send this. <span class="gt">What do you send?</span></h2></div>
  <div class="card phonecard sm">${them(['ur late AGAIN', 'kids been waiting 20 min in the school lot', 'must be nice to not care 🙄'], '3:52 PM')}</div>
  <div class="opts tight">
    ${['wow ok. maybe if u told me pickup moved i wouldnt be late', 'sorry!! my fault, it won\'t happen again', 'On my way, 10 min out.'].map((t, i) => `<div class="opt txt${i === 0 ? ' sel' : ''}"><span class="bub me2">${t}</span><span class="radio${i === 0 ? ' on' : ''}"></span></div>`).join('')}
  </div>`),
  ph('qb3', 'Feedback', `
  ${qbar(1, 4, 'Text 1 of 4')}
  <div class="pad"><span class="chip chip-amber">The one most of us pick</span><h2 style="margin-top:10px">It feels fair. It also <span class="gt">answers the jab</span>.</h2></div>
  <div class="card cmp">
    <p class="k">You picked</p>${mine('wow ok. maybe if u told me pickup moved i wouldnt be late', 'l')}
    <p class="why warn">Starts an argument about who's to blame. The kids are still in the lot.</p>
    <hr>
    <p class="k">Calmer</p>${mine('On my way, 10 min out.', 'l')}
    <p class="why ok">Answers the one real thing: when you'll get there.</p>
  </div>
  <div class="card row lesson">${ic('no-bait', 40)}<div><small>Day 3 of your course</small><b>Reply to the ask, not the jab</b></div></div>
  ${cta('Next text')}`),
  ph('qb4', 'Your starting point', `
  ${qbar(4, 4, 'Your result')}
  <div class="pad"><h2>Your <span class="gt">starting point</span></h2><p class="q-sub">From the 4 texts you answered.</p></div>
  <div class="card list">
    ${[['Late pickup', 'Took the bait', 'warn', 'Week 1'], ['Money for soccer', 'Over-explained', 'amber', 'Week 3'], ['New partner at handoff', 'Took the bait', 'warn', 'Week 2'], ['Weekend swap', 'Calm and clear', 'ok', 'Done']].map(([t, w, k, wk]) => `<div class="lr"><div class="grow"><b>${t}</b><small>${wk === 'Done' ? 'Already a strength' : 'Practised in ' + wk}</small></div>${verdict(w, k)}</div>`).join('')}
  </div>
  <div class="card soft says"><p><b>In words:</b> you stay calm about plans, and get pulled in when they make it personal. That's the most common place to start, and the most fixable.</p></div>
  <div class="card row lesson">${ic('path', 40)}<div><small>Your course starts with</small><b>Week 1 · Stop the spiral, then the bait</b></div></div>
  ${cta('Build my course')}`),
];

const quizC = [
  ph('qc1', 'Hardest topics', `
  ${qbar(2, 9)}
  <div class="pad"><h2>What's <span class="gt">hardest</span> to text about?</h2><p class="q-sub">Pick all that apply. Your course spends more days on these.</p></div>
  <div class="grid">
    ${[['tr-money', 'Money', 1], ['tr-schedule', 'Schedule changes', 0], ['tr-partner', 'New partner', 1], ['tr-messenger', 'Kids in the middle', 0], ['tr-past', 'The past dragged up', 1], ['tr-school', 'School and health', 0]].map(([i, t, s]) => `<div class="tile${s ? ' sel' : ''}">${ic(i, 52)}<b>${t}</b><span class="check${s ? ' on' : ''}"></span></div>`).join('')}
  </div>
  ${cta('Continue', '3 selected')}`),
  ph('qc2', 'Agree scale', `
  ${qbar(5, 9)}
  <div class="pad"><p class="k">Does this sound like you?</p>
  <div class="card quote"><p>"When they bring up the past, I end up <b>defending myself</b> for an hour."</p></div></div>
  <div class="scale">
    ${['Not me', 'Rarely', 'Sometimes', 'Often', "That's me"].map((t, i) => `<div class="sc${i === 3 ? ' sel' : ''}"><span class="dot d${i}"></span>${t}</div>`).join('')}
  </div>
  <div class="card row soft" style="margin-top:22px">${ic('tr-past', 40)}<div><small>Why we ask</small><b>Defending is a habit. Week 2 swaps it for one line about now.</b></div></div>`),
  ph('qc3', 'Insight', `
  ${qbar(6, 9)}
  <div class="pad"><span class="chip">How the course works</span><h2 style="margin-top:12px">Calm is a skill. You get it the way you get any skill: <span class="gt">reps</span>.</h2></div>
  <div class="card day">
    <div class="dstep"><span class="n">1</span><div><b>1-minute lesson</b><small>One idea, one real example</small></div></div>
    <div class="dstep"><span class="n">2</span><div><b>2-minute practice</b><small>5 texts about money and the new partner, written like your ex texts</small></div></div>
    <div class="dstep"><span class="n">3</span><div><b>Try it today</b><small>Optional. One small thing for your real thread</small></div></div>
  </div>
  <div class="card drill"><p class="k">Practice preview</p>${them(['just a friendly reminder 🙂 that SOME of us pay for soccer on time'])}<div class="pick">${['lol ok', "I'll send my half by Friday."].map((t, i) => `<span class="bub me2${i ? ' good' : ''}">${t}</span>`).join('')}</div></div>
  ${cta('Continue')}`),
  ph('qc4', 'Your starting point', `
  ${qbar(9, 9, 'Your result')}
  <div class="pad"><h2>Your <span class="gt">starting point</span></h2><p class="q-sub">Where you are now, and where 28 days of practice can take you.</p></div>
  <div class="card ladder">
    ${[['Calm on autopilot', 'Short replies without thinking about it', ''], ['Steady', 'Bait doesn\'t land. Asks are clear.', 'goal'], ['Pausing', 'You catch yourself, sometimes too late', 'you'], ['Reacting', 'Their text sets the tone of your day', '']].map(([t, s, m]) => `<div class="rung ${m}"><span class="pin"></span><div><b>${t}</b><small>${s}</small></div>${m === 'you' ? '<span class="chip">You, today</span>' : m === 'goal' ? '<span class="chip chip-ok">Day 28 goal</span>' : ''}</div>`).join('')}
  </div>
  <div class="tags"><span class="tl0">More days on</span><span class="chip">Money</span><span class="chip">New partner</span><span class="chip">The past</span></div>
  ${cta('Build my course')}`),
];

/* ---------------- ONBOARDING ---------------- */
const weeks = [
  ['brief', 'Week 1', 'Stop the spiral', 'Pause first, then one short message.'],
  ['no-bait', 'Week 2', "Don't take the bait", 'Extra day on the new partner, like you asked.'],
  ['boundary', 'Week 3', 'Boundaries without a fight', 'Two days on money and shared costs.'],
  ['two-homes', 'Week 4', 'Kids first, record kept', 'Talking to the kids, and a calm record.'],
];

const onbA = [
  ph('oa1', 'Building your course', `
  <div class="top">${logo}</div>
  <div class="center pad" style="margin-top:40px">
    <div class="ring"><span class="spin big"></span>${ic('path', 56)}</div>
    <h2 style="margin-top:22px">Building your <span class="gt">course</span>, Sam</h2>
    <p class="q-sub">Picking 28 lessons from what you told us.</p>
  </div>
  <div class="card steps">
    <div class="st done"><span class="tick"></span>Starting from "long explanations"</div>
    <div class="st done"><span class="tick"></span>More days on money and the new partner</div>
    <div class="st now"><span class="spin"></span>Writing practice texts in your co-parent's style</div>
    <div class="st"><span class="dotx"></span>Setting your pace: 3 minutes a day</div>
  </div>
  <div class="barw"><i style="width:68%"></i></div>
  <div class="card row soft">${ic('shield', 40)}<div><small>While you wait</small><b>The other parent never sees Parley. Nothing is sent to them.</b></div></div>`),
  ph('oa2', 'Your 28-day course', `
  <div class="top">${logo}<span class="chip chip-ok">Ready</span></div>
  <div class="pad"><h2>Sam, your <span class="gt">28-day course</span></h2><p class="q-sub">3 minutes a day. Built around money, the new partner and long replies.</p></div>
  <div class="wk">
    ${weeks.map(([i, w, t, s]) => `<div class="card wrow">${ic(i, 42)}<div><small>${w}</small><b>${t}</b><span>${s}</span></div></div>`).join('')}
  </div>
  <div class="card can"><p class="k">By day 28 you'll be able to</p>
    <ul><li>Answer an unfair text in one or two lines</li><li>Say no to a schedule change without a fight</li><li>Keep the kids out of the middle</li></ul></div>
  ${cta('Continue')}`),
  ph('oa3', 'Before and after', `
  <div class="top">${logo}</div>
  <div class="pad"><h2>What changes in <span class="gt">28 days</span></h2></div>
  <div class="card ba">
    <div class="bah"><span></span><span>Now</span><span>Day 28</span></div>
    ${[['Pausing first', 'Needs work', 'warn', 'Steady', 'ok'], ['Ignoring the bait', 'Needs work', 'warn', 'Steady', 'ok'], ['Short replies', 'Getting there', 'amber', 'Strong', 'ok'], ['Clear asks', 'Getting there', 'amber', 'Strong', 'ok']].map(([t, a, ak, b, bk]) => `<div class="bar"><b>${t}</b>${verdict(a, ak)}${verdict(b, bk)}</div>`).join('')}
    <p class="note">Your goal, not a promise. It moves as you practise.</p>
  </div>
  <div class="card bonus"><span class="chip chip-amber">Bonus tools</span><div class="row" style="margin-top:12px">${ic('reply', 40)}<div><b>The reply tool</b><small>For when a real message comes in: paste or screenshot it, get a calm reply in seconds.</small></div></div>
  <div class="row" style="margin-top:12px">${ic('record', 40)}<div><b>Your private record</b><small>Every exchange, dated, in one place.</small></div></div></div>
  ${cta('See my course price')}`),
  ph('oa4', 'Paywall', `
  <div class="top">${logo}<span class="x">Not now</span></div>
  <div class="pad"><h2>Start your <span class="gt">28-day course</span></h2></div>
  <div class="card price">
    <div class="pr-top">${ic('plan-4w', 48)}<div><b>Calm co-parenting course</b><small>28 lessons · 28 practices · bonus tools</small></div></div>
    <div class="pr-num"><span class="big">$19.99</span><span>for your first 4 weeks</span></div>
    <p class="then">then $29.99 every 4 weeks until you cancel</p>
  </div>
  <div class="card inc">
    ${[['book', 'A 1-minute lesson every day'], ['target', '2-minute practice with texts like yours'], ['reply', 'Reply tool, unlimited'], ['record', 'Private record of every exchange']].map(([i, t]) => `<div class="li">${ic(i, 30)}<span>${t}</span></div>`).join('')}
  </div>
  <div class="trust"><span>${ic('refund', 24)}14-day refund</span><span>${ic('one-click', 24)}Cancel in one click</span></div>
  ${cta('Start my course', '$19.99 today, then $29.99 every 4 weeks until you cancel. We remind you 3 days before each renewal.')}
  ${legal}`, 'pay'),
];

const cal = (filled, today) => `<div class="cal">${Array.from({ length: 28 }, (_, i) => `<span class="${i < filled ? 'f w' + Math.floor(i / 7) : ''}${i === today ? ' today' : ''}">${i + 1}</span>`).join('')}</div>`;

const onbB = [
  ph('ob1', 'Building your course', `
  <div class="top">${logo}</div>
  <div class="pad" style="margin-top:12px"><h2>Laying out your <span class="gt">28 days</span></h2><p class="q-sub">Each day: a 1-minute lesson and 2 minutes of practice.</p></div>
  <div class="card">${cal(16, -1)}
    <div class="now-line"><span class="spin"></span>Week 3: adding a second day on money</div></div>
  <div class="card list">
    <div class="lr"><b class="grow">Week 1 · Stop the spiral</b>${verdict('Ready', 'ok')}</div>
    <div class="lr"><b class="grow">Week 2 · Don't take the bait</b>${verdict('Ready', 'ok')}</div>
    <div class="lr"><b class="grow">Week 3 · Boundaries</b>${verdict('Writing', '')}</div>
    <div class="lr"><b class="grow muted">Week 4 · Kids first</b>${verdict('Next', 'mutec')}</div>
  </div>`),
  ph('ob2', 'Your 28-day course', `
  <div class="top">${logo}<span class="chip chip-ok">Ready</span></div>
  <div class="pad"><h2>Day 1 starts <span class="gt">tonight</span></h2></div>
  <div class="card">${cal(28, 0)}
    <div class="legend"><span><i class="w0"></i>Stop the spiral</span><span><i class="w1"></i>Bait</span><span><i class="w2"></i>Boundaries</span><span><i class="w3"></i>Kids first</span></div></div>
  <div class="card today-card"><p class="k">Day 1 · Tonight</p><b>Why replies blow up</b>
    <div class="dd"><span>${ic('book', 26)}1-min lesson</span><span>${ic('target', 26)}2-min practice</span></div>
    <small>Picked for you: you said you write long replies. Day 1 shows what a long reply gives them to argue with.</small></div>
  ${cta('Continue')}`),
  ph('ob3', 'By day 28', `
  <div class="top">${logo}</div>
  <div class="pad"><h2>By day 28, <span class="gt">this</span> is how you reply</h2></div>
  <div class="card phonecard sm">${them(['so now SHE gets to come to the recital?', 'didnt even ask me', 'unbelievable'], '8:14 PM')}
    <div class="vs"><div><p class="k warn">Day 1 you</p>${mine('she\'s been in their life for a year, you need to get over it. and fyi you never ask ME about anything either...', 'l faded')}</div>
    <div><p class="k ok">Day 28 you</p>${mine('I\'ll be there at 6 with the kids. See you there.', 'l')}</div></div></div>
  <div class="card can"><p class="k">Also by day 28</p><ul><li>Saying no to a swap without a fight</li><li>Asking for money with a date, no dig</li><li>Telling the kids about two homes</li></ul></div>
  <div class="card row bonus2">${ic('reply', 36)}<div><small>Bonus</small><b>Reply tool for real messages, any time</b></div></div>`),
  ph('ob4', 'Paywall', `
  <div class="top">${logo}<span class="x">Not now</span></div>
  <div class="pad"><h2>Your course, <span class="gt">step by step</span></h2><p class="q-sub">No surprises. Here's exactly what happens.</p></div>
  <div class="card price sel"><span class="flag">28-day course</span><div class="pr-row"><div><b>First 4 weeks</b><small>All 28 days + the reply tool</small></div><div class="pd"><span>$19.99</span><small>then $29.99 / 4 wks</small></div></div></div>
  <div class="card tl">
    ${[['Today', '$19.99', 'Day 1 opens. All 4 weeks and the reply tool unlock.'], ['Day 14', 'Refund window', 'Not for you? Full refund, no questions.'], ['Day 25', 'Reminder', 'We remind you 3 days before you renew.'], ['Day 28', '$29.99', 'Every 4 weeks after that, until you cancel.']].map(([d, a, s], i) => `<div class="tli${i === 0 ? ' on' : ''}"><span class="tdot"></span><div><b>${d} · ${a}</b><small>${s}</small></div></div>`).join('')}
  </div>
  <div class="trust"><span>${ic('refund', 24)}14-day refund</span><span>${ic('one-click', 24)}Cancel in one click</span></div>
  ${cta('Start Day 1 · $19.99')}
  ${legal}`, 'pay'),
];

const onbC = [
  ph('oc1', 'Building your course', `
  <div class="top">${logo}</div>
  <div class="center pad" style="margin-top:24px">
    <div class="halo"><span class="spin big"></span><b>Week 2</b><small>of 4 written</small></div>
    <h2 style="margin-top:20px">Writing your <span class="gt">course</span></h2>
    <p class="q-sub">Practice texts are written to sound like a real co-parent: lowercase, bursts, the odd 🙄.</p>
  </div>
  <p class="k pad" style="margin-top:4px">What every lesson trains</p>
  <div class="card list">
    ${[['re-quiet', 'Pause', 'Read it twice before you answer'], ['brief', 'Short', 'One message, one or two lines'], ['no-bait', 'On point', 'Answer the ask, skip the jab'], ['two-homes', 'Kids first', 'Nothing you\'d mind them reading']].map(([i, t, s]) => `<div class="lr">${ic(i, 34)}<div class="grow"><b>${t}</b><small>${s}</small></div></div>`).join('')}
  </div>`),
  ph('oc2', 'Your 28-day course', `
  <div class="hero">
    <div class="top">${logo}<span class="chip chip-ok">Made for Sam</span></div>
    <p class="k lt">Your course</p><h2 class="lt">Calm Co-Parenting<br>in 28 Days</h2>
    <div class="meta"><span>28 lessons</span><span>3 min a day</span><span>Money + new partner</span></div>
  </div>
  <div class="acc">
    <div class="card open"><div class="ah"><small>Week 1</small><b>Stop the spiral</b><span class="chev">−</span></div>
      <ol>${['Why replies blow up', 'Pause before you answer', 'Reply to the ask, not the jab', 'Brief and factual', 'Drop "you always"', 'One message, not five', 'When not to answer at all'].map((t, i) => `<li><span>${i + 1}</span>${t}${i === 0 ? '<em>Tonight</em>' : ''}</li>`).join('')}</ol></div>
    ${weeks.slice(1).map(([, w, t]) => `<div class="card ah"><small>${w}</small><b>${t}</b><span class="chev">+</span></div>`).join('')}
  </div>
  ${cta('Continue')}`),
  ph('oc3', 'You now vs day 28', `
  <div class="top">${logo}</div>
  <div class="pad"><h2>You now, and <span class="gt">you on day 28</span></h2></div>
  <div class="vs2">
    ${[['tr-past', 'They bring up the past at 11pm', 'You write back for an hour', 'One line about Saturday. Phone down.'], ['tr-money', 'They say you never pay on time', 'You list every payment since 2023', '"I\'ll send my half by Friday."'], ['tr-partner', 'They won\'t let your partner at handoff', 'A fight in the school lot', 'A calm request with a time']].map(([i, s, a, b]) => `<div class="card sc2"><div class="row">${ic(i, 32)}<b>${s}</b></div><div class="two"><div class="n"><small>Now</small>${a}</div><div class="y"><small>Day 28</small>${b}</div></div></div>`).join('')}
  </div>
  <div class="card row bonus2">${ic('reply', 36)}<div><small>Bonus, included</small><b>The reply tool, for when a real message comes in</b></div></div>
  ${cta('Continue')}`),
  ph('oc4', 'Paywall', `
  <div class="top">${logo}<span class="x">Not now</span></div>
  <div class="pad"><h2>Join the course, <span class="gt">Sam</span></h2></div>
  <div class="card price sel">
    <span class="flag">Your course</span>
    <div class="pr-row"><div><b>4 weeks</b><small>28 days of lessons + bonus tools</small></div><div class="pd"><span>$19.99</span><small>first 4 weeks</small></div></div>
    <p class="then">then $29.99 every 4 weeks · cancel in one click</p>
  </div>
  <div class="card inc">
    ${[['book', '28 lessons, one a day'], ['target', '28 practice sessions'], ['reply', 'Bonus: unlimited reply tool'], ['record', 'Bonus: private record']].map(([i, t]) => `<div class="li">${ic(i, 30)}<span>${t}</span></div>`).join('')}
  </div>
  <div class="night"><div class="row">${ic('refund', 40)}<div><b>14-day refund, no conditions</b><small>Ask within 14 days of your first payment and get it all back.</small></div></div></div>
  ${cta('Start my course', '$19.99 today, then $29.99 every 4 weeks. Cancel in one click.')}
  ${legal}`, 'pay'),
];

const flows = [
  { key: 'quiz', name: 'Quiz', variants: [['A', 'Classic: age cards, behaviour questions, insight, skill verdicts', quizA], ['B', 'Skill check: answer 4 real texts, see feedback, starting point from your picks', quizB], ['C', 'Pain map: hardest topics, agree scale, how a day works, a calm ladder', quizC]] },
  { key: 'onboarding', name: 'Onboarding after the quiz', variants: [['A', 'Checklist loader, week cards, skills before/after, single-plan paywall', onbA], ['B', '28-day calendar fills, Day 1 tonight, reply before/after, honest billing timeline', onbB], ['C', 'What each lesson trains, syllabus accordion, now vs day 28 scenes, guarantee slab', onbC]] },
];

const css = fs.readFileSync(path.join(here, 'style.css'), 'utf8');
const out = `<!doctype html><html><head><meta charset="utf-8"><title>Course funnel variants</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<style>${css}</style></head><body>${sprite}
<header class="doc"><h1>Parley as a 28-day course · quiz + onboarding</h1><p>Proposal mockups, 390×844. Each row is one variant, screens in order.</p></header>
${flows.map((f) => `<h2 class="flow" id="${f.key}">${f.name}</h2>${f.variants.map(([v, d, scr]) => `<div class="variant"><h3>${f.name} ${v}<small>${d}</small></h3><div class="strip">${scr.map((s, i) => `<figure>${s.html}<figcaption>${v}${i + 1} · ${s.title}</figcaption></figure>`).join('')}</div></div>`).join('')}`).join('')}
</body></html>`;
fs.writeFileSync(path.join(here, '../variants.html'), out);
fs.writeFileSync(path.join(here, 'manifest.json'), JSON.stringify(flows.map((f) => ({ key: f.key, name: f.name, variants: f.variants.map(([v, d, scr]) => ({ v, d, screens: scr.map((s) => ({ id: s.id, title: s.title })) })) })), null, 1));
console.log('ok');

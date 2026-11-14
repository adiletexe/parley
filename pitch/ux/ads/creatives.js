// The eight ads as markup, shared by creatives.html (the sheet) and layouts.html (the slide options).
// Fill any element carrying data-ad="1".."8" with that ad.
window.ADS = [
  {name: 'Notes', html: `<div class="ad ad-notes">
    <div class="bar"><span>&lsaquo; Notes</span><span>Done</span></div>
    <h4>Read it the way a judge will.</h4>
    <p>Before you hit send, ask: would a stranger think I'm the calm one?</p>
    <p><s>"ur late AGAIN. shocker"</s></p>
    <p><mark>"On my way, 10 min out."</mark></p>
    <div class="cta"><span>TAP TO TRY</span></div></div>`},

  {name: 'Red pen', html: `<div class="ad ad-imsg">
    <div class="hd"><div class="av">J</div><b>Jess</b></div>
    <div class="m i">ur late AGAIN</div>
    <div class="m i">i literally told u 5</div>
    <div class="row"><span class="pen">no.</span><div class="m o x">lol ok and??<svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M2 22 C20 12 40 30 60 16 S90 26 98 14 M4 30 C30 20 55 34 96 20" fill="none" stroke="#d81e1e" stroke-width="3.2" vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg></div></div>
    <div class="m o" style="margin-top:14px">On my way, 10 min out.</div>
    <div class="pen r">send this one &uarr;</div>
    <div class="cta">Tap to try</div></div>`},

  {name: 'Receipt', html: `<div class="ad ad-receipt">
    <div class="hook">$698 for a lawyer to read 2 texts.</div>
    <div class="paper">
      <div class="c">INVOICE #2207</div><hr>
      <div>Review 2 texts</div>
      <div class="r"><span>1.4h x 495</span><span>693.00</span></div>
      <div class="r"><span>Copies</span><span>5.00</span></div><hr>
      <div class="r tot"><span>TOTAL</span><span>$698.00</span></div></div>
    <div class="circle"></div>
    <div class="cta">Read yours first. Tap to try</div></div>`},

  {name: 'POV', html: `<div class="ad ad-pov">
    <div class="cap"><span>POV: the other parent texts you at 11:48 pm</span></div>
    <div class="clock">11:48</div>
    <div class="noti"><div class="t"><b>Jess</b><span>now</span></div><p>so ur just not gonna answer??</p></div>
    <div class="typing">Jess is typing&hellip;</div>
    <div class="cta">Take the 1-min quiz</div></div>`},

  {name: 'Quiz', html: `<div class="ad ad-quiz">
    <h4>Rate my reply to my ex</h4>
    <div class="m">can u take them sat or not</div><div class="m" style="margin-top:-10px">hello??</div>
    <div class="o"><b>A</b>fine. like always 🙄</div>
    <div class="o"><b>B</b>Yes, I'll get them at 10.</div>
    <div class="o"><b>C</b>depends. will u be late?</div>
    <div class="cta">Take the 1-min quiz</div></div>`},

  {name: 'Notebook', html: `<div class="ad ad-book">
    <div class="l h">texts I'm done sending:</div>
    <div class="l"><s>"whatever. like always"</s></div>
    <div class="l"><s>"k."</s></div>
    <div class="l"><s>"ask ur mom then"</s></div>
    <div class="l h" style="margin-top:6px">what I send now:</div>
    <div class="l ok">"Got it. 5 works."</div>
    <div class="l ok">"No worries, I'll bring it."</div>
    <div class="cta">TAP TO START</div></div>`},

  {name: 'Exhibit', html: `<div class="ad ad-exhibit">
    <div class="hook">I sent this at 1 am. It became Exhibit 12.</div>
    <div class="shot"><div class="ts">Sat 1:07 AM</div>
      <div class="m">fine. do whatever u want. u always do</div><div class="d">Delivered</div></div>
    <div class="stk"><b>EXHIBIT</b><i>12</i></div>
    <div class="cta">Check yours first. <u>Tap to try</u></div></div>`},

  {name: 'Search', html: `<div class="ad ad-search">
    <div class="box"><i></i><span>how to reply to my ex without</span></div>
    <ul><li>how to reply to my ex without <b>a fight</b></li>
      <li>how to reply to my ex without <b>losing it</b></li>
      <li>how to reply to my ex without <b>it going to court</b></li></ul>
    <div class="cta"><span>Or paste their text into Parley.</span><br>Tap to try &rsaquo;</div></div>`},
];
document.querySelectorAll('[data-ad]').forEach((el) => { el.innerHTML = window.ADS[+el.dataset.ad - 1].html; });

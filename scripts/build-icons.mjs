// Builds src/icons-parley.svg.html: one drawn icon per meaning, on the same pastel tile as src/icons.svg.html
// (its t-* tile gradients, t-sheen and t-drop are reused), with soft clay shading on the glyph: 2-stop body
// gradients that head to white at the top, a gloss ellipse on the big masses, colour-carrying shadows.
// Rules the drawings keep, because they must read at 28 px: one dominant mass, no strokes under 2.4 units
// (of 64), no letters or digits, at most one badge. Run: node scripts/build-icons.mjs
import {writeFileSync} from 'node:fs';

const INK = '#2a2b3d', SKIN = 'url(#c-skin)';
const W = 'url(#c-w)', P = 'url(#c-p)', K = 'url(#c-k)', Y = 'url(#c-y)', G = 'url(#c-g)', B = 'url(#c-b)',
  C = 'url(#c-c)', D = 'url(#c-d)', O = 'url(#c-o)', PA = 'url(#c-paper)';
const HAIR = ['#3b2f4a', '#8a4b2a', '#e8a21f', '#5a3a2a'];

const n = (v) => +v.toFixed(2);
const r = (x, y, w, h, rx, f, ex = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="${f}"${ex}/>`;
const c = (x, y, rr, f, ex = '') => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rr)}" fill="${f}"${ex}/>`;
const p = (d, f, ex = '') => `<path d="${d}" fill="${f}"${ex}/>`;
const s = (d, col, w, ex = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${ex}/>`;
const gl = (x, y, rx, ry, rot = -25, o = .5) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" transform="rotate(${rot} ${n(x)} ${n(y)})" fill="#fff" opacity="${o}"/>`;
const g = (t, body) => `<g transform="${t}">${body}</g>`;

// ---- parts ---------------------------------------------------------------------------------------------
/** A grown-up: skin head with hair cap, rounded torso. top = top of head. */
function person(cx, top, sc, fill, hair = HAIR[0]) {
  const hr = 5.4 * sc, hy = top + hr, bt = hy + hr + 1.4 * sc, bb = bt + 12 * sc, w = 8.6 * sc, k = 6 * sc;
  return p(`M${n(cx - w)} ${n(bb)}V${n(bt + k)}Q${n(cx - w)} ${n(bt)} ${n(cx - w + k)} ${n(bt)}H${n(cx + w - k)}Q${n(cx + w)} ${n(bt)} ${n(cx + w)} ${n(bt + k)}V${n(bb)}Q${n(cx + w)} ${n(bb + 2 * sc)} ${n(cx + w - 2 * sc)} ${n(bb + 2 * sc)}H${n(cx - w + 2 * sc)}Q${n(cx - w)} ${n(bb + 2 * sc)} ${n(cx - w)} ${n(bb)}z`, fill)
    + gl(cx - w * .45, bt + 3 * sc, 2.6 * sc, 1.4 * sc, -30, .35)
    + c(cx, hy, hr, SKIN)
    + p(`M${n(cx - hr)} ${n(hy + .3 * sc)}A${n(hr)} ${n(hr)} 0 0 1 ${n(cx + hr)} ${n(hy + .3 * sc)}Q${n(cx + hr * .2)} ${n(hy - hr * .55)} ${n(cx - hr)} ${n(hy + .3 * sc)}z`, hair);
}
/** A child: bigger head for the body, short torso, a tuft. */
function kid(cx, top, sc, fill, hair = HAIR[2]) {
  const hr = 5.6 * sc, hy = top + hr, bt = hy + hr + 1 * sc, bb = bt + 8.6 * sc, w = 6.6 * sc, k = 5 * sc;
  return p(`M${n(cx - w)} ${n(bb)}V${n(bt + k)}Q${n(cx - w)} ${n(bt)} ${n(cx - w + k)} ${n(bt)}H${n(cx + w - k)}Q${n(cx + w)} ${n(bt)} ${n(cx + w)} ${n(bt + k)}V${n(bb)}Q${n(cx + w)} ${n(bb + 1.8 * sc)} ${n(cx + w - 1.8 * sc)} ${n(bb + 1.8 * sc)}H${n(cx - w + 1.8 * sc)}Q${n(cx - w)} ${n(bb + 1.8 * sc)} ${n(cx - w)} ${n(bb)}z`, fill)
    + gl(cx - w * .4, bt + 2.4 * sc, 2 * sc, 1.1 * sc, -30, .35)
    + c(cx, hy, hr, SKIN)
    + p(`M${n(cx - hr)} ${n(hy)}A${n(hr)} ${n(hr)} 0 0 1 ${n(cx + hr)} ${n(hy)}Q${n(cx + hr * .1)} ${n(hy - hr * .5)} ${n(cx - hr)} ${n(hy)}z`, hair)
    + p(`M${n(cx - 1 * sc)} ${n(top + .4 * sc)}q${n(1.5 * sc)} ${n(-2.6 * sc)} ${n(3.6 * sc)} ${n(-2 * sc)}q${n(-1.4 * sc)} ${n(1 * sc)} ${n(-1.2 * sc)} ${n(2.6 * sc)}z`, hair);
}
/** Speech bubble; tail 'l' or 'r' under the bottom edge. */
function bubble(x, y, w, h, f, tail = 'l', rx = 7) {
  const tx = tail === 'l' ? x + w * .22 : x + w * .78, d = tail === 'l' ? -1 : 1;
  return r(x, y, w, h, rx, f) + p(`M${n(tx - 4)} ${n(y + h - 1)}L${n(tx + 4)} ${n(y + h - 1)}L${n(tx + d * 5)} ${n(y + h + 6)}z`, f, ' stroke-linejoin="round"');
}
const dots = (cx, cy, col, gap = 5.6, rr = 2.2) => c(cx - gap, cy, rr, col) + c(cx, cy, rr, col) + c(cx + gap, cy, rr, col);
const line = (x, y, w, col, h = 3.2) => r(x, y, w, h, h / 2, col);
/** Wall calendar with rings and a coloured head band. Returns the shape; cells go on top. */
function cal(x, y, w, h, head = K) {
  const hh = Math.max(8, h * .27);
  return r(x, y, w, h, 7, W) + p(`M${x + 7} ${y}H${x + w - 7}A7 7 0 0 1 ${x + w} ${y + 7}V${y + hh}H${x}V${y + 7}A7 7 0 0 1 ${x + 7} ${y}z`, head)
    + gl(x + w * .25, y + hh * .4, w * .16, hh * .17, -8, .45)
    + r(x + w * .26 - 2.2, y - 4.2, 4.4, 9, 2.2, INK) + r(x + w * .74 - 2.2, y - 4.2, 4.4, 9, 2.2, INK);
}
/** cells on a calendar grid: marks is a list of indexes to paint in `on`. */
function cells(x, y, cols, rows, cw, ch, gap, marks, on = 'url(#c-c)', off = '#efe9fb') {
  let o = '';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i;
    o += r(x + i * (cw + gap), y + j * (ch + gap), cw, ch, Math.min(cw, ch) * .32, marks.includes(k) ? on : off);
  }
  return o;
}
/** Paper sheet with a folded corner. */
function doc(x, y, w, h, f = W, fold = '#d8cff7') {
  const k = Math.min(9, w * .32);
  return p(`M${x + 4} ${y}H${x + w - k}L${x + w} ${y + k}V${y + h - 4}A4 4 0 0 1 ${x + w - 4} ${y + h}H${x + 4}A4 4 0 0 1 ${x} ${y + h - 4}V${y + 4}A4 4 0 0 1 ${x + 4} ${y}z`, f)
    + p(`M${x + w - k} ${y}L${x + w} ${y + k}H${x + w - k + 2.4}A2.4 2.4 0 0 1 ${x + w - k} ${y + k - 2.4}z`, fold);
}
function heart(cx, cy, sc, f) {
  return p(`M${cx} ${n(cy + 6 * sc)}C${n(cx - 9 * sc)} ${n(cy)} ${n(cx - 7.5 * sc)} ${n(cy - 7 * sc)} ${n(cx - 3.6 * sc)} ${n(cy - 6.6 * sc)}C${n(cx - 1.8 * sc)} ${n(cy - 6.4 * sc)} ${cx} ${n(cy - 5 * sc)} ${cx} ${n(cy - 3.6 * sc)}C${cx} ${n(cy - 5 * sc)} ${n(cx + 1.8 * sc)} ${n(cy - 6.4 * sc)} ${n(cx + 3.6 * sc)} ${n(cy - 6.6 * sc)}C${n(cx + 7.5 * sc)} ${n(cy - 7 * sc)} ${n(cx + 9 * sc)} ${cy} ${cx} ${n(cy + 6 * sc)}z`, f);
}
/** Round badge in the lower-right with a white ring, for the one secondary idea. */
const badge = (cx, cy, rr, f, inner) => c(cx, cy, rr + 1.8, '#fff') + c(cx, cy, rr, f) + gl(cx - rr * .35, cy - rr * .45, rr * .4, rr * .22, -20, .45) + inner;
const check = (cx, cy, sc = 1, col = '#fff', w = 2.6) => s(`M${n(cx - 3.4 * sc)} ${n(cy + .2 * sc)}l${n(2.3 * sc)} ${n(2.3 * sc)} ${n(4.4 * sc)}-${n(4.8 * sc)}`, col, w);
const cross = (cx, cy, k = 3, col = '#fff', w = 2.6) => s(`M${cx - k} ${cy - k}l${2 * k} ${2 * k}M${cx + k} ${cy - k}l-${2 * k} ${2 * k}`, col, w);
function lock(cx, cy, sc, f = P, hole = '#fff', shackle = INK) {
  return s(`M${n(cx - 4 * sc)} ${n(cy - 1 * sc)}v${n(-3 * sc)}a${n(4 * sc)} ${n(4 * sc)} 0 0 1 ${n(8 * sc)} 0v${n(3 * sc)}`, shackle, 2.6 * sc)
    + r(cx - 6.4 * sc, cy - 1.6 * sc, 12.8 * sc, 10 * sc, 3 * sc, f) + c(cx, cy + 2.8 * sc, 1.6 * sc, hole) + r(cx - .8 * sc, cy + 3.2 * sc, 1.6 * sc, 3.2 * sc, .8 * sc, hole);
}
function hourglass(cx, top, h, sand, glass = '#fff') {
  const w = h * .6, cap = h * .14, mid = top + h / 2, gt = top + cap * .7, gb = top + h - cap * .7;
  const half = w / 2 - h * .06;
  const bulb = `M${n(cx - half)} ${n(gt)}H${n(cx + half)}C${n(cx + half)} ${n(mid - h * .14)} ${n(cx + 1.6)} ${n(mid - 2)} ${n(cx + 1.6)} ${n(mid)}C${n(cx + 1.6)} ${n(mid + 2)} ${n(cx + half)} ${n(mid + h * .14)} ${n(cx + half)} ${n(gb)}H${n(cx - half)}C${n(cx - half)} ${n(mid + h * .14)} ${n(cx - 1.6)} ${n(mid + 2)} ${n(cx - 1.6)} ${n(mid)}C${n(cx - 1.6)} ${n(mid - 2)} ${n(cx - half)} ${n(mid - h * .14)} ${n(cx - half)} ${n(gt)}z`;
  const sb = gb, st = gb - (gb - mid) * .62; // sand heap in the bottom bulb
  return p(bulb, glass)
    + p(`M${n(cx - half * .86)} ${n(sb)}Q${n(cx)} ${n(st - 1)} ${n(cx + half * .86)} ${n(sb)}z`, sand)
    + p(`M${n(cx - half * .55)} ${n(gt + 1.2)}H${n(cx + half * .55)}Q${n(cx)} ${n(gt + (mid - gt) * .75)} ${n(cx - half * .55)} ${n(gt + 1.2)}z`, sand)
    + r(cx - .7, mid, 1.4, (sb - mid) * .7, .7, sand)
    + r(cx - w / 2, top, w, cap, cap / 2, D) + r(cx - w / 2, top + h - cap, w, cap, cap / 2, D)
    + gl(cx - half * .5, gt + (mid - gt) * .4, 1.2, (mid - gt) * .22, -10, .7);
}
function gavel(cx, cy, sc, rot = -35) {
  return g(`rotate(${rot} ${cx} ${cy})`,
    r(cx - 1.6 * sc, cy, 3.2 * sc, 13 * sc, 1.6 * sc, O)
    + r(cx - 8 * sc, cy - 6.5 * sc, 16 * sc, 7.5 * sc, 2.6 * sc, D)
    + r(cx - 9.6 * sc, cy - 7.4 * sc, 3.2 * sc, 9.3 * sc, 1.4 * sc, '#5b5d78') + r(cx + 6.4 * sc, cy - 7.4 * sc, 3.2 * sc, 9.3 * sc, 1.4 * sc, '#5b5d78')
    + gl(cx - 2 * sc, cy - 4.6 * sc, 4 * sc, 1 * sc, 0, .35));
}
function briefcase(x, y, w, h, f = O) {
  return s(`M${x + w * .34} ${y + 1}v-3.4a2.6 2.6 0 0 1 2.6-2.6h${n(w * .32 - 5.2)}a2.6 2.6 0 0 1 2.6 2.6v3.4`, '#7a3d12', 3)
    + r(x, y, w, h, 6, f) + p(`M${x} ${y + h * .42}H${x + w}`, 'none', ` stroke="#b9561a" stroke-width="1.6" stroke-opacity=".55"`)
    + r(x + w / 2 - 3.4, y + h * .42 - 2.6, 6.8, 5.6, 1.6, Y) + gl(x + w * .25, y + h * .2, w * .16, h * .09, -10, .45);
}
function envelope(x, y, w, h, f = W, flap = K) {
  return r(x, y, w, h, 5, f)
    + p(`M${x + 2} ${y + h - 2}L${x + w * .5} ${y + h * .5}L${x + w - 2} ${y + h - 2}`, 'none', ` stroke="#d9d2ee" stroke-width="1.6"`)
    + p(`M${x + 3} ${y + 1.2}H${x + w - 3}Q${x + w - .2} ${y + 1.2} ${x + w - 2.6} ${y + 3.4}L${x + w * .5 + 3.2} ${y + h * .56}Q${x + w * .5} ${y + h * .62} ${x + w * .5 - 3.2} ${y + h * .56}L${x + 2.6} ${y + 3.4}Q${x + .2} ${y + 1.2} ${x + 3} ${y + 1.2}z`, flap);
}
function house(x, y, w, h, roof = P, body = W) {
  const rh = h * .42;
  return r(x + 3, y + rh - 2, w - 6, h - rh + 2, 4, body)
    + p(`M${x - 1.6} ${y + rh + .6}L${x + w / 2 - 2.4} ${y + 1.6}a3.2 3.2 0 0 1 4.8 0L${x + w + 1.6} ${y + rh + .6}a1.8 1.8 0 0 1 -1.4 2.9H${x}a1.8 1.8 0 0 1 -1.4 -2.9z`, roof)
    + gl(x + w * .32, y + rh * .55, w * .14, 1.3, -38, .5);
}
const tile = (t, body) => `<rect width="64" height="64" rx="18" fill="url(#t-${t})"/><rect width="64" height="64" rx="18" fill="url(#t-sheen)"/><rect x=".75" y=".75" width="62.5" height="62.5" rx="17.3" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/><g filter="url(#t-drop)">${body}</g>`;

// ---- the icons ------------------------------------------------------------------------------------------
const I = {};
const def = (id, t, label, body) => { I[id] = {t, label, body}; };

// How many children
def('kids-1', 'pink', 'One child', kid(32, 12, 1.95, K, HAIR[1]));
def('kids-2', 'mint', 'Two children', kid(21.5, 15, 1.48, P, HAIR[0]) + kid(42.5, 15, 1.48, Y, HAIR[1]));
def('kids-3', 'sky', 'Three or more', kid(15.5, 22, 1.12, K, HAIR[1]) + kid(48.5, 22, 1.12, G, HAIR[0]) + kid(32, 12, 1.38, P, HAIR[2]));
def('age-baby', 'butter', 'Under 5: stroller',
  s('M45 31l5.5-10.5', INK, 3.2) + r(48, 17.6, 7, 3.4, 1.7, INK)
  + p('M14 30.5h32a2 2 0 0 1 2 2v1.5a11 11 0 0 1-11 11H23a11 11 0 0 1-11-11v-1.5a2 2 0 0 1 2-2z', P)
  + p('M30 30.5V15.2A15.3 15.3 0 0 0 14.7 30.5z', K) + gl(21, 23, 3.6, 1.6, -45, .5)
  + gl(22, 35, 6, 1.5, -6, .4)
  + c(21, 48.5, 5.2, D) + c(21, 48.5, 1.9, '#c9c3e0') + c(40, 48.5, 5.2, D) + c(40, 48.5, 1.9, '#c9c3e0'));
def('age-school', 'sky', '5 to 9: school backpack',
  s('M26 18v-3.2a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V18', INK, 3)
  + r(16, 17, 32, 36, 10, C) + gl(23, 23, 5, 2, -20, .45)
  + p('M16 27c0-5 4-10 10-10h12c6 0 10 5 10 10v1.5H16z', '#f97d5f')
  + r(21.5, 33.5, 21, 15, 5, Y) + r(26.5, 38.5, 11, 3, 1.5, '#e09412')
  + r(22, 26.5, 3.2, 7.6, 1.6, '#fff', ' opacity=".9"') + r(38.8, 26.5, 3.2, 7.6, 1.6, '#fff', ' opacity=".9"'));
def('age-tween', 'lilac', '10 to 13: phone and headphones',
  s('M14.5 35V30a17.5 17.5 0 0 1 35 0v5', P, 4.2)
  + r(10.5, 31, 9, 15, 4.5, P) + r(44.5, 31, 9, 15, 4.5, P) + gl(13.5, 34.5, 1.4, 3, 0, .5) + gl(47.5, 34.5, 1.4, 3, 0, .5)
  + r(23, 22, 18, 31, 5, D) + r(25.4, 25.4, 13.2, 21.6, 2.6, B) + gl(29, 30, 2.4, 4.2, 0, .45)
  + p('M30.2 30.5l5.6-1.6v8.6', 'none', ' stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"')
  + c(29.2, 38.6, 2, '#fff') + c(34.8, 37.4, 2, '#fff') + r(30, 49.6, 4, 1.4, .7, '#8f91ad'));
def('age-teen', 'mint', '14 and older: car keys',
  c(23, 19, 7.4, 'none', ' stroke="#8f95b2" stroke-width="3.2"')
  + g('rotate(-16 22 37)', r(14.5, 25, 15, 25, 6.5, D) + c(22, 32.5, 3, C) + c(22, 40.5, 2.4, '#8f91ad') + gl(18.5, 29, 1.5, 3.4, 0, .4))
  + g('translate(37 25) rotate(48)', c(0, 0, 8, Y) + c(0, 0, 2.6, '#fff') + gl(-2.6, -3, 2.6, 1.3, -20, .6)
    + p('M6 -3.4H27a2 2 0 0 1 2 2V3.4h-4V6h-3.4V3.4H18V6h-3.4V3.4H6z', '#cfd3e3')));
def('ch-text', 'sky', 'Text messages: bubble with typing dots',
  bubble(23, 13, 28, 18, W, 'r', 8) + line(28, 18.8, 13, '#c9c0ee', 2.6) + line(28, 23.6, 18, '#c9c0ee', 2.6)
  + bubble(11, 28, 32, 20, B, 'l', 9) + gl(18, 32, 5, 1.6, -10, .45) + dots(27, 38, '#fff', 6.4, 2.6));
def('ch-email', 'butter', 'Email: envelope',
  envelope(10, 18, 44, 30) + gl(17, 22, 4, 1.4, -15, .4) + c(32, 33.5, 4.2, Y) + heart(32, 33.6, .42, '#e2508f'));
def('ch-ofw', 'mint', 'Co-parenting app: shared calendar for two parents',
  cal(9, 14, 36, 32, G) + cells(14, 27.5, 4, 2, 5, 5, 2.2, [1, 4], 'url(#c-g)', '#e3f6ec')
  + r(31, 37, 26, 17, 8.5, '#fff') + c(39, 45.5, 6.4, P) + c(39, 43.8, 2.6, SKIN) + p('M34.4 49.6a4.6 4.4 0 0 1 9.2 0z', '#fff', ' opacity=".7"')
  + c(50, 45.5, 6.4, C) + c(50, 43.8, 2.6, SKIN) + p('M45.4 49.6a4.6 4.4 0 0 1 9.2 0z', '#fff', ' opacity=".7"'));
def('ch-tp', 'lilac', 'Co-parenting app: recorded call and chat, locked',
  bubble(9, 12, 38, 30, W, 'l', 9) + gl(16, 17, 5, 1.6, -10, .5)
  + g('translate(17 18) scale(.92)', p('M5.5 1.2l3.5-.7 2 4.9-2.4 1.8a13 13 0 0 0 7.6 7.6l1.8-2.4 4.9 2-.7 3.5a2.4 2.4 0 0 1-2.4 1.9A18.6 18.6 0 0 1 3.6 3.6a2.4 2.4 0 0 1 1.9-2.4z', P))
  + c(40, 19, 3.3, '#ff4d4d') + c(40, 19, 5.2, 'none', ' stroke="#ff4d4d" stroke-opacity=".35" stroke-width="2"')
  + badge(46, 45, 8.4, P, lock(46, 45, .82, '#fff', '#6b4ae6', '#fff')));
def('ch-inperson', 'peach', 'In person or by phone: two parents face to face, and a call',
  person(20, 13, 1.25, B, HAIR[0]) + person(42, 17, 1.12, C, HAIR[1])
  + badge(47, 46, 8.4, G, g('translate(41.6 40.6) scale(.46)', p('M5.5 1.2l3.5-.7 2 4.9-2.4 1.8a13 13 0 0 0 7.6 7.6l1.8-2.4 4.9 2-.7 3.5a2.4 2.4 0 0 1-2.4 1.9A18.6 18.6 0 0 1 3.6 3.6a2.4 2.4 0 0 1 1.9-2.4z', '#fff'))));
def('ch-phone', 'mint', 'Phone call: handset',
  g('translate(13 13) scale(1.45)', p('M5.5 1.2l3.5-.7 2 4.9-2.4 1.8a13 13 0 0 0 7.6 7.6l1.8-2.4 4.9 2-.7 3.5a2.4 2.4 0 0 1-2.4 1.9A18.6 18.6 0 0 1 3.6 3.6a2.4 2.4 0 0 1 1.9-2.4z', G))
  + gl(19, 18, 2, 4, -40, .5) + s('M38 14a12 12 0 0 1 12 12', '#1fa572', 3.2) + s('M37 21a6 6 0 0 1 6 6', '#1fa572', 3.2));

// How often it gets tense: one calendar, filling up
const freq = (marks, t, label, id) => def(id, t, label, cal(11, 14, 42, 38, K) + cells(16, 28.5, 5, 3, 4.8, 4.8, 2.6, marks, 'url(#c-c)', '#f1ecfb'));
freq([7], 'mint', 'Rarely: one tense day', 'freq-rare');
freq([2, 9, 13], 'butter', 'A few times a month', 'freq-month');
freq([1, 3, 5, 7, 9, 10, 12, 14], 'peach', 'Every week', 'freq-week');
freq([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 'coral', 'Most days', 'freq-daily');

// What sets it off
def('tr-schedule', 'pink', 'Schedule changes: calendar with swap arrows',
  cal(9, 14, 38, 34, K) + cells(14, 28, 4, 2, 5.4, 5, 2.4, [2, 5], 'url(#c-p)', '#fbe4ef')
  + badge(45, 44, 10, P, s('M39.8 41.6h9.4l-2.6-2.6M50.2 46.4h-9.4l2.6 2.6', '#fff', 2.4)));
def('tr-money', 'mint', 'Money: banknote and coin',
  g('rotate(-12 28 30)', r(8, 19, 38, 23, 5, G) + r(11.5, 22.5, 31, 16, 3.4, 'none', ' stroke="#fff" stroke-opacity=".6" stroke-width="1.6"') + c(27, 30.5, 5.5, '#bff0d8') + c(27, 30.5, 2.6, '#18a06a') + gl(16, 24.5, 5, 1.4, 0, .45))
  + c(44, 42, 10, '#e09412') + c(43, 41, 10, Y) + c(43, 41, 6.6, 'none', ' stroke="#fff" stroke-opacity=".7" stroke-width="1.8"') + gl(39.5, 36.5, 3, 1.6, -35, .6));
def('tr-partner', 'pink', 'A new partner: a new grown-up, a heart, the child',
  person(19.5, 17, 1.05, P, HAIR[0]) + person(44.5, 17, 1.05, C, HAIR[1]) + heart(32, 16, .62, '#e2508f')
  + kid(32, 34, .85, Y, HAIR[2]));
def('tr-school', 'sky', 'School and health: schoolhouse and a medical cross',
  r(12, 27, 34, 23, 3, W) + p('M9.5 28.5L29 13.2l19.5 15.3a1.6 1.6 0 0 1-1 2.9H10.5a1.6 1.6 0 0 1-1-2.9z', C) + gl(20, 22.5, 4.4, 1.4, -38, .5)
  + c(29, 25, 3.4, Y) + r(25, 38, 8, 12, 2.4, B) + r(15.5, 34, 6, 6, 1.6, '#cfe0ff') + r(36.5, 34, 6, 6, 1.6, '#cfe0ff')
  + badge(46, 45, 9, '#fff', r(43.6, 39.2, 4.8, 11.6, 1.4, '#ff4d4d') + r(40.2, 42.6, 11.6, 4.8, 1.4, '#ff4d4d')).replace(/fill="#fff"\/><circle/, 'fill="#ffd6d6"/><circle'));
def('tr-messenger', 'butter', 'The kids carrying messages: a child holding a note',
  kid(22, 19, 1.45, P, HAIR[1])
  + s('M30 40l8-8', SKIN, 4)
  + g('rotate(-12 44 25)', envelope(32, 15, 24, 17, W, K)));
const oldEnv = (x, y, w, h, rot, f = PA) => g(`rotate(${rot} ${x + w / 2} ${y + h / 2})`, r(x, y, w, h, 4, f) + s(`M${x + 2.5} ${y + 2.5}L${x + w / 2} ${y + h * .58}L${x + w - 2.5} ${y + 2.5}`, '#c58f45', 2.4));
def('tr-past', 'peach', 'Old arguments: a stack of old letters',
  oldEnv(12, 11, 34, 22, -12, '#f6e3b8') + oldEnv(15, 20, 34, 22, 7, '#fbecc8') + oldEnv(12, 29, 36, 24, -3)
  + c(30, 43, 3.6, '#d6403a') + gl(29, 42, 1.2, .7, -20, .6)
  + badge(48, 16, 7.6, P, s('M44.6 14.5a4 4 0 1 1 .8 4.2', '#fff', 2.2) + p('M42.7 12.2l2.3 3.3 2.9-2.4z', '#fff')));
def('re-fast', 'butter', 'Reply right away: a bubble with a lightning bolt',
  bubble(10, 13, 44, 32, P, 'l', 11) + gl(19, 19, 7, 2.2, -10, .4)
  + p('M34.5 17L22.5 31.5h8.5L28 41l12.5-15.5h-8.6z', Y));
def('re-long', 'peach', 'A long explanation: an unrolled scroll',
  r(17, 13, 30, 40, 3, W) + r(13, 9.5, 38, 7.5, 3.75, '#e9c88f') + r(13, 49.5, 38, 7.5, 3.75, '#e9c88f') + gl(20, 11.6, 6, 1.2, 0, .6)
  + [20.5, 25.5, 30.5, 35.5, 40.5].map((y, i) => line(22, y, [20, 17, 20, 14, 18][i], '#d6c9f5', 2.6)).join('') + line(22, 45, 10, '#d6c9f5', 2.6));
def('re-quiet', 'lilac', 'Go quiet: a muted bell',
  p('M32 12.5a3 3 0 0 1 3 3v1a12 12 0 0 1 9 11.6V37l4 5.2a1.4 1.4 0 0 1-1.1 2.3H17.1a1.4 1.4 0 0 1-1.1-2.3l4-5.2v-8.9a12 12 0 0 1 9-11.6v-1a3 3 0 0 1 3-3z', Y)
  + gl(25, 26, 2.4, 5, 18, .5) + c(32, 48.5, 4, '#e09412')
  + s('M14 14l36 36', '#fff', 7) + s('M14 14l36 36', '#7c5cf0', 3.6));
def('re-friend', 'mint', 'Ask a friend first: your draft and a friend\'s OK',
  bubble(8, 11, 32, 22, W, 'l', 8) + line(13.5, 18, 17, '#c9c0ee', 2.8) + line(13.5, 24, 21, '#c9c0ee', 2.8)
  + bubble(26, 32, 30, 19, G, 'r', 8) + gl(32, 35.5, 4.4, 1.4, -10, .4) + check(41, 41.5, 1.15, '#fff', 3));
def('re-lawyer', 'sky', 'Run it by my lawyer: draft and briefcase',
  g('rotate(-8 24 26)', doc(11, 9, 26, 32) + line(16, 19, 13, '#c9c0ee', 2.6) + line(16, 24.5, 16, '#c9c0ee', 2.6) + line(16, 30, 10, '#c9c0ee', 2.6))
  + briefcase(26, 33, 28, 19));

// Court
def('court-none', 'mint', 'No court: a home, worked out between you',
  house(13, 13, 38, 36, G) + r(27, 34.5, 10, 14.5, 3, '#8a5ad8') + heart(32, 25.5, .62, '#e2508f'));
def('court-mediation', 'lilac', 'Mediation: two chairs at one table',
  r(18, 35, 28, 4, 2, O) + r(20.5, 38.5, 3, 12, 1.5, '#b9561a') + r(40.5, 38.5, 3, 12, 1.5, '#b9561a')
  + r(7.5, 26, 4, 25, 2, P) + r(7.5, 38, 12, 4, 2, P) + r(15.5, 40, 3, 11, 1.5, '#6b4ae6')
  + r(52.5, 26, 4, 25, 2, C) + r(44.5, 38, 12, 4, 2, C) + r(45.5, 40, 3, 11, 1.5, '#ee4f36')
  + bubble(22, 12, 20, 14, W, 'l', 6) + dots(32, 19, '#7c5cf0', 4.6, 1.8));
def('court-active', 'sky', 'Active case: a courthouse',
  p('M10 24.5L30.6 12.6a2.8 2.8 0 0 1 2.8 0L54 24.5a1.4 1.4 0 0 1-.7 2.6H10.7a1.4 1.4 0 0 1-.7-2.6z', P) + gl(23, 20, 5, 1.3, -28, .5)
  + c(32, 21, 2.4, Y)
  + [15, 24.3, 33.6, 42.9].map((x) => r(x, 29, 6, 16, 2, W)).join('')
  + r(11, 45, 42, 4, 2, W) + r(8, 49, 48, 4.4, 2.2, '#cfe0ff'));
def('court-hearing', 'pink', 'Hearing coming up: a calendar with a gavel',
  cal(9, 13, 36, 34, K) + cells(14, 27, 4, 2, 5, 5, 2.2, [6], 'url(#c-p)', '#fbe4ef')
  + gavel(44, 42, 1.3, -40));
def('court-modify', 'butter', 'Changing the order: a court order being edited',
  doc(13, 10, 30, 42) + line(18, 19, 15, '#c9c0ee', 2.6) + line(18, 25, 19, '#c9c0ee', 2.6) + line(18, 31, 12, '#c9c0ee', 2.6)
  + c(22.5, 43, 4.6, '#ff6b57') + c(22.5, 43, 2, '#ffd0c8')
  + g('rotate(40 44 36)', r(40.5, 20, 7, 22, 2.2, K) + r(40.5, 20, 7, 4.6, 2, INK) + p('M40.5 41.6h7l-3.5 6.4z', '#ffe0c2') + p('M43 46h2l-1 2z', INK) + gl(42.4, 30, 1, 5, 0, .45)));

// Who's involved
def('lawyer', 'peach', 'A lawyer: briefcase', briefcase(11, 22, 42, 28));
def('gal', 'mint', 'GAL or evaluator: clipboard with a magnifier',
  r(12, 13, 30, 39, 5, O) + r(15, 17, 24, 32, 3, W) + r(20, 10, 14, 7, 3, D)
  + line(19, 23, 13, '#c9c0ee', 2.6) + line(19, 29, 16, '#c9c0ee', 2.6) + line(19, 35, 9, '#c9c0ee', 2.6)
  + s('M47 47l6.4 6.4', INK, 5) + c(41, 41, 8.4, B) + c(41, 41, 5.6, '#e6f0ff') + gl(38.8, 38.6, 2.2, 1.2, -40, .9));
def('lawyer-gal', 'sky', 'Both: briefcase and clipboard',
  g('rotate(-8 22 28)', r(9, 12, 24, 32, 4, O) + r(11.5, 15, 19, 26, 2.6, W) + r(15.5, 9.5, 11, 5.6, 2.4, D) + line(15, 21, 11, '#c9c0ee', 2.4) + line(15, 26, 13, '#c9c0ee', 2.4) + line(15, 31, 8, '#c9c0ee', 2.4))
  + briefcase(27, 31, 28, 20, P));
def('solo', 'butter', 'On my own: one parent, the other seat empty',
  person(24, 14, 1.35, P, HAIR[0])
  + c(45, 23, 5.6, 'none', ' stroke="#e09412" stroke-width="2.2" stroke-dasharray="3 3"')
  + p('M37 49v-8a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v8', 'none', ' stroke="#e09412" stroke-width="2.2" stroke-dasharray="3 3" stroke-linecap="round"'));

// Time on messages: hourglasses
def('time-1', 'mint', 'Under an hour: a small hourglass', hourglass(32, 18, 28, Y));
def('time-3', 'butter', '1 to 3 hours: an hourglass', hourglass(32, 11, 42, 'url(#c-c)'));
def('time-6', 'peach', '3 to 6 hours: two hourglasses', hourglass(21, 13, 38, 'url(#c-c)') + hourglass(43, 13, 38, 'url(#c-c)'));
def('time-6p', 'coral', 'More than 6 hours: three hourglasses',
  hourglass(16, 20, 30, '#ff5f45') + hourglass(48, 20, 30, '#ff5f45') + hourglass(32, 12, 38, '#ff5f45'));

// Goals
def('goal-calm', 'sky', 'Fewer fights: two calm bubbles',
  bubble(8, 12, 30, 21, W, 'l', 10) + s('M17 22.5q6 5 12 0', '#7c5cf0', 2.8)
  + bubble(26, 30, 30, 21, P, 'r', 10) + gl(32, 33.6, 4.5, 1.4, -10, .4) + s('M35 40.5q6 5 12 0', '#fff', 2.8));
def('goal-record', 'lilac', 'A clean record: a dated, checked folder',
  p('M10 18a4 4 0 0 1 4-4h10l4 4.5h22a4 4 0 0 1 4 4V47a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z', '#6b4ae6')
  + r(14, 20, 34, 16, 2, W) + line(18, 24, 18, '#c9c0ee', 2.4) + line(18, 29, 12, '#c9c0ee', 2.4)
  + p('M10 30a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z', P) + gl(18, 31, 5, 1.4, -6, .4)
  + badge(43, 41, 7, G, check(43, 41, 1, '#fff', 2.6)));
def('goal-peace', 'mint', 'Peace of mind: moon and a leaf',
  p('M33 10.5a17.5 17.5 0 1 0 19.4 22.4A14 14 0 0 1 33 10.5z', Y) + gl(19.5, 22, 2.6, 5.6, 20, .5)
  + c(46, 16, 1.6, '#fff') + c(52, 23, 1.1, '#fff')
  + g('rotate(-30 42 44)', p('M42 34c7 3 8.6 10 6 16-6.4-.6-11-6-6-16z', G) + s('M42.6 36.5c1.6 4 2.4 8.4 2 12.6', '#0f7f52', 1.6)));
def('goal-kids', 'pink', 'Kids out of it: a child under an umbrella',
  p('M8.5 28a23.5 16 0 0 1 47 0c-2.2-2-5.4-2-7.8 0-2.4-2-5.4-2-7.8 0-2.4-2-5.4-2-7.8 0-2.4-2-5.4-2-7.8 0-2.4-2-5.4-2-7.8 0-2.4-2-5.4-2-7.8 0z', P)
  + p('M20 28c0-9 5.4-15.6 12-16-4 3.5-6 9-6.2 16-2-1.6-4-1.6-5.8 0z', '#9f86ff') + gl(19, 19, 5, 1.6, -35, .45)
  + r(31, 27, 2.4, 9, 1.2, INK) + c(32, 12, 1.6, INK)
  + kid(32, 32, .9, Y, HAIR[1]));

// Insight screens, build checks and plan
def('app-cost', 'mint', 'What co-parenting apps cost: a phone with a price tag',
  r(13, 10, 24, 42, 6, D) + r(16, 14, 18, 32, 3, G) + gl(20, 20, 2.4, 5, 0, .4) + r(22, 48, 6, 1.6, .8, '#8f91ad')
  + c(25, 23, 3, '#fff', ' opacity=".9"') + r(19, 29, 12, 2.4, 1.2, '#fff', ' opacity=".8"') + r(19, 34, 8, 2.4, 1.2, '#fff', ' opacity=".8"')
  + g('rotate(-30 44 38)', p('M34 32a3 3 0 0 1 3-3h13l6 9-6 9H37a3 3 0 0 1-3-3z', Y) + c(49.5, 38, 2, '#e09412') + r(37.5, 35.8, 7, 2.2, 1.1, '#e09412') + r(37.5, 39.6, 5, 2.2, 1.1, '#e09412')));
def('legal-fees', 'butter', 'Attorney fees: a stack of money',
  r(9, 37, 40, 16, 4, '#18a06a') + r(9, 33, 40, 16, 4, G) + c(29, 41, 4, '#bff0d8') + gl(16, 36, 5, 1.2, 0, .4)
  + r(13, 27, 40, 15, 4, '#18a06a') + r(13, 23.5, 40, 15, 4, G) + c(33, 31, 3.8, '#bff0d8') + c(33, 31, 1.6, '#18a06a')
  + c(48, 18, 8.4, '#e09412') + c(47, 17, 8.4, Y) + c(47, 17, 5.2, 'none', ' stroke="#fff" stroke-opacity=".7" stroke-width="1.6"'));
def('judge-lens', 'sky', 'How a judge reads your draft: a magnifier over a flagged phrase',
  bubble(8, 11, 36, 26, W, 'l', 8) + line(13.5, 17.5, 22, '#c9c0ee', 2.6) + line(13.5, 23, 12, '#c9c0ee', 2.6)
  + s('M13.5 30.2q2-2 4 0t4 0 4 0 4 0', '#ff4d4d', 2.2)
  + s('M50 50l5 5', INK, 5.4) + c(41.5, 41.5, 11, P) + c(41.5, 41.5, 7.6, '#efeafe') + s('M37.6 41.8q2-2 4 0t4 0', '#ff4d4d', 2) + gl(38.5, 37.4, 3, 1.5, -40, .9));
def('path', 'peach', 'The 28-day plan: a path of days to a flag',
  s('M15 51Q9 40 24 37T37 26T44 17', '#fff', 6, ' stroke-opacity=".85"')
  + c(15, 50, 7, G) + check(15, 50, 1, '#fff', 2.8) + c(24.5, 37, 7, G) + check(24.5, 37, 1, '#fff', 2.8)
  + c(37.5, 26, 7.6, P) + c(37.5, 26, 3, '#fff')
  + r(43.4, 6.5, 3.2, 17, 1.6, INK) + p('M46.6 7.5h10.6l-3.2 4 3.2 4H46.6z', '#ff5f45'));
def('brief', 'butter', 'Brief: a message squeezed short',
  bubble(18, 18, 28, 21, P, 'l', 9) + gl(24, 21.6, 4, 1.3, -10, .4) + line(24, 26.5, 16, '#fff', 3.2)
  + s('M7 28.5h7M10.5 25l3.5 3.5-3.5 3.5', '#e09412', 3) + s('M57 28.5h-7M53.5 25L50 28.5l3.5 3.5', '#e09412', 3));
def('no-absolutes', 'pink', 'No "always" or "never": crossed-out words',
  bubble(9, 14, 46, 30, W, 'l', 9) + line(16, 21.5, 30, '#c9c0ee', 3) + line(16, 28, 18, '#e2508f', 3.4) + line(37, 28, 11, '#c9c0ee', 3) + line(16, 34.5, 24, '#c9c0ee', 3)
  + s('M13.5 31.8l22-7.4', '#ff4d4d', 3));
def('on-point', 'mint', 'Only what was asked: the reply hits the question',
  bubble(8, 11, 26, 19, W, 'l', 8) + c(21, 20.5, 5.4, 'none', ' stroke="#7c5cf0" stroke-width="2.4"') + c(21, 20.5, 1.8, '#7c5cf0')
  + bubble(28, 32, 28, 19, G, 'r', 8) + gl(34, 35.6, 4.2, 1.3, -10, .4) + check(42, 41.5, 1.1, '#fff', 3));
def('no-threat', 'lilac', 'Nothing that reads as a threat: a shielded message',
  p('M32 9.5l17 6.4v12.5c0 11.3-7 19.5-17 24.1-10-4.6-17-12.8-17-24.1V15.9z', P) + gl(23, 18, 4, 1.6, -20, .45)
  + bubble(21, 21, 22, 15, W, 'l', 6) + check(32, 28.4, .95, '#18a06a', 2.8));
def('no-bait', 'sky', 'Don\'t take the bait: a hook, refused',
  c(28, 11.5, 3.6, 'none', ' stroke="#5b5d78" stroke-width="2.8"')
  + s('M28 15v20a8.5 8.5 0 0 1-17 0v-5', '#5b5d78', 5) + p('M7 31.4L11 23l4 8.4z', '#5b5d78')
  + gl(26.6, 22, .9, 4, 0, .6)
  + badge(44, 44, 10, '#fff', c(44, 44, 7.6, 'none', ' stroke="#ff4d4d" stroke-width="3"') + s('M38.8 49.2l10.4-10.4', '#ff4d4d', 3)));
def('boundary', 'mint', 'Boundaries: a fence with a gate shut',
  r(7, 27, 50, 5, 2.5, '#9f86ff') + r(7, 40, 50, 5, 2.5, '#9f86ff')
  + [10, 22, 34, 46].map((x) => p(`M${x} 52V21.5l4-5.5 4 5.5V52z`, W) + gl(x + 2, 28, .8, 4, 0, .8)).join('')
  + r(7, 51, 50, 3.4, 1.7, '#1fa572'));
def('timeline', 'lilac', 'Court-ready timeline: dated entries in order',
  doc(10, 9, 32, 44) + r(17.5, 16, 2.6, 30, 1.3, '#d6cfee')
  + c(18.8, 18.5, 3, K) + line(25, 17.2, 11, '#c9c0ee', 2.6) + c(18.8, 30.5, 3, P) + line(25, 29.2, 9, '#c9c0ee', 2.6) + c(18.8, 42.5, 3, G) + line(25, 41.2, 12, '#c9c0ee', 2.6)
  + gavel(45, 41, .95, -40));
def('you-here', 'lilac', 'Where you are: a map pin with you in it',
  p('M32 8.5c-10 0-17.5 7.5-17.5 17.2 0 11.8 13 21.6 16 25.6a1.9 1.9 0 0 0 3 0c3-4 16-13.8 16-25.6C49.5 16 42 8.5 32 8.5z', P) + gl(23, 17, 4, 2, -35, .45)
  + c(32, 25.5, 11, '#fff') + c(32, 22.5, 3.8, SKIN) + p('M28.2 22.7a3.8 3.8 0 0 1 7.6 0q-3.8-2.4-7.6 0z', HAIR[0]) + p('M25.2 33.2a6.8 6 0 0 1 13.6 0q-6.8 2.6-13.6 0z', P)
  + r(22, 53, 20, 3.4, 1.7, '#9877f6', ' opacity=".55"'));
def('trigger', 'coral', 'What sets it off: a lit match',
  g('translate(32 32) scale(1.22) translate(-32 -30)', g('rotate(35 32 36)', r(29.5, 26, 5, 28, 2.5, '#f5d7a6') + gl(31, 34, .8, 6, 0, .7) + c(32, 25.5, 4.6, '#c0392b'))
  + g('translate(7 4)', p('M28.8 21.4c-6-3.4-6.2-10-1.4-14.4.4 3.4 2.2 4.4 3.6 5 0-3 1.8-6 4.4-7-1 3.6 2.4 6.6 2.4 10.6 0 4-3.2 7.2-9 5.8z', Y)
  + p('M30.4 19.6c-2.6-1.8-2.4-4.6-.4-6.8.6 1.8 1.8 2.6 3 2.6.4 2 .2 3.8-2.6 4.2z', '#fff', ' opacity=".85"'))));
def('gauge', 'coral', 'Conflict level: a gauge',
  p('M10 42a22 22 0 0 1 44 0', 'none', ' stroke="#fff" stroke-width="8" stroke-linecap="round"')
  + p('M10 42a22 22 0 0 1 9.4-18', 'none', ' stroke="#34c38f" stroke-width="8" stroke-linecap="round"')
  + p('M24.5 21.4a22 22 0 0 1 16 .4', 'none', ' stroke="#ffc92e" stroke-width="8"')
  + p('M45.6 24.4a22 22 0 0 1 8.4 17.6', 'none', ' stroke="#ff4d4d" stroke-width="8" stroke-linecap="round"')
  + s('M32 42l11-12', INK, 4) + c(32, 42, 5, INK) + c(32, 42, 1.8, '#fff') + r(16, 49, 32, 4, 2, '#fff', ' opacity=".8"'));
def('goal', 'peach', 'Goal: a flag on the summit',
  p('M6 52l17.5-28a2.4 2.4 0 0 1 4 0L36 37l5.6-8a2.4 2.4 0 0 1 4 0L58 52z', P) + p('M18.6 31.8l4.9-7.8a2.4 2.4 0 0 1 4 0l4.6 7.4-3.6 2.4-3-2.6-3.6 2.8z', '#fff')
  + gl(18, 40, 2, 7, 30, .3)
  + r(24.2, 8, 2.8, 17, 1.4, INK) + p('M27 9h11.5l-3 4 3 4H27z', '#ff5f45'));
def('chart', 'sky', 'Tense messages per week, going down',
  r(10, 14, 9, 36, 3, '#ff7d57') + r(22, 22, 9, 28, 3, Y) + r(34, 31, 9, 19, 3, '#7fd6ad') + r(46, 38, 9, 12, 3, G)
  + gl(13, 19, 1.4, 3, 0, .6) + r(7, 50, 50, 3.2, 1.6, '#fff'));
def('refund', 'mint', 'Money back: a banknote coming back to you',
  s('M15.5 41A18 18 0 1 1 30 50', '#fff', 4.6) + p('M8.6 39.4l7.8-5.4 2.8 9z', '#fff')
  + g('rotate(-14 34 31)', r(20, 22, 28, 17, 4, G) + r(23, 25, 22, 11, 2.4, 'none', ' stroke="#fff" stroke-opacity=".6" stroke-width="1.4"') + c(34, 30.5, 3.8, '#bff0d8') + c(34, 30.5, 1.6, '#18a06a') + gl(26, 25, 3.6, 1, 0, .5)));
def('one-click', 'sky', 'Cancel in one click: a switch and a pointer',
  r(8, 17, 40, 22, 11, '#d6cfee') + c(19, 28, 8.6, '#fff') + gl(16.5, 24.6, 2.6, 1.4, -30, .9)
  + p('M36.5 31.5l13 14.8-6.2-.4 3.4 7.2-3.6 1.6-3.4-7.2-4.4 4.4z', '#fff', ' stroke="#2a2b3d" stroke-width="2.2" stroke-linejoin="round"'));
def('secure-card', 'lilac', 'Checkout: a card with a lock',
  g('rotate(-10 28 30)', r(7, 17, 40, 27, 5, P) + r(7, 23, 40, 5.4, 0, INK) + r(12, 33, 10, 6.4, 2, Y) + gl(16, 20, 6, 1.2, 0, .4))
  + badge(46, 44, 10, '#fff', lock(46, 43.4, .95, P)));
def('two-homes', 'pink', 'Kids raised in two homes',
  house(5, 20, 22, 26, P) + r(13, 35, 6.4, 11, 2, Y) + house(37, 20, 22, 26, C) + r(45, 35, 6.4, 11, 2, B)
  + heart(32, 18, .6, '#e2508f') + s('M24 50q8 4 16 0', '#e2508f', 2.6, ' stroke-dasharray="1 4.4"'));
def('paste', 'lilac', 'Paste their message: a clipboard with a message on it',
  r(11, 12, 34, 42, 5, O) + r(14.5, 16, 27, 34.5, 3, W) + r(20, 8.5, 16, 7.6, 3.2, D) + gl(17, 20, 2, 5, 0, .5)
  + bubble(25, 26, 30, 19, B, 'r', 7) + gl(31, 29.6, 4.4, 1.3, -10, .45) + dots(40, 35.5, '#fff', 5.4, 2.2));
def('no-signup', 'butter', 'No sign-up: a form you never fill',
  r(11, 10, 32, 42, 5, W) + r(16, 16, 22, 6, 3, '#efe9fb') + r(16, 26, 22, 6, 3, '#efe9fb') + r(16, 36, 14, 6, 3, P)
  + badge(44, 44, 10, '#fff', c(44, 44, 7.6, 'none', ' stroke="#ff4d4d" stroke-width="3"') + s('M38.8 49.2l10.4-10.4', '#ff4d4d', 3)));
def('messages', 'lilac', 'Messages, both ways',
  bubble(8, 12, 32, 20, W, 'l', 8) + line(13.5, 20.6, 18, '#c9c0ee', 2.8)
  + bubble(24, 32, 32, 20, P, 'r', 8) + gl(30, 35.6, 4.4, 1.4, -10, .4) + line(30, 40.6, 18, '#fff', 2.8));
def('import-chat', 'sky', 'Import a chat export: messages going into the record',
  bubble(9, 9, 27, 17, W, 'l', 7) + line(14, 15.8, 14, '#c9c0ee', 2.6)
  + bubble(28, 14, 27, 17, '#25d366', 'r', 7) + line(33, 20.8, 15, '#fff', 2.6)
  + r(13, 38, 38, 16, 5, P) + r(13, 38, 38, 5, 2.5, '#6b4ae6') + gl(19, 44, 5, 1.3, 0, .35)
  + s('M32 30v12M27 37.5l5 5 5-5', INK, 3.6));
def('fingerprint', 'mint', 'Integrity fingerprint: a sealed print',
  c(32, 32, 20, '#fff') + gl(25, 21, 5, 2.4, -35, .9)
  + s('M24 26.5a9.6 9.6 0 0 1 17 3.3', '#18a06a', 2.4) + s('M22.4 33a9.6 9.6 0 0 1 .3-3.3', '#18a06a', 2.4)
  + s('M27.2 42.2c1.8-2.8 2.4-6.2 2.4-9.6a2.4 2.4 0 0 1 4.8 0c0 4.4-1 8.4-3 11.6', '#18a06a', 2.4)
  + s('M24 38.6c.8-1.8 1.2-3.8 1.2-6a6.8 6.8 0 0 1 13.6 0c0 2.6-.2 5-.8 7.4', '#18a06a', 2.4)
  + s('M36.8 44.6c.8-1.6 1.4-3.2 1.8-5', '#18a06a', 2.4) + s('M32 32.6c0 4-1 7.4-3 10.6', '#18a06a', 2.4)
  + badge(46, 46, 7, P, check(46, 46, .9, '#fff', 2.4)));

// Plan lengths on the landing's price cards: a week lit, a month lit, three months stacked
def('plan-1w', 'mint', '1 week plan: one week of the calendar',
  cal(10, 14, 44, 38, P) + cells(15.5, 28.5, 5, 3, 4.6, 4.6, 2.8, [5, 6, 7, 8, 9], 'url(#c-g)', '#efe9fb'));
def('plan-4w', 'lilac', '4 week plan: a whole month',
  cal(10, 14, 44, 38, P) + cells(15.5, 28.5, 5, 3, 4.6, 4.6, 2.8, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 'url(#c-g)', '#efe9fb'));
def('plan-12w', 'sky', '12 week plan: three months stacked',
  g('rotate(-10 30 34)', r(8, 18, 38, 32, 7, '#d6cfee')) + g('rotate(-4 32 34)', r(11, 16, 38, 33, 7, '#ece8fb'))
  + cal(14, 15, 40, 36, P) + cells(19.5, 28.5, 5, 3, 4.2, 4.2, 2.6, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 'url(#c-g)', '#efe9fb'));

// ---- write ---------------------------------------------------------------------------------------------
const defs = [
  ['w', '#ffffff', '#e9e6f5'], ['p', '#a58cff', '#6b4ae6'], ['k', '#f78bbb', '#d6407f'], ['y', '#ffe68a', '#ffb81f'],
  ['g', '#5edca5', '#18a06a'], ['b', '#86b6ff', '#3b78ee'], ['c', '#ffa385', '#ee4f36'], ['d', '#55577a', '#23243a'],
  ['o', '#ffb877', '#e0731c'], ['paper', '#fff6df', '#efd5a0'], ['skin', '#ffe0c8', '#f6b48f'],
].map(([id, a, b]) => `<linearGradient id="c-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('');

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${defs}</defs>`
  + Object.entries(I).map(([id, {t, label, body}]) => `<!-- ${label.replace(/--/g, '-')} --><symbol id="i-${id}" viewBox="0 0 64 64">${tile(t, body)}</symbol>`).join('') + '</svg>\n';
writeFileSync(new URL('../src/icons-parley.svg.html', import.meta.url), out);
console.log(Object.keys(I).length, 'icons →', 'src/icons-parley.svg.html');
console.log(Object.keys(I).map((k) => `'${k}'`).join(' | '));

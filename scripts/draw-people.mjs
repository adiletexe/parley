// Draws the four people on the first quiz screen (src/assets/people/*.svg).
// Hand-placed flat illustration, light from the top left: every shape has a base colour and one shade.
// Run: node scripts/draw-people.mjs   (then look at pitch/ux/entry/people-sheet.png, made by scripts/people-sheet.cjs)
import {writeFileSync, mkdirSync} from 'node:fs';

const W = 240, H = 240, CX = 120;
mkdirSync('src/assets/people', {recursive: true});

/* ---------- shared parts ---------- */

const bg = (id, base, blob, dot) => `
  <defs>
    <radialGradient id="${id}-bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${blob}"/><stop offset="1" stop-color="${base}"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${id}-bg)"/>
  <circle cx="${CX}" cy="104" r="78" fill="#fff" opacity=".32"/>
  <circle cx="38" cy="46" r="9" fill="${dot}" opacity=".55"/>
  <circle cx="206" cy="70" r="5" fill="${dot}" opacity=".55"/>
  <circle cx="198" cy="30" r="3" fill="#fff" opacity=".8"/>`;

// Shoulders and torso; the neckline is drawn by the caller. Width w = half the shoulder span.
const body = (c, shade, w = 92) => `<g transform="translate(0,-7)">
  <path d="M${CX - w} ${H + 12} C${CX - w + 2} 204 ${CX - 66} 182 ${CX - 30} 173 L${CX + 30} 173 C${CX + 66} 182 ${CX + w - 2} 204 ${CX + w} ${H + 12} Z" fill="${c}"/>
  <path d="M${CX + 34} 175 C${CX + 66} 184 ${CX + w - 2} 206 ${CX + w} ${H + 12} L${CX + 54} ${H + 12} C${CX + 56} 214 ${CX + 50} 192 ${CX + 34} 175 Z" fill="${shade}" opacity=".9"/>
  <path d="M${CX - 52} ${H + 12} C${CX - 52} 222 ${CX - 56} 206 ${CX - 62} 196" stroke="${shade}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/></g>`;

const neck = (skin, shade, top = 128) => `
  <path d="M${CX - 15} ${top} L${CX - 15} 166 C${CX - 15} 178 ${CX + 15} 178 ${CX + 15} 166 L${CX + 15} ${top} Z" fill="${skin}"/>
  <path d="M${CX - 15} ${top + 4} C${CX - 8} ${top + 18} ${CX + 8} ${top + 18} ${CX + 15} ${top + 4} L${CX + 15} ${top + 22} C${CX + 8} ${top + 28} ${CX - 8} ${top + 28} ${CX - 15} ${top + 22} Z" fill="${shade}"/>`;

// The face: a soft egg with a gentle jaw. jaw 0 = narrow (women), 1 = wider (men).
function face(skin, shade, jaw = 0) {
  const s = 33 + jaw * 2, j = 15 + jaw * 4, bot = 142 + jaw * 2;
  return `
  <ellipse cx="${CX - s}" cy="102" rx="6.5" ry="9" fill="${skin}"/>
  <ellipse cx="${CX + s}" cy="102" rx="6.5" ry="9" fill="${shade}"/>
  <path d="M${CX - s} 94 C${CX - s} 64 ${CX - 18} 54 ${CX} 54 C${CX + 18} 54 ${CX + s} 64 ${CX + s} 94 C${CX + s} 118 ${CX + j + 6} ${bot - 6} ${CX} ${bot} C${CX - j - 6} ${bot - 6} ${CX - s} 118 ${CX - s} 94 Z" fill="${skin}"/>
  <path d="M${CX + s - 6} 70 C${CX + s} 80 ${CX + s} 88 ${CX + s} 94 C${CX + s} 118 ${CX + j + 6} ${bot - 6} ${CX} ${bot} C${CX + j} ${bot - 12} ${CX + s - 6} 120 ${CX + s - 5} 96 C${CX + s - 5} 84 ${CX + s - 5} 76 ${CX + s - 6} 70 Z" fill="${shade}" opacity=".55"/>`;
}

// Eyes, brows, nose, mouth. o: {brow, lip, age, lash}
function features(o) {
  const eye = '#2a2230';
  const ey = 101;
  let s = `
  <ellipse cx="${CX - 13}" cy="${ey}" rx="3.6" ry="4.3" fill="${eye}"/>
  <ellipse cx="${CX + 13}" cy="${ey}" rx="3.6" ry="4.3" fill="${eye}"/>
  <circle cx="${CX - 11.8}" cy="${ey - 1.6}" r="1.2" fill="#fff"/>
  <circle cx="${CX + 14.2}" cy="${ey - 1.6}" r="1.2" fill="#fff"/>
  <path d="M${CX - 21} ${ey - 10} Q${CX - 13} ${ey - 15 + (o.browLift ?? 0)} ${CX - 5} ${ey - 11}" stroke="${o.brow}" stroke-width="${o.browW ?? 3}" fill="none" stroke-linecap="round"/>
  <path d="M${CX + 5} ${ey - 11} Q${CX + 13} ${ey - 15 + (o.browLift ?? 0)} ${CX + 21} ${ey - 10}" stroke="${o.brow}" stroke-width="${o.browW ?? 3}" fill="none" stroke-linecap="round"/>
  <path d="M${CX + 1} ${ey + 4} C${CX - 1} ${ey + 11} ${CX - 4} ${ey + 14} ${CX - 1} ${ey + 16} C${CX + 1} ${ey + 17} ${CX + 3} ${ey + 16} ${CX + 4} ${ey + 15}" stroke="${o.nose}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="${CX - 22}" cy="${ey + 14}" rx="7" ry="4" fill="${o.blush}" opacity=".35"/>
  <ellipse cx="${CX + 22}" cy="${ey + 14}" rx="7" ry="4" fill="${o.blush}" opacity=".35"/>`;
  if (o.lash) s += `
  <path d="M${CX - 17} ${ey - 3.5} l-3 -2.2 M${CX + 17} ${ey - 3.5} l3 -2.2" stroke="${eye}" stroke-width="1.8" stroke-linecap="round"/>`;
  // A closed, easy smile: a lip shape for some, a line for others.
  if (o.lip) s += `
  <path d="M${CX - 9} ${ey + 24} C${CX - 5} ${ey + 30} ${CX + 5} ${ey + 30} ${CX + 9} ${ey + 24} C${CX + 4} ${ey + 26} ${CX - 4} ${ey + 26} ${CX - 9} ${ey + 24} Z" fill="${o.lip}"/>`;
  else s += `
  <path d="M${CX - 8} ${ey + 24} Q${CX} ${ey + 30} ${CX + 8} ${ey + 24}" stroke="${o.mouth}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  if (o.age) s += `
  <path d="M${CX - 19} ${ey + 7} q5 2.5 10 0.5 M${CX + 9} ${ey + 7.5} q5 2 10 -0.5" stroke="${o.nose}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".55"/>
  <path d="M${CX - 23} ${ey - 1} l-3.5 -1.5 M${CX - 23} ${ey + 2.5} l-3.5 0.5 M${CX + 23} ${ey - 1} l3.5 -1.5 M${CX + 23} ${ey + 2.5} l3.5 0.5" stroke="${o.nose}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>
  <path d="M${CX - 11} ${ey + 17} q-3 4 -2 9 M${CX + 12} ${ey + 17} q3 4 2 9" stroke="${o.nose}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".45"/>`;
  return s;
}

const glasses = (frame, shape = 'round') => {
  const ey = 101;
  const lens = shape === 'round'
    ? `<circle cx="${CX - 13}" cy="${ey}" r="10"/><circle cx="${CX + 13}" cy="${ey}" r="10"/>`
    : `<rect x="${CX - 25}" y="${ey - 8}" width="22" height="16" rx="5"/><rect x="${CX + 3}" y="${ey - 8}" width="22" height="16" rx="5"/>`;
  return `
  <g fill="#fff" fill-opacity=".18" stroke="${frame}" stroke-width="2.6">${lens}</g>
  <path d="M${CX - 3} ${ey - 1} Q${CX} ${ey - 4} ${CX + 3} ${ey - 1}" stroke="${frame}" stroke-width="2.4" fill="none"/>
  <path d="M${CX - 23} ${ey - 3} L${CX - 34} ${ey - 5} M${CX + 23} ${ey - 3} L${CX + 34} ${ey - 5}" stroke="${frame}" stroke-width="2.4" stroke-linecap="round"/>`;
};

const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${inner}\n</svg>\n`;

/* ---------- the four people ---------- */

// The neckline sits on the shoulders, which body() lifts by 7.
const nl = (s) => `<g transform="translate(0,-7)">${s}</g>`;

// Mom, 25 to 34: warm brown skin, long dark wavy hair with a side part, mint knit top. Lilac card.
function momYoung() {
  const skin = '#c98d68', sh = '#a8704f', hair = '#2b1d1c', hairHi = '#4d3432';
  return svg(`
  ${bg('m1', '#e6dcff', '#f3eeff', '#b9a6ff')}
  <path d="M80 98 C72 54 100 38 124 40 C152 42 170 62 162 104 C158 132 166 160 178 190 C160 200 140 196 132 186 L108 186 C98 198 76 200 62 190 C74 160 84 132 80 98 Z" fill="${hair}"/>
  ${neck(skin, sh)}
  ${body('#7fd6b5', '#5fbf9c', 90)}
  ${nl(`<path d="M105 166 C110 180 130 180 135 166 Z" fill="${skin}"/>
  <path d="M104 167 C110 182 130 182 136 167" stroke="#5fbf9c" stroke-width="5" fill="none" stroke-linecap="round"/>`)}
  ${face(skin, sh, 0)}
  <path d="M90 84 C100 74 140 74 150 84 L150 78 C140 68 100 68 90 78 Z" fill="${sh}" opacity=".35"/>
  ${features({brow: hair, nose: sh, blush: '#e46f6f', lip: '#9c4d4a', lash: true})}
  <path d="M86 104 C80 66 100 46 124 46 C150 46 164 68 156 104 C153 92 149 84 142 78 C132 72 118 70 108 62 C102 74 94 84 86 104 Z" fill="${hair}"/>
  <path d="M108 62 C120 70 136 72 146 80" stroke="${hairHi}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>
  <path d="M116 52 C128 48 142 52 150 62" stroke="${hairHi}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M84 104 C80 130 84 152 74 182 C84 184 92 176 96 166 C92 146 90 126 88 106 Z" fill="${hair}"/>
  <path d="M156 106 C162 132 158 156 168 184 C158 188 148 180 145 168 C150 148 152 128 152 108 Z" fill="${hair}"/>
  <path d="M82 128 C84 146 80 164 74 178" stroke="${hairHi}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
  <path d="M158 128 C158 148 160 164 166 178" stroke="${hairHi}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`);
}

// Mom, 35 to 45: fair skin, chestnut bob with a soft side sweep and one grey streak, round glasses, fine lines,
// a sky-blue cardigan over a white tee. Peach card.
function momOlder() {
  const skin = '#f1c6a6', sh = '#d9a07e', hair = '#7a4430', hairHi = '#9d5f47';
  return svg(`
  ${bg('m2', '#ffe0cf', '#fff1e8', '#ffb38f')}
  <path d="M82 100 C74 58 100 40 122 40 C148 40 168 58 160 102 C158 124 162 140 166 150 C160 158 150 158 144 152 L96 152 C90 158 80 158 74 150 C78 140 84 124 82 100 Z" fill="${hair}"/>
  ${neck(skin, sh)}
  ${body('#8db8f2', '#6d9be0', 92)}
  ${nl(`<path d="M104 169 C110 176 130 176 136 169 L127 252 L113 252 Z" fill="#fbfbfe"/>
  <path d="M106 167 C111 177 129 177 134 167" stroke="#e3e5ee" stroke-width="2.5" fill="none"/>
  <path d="M101 170 L115 252" stroke="#b6d2f8" stroke-width="7"/>
  <path d="M139 170 L125 252" stroke="#a3c3f0" stroke-width="7"/>
  <circle cx="${CX - 7}" cy="214" r="2.2" fill="#fff"/><circle cx="${CX - 5}" cy="230" r="2.2" fill="#fff"/>
  <path d="M106 166 C111 176 129 176 134 166 Z" fill="${skin}"/>`)}
  ${face(skin, sh, 0)}
  <path d="M90 82 C100 74 140 74 150 82 L150 76 C140 68 100 68 90 76 Z" fill="${sh}" opacity=".4"/>
  ${features({brow: '#6a3a2a', nose: sh, blush: '#ec8a7a', lip: '#b8605a', lash: true, age: true})}
  ${glasses('#3b2f3a', 'round')}
  <path d="M85 106 C79 66 98 46 124 46 C150 46 164 68 156 104 C152 88 146 78 138 72 C124 72 108 78 98 90 C94 94 90 100 85 106 Z" fill="${hair}"/>
  <path d="M126 50 C116 54 106 66 98 84" stroke="#cdb8ad" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".85"/>
  <path d="M114 52 C128 48 142 52 150 62" stroke="${hairHi}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M84 104 C80 122 80 136 76 148 C84 152 94 150 98 142 C94 130 90 118 88 106 Z" fill="${hair}"/>
  <path d="M156 106 C160 122 160 136 164 148 C156 152 146 150 143 142 C148 130 152 118 153 108 Z" fill="${hair}"/>
  <path d="M80 126 C82 136 80 142 78 146" stroke="${hairHi}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
}

// Dad, 25 to 34: deep brown skin, short twists with a fade, a trimmed beard, mustard crew-neck. Sky card.
function dadYoung() {
  const skin = '#8a5638', sh = '#6c3f27', hair = '#1d1515', hairHi = '#3d2e2b';
  return svg(`
  ${bg('d1', '#d6e6ff', '#ecf3ff', '#8fb6f5')}
  ${neck(skin, sh, 126)}
  ${body('#f2c45a', '#dca93c', 96)}
  ${nl(`<path d="M104 166 C110 180 130 180 136 166 Z" fill="${skin}"/>
  <path d="M103 167 C110 183 130 183 137 167" stroke="#dca93c" stroke-width="6" fill="none" stroke-linecap="round"/>`)}
  ${face(skin, sh, 1)}
  <path d="M86 98 C88 112 92 118 97 121 C104 116 112 114 120 116 C128 114 136 116 143 121 C148 118 152 112 154 98 C155 124 144 145 120 148 C96 145 85 124 86 98 Z" fill="${hair}"/>
  <path d="M86 98 C86 92 86 88 87 86 L91 108 Z M154 98 C154 92 154 88 153 86 L149 108 Z" fill="${hair}"/>
  ${features({brow: hair, browW: 3.8, nose: '#4f2c1b', blush: '#b0503f', lip: '#a35f48'})}
  <path d="M112 125 Q120 128 128 125" stroke="#4a2519" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M85 92 C82 62 100 48 120 48 C142 48 158 62 155 92 C153 84 151 79 148 76 C138 72 102 72 92 76 C89 79 87 84 85 92 Z" fill="${hair}"/>
  ${[...Array(9)].map((_, i) => `<circle cx="${94 + i * 6.5}" cy="${57 + Math.abs(i - 4) * 2.2}" r="4.4" fill="${hair}"/>`).join('')}
  ${[...Array(8)].map((_, i) => `<circle cx="${97 + i * 6.5}" cy="${64 + Math.abs(i - 3.5) * 1.4}" r="3.5" fill="${hairHi}"/>`).join('')}
  ${[...Array(7)].map((_, i) => `<circle cx="${100 + i * 6.5}" cy="${55 + Math.abs(i - 3) * 1.6}" r="1.4" fill="#5a4642"/>`).join('')}`);
}

// Dad, 35 to 45: light olive skin, short side-swept dark hair going grey at the temples, rectangular glasses,
// stubble, a few lines, a navy denim shirt with a collar. Mint card.
function dadOlder() {
  const skin = '#e6b48d', sh = '#c98f68', hair = '#2d2a2e', grey = '#b7b4bb';
  return svg(`
  ${bg('d2', '#d3f2e3', '#ebfaf3', '#7fd6b5')}
  ${neck(skin, sh, 126)}
  ${body('#3e5d8c', '#2f4a73', 96)}
  ${nl(`<path d="M104 170 L120 196 L136 170 Z" fill="${skin}"/>
  <path d="M104 170 L120 196 L136 170" stroke="#2f4a73" stroke-width="2" fill="none"/>
  <path d="M100 166 L120 196 L108 200 L94 176 Z" fill="#4f71a3"/>
  <path d="M140 166 L120 196 L132 200 L146 176 Z" fill="#46679a"/>
  <circle cx="120" cy="214" r="2.4" fill="#cfd8e8"/><circle cx="120" cy="232" r="2.4" fill="#cfd8e8"/>`)}
  ${face(skin, sh, 1)}
  <path d="M88 108 C90 128 102 142 120 146 C138 142 150 128 152 108 C148 122 140 130 132 132 C124 128 116 128 108 132 C100 130 92 122 88 108 Z" fill="#6b5b55" opacity=".26"/>
  <path d="M90 80 C100 72 140 72 150 80 L150 74 C140 66 100 66 90 74 Z" fill="${sh}" opacity=".4"/>
  ${features({brow: '#3a3338', browW: 3.6, nose: sh, blush: '#d9786a', mouth: '#7a3d35', age: true})}
  ${glasses('#2a2a33', 'rect')}
  <path d="M85 94 C80 62 100 44 124 45 C148 46 160 62 155 94 C153 86 151 80 149 77 C138 74 124 72 112 66 C106 72 98 76 91 78 C88 82 86 88 85 94 Z" fill="${hair}"/>
  <path d="M112 66 C124 72 138 74 149 77" stroke="#4d4852" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M108 52 C122 46 140 50 150 62" stroke="#55505a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M85 94 C84 86 86 80 90 77 C92 84 91 92 90 100 Z" fill="${grey}"/>
  <path d="M155 94 C156 86 154 80 150 77 C148 84 149 92 150 100 Z" fill="${grey}"/>
  <path d="M88 70 C92 62 98 56 104 53" stroke="${grey}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>`);
}

const out = {'mom-25-34': momYoung(), 'mom-35-45': momOlder(), 'dad-25-34': dadYoung(), 'dad-35-45': dadOlder()};
for (const [k, v] of Object.entries(out)) writeFileSync(`src/assets/people/${k}.svg`, v);
console.log('wrote', Object.keys(out).join(', '));

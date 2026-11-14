// NODE_PATH="/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/node_modules" node pitch/ux/ads/render.cjs [sheet]
// Shoots the ad sheet, the five slide layouts and a contact sheet; prints every ad text under 16px and every spill.
const path = require('path'), puppeteer = require('puppeteer');
const dir = __dirname;
const audit = () => {
  const out = [];
  document.querySelectorAll('.ad *').forEach((el) => {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    let z = 1; for (let e = el; e; e = e.parentElement) z *= parseFloat(getComputedStyle(e).zoom) || 1;
    const px = parseFloat(getComputedStyle(el).fontSize) * z;
    if (px < 15.9) out.push(`small ${px.toFixed(1)}px: ${el.textContent.trim().slice(0, 30)}`);
  });
  document.querySelectorAll('.ad').forEach((ad) => { const r = ad.getBoundingClientRect(); ad.querySelectorAll('*').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width && (b.bottom > r.bottom + 1 || b.right > r.right + 1)) out.push('spill: ' + ad.className + ' > ' + el.className + ' ' + el.textContent.trim().slice(0, 24)); }); });
  document.querySelectorAll('.slide').forEach((s, i) => { const r = s.getBoundingClientRect(); s.querySelectorAll('*').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width && !el.closest('.ad') && !el.closest('.bleed') && (b.right > r.right + 1 || b.bottom > r.bottom + 1 || b.left < r.left - 1)) out.push(`slide ${i + 1} out: ` + el.tagName + '.' + el.className); }); });
  return out;
};
(async () => {
  const b = await puppeteer.launch({headless: 'new'});
  const p = await b.newPage();
  await p.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1});
  await p.goto('file://' + path.join(dir, 'creatives.html'), {waitUntil: 'networkidle0'});
  await p.evaluate(() => document.fonts.ready);
  console.log('sheet', await p.evaluate(audit));
  await (await p.$('#sheet')).screenshot({path: path.join(dir, 'creatives.png')});
  if (process.argv[2] === 'sheet') return b.close();
  await p.goto('file://' + path.join(dir, 'layouts.html'), {waitUntil: 'networkidle0'});
  await p.evaluate(() => document.fonts.ready);
  console.log('layouts', await p.evaluate(audit));
  const els = await p.$$('.slide');
  for (let i = 0; i < els.length; i++) await els[i].screenshot({path: path.join(dir, `L${i + 1}.png`)});
  await p.goto('file://' + path.join(dir, 'sheet.html'), {waitUntil: 'networkidle0'});
  await (await p.$('#cs')).screenshot({path: path.join(dir, 'layouts-sheet.png')});
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });

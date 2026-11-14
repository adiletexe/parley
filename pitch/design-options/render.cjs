// node render-options.cjs [A B C] — element screenshots of each .slide, then a contact sheet per direction.
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const DIR = '/Users/adiletaussarbekov/Desktop/parley/pitch/design-options';
const FILES = {A: 'A-editorial.html', B: 'B-casefile.html', C: 'C-keynote.html'};
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FILES);
(async () => {
  const br = await puppeteer.launch({headless: 'new'});
  const p = await br.newPage();
  for (const k of want) {
    await p.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1});
    await p.goto('file://' + path.join(DIR, FILES[k]), {waitUntil: 'networkidle0'});
    await p.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    const slides = await p.$$('.slide');
    const outs = [];
    for (let i = 0; i < slides.length; i++) {
      const out = path.join(DIR, `${k}-${i + 1}.png`);
      await slides[i].screenshot({path: out});
      outs.push(out);
    }
    // contact sheet: the slides side by side, ~2400 wide
    const W = 760, G = 40, PAD = 40;
    const sheetW = PAD * 2 + W * outs.length + G * (outs.length - 1);
    const H = Math.round(W * 1080 / 1920);
    const bg = k === 'C' ? '#1c1c1e' : '#e4e1da';
    const html = `<body style="margin:0;background:${bg}"><div style="display:flex;gap:${G}px;padding:${PAD}px">` +
      outs.map(o => `<img src="${o}" style="width:${W}px;height:${H}px;display:block;box-shadow:0 6px 24px rgba(0,0,0,.18)">`).join('') + '</div></body>';
    await p.setViewport({width: sheetW, height: H + PAD * 2, deviceScaleFactor: 1});
    await p.goto('file://' + DIR + '/');
    await p.setContent(html, {waitUntil: 'load'});
    await p.screenshot({path: path.join(DIR, `${k}.png`)});
    console.log(k, outs.length, 'slides,', sheetW + 'px sheet');
  }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });

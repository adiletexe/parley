// Renders pitch/deck.html to Parley-deck.pdf and one PNG per slide (for checking).
// NODE_PATH="/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/node_modules" node pitch/render.cjs
const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const dir = __dirname;
  const br = await puppeteer.launch({headless: 'new'});
  const p = await br.newPage();
  await p.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1});
  await p.goto('file://' + path.join(dir, 'deck.html'), {waitUntil: 'networkidle0'});
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({path: path.join(dir, 'Parley-deck.pdf'), width: '1920px', height: '1080px', printBackground: true});
  const els = await p.$$('.slide');
  for (let i = 0; i < els.length; i++) await els[i].screenshot({path: path.join(dir, 'check', `slide-${i + 1}.png`)});
  console.log('slides', els.length);
  await br.close();
})().catch((e) => { console.error(e); process.exit(1); });

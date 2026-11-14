// node render.cjs — screenshots each .slide of variants2.html to v1-N.png, then sheet.png (PIL).
const puppeteer = require('puppeteer');
const path = require('path');
const { execFileSync } = require('child_process');
const DIR = __dirname;
(async () => {
  const br = await puppeteer.launch({ headless: 'new' });
  try {
    const p = await br.newPage();
    await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(DIR, 'variants2.html'), { waitUntil: 'networkidle0' });
    await p.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 600));
    const slides = await p.$$('.slide');
    for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: path.join(DIR, `r2-${i + 1}.png`) });
    console.log(slides.length, 'slides');
  } finally { await br.close(); }
  execFileSync('python3', [path.join(DIR, 'sheet2.py'), DIR], { stdio: 'inherit' });
})().catch(e => { console.error(e); process.exit(1); });

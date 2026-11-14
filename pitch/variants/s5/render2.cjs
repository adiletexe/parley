// NODE_PATH="/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/node_modules" node render.cjs
const puppeteer = require('puppeteer'); const path = require('path'); const {execFileSync} = require('child_process');
(async () => {
  const br = await puppeteer.launch({headless: 'new'});
  try {
    const p = await br.newPage();
    await p.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1});
    await p.goto('file://' + path.join(__dirname, 'variants2.html'), {waitUntil: 'networkidle0'});
    await p.evaluate(() => document.fonts.ready);
    const els = await p.$$('.slide');
    for (let i = 0; i < els.length; i++) await els[i].screenshot({path: path.join(__dirname, `r2-${i + 1}.png`)});
  } finally { await br.close(); }
  execFileSync('python3', [path.join(__dirname, 'sheet2.py')], {cwd: __dirname});
  console.log('ok');
})();

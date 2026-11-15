// Inlines the app's icon sprites into variants.html, then shoots every .phone at 2x and writes caps.json for the sheets.
const fs = require('fs'), path = require('path'), puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '../../../..');
const file = path.join(__dirname, 'variants.html');
const sprites = ['src/icons.svg.html', 'src/icons-parley.svg.html'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/<!--icons-->[\s\S]*?<!--\/icons-->/, () => `<!--icons-->\n${sprites}\n<!--/icons-->`));
(async () => {
  const b = await puppeteer.launch({headless: 'new'});
  const p = await b.newPage();
  await p.setViewport({width: 1900, height: 1000, deviceScaleFactor: 2});
  await p.goto('file://' + file, {waitUntil: 'networkidle0'});
  await p.evaluate(() => document.fonts.ready);
  const caps = await p.$$eval('.phone', (ps) => ps.map((x) => [x.id, x.dataset.cap]));
  for (const [id] of caps) await (await p.$('#' + id)).screenshot({path: path.join(__dirname, id + '.png')});
  fs.writeFileSync(path.join(__dirname, 'caps.json'), JSON.stringify(caps));
  await b.close();
})();

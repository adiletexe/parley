// Inlines the app's icon sprites into variants.html, then shoots each 390x844 phone at 2x.
const fs = require('fs'), path = require('path'), puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '../../..');
const file = path.join(__dirname, 'variants.html');
const sprites = ['src/icons.svg.html', 'src/icons-parley.svg.html'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/<!--icons-->[\s\S]*?<!--\/icons-->/, `<!--icons-->\n${sprites}\n<!--/icons-->`));
(async () => {
  const b = await puppeteer.launch({headless: 'new'});
  const p = await b.newPage();
  await p.setViewport({width: 2400, height: 1000, deviceScaleFactor: 2});
  await p.goto('file://' + file, {waitUntil: 'networkidle0'});
  await p.evaluate(() => document.fonts.ready);
  for (const id of ['A1','A2','B1','B2','C1','C2']) await (await p.$('#' + id)).screenshot({path: path.join(__dirname, id + '.png')});
  await b.close();
})();

// Renders pitch/deck.html to Parley-deck.pdf and one PNG per slide (for checking).
// NODE_PATH="/Users/adiletaussarbekov/Desktop/prev desktop/vemotion/node_modules" node pitch/render.cjs
const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const dir = __dirname;
  const br = await puppeteer.launch({headless: 'new', protocolTimeout: 600000});
  const p = await br.newPage();
  await p.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1});
  // The app's icon sprites are inlined the same way vite does it, so the deck uses the exact icons the product shows.
  const fs = require('fs');
  const root = path.join(dir, '..');
  const sprites = fs.readFileSync(path.join(root, 'src/icons.svg.html'), 'utf8') + fs.readFileSync(path.join(root, 'src/icons-parley.svg.html'), 'utf8');
  fs.writeFileSync(path.join(dir, 'final.built.html'), fs.readFileSync(path.join(dir, 'final.html'), 'utf8').replace('<!--icons-->', sprites));
  await p.goto('file://' + path.join(dir, 'final.built.html'), {waitUntil: 'networkidle0'});
  await p.evaluate(() => document.fonts.ready);
  // The PDF is built from 2x screenshots, not Chrome's print: macOS Preview mangles blurred shadows and gradient
  // text in printed PDFs (a pink box over slide 1, a clipped "12.9M"). Pictures look the same in every viewer.
  await p.setViewport({width: 1920, height: 1080, deviceScaleFactor: 2});
  await p.evaluate(() => document.fonts.ready);
  const {PDFDocument} = require(path.join(root, 'node_modules/pdf-lib'));
  const doc = await PDFDocument.create();
  const els = await p.$$('.slide');
  for (let i = 0; i < els.length; i++) {
    const img = await doc.embedJpg(await els[i].screenshot({type: 'jpeg', quality: 92}));
    doc.addPage([1920, 1080]).drawImage(img, {x: 0, y: 0, width: 1920, height: 1080});
    await els[i].screenshot({path: path.join(dir, 'check', `final-${i + 1}.png`)});
  }
  fs.writeFileSync(path.join(dir, 'Parley-pitch-final.pdf'), await doc.save());
  console.log('slides', els.length);
  await br.close();
})().catch((e) => { console.error(e); process.exit(1); });

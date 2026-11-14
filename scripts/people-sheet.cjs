// Review sheet for the four quiz-screen people: each large (480) and small (120), side by side.
// Run: NODE_PATH=<a node_modules with puppeteer> node scripts/people-sheet.cjs
const fs = require('fs'), path = require('path'), puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const names = ['mom-25-34', 'mom-35-45', 'dad-25-34', 'dad-35-45'];
const cell = (n) => { const s = fs.readFileSync(path.join(root, 'src/assets/people', n + '.svg'), 'utf8');
  const uri = 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
  return `<figure><img src="${uri}" width="400" height="400"><div><img src="${uri}" width="140" height="140"><img src="${uri}" width="72" height="72"></div><figcaption>${n}</figcaption></figure>`; };
const html = `<!doctype html><body style="margin:0;padding:24px;background:#f4f5fa;font:600 16px system-ui;display:flex;gap:20px">${names.map(cell).join('')}
<style>figure{margin:0;display:flex;flex-direction:column;gap:10px}img{border-radius:20px;display:block}figure div{display:flex;gap:10px;align-items:end}</style></body>`;
(async () => {
  const b = await puppeteer.launch({headless: 'new'});
  const p = await b.newPage();
  await p.setViewport({width: 1720, height: 680, deviceScaleFactor: 1.5});
  await p.setContent(html);
  await p.screenshot({path: path.join(root, 'pitch/ux/entry/people-sheet.png'), fullPage: true});
  await b.close();
})();

import { createRequire } from 'node:module'; const puppeteer = createRequire(process.env.NODE_PATH + '/')('puppeteer');
import fs from 'node:fs'; import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(here, '..');
const man = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8'));
const b = await puppeteer.launch({ headless: 'new', args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
await p.setViewport({ width: 1900, height: 1000, deviceScaleFactor: 2 });
await p.goto('file://' + path.join(out, 'variants.html'), { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
for (const f of man) for (const v of f.variants) for (let i = 0; i < v.screens.length; i++) {
  const s = v.screens[i];
  const el = await p.$('#' + s.id);
  const name = `${f.key}-${v.v}${i + 1}-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.png`;
  await el.screenshot({ path: path.join(out, name) });
  // overflow check: anything below the phone's bottom edge
  const over = await p.evaluate((id) => { const ph = document.getElementById(id); const r = ph.getBoundingClientRect(); let m = 0; ph.querySelectorAll('*').forEach((e) => { const q = e.getBoundingClientRect(); if (q.height && q.bottom > m) m = q.bottom; if (q.right > r.right + 1 && q.width) m = Math.max(m, 9999); }); return Math.round(m - r.bottom); }, s.id);
  console.log(name, over > 0 ? 'OVERFLOW ' + over : '');
}
await b.close();

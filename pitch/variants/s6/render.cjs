const puppeteer = require('puppeteer');
const path = require('path');
const {execFileSync} = require('child_process');
(async () => {
  const br = await puppeteer.launch({headless: 'new'});
  try {
    const p = await br.newPage();
    await p.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1});
    await p.goto('file://' + path.join(__dirname, 'variants.html'), {waitUntil: 'networkidle0'});
    await p.evaluate(() => document.fonts.ready);
    const els = await p.$$('.slide');
    for (let i = 0; i < els.length; i++) await els[i].screenshot({path: path.join(__dirname, `v6-${i + 1}.png`)});
  } finally { await br.close(); }
  execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw, ImageFont
import os
d=${JSON.stringify(__dirname)}
W,H=1180,664
sheet=Image.new('RGB',(W*2+60,(H+60)*3+20),'#ffffff')
dr=ImageDraw.Draw(sheet)
try: f=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',36)
except: f=None
for i in range(5):
  im=Image.open(os.path.join(d,f'v6-{i+1}.png')).convert('RGB').resize((W,H))
  x=20+(i%2)*(W+20); y=20+(i//2)*(H+60)
  dr.text((x,y),'ABCDE'[i],fill='#000',font=f)
  sheet.paste(im,(x,y+44))
sheet.save(os.path.join(d,'sheet.png'))
`]);
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });

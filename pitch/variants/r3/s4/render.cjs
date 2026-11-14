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
    for (let i = 0; i < els.length; i++) await els[i].screenshot({path: path.join(__dirname, `v${i + 1}.png`)});
  } finally { await br.close(); }
  execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw, ImageFont
import os
d=${JSON.stringify(__dirname)}
W=1180;H=int(W*1080/1920);pad=40
sheet=Image.new('RGB',(pad+2*(W+pad),pad+3*(H+pad+40)),'#e8e8e8')
dr=ImageDraw.Draw(sheet)
try: f=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',34)
except: f=None
for i in range(5):
  im=Image.open(os.path.join(d,f'v{i+1}.png')).convert('RGB').resize((W,H))
  x=pad+(i%2)*(W+pad);y=pad+(i//2)*(H+pad+40)
  dr.text((x,y),'ABCDE'[i],fill='#111',font=f)
  sheet.paste(im,(x,y+40))
sheet.save(os.path.join(d,'sheet.png'))
`]);
  console.log('ok');
})();

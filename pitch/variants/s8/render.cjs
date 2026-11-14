const puppeteer = require('puppeteer');
const path = require('path');
const { execFileSync } = require('child_process');
const DIR = __dirname;
(async () => {
  const br = await puppeteer.launch({ headless: 'new' });
  try {
    const p = await br.newPage();
    await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(DIR, 'variants.html'), { waitUntil: 'networkidle0' });
    await p.evaluate(() => document.fonts.ready);
    const slides = await p.$$('.slide');
    for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: path.join(DIR, `v8-${i + 1}.png`) });
    console.log(slides.length, 'slides');
  } finally { await br.close(); }
  execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw, ImageFont
import os
d=${JSON.stringify(DIR)}
W=1180;H=int(W*1080/1920);P=20;L=40
sheet=Image.new('RGB',(2*W+3*P,3*(H+L)+P),'#111')
dr=ImageDraw.Draw(sheet)
try: f=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',30)
except: f=None
for k in range(5):
  im=Image.open(os.path.join(d,'v8-%d.png'%(k+1))).resize((W,H),Image.LANCZOS)
  x=P+(k%2)*(W+P); y=(k//2)*(H+L)+L
  sheet.paste(im,(x,y)); dr.text((x,y-36),'ABCDE'[k],fill='white',font=f)
sheet.save(os.path.join(d,'sheet.png'))
`]);
})().catch(e => { console.error(e); process.exit(1); });

// NODE_PATH=".../vemotion/node_modules" node render.cjs : v1..v5.png, then sheet.png
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
    await new Promise(r => setTimeout(r, 400));
    const s = await p.$$('.slide');
    for (let i = 0; i < s.length; i++) await s[i].screenshot({ path: path.join(DIR, `v${i + 1}.png`) });
    console.log(s.length, 'slides');
  } finally { await br.close(); }
  execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw, ImageFont
import os
d=${JSON.stringify(DIR)}
ims=[Image.open(os.path.join(d,f'v{i}.png')).convert('RGB') for i in range(1,6)]
w=1180; h=int(1080*w/1920); pad=24; lab=50
S=Image.new('RGB',(2*w+3*pad, 3*(h+lab)+pad),(230,228,222))
dr=ImageDraw.Draw(S)
try: f=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',36)
except: f=None
for i,im in enumerate(ims):
  c,r=i%2,i//2; x=pad+c*(w+pad); y=r*(h+lab)+lab
  S.paste(im.resize((w,h),Image.LANCZOS),(x,y)); dr.text((x,y-44),'ABCDE'[i],fill=(20,20,20),font=f)
S.save(os.path.join(d,'sheet.png'))
`]);
})().catch(e => { console.error(e); process.exit(1); });

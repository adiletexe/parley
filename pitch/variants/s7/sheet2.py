import os, sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
W = 1160; H = round(W * 1080 / 1920); G = 40; P = 40; L = 50
im = Image.new('RGB', (P * 2 + W * 2 + G, P * 2 + (H + L) * 3 + G * 2), '#e4e1da')
dr = ImageDraw.Draw(im)
try:
    f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 36)
except Exception:
    f = None
for i in range(5):
    s = Image.open(os.path.join(d, 'r2-%d.png' % (i + 1))).convert('RGB').resize((W, H), Image.LANCZOS)
    x = P + (i % 2) * (W + G); y = P + (i // 2) * (H + L + G)
    dr.text((x, y), 'ABCDE'[i], fill='#111', font=f)
    im.paste(s, (x, y + L))
im.save(os.path.join(d, 'sheet2.png'))
print('sheet', im.size)

import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
W = 1170; H = int(W * 1080 / 1920); pad = 20; lab = 44
sheet = Image.new('RGB', (2 * W + 3 * pad, 3 * (H + lab + pad) + pad), 'white')
dr = ImageDraw.Draw(sheet)
try:
    f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 34)
except Exception:
    f = None
for i in range(5):
    im = Image.open(os.path.join(d, f'v{i+1}.png')).convert('RGB').resize((W, H), Image.LANCZOS)
    x = pad + (i % 2) * (W + pad); y = pad + (i // 2) * (H + lab + pad)
    dr.text((x, y), 'ABCDE'[i], fill='black', font=f)
    sheet.paste(im, (x, y + lab))
sheet.save(os.path.join(d, 'sheet.png'))
print('sheet', sheet.size)

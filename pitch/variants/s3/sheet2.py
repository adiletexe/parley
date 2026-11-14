import os, sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
W, H, pad, lab = 1180, 664, 40, 50
sheet = Image.new('RGB', (pad + 2 * (W + pad), pad + 3 * (H + pad + lab)), '#222')
dr = ImageDraw.Draw(sheet)
try:
    f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 38)
except Exception:
    f = None
for i in range(5):
    im = Image.open(os.path.join(d, f'r2-{i+1}.png')).resize((W, H))
    x = pad + (i % 2) * (W + pad)
    y = pad + (i // 2) * (H + pad + lab)
    dr.text((x, y), 'ABCDE'[i], fill='white', font=f)
    sheet.paste(im, (x, y + lab))
sheet.save(os.path.join(d, 'sheet2.png'))

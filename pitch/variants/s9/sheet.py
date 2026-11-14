import os, sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
w, h, pad = 1180, 664, 40
sheet = Image.new('RGB', (2 * w + 3 * pad, 3 * (h + pad + 50) + pad), '#222')
dr = ImageDraw.Draw(sheet)
f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 40)
for i in range(5):
    im = Image.open(os.path.join(d, f'v9-{i+1}.png')).convert('RGB').resize((w, h))
    x = pad + (i % 2) * (w + pad); y = pad + (i // 2) * (h + pad + 50)
    dr.text((x, y), 'ABCDE'[i], fill='white', font=f)
    sheet.paste(im, (x, y + 50))
sheet.save(os.path.join(d, 'sheet.png'))

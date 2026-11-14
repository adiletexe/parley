from PIL import Image, ImageDraw, ImageFont
import os
d = os.path.dirname(os.path.abspath(__file__))
W = 1160; H = round(W * 1080 / 1920); G = 40; P = 40; L = 60
ims = [Image.open(os.path.join(d, f'r2-{i}.png')).convert('RGB').resize((W, H), Image.LANCZOS) for i in range(1, 6)]
sheet = Image.new('RGB', (P * 2 + W * 2 + G, P * 2 + (H + L) * 3), '#e4e1da')
dr = ImageDraw.Draw(sheet)
try:
    f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 40)
except Exception:
    f = None
for i, im in enumerate(ims):
    x = P + (i % 2) * (W + G); y = P + (i // 2) * (H + L)
    dr.text((x, y), 'ABCDE'[i], fill='#111', font=f)
    sheet.paste(im, (x, y + 50))
sheet.save(os.path.join(d, 'sheet2.png'))

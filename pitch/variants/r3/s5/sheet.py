from PIL import Image, ImageDraw, ImageFont
import os
d = os.path.dirname(os.path.abspath(__file__))
W, H, G, L = 1180, 664, 20, 50
cols, n = 2, 5
rows = (n + 1) // 2
sheet = Image.new('RGB', (G + cols * (W + G), G + rows * (H + L + G)), (30, 30, 34))
dr = ImageDraw.Draw(sheet)
try:
    f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 36)
except Exception:
    f = ImageFont.load_default()
for i in range(n):
    im = Image.open(os.path.join(d, f'v{i+1}.png')).convert('RGB').resize((W, H), Image.LANCZOS)
    x = G + (i % cols) * (W + G); y = G + (i // cols) * (H + L + G)
    dr.text((x, y + 4), 'ABCDE'[i], fill=(240, 240, 240), font=f)
    sheet.paste(im, (x, y + L))
sheet.save(os.path.join(d, 'sheet.png'))

import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; W = 1180; H = int(W * 1080 / 1920); pad = 20; lab = 50
ims = [Image.open(os.path.join(d, f'v{i}.png')).convert('RGB').resize((W, H), Image.LANCZOS) for i in range(1, 6)]
rows = 3
sheet = Image.new('RGB', (2 * W + 3 * pad, rows * (H + lab) + (rows + 1) * pad), '#e9eaf0')
dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 36)
except Exception: font = ImageFont.load_default()
for i, im in enumerate(ims):
    x = pad + (i % 2) * (W + pad); y = pad + (i // 2) * (H + lab + pad)
    dr.text((x, y + 4), 'ABCDE'[i], fill='#1d1f2b', font=font)
    sheet.paste(im, (x, y + lab))
sheet.save(os.path.join(d, 'sheet.png'))

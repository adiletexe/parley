import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; W = 1180; H = int(W * 1080 / 1920); pad = 40; lab = 50
sheet = Image.new('RGB', (2 * W + 3 * pad, 3 * (H + lab) + 4 * pad), (34, 34, 38))
dr = ImageDraw.Draw(sheet)
try:
    f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 40)
except Exception:
    f = ImageFont.load_default()
for i, L in enumerate('ABCDE'):
    im = Image.open(os.path.join(d, f'v{i+1}.png')).convert('RGB').resize((W, H), Image.LANCZOS)
    x = pad + (i % 2) * (W + pad); y = pad + (i // 2) * (H + lab + pad)
    dr.text((x, y), L, fill=(240, 240, 240), font=f)
    sheet.paste(im, (x, y + lab))
sheet.save(os.path.join(d, 'sheet.png'))

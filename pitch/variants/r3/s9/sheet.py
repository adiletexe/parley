import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; W = 1160; H = int(W * 1080 / 1920); pad = 40; lab = 50
ims = [Image.open(os.path.join(d, f'v{i}.png')).convert('RGB').resize((W, H), Image.LANCZOS) for i in range(1, 6)]
rows = 3; sw = pad * 3 + W * 2; sh = pad + rows * (lab + H + pad)
s = Image.new('RGB', (sw, sh), (34, 34, 34)); dr = ImageDraw.Draw(s)
try: f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 36)
except Exception: f = ImageFont.load_default()
for i, im in enumerate(ims):
    x = pad + (i % 2) * (W + pad); y = pad + (i // 2) * (lab + H + pad)
    dr.text((x, y), 'ABCDE'[i], fill=(240, 240, 240), font=f); s.paste(im, (x, y + lab))
s.save(os.path.join(d, 'sheet.png'))

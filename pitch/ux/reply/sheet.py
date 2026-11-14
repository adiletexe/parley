from PIL import Image, ImageDraw, ImageFont
import os
d = os.path.dirname(os.path.abspath(__file__))
cols = [('Now', os.path.join(d, '../../shots/reply-result.png'))] + [(k, os.path.join(d, k + '.png')) for k in 'ABCDE']
W, H, G, T = 780, 1688, 40, 110
sheet = Image.new('RGB', (G + len(cols) * (W + G), T + H + G), (223, 225, 234))
dr = ImageDraw.Draw(sheet)
try: f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 64)
except Exception: f = ImageFont.load_default()
for i, (lab, p) in enumerate(cols):
    im = Image.open(p).convert('RGB')
    im = im.resize((W, round(im.height * W / im.width))).crop((0, 0, W, H))
    x = G + i * (W + G)
    sheet.paste(im, (x, T))
    dr.text((x + 6, 24), lab, fill=(29, 31, 43), font=f)
sheet = sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS)
sheet.save(os.path.join(d, 'sheet.png'))

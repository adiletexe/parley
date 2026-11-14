# Refs row (each app's quiz screen 1, as captured) on top, then A1 A2 | B1 B2 | C1 C2.
from PIL import Image, ImageDraw, ImageFont
import os
d = os.path.dirname(os.path.abspath(__file__))
refs = [('Finelo', 'finelo-quiz-1'), ('Coursiv', 'coursiv-quiz-1'), ('BetterMe', 'betterme-quiz-1'), ('Headway', 'headway-quiz-1'), ('Liven', 'liven-quiz-1'), ('Noom', 'noom-quiz-1')]
ours = [('A · screen 1', 'A1'), ('A · screen 2', 'A2'), ('B · screen 1', 'B1'), ('B · screen 2', 'B2'), ('C · screen 1', 'C1'), ('C · screen 2', 'C2')]
W, H, G, T = 390, 844, 30, 60
try: f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 30)
except Exception: f = ImageFont.load_default()
cols = 6
sheet = Image.new('RGB', (G + cols * (W + G), 2 * (T + H) + 2 * G), (223, 225, 234))
dr = ImageDraw.Draw(sheet)
def put(row, items, path):
    y = G + row * (T + H + G)
    for i, (lab, name) in enumerate(items):
        im = Image.open(path(name)).convert('RGB')
        # fit inside W×H keeping aspect, on a white card
        s = min(W / im.width, H / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        x = G + i * (W + G)
        sheet.paste((255, 255, 255), (x, y + T, x + W, y + T + H))
        sheet.paste(im, (x + (W - im.width) // 2, y + T))
        dr.text((x + 4, y + 14), lab, fill=(29, 31, 43), font=f)
put(0, refs, lambda n: os.path.join(d, 'refs', n + '.jpg'))
put(1, ours, lambda n: os.path.join(d, n + '.png'))
sheet.save(os.path.join(d, 'sheet.png'))

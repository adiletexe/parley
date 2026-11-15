# One contact sheet per flow: a row per variant (A/B/C), each screen captioned.
from PIL import Image, ImageDraw, ImageFont
import os, json
d = os.path.dirname(os.path.abspath(__file__))
caps = dict(json.load(open(os.path.join(d, 'caps.json'))))
NAMES = {
  'home': {'A': 'A · Course · Reply · Record', 'B': 'B · Today · Tools', 'C': 'C · Path + "Got a message?" button'},
  'day': {'A': 'A · Story cards + pick drill', 'B': 'B · Short read + spot + write your own', 'C': 'C · Coach chat'},
  'prog': {'A': 'A · Checklist + then/now', 'B': 'B · Check-in + can do now', 'C': 'C · Badge + real-life log'},
}
OUT = {'home': 'sheet-home.png', 'day': 'sheet-day.png', 'prog': 'sheet-progress.png'}
W, H, G, T, C = 780, 1688, 40, 120, 90
def font(s):
    try: return ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', s)
    except Exception: return ImageFont.load_default()
fh, fc = font(60), font(34)
for flow, names in NAMES.items():
    rows = [(v, sorted(k for k in caps if k.startswith(f'{flow}-{v}-'))) for v in 'ABC']
    n = max(len(r[1]) for r in rows)
    rowh = T + H + C + G
    sheet = Image.new('RGB', (G + n * (W + G), G + 3 * rowh), (223, 225, 234))
    dr = ImageDraw.Draw(sheet)
    for ri, (v, ids) in enumerate(rows):
        y = G + ri * rowh
        dr.text((G + 6, y + 20), names[v], fill=(29, 31, 43), font=fh)
        for i, k in enumerate(ids):
            im = Image.open(os.path.join(d, k + '.png')).convert('RGB').resize((W, H))
            x = G + i * (W + G)
            sheet.paste(im, (x, y + T))
            dr.text((x + 6, y + T + H + 22), f'{i + 1}. {caps[k]}', fill=(80, 84, 100), font=fc)
    sheet = sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS)
    sheet.save(os.path.join(d, OUT[flow]))

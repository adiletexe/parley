import json, os, re
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.dirname(here)
man = json.load(open(os.path.join(here, 'manifest.json')))
def font(s, bold=True):
    for p in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, s)
    return ImageFont.load_default()
W, H = 390*2, 844*2; S = 0.5; w, h = int(W*S), int(H*S); gap = 28; lab = 90; cap = 34; M = 40
for f in man:
    cols = max(len(v['screens']) for v in f['variants']); rows = len(f['variants'])
    sheet = Image.new('RGB', (M*2 + cols*w + (cols-1)*gap, 110 + rows*(lab + h + cap + 30)), '#e9ebf3')
    d = ImageDraw.Draw(sheet)
    d.text((M, 34), f"Parley 28-day course · {f['name']}", font=font(34), fill='#1d1f2b')
    y = 110
    for v in f['variants']:
        d.text((M, y), f"Variant {v['v']}", font=font(26), fill='#5b6cf6')
        d.text((M, y+36), v['d'], font=font(19, False), fill='#666a7a')
        y += lab
        for i, s in enumerate(v['screens']):
            name = f"{f['key']}-{v['v']}{i+1}-" + re.sub(r'-$', '', re.sub(r'[^a-z0-9]+', '-', s['title'].lower())) + '.png'
            im = Image.open(os.path.join(out, name)).convert('RGB').resize((w, h), Image.LANCZOS)
            x = M + i*(w+gap); sheet.paste(im, (x, y)); d.rectangle([x-1, y-1, x+w, y+h], outline='#d5d8e5')
            d.text((x, y+h+8), f"{v['v']}{i+1} · {s['title']}", font=font(18), fill='#1d1f2b')
        y += h + cap + 30
    sheet.save(os.path.join(out, f"sheet-{f['key']}.png")); print(f['key'], sheet.size)

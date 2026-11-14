from PIL import Image, ImageDraw, ImageFont
W = 1180; H = int(1080 * W / 1920); pad = 30
sheet = Image.new('RGB', (2 * W + 3 * pad, 3 * (H + pad + 44) + pad), '#222')
d = ImageDraw.Draw(sheet)
try:
    f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 34)
except Exception:
    f = None
for i in range(5):
    im = Image.open('v5-%d.png' % (i + 1)).resize((W, H), Image.LANCZOS)
    x = pad + (i % 2) * (W + pad); y = pad + (i // 2) * (H + pad + 44)
    d.text((x, y), 'ABCDE'[i], fill='white', font=f)
    sheet.paste(im, (x, y + 44))
sheet.save('sheet.png')

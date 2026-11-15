"""Trace the founder's logo (white mark on black, ~508px JPEG) into a clean SVG path.
Upscale, threshold, find contours with holes, simplify, write as one even-odd path.
Usage: python3 pitch/trace-logo.py ~/Downloads/logo public/logo.svg public/favicon.svg"""
import sys, cv2, numpy as np

src, out_mark, out_fav = sys.argv[1:4]
img = cv2.imread(src, cv2.IMREAD_GRAYSCALE)
img = cv2.resize(img, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
img = cv2.GaussianBlur(img, (5, 5), 0)
_, bw = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY)
# The JPEG is a black square with the white mark; clear a thin border so the square itself never becomes a contour.
h_, w_ = bw.shape; bw[:12, :] = 0; bw[-12:, :] = 0; bw[:, :12] = 0; bw[:, -12:] = 0
contours, hier = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)

ys, xs = np.where(bw > 0)
x0, y0, x1, y1 = xs.min(), ys.min(), xs.max(), ys.max()
side = max(x1 - x0, y1 - y0)
pad = side * 0.04
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
scale = 100 / (side + 2 * pad)

def fmt(v): return f'{v:.2f}'.rstrip('0').rstrip('.')

parts = []
for c in contours:
    a = cv2.contourArea(c)
    if a < 400 or a > 0.9 * bw.shape[0] * bw.shape[1]: continue
    c = cv2.approxPolyDP(c, 1.2, True)[:, 0, :]
    pts = [((x - cx) * scale + 50, (y - cy) * scale + 50) for x, y in c]
    parts.append('M' + ' L'.join(f'{fmt(x)} {fmt(y)}' for x, y in pts) + 'Z')
d = ' '.join(parts)

mark = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><!-- Parley mark, traced from the founder\'s logo by pitch/trace-logo.py --><path fill="currentColor" fill-rule="evenodd" d="{d}"/></svg>\n'
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
       '<stop offset="0" stop-color="#9b84ff"/><stop offset=".5" stop-color="#5b6cf6"/><stop offset="1" stop-color="#3f8df5"/></linearGradient></defs>'
       f'<path fill="url(#g)" fill-rule="evenodd" d="{d}"/></svg>\n')
open(out_mark, 'w').write(mark)
open(out_fav, 'w').write(fav)
print('contours', len(parts), 'path chars', len(d))

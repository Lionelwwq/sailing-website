"""Put the company sign (logo + name) on the wall above the warehouse door.

Reads the sign-free pictures in _src/warehouse/ and writes the home page pictures
assets/img/warehouse/entrance.webp and entrance-closed.webp, with the same sign in the same place,
so the door animation still lines up. Run again after changing the logo, colours or name:

    python _src/warehouse_sign.py
"""
import math
import pathlib

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src' / 'warehouse'
OUT = ROOT / 'assets' / 'img' / 'warehouse'

NAME = 'SAILING'
TAGLINE = 'INTERNATIONAL TRADE LTD'
FONT = 'C:/Windows/Fonts/bahnschrift.ttf'      # DIN-style signage font that ships with Windows
FACE_TOP, FACE_BOTTOM = (80, 46, 162), (34, 12, 94)   # glossy indigo-purple metal (Sailing purple #3E2876 range)
SIDE = (20, 8, 54)                                       # letter depth
HALO = (128, 106, 155)                                   # #806A9B back-light
CENTER = (1598, 450)                                     # sign centre on the 3200 x 1800 picture
SCALE = 1.06                                             # sign size
PHOTO = {'sharpen': 60, 'contrast': 1.06, 'colour': 1.08}   # gentle clean-up of the whole outside picture
S = 3                                                    # draw bigger, then shrink, for smooth edges


def wheel(d):
    """Ship's wheel like the Sailing logo mark, as a mask of size d x d."""
    m = Image.new('L', (d, d), 0)
    g = ImageDraw.Draw(m)
    c = d / 2
    u = d / 2

    def ring(r_out, r_in):
        g.ellipse([c - r_out, c - r_out, c + r_out, c + r_out], fill=255)
        g.ellipse([c - r_in, c - r_in, c + r_in, c + r_in], fill=0)

    def bar(r0, r1, ang, w):
        x0, y0 = c + r0 * math.cos(ang), c + r0 * math.sin(ang)
        x1, y1 = c + r1 * math.cos(ang), c + r1 * math.sin(ang)
        g.line([x0, y0, x1, y1], fill=255, width=int(w))
        for x, y in ((x0, y0), (x1, y1)):
            g.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)

    for k in range(8):
        a = k * math.pi / 4
        bar(0.60 * u, 0.80 * u, a, 0.08 * u)           # handle shaft
        bar(0.79 * u, 0.92 * u, a, 0.14 * u)           # handle grip (rounded)
    ring(0.65 * u, 0.50 * u)                            # rim
    for k in range(8):
        a = k * math.pi / 4
        bar(0.15 * u, 0.36 * u, a, 0.038 * u)          # inner spokes
        t = a + math.pi / 2                            # small cross bar near the rim
        cx, cy = c + 0.37 * u * math.cos(a), c + 0.37 * u * math.sin(a)
        g.line([cx - 0.05 * u * math.cos(t), cy - 0.05 * u * math.sin(t), cx + 0.05 * u * math.cos(t), cy + 0.05 * u * math.sin(t)], fill=255, width=int(0.04 * u))
    g.ellipse([c - 0.075 * u, c - 0.11 * u, c + 0.075 * u, c + 0.11 * u], fill=255)  # hub
    return m


def text_mask(text, size, weight, tracking=0.0):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    widths = [f.getlength(ch) for ch in text]
    w = int(sum(widths) + tracking * size * (len(text) - 1)) + size
    asc, desc = f.getmetrics()
    m = Image.new('L', (w, asc + desc), 0)
    g = ImageDraw.Draw(m)
    x = 0
    for ch, cw in zip(text, widths):
        g.text((x, 0), ch, font=f, fill=255)
        x += cw + tracking * size
    return m.crop(m.getbbox())


def sign_mask():
    name = text_mask(NAME, int(170 * SCALE) * S, b'Bold', 0.04)
    tag = text_mask(TAGLINE, int(46 * SCALE) * S, b'SemiBold', 0.22)
    tag = tag.resize((name.width, int(tag.height * name.width / tag.width)), Image.LANCZOS) if tag.width > name.width else tag
    gap = 26 * S
    block_h = name.height + gap + tag.height
    wd = int(block_h * 1.32)
    mark = wheel(wd)
    space = 46 * S
    W = wd + space + max(name.width, tag.width)
    H = max(wd, block_h)
    m = Image.new('L', (W, H), 0)
    m.paste(mark, (0, (H - wd) // 2))
    tx = wd + space
    ty = (H - block_h) // 2
    m.paste(name, (tx, ty))
    m.paste(tag, (tx + (name.width - tag.width) // 2 if tag.width < name.width else tx, ty + name.height + gap))
    return m


def build_layers():
    m = sign_mask()
    pad = 60 * S
    W, H = m.width + 2 * pad, m.height + 2 * pad
    mask = Image.new('L', (W, H), 0)
    mask.paste(m, (pad, pad))

    def shifted(img, dx, dy):
        out = Image.new('L', img.size, 0)
        out.paste(img, (dx, dy))
        return out

    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # soft shadow on the wall (light from above) and a faint purple back-light
    shadow = shifted(mask, 6 * S, 14 * S).filter(ImageFilter.GaussianBlur(12 * S)).point(lambda v: int(v * 0.30))
    layer.paste(Image.new('RGBA', (W, H), (10, 10, 20, 255)), (0, 0), shadow)
    halo = mask.filter(ImageFilter.GaussianBlur(22 * S)).point(lambda v: int(v * 0.32))
    layer.alpha_composite(Image.merge('RGBA', (*Image.new('RGB', (W, H), HALO).split(), halo)))
    # letter depth: the face shifted a few pixels, in a dark tone
    depth = Image.new('L', (W, H), 0)
    for k in range(1, 5):
        depth = ImageChops.lighter(depth, shifted(mask, k * S, k * S))
    layer.paste(Image.new('RGBA', (W, H), SIDE + (255,)), (0, 0), depth)
    # the face: vertical brushed-metal gradient with a thin bright top edge
    grad = Image.new('RGB', (1, H))
    for y in range(H):
        t = y / (H - 1)
        grad.putpixel((0, y), tuple(int(FACE_TOP[i] + (FACE_BOTTOM[i] - FACE_TOP[i]) * t) for i in range(3)))
    face = grad.resize((W, H))
    layer.paste(face, (0, 0), mask)
    edge = ImageChops.subtract(mask, shifted(mask, 0, 3 * S)).point(lambda v: int(v * 0.75))
    layer.paste(Image.new('RGBA', (W, H), (196, 178, 246, 255)), (0, 0), edge)
    # soft gloss on the upper part of each letter
    gloss = ImageChops.subtract(mask, shifted(mask, 0, 14 * S)).filter(ImageFilter.GaussianBlur(4 * S)).point(lambda v: int(v * 0.22))
    gloss = ImageChops.multiply(gloss, mask)
    layer.paste(Image.new('RGBA', (W, H), (210, 196, 255, 255)), (0, 0), gloss)
    return layer.resize((W // S, H // S), Image.LANCZOS)


def main():
    sign = build_layers()
    x = CENTER[0] - sign.width // 2
    y = CENTER[1] - sign.height // 2
    for name in ('entrance.webp', 'entrance-closed.webp'):
        base = Image.open(SRC / name).convert('RGB')
        base = base.filter(ImageFilter.UnsharpMask(radius=2, percent=PHOTO['sharpen'], threshold=2))
        base = ImageEnhance.Contrast(base).enhance(PHOTO['contrast'])
        base = ImageEnhance.Color(base).enhance(PHOTO['colour']).convert('RGBA')
        base.alpha_composite(sign, (x, y))
        base.convert('RGB').save(OUT / name, 'WEBP', quality=80, method=6)
        print('wrote', OUT / name)
    print('sign size', sign.size, 'at', (x, y))


if __name__ == '__main__':
    main()

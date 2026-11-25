"""Put the company sign (new script-S logo + name) on the wall above the warehouse door.

Reads the sign-free pictures in _src/warehouse/ and writes the home page pictures
assets/img/warehouse/entrance.webp and entrance-closed.webp, with the same sign in the same place,
so the door animation still lines up. Run again after changing the logo, colours or name:

    python _src/warehouse_sign.py
"""
import pathlib

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src' / 'warehouse'
MARK = ROOT / '_src' / 'brand' / 'sailing-mark.png'   # the logo mark, in its own colours
OUT = ROOT / 'assets' / 'img' / 'warehouse'

NAME = 'SAILING'
TAGLINE = 'INTERNATIONAL TRADE LTD'
FONT = 'C:/Windows/Fonts/bahnschrift.ttf'      # DIN-style signage font that ships with Windows
FACE_TOP, FACE_BOTTOM = (106, 72, 158), (63, 42, 99)  # glossy purple metal: Rebecca Purple #5A3A8A to Dark Amethyst #3F2A63
SIDE = (37, 26, 60)                                      # letter depth
HALO = (140, 116, 176)                                   # #8C74B0 back-light
CENTER = (1598, 450)                                     # sign centre on the 3200 x 1800 picture
SCALE = 1.06                                             # sign size
PHOTO = {'sharpen': 60, 'contrast': 1.06, 'colour': 1.08}   # gentle clean-up of the whole outside picture
S = 3                                                    # draw bigger, then shrink, for smooth edges


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


def sign_parts():
    """Masks for the lettering and for the logo mark, plus the mark in colour, all the same size."""
    name = text_mask(NAME, int(170 * SCALE) * S, b'Bold', 0.04)
    tag = text_mask(TAGLINE, int(46 * SCALE) * S, b'SemiBold', 0.22)
    tag = tag.resize((name.width, int(tag.height * name.width / tag.width)), Image.LANCZOS) if tag.width > name.width else tag
    gap = 26 * S
    block_h = name.height + gap + tag.height
    mk = Image.open(MARK).convert('RGBA')
    mk = mk.crop(mk.getbbox())
    mh = int(block_h * 1.3)
    mk = mk.resize((int(mk.width * mh / mk.height), mh), Image.LANCZOS)
    space = 40 * S
    W = mk.width + space + max(name.width, tag.width)
    H = max(mh, block_h)
    letters = Image.new('L', (W, H), 0)
    tx = mk.width + space
    ty = (H - block_h) // 2
    letters.paste(name, (tx, ty))
    letters.paste(tag, (tx + (name.width - tag.width) // 2 if tag.width < name.width else tx, ty + name.height + gap))
    colour = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    colour.paste(mk, (0, (H - mh) // 2))
    return letters, colour.split()[3], colour


def build_layers():
    letters, mark_a, mark_rgba = sign_parts()
    pad = 60 * S
    W, H = letters.width + 2 * pad, letters.height + 2 * pad

    def padded(img, mode='L'):
        out = Image.new(mode, (W, H), 0 if mode == 'L' else (0, 0, 0, 0))
        out.paste(img, (pad, pad))
        return out
    text_mask_p = padded(letters)
    mask = ImageChops.lighter(text_mask_p, padded(mark_a))     # lettering and mark together, for shadow, glow and depth

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
    layer.paste(face, (0, 0), text_mask_p)
    edge = ImageChops.subtract(text_mask_p, shifted(text_mask_p, 0, 3 * S)).point(lambda v: int(v * 0.75))
    layer.paste(Image.new('RGBA', (W, H), (196, 178, 246, 255)), (0, 0), edge)
    # the logo mark keeps its own colours (purple ribbon with gold edges and the sailboat)
    layer.alpha_composite(padded(mark_rgba, 'RGBA'))
    # soft gloss on the upper part of each letter
    gloss = ImageChops.subtract(text_mask_p, shifted(text_mask_p, 0, 14 * S)).filter(ImageFilter.GaussianBlur(4 * S)).point(lambda v: int(v * 0.22))
    gloss = ImageChops.multiply(gloss, text_mask_p)
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

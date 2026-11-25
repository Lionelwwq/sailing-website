"""Make the website's logo files from the new Sailing mark (_src/brand/sailing-mark.png).

    python _src/make_logo.py

Writes:
    assets/img/site/sailing-logo.png             header and footer logo: mark + SAILING / INTERNATIONAL TRADE LTD, for dark backgrounds
    assets/img/site/sailing-mark.png        the mark alone in its own colours (browser tab icon)
    assets/img/site/sailing-mark-light.png  the mark alone, lightened for dark backgrounds (catalogue)
"""
import colorsys
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
MARK = ROOT / '_src' / 'brand' / 'sailing-mark.png'
OUT = ROOT / 'assets' / 'img' / 'site'
FONT = 'C:/Windows/Fonts/bahnschrift.ttf'      # same signage font as the building sign (_src/warehouse_sign.py)


def mark():
    m = Image.open(MARK).convert('RGBA')
    return m.crop(m.getbbox())


def lighten(im, lift=0.42):
    """The purples a good deal lighter, so the mark stands out on dark backgrounds; gold and pink stay."""
    src, out = im.load(), im.copy()
    dst = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = src[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.15 and 0.62 < h < 0.95:
                v, s = v + (1 - v) * lift, s * 0.82
            rr, gg, bb = colorsys.hsv_to_rgb(h, s, v)
            dst[x, y] = (round(rr * 255), round(gg * 255), round(bb * 255), a)
    return out


def text(t, size, weight, tracking, fill):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    widths = [f.getlength(ch) for ch in t]
    w = int(sum(widths) + tracking * size * (len(t) - 1)) + size
    asc, desc = f.getmetrics()
    im = Image.new('RGBA', (w, asc + desc), (0, 0, 0, 0))
    g = ImageDraw.Draw(im)
    x = 0
    for ch, cw in zip(t, widths):
        g.text((x, 0), ch, font=f, fill=fill)
        x += cw + tracking * size
    return im.crop(im.getbbox())


def lockup(mk, fill=(255, 255, 255, 255), H=150):
    mk = mk.resize((round(mk.width * H / mk.height), H), Image.LANCZOS)
    name = text('SAILING', 62, b'Bold', 0.05, fill)
    tag = text('INTERNATIONAL TRADE LTD', 22, b'SemiBold', 0.16, fill)
    if tag.width > name.width:
        name = name.resize((tag.width, round(name.height * tag.width / name.width)), Image.LANCZOS)
    else:
        tag = tag.resize((name.width, round(tag.height * name.width / tag.width)), Image.LANCZOS)
    gap, space = 14, 22
    block = name.height + gap + tag.height
    im = Image.new('RGBA', (mk.width + space + name.width, H), (0, 0, 0, 0))
    im.alpha_composite(mk, (0, 0))
    y = (H - block) // 2
    im.alpha_composite(name, (mk.width + space, y))
    im.alpha_composite(tag, (mk.width + space, y + name.height + gap))
    return im


def square(im, size, pad=0.06):
    s = round(size * (1 - 2 * pad))
    k = s / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return out


def main():
    m = mark()
    light = lighten(m)
    lock = lockup(light)
    lock.save(OUT / 'sailing-logo.png', optimize=True)
    square(m, 192).save(OUT / 'sailing-mark.png', optimize=True)
    lm = light.resize((600, round(light.height * 600 / light.width)), Image.LANCZOS)
    lm.save(OUT / 'sailing-mark-light.png', optimize=True)
    print('sailing-logo.png', lock.size, '| sailing-mark.png 192 x 192 | sailing-mark-light.png', lm.size)


if __name__ == '__main__':
    main()

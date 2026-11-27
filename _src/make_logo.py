"""Make the website's logo files from Sailing's logo artwork (2026: the mark with gold details, used everywhere).

    _src/brand/sailing-mark.png     the mark alone (from Logo_Signature_Boat.pdf)
    _src/brand/sailing-lockup.png   the mark with SAILING (from Logo_Sailing.pdf)
To change the logo: export new PNGs with a transparent background over these two files and run this script.

    python _src/make_logo.py

Writes:
    assets/img/site/sailing-logo.png        header logo: the logo as designed, for the white header bar
    assets/img/site/sailing-logo-light.png  footer logo: the lightened mark + SAILING in white, for dark backgrounds
    assets/img/site/sailing-mark.png        the mark alone in its own colours (browser tab icon)
    assets/img/site/sailing-mark-light.png  the mark alone, lightened for dark backgrounds (catalogue)
"""
import colorsys
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
MARK = ROOT / '_src' / 'brand' / 'sailing-mark.png'
LOCKUP = ROOT / '_src' / 'brand' / 'sailing-lockup.png'
OUT = ROOT / 'assets' / 'img' / 'site'


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


def square(im, size, pad=0.06):
    s = round(size * (1 - 2 * pad))
    k = s / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return out


def split_lockup():
    """The designed logo, cut into the mark and the word at the empty gap between them."""
    lk = Image.open(LOCKUP).convert('RGBA')
    lk = lk.crop(lk.getbbox())
    a = lk.getchannel('A').load()
    filled = [any(a[x, y] > 40 for y in range(0, lk.height, 2)) for x in range(lk.width)]
    end = next(x for x in range(lk.width // 8, lk.width) if not filled[x])      # first empty column after the mark
    start = next(x for x in range(end, lk.width) if filled[x])                    # where SAILING starts
    return lk, end, start


def whiten(im):
    """Every visible pixel white, keeping its transparency (the word on dark backgrounds)."""
    out = Image.new('RGBA', im.size, (255, 255, 255, 0))
    out.putalpha(im.getchannel('A'))
    return out


def main():
    m = mark()
    light = lighten(m)
    lk, end, start = split_lockup()
    H = 150
    head = lk.resize((round(lk.width * H / lk.height), H), Image.LANCZOS)
    head.save(OUT / 'sailing-logo.png', optimize=True)
    # footer: the same logo, the mark lightened and the word in white
    foot = Image.new('RGBA', lk.size, (0, 0, 0, 0))
    foot.alpha_composite(lighten(lk.crop((0, 0, end, lk.height))), (0, 0))
    foot.alpha_composite(whiten(lk.crop((start, 0, lk.width, lk.height))), (start, 0))
    foot = foot.resize(head.size, Image.LANCZOS)
    foot.save(OUT / 'sailing-logo-light.png', optimize=True)
    square(m, 192).save(OUT / 'sailing-mark.png', optimize=True)
    lm = light.resize((600, round(light.height * 600 / light.width)), Image.LANCZOS)
    lm.save(OUT / 'sailing-mark-light.png', optimize=True)
    print('sailing-logo.png', head.size, '| sailing-logo-light.png', foot.size, '| sailing-mark.png 192 x 192 | sailing-mark-light.png', lm.size)


if __name__ == '__main__':
    main()

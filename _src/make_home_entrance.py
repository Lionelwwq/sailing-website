"""Make the home page front-door pictures.

    python _src/make_home_entrance.py day.png [dusk.png night.png]

    e.g. python _src/make_home_entrance.py "C:\\Users\\w2412\\Downloads\\Sailing-showroom-inside\\home\\front-door-day.png" \\
             "C:\\Users\\w2412\\Downloads\\Sailing-showroom-inside\\home\\front-door-dusk.png" \\
             "C:\\Users\\w2412\\Downloads\\Sailing-showroom-inside\\home\\front-door-night.png"

Writes (the dusk and night versions only when given; all three must be the same shot, lined up, because the home page
slowly fades from day to dusk to night and back):
    assets/img/site/front-entrance.jpg, -dusk.jpg, -night.jpg        home page cover, 3200 px wide (computers)
    assets/img/site/front-entrance-m.jpg, -dusk-m.jpg, -night-m.jpg  the same, 1280 px wide (phones)
The walk-in through the doors ends on the showroom photo (assets/img/showroom/showroom-m.jpg, made with
_src/make_showroom.py). If the doors sit somewhere else in a new picture, update DOORS in assets/js/home-door.js.
"""
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / 'assets' / 'img' / 'site'
BIG_W, PHONE_W = 3200, 1280


def main():
    if len(sys.argv) not in (2, 4):
        raise SystemExit(__doc__)
    sizes = set()
    for src_path, suffix in zip(sys.argv[1:], ('', '-dusk', '-night')):
        src = Image.open(src_path)
        src.load()
        src = src.convert('RGB')
        sizes.add(src.size)
        for name, width, q in ((f'front-entrance{suffix}.jpg', BIG_W, 82), (f'front-entrance{suffix}-m.jpg', PHONE_W, 80)):
            w = min(width, src.width)
            im = src.resize((w, round(src.height * w / src.width)), Image.LANCZOS) if w != src.width else src
            im.save(SITE / name, quality=q, optimize=True, progressive=True)
            print(name, im.size, f'{(SITE / name).stat().st_size // 1024} KB')
    if len(sizes) > 1:
        raise SystemExit(f'the pictures are not the same size {sizes}: they must be the same shot to fade into each other')


if __name__ == '__main__':
    main()

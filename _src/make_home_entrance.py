"""Make the home page front-door pictures.

    python _src/make_home_entrance.py "C:\\Users\\w2412\\Downloads\\Sailing-entrance-new\\sailing-front-entrance.png"

Writes:
    assets/img/site/front-entrance.jpg      home page cover, 2560 px wide (desktop)
    assets/img/site/front-entrance-m.jpg    the same, 1280 px wide (phones)
The walk-in through the doors ends on the showroom photo (assets/img/showroom/showroom-m.jpg, made with
_src/make_showroom.py). If the doors sit somewhere else in a new picture, update DOORS in assets/js/home-door.js.
"""
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / 'assets' / 'img' / 'site'


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = Image.open(sys.argv[1])
    src.load()
    src = src.convert('RGB')
    for name, width, q in (('front-entrance.jpg', 2560, 82), ('front-entrance-m.jpg', 1280, 80)):
        im = src.resize((width, round(src.height * width / src.width)), Image.LANCZOS)
        im.save(SITE / name, quality=q, optimize=True, progressive=True)
        print(name, im.size)


if __name__ == '__main__':
    main()

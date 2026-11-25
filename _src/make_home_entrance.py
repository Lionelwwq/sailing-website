"""Make the home page front-door pictures and the first view of the 360 showroom.

    python _src/make_home_entrance.py "C:\\Users\\w2412\\Downloads\\Sailing-entrance-new\\sailing-front-entrance.png"

Writes:
    assets/img/site/front-entrance.jpg      home page cover, 2560 px wide (desktop)
    assets/img/site/front-entrance-m.jpg    the same, 1280 px wide (phones)
    assets/img/showroom/entrance-view.jpg   what the 360 showroom shows first (entrance spot, facing north):
                                            the walk-in from the front door blends into it, and the showroom page
                                            shows it while the 360 picture loads
Run the last part again after changing the entrance 360 (assets/img/showroom/entrance.jpg).
"""
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / 'assets' / 'img' / 'site'
SHOW = ROOT / 'assets' / 'img' / 'showroom'


def view(eq, yaw_deg, pitch_deg, hfov_deg, w, h):
    """Flat view of an equirectangular 360 picture, as the viewer shows it."""
    H, W, _ = eq.shape
    f = (w / 2) / np.tan(np.radians(hfov_deg) / 2)
    xs, ys = np.meshgrid(np.arange(w) - w / 2 + 0.5, np.arange(h) - h / 2 + 0.5)
    x, y, z = xs, -ys, np.full(xs.shape, f)
    p = np.radians(pitch_deg)
    y, z = y * np.cos(p) + z * np.sin(p), -y * np.sin(p) + z * np.cos(p)
    a = np.radians(yaw_deg)
    xr, zr = x * np.cos(a) + z * np.sin(a), -x * np.sin(a) + z * np.cos(a)
    lon, lat = np.arctan2(xr, zr), np.arctan2(y, np.hypot(xr, zr))
    u = ((lon / (2 * np.pi) + 0.5) * W).astype(int) % W
    v = np.clip(((0.5 - lat / np.pi) * H).astype(int), 0, H - 1)
    return Image.fromarray(eq[v, u])


def main():
    if len(sys.argv) > 1:
        src = Image.open(sys.argv[1])
        src.load()
        src = src.convert('RGB')
        for name, width, q in (('front-entrance.jpg', 2560, 82), ('front-entrance-m.jpg', 1280, 80)):
            im = src.resize((width, round(src.height * width / src.width)), Image.LANCZOS)
            im.save(SITE / name, quality=q, optimize=True, progressive=True)
            print(name, im.size)
    eq = np.asarray(Image.open(SHOW / 'entrance.jpg').convert('RGB'))
    # same start as the showroom viewer: facing north (yaw 0), pitch -3, 100 degrees wide
    view(eq, 0, -3, 100, 1920, 1080).save(SHOW / 'entrance-view.jpg', quality=82, optimize=True, progressive=True)
    print('entrance-view.jpg (1920, 1080)')


if __name__ == '__main__':
    main()

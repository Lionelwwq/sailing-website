"""Make assets/img/site/land-mask.png, the land/sea mask behind the 3D globe on the About page.

The globe (assets/js/globe.js) scatters evenly spaced dots over a sphere and keeps the
ones that fall on land in this mask. The mask is an equirectangular picture: 720 x 360
pixels, longitude -180..180 left to right, latitude 90..-90 top to bottom, white = land.

Source: Natural Earth 1:110m countries (public domain), as packaged in world-atlas:
    https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json

Usage (run from the site folder, with the downloaded file):
    python _src/make_land_mask.py path/to/countries-110m.json
"""
import json
import pathlib
import sys

from PIL import Image, ImageDraw

W, H = 720, 360
SCALE = 4  # draw larger, then shrink, for clean coastlines
OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'img' / 'site' / 'land-mask.png'


def decode_arcs(topo):
    """TopoJSON arcs are quantized and delta-encoded; turn them into lon/lat lists."""
    sx, sy = topo['transform']['scale']
    tx, ty = topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return arcs


def ring(arcs, indexes):
    pts = []
    for i in indexes:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


def main(src: str) -> None:
    topo = json.loads(pathlib.Path(src).read_text(encoding='utf-8'))
    arcs = decode_arcs(topo)
    img = Image.new('L', (W * SCALE, H * SCALE), 0)
    draw = ImageDraw.Draw(img)

    def px(lon, lat):
        return ((lon + 180) / 360 * W * SCALE, (90 - lat) / 180 * H * SCALE)

    for geo in topo['objects']['countries']['geometries']:
        polys = geo['arcs'] if geo['type'] == 'MultiPolygon' else [geo['arcs']] if geo['type'] == 'Polygon' else []
        for poly in polys:
            for k, r in enumerate(poly):
                # shapes that cross the 180° line (Russia, Fiji) jump from +180 to -180;
                # unwrap them into one continuous outline and draw it again one turn left/right
                lonlat, shift, prev = [], 0, None
                for lon, lat in ring(arcs, r):
                    if prev is not None and abs(lon + shift - prev) > 180:
                        shift += -360 if lon + shift > prev else 360
                    prev = lon + shift
                    lonlat.append((prev, lat))
                if len(lonlat) < 3:
                    continue
                for turn in (-360, 0, 360):
                    # first ring is the outline, later rings are holes (lakes)
                    draw.polygon([px(lon + turn, lat) for lon, lat in lonlat], fill=0 if k else 255)
    img = img.resize((W, H), Image.LANCZOS).point(lambda v: 255 if v >= 110 else 0).convert('1')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, optimize=True)
    land = img.convert('L').histogram()[255] / (W * H)
    print(f'wrote {OUT.relative_to(OUT.parents[3])} ({OUT.stat().st_size} bytes, {land:.0%} land)')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])

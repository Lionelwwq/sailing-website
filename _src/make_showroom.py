"""Install the showroom photo (one fixed view of the showroom) and its product points.

    python _src/make_showroom.py "C:\\Users\\w2412\\Downloads\\Sailing-showroom-inside"
    python _src/make_showroom.py --points-only      (after moving points by hand in showroom.json)
    python _src/make_showroom.py --closeups "C:\\Users\\w2412\\Downloads\\Sailing-showroom-inside\\closeups"
                                                    (close-ups for the product cards, made with _design/showroom-closeups-prompt.md)
    python _src/make_showroom.py --walk "C:\\Users\\w2412\\Downloads\\Sailing-showroom-inside\\walk"
                                                    (the closer photos you walk into, made with _design/showroom-walk-prompt.md)

The folder holds showroom-inside.png (the photo, about 16:9, made with the prompt in _design/showroom-inside-prompt.md)
and points.json: [{"product": "glass:clear-float", "x": 12.5, "y": 55.0}, ...], where each product is in the photo,
in % of its width and height. Writes:
    assets/img/showroom/showroom.jpg     computers, up to 5120 px wide (stays sharp when zoomed in)
    assets/img/showroom/showroom-m.jpg   phones and the home page walk-in, 2560 px wide
    assets/img/showroom/showroom.json    picture size, product points, and the area buttons (each one glides to and
                                         zooms in on its group of products)
Product keys that are not on the product pages are reported and left out.
"""
import argparse
import json
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'img' / 'showroom'
BIG_W, PHONE_W = 5120, 2560

# area buttons (names in content/pages/showroom.json as spot_<id>) and the products each one shows
AREAS = [
    ('flat-glass', ['glass:clear-float', 'glass:low-iron', 'glass:tinted', 'glass:coated', 'glass:solar']),
    ('processed-glass', ['glass:tempered', 'glass:laminated', 'glass:insulated', 'glass:curved']),
    ('decorative-glass', ['glass:patterned', 'glass:acid-etched', 'mirrors:back-painted']),
    ('mirrors', ['mirrors:silver-mirror', 'mirrors:tinted-mirror', 'mirrors:antique-mirror', 'mirrors:safety-mirror']),
    ('supplies', ['accessories:aluminum-spacer', 'accessories:molecular-sieve', 'accessories:silicone-adhesive',
                  'accessories:green-adhesive', 'accessories:eva-film', 'accessories:vinyl-cat1', 'accessories:water-jet',
                  'accessories:waterjet-abrasive', 'accessories:grinding-wheels', 'accessories:cerium-dioxide']),
    ('handling', ['accessories:al-stock-shelf', 'accessories:custom-rack', 'accessories:removable-shelf',
                  'accessories:glass-sling', 'accessories:cork-pads']),
]


def known_products():
    keys = set()
    for kind in ('glass', 'mirrors', 'accessories'):
        for it in json.loads((ROOT / 'content' / f'{kind}.json').read_text(encoding='utf-8'))['items']:
            keys.add(f"{kind}:{it['id']}")
    return keys


def areas_for(points, ratio):
    """Each area button glides to the middle of its products and zooms in so they fill most of a 16:9 screen."""
    out = []
    for aid, keys in AREAS:
        pts = [p for p in points if p['product'] in keys]
        if not pts:
            continue
        xs, ys = [p['x'] for p in pts], [p['y'] for p in pts]
        w = max(xs) - min(xs) + 16                           # % of the picture, with a margin round the points
        h = (max(ys) - min(ys) + 22) * ratio / (16 / 9)      # in screen terms (the picture fills a 16:9 screen)
        zoom = max(1.4, min(2.1, 100 / max(w, h, 1)))
        out.append({'id': aid, 'x': round((max(xs) + min(xs)) / 2, 1), 'y': round((max(ys) + min(ys)) / 2, 1),
                    'zoom': round(zoom, 2)})
    return out


def add_closeups(folder):
    """Close-up photos for the product cards (a click on a gold point shows one): <kind>-<id>.png in the folder
    becomes assets/img/showroom/closeups/<kind>-<id>.jpg (1600 px wide); products without one keep their usual photo."""
    scene = json.loads((OUT / 'showroom.json').read_text(encoding='utf-8'))
    (OUT / 'closeups').mkdir(exist_ok=True)
    done, missing = {}, []
    for key in sorted(known_products() & {p['product'] for p in scene['points']}):
        name = key.replace(':', '-')
        src = next((folder / f'{name}{e}' for e in ('.png', '.jpg', '.jpeg', '.webp') if (folder / f'{name}{e}').exists()), None)
        if not src:
            missing.append(name)
            continue
        im = Image.open(src)
        im.load()
        im = im.convert('RGB')
        if im.width > 1600:
            im = im.resize((1600, round(1600 * im.height / im.width)), Image.LANCZOS)
        im.save(OUT / 'closeups' / f'{name}.jpg', quality=84, optimize=True, progressive=True)
        done[key] = f'closeups/{name}.jpg'
    scene['closeups'] = {**scene.get('closeups', {}), **done}
    save(scene)
    print(f'{len(done)} close-ups installed' + (f'; none for: {", ".join(missing)}' if missing else ''))


def add_walk(folder):
    """Closer photos you walk into from the main photo (one per area button): view-<area>.png and points-<area>.json
    in the folder become showroom-<area>.jpg / showroom-<area>-m.jpg and scene['views']."""
    scene = json.loads((OUT / 'showroom.json').read_text(encoding='utf-8'))
    known = known_products()
    views, notes = [], []
    for aid, keys in AREAS:
        src = next((folder / f'view-{aid}{e}' for e in ('.png', '.jpg', '.jpeg', '.webp') if (folder / f'view-{aid}{e}').exists()), None)
        if not src or not (folder / f'points-{aid}.json').exists():
            notes.append(f'{aid}: no view-{aid}.png / points-{aid}.json')
            continue
        im = Image.open(src)
        im.load()
        im = im.convert('RGB')
        ratio = im.width / im.height
        big_w, phone_w = min(BIG_W, im.width), min(PHONE_W, im.width)
        big = im.resize((big_w, round(big_w / ratio)), Image.LANCZOS) if big_w != im.width else im
        big.save(OUT / f'showroom-{aid}.jpg', quality=84, optimize=True, progressive=True)
        im.resize((phone_w, round(phone_w / ratio)), Image.LANCZOS).save(OUT / f'showroom-{aid}-m.jpg', quality=82, optimize=True, progressive=True)
        pts = []
        for p in json.loads((folder / f'points-{aid}.json').read_text(encoding='utf-8')):
            if p.get('product') in known and 0 <= float(p['x']) <= 100 and 0 <= float(p['y']) <= 100:
                pts.append({'product': p['product'], 'x': round(float(p['x']), 1), 'y': round(float(p['y']), 1)})
            else:
                notes.append(f'{aid}: left out {p.get("product")}')
        lost = sorted(set(keys) - {p['product'] for p in pts})
        if lost:
            notes.append(f'{aid}: no point for {", ".join(lost)}')
        views.append({'id': aid, 'desktop': f'showroom-{aid}.jpg', 'phone': f'showroom-{aid}-m.jpg',
                      'width': big.width, 'height': big.height, 'points': pts})
        print(f'{aid}: {im.width} x {im.height} -> {big.width} x {big.height}, {len(pts)} points')
    scene['views'] = views
    save(scene)
    for n in notes:
        print('  note:', n)


def save(scene):
    (OUT / 'showroom.json').write_text(json.dumps(scene, indent=1, ensure_ascii=False), encoding='utf-8')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder', nargs='?')
    ap.add_argument('--points-only', action='store_true')
    ap.add_argument('--closeups', help='folder with one close-up photo per product: <kind>-<id>.png, e.g. glass-clear-float.png')
    ap.add_argument('--walk', help='folder with the closer photos you walk into: view-<area>.png and points-<area>.json')
    a = ap.parse_args()
    if a.walk:
        add_walk(pathlib.Path(a.walk))
        return
    if a.closeups:
        add_closeups(pathlib.Path(a.closeups))
        return
    if a.points_only:
        scene = json.loads((OUT / 'showroom.json').read_text(encoding='utf-8'))
        scene['areas'] = areas_for(scene['points'], scene['image']['width'] / scene['image']['height'])
        save(scene)
        print('area buttons recomputed:', ', '.join(f"{x['id']} (zoom {x['zoom']})" for x in scene['areas']))
        return
    if not a.folder:
        ap.error('give the folder with showroom-inside.png and points.json')
    folder = pathlib.Path(a.folder)
    src = next((folder / f'showroom-inside{e}' for e in ('.png', '.jpg', '.jpeg', '.webp') if (folder / f'showroom-inside{e}').exists()), None)
    if not src:
        raise SystemExit(f'no showroom-inside.png in {folder}')
    im = Image.open(src)
    im.load()
    im = im.convert('RGB')
    w, h = im.size
    ratio = w / h
    if not 1.5 <= ratio <= 2.4:
        raise SystemExit(f'{w} x {h} is not a wide photo (expected about 16:9)')
    known = known_products()
    raw = json.loads((folder / 'points.json').read_text(encoding='utf-8'))
    points, bad = [], []
    for p in raw:
        if p.get('product') in known and 0 <= float(p['x']) <= 100 and 0 <= float(p['y']) <= 100:
            points.append({'product': p['product'], 'x': round(float(p['x']), 1), 'y': round(float(p['y']), 1)})
        else:
            bad.append(str(p.get('product')))
    missing = sorted({k for _, ks in AREAS for k in ks} - {p['product'] for p in points})
    OUT.mkdir(parents=True, exist_ok=True)
    big_w = min(BIG_W, w)
    big = im.resize((big_w, round(big_w / ratio)), Image.LANCZOS) if big_w != w else im
    big.save(OUT / 'showroom.jpg', quality=84, optimize=True, progressive=True)
    phone_w = min(PHONE_W, w)
    phone = im.resize((phone_w, round(phone_w / ratio)), Image.LANCZOS) if phone_w != w else im
    phone.save(OUT / 'showroom-m.jpg', quality=82, optimize=True, progressive=True)
    scene = {'about': 'Made with _src/make_showroom.py from showroom-inside.png and points.json (x / y in % of the picture).',
             'image': {'desktop': 'showroom.jpg', 'phone': 'showroom-m.jpg', 'width': big.width, 'height': big.height},
             'areas': areas_for(points, ratio), 'points': points}
    save(scene)
    print(f'photo {w} x {h} -> showroom.jpg {big.width} x {big.height}, showroom-m.jpg {phone.width} x {phone.height}'
          + ('' if w >= BIG_W else f'  (smaller than {BIG_W} px wide: less sharp when zoomed in)'))
    print(f'{len(points)} product points; area buttons: ' + ', '.join(f"{x['id']} (zoom {x['zoom']})" for x in scene['areas']))
    if bad:
        print('left out (unknown product or outside the picture):', ', '.join(bad))
    if missing:
        print('no point for:', ', '.join(missing))
    print('Next: open showroom.html and check every gold point sits on its product (move them in showroom.json, then '
          'run with --points-only).')


if __name__ == '__main__':
    main()

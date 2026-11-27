"""Add the photos for the "How PV Glass Works" page (pv-glass.html).

    python _src/make_pv_images.py <folder>

The folder holds the pictures made from _design/pv-glass-photos-prompt.md (any of them; the others keep the drawings):
    pv-hero.png                 the banner (2:1)
    gen-1.png ... gen-5.png     one per generation (4:3)
Writes assets/img/pv/pv-hero.jpg (2400 px wide) and gen-N.jpg (1400 px wide), puts the paths in
content/pages/pv-glass.json (hero_photo, gens[].photo) and makes the banner photo the page's first picture.
"""
import json
import pathlib
import re
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'img' / 'pv'
CONTENT = ROOT / 'content' / 'pages' / 'pv-glass.json'
PAGE = ROOT / '_src' / 'pages' / 'pv-glass.html'


def save(src: pathlib.Path, name: str, width: int) -> str:
    im = Image.open(src)
    im.load()
    im = im.convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / name
    im.save(dst, quality=80, optimize=True, progressive=True)
    print(f'{name}: {im.size[0]} x {im.size[1]}, {dst.stat().st_size // 1024} KB')
    return f'assets/img/pv/{name}'


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    folder = pathlib.Path(sys.argv[1])
    data = json.loads(CONTENT.read_text(encoding='utf-8'))
    found = False
    hero = next((p for p in (folder / 'pv-hero.png', folder / 'pv-hero.jpg') if p.exists()), None)
    if hero:
        found = True
        data['hero_photo'] = save(hero, 'pv-hero.jpg', 2400)
        page = PAGE.read_text(encoding='utf-8')
        page = re.sub(r'(<img class="hero-bg" src=")[^"]+(")', rf'\g<1>{data["hero_photo"]}\g<2>', page, count=1)
        page = re.sub(r'^image: .*$', f'image: {data["hero_photo"]}', page, count=1, flags=re.M)
        PAGE.write_text(page, encoding='utf-8')
    for i, g in enumerate(data['gens'], 1):
        src = next((p for p in (folder / f'gen-{i}.png', folder / f'gen-{i}.jpg') if p.exists()), None)
        if src:
            found = True
            g['photo'] = save(src, f'gen-{i}.jpg', 1400)
    if not found:
        raise SystemExit(f'no pv-hero.png or gen-N.png in {folder}')
    CONTENT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('content/pages/pv-glass.json updated; now run: python _src/make_cms_config.py && python _src/build.py')


if __name__ == '__main__':
    main()

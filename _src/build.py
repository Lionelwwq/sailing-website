"""Build the static pages of the Sailing International Trade website.

Every page in _src/pages/ is wrapped in _src/layout.html (shared top bar, header,
footer and quote list) and written to the site folder as a plain .html file.

Edit the shared parts in layout.html, blocks used on several pages in
partials/*.html (added with <!-- include: name -->), and the page content in
pages/*.html, then run from the site folder:

    python _src/build.py

Each page starts with a small settings block:

    <!--
    title: Page title shown in the browser tab
    description: One-sentence summary for search engines
    nav: which menu item to highlight (home, products, accessories, applications, about, contact)
    -->
"""
import pathlib
import re

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent
LAYOUT = (SRC / 'layout.html').read_text(encoding='utf-8')
SETTINGS = re.compile(r'\A\s*<!--(.*?)-->\s*', re.S)
INCLUDE = re.compile(r'<!--\s*include:\s*([\w-]+)\s*-->')


def build(page: pathlib.Path) -> str:
    text = page.read_text(encoding='utf-8')
    m = SETTINGS.match(text)
    if not m:
        raise SystemExit(f'{page.name}: missing settings block at the top')
    meta = dict(
        line.split(':', 1) for line in m.group(1).strip().splitlines() if ':' in line
    )
    meta = {k.strip(): v.strip() for k, v in meta.items()}
    body = text[m.end():].rstrip() + '\n'
    # reusable blocks: <!-- include: cta --> pulls in _src/partials/cta.html
    body = INCLUDE.sub(lambda i: (SRC / 'partials' / f'{i.group(1)}.html').read_text(encoding='utf-8'), body)
    nav = meta.get('nav', page.stem)

    html = LAYOUT
    for key in ('title', 'description'):
        html = html.replace('{{' + key + '}}', meta.get(key, '').replace('"', '&quot;'))
    html = html.replace('{{page}}', page.stem)
    html = html.replace(f'data-nav="{nav}"', f'data-nav="{nav}" aria-current="page"')
    html = html.replace('{{content}}', body)
    return html


def main() -> None:
    pages = sorted((SRC / 'pages').glob('*.html'))
    for page in pages:
        (OUT / page.name).write_text(build(page), encoding='utf-8', newline='\n')
        print('built', page.name)


if __name__ == '__main__':
    main()

"""Content checks for the Sailing website. Run from the site folder:

    python tests/check_content.py

Checks every file in content/ for: valid JSON, complete English / French / Dutch / German / Spanish
text, unique product ids, links between products that point to real products,
image files that exist, valid accessory categories, and that the Pages CMS
editor (.pages.yml) has a field for everything in the content files.
Exits with an error code if anything fails, so it can run before publishing.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content'
LANGS = ('en', 'fr', 'nl', 'de', 'es')
problems = []
warnings = []


def fail(msg):
    problems.append(msg)


def load(rel):
    try:
        return json.loads((CONTENT / rel).read_text(encoding='utf-8'))
    except Exception as e:  # noqa: BLE001
        fail(f'{rel}: not valid JSON ({e})')
        return None


def walk(node, path, fn):
    if isinstance(node, dict):
        if set(node) == set(LANGS):
            fn(node, path)
            return
        for k, v in node.items():
            walk(v, f'{path}.{k}', fn)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, f'{path}[{i}]', fn)


files = sorted(p.relative_to(CONTENT).as_posix() for p in CONTENT.rglob('*.json'))
data = {f: load(f) for f in files}

# 1. every translatable text has all five languages
for f, d in data.items():
    if d is None:
        continue

    def check_text(n, path, f=f):
        if all(isinstance(n[lang], str) and not n[lang].strip() for lang in LANGS):
            return   # an optional text left empty in every language (e.g. a market without a note)
        for lang in LANGS:
            if not isinstance(n[lang], str) or not n[lang].strip():
                fail(f'{f}{path}: missing {lang} text')
        # a translation identical to the English is usually a forgotten one (codes and numbers aside)
        for lang in ('nl', 'de', 'es'):
            if n[lang] == n['en'] and re.search(r'[A-Za-z]{4,} [A-Za-z]{4,}', n['en']) and not re.search(r'\d', n['en']):
                warnings.append(f'{f}{path}: {lang} is the same as English ("{n["en"][:40]}")')
    walk(d, '', check_text)

# 2. products: unique ids, real related ids, real images, valid categories
acc = data.get('accessories.json') or {}
acc_ids = {i['id'] for i in acc.get('items', [])}
cat_ids = {c['id'] for c in acc.get('categories', [])}
for kind in ('glass', 'mirrors', 'accessories'):
    d = data.get(f'{kind}.json') or {}
    ids = [i.get('id') for i in d.get('items', [])]
    for dup in {i for i in ids if ids.count(i) > 1}:
        fail(f'{kind}.json: id "{dup}" is used more than once')
    for item in d.get('items', []):
        iid = item.get('id', '?')
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', iid or ''):
            fail(f'{kind}.json: id "{iid}" should be lowercase-with-dashes')
        for rid in item.get('related', []):
            if rid not in acc_ids:
                fail(f'{kind}.json {iid}: related "{rid}" is not an accessory id')
        if kind == 'accessories' and item.get('category') not in cat_ids:
            fail(f'accessories.json {iid}: unknown category "{item.get("category")}"')
        if not item.get('specs'):
            warnings.append(f'{kind}.json {iid}: no specifications')


# 3. every image path in content exists on disk
def images(node, path, f):
    if isinstance(node, dict):
        for k, v in node.items():
            images(v, f'{path}.{k}', f)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            images(v, f'{path}[{i}]', f)
    elif isinstance(node, str) and not node.startswith(('http://', 'https://')) and re.search(r'\.(jpe?g|png|svg|webp|gif)$', node, re.I):
        if not (ROOT / node).is_file():
            fail(f'{f}{path}: image not found: {node}')


for f, d in data.items():
    if d is not None:
        images(d, '', f)

# 4. settings look right
s = data.get('settings.json') or {}
for key in ('companyName', 'phone', 'email', 'quoteEmail', 'mapQuery'):
    if not s.get(key):
        fail(f'settings.json: {key} is empty')
for key in ('email', 'quoteEmail'):
    if s.get(key) and not re.fullmatch(r'[^@\s]+@[^@\s]+\.[a-z]{2,}', s[key]):
        fail(f'settings.json: {key} "{s[key]}" is not an email address')

# 5. the CMS editor covers every field
try:
    import yaml  # noqa: WPS433
    cfg = yaml.safe_load((ROOT / '.pages.yml').read_text(encoding='utf-8'))

    def cover(d, fields, path):
        fm = {x['name']: x for x in fields}
        for k, v in d.items():
            if k not in fm:
                fail(f'.pages.yml: no editor field for {path}.{k} (run python _src/make_cms_config.py)')
                continue
            fd = fm[k]
            if fd['type'] == 'object' and fd.get('list'):
                for i, x in enumerate(v):
                    if isinstance(x, dict) and set(x) != set(LANGS):
                        cover(x, fd['fields'], f'{path}.{k}[{i}]')
            elif fd['type'] == 'object' and isinstance(v, dict) and set(v) != set(LANGS):
                cover(v, fd['fields'], f'{path}.{k}')
    paths = {e['path'] for e in cfg['content']}
    for f in files:
        if f'content/{f}' not in paths:
            fail(f'.pages.yml: content/{f} is not editable in the CMS')
    for e in cfg['content']:
        rel = e['path'].removeprefix('content/')
        if data.get(rel) is not None:
            cover(data[rel], e['fields'], rel)
except ImportError:
    warnings.append('PyYAML not installed: skipped the .pages.yml check')

# report
for w in warnings:
    print('warning:', w)
for p in problems:
    print('FAIL:', p)
print(f'\n{len(files)} content files checked: {len(problems)} problems, {len(warnings)} warnings')
sys.exit(1 if problems else 0)

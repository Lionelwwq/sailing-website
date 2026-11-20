"""Generate .pages.yml (the Pages CMS editor configuration) from the content files.

Every text that exists in three languages ({"en", "zh", "fr"}) becomes a group of
English / 中文 / Français fields; image paths become image pickers; lists become
repeatable groups. Run this again after adding new fields to the JSON files:

    python _src/make_cms_config.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content'

# Editor sections, in the order staff will see them
ENTRIES = [
    ('glass', 'Glass products', 'glass.json'),
    ('mirrors', 'Mirrors', 'mirrors.json'),
    ('accessories', 'Accessories', 'accessories.json'),
    ('home', 'Home page', 'pages/home.json'),
    ('about', 'About page', 'pages/about.json'),
    ('contact', 'Contact page', 'pages/contact.json'),
    ('product_pages', 'Product page headers', 'product-pages.json'),
    ('settings', 'Company settings', 'settings.json'),
    ('ui', 'Buttons & menu text', 'ui.json'),
    ('credits', 'Photo credits', 'credits.json'),
]
LONG_TEXT = 90  # English longer than this gets a multi-line box
CATEGORY_IDS = ['handling', 'ig', 'films', 'cutting']
HELP = {
    'id': 'Short code used in web addresses, lowercase-with-dashes (e.g. tempered). Must be unique.',
    'related': 'Accessory codes shown under "Goes well with" (e.g. eva-film).',
    'quoteEmail': 'Enquiry form messages are sent to this address.',
    'mapQuery': 'Address used for the Google map.',
    'category': 'handling = Handling & Storage, ig = Insulating & Sealing, films = Films & Interlayers, cutting = Cutting & Finishing',
}


def label(key):
    return key.replace('_', ' ').replace('-', ' ').strip().capitalize()


def is_i18n(v):
    return isinstance(v, dict) and set(v) == {'en', 'zh', 'fr'}


def is_image(key, v):
    return isinstance(v, str) and (key in ('image', 'photo', 'cover', 'file') or key.endswith('_image')) and v.lower().endswith(('.jpg', '.jpeg', '.png', '.svg', '.webp'))


def i18n_field(name, samples):
    long = any(len(s.get('en', '')) > LONG_TEXT for s in samples)
    kind = 'text' if long else 'string'
    return {'name': name, 'label': label(name), 'type': 'object', 'fields': [
        {'name': 'en', 'label': 'English', 'type': kind},
        {'name': 'zh', 'label': '中文', 'type': kind},
        {'name': 'fr', 'label': 'Français', 'type': kind},
    ]}


GALLERY = {'name': 'gallery', 'label': 'Extra photos', 'type': 'object', 'list': True,
           'description': 'Optional extra photos shown as thumbnails under the main photo.',
           'fields': [{'name': 'image', 'label': 'Image', 'type': 'image'},
                      {'name': 'caption', 'label': 'Caption', 'type': 'object', 'fields': [
                          {'name': 'en', 'label': 'English', 'type': 'string'},
                          {'name': 'zh', 'label': '中文', 'type': 'string'},
                          {'name': 'fr', 'label': 'Français', 'type': 'string'}]}]}


def field(name, values):
    """Build a field from all the example values found for this key."""
    if name == 'gallery':
        return dict(GALLERY)
    v = values[0]
    f = None
    if is_i18n(v):
        f = i18n_field(name, values)
    elif isinstance(v, list):
        items = [x for lst in values for x in lst]
        if items and all(is_i18n(x) for x in items):
            f = i18n_field(name, items)
        elif items and all(isinstance(x, dict) for x in items):
            f = {'name': name, 'label': label(name), 'type': 'object', 'fields': fields_for(items)}
        else:
            f = {'name': name, 'label': label(name), 'type': 'string'}
        f['list'] = True
        return add_help(f)
    elif isinstance(v, dict):
        f = {'name': name, 'label': label(name), 'type': 'object', 'fields': fields_for(values)}
    elif name == 'category':
        f = {'name': name, 'label': 'Category', 'type': 'select', 'options': {'values': CATEGORY_IDS}}
    elif is_image(name, v):
        f = {'name': name, 'label': label(name), 'type': 'image'}
    elif isinstance(v, str) and len(v) > LONG_TEXT:
        f = {'name': name, 'label': label(name), 'type': 'text'}
    else:
        f = {'name': name, 'label': label(name), 'type': 'string'}
    if name == 'id':
        f['required'] = True
    return add_help(f)


def add_help(f):
    if f['name'] in HELP:
        f['description'] = HELP[f['name']]
    return f


def fields_for(objs):
    keys = []
    for o in objs:
        keys += [k for k in o if k not in keys]
    return [field(k, [o[k] for o in objs if k in o]) for k in keys]


def yaml(obj, indent=0):
    pad = '  ' * indent
    out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, (dict, list)) and v:
                out.append(f'{pad}{k}:')
                out.append(yaml(v, indent + 1))
            else:
                out.append(f'{pad}{k}: {scalar(v)}')
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, dict):
                first = True
                for k, v in item.items():
                    lead = f'{pad}- ' if first else f'{pad}  '
                    first = False
                    if isinstance(v, (dict, list)) and v:
                        out.append(f'{lead}{k}:')
                        out.append(yaml(v, indent + 2))
                    else:
                        out.append(f'{lead}{k}: {scalar(v)}')
            else:
                out.append(f'{pad}- {scalar(item)}')
    return '\n'.join(out)


def scalar(v):
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    return json.dumps(v, ensure_ascii=False)  # JSON strings are valid YAML


def main():
    content = []
    for name, lbl, path in ENTRIES:
        data = json.loads((CONTENT / path).read_text(encoding='utf-8'))
        content.append({'name': name, 'label': lbl, 'type': 'file', 'path': f'content/{path}', 'format': 'json', 'fields': fields_for([data])})
    config = {'media': {'input': 'assets/img', 'output': 'assets/img'}, 'content': content}
    header = '# Pages CMS configuration (https://pagescms.org). Generated by _src/make_cms_config.py — edit that script, not this file.\n'
    (ROOT / '.pages.yml').write_text(header + yaml(config) + '\n', encoding='utf-8', newline='\n')
    print('wrote .pages.yml with', len(content), 'sections')


if __name__ == '__main__':
    main()

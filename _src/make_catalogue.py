"""Build the Sailing International Trade Product Catalogue 2026 (PDF) and its web previews.

The catalogue is laid out as an HTML page (US Letter pages, styles in _src/catalogue/catalogue.css),
printed to PDF with headless Chrome, then rendered to page images for the website's catalogue page.
Product descriptions follow the September 2026 catalogue; photos and "typical uses" come from the
website (content/*.json), so swapping a photo there and re-running keeps both in step.

Run from the site folder (needs Google Chrome, Pillow and PyMuPDF):
    python _src/make_catalogue.py

Writes:
    assets/catalogue/Sailing-Product-Catalogue-2026.pdf   the catalogue to download
    assets/catalogue/cover.jpg                            cover image for the web page
    assets/catalogue/pages/pNN.jpg + pages.json           page previews for the web page
"""
import html
import json
import math
import pathlib
import sys
import time

import fitz  # PyMuPDF
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src' / 'catalogue'
BUILD = SRC / 'build'                      # generated, not committed
OUT = ROOT / 'assets' / 'catalogue'
PDF_NAME = 'Sailing-Product-Catalogue-2026.pdf'

CONTACT = {  # as printed in the September 2026 catalogue (confirmed for the new edition)
    'address': '1110-250 Consumers Rd, North York, ON M2J 4V6',
    'phone': '437-880-8427',
    'email': 'sales@sailingtrades.com',
    'web': 'sailingintltrade.com',
}
REGULAR = '72″ × 96″ · 84″ × 130″/144″ · 96″ × 130″/144″'
E = html.escape


# ---------------------------------------------------------------- helpers
def wheel_svg(color, size):
    """The ship's wheel from the Sailing logo, as crisp vector art (same geometry as _src/warehouse_sign.py)."""
    parts = []
    for k in range(8):
        a = k * math.pi / 4
        c, s = math.cos(a), math.sin(a)
        parts.append(f'<line x1="{.60*c:.4f}" y1="{.60*s:.4f}" x2="{.80*c:.4f}" y2="{.80*s:.4f}" stroke-width=".08"/>')
        parts.append(f'<line x1="{.79*c:.4f}" y1="{.79*s:.4f}" x2="{.92*c:.4f}" y2="{.92*s:.4f}" stroke-width=".14"/>')
        parts.append(f'<line x1="{.15*c:.4f}" y1="{.15*s:.4f}" x2="{.36*c:.4f}" y2="{.36*s:.4f}" stroke-width=".038"/>')
        t = a + math.pi / 2
        cx, cy = .37 * c, .37 * s
        parts.append(f'<line x1="{cx-.05*math.cos(t):.4f}" y1="{cy-.05*math.sin(t):.4f}" x2="{cx+.05*math.cos(t):.4f}" y2="{cy+.05*math.sin(t):.4f}" stroke-width=".04" stroke-linecap="butt"/>')
    return (f'<svg viewBox="-1 -1 2 2" width="{size}" height="{size}" aria-hidden="true">'
            f'<g stroke="{color}" stroke-linecap="round" fill="none">{"".join(parts)}'
            f'<circle r=".575" stroke-width=".15"/></g><ellipse rx=".075" ry=".11" fill="{color}"/></svg>')


def logo(wheel_color, text_color, size='0.42in'):
    return (f'<span class="logo">{wheel_svg(wheel_color, size)}'
            f'<span style="color:{text_color}"><b>SAILING</b><i>INTERNATIONAL TRADE LTD</i></span></span>')


def folio(n, light=False):
    return (f'<div class="folio{" light" if light else ""}"><span>Sailing International Trade · Product Catalogue 2026</span>'
            f'<span class="n">{n:02d}</span></div>')


_prepared = {}


def img(path, max_px=2400):
    """Copy a site picture into the build folder as a JPEG of sensible size (keeps the PDF small)."""
    if path in _prepared:
        return _prepared[path]
    src = ROOT / path
    name = src.stem + '.jpg'
    dst = BUILD / 'img' / name
    im = Image.open(src).convert('RGB')
    if max(im.size) > max_px:
        im.thumbnail((max_px, max_px), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, quality=84, optimize=True, progressive=True)
    _prepared[path] = f'img/{name}'
    return _prepared[path]


def site_uses(kind, item_id):
    data = json.loads((ROOT / 'content' / f'{kind}.json').read_text(encoding='utf-8'))
    it = next(i for i in data['items'] if i['id'] == item_id)
    return [u['en'] for u in it.get('uses', [])]


def checks(items):
    return '<ul class="checks">' + ''.join(f'<li>{E(x)}</li>' for x in items) + '</ul>'


# ---------------------------------------------------------------- content
L = 'assets/img/library/'
W = 'assets/img/warehouse/'
PRODUCTS = [
    dict(no=1, name='Clear Float Glass', cat='Flat glass', uses=('glass', 'clear-float'),
         hero=[(L + 'clear-float-studio.jpg', .42, 'center 40%'), (L + 'clear-vs-low-iron.jpg', .58, 'center')],
         desc='Float glass is made by floating molten glass over a bath of molten tin, which gives it an even thickness and a smooth, '
              'distortion-free surface. Its optical clarity and flatness make it the standard choice for architectural and interior glazing, '
              'and the base for tempering, laminating and insulated units.',
         specs=[('Thickness', '1.8–25 mm'), ('Regular sizes', REGULAR), ('Max. size', '192″ × 433″')]),
    dict(no=2, name='Low Iron Glass', cat='Flat glass', uses=('glass', 'low-iron'),
         hero=[(L + 'low-iron-studio.jpg', .42, 'center 40%'), (L + 'low-iron-edge.jpg', .58, 'center')],
         desc='Low iron glass has a reduced iron content for exceptional clarity and high light transmission, without the green tint of '
              'standard clear glass. Its crystal-clear look suits architectural, display and decorative work where visual clarity matters.',
         specs=[('Thickness', '1.8–22 mm'), ('Regular sizes', REGULAR), ('Max. size', '192″ × 433″')]),
    dict(no=3, name='Tinted Glass', cat='Flat glass', uses=('glass', 'tinted'),
         hero=[(L + 'tinted-collection.jpg', 1, 'center 8%')],
         desc='Tinted glass has colour added to the glass itself to reduce solar heat gain and glare while still letting in natural light. '
              'Available in a range of colours, it gives both solar control and design freedom for facades, windows and interiors.',
         specs=[('Colours', 'Euro Grey, Euro Bronze, Super Grey and more'), ('Thickness', '3–12 mm'), ('Regular sizes', REGULAR), ('Max. size', '96″ × 295″')]),
    dict(no=4, name='Low-E Glass', cat='Flat glass', uses=('glass', 'coated'),
         hero=[(L + 'low-e-facade.jpg', .62, 'center'), (L + 'low-e-office.jpg', .38, 'center')],
         desc='Low-E glass carries a low-emissivity coating that cuts heat transfer while keeping natural light. It improves thermal '
              'insulation and energy efficiency, making it the right choice for facades, windows and energy-efficient buildings.',
         specs=[('Thickness', '3.2–6 mm'), ('Regular sizes', '84″ × 130″ · 96″ × 130″'), ('Glass colour', 'Clear or grey'),
                ('Coatings', 'Performance similar to or matching Planibel G, S48, SA, SS22, EA, SC60, SFC, SL60, Solarban 60 and Solarban 70')]),
    dict(no=5, name='Reflective Glass', cat='Flat glass', uses=('glass', 'coated'),
         hero=[(L + 'reflective-pavilion.jpg', .5, 'center 60%'), (L + 'reflective-diagram.jpg', .5, 'center')],
         desc='Reflective glass has a metallic coating that reduces solar heat gain and glare and gives a distinctive mirrored look. '
              'It improves solar control and visual comfort on facades, curtain walls and windows.',
         specs=[('Thickness', '4–10 mm'), ('Regular sizes', '84″ × 130″ · 96″ × 130″'), ('Max. size', '96″ × 295″'),
                ('Glass colour', 'Euro Grey, Euro Bronze, Super Grey and more')]),
    dict(no=6, name='Tempered Glass', cat='Processed glass', uses=('glass', 'tempered'),
         hero=[(W + 'zone-racks.webp', 1, 'center 55%')],  # AI showroom picture (photos must be from the library or AI)
         desc='Tempered glass is safety glass, heat- or chemically treated to be four to five times stronger than standard annealed glass. '
              'If it breaks, it crumbles into small, blunt pieces instead of sharp shards. Typical uses include shower enclosures, railings, '
              'skylights, windows under high wind loads, table tops and shelves.',
         specs=[('Thickness', '3–19 mm'), ('Sizes', 'Min. 12″ × 12″ · max. 144″ × 433″'), ('Glass colour', 'Clear, low iron, acid etched, tinted and more'),
                ('Certification', 'SGCC'), ('Standards', 'EN 12150, ANSI Z97.1, ASTM C1048, BS EN 14179')]),
    dict(no=7, name='Laminated Glass', cat='Processed glass', uses=('glass', 'laminated'),
         hero=[(L + 'laminated-studio.jpg', .45, 'center'), (L + 'laminated-edge.jpg', .55, 'center')],
         desc='Laminated glass bonds two or more layers of glass with an interlayer such as PVB for added safety, durability, sound '
              'insulation and structural performance. It comes in a range of glass colours, thicknesses and build-ups to suit each project.',
         specs=[('Standard thickness', '6, 8, 10, 12 mm (e.g. 3 mm + PVB + 3 mm)'), ('PVB thickness', '0.38 mm (0.015″)'), ('Regular sizes', REGULAR),
                ('Max. size', '144″ × 433″'), ('Glass colour', 'Clear, milk white, green, blue, bronze and more'),
                ('Standards', 'EN 14449, ANSI Z97.1, ASTM C1048, GB/T 15763.3')]),
    dict(no=8, name='Insulated Glass Units (IGUs)', cat='Processed glass', uses=('glass', 'insulated'),
         hero=[(L + 'igu-window.jpg', .6, 'center'), (L + 'igu-corner.jpg', .4, 'center 40%')],
         desc='Insulated glass units have two or more panes separated by spacer bars filled with a high-performance desiccant and sealed '
              'together, often with air or argon in the cavity. In windows and curtain walls, the layered build keeps heat in during winter '
              'and out during summer, easing the load on heating and cooling.',
         specs=[('Glass thickness', '3–12 mm'), ('Spacer', '6, 9, 12, 15, 19 mm'), ('Max. size', '144″ × 433″'),
                ('Glass colour', 'Clear, low iron, Low-E, reflective, tinted and more'), ('Gas filling', 'Air or argon'),
                ('Standards', 'EN 1279, IGCC, GB/T 11944')]),
    dict(no=9, name='Patterned Glass', cat='Decorative glass', uses=None, hero_h=4.0,
         hero=[(L + 'pattern-flutelite-s.jpg', .25, 'center'), (L + 'pattern-moru.jpg', .25, 'center'),
               (L + 'pattern-oceanic.jpg', .25, 'center'), (L + 'pattern-chinchilla.jpg', .25, 'center')],
         desc='Patterned glass combines a decorative surface texture with soft, natural light diffusion, balancing privacy and style. '
              'It comes in a wide range of patterns, thicknesses and sizes for architectural and interior projects.',
         specs=[('Thickness', '3–12 mm (varies by pattern)'), ('Regular sizes', REGULAR), ('Max. size', '96″ × 189″'), ('Glass colour', 'Clear, low iron, tinted and more')],
         extra='<h3 class="label">Pattern options</h3><div class="groups">'
               '<div><h4>Modern interior trends</h4><p>Reeded, Fluted, Ribbed, Moru, Rain, Linen</p></div>'
               '<div><h4>Decorative patterns</h4><p>Bamboo, Oceanic, Water Ripple, Antique, Karatachi, Kasumi, Morgon, Puzzle</p></div>'
               '<div><h4>Geometric patterns</h4><p>Delta, Master Carré, Master Ligne, Master Point, Cross Reed, Linear</p></div>'
               '<div><h4>Classic patterns</h4><p>Rain, Mistlite, Flora, Nashiji, Diamond, Moru, Reeded (Fluted), Satin (Matelux), Chinchilla, Aquatex</p></div></div>'),
    dict(no=10, name='Back Painted Glass', cat='Decorative glass', uses=('mirrors', 'back-painted'), hero_h=4.5,
         hero=[(L + 'back-painted-collection.jpg', 1, 'center 12%')],
         desc='Back-painted glass pairs a smooth glass face with a durable coloured coating on the back, for a clean, contemporary look. '
              'It comes in a wide range of colours for interior, decorative and architectural work.',
         specs_title='Customisation options',
         specs=[('Base glass', 'Clear, low iron or other glass'), ('Thickness', 'Based on the base glass'), ('Size', 'Custom sizes'),
                ('Colour', 'Standard or custom (matched to colour codes)'), ('Finish', 'Glossy or matte'), ('Further processing', 'Cutting, edgework, tempering')],
         note='Final dimensions and specifications depend on the base glass and project requirements.'),
    dict(no=11, name='Acid Etched Glass', cat='Decorative glass', uses=('glass', 'acid-etched'),
         hero=[(L + 'acid-etched-studio.jpg', .4, 'center 45%'), (L + 'acid-etched-privacy.jpg', .6, 'center')],
         desc='Acid-etched glass has a smooth, translucent satin finish that lets in natural light while adding privacy. It suits a wide '
              'range of architectural, interior and decorative applications.',
         specs=[('Thickness', '3–15 mm'), ('Regular sizes', REGULAR), ('Max. size', '96″ × 189″'), ('Glass colour', 'Clear, low iron or tinted; frosted or velour finish')]),
    dict(no=12, name='Silk Screen Printed Glass', cat='Decorative glass', uses=None, hero_h=4.7, graphic='frit',
         desc='Silk-screen printed glass has ceramic ink fused permanently to the surface during heat treatment, giving a durable, '
              'colour-stable finish. Available in a wide range of colours and patterns, it offers decorative and functional solutions '
              'for architectural projects, from facade fritting to privacy bands.',
         specs_title='Customisation options',
         specs=[('Base glass', 'Clear, low iron, tinted and others'), ('Further processing', 'Tempered, laminated, IGUs'),
                ('Printing', 'Standard colours, custom colours, custom patterns'), ('Coverage', 'Full or partial')]),
    dict(no=13, name='Curved Glass', cat='Specialty glass', uses=('glass', 'curved'),
         hero=[(L + 'curved-facade.jpg', .6, 'center'), (L + 'curved-partition.jpg', .4, 'center')],
         desc='Curved glass brings architectural freedom together with structural performance, making distinctive shapes and seamless '
              'curved surfaces possible. It comes in a range of glass types and sizes for custom architectural and commercial projects.',
         specs=[('Thickness', '5–22 mm (3/16″–7/8″)'), ('Max. size', '144″ × 630″ with min. radius 177″, or 87″ × 96″ with min. radius 35″'),
                ('Glass type', 'Clear, low iron, bronze, grey, blue and more'), ('Fabrication', 'Holes, cut-outs, edge polishing, radius corners')]),
    dict(no=14, name='Photovoltaic (PV) Glass', cat='Specialty glass', uses=('glass', 'solar'),
         hero=[(W + 'zone-solar.webp', 1, 'center 45%')],
         desc='Photovoltaic glass is designed for solar modules, with high light transmission, durability and configurations tailored '
              'to each project.',
         specs=[('Glass type', 'Clear float, low iron, ultra-clear'), ('Thickness', '2 mm standard · 1.6–4.0 mm available'), ('Max. size', '2500 × 1300 mm'),
                ('AR coating', 'Single (transmittance ≥ 93.8%) or double (≥ 94.1%)'),
                ('Processing', 'Semi-tempering, screen printing, drilling, edge processing, matte, patterned')],
         note='Specifications vary by product and project. Custom sizes, coatings and processing are available; contact us for detailed technical data.'),
    dict(no=15, name='Mirror Collection', cat='Mirrors', uses=('mirrors', 'silver-mirror'), hero_h=4.4,
         hero=[(W + 'zone-mirrors.webp', .6, 'center'), (L + 'mirror-colours.jpg', .4, 'center')],
         desc='Our mirrors combine excellent reflective quality with versatile options for architectural, interior, furniture and '
              'decorative use, in a range of substrates, colours, finishes and safety builds, with polished or bevelled edges.',
         specs=[('Thickness', '2–8 mm'), ('Sizes', 'Custom cut to size'), ('Regular sizes', REGULAR), ('Max. size', '96″ × 144″')],
         extra='<h3 class="label">Mirror types</h3><div class="chips">' + ''.join(f'<span>{t}</span>' for t in (
             'Silver mirror', 'Aluminium mirror', 'Copper-free mirror', 'Tinted mirror', 'Low iron mirror', 'Acid etched mirror',
             'Vinyl-backed safety mirror', 'Antique mirror', 'Temperable mirror', 'LED mirror')) + '</div>'),
    dict(no=16, name='LED Mirrors', cat='Mirrors', uses=None, hero_h=4.3, graphic='led',
         desc='LED mirrors combine high-quality mirror glass with integrated lighting, for useful light and a clean, modern look. '
              'They come in a range of sizes, shapes, lighting layouts and options to suit each project and design.',
         specs_title='Available options',
         specs=[('Size and shape', 'Custom sizes and shapes'), ('Light', 'Colour temperature options, dimmable'),
                ('Controls', 'Touch sensor, motion sensor'), ('Features', 'Anti-fog, Bluetooth, digital clock, video')],
         extra='<h3 class="label">Lighting options</h3><div class="lit">'
               '<div><h4>Front-lit</h4><p>LEDs on the mirror face give direct, even light, ideal for grooming and close tasks.</p></div>'
               '<div><h4>Back-lit</h4><p>LEDs behind the mirror cast a soft glow around the edge for a clean, contemporary look.</p></div>'
               '<div><h4>Dual-lit</h4><p>Front and back lighting together: useful light and ambient glow in one design.</p></div></div>'),
]
CATEGORIES = [
    ('Flat glass', 'Base glass for glazing and further processing.', [1, 2, 3, 4, 5]),
    ('Processed glass', 'Safety and insulating glass, made to size.', [6, 7, 8]),
    ('Decorative glass', 'Texture, colour and privacy for interiors and facades.', [9, 10, 11, 12]),
    ('Specialty glass', 'Shapes and solar applications.', [13, 14]),
    ('Mirrors', 'Mirrors for architecture, interiors and furniture.', [15, 16]),
]
FIRST_PRODUCT_PAGE = 6  # cover, about, milestones, overview, glazing come first


# ---------------------------------------------------------------- pages
def cover():
    return f'''<section class="page cover">
  <div class="photo" style="background-image:url({img(W + 'entrance-closed.webp')})"></div>
  <div class="top">{logo('#FFFFFF', '#FFFFFF', '0.5in')}<span class="year-tag">EDITION 2026</span></div>
  <div class="panel">
    <span class="kicker light">Architectural glass &amp; mirrors</span>
    <h1 style="margin-top:.18in">Product catalogue<span>2026</span></h1>
    <p class="sub">Float glass · Processed glass · Mirrors · Custom manufacturing</p>
    <p class="cats">Toronto · Beijing · Shanghai · Manufacturing in Qingdao, China</p>
  </div>
  <p class="motto">Built on quality.<br>Driven by partnership.</p>
</section>'''


def about(n):
    why = ['30+ years of experience', '20+ countries served', 'Manufacturing facilities in China', 'Sales offices in Toronto, Beijing and Shanghai',
           'European market expansion', 'OEM and custom manufacturing', 'Quality assurance']
    return f'''<section class="page about">
  <div class="side" style="background-image:url({img(W + 'zone-glass.webp')})"></div>
  <div class="main">
    <span class="kicker">About us</span>
    <h2 class="title">Building trusted glass solutions since 1993</h2>
    <p class="lead">For more than 30 years, Sailing International Trade has specialized in the manufacturing and global supply of architectural glass and mirror products.</p>
    <p style="margin-top:.14in">With production facilities in China and a growing international sales network, we serve customers across North America, Europe,
    the Middle East and other global markets. Our portfolio covers float glass, processed glass, mirrors, insulated, laminated, tempered and decorative glass,
    and photovoltaic (PV) glass. We are committed to reliable quality, technical expertise and responsive service for projects of every scale.</p>
    <div class="stats"><div><strong>30+</strong><span>Years</span></div><div><strong>20+</strong><span>Countries served</span></div><div><strong>3</strong><span>Sales offices</span></div></div>
  </div>
  <div class="lower">
    <div class="why"><span class="kicker">Why partner with us</span><div style="margin-top:.14in">{checks(why)}</div></div>
    <div class="leader"><span class="kicker">Leadership</span>
      <blockquote>Dedicated to advancing global architectural glass and mirror solutions through quality, innovation and strong client relationships.</blockquote>
      <cite>Liu Dawei<small>Leadership</small></cite></div>
  </div>
  {folio(n)}
</section>'''


def milestones(n):
    events = [
        ('1993', 'Company founded', 'Established in Qingdao, China, laying the foundation for a professional architectural glass manufacturing business.', ''),
        ('2014', 'Export division established', 'Launched our international trade division, expanding into global markets and serving customers worldwide.', ''),
        ('2018', 'Qingdao manufacturing expansion', 'Strengthened production capacity and manufacturing capabilities to support growing international demand.', ''),
        ('2022', 'Canadian sales office', 'Opened our Toronto office to improve customer service and strengthen our presence in the North American market.', ''),
        ('2024', 'Beijing and Shanghai offices', 'Expanded our domestic network to improve regional support, operational efficiency and customer collaboration.', ''),
        ('2026', 'European market expansion', 'Partnerships with European companies, focused on photovoltaic (PV) glass projects, while growing our customer base for architectural float and processed glass.', ''),
        ('2027', 'European sales office', 'A planned European sales office to strengthen local customer support and expand our presence across the European market.', 'future'),
    ]
    rows = ''.join(f'<div class="ev {c}"><span class="yr">{y}</span><div><h3>{E(t)}</h3><p>{E(d)}</p></div></div>' for y, t, d, c in events)
    return f'''<section class="page timeline">
  <div class="wrap"><span class="kicker">Milestones &amp; future vision</span>
    <h2 class="title">Three decades of growth</h2>
    <div class="tl">{rows}</div></div>
  {folio(n)}
</section>'''


def overview(n):
    by_no = {p['no']: p for p in PRODUCTS}
    cards = ''
    for i, (name, blurb, nos) in enumerate(CATEGORIES):
        items = ''.join(f'<li><span class="no">{k:02d}</span><span class="nm">{E(by_no[k]["name"])}</span>'
                        f'<span class="pg">p. {FIRST_PRODUCT_PAGE + k - 1}</span></li>' for k in nos)
        cards += f'<div class="cat{" wide" if i == 0 else ""}"><h3>{E(name)}</h3><p>{E(blurb)}</p><ol>{items}</ol></div>'
    return f'''<section class="page overview">
  <div class="wrap"><span class="kicker">Product overview</span>
    <h2 class="title">Comprehensive glass solutions</h2>
    <p class="lead">Sixteen product families, from base float glass to finished safety, decorative and specialty glass, plus a full mirror collection.</p>
    <div class="cats-grid">{cards}
      <div class="cat"><h3>More in this catalogue</h3><ol>
        <li><span class="nm">Glazing options</span><span class="pg">p. 5</span></li>
        <li><span class="nm">Certifications &amp; testing</span><span class="pg">p. {FIRST_PRODUCT_PAGE + len(PRODUCTS)}</span></li>
        <li><span class="nm">Contact</span><span class="pg">p. {FIRST_PRODUCT_PAGE + len(PRODUCTS) + 1}</span></li></ol></div>
    </div></div>
  {folio(n)}
</section>'''


def glazing(n):
    def pane(name, tag, panes, items):
        g = '<s></s>'.join('<i></i>' for _ in range(panes))
        return f'<div class="pane"><div class="glyph">{g}</div><h3>{name}</h3><p class="tag">{tag}</p><div style="margin-top:.12in">{checks(items)}</div></div>'
    return f'''<section class="page glazing">
  <div class="wrap"><span class="kicker">Glazing options</span>
    <h2 class="title">Single, double or triple pane</h2>
    <p class="lead">Choose the build that fits the climate, the budget and the building.</p>
    <div class="panes">
      {pane('Single pane', 'One layer of glass', 1, ['Lightweight and easy to install', 'Cost-effective for simple applications', 'Ideal for heritage and conservation buildings', 'Suits decorative and temporary structures'])}
      {pane('Double pane', 'Insulated glass unit', 2, ['Improves energy efficiency in moderate climates', 'Reduces outside noise', 'Minimizes condensation and mould', 'Better indoor comfort and air quality'])}
      {pane('Triple pane', 'High-performance unit', 3, ['Superior thermal insulation and energy efficiency', 'Less heat loss in winter', 'Helps keep interiors cooler in summer', 'Better sound insulation and comfort'])}
    </div></div>
  <div class="pics"><div style="background-image:url({img(L + 'igu-double-triple.jpg')})"></div><div style="background-image:url({img(L + 'igu-heat-transfer.jpg')})"></div></div>
  {folio(n)}
</section>'''


def product(p, n):
    h = p.get('hero_h', 4.9)
    if p.get('graphic') == 'frit':
        hero = '<div class="g-frit" style="flex:1"><div class="pane-ill"></div></div>'
    elif p.get('graphic') == 'led':
        hero = '<div class="g-led" style="flex:1"><div class="m1"></div><div class="m2"></div></div>'
    else:
        hero = ''.join(f'<div style="flex:{w};background-image:url({img(src)});background-position:{pos}"></div>' for src, w, pos in p['hero'])
    rows = ''.join(f'<tr><th>{E(k)}</th><td>{E(v)}</td></tr>' for k, v in p['specs'])
    uses = site_uses(*p['uses']) if p.get('uses') else []
    apps = f'<div class="apps"><h3 class="label">Typical applications</h3>{checks(uses)}</div>' if uses else ''
    note = f'<p class="pnote">{E(p["note"])}</p>' if p.get('note') else '<p class="pnote">Typical values for reference. Final specifications are confirmed in your quote.</p>'
    extra = f'<div class="extra">{p["extra"]}</div>' if p.get('extra') else ''
    return f'''<section class="page product">
  <div class="hero" style="height:{h}in"><span class="ribbon">{E(p['cat'])}</span>{hero}</div>
  <div class="pbody" style="top:{h + 0.36}in">
    <div class="phead"><span class="num">{p['no']:02d}<em>.</em></span><div><span class="kicker">{E(p['cat'])}</span><h2>{E(p['name'])}</h2></div></div>
    <div class="pcols">
      <div><p class="desc">{E(p['desc'])}</p>{apps}</div>
      <div><h3 class="label">{E(p.get('specs_title', 'Technical specification'))}</h3><table class="spec">{rows}</table>{note}</div>
    </div>
    {extra}
  </div>
  {folio(n)}
</section>'''


def certifications(n):
    return f'''<section class="page certs">
  <div class="wrap"><span class="kicker">Certifications &amp; testing</span>
    <h2 class="title">Tested to international standards</h2>
    <table>
      <tr><th>Product</th><th>Document</th><th>Standard / compliance</th><th>Reference</th></tr>
      <tr><td class="prod" rowspan="2">Laminated safety glass</td><td>Certificate</td><td>EN ISO 12543-2</td><td class="ref">TQT0243A206EC</td></tr>
      <tr><td>Test report</td><td>EN ISO 12543-3<br>EN ISO 12543-4:2021<br>EN 410<br>EN 12600<br>UNECE R43</td><td class="ref">TQT0243A206E</td></tr>
      <tr><td class="prod" rowspan="2">Tempered safety glass</td><td>Certificate</td><td>EN 1449-2005</td><td class="ref">TQT0243A325EC</td></tr>
      <tr><td>Test report</td><td>EN 12150-1:2015</td><td class="ref">TQT0243A325E</td></tr>
    </table>
    <div class="below">
      <img class="certimg" src="{img('_src/catalogue/certificate-laminated.jpg', 1600)}" alt="Certificate of compliance, laminated safety glass">
      <div class="verify"><img src="{img('_src/catalogue/verify-qr.png', 900)}" alt=""><div><h3 class="label">Scan to verify</h3>
        <p>Search with the reference number provided.</p></div>
        <p>Complete certificates and test reports are available on request.</p></div>
    </div>
  </div>
  {folio(n)}
</section>'''


def back():
    rows = ''.join(f'<dt>{k}</dt><dd>{E(v)}</dd>' for k, v in (('Address', CONTACT['address']), ('Phone', CONTACT['phone']),
                                                             ('Email', CONTACT['email']), ('Web', CONTACT['web'])))
    return f'''<section class="page back">
  <div class="photo" style="background-image:url({img(W + 'zone-quote.webp')})"></div>
  <div class="wrap"><span class="kicker light">Contact</span>
    <h2 style="margin-top:.2in">Let’s build together.<span>Your vision. Our glass.</span></h2>
    <p class="motto">Built on quality. Driven by partnership.</p></div>
  <div class="contact"><dl>{rows}</dl>{logo('#C9A56A', '#FFFFFF', '0.62in')}</div>
</section>'''


def build_html():
    pages = [cover(), about(2), milestones(3), overview(4), glazing(5)]
    pages += [product(p, FIRST_PRODUCT_PAGE + i) for i, p in enumerate(PRODUCTS)]
    pages.append(certifications(FIRST_PRODUCT_PAGE + len(PRODUCTS)))
    pages.append(back())
    css = (SRC / 'catalogue.css').read_text(encoding='utf-8')
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sailing International Trade - Product Catalogue 2026</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=block" rel="stylesheet">
<style>{css}</style></head><body>
{''.join(pages)}
</body></html>''', len(pages)


# ---------------------------------------------------------------- output
def main():
    sys.path.insert(0, str(ROOT / '_src'))
    from cdp import Chrome  # small DevTools client; starts its own headless Chrome

    BUILD.mkdir(parents=True, exist_ok=True)
    page_html, count = build_html()
    (BUILD / 'catalogue.html').write_text(page_html, encoding='utf-8')
    OUT.mkdir(parents=True, exist_ok=True)
    pdf_path = OUT / PDF_NAME

    c = Chrome(str(BUILD / 'chrome-profile'), port=9361, width=1200, height=1000)
    try:
        c.call('Page.enable')
        c.call('Page.navigate', url=(BUILD / 'catalogue.html').as_uri())
        for _ in range(120):
            time.sleep(0.25)
            if c.js("document.readyState === 'complete'"):
                break
        c.js('document.fonts.ready.then(() => true)')
        time.sleep(1.0)
        missing = c.js("[...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src).join(', ')")
        # every page is a fixed sheet that clips what does not fit: stop if any text block runs into the footer
        over = c.js("""[...document.querySelectorAll('.page:not(.cover)')].map((pg) => { const b = pg.getBoundingClientRect().bottom - 0.72 * 96;
          const bad = [...pg.querySelectorAll('.pbody, .wrap, .lower, .main, .panel')].filter(el => el.getBoundingClientRect().bottom > b + 1);
          return bad.length ? 'page ' + ([...document.querySelectorAll('.page')].indexOf(pg) + 1) : ''; }).filter(Boolean).join(', ')""")
        if over:
            raise SystemExit(f'text runs into the footer on: {over}')
        if missing:
            raise SystemExit(f'pictures did not load: {missing}')
        res = c.call('Page.printToPDF', printBackground=True, preferCSSPageSize=True, paperWidth=8.5, paperHeight=11,
                     marginTop=0, marginBottom=0, marginLeft=0, marginRight=0)
    finally:
        c.close()
    import base64
    pdf_path.write_bytes(base64.b64decode(res['data']))

    doc = fitz.open(pdf_path)
    if doc.page_count != count:
        raise SystemExit(f'expected {count} pages, the PDF has {doc.page_count}: a page overflowed')
    pages_dir = OUT / 'pages'
    pages_dir.mkdir(exist_ok=True)
    for old in pages_dir.glob('p*.jpg'):
        old.unlink()
    previews = []
    for i, pg in enumerate(doc):
        # small preview (thumbnails, and the first picture the flipbook shows) + sharp page for reading
        pix = pg.get_pixmap(dpi=60)
        im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        name = f'p{i + 1:02d}.jpg'
        im.save(pages_dir / name, quality=82, optimize=True)
        hd = pg.get_pixmap(dpi=150)
        hd_name = f'p{i + 1:02d}-hd.jpg'
        Image.frombytes('RGB', (hd.width, hd.height), hd.samples).save(pages_dir / hd_name, quality=80, optimize=True, progressive=True)
        previews.append({'page': i + 1, 'image': f'assets/catalogue/pages/{name}', 'hd': f'assets/catalogue/pages/{hd_name}'})
    cov = doc[0].get_pixmap(dpi=150)
    Image.frombytes('RGB', (cov.width, cov.height), cov.samples).save(OUT / 'cover.jpg', quality=85, optimize=True)
    size_mb = pdf_path.stat().st_size / 1e6
    (OUT / 'pages.json').write_text(json.dumps({'pdf': f'assets/catalogue/{PDF_NAME}', 'sizeMB': round(size_mb, 1),
                                                'pages': previews}, indent=1), encoding='utf-8')
    print(f'{PDF_NAME}: {doc.page_count} pages, {size_mb:.1f} MB')


if __name__ == '__main__':
    main()

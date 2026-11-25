"""Build the Sailing International Trade Product Catalogue 2026 in English, French and Spanish (PDF + web previews).

Each edition is laid out as an HTML page (US Letter pages, styles in _src/catalogue/catalogue.css),
printed to PDF with headless Chrome, then rendered to page images for the website's flipbook.
Texts follow Sailing's 2026 catalogue (English, plus their French and Spanish translations);
photos and "typical uses" come from the website (content/*.json), so swapping a photo there and
re-running keeps catalogue and website in step. Photos must come from the Sailing photo library or AI.

Run from the site folder (needs Google Chrome, Pillow and PyMuPDF):
    python _src/make_catalogue.py            # all three editions
    python _src/make_catalogue.py fr         # one edition

Writes (English keeps the original paths, so links already shared keep working):
    assets/catalogue/Sailing-Product-Catalogue-2026.pdf, cover.jpg, pages/      English
    assets/catalogue/fr/Sailing-Catalogue-de-produits-2026.pdf, cover.jpg, pages/  French
    assets/catalogue/es/Sailing-Catalogo-de-productos-2026.pdf, cover.jpg, pages/  Spanish
    assets/catalogue/pages.json   the editions, their PDFs and page images, for the website
"""
import base64
import html
import json
import pathlib
import sys
import time

import fitz  # PyMuPDF
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src' / 'catalogue'
BUILD = SRC / 'build'                      # generated, not committed
OUT = ROOT / 'assets' / 'catalogue'
EDITIONS = {
    'en': {'label': 'English', 'dir': '', 'pdf': 'Sailing-Product-Catalogue-2026.pdf', 'html_lang': 'en'},
    'fr': {'label': 'Français', 'dir': 'fr/', 'pdf': 'Sailing-Catalogue-de-produits-2026.pdf', 'html_lang': 'fr-CA'},
    'es': {'label': 'Español', 'dir': 'es/', 'pdf': 'Sailing-Catalogo-de-productos-2026.pdf', 'html_lang': 'es'},
}
CONTACT = {  # as printed in Sailing's 2026 catalogue
    'address': '1110-250 Consumers Rd, North York, ON M2J 4V6',
    'phone': '437-880-8427',
    'email': 'sales@sailingtrades.com',
    'web': 'sailingintltrade.com',
}
NB = ' '
E = html.escape
LANG = 'en'   # edition being built


def L(en, fr=None, es=None):
    return {'en': en, 'fr': en if fr is None else fr, 'es': en if es is None else es}


def tx(v):
    return v[LANG] if isinstance(v, dict) else v


def sz(a, b):
    return f'{a}″{NB}×{NB}{b}″'


REGULAR = ' · '.join(sz(a, b) for a, b in ((72, 96), (84, 130), (84, 144), (96, 130), (96, 144)))
REGULAR_LOW_IRON = REGULAR.split(' · ', 1)[1]  # Sailing lists low iron without 72 x 96
TWO_SIZES = f'{sz(84, 130)} · {sz(96, 130)}'

# words used on many pages
W_ = {
    'folio': L('Sailing International Trade · Product Catalogue 2026', 'Sailing International Trade · Catalogue de produits 2026',
               'Sailing International Trade · Catálogo de productos 2026'),
    'spec': L('Technical specification', 'Spécifications techniques', 'Especificaciones técnicas'),
    'custom': L('Customisation options', 'Options de personnalisation', 'Opciones de personalización'),
    'avail': L('Available options', 'Options disponibles', 'Opciones disponibles'),
    'apps': L('Typical applications', 'Applications courantes', 'Aplicaciones típicas'),
    'note': L('Typical values for reference. Final specifications are confirmed in your quote.',
              'Valeurs indicatives. Les spécifications finales sont confirmées dans votre soumission.',
              'Valores de referencia. Las especificaciones finales se confirman en su cotización.'),
    'p': L('p.', 'p.', 'pág.'),
}
T = {  # spec labels
    'thick': L('Thickness', 'Épaisseur', 'Espesor'),
    'reg': L('Regular sizes', 'Tailles standard', 'Tamaños estándar'),
    'max': L('Max. size', 'Dimension maximale', 'Dimensión máxima'),
    'sizes': L('Sizes', 'Dimensions', 'Dimensiones'),
    'colour': L('Glass colour', 'Couleur du verre', 'Color del vidrio'),
    'colours': L('Colours', 'Couleurs', 'Colores'),
    'std': L('Standards', 'Normes', 'Normas'),
    'type': L('Glass type', 'Type de verre', 'Tipo de vidrio'),
    'proc': L('Processing', 'Transformation', 'Procesamiento'),
}
CAT = {
    'flat': L('Flat glass', 'Verre plat', 'Vidrio plano'),
    'processed': L('Processed glass', 'Verre transformé', 'Vidrio procesado'),
    'decorative': L('Decorative glass', 'Verre décoratif', 'Vidrio decorativo'),
    'specialty': L('Specialty glass', 'Verre spécial', 'Vidrio especial'),
    'mirrors': L('Mirrors', 'Miroirs', 'Espejos'),
}
# Spanish "typical uses" (the website has English, Chinese and French)
USES_ES = {
    'Windows and picture frames': 'Ventanas y marcos de cuadros', 'Shelving and furniture': 'Estanterías y muebles',
    'Base glass for tempering and laminating': 'Vidrio base para templado y laminado', 'Frameless showers': 'Duchas sin marco',
    'Display cases and shelving': 'Vitrinas y estanterías', 'Feature glass and balustrades': 'Vidrio decorativo y barandillas',
    'Facades and storefronts': 'Fachadas y escaparates', 'Automotive glass': 'Vidrio automotriz',
    'Decorative interior glazing': 'Acristalamiento interior decorativo', 'Shower doors and enclosures': 'Puertas y mamparas de ducha',
    'Doors, sidelites and railings': 'Puertas, paneles laterales y barandillas', 'Table tops and shelves': 'Tableros de mesa y estantes',
    'Railings and balustrades': 'Barandillas y balaustradas', 'Skylights and canopies': 'Tragaluces y marquesinas',
    'Storefronts and security glazing': 'Escaparates y acristalamiento de seguridad', 'Windows and doors': 'Ventanas y puertas',
    'Curtain walls and storefronts': 'Muros cortina y escaparates', 'Skylights': 'Tragaluces',
    'Energy-efficient windows': 'Ventanas de eficiencia energética', 'Facades and curtain walls': 'Fachadas y muros cortina',
    'Solar control glazing': 'Acristalamiento de control solar', 'Shower enclosures and bathrooms': 'Mamparas de ducha y baños',
    'Office partitions and doors': 'Divisiones de oficina y puertas', 'Cabinets and furniture': 'Gabinetes y muebles',
    'Curved facades and storefronts': 'Fachadas y escaparates curvos', 'Office partitions': 'Divisiones de oficina',
    'Railings, display cases and showers': 'Barandillas, vitrinas y duchas', 'Solar modules': 'Módulos solares',
    'Building-integrated solar': 'Energía solar integrada en edificios', 'Greenhouses': 'Invernaderos',
    'Bathrooms and vanities': 'Baños y tocadores', 'Closet and wardrobe doors': 'Puertas de clóset y armario',
    'Furniture and décor': 'Muebles y decoración', 'Kitchen splashbacks': 'Salpicaderos de cocina',
    'Wall cladding': 'Revestimiento de paredes', 'Glass boards and signage': 'Pizarras de vidrio y señalización',
}


# ---------------------------------------------------------------- helpers
def logo(text_color, size='0.42in'):
    """The Sailing logo: the script-S mark (lightened for the dark pages it sits on) with the company name."""
    return (f'<span class="logo"><img src="{png("assets/img/site/sailing-mark-light.png")}" style="height:{size}" alt="">'
            f'<span style="color:{text_color}"><b>SAILING</b><i>INTERNATIONAL TRADE LTD</i></span></span>')


def folio(n, light=False):
    return f'<div class="folio{" light" if light else ""}"><span>{E(tx(W_["folio"]))}</span><span class="n">{n:02d}</span></div>'


_prepared = {}


def img(path, max_px=2400):
    """Copy a site picture into the build folder as a JPEG of sensible size (keeps the PDF small)."""
    if path in _prepared:
        return _prepared[path]
    src = ROOT / path
    name = src.stem + '.jpg'
    dst = BUILD / 'img' / name
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:   # redo when the site picture changed
        im = Image.open(src).convert('RGB')
        if max(im.size) > max_px:
            im.thumbnail((max_px, max_px), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, quality=84, optimize=True, progressive=True)
    _prepared[path] = f'img/{name}'
    return _prepared[path]


def png(path):
    """Copy a picture with transparency (the logo) into the build folder as it is."""
    src = ROOT / path
    dst = BUILD / 'img' / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(src.read_bytes())
    return f'img/{src.name}'


def site_uses(kind, item_id):
    data = json.loads((ROOT / 'content' / f'{kind}.json').read_text(encoding='utf-8'))
    it = next(i for i in data['items'] if i['id'] == item_id)
    out = []
    for u in it.get('uses', []):
        out.append(USES_ES.get(u['en'], u['en']) if LANG == 'es' else u.get(LANG, u['en']))
    return out


def checks(items):
    return '<ul class="checks">' + ''.join(f'<li>{E(tx(x))}</li>' for x in items) + '</ul>'


# ---------------------------------------------------------------- content
Lb = 'assets/img/library/'
Wh = 'assets/img/warehouse/'
AI = 'assets/img/ai/'


def groups(title, items):
    return f'<div><h4>{E(tx(title))}</h4><p>{", ".join(items)}</p></div>'


PRODUCTS = [
    dict(no=1, name=L('Clear Float Glass', 'Verre flotté clair', 'Vidrio flotado claro'), cat='flat', uses=('glass', 'clear-float'),
         hero=[(Lb + 'clear-float-studio.jpg', .42, 'center 40%'), (Lb + 'clear-vs-low-iron.jpg', .58, 'center')],
         desc=L('Float glass is made by floating molten glass over a bath of molten tin, which gives it an even thickness and a smooth, '
                'distortion-free surface. Its optical clarity and flatness make it the standard choice for architectural and interior glazing, '
                'and the base for tempering, laminating and insulated units.',
                'Le verre flotté est fabriqué en faisant flotter du verre en fusion sur un bain d’étain fondu, ce qui donne une épaisseur '
                'uniforme et une surface lisse sans distorsion. Son excellente clarté optique et sa planéité en font un choix idéal pour les '
                'applications architecturales et intérieures, et la base du verre trempé, feuilleté et des vitrages isolants.',
                'El vidrio flotado se fabrica haciendo flotar vidrio fundido sobre un baño de estaño fundido, lo que permite obtener un espesor '
                'uniforme y una superficie lisa y sin distorsiones. Su excelente claridad óptica y planitud lo convierten en una opción ideal para '
                'aplicaciones arquitectónicas y de interiores, y en la base del vidrio templado, laminado y aislante.'),
         specs=[(T['thick'], L('1.8–25 mm', '1,8–25 mm', '1,8–25 mm')), (T['reg'], REGULAR), (T['max'], sz(192, 433))]),
    dict(no=2, name=L('Low Iron Glass', 'Verre à faible teneur en fer', 'Vidrio bajo en hierro'), cat='flat', uses=('glass', 'low-iron'),
         hero=[(Lb + 'low-iron-studio.jpg', .42, 'center 40%'), (Lb + 'low-iron-edge.jpg', .58, 'center')],
         desc=L('Low iron glass has a reduced iron content for exceptional clarity and high light transmission, without the green tint of '
                'standard clear glass. Its crystal-clear look suits architectural, display and decorative work where visual clarity matters.',
                'Le verre à faible teneur en fer offre une clarté exceptionnelle et une transmission lumineuse élevée, sans la teinte verdâtre '
                'du verre clair standard. Son aspect cristallin est idéal pour les applications architecturales, d’exposition et décoratives '
                'où la clarté visuelle est essentielle.',
                'El vidrio bajo en hierro tiene un contenido reducido de hierro, lo que le da una claridad excepcional y una alta transmisión '
                'de luz, sin el tono verdoso del vidrio claro estándar. Su apariencia cristalina es ideal para aplicaciones arquitectónicas, '
                'expositivas y decorativas donde la claridad visual es esencial.'),
         specs=[(T['thick'], L('1.8–22 mm', '1,8–22 mm', '1,8–22 mm')), (T['reg'], REGULAR_LOW_IRON), (T['max'], sz(192, 433))]),
    dict(no=3, name=L('Tinted Glass', 'Verre teinté', 'Vidrio tintado'), cat='flat', uses=('glass', 'tinted'),
         hero=[(Lb + 'tinted-collection.jpg', 1, 'center 8%')],
         desc=L('Tinted glass has colour added to the glass itself to reduce solar heat gain and glare while still letting in natural light. '
                'Available in a range of colours, it gives both solar control and design freedom for facades, windows and interiors.',
                'Le verre teinté intègre la couleur directement dans le verre afin de réduire la chaleur solaire et l’éblouissement, tout en '
                'laissant passer la lumière naturelle. Offert dans une gamme de couleurs, il allie contrôle solaire et liberté esthétique pour '
                'les façades, les fenêtres et les intérieurs.',
                'El vidrio tintado incorpora color en el propio vidrio para reducir la ganancia de calor solar y el deslumbramiento, manteniendo '
                'la entrada de luz natural. Disponible en una amplia gama de colores, ofrece control solar y flexibilidad estética para '
                'fachadas, ventanas e interiores.'),
         specs=[(T['colours'], L('Euro Grey, Euro Bronze, Super Grey and more', 'Gris Euro, Bronze Euro, Gris Super et plus',
                                 'Gris Euro, Bronce Euro, Gris Súper y más')),
                (T['thick'], '3–12 mm'), (T['reg'], REGULAR), (T['max'], sz(96, 295))]),
    dict(no=4, name=L('Low-E Glass', 'Verre Low-E', 'Vidrio Low-E'), cat='flat', uses=('glass', 'coated'),
         hero=[(Lb + 'low-e-facade.jpg', .62, 'center'), (Lb + 'low-e-office.jpg', .38, 'center')],
         desc=L('Low-E glass carries a low-emissivity coating that cuts heat transfer while keeping natural light. It improves thermal '
                'insulation and energy efficiency, making it the right choice for facades, windows and energy-efficient buildings.',
                'Le verre Low-E est doté d’un revêtement à faible émissivité qui réduit le transfert de chaleur tout en conservant la lumière '
                'naturelle. Il améliore l’isolation thermique et l’efficacité énergétique, ce qui en fait un choix idéal pour les façades, '
                'les fenêtres et les bâtiments écoénergétiques.',
                'El vidrio Low-E cuenta con un recubrimiento de baja emisividad que reduce la transferencia de calor y mantiene la luz '
                'natural. Mejora el aislamiento térmico y la eficiencia energética, por lo que es ideal para fachadas, ventanas y edificios '
                'energéticamente eficientes.'),
         specs=[(T['thick'], L('3.2–6 mm', '3,2–6 mm', '3,2–6 mm')), (T['reg'], TWO_SIZES),
                (T['colour'], L('Clear or grey', 'Clair ou gris', 'Claro o gris')),
                (L('Coatings', 'Revêtements', 'Recubrimientos'),
                 L('Performance similar to or matching Planibel G, S48, SA, SS22, EA, SC60, SFC, SL60, Solarban 60 and Solarban 70',
                   'Performances similaires ou équivalentes à Planibel G, S48, SA, SS22, EA, SC60, SFC, SL60, Solarban 60 et Solarban 70',
                   'Rendimiento similar o equivalente a Planibel G, S48, SA, SS22, EA, SC60, SFC, SL60, Solarban 60 y Solarban 70'))]),
    dict(no=5, name=L('Reflective Glass', 'Verre réfléchissant', 'Vidrio reflectante'), cat='flat', uses=('glass', 'coated'),
         hero=[(Lb + 'reflective-pavilion.jpg', .5, 'center 60%'), (Lb + 'reflective-diagram.jpg', .5, 'center')],
         desc=L('Reflective glass has a metallic coating that reduces solar heat gain and glare and gives a distinctive mirrored look. '
                'It improves solar control and visual comfort on facades, curtain walls and windows.',
                'Le verre réfléchissant est doté d’un revêtement métallique qui réduit la chaleur solaire et l’éblouissement tout en offrant '
                'un aspect réfléchissant distinctif. Il améliore le contrôle solaire et le confort visuel des façades, murs-rideaux et fenêtres.',
                'El vidrio reflectante tiene un recubrimiento metálico que reduce la ganancia de calor solar y el deslumbramiento y le da una '
                'apariencia reflectante distintiva. Mejora el control solar y el confort visual en fachadas, muros cortina y ventanas.'),
         specs=[(T['thick'], '4–10 mm'), (T['reg'], TWO_SIZES), (T['max'], sz(96, 295)),
                (T['colour'], L('Euro Grey, Euro Bronze, Super Grey and more', 'Gris Euro, Bronze Euro, Gris Super et plus',
                                'Gris Euro, Bronce Euro, Gris Súper y más'))]),
    dict(no=6, name=L('Tempered Glass', 'Verre trempé', 'Vidrio templado'), cat='processed', uses=('glass', 'tempered'),
         hero=[(AI + 'tempered-glass.jpg', .55, 'center'), (Wh + 'zone-racks.webp', .45, 'center 55%')],
         desc=L('Tempered glass is safety glass, heat- or chemically treated to be four to five times stronger than standard annealed glass. '
                'If it breaks, it crumbles into small, blunt pieces instead of sharp shards. Typical uses include shower enclosures, railings, '
                'skylights, windows under high wind loads, table tops and shelves.',
                'Le verre trempé est un verre de sécurité soumis à des traitements thermiques ou chimiques contrôlés qui le rendent quatre à '
                'cinq fois plus résistant que le verre recuit standard. En cas de bris, il se fragmente en petits morceaux non tranchants. '
                'Applications courantes : parois de douche, garde-corps, puits de lumière, fenêtres exposées à de fortes charges de vent, '
                'plateaux de table et tablettes.',
                'El vidrio templado es un vidrio de seguridad sometido a procesos térmicos o químicos controlados que lo hacen entre cuatro y '
                'cinco veces más resistente que el vidrio recocido estándar. Si se rompe, se fragmenta en pequeños trozos sin bordes afilados. '
                'Aplicaciones comunes: mamparas de ducha, barandillas, tragaluces, ventanas con altas cargas de viento, mesas y estantes.'),
         specs=[(T['thick'], '3–19 mm'),
                (T['sizes'], L(f'Min. {sz(12, 12)}\nMax. {sz(144, 433)}', f'Min. {sz(12, 12)}\nMax. {sz(144, 433)}', f'Mín. {sz(12, 12)}\nMáx. {sz(144, 433)}')),
                (T['colour'], L('Clear, low iron, acid etched, tinted and more', 'Clair, faible teneur en fer, dépoli à l’acide, teinté et plus',
                                'Claro, bajo en hierro, grabado al ácido, tintado y más')),
                (L('Certification', 'Certification', 'Certificación'), 'SGCC'),
                (T['std'], 'EN 12150, ANSI Z97.1, ASTM C1048, BS EN 14179')]),
    dict(no=7, name=L('Laminated Glass', 'Verre feuilleté', 'Vidrio laminado'), cat='processed', uses=('glass', 'laminated'),
         hero=[(Lb + 'laminated-studio.jpg', .45, 'center'), (Lb + 'laminated-edge.jpg', .55, 'center')],
         desc=L('Laminated glass bonds two or more layers of glass with an interlayer such as PVB for added safety, durability, sound '
                'insulation and structural performance. It comes in a range of glass colours, thicknesses and build-ups to suit each project.',
                'Le verre feuilleté combine deux ou plusieurs couches de verre avec des intercalaires en PVB ou SGP afin d’offrir une sécurité, '
                'une durabilité et une performance structurelle accrues. Il est offert en différents coloris, épaisseurs et compositions pour '
                'répondre aux exigences de chaque projet.',
                'El vidrio laminado combina dos o más capas de vidrio con una lámina intermedia, como PVB, para proporcionar mayor seguridad, '
                'durabilidad, aislamiento acústico y rendimiento estructural. Está disponible en diversos colores, espesores y configuraciones '
                'para cada proyecto.'),
         specs=[(L('Standard thickness', 'Épaisseur standard', 'Espesor estándar'),
                 L('6, 8, 10, 12 mm (e.g. 3 mm + PVB + 3 mm)', '6, 8, 10, 12 mm (ex. 3 mm + PVB + 3 mm)', '6, 8, 10, 12 mm (p. ej. 3 mm + PVB + 3 mm)')),
                (L('PVB thickness', 'Épaisseur du PVB', 'Espesor del PVB'), L('0.38 mm (0.015″)', '0,38 mm (0,015″)', '0,38 mm (0,015″)')),
                (T['reg'], REGULAR), (T['max'], sz(144, 433)),
                (T['colour'], L('Clear, milk white, green, blue, bronze and more', 'Clair, blanc laiteux, vert, bleu, bronze et plus',
                                'Claro, blanco lechoso, verde, azul, bronce y más')),
                (T['std'], 'EN 14449, ANSI Z97.1, ASTM C1048, GB/T 15763.3')]),
    dict(no=8, name=L('Insulated Glass Units (IGUs)', 'Vitrage isolant (IGU)', 'Unidad de vidrio aislante (IGU)'), cat='processed',
         uses=('glass', 'insulated'), hero=[(Lb + 'igu-window.jpg', .6, 'center'), (Lb + 'igu-corner.jpg', .4, 'center 40%')],
         desc=L('Insulated glass units have two or more panes separated by spacer bars filled with a high-performance desiccant and sealed '
                'together, often with air or argon in the cavity. In windows and curtain walls, the layered build keeps heat in during winter '
                'and out during summer, easing the load on heating and cooling.',
                'Les vitrages isolants sont composés de deux ou plusieurs panneaux de verre séparés par des intercalaires remplis d’un '
                'déshydratant haute performance et scellés ensemble, l’espace étant généralement rempli d’air ou d’argon. Dans les fenêtres '
                'et les murs-rideaux, ils conservent la chaleur à l’intérieur l’hiver et à l’extérieur l’été, ce qui allège le chauffage et '
                'la climatisation.',
                'Las unidades de vidrio aislante están compuestas por dos o más paneles de vidrio separados por perfiles espaciadores rellenos '
                'de un desecante de alto rendimiento y sellados entre sí, con aire o gas argón en la cámara. En ventanas y muros cortina '
                'mantienen el calor dentro en invierno y fuera en verano, reduciendo la demanda de calefacción y refrigeración.'),
         specs=[(L('Glass thickness', 'Épaisseur du verre', 'Espesor del vidrio'), '3–12 mm'),
                (L('Spacer', 'Intercalaire', 'Espaciador'), '6, 9, 12, 15, 19 mm'), (T['max'], sz(144, 433)),
                (T['colour'], L('Clear, low iron, Low-E, reflective, tinted and more', 'Clair, faible teneur en fer, Low-E, réfléchissant, teinté et plus',
                                'Claro, bajo en hierro, Low-E, reflectante, tintado y más')),
                (L('Gas filling', 'Remplissage de gaz', 'Llenado de gas'), L('Air or argon', 'Air ou argon', 'Aire o argón')),
                (T['std'], 'EN 1279, IGCC, GB/T 11944')]),
    dict(no=9, name=L('Patterned Glass', 'Verre imprimé', 'Vidrio impreso'), cat='decorative', uses=None, hero_h=4.0,
         hero=[(Lb + 'pattern-flutelite-s.jpg', .25, 'center'), (Lb + 'pattern-moru.jpg', .25, 'center'),
               (Lb + 'pattern-oceanic.jpg', .25, 'center'), (Lb + 'pattern-chinchilla.jpg', .25, 'center')],
         desc=L('Patterned glass combines a decorative surface texture with soft, natural light diffusion, balancing privacy and style. '
                'It comes in a wide range of patterns, thicknesses and sizes for architectural and interior projects.',
                'Le verre imprimé combine des textures de surface décoratives avec une diffusion douce de la lumière naturelle, offrant un '
                'équilibre idéal entre intimité et esthétique. Il est offert dans une large gamme de motifs, d’épaisseurs et de dimensions.',
                'El vidrio impreso combina texturas decorativas en la superficie con una difusión suave de la luz natural, ofreciendo un '
                'equilibrio ideal entre privacidad y estética. Está disponible en una amplia variedad de diseños, espesores y tamaños.'),
         specs=[(T['thick'], L('3–12 mm (varies by pattern)', '3–12 mm (selon le motif)', '3–12 mm (según el diseño)')), (T['reg'], REGULAR),
                (T['max'], sz(96, 189)), (T['colour'], L('Clear, low iron, tinted and more', 'Clair, faible teneur en fer, teinté et plus',
                                                       'Claro, bajo en hierro, tintado y más'))],
         extra=lambda: (f'<h3 class="label">{E(tx(L("Pattern options", "Options de motifs", "Opciones de diseño")))}</h3><div class="groups">'
                        + groups(L('Modern interior trends', 'Tendances des intérieurs modernes', 'Tendencias de interiores modernos'),
                                 ['Reeded', 'Fluted', 'Ribbed', 'Moru', 'Rain', 'Linen'])
                        + groups(L('Decorative patterns', 'Motifs décoratifs', 'Patrones decorativos'),
                                 ['Bamboo', 'Oceanic', 'Water Ripple', 'Antique', 'Karatachi', 'Kasumi', 'Morgon', 'Puzzle'])
                        + groups(L('Geometric patterns', 'Motifs géométriques', 'Patrones geométricos'),
                                 ['Delta', 'Master Carré', 'Master Ligne', 'Master Point', 'Cross Reed', 'Linear'])
                        + groups(L('Classic patterns', 'Motifs classiques', 'Patrones clásicos'),
                                 ['Rain', 'Mistlite', 'Flora', 'Nashiji', 'Diamond', 'Moru', 'Reeded (Fluted)', 'Satin (Matelux)', 'Chinchilla', 'Aquatex'])
                        + '</div>')),
    dict(no=10, name=L('Back Painted Glass', 'Verre laqué au dos', 'Vidrio pintado por la cara posterior'), cat='decorative',
         uses=('mirrors', 'back-painted'), hero_h=4.5, hero=[(Lb + 'back-painted-collection.jpg', 1, 'center 12%')],
         desc=L('Back-painted glass pairs a smooth glass face with a durable coloured coating on the back, for a clean, contemporary look. '
                'It comes in a wide range of colours for interior, decorative and architectural work.',
                'Le verre laqué au dos combine une surface lisse avec un revêtement coloré durable appliqué à l’arrière, pour un aspect épuré '
                'et contemporain. Il est offert dans une large gamme de couleurs pour les applications intérieures, décoratives et architecturales.',
                'El vidrio pintado por la cara posterior combina una superficie lisa con un revestimiento de color duradero en la parte '
                'posterior, para una apariencia limpia y contemporánea. Disponible en una amplia gama de colores para interiores, decoración '
                'y arquitectura.'),
         specs_title='custom',
         specs=[(L('Base glass', 'Verre de base', 'Vidrio base'), L('Clear, low iron or other glass', 'Clair, faible teneur en fer ou autre verre',
                                                                  'Claro, bajo en hierro u otros vidrios')),
                (T['thick'], L('Based on the base glass', 'Selon le verre de base', 'Según el vidrio base')),
                (L('Size', 'Taille', 'Tamaño'), L('Custom sizes', 'Dimensions sur mesure', 'Tamaños personalizados')),
                (L('Colour', 'Couleur', 'Color'), L('Standard or custom (matched to colour codes)', 'Standard ou sur mesure (selon les codes couleur)',
                                                   'Estándar o personalizado (según códigos de color)')),
                (L('Finish', 'Finition', 'Acabado'), L('Glossy or matte', 'Brillante ou mate', 'Brillante o mate')),
                (L('Further processing', 'Transformation supplémentaire', 'Procesamiento adicional'),
                 L('Cutting, edgework, tempering', 'Découpe, façonnage des bords, trempe', 'Corte, acabado de bordes, templado'))],
         note=L('Final dimensions and specifications depend on the base glass and project requirements.',
                'Les dimensions et spécifications finales dépendent du verre de base et des exigences du projet.',
                'Las dimensiones y especificaciones finales dependen del vidrio base y de los requisitos del proyecto.')),
    dict(no=11, name=L('Acid Etched Glass', 'Verre dépoli à l’acide', 'Vidrio grabado al ácido'), cat='decorative', uses=('glass', 'acid-etched'),
         hero=[(Lb + 'acid-etched-studio.jpg', .4, 'center 45%'), (Lb + 'acid-etched-privacy.jpg', .6, 'center')],
         desc=L('Acid-etched glass has a smooth, translucent satin finish that lets in natural light while adding privacy. It suits a wide '
                'range of architectural, interior and decorative applications.',
                'Le verre dépoli à l’acide offre une finition lisse et translucide qui équilibre lumière naturelle et intimité. Il convient à '
                'une grande variété d’applications architecturales, intérieures et décoratives.',
                'El vidrio grabado al ácido ofrece un acabado liso y translúcido que equilibra la entrada de luz natural con la privacidad. '
                'Es adecuado para una amplia variedad de aplicaciones arquitectónicas, de interiores y decorativas.'),
         specs=[(T['thick'], '3–15 mm'), (T['reg'], REGULAR), (T['max'], sz(96, 189)),
                (T['colour'], L('Clear, low iron or tinted; frosted or velour finish', 'Clair, faible teneur en fer ou teinté; finition dépolie ou velours',
                                'Claro, bajo en hierro o tintado; acabado esmerilado o velour'))]),
    dict(no=12, name=L('Silk Screen Printed Glass', 'Verre sérigraphié', 'Vidrio serigrafiado'), cat='decorative', uses=None, hero_h=4.7, graphic='frit',
         desc=L('Silk-screen printed glass has ceramic ink fused permanently to the surface during heat treatment, giving a durable, '
                'colour-stable finish. Available in a wide range of colours and patterns, it offers decorative and functional solutions '
                'for architectural projects, from facade fritting to privacy bands.',
                'Le verre sérigraphié utilise une encre céramique fusionnée de façon permanente à la surface du verre par traitement thermique, '
                'créant une finition durable et résistante à la décoloration. Offert dans une variété de couleurs et de motifs, il propose des '
                'solutions décoratives et fonctionnelles pour l’architecture.',
                'El vidrio serigrafiado utiliza tinta cerámica que se fusiona permanentemente con la superficie del vidrio mediante un '
                'tratamiento térmico, creando un acabado duradero y resistente a la decoloración. Disponible en una amplia variedad de colores '
                'y patrones, ofrece soluciones decorativas y funcionales para la arquitectura.'),
         specs_title='custom',
         specs=[(L('Base glass', 'Verre de base', 'Vidrio base'), L('Clear, low iron, tinted and others', 'Clair, faible teneur en fer, teinté et autres',
                                                                  'Claro, bajo en hierro, tintado y otros')),
                (L('Further processing', 'Transformation supplémentaire', 'Procesamiento adicional'),
                 L('Tempered, laminated, IGUs', 'Trempé, feuilleté, vitrage isolant', 'Templado, laminado, IGU')),
                (L('Printing', 'Impression', 'Impresión'), L('Standard colours, custom colours, custom patterns',
                                                            'Couleurs standard, couleurs personnalisées, motifs personnalisés',
                                                            'Colores estándar, colores personalizados, patrones personalizados')),
                (L('Coverage', 'Couverture', 'Cobertura'), L('Full or partial', 'Totale ou partielle', 'Total o parcial'))]),
    dict(no=13, name=L('Curved Glass', 'Verre courbé', 'Vidrio curvado'), cat='specialty', uses=('glass', 'curved'),
         hero=[(Lb + 'curved-facade.jpg', .6, 'center'), (Lb + 'curved-partition.jpg', .4, 'center')],
         desc=L('Curved glass brings architectural freedom together with structural performance, making distinctive shapes and seamless '
                'curved surfaces possible. It comes in a range of glass types and sizes for custom architectural and commercial projects.',
                'Le verre courbé combine flexibilité architecturale et performance structurelle, permettant de créer des formes distinctives '
                'et des surfaces courbes continues. Il est offert dans une variété de types de verre, de dimensions et de rayons.',
                'El vidrio curvado combina flexibilidad arquitectónica con rendimiento estructural, permitiendo crear formas distintivas y '
                'superficies curvas continuas. Está disponible en una amplia variedad de tipos de vidrio, tamaños y radios.'),
         specs=[(T['thick'], '5–22 mm (3/16″–7/8″)'),
                (T['max'], L(f'{sz(144, 630)} with min. radius 177″, or {sz(87, 96)} with min. radius 35″',
                             f'{sz(144, 630)} avec un rayon minimum de 177″, ou {sz(87, 96)} avec un rayon minimum de 35″',
                             f'{sz(144, 630)} con un radio mínimo de 177″, o {sz(87, 96)} con un radio mínimo de 35″')),
                (T['type'], L('Clear, low iron, bronze, grey, blue and more', 'Clair, faible teneur en fer, bronze, gris, bleu et plus',
                              'Claro, bajo en hierro, bronce, gris, azul y más')),
                (L('Fabrication', 'Options de fabrication', 'Opciones de fabricación'),
                 L('Holes, cut-outs, edge polishing, radius corners', 'Perçages, découpes, polissage des bords, coins arrondis',
                   'Orificios, recortes, pulido de bordes, esquinas redondeadas'))]),
    dict(no=14, name=L('Photovoltaic (PV) Glass', 'Verre photovoltaïque (PV)', 'Vidrio fotovoltaico (PV)'), cat='specialty', uses=('glass', 'solar'),
         hero=[(Wh + 'zone-solar.webp', 1, 'center 45%')],
         desc=L('Photovoltaic glass is designed for solar modules, with high light transmission, durability and configurations tailored '
                'to each project.',
                'Le verre photovoltaïque est conçu pour les modules solaires : transmission lumineuse élevée, grande durabilité et '
                'configurations adaptées à chaque projet.',
                'El vidrio fotovoltaico está diseñado para módulos solares, con alta transmisión de luz, gran durabilidad y configuraciones '
                'adaptadas a cada proyecto.'),
         specs=[(T['type'], L('Clear float, low iron, ultra-clear', 'Flotté clair, faible teneur en fer, ultra-clair', 'Flotado claro, bajo en hierro, ultra claro')),
                (T['thick'], L('2 mm standard · 1.6–4.0 mm available', '2 mm standard · 1,6–4,0 mm disponibles', '2 mm estándar · 1,6–4,0 mm disponibles')),
                (T['max'], L('2500 × 1300 mm', '2 500 × 1 300 mm', '2500 × 1300 mm')),
                (L('AR coating', 'Revêtement antireflet', 'Recubrimiento AR'),
                 L('Single (transmittance ≥ 93.8%) or double (≥ 94.1%)', 'Simple (transmission ≥ 93,8 %) ou double (≥ 94,1 %)',
                   'Simple (transmisión ≥ 93,8 %) o doble (≥ 94,1 %)')),
                (T['proc'], L('Semi-tempering, screen printing, drilling, edge processing, matte, patterned',
                              'Semi-trempe, sérigraphie, perçage, façonnage des bords, finition mate, verre imprimé',
                              'Semitemplado, serigrafía, perforación, procesamiento de bordes, mate, estampado'))],
         note=L('Specifications vary by product and project. Custom sizes, coatings and processing are available; contact us for detailed technical data.',
                'Les spécifications varient selon le produit et le projet. Dimensions, revêtements et transformations sur mesure offerts; '
                'contactez-nous pour les données techniques détaillées.',
                'Las especificaciones varían según el producto y el proyecto. Se ofrecen tamaños, recubrimientos y procesamientos '
                'personalizados; contáctenos para obtener datos técnicos detallados.')),
    dict(no=15, name=L('Mirror Collection', 'Collection de miroirs', 'Colección de espejos'), cat='mirrors', uses=('mirrors', 'silver-mirror'), hero_h=4.4,
         hero=[(Wh + 'zone-mirrors.webp', .6, 'center'), (AI + 'silver-mirror.jpg', .4, 'center')],
         desc=L('Our mirrors combine excellent reflective quality with versatile options for architectural, interior, furniture and '
                'decorative use, in a range of substrates, colours, finishes and safety builds, with polished or bevelled edges.',
                'Notre gamme de miroirs combine une réflexion de haute qualité avec des options polyvalentes pour l’architecture, l’intérieur, '
                'le mobilier et la décoration, dans une variété de supports, couleurs, finitions et options de sécurité, avec bords polis ou biseautés.',
                'Nuestros espejos combinan una calidad reflectante excepcional con opciones versátiles para arquitectura, interiores, '
                'mobiliario y decoración, en una variedad de sustratos, colores, acabados y configuraciones de seguridad, con bordes pulidos o biselados.'),
         specs=[(T['thick'], '2–8 mm'), (T['sizes'], L('Custom cut to size', 'Découpe sur mesure', 'Corte a medida')),
                (T['reg'], REGULAR), (T['max'], sz(96, 144))],
         extra=lambda: (f'<h3 class="label">{E(tx(L("Mirror types", "Types de miroirs", "Tipos de espejo")))}</h3><div class="chips">'
                        + ''.join(f'<span>{E(tx(m))}</span>' for m in (
                            L('Silver mirror', 'Miroir argenté', 'Espejo de plata'), L('Aluminium mirror', 'Miroir en aluminium', 'Espejo de aluminio'),
                            L('Copper-free mirror', 'Miroir sans cuivre', 'Espejo sin cobre'), L('Tinted mirror', 'Miroir teinté', 'Espejo tintado'),
                            L('Low iron mirror', 'Miroir à faible teneur en fer', 'Espejo bajo en hierro'),
                            L('Acid etched mirror', 'Miroir dépoli à l’acide', 'Espejo grabado al ácido'),
                            L('Vinyl-backed safety mirror', 'Miroir avec film de sécurité en vinyle', 'Espejo con película de vinilo de seguridad'),
                            L('Antique mirror', 'Miroir antique', 'Espejo antiguo'), L('Temperable mirror', 'Miroir trempable', 'Espejo templable'),
                            L('LED mirror', 'Miroir LED', 'Espejo LED'))) + '</div>')),
    dict(no=16, name=L('LED Mirrors', 'Miroirs LED', 'Espejos LED'), cat='mirrors', uses=None, hero_h=4.3, graphic='led',
         desc=L('LED mirrors combine high-quality mirror glass with integrated lighting, for useful light and a clean, modern look. '
                'They come in a range of sizes, shapes, lighting layouts and options to suit each project and design.',
                'Les miroirs LED combinent un verre miroir de haute qualité avec un éclairage intégré, pour un éclairage fonctionnel et un '
                'aspect épuré et moderne. Ils sont offerts dans une variété de tailles, formes, configurations d’éclairage et options.',
                'Los espejos LED combinan vidrio de espejo de alta calidad con iluminación integrada, para una iluminación funcional y una '
                'apariencia limpia y moderna. Están disponibles en una amplia variedad de tamaños, formas, configuraciones de iluminación y opciones.'),
         specs_title='avail',
         specs=[(L('Size and shape', 'Taille et forme', 'Tamaño y forma'), L('Custom sizes and shapes', 'Dimensions et formes sur mesure',
                                                                          'Tamaños y formas personalizados')),
                (L('Light', 'Éclairage', 'Iluminación'), L('Colour temperature options, dimmable', 'Températures de couleur au choix, réglable',
                                                          'Opciones de temperatura de color, regulable')),
                (L('Controls', 'Commandes', 'Controles'), L('Touch sensor, motion sensor', 'Capteur tactile, détecteur de mouvement',
                                                          'Sensor táctil, sensor de movimiento')),
                (L('Features', 'Fonctions', 'Funciones'), L('Anti-fog, Bluetooth, digital clock, video', 'Antibuée, Bluetooth, horloge numérique, vidéo',
                                                          'Antivaho, Bluetooth, reloj digital, video'))],
         extra=lambda: (f'<h3 class="label">{E(tx(L("Lighting options", "Options d’éclairage", "Opciones de iluminación")))}</h3><div class="lit">'
                        + ''.join(f'<div><h4>{E(tx(h))}</h4><p>{E(tx(p))}</p></div>' for h, p in (
                            (L('Front-lit', 'Éclairage frontal', 'Iluminación frontal'),
                             L('LEDs on the mirror face give direct, even light, ideal for grooming and close tasks.',
                               'Lumière LED directe et uniforme sur la face du miroir, idéale pour un éclairage fonctionnel.',
                               'Luz LED directa y uniforme en la cara del espejo, ideal para una iluminación funcional.')),
                            (L('Back-lit', 'Rétroéclairage', 'Iluminación posterior'),
                             L('LEDs behind the mirror cast a soft glow around the edge for a clean, contemporary look.',
                               'Lumière LED derrière le miroir : un halo doux autour du contour pour un aspect moderne.',
                               'Luz LED detrás del espejo: un halo suave alrededor del borde para un aspecto moderno.')),
                            (L('Dual-lit', 'Double éclairage', 'Iluminación dual'),
                             L('Front and back lighting together: useful light and ambient glow in one design.',
                               'Combine éclairage frontal et rétroéclairage pour plus de fonctionnalité et d’ambiance.',
                               'Combina iluminación frontal y posterior para mayor funcionalidad y ambiente.'))))
                        + '</div>')),
]
CATEGORIES = [
    ('flat', L('Base glass for glazing and further processing.', 'Verre de base pour le vitrage et la transformation.',
               'Vidrio base para acristalamiento y procesamiento.'), [1, 2, 3, 4, 5]),
    ('processed', L('Safety and insulating glass, made to size.', 'Verre de sécurité et vitrage isolant, sur mesure.',
                    'Vidrio de seguridad y aislante, a medida.'), [6, 7, 8]),
    ('decorative', L('Texture, colour and privacy for interiors and facades.', 'Texture, couleur et intimité pour intérieurs et façades.',
                     'Textura, color y privacidad para interiores y fachadas.'), [9, 10, 11, 12]),
    ('specialty', L('Shapes and solar applications.', 'Formes courbes et applications solaires.', 'Formas curvas y aplicaciones solares.'), [13, 14]),
    ('mirrors', L('Mirrors for architecture, interiors and furniture.', 'Miroirs pour l’architecture, l’intérieur et le mobilier.',
                  'Espejos para arquitectura, interiores y mobiliario.'), [15, 16]),
]
FIRST_PRODUCT_PAGE = 6  # cover, about, milestones, overview, glazing come first


# ---------------------------------------------------------------- pages
def cover():
    return f'''<section class="page cover">
  <div class="photo" style="background-image:url({img(Wh + 'entrance-closed.webp')})"></div>
  <div class="top">{logo('#FFFFFF', '0.5in')}<span class="year-tag">{E(tx(L('EDITION 2026', 'ÉDITION 2026', 'EDICIÓN 2026')))}</span></div>
  <div class="panel">
    <span class="kicker light">{E(tx(L('Architectural glass & mirrors', 'Verre architectural & miroirs', 'Vidrio arquitectónico & espejos')))}</span>
    <h1{' class="long"' if LANG == 'es' else ''} style="margin-top:.18in">{E(tx(L('Product catalogue', 'Catalogue de produits', 'Catálogo de productos')))}<span>2026</span></h1>
    <p class="sub">{E(tx(L('Float glass · Processed glass · Mirrors · Custom manufacturing', 'Verre flotté · Verre transformé · Miroirs · Fabrication sur mesure',
                           'Vidrio flotado · Vidrio procesado · Espejos · Fabricación a medida')))}</p>
    <p class="cats">{E(tx(L('Toronto · Beijing · Shanghai · Manufacturing in Qingdao, China', 'Toronto · Beijing · Shanghai · Production à Qingdao, Chine',
                            'Toronto · Beijing · Shanghái · Fabricación en Qingdao, China')))}</p>
  </div>
  <p class="motto">{tx(L('Built on quality.<br>Driven by partnership.', 'Fondés sur la qualité.<br>Portés par le partenariat.',
                         'Basados en la calidad.<br>Impulsados por las alianzas.'))}</p>
</section>'''


def about(n):
    why = [L('30+ years of experience', '30+ ans d’expérience', '30+ años de experiencia'), L('20+ countries served', '20+ pays desservis', '20+ países atendidos'),
           L('Manufacturing facilities in China', 'Sites de production en Chine', 'Instalaciones de producción en China'),
           L('Sales offices in Toronto, Beijing and Shanghai', 'Bureaux de vente à Toronto, Beijing et Shanghai', 'Oficinas de ventas en Toronto, Beijing y Shanghái'),
           L('European market expansion', 'Expansion sur le marché européen', 'Expansión en el mercado europeo'),
           L('OEM and custom manufacturing', 'Fabrication OEM et sur mesure', 'Fabricación OEM y a medida'),
           L('Quality assurance', 'Assurance qualité', 'Garantía de calidad')]
    lead = L('For more than 30 years, Sailing International Trade has specialized in the manufacturing and global supply of architectural glass and mirror products.',
             'Depuis plus de 30 ans, Sailing International Trade se spécialise dans la fabrication et la fourniture mondiale de verre architectural et de miroirs.',
             'Durante más de 30 años, Sailing International Trade se ha especializado en la fabricación y el suministro global de vidrio arquitectónico y espejos.')
    body = L('With production facilities in China and a growing international sales network, we serve customers across North America, Europe, the Middle East '
             'and other global markets. Our portfolio covers float glass, processed glass, mirrors, insulated, laminated, tempered and decorative glass, and '
             'photovoltaic (PV) glass. We are committed to reliable quality, technical expertise and responsive service for projects of every scale.',
             'Avec des installations de production en Chine et un réseau de vente international en expansion, nous servons des clients en Amérique du Nord, '
             'en Europe, au Moyen-Orient et ailleurs dans le monde. Notre gamme comprend le verre flotté, le verre transformé, les miroirs, le vitrage isolant, '
             'le verre feuilleté, trempé et décoratif, et le verre photovoltaïque (PV). Nous offrons une qualité fiable, une expertise technique et un service '
             'réactif pour des projets de toute envergure.',
             'Con instalaciones de producción en China y una red internacional de ventas en expansión, atendemos a clientes en Norteamérica, Europa, Oriente '
             'Medio y otros mercados. Nuestro portafolio incluye vidrio flotado, vidrio procesado, espejos, vidrio aislante, laminado, templado y decorativo, y '
             'vidrio fotovoltaico (PV). Nos comprometemos a ofrecer calidad confiable, experiencia técnica y un servicio ágil para proyectos de cualquier escala.')
    quote = L('Dedicated to advancing global architectural glass and mirror solutions through quality, innovation and strong client relationships.',
              'Dédié à faire progresser les solutions mondiales de verre architectural et de miroirs grâce à la qualité, à l’innovation et à de solides relations avec nos clients.',
              'Dedicado a impulsar soluciones globales de vidrio arquitectónico y espejos mediante la calidad, la innovación y la confianza de nuestros clientes.')
    lead_label = L('Leadership', 'Direction', 'Liderazgo')
    return f'''<section class="page about">
  <div class="side" style="background-image:url({img(Wh + 'zone-glass.webp')})"></div>
  <div class="main">
    <span class="kicker">{E(tx(L('About us', 'À propos de nous', 'Sobre nosotros')))}</span>
    <h2 class="title">{E(tx(L('Building trusted glass solutions since 1993', 'Créer des solutions de verre fiables depuis 1993',
                              'Creando soluciones de vidrio de confianza desde 1993')))}</h2>
    <p class="lead">{E(tx(lead))}</p>
    <p style="margin-top:.14in">{E(tx(body))}</p>
    <div class="stats"><div><strong>30+</strong><span>{E(tx(L('Years', 'Ans', 'Años')))}</span></div>
      <div><strong>20+</strong><span>{E(tx(L('Countries served', 'Pays desservis', 'Países atendidos')))}</span></div>
      <div><strong>3</strong><span>{E(tx(L('Sales offices', 'Bureaux de vente', 'Oficinas de ventas')))}</span></div></div>
  </div>
  <div class="lower">
    <div class="why"><span class="kicker">{E(tx(L('Why partner with us', 'Pourquoi nous choisir', 'Por qué asociarse con nosotros')))}</span><div style="margin-top:.14in">{checks(why)}</div></div>
    <div class="leader"><span class="kicker">{E(tx(lead_label))}</span>
      <blockquote>{E(tx(quote))}</blockquote>
      <cite>Liu Dawei<small>{E(tx(lead_label))}</small></cite></div>
  </div>
  {folio(n)}
</section>'''


def milestones(n):
    events = [
        ('1993', L('Company founded', 'Fondation de l’entreprise', 'Fundación de la empresa'),
         L('Established in Qingdao, China, laying the foundation for a professional architectural glass manufacturing business.',
           'Établie à Qingdao, en Chine, posant les bases d’une entreprise professionnelle de fabrication de verre architectural.',
           'Establecida en Qingdao, China, sentando las bases de una empresa profesional de fabricación de vidrio arquitectónico.'), False),
        ('2014', L('Export division established', 'Création de la division export', 'Creación de la división de exportación'),
         L('Launched our international trade division, expanding into global markets and serving customers worldwide.',
           'Lancement de notre division de commerce international, étendant nos activités aux marchés mondiaux.',
           'Lanzamos nuestra división de comercio internacional, expandiéndonos a los mercados globales.'), False),
        ('2018', L('Qingdao manufacturing expansion', 'Expansion de la production à Qingdao', 'Expansión de la producción en Qingdao'),
         L('Strengthened production capacity and manufacturing capabilities to support growing international demand.',
           'Renforcement de notre capacité de production pour répondre à la demande internationale croissante.',
           'Fortalecimos la capacidad de producción para satisfacer la creciente demanda internacional.'), False),
        ('2022', L('Canadian sales office', 'Bureau des ventes au Canada', 'Oficina de ventas en Canadá'),
         L('Opened our Toronto office to improve customer service and strengthen our presence in the North American market.',
           'Ouverture de notre bureau de Toronto pour améliorer le service à la clientèle et renforcer notre présence en Amérique du Nord.',
           'Abrimos nuestra oficina en Toronto para mejorar el servicio al cliente y fortalecer nuestra presencia en Norteamérica.'), False),
        ('2024', L('Beijing and Shanghai offices', 'Bureaux de Beijing et Shanghai', 'Oficinas de Beijing y Shanghái'),
         L('Expanded our domestic network to improve regional support, operational efficiency and customer collaboration.',
           'Élargissement de notre réseau national pour améliorer le soutien régional, l’efficacité et la collaboration avec nos clients.',
           'Ampliamos nuestra red nacional para mejorar el soporte regional, la eficiencia operativa y la colaboración con los clientes.'), False),
        ('2026', L('European market expansion', 'Expansion sur le marché européen', 'Expansión en el mercado europeo'),
         L('Partnerships with European companies, focused on photovoltaic (PV) glass projects, while growing our customer base for architectural float and processed glass.',
           'Partenariats avec des entreprises européennes axés sur le verre photovoltaïque (PV), tout en élargissant notre clientèle pour le verre flotté et transformé.',
           'Alianzas con empresas europeas centradas en vidrio fotovoltaico (PV), ampliando a la vez nuestra base de clientes de vidrio flotado y procesado.'), False),
        ('2027', L('European sales office', 'Bureau des ventes en Europe', 'Oficina de ventas en Europa'),
         L('A planned European sales office to strengthen local customer support and expand our presence across the European market.',
           'Ouverture prévue d’un bureau des ventes en Europe pour renforcer le service local et accroître notre présence sur le marché européen.',
           'Apertura prevista de una oficina de ventas en Europa para fortalecer el servicio local y ampliar nuestra presencia en el mercado europeo.'), True),
    ]
    tag = tx(L('Future vision', 'Vision d’avenir', 'Visión de futuro'))
    rows = ''.join(f'<div class="ev{" future" if fut else ""}"><span class="yr">{y}</span><div><h3>{E(tx(t))}{f"<span class=fv>{E(tag)}</span>" if fut else ""}</h3>'
                   f'<p>{E(tx(d))}</p></div></div>' for y, t, d, fut in events)
    return f'''<section class="page timeline">
  <div class="wrap"><span class="kicker">{E(tx(L('Milestones & future vision', 'Jalons & vision d’avenir', 'Hitos & visión de futuro')))}</span>
    <h2 class="title">{E(tx(L('Three decades of growth', 'Trois décennies de croissance', 'Tres décadas de crecimiento')))}</h2>
    <div class="tl">{rows}</div></div>
  {folio(n)}
</section>'''


def overview(n):
    by_no = {p['no']: p for p in PRODUCTS}
    pg = tx(W_['p'])
    cards = ''
    for i, (key, blurb, nos) in enumerate(CATEGORIES):
        items = ''.join(f'<li><span class="no">{k:02d}</span><span class="nm">{E(tx(by_no[k]["name"]))}</span>'
                        f'<span class="pg">{pg} {FIRST_PRODUCT_PAGE + k - 1}</span></li>' for k in nos)
        cards += f'<div class="cat{" wide" if i == 0 else ""}"><h3>{E(tx(CAT[key]))}</h3><p>{E(tx(blurb))}</p><ol>{items}</ol></div>'
    more = [(L('Glazing options', 'Options de vitrage', 'Opciones de acristalamiento'), 5),
            (L('Certifications & testing', 'Certifications & essais', 'Certificaciones & pruebas'), FIRST_PRODUCT_PAGE + len(PRODUCTS)),
            (L('Contact', 'Contact', 'Contacto'), FIRST_PRODUCT_PAGE + len(PRODUCTS) + 1)]
    more_html = ''.join(f'<li><span class="nm">{E(tx(t))}</span><span class="pg">{pg} {p}</span></li>' for t, p in more)
    return f'''<section class="page overview">
  <div class="wrap"><span class="kicker">{E(tx(L('Product overview', 'Aperçu des produits', 'Descripción general de productos')))}</span>
    <h2 class="title">{E(tx(L('Comprehensive glass solutions', 'Solutions complètes en verre', 'Soluciones integrales de vidrio')))}</h2>
    <p class="lead">{E(tx(L('Sixteen product families, from base float glass to finished safety, decorative and specialty glass, plus a full mirror collection.',
                           'Seize familles de produits, du verre flotté de base au verre de sécurité, décoratif et spécial, ainsi qu’une collection complète de miroirs.',
                           'Dieciséis familias de productos, desde el vidrio flotado base hasta el vidrio de seguridad, decorativo y especial, además de una colección completa de espejos.')))}</p>
    <div class="cats-grid">{cards}
      <div class="cat"><h3>{E(tx(L('More in this catalogue', 'Aussi dans ce catalogue', 'También en este catálogo')))}</h3><ol>{more_html}</ol></div>
    </div></div>
  {folio(n)}
</section>'''


def glazing(n):
    def pane(name, tag, panes, items):
        g = '<s></s>'.join('<i></i>' for _ in range(panes))
        return f'<div class="pane"><div class="glyph">{g}</div><h3>{E(tx(name))}</h3><p class="tag">{E(tx(tag))}</p><div style="margin-top:.12in">{checks(items)}</div></div>'
    single = [L('Lightweight and easy to install', 'Léger et facile à installer', 'Ligero y fácil de instalar'),
              L('Cost-effective for simple applications', 'Économique pour les applications simples', 'Rentable para aplicaciones sencillas'),
              L('Ideal for heritage and conservation buildings', 'Idéal pour les bâtiments historiques et patrimoniaux', 'Ideal para edificios históricos y de conservación'),
              L('Suits decorative and temporary structures', 'Adapté aux structures décoratives et temporaires', 'Adecuado para estructuras decorativas y temporales')]
    double = [L('Improves energy efficiency in moderate climates', 'Améliore l’efficacité énergétique dans les climats modérés', 'Mejora la eficiencia energética en climas moderados'),
              L('Reduces outside noise', 'Réduit le bruit extérieur', 'Reduce el ruido exterior'),
              L('Minimizes condensation and mould', 'Réduit la condensation et les moisissures', 'Minimiza la condensación y el moho'),
              L('Better indoor comfort and air quality', 'Améliore le confort intérieur et la qualité de l’air', 'Mejora el confort interior y la calidad del aire')]
    triple = [L('Superior thermal insulation and energy efficiency', 'Isolation thermique et efficacité énergétique supérieures', 'Mayor aislamiento térmico y eficiencia energética'),
              L('Less heat loss in winter', 'Réduit les pertes de chaleur en hiver', 'Reduce la pérdida de calor en invierno'),
              L('Helps keep interiors cooler in summer', 'Garde l’intérieur plus frais en été', 'Mantiene los interiores más frescos en verano'),
              L('Better sound insulation and comfort', 'Meilleure isolation acoustique et confort', 'Mayor aislamiento acústico y confort')]
    return f'''<section class="page glazing">
  <div class="wrap"><span class="kicker">{E(tx(L('Glazing options', 'Options de vitrage', 'Opciones de acristalamiento')))}</span>
    <h2 class="title">{E(tx(L('Single, double or triple pane', 'Vitrage simple, double ou triple', 'Una, dos o tres hojas de vidrio')))}</h2>
    <p class="lead">{E(tx(L('Choose the build that fits the climate, the budget and the building.', 'Choisissez la composition adaptée au climat, au budget et au bâtiment.',
                           'Elija la composición que mejor se adapte al clima, al presupuesto y al edificio.')))}</p>
    <div class="panes">
      {pane(L('Single pane', 'Vitrage simple', 'Una sola hoja'), L('One layer of glass', 'Une seule épaisseur de verre', 'Una sola hoja de vidrio'), 1, single)}
      {pane(L('Double pane', 'Vitrage double', 'Doble hoja'), L('Insulated glass unit', 'Vitrage isolant', 'Unidad de vidrio aislante'), 2, double)}
      {pane(L('Triple pane', 'Vitrage triple', 'Triple hoja'), L('High-performance unit', 'Vitrage haute performance', 'Unidad de alto rendimiento'), 3, triple)}
    </div></div>
  <div class="pics"><div style="background-image:url({img(Lb + 'igu-double-triple.jpg')})"></div><div style="background-image:url({img(Lb + 'igu-heat-transfer.jpg')})"></div></div>
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
    rows = ''.join(f'<tr><th>{E(tx(k))}</th><td>{E(tx(v))}</td></tr>' for k, v in p['specs'])
    uses = site_uses(*p['uses']) if p.get('uses') else []
    apps = f'<div class="apps"><h3 class="label">{E(tx(W_["apps"]))}</h3>{checks(uses)}</div>' if uses else ''
    note = f'<p class="pnote">{E(tx(p["note"] if p.get("note") else W_["note"]))}</p>'
    extra = f'<div class="extra">{p["extra"]()}</div>' if p.get('extra') else ''
    cat = tx(CAT[p['cat']])
    return f'''<section class="page product">
  <div class="hero" style="height:{h}in"><span class="ribbon">{E(cat)}</span>{hero}</div>
  <div class="pbody" style="top:{h + 0.36}in">
    <div class="phead"><span class="num">{p['no']:02d}<em>.</em></span><div><span class="kicker">{E(cat)}</span><h2>{E(tx(p['name']))}</h2></div></div>
    <div class="pcols">
      <div><p class="desc">{E(tx(p['desc']))}</p>{apps}</div>
      <div><h3 class="label">{E(tx(W_[p.get('specs_title', 'spec')]))}</h3><table class="spec">{rows}</table>{note}</div>
    </div>
    {extra}
  </div>
  {folio(n)}
</section>'''


def certifications(n):
    cert, rep = tx(L('Certificate', 'Certificat', 'Certificado')), tx(L('Test report', 'Rapport d’essai', 'Informe de ensayo'))
    return f'''<section class="page certs">
  <div class="wrap"><span class="kicker">{E(tx(L('Certifications & testing', 'Certifications & essais', 'Certificaciones & pruebas')))}</span>
    <h2 class="title">{E(tx(L('Tested to international standards', 'Testé selon les normes internationales', 'Probado según normas internacionales')))}</h2>
    <table>
      <tr><th>{E(tx(L('Product', 'Produit', 'Producto')))}</th><th>{E(tx(L('Document', 'Document', 'Documento')))}</th>
          <th>{E(tx(L('Standard / compliance', 'Norme / conformité', 'Norma / cumplimiento')))}</th><th>{E(tx(L('Reference', 'Référence', 'Referencia')))}</th></tr>
      <tr><td class="prod" rowspan="2">{E(tx(L('Laminated safety glass', 'Verre feuilleté de sécurité', 'Vidrio laminado de seguridad')))}</td><td>{E(cert)}</td><td>EN ISO 12543-2</td><td class="ref">TQT0243A206EC</td></tr>
      <tr><td>{E(rep)}</td><td>EN ISO 12543-3<br>EN ISO 12543-4:2021<br>EN 410<br>EN 12600<br>UNECE R43</td><td class="ref">TQT0243A206E</td></tr>
      <tr><td class="prod" rowspan="2">{E(tx(L('Tempered safety glass', 'Verre trempé de sécurité', 'Vidrio templado de seguridad')))}</td><td>{E(cert)}</td><td>EN 14449-2005</td><td class="ref">TQT0243A325EC</td></tr>
      <tr><td>{E(rep)}</td><td>EN 12150-1:2015</td><td class="ref">TQT0243A325E</td></tr>
    </table>
    <div class="below">
      <img class="certimg" src="{img('_src/catalogue/certificate-laminated.jpg', 1600)}" alt="">
      <div class="verify"><img src="{img('_src/catalogue/verify-qr.png', 900)}" alt=""><div><h3 class="label">{E(tx(L('Scan to verify', 'Scannez & vérifiez', 'Escanee & verifique')))}</h3>
        <p>{E(tx(L('Search with the reference number provided.', 'Utilisez le numéro de référence indiqué.', 'Use el número de referencia indicado.')))}</p></div>
        <p>{E(tx(L('Complete certificates and test reports are available on request.', 'Les certificats complets et les rapports d’essai sont disponibles sur demande.',
                   'Los certificados completos y los informes de ensayo están disponibles previa solicitud.')))}</p></div>
    </div>
  </div>
  {folio(n)}
</section>'''


def back():
    labels = [(L('Address', 'Adresse', 'Dirección'), CONTACT['address']), (L('Phone', 'Téléphone', 'Teléfono'), CONTACT['phone']),
              (L('Email', 'Courriel', 'Correo'), CONTACT['email']), (L('Web', 'Web', 'Web'), CONTACT['web'])]
    rows = ''.join(f'<dt>{E(tx(k))}</dt><dd>{E(v)}</dd>' for k, v in labels)
    return f'''<section class="page back">
  <div class="photo" style="background-image:url({img(Wh + 'zone-quote.webp')})"></div>
  <div class="wrap"><span class="kicker light">{E(tx(L('Contact', 'Contact', 'Contacto')))}</span>
    <h2 style="margin-top:.2in">{E(tx(L('Let’s build together.', 'Construisons ensemble.', 'Construyamos juntos.')))}<span>{E(tx(L('Your vision. Our glass.', 'Votre vision. Notre verre.', 'Su visión. Nuestro vidrio.')))}</span></h2>
    <p class="motto">{E(tx(L('Built on quality. Driven by partnership.', 'Fondés sur la qualité. Portés par le partenariat.', 'Basados en la calidad. Impulsados por las alianzas.')))}</p></div>
  <div class="contact"><dl>{rows}</dl>{logo('#FFFFFF', '0.62in')}</div>
</section>'''


def build_html(lang):
    global LANG
    LANG = lang
    pages = [cover(), about(2), milestones(3), overview(4), glazing(5)]
    pages += [product(p, FIRST_PRODUCT_PAGE + i) for i, p in enumerate(PRODUCTS)]
    pages.append(certifications(FIRST_PRODUCT_PAGE + len(PRODUCTS)))
    pages.append(back())
    css = (SRC / 'catalogue.css').read_text(encoding='utf-8')
    title = tx(L('Product Catalogue 2026', 'Catalogue de produits 2026', 'Catálogo de productos 2026'))
    return f'''<!doctype html><html lang="{EDITIONS[lang]['html_lang']}"><head><meta charset="utf-8"><title>Sailing International Trade - {E(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=block" rel="stylesheet">
<style>{css}</style></head><body>
{''.join(pages)}
</body></html>''', len(pages)


# ---------------------------------------------------------------- output
def print_pdf(c, lang):
    page_html, count = build_html(lang)
    src = BUILD / f'catalogue-{lang}.html'
    src.write_text(page_html, encoding='utf-8')
    c.call('Page.navigate', url=src.as_uri())
    for _ in range(120):
        time.sleep(0.25)
        if c.js("document.readyState === 'complete'"):
            break
    c.js('document.fonts.ready.then(() => true)')
    time.sleep(1.0)
    missing = c.js("[...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src).join(', ')")
    if missing:
        raise SystemExit(f'{lang}: pictures did not load: {missing}')
    # every page is a fixed sheet that clips what does not fit: stop if any text block runs into the footer
    over = c.js("""[...document.querySelectorAll('.page:not(.cover)')].map((pg) => { const b = pg.getBoundingClientRect().bottom - 0.72 * 96;
      const bad = [...pg.querySelectorAll('.pbody, .wrap, .lower, .main, .panel')].filter(el => el.getBoundingClientRect().bottom > b + 1);
      return bad.length ? 'page ' + ([...document.querySelectorAll('.page')].indexOf(pg) + 1) : ''; }).filter(Boolean).join(', ')""")
    if over:
        raise SystemExit(f'{lang}: text runs into the footer on: {over}')
    # the cover title must stay on one line, or the subtitle runs into the motto
    if c.js("(() => { const h = document.querySelector('.cover h1'); const s = h.querySelector('span');"
            " return s.getBoundingClientRect().top - h.getBoundingClientRect().top > parseFloat(getComputedStyle(h).fontSize) * 1.3; })()"):
        raise SystemExit(f'{lang}: the cover title wraps onto two lines')
    res = c.call('Page.printToPDF', printBackground=True, preferCSSPageSize=True, paperWidth=8.5, paperHeight=11,
                 marginTop=0, marginBottom=0, marginLeft=0, marginRight=0)
    return base64.b64decode(res['data']), count


def main():
    sys.path.insert(0, str(ROOT / '_src'))
    from cdp import Chrome  # small DevTools client; starts its own headless Chrome

    langs = [a for a in sys.argv[1:] if a in EDITIONS] or list(EDITIONS)
    BUILD.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / 'pages.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    editions = manifest.get('editions', {})
    c = Chrome(str(BUILD / 'chrome-profile'), port=9361, width=1200, height=1000)
    try:
        c.call('Page.enable')
        for lang in langs:
            ed = EDITIONS[lang]
            data, count = print_pdf(c, lang)
            folder = OUT / ed['dir']
            pages_dir = folder / 'pages'
            pages_dir.mkdir(parents=True, exist_ok=True)
            pdf_path = folder / ed['pdf']
            pdf_path.write_bytes(data)
            doc = fitz.open(pdf_path)
            if doc.page_count != count:
                raise SystemExit(f'{lang}: expected {count} pages, the PDF has {doc.page_count}: a page overflowed')
            for old in pages_dir.glob('p*.jpg'):
                old.unlink()
            previews = []
            for i, pg in enumerate(doc):
                # small preview (thumbnails, and the first picture the flipbook shows) + sharp page for reading
                pix = pg.get_pixmap(dpi=60)
                name = f'p{i + 1:02d}.jpg'
                Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(pages_dir / name, quality=82, optimize=True)
                hd = pg.get_pixmap(dpi=150)
                hd_name = f'p{i + 1:02d}-hd.jpg'
                Image.frombytes('RGB', (hd.width, hd.height), hd.samples).save(pages_dir / hd_name, quality=80, optimize=True, progressive=True)
                base = f'assets/catalogue/{ed["dir"]}pages/'
                previews.append({'page': i + 1, 'image': base + name, 'hd': base + hd_name})
            cov = doc[0].get_pixmap(dpi=150)
            Image.frombytes('RGB', (cov.width, cov.height), cov.samples).save(folder / 'cover.jpg', quality=85, optimize=True)
            size_mb = round(pdf_path.stat().st_size / 1e6, 1)
            editions[lang] = {'label': ed['label'], 'pdf': f'assets/catalogue/{ed["dir"]}{ed["pdf"]}', 'sizeMB': size_mb,
                              'cover': f'assets/catalogue/{ed["dir"]}cover.jpg', 'pages': previews}
            print(f'{lang}: {ed["pdf"]}: {doc.page_count} pages, {size_mb} MB')
    finally:
        c.close()
    en = editions.get('en', {})
    manifest = {'pdf': en.get('pdf'), 'sizeMB': en.get('sizeMB'), 'pages': en.get('pages', []),   # English, as before
                'editions': {k: editions[k] for k in EDITIONS if k in editions}}
    manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    main()

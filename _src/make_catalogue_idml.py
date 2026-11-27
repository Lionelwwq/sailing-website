"""Export the product catalogue as InDesign files, so the catalogue can be edited in Adobe InDesign.

    python _src/make_catalogue.py                         (first: it writes the page HTML this script reads)
    python _src/make_catalogue_idml.py OUTPUT_FOLDER [en fr es]

InDesign's own .indd format can only be written by InDesign, so this writes .idml (InDesign Markup Language): InDesign
opens it directly as a new, editable document (File > Open), and File > Save As turns it into an .indd.
For each edition it writes
    OUTPUT_FOLDER/Sailing-Product-Catalogue-2026-<LANG>.idml
    OUTPUT_FOLDER/Links/...   the photos (shared by the editions) and one background picture per page and edition
Each page has, from back to front:
    "Background"  one locked picture with the colour blocks, lines, small drawings, and the cover and back photos with
                  their shading (unlock it in the Layers panel to replace it)
    photos        every other photo in its own frame: select the frame and File > Place to change the photo
    text          every text as live, editable text (fonts: Poppins and Inter, free on Adobe Fonts and Google Fonts)
If InDesign reports missing links: Window > Links, select all, Relink to Folder, choose the Links folder.
"""
import base64
import io
import json
import pathlib
import re
import shutil
import sys
import time
import urllib.parse
import zipfile
from xml.sax.saxutils import escape, quoteattr

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / '_src' / 'catalogue' / 'build'
sys.path.insert(0, str(ROOT / '_src'))
from cdp import Chrome  # noqa: E402  small DevTools client; starts its own headless Chrome

LANGS = {'en': 'EN', 'fr': 'FR', 'es': 'ES'}
PX = 0.75                     # CSS px -> points
PAGE_W, PAGE_H = 612, 792     # US Letter in points
SCALE = 2.5                   # background pictures at 240 dpi
NAMES = {(90, 58, 138): 'Sailing Purple', (63, 42, 99): 'Dark Amethyst', (237, 231, 243): 'Lavender Mist',
         (201, 165, 106): 'Soft Fawn', (37, 35, 42): 'Shadow Grey', (94, 90, 102): 'Muted Grey',
         (248, 247, 244): 'Bright Snow', (255, 255, 255): 'White'}
STYLE_NAMES = {(400, False): 'Regular', (500, False): 'Medium', (600, False): 'SemiBold', (700, False): 'Bold',
               (400, True): 'Italic', (500, True): 'Medium Italic', (600, True): 'SemiBold Italic', (700, True): 'Bold Italic'}

# ------------------------------------------------------------------ reading the pages in Chrome
EXTRACT = r"""(() => {
  const pages = [...document.querySelectorAll('.page')];
  const isInline = (el) => getComputedStyle(el).display === 'inline';
  const blockOf = (node) => { let e = node.nodeType === 1 ? node.parentElement : node.parentElement; while (e && isInline(e)) e = e.parentElement; return e; };
  const urlOf = (bg) => { const m = /url\(["']?([^"')]+)["']?\)/.exec(bg); return m ? m[1] : null; };
  const style = (cs) => ({ family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), weight: parseInt(cs.fontWeight, 10) || 400,
    italic: cs.fontStyle === 'italic', size: parseFloat(cs.fontSize), color: cs.color, ls: cs.letterSpacing,
    upper: cs.textTransform === 'uppercase', lh: cs.lineHeight, strokeW: parseFloat(cs.webkitTextStrokeWidth) || 0,
    strokeC: cs.webkitTextStrokeColor, ws: cs.whiteSpace });
  return pages.map((pg, pi) => {
    const P = pg.getBoundingClientRect();
    const rel = (r) => [r.left - P.left, r.top - P.top, r.width, r.height];
    // ---- photos: <img>, or a single url() background, unless shading is drawn over it (that stays in the background)
    const photos = [];
    pg.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      let src = null, kind = null;
      if (el.tagName === 'IMG') { src = el.currentSrc || el.src; kind = 'img'; }
      else if (cs.backgroundImage.startsWith('url(') && !cs.backgroundImage.includes('gradient') && cs.backgroundImage.split('url(').length === 2) { src = urlOf(cs.backgroundImage); kind = 'bg'; }
      if (!src) return;
      const shade = ['::before', '::after'].some((p) => { const b = getComputedStyle(el, p).backgroundImage; return b && b !== 'none'; });
      if (shade || parseFloat(cs.opacity) < 1) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      el.setAttribute('data-idml-photo', kind);
      photos.push({ src, kind, rect: rel(r), size: cs.backgroundSize, pos: cs.backgroundPosition, fit: cs.objectFit, opos: cs.objectPosition });
    });
    // ---- colour blocks that lie over a photo (e.g. the category tag): real rectangles in front of the photos
    const fills = [];
    const photoEls = [...pg.querySelectorAll('[data-idml-photo]')];
    pg.querySelectorAll('*').forEach((el) => {
      if (el.hasAttribute('data-idml-photo')) return;
      const cs = getComputedStyle(el);
      if (cs.backgroundImage !== 'none' || cs.display === 'none') return;
      const v = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number);
      if (v.length < 3 || (v.length > 3 && v[3] === 0)) return;
      const R = el.getBoundingClientRect();
      const over = photoEls.some((p) => { const Q = p.getBoundingClientRect();
        return !el.contains(p) && R.left < Q.right && R.right > Q.left && R.top < Q.bottom && R.bottom > Q.top; });
      if (over) fills.push({ rect: rel(R), color: cs.backgroundColor });
    });
    // ---- text: every run of text, grouped by the block it sits in (decorative marks drawn with ::before/::after,
    //      like the big quote mark, stay in the background picture)
    const groups = new Map();
    const add = (block, run) => { if (!groups.has(block)) groups.set(block, []); groups.get(block).push(run); };
    const walker = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 1) {
        if (n.tagName === 'BR') add(blockOf(n), { br: true });
        continue;
      }
      const el = n.parentElement;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map(rel);
      if (!rects.length && n.textContent.trim()) continue;   // text that is not shown
      add(blockOf(n), { text: n.textContent, st: style(cs), rects });
    }
    const texts = [];
    groups.forEach((runs, block) => {
      const all = runs.filter((r) => r.text !== undefined);
      if (!all.some((r) => r.text.trim())) return;
      const rects = all.flatMap((r) => r.rects);
      if (!rects.length) return;
      const x0 = Math.min(...rects.map((r) => r[0])), y0 = Math.min(...rects.map((r) => r[1]));
      const x1 = Math.max(...rects.map((r) => r[0] + r[2])), y1 = Math.max(...rects.map((r) => r[1] + r[3]));
      const lines = new Set(rects.map((r) => Math.round(r[1] / 4))).size;
      const bcs = getComputedStyle(block);
      const br = block.getBoundingClientRect();
      const pl = parseFloat(bcs.paddingLeft) + parseFloat(bcs.borderLeftWidth), pr = parseFloat(bcs.paddingRight) + parseFloat(bcs.borderRightWidth);
      texts.push({ runs, box: [x0, y0, x1 - x0, y1 - y0], lines, align: bcs.textAlign,
        content: [br.left - P.left + pl, br.width - pl - pr], lh: bcs.lineHeight, size: parseFloat(bcs.fontSize) });
    });
    return { photos, fills, texts };
  });
})()"""

# the page as a picture without its text (and without the photos that get their own frames)
HIDE = r"""(() => {
  const s = document.createElement('style');
  s.id = 'idml-hide';
  s.textContent = `* { color: transparent !important; -webkit-text-stroke-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }
    [data-idml-photo="bg"] { background-image: none !important; }
    [data-idml-photo="img"] { visibility: hidden !important; }`;
  document.head.appendChild(s);
  return true;
})()"""


def page_shots(c, count):
    """One screenshot per page at 240 dpi."""
    shots = []
    tops = c.js("[...document.querySelectorAll('.page')].map(p => p.getBoundingClientRect().top + scrollY)")
    for i in range(count):
        data = c.call('Page.captureScreenshot', format='png', captureBeyondViewport=True,
                      clip={'x': 0, 'y': tops[i], 'width': 816, 'height': 1056, 'scale': SCALE})['data']
        shots.append(Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB'))
    return shots


def pdf_pages(lang):
    """The printed PDF, page by page as pictures (to check the screenshots against what the PDF shows)."""
    import fitz
    from make_catalogue import EDITIONS, OUT
    ed = EDITIONS[lang]
    return fitz.open(OUT / ed['dir'] / ed['pdf'])


def pdf_background(pdf, i, size):
    """Page i of the PDF without its text (pictures and drawings untouched), as a picture of the given size."""
    import fitz
    tmp = fitz.open()
    tmp.insert_pdf(pdf, from_page=i, to_page=i)
    page = tmp[0]
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                page.add_redact_annot(fitz.Rect(span['bbox']), fill=False)
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE, text=fitz.PDF_REDACT_TEXT_REMOVE)
    pix = page.get_pixmap(dpi=round(size[0] / 8.5))
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples).resize(size)


# ------------------------------------------------------------------ CSS values
def rgba(s):
    m = re.match(r'rgba?\(([^)]+)\)', s or '')
    if not m:
        return (0, 0, 0, 1.0)
    p = [float(x) for x in re.split(r'[,\s/]+', m.group(1).strip()) if x]
    return (round(p[0]), round(p[1]), round(p[2]), p[3] if len(p) > 3 else 1.0)


def placement(box, nat, size, pos):
    """Where the whole picture lies (x, y, w, h in px, relative to its box) for CSS background-size/position or
    object-fit/object-position."""
    w, h = box
    iw, ih = nat
    size = (size or 'auto').strip()
    if size in ('cover', 'contain'):
        s = max(w / iw, h / ih) if size == 'cover' else min(w / iw, h / ih)
        dw, dh = iw * s, ih * s
    elif size == 'fill':
        dw, dh = w, h
    else:
        parts = size.split()
        if len(parts) == 1:
            parts.append('auto')

        def val(t, ref):
            if t == 'auto':
                return None
            return float(t[:-1]) / 100 * ref if t.endswith('%') else float(t.replace('px', ''))
        dw, dh = val(parts[0], w), val(parts[1], h)
        if dw is None and dh is None:
            dw, dh = iw, ih
        elif dw is None:
            dw = iw * dh / ih
        elif dh is None:
            dh = ih * dw / iw
    p = (pos or '50% 50%').split()
    if len(p) == 1:
        p.append('50%')

    def off(t, free):
        t = {'left': '0%', 'top': '0%', 'center': '50%', 'right': '100%', 'bottom': '100%'}.get(t, t)
        return float(t[:-1]) / 100 * free if t.endswith('%') else float(t.replace('px', ''))
    return off(p[0], w - dw), off(p[1], h - dh), dw, dh


# ------------------------------------------------------------------ IDML
class Ids:
    def __init__(self):
        self.n = 0x1f0

    def __call__(self):
        self.n += 1
        return f'u{self.n:x}'


def pts(x, y):
    """page px -> spread points (the page sits centred on the spread origin)"""
    return x * PX - PAGE_W / 2, y * PX - PAGE_H / 2


def path(x0, y0, x1, y1):
    corners = [(x0, y0), (x0, y1), (x1, y1), (x1, y0)]
    pp = ''.join(f'<PathPointType Anchor="{x:.3f} {y:.3f}" LeftDirection="{x:.3f} {y:.3f}" RightDirection="{x:.3f} {y:.3f}"/>' for x, y in corners)
    return f'<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>{pp}</PathPointArray></GeometryPathType></PathGeometry></Properties>'


HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
NS = 'xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="8.0"'


class Doc:
    def __init__(self):
        self.id = Ids()
        self.colors = {}
        self.spreads, self.stories = [], []

    def color(self, rgb):
        if rgb not in self.colors:
            name = NAMES.get(rgb, f'R={rgb[0]} G={rgb[1]} B={rgb[2]}')
            self.colors[rgb] = (f'Color/{self.id()}', name)
        return self.colors[rgb][0]

    def story(self, runs, align):
        sid = self.id()
        just = {'center': 'CenterAlign', 'right': 'RightAlign', 'end': 'RightAlign', 'justify': 'LeftJustified'}.get(align, 'LeftAlign')
        body = []
        for r in runs:
            attrs = [f'FontStyle={quoteattr(r["style"])}', f'PointSize="{r["pt"]:.2f}"', f'FillColor="{r["fill"]}"']
            if r['tracking']:
                attrs.append(f'Tracking="{r["tracking"]:.0f}"')
            if r['upper']:
                attrs.append('Capitalization="AllCaps"')
            if r.get('stroke'):
                attrs += [f'StrokeColor="{r["stroke"]}"', f'StrokeWeight="{r["strokeW"]:.2f}"']
            text = escape(r['text']).replace('\u2028', '&#x2028;')
            body.append(f'<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]" {" ".join(attrs)}>'
                        f'<Properties><Leading type="unit">{r["leading"]:.2f}</Leading><AppliedFont type="string">{escape(r["font"])}</AppliedFont></Properties>'
                        f'<Content>{text}</Content></CharacterStyleRange>')
        xml = (HEAD + f'<idPkg:Story {NS}>\n<Story Self="{sid}" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">'
               '<StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection"/>'
               f'<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle" Justification="{just}" Hyphenation="false" '
               'FirstLineIndent="0" LeftIndent="0" RightIndent="0" SpaceBefore="0" SpaceAfter="0">'
               + ''.join(body) + '</ParagraphStyleRange></Story>\n</idPkg:Story>\n')
        self.stories.append((sid, xml))
        return sid

    def write(self, out_path, page_count):
        layer = 'ul1'
        graphic = (HEAD + f'<idPkg:Graphic {NS}>\n'
                   + ''.join(f'<Ink Self="Ink/$ID/Process {n}" Name="$ID/Process {n}" Angle="{a}" ConvertToProcess="false" Frequency="70" '
                             f'NeutralDensity="{d}" PrintInk="true" TrapOrder="{i + 1}" InkType="Normal"/>\n'
                             for i, (n, a, d) in enumerate((('Cyan', 75, 0.61), ('Magenta', 15, 0.76), ('Yellow', 0, 0.16), ('Black', 45, 1.7))))
                   + '<Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" ColorOverride="Specialblack" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Black" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>\n'
                   '<Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" ColorOverride="Specialpaper" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Paper" ColorEditable="true" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>\n'
                   '<Color Self="Color/Registration" Model="Registration" Space="CMYK" ColorValue="100 100 100 100" ColorOverride="Specialregistration" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Registration" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>\n'
                   + ''.join(f'<Color Self="{cid}" Model="Process" Space="RGB" ColorValue="{r} {g} {b}" ColorOverride="Normal" AlternateSpace="NoAlternateColor" AlternateColorValue="" '
                             f'Name={quoteattr(name)} ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937"/>\n'
                             for (r, g, b), (cid, name) in self.colors.items())
                   + '<Swatch Self="Swatch/None" Name="None" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>\n'
                   '<StrokeStyle Self="StrokeStyle/$ID/Solid" Name="$ID/Solid"/>\n</idPkg:Graphic>\n')
        styles = (HEAD + f'<idPkg:Styles {NS}>\n'
                  '<RootCharacterStyleGroup Self="u79"><CharacterStyle Self="CharacterStyle/$ID/[No character style]" Imported="false" Name="$ID/[No character style]"/></RootCharacterStyleGroup>\n'
                  '<RootParagraphStyleGroup Self="u78"><ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Imported="false" Name="$ID/[No paragraph style]"/>'
                  '<ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Imported="false" Name="$ID/NormalParagraphStyle" NextStyle="ParagraphStyle/$ID/NormalParagraphStyle">'
                  '<Properties><BasedOn type="string">$ID/[No paragraph style]</BasedOn></Properties></ParagraphStyle></RootParagraphStyleGroup>\n'
                  '<RootObjectStyleGroup Self="u97"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/>'
                  '<ObjectStyle Self="ObjectStyle/$ID/[Normal Graphics Frame]" Name="$ID/[Normal Graphics Frame]"/>'
                  '<ObjectStyle Self="ObjectStyle/$ID/[Normal Text Frame]" Name="$ID/[Normal Text Frame]"/></RootObjectStyleGroup>\n'
                  '</idPkg:Styles>\n')
        prefs = (HEAD + f'<idPkg:Preferences {NS}>\n'
                 f'<DocumentPreference PageHeight="{PAGE_H}" PageWidth="{PAGE_W}" PagesPerDocument="{page_count}" FacingPages="false" '
                 'DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0" DocumentBleedInsideOrLeftOffset="0" DocumentBleedOutsideOrRightOffset="0" '
                 'DocumentBleedUniformSize="true" SlugTopOffset="0" SlugBottomOffset="0" SlugInsideOrLeftOffset="0" SlugRightOrOutsideOffset="0" '
                 'DocumentSlugUniformSize="false" PreserveLayoutWhenShuffling="true" AllowPageShuffle="true" OverprintBlack="true" '
                 'PageBinding="LeftToRight" ColumnDirection="Horizontal" Intent="PrintIntent"/>\n'
                 f'<MarginPreference ColumnCount="1" ColumnGutter="12" Top="0" Bottom="0" Left="0" Right="0" ColumnDirection="Horizontal" ColumnsPositions="0 {PAGE_W}"/>\n'
                 '<ViewPreference HorizontalMeasurementUnits="Inches" VerticalMeasurementUnits="Inches"/>\n'
                 '</idPkg:Preferences>\n')
        master = (HEAD + f'<idPkg:MasterSpread {NS}>\n<MasterSpread Self="um1" ItemTransform="1 0 0 1 0 0" Name="A-Master" NamePrefix="A" BaseName="Master" '
                  'ShowMasterItems="true" PageCount="1" OverriddenPageItemProps="" PrimaryTextFrame="n">'
                  f'<Page Self="ump1" Name="A" AppliedTrapPreset="TrapPreset/$ID/kDefaultTrapStyleName" OverrideList="" AppliedMaster="n" '
                  f'GeometricBounds="0 0 {PAGE_H} {PAGE_W}" ItemTransform="1 0 0 1 {-PAGE_W / 2} {-PAGE_H / 2}" MasterPageTransform="1 0 0 1 0 0">'
                  f'<MarginPreference ColumnCount="1" ColumnGutter="12" Top="0" Bottom="0" Left="0" Right="0" ColumnDirection="Horizontal" ColumnsPositions="0 {PAGE_W}"/></Page>'
                  '</MasterSpread>\n</idPkg:MasterSpread>\n')
        backing = (HEAD + f'<idPkg:BackingStory {NS}>\n<XmlStory Self="ubs" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">'
                   '<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"/></ParagraphStyleRange>'
                   '</XmlStory>\n</idPkg:BackingStory>\n')
        story_ids = [s for s, _ in self.stories]
        design = (HEAD + '<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="8.0(370)" ?>\n'
                  f'<Document {NS} Self="d" StoryList="{" ".join(story_ids + ["ubs"])}" ZeroPoint="0 0" ActiveLayer="{layer}" '
                  'CMYKProfile="U.S. Web Coated (SWOP) v2" RGBProfile="sRGB IEC61966-2.1" SolidColorIntent="UseColorSettings" AfterBlendingIntent="UseColorSettings" '
                  'DefaultImageIntent="UseColorSettings" RGBPolicy="PreserveEmbeddedProfiles" CMYKPolicy="CombinationOfPreserveAndSafeCmyk" AccurateLABSpots="false">\n'
                  '<idPkg:Graphic src="Resources/Graphic.xml"/>\n<idPkg:Styles src="Resources/Styles.xml"/>\n<idPkg:Preferences src="Resources/Preferences.xml"/>\n'
                  f'<Layer Self="{layer}" Name="Catalogue" Visible="true" Locked="false" IgnoreWrap="false" ShowGuides="true" LockGuides="false" UI="true" Expendable="true" Printable="true">'
                  '<Properties><LayerColor type="enumeration">LightBlue</LayerColor></Properties></Layer>\n'
                  '<idPkg:MasterSpread src="MasterSpreads/MasterSpread_um1.xml"/>\n'
                  + ''.join(f'<idPkg:Spread src="Spreads/Spread_{sid}.xml"/>\n' for sid, _, _ in self.spreads)
                  + f'<Section Self="usec" Length="{page_count}" Name="" ContinueNumbering="true" IncludeSectionPrefix="false" PageNumberStyle="Arabic" '
                  f'PageStart="{self.spreads[0][1]}" SectionPrefix="" Marker=""/>\n'
                  '<idPkg:BackingStory src="XML/BackingStory.xml"/>\n'
                  + ''.join(f'<idPkg:Story src="Stories/Story_{s}.xml"/>\n' for s in story_ids)
                  + '</Document>\n')
        parts = {'META-INF/container.xml': HEAD + '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>'
                                                  '<rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>\n',
                 'designmap.xml': design, 'Resources/Graphic.xml': graphic, 'Resources/Styles.xml': styles,
                 'Resources/Preferences.xml': prefs, 'MasterSpreads/MasterSpread_um1.xml': master, 'XML/BackingStory.xml': backing}
        for sid, _, xml in self.spreads:
            parts[f'Spreads/Spread_{sid}.xml'] = xml
        for sid, xml in self.stories:
            parts[f'Stories/Story_{sid}.xml'] = xml
        import xml.dom.minidom
        for name, text in parts.items():   # every part must be well-formed XML
            xml.dom.minidom.parseString(text.encode('utf-8'))
        with zipfile.ZipFile(out_path, 'w') as z:
            z.writestr(zipfile.ZipInfo('mimetype'), 'application/vnd.adobe.indesign-idml-package', compress_type=zipfile.ZIP_STORED)
            for name, text in parts.items():
                z.writestr(name, text.encode('utf-8'), compress_type=zipfile.ZIP_DEFLATED)


def graphic_frame(doc, layer, box, link_name, nat_px, dpi, place, locked=False, name='$ID/'):
    """A frame (box in page px) showing a linked picture placed at `place` (x, y, w, h in page px)."""
    rid, iid, lid = doc.id(), doc.id(), doc.id()
    x0, y0 = pts(box[0], box[1])
    x1, y1 = pts(box[0] + box[2], box[1] + box[3])
    gw, gh = nat_px[0] * 72 / dpi, nat_px[1] * 72 / dpi          # the picture's size in points at its own resolution
    px0, py0 = pts(place[0], place[1])
    sx, sy = place[2] * PX / gw, place[3] * PX / gh
    fmt = '$ID/JPEG' if link_name.lower().endswith(('.jpg', '.jpeg')) else '$ID/Portable Network Graphics (PNG)'
    return (f'<Rectangle Self="{rid}" Name={quoteattr(name)} ContentType="GraphicType" ItemLayer="{layer}" Locked="{"true" if locked else "false"}" '
            'StrokeWeight="0" FillColor="Swatch/None" StrokeColor="Swatch/None" ItemTransform="1 0 0 1 0 0">'
            + path(x0, y0, x1, y1)
            + f'<Image Self="{iid}" ItemTransform="{sx:.6f} 0 0 {sy:.6f} {px0:.3f} {py0:.3f}">'
            f'<Properties><Profile type="string">$ID/Embedded</Profile><GraphicBounds Left="0" Top="0" Right="{gw:.3f}" Bottom="{gh:.3f}"/></Properties>'
            f'<Link Self="{lid}" LinkResourceURI={quoteattr("file:Links/" + link_name)} LinkResourceFormat="{fmt}" StoredState="Normal" '
            'LinkClassID="35906" LinkClientID="257" LinkObjectModified="false" CanEmbed="true" CanUnembed="true" CanPackage="true" ShowInUI="true"/>'
            '</Image></Rectangle>')


def text_frame(doc, layer, sid, box):
    fid = doc.id()
    x0, y0 = pts(box[0], box[1])
    x1, y1 = pts(box[0] + box[2], box[1] + box[3])
    return (f'<TextFrame Self="{fid}" ParentStory="{sid}" PreviousTextFrame="n" NextTextFrame="n" ContentType="TextType" ItemLayer="{layer}" '
            'StrokeWeight="0" FillColor="Swatch/None" StrokeColor="Swatch/None" ItemTransform="1 0 0 1 0 0">'
            + path(x0, y0, x1, y1)
            + '<TextFramePreference TextColumnCount="1" TextColumnGutter="12" FirstBaselineOffset="AscentOffset" VerticalJustification="TopAlign" '
              'AutoSizingType="Off" IgnoreWrap="false"/></TextFrame>')


# ------------------------------------------------------------------ one edition
def collapse(runs):
    """CSS white-space: collapse spaces (keep line ends where white-space keeps them) and trim the ends."""
    out = []
    for r in runs:
        if r.get('br'):
            out.append(dict(text='\u2028', st=out[-1]['st'] if out else None, br=True))
            continue
        t = r['text']
        if r['st']['ws'] in ('pre-line', 'pre-wrap', 'pre'):
            t = '\u2028'.join(re.sub(r'[ \t]+', ' ', line) for line in t.replace('\r', '').split('\n'))
        else:
            t = re.sub(r'\s+', ' ', t)
        out.append(dict(text=t, st=r['st']))
        if r.get('afterBr'):
            out.append(dict(text='\u2028', st=r['st'], br=True))
    # spaces: no doubles across runs, none at the start or end, none next to a forced line break
    prev = '\u2028'
    for r in out:
        if r['text'].startswith(' ') and prev in (' ', '\u2028'):
            r['text'] = r['text'][1:]
        if r['text']:
            prev = r['text'][-1]
    for r in reversed(out):
        r['text'] = r['text'].rstrip(' ')
        if r['text']:
            break
    for i, r in enumerate(out):
        if r['text'].endswith(' ') and i + 1 < len(out) and out[i + 1]['text'].startswith('\u2028'):
            r['text'] = r['text'][:-1]
    out = [r for r in out if r['text'] and r['st']]
    while out and out[0]['text'] == '\u2028':
        out.pop(0)
    return out


def edition(c, lang, out_dir, links):
    src = BUILD / f'catalogue-{lang}.html'
    if not src.exists():
        raise SystemExit(f'{src} is missing: run python _src/make_catalogue.py first')
    c.call('Emulation.setEmulatedMedia', media='print')
    c.call('Page.navigate', url=src.as_uri())
    for _ in range(120):
        time.sleep(0.25)
        if c.js("document.readyState === 'complete'"):
            break
    c.js('document.fonts.ready.then(() => true)')
    time.sleep(1.0)
    pages = c.js(EXTRACT)
    full = page_shots(c, len(pages))           # the pages as they are, to compare with the PDF
    c.js(HIDE)
    time.sleep(0.4)
    shots = page_shots(c, len(pages))
    c.js("document.getElementById('idml-hide').remove(); true")
    # a page that the PDF shows differently from Chrome (see-through photos with shading blend differently): take its
    # background from the PDF itself, without the text, so it looks like the PDF everyone has seen
    from PIL import ImageChops, ImageStat
    pdf = pdf_pages(lang)
    for i, f in enumerate(full):
        pix = pdf[i].get_pixmap(dpi=48)
        ref = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        diff = sum(ImageStat.Stat(ImageChops.difference(f.resize(ref.size), ref)).mean) / 3
        if diff > 6:
            shots[i] = pdf_background(pdf, i, shots[i].size)
            print(f'  page {i + 1}: background from the PDF (differs from the screen by {diff:.1f})')

    doc = Doc()
    layer = 'ul1'
    photo_count = text_count = 0
    for pi, (pg, shot) in enumerate(zip(pages, shots), 1):
        items = []
        # background picture of the page (locked)
        bg_name = f'{lang}-page-{pi:02d}-background.jpg'
        bg_dpi = shot.width / 8.5                       # 240 dpi
        shot.save(links / bg_name, quality=88, dpi=(bg_dpi, bg_dpi))
        items.append(graphic_frame(doc, layer, (0, 0, 816, 1056), bg_name, shot.size, bg_dpi, (0, 0, 816, 1056), locked=True, name='Background'))
        # photos
        for ph in pg['photos']:
            url = urllib.parse.urlparse(ph['src'])
            path_ = pathlib.Path(urllib.parse.unquote(url.path.lstrip('/'))) if url.scheme == 'file' else None
            if not path_ or not path_.exists():
                print(f'  page {pi}: picture not found, left in the background: {ph["src"]}')
                continue
            name = path_.name
            if not (links / name).exists():
                shutil.copy(path_, links / name)
            with Image.open(path_) as im:
                nat = im.size
                dpi = float((im.info.get('dpi') or (72, 72))[0]) or 72.0
            x, y, w, h = ph['rect']
            if ph['kind'] == 'img':
                fit = {'fill': 'fill', 'cover': 'cover', 'contain': 'contain', 'none': 'auto'}.get(ph['fit'], 'fill')
                dx, dy, dw, dh = placement((w, h), nat, fit, ph['opos'])
            else:
                dx, dy, dw, dh = placement((w, h), nat, ph['size'], ph['pos'])
            items.append(graphic_frame(doc, layer, (x, y, w, h), name, nat, dpi, (x + dx, y + dy, dw, dh), name=pathlib.Path(name).stem))
            photo_count += 1
        # colour blocks over photos
        for f in pg['fills']:
            r, g, b, _ = rgba(f['color'])
            x, y, w, h = f['rect']
            x0, y0 = pts(x, y)
            x1, y1 = pts(x + w, y + h)
            items.append(f'<Rectangle Self="{doc.id()}" ContentType="Unassigned" ItemLayer="{layer}" StrokeWeight="0" FillColor="{doc.color((r, g, b))}" '
                         f'StrokeColor="Swatch/None" ItemTransform="1 0 0 1 0 0">{path(x0, y0, x1, y1)}</Rectangle>')
        # text
        for t in pg['texts']:
            runs = collapse(t['runs'])
            if not runs:
                continue
            bx, by, bw, bh = t['box']
            cx, cw = t['content']
            sample = shot.getpixel((min(shot.width - 1, max(0, int((bx + bw / 2) * SCALE))), min(shot.height - 1, max(0, int((by + bh / 2) * SCALE)))))
            out_runs = []
            for r in runs:
                st = r['st']
                cr, cg, cb, ca = rgba(st['color'])
                if ca < 1:   # see-through text: the colour it shows on its background
                    cr, cg, cb = (round(ca * v + (1 - ca) * s) for v, s in zip((cr, cg, cb), sample))
                size_pt = st['size'] * PX
                lh = st['lh']
                leading = float(lh[:-2]) * PX if lh.endswith('px') else size_pt * 1.2
                ls = st['ls']
                tracking = (float(ls[:-2]) / st['size'] * 1000) if ls.endswith('px') else 0
                run = dict(text=r['text'], font=st['family'], style=STYLE_NAMES.get((min(700, max(400, round(st['weight'] / 100) * 100)), st['italic']), 'Regular'),
                           pt=size_pt, leading=leading, tracking=tracking, upper=st['upper'], fill=doc.color((cr, cg, cb)))
                if st['strokeW'] > 0:
                    sr, sg, sb, sa = rgba(st['strokeC'])
                    if sa > 0:
                        run.update(stroke=doc.color((sr, sg, sb)), strokeW=st['strokeW'] * PX)
                out_runs.append(run)
            sid = doc.story(out_runs, t['align'])
            # the frame: a little room to spare so the text does not wrap differently or run out of the frame
            slack = 4
            many = t['lines'] > 1
            if t['align'] == 'center':           # same centre; wraps at the block's width
                w = (max(cw, bw) if many else bw + max(6, bw * 0.04)) + slack
                mid = cx + cw / 2 if many else bx + bw / 2
                x = mid - w / 2
            elif t['align'] in ('right', 'end'):  # same right edge
                w = (max(cw, bw) if many else bw + max(6, bw * 0.04)) + slack
                x = bx + bw - w + slack / 2
            else:                                # same left edge; wraps at the block's width
                x = bx
                w = (max(cx + cw - bx, bw) if many else bw + max(6, bw * 0.04)) + slack
            h = bh + max(6, bh * 0.35)
            items.append(text_frame(doc, layer, sid, (x, by, w, h)))
            text_count += 1
        sid, pid = doc.id(), doc.id()
        xml = (HEAD + f'<idPkg:Spread {NS}>\n<Spread Self="{sid}" PageCount="1" BindingLocation="0" AllowPageShuffle="true" ItemTransform="1 0 0 1 0 0" '
               'ShowMasterItems="true" PageTransitionType="None" PageTransitionDirection="NotApplicable" PageTransitionDuration="Medium" FlattenerOverride="Default">'
               f'<Page Self="{pid}" Name="{pi}" AppliedTrapPreset="TrapPreset/$ID/kDefaultTrapStyleName" OverrideList="" AppliedMaster="n" '
               f'GeometricBounds="0 0 {PAGE_H} {PAGE_W}" ItemTransform="1 0 0 1 {-PAGE_W / 2} {-PAGE_H / 2}" MasterPageTransform="1 0 0 1 0 0">'
               f'<MarginPreference ColumnCount="1" ColumnGutter="12" Top="0" Bottom="0" Left="0" Right="0" ColumnDirection="Horizontal" ColumnsPositions="0 {PAGE_W}"/></Page>\n'
               + '\n'.join(items) + '\n</Spread>\n</idPkg:Spread>\n')
        doc.spreads.append((sid, pid, xml))
    out = out_dir / f'Sailing-Product-Catalogue-2026-{LANGS[lang]}.idml'
    doc.write(out, len(pages))
    print(f'{lang}: {out.name}: {len(pages)} pages, {photo_count} photo frames, {text_count} text frames, {len(doc.colors)} colours')
    return pages


def main():
    args = [a for a in sys.argv[1:] if a not in LANGS]
    if len(args) != 1:
        raise SystemExit(__doc__)
    out_dir = pathlib.Path(args[0])
    langs = [a for a in sys.argv[1:] if a in LANGS] or list(LANGS)
    links = out_dir / 'Links'
    links.mkdir(parents=True, exist_ok=True)
    c = Chrome(str(BUILD / 'chrome-profile-idml'), port=9363, width=816, height=1056)
    try:
        c.call('Page.enable')
        c.call('Emulation.setDeviceMetricsOverride', width=816, height=1056, deviceScaleFactor=1, mobile=False)
        for lang in langs:
            edition(c, lang, out_dir, links)
    finally:
        c.close()


if __name__ == '__main__':
    main()

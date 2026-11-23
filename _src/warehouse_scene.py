"""Generate the warehouse picture for the warehouse tour page (assets/img/warehouse/).

Everything is placed in 3D (X = left/right, Y = height, Z = distance from the viewer) and projected
with a simple perspective camera, so racks, shelves and lights line up like a real interior.
Writes warehouse.svg and scene.json (picture + marker positions used by assets/js/warehouse.js).

    python _src/warehouse_scene.py
"""
import json
import math
import pathlib
import random

OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'img' / 'warehouse'
W, H = 1600, 900
F, VX, VY, CAM = 300.0, 800.0, 400.0, 500.0     # focal scale, vanishing point, camera height
BACK, CEIL, SIDE = 1000.0, 1150.0, 1100.0       # back wall depth, ceiling height, side wall offset
NEAR = 240.0


def P(X, Y, Z, m=1):
    s = F / Z
    return VX + X * s, VY + (CAM - Y * m) * s


def pts(points, m=1):
    return ' '.join(f'{x:.1f},{y:.1f}' for x, y in (P(*q, m=m) for q in points))


def poly(points, fill, m=1, extra=''):
    return f'<polygon points="{pts(points, m)}" fill="{fill}" {extra}/>'


def line(a, b, stroke, w, m=1, extra=''):
    (x1, y1), (x2, y2) = P(*a, m=m), P(*b, m=m)
    s = F / ((a[2] + b[2]) / 2)
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{max(.6, w * s):.1f}" {extra}/>'


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def on_quad(q, u, v):
    """Point on a quad (corners in order) at u along the first edge, v towards the opposite edge."""
    return lerp(lerp(q[0], q[1], u), lerp(q[3], q[2], u), v)


def box(x0, x1, y0, y1, z0, z1, c, m=1):
    """Visible faces of a box for a camera at X=0, Y=CAM. c = (side, front, top)."""
    out = []
    if x0 > 0:
        out.append(poly([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], c[0], m))
    elif x1 < 0:
        out.append(poly([(x1, y0, z0), (x1, y0, z1), (x1, y1, z1), (x1, y1, z0)], c[0], m))
    out.append(poly([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], c[1], m))
    if y1 < CAM:
        out.append(poly([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], c[2], m))
    elif y0 > CAM:
        out.append(poly([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], c[2], m))
    return out


GLASS = {
    'clear': ('#cdeee9', .42, '#8fd3cb'), 'lowiron': ('#eef8fb', .34, '#cfe7ee'), 'bronze': ('#b58d62', .55, '#c9a37a'),
    'grey': ('#7d8691', .55, '#9aa3ad'), 'green': ('#93c3a0', .5, '#a9d3b4'), 'blue': ('#84a9cf', .5, '#a3c1df'),
}


def glass_sheet(q, kind, m=1):
    fill, op, edge = GLASS[kind]
    out = [poly(q, fill, m, f'fill-opacity="{op}" stroke="{edge}" stroke-width=".8"')]
    # light streak across the sheet
    a, b, c, d = on_quad(q, .18, .12), on_quad(q, .30, .12), on_quad(q, .48, .92), on_quad(q, .36, .92)
    out.append(poly([a, b, c, d], '#ffffff', m, 'fill-opacity=".22"'))
    out.append(line(q[0], q[3], '#effffc', 3.2, m, 'opacity=".95"'))      # near edge catches the light
    out.append(line(q[3], q[2], '#e3fbf7', 2.2, m, 'opacity=".8"'))
    return out


# ------------------------------------------------------------------ objects
def glass_rack(z0, z1, sheets, m=1):
    out = []
    steel, steel2 = '#2a303b', '#3a4250'
    out.append(poly([(-985, 0, z0), (-815, 0, z0), (-815, 0, z1), (-985, 0, z1)], '#252b35', m))
    for z in (z1, z0):
        out.append(line((-975, 0, z), (-900, 540, z), steel, 16, m))
        out.append(line((-825, 0, z), (-900, 540, z), steel2, 16, m))
        out.append(line((-955, 160, z), (-845, 160, z), steel, 10, m))
    out.append(line((-900, 540, z0), (-900, 540, z1), steel2, 14, m))
    for k, (kind, h, dz0, dz1) in enumerate(sheets):
        xb = -822 + 15 * k
        xt = xb - 75 * h / 540
        za, zb = z0 + dz0, z1 - dz1
        q = [(xb, 4, za), (xb, 4, zb), (xt, h, zb), (xt, h, za)]
        out += glass_sheet([q[1], q[0], q[3], q[2]][::-1] if False else [(xb, 4, za), (xb, 4, zb), (xt, h, zb), (xt, h, za)][::1] and [(xb, 4, zb), (xb, 4, za), (xt, h, za), (xt, h, zb)], kind, m)
    return out


def mirror_wall(m=1):
    out = []
    out += box(-720, -300, 0, 600, 600, 640, ('#c9ced6', '#eceef2', '#f4f5f7'), m)
    out.append(poly([(-720, 0, 599), (-300, 0, 599), (-300, 70, 599), (-720, 70, 599)], '#d9dde3', m))
    mirrors = [(-690, -606, 120, 520, 'm-silver'), (-588, -504, 150, 520, 'm-bronze'), (-486, -402, 120, 520, 'm-grey'), (-384, -326, 180, 520, 'm-antique')]
    for x0, x1, y0, y1, g in mirrors:
        out.append(poly([(x0 - 6, y0 - 6, 598), (x1 + 6, y0 - 6, 598), (x1 + 6, y1 + 6, 598), (x0 - 6, y1 + 6, 598)], '#3d434d', m))
        out.append(poly([(x0, y0, 597), (x1, y0, 597), (x1, y1, 597), (x0, y1, 597)], f'url(#{g})', m))
        q = [(x0, y0, 597), (x1, y0, 597), (x1, y1, 597), (x0, y1, 597)]
        out.append(poly([on_quad(q, .1, .45), on_quad(q, .35, .45), on_quad(q, .75, .95), on_quad(q, .5, .95)], '#fff', m, 'fill-opacity=".35"'))
    return out


def curved_glass(m=1):
    cx, cz, r, h = -60, 640, 200, 440
    angles = [math.radians(a) for a in range(-75, 76, 5)]
    pts3 = [(cx + r * math.sin(a), cz - r * math.cos(a)) for a in angles]
    segs = []
    for i in range(len(pts3) - 1):
        (xa, za), (xb, zb) = pts3[i], pts3[i + 1]
        a = (angles[i] + angles[i + 1]) / 2
        op = .16 + .42 * abs(math.sin(a))
        light = 1 if -0.5 < a < -0.2 else 0
        fill = '#ffffff' if light else '#bfe6e1'
        segs.append((max(za, zb), poly([(xa, 0, za), (xb, 0, zb), (xb, h, zb), (xa, h, za)], fill, m, f'fill-opacity="{op + .1 * light:.2f}"')))
    out = [s for _, s in sorted(segs, key=lambda t: -t[0])]
    for yy, wdt in ((h, 9), (0, 9)):
        out.append('<polyline points="' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in (P(x, yy, z, m) for x, z in pts3)) +
                   f'" fill="none" stroke="#8a94a2" stroke-width="{wdt * F / cz:.1f}"/>')
    for a in (-45, -15, 15, 45):
        x, z = cx + r * math.sin(math.radians(a)), cz - r * math.cos(math.radians(a))
        out.append(line((x, 0, z), (x, h, z), '#a6b2c0', 3, m))
    return out


def pv_wall(m=1):
    out = []
    z = 790
    out.append(poly([(140, 0, z), (450, 0, z), (450, 640, z), (140, 640, z)], '#dce9f5', m, 'fill-opacity=".55"'))
    for c in range(4):
        for r_ in range(6):
            x0, y0 = 158 + c * 72, 34 + r_ * 98
            out.append(poly([(x0, y0, z - 1), (x0 + 64, y0, z - 1), (x0 + 64, y0 + 88, z - 1), (x0, y0 + 88, z - 1)], 'url(#pv)', m))
    out.append(poly([(140, 0, z), (450, 0, z), (450, 640, z), (140, 640, z)], 'none', m, f'stroke="#8a94a2" stroke-width="{10 * F / z:.1f}"'))
    out.append(poly([(150, 380, z - 2), (230, 380, z - 2), (330, 640, z - 2), (250, 640, z - 2)], '#ffffff', m, 'fill-opacity=".16"'))
    return out


def pv_roof(m=1):
    out = []
    for x in (205, 395):
        out.append(line((x, 0, 572), (x, 175, 572), '#6b7480', 8, m))
        out.append(line((x, 0, 648), (x, 322, 648), '#6b7480', 8, m))
    q = [(185, 175, 565), (415, 175, 565), (415, 330, 655), (185, 330, 655)]
    out.append(poly(q, 'url(#pv)', m, f'stroke="#b8c1cc" stroke-width="{6 * F / 600:.1f}"'))
    for u in (.25, .5, .75):
        out.append(line(on_quad(q, u, 0), on_quad(q, u, 1), '#5b77ad', 2, m))
    for v in (.33, .66):
        out.append(line(on_quad([q[0], q[3], q[2], q[1]], v, 0), on_quad([q[0], q[3], q[2], q[1]], v, 1), '#5b77ad', 2, m))
    out.append(poly([on_quad(q, .05, .1), on_quad(q, .25, .1), on_quad(q, .45, .9), on_quad(q, .25, .9)], '#fff', m, 'fill-opacity=".14"'))
    return out


CARD = ('#c19563', '#d6ab76', '#e4c08f')
WHITE = ('#d6dbe1', '#eef0f3', '#f8f9fa')
BLUE = ('#2c5a99', '#3a69aa', '#5583c0')
DARK = ('#30353d', '#424852', '#565d68')


def racking(m=1):
    out = []
    rnd = random.Random(11)
    face, back = 760, 1060
    edges = [380, 520, 660, 800, 940]
    levels = [0, 320, 640, 960]
    up, beam = '#3f5f93', '#d8772c'
    for i in range(len(edges) - 1, 0, -1):
        za, zb = edges[i - 1], edges[i]
        out.append(line((back, 0, zb), (back, 1080, zb), '#33496f', 14, m))
        for lv in levels:
            y = lv + (26 if lv else 18)
            z = zb - 14
            while z - za > 60:
                d = rnd.choice([70, 90, 110, 130])
                hgt = rnd.choice([110, 150, 190, 230]) if lv < 960 else rnd.choice([80, 110])
                pal = rnd.choices([CARD, WHITE, BLUE, DARK], [6, 3, 2, 1])[0]
                z0 = max(za + 14, z - d)
                x0 = face + rnd.choice([18, 30, 44])
                out += box(x0, back - 20, y, y + hgt, z0, z, pal, m)
                if pal is CARD and m == 1 and hgt > 100:
                    out.append(poly([(x0 + 20, y + hgt * .55, z0 - .5), (x0 + 60, y + hgt * .55, z0 - .5), (x0 + 60, y + hgt * .75, z0 - .5), (x0 + 20, y + hgt * .75, z0 - .5)], '#f4efe6', m))
                z = z0 - rnd.choice([6, 12, 20])
            if lv:
                out += box(face, back, lv, lv + 26, za, zb, ('#b9601f', beam, '#e99a5c'), m)
        out += box(face, face + 26, 0, 1080, za - 13, za + 13, ('#2f4a77', up, '#5a7bb0'), m)
        out += box(back - 20, back, 0, 1080, za - 13, za + 13, ('#2f4a77', up, '#5a7bb0'), m)
    return out


def trolley(m=1):
    out = []
    blue, blue2 = '#2f63c4', '#2550a0'
    out += box(360, 660, 34, 62, 400, 470, ('#24498f', blue, '#4a7fdb'), m)
    for x in (380, 640):
        out += box(x - 10, x + 10, 62, 600, 458, 474, ('#24498f', blue2, blue), m)
    out.append(line((380, 560, 466), (640, 560, 466), blue2, 12, m))
    out += glass_sheet([(392, 66, 452), (628, 66, 452), (628, 560, 462), (392, 560, 462)][::-1][::-1] and [(392, 66, 418), (628, 66, 418), (628, 548, 455), (392, 548, 455)], 'clear', m)
    out += glass_sheet([(400, 66, 428), (636, 66, 428), (636, 540, 461), (400, 540, 461)], 'lowiron', m)
    for x in (378, 642):
        for z in (404, 466):
            cx, cy = P(x, 16, z, m)
            out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{18 * F / z:.1f}" fill="#1b1f27"/>')
    return out


def counter(m=1):
    out = []
    out += box(-300, 180, 0, 104, 334, 392, ('#d5dae1', 'url(#desk)', '#f7f8fa'), m)
    out += box(-312, 192, 104, 116, 326, 396, ('#c6ccd4', '#f2f4f7', '#ffffff'), m)
    out.append(poly([(-300, 34, 333.5), (180, 34, 333.5), (180, 42, 333.5), (-300, 42, 333.5)], '#806a9b', m))
    if m == 1:
        a, b = P(-300, 38, 333), P(180, 38, 333)
        out.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#a594c0" stroke-width="14" opacity=".45" filter="url(#blur6)"/>')
    out += box(-152, -40, 116, 124, 372, 384, DARK, m)
    out += box(-102, -90, 124, 150, 378, 382, DARK, m)
    out.append(poly([(-170, 150, 376), (-22, 150, 376), (-22, 236, 376), (-170, 236, 376)], '#1d222b', m))
    out.append(poly([(-164, 155, 375), (-28, 155, 375), (-28, 231, 375), (-164, 231, 375)], 'url(#screen)', m))
    return out


def shadow(points):
    return f'<polygon points="{pts(points)}" fill="#0b1018" opacity=".3" filter="url(#blur10)"/>'


# ------------------------------------------------------------------ scene
def build():
    s = []
    s.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Illustrated glass warehouse">')
    s.append('''<defs>
  <linearGradient id="ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1118"/><stop offset="1" stop-color="#202734"/></linearGradient>
  <linearGradient id="wallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9da5b1"/><stop offset=".6" stop-color="#c9cfd7"/><stop offset="1" stop-color="#dfe3e8"/></linearGradient>
  <linearGradient id="wallR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#9da5b1"/><stop offset=".6" stop-color="#c9cfd7"/><stop offset="1" stop-color="#dfe3e8"/></linearGradient>
  <linearGradient id="back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6e9ee"/><stop offset="1" stop-color="#d4d9e0"/></linearGradient>
  <linearGradient id="floor" x1="0" y1="550" x2="0" y2="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c5cad1"/><stop offset="1" stop-color="#8e96a1"/></linearGradient>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6ff"/><stop offset="1" stop-color="#f4f9ff"/></linearGradient>
  <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="pool"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="haze" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="vignette" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#05070b" stop-opacity="0"/><stop offset="1" stop-color="#05070b" stop-opacity=".45"/></radialGradient>
  <linearGradient id="m-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#d9dfe6"/><stop offset="1" stop-color="#9fa9b5"/></linearGradient>
  <linearGradient id="m-bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecd2b2"/><stop offset="1" stop-color="#8d6847"/></linearGradient>
  <linearGradient id="m-grey" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d3d8de"/><stop offset="1" stop-color="#535a63"/></linearGradient>
  <radialGradient id="m-antique" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ece2cc"/><stop offset=".55" stop-color="#bfae88"/><stop offset="1" stop-color="#6f5c3e"/></radialGradient>
  <linearGradient id="pv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2e4a80"/><stop offset="1" stop-color="#101a31"/></linearGradient>
  <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset="1" stop-color="#dfe3e9"/></linearGradient>
  <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4f7a"/><stop offset="1" stop-color="#1c2640"/></linearGradient>
  <filter id="blur6" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur10" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="9"/></filter>
''')
    floor_q = [(-SIDE, 0, BACK), (SIDE, 0, BACK), (SIDE, 0, NEAR), (-SIDE, 0, NEAR)]
    s.append(f'  <clipPath id="floorClip"><polygon points="{pts(floor_q)}"/></clipPath>\n</defs>')

    # room
    s.append(poly([(-SIDE, CEIL, BACK), (SIDE, CEIL, BACK), (SIDE, CEIL, NEAR), (-SIDE, CEIL, NEAR)], 'url(#ceil)'))
    s.append(poly([(-SIDE, 0, BACK), (-SIDE, CEIL, BACK), (-SIDE, CEIL, NEAR), (-SIDE, 0, NEAR)], 'url(#wallL)'))
    s.append(poly([(SIDE, 0, BACK), (SIDE, CEIL, BACK), (SIDE, CEIL, NEAR), (SIDE, 0, NEAR)], 'url(#wallR)'))
    s.append(poly([(-SIDE, 0, BACK), (SIDE, 0, BACK), (SIDE, CEIL, BACK), (-SIDE, CEIL, BACK)], 'url(#back)'))
    s.append(poly(floor_q, 'url(#floor)'))
    # wall panel seams
    for z in range(300, 1000, 55):
        for side in (-SIDE, SIDE):
            s.append(line((side, 0, z), (side, 820, z), '#ffffff', 2, 1, 'opacity=".18"'))
    for side in (-SIDE, SIDE):
        s.append(line((side, 820, NEAR), (side, 820, BACK), '#7d8694', 4, 1, 'opacity=".5"'))
    # high windows and light shafts
    for z0 in (330, 500, 670, 840):
        z1 = z0 + 120
        for side in (-SIDE, SIDE):
            s.append(poly([(side, 880, z0), (side, 880, z1), (side, 1060, z1), (side, 1060, z0)], 'url(#sky)', 1, 'stroke="#7d8694" stroke-width="2"'))
        s.append(poly([(-SIDE, 880, z0), (-SIDE, 880, z1), (-200, 0, z1 + 60), (-200, 0, z0 + 60)], 'url(#shaft)', 1, 'opacity=".55"'))
    for i in range(8):
        x0 = -1000 + i * 252
        s.append(poly([(x0, 880, BACK - 1), (x0 + 230, 880, BACK - 1), (x0 + 230, 1060, BACK - 1), (x0, 1060, BACK - 1)], 'url(#sky)', 1, 'stroke="#7d8694" stroke-width="1.5"'))
    # loading door
    s.append(poly([(-300, 0, BACK - 1), (300, 0, BACK - 1), (300, 680, BACK - 1), (-300, 680, BACK - 1)], '#b8bec7'))
    for y in range(30, 660, 34):
        s.append(line((-290, y, BACK - 2), (290, y, BACK - 2), '#a3aab4', 2))
    s.append(poly([(-300, 680, BACK - 1), (300, 680, BACK - 1), (300, 720, BACK - 1), (-300, 720, BACK - 1)], '#8e96a1'))
    # brand accent light
    a, b = P(-SIDE, 1112, BACK - 1), P(SIDE, 1112, BACK - 1)
    s.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#806a9b" stroke-width="16" opacity=".55" filter="url(#glow)"/>')
    s.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#a594c0" stroke-width="3"/>')
    # ceiling beams and LED lines
    for z in (360, 470, 600, 760, 920):
        s.append(poly([(-SIDE, CEIL - 70, z), (SIDE, CEIL - 70, z), (SIDE, CEIL, z), (-SIDE, CEIL, z)], '#262d3a'))
    for x in (-460, 0, 460):
        q = [(x - 16, CEIL - 1, 300), (x + 16, CEIL - 1, 300), (x + 16, CEIL - 1, BACK), (x - 16, CEIL - 1, BACK)]
        s.append(poly([(x - 60, CEIL - 1, 300), (x + 60, CEIL - 1, 300), (x + 60, CEIL - 1, BACK), (x - 60, CEIL - 1, BACK)], '#ffffff', 1, 'opacity=".35" filter="url(#glow)"'))
        s.append(poly(q, '#ffffff'))
    # floor details
    for z in range(300, 1000, 110):
        s.append(line((-SIDE, 0, z), (SIDE, 0, z), '#ffffff', 2, 1, 'opacity=".12"'))
    for x in (-340, 340):
        s.append(poly([(x - 9, 0, 300), (x + 9, 0, 300), (x + 9, 0, BACK), (x - 9, 0, BACK)], '#e2bd3f', 1, 'opacity=".8"'))
    for x in (-460, 0, 460):
        for z in (360, 480, 640, 840):
            cx, cy = P(x, 0, z)
            sc = F / z
            s.append(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{260 * sc:.1f}" ry="{70 * sc:.1f}" fill="url(#pool)"/>')
    cx, cy = P(0, 300, BACK)
    s.append(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="520" ry="200" fill="url(#haze)"/>')

    rack_far = [('clear', 470, 0, 10), ('green', 455, 8, 0), ('blue', 440, 0, 18), ('clear', 430, 14, 4)]
    rack_near = [('lowiron', 500, 0, 10), ('bronze', 480, 12, 0), ('grey', 470, 0, 16), ('clear', 455, 20, 6), ('green', 440, 6, 22)]
    objects = [
        (980, lambda m: glass_rack(760, 960, rack_far, m), [(-990, 0, 760), (-800, 0, 760), (-800, 0, 960), (-990, 0, 960)]),
        (900, racking, [(760, 0, 380), (1060, 0, 380), (1060, 0, 940), (760, 0, 940)]),
        (790, pv_wall, [(140, 0, 780), (450, 0, 780), (450, 0, 800), (140, 0, 800)]),
        (640, mirror_wall, [(-730, 0, 590), (-290, 0, 590), (-290, 0, 650), (-730, 0, 650)]),
        (655, pv_roof, [(180, 0, 560), (420, 0, 560), (420, 0, 660), (180, 0, 660)]),
        (630, curved_glass, [(-280, 0, 440), (160, 0, 440), (160, 0, 600), (-280, 0, 600)]),
        (700, lambda m: glass_rack(330, 690, rack_near, m), [(-990, 0, 330), (-800, 0, 330), (-800, 0, 690), (-990, 0, 690)]),
        (470, trolley, [(350, 0, 395), (670, 0, 395), (670, 0, 480), (350, 0, 480)]),
        (392, counter, [(-320, 0, 325), (200, 0, 325), (200, 0, 400), (-320, 0, 400)]),
    ]
    objects.sort(key=lambda o: -o[0])
    # reflections on the polished floor
    s.append('<g clip-path="url(#floorClip)" opacity=".16" filter="url(#blur2)">')
    for _, fn, _f in objects:
        s += fn(-1)
    s.append('</g>')
    for _, _fn, foot in objects:
        s.append(shadow(foot))
    for _, fn, _f in objects:
        s += fn(1)
    s.append(f'<rect width="{W}" height="{H}" fill="url(#vignette)"/>')
    s.append('</svg>')
    return '\n'.join(s)


HOTSPOTS = {
    'glass': (-860, 330, 520), 'mirrors': (-510, 330, 598), 'curved': (-60, 300, 450), 'solar': (300, 420, 640),
    'accessories': (770, 520, 600), 'racks': (520, 330, 440), 'quote': (-60, 190, 360),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'warehouse.svg').write_text(build(), encoding='utf-8')
    spots = {k: [round(v, 1) for v in P(*xyz)] for k, xyz in HOTSPOTS.items()}
    # scene.json tells the page which picture to show and where the markers go (in picture pixels).
    # To use a photo instead: put it in assets/img/warehouse/, then set "image", "width", "height"
    # and the marker positions for that photo by hand.
    scene_file = OUT / 'scene.json'
    current = json.loads(scene_file.read_text(encoding='utf-8')) if scene_file.exists() else {}
    if current.get('image', 'warehouse.svg').endswith('.svg'):
        scene = {'image': 'warehouse.svg', 'width': W, 'height': H, 'hotspots': spots}
        scene_file.write_text(json.dumps(scene, indent=1), encoding='utf-8')
    else:
        print('scene.json uses a photo; left unchanged')
    print('warehouse.svg', (OUT / 'warehouse.svg').stat().st_size // 1024, 'KB')
    print(spots)


if __name__ == '__main__':
    main()

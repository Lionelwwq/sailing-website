"""Turn new 360° pictures into the files the 360° showroom page uses.

    python _src/make_showroom.py "C:\\Users\\w2412\\Downloads\\Sailing-360-new" [--upscaler path\\to\\realesrgan-ncnn-vulkan.exe]

For every spot in assets/img/showroom/showroom.json it looks in the folder for the spot's source picture
(360-1-entrance.png / .jpg / .webp ... 360-8-handling) and:
  - checks it is a real 360 panorama (exactly 2:1); anything else is skipped and reported,
  - enlarges small pictures 4x with Real-ESRGAN when --upscaler is given (otherwise a plain resize, softer),
  - writes assets/img/showroom/<id>.jpg (desktop, up to 8192 x 4096) and <id>-m.jpg (phones, 4096 x 2048),
  - reports whether the left and right edges join (a bad join shows as a visible cut when you turn round).
Spots whose picture is missing keep their current files.
"""
import argparse
import json
import pathlib
import subprocess
import tempfile

from PIL import Image, ImageChops, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'img' / 'showroom'
MAX_W, PHONE_W = 8192, 4096


def column_gap(im):
    """How different the right edge is from the left edge, compared with two ordinary neighbouring columns."""
    g = im.convert('L')
    w, h = g.size
    top, bottom = int(h * 0.15), int(h * 0.85)   # leave out the plain ceiling and floor

    def col(x):
        return g.crop((x, top, x + 1, bottom))
    edge = ImageStat.Stat(ImageChops.difference(col(w - 1), col(0))).mean[0]
    usual = ImageStat.Stat(ImageChops.difference(col(w // 2 - 1), col(w // 2))).mean[0]
    return edge, usual


def soften_join(im, band=48):
    """Remove a small colour/brightness step where the right edge meets the left edge: the difference is spread
    over a band on each side (nothing is blurred or doubled). Only for pictures whose edges already match."""
    import numpy as np
    a = np.asarray(im, dtype=np.float32).copy()
    d = a[:, -1, :] - a[:, 0, :]
    k = 9                                            # smooth the step a little along the height
    d = np.stack([np.convolve(d[:, c], np.ones(k) / k, mode='same') for c in range(3)], axis=1)
    for i in range(band):
        w = 0.5 * (1 - i / band)
        a[:, i, :] += d * w
        a[:, -1 - i, :] -= d * w
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'))


def enlarge(src_png, upscaler, work):
    out = work / 'up.png'
    exe = pathlib.Path(upscaler)
    subprocess.run([str(exe), '-i', str(src_png), '-o', str(out), '-n', 'realesrgan-x4plus', '-s', '4', '-f', 'png',
                    '-m', str(exe.parent / 'models')], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return Image.open(out).convert('RGB')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder')
    ap.add_argument('--upscaler')
    a = ap.parse_args()
    folder = pathlib.Path(a.folder)
    scene = json.loads((OUT / 'showroom.json').read_text(encoding='utf-8'))
    rows = []
    for s in scene['spots']:
        src = next((folder / f"{s['source']}{ext}" for ext in ('.png', '.jpg', '.jpeg', '.webp') if (folder / f"{s['source']}{ext}").exists()), None)
        if not src:
            rows.append((s['id'], 'missing', f"no {s['source']}.png/.jpg in the folder; current files kept"))
            continue
        im = Image.open(src)
        im.load()
        im = im.convert('RGB')
        w, h = im.size
        if abs(w / h - 2) > 0.03:
            rows.append((s['id'], 'SKIPPED', f'{w} x {h} is not 2:1, so it is not a 360 panorama'))
            continue
        how = 'as is'
        if w < 6000:
            if a.upscaler:
                with tempfile.TemporaryDirectory() as t:
                    t = pathlib.Path(t)
                    im.save(t / 'in.png')
                    im = enlarge(t / 'in.png', a.upscaler, t)
                how = 'enlarged 4x (Real-ESRGAN)'
            else:
                how = 'enlarged by plain resize (softer; pass --upscaler for sharp results)'
        W = min(MAX_W, max(im.width, PHONE_W)) // 2 * 2
        full = im.resize((W, W // 2), Image.LANCZOS) if im.size != (W, W // 2) else im
        edge, usual = column_gap(full)
        if edge <= max(8, 3 * usual):
            join = 'joins'
        elif edge <= 30:
            full = soften_join(full)
            join = f'small step at the join (difference {edge:.0f}), smoothed'
        else:
            join = f'VISIBLE CUT where the edges meet (difference {edge:.0f}): regenerate this one'
        OUT.mkdir(parents=True, exist_ok=True)
        full.save(OUT / f"{s['id']}.jpg", quality=85, optimize=True, progressive=True)
        full.resize((PHONE_W, PHONE_W // 2), Image.LANCZOS).save(OUT / f"{s['id']}-m.jpg", quality=82, optimize=True, progressive=True)
        rows.append((s['id'], 'ok', f'{w} x {h} -> {W} x {W // 2}, {how}; {join}'))
    for r in rows:
        print(f'{r[0]:18s} {r[1]:8s} {r[2]}')


if __name__ == '__main__':
    main()

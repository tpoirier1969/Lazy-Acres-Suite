from __future__ import annotations

import io
import json
import re
import subprocess
import tempfile
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path('.')
APP = ROOT / 'assets/app-shell/app.js'
OUT = ROOT / 'icon-contract-output'
OUT.mkdir(exist_ok=True)
APPLY = False

EXPECTED = [
    'shopping', 'scheduler', 'recipes', 'foraging', 'camping', 'fishing',
    'tv', 'ski', 'genealogy', 'church-music', 'songwriting', 'fly-tyer',
    'boat-estimator', 'timer',
]


def parse_registry():
    source = APP.read_text(encoding='utf-8')
    match = re.search(r"const MODULE_ICON_URLS = \{(?P<body>.*?)\n\};", source, re.S)
    if not match:
        raise SystemExit('MODULE_ICON_URLS registry not found')
    pairs = re.findall(
        r"^\s*(?:'(?P<quoted>[^']+)'|(?P<plain>[A-Za-z0-9_-]+)):\s*'(?P<url>[^']+)'",
        match.group('body'), re.M,
    )
    registry = []
    for quoted, plain, url in pairs:
        slug = quoted or plain
        path = Path(url.split('?', 1)[0].removeprefix('./'))
        registry.append((slug, path))
    if [slug for slug, _ in registry] != EXPECTED:
        raise SystemExit(f'Registry order/content mismatch: {[slug for slug, _ in registry]}')
    return source, registry


def open_icon(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)
    suffix = path.suffix.lower()
    if suffix == '.svg':
        raw = cairosvg.svg2png(bytestring=path.read_bytes())
        image = Image.open(io.BytesIO(raw))
        fmt = 'SVG'
    elif suffix == '.webp':
        with tempfile.TemporaryDirectory() as temp_dir:
            png = Path(temp_dir) / 'decoded.png'
            subprocess.run(['dwebp', str(path), '-o', str(png)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            image = Image.open(png)
            image.load()
        fmt = 'WEBP'
    else:
        image = Image.open(path)
        fmt = image.format or suffix.lstrip('.').upper()
    image.load()
    return image.convert('RGBA'), fmt


def metrics(image: Image.Image):
    alpha = image.getchannel('A')
    amin, amax = alpha.getextrema()
    bbox = alpha.getbbox()
    w, h = image.size
    pixels = list(alpha.getdata())
    transparent = sum(1 for value in pixels if value == 0) / max(1, len(pixels))
    partial = sum(1 for value in pixels if 0 < value < 255) / max(1, len(pixels))
    edge = []
    edge.extend(alpha.crop((0, 0, w, 1)).getdata())
    edge.extend(alpha.crop((0, h - 1, w, h)).getdata())
    edge.extend(alpha.crop((0, 0, 1, h)).getdata())
    edge.extend(alpha.crop((w - 1, 0, w, h)).getdata())
    edge_transparent = sum(1 for value in edge if value == 0) / max(1, len(edge))
    if bbox:
        left, top, right, bottom = bbox
        occupancy_x = (right - left) / w
        occupancy_y = (bottom - top) / h
        center_x = (left + right) / (2 * w)
        center_y = (top + bottom) / (2 * h)
    else:
        occupancy_x = occupancy_y = center_x = center_y = 0
    corners = [image.getpixel((0, 0)), image.getpixel((w - 1, 0)), image.getpixel((0, h - 1)), image.getpixel((w - 1, h - 1))]
    return {
        'size': [w, h],
        'alpha_min': amin,
        'alpha_max': amax,
        'transparent_ratio': round(transparent, 5),
        'partial_alpha_ratio': round(partial, 5),
        'edge_transparent_ratio': round(edge_transparent, 5),
        'alpha_bbox': list(bbox) if bbox else None,
        'occupancy_x': round(occupancy_x, 5),
        'occupancy_y': round(occupancy_y, 5),
        'content_center_x': round(center_x, 5),
        'content_center_y': round(center_y, 5),
        'corners': [list(pixel) for pixel in corners],
    }


def checkerboard(size=(260, 260), step=20):
    board = Image.new('RGB', size, 'white')
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            if (x // step + y // step) % 2:
                draw.rectangle((x, y, min(x + step - 1, size[0] - 1), min(y + step - 1, size[1] - 1)), fill='#d0d0d0')
    return board


def main():
    source, registry = parse_registry()
    records = []
    images = {}
    for slug, path in registry:
        image, fmt = open_icon(path)
        images[slug] = image
        records.append({'slug': slug, 'path': path.as_posix(), 'format': fmt, **metrics(image)})

    reference = next(record for record in records if record['slug'] == 'fly-tyer')
    problems = []
    for record in records:
        if record['format'] != 'PNG':
            problems.append(f"{record['slug']}: format={record['format']}")
        if record['alpha_min'] == 255:
            problems.append(f"{record['slug']}: no transparent pixels")
        if record['edge_transparent_ratio'] < 0.95:
            problems.append(f"{record['slug']}: transparent edge ratio={record['edge_transparent_ratio']}")

    report = {'apply': APPLY, 'reference': reference, 'icons': records, 'problems': problems}
    (OUT / 'icon-contract.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

    lines = [
        '# Launcher icon contract audit', '',
        f"Fly Tyer reference: {reference['format']} {reference['size'][0]}x{reference['size'][1]}, alpha {reference['alpha_min']}..{reference['alpha_max']}, edge transparency {reference['edge_transparent_ratio']:.3f}",
        '',
        '| App | File | Format | Size | Alpha | Transparent | Edge transparent | Occupancy | Center |',
        '|---|---|---|---:|---:|---:|---:|---:|---:|',
    ]
    for record in records:
        lines.append(
            f"| {record['slug']} | `{record['path']}` | {record['format']} | {record['size'][0]}x{record['size'][1]} | "
            f"{record['alpha_min']}..{record['alpha_max']} | {record['transparent_ratio']:.3f} | {record['edge_transparent_ratio']:.3f} | "
            f"{record['occupancy_x']:.3f}x{record['occupancy_y']:.3f} | {record['content_center_x']:.3f},{record['content_center_y']:.3f} |"
        )
    if problems:
        lines += ['', '## Contract failures', *[f'- {item}' for item in problems]]
    (OUT / 'icon-contract.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines))

    columns = 4
    cell_w, cell_h = 310, 330
    rows = (len(registry) + columns - 1) // columns
    sheet = Image.new('RGB', (columns * cell_w, rows * cell_h), '#ece7dc')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (slug, _) in enumerate(registry):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        board = checkerboard()
        image = images[slug].copy()
        image.thumbnail((240, 240), Image.Resampling.LANCZOS)
        px = (260 - image.width) // 2
        py = (260 - image.height) // 2
        board.paste(image, (px, py), image)
        sheet.paste(board, (x + 25, y + 15))
        record = next(item for item in records if item['slug'] == slug)
        draw.text((x + 25, y + 282), slug, fill='black', font=font)
        draw.text((x + 25, y + 299), f"{record['format']} {record['size'][0]}x{record['size'][1]} edge={record['edge_transparent_ratio']:.2f}", fill='black', font=font)
    sheet.save(OUT / 'icon-contact-sheet.png')


if __name__ == '__main__':
    main()

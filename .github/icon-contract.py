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
        registry.append((quoted or plain, Path(url.split('?', 1)[0].removeprefix('./'))))
    if [slug for slug, _ in registry] != EXPECTED:
        raise SystemExit(f'Registry mismatch: {[slug for slug, _ in registry]}')
    return registry


def command_text(args):
    result = subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return result.returncode, result.stdout.strip()


def open_icon(path: Path):
    if not path.exists():
        return None, 'MISSING', {'decode_error': 'file does not exist'}
    mime_rc, mime = command_text(['file', '-b', '--mime-type', str(path)])
    kind_rc, kind = command_text(['file', '-b', str(path)])
    details = {
        'file_mime': mime if mime_rc == 0 else '',
        'file_kind': kind if kind_rc == 0 else '',
        'byte_count': path.stat().st_size,
        'first_32_bytes_hex': path.read_bytes()[:32].hex(),
    }
    suffix = path.suffix.lower()
    try:
        if suffix == '.svg':
            raw = cairosvg.svg2png(bytestring=path.read_bytes())
            image = Image.open(io.BytesIO(raw))
            fmt = 'SVG'
        elif suffix == '.webp':
            fmt = 'WEBP'
            with tempfile.TemporaryDirectory() as temp_dir:
                png = Path(temp_dir) / 'decoded.png'
                rc, output = command_text(['dwebp', str(path), '-o', str(png)])
                details['dwebp'] = output
                if rc != 0:
                    rc, output = command_text(['ffmpeg', '-y', '-v', 'error', '-i', str(path), '-frames:v', '1', str(png)])
                    details['ffmpeg'] = output
                if rc != 0 or not png.exists():
                    details['decode_error'] = 'WebP failed in dwebp and ffmpeg'
                    return None, fmt, details
                image = Image.open(png)
                image.load()
        else:
            image = Image.open(path)
            fmt = image.format or suffix.lstrip('.').upper()
        image.load()
        return image.convert('RGBA'), fmt, details
    except Exception as exc:
        details['decode_error'] = f'{type(exc).__name__}: {exc}'
        return None, suffix.lstrip('.').upper() or 'UNKNOWN', details


def metrics(image: Image.Image):
    alpha = image.getchannel('A')
    amin, amax = alpha.getextrema()
    bbox = alpha.getbbox()
    w, h = image.size
    histogram = alpha.histogram()
    total = max(1, w * h)
    transparent = histogram[0] / total
    partial = sum(histogram[1:255]) / total
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
    registry = parse_registry()
    records = []
    images = {}
    for slug, path in registry:
        image, fmt, details = open_icon(path)
        images[slug] = image
        record = {'slug': slug, 'path': path.as_posix(), 'format': fmt, **details}
        if image is not None:
            record.update(metrics(image))
        records.append(record)

    reference = next(record for record in records if record['slug'] == 'fly-tyer')
    problems = []
    for record in records:
        slug = record['slug']
        if 'decode_error' in record:
            problems.append(f"{slug}: {record['decode_error']} ({record.get('file_kind', '')})")
            continue
        if record['format'] != 'PNG':
            problems.append(f"{slug}: format={record['format']}")
        if record['alpha_min'] == 255:
            problems.append(f"{slug}: no transparent pixels")
        if record['edge_transparent_ratio'] < 0.95:
            problems.append(f"{slug}: transparent edge ratio={record['edge_transparent_ratio']}")

    report = {'apply': APPLY, 'reference': reference, 'icons': records, 'problems': problems}
    (OUT / 'icon-contract.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

    lines = [
        '# Launcher icon contract audit', '',
        f"Fly Tyer reference: {reference.get('format')} {reference.get('size')}, alpha {reference.get('alpha_min')}..{reference.get('alpha_max')}, edge transparency {reference.get('edge_transparent_ratio')}",
        '',
        '| App | File | Format | Size | Alpha | Transparent | Edge transparent | Occupancy | Center | Decode |',
        '|---|---|---|---:|---:|---:|---:|---:|---:|---|',
    ]
    for record in records:
        lines.append(
            f"| {record['slug']} | `{record['path']}` | {record['format']} | {record.get('size', '-')} | "
            f"{record.get('alpha_min', '-')}..{record.get('alpha_max', '-')} | {record.get('transparent_ratio', '-')} | "
            f"{record.get('edge_transparent_ratio', '-')} | {record.get('occupancy_x', '-')}x{record.get('occupancy_y', '-')} | "
            f"{record.get('content_center_x', '-')},{record.get('content_center_y', '-')} | {record.get('decode_error', 'OK')} |"
        )
    if problems:
        lines += ['', '## Contract failures', *[f'- {item}' for item in problems]]
    text = '\n'.join(lines) + '\n'
    (OUT / 'icon-contract.md').write_text(text, encoding='utf-8')
    print(text)

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
        image = images[slug]
        if image is not None:
            preview = image.copy()
            preview.thumbnail((240, 240), Image.Resampling.LANCZOS)
            board.paste(preview, ((260 - preview.width) // 2, (260 - preview.height) // 2), preview)
        else:
            bd = ImageDraw.Draw(board)
            bd.rectangle((20, 100, 240, 160), fill='white', outline='black')
            bd.text((35, 120), 'DECODE FAILURE', fill='black', font=font)
        sheet.paste(board, (x + 25, y + 15))
        record = next(item for item in records if item['slug'] == slug)
        draw.text((x + 25, y + 282), slug, fill='black', font=font)
        draw.text((x + 25, y + 299), f"{record['format']} {record.get('size', '-')} edge={record.get('edge_transparent_ratio', '-')}", fill='black', font=font)
    sheet.save(OUT / 'icon-contact-sheet.png')


if __name__ == '__main__':
    main()

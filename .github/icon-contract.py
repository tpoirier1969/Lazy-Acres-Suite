from __future__ import annotations

import hashlib
import io
import json
import struct
import subprocess
import tempfile
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

OUT = Path('icon-contract-output')
OUT.mkdir(exist_ok=True)
REC = OUT / 'recovered'
REC.mkdir(exist_ok=True)

PATHS = [
    'assets/app-shell/icons/field-lab/songwriting-approved-20260803.webp',
    'assets/app-shell/icons/field-lab/songwriting.svg',
    'assets/app-shell/icons/field-lab/boat-estimator-approved-20260804.webp',
    'assets/app-shell/icons/field-lab/boat-estimator-approved-20260803.webp',
    'assets/app-shell/icons/field-lab/boat-estimator-v2.svg',
]


def run_bytes(args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.returncode, result.stdout, result.stderr


def git_blob(commit, path):
    rc, data, err = run_bytes(['git', 'show', f'{commit}:{path}'])
    if rc != 0:
        return None
    return data


def decode_webp(data: bytes):
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / 'source.webp'
        dst = Path(td) / 'decoded.png'
        src.write_bytes(data)
        rc, out, err = run_bytes(['dwebp', str(src), '-o', str(dst)])
        if rc != 0 or not dst.exists():
            return None, (out + err).decode('utf-8', errors='replace').strip()
        image = Image.open(dst)
        image.load()
        return image.convert('RGBA'), 'OK'


def decode_svg(data: bytes):
    try:
        raw = cairosvg.svg2png(bytestring=data)
        image = Image.open(io.BytesIO(raw))
        image.load()
        return image.convert('RGBA'), 'OK'
    except Exception as exc:
        return None, f'{type(exc).__name__}: {exc}'


def alpha_summary(image: Image.Image):
    alpha = image.getchannel('A')
    amin, amax = alpha.getextrema()
    bbox = alpha.getbbox()
    return {
        'size': list(image.size),
        'alpha_min': amin,
        'alpha_max': amax,
        'alpha_bbox': list(bbox) if bbox else None,
    }


def main():
    records = []
    recovered = []
    seen = set()

    for path in PATHS:
        rc, out, _ = run_bytes(['git', 'log', '--all', '--format=%H', '--', path])
        commits = out.decode().splitlines() if rc == 0 else []
        for commit in commits:
            data = git_blob(commit, path)
            if data is None:
                continue
            digest = hashlib.sha256(data).hexdigest()
            key = (path, digest)
            if key in seen:
                continue
            seen.add(key)
            suffix = Path(path).suffix.lower()
            record = {
                'path': path,
                'commit': commit,
                'sha256': digest,
                'byte_count': len(data),
                'first_32_bytes_hex': data[:32].hex(),
            }
            if suffix == '.webp':
                record['riff_declared_total'] = struct.unpack('<I', data[4:8])[0] + 8 if len(data) >= 12 and data[:4] == b'RIFF' else None
                image, status = decode_webp(data)
                record['decode'] = status
            else:
                image, status = decode_svg(data)
                record['decode'] = status
            if image is not None:
                record.update(alpha_summary(image))
                safe = Path(path).stem.replace('-approved-20260803', '').replace('-approved-20260804', '')
                output_name = f"{safe}-{commit[:8]}.png"
                output_path = REC / output_name
                image.save(output_path)
                record['recovered_png'] = output_path.as_posix()
                recovered.append((output_name, image.copy(), record))
            records.append(record)

    report = {'candidates': records}
    (OUT / 'history-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

    lines = [
        '# Historical approved-icon recovery', '',
        '| Path | Commit | Bytes | RIFF total | Decode | PNG |',
        '|---|---|---:|---:|---|---|',
    ]
    for record in records:
        lines.append(
            f"| `{record['path']}` | `{record['commit'][:10]}` | {record['byte_count']} | "
            f"{record.get('riff_declared_total', '-')} | {record['decode'].replace('|', '/')} | {record.get('recovered_png', '-')} |"
        )
    text = '\n'.join(lines) + '\n'
    (OUT / 'history-report.md').write_text(text, encoding='utf-8')
    print(text)

    if recovered:
        columns = 3
        cell_w, cell_h = 360, 360
        rows = (len(recovered) + columns - 1) // columns
        sheet = Image.new('RGB', (columns * cell_w, rows * cell_h), '#ece7dc')
        draw = ImageDraw.Draw(sheet)
        font = ImageFont.load_default()
        for index, (name, image, record) in enumerate(recovered):
            x = (index % columns) * cell_w
            y = (index // columns) * cell_h
            board = Image.new('RGB', (300, 280), 'white')
            bd = ImageDraw.Draw(board)
            step = 20
            for yy in range(0, 280, step):
                for xx in range(0, 300, step):
                    if (xx // step + yy // step) % 2:
                        bd.rectangle((xx, yy, xx + step - 1, yy + step - 1), fill='#d0d0d0')
            preview = image.copy()
            preview.thumbnail((270, 250), Image.Resampling.LANCZOS)
            board.paste(preview, ((300-preview.width)//2, (280-preview.height)//2), preview)
            sheet.paste(board, (x + 30, y + 15))
            draw.text((x + 30, y + 305), name, fill='black', font=font)
            draw.text((x + 30, y + 322), f"{record['byte_count']} bytes {record.get('size')}", fill='black', font=font)
        sheet.save(OUT / 'history-contact-sheet.png')


if __name__ == '__main__':
    main()

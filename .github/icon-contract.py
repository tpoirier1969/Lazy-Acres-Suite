from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path.cwd()
ICON_DIR = ROOT / 'assets/app-shell/icons/field-lab'
OUT = Path('/tmp/icon-contract-output')
OUT.mkdir(parents=True, exist_ok=True)
RELEASE = '0.1.75'
TARGET_CANVAS = 96
TARGET_ART = 72

OPAQUE_SOURCES = {
    'shopping': 'Shopping.png',
    'scheduler': 'scheduler.png',
    'recipes': 'recipes.png',
    'foraging': 'foraging.png',
    'camping': 'camping.png',
    'fishing': 'fishing.png',
    'tv-tracker': 'tv-tracker.png',
    'ski': 'ski.png',
    'genealogy': 'genealogy.png',
    'church-music': 'church-music.png',
}

ALPHA_SOURCES = {
    'fly-tyer': 'fly-tyer-approved-20260804.png',
    'boat-estimator': 'boat-estimator.png',
    'timer': 'timer-approved-20260729.png',
}

SLUGS = [
    'shopping', 'scheduler', 'recipes', 'foraging', 'camping', 'fishing',
    'tv-tracker', 'ski', 'genealogy', 'church-music', 'songwriting',
    'fly-tyer', 'boat-estimator', 'timer',
]

APP_KEYS = {
    'shopping': 'shopping',
    'scheduler': 'scheduler',
    'recipes': 'recipes',
    'foraging': 'foraging',
    'camping': 'camping',
    'fishing': 'fishing',
    'tv': 'tv-tracker',
    'ski': 'ski',
    'genealogy': 'genealogy',
    'church-music': 'church-music',
    'songwriting': 'songwriting',
    'fly-tyer': 'fly-tyer',
    'boat-estimator': 'boat-estimator',
    'timer': 'timer',
}

OBSOLETE = [
    'Shopping.png',
    'boat-estimator-approved-20260729.png',
    'boat-estimator-approved-20260803.webp',
    'boat-estimator-approved-20260804.webp',
    'boat-estimator-v2.svg',
    'boat-estimator.svg',
    'fly-tyer-approved-20260804.png',
    'songwriting-approved-20260803.webp',
    'timer-approved-20260729.png',
    'timer-v2.svg',
]

GENERIC_CSS = '''/* One launcher icon and card contract for every module. Fly Tyer is the template. */
.module-card__top {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  grid-template-rows: auto auto !important;
  align-items: center !important;
  gap: 10px !important;
  width: 100% !important;
}

.module-card__top .module-icon {
  grid-column: 1 / -1 !important;
  grid-row: 1 !important;
  justify-self: center !important;
  inline-size: clamp(86px, 12vw, 104px) !important;
  block-size: clamp(86px, 12vw, 104px) !important;
  min-inline-size: clamp(86px, 12vw, 104px) !important;
  min-block-size: clamp(86px, 12vw, 104px) !important;
  margin: 0 auto 6px !important;
  overflow: visible !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  filter: none !important;
}

.module-card__top .module-icon img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  filter: none !important;
  transform: none !important;
}

.module-card__top h3 {
  grid-column: 1 !important;
  grid-row: 2 !important;
  min-width: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  line-height: 1.08 !important;
}

.module-open-button {
  grid-column: 2 !important;
  grid-row: 2 !important;
  justify-self: end !important;
  width: auto !important;
  min-width: 0 !important;
  padding: 0.48rem 0.68rem !important;
  white-space: nowrap !important;
}

@media (max-width: 430px) {
  .module-card__top {
    gap: 8px !important;
  }

  .module-card__top .module-icon {
    inline-size: clamp(78px, 23vw, 96px) !important;
    block-size: clamp(78px, 23vw, 96px) !important;
    min-inline-size: clamp(78px, 23vw, 96px) !important;
    min-block-size: clamp(78px, 23vw, 96px) !important;
  }

  .module-open-button {
    padding: 0.42rem 0.58rem !important;
    font-size: 0.78rem !important;
  }
}
'''


def run(args: list[str], *, input_bytes: bytes | None = None) -> bytes:
    proc = subprocess.run(args, input=input_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode:
        raise RuntimeError(f"{' '.join(args)} failed:\n{proc.stderr.decode(errors='replace')}")
    return proc.stdout


def git_bytes(ref: str, path: str) -> bytes:
    return run(['git', 'show', f'{ref}:{path}'])


def alpha_from_opaque(source: Path) -> Image.Image:
    img = cv2.imread(str(source), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f'OpenCV could not read {source}')
    h, w = img.shape[:2]
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    border = max(16, int(min(h, w) * 0.065))
    mask[:border, :] = cv2.GC_BGD
    mask[-border:, :] = cv2.GC_BGD
    mask[:, :border] = cv2.GC_BGD
    mask[:, -border:] = cv2.GC_BGD
    cx1, cx2 = int(w * 0.18), int(w * 0.82)
    cy1, cy2 = int(h * 0.18), int(h * 0.82)
    mask[cy1:cy2, cx1:cx2] = cv2.GC_PR_FGD
    cx1, cx2 = int(w * 0.29), int(w * 0.71)
    cy1, cy2 = int(h * 0.29), int(h * 0.71)
    mask[cy1:cy2, cx1:cx2] = cv2.GC_FGD
    bg = np.zeros((1, 65), np.float64)
    fg = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bg, fg, 7, cv2.GC_INIT_WITH_MASK)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    kernel = np.ones((5, 5), np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, kernel)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.2)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    rgba = np.dstack([rgb, alpha])
    return Image.fromarray(rgba, 'RGBA')


def normalize_icon(image: Image.Image) -> Image.Image:
    image = image.convert('RGBA')
    alpha = np.asarray(image.getchannel('A'))
    ys, xs = np.where(alpha > 10)
    if len(xs) == 0:
        raise RuntimeError('Image has no visible pixels')
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    crop = image.crop(box)
    scale = min(TARGET_ART / crop.width, TARGET_ART / crop.height)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (TARGET_CANVAS, TARGET_CANVAS), (0, 0, 0, 0))
    x = (TARGET_CANVAS - size[0]) // 2
    y = (TARGET_CANVAS - size[1]) // 2
    canvas.alpha_composite(crop, (x, y))
    return canvas


def build_icons() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    temp = Path('/tmp/icon-build')
    temp.mkdir(exist_ok=True)

    for slug, source_name in OPAQUE_SOURCES.items():
        source = ICON_DIR / source_name
        normalized = normalize_icon(alpha_from_opaque(source))
        normalized.save(ICON_DIR / f'{slug}.png', optimize=True)

    for slug, source_name in ALPHA_SOURCES.items():
        source = ICON_DIR / source_name
        normalized = normalize_icon(Image.open(source))
        normalized.save(ICON_DIR / f'{slug}.png', optimize=True)

    svg_path = 'assets/app-shell/icons/field-lab/songwriting.svg'
    svg = git_bytes('e30a664ccd96125546b87c958d2db22c4e0536bf', svg_path)
    svg_tmp = temp / 'songwriting.svg'
    png_tmp = temp / 'songwriting.png'
    svg_tmp.write_bytes(svg)
    run(['rsvg-convert', '-w', '1024', '-h', '1024', '-o', str(png_tmp), str(svg_tmp)])
    normalize_icon(Image.open(png_tmp)).save(ICON_DIR / 'songwriting.png', optimize=True)

    for name in OBSOLETE:
        (ICON_DIR / name).unlink(missing_ok=True)


def patch_app() -> None:
    path = ROOT / 'assets/app-shell/app.js'
    text = path.read_text(encoding='utf-8')
    start = text.index('const MODULE_ICON_URLS = {')
    end = text.index('\n};', start) + 3
    rows = ['const MODULE_ICON_URLS = {']
    for key, slug in APP_KEYS.items():
        rendered_key = key if re.fullmatch(r'[a-z][a-z0-9]*', key) else repr(key)
        rows.append(f"  {rendered_key}: './assets/app-shell/icons/field-lab/{slug}.png?v={RELEASE}',")
    rows.append('};')
    path.write_text(text[:start] + '\n'.join(rows) + text[end:], encoding='utf-8')


def patch_today_helper() -> None:
    path = ROOT / 'assets/app-shell/today-desktop-pass.js'
    text = path.read_text(encoding='utf-8')
    text = re.sub(r"\nconst MODULE_ICON_OVERRIDES = \{.*?\n\};", '', text, count=1, flags=re.S)

    selectors = [
        r'\.module-card__top',
        r'\.module-card__top \.module-icon',
        r'\.module-card__top \.module-icon img',
        r'\.module-card__top h3',
        r'\.module-open-button',
    ]
    for selector in selectors:
        text = re.sub(rf'\n\s{{4}}{selector} \{{.*?\n\s{{4}}\}}', '', text, flags=re.S)

    if 'function ensureModuleIcons()' in text:
        start = text.index('function ensureModuleIcons()')
        end = text.index('function decoupleShoppingTile()', start)
        text = text[:start] + text[end:]
    text = text.replace('  ensureModuleIcons();\n', '')
    path.write_text(text, encoding='utf-8')


def patch_release_files() -> None:
    (ROOT / 'assets/app-shell/approved-icon-scale.css').write_text(GENERIC_CSS, encoding='utf-8')

    for filename in ['index.html', 'shortcut.html']:
        path = ROOT / filename
        text = path.read_text(encoding='utf-8').replace('0.1.74', RELEASE)
        path.write_text(text, encoding='utf-8')

    path = ROOT / 'assets/app-shell/startup-update.js'
    text = path.read_text(encoding='utf-8').replace("CURRENT_ENTRY_VERSION = '0.1.74'", f"CURRENT_ENTRY_VERSION = '{RELEASE}'")
    path.write_text(text, encoding='utf-8')

    path = ROOT / 'site.webmanifest'
    text = path.read_text(encoding='utf-8').replace('0.1.74', RELEASE)
    path.write_text(text, encoding='utf-8')

    version = {
        'version': RELEASE,
        'display_version': f'v{RELEASE}',
        'build': RELEASE,
        'entry': 'shortcut.html',
        'route': '#/dashboard',
        'updated_at': '2026-08-07',
        'notes': [
            'Applied the Fly Tyer two-row launcher card schema to every app.',
            'Standardized all 14 launcher icons to one transparent PNG contract.',
            'Removed the competing Boat Estimator and Timer post-render icon override.',
        ],
    }
    (ROOT / 'version.json').write_text(json.dumps(version, indent=2) + '\n', encoding='utf-8')


def validate() -> list[dict]:
    errors: list[str] = []
    records: list[dict] = []

    for slug in SLUGS:
        path = ICON_DIR / f'{slug}.png'
        if not path.exists():
            errors.append(f'Missing {path}')
            continue
        with Image.open(path) as im:
            fmt = im.format
            rgba = im.convert('RGBA')
            alpha = rgba.getchannel('A')
            extrema = alpha.getextrema()
            bbox = alpha.getbbox()
            rec = {
                'slug': slug,
                'path': path.as_posix(),
                'format': fmt,
                'size': list(rgba.size),
                'alpha_min': extrema[0],
                'alpha_max': extrema[1],
                'alpha_bbox': list(bbox) if bbox else None,
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            records.append(rec)
            if fmt != 'PNG': errors.append(f'{slug}: not PNG ({fmt})')
            if rgba.size != (TARGET_CANVAS, TARGET_CANVAS): errors.append(f'{slug}: size {rgba.size}')
            if extrema[0] != 0: errors.append(f'{slug}: no fully transparent pixels')
            if extrema[1] == 0: errors.append(f'{slug}: no visible pixels')
            if not bbox: errors.append(f'{slug}: empty alpha bbox')
            else:
                cx = (bbox[0] + bbox[2]) / 2
                cy = (bbox[1] + bbox[3]) / 2
                if abs(cx - TARGET_CANVAS / 2) > 2 or abs(cy - TARGET_CANVAS / 2) > 2:
                    errors.append(f'{slug}: not centered, bbox={bbox}')

    app = (ROOT / 'assets/app-shell/app.js').read_text(encoding='utf-8')
    today = (ROOT / 'assets/app-shell/today-desktop-pass.js').read_text(encoding='utf-8')
    css = (ROOT / 'assets/app-shell/approved-icon-scale.css').read_text(encoding='utf-8')
    index = (ROOT / 'index.html').read_text(encoding='utf-8')
    shortcut = (ROOT / 'shortcut.html').read_text(encoding='utf-8')

    for slug in SLUGS:
        expected = f'./assets/app-shell/icons/field-lab/{slug}.png?v={RELEASE}'
        if expected not in app:
            errors.append(f'app.js missing registry path {expected}')
    if app.count("./assets/app-shell/icons/field-lab/") != 14:
        errors.append('app.js does not contain exactly 14 launcher icon paths')
    if '.webp' in app or '.svg?v=' in app:
        errors.append('app.js still references WebP/SVG launcher icons')
    if 'MODULE_ICON_OVERRIDES' in today or 'ensureModuleIcons' in today:
        errors.append('today-desktop-pass.js still contains a competing icon writer')
    if 'grid-template-columns: auto minmax(0, 1fr) auto' in today:
        errors.append('today-desktop-pass.js still contains the old three-column card layout')
    if 'grid-column: 1 / -1' not in css or 'grid-template-rows: auto auto' not in css:
        errors.append('global Fly Tyer two-row card contract missing')
    if '.module-fly-tyer' in css or '.module-boat-estimator' in css or '.module-songwriting' in css:
        errors.append('approved-icon-scale.css still contains per-app special cases')
    if 'data-suite-build="0.1.75"' not in index or 'app.js?v=0.1.75' not in index:
        errors.append('index.html cache/version wiring incomplete')
    if 'data-suite-build="0.1.75"' not in shortcut or 'app.js?v=0.1.75' not in shortcut:
        errors.append('shortcut.html cache/version wiring incomplete')

    for old in OBSOLETE:
        if (ICON_DIR / old).exists():
            errors.append(f'Obsolete icon still exists: {old}')

    if errors:
        raise RuntimeError('ICON CONTRACT FAILED:\n- ' + '\n- '.join(errors))
    return records


def make_contact_sheet(records: list[dict]) -> None:
    cell_w, cell_h = 180, 145
    cols = 4
    rows = (len(SLUGS) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell_w, rows * cell_h), 'white')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for i, slug in enumerate(SLUGS):
        x0 = (i % cols) * cell_w
        y0 = (i // cols) * cell_h
        # checkerboard proves transparency visually
        square = 12
        for y in range(y0 + 4, y0 + 108, square):
            for x in range(x0 + 38, x0 + 142, square):
                parity = ((x - (x0 + 38)) // square + (y - (y0 + 4)) // square) % 2
                c = (226, 226, 226) if parity else (255, 255, 255)
                draw.rectangle([x, y, x + square - 1, y + square - 1], fill=c)
        icon = Image.open(ICON_DIR / f'{slug}.png').convert('RGBA')
        icon = icon.resize((96, 96), Image.Resampling.LANCZOS)
        sheet.paste(icon, (x0 + 42, y0 + 8), icon)
        draw.text((x0 + 6, y0 + 112), slug, fill='black', font=font)
    sheet.save(OUT / 'contact-sheet.png')


def main() -> None:
    build_icons()
    patch_app()
    patch_today_helper()
    patch_release_files()
    records = validate()
    make_contact_sheet(records)
    report = {
        'release': RELEASE,
        'contract': {
            'format': 'PNG',
            'canvas': [TARGET_CANVAS, TARGET_CANVAS],
            'target_visible_art': TARGET_ART,
            'layout': 'Fly Tyer two-row schema globally',
            'renderer': 'app.js only',
        },
        'icons': records,
    }
    (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()

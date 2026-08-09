from __future__ import annotations

import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path.cwd()
ICON_DIR = ROOT / 'assets/app-shell/icons/field-lab'
OUT = ROOT / 'icon-contract-output'
RELEASE = '0.1.76'
SIZE = 192
ART = 166

OPAQUE = {
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
ALPHA = {
    'fly-tyer': 'fly-tyer-approved-20260804.png',
    'boat-estimator': 'boat-estimator.png',
    'timer': 'timer-approved-20260729.png',
}
SLUGS = [
    'shopping','scheduler','recipes','foraging','camping','fishing','tv-tracker','ski',
    'genealogy','church-music','songwriting','fly-tyer','boat-estimator',
    'small-buildings','cg-quilts','timer'
]
APP_KEYS = {
    'shopping':'shopping','scheduler':'scheduler','recipes':'recipes','foraging':'foraging',
    'camping':'camping','fishing':'fishing','tv':'tv-tracker','ski':'ski',
    'genealogy':'genealogy','church-music':'church-music','songwriting':'songwriting',
    'fly-tyer':'fly-tyer','boat-estimator':'boat-estimator','small-buildings':'small-buildings',
    'cg-quilts':'cg-quilts','timer':'timer'
}
OBSOLETE = [
    'Shopping.png','boat-estimator-approved-20260729.png','boat-estimator-approved-20260803.webp',
    'boat-estimator-approved-20260804.webp','boat-estimator-v2.svg','fly-tyer-approved-20260804.png',
    'songwriting-approved-20260803.webp','timer-approved-20260729.png','timer-v2.svg'
]

CSS = '''/* Launcher contract: every module follows the Fly Tyer card schema. */
.module-card__top {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  grid-template-rows: minmax(118px, 1fr) auto !important;
  align-items: center !important;
  gap: 10px !important;
  width: 100% !important;
  min-width: 0 !important;
}
.module-card__top .module-icon {
  grid-column: 1 / -1 !important;
  grid-row: 1 !important;
  justify-self: center !important;
  align-self: center !important;
  width: 132px !important;
  height: 114px !important;
  min-width: 132px !important;
  min-height: 114px !important;
  margin: 0 auto !important;
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
@media (max-width: 760px) {
  .module-card__top { grid-template-rows: minmax(82px, 1fr) auto !important; gap: 8px !important; }
  .module-card__top .module-icon { width: 92px !important; height: 80px !important; min-width: 92px !important; min-height: 80px !important; }
  .module-card__top h3 { font-size: clamp(0.78rem, 3.8vw, 0.98rem) !important; }
  .module-open-button { padding: 0.42rem 0.58rem !important; font-size: 0.78rem !important; }
}
'''


def alpha_from_opaque(path: Path) -> Image.Image:
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise RuntimeError(f'Cannot read {path}')
    h, w = img.shape[:2]
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    border = max(16, int(min(h, w) * .065))
    mask[:border,:] = mask[-border:,:] = mask[:,:border] = mask[:,-border:] = cv2.GC_BGD
    mask[int(h*.18):int(h*.82), int(w*.18):int(w*.82)] = cv2.GC_PR_FGD
    mask[int(h*.29):int(h*.71), int(w*.29):int(w*.71)] = cv2.GC_FGD
    bg = np.zeros((1,65), np.float64); fg = np.zeros((1,65), np.float64)
    cv2.grabCut(img, mask, None, bg, fg, 7, cv2.GC_INIT_WITH_MASK)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    kernel = np.ones((5,5), np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, kernel)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel)
    alpha = cv2.GaussianBlur(alpha, (0,0), 1.2)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')


def normalize(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    bbox = im.getchannel('A').getbbox()
    if not bbox:
        raise RuntimeError('empty alpha image')
    crop = im.crop(bbox)
    scale = min(ART / crop.width, ART / crop.height)
    ns = (max(1, round(crop.width*scale)), max(1, round(crop.height*scale)))
    crop = crop.resize(ns, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (SIZE,SIZE), (0,0,0,0))
    canvas.alpha_composite(crop, ((SIZE-ns[0])//2, (SIZE-ns[1])//2))
    return canvas


def generate_small_buildings() -> Image.Image:
    s=768; im=Image.new('RGBA',(s,s),(0,0,0,0)); d=ImageDraw.Draw(im)
    sh=Image.new('RGBA',(s,s),(0,0,0,0)); sd=ImageDraw.Draw(sh); sd.ellipse((130,560,640,670),fill=(35,45,35,65)); sh=sh.filter(ImageFilter.GaussianBlur(28)); im.alpha_composite(sh)
    d.polygon([(155,270),(390,145),(640,292),(408,405)],fill=(77,103,94,255),outline=(45,67,60,255))
    d.polygon([(155,270),(390,145),(408,405),(180,492)],fill=(110,137,121,255),outline=(45,67,60,255))
    d.polygon([(408,405),(640,292),(640,350),(407,460)],fill=(50,75,68,255),outline=(40,57,52,255))
    wood=(122,82,45,255); dark=(79,54,34,255); light=(173,125,71,255)
    for box in [(190,390,215,620),(380,394,405,630),(600,335,625,570)]:
        d.rounded_rectangle(box,radius=5,fill=wood,outline=dark,width=5); x0,y0,x1,y1=box; d.line((x0+7,y0+5,x0+7,y1-5),fill=light,width=4)
    d.polygon([(178,380),(606,320),(626,342),(198,406)],fill=wood,outline=dark)
    d.polygon([(193,596),(606,548),(624,570),(207,620)],fill=wood,outline=dark)
    for pts in [((205,435),(285,558)),((391,432),(470,545)),((608,385),(536,520))]:
        d.line(pts,fill=dark,width=17); d.line(pts,fill=light,width=6)
    d.polygon([(160,610),(404,570),(635,590),(402,680)],fill=(192,184,160,180))
    d.polygon([(515,555),(655,555),(655,650)],outline=(60,83,72,230),fill=(232,223,189,220))
    return im.resize((SIZE,SIZE), Image.Resampling.LANCZOS)


def generate_quilt() -> Image.Image:
    s=768; im=Image.new('RGBA',(s,s),(0,0,0,0)); d=ImageDraw.Draw(im)
    sh=Image.new('RGBA',(s,s),(0,0,0,0)); sd=ImageDraw.Draw(sh); sd.ellipse((140,585,630,680),fill=(40,30,36,65)); sh=sh.filter(ImageFilter.GaussianBlur(26)); im.alpha_composite(sh)
    d.rounded_rectangle((165,165,610,620),radius=24,fill=(243,236,219,255),outline=(91,72,70,255),width=8)
    colors=[(65,112,133,255),(210,177,122,255),(164,78,69,255),(234,220,190,255),(96,133,111,255),(235,201,145,255),(117,90,118,255),(226,235,224,255)]
    x0=y0=188; cell=94
    for r in range(4):
        for c in range(4):
            x=x0+c*cell; y=y0+r*cell; col=colors[(r*3+c*5)%len(colors)]
            d.rectangle((x,y,x+cell,y+cell),fill=col,outline=(255,255,255,210),width=5)
            alt=tuple(max(0,v-22) for v in col[:3])+(210,) if (r+c)%2==0 else tuple(min(255,v+18) for v in col[:3])+(210,)
            pts=[(x+8,y+8),(x+cell-8,y+8),(x+cell-8,y+cell-8)] if (r+c)%2==0 else [(x+8,y+8),(x+8,y+cell-8),(x+cell-8,y+cell-8)]
            d.polygon(pts,fill=alt)
    d.rectangle((353,353,399,399),fill=(164,78,69,255),outline=(255,245,230,255),width=5)
    d.polygon([(510,540),(610,540),(610,620)],fill=(219,205,185,255),outline=(91,72,70,255))
    return im.resize((SIZE,SIZE), Image.Resampling.LANCZOS)


def build_icons():
    for slug, source in OPAQUE.items():
        normalize(alpha_from_opaque(ICON_DIR/source)).save(ICON_DIR/f'{slug}.png', optimize=True)
    for slug, source in ALPHA.items():
        normalize(Image.open(ICON_DIR/source)).save(ICON_DIR/f'{slug}.png', optimize=True)
    # Recover the approved songwriting SVG from history, then render it.
    import subprocess
    svg = subprocess.check_output(['git','show','e30a664ccd96125546b87c958d2db22c4e0536bf:assets/app-shell/icons/field-lab/songwriting.svg'])
    tmp=Path('/tmp/songwriting.svg'); tmp.write_bytes(svg)
    subprocess.run(['rsvg-convert','-w','1024','-h','1024','-o','/tmp/songwriting.png',str(tmp)],check=True)
    normalize(Image.open('/tmp/songwriting.png')).save(ICON_DIR/'songwriting.png', optimize=True)
    generate_small_buildings().save(ICON_DIR/'small-buildings.png', optimize=True)
    generate_quilt().save(ICON_DIR/'cg-quilts.png', optimize=True)
    for name in OBSOLETE:
        (ICON_DIR/name).unlink(missing_ok=True)


def patch_code():
    app=ROOT/'assets/app-shell/app.js'; t=app.read_text()
    t=t.replace("import { getModuleBySlug, moduleRegistry } from './modules.js?v=0.1.72';", f"import {{ getModuleBySlug, moduleRegistry }} from './modules.js?v={RELEASE}';")
    start=t.index('const MODULE_ICON_URLS = {'); end=t.index('\n};',start)+3
    lines=['const MODULE_ICON_URLS = {']
    for key,slug in APP_KEYS.items():
        k=key if re.fullmatch(r'[a-z][a-z0-9]*',key) else repr(key)
        lines.append(f"  {k}: './assets/app-shell/icons/field-lab/{slug}.png?v={RELEASE}',")
    lines.append('};')
    app.write_text(t[:start]+'\n'.join(lines)+t[end:])

    today=ROOT/'assets/app-shell/today-desktop-pass.js'; t=today.read_text()
    t=re.sub(r"\nconst MODULE_ICON_OVERRIDES = \{.*?\n\};",'',t,count=1,flags=re.S)
    for sel,indent in [(r'\.module-card__top',4),(r'\.module-card__top \.module-icon',4),(r'\.module-card__top \.module-icon img',4),(r'\.module-card__top h3',4),(r'\.module-open-button',4),(r'\.module-card__top',6),(r'\.module-card__top \.module-icon',6),(r'\.module-open-button',6)]:
        t=re.sub(rf'\n\s{{{indent}}}{sel} \{{.*?\n\s{{{indent}}}\}}','',t,count=1,flags=re.S)
    if 'function ensureModuleIcons()' in t:
        s=t.index('function ensureModuleIcons()'); e=t.index('function decoupleShoppingTile()',s); t=t[:s]+t[e:]
    t=t.replace('  ensureModuleIcons();\n','')
    today.write_text(t)
    (ROOT/'assets/app-shell/approved-icon-scale.css').write_text(CSS)

    for rel in ['index.html','shortcut.html','site.webmanifest','assets/app-shell/startup-update.js']:
        p=ROOT/rel; p.write_text(p.read_text().replace('0.1.74',RELEASE).replace('0.1.75',RELEASE))
    (ROOT/'version.json').write_text(json.dumps({
        'version':RELEASE,'display_version':f'v{RELEASE}','build':RELEASE,
        'entry':'shortcut.html','route':'#/dashboard','updated_at':'2026-08-09',
        'notes':['All 16 module cards use the Fly Tyer layout.','All 16 launcher icons use transparent PNG assets.','Removed the competing Today icon rewrite.']
    },indent=2)+'\n')


def validate():
    errors=[]; records=[]
    for slug in SLUGS:
        p=ICON_DIR/f'{slug}.png'
        if not p.exists(): errors.append(f'missing {slug}'); continue
        im=Image.open(p).convert('RGBA'); a=im.getchannel('A'); ext=a.getextrema(); bbox=a.getbbox()
        if im.size != (SIZE,SIZE): errors.append(f'{slug} size={im.size}')
        if ext[0] != 0 or ext[1] == 0: errors.append(f'{slug} alpha={ext}')
        records.append({'slug':slug,'size':im.size,'alpha':ext,'bbox':bbox})
    app=(ROOT/'assets/app-shell/app.js').read_text(); today=(ROOT/'assets/app-shell/today-desktop-pass.js').read_text(); css=(ROOT/'assets/app-shell/approved-icon-scale.css').read_text(); modules=(ROOT/'assets/app-shell/modules.js').read_text()
    for key,slug in APP_KEYS.items():
        if f'field-lab/{slug}.png?v={RELEASE}' not in app: errors.append(f'app path {slug}')
    for slug in ['small-buildings','cg-quilts']:
        if f"slug: '{slug}'" not in modules: errors.append(f'module missing {slug}')
    if 'MODULE_ICON_OVERRIDES' in today or 'ensureModuleIcons' in today: errors.append('competing icon writer remains')
    if 'grid-template-columns: auto minmax(0, 1fr) auto' in today: errors.append('old three-column layout remains')
    if 'grid-column: 1 / -1' not in css or 'background: transparent !important' not in css: errors.append('Fly Tyer global CSS incomplete')
    if errors: raise RuntimeError('\n'.join(errors))
    OUT.mkdir(exist_ok=True); (OUT/'report.json').write_text(json.dumps(records,indent=2)); (OUT/'APPLY_READY').write_text('ok\n')


if __name__ == '__main__':
    build_icons(); patch_code(); validate()

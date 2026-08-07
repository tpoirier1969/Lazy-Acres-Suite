from __future__ import annotations

import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

OUT = Path('icon-contract-output')
OUT.mkdir(exist_ok=True)
REC = OUT / 'chromium-recovery'
REC.mkdir(exist_ok=True)

CANDIDATES = [
    ('songwriting-current', 'HEAD', 'assets/app-shell/icons/field-lab/songwriting-approved-20260803.webp'),
    ('boat-current', 'HEAD', 'assets/app-shell/icons/field-lab/boat-estimator-approved-20260804.webp'),
    ('boat-20260803', 'd0d16faf59a525614c806a905b6490ccc205526b', 'assets/app-shell/icons/field-lab/boat-estimator-approved-20260803.webp'),
]


def run(args, *, cwd=None):
    return subprocess.run(args, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def get_bytes(ref, path):
    if ref == 'HEAD':
        return Path(path).read_bytes()
    result = run(['git', 'show', f'{ref}:{path}'])
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
    return result.stdout


def alpha_stats(path: Path):
    image = Image.open(path).convert('RGBA')
    alpha = image.getchannel('A')
    bbox = alpha.getbbox()
    return {
        'size': list(image.size),
        'alpha_min': alpha.getextrema()[0],
        'alpha_max': alpha.getextrema()[1],
        'alpha_bbox': list(bbox) if bbox else None,
    }


def main():
    records = []
    chrome = 'google-chrome'
    for name, ref, path in CANDIDATES:
        data = get_bytes(ref, path)
        record = {
            'name': name,
            'ref': ref,
            'path': path,
            'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest(),
        }
        with tempfile.TemporaryDirectory() as td_raw:
            td = Path(td_raw)
            webp = td / 'source.webp'
            html = td / 'render.html'
            screenshot = REC / f'{name}.png'
            webp.write_bytes(data)
            html.write_text(f'''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:1024px;height:1024px;background:transparent;overflow:hidden}}
#img{{display:block;max-width:900px;max-height:900px;width:auto;height:auto;margin:62px auto 0}}
</style></head><body data-status="pending"><img id="img" src="{webp.as_uri()}"><script>
const img=document.getElementById('img');
img.onload=()=>document.body.dataset.status=`ok-${{img.naturalWidth}}x${{img.naturalHeight}}`;
img.onerror=()=>document.body.dataset.status='error';
setTimeout(()=>{{if(document.body.dataset.status==='pending')document.body.dataset.status='timeout'}},1500);
</script></body></html>''', encoding='utf-8')
            args = [chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--default-background-color=00000000', '--virtual-time-budget=2500']
            dom = run(args + ['--dump-dom', html.as_uri()])
            dom_text = dom.stdout.decode('utf-8', errors='replace')
            match = re.search(r'data-status="([^"]+)"', dom_text)
            record['chromium_status'] = match.group(1) if match else 'unknown'
            record['chromium_stderr'] = dom.stderr.decode('utf-8', errors='replace')[-2000:]
            if record['chromium_status'].startswith('ok-'):
                shot = run(args + ['--window-size=1024,1024', f'--screenshot={screenshot.resolve()}', html.as_uri()])
                record['screenshot_rc'] = shot.returncode
                if screenshot.exists():
                    record['screenshot'] = screenshot.as_posix()
                    record.update(alpha_stats(screenshot))
        records.append(record)

    (OUT / 'chromium-recovery.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
    lines = ['# Chromium WebP recovery test', '', '| Candidate | Bytes | Chromium | Screenshot | Alpha |', '|---|---:|---|---|---|']
    for r in records:
        lines.append(f"| {r['name']} | {r['bytes']} | {r['chromium_status']} | {r.get('screenshot','-')} | {r.get('alpha_min','-')}..{r.get('alpha_max','-')} |")
    text='\n'.join(lines)+'\n'
    (OUT/'chromium-recovery.md').write_text(text, encoding='utf-8')
    print(text)


if __name__ == '__main__':
    main()

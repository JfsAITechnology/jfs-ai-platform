from pathlib import Path
import re
import subprocess
import tempfile
import sys

ROOT = Path(__file__).resolve().parents[1]
FILES = [ROOT / 'core-services.js', ROOT / 'tenant-data.js']

for path in FILES:
    if not path.exists():
        raise SystemExit(f'Missing required file: {path}')
    subprocess.run(['node', '--check', str(path)], check=True)

for html in [ROOT / 'index.html', ROOT / 'admin' / 'index.html']:
    if not html.exists():
        continue
    text = html.read_text(encoding='utf-8')
    scripts = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>', text, flags=re.I | re.S)
    for i, script in enumerate(scripts, 1):
        script = script.strip()
        if not script:
            continue
        with tempfile.NamedTemporaryFile('w', suffix='.js', encoding='utf-8', delete=False) as f:
            f.write(script)
            temp = f.name
        try:
            subprocess.run(['node', '--check', temp], check=True)
        finally:
            Path(temp).unlink(missing_ok=True)

print('JFS AI JS syntax validation: PASS')

"""Generate data/weapons.json from index.html's W array (canonical).

Drops the `// ── CLASS ──` section dividers per Option 1 — the `cls` field on
each weapon already carries that grouping.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.claude'))
from diff_weapons import load_weapons  # noqa: E402

weapons = load_weapons('index.html')
print(f'Loaded {len(weapons)} weapons from index.html')

out = ROOT / 'data' / 'weapons.json'
out.write_text(
    json.dumps(weapons, indent=2, ensure_ascii=False) + '\n',
    encoding='utf-8',
)
size_kb = out.stat().st_size / 1024
print(f'Wrote {out.relative_to(ROOT)} ({size_kb:.1f} KB)')

"""Replace inline weapon arrays in the 3 HTMLs with fetch() calls."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.claude'))
from diff_weapons import extract_array_text  # noqa: E402

REPLACEMENTS = [
    # (filename, var_name, replacement_text)
    ('index.html', 'W',
     "const W = await fetch('./data/weapons.json').then(r => r.json());"),
    ('preview_bloom.html', 'EMBEDDED_WEAPONS',
     "const EMBEDDED_WEAPONS = await fetch('./data/weapons.json').then(r => r.json());"),
    ('preview_distance.html', 'EMBEDDED_WEAPONS',
     "const EMBEDDED_WEAPONS = await fetch('./data/weapons.json').then(r => r.json());"),
]

for fname, var, replacement in REPLACEMENTS:
    p = ROOT / fname
    html = p.read_text(encoding='utf-8')

    # Find the full `const VAR = [...]` declaration including trailing semicolon if present.
    m = re.search(rf'const {var}\s*=\s*\[', html)
    if not m:
        print(f'{fname}: marker not found, skipping')
        continue
    start = m.start()
    array_text = extract_array_text(html, var)
    array_end = m.end() - 1 + len(array_text)  # absolute index of the closing ]
    # Eat optional trailing `;` and surrounding whitespace up to the next newline
    end = array_end + 1
    if end < len(html) and html[end] == ';':
        end += 1
    # Don't gobble the newline — leave one for clean replacement

    before = html[:start]
    after = html[end:]
    new_html = before + replacement + after
    p.write_text(new_html, encoding='utf-8')
    removed = html[start:end].count('\n') + 1
    print(f'{fname}: replaced {len(array_text):,} chars / ~{removed} lines')

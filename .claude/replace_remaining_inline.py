"""
Remove the 22 remaining inline data constants from index.html and preview_distance.html,
replacing them with Promise.all fetch() calls that load the new JSON files.

The <script type="text/plain" id="attachmentModelSource"> block in
preview_distance.html is deliberately left untouched.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Constants removed from each file
INDEX_VARS = [
    'RECOIL_MULT', 'HIP_SPREAD_TIERS', 'HIP_SPREAD_BASE_IDX', 'HIP_CLS',
    'SIGHTS', 'MUZZLES', 'BARRELS', 'GRIPS', 'AMMOS', 'BASE_HS_MULT', 'HP_HS_HIGH',
    'WEAPON_AMMO', 'LASERS', 'WEAPON_ATTS',
    'MOVING_ACC_TIERS', 'DEFAULT_MOV_TIER', 'ADS_SPD_TIERS', 'SPRINT_REC_TIERS',
    'ADS_MOVE_TIERS', 'WEAPON_MAG', 'ERGOS', 'WEAPON_ERGO',
]
# preview_distance.html doesn't have SIGHTS
DIST_VARS = [v for v in INDEX_VARS if v != 'SIGHTS']

INDEX_FETCH = """\
const [_balance, _atts, _ammo] = await Promise.all([
  fetch('./data/balance_tables.json').then(r => r.json()),
  fetch('./data/attachments.json').then(r => r.json()),
  fetch('./data/ammo.json').then(r => r.json()),
]);
const { RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
        BASE_HS_MULT, HP_HS_HIGH: _HP_HS_HIGH, MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
        ADS_SPD_TIERS, SPRINT_REC_TIERS, ADS_MOVE_TIERS } = _balance;
const HP_HS_HIGH = new Set(_HP_HS_HIGH);
const { SIGHTS, MUZZLES, BARRELS, GRIPS, LASERS, ERGOS,
        WEAPON_ATTS, WEAPON_ERGO, WEAPON_MAG } = _atts;
const { AMMOS, WEAPON_AMMO } = _ammo;"""

DIST_FETCH = """\
const [_balance, _atts, _ammo] = await Promise.all([
  fetch('./data/balance_tables.json').then(r => r.json()),
  fetch('./data/attachments.json').then(r => r.json()),
  fetch('./data/ammo.json').then(r => r.json()),
]);
const { RECOIL_MULT, HIP_SPREAD_TIERS, HIP_SPREAD_BASE_IDX, HIP_CLS,
        BASE_HS_MULT, HP_HS_HIGH: _HP_HS_HIGH, MOVING_ACC_TIERS, DEFAULT_MOV_TIER,
        ADS_SPD_TIERS, SPRINT_REC_TIERS, ADS_MOVE_TIERS } = _balance;
const HP_HS_HIGH = new Set(_HP_HS_HIGH);
const { MUZZLES, BARRELS, GRIPS, LASERS, ERGOS,
        WEAPON_ATTS, WEAPON_ERGO, WEAPON_MAG } = _atts;
const { AMMOS, WEAPON_AMMO } = _ammo;"""


# ── helpers ────────────────────────────────────────────────────────────────────

def find_const_span(src, var_name, search_start=0, search_end=None):
    """Return (start, end) char indices of `const VAR = <value>;` in src.
    end points to just after the terminating semicolon (or end of value).
    Only matches within search_start..search_end (to avoid the text/plain block).
    """
    if search_end is None:
        search_end = len(src)
    region = src[search_start:search_end]
    pat = re.compile(rf'(?m)^const\s+{re.escape(var_name)}\s*=\s*')
    m = pat.search(region)
    if not m:
        return None
    abs_start = search_start + m.start()
    val_start = search_start + m.end()

    # Skip whitespace
    while val_start < search_end and src[val_start] in (' ', '\t'):
        val_start += 1

    c = src[val_start]

    if c in ('{', '['):
        # Balanced bracket
        depth = 0
        in_str = False
        sc = ''
        i = val_start
        while i < search_end:
            ch = src[i]
            if in_str:
                if ch == '\\' and i+1 < search_end: i += 2; continue
                if ch == sc: in_str = False
                i += 1; continue
            if ch in ('"', "'"): in_str = True; sc = ch; i += 1; continue
            if ch == c: depth += 1
            elif ch == (']' if c == '[' else '}'):
                depth -= 1
                if depth == 0:
                    end = i + 1
                    # Eat trailing `;` and newline
                    while end < search_end and src[end] in (' ', '\t'): end += 1
                    if end < search_end and src[end] == ';': end += 1
                    if end < search_end and src[end] == '\n': end += 1
                    return abs_start, end
            i += 1

    elif src[val_start:val_start+3] == 'new':
        # new Set([...])
        i = val_start
        while i < search_end and src[i] != ';': i += 1
        end = i + 1
        if end < search_end and src[end] == '\n': end += 1
        return abs_start, end

    else:
        # scalar — read to end of line
        i = val_start
        while i < search_end and src[i] not in (';\n'): i += 1
        end = i + 1  # include ; or \n
        if src[i] == ';' and i+1 < search_end and src[i+1] == '\n':
            end = i + 2
        return abs_start, end

    return None


def remove_consts(src, var_names, search_start=0, search_end=None):
    """Remove all listed `const VAR = ...` declarations from src."""
    spans = []
    for var in var_names:
        span = find_const_span(src, var, search_start, search_end)
        if span:
            spans.append(span)
        else:
            print(f'  WARNING: {var} not found in search window')
    # Remove from back to front to preserve offsets
    spans.sort(key=lambda s: s[0], reverse=True)
    for start, end in spans:
        src = src[:start] + src[end:]
    return src


def inject_after(src, anchor_line_fragment, fetch_block):
    """Insert fetch_block on a new line immediately after the line containing anchor."""
    idx = src.find(anchor_line_fragment)
    if idx == -1:
        raise ValueError(f'Anchor not found: {anchor_line_fragment!r}')
    end_of_line = src.find('\n', idx)
    if end_of_line == -1:
        end_of_line = len(src)
    return src[:end_of_line+1] + fetch_block + '\n' + src[end_of_line+1:]


# ── process index.html ─────────────────────────────────────────────────────────

print('=== index.html ===')
src = (ROOT / 'index.html').read_text(encoding='utf-8')

# Find the bounds of the main <script type="module"> block to stay in
script_start = src.find('<script type="module">')
script_end   = src.rfind('</script>')

src = remove_consts(src, INDEX_VARS, script_start, script_end)
# Inject fetch block after the existing RECOIL_DEC fetch line
src = inject_after(src, "await fetch('./data/recoil_decay.json')", INDEX_FETCH)

(ROOT / 'index.html').write_text(src, encoding='utf-8')
print(f'  Done. Lines: {src.count(chr(10))}')


# ── process preview_distance.html ─────────────────────────────────────────────

print('=== preview_distance.html ===')
src = (ROOT / 'preview_distance.html').read_text(encoding='utf-8')

# The text/plain block ends at </script>; the module script starts after it.
# Find the *second* </script> (first closes the text/plain block).
plain_close = src.find('</script>')   # closes text/plain block
module_start = src.find('<script type="module">', plain_close)
module_end   = src.rfind('</script>')

src = remove_consts(src, DIST_VARS, module_start, module_end)
src = inject_after(src, "await fetch('./data/weapons.json')", DIST_FETCH)

(ROOT / 'preview_distance.html').write_text(src, encoding='utf-8')
print(f'  Done. Lines: {src.count(chr(10))}')

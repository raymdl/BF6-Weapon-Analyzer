"""
Extract all remaining inline data constants from index.html into three JSON files:
  data/balance_tables.json  — numeric tier/lookup tables
  data/attachments.json     — attachment definitions + per-weapon availability
  data/ammo.json            — ammo types + per-weapon ammo options

Also verifies identity against preview_distance.html where applicable.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ── parser helpers ─────────────────────────────────────────────────────────────

def strip_comments(src):
    out = []
    i = 0
    in_str = False
    sc = ''
    while i < len(src):
        c = src[i]
        if in_str:
            if c == '\\' and i + 1 < len(src):
                out.append(src[i:i+2]); i += 2; continue
            if c == sc:
                in_str = False
            out.append(c); i += 1; continue
        if c in ('"', "'"):
            in_str = True; sc = c; out.append(c); i += 1; continue
        if c == '/' and i+1 < len(src) and src[i+1] == '/':
            while i < len(src) and src[i] != '\n': i += 1
            continue
        out.append(c); i += 1
    return ''.join(out)


def balance(src, start_idx):
    """Return (open_char, text) of the balanced bracket/brace structure starting at start_idx."""
    open_ch = src[start_idx]
    close_ch = ']' if open_ch == '[' else '}'
    depth = 0
    in_str = False
    sc = ''
    i = start_idx
    while i < len(src):
        c = src[i]
        if in_str:
            if c == '\\' and i+1 < len(src): i += 2; continue
            if c == sc: in_str = False
            i += 1; continue
        if c in ('"', "'"): in_str = True; sc = c; i += 1; continue
        if c == open_ch: depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return src[start_idx:i+1]
        i += 1
    raise ValueError(f'unbalanced {open_ch} starting at {start_idx}')


def js_to_json(src):
    src = strip_comments(src)
    out = []
    i = 0
    in_str = False
    sc = ''
    while i < len(src):
        c = src[i]
        if in_str:
            if c == '\\' and i+1 < len(src):
                out.append(c); out.append(src[i+1]); i += 2; continue
            if c == sc:
                out.append('"'); in_str = False; i += 1; continue
            if sc == "'" and c == '"':
                out.append('\\"'); i += 1; continue
            out.append(c); i += 1; continue
        if c == "'":
            out.append('"'); in_str = True; sc = "'"; i += 1; continue
        if c == '"':
            out.append('"'); in_str = True; sc = '"'; i += 1; continue
        m = re.match(r'([A-Za-z_$][A-Za-z0-9_$]*)\s*:', src[i:])
        if m and (not out or out[-1] not in ('"', "'")):
            out.append('"' + m.group(1) + '":'); i += m.end(); continue
        out.append(c); i += 1
    text = ''.join(out)
    text = re.sub(r',(\s*[\]}])', r'\1', text)
    return text


def extract_value(html_src, var_name):
    """Extract the value of `const VAR_NAME = <value>;` from cleaned JS source."""
    src = strip_comments(html_src)
    pat = re.compile(rf'\bconst\s+{re.escape(var_name)}\s*=\s*')
    m = pat.search(src)
    if not m:
        raise KeyError(f'{var_name} not found')
    after = src[m.end():]
    after = after.lstrip()

    # new Set([...]) — extract inner array
    sm = re.match(r'new\s+Set\s*\(\s*(\[)', after)
    if sm:
        arr_text = balance(after, sm.start(1))
        return json.loads(js_to_json(arr_text))

    # object or array literal
    if after[0] in ('{', '['):
        raw = balance(after, 0)
        return json.loads(js_to_json(raw))

    # scalar (number, true/false, string)
    scalar = re.match(r'([0-9.\-]+|true|false|"[^"]*"|\'[^\']*\')\s*;?', after)
    if scalar:
        return json.loads(scalar.group(1).replace("'", '"'))

    raise ValueError(f'Cannot parse value for {var_name}: {after[:80]!r}')


# ── load sources ───────────────────────────────────────────────────────────────

index_src   = (ROOT / 'index.html').read_text(encoding='utf-8')
dist_src    = (ROOT / 'preview_distance.html').read_text(encoding='utf-8')

def get(var, src=index_src, fallback_src=None):
    try:
        return extract_value(src, var)
    except KeyError:
        if fallback_src is not None:
            return extract_value(fallback_src, var)
        raise


# ── balance_tables.json ────────────────────────────────────────────────────────

balance_tables = {
    'RECOIL_MULT':        get('RECOIL_MULT'),
    'HIP_SPREAD_TIERS':   get('HIP_SPREAD_TIERS'),
    'HIP_SPREAD_BASE_IDX':get('HIP_SPREAD_BASE_IDX'),
    'HIP_CLS':            get('HIP_CLS'),
    'BASE_HS_MULT':       get('BASE_HS_MULT'),
    'HP_HS_HIGH':         get('HP_HS_HIGH'),   # stored as array; reconstruct Set on load
    'MOVING_ACC_TIERS':   get('MOVING_ACC_TIERS'),
    'DEFAULT_MOV_TIER':   get('DEFAULT_MOV_TIER'),
    'ADS_SPD_TIERS':      get('ADS_SPD_TIERS'),
    'SPRINT_REC_TIERS':   get('SPRINT_REC_TIERS'),
    'ADS_MOVE_TIERS':     get('ADS_MOVE_TIERS'),
}

# ── attachments.json ───────────────────────────────────────────────────────────

attachments = {
    'SIGHTS':      get('SIGHTS'),
    'MUZZLES':     get('MUZZLES'),
    'BARRELS':     get('BARRELS'),
    'GRIPS':       get('GRIPS'),
    'LASERS':      get('LASERS'),
    'ERGOS':       get('ERGOS'),
    'WEAPON_ATTS': get('WEAPON_ATTS'),
    'WEAPON_ERGO': get('WEAPON_ERGO'),
    'WEAPON_MAG':  get('WEAPON_MAG'),
}

# ── ammo.json ──────────────────────────────────────────────────────────────────

ammo = {
    'AMMOS':       get('AMMOS'),
    'WEAPON_AMMO': get('WEAPON_AMMO'),
}

# ── verify identity with preview_distance.html where applicable ────────────────

print('Verifying identity with preview_distance.html...')
shared = ['RECOIL_MULT','HIP_SPREAD_TIERS','HIP_SPREAD_BASE_IDX','HIP_CLS',
          'MUZZLES','BARRELS','GRIPS','LASERS','AMMOS','BASE_HS_MULT','HP_HS_HIGH',
          'WEAPON_AMMO','WEAPON_ATTS','MOVING_ACC_TIERS','ADS_SPD_TIERS',
          'SPRINT_REC_TIERS','ADS_MOVE_TIERS','WEAPON_MAG','ERGOS','WEAPON_ERGO']

all_extracted = {**balance_tables, **attachments, **ammo}
diffs = []
for name in shared:
    try:
        dist_val = extract_value(dist_src, name)
        if dist_val != all_extracted[name]:
            diffs.append(name)
    except KeyError:
        print(f'  {name}: only in index.html (expected)')

if diffs:
    print(f'  DRIFT in: {diffs}  ← resolve before extracting')
else:
    print('  All shared constants identical OK')

# ── write JSON files ───────────────────────────────────────────────────────────

out_dir = ROOT / 'data'
for fname, data in [
    ('balance_tables.json', balance_tables),
    ('attachments.json', attachments),
    ('ammo.json', ammo),
]:
    path = out_dir / fname
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    kb = path.stat().st_size / 1024
    keys = list(data.keys())
    print(f'Wrote {fname} ({kb:.1f} KB) — {keys}')

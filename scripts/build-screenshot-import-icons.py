"""Build vendor/screenshot-import/icon-features.json, the screenshot reader's icon library: for each weapon attachment
choice on the site that has a game icon, the icon's 64x64 filled shape, its aspect and its two 64x64 line maps (plain
and mirrored), stored once per atlas sprite.

Run scripts/build-screenshot-import-data.mjs first: the choices and their points come from its import-data.json (the
site's own data). Which icon each choice uses comes from the game:
- non-sight attachments: the AD_* description asset in the research repo's site attachment mapping (uiLink.assets);
- optics: the per-weapon AAM record named '<weapon> - <optic record name>', decoded from the capture with
  scripts/frosty-ebx-decode.py; an optic with no record on a weapon takes the sprite it uses on most weapons;
- the AD_* asset's atlas sprite (ad-refs.json, sprites.json) and the atlas page images, from the attachment icon
  atlas export in the Datamining build folder (about 80 MB, not in this repository).
Iron sights have no icon: the reader finds them by cost and position.

Prints the site choices left without an icon (the coverage check). Needs numpy, opencv-python and Pillow.
"""
import argparse, base64, collections, gzip, json, re, subprocess, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / 'vendor/screenshot-import'
BUILD = Path(r'C:\Users\royal\Documents\BF6 Datamining\builds\2.1.2.0')
ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('--atlases', type=Path, default=BUILD / 'reports/attachment-icon-atlases-2026-11-20')
ap.add_argument('--capture', type=Path, default=BUILD / 'capture')
ap.add_argument('--mapping', type=Path, default=Path(r'C:\Users\royal\Documents\BF6 Frosty Research\reference-data\provenance\frosty-site-attachment-mapping-2026-11-19.json'))
ap.add_argument('--optics', type=Path, default=REPO / 'reference-data/provenance/frosty-individual-optics-2026-11-10.json')
ap.add_argument('--work', type=Path, default=REPO / '.local-archive/screenshot-import-build', help='decode cache (not committed)')
args = ap.parse_args()
N = 64

data = json.loads((OUT / 'import-data.json').read_text(encoding='utf-8'))
site = {(w, sl, i): p for w, cs in data['choices'].items() for sl, i, p in cs}
sprites = json.loads((args.atlases / 'sprites.json').read_text())
adrefs = {k.lower(): v for k, v in json.loads((args.atlases / 'ad-refs.json').read_text()).items()}
optics = json.loads(args.optics.read_text(encoding='utf-8'))

# --- which atlas sprite an AD_* asset uses
# Old-name AD records whose sprite index points at a different sprite in the multiplayer atlas; these take the
# multiplayer AD_Shared_SCP_* record's index instead (decoded 20 Nov 2026: AD_Shared_SCP_Tango6t -> 137
# "T_UI_DPF_WEPATT_Zoom_Tango6t", AD_Shared_SCP_Romeo4T -> 95 "T_UI_DPF_Reflex_Romeo4T").
OLD_AD = {'ad_wepatt_zoom_tango6t': ('Sight_IconAtlas', 137), 'ad_reflex_romeo_01': ('Sight_IconAtlas', 95)}
def sprite_for_ad(ad):
    name = ad.rsplit('/', 1)[-1].lower()
    if name in OLD_AD: return OLD_AD[name]
    for r in adrefs.get(ad.lower(), []):
        a = (r['atlas'] or '').rsplit('/', 1)[-1]
        if a in sprites and r['value'] is not None and r['value'] < len(sprites[a]): return a, r['value']
    return None

# --- optics and optic accessories: per-weapon AD assets from the weapon's AAM records
def aam_records():
    """(optic id -> AD per weapon, AAM records per weapon as (record name, AD asset))."""
    names = {o['id']: o['frostyRecordNames'] for o in optics['optics']}
    rows = [(w, r) for w, rs in optics['weapons'].items() if isinstance(rs, list) for r in rs]
    dirs = sorted({str(Path(r['source']).parent) for _, r in rows})
    aams = [p for d in dirs for p in (args.capture / 'collection/raw' / d).glob('AAM_*.ebx')]
    args.work.mkdir(parents=True, exist_ok=True)
    lst, dec = args.work / 'aam-list.txt', args.work / 'aam-decoded.json'
    lst.write_text('\n'.join(map(str, aams)))
    if not dec.exists():
        subprocess.run([sys.executable, '-I', str(REPO / 'scripts/frosty-ebx-decode.py'), '--descriptors',
                        str(args.capture / 'toolchain/SharedTypeDescriptors.ebx'), '--ebx-list', str(lst), '--out', str(dec)],
                       check=True, capture_output=True)
    cat = json.loads((args.capture / 'collection/asset-catalog.json').read_text(encoding='utf-8'))
    items = cat if isinstance(cat, list) else next(v for v in cat.values() if isinstance(v, list))
    byguid = {e['guid']: e['path'] for e in items if '/MetaData/' in e['path'] or '/Metadata/' in e['path']}
    recs = {}
    for path, a in json.loads(dec.read_text(encoding='utf-8'))['assets'].items():
        d = str(Path(path.split('collection/raw/', 1)[-1]).parent).replace('\\', '/').lower()
        for o in a['objects']:
            n, ref = o.get('Field_55aded8d'), o.get('Field_85b318a1')
            imp = ref.get('$import', {}) if isinstance(ref, dict) else {}
            if n and imp.get('fileGuid') in byguid: recs.setdefault(d, []).append((n, byguid[imp['fileGuid']]))
    norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
    res = {}
    for w, r in rows:
        d = str(Path(r['source']).parent).replace('\\', '/').lower()
        want = {norm(x) for x in names.get(r['id'], [])}
        hit = next((ad for n, ad in recs.get(d, []) if norm(n.rsplit(' - ', 1)[-1]) in want), None)
        if hit: res.setdefault(w, {})[r['id']] = hit
    wdirs = {}
    for w, r in rows: wdirs.setdefault(w, set()).add(str(Path(r['source']).parent).replace('\\', '/').lower())
    return res, {w: [rec for d in ds for rec in recs.get(d, [])] for w, ds in wdirs.items()}

# --- the library: (weapon, slot, id) -> sprite, for site choices only, points from the site
lib = []
def add(w, slot, i, hit, ad):
    if (w, slot, i) in site: lib.append({'weapon': w, 'slot': slot, 'id': i, 'pts': site[(w, slot, i)], 'atlas': hit[0], 'index': hit[1], 'ad': ad})
for c in json.loads(args.mapping.read_text(encoding='utf-8'))['choices']:
    for ad in [a for s in c['sources'] for a in (s.get('uiLink') or {}).get('assets', [])]:
        hit = sprite_for_ad(ad)
        if hit: add(c['weapon'], c['slot'], c['attachment'], hit, ad.rsplit('/', 1)[-1]); break
optic_by_weapon, records = aam_records()
for w, m in optic_by_weapon.items():
    for oid, ad in m.items():
        hit = sprite_for_ad(ad)
        if hit: add(w, 'sight', oid, hit, ad.rsplit('/', 1)[-1])
# An optic uses one icon on nearly every weapon (variants are mounts): one with no AAM record on a weapon takes its
# most common sprite.
common = collections.defaultdict(collections.Counter)
for e in lib:
    if e['slot'] == 'sight': common[e['id']][(e['atlas'], e['index'], e['ad'])] += 1
have = {(e['weapon'], e['slot'], e['id']) for e in lib}
for w, rows in optics['weapons'].items():
    for r in rows if isinstance(rows, list) else []:
        if (w, 'sight', r['id']) in have or not common[r['id']]: continue
        (atlas, index, ad), _ = common[r['id']].most_common(1)[0]
        add(w, 'sight', r['id'], (atlas, index), ad); have.add((w, 'sight', r['id']))
# Optic accessories: the weapon's AAM records whose AD asset draws from the OpticAccessory atlas. The site groups
# them as scripts/frosty-attachment-compatibility.py does: canted irons, anti-glare coating, and every reflex,
# offset dot, magnifier or variable as Secondary Optic (one site choice with several icons).
def accessory_id(name):
    n = re.sub(r'[^a-z0-9]', '', name.rsplit(' - ', 1)[-1].lower())
    return 'canted_irons' if 'cantediron' in n or 'ironsightscanted' in n else 'ag_coating' if 'agcoating' in n else 'secondary_optic'
for w, recs in records.items():
    seen = set()
    for name, ad in recs:
        hit = sprite_for_ad(ad)
        if not hit or not hit[0].startswith('OpticAccessory'): continue
        k = (accessory_id(name), hit)
        if k in seen: continue
        seen.add(k); add(w, 'accessory', k[0], hit, ad.rsplit('/', 1)[-1])

# --- icon features (as the reader computes them for a screenshot tile)
pages = {}
def crop(atlas, idx):
    s = sprites[atlas][idx]; k = f"{atlas}_atlas{s['page']}"
    if k not in pages: pages[k] = np.asarray(Image.open(args.atlases / 'pages' / f'{k}.png').convert('RGB'))
    p = pages[k]; h, w = p.shape[:2]; x0, y0, x1, y1 = s['uv']
    return p[int(round(y0 * h)):int(round(y1 * h)), int(round(x0 * w)):int(round(x1 * w))]
def square(m, threshold=None):
    ys, xs = np.nonzero(m)
    if len(xs) == 0: return np.zeros((N, N), np.float32), 1.0
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(np.uint8); h, w = m.shape
    s = max(h, w); pad = np.zeros((s, s), np.uint8); pad[(s - h) // 2:(s - h) // 2 + h, (s - w) // 2:(s - w) // 2 + w] = m
    r = cv2.resize(pad * 255, (N, N), interpolation=cv2.INTER_AREA)
    if threshold is None: return r.astype(np.float32) / 255, w / h
    return cv2.dilate((r > threshold).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32), w / h
def fill(m):
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    ff = m.copy(); h, w = m.shape; cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 1)
    return m | (1 - ff)
def features(atlas, idx):
    rgb = crop(atlas, idx).astype(np.int32); R, G = rgb[..., 0], rgb[..., 1]
    shape, asp = square(fill(((G > 100) | (R > 170)).astype(np.uint8)))
    fillm = ((G > 100) | (R > 170)).astype(np.uint8)
    lm = cv2.morphologyEx(fillm, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) | ((R > 150) & (G > 150)).astype(np.uint8)
    (l1, _), (l2, _) = square(lm, 40), square(lm[:, ::-1], 40)
    pack = lambda a: base64.b64encode(np.packbits(a.astype(np.uint8)).tobytes()).decode()
    return {'shape': base64.b64encode(np.round(shape * 255).astype(np.uint8).tobytes()).decode(), 'asp': float(asp),
            'lines': pack(l1), 'linesMirror': pack(l2)}

out_sprites, keys, entries = [], {}, []
for e in lib:
    k = (e['atlas'], e['index'])
    if k not in keys: keys[k] = len(out_sprites); out_sprites.append(features(*k))
    entries.append([e['weapon'], e['slot'], e['id'], e['pts'], keys[k]])
s = json.dumps({'n': N, 'sprites': out_sprites, 'entries': entries}, separators=(',', ':'))
(OUT / 'icon-features.json').write_text(s)
print(len(out_sprites), 'sprites', len(entries), 'entries', len(s) // 1024, 'KB raw', len(gzip.compress(s.encode())) // 1024, 'KB gzip')

# --- coverage: site choices with no icon (irons are not choices: found by cost and position)
missing = sorted(set(site) - {(e['weapon'], e['slot'], e['id']) for e in lib})
print(len(missing), 'site choices without an icon (read by cost and the stat panel only):')
for slot, n in collections.Counter(k[1] for k in missing).most_common(): print(f'  {slot}: {n}')
for k in missing[:40]: print('  ', '|'.join(k))

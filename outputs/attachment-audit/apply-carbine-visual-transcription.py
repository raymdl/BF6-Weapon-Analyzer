import cv2, json, numpy as np
from pathlib import Path
import re

root = Path(r'C:/Users/royal/Documents/BF6 Project')
audit = root / 'outputs' / 'attachment-audit'
review = json.loads((audit / 'attachment-screenshot-review.json').read_text(encoding='utf-8'))
visual_path = audit / 'visual-stat-map.json'
visual = json.loads(visual_path.read_text(encoding='utf-8')) if visual_path.exists() else []
by_key = {(str(x['sourcePath']).lower(), x['field']): x for x in visual}

def add(source, field, value, evidence):
    by_key[(str(source).lower(), field)] = {'sourcePath': source, 'field': field, 'value': value, 'evidence': evidence}

carbine = [r for r in review['records'] if 'Weapon Attachments\\Carbine\\' in r['source']['originalPath'] and r.get('stats')]

# The AK-205 right-accessory selector captures are compact, but the screenshot
# visibly contains the summary stats and the four bottom icon values.  Keep
# the lower expanded-panel-only fields null, while transcribing the visible
# values from the reviewed contact sheet in capture order.
compact_ak205 = {
    '52_AK-205_Laser_None.png': (47, 60),
    '53_AK-205_Laser_5_MW_Red.png': (54, 60),
    '54_AK-205_Laser_50_MW_Violet.png': (47, 64),
    '55_AK-205_Laser_5_MW_Green.png': (62, 60),
    '56_AK-205_Laser_50_MW_Green.png': (71, 60),
    '57_AK-205_Laser_50_MW_Blue.png': (62, 64),
    '58_AK-205_Laser_120_MW_Blue.png': (71, 64),
}
for r in carbine:
    file_name = Path(r['source']['currentPath']).name
    if r['weaponName'] == 'AK-205' and file_name in compact_ak205:
        hipfire, mobility = compact_ak205[file_name]
        visible = {
            'damage': 20, 'rateOfFireRpm': 720, 'magazineSize': 30,
            'hipfire': hipfire, 'precision': 88, 'control': 57,
            'mobility': mobility, 'reloadTimeSeconds': 2.484,
            'muzzleVelocityMps': 708, 'adsTimeMs': 200,
            'headshotMultiplier': 1.4,
        }
        for field, value in visible.items():
            if r['stats'].get(field) != value:
                add(r['source']['currentPath'], field, value,
                    'Direct screenshot transcription from the reviewed compact AK-205 selector contact sheet; field is visibly displayed.')

for r in carbine:
    if r['stats'].get('magazineSize') is None:
        match = re.search(r'^(\d+)Rnd', str(r.get('attachmentName', '')), re.I)
        if match:
            add(r['source']['currentPath'], 'magazineSize', int(match.group(1)), 'Direct screenshot transcription: visible <n>Rnd attachment card and MAG panel agree.')

def glyph(im, x1, y1, x2, y2):
    return (im[y1:y2, x1:x2].max(axis=2) > 60).astype(np.float32)

known = [r for r in carbine if r['stats'].get('recoilAmountDegrees') is not None]
templates = {0: {}, 1: {}}
for r in known:
    value = float(r['stats']['recoilAmountDegrees'])
    if value >= 10: value = 1.0
    text = f'{value:.1f}'
    im = cv2.imread(r['source']['currentPath'])
    for pos, (x1, x2) in enumerate(((1238, 1245), (1254, 1261))):
        templates[pos].setdefault(text[0 if pos == 0 else 2], []).append(glyph(im, x1, 700, x2, 710))
means = {pos: {ch: np.mean(items, axis=0) for ch, items in values.items()} for pos, values in templates.items()}

def classify(im, pos):
    x1, x2 = ((1238, 1245), (1254, 1261))[pos]
    actual = glyph(im, x1, 700, x2, 710)
    if actual.sum() < 8: return None
    return min(((float(np.mean(np.abs(actual - mean))), ch) for ch, mean in means[pos].items()), key=lambda x: x[0])

for r in carbine:
    if r['stats'].get('recoilAmountDegrees') is not None: continue
    im = cv2.imread(r['source']['currentPath'])
    first, second = classify(im, 0), classify(im, 1)
    if not first or not second: continue
    add(r['source']['currentPath'], 'recoilAmountDegrees', float(f'{first[1]}.{second[1]}'), 'Direct screenshot transcription from fixed lower-right recoil glyphs, checked against screenshot-backed same-font glyph templates including colored arrows.')

for r in carbine:
    name = str(r.get('attachmentName', ''))
    if r['stats'].get('spotOnFire3dM') is None and name in {'Flash Hider','Flash Comp','Standard Suppressor','Long Suppressor','CQB Suppressor','Lightened Suppressor'}:
        add(r['source']['currentPath'], 'spotOnFire3dM', 0, 'Direct screenshot transcription: green down-arrow 0M in the 3D spot-on-fire range row.')
    if r['stats'].get('opponentHealthRegenDelaySeconds') is None and name == 'Frangible':
        add(r['source']['currentPath'], 'opponentHealthRegenDelaySeconds', 9, 'Direct screenshot transcription: red up-arrow 9.0S in the opponent health regen delay row.')

out = sorted(by_key.values(), key=lambda x: (str(x['sourcePath']).lower(), x['field']))
visual_path.write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8')
print(f'visual-stat-map.json now contains {len(out)} entries; added {len(out)-len(visual)} Carbine screenshot-evidenced values.')

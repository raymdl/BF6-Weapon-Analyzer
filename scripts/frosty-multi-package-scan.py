"""List attachment actions that select more than one weapon-modifier package.

One action normally selects one shared `U_WPM_*` package. Several packages in one
action can mean an incomplete selector assignment, as found for sniper Slim
Angled grips. Each hit is a candidate for a full source trace and an in-game
check, not a confirmed bug.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--out', type=Path, help='Optional JSON output path')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('configuration', ROOT / 'scripts/frosty-configuration.py')
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)
    cache = {}

    def read(path):
        if path not in cache:
            cache[path] = ET.fromstring((args.root / path).read_bytes())
        return cache[path]

    identities = json.loads((ROOT / 'reference-data/provenance/frosty-weapon-identities.json').read_text())['weapons']
    site_ids = {w['internalId']: w['siteId'] for w in identities}
    gs_files = {p.stem[3:].lower(): p for p in (args.root / 'Common/Hardware/Weapons').rglob('GS_*.xml')}
    weapons = []
    for w in identities:
        gs = gs_files.get(w['internalId'].lower())
        wbs = list(gs.parent.glob('*_WB.xml')) if gs else []
        if gs and len(wbs) == 1:
            weapons.append({'internalId': w['internalId'], 'gsXml': gs.relative_to(args.root).as_posix(),
                            'wbXml': wbs[0].relative_to(args.root).as_posix()})
    rows, _ = cfg.attachment_graph(args.root, weapons, read)

    hits = []
    for row in rows:
        if not row['attachmentXml']:
            continue
        for branch in row['branches']:
            for action in branch['actions']:
                packages = [s['unlock']['asset'] for s in action['selectors']]
                if len(packages) < 2:
                    continue
                hits.append({
                    'weapon': row['weapon'], 'siteId': site_ids.get(row['weapon']),
                    'attachmentXml': row['attachmentXml'],
                    'rawPointCost': row['rawPointCost'], 'actionGuid': action['guid'],
                    'packages': packages,
                    'packagesWithoutWeaponWbModifier': [s['unlock']['asset'] for s in action['selectors']
                                                        if not s['wbModifiers']],
                })
    hits.sort(key=lambda h: (h['weapon'], h['attachmentXml']))
    for h in hits:
        names = ', '.join(p.rsplit('/', 1)[-1] for p in h['packages'])
        print(f"{h['weapon']:16s} {h['attachmentXml'].rsplit('/', 1)[-1]:50s} {names}")
    print(f'{len(hits)} actions select more than one package')
    if args.out:
        args.out.write_text(json.dumps({'root': str(args.root), 'hits': hits}, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

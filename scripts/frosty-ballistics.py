"""Generate projectile inputs from a current hit-zone attachment trace and XML.

The trace must be regenerated with frosty-hit-zones.py when source data changes.
Only site ammo selections are included; unrelated mode/optic branches are not
activated by this generator. This does not establish native modifier order.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    spec = importlib.util.spec_from_file_location('raw_tree', ROOT / 'scripts/frosty-raw-tree.py')
    raw_tree = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(raw_tree)
    parser.add_argument('--root', type=Path)
    raw_tree.add_raw_arguments(parser)
    parser.add_argument('--trace', required=True, type=Path)
    parser.add_argument('--out', type=Path, default=ROOT / 'data/ballistics.json')
    args = parser.parse_args()
    export = raw_tree.open_input(parser, args, args.root)
    raw = args.trace.read_bytes()
    trace = json.loads(raw)
    ammo = json.loads((ROOT / 'data/ammo.json').read_text())['WEAPON_AMMO']
    hashes, projectiles, weapons = {}, {}, {}
    # Reject stale trace inputs rather than silently reusing old selectors.
    for path, expected in trace['sourceSha256'].items():
        if export.sha256(path) != expected:
            raise ValueError(f'Stale attachment trace: {path}')

    def projectile(ref):
        key = ref['asset']
        if key not in projectiles:
            if '_SP_' in key or '/SP/' in key:
                raise ValueError(f'Unresolved SP projectile selection: {key}')
            path = key + '.xml'
            tree, hashes[path] = export.load(path)
            obj = next(n for n in tree if n.get('Guid') == ref['guid'])
            projectiles[key] = {
                'gravityMps2': float(obj.findtext('Field_d9d33d20')),
                'dragPerMeter': float(obj.findtext('Field_30c37c24')),
                'guid': ref['guid'],
            }
        return key

    for wid, weapon in trace['weapons'].items():
        if set(weapon['ammo']) != set(ammo[wid]['ammo']):
            raise ValueError(f'Stale ammo selections: {wid}')
        base = projectile(weapon['baseProjectile'])
        selected = {}
        for aid, entry in weapon['ammo'].items():
            if not entry['attachmentXml'] or entry.get('fallback'):
                raise ValueError(f'Unresolved ammo attachment: {wid}/{aid}')
            selected[aid] = projectile(entry['projectileSwap']) if entry['projectileSwap'] else base
        weapons[wid] = {'base': base, 'ammo': selected}
    result = {'schemaVersion': 2, 'source': {
        'build': trace['build'], 'generatedBy': 'scripts/frosty-ballistics.py',
        'attachmentTrace': args.trace.name, 'attachmentTraceSha256': hashlib.sha256(raw).hexdigest(),
        'projectileSha256': hashes,
    }, 'projectiles': projectiles, 'weapons': weapons}
    # This is a site data file: the marker goes beside the hashes, not at the top level.
    export.mark(result['source'])
    args.out.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(f'{len(weapons)} weapons, {sum(len(w["ammo"]) for w in weapons.values())} ammo selections, {len(projectiles)} projectiles')


if __name__ == '__main__':
    main()

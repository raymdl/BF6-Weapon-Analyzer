"""Check promoted shotgun ammunition against its exact local Frosty sources.

Requires the export used by reference-data/provenance/frosty-shotgun-ammo.json.
This checks recorded selection paths, not completeness of the game's roster or
native modifier arithmetic. It never writes source or runtime data.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    args = parser.parse_args()
    site = Path(__file__).resolve().parents[1]
    read_json = lambda path: json.loads((site / path).read_text(encoding='utf-8'))
    evidence = read_json('reference-data/provenance/frosty-shotgun-ammo.json')
    ammo = read_json('data/ammo.json')['WEAPON_AMMO']
    weapons = {w['id']: w for w in read_json('data/weapons.json')}
    ballistics = read_json('data/ballistics.json')
    cache = {}

    def require(condition, message):
        if not condition:
            raise ValueError(message)

    for path, expected in evidence['sourceSha256'].items():
        raw = (args.root / path).read_bytes()
        require(hashlib.sha256(raw).hexdigest() == expected, f'Source changed: {path}')
        cache[path] = ET.fromstring(raw)

    def target(path, guid):
        matches = [e for e in cache[path] if e.get('Guid', '').lower() == guid.lower()]
        require(len(matches) == 1, f'Expected one object: {path} [{guid}]')
        return matches[0]

    def internal(path, ref):
        match = re.fullmatch(r'\[([^\]]+)\] ([0-9a-f-]+)', ref)
        require(match is not None, f'Invalid internal reference: {ref}')
        obj = target(path, match[2])
        require(obj.tag == match[1], f'Reference type differs: {ref}')
        return obj

    names = {'Buckshot': 'buckshot', 'No00Buckshot': 'buckshot_00',
             'Flechette': 'flechette', 'Slugs': 'slugs'}
    seen = set()
    for row in evidence['rows']:
        wid = row['siteId']
        ammo_id = names[Path(row['attachmentXml']).stem.split('_AMO_')[1]]
        require((wid, ammo_id) not in seen, f'Duplicate selection: {wid}/{ammo_id}')
        seen.add((wid, ammo_id))
        label = f'{wid}/{ammo_id}'
        projectile = target(row['projectileXml'], row['projectileGuid'])
        shot = target(row['baseShot']['sourceXml'], row['baseShot']['guid'])
        count = int(shot.findtext('Field_58d70acb/Struct_29ea5d2b/Field_db0fcea2'), 0)
        for effect in row['effects']:
            obj = target(effect['sourceXml'], effect['guid'])
            if obj.tag == 'Class_b1afeb65':
                expected = f"[Ebx] {row['projectileXml'][:-4]} [{row['projectileGuid']}]"
                require(obj.findtext('Field_808dd66c') == expected, f'{label}: projectile selection differs')
            elif obj.tag == 'Class_ef0525cd':
                count = int(obj.findtext('Field_db0fcea2'), 0)
        curve = internal(row['projectileXml'], projectile.findtext('Field_2ad7e688'))
        require(curve.tag == 'Class_6a0d9448', f'{label}: unsupported curve type')
        values = [float(v.text) for v in curve.findall('Field_5279388d/member')]
        require(values and len(values) % 2 == 0, f'{label}: invalid XY array')
        points = [{'r': values[i], 'd': values[i + 1]} for i in range(0, len(values), 2)]
        ref = curve.findtext('Field_84a4ac26/Struct_9bc51bd0/Field_6b28f68f')
        match = re.fullmatch(r'\[Ebx\] (.+) \[([0-9a-f-]+)\]', ref)
        require(match is not None, f'{label}: missing curve semantic link')
        name = target(match[1] + '.xml', match[2]).findtext('Field_0c59fa06', '')
        require(name.endswith(('.TweakableDamageCurve', '.TweakableDamageCurve.XYValues')),
                f'{label}: curve has no named damage binding')
        runtime = ammo[wid].get('projectileOverrides', {}).get(ammo_id, weapons[wid])
        runtime_points = [{'r': p['r'], 'd': p['d']} for p in runtime['dmg']]
        require(runtime['pellets'] == count and runtime_points == points,
                f'{label}: runtime count or damage differs from source')
        require(float(projectile.findtext('Field_30c37c24')) == ballistics['baseDragPerMeter'],
                f'{label}: drag differs from runtime')
        require(float(projectile.findtext('Field_d9d33d20')) == ballistics['gravityMps2'],
                f'{label}: gravity differs from runtime')
    expected = {(wid, a) for wid in ('ks18k', 'db12', 'm1014', 'm87a1') for a in names.values()}
    require(seen == expected, 'Incomplete recorded shotgun ammunition coverage')
    print(f'Verified {len(seen)} shotgun ammunition selections and {len(cache)} source hashes.')


if __name__ == '__main__':
    main()

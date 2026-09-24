"""Raw-verify scalar fields on a recorded set of primary firing objects.

The input records identify routes and objectIndex; they do not supply values.
Names passed through --field are labels, not inferred semantic mappings.
"""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3
import struct

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', type=Path, required=True)
    parser.add_argument('--records', type=Path, required=True)
    parser.add_argument('--head', type=int, required=True)
    parser.add_argument('--descriptor-sha256', required=True)
    parser.add_argument('--field', action='append', required=True,
                        help='Label=hash/hash path within the recorded object')
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--heat-site-mapping', type=Path,
                        help='Optional site-recoil-details report for conditional heat arithmetic')
    args = parser.parse_args()
    if args.out.exists():
        parser.error('Output already exists; select a new --out')
    mod = runpy.run_path(str(ROOT / 'scripts/frosty-ebx-decode.py'))
    fields = [item.split('=', 1) for item in args.field]
    records = json.loads(args.records.read_text(encoding='utf-8'))['records']
    db = sqlite3.connect(args.db.resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row

    def all_fields(ebx, cls):
        for field in cls['fields']:
            if mod['debug_type'](field['flags']) == mod['INHERITED']:
                yield from all_fields(ebx, ebx.class_by_index(field['classRef']))
            else:
                yield field

    def locate(ebx, index, path):
        instance = ebx.instances[index]
        cls = ebx.class_by_key(ebx.class_keys[instance['classRef']])
        start = ebx.data_start + ebx.data_offsets[index]
        parts = path.strip('/').split('/')
        for number, part in enumerate(parts):
            field = next(f for f in all_fields(ebx, cls)
                         if f['hash'] == part.removeprefix('Field_'))
            pos = start + field['offset']
            kind = mod['debug_type'](field['flags'])
            if number == len(parts) - 1:
                return pos, kind
            cls = ebx.types['classes'][field['classRef']]
            alignment = cls['alignment']
            start = pos + (-pos % alignment if alignment else 0)

    results = []
    descriptors = {}
    for record in records:
        captures = db.execute(
            'select * from captures where route=? collate nocase and head=? '
            'and descriptor_sha256=?',
            (record['route'], args.head, args.descriptor_sha256)).fetchall()
        assert len(captures) == 1, record['route']
        cap = dict(captures[0])
        if cap['descriptor_path'] not in descriptors:
            descriptors[cap['descriptor_path']] = mod['type_descriptors'](cap['descriptor_path'])
        types = descriptors[cap['descriptor_path']]
        assert types['sha256'] == args.descriptor_sha256
        ebx = mod['Ebx'](cap['raw_path'], types)
        assert ebx.sha256 == cap['raw_sha256']
        index = record['objectIndex']
        body = ebx.decode()['objects'][index]
        values = []
        for label, path in fields:
            offset, kind = locate(ebx, index, path)
            decoded = body
            for part in path.strip('/').split('/'):
                decoded = decoded['Field_' + part.removeprefix('Field_')]
            # Fail closed: this method is for float32 scalar fields only.
            assert kind == mod['FLOAT32'], (path, kind)
            raw = struct.unpack_from('<f', ebx.data, offset)[0]
            assert abs(raw - decoded) < 1e-7, (path, raw, decoded)
            values.append(dict(name=label, fieldPath=path, value=raw,
                               rawOffset=offset, rawHex=ebx.data[offset:offset+4].hex(),
                               typeCode=kind))
        results.append(dict(route=cap['route'], rawPath=cap['raw_path'],
                            rawSha256=ebx.sha256, objectIndex=index,
                            objectClass=body['$class'], values=values))
    report = dict(head=args.head, descriptorSha256=args.descriptor_sha256,
                  inputs=[dict(path=str(p.resolve()), sha256=sha(p))
                          for p in [args.records, ROOT / 'scripts/frosty-ebx-decode.py']],
                  records=results, count=len(results),
                  limits=['Configured scalar values only; no native consumption or arithmetic established.',
                          'Field labels require independent source naming evidence.'])
    if args.heat_site_mapping:
        mapping = json.loads(args.heat_site_mapping.read_text(encoding='utf-8'))['assets']
        weapons = json.loads((ROOT / 'data/weapons.json').read_text(encoding='utf-8'))
        magazines = json.loads((ROOT / 'data/attachments.json').read_text(encoding='utf-8'))['WEAPON_MAG']
        arithmetic = []
        for record in results:
            values = {v['name']: v['value'] for v in record['values']}
            if values['HeatPerBullet'] == 0:
                continue
            source = record['route'].split('/')[-1].removesuffix('_WB')
            matches = [m for m in mapping if m['sourceWeapon'] == source
                       and m['head'] == args.head
                       and m['descriptorSha256'] == args.descriptor_sha256]
            assert len(matches) == 1, source
            weapon = next(w for w in weapons if w['id'] == matches[0]['siteWeapon'])
            capacities = {k: v['mag'] for k, v in magazines[weapon['id']]['mags'].items()}
            maximum = max(weapon['mag'], *capacities.values())
            gain = values['HeatPerBullet'] * weapon['rpm'] / 60
            arithmetic.append(dict(siteWeapon=weapon['id'], mapping=matches[0],
                                   rpm=weapon['rpm'], storedBaseMagazine=weapon['mag'],
                                   selectedMagazines=capacities, maximumStoredMagazine=maximum,
                                   gainPerSecond=gain, dropPerSecond=values['HeatDropPerSecond'],
                                   gainBelowDrop=gain < values['HeatDropPerSecond'],
                                   penaltyTime=values['OverHeatPenaltyTime'],
                                   dropDelay=values['OverHeatDropDelay'],
                                   noCoolingShotsRatio=values['OverHeatThreshold']/values['HeatPerBullet'],
                                   maximumMagazineHeatWithoutCooling=maximum*values['HeatPerBullet']))
        report['conditionalHeatArithmetic'] = arithmetic
        report['heatAssumptions'] = ('Zero-start simple additive per-shot heat with continuous '
                                    'cooling; penalty interpreted as timed lockout. No native behavior claim.')
        report['inputs'].extend(dict(path=str(p.resolve()), sha256=sha(p)) for p in
                                [args.heat_site_mapping, ROOT/'data/weapons.json', ROOT/'data/attachments.json'])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('x', encoding='utf-8') as output:
        json.dump(report, output, indent=2)
        output.write('\n')
    print(json.dumps(dict(out=str(args.out), sha256=sha(args.out), records=len(results))))


if __name__ == '__main__':
    main()

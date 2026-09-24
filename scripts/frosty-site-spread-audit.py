"""Compare all stored spread dynamics with current captured GS fields and bytes."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3
import struct


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--report-dir', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    repo = Path(__file__).resolve().parents[1]
    details_path = args.report_dir / (args.out.stem + '-details.json')
    if details_path.exists() or args.out.exists():
        ap.error('Use new output paths.')
    db = sqlite3.connect(f'{(args.report_dir / "coverage-decoder-v5.sqlite").resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    reader_path = repo / 'scripts/frosty-ebx-decode.py'
    reader = runpy.run_path(str(reader_path))
    roster_path = repo / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json'
    roster = json.loads(roster_path.read_text())['roots']
    site_path = repo / 'data/weapons.json'
    site = {w['id']: w for w in json.loads(site_path.read_text())}
    bindings_path = args.report_dir / 'registry-bindings.jsonl'
    bindings = [json.loads(line) for line in bindings_path.open()]
    lookup = {r['name']: r for r in bindings if r.get('name') and r['status'] == 'equal-scalar'}
    fields = {'inc': 'IncreasePerShot', 'idleTime': 'IdleTime', 'idleCoef': 'IdleDecreaseCoefficient',
              'idleExp': 'IdleDecreaseExponent', 'idleOffset': 'IdleDecreaseOffset',
              'firingCoef': 'FiringDecreaseCoefficient', 'firingExp': 'FiringDecreaseExponent',
              'firingOffset': 'FiringDecreaseOffset', 'notFiringCoef': 'NotFiringDecreaseCoefficient',
              'notFiringExp': 'NotFiringDecreaseExponent', 'notFiringOffset': 'NotFiringDecreaseOffset',
              'firstShotMul': 'FirstShotIncreaseMultiplier', 'distExp': 'DistributionExponent'}
    # Exact child/hash associations from other GS roots supply paths for null-anchor cases.
    templates = {}
    for r in bindings:
        name = r.get('name') or ''
        if '.DispersionBehavior.' in name and r['status'] == 'equal-scalar':
            suffix = name.split('.', 1)[1]
            templates.setdefault(suffix, r)
            assert templates[suffix]['pointer'] == r['pointer']
            assert templates[suffix]['field'] == r['field']
    types, rows, assets, extra, reference_rows = {}, [], [], [], []

    def locate(ebx, cls, start, parts):
        candidates = []
        for f in cls['fields']:
            kind = reader['debug_type'](f['flags'])
            if kind == reader['INHERITED']:
                try:
                    candidates.append(locate(ebx, ebx.class_by_index(f['classRef']), start, parts))
                except KeyError:
                    pass
            elif 'Field_' + f['hash'] == parts[0]:
                off = start + f['offset']
                if len(parts) == 1:
                    candidates.append((off, kind))
                else:
                    assert kind == reader['STRUCT'] and reader['debug_category'](f['flags']) != reader['CATEGORY_ARRAY']
                    candidates.append(locate(ebx, ebx.class_by_index(f['classRef']), off, parts[1:]))
        if not candidates:
            raise KeyError(parts)
        assert len(candidates) == 1, candidates
        return candidates[0]

    for weapon in roster:
        source = weapon['roots']['GS']['rawCapture']
        capture = dict(db.execute('SELECT * FROM captures WHERE route=? COLLATE NOCASE AND raw_sha256=?',
                                 (source['path'], source['rawSha256'])).fetchone())
        descriptor = capture['descriptor_path']
        if descriptor not in types:
            types[descriptor] = reader['type_descriptors'](descriptor)
        assert types[descriptor]['sha256'] == capture['descriptor_sha256']
        ebx = reader['Ebx'](capture['raw_path'], types[descriptor])
        assert ebx.sha256 == capture['raw_sha256']
        decoded = ebx.decode()
        assets.append({k: capture[k] for k in ('id', 'route', 'raw_path', 'head', 'raw_sha256', 'descriptor_sha256')} |
                      {'siteWeapon': weapon.get('siteIdentity'), 'sourceWeapon': weapon['internalId']})
        prefix = capture['route'].split('/')[-1]

        def evidence(suffix):
            named = lookup.get(prefix + '.' + suffix)
            binding = named or templates[suffix]
            oi = binding['objectIndex']
            pointer = binding['pointer'] + '/' + binding['field']
            body = decoded['objects'][oi]
            value = body
            parts = pointer.strip('/').split('/')
            for part in parts:
                value = value[part]
            cls = ebx.class_by_key(ebx.class_keys[ebx.instances[oi]['classRef']])
            offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[oi], parts)
            assert kind == reader['FLOAT32']
            raw_value = struct.unpack_from('<f', ebx.data, offset)[0]
            assert round(raw_value, 6) == value
            if named:
                assert named['fieldValue'] == value
            return {'sourceValue': value, 'rawFloat32': raw_value, 'byteOffset': offset,
                    'bytesHex': ebx.data[offset:offset + 4].hex(), 'pointer': pointer,
                    'objectIndex': oi, 'objectGuid': body.get('$guid'), 'captureId': capture['id'],
                    'registryName': prefix + '.' + suffix,
                    'nameEvidence': 'direct named child/hash association' if named else 'same descriptor field path; local registry anchor absent',
                    'layoutProvisional': bool(body.get('$layoutAmbiguous'))}

        wid = weapon.get('siteIdentity')
        for aim, source_aim in [('ads', 'Zoomed'), ('hip', 'Unzoomed')]:
            for key, name in fields.items():
                ev = evidence(f'DispersionBehavior.{source_aim}.Stationary.{name}')
                if wid:
                    value = site[wid]['spreadDyn'][aim][key]
                    status = 'match' if abs(value - ev['sourceValue']) <= max(1e-6, abs(value) * 1e-6) else 'different'
                    rows.append({'siteWeapon': wid, 'sourceWeapon': weapon['internalId'],
                                 'siteField': f'spreadDyn.{aim}.{key}', 'siteValue': value,
                                 'status': status, **ev})
                else:
                    reference_rows.append({'sourceWeapon': weapon['internalId'], 'aim': aim,
                                           'state': 'Stationary', 'field': key, **ev})
            # Moving source values matter even when the site inherits stationary fields.
            for key, name in fields.items():
                ev = evidence(f'DispersionBehavior.{source_aim}.MovingJumpingSprinting.{name}')
                if wid:
                    site_key = 'distExpMove' if key == 'distExp' and 'distExpMove' in site[wid]['spreadDyn'][aim] else key
                    value = site[wid]['spreadDyn'][aim][site_key]
                    status = 'match' if abs(value - ev['sourceValue']) <= max(1e-6, abs(value) * 1e-6) else 'different'
                    rows.append({'siteWeapon': wid, 'sourceWeapon': weapon['internalId'],
                                 'siteField': f'spreadDyn.{aim}.{site_key}', 'context': 'moving', 'siteValue': value,
                                 'status': status, **ev})
                else:
                    reference_rows.append({'sourceWeapon': weapon['internalId'], 'aim': aim,
                                           'state': 'MovingJumpingSprinting', 'field': key, **ev})
            for state in ('Stationary', 'MovingJumpingSprinting'):
                for name in ('DecreaseCoefficient', 'DecreaseExponent', 'DecreaseOffset'):
                    extra.append({'siteWeapon': wid, 'sourceWeapon': weapon['internalId'],
                                  'aim': aim, 'state': state, 'siteField': None,
                                  **evidence(f'DispersionBehavior.{source_aim}.{state}.{name}')})
    db.close()
    groups = defaultdict(list)
    for r in rows:
        groups[(r['siteField'], r.get('context', 'stationary'))].append(r)
    distributions = [{'siteField': f, 'context': c, 'count': len(rs),
                      'sourceDistribution': dict(Counter(str(r['sourceValue']) for r in rs)),
                      'siteDistribution': dict(Counter(str(r['siteValue']) for r in rs)),
                      'differences': [r['siteWeapon'] for r in rs if r['status'] != 'match']}
                     for (f, c), rs in sorted(groups.items())]
    details = {'assets': assets, 'comparisons': rows, 'unusedDecreaseFields': extra,
               'excludedReferenceFields': reference_rows, 'distributions': distributions}
    details_path.write_text(json.dumps(details, indent=2) + '\n')
    report = {'schemaVersion': 1, 'date': '2026-09-23', 'build': '1.4.3.0',
              'siteWeapons': len(site), 'sourceRoots': len(assets), 'comparisonCounts': dict(Counter(r['status'] for r in rows)),
              'different': [r for r in rows if r['status'] != 'match'],
              'rawFieldsChecked': len(rows) + len(extra) + len(reference_rows),
              'inputs': [{'path': str(p.resolve()), 'sha256': sha(p)} for p in (site_path, roster_path, bindings_path, reader_path)],
              'details': {'path': str(details_path.resolve()), 'sha256': sha(details_path)},
              'limits': ['Source values and raw fields are checked; named registry associations do not prove native consumption.',
                         'Moving comparison tests the current inherited site value; a difference is a model candidate, not runtime proof.',
                         'Raw float32 bytes retain precision; decoded six-decimal and site rounding use explicit 1e-6 relative/absolute tolerance.',
                         'Idle/first-shot and legacy Decrease fields need state-machine evidence before use.',
                         'KSG is a campaign-only reference and is not added to the site.'],
              'scriptSha256': sha(Path(__file__))}
    args.out.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ('siteWeapons', 'sourceRoots', 'comparisonCounts', 'rawFieldsChecked')}))
    print(json.dumps(report['different']))


if __name__ == '__main__':
    main()

"""Verify current Precision inputs against exact captured settings objects and bytes."""
import argparse
from collections import Counter
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
    details_path = args.report_dir / 'site-precision-comparison.jsonl'
    if details_path.exists() or args.out.exists():
        ap.error('Use new output paths.')
    evidence_path = repo / 'reference-data/provenance/frosty-precision-tables-1.4.3.0-2026-09-21.json'
    evidence = json.loads(evidence_path.read_text())
    site_path = repo / 'data/weapon_attributes.json'
    site = json.loads(site_path.read_text())
    reader_path = repo / 'scripts/frosty-ebx-decode.py'
    reader = runpy.run_path(str(reader_path))
    db = sqlite3.connect(f'{(args.report_dir / "coverage-decoder-v5.sqlite").resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    capture = dict(db.execute('SELECT * FROM captures WHERE route=?', (evidence['source']['asset'],)).fetchone())
    db.close()
    types = reader['type_descriptors'](capture['descriptor_path'])
    assert types['sha256'] == capture['descriptor_sha256']

    class LocatedEbx(reader['Ebx']):
        def _read_class(self, cls, offset):
            body = super()._read_class(cls, offset)
            # Internal research annotations only; the installed decoder is unchanged.
            locations = body.get('$researchLocations', {})
            for field in cls['fields']:
                kind = reader['debug_type'](field['flags'])
                if kind != reader['INHERITED']:
                    locations['Field_' + field['hash']] = (offset + field['offset'], kind)
            body['$researchLocations'] = locations
            return body

    ebx = LocatedEbx(capture['raw_path'], types)
    assert ebx.sha256 == capture['raw_sha256']
    decoded = ebx.decode()
    by_guid = {o.get('$guid'): (i, o) for i, o in enumerate(decoded['objects']) if o.get('$guid')}
    row_fields = evidence['fieldMap']['row']
    base_fields = {**evidence['fieldMap']['base'],
                   **{k: evidence['fieldMap']['object'][name] for k, name in
                      [('rpm', 'rpm'), ('minAngle', 'adsMinAngle'), ('duration', 'recoilDuration'), ('decrease', 'adsRecoilDecrease')]}}
    prefix = ['Field_4da34085', 'Field_f028b424', 'Field_59491962']
    counts, differences, tables = Counter(), [], []

    def raw_field(body, field):
        offset, kind = body['$researchLocations'][field]
        fmt, size = reader['SIMPLE'][kind]
        raw = struct.unpack_from(fmt, ebx.data, offset)[0]
        assert (round(raw, 6) if kind == reader['FLOAT32'] else raw) == body[field]
        return body[field], {'byteOffset': offset, 'bytesHex': ebx.data[offset:offset + size].hex(), 'rawValue': raw}

    with details_path.open('w') as output:
        for wid, table in site['tables'].items():
            prior = evidence['tables'][wid]
            oi, obj = by_guid[prior['guid']]
            rows = obj
            for part in prefix:
                rows = rows[part]
            assert len(rows) == len(table['rows']), (wid, len(rows), len(table['rows']))
            tables.append({'siteWeapon': wid, 'sourceObjectGuid': prior['guid'], 'objectIndex': oi,
                           'sourceClass': obj['$class'], 'rowCount': len(rows),
                           'identityEvidence': 'Retained 21 September multi-scalar association; this check uses its exact object GUID.'})

            def compare(site_pointer, value, source_pointer, source_value, words):
                if type(value) is bool:
                    match = value is source_value
                else:
                    # Source XML used seven significant decimal digits. Preserve raw precision.
                    match = abs(value - source_value) <= max(1e-6, abs(value) * 1e-6)
                status = 'match' if match else 'different'
                row = {'siteFile': 'data/weapon_attributes.json', 'pointer': site_pointer,
                       'siteWeapon': wid, 'siteValue': value, 'sourceValue': source_value,
                       'objectIndex': oi, 'objectGuid': prior['guid'], 'sourcePointer': source_pointer,
                       'rawWords': words, 'status': status}
                counts[status] += 1
                output.write(json.dumps(row) + '\n')
                if not match:
                    differences.append(row)

            for key, field in base_fields.items():
                value, raw = raw_field(obj, field)
                compare(f'/tables/{wid}/base/{key}', table['base'][key], '/' + field, value, [raw])
            for ri, row in enumerate(rows):
                for key, field in row_fields.items():
                    value, raw = raw_field(row, field)
                    compare(f'/tables/{wid}/rows/{ri}/{key}', table['rows'][ri][key],
                            '/' + '/'.join(prefix) + f'/{ri}/{field}', value, [raw])
                flags = [raw_field(row, field) for field in evidence['fieldMap']['rowValidFlags']]
                compare(f'/tables/{wid}/rows/{ri}/valid', table['rows'][ri]['valid'],
                        '/' + '/'.join(prefix) + f'/{ri}/{{six-valid-flags}}', any(f[0] for f in flags), [f[1] for f in flags])
    report = {'schemaVersion': 1, 'date': '2026-09-23', 'build': '1.4.3.0',
              'source': {k: capture[k] for k in ('id', 'route', 'raw_path', 'raw_sha256', 'head', 'descriptor_sha256')},
              'siteWeapons': len(tables), 'tableRows': sum(t['rowCount'] for t in tables),
              'comparisonCounts': dict(counts), 'differences': differences, 'tables': tables,
              'inputs': [{'path': str(p.resolve()), 'sha256': sha(p)} for p in (site_path, evidence_path, reader_path)],
              'details': {'path': str(details_path.resolve()), 'sha256': sha(details_path)},
              'limits': ['Exact field bytes and current site values are compared; runtime table selection and interpolation are not proved.',
                         'Retained weapon associations come from multi-field source/site matching, not a decoded native weapon-name field.',
                         'No scalar value alone establishes weapon identity. Ambiguous new identities are not introduced.',
                         'This receipt covers Precision tables only. Mobility and shotgun inputs remain separate research items.',
                         'The source has provisional type layouts; the raw hash, GUID and per-field offsets retain the evidence boundary.'],
              'scriptSha256': sha(Path(__file__))}
    args.out.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ('siteWeapons', 'tableRows', 'comparisonCounts')}))


if __name__ == '__main__':
    main()

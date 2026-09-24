"""Compare current DTA field bytes with the two Analyzer draw-time tables."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3
import struct


def ref(path):
    return {'path': str(path.resolve()), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--report-dir', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    args = ap.parse_args()
    detail = args.report_dir / (args.out.stem + '-leaves.jsonl')
    if detail.exists() or args.out.exists():
        ap.error('Use new output paths.')
    repo = Path(__file__).resolve().parents[1]
    reader_path = repo / 'scripts/frosty-ebx-decode.py'
    reader = runpy.run_path(str(reader_path))
    db = sqlite3.connect((args.report_dir / 'coverage-decoder-v5.sqlite').resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    site_path = repo / 'data/balance_tables.json'
    site = json.loads(site_path.read_text(encoding='utf-8'))['DRAW_TIME_TABLES']

    class Located(reader['Ebx']):
        def _read_class(self, cls, offset):
            body = super()._read_class(cls, offset)
            locations = body.get('$researchLocations', {})
            for field in cls['fields']:
                kind = reader['debug_type'](field['flags'])
                if kind != reader['INHERITED']:
                    locations['Field_' + field['hash']] = (offset + field['offset'], kind)
            body['$researchLocations'] = locations
            return body

    rows, sources = [], []
    for table, name in [('primary', 'DTA_Weapons'), ('sidearm', 'DTA_Sidearms')]:
        route = 'Common/Hardware/Common/Arrays/Deploy/' + name
        c = dict(db.execute('SELECT * FROM captures WHERE route=? COLLATE NOCASE AND head=4892017', (route,)).fetchone())
        td = reader['type_descriptors'](c['descriptor_path'])
        assert td['sha256'] == c['descriptor_sha256']
        ebx = Located(c['raw_path'], td)
        assert ebx.sha256 == c['raw_sha256']
        obj = ebx.decode()['objects'][0]
        values = obj['Field_70fd8f5f']
        sources.append({k: c[k] for k in ('id', 'route', 'head', 'raw_path', 'raw_sha256', 'descriptor_sha256')})
        for name, field in [('deploy', 'Field_ada3e7d9'), ('undeploy', 'Field_6225d335')]:
            assert len(values) == len(site[table][name])
            for i, row in enumerate(values):
                offset, kind = row['$researchLocations'][field]
                assert kind == reader['FLOAT32']
                raw = struct.unpack_from('<f', ebx.data, offset)[0]
                assert round(raw, 6) == row[field]
                value = site[table][name][i]
                assert abs(row[field] * 1000 - value) < 0.00001
                rows.append({'siteFile': 'data/balance_tables.json', 'pointer': f'/DRAW_TIME_TABLES/{table}/{name}/{i}',
                             'siteValue': value, 'reviewStatus': 'sourced-configuration', 'sourceSiteAgreement': 'match-after-seconds-to-ms',
                             'sourceFieldPath': f'/Field_70fd8f5f/{i}/{field}',
                             'remainingUncertainty': 'Ordered source configuration; native deploy phase selection and runtime completion remain unproven.',
                             'evidence': {'sourceAsset': route, 'rawSha256': ebx.sha256, 'head': c['head'],
                                          'descriptorSha256': c['descriptor_sha256'], 'objectGuid': obj.get('$guid'),
                                          'sourceValueSeconds': row[field], 'rawFloat32': raw,
                                          'byteOffset': offset, 'bytesHex': ebx.data[offset:offset + 4].hex(),
                                          'unitConversion': 'seconds * 1000 -> milliseconds'}})
    detail.write_text(''.join(json.dumps(row) + '\n' for row in rows), encoding='utf-8')
    result = {'date': '2026-09-23', 'site': ref(site_path), 'sources': sources, 'details': ref(detail),
              'comparedLeaves': len(rows), 'allMatch': True, 'script': ref(Path(__file__)), 'decoder': ref(reader_path),
              'limits': ['Current 1.4.3.0 captured bodies and descriptors; no dependency on Sym values.',
                         'This table comparison does not prove when deploy/undeploy completes in gameplay.']}
    args.out.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'comparedLeaves': len(rows), 'allMatch': True}))


if __name__ == '__main__':
    main()

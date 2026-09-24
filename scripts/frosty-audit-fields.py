"""Inventory every serialized field in the candidate weapon GS/WB roots.

This is review input, not semantic completion. Hash names and array positions are
preserved. No field names or gameplay meaning are inferred from value patterns.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def walk(value, path='', shape=''):
    if isinstance(value, dict) and not any(key.startswith('Field_') for key in value):
        yield path, shape, 'reference-or-marker' if value else 'empty-object', value
    elif isinstance(value, dict):
        for key, item in value.items():
            if key.startswith('Field_'):
                yield from walk(item, f'{path}/{key}', f'{shape}/{key}')
            else:
                yield f'{path}/{key}', f'{shape}/{key}', 'metadata', item
    elif isinstance(value, list):
        yield path, shape, 'array-length', len(value)
        for index, item in enumerate(value):
            yield from walk(item, f'{path}/{index}', f'{shape}/*')
    else:
        yield path, shape, type(value).__name__, value


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--db', type=Path, required=True)
    ap.add_argument('--roster', type=Path, required=True)
    ap.add_argument('--details', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    reader_path = Path(__file__).with_name('frosty-ebx-decode.py')
    reader = runpy.run_path(str(reader_path))
    roster = json.loads(args.roster.read_text(encoding='utf-8-sig'))
    db = sqlite3.connect(f'{args.db.resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    roots = []
    for weapon in roster['roots']:
        for kind in ['GS', 'WB']:
            source = weapon['roots'][kind]['rawCapture']
            rows = db.execute('SELECT * FROM captures WHERE route=? COLLATE NOCASE AND raw_sha256=?',
                              (source['path'], source['rawSha256'])).fetchall()
            assert rows, source['path']
            roots.append((weapon['internalId'], kind, dict(rows[0])))
    db.close()
    types, groups, assets, count = {}, {}, [], 0
    args.details.parent.mkdir(parents=True, exist_ok=True)
    with args.details.open('w', encoding='utf-8') as out:
        for weapon, kind, capture in roots:
            descriptor = capture['descriptor_path']
            if descriptor not in types:
                types[descriptor] = reader['type_descriptors'](descriptor)
            assert types[descriptor]['sha256'] == capture['descriptor_sha256']
            ebx = reader['Ebx'](capture['raw_path'], types[descriptor])
            assert ebx.sha256 == capture['raw_sha256']
            decoded = ebx.decode()['objects']
            local_count = 0
            for index, obj in enumerate(decoded):
                for pointer, shape, value_type, value in walk(obj):
                    record = {'weapon': weapon, 'rootKind': kind, 'captureId': capture['id'],
                              'objectIndex': index, 'objectGuid': obj.get('$guid'), 'class': obj.get('$class'),
                              'objectAbsoluteOffset': ebx.data_start + ebx.data_offsets[index],
                              'pointer': pointer, 'type': value_type, 'value': value}
                    out.write(json.dumps(record, ensure_ascii=True) + '\n')
                    key = (kind, obj.get('$class'), shape, value_type)
                    group = groups.setdefault(key, {'count': 0, 'weapons': set(), 'values': Counter()})
                    group['count'] += 1
                    group['weapons'].add(weapon)
                    group['values'][json.dumps(value, sort_keys=True)] += 1
                    local_count += 1
            count += local_count
            assets.append({k: capture[k] for k in ('id', 'route', 'head', 'raw_sha256', 'descriptor_sha256')} |
                          {'weapon': weapon, 'rootKind': kind, 'objects': len(decoded), 'entries': local_count})
    summaries = []
    for (kind, cls, shape, value_type), group in groups.items():
        summaries.append({'rootKind': kind, 'class': cls, 'pathShape': shape, 'type': value_type,
                          'occurrences': group['count'], 'weaponCount': len(group['weapons']),
                          'distinctValues': len(group['values']),
                          'examples': [{'value': json.loads(v), 'count': n} for v, n in group['values'].most_common(3)],
                          'reviewStatus': 'pending'})
    report = {'schemaVersion': 1, 'readerSha256': sha(reader_path), 'scriptSha256': sha(__file__),
              'rosterSha256': sha(args.roster), 'weaponCandidates': len(roster['roots']), 'rootCount': len(assets),
              'entryCount': count, 'fieldShapes': len(summaries), 'detailsPath': str(args.details.resolve()),
              'detailsSha256': sha(args.details), 'assets': assets, 'fields': summaries,
              'limits': ['Candidate MP inclusion remains unverified.', 'Field inventory is not semantic review.',
                         'References and marker objects remain atomic; full nested content is retained in value.',
                         'Float32 values follow the reader rounding to six decimal places; raw hashes preserve exact evidence.']}
    args.out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('weaponCandidates', 'rootCount', 'entryCount', 'fieldShapes')}))


if __name__ == '__main__':
    main()

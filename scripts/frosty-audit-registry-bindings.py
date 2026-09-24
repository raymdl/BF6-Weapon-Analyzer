"""Check current raw GS/WB registry links against named child/hash arrays.

Registry array positions are an association to test, not assumed engine behavior.
Retain absent fields, value differences, missing children and unequal arrays.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3
import sys


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def blocks(value, path=''):
    if isinstance(value, dict):
        for key, child in value.items():
            if isinstance(child, dict) and 'Field_6b28f68f' in child:
                yield path, key, value, child['Field_6b28f68f']
            yield from blocks(child, path + '/' + key)
    elif isinstance(value, list):
        for i, child in enumerate(value):
            yield from blocks(child, path + '/' + str(i))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--db', type=Path, required=True)
    ap.add_argument('--inventory', type=Path, required=True)
    ap.add_argument('--details', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    for output in (args.details, args.out):
        if output.exists():
            ap.error(f'Output exists: {output}')
    reader_path = Path(__file__).with_name('frosty-ebx-decode.py')
    reader = runpy.run_path(str(reader_path))
    inventory = json.loads(args.inventory.read_text(encoding='utf-8'))
    db = sqlite3.connect(f'{args.db.resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    reg = dict(db.execute("SELECT * FROM captures WHERE route='Common/GameSetup/Tweakables/GameRemixer/GRX_Weapons'").fetchone())
    sources = [dict(db.execute('SELECT * FROM captures WHERE id=?', (x['id'],)).fetchone()) for x in inventory['assets']]
    db.close()
    types = {}

    def decode(capture):
        descriptor = capture['descriptor_path']
        if descriptor not in types:
            types[descriptor] = reader['type_descriptors'](descriptor)
        assert types[descriptor]['sha256'] == capture['descriptor_sha256']
        ebx = reader['Ebx'](capture['raw_path'], types[descriptor])
        assert ebx.sha256 == capture['raw_sha256']
        return ebx.decode()

    registry = decode(reg)
    by_guid = {x.get('$guid'): x for x in registry['objects'] if x.get('$guid')}
    counts, problems, names = Counter(), [], {}
    with args.details.open('w', encoding='utf-8') as out:
        for capture in sources:
            for oi, obj in enumerate(decode(capture)['objects']):
                for pointer, wrapper, block, ref in blocks(obj):
                    if not isinstance(ref, dict) or '$import' not in ref:
                        counts['null-or-nonimport-anchor'] += 1
                        continue
                    target = ref['$import']
                    if target['fileGuid'] != registry['fileGuid']:
                        counts['other-file-anchor'] += 1
                        continue
                    anchor = by_guid.get(target['classGuid'])
                    base = {'captureId': capture['id'], 'route': capture['route'], 'objectIndex': oi,
                            'pointer': pointer, 'wrapper': wrapper, 'anchorGuid': target['classGuid']}
                    if anchor is None:
                        problems.append(base | {'reason': 'anchor object missing'})
                        continue
                    counts['resolved-anchors'] += 1
                    children, hashes = anchor.get('Field_080f1aaa'), anchor.get('Field_4471d2f1')
                    if not isinstance(children, list) or not isinstance(hashes, list) or len(children) != len(hashes):
                        problems.append(base | {'reason': 'child/hash arrays missing or unequal'})
                        continue
                    for i, (child_ref, field_hash) in enumerate(zip(children, hashes)):
                        field = f'Field_{field_hash & 0xffffffff:08x}'
                        child_index = child_ref.get('$ref') if isinstance(child_ref, dict) else None
                        child = registry['objects'][child_index] if isinstance(child_index, int) and 0 <= child_index < len(registry['objects']) else None
                        name = child.get('Field_0c59fa06') if child else None
                        present = field in block
                        registry_value = child.get('Field_42c8b257') if child else None
                        compared_value = registry_value
                        if isinstance(registry_value, dict) and '$boxedValue' in registry_value and 'value' in registry_value:
                            compared_value = registry_value['value']
                        scalar = present and child is not None and 'Field_42c8b257' in child and not isinstance(block[field], (dict, list)) and not isinstance(compared_value, (dict, list))
                        status = ('equal-scalar' if block[field] == compared_value else 'different-scalar') if scalar else ('present-nonscalar-or-no-leaf-value' if present else 'absent-field')
                        if child is None:
                            status = 'null-child-slot' if child_ref is None else 'missing-child'
                        counts[status] += 1
                        record = base | {'anchorName': anchor.get('Field_0c59fa06'), 'arrayIndex': i,
                                         'field': field, 'name': name, 'childGuid': child.get('$guid') if child else None,
                                         'status': status, 'fieldValue': block.get(field),
                                         'registryValue': registry_value, 'comparedRegistryValue': compared_value,
                                         'registryLayoutProvisional': bool(anchor.get('$layoutAmbiguous'))}
                        out.write(json.dumps(record, ensure_ascii=True) + '\n')
                        if name and status == 'equal-scalar':
                            names.setdefault(field, Counter())[name.rsplit('.', 1)[-1]] += 1
    report = {'schemaVersion': 1, 'readerSha256': sha(reader_path), 'scriptSha256': sha(__file__),
              'registry': {k: reg[k] for k in ('route', 'raw_sha256', 'descriptor_sha256', 'head')},
              'inventorySha256': sha(args.inventory), 'sourceRoots': len(sources), 'counts': dict(counts),
              'problems': problems, 'namesFromEqualScalarPairs': {k: dict(v) for k, v in names.items()},
              'detailsPath': str(args.details.resolve()), 'detailsSha256': sha(args.details),
              'limits': ['Serialized child/hash association; no runtime application or units proved.',
                         'Registry duplicate-layout warnings retained.', 'Different scalar defaults are retained as exceptions, not corrected.']}
    args.out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'counts': dict(counts), 'problems': len(problems), 'namedHashes': len(names)}))


if __name__ == '__main__':
    if '--manifest' in sys.argv[1:]:
        runpy.run_path(str(Path(__file__).with_name('frosty-registry-association.py')), run_name='__main__')
    else:
        main()

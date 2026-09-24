"""Check proposed skin scope evidence against fresh raw bodies; no ledger writes."""
import argparse
from collections import Counter
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def at(value, pointer):
    for key in pointer.strip('/').split('/'):
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value


def warning_counts(value):
    result = Counter()
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {'$unknownType', '$undecoded', '$unresolvedRef', '$unresolvedArray',
                       '$unresolvedTypeRef', '$badArrayCount', '$badString',
                       '$boxedValueRef', '$layoutAmbiguous', '$unresolvedBoxedValue'}:
                result[key] += 1
            result.update(warning_counts(child))
    elif isinstance(value, list):
        for child in value:
            result.update(warning_counts(child))
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    for name in ('database', 'summary', 'out'):
        ap.add_argument('--' + name, required=True, type=Path)
    args = ap.parse_args()
    assert not args.out.exists()
    summary = json.loads(args.summary.read_text(encoding='utf-8'))
    details = Path(summary['jsonl_path'])
    assert sha(details) == summary['jsonl_sha256']
    rows = [json.loads(line) for line in details.open(encoding='utf-8')]
    by_guid = {r['file_guid']: r for r in rows if r['file_guid']}
    assert len(by_guid) == len([r for r in rows if r['file_guid']])
    with sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        captures = [dict(r) for r in db.execute('select * from captures')]
        assets = {r['file_guid']: dict(r) for r in db.execute('select * from assets')}
    db.close()
    by_capture = {(r['route'].casefold(), r['raw_sha256']): r for r in captures}
    decoder_path = Path(__file__).with_name('frosty-ebx-decode.py')
    decoder = runpy.run_path(str(decoder_path))
    descriptors, checked, warnings = {}, set(), Counter()

    @lru_cache(maxsize=96)
    def read(route, raw_sha):
        cap = by_capture[(route.casefold(), raw_sha)]
        desc_sha = cap['descriptor_sha256']
        if desc_sha not in descriptors:
            assert sha(cap['descriptor_path']) == desc_sha
            descriptors[desc_sha] = decoder['type_descriptors'](cap['descriptor_path'])
        ebx = decoder['Ebx'](cap['raw_path'], descriptors[desc_sha])
        assert ebx.sha256 == raw_sha, route
        body = ebx.decode()
        file_guid = decoder['_guid'](ebx.file_guid)
        assert assets[file_guid]['route'].casefold() == route.casefold()
        if (route, raw_sha) not in checked:
            checked.add((route, raw_sha))
            body_warnings = warning_counts(body['objects'])
            warnings['bodiesWithWarnings'] += bool(body_warnings)
            warnings.update(body_warnings)
        return body['objects'], file_guid, cap

    def assignment(ev, expected_guid):
        objects, _, cap = read(ev['owner_route'], ev['owner_sha256'])
        assert cap['head'] == ev['owner_head']
        assert cap['descriptor_sha256'] == ev['owner_descriptor_sha256']
        obj = objects[ev['object_index']]
        assert obj['$class'] == 'Class_0653128c'
        assert ev['pointer'] == '/Field_7085d5e0'
        target = at(obj, ev['pointer'])['$import']
        assert target['fileGuid'] == expected_guid
        row = by_guid[expected_guid]
        target_objects, target_guid, _ = read(row['route'], ev['raw_sha256'])
        assert target_guid == expected_guid
        assert any(x.get('$guid') == target['classGuid'] and
                   x['$class'] == 'Class_bc0062dc' for x in target_objects)
        return (ev['owner_route'], ev['object_index'], expected_guid, target['classGuid'])

    anchors, visual_imports, consumers = set(), set(), []
    for index, row in enumerate(rows):
        guid, capture = row['file_guid'], row['capture']
        if capture:
            objects, actual_guid, cap = read(row['route'], capture['raw_sha256'])
            assert actual_guid == guid
            assert cap['head'] == capture['head']
            assert cap['descriptor_sha256'] == capture['descriptor_sha256']
            assert objects[0]['$class'] == row['declared_root_class']
        for ev in row['evidence']:
            if ev['kind'] == 'same_skin_family':
                family = ev['family'].casefold() + '/'
                assert row['route'].casefold().startswith(family)
                assert '/art/skins/' in family
                assert ev['anchor_assignments']
                for anchor in ev['anchor_assignments']:
                    assert anchor['wrapper_route'].casefold().startswith(family)
                    assert by_guid[anchor['target_file_guid']]['route'].casefold() == anchor['wrapper_route'].casefold()
                    anchors.add(assignment(anchor, anchor['target_file_guid']))
            elif ev['kind'] == 'wrapper_assignment':
                anchors.add(assignment(ev, guid))
            elif ev['kind'] == 'visual_collection_import':
                owner, _, cap = read(ev['owner_route'], ev['owner_sha256'])
                assert cap['head'] == ev['owner_head']
                assert cap['descriptor_sha256'] == ev['owner_descriptor_sha256']
                obj = owner[ev['object_index']]
                assert obj['$class'] == 'Class_0653128c'
                assert ev['pointer'].startswith('/Field_20933c0b/')
                target = at(obj, ev['pointer'])['$import']
                assert target == {'fileGuid': ev['guid'], 'classGuid': ev['target_object_guid']}
                if capture:
                    assert target['fileGuid'] == guid
                    assert any(x.get('$guid') == target['classGuid'] for x in objects)
                visual_imports.add((ev['owner_route'], ev['object_index'], ev['pointer'], target['fileGuid'], target['classGuid']))
            else:
                raise AssertionError(ev['kind'])
        if row['disposition'] == 'excluded-cosmetic':
            assert not row['functional_consumers']
            if row['rule_id'] == 'DEF_MESH_ASSIGNED_SKIN_WRAPPER':
                assert row['declared_root_class'] == 'Class_bc0062dc'
                assert any(e['kind'] == 'wrapper_assignment' for e in row['evidence'])
            else:
                assert row['declared_root_class'] in summary['visual_classes']
        for consumer in row['functional_consumers']:
            owner, _, _ = read(consumer['route'], consumer['raw_sha256'])
            matches = [o for o in owner if o['$class'] == consumer['class_name'] and
                       at(o, consumer['pointer']).get('$import', {}).get('fileGuid') == guid]
            assert len(matches) == 1
            target = at(matches[0], consumer['pointer'])['$import']
            assert any(o.get('$guid') == target['classGuid'] for o in objects)
            parent = at(matches[0], consumer['pointer'].rsplit('/', 1)[0])
            consumers.append({'route': row['route'], 'consumer': consumer,
                              'target': target, 'assignmentTag': parent.get('Field_f9ffb5fc')})
        if (index + 1) % 2000 == 0:
            print(json.dumps({'rowsChecked': index + 1, 'rawBodiesChecked': len(checked)}), flush=True)
    result = {'schemaVersion': 1, 'date': '2026-09-23', 'status': 'raw-evidence-validated-scope-pending',
              'summary': {'path': str(args.summary), 'sha256': sha(args.summary)},
              'details': {'path': str(details), 'sha256': sha(details)},
              'validatorSha256': sha(__file__), 'decoderSha256': sha(decoder_path),
              'rows': len(rows), 'catalogAssets': len(by_guid),
              'unknownTargetRows': sum(not r['file_guid'] for r in rows),
              'rawBodiesChecked': len(checked), 'warningCounts': dict(warnings),
              'exactWrapperAssignments': len(anchors), 'exactVisualCollectionImports': len(visual_imports),
              'dispositions': dict(Counter(r['disposition'] for r in rows)),
              'retainedConsumerAssignments': consumers,
              'limits': 'Raw evidence check only. Retain-functional label requires named slot review. Scope exclusions require parent acceptance. No runtime claim.'}
    args.out.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'retainedConsumerAssignments'}))


if __name__ == '__main__':
    main()

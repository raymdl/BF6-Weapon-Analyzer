"""Join secondary action unlocks to raw WB parts and their firing-data references."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def walk(value, path=''):
    if isinstance(value, dict):
        yield path, value
        for key, child in value.items():
            yield from walk(child, path + '/' + key)
    elif isinstance(value, list):
        for i, child in enumerate(value):
            yield from walk(child, path + '/' + str(i))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    for name in ('database', 'actions', 'roster', 'out'):
        ap.add_argument('--' + name, type=Path, required=True)
    args = ap.parse_args()
    assert not args.out.exists()
    actions = [json.loads(line) for line in args.actions.open(encoding='utf-8')]
    roster = json.loads(args.roster.read_text(encoding='utf-8'))
    primary = {w['roots']['Ability']['rawCapture']['path'].casefold(): w for w in roster['roots']}
    actions = [r for r in actions if r['body']['Field_2717f5c2'] is not None]
    assert len(actions) == 135
    selector_guids = {x['$import']['classGuid'] for r in actions for x in r['body']['Field_f1f008ba']}
    db = sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    captures = [dict(r) for r in db.execute('select * from captures').fetchall()]
    assets = {r['file_guid']: dict(r) for r in db.execute('select * from assets').fetchall()}
    # The index only narrows candidates. Every matched part is freshly decoded below.
    part_rows = db.execute("select o.object_guid,o.body_json,c.route,c.raw_sha256,a.file_guid from objects o join captures c on c.id=o.capture_id join assets a on a.route=c.route where o.class_name='Class_897c99a7'").fetchall()
    db.close()
    possible_parts = set()
    for r in part_rows:
        body = json.loads(r['body_json'])
        if selector_guids.intersection(body['Field_819acc98']):
            possible_parts.add((r['file_guid'], r['object_guid']))
    del part_rows
    caps = {(r['route'].casefold(), r['raw_sha256']): r for r in captures}
    newest = {}
    for cap in captures:
        if cap['route'].casefold() not in newest or cap['head'] > newest[cap['route'].casefold()]['head']:
            newest[cap['route'].casefold()] = cap
    decoder_path = Path(__file__).with_name('frosty-ebx-decode.py')
    decoder = runpy.run_path(str(decoder_path))
    decoded, descriptors = {}, {}

    def read(cap):
        key = cap['raw_path']
        if key not in decoded:
            ds = cap['descriptor_sha256']
            if ds not in descriptors:
                assert sha(cap['descriptor_path']) == ds
                descriptors[ds] = decoder['type_descriptors'](cap['descriptor_path'])
            ebx = decoder['Ebx'](key, descriptors[ds])
            assert ebx.sha256 == cap['raw_sha256']
            objects = ebx.decode()['objects']
            assert assets[decoder['_guid'](ebx.file_guid)]['route'].casefold() == cap['route'].casefold()
            decoded[key] = objects
        return decoded[key]

    def resolve(imp):
        asset = assets[imp['fileGuid']]
        cap = newest[asset['route'].casefold()]
        objects = read(cap)
        hits = [(i, o) for i, o in enumerate(objects) if o.get('$guid') == imp['classGuid']]
        assert len(hits) == 1, imp
        return cap, objects, hits[0][0], hits[0][1]

    def identity(cap):
        return {k: cap[k] for k in ('route', 'raw_sha256', 'head', 'descriptor_sha256')}

    weapon_parts, packages, results = {}, {}, []
    for action in actions:
        weapon = primary[action['sourceRoute'].casefold()]
        key = weapon['internalId']
        if key not in weapon_parts:
            wb = weapon['roots']['WB']['rawCapture']
            cap = caps[(wb['path'].casefold(), wb['sha256'])]
            objects = read(cap)
            entries = []
            for oi, obj in enumerate(objects):
                for n, ref in enumerate(obj.get('Field_0cd9f20f', [])):
                    location = {'wb': identity(cap), 'objectIndex': oi, 'pointer': '/Field_0cd9f20f/' + str(n)}
                    if '$import' in ref:
                        imp = ref['$import']
                        if (imp['fileGuid'], imp['classGuid']) not in possible_parts:
                            continue
                        pc, po, pi, part = resolve(imp)
                    elif '$ref' in ref:
                        pc, po, pi = cap, objects, ref['$ref']
                        part = po[pi]
                        if not selector_guids.intersection(part.get('Field_819acc98', [])):
                            continue
                    else:
                        raise AssertionError(ref)
                    assert part['$class'] == 'Class_897c99a7'
                    package_key = pc['route'] + '#' + (part.get('$guid') or 'object:' + str(pi))
                    if package_key not in packages:
                        reachable, pending = set(), [pi]
                        while pending:
                            index = pending.pop()
                            if index in reachable:
                                continue
                            reachable.add(index)
                            pending.extend(v['$ref'] for _, v in walk(po[index]) if '$ref' in v)
                        external = []
                        for index in sorted(reachable):
                            for pointer, value in walk(po[index]):
                                if '$import' in value:
                                    imp = value['$import']
                                    tc, to, ti, target = resolve(imp)
                                    external.append({'objectIndex': index, 'pointer': pointer, **imp,
                                                     'target': identity(tc), 'targetObjectIndex': ti,
                                                     'targetClass': target['$class']})
                        packages[package_key] = {'source': identity(pc), 'partObjectIndex': pi,
                                                 'partObjectGuid': part['$guid'],
                                                 'selectors': part['Field_819acc98'],
                                                 'reachableObjects': [{'index': i, 'body': po[i]} for i in sorted(reachable)],
                                                 'externalReferences': external}
                    entries.append({**location, 'packageKey': package_key, 'selectors': part['Field_819acc98']})
            weapon_parts[key] = entries
        selectors = []
        for n, ref in enumerate(action['body']['Field_f1f008ba']):
            imp = ref['$import']
            cap, _, _, obj = resolve(imp)
            selectors.append({'pointer': '/Field_f1f008ba/' + str(n), **imp, 'source': identity(cap),
                              'matches': [e for e in weapon_parts[key] if imp['classGuid'] in e['selectors']]})
        sru_cap, _, _, sru = resolve(action['body']['Field_2717f5c2']['$import'])
        assert sru['$class'] == 'Class_2717f5c2'
        members = [x['$import'] for x in sru['Field_e0790295']]
        results.append({'weapon': key, 'action': action, 'secondarySelectors': selectors,
                        'sru': {'source': identity(sru_cap), 'objectGuid': sru['$guid'],
                                'members': [{**m, 'route': assets[m['fileGuid']]['route']} for m in members]}})
    report = {'schemaVersion': 1, 'date': '2026-09-23',
              'sources': {'actions': {'path': str(args.actions), 'sha256': sha(args.actions)},
                          'roster': {'path': str(args.roster), 'sha256': sha(args.roster)}},
              'decoderSha256': sha(decoder_path), 'readerSha256': sha(__file__),
              'counts': {'actions': len(results), 'weapons': len(weapon_parts),
                         'secondarySelectorReferences': sum(len(r['secondarySelectors']) for r in results),
                         'selectorPartMatches': sum(len(s['matches']) for r in results for s in r['secondarySelectors']),
                         'unmatchedSelectors': sum(not s['matches'] for r in results for s in r['secondarySelectors']),
                         'matchedPackages': len(packages), 'freshRawBodiesDecoded': len(decoded)},
              'actions': results, 'packages': packages,
              'limits': 'Exact serialized joins and reachable part contents only. Secondary list application, SRU semantics, condition evaluation and runtime switching remain open. Fresh target resolution does not fully review target fields. Layout warnings are retained.'}
    args.out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report['counts']))


if __name__ == '__main__':
    main()

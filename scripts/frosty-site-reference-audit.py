"""Review retained reference leaves without treating them as active simulator inputs."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import xml.etree.ElementTree as ET


def ref(p):
    return {'path': str(p.resolve()), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--xml-root', required=True, type=Path)
    ap.add_argument('--out-dir', required=True, type=Path)
    ap.add_argument('--summary', required=True, type=Path)
    args = ap.parse_args()
    repo = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location('inv', repo / 'scripts/frosty-site-input-inventory.py')
    inv = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(inv)
    out = args.out_dir / 'site-reference-leaf-review.jsonl'
    if out.exists() or args.summary.exists():
        ap.error('Use new output paths.')
    args.out_dir.mkdir(parents=True, exist_ok=True)
    rows, inputs, source_files = [], [], {}

    def add(file, path, value, status, evidence, uncertainty):
        rows.append({'siteFile': file, 'pointer': inv.pointer(path), 'siteValue': value,
                     'reviewStatus': status, 'sourceSiteAgreement': 'match' if status.startswith('sourced') else 'not-applicable',
                     'sourceFieldPath': evidence.get('pointer', 'see evidence'),
                     'remainingUncertainty': uncertainty, 'evidence': evidence})

    receipt = repo / 'reference-data/provenance/frosty-site-recoil-2026-09-23.json'
    rd = json.loads(receipt.read_text())
    detail = Path(rd['externalDetail']['path'])
    assert ref(detail)['sha256'] == rd['externalDetail']['sha256']
    raw = json.loads(detail.read_text())['rawFields']
    names = {'RECOIL_DEC': 'RecoilDecreaseFactor', 'RECOIL_DEC_TEXP': 'RecoilDecreaseTimeExponent',
             'RECOIL_DEC_EXP': 'RecoilDecreaseExponent'}
    file = 'data/recoil_decay.json'
    inputs.append(ref(repo / file))
    data = json.loads((repo / file).read_text())
    for path, _, value in inv.leaves(data):
        if path[0] == '_comment':
            add(file, path, value, 'project-metadata', {'role': 'Retained descriptive comment'}, 'No game field expected for prose.')
            continue
        table, wid = path
        matches = [r for r in raw if r['siteWeapon'] == wid and r['aim'] == 'ads' and r['fieldName'] == names[table]]
        assert len(matches) == 1, (path, len(matches))
        field = matches[0]
        assert abs(field['sourceValue'] - value) < 0.00001, path
        add(file, path, value, 'sourced-configuration', dict(field, sourceReceipt=str(receipt)),
            'Retained map is loaded into context but has no read consumer in current sim/core.js; active recoil groups are checked separately.')

    file = 'data/weapon-role-tags.json'
    data = json.loads((repo / file).read_text())
    inputs.append(ref(repo / file))
    strings_path = args.xml_root / (data['source']['strings']['asset'] + '.strings.tsv')
    strings = dict(line.split('\t', 1) for line in strings_path.read_text(encoding='utf-8-sig').splitlines() if '\t' in line)
    source_files[str(strings_path)] = ref(strings_path)
    records, trees = {}, {}
    for wid, w in data['weapons'].items():
        for index, record in enumerate(w['records']):
            asset = record['asset']
            if asset not in trees:
                p = args.xml_root / (asset + '.xml')
                trees[asset] = {o.get('Guid'): o for o in ET.parse(p).getroot()}
                source_files[str(p)] = ref(p)
            objects = trees[asset]
            obj = objects[record['guid']]
            assert obj.findtext('Field_55aded8d') == record['label']
            ids = [objects[m.text.split()[-1]].findtext('Field_3d34898a')[2:].upper()
                   for m in obj.find('Field_8c7f991f')]
            tags = [strings[i] for i in ids]
            assert tags == record['tags'], (wid, index, tags)
            records[wid, index] = {'sourceAsset': asset, 'objectGuid': record['guid'],
                                   'pointer': 'Class_593f6146/Field_8c7f991f -> Class_fbe1d3bc/Field_3d34898a',
                                   'stringIds': ids, 'tags': tags, 'xml': source_files[str(args.xml_root / (asset + '.xml'))]}
    for path, _, value in inv.leaves(data):
        if path[0] != 'weapons':
            add(file, path, value, 'project-metadata', {'role': 'Historical provenance, schema or grouping'}, 'File is not loaded by current site UI.')
            continue
        _, wid, group, *tail = path
        if group in ('style', 'range', 'firing'):
            col = ('style', 'range', 'firing').index(group)
            selected = data['weapons'][wid][group]
            matches = [r for (w, _), r in records.items() if w == wid and r['stringIds'][col] == selected['id']]
            assert matches and strings[selected['id']] == selected['text'], path
            add(file, path, value, 'sourced-ui-xml', {'pointer': matches[0]['pointer'], 'candidates': matches},
                'No site consumer. Mini Scout record selection retains the prior panel choice; current live selection not proven.')
        elif group == 'records':
            rec = records[wid, int(tail[0])]
            status = 'project-metadata' if tail[1] == 'primary' else 'sourced-ui-xml'
            add(file, path, value, status, rec, 'Metadata association only; no mechanics or current availability claim.')
        elif group == 'panelEvidence':
            add(file, path, value, 'retained-observation', {'pointer': 'Mini Scout variant selection', 'source': value},
                'Dated operator panel statement; no new current-build capture. No site consumer.')
        else:
            raise ValueError(path)
    out.write_text(''.join(json.dumps(row) + '\n' for row in rows))
    result = {'date': '2026-09-23', 'inputs': inputs, 'details': ref(out),
              'sourceFiles': list(source_files.values()), 'sourceRecoilReceipt': ref(receipt),
              'rowCounts': dict(Counter(r['reviewStatus'] for r in rows)), 'script': ref(Path(__file__)),
              'liveness': {'recoil_decay': 'ui/app.js loads and passes maps; sim/core.js only declares context fields, without read consumers.',
                           'weapon_role_tags': 'No sim/ui import or fetch; validation/reference data only.'},
              'limits': ['Role-tag checks use existing XML and localized strings, not new raw EBX verification.',
                         'Historical provenance text is preserved as a statement about that prior export.']}
    args.summary.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result['rowCounts']))


if __name__ == '__main__':
    main()

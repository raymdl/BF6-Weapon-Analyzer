"""Compare heavy/cryo barrel ADS spread fields to exact selector-bound GBM objects."""
import argparse
import hashlib
import json
import runpy
import sqlite3
import struct
import xml.etree.ElementTree as ET
from pathlib import Path


SITE_TO_SOURCE = {
    'adsSpreadIncMult': ('Field_0084b1d1', 'Field_5695ee1c'),
    'adsSpreadFiringDecCoefMult': ('Field_2ca8533e', 'Field_98a799ba'),
    'adsSpreadFiringDecOffsetMult': ('Field_1b9eef5d', 'Field_5695ee1c'),
    'adsSpreadNotFiringDecOffsetMult': ('Field_4d3f0635', 'Field_5695ee1c'),
}
ADS_BRANCH = 'Field_6b84de87'
ADS_CONTEXTS = ('Field_447d6d51', 'Field_0a160c57')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def xml_field_path(root, path):
    nodes = [root]
    for part in path.split('/'):
        matches = []
        for node in nodes:
            matches.extend(n for n in node.iter() if n is not node and n.tag == part)
        if not matches:
            return None
        nodes = matches
    return nodes[0].text


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root', type=Path, required=True)
    ap.add_argument('--report-dir', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    repo = Path(__file__).resolve().parents[1]
    if args.out.exists():
        ap.error('Use a new output path.')
    reader = runpy.run_path(str(repo / 'scripts/frosty-ebx-decode.py'))
    locate = runpy.run_path(str(repo / 'scripts/frosty-site-recoil-audit.py'))['locate']
    db = sqlite3.connect(f'{(args.report_dir / "coverage-decoder-v5.sqlite").resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    data = json.loads((repo / 'data/attachments.json').read_text())
    weapons = {w['id'] for w in json.loads((repo / 'data/weapons.json').read_text())}
    mapping = json.loads((repo / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json').read_text())
    choices = {(r['weapon'], r['slot'], r['attachment']): r for r in mapping['choices']}

    def cap(route):
        row = db.execute('select * from captures where route=? collate nocase', (route,)).fetchone()
        return dict(row) if row else None

    descriptor_cache, ebx_cache = {}, {}

    def raw_scalar(capture, guid, path):
        key = (capture['id'], guid.lower())
        if key not in ebx_cache:
            if capture['descriptor_path'] not in descriptor_cache:
                descriptor_cache[capture['descriptor_path']] = reader['type_descriptors'](capture['descriptor_path'])
            ebx_cache[key] = reader['Ebx'](capture['raw_path'], descriptor_cache[capture['descriptor_path']])
        ebx = ebx_cache[key]
        decoded = ebx.decode()
        found = db.execute('select object_index,class_name,body_json from objects where capture_id=? and object_guid=?',
                           (capture['id'], guid)).fetchall()
        if len(found) != 1:
            raise ValueError(f'Expected one captured source object {capture["route"]}#{guid}; found {len(found)}')
        obj = found[0]
        ob = obj['object_index']
        cls = ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']])
        parts = path.split('/')
        offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[ob], parts, reader)
        fmt = reader['SIMPLE'].get(kind)
        if not fmt:
            raise ValueError(f'Expected scalar field: {capture["route"]}/{path}')
        raw_value = struct.unpack_from(fmt[0], ebx.data, offset)[0]
        body = json.loads(obj['body_json'])
        value = decoded['objects'][ob]
        for part in parts:
            value, body = value[part], body[part]
        if abs(float(raw_value) - float(value)) > 1e-6 or abs(float(raw_value) - float(body)) > 1e-6:
            raise ValueError(f'Raw/decoded source mismatch: {capture["route"]}/{path}')
        return {'sourceValue': raw_value, 'byteOffset': offset,
                'rawBytesHex': ebx.data[offset:offset + fmt[1]].hex(), 'rawEqualsDecoded': True,
                'objectClass': obj['class_name']}

    rows = []
    for idx, item in enumerate(data['BARRELS']):
        site_fields = {key: item[key] for key in SITE_TO_SOURCE if key in item}
        if not site_fields:
            continue
        aid = item['id']
        selected = []
        for wid, slots in data['WEAPON_ATTS'].items():
            if wid not in weapons or aid not in slots.get('barrel', []):
                continue
            choice = choices.get((wid, 'barrel', aid))
            if not choice or not choice.get('sources'):
                raise ValueError(f'No exact attachment mapping: {wid}/barrel/{aid}')
            src = choice['sources'][0]
            selectors = [s for s in src.get('selectors', []) if '/_Barrel/' in s['asset']]
            if len(selectors) != 1:
                raise ValueError(f'Expected one exact barrel selector: {wid}/{aid}')
            selector = selectors[0]
            gs_path = next(iter((args.root / f'{src["source"]}.xml').parent.glob('GS_*.xml')), None)
            if gs_path is None:
                raise ValueError(f'No GS source file for {wid}/{aid}')
            gs_root = ET.parse(gs_path).getroot()
            parents = {child: parent for parent in gs_root.iter() for child in parent}
            bound = []
            for cls in (n for n in gs_root.iter() if n.tag == 'Class_539cff9b'):
                for node in cls.iter():
                    if (node.findtext('Field_6d011165', '').lower() != selector['guid'].lower()
                            or node.find('Field_2f0e5b83') is None):
                        continue
                    owner = node
                    while owner in parents and parents[owner] is not cls:
                        owner = parents[owner]
                    ref = node.findtext('Field_2f0e5b83') or ''
                    left, guid_part = ref.rsplit(' [', 1)
                    route = left.removeprefix('[Ebx] ').strip()
                    guid = guid_part.rstrip(']').lower()
                    bound.append({'ownerCollection': owner.tag, 'index': node.findtext('Field_3f680d24'),
                                  'ref': ref, 'route': route, 'guid': guid})
            ads = [b for b in bound if 'GBM_Increase_ADS_' in b['route']]
            selection = {'siteWeapon': wid, 'selectorAsset': selector['asset'], 'selectorGuid': selector['guid'],
                         'gsXml': gs_path.relative_to(args.root).as_posix(),
                         'gsXmlSha256': sha(gs_path), 'selectorBoundRecords': bound,
                         'adsModifierEvidence': []}
            for bound_row in ads:
                route, guid = bound_row['route'], bound_row['guid']
                raw_xml = (args.root / f'{route}.xml').read_bytes()
                xml_obj = next((n for n in ET.fromstring(raw_xml) if n.get('Guid', '').lower() == guid), None)
                if xml_obj is None or xml_obj.tag != 'Class_5e5631ff':
                    raise ValueError(f'Unexpected ADS GBM object: {route}#{guid}')
                capture = cap(route)
                if not capture:
                    raise ValueError(f'No exact current capture for bound ADS GBM {route}')
                fields = {}
                for site_field, (target, operand) in SITE_TO_SOURCE.items():
                    contexts = {}
                    for context in ADS_CONTEXTS:
                        path = f'{ADS_BRANCH}/{context}/{target}/{operand}'
                        raw = raw_scalar(capture, guid, path)
                        xml_value = xml_field_path(xml_obj, path)
                        if xml_value is None or abs(float(xml_value) - float(raw['sourceValue'])) > 1e-6:
                            raise ValueError(f'XML/raw modifier mismatch: {route}/{path}')
                        contexts[context] = {'sourceFieldPath': f'Class_5e5631ff/{path}', **raw}
                    fields[site_field] = {'contextValues': contexts}
                selection['adsModifierEvidence'].append({
                    'ownerCollection': bound_row['ownerCollection'], 'gsBindingIndex': bound_row['index'],
                    'modifierRoute': route, 'modifierGuid': guid, 'captureId': capture['id'],
                    'rawSha256': capture['raw_sha256'], 'descriptorSha256': capture['descriptor_sha256'],
                    'xmlSha256': hashlib.sha256(raw_xml).hexdigest(), 'fields': fields})
            selected.append(selection)
        comparisons = {}
        for field, site in site_fields.items():
            values = [v['sourceValue'] for s in selected for e in s['adsModifierEvidence']
                      for v in e['fields'][field]['contextValues'].values()]
            distinct = sorted(set(values))
            comparisons[field] = {'siteValue': site, 'sourceValues': distinct,
                'rawOperandCount': len(values),
                'status': 'match' if distinct and all(abs(float(v) - float(site)) <= 1e-6 for v in distinct)
                    else 'no-selector-bound-ads-gbm' if not distinct else 'mismatch'}
        rows.append({'sitePointer': f'/BARRELS/{idx}', 'attachment': aid, 'siteFields': site_fields,
                     'selectedSiteWeaponCount': len(selected), 'sourceSelections': selected,
                     'fieldComparisons': comparisons,
                     'limit': 'Selector-bound ADS GBM operands and raw field bytes are checked. GS modifier priority/composition and runtime application remain distinct.'})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('w', encoding='utf-8', newline='\n') as f:
        for row in rows:
            f.write(json.dumps(row, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'siteEntries': len(rows), 'selectedChoices': sum(r['selectedSiteWeaponCount'] for r in rows),
        'fields': sum(len(r['fieldComparisons']) for r in rows),
        'mismatches': sum(c['status'] == 'mismatch' for r in rows for c in r['fieldComparisons'].values()),
        'details': str(args.out.resolve()), 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()

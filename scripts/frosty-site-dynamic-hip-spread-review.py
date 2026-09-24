"""Compare laser/light site hip-spread factors to exact selector-bound GBM fields."""
import argparse
import hashlib
import json
import runpy
import sqlite3
import struct
import xml.etree.ElementTree as ET
from pathlib import Path


SITE_TO_SOURCE = {
    'hipSpreadIncMult': ('Field_0084b1d1', 'Field_5695ee1c'),
    'hipSpreadFiringDecCoefMult': ('Field_2ca8533e', 'Field_98a799ba'),
    'hipSpreadFiringDecOffsetMult': ('Field_1b9eef5d', 'Field_5695ee1c'),
    'hipSpreadNotFiringDecOffsetMult': ('Field_4d3f0635', 'Field_5695ee1c'),
    'hipSpreadIdleDecOffsetMult': ('Field_aa558d2b', 'Field_5695ee1c'),
}
BRANCHES = ('Field_447d6d51', 'Field_0a160c57')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root', type=Path, required=True, help='Current XML overlay')
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
    catalog = json.loads((repo / 'data/attachments.json').read_text())
    site_weapons = {w['id'] for w in json.loads((repo / 'data/weapons.json').read_text())}
    mapping = json.loads((repo / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json').read_text())
    choices = {(r['weapon'], r['slot'], r['attachment']): r for r in mapping['choices']}
    descriptor_cache, ebx_cache, source_cache = {}, {}, {}

    def xml_field_path(root, path):
        """Follow descriptor field tags while allowing XML Struct_* wrappers."""
        nodes = [root]
        for part in path.split('/'):
            next_nodes = []
            for node in nodes:
                next_nodes.extend(n for n in node.iter() if n is not node and n.tag == part)
            if not next_nodes:
                return None
            nodes = next_nodes
        return nodes[0].text

    def cap(route):
        r = db.execute('select * from captures where route=? collate nocase', (route,)).fetchone()
        return dict(r) if r else None

    def scalar(capture, guid, path):
        key = (capture['id'], guid.lower())
        if key not in ebx_cache:
            if capture['descriptor_path'] not in descriptor_cache:
                descriptor_cache[capture['descriptor_path']] = reader['type_descriptors'](capture['descriptor_path'])
            ebx_cache[key] = reader['Ebx'](capture['raw_path'], descriptor_cache[capture['descriptor_path']])
        ebx = ebx_cache[key]
        decoded = ebx.decode()
        objrows = db.execute('select object_index,class_name,body_json from objects where capture_id=? and object_guid=?',
                             (capture['id'], guid)).fetchall()
        if len(objrows) != 1:
            raise ValueError(f'Expected one raw object {capture["route"]}#{guid}; found {len(objrows)}')
        obj = objrows[0]
        ob = obj['object_index']
        parts = path.split('/')
        cls = ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']])
        offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[ob], parts, reader)
        fmt = reader['SIMPLE'].get(kind)
        if not fmt:
            raise ValueError(f'Non-scalar field: {capture["route"]}/{path}')
        raw_value = struct.unpack_from(fmt[0], ebx.data, offset)[0]
        body = json.loads(obj['body_json'])
        value = decoded['objects'][ob]
        for part in parts:
            value = value[part]
            body = body[part]
        if abs(float(raw_value) - float(value)) > 1e-6 or abs(float(raw_value) - float(body)) > 1e-6:
            raise ValueError(f'raw/XML-decode mismatch: {capture["route"]}/{path}')
        return {'sourceValue': raw_value, 'byteOffset': offset,
                'rawBytesHex': ebx.data[offset:offset + fmt[1]].hex(), 'objectGuid': guid,
                'class': obj['class_name'], 'rawEqualsDecoded': True}

    def source_binding(choice):
        src = choice['sources'][0]
        selector_rows = [s for s in src.get('selectors', []) if ('_RightRail/Light/' in s['asset'] or '_RightRail/LaserLight/' in s['asset'])]
        if len(selector_rows) != 1:
            raise ValueError(f'Expected one exact rail selector for {choice["weapon"]}/{choice["attachment"]}')
        selector = selector_rows[0]
        folder = (args.root / f'{src["source"]}.xml').parent
        gsfiles = list(folder.glob('GS_*.xml'))
        if len(gsfiles) != 1:
            raise ValueError(f'Expected one GS source file in {folder}')
        gs_path = gsfiles[0]
        gs_root = ET.parse(gs_path).getroot()
        bindings = [n for n in gs_root.iter()
                    if n.findtext('Field_6d011165', '').lower() == selector['guid'].lower()
                    and 'GBM_Increase_Hip_' in n.findtext('Field_2f0e5b83', '')]
        if not bindings:
            raise ValueError(f'Expected at least one exact GBM hip-increase binding for {choice["weapon"]}/{choice["attachment"]}; found 0')
        selector_cap = cap(selector['asset'])
        if not selector_cap:
            raise ValueError(f'No exact raw selector-wrapper capture: {selector["asset"]}')
        wrapper = db.execute('select object_guid from objects where capture_id=? and object_guid=?',
                             (selector_cap['id'], selector['guid'])).fetchone()
        if not wrapper:
            raise ValueError(f'Selector GUID missing from raw wrapper capture: {selector["guid"]}')
        results = []
        for binding in bindings:
            ref = binding.findtext('Field_2f0e5b83')
            left, guid = ref.rsplit(' [', 1)
            route = left.removeprefix('[Ebx] ').strip()
            obj_guid = guid.rstrip(']').lower()
            raw = (args.root / f'{route}.xml').read_bytes()
            xml_obj = next((n for n in ET.fromstring(raw) if n.get('Guid', '').lower() == obj_guid), None)
            if xml_obj is None or xml_obj.tag != 'Class_5e5631ff' or xml_obj.findtext('Field_94752c29') != 'Field_84e57075':
                raise ValueError(f'Invalid GBM schema: {route}#{obj_guid}')
            capture = cap(route)
            if not capture:
                raise ValueError(f'No exact raw GBM capture: {route}')
            result = {'siteWeapon': choice['weapon'], 'selectorAsset': selector['asset'], 'selectorGuid': selector['guid'],
                      'selectorCaptureId': selector_cap['id'], 'selectorRawSha256': selector_cap['raw_sha256'],
                      'gsSourceXml': gs_path.relative_to(args.root).as_posix(),
                      'gsBindingIndex': binding.findtext('Field_3f680d24'), 'gbmRoute': route,
                      'gbmGuid': obj_guid, 'gbmCaptureId': capture['id'], 'gbmRawSha256': capture['raw_sha256'],
                      'gbmDescriptorSha256': capture['descriptor_sha256'], 'gbmXmlSha256': hashlib.sha256(raw).hexdigest(),
                      'branches': {}}
            for branch in BRANCHES:
                branch_values = {}
                for site_field, (target_field, operand_field) in SITE_TO_SOURCE.items():
                    field_path = f'Field_7b609515/{branch}/{target_field}/{operand_field}'
                    ev = scalar(capture, obj_guid, field_path)
                    xml_value = xml_field_path(xml_obj, field_path)
                    if xml_value is None or abs(float(xml_value) - float(ev['sourceValue'])) > 1e-6:
                        raise ValueError(f'XML/raw modifier value mismatch: {route}/{field_path}')
                    branch_values[site_field] = {'sourceFieldPath': f'Class_5e5631ff/{field_path}', **ev}
                result['branches'][branch] = branch_values
            results.append(result)
        return results

    output = []
    for slot, bucket in (('laser', 'LASERS'), ('light', 'LIGHTS')):
        for index, item in enumerate(catalog[bucket]):
            fields = {k: item[k] for k in SITE_TO_SOURCE if k in item}
            if not fields:
                continue
            aid = item['id']
            applicable = []
            for wid, slots in catalog['WEAPON_ATTS'].items():
                if wid in site_weapons and aid in slots.get(slot, []):
                    choice = choices.get((wid, slot, aid))
                    if not choice or not choice.get('sources'):
                        raise ValueError(f'Missing exact site choice: {wid}/{slot}/{aid}')
                    applicable.append(choice)
            bindings = [modifier for choice in applicable for modifier in source_binding(choice)]
            agreements = {}
            for site_field, site_value in fields.items():
                samples = []
                for binding in bindings:
                    for branch, values in binding['branches'].items():
                        samples.append(values[site_field]['sourceValue'])
                unique = sorted(set(samples))
                agreements[site_field] = {'siteValue': site_value, 'sourceValues': unique,
                    'rawOperandCount': len(samples),
                    'status': 'match' if all(abs(float(v) - float(site_value)) <= 1e-6 for v in unique) else 'mismatch'}
            output.append({'sitePointer': f'/{bucket}/{index}', 'slot': slot, 'attachment': aid,
                'siteFields': fields, 'selectedSiteWeaponCount': len(applicable),
                'sourceModifierBindingCount': len(bindings), 'sourceBindings': bindings,
                'fieldComparisons': agreements,
                'limit': 'Exact selected GS binding and captured GBM raw operands are checked; native priority/composition and modeled idle-recovery state remain distinct.'})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('w', encoding='utf-8', newline='\n') as f:
        for row in output:
            f.write(json.dumps(row, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'siteAttachmentEntries': len(output), 'sourceBindings': sum(r['selectedSiteWeaponCount'] for r in output),
        'fields': sum(len(r['fieldComparisons']) for r in output),
        'mismatches': sum(c['status'] == 'mismatch' for r in output for c in r['fieldComparisons'].values()),
        'details': str(args.out.resolve()), 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()

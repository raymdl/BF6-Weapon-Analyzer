"""Verify barrel moving-ADS spread tier leaves through exact site selectors and GS bindings."""
import argparse
import hashlib
import json
import runpy
import sqlite3
import struct
import xml.etree.ElementTree as ET
from pathlib import Path


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
    mapping = json.loads((repo / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json').read_text())
    choices = {(r['weapon'], r['slot'], r['attachment']): r for r in mapping['choices']}
    siteids = set(json.loads((repo / 'data/weapons.json').read_text()) and [w['id'] for w in json.loads((repo / 'data/weapons.json').read_text())])

    def cap(route):
        r = db.execute('select * from captures where route=? collate nocase', (route,)).fetchone()
        return dict(r) if r else None

    details = []
    for index, item in enumerate(catalog['BARRELS']):
        if 'movingAdsSpreadTierMod' not in item:
            continue
        aid, site_value = item['id'], item['movingAdsSpreadTierMod']
        applicable = []
        for wid, slotlist in catalog['WEAPON_ATTS'].items():
            if aid in slotlist.get('barrel', []) and wid in siteids:
                choice = choices.get((wid, 'barrel', aid))
                if not choice or not choice.get('sources'):
                    raise ValueError(f'No exact mapped source choice: {wid}/barrel/{aid}')
                applicable.append(choice)
        bindings = []
        for choice in applicable:
            src = choice['sources'][0]
            selectors = [s for s in src.get('selectors', []) if '/_Barrel/' in s['asset']]
            if len(selectors) != 1:
                raise ValueError(f'Expected one barrel selector: {choice["weapon"]}/{aid}')
            selector = selectors[0]
            src_xml = args.root / f'{src["source"]}.xml'
            folder = src_xml.parent
            gs_files = list(folder.glob('GS_*.xml'))
            if len(gs_files) != 1:
                raise ValueError(f'Expected one GS file in {folder}: {gs_files}')
            gs_root = ET.parse(gs_files[0]).getroot()
            gs_classes = [n for n in gs_root.iter() if n.tag == 'Class_539cff9b']
            if len(gs_classes) != 1:
                raise ValueError(f'Expected one GS weapon settings class for {choice["weapon"]}: {len(gs_classes)}')
            gs_class = gs_classes[0]
            collection_matches = {}
            for owner_field in ('Field_2ffeb6ac', 'Field_b30a73ed'):
                collection = gs_class.find(owner_field)
                collection_matches[owner_field] = [n for n in collection.iter()
                    if n.findtext('Field_6d011165', '').lower() == selector['guid'].lower()
                    and n.find('Field_2f0e5b83') is not None] if collection is not None else []
            matches = collection_matches['Field_2ffeb6ac']
            if len(matches) == 0:
                bindings.append({'siteWeapon': choice['weapon'], 'attachmentSourceXml': src['source'],
                    'selector': {'asset': selector['asset'], 'guid': selector['guid']},
                    'gsSourceXml': gs_files[0].relative_to(args.root).as_posix(),
                    'ownerCollection': 'Class_539cff9b/Field_2ffeb6ac',
                    'otherOwnerBindings': [{'ownerCollection': f'Class_539cff9b/{owner}',
                        'modifierReference': n.findtext('Field_2f0e5b83'),
                        'bindingIndex': n.findtext('Field_3f680d24')}
                        for owner, rows in collection_matches.items() if owner != 'Field_2ffeb6ac' for n in rows],
                    'sourceEffect': 'No exact selector binding exists in the identified moving-ADS owner collection Field_2ffeb6ac. Separate owner Field_b30a73ed refs are recorded as distinct, unknown-target bindings; other source paths and native consumer behavior are not ruled out.'})
                continue
            gdm_matches = [n for n in matches if 'GDM_Array_ADSMoveDispersion' in n.findtext('Field_2f0e5b83', '')]
            if not gdm_matches:
                bindings.append({'siteWeapon': choice['weapon'], 'attachmentSourceXml': src['source'],
                    'selector': {'asset': selector['asset'], 'guid': selector['guid']},
                    'gsSourceXml': gs_files[0].relative_to(args.root).as_posix(),
                    'ownerCollection': 'Class_539cff9b/Field_2ffeb6ac',
                    'selectorBoundMovingAdsCollectionRefs': [{'modifierReference': n.findtext('Field_2f0e5b83'),
                        'bindingIndex': n.findtext('Field_3f680d24')} for n in matches],
                    'otherOwnerBindings': [{'ownerCollection': f'Class_539cff9b/{owner}',
                        'modifierReference': n.findtext('Field_2f0e5b83'),
                        'bindingIndex': n.findtext('Field_3f680d24')}
                        for owner, rows in collection_matches.items() if owner != 'Field_2ffeb6ac' for n in rows],
                    'sourceEffect': 'Exact selector refs in Field_2ffeb6ac do not reference a GDM_Array_ADSMoveDispersion object; other collection refs are kept separate and other source paths and native consumer behavior are not ruled out.'})
                continue
            if len(gdm_matches) != 1:
                raise ValueError(f'Expected one named moving-ADS effect for {choice["weapon"]}/{aid}/{selector["guid"]}; found {len(gdm_matches)}')
            binding = gdm_matches[0]
            modifier_ref = binding.findtext('Field_2f0e5b83') or ''
            left, guid = modifier_ref.rsplit(' [', 1)
            modifier_route = left.removeprefix('[Ebx] ').strip()
            modifier_guid = guid.rstrip(']').lower()
            modifier_xml = args.root / f'{modifier_route}.xml'
            xml_raw = modifier_xml.read_bytes()
            xml_obj = next((n for n in ET.fromstring(xml_raw) if n.get('Guid', '').lower() == modifier_guid), None)
            if xml_obj is None:
                raise ValueError(f'GS modifier object missing: {modifier_route}#{modifier_guid}')
            if xml_obj.tag != 'Class_743a3ce0' or xml_obj.findtext('Field_94752c29') != 'Field_84e57075':
                raise ValueError(f'Unexpected GS spread modifier schema: {modifier_route}#{modifier_guid}')
            source_path = 'Field_9540bd8e/Field_4692836a'
            literal_node = xml_obj.find('Field_9540bd8e//Field_4692836a')
            literal = literal_node.text if literal_node is not None else None
            xml_value = int(literal, 16) if literal and literal.startswith('0x') else int(literal)
            if literal.startswith('0x') and xml_value >= 0x80000000:
                xml_value -= 0x100000000
            caprow = cap(modifier_route)
            if not caprow:
                raise ValueError(f'No current raw GS-modifier capture: {modifier_route}')
            dbobj = db.execute('select object_index,object_guid,class_name,body_json from objects where capture_id=? and object_guid=?',
                               (caprow['id'], modifier_guid)).fetchone()
            if not dbobj:
                raise ValueError(f'GS-modifier object GUID missing from raw capture: {modifier_guid}')
            body = json.loads(dbobj['body_json'])
            ebx = reader['Ebx'](caprow['raw_path'], reader['type_descriptors'](caprow['descriptor_path']))
            decoded = ebx.decode()
            ob = dbobj['object_index']
            cls = ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']])
            parts = source_path.split('/')
            offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[ob], parts, reader)
            fmt = reader['SIMPLE'].get(kind)
            if not fmt:
                raise ValueError(f'Non-scalar GS array field: {modifier_route}/{source_path}')
            raw_value = struct.unpack_from(fmt[0], ebx.data, offset)[0]
            decoded_value = decoded['objects'][ob]['Field_9540bd8e']['Field_4692836a']
            if int(raw_value) != xml_value or int(decoded_value) != xml_value or int(raw_value) != int(decoded_value):
                raise ValueError(f'GS source mismatch: {choice["weapon"]}/{aid}: {raw_value}, {decoded_value}, {xml_value}')
            bindings.append({'siteWeapon': choice['weapon'], 'attachmentSourceXml': src['source'],
                'selector': {'asset': selector['asset'], 'guid': selector['guid']},
                'gsSourceXml': gs_files[0].relative_to(args.root).as_posix(),
                'gsBindingIndex': binding.findtext('Field_3f680d24'),
                'modifierRoute': modifier_route, 'modifierObjectGuid': modifier_guid,
                'modifierXmlSha256': hashlib.sha256(xml_raw).hexdigest(),
                'captureId': caprow['id'], 'rawSha256': caprow['raw_sha256'],
                'descriptorSha256': caprow['descriptor_sha256'], 'sourceFieldPath': f'{dbobj["class_name"]}/Field_9540bd8e/Struct_d204f959/Field_4692836a',
                'sourceValue': int(decoded_value), 'byteOffset': offset,
                'rawBytesHex': ebx.data[offset:offset + fmt[1]].hex(), 'rawValue': int(raw_value)})
        effects = [b for b in bindings if 'sourceValue' in b]
        distinct = sorted({b['sourceValue'] for b in effects})
        no_effect = sum('sourceEffect' in b for b in bindings)
        details.append({'sitePointer': f'/BARRELS/{index}/movingAdsSpreadTierMod', 'attachment': aid,
            'siteValue': site_value, 'selectedSiteWeapons': [b['siteWeapon'] for b in bindings],
            'sourceBindingCount': len(effects), 'noGsEffectCount': no_effect, 'sourceValues': distinct,
            'agreement': ('match' if distinct == [site_value] else
                          'no-selected-site-weapon' if not bindings else
                          'no-owner-collection-source-match' if not effects and site_value == 0 else 'mismatch-or-no-binding'),
            'sourceBindings': bindings,
            'limit': 'Raw selected GS modifier scalar and selector binding are verified; native priority/composition and simulator conversion remain distinct.'})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('w', encoding='utf-8', newline='\n') as f:
        for row in details:
            f.write(json.dumps(row, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'siteLeaves': len(details), 'bindings': sum(x['sourceBindingCount'] for x in details),
        'matches': sum(x['agreement'] == 'match' for x in details),
        'unresolvedOwnerCollectionCases': sum(x['agreement'] == 'no-owner-collection-source-match' for x in details),
        'noSelectedWeaponCases': sum(x['agreement'] == 'no-selected-site-weapon' for x in details),
        'details': str(args.out.resolve()), 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()

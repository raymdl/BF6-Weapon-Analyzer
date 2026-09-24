"""Verify short-barrel hip dispersion tier inputs against exact GS-bound GDM fields."""
import argparse
import hashlib
import json
import runpy
import sqlite3
import struct
import xml.etree.ElementTree as ET
from pathlib import Path


SOURCE_FIELD = 'Field_9540bd8e/Field_4692836a'


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
    cache = {}

    def capture(route):
        row = db.execute('select * from captures where route=? collate nocase', (route,)).fetchone()
        return dict(row) if row else None

    def raw_scalar(cap, guid):
        key = cap['id']
        if key not in cache:
            desc = reader['type_descriptors'](cap['descriptor_path'])
            cache[key] = reader['Ebx'](cap['raw_path'], desc)
        ebx = cache[key]
        decoded = ebx.decode()
        objs = db.execute('select object_index,class_name,body_json from objects where capture_id=? and object_guid=?',
                          (cap['id'], guid)).fetchall()
        if len(objs) != 1:
            raise ValueError(f'Expected one GDM object {cap["route"]}#{guid}; found {len(objs)}')
        obj = objs[0]
        ob = obj['object_index']
        cls = ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']])
        offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[ob], SOURCE_FIELD.split('/'), reader)
        fmt = reader['SIMPLE'].get(kind)
        if not fmt:
            raise ValueError(f'Expected scalar source leaf: {cap["route"]}/{SOURCE_FIELD}')
        value = struct.unpack_from(fmt[0], ebx.data, offset)[0]
        body = json.loads(obj['body_json'])
        path_value = body['Field_9540bd8e']['Field_4692836a']
        decoded_value = decoded['objects'][ob]['Field_9540bd8e']['Field_4692836a']
        if int(value) != int(path_value) or int(value) != int(decoded_value):
            raise ValueError(f'raw/decoded GDM mismatch: {cap["route"]}/{SOURCE_FIELD}')
        return {'sourceValue': int(value), 'byteOffset': offset,
                'rawBytesHex': ebx.data[offset:offset + fmt[1]].hex(),
                'rawEqualsDecoded': True, 'className': obj['class_name']}

    rows = []
    for idx in (2, 9):
        item = data['BARRELS'][idx]
        selected = []
        for wid, slots in data['WEAPON_ATTS'].items():
            if wid not in weapons or item['id'] not in slots.get('barrel', []):
                continue
            choice = choices.get((wid, 'barrel', item['id']))
            if not choice or not choice.get('sources'):
                raise ValueError(f'No exact site source choice for {wid}/{item["id"]}')
            src = choice['sources'][0]
            selectors = [s for s in src.get('selectors', []) if '/_Barrel/' in s['asset']]
            if len(selectors) != 1:
                raise ValueError(f'Expected one barrel selector for {wid}/{item["id"]}')
            selector = selectors[0]
            gs = next(iter((args.root / f'{src["source"]}.xml').parent.glob('GS_*.xml')), None)
            if gs is None:
                raise ValueError(f'No GS file for {wid}/{item["id"]}')
            gs_root = ET.parse(gs).getroot()
            classes = [n for n in gs_root.iter() if n.tag == 'Class_539cff9b']
            if len(classes) != 1:
                raise ValueError(f'Expected one GS settings object for {wid}: {len(classes)}')
            parents = {child: parent for parent in gs_root.iter() for child in parent}
            bound = []
            for cls in classes:
                for node in cls.iter():
                    ref = node.findtext('Field_2f0e5b83')
                    if (node.findtext('Field_6d011165', '').lower() != selector['guid'].lower()
                            or not ref or 'GDM_Array_HipDispersion' not in ref):
                        continue
                    owner = node
                    while owner in parents and parents[owner] is not cls:
                        owner = parents[owner]
                    left, guid_part = ref.rsplit(' [', 1)
                    route = left.removeprefix('[Ebx] ').strip()
                    guid = guid_part.rstrip(']').lower()
                    cap = capture(route)
                    if not cap:
                        raise ValueError(f'No raw captured GDM: {route}')
                    raw = raw_scalar(cap, guid)
                    xml_raw = (args.root / f'{route}.xml').read_bytes()
                    xml_obj = next((n for n in ET.fromstring(xml_raw) if n.get('Guid', '').lower() == guid), None)
                    if xml_obj is None or xml_obj.tag != 'Class_743a3ce0':
                        raise ValueError(f'Unexpected hip GDM source object: {route}#{guid}')
                    xml_value = xml_field_path(xml_obj, SOURCE_FIELD)
                    if xml_value is None or int(xml_value, 0) != raw['sourceValue']:
                        raise ValueError(f'XML/raw GDM mismatch: {route}/{SOURCE_FIELD}')
                    bound.append({'ownerCollection': owner.tag, 'bindingIndex': node.findtext('Field_3f680d24'),
                        'route': route, 'objectGuid': guid, 'captureId': cap['id'],
                        'rawSha256': cap['raw_sha256'], 'descriptorSha256': cap['descriptor_sha256'],
                        'xmlSha256': hashlib.sha256(xml_raw).hexdigest(), 'sourceFieldPath': f'Class_743a3ce0/{SOURCE_FIELD}',
                        **raw})
            selected.append({'siteWeapon': wid, 'selectorAsset': selector['asset'], 'selectorGuid': selector['guid'],
                'gsXml': gs.relative_to(args.root).as_posix(), 'gsXmlSha256': sha(gs), 'boundHipGdms': bound})
        values = [x['sourceValue'] for s in selected for x in s['boundHipGdms']]
        site = item['hipSpreadTierMod']
        rows.append({'sitePointer': f'/BARRELS/{idx}/hipSpreadTierMod', 'attachment': item['id'],
            'siteValue': site, 'selectedWeaponCount': len(selected), 'sourceSelections': selected,
            'sourceValues': sorted(set(values)),
            'agreement': 'inverse-sign-match' if values and all(v == -site for v in values) else 'mismatch-or-unresolved',
            'modelRelation': 'The site model subtracts hipSpreadTierMod from its base index; source Field_9540bd8e is an additive tier index. Values are sign-inverted at the site boundary.'})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('w', encoding='utf-8', newline='\n') as f:
        for row in rows:
            f.write(json.dumps(row, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'siteLeaves': len(rows), 'selectedChoices': sum(r['selectedWeaponCount'] for r in rows),
        'rawRows': sum(len(s['boundHipGdms']) for r in rows for s in r['sourceSelections']),
        'matches': sum(r['agreement'] == 'inverse-sign-match' for r in rows),
        'details': str(args.out.resolve()), 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()

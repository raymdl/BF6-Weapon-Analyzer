"""Check a candidate exact WPM source flag against the site's laser visibility labels."""
import argparse
import hashlib
import json
import runpy
import sqlite3
import struct
import xml.etree.ElementTree as ET
from pathlib import Path


FIELD = 'Field_32cf19f5'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


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

    def cap(route):
        row = db.execute('select * from captures where route=? collate nocase', (route,)).fetchone()
        return dict(row) if row else None

    rows = []
    for idx, item in enumerate(data['LASERS']):
        if 'laserVisible' not in item:
            continue
        aid, site_value = item['id'], item['laserVisible']
        selected = []
        for wid, slots in data['WEAPON_ATTS'].items():
            if wid not in weapons or aid not in slots.get('laser', []):
                continue
            choice = choices.get((wid, 'laser', aid))
            if not choice or not choice.get('sources'):
                raise ValueError(f'No exact site source choice for {wid}/laser/{aid}')
            source_alternatives = []
            for src in choice['sources']:
                selectors = [s for s in src.get('selectors', [])
                             if '/_TopRail/Laser/' in s['asset'] or '/_RightRail/LaserLight/' in s['asset']]
                if len(selectors) != 1:
                    raise ValueError(f'Expected one exact laser selector for {wid}/{aid}')
                selector = selectors[0]
                source_alternatives.append((src, selector))
            for src, selector in source_alternatives:
                capture = cap(selector['asset'])
                if not capture:
                    raise ValueError(f'No exact raw selector-package capture: {selector["asset"]}')
                key = (capture['id'], selector['guid'].lower())
                if key not in cache:
                    descriptor = reader['type_descriptors'](capture['descriptor_path'])
                    ebx = reader['Ebx'](capture['raw_path'], descriptor)
                    decoded = ebx.decode()
                    objects = db.execute('select object_index,class_name,body_json from objects where capture_id=? and object_guid=?',
                                         (capture['id'], selector['guid'])).fetchall()
                    if len(objects) != 1:
                        raise ValueError(f'Expected selector object in raw capture: {selector["guid"]}')
                    obj = objects[0]
                    if obj['class_name'] != 'Class_bc0062dc':
                        raise ValueError(f'Unexpected selector class: {obj["class_name"]}')
                    ob = obj['object_index']
                    cls = ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']])
                    offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[ob], [FIELD], reader)
                    fmt = reader['SIMPLE'].get(kind)
                    if not fmt or fmt[1] != 1:
                        raise ValueError(f'Expected boolean selector field: {selector["asset"]}/{FIELD}')
                    raw_value = struct.unpack_from(fmt[0], ebx.data, offset)[0]
                    decoded_value = decoded['objects'][ob][FIELD]
                    body_value = json.loads(obj['body_json'])[FIELD]
                    if bool(raw_value) != bool(decoded_value) or bool(raw_value) != bool(body_value):
                        raise ValueError(f'Raw/decoded selector flag mismatch: {selector["asset"]}/{FIELD}')
                    xml_path = args.root / f'{selector["asset"]}.xml'
                    xml_raw = xml_path.read_bytes()
                    xml_obj = next((n for n in ET.fromstring(xml_raw) if n.get('Guid', '').lower() == selector['guid'].lower()), None)
                    xml_value = xml_obj.findtext(FIELD) if xml_obj is not None else None
                    if xml_value not in ('True', 'False') or (xml_value == 'True') != bool(raw_value):
                        raise ValueError(f'XML/raw selector flag mismatch: {selector["asset"]}/{FIELD}')
                    cache[key] = {'sourceValue': bool(raw_value), 'sourceFieldPath': f'Class_bc0062dc/{FIELD}',
                        'byteOffset': offset, 'rawBytesHex': ebx.data[offset:offset + 1].hex(),
                        'rawEqualsDecoded': True, 'rawSha256': capture['raw_sha256'],
                        'descriptorSha256': capture['descriptor_sha256'], 'captureId': capture['id'],
                        'xmlSha256': hashlib.sha256(xml_raw).hexdigest()}
                selected.append({'siteWeapon': wid, 'sourceAttachment': src.get('source'),
                    'attachmentGuid': src.get('attachmentGuid'), 'sourceRoute': selector['asset'],
                    'selectorGuid': selector['guid'], 'runtimeSelectionResolved': len(source_alternatives) == 1,
                    **cache[key]})
        vals = sorted(set(s['sourceValue'] for s in selected))
        rows.append({'sitePointer': f'/LASERS/{idx}/laserVisible', 'attachment': aid,
            'siteValue': site_value, 'selectedWeaponCount': len({s['siteWeapon'] for s in selected}),
            'sourceCandidateCount': len(selected), 'candidateSourceValues': vals,
            'candidateStatus': ('matches-site-values' if vals == [site_value] else
                'non-discriminating-candidate' if vals == [True] else 'candidate-mismatch'),
            'candidateField': 'Class_bc0062dc/Field_32cf19f5', 'sourceSelections': selected,
            'siteConsumer': 'sim/applyAttachments.js returns this property as _laserVisible; ui/app.js displays "Whether the selected laser is visible to enemies."',
            'limit': 'Field meaning and native visibility consumer are not established; the all-true WPM boolean is only a candidate and does not explain false site values.'})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('w', encoding='utf-8', newline='\n') as f:
        for row in rows:
            f.write(json.dumps(row, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'siteLeaves': len(rows), 'weaponChoices': sum(r['selectedWeaponCount'] for r in rows),
        'candidateValueRows': sum(r['sourceCandidateCount'] for r in rows),
        'candidateMismatches': sum(r['candidateStatus'] != 'matches-site-values' for r in rows),
        'details': str(args.out.resolve()), 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()

"""Verify the heavy-extended barrel deploy and sprint tier-shift operands."""
import argparse
import hashlib
import json
import runpy
import sqlite3
import struct
from pathlib import Path


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
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
    route = 'Common/Hardware/Weapons/_WeaponModifiers/_Barrel/WPM_BRL_HeavyExtended_W10'
    wpm = db.execute('select * from captures where route=? collate nocase', (route,)).fetchone()
    if not wpm:
        raise ValueError(f'No current WPM source capture: {route}')
    rows = []
    for field, end in (('deployTimeTierShift', 'Deploy'), ('sprintRecoveryTierShift', 'Sprint')):
        candidates = db.execute('''select a.route,i.target_object_guid from imports i
            join assets a on a.file_guid=i.target_file_guid where i.capture_id=? and a.route like ?''',
                                (wpm['id'], f'%WME_Draw_{end}_M05')).fetchall()
        if len(candidates) != 1:
            raise ValueError(f'Expected one Draw {end} effect in WPM; got {len(candidates)}')
        effect = candidates[0]
        cap = db.execute('select * from captures where route=? collate nocase', (effect['route'],)).fetchone()
        obj = db.execute('select object_index,class_name,body_json from objects where capture_id=? and object_guid=?',
                         (cap['id'], effect['target_object_guid'])).fetchone()
        if not obj:
            raise ValueError(f'Imported Draw object missing: {effect["route"]}')
        body = json.loads(obj['body_json'])
        ebx = reader['Ebx'](cap['raw_path'], reader['type_descriptors'](cap['descriptor_path']))
        decoded = ebx.decode()
        ob = obj['object_index']
        cls = ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']])
        offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[ob], ['Field_9540bd8e'], reader)
        fmt = reader['SIMPLE'].get(kind)
        if not fmt:
            raise ValueError(f'Non-scalar Draw field: {effect["route"]}')
        raw = struct.unpack_from(fmt[0], ebx.data, offset)[0]
        value = decoded['objects'][ob]['Field_9540bd8e']
        if int(raw) != int(value) or int(body['Field_9540bd8e']) != int(raw):
            raise ValueError(f'Draw field raw/decoded mismatch: {effect["route"]}')
        site_value = 1
        if -int(value) != site_value:
            raise ValueError(f'Site inverse-tier convention mismatch: {field}')
        rows.append({'sitePointer': f'/BARRELS/5/{field}', 'siteAttachment': 'heavy_ext',
                     'siteValue': site_value, 'selectedSiteWeapons': sorted(w for w, slots in
                         json.loads((repo / 'data/attachments.json').read_text())['WEAPON_ATTS'].items()
                         if 'heavy_ext' in slots.get('barrel', [])),
                     'wpm': {'route': wpm['route'], 'captureId': wpm['id'], 'rawSha256': wpm['raw_sha256']},
                     'wme': {'route': effect['route'], 'objectGuid': effect['target_object_guid'],
                             'captureId': cap['id'], 'rawSha256': cap['raw_sha256'],
                             'descriptorSha256': cap['descriptor_sha256'], 'sourceFieldPath': f'{obj["class_name"]}/Field_9540bd8e',
                             'sourceValue': int(value), 'byteOffset': offset,
                             'rawBytesHex': ebx.data[offset:offset + fmt[1]].hex(), 'rawValue': int(raw)},
                     'siteDerivation': 'The attachment handling generator negates signed values for *TierShift fields; source -1 produces site +1.',
                     'limit': 'Current source import and operand bytes are proven; native activation/composition are not.'})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('w', encoding='utf-8', newline='\n') as f:
        for row in rows:
            f.write(json.dumps(row, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'rows': len(rows), 'details': str(args.out.resolve()), 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()

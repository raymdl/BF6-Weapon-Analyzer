"""Trace site suppressor booleans to selector-bound IsSilenced WME values.

The current WPM XML export is used for the selector-to-effect edge. The WME
scalar itself is checked against current captured EBX bytes. This is not proof
that native runtime consumes the edge or that the site boolean has no other use.
"""
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
    site = json.loads((repo / 'data/attachments.json').read_text())
    mapping = json.loads((repo / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json').read_text())
    fields_path = args.report_dir / 'site-attachment-source-fields-2026-09-23.jsonl'
    source_fields = [json.loads(line) for line in fields_path.open(encoding='utf-8')
                     if '"recordRole":"WPM"' in line]
    choices = {(r['weapon'], r['slot'], r['attachment']): r for r in mapping['choices']}

    def capture(route):
        r = db.execute('select * from captures where route=? collate nocase', (route,)).fetchone()
        return dict(r) if r else None

    rows = []
    for slot, bucket in (('barrel', 'BARRELS'), ('muzzle', 'MUZZLES')):
        for index, item in enumerate(site[bucket]):
            if item.get('suppressor') is not True:
                continue
            aid = item['id']
            weapon_rows = [r for r in mapping['choices'] if r['slot'] == slot and r['attachment'] == aid and r.get('sources')]
            selector_candidates = { (s['asset'], s['guid'].lower())
                                    for r in weapon_rows for s in r['sources'][0].get('selectors', [])
                                    if f'/{"_Barrel" if slot == "barrel" else "_Muzzle"}/' in s['asset'] }
            if len(selector_candidates) != 1:
                raise ValueError(f'Ambiguous exact selector for {slot}/{aid}: {selector_candidates}')
            selector_asset, selector_guid = next(iter(selector_candidates))
            selector_folder = (args.root / selector_asset).parent
            packages = []
            for xml_path in selector_folder.glob('WPM_*.xml'):
                xml_raw_candidate = xml_path.read_bytes()
                xml_candidate = ET.fromstring(xml_raw_candidate)
                candidate = next((o for o in xml_candidate if o.find('Field_819acc98') is not None), None)
                if candidate is not None and selector_guid in {m.text.lower() for m in candidate.findall('Field_819acc98/member')}:
                    packages.append((xml_path, xml_raw_candidate, candidate))
            if len(packages) != 1:
                raise ValueError(f'Expected unique selector GUID package for {selector_asset}/{selector_guid}; got {[str(p[0]) for p in packages]}')
            xml_path, xml_raw, class_obj = packages[0]
            route = xml_path.relative_to(args.root).with_suffix('').as_posix()
            xml_root = ET.fromstring(xml_raw)
            selector_ids = {m.text.lower() for m in class_obj.findall('Field_819acc98/member')}
            effects = []
            for member in class_obj.findall('Field_9690d604/member'):
                text = member.text or ''
                if 'WME_Flag_IsSilenced' not in text:
                    continue
                left, guid = text.rsplit(' [', 1)
                effect_route = left.removeprefix('[Ebx] ').strip()
                effect_guid = guid.rstrip(']').lower()
                effects.append((effect_route, effect_guid))
            if len(effects) != 1:
                raise ValueError(f'Expected one IsSilenced WME in {route}; found {effects}')
            effect_route, effect_guid = effects[0]
            wpm_cap = capture(route)
            if not wpm_cap:
                raise ValueError(f'No exact current raw WPM capture for selected package: {route}')
            wpm_import = db.execute('''select 1 from imports where capture_id=?
                and target_object_guid=?''', (wpm_cap['id'], effect_guid)).fetchone()
            if not wpm_import:
                raise ValueError(f'Raw WPM imports do not contain XML IsSilenced effect GUID: {route}#{effect_guid}')
            cap = capture(effect_route)
            if not cap:
                raise ValueError(f'Current captured WME unavailable: {effect_route}')
            obj = db.execute('select object_index,class_name,body_json from objects where capture_id=? and object_guid=?',
                             (cap['id'], effect_guid)).fetchone()
            if not obj:
                raise ValueError(f'WME object GUID missing from captured source: {effect_guid}')
            body = json.loads(obj['body_json'])
            ebx = reader['Ebx'](cap['raw_path'], reader['type_descriptors'](cap['descriptor_path']))
            decoded = ebx.decode()
            ob = obj['object_index']
            cls = ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']])
            offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[ob], ['Field_ffba8126'], reader)
            fmt = reader['SIMPLE'].get(kind)
            if not fmt:
                raise ValueError(f'WME flag is not scalar: {effect_route}/Field_ffba8126')
            raw_value = struct.unpack_from(fmt[0], ebx.data, offset)[0]
            decoded_value = decoded['objects'][ob]['Field_ffba8126']
            if bool(raw_value) != bool(decoded_value) or bool(body['Field_ffba8126']) != bool(raw_value):
                raise ValueError(f'Raw IsSilenced flag mismatch: {effect_route}')
            wpm_path = selector_asset
            selector_capture = next((r for r in source_fields if r['sourceRoute'].lower() == wpm_path.lower()
                                     and r['selectorObjectGuid'].lower() == selector_guid), None)
            if selector_capture is None:
                raise ValueError(f'No exact captured WPM selector row: {wpm_path}/{selector_guid}')
            rows.append({
                'sitePointer': f'/{bucket}/{index}/suppressor', 'siteValue': item['suppressor'],
                'slot': slot, 'attachment': aid,
                'selectedSiteWeapons': sorted({r['weapon'] for r in weapon_rows}),
                'selector': {'asset': selector_asset, 'guid': selector_guid,
                             'captureId': selector_capture['captureId'], 'rawSha256': selector_capture['rawSha256']},
                'wpmEffectPackage': {'route': route, 'xmlSha256': hashlib.sha256(xml_raw).hexdigest(),
                                     'selectorGuidPresent': selector_guid in selector_ids,
                                     'captureId': wpm_cap['id'], 'rawSha256': wpm_cap['raw_sha256'],
                                     'descriptorSha256': wpm_cap['descriptor_sha256'],
                                     'rawImportVerified': True, 'effectRoute': effect_route, 'effectGuid': effect_guid},
                'wmeRawSource': {'captureId': cap['id'], 'route': effect_route,
                                 'rawSha256': cap['raw_sha256'], 'descriptorSha256': cap['descriptor_sha256'],
                                 'class': obj['class_name'], 'fieldPath': 'Class_c6c66955/Field_ffba8126',
                                 'sourceValue': bool(decoded_value), 'byteOffset': offset,
                                 'rawBytesHex': ebx.data[offset:offset + fmt[1]].hex(),
                                 'rawValue': bool(raw_value), 'rawEqualsDecoded': True},
                'comparison': 'site true matches captured WME true; WPM package edge is current XML evidence',
                'limit': 'Current WPM raw import and selected XML package agree; native application/priority and site boolean semantics remain unproven.'})
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('w', encoding='utf-8', newline='\n') as f:
        for row in rows:
            f.write(json.dumps(row, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'siteLeaves': len(rows), 'rawWmeFlagProofs': sum(r['wmeRawSource']['rawEqualsDecoded'] for r in rows),
                      'details': str(args.out.resolve()), 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()

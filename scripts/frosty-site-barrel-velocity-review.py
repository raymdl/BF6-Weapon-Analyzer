"""Compare site barrel velocity inputs with current-build selected WPM/WME sources.

This review keeps the source field hash uninterpreted. A WME route name and
matching scalar are candidate meaning evidence; neither proves native use.
"""
import argparse
import hashlib
import json
import math
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
    mapping = json.loads((repo / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json').read_text())
    attachments = json.loads((repo / 'data/attachments.json').read_text())['BARRELS']
    weapons = json.loads((repo / 'data/weapons.json').read_text())
    availability = json.loads((repo / 'data/attachments.json').read_text())['WEAPON_ATTS']
    choices = {}
    for row in mapping['choices']:
        if row['slot'] == 'barrel' and row.get('sources'):
            choices.setdefault(row['attachment'], {})[row['weapon']] = row['sources'][0]

    def capture(route):
        row = db.execute('select * from captures where route=? collate nocase', (route,)).fetchone()
        return dict(row) if row else None

    descriptors = {}
    out = []
    for i, item in enumerate(attachments):
        aid = item['id']
        candidate_routes = sorted({s['asset'].replace('/U_WPM_', '/WPM_')
                                   for s in (next(iter(choices.get(aid, {}).values()), {}).get('selectors', []))
                                   if '/_Barrel/' in s['asset']})
        if len(candidate_routes) > 1:
            raise ValueError(f'Ambiguous WPM route for {aid}: {candidate_routes}')
        route = candidate_routes[0] if candidate_routes else None
        site_weapons = sorted(wid for wid, slots in availability.items() if aid in slots.get('barrel', []))
        row = {'sitePointer': f'/BARRELS/{i}', 'attachment': aid,
               'siteFields': {k: item.get(k) for k in ('velMult', 'velTierMod') if k in item},
               'siteWeapons': site_weapons, 'wpmRoute': route,
               'wpmXmlSha256': sha(args.root / f'{route}.xml') if route else None,
               'wpmCapture': None, 'velocityEffects': [],
               'assessment': 'no selected barrel WPM route' if route is None else 'source selector unresolved'}
        row['tierRelation'] = {
            'siteVelTierMod': item.get('velTierMod'),
            'candidateDerivedTierValues': [],
            'formula': '-log(source WME factor) / log(0.8)',
            'status': ('site-neutral-default-without-MuzzleVelocity-WME'
                       if item.get('velTierMod') == 0 else 'unresolved-no-MuzzleVelocity-WME')}
        if route:
            wc = capture(route)
            if not wc:
                row['assessment'] = 'current WPM route lacks a capture; XML mapping alone retained'
            else:
                row['wpmCapture'] = {k: wc[k] for k in ('id', 'head', 'raw_sha256', 'descriptor_sha256', 'decode_status')}
                imports = db.execute('''select i.ordinal,i.target_file_guid,i.target_object_guid,a.route
                    from imports i left join assets a on a.file_guid=i.target_file_guid
                    where i.capture_id=? order by i.ordinal''', (wc['id'],)).fetchall()
                for imp in imports:
                    if not imp['route'] or 'MuzzleVelocity' not in imp['route']:
                        continue
                    ec = capture(imp['route'])
                    if not ec:
                        continue
                    objrow = db.execute('select object_index,class_name,absolute_offset,body_json from objects where capture_id=? and object_guid=?',
                                        (ec['id'], imp['target_object_guid'])).fetchone()
                    if not objrow:
                        raise ValueError(f'Imported WME object absent: {imp["route"]}#{imp["target_object_guid"]}')
                    body = json.loads(objrow['body_json'])
                    value = body.get('Field_6a5c4efd')
                    ebx = reader['Ebx'](ec['raw_path'], reader['type_descriptors'](ec['descriptor_path']))
                    decoded = ebx.decode()
                    ob = objrow['object_index']
                    cls = ebx.class_by_key(ebx.class_keys[ebx.instances[ob]['classRef']])
                    offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[ob], ['Field_6a5c4efd'], reader)
                    fmt = reader['SIMPLE'].get(kind)
                    if not fmt:
                        raise ValueError(f'Non-scalar WME field: {imp["route"]}/Field_6a5c4efd')
                    raw_fmt, size = fmt
                    raw_value = struct.unpack_from(raw_fmt, ebx.data, offset)[0]
                    raw_hex = ebx.data[offset:offset + size].hex()
                    decoded_value = decoded['objects'][ob].get('Field_6a5c4efd')
                    if abs(float(value) - float(raw_value)) > 1e-6 or abs(float(decoded_value) - float(raw_value)) > 1e-6:
                        raise ValueError(f'WME raw/value mismatch: {imp["route"]}')
                    row['velocityEffects'].append({
                        'wmeRoute': imp['route'], 'objectGuid': imp['target_object_guid'],
                        'captureId': ec['id'], 'rawSha256': ec['raw_sha256'],
                        'descriptorSha256': ec['descriptor_sha256'], 'decodeStatus': ec['decode_status'],
                        'sourceFieldPath': 'Class_3e93759b/Field_6a5c4efd',
                        'sourceValue': value, 'byteOffset': offset, 'rawBytesHex': raw_hex,
                        'rawValue': raw_value, 'rawProof': True})
                if row['velocityEffects']:
                    vals = {x['sourceValue'] for x in row['velocityEffects']}
                    site = item.get('velMult')
                    row['assessment'] = ('candidate-field match; factor identity still inferred from WME route and value'
                                         if site in vals else 'candidate-field mismatch or no scalar match')
                    tier_values = sorted({round(-math.log(float(value)) / math.log(0.8))
                                          for value in vals if float(value) > 0})
                    row['tierRelation'] = {
                        'siteVelTierMod': item.get('velTierMod'),
                        'candidateDerivedTierValues': tier_values,
                        'formula': '-log(source WME factor) / log(0.8)',
                        'status': ('derived-candidate-match' if tier_values
                                   and all(abs((-math.log(float(value)) / math.log(0.8)) - round(-math.log(float(value)) / math.log(0.8))) < 1e-6
                                           for value in vals)
                                   and tier_values == [item.get('velTierMod')]
                                   else 'derived-candidate-mismatch-or-nonintegral')}
                else:
                    row['assessment'] = 'selected WPM has no imported MuzzleVelocity WME'
                    row['tierRelation'] = {
                        'siteVelTierMod': item.get('velTierMod'),
                        'candidateDerivedTierValues': [],
                        'formula': '-log(source WME factor) / log(0.8)',
                        'status': ('site-neutral-default-without-MuzzleVelocity-WME'
                                   if item.get('velTierMod') == 0 else 'unresolved-no-MuzzleVelocity-WME')}
        out.append(row)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('w', encoding='utf-8', newline='\n') as f:
        for row in out:
            f.write(json.dumps(row, separators=(',', ':'), ensure_ascii=False) + '\n')
    print(json.dumps({'siteBarrelEntries': len(out), 'rowsWithWpm': sum(bool(r['wpmRoute']) for r in out),
                      'velocityEffects': sum(len(r['velocityEffects']) for r in out),
                      'candidateFieldMatches': sum(r['assessment'].startswith('candidate-field match') for r in out),
                      'details': str(args.out.resolve()), 'sha256': sha(args.out)}))


if __name__ == '__main__':
    main()

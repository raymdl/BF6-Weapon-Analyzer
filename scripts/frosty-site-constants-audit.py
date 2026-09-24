"""Compare Analyzer constants, selected per-weapon indices, and spread minima to raw 1.4.3.0 captures.

This is a research audit. It writes only the requested external report path.
"""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3
import struct


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def get_path(value, parts):
    for part in parts:
        value = value[part]
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report-dir', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        parser.error('Output exists; choose a new report path.')

    repo = Path(__file__).resolve().parents[1]
    db_path = args.report_dir / 'coverage-decoder-v5.sqlite'
    db = sqlite3.connect(f'{db_path.resolve().as_uri()}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    reader = runpy.run_path(str(repo / 'scripts/frosty-ebx-decode.py'))
    balance_path = repo / 'data/balance_tables.json'
    weapons_path = repo / 'data/weapons.json'
    attachments_path = repo / 'data/attachments.json'
    roster_path = repo / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json'
    balance = json.loads(balance_path.read_text())
    weapons = json.loads(weapons_path.read_text())
    magazines = json.loads(attachments_path.read_text())['WEAPON_MAG']
    roster = json.loads(roster_path.read_text())['roots']
    roster_by_site = {r['siteIdentity']: r for r in roster if r.get('siteIdentity')}
    assert set(roster_by_site) == {w['id'] for w in weapons}

    descriptors = {}
    decoded_cache = {}

    def capture_by_sha(raw_sha):
        row = db.execute('SELECT * FROM captures WHERE raw_sha256=?', (raw_sha,)).fetchone()
        assert row, raw_sha
        return dict(row)

    def capture_by_tail(tail):
        rows = db.execute('SELECT * FROM captures WHERE raw_path LIKE ? AND head=4892017 ORDER BY id',
                          ('%' + tail,)).fetchall()
        assert len(rows) == 1, (tail, len(rows))
        return dict(rows[0])

    def load_asset(capture):
        cid = capture['id']
        if cid not in decoded_cache:
            desc = capture['descriptor_path']
            if desc not in descriptors:
                descriptors[desc] = reader['type_descriptors'](desc)
            assert descriptors[desc]['sha256'] == capture['descriptor_sha256']
            ebx = reader['Ebx'](capture['raw_path'], descriptors[desc])
            assert ebx.sha256 == capture['raw_sha256']
            assert sha(capture['raw_path']) == capture['raw_sha256']
            decoded_cache[cid] = (ebx, ebx.decode())
        return decoded_cache[cid]

    def locate(ebx, cls, start, parts):
        candidates = []
        for field in cls['fields']:
            kind = reader['debug_type'](field['flags'])
            if kind == reader['INHERITED']:
                try:
                    candidates.append(locate(ebx, ebx.class_by_index(field['classRef']), start, parts))
                except KeyError:
                    pass
            elif 'Field_' + field['hash'] == parts[0]:
                offset = start + field['offset']
                if len(parts) == 1:
                    candidates.append((offset, kind))
                else:
                    assert kind == reader['STRUCT']
                    assert reader['debug_category'](field['flags']) != reader['CATEGORY_ARRAY']
                    candidates.append(locate(ebx, ebx.class_by_index(field['classRef']), offset, parts[1:]))
        if not candidates:
            raise KeyError(parts)
        assert len(candidates) == 1, candidates
        return candidates[0]

    def raw_field(capture, object_index, pointer):
        ebx, decoded = load_asset(capture)
        parts = pointer.strip('/').split('/')
        if object_index is None:
            candidates = []
            for index, item in enumerate(decoded['objects']):
                try:
                    get_path(item, parts)
                    candidates.append(index)
                except (KeyError, IndexError, TypeError):
                    pass
            assert len(candidates) == 1, (capture['route'], pointer, candidates)
            object_index = candidates[0]
        body = decoded['objects'][object_index]
        value = get_path(body, parts)
        cls = ebx.class_by_key(ebx.class_keys[ebx.instances[object_index]['classRef']])
        offset, kind = locate(ebx, cls, ebx.data_start + ebx.data_offsets[object_index], parts)
        if kind == reader['FLOAT32']:
            raw_value = struct.unpack_from('<f', ebx.data, offset)[0]
            assert round(raw_value, 6) == value, (pointer, raw_value, value)
            raw_bytes = ebx.data[offset:offset + 4]
        elif kind in (reader['INT32'], reader['UINT32']):
            raw_value = struct.unpack_from('<i' if kind == reader['INT32'] else '<I', ebx.data, offset)[0]
            assert raw_value == value, (pointer, raw_value, value)
            raw_bytes = ebx.data[offset:offset + 4]
        else:
            raise TypeError((pointer, kind))
        return {'value': value, 'rawValue': raw_value, 'byteOffset': offset,
                'bytesHex': raw_bytes.hex(), 'pointer': pointer,
                'objectIndex': object_index, 'objectGuid': body.get('$guid'),
                'rawSha256': capture['raw_sha256'], 'rawPath': capture['raw_path'],
                'head': capture['head'], 'descriptorSha256': capture['descriptor_sha256']}

    def direct_body(capture, object_index=0):
        return load_asset(capture)[1]['objects'][object_index]

    hda_capture = capture_by_tail('HDA_Weapons.ebx')
    zda_capture = capture_by_tail('ZDA_Moving_Weapons.ebx')
    dta_primary_capture = capture_by_tail('DTA_Weapons.ebx')
    dta_sidearm_capture = capture_by_tail('DTA_Sidearms.ebx')
    hda_root = direct_body(hda_capture)
    zda_root = direct_body(zda_capture)
    hda_ref_order = [x['$ref'] for x in hda_root['Field_d37c6521']]
    zda_ref_order = [x['$ref'] for x in zda_root['Field_ed5a92bf']]
    hda_rows = [direct_body(hda_capture, i) for i in hda_ref_order]
    zda_rows = [direct_body(zda_capture, i) for i in zda_ref_order]
    assert [r['Field_6c73f45b'] for r in zda_rows] == balance['MOVING_ACC_TIERS']

    hda_fields = {
        'hipStandingCandidate': 'Field_1867639b',
        'hipMovingCandidate': 'Field_c5401fc2',
        'H1JumpSprintCandidate': 'Field_160ef028',
        'H2CrouchStationaryCandidate': 'Field_b3ab862b',
        'H3CrouchMovingCandidate': 'Field_1ef3a223',
        'H4ProneStationaryCandidate': 'Field_553bcee0',
        'H5ProneMovingCandidate': 'Field_39b31415',
    }
    zda_fields = {
        'adsMovingStandingCandidate': 'Field_6c73f45b',
        'adsMovingCrouchedCandidate': 'Field_624b1a88',
        'adsMovingProneCandidate': 'Field_97ff0ca4',
        'adsMovingJumpSprintCandidate': 'Field_bd300f62',
    }
    results = []
    recoil_rows = []
    base_rows = []
    dta_rows = []
    sprint_rows = []
    all_roots = {r['internalId']: r for r in roster}
    for site in weapons:
        wid = site['id']
        root = roster_by_site[wid]
        internal = root['internalId']
        gs_capture = capture_by_sha(root['roots']['GS']['rawCapture']['rawSha256'])
        wb_capture = capture_by_sha(root['roots']['WB']['rawCapture']['rawSha256'])
        gs_ebx, gs_decoded = load_asset(gs_capture)
        wb_ebx, wb_decoded = load_asset(wb_capture)
        gs_object_index = next(i for i, b in enumerate(gs_decoded['objects']) if b.get('$class') == 'Class_539cff9b')
        wb_object_index = None

        recoil = raw_field(gs_capture, gs_object_index, '/Field_c5d1c8fe/Field_7b609515/Field_50b8fd5b')
        recoil_rows.append({'siteId': wid, 'siteValue': balance['RECOIL_MULT'][wid], **recoil,
                            'agreement': abs(recoil['value'] - balance['RECOIL_MULT'][wid]) < 1e-7})
        hip_index = raw_field(gs_capture, gs_object_index, '/Field_fe708077')
        base_rows.append({'siteId': wid, 'siteIndex': balance['HIP_SPREAD_BASE_INDEX'][wid], **hip_index,
                          'agreement': hip_index['value'] == balance['HIP_SPREAD_BASE_INDEX'][wid]})
        ads_index = raw_field(gs_capture, gs_object_index, '/Field_d94fe6ad')
        assert 0 <= hip_index['value'] < len(hda_rows)
        assert 0 <= ads_index['value'] < len(zda_rows)
        hrow_i = hda_ref_order[hip_index['value']]
        zrow_i = zda_ref_order[ads_index['value']]
        hrow = hda_rows[hip_index['value']]
        zrow = zda_rows[ads_index['value']]
        hvals = {}
        for state, field in hda_fields.items():
            hvals[state] = raw_field(hda_capture, hrow_i, '/' + field)
        zvals = {}
        for state, field in zda_fields.items():
            zvals[state] = raw_field(zda_capture, zrow_i, '/' + field)
        site_hip_stand = site['spread']['hipStand'][0]
        site_hip_move = site['spread']['hipMove'][0]
        site_ads_move = site['spread']['adsMove'][0]
        ads_values_match = (abs(zrow['Field_6c73f45b'] - site_ads_move) < 1e-6
                            and abs(zrow['Field_624b1a88'] - site_ads_move) < 1e-6)
        hip_values_match = (abs(hrow['Field_1867639b'] - site_hip_stand) < 1e-6
                            and abs(hrow['Field_c5401fc2'] - site_hip_move) < 1e-6)

        wb_dta = raw_field(wb_capture, wb_object_index, '/Field_2c3e0fbf/Field_2b6f2936')
        wb_sprint = raw_field(wb_capture, wb_object_index, '/Field_5198399a/Field_2b6f2936')
        mag = magazines[wid]
        table_name = mag.get('deployTimeTable', 'primary')
        dt_table = balance['DRAW_TIME_TABLES'][table_name]
        ix = wb_dta['value']
        drow = {'siteId': wid, 'siteBaseIndex': mag['deployBaseIndex'],
                'siteTable': table_name, 'siteDeployMs': dt_table['deploy'][mag['deployBaseIndex']],
                'siteUndeployMs': dt_table['undeploy'][mag['deployBaseIndex']],
                'sourceTableIndex': ix,
                'sourceArrayDeploySeconds': (dt_table['deploy'][ix] / 1000) if 0 <= ix < len(dt_table['deploy']) else None,
                'sourceArrayUndeploySeconds': (dt_table['undeploy'][ix] / 1000) if 0 <= ix < len(dt_table['undeploy']) else None,
                'sourceIndexMatchesSite': ix == mag['deployBaseIndex'], **wb_dta}
        dta_rows.append(drow)
        sprint_rows.append({'siteId': wid, 'siteBaseIndex': mag['sprintRecoveryBaseIndex'],
                            'sourceIndexMatchesSite': wb_sprint['value'] == mag['sprintRecoveryBaseIndex'], **wb_sprint})
        results.append({
            'siteId': wid, 'sourceWeapon': internal,
            'sourceBuild': {'head': 4892017, 'gsRawSha256': gs_capture['raw_sha256'],
                            'wbRawSha256': wb_capture['raw_sha256']},
            'hipSelector': hip_index, 'hipRowObjectIndex': hrow_i,
            'hipMinima': hvals,
            'siteHipStandMin': site_hip_stand, 'siteHipMoveMin': site_hip_move,
            'hipSiteDisplayedFieldsAgree': hip_values_match,
            'adsMovingSelector': ads_index, 'adsMovingRowObjectIndex': zrow_i,
            'adsMovingMinima': zvals, 'siteAdsMovingMin': site_ads_move,
            'adsMovingSiteValueAgreesWithStandingAndCrouchColumns': ads_values_match,
            'h1h5Labels': 'candidate state names from FIELD_MAP; H2-H5 remain provisional pending state binding',
        })

    sym_path = repo / 'outputs/datamine/sym-1.4.2.0/bf6.json'
    sym = json.loads(sym_path.read_text())
    sym_minima_rows = []
    sym_draw_rows = []
    hda_to_sym = {
        'hipStandingCandidate': 'HIPStandBaseMin',
        'hipMovingCandidate': 'HIPStandMoveMin',
        'H2CrouchStationaryCandidate': 'HIPCrouchBaseMin',
        'H3CrouchMovingCandidate': 'HIPCrouchMoveMin',
        'H4ProneStationaryCandidate': 'HIPProneBaseMin',
        'H5ProneMovingCandidate': 'HIPProneMoveMin',
    }
    zda_to_sym = {
        'adsMovingStandingCandidate': 'ADSStandMoveMin',
        'adsMovingCrouchedCandidate': 'ADSCrouchMoveMin',
        'adsMovingProneCandidate': 'ADSProneMoveMin',
    }
    for site, result, draw in zip(weapons, results, dta_rows):
        sym_weapon = sym.get(result['sourceWeapon'].lower())
        assert sym_weapon, result['sourceWeapon']
        sym_spread = sym_weapon['spread']
        source_values = {**{dst: result['hipMinima'][src]['value'] for src, dst in hda_to_sym.items()},
                         **{dst: result['adsMovingMinima'][src]['value'] for src, dst in zda_to_sym.items()}}
        compared = {key: {'source': source_values[key], 'sym': sym_spread[key],
                          'exact': source_values[key] == sym_spread[key]}
                    for key in source_values}
        sym_minima_rows.append({'siteId': site['id'], 'symKey': result['sourceWeapon'].lower(),
                                'hipSelector': result['hipSelector']['value'],
                                'adsMovingSelector': result['adsMovingSelector']['value'],
                                'values': compared})
        sym_draw_rows.append({'siteId': site['id'], 'symKey': result['sourceWeapon'].lower(),
                              'sourceDeploySeconds': draw['sourceArrayDeploySeconds'],
                              'sourceUndeploySeconds': draw['sourceArrayUndeploySeconds'],
                              'symDeploySeconds': sym_weapon['deploy']['DeployTime'],
                              'symUndeploySeconds': sym_weapon['deploy']['UnDeployTime'],
                              'siteDeployMs': draw['siteDeployMs'], 'siteUndeployMs': draw['siteUndeployMs'],
                              'sourceIndexMatchesSite': draw['sourceIndexMatchesSite']})

    # Capture the exact named modifier operands used by the global ladders.
    operands = []
    for tail, field in [
        ('WME_ReloadSpeedRegular_P10.ebx', '/Field_348b8cd1'),
        ('WME_ReloadSpeedDouble_P20.ebx', '/Field_348b8cd1'),
        ('WME_MuzzleVelocity_M05.ebx', '/Field_6a5c4efd'),
        ('WME_MuzzleVelocity_M10.ebx', '/Field_6a5c4efd'),
        ('WME_MuzzleVelocity_M15.ebx', '/Field_6a5c4efd'),
        ('WME_MuzzleVelocity_P05.ebx', '/Field_6a5c4efd'),
    ]:
        capture = capture_by_tail(tail)
        obj_index = 1
        ev = raw_field(capture, obj_index, field)
        operands.append({'sourceAsset': capture['route'], **ev})

    hda_columns = {name: [row[field] for row in hda_rows] for name, field in hda_fields.items()}
    zda_columns = {name: [row[field] for row in zda_rows] for name, field in zda_fields.items()}
    key_counts = {}
    for key, value in balance.items():
        def count_leaves(v):
            if isinstance(v, dict):
                return sum(count_leaves(x) for x in v.values())
            if isinstance(v, list):
                return sum(count_leaves(x) for x in v)
            return 1
        rows = len(value) if isinstance(value, (dict, list)) else 1
        key_counts[key] = {'rows': rows, 'leafValues': count_leaves(value),
                           'type': 'object' if isinstance(value, dict) else 'array' if isinstance(value, list) else 'scalar'}

    output = {
        'schemaVersion': 1,
        'date': '2026-09-23',
        'build': {'gameHead': 4892017, 'descriptorSha256': descriptors[next(iter(descriptors))]['sha256']},
        'inputs': {
            'balanceTables': {'path': str(balance_path), 'sha256': sha(balance_path)},
            'weapons': {'path': str(weapons_path), 'sha256': sha(weapons_path)},
            'attachments': {'path': str(attachments_path), 'sha256': sha(attachments_path)},
            'roster': {'path': str(roster_path), 'sha256': sha(roster_path)},
            'weaponFieldsJsonl': {'path': str(args.report_dir / 'weapon-fields.jsonl'),
                                  'sha256': sha(args.report_dir / 'weapon-fields.jsonl')},
            'sym142': {'path': str(sym_path), 'sha256': sha(sym_path), 'bytes': sym_path.stat().st_size},
        },
        'balanceKeys': key_counts,
        'recoilMult': {'siteWeaponCount': len(recoil_rows), 'matches': sum(r['agreement'] for r in recoil_rows),
                       'sourceField': 'GS Class_539cff9b/Field_c5d1c8fe/Field_7b609515/Field_50b8fd5b', 'rows': recoil_rows},
        'hipSpreadBaseIndex': {'siteWeaponCount': len(base_rows), 'matches': sum(r['agreement'] for r in base_rows),
                               'sourceField': 'GS Class_539cff9b/Field_fe708077', 'rows': base_rows},
        'spreadMinima': {
            'hdaSource': {'path': hda_capture['route'], 'rawSha256': hda_capture['raw_sha256'],
                          'rowReferencePath': 'root Field_d37c6521', 'rowReferenceOrder': hda_ref_order,
                          'columnsBySourceOrder': hda_columns},
            'zdaSource': {'path': zda_capture['route'], 'rawSha256': zda_capture['raw_sha256'],
                          'rowReferencePath': 'root Field_ed5a92bf', 'rowReferenceOrder': zda_ref_order,
                          'columnsBySourceOrder': zda_columns},
            'siteWeaponCount': len(results),
            'hipStandAndMoveMatchCount': sum(r['hipSiteDisplayedFieldsAgree'] for r in results),
            'adsMovingStandingAndCrouchMatchCount': sum(r['adsMovingSiteValueAgreesWithStandingAndCrouchColumns'] for r in results),
            'candidateMeaningLimits': ['H1-H5 labels remain provisional; the raw HDA fields and per-weapon indices are reported without claiming gameplay state consumption.',
                                       'ZDA row is selected by the direct source ref-list order and per-weapon GS Field_d94fe6ad, not by sorting values.',
                                       'The Analyzer exposes standing/moving spread bounds; crouch/prone HDA candidates and prone ADS candidate are not current displayed site fields.'],
            'rows': results,
            'sym142Comparison': {
                'count': len(sym_minima_rows),
                'perFieldExactCounts': {key: sum(r['values'][key]['exact'] for r in sym_minima_rows)
                                        for key in sym_minima_rows[0]['values']},
                'rows': sym_minima_rows,
            },
        },
        'dtaBaseIndex': {'siteWeaponCount': len(dta_rows), 'sourcePathCandidate': 'WB Class_542ac52c/Field_2c3e0fbf/Field_2b6f2936',
                         'siteIndexMatchCount': sum(r['sourceIndexMatchesSite'] for r in dta_rows), 'rows': dta_rows},
        'sprintBaseIndex': {'siteWeaponCount': len(sprint_rows), 'sourcePath': 'WB Class_542ac52c/Field_5198399a/Field_2b6f2936',
                            'siteIndexMatchCount': sum(r['sourceIndexMatchesSite'] for r in sprint_rows), 'rows': sprint_rows},
        'sym142DrawTimingComparison': {
            'siteWeaponCount': len(sym_draw_rows),
            'siteDeployExactMsCount': sum(abs(r['sourceDeploySeconds'] - r['symDeploySeconds']) < 1e-6 for r in sym_draw_rows),
            'siteUndeployExactMsCount': sum(abs(r['sourceUndeploySeconds'] - r['symUndeploySeconds']) < 1e-6 for r in sym_draw_rows),
            'rows': sym_draw_rows,
            'limits': ['Sym is an independently decoded 1.4.2.0 snapshot and is not the 1.4.3.0 Frosty source.',
                       'Per-weapon draw source selector agrees with current site index; time-array and Sym agreement is a cross-version comparison, not proof of runtime consumption.'],
        },
        'namedOperands': operands,
        'limits': ['Raw hashes and individual float32/int32 byte offsets are verified against decoded fields.',
                   'Decoded config, table indices, and current site outputs do not establish native consumption or active multiplayer settings.',
                   'H1-H5 state names, DTA field semantics, and array consumer behavior remain provisional where noted.'],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(args.out), 'sha256': sha(args.out),
                      'recoilMatches': output['recoilMult']['matches'],
                      'hipBaseMatches': output['hipSpreadBaseIndex']['matches'],
                      'hipDisplayedMatches': output['spreadMinima']['hipStandAndMoveMatchCount'],
                      'adsMovingMatches': output['spreadMinima']['adsMovingStandingAndCrouchMatchCount'],
                      'dtaMatches': output['dtaBaseIndex']['siteIndexMatchCount'],
                      'sprintMatches': output['sprintBaseIndex']['siteIndexMatchCount']}, indent=2))


if __name__ == '__main__':
    main()

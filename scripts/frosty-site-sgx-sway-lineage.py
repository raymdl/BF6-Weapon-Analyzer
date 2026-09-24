"""Trace the SGX/MPX muzzle sway override lineage across the current WB and attachment graph."""
import hashlib, json, runpy, sqlite3, struct
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DM = Path(r'C:\Users\royal\Documents\BF6 Datamining')
BASE = DM / 'builds/1.4.3.0'
REP = BASE / 'reports/exhaustive-audit-2026-09-23'
DB = REP / 'coverage-decoder-v5.sqlite'
MAP = ROOT / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json'
OLD_LINKS = ROOT / 'reference-data/provenance/frosty-global-operands-2026-09-13.json'
FOLLOWUP = ROOT / 'reference-data/provenance/frosty-global-followup-2026-09-13.json'
SITE = ROOT / 'data/attachments.json'
MUZZLE_LEAVES = REP / 'frosty-site-muzzle-sway-2026-09-23-leaves.jsonl'
SIM = ROOT / 'sim/applyAttachments.js'
UI = ROOT / 'ui/app.js'
DETAIL = REP / 'frosty-site-sgx-sway-lineage-2026-09-23.jsonl'
OUT = ROOT / 'reference-data/provenance/frosty-site-sgx-sway-lineage-2026-09-23.json'
DEC = runpy.run_path(str(ROOT / 'scripts/frosty-ebx-decode.py'))

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def file_xml(route):
    if not route.lower().endswith('.xml'):
        route += '.xml'
    rel = Path(*route.split('/'))
    for layer in ('xml-overlay', 'xml-changed', 'xml-added', 'xml-rawdiff-extra'):
        p = BASE / 'xml' / layer / rel
        if p.exists():
            return p
    raise FileNotFoundError(route)

def find_field(layout, h, types, base=0, path=None):
    path = list(path or [])
    for f in layout['fields']:
        if f['hash'] == h:
            return base + f['offset'], path + [{'classHash': layout['hash'], 'fieldHash': h, 'offset': f['offset']}]
    for f in layout['fields']:
        if DEC['debug_type'](f['flags']) == 0:
            got = find_field(types['classes'][f['classRef']], h, types, base + f['offset'], path + [{'classHash': layout['hash'], 'inheritedClassHash': types['classes'][f['classRef']]['hash'], 'offset': f['offset']}])
            if got:
                return got
    return None

def capture_assets(db):
    db.row_factory = sqlite3.Row
    captures = {r['route'].casefold(): dict(r) for r in db.execute("select * from captures where head=4892017 and decode_status in ('decoded','decoded-provisional')")}
    assets = {r['file_guid'].lower(): r['route'] for r in db.execute('select file_guid,route from assets') if r['file_guid']}
    imports = {}
    for r in db.execute('select capture_id,ordinal,target_file_guid,target_object_guid from imports'):
        imports.setdefault(r['capture_id'], []).append(dict(r))
    return captures, assets, imports

def main():
    site = json.loads(SITE.read_text(encoding='utf-8'))
    mux = site['MUZZLES']
    ix = {m['id']: i for i, m in enumerate(mux)}
    mp = json.loads(MAP.read_text(encoding='utf-8'))
    choices = {(c['weapon'], c['slot'], c['attachment']): c for c in mp['choices']}
    old = json.loads(OLD_LINKS.read_text(encoding='utf-8'))
    old_all_links = old['attachmentLinks']
    roster = json.loads((ROOT / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json').read_text(encoding='utf-8'))
    rr = next(r for r in roster['roots'] if r.get('siteIdentity') == 'sgx')
    if rr['internalId'] != 'MPX':
        raise ValueError('SGX exact site identity no longer maps to MPX')

    db = sqlite3.connect(f'{DB.resolve().as_uri()}?mode=ro', uri=True)
    captures, assets, imports = capture_assets(db)
    cache = {}
    def load(route):
        c = captures.get(route.casefold())
        if not c:
            raise ValueError(f'no exact current capture for {route}')
        if c['id'] not in cache:
            if sha(c['raw_path']) != c['raw_sha256'] or sha(c['descriptor_path']) != c['descriptor_sha256']:
                raise ValueError(f'raw/descriptor hash mismatch: {route}')
            t = DEC['type_descriptors'](c['descriptor_path'])
            e = DEC['Ebx'](c['raw_path'], t)
            if e.sha256 != c['raw_sha256']:
                raise ValueError(f'decoder hash mismatch: {route}')
            cache[c['id']] = (t, e, e.decode()['objects'])
        return c, *cache[c['id']]

    wb_route = rr['roots']['WB']['rawCapture']['path']
    wb, types, ebx, objects = load(wb_route)
    if wb['raw_sha256'] != rr['roots']['WB']['rawCapture']['rawSha256']:
        raise ValueError('current MPX WB hash differs from exact roster capture')
    local_candidates = [(i, o) for i, o in enumerate(objects) if o.get('$class') == 'Class_2fea847d' and o.get('Field_90fd0310') == 0.975282]
    if len(local_candidates) != 1:
        raise ValueError(f'expected one current local WME .975282 object, found {len(local_candidates)}')
    local_ix, local_obj = local_candidates[0]
    local_class = types['byGuid'][ebx.class_keys[ebx.instances[local_ix]['classRef']]]
    local_rel = find_field(local_class, '90fd0310', types)
    if not local_rel: raise ValueError('local WME Field_90fd0310 absent from descriptor')
    local_pos = ebx.data_start + ebx.data_offsets[local_ix] + local_rel[0]
    local_raw = struct.unpack_from('<f', ebx.data, local_pos)[0]
    if abs(local_raw - 0.975282) > 1e-7: raise ValueError('local WME raw bytes do not support .975282')
    local_xml = file_xml(wb_route + '.xml')
    xmlroot = ET.parse(local_xml).getroot()
    local_xml_obj = next((x for x in xmlroot if x.tag == 'Class_2fea847d' and x.attrib.get('Guid') == '00000000-0000-0000-0000-000000000014'), None)
    if local_xml_obj is None or local_xml_obj.findtext('Field_90fd0310') != '0.975282':
        raise ValueError('current extracted MPX_WB XML object Guid 14 does not match local WME value')
    # The local effect's exact wrapper consumer within this WB lists selector GUIDs and references the object.
    wrappers = [(i, o) for i, o in enumerate(objects) if o.get('$class') == 'Class_897c99a7'
                and '7b53d496-a2d2-4806-acce-3908db82bc19' in o.get('Field_819acc98', [])
                and any(x.get('$ref') == local_ix for x in o.get('Field_9690d604', []))]
    if len(wrappers) != 1:
        raise ValueError(f'conditional-extended wrapper consumer count is {len(wrappers)}')
    wrapper_ix, wrapper_obj = wrappers[0]

    muzzle_rows = [json.loads(x) for x in MUZZLE_LEAVES.read_text(encoding='utf-8').splitlines() if x.strip()]
    long_row = next(r for r in muzzle_rows if r['sitePointer'] == f'/MUZZLES/{ix["long_supp"]}/weaponOverrides/sgx/weaponSwayMult')
    light_row = next(r for r in muzzle_rows if r['sitePointer'] == f'/MUZZLES/{ix["light_supp"]}/weaponOverrides/sgx/weaponSwayMult')
    long_effect = next(e for e in long_row['directWeaponSwayEffects'] if e['route'].endswith('WME_WSway_M05'))
    if abs(0.975282 * 1.5 - mux[ix['long_supp']]['weaponOverrides']['sgx']['weaponSwayMult']) > 1e-12:
        raise ValueError('site long-suppressor value does not equal source decimal product')

    row_specs = [
        {'sitePointer': f'/MUZZLES/{ix["long_supp"]}/weaponOverrides/sgx/weaponSwayMult', 'attachment': 'long_supp', 'siteValue': mux[ix['long_supp']]['weaponOverrides']['sgx']['weaponSwayMult'], 'sourceAttachment': 'Common/Hardware/Weapons/SMG/MPX/Attachment_MPX_MZL_SRD9_Suppressor.xml', 'branchGuid': 'c31fb879-9829-43d0-aaf1-3eb33ba20e89', 'exactSelectors': [{'asset':'Common/Hardware/Weapons/_Attachments/_Shared/U_WPM_ANY_ConditionalExtended','guid':'7b53d496-a2d2-4806-acce-3908db82bc19'}, {'asset':'Common/Hardware/Weapons/_WeaponModifiers/_Muzzle/Suppressor/U_WPM_MZL_Suppressor02_W25','guid':'3eda1130-c3d9-4df5-8d83-65ca7dd381f6'}], 'status': 'source-derived-site-composite-candidate', 'interpretation': 'Site value equals the per-weapon MPX WB local WME factor (0.975282) times the selected SRD9 WPM imported WME_WSway_M05 factor (1.5). The same U_WPM_ANY_ConditionalExtended selector occurs in the WB local WME wrapper and the exact selected source mapping.'},
        {'sitePointer': f'/MUZZLES/{ix["light_supp"]}/weaponOverrides/sgx/weaponSwayMult', 'attachment': 'light_supp', 'siteValue': mux[ix['light_supp']]['weaponOverrides']['sgx']['weaponSwayMult'], 'sourceAttachment': 'Common/Hardware/Weapons/SMG/MPX/Attachment_MPX_MZL_SAICobraSuppressor.xml', 'branchGuid': 'be7a0228-2521-4ac0-8a11-1770a8001d6d', 'exactSelectors': [{'asset':'Common/Hardware/Weapons/_WeaponModifiers/_Muzzle/Suppressor/U_WPM_MZL_ImprvdSuppressor02_W30','guid':'bb26754b-fb9d-467b-96ac-ecd132bc3f95'}], 'status': 'likely-stale-site-source-identity', 'interpretation': 'Current exact site crosswalk maps light_supp to SAICobraSuppressor/selector02. The current MPX WB local WME wrapper does not list selector02, and the selected WPM package has no direct WME_WSway import. The site value equals the WB local 0.975282 factor, but the old operand ledger attached that local operand to Compact_Streamer, which the current exact site crosswalk maps to cqb_supp.'},
        {'sitePointer': f'/MUZZLES/{ix["cqb_supp"]}/weaponOverrides/sgx/weaponSwayMult', 'attachment': 'cqb_supp', 'siteValue': mux[ix['cqb_supp']].get('weaponOverrides', {}).get('sgx', {}).get('weaponSwayMult'), 'sourceAttachment': 'Common/Hardware/Weapons/SMG/MPX/Attachment_MPX_MZL_Compact_Streamer.xml', 'branchGuid': '30fb31c1-2534-40fd-8708-5a2bcd66e0c6', 'exactSelectors': [{'asset':'Common/Hardware/Weapons/_Attachments/_Shared/U_WPM_ANY_ConditionalExtended','guid':'7b53d496-a2d2-4806-acce-3908db82bc19'}, {'asset':'Common/Hardware/Weapons/_WeaponModifiers/_Muzzle/Suppressor/U_WPM_MZL_ImprvdSuppressor01_W30','guid':'1ebabe52-91e9-41f0-a59b-4623694efeda'}], 'status': 'candidate-missing-site-override', 'interpretation': 'Current exact site crosswalk maps Compact_Streamer to cqb_supp. The current MPX WB local WME wrapper lists the exact U_WPM_ANY_ConditionalExtended selector used by this attachment. The prior 9/13 site-source ledger assigned the 0.975282 value to light_supp, indicating likely stale site attachment identity; propose moving the override from light_supp to cqb_supp after reviewing the source-to-site field contract.'}
    ]

    details = []
    for spec in row_specs:
        muzzle_data = mux[ix[spec['attachment']]]
        current_factor = muzzle_data.get('weaponOverrides', {}).get('sgx', {}).get('weaponSwayMult', muzzle_data.get('weaponSwayMult', 1.0))
        if spec['attachment'] == 'light_supp':
            candidate_factor = 1.0
        elif spec['attachment'] == 'cqb_supp':
            candidate_factor = 0.975282
        else:
            candidate_factor = current_factor
        site_impact = {'currentEffectiveWeaponSwayFactor': current_factor,
                       'currentUiDeltaVsNeutralDefaultPercent': round((float(current_factor) - 1.0) * 100, 1),
                       'candidateEffectiveWeaponSwayFactor': candidate_factor,
                       'candidateUiDeltaVsNeutralDefaultPercent': round((float(candidate_factor) - 1.0) * 100, 1),
                       'siteSimulationExpression': 'weaponSwayMult=(muzzle.weaponSwayMult ?? 1) * (selectedMag.weaponSwayMult ?? 1)',
                       'siteSimulationSha256': sha(SIM), 'uiDeltaExpressionSha256': sha(UI)}
        src_path = file_xml(spec['sourceAttachment'])
        attachment_xml_hash = sha(src_path)
        ability_path = file_xml('Common/Hardware/Weapons/SMG/MPX/MPX_Ability.xml')
        ability_hash = sha(ability_path)
        branch = next((x for x in ET.parse(ability_path).getroot().iter() if x.attrib.get('Guid') == spec['branchGuid']), None)
        if branch is None:
            raise ValueError(f'current MPX ability missing exact branch {spec["branchGuid"]}')
        if branch.find('Field_f86e0433') is None or 'MPX_' not in (branch.findtext('Field_f86e0433') or ''):
            raise ValueError(f'branch does not retain MPX progression reference {spec["branchGuid"]}')
        source_links = [x for x in old_all_links if x.get('attachmentXml') == spec['sourceAttachment']]
        local_links = [x for x in source_links if x.get('operand') == 'Common/Hardware/Weapons/SMG/MPX/MPX_WB.xml#00000000-0000-0000-0000-000000000014']
        package_routes = []
        for selector in spec['exactSelectors']:
            choice = choices[('sgx', 'muzzle', spec['attachment'])]
            if not any(s['asset'] == selector['asset'] and s['guid'] == selector['guid'] for src in choice['sources'] for s in src['selectors']):
                raise ValueError(f'exact crosswalk selector missing for {spec["attachment"]}: {selector}')
        # Preserve current package route evidence from the existing selector/import receipt.
        graph_choice = next(c for c in json.loads((REP/'site-spotting-attachment-factor-bindings-2026-09-23.json').read_text(encoding='utf-8'))['choices'] if c['siteWeaponId']=='sgx' and c['slot']=='muzzle' and c['attachment']==spec['attachment'])
        for sel in graph_choice['selectors']:
            for pkg in sel.get('packages', []):
                c = captures.get(pkg['route'].casefold())
                if c and pkg.get('rawSha256') and c['raw_sha256'] != pkg['rawSha256']:
                    raise ValueError(f'package hash mismatch for {pkg["route"]}')
                imps = []
                if c:
                    for imp in imports.get(c['id'], []):
                        route = assets.get(imp['target_file_guid'].lower(), '')
                        if '/sway/wme_wsway_' in route.lower():
                            imps.append({'route': route, 'objectGuid': imp['target_object_guid']})
                package_routes.append({'route': pkg['route'], 'rawSha256': pkg.get('rawSha256'), 'captured': bool(c), 'directWeaponSwayImports': imps})
        details.append({'siteFile': 'data/attachments.json', 'sitePointer': spec['sitePointer'] if spec['siteValue'] is not None else None,
                        'candidateTargetPointer': spec['sitePointer'] if spec['siteValue'] is None else None, 'siteValue': spec['siteValue'],
                        'siteWeapon': 'sgx', 'sourceWeapon': 'MPX', 'attachmentId': spec['attachment'],
                        'sourceAttachmentXml': spec['sourceAttachment'], 'currentAttachmentXmlSha256': attachment_xml_hash,
                        'currentMpXAbilityXmlSha256': ability_hash, 'exactAbilityBranchGuid': spec['branchGuid'],
                        'exactSelectors': spec['exactSelectors'], 'packageRoutes': package_routes,
                        'localWBSwayEffect': {'captureId': wb['id'], 'route': wb['route'], 'head': wb['head'], 'rawSha256': wb['raw_sha256'], 'descriptorSha256': wb['descriptor_sha256'],
                                              'rootObjectGuid': objects[0].get('$guid'), 'wrapperObjectIndex': wrapper_ix, 'wrapperClass': wrapper_obj['$class'],
                                              'wrapperSelectors': wrapper_obj['Field_819acc98'], 'wrapperEffects': wrapper_obj['Field_9690d604'],
                                              'localEffectObjectIndex': local_ix, 'localEffectXmlGuid': '00000000-0000-0000-0000-000000000014', 'localEffectClass': local_obj['$class'],
                                              'fieldPath': '/Field_90fd0310', 'value': local_raw, 'byteOffset': local_pos, 'bytesHex': ebx.data[local_pos:local_pos+4].hex(), 'descriptorPath': local_rel[1],
                                              'currentExtractedXmlSha256': sha(local_xml), 'currentExtractedXmlValue': local_xml_obj.findtext('Field_90fd0310')},
                        'longM05Effect': long_effect if spec['attachment'] == 'long_supp' else None,
                        'historicalOperandLinks': source_links,
                        'historicalLocalWbOperandLinks': local_links,
                        'siteImpact': site_impact,
                        'historicalOperandLedgerSha256': sha(OLD_LINKS),
                        'historicalOperandLinkLimit': 'The 9/13 MPX_WB XML hash differs from the current 1.4.3.0 MPX_WB hash. The current EBX raw object and extracted XML were independently decoded and hashed; historical branch links are corroboration, not current-build raw authority.',
                        'status': spec['status'], 'interpretation': spec['interpretation']})

    long_site = mux[ix['long_supp']]['weaponOverrides']['sgx']['weaponSwayMult']
    product = 0.975282 * 1.5
    assert product == long_site == 1.462923
    detail_hash_path = DETAIL
    with detail_hash_path.open('w', encoding='utf-8', newline='\n') as f:
        for r in details: f.write(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + '\n')
    receipt = {'date': '2026-09-23', 'scope': 'Reconcile SGX/MPX long, light, and CQB muzzle sway values using exact attachment identities, local WB WME selectors, and selected WPM effect imports.',
               'siteSha256': sha(SITE), 'attachmentMappingSha256': sha(MAP), 'oldOperandLedgerSha256': sha(OLD_LINKS),
               'historicalFollowupSha256': sha(FOLLOWUP), 'muzzleSwayLedgerSha256': sha(MUZZLE_LEAVES),
               'currentMpXWbRawSha256': wb['raw_sha256'], 'currentMpXWbDescriptorSha256': wb['descriptor_sha256'],
               'currentMpXWbXmlSha256': sha(local_xml), 'oldMpXWbXmlSha256': old.get('sourceSha256', {}).get('Common/Hardware/Weapons/SMG/MPX/MPX_WB.xml'),
               'localValue': local_raw, 'longWmeFactor': long_effect['rawValue'], 'localTimesLongWme': product,
               'siteLongValue': long_site, 'longProductMatchesSite': product == long_site,
               'findings': {'long_supp': 'The source-compatible composite is corroborated by exact shared conditional selector, current local WB field bytes, and selected direct WPM M05 field bytes; native composition remains unproved.',
                            'light_supp': 'Likely stale site source identity: current exact map is SAICobraSuppressor/selector02, while the old provenance attached .975282 to Compact_Streamer; current exact map assigns Compact_Streamer to cqb_supp.',
                            'cqb_supp': 'Likely missing site override candidate .975282 from current MPX WB local sway WME, because current exact attachment selects U_WPM_ANY_ConditionalExtended listed by the WB local WME wrapper.'},
               'proposal': 'Review moving the SGX .975282 weaponSwayMult override from light_supp to cqb_supp. Current site deltas are light −2.5% and CQB neutral; the candidate move makes light neutral and CQB −2.5%. Keep long_supp at 1.462923 as a source-compatible 0.975282×1.5 composite candidate. This does not claim native runtime activation or composition.',
               'detail': {'path': str(detail_hash_path), 'sha256': sha(detail_hash_path), 'rows': len(details)},
               'scriptSha256': sha(__file__),
               'limits': ['The exact WME fields, branch selectors, attachment identity crosswalk, and captures establish serialized source links only.', 'The 9/13 operand ledger has an older MPX_WB XML hash than current 1.4.3.0; current raw EBX/descriptor values and current extracted XML are separately verified.', 'No game-process or runtime change was performed.']}
    OUT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'receipt': str(OUT), 'receiptSha256': sha(OUT), 'detail': str(DETAIL), 'detailSha256': sha(DETAIL), 'longProduct': product, 'localOffset': local_pos, 'localBytes': ebx.data[local_pos:local_pos+4].hex()}, ensure_ascii=False))

if __name__ == '__main__':
    main()

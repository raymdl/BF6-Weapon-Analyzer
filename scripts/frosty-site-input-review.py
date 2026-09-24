"""Attach reviewed field evidence to the exact site-input inventory.

Only direct comparisons supplied here close a source-value row. Unreviewed rows
stay pending, even if a nearby field or an entire source asset has been decoded.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out-dir', type=Path, required=True)
    ap.add_argument('--summary', type=Path, required=True)
    args = ap.parse_args()
    repo = Path(__file__).resolve().parents[1]
    prov = repo / 'reference-data/provenance'
    inventory_path = prov / 'frosty-site-input-inventory-v3-2026-09-23.json'
    inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
    for file in inventory['files']:
        assert sha(repo / file['path']) == file['sha256'], f'Site snapshot changed: {file["path"]}'
    data_path = Path(inventory['artifacts'][0]['path'])
    assert sha(data_path) == inventory['artifacts'][0]['sha256']
    out_path = args.out_dir / 'site-input-reviewed.jsonl'
    pending_path = args.out_dir / 'site-input-pending.jsonl'
    if out_path.exists() or pending_path.exists() or args.summary.exists():
        ap.error('Use new output paths.')
    args.out_dir.mkdir(parents=True, exist_ok=True)
    evidence, receipts = defaultdict(list), []
    weapons = json.loads((repo / 'data/weapons.json').read_text(encoding='utf-8'))
    weapon_index = {w['id']: i for i, w in enumerate(weapons)}

    def add(key, entry, expected, agreement='match'):
        entry['expectedSiteValue'] = expected
        entry['sourceSiteAgreement'] = str(agreement)
        evidence[key].append(entry)

    def add_receipt(path):
        p = Path(path)
        receipts.append({'path': str(p.resolve()), 'sha256': sha(p)})
        return json.loads(p.read_text(encoding='utf-8'))

    def receipt(name):
        p = prov / name
        d = json.loads(p.read_text(encoding='utf-8'))
        details = Path(d['details']['path'])
        assert sha(details) == d['details']['sha256']
        receipts.append({'path': str(p.resolve()), 'sha256': sha(p)})
        return d, details

    def candidate_next_step(row):
        site_file, pointer = row['siteFile'], row['pointer']
        if site_file == 'data/balance_tables.json' and pointer.startswith('/COLLATERAL_MULT_OVERRIDE/'):
            return 'Run matched multiplayer damage captures for this weapon/ammo against the relevant material and confirm the native table index and multiplier composition.'
        if site_file == 'data/weapons.json' and pointer.endswith('/recoilV'):
            return 'Compare this weapon’s predicted recoil vector with repeated controlled hip and ADS firing captures using the exact default loadout.'
        if site_file == 'data/weapons.json' and pointer.endswith('/rpm'):
            return 'Use the pinned per-weapon cadence equations to compare accepted shot intervals in multiplayer; test bolt and Recon states separately where applicable.'
        if site_file == 'data/weapons.json' and pointer.endswith('/tacRld'):
            return 'Measure the corresponding tactical reload phases in multiplayer and compare them with the pinned ReloadInfoArray candidate.'
        if site_file == 'data/weapons.json' and pointer.endswith(('/burstRpm', '/burstBurstsPerMinute')):
            return 'Measure several complete burst intervals in multiplayer and compare the displayed cadence and rounding against the pinned source candidates.'
        if site_file == 'data/weapons.json' and pointer.endswith('/burstRounds'):
            return 'Trace the exact fire-mode selector for this weapon and confirm burst shot count with controlled multiplayer firing.'
        if site_file == 'data/attachments.json' and pointer.startswith('/BARRELS/') and ('/velMult' in pointer or '/velTierMod' in pointer):
            return 'Confirm the typed WME MuzzleVelocity field mapping, then compare projectile velocity for this selected barrel in a controlled multiplayer capture.'
        if site_file == 'data/attachments.json' and pointer.startswith('/MUZZLES/'):
            return 'Resolve the exact weapon selector and WME composition for this muzzle, then compare matched multiplayer camera-motion captures with and without the attachment.'
        if site_file == 'data/attachments.json' and pointer == '/ERGOS/5/noEffect':
            return 'Follow the ADS Bolt receipt: compare accepted shot intervals and ADS phases with and without DLC Bolt on the four eligible rifles, then test Recon separately.'
        return 'Resolve the named source field and operator for this exact site pointer, then run the smallest controlled multiplayer capture that distinguishes the remaining model alternatives.'

    precision, path = receipt('frosty-site-precision-2026-09-23.json')
    for line in path.open(encoding='utf-8'):
        row = json.loads(line)
        assert row['status'] == 'match'
        add((row['siteFile'], row['pointer']), {
            'sourceReceipt': receipts[-1]['path'], 'sourceAsset': precision['source']['route'],
            'sourceRawSha256': precision['source']['raw_sha256'], 'sourceHead': precision['source']['head'],
            'sourceObjectGuid': row['objectGuid'], 'sourceFieldPath': row['sourcePointer'],
            'sourceValue': row['sourceValue'], 'rawWords': row['rawWords'],
            'remainingUncertainty': 'Native lookup/wildcard/interpolation rules and retained multi-scalar weapon association.'}, row['siteValue'])
    spread, path = receipt('frosty-site-spread-reviewed-2026-09-23.json')
    details = json.loads(path.read_text(encoding='utf-8'))
    assets = {a['id']: a for a in details['assets']}
    for row in details['comparisons']:
        assert row['status'] == 'match'
        asset = assets[row['captureId']]
        pointer = '/' + str(weapon_index[row['siteWeapon']]) + '/' + row['siteField'].replace('.', '/')
        add(('data/weapons.json', pointer), {
            'sourceReceipt': receipts[-1]['path'], 'sourceAsset': asset['route'],
            'sourceRawSha256': asset['raw_sha256'], 'sourceHead': asset['head'],
            'sourceObjectGuid': row['objectGuid'], 'sourceFieldPath': row['pointer'],
            'sourceValue': row['sourceValue'], 'rawWords': [{k: row[k] for k in ('byteOffset', 'bytesHex', 'rawFloat32')}],
            'context': row.get('context', 'stationary'), 'nameEvidence': row['nameEvidence'],
            'remainingUncertainty': 'Native recovery equation, state switch, idle/first-shot consumption and activation.'}, row['siteValue'])

    # The recoil receipt maps each site's stored recovery operands to the exact
    # descriptor field and raw float offset. Do not map named spring/fade/pattern
    # values into model inputs: those consumers remain unresolved.
    recoil = add_receipt(prov / 'frosty-site-recoil-2026-09-23.json')
    recoil_detail_path = Path(recoil['externalDetail']['path'])
    assert sha(recoil_detail_path) == recoil['externalDetail']['sha256']
    receipts.append({'path': str(recoil_detail_path.resolve()), 'sha256': recoil['externalDetail']['sha256']})
    recoil_detail = json.loads(recoil_detail_path.read_text(encoding='utf-8'))
    recoil_asset = {(a['siteWeapon'], a['captureId']): a for a in recoil_detail['assets']}
    for source in recoil_detail['rawFields']:
        site_field = source.get('siteField')
        if source.get('siteStatus') != 'match' or not site_field or site_field.startswith('synthetic'):
            continue
        pointer = f'/{weapon_index[source["siteWeapon"]]}/' + site_field.replace('.', '/')
        asset = recoil_asset[(source['siteWeapon'], source['captureId'])]
        add(('data/weapons.json', pointer), {
            'sourceReceipt': str((prov / 'frosty-site-recoil-2026-09-23.json').resolve()),
            'sourceDetail': str(recoil_detail_path.resolve()), 'sourceAsset': asset['route'],
            'sourceRawSha256': source['rawSha256'], 'sourceHead': source['head'],
            'sourceObjectGuid': source['objectGuid'], 'sourceFieldPath': source['pointer'],
            'sourceValue': source['sourceValue'],
            'rawWords': [{'byteOffset': source['byteOffset'], 'bytesHex': source['rawBytesHex'], 'rawValue': source['rawFloatOrInt']}],
            'remainingUncertainty': 'Stored recoil operand matches site. Native equation, application timing, and active consumer remain unproved.'}, source['siteValue'])

    # Constants with field-level byte comparisons, plus source-ordered shared
    # arrays. No equation constants are inferred from matching operands.
    constants_path = prov / 'frosty-site-constants-2026-09-23.json'
    constants = add_receipt(constants_path)
    constants_detail_path = Path(constants['detailReport'])
    assert sha(constants_detail_path) == constants['detailReportSha256']
    receipts.append({'path': str(constants_detail_path.resolve()), 'sha256': constants['detailReportSha256']})
    constants_detail = json.loads(constants_detail_path.read_text(encoding='utf-8'))
    balance = json.loads((repo / 'data/balance_tables.json').read_text(encoding='utf-8'))
    for operand in constants.get('rawNamedOperands', []):
        destination = operand['siteDestination']
        if destination == 'RELOAD_SPEED_MULTIPLIERS':
            table_key = destination
        elif destination == 'VELOCITY_LADDER^signedTier':
            table_key = 'VELOCITY_LADDER'
        else:
            continue
        pointer = f'/{table_key}'
        if table_key == 'RELOAD_SPEED_MULTIPLIERS':
            try:
                index = balance[table_key].index(operand['value'])
            except ValueError:
                continue
            pointer += f'/{index}'
        else:
            if operand['value'] != balance[table_key]:
                continue
        raw_operand = next((entry for entry in constants_detail['namedOperands']
                            if entry['sourceAsset'] == operand['sourcePath'] and entry['pointer'] == operand['fieldPath']), None)
        if not raw_operand:
            continue
        add(('data/balance_tables.json', pointer), {
            'sourceReceipt': str(constants_path.resolve()), 'sourceAsset': operand['sourcePath'],
            'sourceRawSha256': operand['rawSha256'], 'sourceHead': operand['gameHead'],
            'sourceFieldPath': operand['fieldPath'], 'sourceValue': operand['value'],
            'rawWords': [{'byteOffset': raw_operand['byteOffset'], 'bytesHex': raw_operand['bytesHex'], 'rawValue': raw_operand['rawValue']}],
            'remainingUncertainty': 'Named modifier scalar directly matches the stored site constant. The site’s ladder exponent/composition behavior remains a separate model rule.'}, operand['value'])
    for group, balance_key, value_key in (
        ('recoilMult', 'RECOIL_MULT', 'siteValue'),
        ('hipSpreadBaseIndex', 'HIP_SPREAD_BASE_INDEX', 'siteIndex')):
        for source in constants_detail[group]['rows']:
            if source.get('agreement') is False:
                continue
            add(('data/balance_tables.json', f'/{balance_key}/{source["siteId"]}'), {
                'sourceReceipt': str(constants_path.resolve()), 'sourceDetail': str(constants_detail_path.resolve()),
                'sourceAsset': source['rawPath'], 'sourceRawSha256': source['rawSha256'], 'sourceHead': source['head'],
                'sourceObjectGuid': source.get('objectGuid'), 'sourceFieldPath': source['pointer'],
                'sourceValue': source.get('rawValue', source['value']),
                'rawWords': [{'byteOffset': source['byteOffset'], 'bytesHex': source['bytesHex'], 'rawValue': source.get('rawValue', source['value'])}],
                'remainingUncertainty': 'Source base selector matches the stored site input; use of the selector in the native runtime remains unproved.'}, source[value_key])
    for source in constants_detail['spreadMinima']['rows']:
        for src_key, site_key, suffix in (
            ('hipStandingCandidate', 'siteHipStandMin', 'hipStand/0'),
            ('hipMovingCandidate', 'siteHipMoveMin', 'hipMove/0'),
            ('adsMovingStandingCandidate', 'siteAdsMovingMin', 'adsMove/0')):
            src = source.get('hipMinima', {}).get(src_key) or source.get('adsMovingMinima', {}).get(src_key)
            if not src:
                continue
            if src_key.startswith('hip') and not source.get('hipSiteDisplayedFieldsAgree'):
                continue
            if src_key.startswith('ads') and not source.get('adsMovingSiteValueAgreesWithStandingAndCrouchColumns'):
                continue
            add(('data/weapons.json', f'/{weapon_index[source["siteId"]]}/spread/{suffix}'), {
                'sourceReceipt': str(constants_path.resolve()), 'sourceDetail': str(constants_detail_path.resolve()),
                'sourceAsset': src['rawPath'], 'sourceRawSha256': src['rawSha256'], 'sourceHead': src['head'],
                'sourceObjectGuid': src.get('objectGuid'), 'sourceFieldPath': src['pointer'],
                'sourceValue': src.get('rawValue', src['value']),
                'rawWords': [{'byteOffset': src['byteOffset'], 'bytesHex': src['bytesHex'], 'rawValue': src.get('rawValue', src['value'])}],
                'remainingUncertainty': 'Source array value matches the site column; state labeling and native selector consumption remain separate.'}, source[site_key])
    for group, leaf_name in (('dtaBaseIndex', 'deployBaseIndex'), ('sprintBaseIndex', 'sprintRecoveryBaseIndex')):
        for source in constants_detail[group]['rows']:
            if not source.get('sourceIndexMatchesSite'):
                continue
            add(('data/attachments.json', f'/WEAPON_MAG/{source["siteId"]}/{leaf_name}'), {
                'sourceReceipt': str(constants_path.resolve()), 'sourceDetail': str(constants_detail_path.resolve()),
                'sourceAsset': source['rawPath'], 'sourceRawSha256': source['rawSha256'], 'sourceHead': source['head'],
                'sourceObjectGuid': source.get('objectGuid'), 'sourceFieldPath': source['pointer'],
                'sourceValue': source.get('rawValue', source['value']),
                'rawWords': [{'byteOffset': source['byteOffset'], 'bytesHex': source['bytesHex'], 'rawValue': source.get('rawValue', source['value'])}],
                'remainingUncertainty': 'Source base index matches the site. Timing table and runtime consumption are separate questions.'}, source['siteBaseIndex'])
    ordered_checks = {r['siteTable']: r for r in constants.get('arrayChecks', []) if r.get('agreement') is True}
    # HDA_Weapons is a serialized 18-row reference list with seven mapped scalar
    # columns. The receipt retains source order and exact value columns; do not
    # infer these from a coincidentally equal value elsewhere in the EBX.
    hda = constants_detail['spreadMinima']['hdaSource']
    hda_field_hashes = {
        'hipStandingCandidate': 'Field_1867639b', 'hipMovingCandidate': 'Field_c5401fc2',
        'H1JumpSprintCandidate': 'Field_160ef028', 'H2CrouchStationaryCandidate': 'Field_b3ab862b',
        'H3CrouchMovingCandidate': 'Field_1ef3a223', 'H4ProneStationaryCandidate': 'Field_553bcee0',
        'H5ProneMovingCandidate': 'Field_39b31415'}
    hda_site_fields = dict(zip(hda_field_hashes, ('hipStand', 'hipMove', 'Field_160ef028', 'Field_b3ab862b',
                                                  'Field_1ef3a223', 'Field_553bcee0', 'Field_39b31415')))
    for column, field_hash in hda_field_hashes.items():
        source_values = hda['columnsBySourceOrder'][column]
        assert len(source_values) == len(hda['rowReferenceOrder']) == len(balance['HIP_SPREAD_TABLE'])
        for index, source_value in enumerate(source_values):
            site_field = hda_site_fields[column]
            site_value = balance['HIP_SPREAD_TABLE'][index][site_field]
            assert site_value == source_value, (index, column, source_value, site_value)
            add(('data/balance_tables.json', f'/HIP_SPREAD_TABLE/{index}/{site_field}'), {
                'sourceReceipt': str(constants_path.resolve()), 'sourceAsset': hda['path'],
                'sourceRawSha256': hda['rawSha256'],
                'sourceFieldPath': f"{hda['rowReferencePath']} reference[{hda['rowReferenceOrder'][index]}]/{field_hash}",
                'sourceReferenceIndex': hda['rowReferenceOrder'][index], 'sourceValue': source_value, 'rawWords': [],
                'remainingUncertainty': 'The complete serialized HDA reference order and column values match. This sources stored dispersion inputs only; state binding/consumer semantics remain separate.'}, site_value, 'exact-ordered-reference-values')

    for key in ('MOVING_ACC_TIERS', 'ADS_SPD_TIERS', 'ADS_MOVE_TIERS'):
        check = ordered_checks.get(key)
        if not check:
            continue
        for index, value in enumerate(balance[key]):
            add(('data/balance_tables.json', f'/{key}/{index}'), {
                'sourceReceipt': str(constants_path.resolve()), 'sourceAsset': check.get('sourcePath'),
                'sourceRawSha256': check.get('sourceRawSha256'), 'sourceFieldPath': f"{check.get('sourcePath')}[{index}]",
                'sourceValue': value, 'rawWords': [],
                'remainingUncertainty': 'Serialized array order is verified; per-weapon selector use and native consumer semantics are separate.'}, value)
    # DTA primary/sidearm deploy and undeploy tables are source seconds
    # converted to site milliseconds. Sprint's 12 values have no complete source
    # match in this receipt and intentionally remain pending.
    for table_name in ('primary', 'sidearm'):
        check = ordered_checks.get(f'DRAW_TIME_TABLES.{table_name}')
        if not check:
            continue
        table = balance['DRAW_TIME_TABLES'][table_name]
        for axis, source_hash in (('deploy', 'Field_ada3e7d9'), ('undeploy', 'Field_6225d335')):
            for index, site_value in enumerate(table[axis]):
                source_value = site_value / 1000
                add(('data/balance_tables.json', f'/DRAW_TIME_TABLES/{table_name}/{axis}/{index}'), {
                    'sourceReceipt': str(constants_path.resolve()), 'sourceAsset': check.get('sourcePath'),
                    'sourceRawSha256': check.get('sourceRawSha256'),
                    'sourceFieldPath': f"Field_70fd8f5f[{index}]/{source_hash}",
                    'sourceValue': source_value, 'rawWords': [],
                    'remainingUncertainty': 'DTA source seconds convert to stored milliseconds. The input table match does not prove gameplay transition timing.'}, site_value, 'match-after-seconds-to-ms')

    # The ADS source receipt traces the WB zoom index to the site's magazine
    # default selector. It does not source every attachment's operation/order.
    ads_path = prov / 'frosty-site-ads-2026-09-23.json'
    ads = add_receipt(ads_path)
    ads_detail_path = Path(ads['fullEvidence']['path'])
    assert sha(ads_detail_path) == ads['fullEvidence']['sha256']
    receipts.append({'path': str(ads_detail_path.resolve()), 'sha256': ads['fullEvidence']['sha256']})
    ads_full = json.loads(ads_detail_path.read_text(encoding='utf-8'))
    for source in ads_full['siteInventory']['rows']:
        # defAds chooses the zoom-transition timing table. Animation zoom is a
        # distinct Mobility input (notably L115), so it must not source this leaf.
        field = source['source']['wbWeaponZoomTransitionIndex']
        if source['siteInput']['weaponMagDefAdsIndex'] != field['value']:
            continue
        add(('data/attachments.json', f'/WEAPON_MAG/{source["siteId"]}/defAds'), {
            'sourceReceipt': str(ads_path.resolve()), 'sourceAsset': field['route'],
            'sourceDetail': str(ads_detail_path.resolve()),
            'sourceRawSha256': field['rawSha256'], 'sourceHead': field['archiveHead'],
            'sourceFieldPath': field['pointer'], 'sourceValue': field['value'], 'rawWords': [],
            'remainingUncertainty': 'Source WB animation zoom base index equals site default selector input. ADS selector/runtime consumption is not established.'}, field['value'])

    # Sprint table tiers have a dedicated current-build receipt. Join only the
    # 12 exact indexed source values with offset/hex evidence; their consumers
    # and the meaning of the duplicate timing fields remain unproved.
    sprint_receipt = ads.get('SSA_Sprint')
    if sprint_receipt:
        sprint_path = Path(sprint_receipt['path'])
        assert sha(sprint_path) == sprint_receipt['sha256']
        receipts.append({'path': str(sprint_path.resolve()), 'sha256': sprint_receipt['sha256']})
        sprint_detail = json.loads(sprint_path.read_text(encoding='utf-8'))
        tiers = sprint_detail['SSA_Weapons']['orderedTierAssets']
        sprint_site = balance['DRAW_TIME_TABLES']['sprint']
        assert len(tiers) == len(sprint_site) == 12
        for index, tier in enumerate(tiers):
            raw_words, source_values = [], []
            for field_hash in ('Field_0eb3af2f', 'Field_1392aeff'):
                field = tier['fields'][field_hash]
                raw = field['raw']
                assert raw.get('size') == 4 and len(raw.get('hex', '')) == 8, (index, field_hash, raw)
                raw_words.append({'byteOffset': raw['offset'], 'bytesHex': raw['hex'], 'rawValue': field['value']})
                source_values.append(field['value'])
            site_value = sprint_site[index]
            assert all(abs(value * 1000 - site_value) <= 0.002 for value in source_values), (index, source_values, site_value)
            add(('data/balance_tables.json', f'/DRAW_TIME_TABLES/sprint/{index}'), {
                'sourceReceipt': str(ads_path.resolve()), 'sourceDetail': str(sprint_path.resolve()),
                'sourceAsset': tier['route'], 'sourceRawSha256': tier['sha256'], 'sourceHead': sprint_detail['build']['archiveHead'],
                'sourceObjectGuid': tier['objectGuid'], 'sourceObjectIndex': tier['objectIndex'],
                'sourceFieldPath': [f"{sprint_detail['SSA_Weapons']['route']}/Field_25b57f30[{index}] -> {tier['route']}/{name}"
                                    for name in ('Field_0eb3af2f', 'Field_1392aeff')],
                'sourceValue': source_values, 'rawWords': raw_words,
                'remainingUncertainty': 'Both indexed source seconds fields convert to the site milliseconds within 2 microseconds. Field meaning and runtime consumption remain unresolved.'},
                site_value, 'match-after-seconds-to-ms-within-2us')

    # Timing fields join only when the direct source candidate equals the site
    # reload seconds, or bound primary RateOfFire is within the audited tolerance.
    timing_path = prov / 'frosty-site-timing-2026-09-23.json'
    timing = add_receipt(timing_path)
    timing_detail_path = Path(timing['detailedEvidence']['path'])
    assert sha(timing_detail_path) == timing['detailedEvidence']['sha256']
    receipts.append({'path': str(timing_detail_path.resolve()), 'sha256': timing['detailedEvidence']['sha256']})
    timing_detail = json.loads(timing_detail_path.read_text(encoding='utf-8'))
    for source in timing_detail['rows']:
        wi = weapon_index[source['siteId']]
        rpm = source['source'].get('rateOfFire', {})
        if source['comparison'].get('rpmMatchesWithin0.01') and rpm.get('status') == 'equal-scalar':
            add(('data/weapons.json', f'/{wi}/rpm'), {
                'sourceReceipt': str(timing_path.resolve()), 'sourceDetail': str(timing_detail_path.resolve()),
                'sourceAsset': source['sourcePath'], 'sourceRawSha256': source['rawSha256'],
                'sourceFieldPath': rpm['fieldPath'], 'sourceValue': rpm['rawOffsetValue'],
                'rawWords': [{'byteOffset': rpm['rawOffset'], 'bytesHex': rpm['rawFloat32Hex'], 'rawValue': rpm['rawOffsetValue']}],
                'remainingUncertainty': 'Registry-bound primary RateOfFire is close to displayed RPM; bolt-action and selector-specific cadence rules may differ.'}, source['site']['rpm'], 'within-0.01')
        for site_key, field_hash, cmp_key, semantic in (
            ('tacRld', 'Field_fc66e75e', 'tacDifference', 'ReloadTimeBulletsLeft'),
            ('emptyRld', 'Field_85ff24a0', 'emptyDifference', 'ReloadTime')):
            if source['comparison'].get(cmp_key) != 0:
                continue
            for entry in source['source'].get('entries', []):
                if entry['values'].get(field_hash) != source['site'][site_key]:
                    continue
                if field_hash not in entry.get('rawFieldOffsets', {}) or field_hash not in entry.get('rawOffsetValues', {}):
                    continue
                add(('data/weapons.json', f'/{wi}/{site_key}'), {
                    'sourceReceipt': str(timing_path.resolve()), 'sourceDetail': str(timing_detail_path.resolve()),
                    'sourceAsset': source['sourcePath'], 'sourceRawSha256': source['rawSha256'],
                    'sourceFieldPath': f"{entry['fieldPath']}/{field_hash}",
                    'sourceValue': entry['rawOffsetValues'][field_hash],
                    'rawWords': [{'byteOffset': entry['rawFieldOffsets'][field_hash], 'bytesHex': entry['rawFloat32Hex'][field_hash], 'rawValue': entry['rawOffsetValues'][field_hash]}],
                    'remainingUncertainty': f'{semantic} field value matches site; native reload phase/selector semantics remain unresolved.'}, source['site'][site_key])

    zero_path = prov / 'frosty-site-zeroing-2026-09-23.json'
    zero = add_receipt(zero_path)
    zero_detail_path = Path(zero['all63Details']['path'])
    assert sha(zero_detail_path) == zero['all63Details']['sha256']
    receipts.append({'path': str(zero_detail_path.resolve()), 'sha256': zero['all63Details']['sha256']})

    # Tooltips are source UI text, never mechanics. Preserve the reviewed
    # sourced/blocked/project-metadata statuses as a separate ledger category.
    tooltip_path = prov / 'frosty-site-tooltips-2026-09-23.json'
    tooltip = add_receipt(tooltip_path)
    tooltip_detail = Path(tooltip['details']['path'])
    assert sha(tooltip_detail) == tooltip['details']['sha256']
    receipts.append({'path': str(tooltip_detail.resolve()), 'sha256': tooltip['details']['sha256']})
    for source in tooltip_detail.open(encoding='utf-8'):
        item = json.loads(source)
        add((item['siteFile'], item['pointer']), {
            'sourceReceipt': str(tooltip_path.resolve()), 'sourceDetail': str(tooltip_detail.resolve()),
            'sourceFieldPath': item.get('sourceFieldPath'), 'sourceValue': item['siteValue'],
            'rawWords': [], 'sourceSiteAgreement': item['sourceSiteAgreement'],
            'reviewStatusOverride': item['reviewStatus'], 'evidence': item.get('evidence'),
            'remainingUncertainty': item.get('remainingUncertainty', 'Source UI text does not establish mechanics.')}, item['siteValue'], item['sourceSiteAgreement'])

    references_path = prov / 'frosty-site-references-2026-09-23.json'
    references = add_receipt(references_path)
    reference_detail = Path(references['details']['path'])
    assert sha(reference_detail) == references['details']['sha256']
    receipts.append({'path': str(reference_detail.resolve()), 'sha256': references['details']['sha256']})
    for source_file in references.get('sourceFiles', []):
        assert sha(source_file['path']) == source_file['sha256'], source_file['path']
        receipts.append({'path': source_file['path'], 'sha256': source_file['sha256']})
    for source in reference_detail.open(encoding='utf-8'):
        item = json.loads(source)
        add((item['siteFile'], item['pointer']), {
            'sourceReceipt': str(references_path.resolve()), 'sourceDetail': str(reference_detail.resolve()),
            'sourceFieldPath': item.get('sourceFieldPath'), 'sourceValue': item['siteValue'],
            'rawWords': [], 'sourceSiteAgreement': item.get('sourceSiteAgreement'),
            'reviewStatusOverride': item['reviewStatus'], 'evidence': item.get('evidence'),
            'remainingUncertainty': item.get('remainingUncertainty', 'Source reference does not prove runtime consumer liveness.')},
            item['siteValue'], item.get('sourceSiteAgreement', 'recorded-status'))

    attribute_path = prov / 'frosty-site-attribute-extras-2026-09-23.json'
    attribute_extras = add_receipt(attribute_path)
    attribute_site = attribute_extras['site']
    assert sha(attribute_site['path']) == attribute_site['sha256']
    attribute_detail = Path(attribute_extras['details']['path'])
    assert sha(attribute_detail) == attribute_extras['details']['sha256']
    receipts.append({'path': str(attribute_detail.resolve()), 'sha256': attribute_extras['details']['sha256']})
    for source in attribute_detail.open(encoding='utf-8'):
        item = json.loads(source)
        add((item['siteFile'], item['pointer']), {
            'sourceReceipt': str(attribute_path.resolve()), 'sourceDetail': str(attribute_detail.resolve()),
            'sourceFieldPath': item.get('sourceFieldPath'), 'sourceValue': item['siteValue'],
            'rawWords': [], 'sourceSiteAgreement': item.get('sourceSiteAgreement'),
            'reviewStatusOverride': item['reviewStatus'], 'evidence': item.get('evidence'),
            'remainingUncertainty': item.get('remainingUncertainty', 'Attribute input source or interpretation remains unresolved.')},
            item['siteValue'], item.get('sourceSiteAgreement', 'recorded-status'))

    weapon_labels_path = prov / 'frosty-site-weapon-labels-2026-09-23.json'
    weapon_labels = add_receipt(weapon_labels_path)
    weapon_labels_detail = Path(weapon_labels['details']['path'])
    assert sha(weapon_labels_detail) == weapon_labels['details']['sha256']
    receipts.append({'path': str(weapon_labels_detail.resolve()), 'sha256': weapon_labels['details']['sha256']})
    for source_file in [weapon_labels['sourceStrings'], *weapon_labels['metadataXml']]:
        assert sha(source_file['path']) == source_file['sha256'], source_file['path']
        receipts.append({'path': source_file['path'], 'sha256': source_file['sha256']})
    for source in weapon_labels_detail.open(encoding='utf-8'):
        item = json.loads(source)
        add((item['siteFile'], item['pointer']), {
            'sourceReceipt': str(weapon_labels_path.resolve()), 'sourceDetail': str(weapon_labels_detail.resolve()),
            'sourceFieldPath': item.get('sourceFieldPath'), 'sourceValue': item['siteValue'],
            'rawWords': [], 'sourceSiteAgreement': item.get('sourceSiteAgreement'),
            'reviewStatusOverride': item['reviewStatus'], 'evidence': item.get('evidence'),
            'remainingUncertainty': item.get('remainingUncertainty', 'Identity or UI label binding remains uncertain.')},
            item['siteValue'], item.get('sourceSiteAgreement', 'recorded-status'))

    # `provenance` objects are dated source/observation metadata, not modeled
    # weapon attributes. Keep every leaf visible with an explicit excluded
    # status only after confirming no current sim/ui consumer reads this key.
    runtime_files = [repo / 'app.js', repo / 'index.html']
    for folder in ('sim', 'ui'):
        runtime_files.extend(p for p in (repo / folder).rglob('*') if p.is_file() and p.suffix in ('.js', '.html'))
    provenance_consumers = []
    for runtime_file in runtime_files:
        if not runtime_file.exists():
            continue
        if 'provenance' in runtime_file.read_text(encoding='utf-8', errors='replace'):
            provenance_consumers.append(str(runtime_file.relative_to(repo)))
    assert not provenance_consumers, provenance_consumers
    for wi, weapon in enumerate(weapons):
        if 'provenance' not in weapon:
            continue
        def provenance_leaves(node, path):
            if isinstance(node, dict):
                for key, value in node.items():
                    provenance_leaves(value, f'{path}/{key}')
            elif isinstance(node, list):
                for index, value in enumerate(node):
                    provenance_leaves(value, f'{path}/{index}')
            else:
                add(('data/weapons.json', path), {
                    'sourceReceipt': str(inventory_path.resolve()), 'sourceFieldPath': None,
                    'sourceValue': node, 'rawWords': [], 'sourceSiteAgreement': 'not-applicable',
                    'reviewStatusOverride': 'project-metadata',
                    'remainingUncertainty': 'Dated source/observation ledger metadata; no consumer reference exists in current app.js, index.html, sim/*.js, or ui/*.js.'}, node, 'not-applicable')
        provenance_leaves(weapon['provenance'], f'/{wi}/provenance')

    # Current-build leaf ledgers completed after the initial review. Join them
    # only by exact current site pointer and value. Keep runtime/model blockers
    # explicit as statuses; raw field presence is not a runtime-consumption claim.
    report_root = Path(r'C:\Users\royal\Documents\BF6 Datamining\builds\1.4.3.0\reports\exhaustive-audit-2026-09-23')
    def ledger_jsonl(name):
        p = report_root / name
        receipts.append({'path': str(p.resolve()), 'sha256': sha(p)})
        return [json.loads(line) for line in p.open(encoding='utf-8')]

    def ledger_json(name):
        p = report_root / name
        receipts.append({'path': str(p.resolve()), 'sha256': sha(p)})
        return json.loads(p.read_text(encoding='utf-8'))

    def leaf_join(row, site_file=None, pointer_key='sitePointer', value_key='siteValue', status=None,
                  uncertainty=None, source_detail=None, source_row_index=None):
        file_name = row.get('siteFile', site_file)
        pointer = row.get(pointer_key)
        if not file_name or not pointer or value_key not in row:
            return
        status = status or row.get('reviewStatus') or row.get('status')
        if status in ('xml-generated-match', 'source-byte-verified-match', 'sourced-configuration', 'match', 'sourced-configuration-derived-ms'):
            mapped_status = 'sourced-configuration'
        elif status == 'precisely-blocked-runtime':
            mapped_status = 'precisely-blocked-source'
        elif status in ('precisely-blocked-wpm-property-semantics', 'precisely-blocked-selected-mode-BPM'):
            mapped_status = 'precisely-blocked-source'
        elif status == 'software-contract':
            mapped_status = 'software-contract'
        elif status == 'mismatch-with-proposal':
            mapped_status = 'mismatch-with-proposal'
        elif status in ('source-model-candidate', 'precisely-blocked-source', 'software-field-unused',
                        'unavailable-software-choice', 'project-metadata', 'software-schema-metadata',
                        'retained-observation', 'project-identity', 'sourced-ui-xml', 'software-only',
                        'software-neutral-sentinel', 'software-or-site-convention', 'site-label-metadata',
                        'observation-provenance-metadata', 'software-record-identity', 'software-metadata-derived',
                        'observation-metadata', 'gameplay-observation-known-bug', 'observation-context',
                        'gameplay-observation-composed-loadout'):
            mapped_status = status
        else:
            if status:
                raise ValueError(f'Unmapped explicit review status {status!r} for {file_name}:{pointer}')
            return
        agreement_value = row.get('sourceSiteAgreement') or row.get('agreement')
        if agreement_value is not None and not isinstance(agreement_value, str):
            agreement_value = json.dumps(agreement_value, sort_keys=True)
        entry = {'sourceReceipt': str(source_detail.resolve()) if source_detail else 'current-build per-leaf evidence',
                 'sourceFieldPath': row.get('sourceFieldPath') or row.get('sourceValueFieldPath'),
                 'sourceValue': row.get('sourceValue'), 'sourceSiteAgreement': agreement_value,
                 'reviewStatusOverride': mapped_status,
                 'remainingUncertainty': uncertainty or row.get('remainingUncertainty') or row.get('limit') or
                    'The source/configuration comparison does not establish native runtime consumption.'}
        # Retain the complete reviewed source row. Narrow whitelists silently
        # dropped nested raw sourceWB/table/WPM records needed for auditability.
        entry['leafEvidence'] = row
        if source_detail:
            entry['sourceDetailPath'] = str(source_detail.resolve())
            entry['sourceDetailRowIndex'] = source_row_index
        add((file_name, pointer), entry, row[value_key], agreement_value or 'reviewed-leaf')

    # Attachment and weapon-input numeric reviews, including exact side ledgers.
    for row in ledger_jsonl('site-attachment-numeric-review-2026-09-23.jsonl'):
        if row.get('status') != 'pending-review':
            leaf_join(row, 'data/attachments.json', pointer_key='pointer', status=row['status'])
    for name, ptr in (('site-barrel-ads-leaf-review-2026-09-23.jsonl', 'sitePointer'),
                      ('site-attachment-spotting-leaf-review-2026-09-23.jsonl', 'sitePointer')):
        for row in ledger_jsonl(name):
            status = 'precisely-blocked-source' if name.startswith('site-attachment-spotting') else 'sourced-configuration'
            leaf_join(row, 'data/attachments.json', pointer_key=ptr, status=status,
                      uncertainty='Current selector/effect evidence is recorded. Native selection priority, activation, and composition remain unresolved.' if status == 'precisely-blocked-source' else None)

    spread_base_receipt_path = prov / 'frosty-site-spread-base-2026-09-23.json'
    spread_base_receipt = add_receipt(spread_base_receipt_path)
    spread_base_detail = Path(spread_base_receipt['detailReport'])
    assert sha(spread_base_detail) == spread_base_receipt['detailReportSha256']
    receipts.append({'path': str(spread_base_detail.resolve()), 'sha256': spread_base_receipt['detailReportSha256']})
    for line in spread_base_detail.open(encoding='utf-8'):
        row = json.loads(line)
        weapon_id = row['siteWeapon']
        source_pointer = row['sitePointer']
        if source_pointer.startswith(f'/{weapon_index[weapon_id]}/'):
            pointer = source_pointer
        else:
            tail = source_pointer.split(f'/weapons/{weapon_id}', 1)[1]
            pointer = f'/{weapon_index[weapon_id]}' + tail
        src = row['source']
        add(('data/weapons.json', pointer), {
            'sourceReceipt': str(spread_base_receipt_path.resolve()), 'sourceDetail': str(spread_base_detail.resolve()),
            'sourceAsset': src.get('sourcePath'), 'sourceRawSha256': src.get('sourceRawSha256'),
            'descriptorSha256': src.get('sourceDescriptorSha256'), 'sourceObjectGuid': src.get('sourceObjectGuid'),
            'sourceObjectIndex': src.get('sourceObjectIndex'), 'sourceFieldPath': src.get('sourceFieldPath'),
            'sourceValue': src.get('sourceRawValue'),
            'rawWords': [{'byteOffset': src.get('sourceByteOffset'), 'bytesHex': src.get('sourceBytesHex'), 'rawValue': src.get('sourceRawValue')}],
            'sourceSiteAgreement': 'exact-current-GS-leaf', 'reviewStatusOverride': 'sourced-configuration',
            'remainingUncertainty': row.get('uncertainty') or 'Direct GS dispersion input matches site value; actual engine selection/state consumption remains unproved.'},
            row['siteValue'], 'exact-current-GS-leaf')

    # Per-leaf weapon timing/reload and reload-exception evidence.
    reload_receipt = add_receipt(prov / 'frosty-reload-exceptions-leaves-2026-09-23.json')
    reload_detail = Path(reload_receipt['externalPerLeaf']['path'])
    assert sha(reload_detail) == reload_receipt['externalPerLeaf']['sha256']
    receipts.append({'path': str(reload_detail.resolve()), 'sha256': reload_receipt['externalPerLeaf']['sha256']})
    for row in ledger_jsonl('site-reload-exceptions-per-leaf-2026-09-23.jsonl'):
        leaf_join(row, 'data/reload-exceptions.json', pointer_key='pointer')
    for row in ledger_jsonl('frosty-site-draw-2026-09-23-leaves.jsonl'):
        leaf_join(row, 'data/balance_tables.json', pointer_key='pointer')
    for row in ledger_jsonl('frosty-site-magazines-2026-09-23-leaves.jsonl'):
        leaf_join(row, 'data/attachments.json', pointer_key='sitePointer', status=row.get('reviewStatus') or row.get('status') or 'sourced-configuration')
    for row in ledger_jsonl('site-balance-operands-leaf-review-2026-09-23.jsonl'):
        leaf_join(row, 'data/balance_tables.json', pointer_key='sitePointer')

    ammo_effect_receipt = add_receipt(prov / 'frosty-site-ammo-effects-2026-09-23.json')
    ammo_effect_detail = Path(ammo_effect_receipt['details']['path'])
    assert sha(ammo_effect_detail) == ammo_effect_receipt['details']['sha256']
    receipts.append({'path': str(ammo_effect_detail.resolve()), 'sha256': ammo_effect_receipt['details']['sha256']})
    for row in ammo_effect_detail.open(encoding='utf-8'):
        leaf_join(json.loads(row), 'data/ammo.json', pointer_key='sitePointer')

    ammo_cost_summary_path = report_root / 'site-ammo-point-cost-current-summary-2026-09-23.json'
    ammo_cost_summary = json.loads(ammo_cost_summary_path.read_text(encoding='utf-8'))
    ammo_cost_detail = Path(ammo_cost_summary['details'])
    assert sha(ammo_cost_detail) == ammo_cost_summary['detailsSha256']
    receipts.append({'path': str(ammo_cost_summary_path.resolve()), 'sha256': sha(ammo_cost_summary_path)})
    receipts.append({'path': str(ammo_cost_detail.resolve()), 'sha256': ammo_cost_summary['detailsSha256']})
    for row in ammo_cost_detail.open(encoding='utf-8'):
        item = json.loads(row)
        evidence_raw = item.get('rawEvidence', {})
        add(('data/ammo.json', item['siteLeafPointer']), {
            'sourceFieldPath': item.get('sourceValuePath'), 'sourceValue': item.get('sourcePointValue'),
            'sourceAsset': item.get('sourceRoute'), 'sourceRawSha256': evidence_raw.get('rawSha256'),
            'descriptorSha256': evidence_raw.get('descriptorSha256'),
            'rawWords': [{'byteOffset': evidence_raw.get('absoluteRawOffset'), 'bytesHex': evidence_raw.get('rawBytesHex'),
                          'rawValue': evidence_raw.get('rawUInt32')}],
            'sourceSiteAgreement': item.get('sourceSiteAgreement'), 'reviewStatusOverride': 'sourced-configuration',
            'remainingUncertainty': 'Exact selected ammo attachment point cost matches current stored value and raw uint32 bytes; selection/runtime semantics are separate.'},
            item['siteEffectiveValue'], item.get('sourceSiteAgreement', 'exact-ammo-point-cost'))

    ammo_velocity_receipt_path = prov / 'frosty-site-ammo-velocity-2026-09-23.json'
    ammo_velocity_receipt = add_receipt(ammo_velocity_receipt_path)
    ammo_velocity_detail = Path(ammo_velocity_receipt['details']['path'])
    assert sha(ammo_velocity_detail) == ammo_velocity_receipt['details']['sha256']
    receipts.append({'path': str(ammo_velocity_detail.resolve()), 'sha256': ammo_velocity_receipt['details']['sha256']})
    for line in ammo_velocity_detail.open(encoding='utf-8'):
        row = json.loads(line)
        add((row['siteFile'], row['sitePointer']), {
            'sourceReceipt': str(ammo_velocity_receipt_path.resolve()), 'sourceDetail': str(ammo_velocity_detail.resolve()),
            'sourceFieldPath': [record.get('sourceFieldPath') for record in row.get('sourceRecords', [])],
            'sourceValue': row.get('sourceMultiplier'), 'sourceSiteAgreement': str(row.get('sourceSiteAgreement')),
            'reviewStatusOverride': row.get('reviewStatus'), 'leafEvidence': row,
            'remainingUncertainty': row.get('remainingUncertainty')},
            row['siteValue'], str(row.get('sourceSiteAgreement', 'recorded-velocity-review')))

    for receipt_name, status in (('frosty-site-magazine-sway-2026-09-23.json', 'sourced-configuration'),
                                 ('frosty-site-muzzle-sway-2026-09-23.json', 'source-model-candidate')):
        sway_receipt = add_receipt(prov / receipt_name)
        sway_detail = Path(sway_receipt['detail']['path'])
        assert sha(sway_detail) == sway_receipt['detail']['sha256']
        receipts.append({'path': str(sway_detail.resolve()), 'sha256': sway_receipt['detail']['sha256']})
        for line in sway_detail.open(encoding='utf-8'):
            row = json.loads(line)
            leaf_join(row, 'data/attachments.json', pointer_key='sitePointer', status=status,
                      uncertainty=row.get('remainingUncertainty'))

    muzzle_operands_path = prov / 'frosty-site-muzzle-operands-2026-09-23.json'
    muzzle_operands = add_receipt(muzzle_operands_path)
    muzzle_detail = Path(muzzle_operands['details']['path'])
    assert sha(muzzle_detail) == muzzle_operands['details']['sha256']
    receipts.append({'path': str(muzzle_detail.resolve()), 'sha256': muzzle_operands['details']['sha256']})
    muzzle_xml_hashes = Path(muzzle_operands['xmlHashes']['path'])
    assert sha(muzzle_xml_hashes) == muzzle_operands['xmlHashes']['sha256']
    receipts.append({'path': str(muzzle_xml_hashes.resolve()), 'sha256': muzzle_operands['xmlHashes']['sha256']})
    for line in muzzle_detail.open(encoding='utf-8'):
        row = json.loads(line)
        status = row['reviewStatus']
        add((row['siteFile'], row['sitePointer']), {
            'sourceReceipt': str(muzzle_operands_path.resolve()), 'sourceDetail': str(muzzle_detail.resolve()),
            'sourceFieldPath': row.get('sourceFieldPath'), 'sourceValue': row.get('sourceValue'),
            'sourceSiteAgreement': str(row.get('sourceSiteAgreement')), 'reviewStatusOverride': status,
            'leafEvidence': row,
            'remainingUncertainty': row.get('remainingUncertainty') or 'Selected source/selector comparisons are preserved; native priority, activation and composition remain unresolved.'},
            row['siteValue'], str(row.get('sourceSiteAgreement', 'recorded-muzzle-review')))

    timing_final_receipt = add_receipt(prov / 'frosty-site-timing-leaves-final-2026-09-23.json')
    timing_final_detail = Path(timing_final_receipt['externalPerLeaf']['path'])
    assert sha(timing_final_detail) == timing_final_receipt['externalPerLeaf']['sha256']
    receipts.append({'path': str(timing_final_detail.resolve()), 'sha256': timing_final_receipt['externalPerLeaf']['sha256']})
    for row in timing_final_detail.open(encoding='utf-8'):
        leaf_join(json.loads(row), 'data/weapons.json', pointer_key='pointer')

    selectors_receipt_path = prov / 'frosty-site-weapmag-base-selectors-2026-09-23.json'
    selectors_receipt = add_receipt(selectors_receipt_path)
    selectors_detail = Path(selectors_receipt['externalReport']['path'])
    assert sha(selectors_detail) == selectors_receipt['externalReport']['sha256']
    receipts.append({'path': str(selectors_detail.resolve()), 'sha256': selectors_receipt['externalReport']['sha256']})
    selectors_data = json.loads(selectors_detail.read_text(encoding='utf-8'))
    selector_leaf_count = 0
    for row in selectors_data['rows']:
        source_record = row.get('source', [])
        sources = source_record if isinstance(source_record, list) else [source_record] if isinstance(source_record, dict) else []
        selected = next((src for src in sources if src.get('symbol') == 'WeaponZoomTransitionIndex'), None)
        if not selected:
            selected = sources[0] if sources else {}
        if 'wbPath' in selected:
            selected = {'path': selected.get('wbPath'), 'value': selected.get('wbValue'),
                        'route': selected.get('wbRoute'), 'rawSha256': selected.get('wbRawSha256'),
                        'raw': selected.get('wbRawBytes')}
        raw = selected.get('raw', {})
        if not raw and isinstance(row.get('rawValidation'), dict):
            raw = {'offset': row['rawValidation'].get('byteOffset'), 'hex': row['rawValidation'].get('bytesHex')}
        source_name = selected.get('symbol') or selected.get('path')
        leaf_status = 'sourced-configuration' if raw.get('hex') and selected.get('value') == row['siteValue'] else 'precisely-blocked-source'
        add(('data/attachments.json', row['path']), {
            'sourceReceipt': str(selectors_receipt_path.resolve()), 'sourceDetail': str(selectors_detail.resolve()),
            'sourceFieldPath': selected.get('path'), 'sourceValue': selected.get('value'),
            'sourceAsset': selected.get('route'), 'sourceRawSha256': selected.get('rawSha256'),
            'rawWords': [{'byteOffset': raw.get('offset'), 'bytesHex': raw.get('hex'), 'rawValue': selected.get('value')}],
            'sourceSiteAgreement': row.get('siteAgreement'), 'reviewStatusOverride': leaf_status,
            'remainingUncertainty': row.get('limit', 'Source field equality does not establish runtime selector consumption.')},
            row['siteValue'], row.get('siteAgreement', 'selector-ledger'))
        selector_leaf_count += 1

    # String/key identity review covers exact catalog IDs, source-linked
    # compatibility, Analyzer contracts and explicitly unproven default-state
    # selectors. Key-reference rows are supplemental and are not site leaves.
    choice_path = report_root / 'site-choice-identities-detail-final-2026-09-23.json'
    choice_receipt = prov / 'frosty-site-choice-identities-2026-09-23-v3.json'
    choice_compact = json.loads(choice_receipt.read_text(encoding='utf-8'))
    assert sha(choice_path) == choice_compact['externalDetail']['sha256']
    receipts.append({'path': str(choice_receipt.resolve()), 'sha256': sha(choice_receipt)})
    receipts.append({'path': str(choice_path.resolve()), 'sha256': sha(choice_path)})
    choice_status = {
        'XML-graph+raw-captured-asset': 'sourced-configuration', 'XML/AAM': 'sourced-configuration',
        'XML-graph compatibility evidence': 'sourced-configuration',
        'choice-linked-default-unproven': 'precisely-blocked-source',
        'software-contract': 'software-contract', 'Analyzer-model-configuration': 'software-contract',
        'software-only': 'software-field-unused', 'software-neutral-sentinel': 'software-field-unused',
        'software-or-site-convention': 'software-contract', 'unreachable-catalog-variant': 'unavailable-software-choice'}
    choice_detail = json.loads(choice_path.read_text(encoding='utf-8'))
    for row in choice_detail['rows']:
        if row['path'].endswith('/@key'):
            continue
        grade = row.get('evidence', {}).get('sourceGrade')
        status = choice_status.get(grade)
        if not status:
            continue
        add((row['file'], row['path']), {
            'sourceReceipt': str(choice_receipt.resolve()), 'sourceDetail': str(choice_path.resolve()),
            'sourceValue': row['value'], 'sourceSiteAgreement': 'exact-string-or-key-identity',
            'reviewStatusOverride': status, 'semantic': row.get('semantic'), 'sourceGrade': grade,
            'evidence': row.get('evidence'),
            'remainingUncertainty': 'Identity/availability relation is reviewed. Exact default-state selection and native runtime priority remain separate.'
                if grade == 'choice-linked-default-unproven' else
                'String/key identity or site contract is classified from the cited source grade; this does not source mechanics.'},
            row['value'], 'exact-string-or-key-identity')

    # Numeric attachment effects and projectiles use their reviewed pointer
    # namespaces. Route-escaped projectile scalar pointers are normalized to
    # RFC 6901 before joining the inventory.
    projectile_receipt = add_receipt(prov / 'frosty-site-input-leaves-2026-09-23.json')
    projectile_detail_path = Path(projectile_receipt['detail']['path'])
    assert sha(projectile_detail_path) == projectile_receipt['detail']['sha256']
    receipts.append({'path': str(projectile_detail_path.resolve()), 'sha256': projectile_receipt['detail']['sha256']})
    projectile_detail_rows = ledger_jsonl('projectile-site-input-leaves.jsonl')
    for row_index, row in enumerate(projectile_detail_rows):
        leaf_join(row, pointer_key='sitePointer', status=row.get('reviewStatus') or 'sourced-configuration',
                  source_detail=projectile_detail_path, source_row_index=row_index)
    hit_zone_detail = report_root / 'site-hit-zones-leaf-byte-comparison-2026-09-23.json'
    hit_zone_rows = ledger_json(hit_zone_detail.name)['leaves']
    for row_index, row in enumerate(hit_zone_rows):
        leaf_join(row, pointer_key='sitePointer', status='sourced-configuration',
                  source_detail=hit_zone_detail, source_row_index=row_index)
    collateral_detail = report_root / 'site-collateral-current-perleaf-source-2026-09-23.json'
    collateral_rows = ledger_json(collateral_detail.name)['leaves']
    for row_index, row in enumerate(collateral_rows):
        leaf_join(row, pointer_key='sitePointer', status='source-model-candidate',
                  uncertainty='Current source and table candidate reproduces the stored collateral multiplier. Native table-index selection/composition remains unproved.',
                  source_detail=collateral_detail, source_row_index=row_index)

    # Exact current raw-field receipts for weapon base inputs, ammunition and
    # current WB index/identity fields.
    recoil_base = ledger_json('site-recoil-base-current-perleaf-2026-09-23.json')
    for row in recoil_base['rows']:
        index = weapon_index[row['siteWeapon']]
        pointer = '/' + str(index) + row['sitePointer'][len('/id=' + row['siteWeapon']):]
        row = dict(row, siteFile='data/weapons.json', sitePointer=pointer,
                   sourceFieldPath=row.get('pointer'), sourceRawSha256=row.get('rawSha256'),
                   sourceSiteAgreement='match-within-3e-6', status='sourced-configuration')
        leaf_join(row)
    fire_mag = ledger_json('site-firemode-magazine-source-leaves-2026-09-23.json')
    for row in fire_mag['rows']:
        index = weapon_index[row['siteWeapon']]
        mag = next((c for c in row.get('sourceCandidates', []) if c.get('semanticField') == 'MagazineCapacity'), None)
        if mag:
            entry = {'sourceFieldPath': mag.get('sourceFieldPath'), 'sourceValue': mag.get('rawValue'),
                     'rawBytesHex': mag.get('rawBytesHex'), 'byteOffset': mag.get('byteOffset'),
                     'rawSha256': mag.get('rawSha256'), 'sourceSiteAgreement': 'match',
                     'reviewStatusOverride': 'sourced-configuration',
                     'remainingUncertainty': 'The current WB magazine-capacity candidate matches stored capacity; runtime loading semantics remain separate.'}
            add(('data/weapons.json', f'/{index}/mag'), entry, row['siteValues']['mag'])
    wb_enum = ledger_jsonl('wb-variable-field-triage.jsonl')
    for row in wb_enum:
        # The field is a source candidate for fireMode; the enum interpretation
        # remains unresolved unless the triage receipt supplies an explicit map.
        site_weapon = next((w for w in weapons if w['id'] == row.get('siteWeapon')), None)
        if site_weapon is None:
            continue
        wi = weapon_index[site_weapon['id']]
        add(('data/weapons.json', f'/{wi}/fireMode'), {
            'sourceFieldPath': row['fieldPath'], 'sourceValue': row['decodedValue'], 'rawBytesHex': row['rawBytesHex'],
            'byteOffset': row['rawByteOffset'], 'rawSha256': row['rawSha256'],
            'sourceSiteAgreement': 'candidate-enum-map-unresolved', 'reviewStatusOverride': 'precisely-blocked-source',
            'remainingUncertainty': 'Current WB field and raw bytes are verified; mapping of its integer value to Analyzer mode labels and runtime selection is unresolved.'},
            site_weapon['fireMode'], 'candidate-enum-map-unresolved')

    # The root-level recoil aliases are direct current-build inputs, but their
    # role differs: recoilV is a derived source-model candidate, while direction,
    # variation and incremental ADS spread are stored source configuration.
    # Fire-mode enum meaning remains a separate runtime/label question.
    root_inputs_path = prov / 'frosty-site-recoil-root-leaves-2026-09-23.json'
    root_inputs_receipt = add_receipt(root_inputs_path)
    root_inputs_detail = Path(root_inputs_receipt['externalLeaves']['path'])
    assert sha(root_inputs_detail) == root_inputs_receipt['externalLeaves']['sha256']
    receipts.append({'path': str(root_inputs_detail.resolve()), 'sha256': root_inputs_receipt['externalLeaves']['sha256']})
    for line in root_inputs_detail.open(encoding='utf-8'):
        row = json.loads(line)
        field = row.get('sourceField')
        model = row.get('sourceModel')
        status = ('precisely-blocked-source' if row['status'] == 'precisely-blocked-WB-enum-semantics'
                  else row['status'])
        if field:
            source_paths, source_values = [field['pointer']], [field['sourceValue']]
            raw_fields = [{k: field.get(k) for k in ('fieldName', 'byteOffset', 'rawBytesHex', 'rawSha256', 'descriptorSha256')}]
        elif model:
            source_paths = [term['pointer'] for term in model['terms']]
            source_values = [term['sourceValue'] for term in model['terms']]
            raw_fields = [{k: term.get(k) for k in ('fieldName', 'pointer', 'byteOffset', 'rawBytesHex', 'objectIndex', 'objectGuid', 'class')}
                          for term in model['terms']]
        else:
            source_paths, source_values, raw_fields = [], [], []
        add((row['siteFile'], row['sitePointer']), {
            'sourceReceipt': str(root_inputs_path.resolve()),
            'sourceDetail': str(root_inputs_detail.resolve()),
            'sourceBuildHead': row['sourceBuildHead'], 'sourceAsset': field.get('asset') if field else None,
            'sourceObjectIndex': field.get('objectIndex') if field else [term.get('objectIndex') for term in model['terms']],
            'sourceObjectGuid': field.get('objectGuid') if field else [term.get('objectGuid') for term in model['terms']],
            'sourceClass': (field.get('class') or field.get('objectClass')) if field else [term.get('class') for term in model['terms']],
            'sourceFieldPath': source_paths, 'sourceFieldName': field.get('fieldName') if field else model.get('formula'),
            'sourceValue': field.get('sourceValue') if field else source_values,
            'rawWords': raw_fields,
            'sourceRawSha256': field.get('rawSha256') if field else model.get('sourceRawSha256'),
            'descriptorSha256': field.get('descriptorSha256') if field else model.get('descriptorSha256'),
            'sourceSiteAgreement': row.get('agreement', row.get('candidateComparison', {}).get('currentCategoricalAlignment')),
            'reviewStatusOverride': status,
            'applicationComparison': row.get('applicationComparison'),
            'remainingUncertainty': row['remainingUncertainty']}, row['siteValue'],
            row.get('agreement', 'candidate-enum-map-unresolved'))

    catalog_extras_receipt_path = prov / 'frosty-site-attachment-catalog-extras-2026-09-23.json'
    catalog_extras_receipt = add_receipt(catalog_extras_receipt_path)
    catalog_extras_detail = Path(catalog_extras_receipt['details']['path'])
    assert sha(catalog_extras_detail) == catalog_extras_receipt['details']['sha256']
    receipts.append({'path': str(catalog_extras_detail.resolve()), 'sha256': catalog_extras_receipt['details']['sha256']})
    for line in catalog_extras_detail.open(encoding='utf-8'):
        row = json.loads(line)
        entry = {k: row.get(k) for k in ('sourceFieldPath', 'sourceAsset', 'sourceObjectGuid', 'rawPath',
                                          'rawSha256', 'descriptorSha256', 'byteOffset', 'bytesHex',
                                          'remainingUncertainty')}
        entry.update(sourceReceipt=str(catalog_extras_receipt_path.resolve()),
                     sourceDetail=str(catalog_extras_detail.resolve()),
                     sourceValue=row.get('sourceValue'), sourceSiteAgreement=row.get('sourceSiteAgreement'),
                     reviewStatusOverride=row['reviewStatus'])
        add((row['siteFile'], row['sitePointer']), entry, row['siteValue'], row.get('sourceSiteAgreement', 'classified'))

    grips_sights_receipt_path = prov / 'frosty-site-grips-sights-effect-review-2026-09-23.json'
    grips_sights_receipt = add_receipt(grips_sights_receipt_path)
    grips_sights_detail = Path(grips_sights_receipt['detailReport'])
    assert sha(grips_sights_detail) == grips_sights_receipt['detailSha256']
    receipts.append({'path': str(grips_sights_detail.resolve()), 'sha256': grips_sights_receipt['detailSha256']})
    grips_sights = json.loads(grips_sights_detail.read_text(encoding='utf-8'))
    def grip_sight_status(label):
        if label.startswith('source byte match') or label == 'selector graph reviewed; source value is weapon-specific':
            return 'sourced-configuration'
        if label == 'source mismatch; proposal required':
            return 'mismatch-with-proposal'
        if label.startswith('Analyzer UI flag') or label.startswith('site neutral sentinel'):
            return 'software-contract'
        if label.startswith('no mapped current site selector') or label.startswith('no mapped site selector'):
            return 'unavailable-software-choice'
        if label.startswith('exact selector graph reviewed'):
            return 'precisely-blocked-source'
        raise ValueError(f'Unknown grip/sight review status: {label}')
    for row in grips_sights['rows']:
        if row['path'] == '/GRIPS/17/frostyModifiers/ks18k/movingAdsSpreadTierMod':
            status = 'precisely-blocked-source'
            evidence_row = dict(row, supersededProposal=row.get('proposal'), proposal=None)
            uncertainty = ('The -1 GDM value is bound through distinct owner collection Field_b30a73ed, not the '
                           'moving-ADS collection. Twelve indicator captures support site zero within one pixel; '
                           'the distinct collection target remains unresolved.')
        else:
            status = grip_sight_status(row['status'])
            evidence_row = row
            uncertainty = (row.get('limit') or
                'Source fields and selector graph are reviewed; native multiplayer activation/composition remains unproved.')
        entry = {'sourceReceipt': str(grips_sights_receipt_path.resolve()),
                 'sourceDetail': str(grips_sights_detail.resolve()),
                 'sourceBuildHead': grips_sights_receipt['build']['archiveHead'],
                 'reviewStatusOverride': status, 'sourceSiteAgreement': row['status'],
                 'siteId': row.get('siteId'), 'siteName': row.get('siteName'),
                 'weaponOverride': row.get('weaponOverride'),
                 'sourceFieldEvidence': evidence_row.get('sourceFieldEvidence', []),
                 'selectorCoverage': evidence_row.get('selectorCoverage', []),
                 'comparisonRule': evidence_row.get('comparisonRule'),
                 'leafEvidence': evidence_row,
                 'remainingUncertainty': uncertainty}
        add(('data/attachments.json', row['path']), entry, row['siteValue'], row['status'])

    sgx_sway_receipt_path = prov / 'frosty-site-sgx-sway-lineage-2026-09-23.json'
    sgx_sway_receipt = add_receipt(sgx_sway_receipt_path)
    sgx_sway_detail = Path(sgx_sway_receipt['detail']['path'])
    assert sha(sgx_sway_detail) == sgx_sway_receipt['detail']['sha256']
    receipts.append({'path': str(sgx_sway_detail.resolve()), 'sha256': sgx_sway_receipt['detail']['sha256']})
    sgx_rows = [json.loads(line) for line in sgx_sway_detail.open(encoding='utf-8')]
    sgx_by_pointer = {row['sitePointer']: row for row in sgx_rows if row.get('sitePointer')}
    sgx_all_evidence = sgx_rows
    for pointer, status in (('/MUZZLES/11/weaponOverrides/sgx/weaponSwayMult', 'source-model-candidate'),
                            ('/MUZZLES/12/weaponOverrides/sgx/weaponSwayMult', 'mismatch-with-proposal')):
        row = sgx_by_pointer[pointer]
        key = ('data/attachments.json', pointer)
        if status == 'mismatch-with-proposal':
            for prior in evidence.get(key, []):
                if (prior.get('sourceReceipt') == str(muzzle_operands_path.resolve()) or
                        prior.get('sourceSiteAgreement') == 'no-direct-captured-weapon-sway-effect'):
                    prior.pop('reviewStatusOverride', None)
        add(key, {'sourceReceipt': str(sgx_sway_receipt_path.resolve()),
                  'sourceDetail': str(sgx_sway_detail.resolve()),
                  'sourceSiteAgreement': row['status'], 'reviewStatusOverride': status,
                  'leafEvidence': sgx_all_evidence,
                  'remainingUncertainty': sgx_sway_receipt['limits'][0]}, row['siteValue'], row['status'])

    # Supplemental spotting-agent attachment receipts. Keep tier semantics
    # pending where the source audit did not establish an exact site mapping.
    spotting_specs = [
        ('frosty-site-dynamic-hip-spread-2026-09-23.json', 'details', 'path', 'sha256'),
        ('frosty-site-suppressor-flag-2026-09-23.json', 'details', 'path', 'sha256'),
        ('frosty-site-barrel-shifts-2026-09-23.json', 'details', 'path', 'sha256'),
        ('frosty-site-barrel-velocity-2026-09-23.json', 'details', 'path', 'sha256'),
    ]
    spotting_ledgers = {}
    for filename, detail_key, detail_path_key, detail_hash_key in spotting_specs:
        compact_path = prov / filename
        compact = add_receipt(compact_path)
        detail_path = Path(compact[detail_key][detail_path_key])
        detail_hash = compact[detail_key][detail_hash_key]
        assert sha(detail_path) == detail_hash
        receipts.append({'path': str(detail_path.resolve()), 'sha256': detail_hash})
        spotting_ledgers[filename] = (compact_path, compact, detail_path)

    hip_path, hip_receipt, hip_detail = spotting_ledgers['frosty-site-dynamic-hip-spread-2026-09-23.json']
    hip_fields = ('hipSpreadIncMult', 'hipSpreadFiringDecCoefMult', 'hipSpreadFiringDecOffsetMult',
                  'hipSpreadNotFiringDecOffsetMult', 'hipSpreadIdleDecOffsetMult')
    for line in hip_detail.open(encoding='utf-8'):
        row = json.loads(line)
        for field_name in hip_fields:
            pointer = row['sitePointer'] + '/' + field_name
            value = row['siteFields'][field_name]
            add(('data/attachments.json', pointer), {
                'sourceReceipt': str(hip_path.resolve()), 'sourceDetail': str(hip_detail.resolve()),
                'sourceBuildHead': hip_receipt['build']['archiveHead'],
                'sourceFieldName': field_name, 'sourceValue': row['fieldComparisons'][field_name]['sourceValues'],
                'selectorBindings': row['sourceBindings'], 'fieldComparison': row['fieldComparisons'][field_name],
                'sourceSiteAgreement': 'selector-bound raw GBM match within 1e-6',
                'reviewStatusOverride': 'sourced-configuration', 'remainingUncertainty': row['limit']}, value,
                'selector-bound raw GBM match within 1e-6')

    suppressor_path, suppressor_receipt, suppressor_detail = spotting_ledgers['frosty-site-suppressor-flag-2026-09-23.json']
    for line in suppressor_detail.open(encoding='utf-8'):
        row = json.loads(line)
        add(('data/attachments.json', row['sitePointer']), {
            'sourceReceipt': str(suppressor_path.resolve()), 'sourceDetail': str(suppressor_detail.resolve()),
            'sourceFieldPath': row.get('wmeRawSource', {}).get('fieldPath'),
            'sourceValue': row.get('wmeRawSource', {}).get('sourceValue'),
            'rawWords': [{'byteOffset': row.get('wmeRawSource', {}).get('byteOffset'),
                          'bytesHex': row.get('wmeRawSource', {}).get('rawBytesHex')}],
            'sourceRawSha256': row.get('wmeRawSource', {}).get('rawSha256'),
            'descriptorSha256': row.get('wmeRawSource', {}).get('descriptorSha256'),
            'selectorEffectEvidence': row, 'sourceSiteAgreement': row.get('comparison'),
            'reviewStatusOverride': 'sourced-configuration', 'remainingUncertainty': row.get('limit')},
            row['siteValue'], row.get('comparison'))

    shift_path, shift_receipt, shift_detail = spotting_ledgers['frosty-site-barrel-shifts-2026-09-23.json']
    for line in shift_detail.open(encoding='utf-8'):
        row = json.loads(line)
        add(('data/attachments.json', row['sitePointer']), {
            'sourceReceipt': str(shift_path.resolve()), 'sourceDetail': str(shift_detail.resolve()),
            'sourceFieldPath': row.get('wme', {}).get('sourceFieldPath'),
            'sourceValue': row.get('wme', {}).get('sourceValue'),
            'rawWords': [{'byteOffset': row.get('wme', {}).get('byteOffset'),
                          'bytesHex': row.get('wme', {}).get('rawBytesHex')}],
            'sourceRawSha256': row.get('wme', {}).get('rawSha256'),
            'descriptorSha256': row.get('wme', {}).get('descriptorSha256'),
            'selectorEffectEvidence': row, 'sourceSiteAgreement': row.get('siteDerivation'),
            'reviewStatusOverride': 'sourced-configuration', 'remainingUncertainty': row.get('limit')},
            row['siteValue'], row.get('siteDerivation'))

    velocity_path, velocity_receipt, velocity_detail = spotting_ledgers['frosty-site-barrel-velocity-2026-09-23.json']
    for line in velocity_detail.open(encoding='utf-8'):
        row = json.loads(line)
        if row['assessment'] == 'candidate-field match; factor identity still inferred from WME route and value':
            add(('data/attachments.json', row['sitePointer'] + '/velMult'), {
                'sourceReceipt': str(velocity_path.resolve()), 'sourceDetail': str(velocity_detail.resolve()),
                'sourceValue': row['velocityEffects'], 'selectorEffectEvidence': row,
                'sourceSiteAgreement': row['assessment'], 'reviewStatusOverride': 'source-model-candidate',
                'remainingUncertainty': velocity_receipt['findings']['velMult']['remaining']},
                row['siteFields']['velMult'], row['assessment'])
        elif row['attachment'] == 'none':
            add(('data/attachments.json', row['sitePointer'] + '/velMult'), {
                'sourceReceipt': str(velocity_path.resolve()), 'sourceDetail': str(velocity_detail.resolve()),
                'sourceSiteAgreement': row['assessment'], 'reviewStatusOverride': 'software-contract',
                'remainingUncertainty': 'Neutral no-attachment default; no selected barrel WPM route.'},
                row['siteFields']['velMult'], row['assessment'])
        elif row['assessment'] == 'selected WPM has no imported MuzzleVelocity WME':
            add(('data/attachments.json', row['sitePointer'] + '/velMult'), {
                'sourceReceipt': str(velocity_path.resolve()), 'sourceDetail': str(velocity_detail.resolve()),
                'selectorEffectEvidence': row, 'sourceSiteAgreement': row['assessment'],
                'reviewStatusOverride': 'precisely-blocked-source',
                'remainingUncertainty': velocity_receipt['findings']['velMult']['remaining']},
                row['siteFields']['velMult'], row['assessment'])
        tier = row['tierRelation']
        if tier['status'] == 'derived-candidate-match':
            tier_status = 'source-model-candidate'
            tier_uncertainty = velocity_receipt['findings']['velTierMod']['derivation']
        else:
            tier_status = 'software-contract'
            tier_uncertainty = velocity_receipt['findings']['velTierMod']['neutralRows']
        add(('data/attachments.json', row['sitePointer'] + '/velTierMod'), {
            'sourceReceipt': str(velocity_path.resolve()), 'sourceDetail': str(velocity_detail.resolve()),
            'sourceSiteAgreement': tier['status'], 'reviewStatusOverride': tier_status,
            'sourceDerivedTierValues': tier.get('candidateDerivedTierValues'),
            'sourceFactorEvidence': row.get('velocityEffects'), 'formula': tier.get('formula'),
            'remainingUncertainty': tier_uncertainty}, row['siteFields']['velTierMod'], tier['status'])

    moving_path = prov / 'frosty-site-barrel-moving-ads-spread-2026-09-23.json'
    moving_receipt = add_receipt(moving_path)
    moving_detail = Path(moving_receipt['details']['path'])
    assert sha(moving_detail) == moving_receipt['details']['sha256']
    receipts.append({'path': str(moving_detail.resolve()), 'sha256': moving_receipt['details']['sha256']})
    for line in moving_detail.open(encoding='utf-8'):
        row = json.loads(line)
        if row['agreement'] == 'match':
            status = 'sourced-configuration'
            uncertainty = row['limit']
        elif row['agreement'] == 'no-selected-site-weapon':
            status = 'software-contract'
            uncertainty = 'No mapped weapon selects this catalog entry; its zero is the Analyzer no-selection baseline.'
        else:
            status = 'precisely-blocked-source'
            uncertainty = ('Exact mapped weapon set was checked in owner collection Field_2ffeb6ac; no matching '
                           'moving-ADS selector is present there. Sibling Field_b30a73ed references have a different '
                           'owner type and remain unresolved; other runtime source paths are not ruled out.')
        add(('data/attachments.json', row['sitePointer']), {
            'sourceReceipt': str(moving_path.resolve()), 'sourceDetail': str(moving_detail.resolve()),
            'sourceBuildHead': moving_receipt['build']['archiveHead'],
            'sourceSiteAgreement': row['agreement'], 'reviewStatusOverride': status,
            'sourceValues': row.get('sourceValues'), 'sourceBindings': row.get('sourceBindings'),
            'remainingUncertainty': uncertainty}, row['siteValue'], row['agreement'])

    ads_spread_path = prov / 'frosty-site-barrel-ads-spread-2026-09-23.json'
    ads_spread_receipt = add_receipt(ads_spread_path)
    ads_spread_detail = Path(ads_spread_receipt['details']['path'])
    assert sha(ads_spread_detail) == ads_spread_receipt['details']['sha256']
    receipts.append({'path': str(ads_spread_detail.resolve()), 'sha256': ads_spread_receipt['details']['sha256']})
    for line in ads_spread_detail.open(encoding='utf-8'):
        row = json.loads(line)
        for field_name, comparison in row['fieldComparisons'].items():
            if comparison.get('status') != 'match':
                continue
            pointer = row['sitePointer'] + '/' + field_name
            add(('data/attachments.json', pointer), {
                'sourceReceipt': str(ads_spread_path.resolve()), 'sourceDetail': str(ads_spread_detail.resolve()),
                'sourceBuildHead': ads_spread_receipt['build']['archiveHead'],
                'sourceFieldName': field_name, 'sourceValue': comparison['sourceValues'],
                'sourceSelections': row['sourceSelections'], 'fieldComparison': comparison,
                'sourceSiteAgreement': 'selector-bound raw ADS GBM match within 1e-6',
                'reviewStatusOverride': 'sourced-configuration', 'remainingUncertainty': row['limit']},
                comparison['siteValue'], 'selector-bound raw ADS GBM match within 1e-6')

    hip_tier_path = prov / 'frosty-site-barrel-hip-tier-2026-09-23.json'
    hip_tier_receipt = add_receipt(hip_tier_path)
    hip_tier_detail = Path(hip_tier_receipt['details']['path'])
    assert sha(hip_tier_detail) == hip_tier_receipt['details']['sha256']
    receipts.append({'path': str(hip_tier_detail.resolve()), 'sha256': hip_tier_receipt['details']['sha256']})
    for line in hip_tier_detail.open(encoding='utf-8'):
        row = json.loads(line)
        if row['agreement'] != 'inverse-sign-match':
            continue
        add(('data/attachments.json', row['sitePointer']), {
            'sourceReceipt': str(hip_tier_path.resolve()), 'sourceDetail': str(hip_tier_detail.resolve()),
            'sourceBuildHead': hip_tier_receipt['build']['archiveHead'],
            'sourceValue': row['sourceValues'], 'sourceSelections': row['sourceSelections'],
            'sourceSiteAgreement': row['modelRelation'], 'reviewStatusOverride': 'sourced-configuration',
            'remainingUncertainty': row['modelRelation']}, row['siteValue'], row['agreement'])

    none_contracts_path = prov / 'frosty-site-attachment-none-contracts-2026-09-23.json'
    none_contracts = add_receipt(none_contracts_path)
    assert sha(none_contracts['sourceSite']['path']) == none_contracts['sourceSite']['sha256']
    for contract in none_contracts['contracts']:
        add(('data/attachments.json', contract['sitePointer']), {
            'sourceReceipt': str(none_contracts_path.resolve()),
            'sourceSiteAgreement': contract['status'], 'reviewStatusOverride': 'software-contract',
            'rowIdentity': contract['rowIdentity'], 'siteConsumer': contract['siteConsumer'],
            'remainingUncertainty': 'Synthetic Analyzer None/default value, not a sourced in-game attachment effect.'},
            contract['siteValue'], contract['status'])

    ergos_path = prov / 'frosty-site-ergos-2026-09-23.json'
    ergos_receipt = add_receipt(ergos_path)
    ergos_detail = Path(ergos_receipt['detailPath'])
    assert sha(ergos_detail) == ergos_receipt['detailSha256']
    receipts.append({'path': str(ergos_detail.resolve()), 'sha256': ergos_receipt['detailSha256']})
    ergos_summary = {row['sitePointer']: row for row in ergos_receipt['rows']}
    for line in ergos_detail.open(encoding='utf-8'):
        row = json.loads(line)
        summary = ergos_summary[row['sitePointer']]
        agreement = summary['sourceSiteAgreement']
        leaf_agreement = row['agreement']
        semantic_gap = (leaf_agreement.startswith('no direct scalar comparison') or
                        leaf_agreement.startswith('selected graph is captured; source-field semantics') or
                        row['sitePointer'] == '/ERGOS/6/visualRecoil')
        ads_bolt_gap = any((c.get('transformation') or '').startswith('site noEffect marker omits exact selected ADS-bolt boolean')
                           for c in row.get('perLeafComparisons', []))
        if semantic_gap:
            status = 'precisely-blocked-source'
        elif ads_bolt_gap:
            status = 'source-model-candidate'
        elif agreement.startswith('software-authored analyzer coverage flag'):
            status = 'software-contract'
        elif agreement.startswith('source enum path joined'):
            status = 'source-model-candidate'
        elif leaf_agreement.startswith('exact selected-source operand comparison'):
            status = 'precisely-blocked-source'
        else:
            status = 'sourced-configuration'
        add((row['siteFile'], row['sitePointer']), {
            'sourceReceipt': str(ergos_path.resolve()), 'sourceDetail': str(ergos_detail.resolve()),
            'sourceValue': row.get('sourceValue'), 'sourceFieldPath': row.get('sourceFieldPath'),
            'sourceSiteAgreement': agreement, 'reviewStatusOverride': status,
            'siteImpact': summary['siteImpact'], 'leafEvidence': row,
            'blocker': ('The source graph has no scalar/typed field comparison for this site value.' if semantic_gap else
                        'The exact ADS-bolt field is sourced, but the Analyzer does not consume it and its cadence effect is not measured.' if ads_bolt_gap else None),
            'nextStep': ('Trace a typed source field or native consumer for this value.' if semantic_gap else
                         'Apply the timing receipt’s with/without ADS-bolt cadence prediction, then capture comparable MP shot intervals.' if ads_bolt_gap else None),
            'remainingUncertainty': ('The Buffer value -1 matches Field_c4814c93 in vector modifier objects, but the modifier field’s visual-recoil meaning is unproven; retain the 0.75 vector candidate and exact field/source hashes for review.'
                                     if row['sitePointer'] == '/ERGOS/6/visualRecoil' else
                                     'The source graph exists, but this row has no typed/semantic source-field mapping.'
                                     if semantic_gap else
                                     'Exact multiplayer ADS-bolt boolean is sourced, but sim/applyAttachments.js does not apply it; assess as a proposed cadence-model input, not a confirmed RPM correction.'
                                     if ads_bolt_gap else
                                     summary['remainingUncertainty'])}, row['siteValue'], leaf_agreement)

    # Preserve all source alternatives for laser visibility. The all-true
    # candidate does not explain false site values, and DRSIAR multiplayer
    # route selection remains unresolved, so no candidate is excluded as SP-only.
    laser_path = prov / 'frosty-site-laser-visible-2026-09-23.json'
    laser = add_receipt(laser_path)
    laser_detail = Path(laser['details']['path'])
    assert sha(laser_detail) == laser['details']['sha256']
    receipts.append({'path': str(laser_detail.resolve()), 'sha256': laser['details']['sha256']})
    for line in laser_detail.open(encoding='utf-8'):
        row = json.loads(line)
        add(('data/attachments.json', row['sitePointer']), {
            'sourceReceipt': str(laser_path.resolve()),
            'sourceDetailPath': str(laser_detail.resolve()),
            'sourceSiteAgreement': 'all-true candidate is non-discriminating for false site values',
            'reviewStatusOverride': 'precisely-blocked-source',
            'leafEvidence': row,
            'remainingUncertainty': 'Candidate field meaning and native visibility consumer are unknown; DRSIAR multiplayer route selection is unresolved, so neither route is excluded as SP-only.'},
            row['siteValue'], 'semantic-blocker')

    # Keep the ADS-bolt choice attached to the exact cadence leaves. This is a
    # proposed model input only: the source boolean has no timing scalar, and
    # the current simulator has no ADS-bolt cadence branch.
    ads_bolt_path = prov / 'frosty-site-ads-bolt-cadence-2026-09-23.json'
    ads_bolt = add_receipt(ads_bolt_path)
    ads_bolt_detail = Path(ads_bolt['externalDetail']['path'])
    assert sha(ads_bolt_detail) == ads_bolt['externalDetail']['sha256']
    receipts.append({'path': str(ads_bolt_detail.resolve()), 'sha256': ads_bolt['externalDetail']['sha256']})
    ads_bolt_rows = json.loads(ads_bolt_detail.read_text(encoding='utf-8'))['rows']
    choice_rows = [r for r in ads_bolt_rows if r['adsChoice']]
    assert {r['siteId'] for r in choice_rows} == {'l115', 'm2010esr', 'psr', 'sv98'}
    # Pin the exact choice-level source and the reason it is not applied.
    ads_no_effect = '/ERGOS/5/noEffect'
    add(('data/attachments.json', ads_no_effect), {
        'sourceReceipt': str(ads_bolt_path.resolve()), 'sourceDetail': str(ads_bolt_detail.resolve()),
        'sourceSiteAgreement': 'selected ADS-bolt boolean is source-mapped for four choices; Analyzer noEffect marker omits cadence effect',
        'reviewStatusOverride': 'source-model-candidate', 'leafEvidence': ads_bolt,
        'blocker': 'Source proves the ADS-bolt boolean, not its native cadence or ADS-state effect.',
        'nextStep': 'Use the receipt predictions for controlled multiplayer shot-interval and ADS-phase captures with/without the bolt; test Recon separately.',
        'remainingUncertainty': 'The source proves ADS-bolt choice availability and a boolean, not how or whether native cadence changes.'},
        True, 'source-model-candidate')
    for row in ads_bolt_rows:
        site_id = row['siteId']
        site_idx = weapon_index[site_id]
        pointer = f'/{site_idx}/rpm'
        site_rpm = weapons[site_idx]['rpm']
        add(('data/weapons.json', pointer), {
            'sourceReceipt': str(ads_bolt_path.resolve()), 'sourceDetail': str(ads_bolt_detail.resolve()),
            'sourceSiteAgreement': 'six RPM values match the primary WB formula; ADS-bolt and Recon timing effects are separate candidate mechanics',
            'reviewStatusOverride': 'source-model-candidate', 'sourceBuildHead': ads_bolt['sourceBuild']['archiveHead'],
            'siteImpact': 'Displayed sniper RPM currently follows cycleSeconds=T/S+D+60/R; no ADS-bolt cadence branch is applied.',
            'leafEvidence': row,
            'blocker': 'Runtime timing composition, bolt phase, ADS-out, and Recon interaction are not established by source data.',
            'nextStep': 'Follow the receipt capture matrix: compare accepted shot intervals and ADS phases with/without DLC Bolt on the four eligible rifles, then test Recon separately.',
            'remainingUncertainty': 'The current Analyzer formula fits primary timing values, but bolt phase, zoom fraction, ADS-out and Recon composition remain unmeasured.'},
            site_rpm, 'source-model-candidate')

    # Current-build weapon-damage provenance, base class/calibre and hit-zone
    # index/material receipts preserve source candidates without claiming use.
    damage_receipt = add_receipt(prov / 'frosty-site-damage-provenance-2026-09-23.json')
    damage_detail = Path(damage_receipt['detail']['path'])
    assert sha(damage_detail) == damage_receipt['detail']['sha256']
    receipts.append({'path': str(damage_detail.resolve()), 'sha256': damage_receipt['detail']['sha256']})
    for row in ledger_jsonl('site-damage-provenance-leaf-review-2026-09-23.jsonl'):
        leaf_join(row, 'data/weapons.json', pointer_key='pointer', status='project-metadata')
    cls_cal_path = report_root / 'site-weapon-cls-cal-63-leaves-2026-09-23.jsonl'
    cls_cal_rows = ledger_jsonl('site-weapon-cls-cal-63-leaves-2026-09-23.jsonl')
    for row in cls_cal_rows:
        is_cls = row['sitePointer'].endswith('/cls')
        agreement = row.get('sourceSiteAgreement', '')
        if is_cls:
            status = 'sourced-ui-xml'
            uncertainty = 'UI class category is source-linked after explicit Analyzer taxonomy normalization; it is not a mechanics field.'
        elif agreement.startswith('mismatch:'):
            status = 'mismatch-with-proposal'
            uncertainty = 'UI text and the selected projectile asset both indicate .40 S&W, while the site says 9x19mm; propose correcting the GGH22 label to .40 S&W after parent review.'
        else:
            status = 'precisely-blocked-source'
            uncertainty = row.get('remainingUncertainty', 'No direct typed caliber field; the projectile asset name/description is only a candidate, not a confirmed binding.')
        add(('data/weapons.json', row['sitePointer']), {
            'sourceReceipt': str(cls_cal_path.resolve()), 'sourceFieldPath': row.get('sourceFieldPath'),
            'sourceValue': row.get('sourceValue'), 'sourceAsset': row.get('sourceAsset'),
            'sourceRawXmlSha256': row.get('sourceRawXmlSha256'), 'sourceSiteAgreement': agreement,
            'reviewStatusOverride': status, 'leafEvidence': row,
            'remainingUncertainty': uncertainty}, row['siteValue'], agreement or 'reviewed-field')
    pellets_receipt_path = prov / 'frosty-site-base-shotgun-pellets-2026-09-23.json'
    pellets_receipt = add_receipt(pellets_receipt_path)
    pellets_detail = Path(pellets_receipt['detail']['path'])
    assert sha(pellets_detail) == pellets_receipt['detail']['sha256']
    receipts.append({'path': str(pellets_detail.resolve()), 'sha256': pellets_receipt['detail']['sha256']})
    for line in pellets_detail.open(encoding='utf-8'):
        row = json.loads(line)
        add(('data/weapons.json', row['sitePointer']), {
            'sourceReceipt': str(pellets_receipt_path.resolve()), 'sourceDetail': str(pellets_detail.resolve()),
            'sourceAsset': row.get('sourceAsset'), 'sourceRawSha256': row.get('sourceBuild', {}).get('rawSha256'),
            'descriptorSha256': row.get('sourceBuild', {}).get('descriptorSha256'),
            'sourceObjectGuid': row.get('rootObjectGuid'), 'sourceObjectIndex': row.get('sourceObjectIndex'),
            'sourceFieldPath': row.get('sourceFieldPath'), 'sourceValue': row.get('sourceValue'),
            'rawWords': [{'byteOffset': row.get('byteOffset'), 'bytesHex': row.get('bytesHex'), 'rawValue': row.get('sourceValue')}],
            'sourceSiteAgreement': row.get('agreement'), 'reviewStatusOverride': 'sourced-configuration',
            'remainingUncertainty': row.get('remainingUncertainty')}, row['siteValue'], row.get('agreement', 'pellet-count-match'))
    hit_meta = ledger_json('site-hit-zones-current-metadata-leaf-joins-2026-09-23.json')
    for item in hit_meta.get('perWeaponLeaves', []):
        for field in ('protectionIndex', 'projectileMaterial'):
            src = item.get(field)
            if not src:
                continue
            pointer = src.get('sitePointer') or item.get('sitePointers', {}).get(field)
            if not pointer:
                continue
            add(('data/hit_zones.json', pointer), {
                'sourceFieldPath': src.get('sourceFieldPath') or src.get('fieldPath'),
                'sourceValue': src.get('sourceValue', src.get('value')), 'rawBytesHex': src.get('rawBytesHex'),
                'byteOffset': src.get('byteOffset'), 'rawSha256': src.get('rawSha256'),
                'sourceSiteAgreement': 'source-field-candidate', 'reviewStatusOverride': 'sourced-configuration',
                'remainingUncertainty': 'Direct current-build WB/projectile field is identified. Native material/protection-index lookup and hit-zone consumer remain separate.'},
                src.get('siteValue'), 'source-field-candidate')
    hit_zone_file = json.loads((repo / 'data/hit_zones.json').read_text(encoding='utf-8'))
    for pointer, value in (('/schemaVersion', hit_zone_file['schemaVersion']),
                           ('/source/build', hit_zone_file['source']['build']),
                           ('/source/generatedBy', hit_zone_file['source']['generatedBy']),
                           ('/source/evidence', hit_zone_file['source']['evidence'])):
        add(('data/hit_zones.json', pointer), {
            'sourceReceipt': str((repo / 'data/hit_zones.json').resolve()), 'sourceFieldPath': None,
            'sourceValue': value, 'sourceSiteAgreement': 'project-file-metadata',
            'reviewStatusOverride': 'project-metadata',
            'remainingUncertainty': 'Schema/provenance annotations identify the generated reference file. sim/damage.js reads HIT_ZONES.weapons and per-weapon values; no schemaVersion or source metadata lookup is present.'},
            value, 'project-file-metadata')
    counts, by_file, seen = Counter(), defaultdict(Counter), set()
    with out_path.open('w') as output:
        for line in data_path.open(encoding='utf-8'):
            row = json.loads(line)
            key = row['siteFile'], row['pointer']
            assert key not in seen
            seen.add(key)
            if key in evidence:
                for entry in evidence[key]:
                    assert row['siteValue'] == entry['expectedSiteValue'], key
                overrides = {e['reviewStatusOverride'] for e in evidence[key] if e.get('reviewStatusOverride')}
                assert len(overrides) <= 1, key
                row.update(reviewStatus=next(iter(overrides)) if overrides else 'sourced-configuration',
                           sourceSiteAgreement='; '.join(sorted({e['sourceSiteAgreement'] for e in evidence[key]})),
                           sourceFieldPath=[e.get('sourceFieldPath') for e in evidence[key]],
                           sourceAgreements=sorted({e['sourceSiteAgreement'] for e in evidence[key]}),
                           remainingUncertainty='; '.join(sorted({e['remainingUncertainty'] for e in evidence[key]})),
                           evidence=evidence[key])
            if row['reviewStatus'] == 'source-model-candidate':
                blockers = [e.get('blocker') for e in evidence.get(key, []) if e.get('blocker')]
                next_steps = [e.get('nextStep') for e in evidence.get(key, []) if e.get('nextStep')]
                row['blocker'] = '; '.join(sorted(set(blockers))) or row['remainingUncertainty']
                row['nextStep'] = '; '.join(sorted(set(next_steps))) or candidate_next_step(row)
            counts[row['reviewStatus']] += 1
            by_file[row['siteFile']][row['reviewStatus']] += 1
            output.write(json.dumps(row) + '\n')
    assert set(evidence) <= seen, sorted(set(evidence) - seen)[:20]
    topic_groups = {
        'recoil': sum(1 for k in evidence if k[0] == 'data/weapons.json' and '/recoil/' in k[1]),
        'balanceConstants': sum(1 for k in evidence if k[0] == 'data/balance_tables.json'),
        'ADSSelectors': sum(1 for k in evidence if k[0] == 'data/attachments.json' and k[1].endswith('/defAds')),
        'timing': sum(1 for k in evidence if k[0] == 'data/weapons.json' and k[1].rsplit('/', 1)[-1] in ('rpm', 'tacRld', 'emptyRld')),
        'spreadMinima': sum(1 for k in evidence if k[0] == 'data/weapons.json' and '/spread/' in k[1]),
        'ADSIndexConstants': sum(1 for k in evidence if k[0] == 'data/attachments.json' and ('deployBaseIndex' in k[1] or 'sprintRecoveryBaseIndex' in k[1])),
        'WEAPONMAGSelectorLeaves': selector_leaf_count,
        'tooltips': sum(1 for k in evidence if k[0] == 'data/attachment-tooltips.json'),
        'references': sum(1 for k in evidence if k[0] in ('data/recoil_decay.json', 'data/weapon-role-tags.json')),
        'HDAOrderedLeaves': sum(1 for k in evidence if k[0] == 'data/balance_tables.json' and '/HIP_SPREAD_TABLE/' in k[1]),
        'drawTimingLeaves': sum(1 for k in evidence if k[0] == 'data/balance_tables.json' and '/DRAW_TIME_TABLES/' in k[1]),
        'weaponAttributeExtras': sum(1 for k, entries in evidence.items()
                                     if k[0] == 'data/weapon_attributes.json'
                                     and any(e.get('sourceReceipt') == str(attribute_path.resolve()) for e in entries)),
        'weaponLabels': sum(1 for k in evidence if k[0] == 'data/weapons.json' and k[1].rsplit('/', 1)[-1] in ('id', 'name', 'description')),
    }
    with out_path.open(encoding='utf-8') as reviewed_file, pending_path.open('w', encoding='utf-8') as pending_file:
        for line in reviewed_file:
            row = json.loads(line)
            if row['reviewStatus'] == 'pending-review':
                pending_file.write(json.dumps(row) + '\n')
    sim_code_path = prov / 'frosty-site-sim-code-review-2026-09-23.json'
    sim_code = add_receipt(sim_code_path)
    sim_line_inventory = inventory['artifacts'][1]
    assert sha(sim_line_inventory['path']) == sim_line_inventory['sha256']
    assert sim_code['sourceInventory']['sha256'] == sim_line_inventory['sha256']
    assert sim_code['sourceInventory']['rows'] == 1582
    assert sim_code['codeInventoryReviewComplete'] is True and sim_code['unclassifiedLines'] == 0
    for source in sim_code['sources'].values():
        assert sha(source['path']) == source['sha256'], source['path']
    sim_code_detail = Path(sim_code['detail']['path'])
    sim_numeric_detail = Path(sim_code['numericClassification']['path'])
    assert sha(sim_code_detail) == sim_code['detail']['sha256']
    assert sha(sim_numeric_detail) == sim_code['numericClassification']['sha256']
    receipts.extend([{'path': str(sim_code_detail.resolve()), 'sha256': sim_code['detail']['sha256']},
                     {'path': str(sim_numeric_detail.resolve()), 'sha256': sim_code['numericClassification']['sha256']}])
    equations_path = prov / 'frosty-site-equations-2026-09-23.json'
    equations = add_receipt(equations_path)
    result = {'schemaVersion': 4, 'date': '2026-09-23',
              'completionScope': 'Coverage completion means every leaf in the pinned current site-input inventory is source-linked, mismatched with a proposal, precisely blocked, or explicitly classified as software/identity/observation metadata; all reviewed Analyzer equation/code inputs are classified; and the six-row ADS Bolt cadence proposal is attached. It does not mean every source field is proven to be consumed by the native game or every proposed mechanic is runtime-confirmed.',
              'inputInventory': {'path': str(inventory_path.resolve()), 'sha256': sha(inventory_path)},
              'sourceReceipts': receipts, 'rowCounts': dict(counts),
              'topicJoinCounts': topic_groups,
              'perFile': {k: dict(v) for k, v in by_file.items()},
              'details': {'path': str(out_path.resolve()), 'sha256': sha(out_path)},
              'pendingRows': {'path': str(pending_path.resolve()), 'sha256': sha(pending_path), 'count': counts['pending-review']},
              'complete': (counts['pending-review'] == 0 and
                           len(seen) == sum(inventory['dataRowsByCategory'].values()) and
                           sim_code['codeInventoryReviewComplete'] is True and
                           sim_code['unclassifiedLines'] == 0 and len(ads_bolt_rows) == 6),
              'completionCondition': 'Zero pending inventory leaves; emitted site-input row count equals the pinned inventory category total; the exact simulation-code inventory is reviewed with zero unclassified lines; and all six ADS Bolt cadence records are pinned.',
              'simulationCodeReview': {
                  'status': 'complete-source-line-review', 'currentSimFiles': len(sim_code['sources']),
                  'classifiedLineCount': sim_code['sourceInventory']['rows'],
                  'nonblankLineCount': 1900, 'commentOnlyLinesExcluded': 318,
                  'unclassifiedLines': sim_code['unclassifiedLines'],
                  'numericCandidateRows': sim_code['numericClassification']['rows'],
                  'modelFamilies': sim_code['modelFamilies'],
                  'lineInventory': {'path': sim_line_inventory['path'], 'sha256': sim_line_inventory['sha256']},
                  'detail': {'path': str(sim_code_detail.resolve()), 'sha256': sim_code['detail']['sha256']},
                  'lineStatusInterpretation': 'The 1,900 nonblank lines comprise 1,582 code lines reviewed and 318 comment-only lines excluded. Simulation detail rows inherit reviewStatus=pending-review from the lexical input snapshot; final code-line classification is carried by reviewed=true, reviewClass, and sourceOrRuntimeLimit. The summary classification count and unclassifiedLines count use those reviewed classifications.',
                  'equationsReceipt': {'path': str(equations_path.resolve()), 'sha256': sha(equations_path)},
                  'nativeRuntimeLimit': 'Line/function inventory and Analyzer equations are reviewed; source operands do not prove native game consumption or mechanics.'},
              'zeroing': {'receipt': str(zero_path.resolve()), 'defaultDistanceSourceStatus': 'unresolved',
                          'detailPath': str(zero_detail_path.resolve()), 'detailSha256': zero['all63Details']['sha256'],
                          'reason': 'Source lists constrain selectable distances for some weapons but do not establish untouched-spawn selected distance or native correction.',
                          'capturePrediction': zero['rank7CaptureUpdate']['predictions'],
                          'gameplayLimit': zero['rank7CaptureUpdate']['gameplayLimit']},
              'pendingSharedSourceGroups': [],
              'excludedNonGameInputs': {'data/weapons.json/provenance/*': {'rows': sum(1 for k in evidence if k[0] == 'data/weapons.json' and '/provenance/' in k[1]),
                  'status': 'project-metadata', 'consumerSearch': 'No provenance key occurrence in app.js, index.html, sim/*.js or ui/*.js; every row remains present as excluded-non-game-input rather than removed from accounting.'}},
              'limits': ['Sourced configuration does not establish the simulator formula or native activation.',
                         'Pending rows need research. They are not classified as blocked merely because review has not started.',
                         'Named recoil spring/fade/pattern fields remain unjoined unless a direct site input mapping exists; value coincidence or neighboring asset presence is insufficient.',
                         'DTA source seconds convert to stored milliseconds in the current-build field-level receipt; transition runtime remains unproven.',
                         'Timing joins require direct per-field byte offsets and exact site equality for reloads; primary RPM uses the receipt’s stated 0.01 tolerance.',
                         'Zeroing selector lists are not joined to the site 100 m default.',
                         'Tooltips are source UI text only. Their statuses do not source physical mechanics or live availability.'],
              'scriptSha256': sha(Path(__file__))}
    args.summary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(result['rowCounts']))


if __name__ == '__main__':
    main()

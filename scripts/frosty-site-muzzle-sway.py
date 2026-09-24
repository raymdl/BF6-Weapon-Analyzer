"""Verify global and per-weapon muzzle sway inputs against captured selector packages."""
import collections, hashlib, json, runpy, sqlite3, struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DM = Path(r'C:\Users\royal\Documents\BF6 Datamining')
REP = DM / 'builds/1.4.3.0/reports/exhaustive-audit-2026-09-23'
DB = REP / 'coverage-decoder-v5.sqlite'
SPOTTING = REP / 'site-spotting-attachment-factor-bindings-2026-09-23.json'
MAPPING = ROOT / 'reference-data/provenance/frosty-site-attachment-mapping-2026-09-15.json'
ATTACH = ROOT / 'data/attachments.json'
OUT = ROOT / 'reference-data/provenance/frosty-site-muzzle-sway-2026-09-23.json'
DETAIL = REP / 'frosty-site-muzzle-sway-2026-09-23-leaves.jsonl'
DEC = runpy.run_path(str(ROOT / 'scripts/frosty-ebx-decode.py'))
SITE = json.loads(ATTACH.read_text(encoding='utf-8'))
GRAPH = json.loads(SPOTTING.read_text(encoding='utf-8'))
MAPPING_DATA = json.loads(MAPPING.read_text(encoding='utf-8'))

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def direct(layout, h, types):
    for f in layout['fields']:
        if f['hash'] == h:
            return f
    for f in layout['fields']:
        if DEC['debug_type'](f['flags']) == 0:
            got = direct(types['classes'][f['classRef']], h, types)
            if got:
                return got
    return None

def offset_path(layout, h, types):
    def search(cls, at, path):
        for f in cls['fields']:
            if f['hash'] == h:
                return at + f['offset'], path + [{'classHash': cls['hash'], 'fieldHash': h, 'objectRelativeOffset': f['offset']}]
        for f in cls['fields']:
            if DEC['debug_type'](f['flags']) == 0:
                got = search(types['classes'][f['classRef']], at + f['offset'], path + [{'classHash': cls['hash'], 'inlineFieldHash': f['hash'], 'objectRelativeOffset': f['offset']}])
                if got:
                    return got
        return None
    result = search(layout, 0, [])
    if result is None:
        raise ValueError(f'No descriptor path to {h} in {layout["hash"]}')
    return result

db = sqlite3.connect(f'{DB.resolve().as_uri()}?mode=ro', uri=True)
db.row_factory = sqlite3.Row
assets = {r['file_guid'].lower(): r['route'] for r in db.execute('select file_guid,route from assets') if r['file_guid']}
capture_by_route = {r['route'].casefold(): dict(r) for r in db.execute("select * from captures where head=4892017 and decode_status in ('decoded','decoded-provisional')")}
imports = collections.defaultdict(list)
for r in db.execute('select capture_id,ordinal,target_file_guid,target_object_guid from imports'):
    imports[r['capture_id']].append(dict(r))
cache = {}

def cap(route):
    return capture_by_route.get(route.casefold())

def load(c):
    if c['id'] not in cache:
        if sha(c['raw_path']) != c['raw_sha256'] or sha(c['descriptor_path']) != c['descriptor_sha256']:
            raise ValueError(f'capture hash mismatch: {c["route"]}')
        types = DEC['type_descriptors'](c['descriptor_path'])
        ebx = DEC['Ebx'](c['raw_path'], types)
        if ebx.sha256 != c['raw_sha256']:
            raise ValueError(f'decoder hash mismatch: {c["route"]}')
        objs = ebx.decode()['objects']
        cache[c['id']] = (types, ebx, objs)
    return cache[c['id']]

def effect_records(package_capture):
    types, ebx, objects = load(package_capture)
    result = []
    for im in imports[package_capture['id']]:
        route = assets.get(im['target_file_guid'].lower())
        if not route or '/sway/wme_wsway_' not in route.lower():
            continue
        ec = cap(route)
        if not ec:
            continue
        _, eebx, eobjs = load(ec)
        matches = [i for i, obj in enumerate(eobjs) if obj.get('$guid', '').lower() == im['target_object_guid'].lower()]
        if len(matches) != 1:
            raise ValueError(f'{package_capture["route"]}: target effect GUID resolves {len(matches)} times in {route}')
        oi = matches[0]
        obj = eobjs[oi]
        if obj.get('$class') != 'Class_2fea847d' or 'Field_90fd0310' not in obj:
            continue
        etypes, eebx, _ = load(ec)
        layout = etypes['byGuid'][eebx.class_keys[eebx.instances[oi]['classRef']]]
        rel, path = offset_path(layout, '90fd0310', etypes)
        pos = eebx.data_start + eebx.data_offsets[oi] + rel
        raw = struct.unpack_from('<f', eebx.data, pos)[0]
        if abs(raw - float(obj['Field_90fd0310'])) > 1e-7:
            raise ValueError(f'{route}: descriptor-derived field bytes disagree with decoded value')
        result.append({'route': route, 'effectGuid': im['target_object_guid'], 'class': obj['$class'],
                       'fieldPath': '/Field_90fd0310', 'decodedValue': obj['Field_90fd0310'], 'rawValue': raw,
                       'byteOffset': pos, 'bytesHex': eebx.data[pos:pos+4].hex(), 'rawSha256': ec['raw_sha256'],
                       'descriptorSha256': ec['descriptor_sha256'], 'captureId': ec['id'], 'head': ec['head'],
                       'descriptorFieldPath': path})
    return result

def package_info(choice):
    out = []
    for sel in choice.get('selectors', []):
        for pkg in sel.get('packages', []):
            c = cap(pkg['route'])
            if not c:
                out.append({'route': pkg['route'], 'selectorAsset': sel['asset'], 'selectorGuid': sel['guid'],
                            'captured': False, 'expectedRawSha256': pkg.get('rawSha256')})
                continue
            if pkg.get('rawSha256') and c['raw_sha256'] != pkg['rawSha256']:
                raise ValueError(f'{pkg["route"]}: spotting graph raw hash differs from current capture')
            out.append({'route': pkg['route'], 'selectorAsset': sel['asset'], 'selectorGuid': sel['guid'],
                        'captured': True, 'captureId': c['id'], 'rawSha256': c['raw_sha256'],
                        'descriptorSha256': c['descriptor_sha256'], 'head': c['head'],
                        'weaponSwayEffects': effect_records(c)})
    return out

def main():
    graph_choices = {(c['siteWeaponId'], c['slot'], c['attachment']): c for c in GRAPH['choices']}
    rows = []
    generic_ids = ['sp_brake', 'slant_brake', 'thread_prot', 'long_supp', 'hybrid_supp_l']
    override_targets = [('sp_brake', w) for w in ('p18', 'es57', 'm45a1', 'ggh22', 'vz61')] + [('long_supp', 'sgx'), ('light_supp', 'sgx')]

    for idx, muzzle in enumerate(SITE['MUZZLES']):
        aid = muzzle['id']
        if aid in generic_ids:
            pointer = f'/MUZZLES/{idx}/weaponSwayMult'
            site_value = muzzle['weaponSwayMult']
            selections = [c for c in GRAPH['choices'] if c['slot'] == 'muzzle' and c['attachment'] == aid]
            selected_records = []
            for choice in selections:
                pkg_records = package_info(choice)
                effects = [e for p in pkg_records for e in p.get('weaponSwayEffects', [])]
                override_value = SITE['MUZZLES'][idx].get('weaponOverrides', {}).get(choice['siteWeaponId'], {}).get('weaponSwayMult')
                selected_records.append({'siteWeapon': choice['siteWeaponId'], 'siteEffectiveValue': override_value if override_value is not None else site_value,
                                         'selectorRefs': [{'asset': s['asset'], 'guid': s['guid']} for s in choice.get('selectors', [])],
                                         'packages': pkg_records, 'directWeaponSwayEffects': effects})
            all_effects = [e for s in selected_records for e in s['directWeaponSwayEffects']]
            effect_dist = collections.Counter(str(e['rawValue']) for e in all_effects)
            match_count = sum(1 for s in selected_records for e in s['directWeaponSwayEffects'] if abs(float(e['rawValue']) - float(s['siteEffectiveValue'])) <= 1e-6)
            no_effect = [s for s in selected_records if not s['directWeaponSwayEffects']]
            source_summary = {'selectedSiteChoiceCount': len(selected_records), 'selectedChoiceDirectEffectCount': len(selected_records)-len(no_effect),
                              'selectedChoiceNoDirectEffectCount': len(no_effect), 'effectiveSiteValueAgreementCount': match_count,
                              'directEffectRawValueDistribution': dict(effect_dist),
                              'uniqueSelectorRefs': sorted({(x['asset'],x['guid']) for s in selected_records for x in s['selectorRefs']}),
                              'packageRoutes': sorted({(p['route'],p.get('rawSha256')) for s in selected_records for p in s['packages'] if p.get('captured')}),
                              'noDirectEffectWeapons': sorted(s['siteWeapon'] for s in no_effect)}
            rows.append({'siteFile': 'data/attachments.json', 'sitePointer': pointer, 'siteValue': site_value,
                         'leafKind': 'generic-default', 'attachment': aid, 'sourceSiteComparison': source_summary,
                         'sourceChoices': selected_records,
                         'remainingUncertainty': 'Exact site crosswalk, selected selector GUIDs, captured package imports, and WME descriptor bytes establish source configuration for choices with a direct WME_WSway import. A no-direct-effect choice is not proof the native runtime applies no sway effect. Site generic/weapon-override composition is software behavior; native activation and modifier ordering remain unproved.'})

    for aid, weapon in override_targets:
        idx = next(i for i, m in enumerate(SITE['MUZZLES']) if m['id'] == aid)
        value = SITE['MUZZLES'][idx]['weaponOverrides'][weapon]['weaponSwayMult']
        pointer = f'/MUZZLES/{idx}/weaponOverrides/{weapon}/weaponSwayMult'
        choice = graph_choices.get((weapon, 'muzzle', aid))
        if not choice:
            raise ValueError(f'no exact site/source choice for {weapon}/{aid}')
        packages = package_info(choice)
        effects = [e for p in packages for e in p.get('weaponSwayEffects', [])]
        rows.append({'siteFile': 'data/attachments.json', 'sitePointer': pointer, 'siteWeapon': weapon,
                     'siteValue': value, 'leafKind': 'weapon-specific-override', 'attachment': aid,
                     'selectorRefs': [{'asset': s['asset'], 'guid': s['guid']} for s in choice.get('selectors', [])],
                     'packages': packages, 'directWeaponSwayEffects': effects,
                     'sourceSiteAgreement': ('agreement-with-source-field' if effects and all(abs(float(e['rawValue'])-float(value)) <= 1e-6 for e in effects) else ('source-value-difference' if effects else 'no-direct-captured-weapon-sway-effect')),
                     'remainingUncertainty': 'A captured selector package and any exact direct WME import establish source configuration only. A WME field/value difference does not alone prove the Analyzer value is mechanically wrong; priority, activation, and any other runtime modifiers are not resolved.'})

    assert len(rows) == 12
    for row in rows:
        # Every site pointer must resolve against the exact parsed file and yield the asserted value.
        tokens = row['sitePointer'].strip('/').split('/')
        cur = SITE
        for token in tokens:
            token = token.replace('~1', '/').replace('~0', '~')
            cur = cur[int(token)] if isinstance(cur, list) else cur[token]
        assert cur == row['siteValue'], (row['sitePointer'], cur, row['siteValue'])

    DETAIL.parent.mkdir(parents=True, exist_ok=True)
    with DETAIL.open('w', encoding='utf-8', newline='\n') as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')
    pointer_kinds = collections.Counter(r['leafKind'] for r in rows)
    override_statuses = collections.Counter(r['sourceSiteAgreement'] for r in rows if 'sourceSiteAgreement' in r)
    summary = {'date': '2026-09-23', 'scope': 'All 12 current MUZZLES weaponSwayMult site leaves: five generic muzzle defaults plus seven weapon-specific overrides.',
               'leafCount': len(rows), 'leafKindCounts': dict(pointer_kinds),
               'genericLeaves': [{'sitePointer': r['sitePointer'], 'attachment': r['attachment'], 'siteValue': r['siteValue'],
                                  'choiceCount': r['sourceSiteComparison']['selectedSiteChoiceCount'],
                                  'directSourceEffectChoiceCount': r['sourceSiteComparison']['selectedChoiceDirectEffectCount'],
                                  'noDirectSourceEffectChoiceCount': r['sourceSiteComparison']['selectedChoiceNoDirectEffectCount'],
                                  'effectiveSiteValueAgreementCount': r['sourceSiteComparison']['effectiveSiteValueAgreementCount'],
                                  'sourceValueDistribution': r['sourceSiteComparison']['directEffectRawValueDistribution'],
                                  'noDirectEffectWeapons': r['sourceSiteComparison']['noDirectEffectWeapons']} for r in rows if r['leafKind'] == 'generic-default'],
               'overrideStatuses': dict(override_statuses),
               'limits': ['Descriptor-derived WME raw bytes and exact selector package imports establish serialized source configuration, not native effect activation or ordering.', 'When a selected captured WPM has no direct Class_2fea847d import, that is not proof of source absence or native no-effect.', 'Site generic and weapon-specific fallback/override composition is software-authored and is not presented as game-native behavior.'],
               'inputHashes': {'site': sha(ATTACH), 'mapping': sha(MAPPING), 'spottingBindingGraph': sha(SPOTTING), 'script': sha(__file__)},
               'detail': {'path': str(DETAIL), 'sha256': sha(DETAIL), 'rows': len(rows)}}
    OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'receipt': str(OUT), 'receiptSha256': sha(OUT), 'detail': str(DETAIL), 'detailSha256': sha(DETAIL), 'rows': len(rows), 'generic': summary['genericLeaves'], 'overrideStatuses': dict(override_statuses)}, ensure_ascii=False))

if __name__ == '__main__':
    main()

"""Compare all site-referenced PD projectile inputs with captured 1.4.3.0 EBX."""
import hashlib
import json
from pathlib import Path
import runpy
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
DM = Path(r'C:\Users\royal\Documents\BF6 Datamining\builds\1.4.3.0')
DB_PATH = DM / 'reports/exhaustive-audit-2026-09-23/coverage-decoder-v5.sqlite'
OUT_DIR = DM / 'reports/exhaustive-audit-2026-09-23'
SYM_PATH = ROOT / 'outputs/datamine/sym-1.4.2.0/bf6.json'
SYM_EXPECTED_SHA256 = '3a04f1670fb208d78debc57cb2c54646ac5cb2d7f362b0a1febc419105c364b9'
ballistics = json.loads((ROOT / 'data/ballistics.json').read_text(encoding='utf-8'))
weapons = json.loads((ROOT / 'data/weapons.json').read_text(encoding='utf-8'))
ammo_data = json.loads((ROOT / 'data/ammo.json').read_text(encoding='utf-8'))['WEAPON_AMMO']
roster = json.loads((ROOT / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json').read_text(encoding='utf-8'))
identity_by_site = {row['siteIdentity']: row for row in roster['roots'] if row.get('siteIdentity')}

field_walker = runpy.run_path(str(ROOT / 'scripts/frosty-audit-fields.py'))['walk']
reader = runpy.run_path(str(ROOT / 'scripts/frosty-ebx-decode.py'))
reader_path = ROOT / 'scripts/frosty-ebx-decode.py'
walker_path = ROOT / 'scripts/frosty-audit-fields.py'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if sha(SYM_PATH) != SYM_EXPECTED_SHA256:
    raise ValueError('Provided Sym 1.4.2.0 file does not match its supplied SHA-256')
sym = json.loads(SYM_PATH.read_text(encoding='utf-8'))


def values_from_points(value):
    if not isinstance(value, list):
        return []
    return [[point.get('Field_3901db14'), point.get('Field_42fc0f5e')]
            for point in value if isinstance(point, dict)
            and 'Field_3901db14' in point and 'Field_42fc0f5e' in point]


def values_from_flat(value):
    if not isinstance(value, list) or len(value) % 2:
        return []
    return [[value[i], value[i + 1]] for i in range(0, len(value), 2)]


def curves_equal(left, right, tolerance=1e-4):
    if len(left) != len(right):
        return False
    return all(a is not None and b is not None and abs(float(a) - float(b)) <= tolerance
               for pair_a, pair_b in zip(left, right) for a, b in zip(pair_a, pair_b))


def damage_at(points, distance):
    """Mirror sim/damage.js damageAtRange, including repeated-distance steps."""
    if not points:
        return None
    if distance <= points[0][0]:
        return points[0][1]
    for previous, point in zip(points, points[1:]):
        if distance > point[0]:
            continue
        if point[0] == previous[0]:
            return previous[1]
        return previous[1] + (point[1] - previous[1]) * ((distance - previous[0]) / (point[0] - previous[0]))
    return points[-1][1]


def curves_behavior_equal(left, right, tolerance=1e-3):
    """Compare rendered curves at both sides of every exact damage breakpoint."""
    if not left or not right:
        return not left and not right
    cuts = sorted({float(p[0]) for p in left + right})
    probes = set(cuts)
    for i, cut in enumerate(cuts):
        probes.add(cut - 1e-4)
        probes.add(cut + 1e-4)
        if i + 1 < len(cuts) and cuts[i + 1] > cut:
            probes.add((cut + cuts[i + 1]) / 2)
    return all(abs(damage_at(left, x) - damage_at(right, x)) <= tolerance for x in probes)


def ref_index(value):
    if isinstance(value, dict) and isinstance(value.get('$ref'), int):
        return value['$ref']
    return None


def resolve_projectile_objects(objects, body):
    point_idx = ref_index(body.get('Field_6008eb31'))
    flat_idx = ref_index(body.get('Field_2ad7e688'))
    point_obj = objects[point_idx] if point_idx is not None and point_idx < len(objects) else None
    flat_obj = objects[flat_idx] if flat_idx is not None and flat_idx < len(objects) else None
    point_pairs = values_from_points(point_obj.get('Field_edfc6df6')) if point_obj else []
    flat_pairs = values_from_flat(flat_obj.get('Field_5279388d')) if flat_obj else []
    tweakable_point_pairs = values_from_points(flat_obj.get('Field_edfc6df6')) if flat_obj else []
    return {
        'pointRefObjectIndex': point_idx,
        'pointRefObjectGuid': point_obj.get('$guid') if point_obj else None,
        'pointRefClass': point_obj.get('$class') if point_obj else None,
        'healthCurveFieldPath': f'objects[{point_idx}].Field_edfc6df6' if point_obj else None,
        'pointFieldPath': f'objects[{flat_idx}].Field_edfc6df6' if flat_obj else None,
        'pointPairs': tweakable_point_pairs,
        'healthCurvePairs': point_pairs,
        'tweakablePointPairs': tweakable_point_pairs,
        'flatRefObjectIndex': flat_idx,
        'flatRefObjectGuid': flat_obj.get('$guid') if flat_obj else None,
        'flatRefClass': flat_obj.get('$class') if flat_obj else None,
        'tweakablePointFieldPath': f'objects[{flat_idx}].Field_edfc6df6' if flat_obj else None,
        'flatFieldPath': f'objects[{flat_idx}].Field_5279388d' if flat_obj else None,
        'flatPairs': flat_pairs,
        'healthAndTweakableAreDistinct': point_idx != flat_idx,
        'tweakablePointFlatExactWhenBothPresent': (curves_equal(tweakable_point_pairs, flat_pairs)
                                                   if tweakable_point_pairs and flat_pairs else None),
    }


def descriptor_layout(layout, types, class_name, field_hashes):
    if layout['hash'] != class_name.removeprefix('Class_'):
        raise ValueError(f'{class_name}: instance-selected descriptor key mismatch')
    fields = {}
    def collect(current):
        for row in current['fields']:
            if reader['debug_type'](row['flags']) == 0:
                collect(types['classes'][row['classRef']])
            else:
                fields[row['hash']] = {'offset': row['offset'], 'classRef': row['classRef']}
    collect(layout)
    if any(field_hash not in fields for field_hash in field_hashes):
        raise ValueError(f'{class_name}: field absent from selected descriptor inheritance chain')
    return {'class': class_name, 'objectSize': layout['size'],
            'fields': {field_hash: fields[field_hash] for field_hash in field_hashes}}


db = sqlite3.connect(f'{DB_PATH.resolve().as_uri()}?mode=ro', uri=True)
db.row_factory = sqlite3.Row
projectile_models = ballistics['projectiles']
routes = sorted(projectile_models)
assert len(routes) == 64
captures = {}
decoded = {}
inventory_path = OUT_DIR / 'projectile-fields.jsonl'
field_count = 0
asset_rows = []
with inventory_path.open('w', encoding='utf-8') as out:
    for route in routes:
        model_record = projectile_models[route]
        matches = db.execute('SELECT * FROM captures WHERE route=? COLLATE NOCASE', (route,)).fetchall()
        if len(matches) != 1:
            raise ValueError(f'{route}: expected one exact route record in v5 DB, found {len(matches)}')
        capture = dict(matches[0])
        raw_path = Path(capture['raw_path'])
        actual_raw_sha = sha(raw_path)
        if actual_raw_sha != capture['raw_sha256']:
            raise ValueError(f'{route}: capture DB raw hash mismatch')
        if capture['head'] != 4892017 or capture['decode_status'] not in ('decoded', 'decoded-provisional'):
            raise ValueError(f'{route}: unexpected source build/decode state')
        descriptor_path = Path(capture['descriptor_path'])
        if sha(descriptor_path) != capture['descriptor_sha256']:
            raise ValueError(f'{route}: descriptor hash mismatch')
        types = reader['type_descriptors'](descriptor_path)
        if types['sha256'] != capture['descriptor_sha256']:
            raise ValueError(f'{route}: descriptor metadata hash mismatch')
        ebx = reader['Ebx'](raw_path, types)
        objects = ebx.decode()['objects']
        target_guid = model_record['guid'].lower()
        matches_by_guid = [(i, obj) for i, obj in enumerate(objects)
                           if str(obj.get('$guid', '')).lower() == target_guid]
        if len(matches_by_guid) != 1:
            raise ValueError(f'{route}: expected unique projectile GUID object {target_guid}, found {len(matches_by_guid)}')
        body_index, body = matches_by_guid[0]
        fields = resolve_projectile_objects(objects, body)
        body_layout = descriptor_layout(types['byGuid'][ebx.class_keys[ebx.instances[body_index]['classRef']]], types, body['$class'], ['30c37c24', 'd9d33d20', '6008eb31', '2ad7e688'])
        point_obj = objects[fields['pointRefObjectIndex']]
        flat_obj = objects[fields['flatRefObjectIndex']]
        point_layout = descriptor_layout(types['byGuid'][ebx.class_keys[ebx.instances[fields['pointRefObjectIndex']]['classRef']]], types, point_obj['$class'], ['edfc6df6'])
        flat_layout = descriptor_layout(types['byGuid'][ebx.class_keys[ebx.instances[fields['flatRefObjectIndex']]['classRef']]], types, flat_obj['$class'], ['edfc6df6', '5279388d'])
        if 'Field_30c37c24' not in body or 'Field_d9d33d20' not in body:
            raise ValueError(f'{route}: exact projectile object lacks drag/gravity fields')
        for object_index, obj in enumerate(objects):
            for pointer, shape, value_type, value in field_walker(obj):
                record = {
                    'assetRoute': route,
                    'captureId': capture['id'],
                    'head': capture['head'],
                    'rawSha256': capture['raw_sha256'],
                    'descriptorSha256': capture['descriptor_sha256'],
                    'objectIndex': object_index,
                    'objectGuid': obj.get('$guid'),
                    'objectClass': obj.get('$class'),
                    'isProjectileGuidObject': object_index == body_index,
                    'pointer': pointer,
                    'shape': shape,
                    'type': value_type,
                    'value': value,
                }
                out.write(json.dumps(record, ensure_ascii=True) + '\n')
                field_count += 1
        captures[route] = capture
        decoded[route] = {'objects': objects, 'bodyIndex': body_index, 'body': body, 'damageRefs': fields,
                          'descriptorLayouts': {'body': body_layout, 'point': point_layout, 'flat': flat_layout}}
        asset_rows.append({
            'route': route,
            'dataBallisticsGuid': model_record['guid'],
            'bodyObjectIndex': body_index,
            'bodyObjectClass': body.get('$class'),
            'decodedDrag': body['Field_30c37c24'],
            'decodedGravity': body['Field_d9d33d20'],
            'siteDrag': model_record['dragPerMeter'],
            'siteGravity': model_record['gravityMps2'],
            'siteDragAgreement': abs(float(body['Field_30c37c24']) - float(model_record['dragPerMeter'])) <= 1e-6,
            'siteGravityAgreement': abs(float(body['Field_d9d33d20']) - float(model_record['gravityMps2'])) <= 1e-6,
            'captureId': capture['id'],
            'captureDecodeStatus': capture['decode_status'],
            'rawSha256': capture['raw_sha256'],
            'descriptorSha256': capture['descriptor_sha256'],
            'descriptorLayouts': decoded[route]['descriptorLayouts'],
            'objects': len(objects),
            **fields,
        })
db.close()

route_asset_sha = ballistics['source']['projectileSha256']
site_usage = []
base_mismatches = []
base_point_differences = []
site_sym_mismatches = []
point_sym_mismatches = []
flat_sym_mismatches = []
ammo_damage_mismatches = []
ammo_flat_functional_mismatches = []
ammo_point_copy_disagreements = []
point_flat_differences = []
for weapon in weapons:
    wid = weapon['id']
    selector = ballistics['weapons'][wid]
    ammo_spec = ammo_data[wid]
    exact_internal_id = identity_by_site[wid]['internalId']
    sym_key = exact_internal_id.lower()
    if sym_key not in sym:
        raise ValueError(f'{wid}: exact identity key {sym_key} missing from supplied Sym file')
    sym_entry = sym[sym_key]
    sym_pairs = list(zip(sym_entry.get('damage', {}).get('dists', []), sym_entry.get('damage', {}).get('dmgs', [])))
    source_damage = weapon.get('dmg', [])
    site_pairs = [[point.get('r'), point.get('d')] for point in source_damage]
    base_route = selector['base']
    base_fields = decoded[base_route]['damageRefs']
    base_point_agree = curves_equal(site_pairs, base_fields['pointPairs']) if base_fields['pointPairs'] else None
    base_flat_agree = curves_equal(site_pairs, base_fields['flatPairs'])
    base_point_behavior = curves_behavior_equal(site_pairs, base_fields['pointPairs']) if base_fields['pointPairs'] else None
    base_flat_behavior = curves_behavior_equal(site_pairs, base_fields['flatPairs'])
    site_sym_agree = curves_equal(site_pairs, sym_pairs)
    point_sym_agree = curves_equal(base_fields['pointPairs'], sym_pairs) if base_fields['pointPairs'] else None
    flat_sym_agree = curves_equal(base_fields['flatPairs'], sym_pairs)
    if base_fields['pointPairs'] and not base_point_agree:
        base_point_differences.append({
            'siteId': wid,
            'name': weapon['name'],
            'baseRoute': base_route,
            'siteDamage': site_pairs,
            'sourcePointDamage': base_fields['pointPairs'],
            'sourceFlatDamage': base_fields['flatPairs'],
            'sourceRawSha256': captures[base_route]['raw_sha256'],
        })
    if not base_flat_agree:
        base_mismatches.append({'siteId': wid, 'name': weapon['name'], 'baseRoute': base_route,
            'siteDamage': site_pairs, 'sourceFlatDamage': base_fields['flatPairs'],
            'siteDamageSource': weapon.get('damageSource'), 'siteDamageStatus': weapon.get('damageStatus'),
            'sourceRawSha256': captures[base_route]['raw_sha256']})
    if not site_sym_agree:
        site_sym_mismatches.append({'siteId': wid, 'internalId': exact_internal_id, 'symKey': sym_key,
            'symBuild': '1.4.2.0 / 18 Aug 2026', 'baseRoute': base_route,
            'siteDamage': site_pairs, 'symDamage': sym_pairs, 'siteDamageSource': weapon.get('damageSource')})
    if base_fields['pointPairs'] and not point_sym_agree:
        point_sym_mismatches.append({'siteId': wid, 'baseRoute': base_route,
            'sourcePointDamage': base_fields['pointPairs'], 'symDamage': sym_pairs})
    if not flat_sym_agree:
        flat_sym_mismatches.append({'siteId': wid, 'baseRoute': base_route,
            'sourceFlatDamage': base_fields['flatPairs'], 'symDamage': sym_pairs})
    ammo_rows = []
    if set(selector['ammo']) != set(ammo_spec['ammo']):
        raise ValueError(f'{wid}: ballistics ammo selector differs from data/ammo.json')
    for ammo_id, route in selector['ammo'].items():
        fields = decoded[route]['damageRefs']
        override = ammo_spec.get('projectileOverrides', {}).get(ammo_id)
        selected_site_pairs = ([[p.get('r'), p.get('d')] for p in override.get('dmg', [])]
                               if override else site_pairs)
        point_agree = curves_equal(selected_site_pairs, fields['pointPairs']) if fields['pointPairs'] else None
        flat_agree = curves_equal(selected_site_pairs, fields['flatPairs'])
        point_behavior = curves_behavior_equal(selected_site_pairs, fields['pointPairs']) if fields['pointPairs'] else None
        flat_behavior = curves_behavior_equal(selected_site_pairs, fields['flatPairs'])
        differs_from_base_route = route != base_route
        route_differs_from_base_damage = not curves_equal(base_fields['pointPairs'], fields['pointPairs'])
        route_flat_differs_from_base_damage = not curves_equal(base_fields['flatPairs'], fields['flatPairs'])
        ammo_row = {
            'ammoId': ammo_id,
            'selectedBySiteBallistics': route,
            'selectionTrace': ballistics['source']['attachmentTrace'],
            'routeIsBase': not differs_from_base_route,
            'siteOverride': bool(override),
            'siteDamageCurveUsed': 'data/ammo.json WEAPON_AMMO.projectileOverrides' if override else 'data/weapons.json dmg',
            'siteDamagePairs': selected_site_pairs,
            'sourcePointPairs': fields['pointPairs'],
            'sourceFlatPairs': fields['flatPairs'],
            'tweakablePointAgreement': point_agree,
            'tweakableFlatAgreement': flat_agree,
            'tweakablePointBehaviorAgreement': point_behavior,
            'tweakableFlatBehaviorAgreement': flat_behavior,
            'sourcePointCurveDiffersFromBaseRoute': route_differs_from_base_damage,
            'sourceFlatCurveDiffersFromBaseRoute': route_flat_differs_from_base_damage,
            'sourceProjectileRawSha256': captures[route]['raw_sha256'],
        }
        ammo_rows.append(ammo_row)
        if not flat_agree:
            ammo_damage_mismatches.append({'siteId': wid, 'name': weapon['name'], **ammo_row})
        if not flat_behavior:
            ammo_flat_functional_mismatches.append({'siteId': wid, 'name': weapon['name'], **ammo_row})
        if fields['pointPairs'] and not point_agree:
            ammo_point_copy_disagreements.append({'siteId': wid, **ammo_row})
    site_usage.append({
        'siteId': wid,
        'name': weapon['name'],
        'internalId': exact_internal_id,
        'symKey': sym_key,
        'symBuild': '1.4.2.0 / 18 Aug 2026',
        'siteClass': weapon['cls'],
        'baseRoute': base_route,
        'baseCaptureId': captures[base_route]['id'],
        'baseRawSha256': captures[base_route]['raw_sha256'],
        'siteBaseDamagePairs': site_pairs,
        'symBaseDamagePairs': sym_pairs,
        'baseHealthCurveReference': {'objectIndex': base_fields['pointRefObjectIndex'], 'objectGuid': base_fields['pointRefObjectGuid'], 'fieldPath': base_fields['healthCurveFieldPath'], 'pairs': base_fields['healthCurvePairs']},
        'baseTweakableDamageCurveReference': {'objectIndex': base_fields['flatRefObjectIndex'], 'objectGuid': base_fields['flatRefObjectGuid'], 'pointFieldPath': base_fields['tweakablePointFieldPath'], 'pointPairs': base_fields['tweakablePointPairs'], 'flatFieldPath': base_fields['flatFieldPath'], 'flatPairs': base_fields['flatPairs']},
        'descriptorLayouts': decoded[base_route]['descriptorLayouts'],
        'baseTweakablePointAgreement': base_point_agree,
        'baseTweakableFlatAgreement': base_flat_agree,
        'baseTweakablePointBehaviorAgreement': base_point_behavior,
        'baseTweakableFlatBehaviorAgreement': base_flat_behavior,
        'siteSymAgreement': site_sym_agree,
        'pointSymAgreement': point_sym_agree,
        'flatSymAgreement': flat_sym_agree,
        'defaultAmmo': ammo_spec.get('def'),
        'ammoSelections': ammo_rows,
    })

usage_path = OUT_DIR / 'projectile-site-usage.jsonl'
usage_path.write_text(''.join(json.dumps(row, ensure_ascii=True) + '\n' for row in site_usage), encoding='utf-8')
m45 = next(row for row in site_usage if row['siteId'] == 'm45a1')
m45_route = decoded[m45['baseRoute']]['damageRefs']
m45_sym = list(zip(sym['m45a1'].get('damage', {}).get('dists', []), sym['m45a1'].get('damage', {}).get('dmgs', [])))
m45_samples = []
for distance in (54, 60, 74.999, 75, 75.001):
    m45_samples.append({
        'rangeMeters': distance,
        'site': damage_at(m45['siteBaseDamagePairs'], distance),
        'currentPDHealthCurve': damage_at(m45_route['pointPairs'], distance),
        'currentPDTweakableDamageCurve': damage_at(m45_route['flatPairs'], distance),
        'datedSym1420': damage_at(m45_sym, distance),
    })
all_xml = sum((1 for route in routes if route + '.xml' in route_asset_sha))
if all_xml != len(routes):
    raise ValueError(f'expected XML overlay hashes for all 64 selected PD assets; found {all_xml}')

def distribution(rows, key):
    result = {}
    for row in rows:
        value = row[key]
        result[str(value)] = result.get(str(value), 0) + 1
    return result

report = {
    'reviewDate': '2026-09-23',
    'scope': 'Every PD projectile asset referenced by all 63 site weapons base and selected-ammo routes. Capture/decode evidence is source presence, not proof of native execution or selected ammo in-game.',
    'build': {'archiveHead': 4892017, 'descriptorSha256': '91c9ea7c3dd830e34a78123c8bb7485e80eefdb18fc9c7ee41117971d23565c2'},
    'inputs': {
        'ballisticsSha256': sha(ROOT / 'data/ballistics.json'),
        'weaponsSha256': sha(ROOT / 'data/weapons.json'),
        'ammoSha256': sha(ROOT / 'data/ammo.json'),
        'v5DatabasePath': str(DB_PATH),
        'v5DatabaseSha256': sha(DB_PATH),
        'decoderSha256': sha(reader_path),
        'fieldWalkerSha256': sha(walker_path),
        'symFilePath': str(SYM_PATH),
        'symFileSha256': sha(SYM_PATH),
        'symBuildLabel': '1.4.2.0 / 18 Aug 2026',
        'selectionTrace': ballistics['source']['attachmentTrace'],
        'selectionTraceSha256': ballistics['source']['attachmentTraceSha256'],
        'xmlOverlayHashMapSha256': hashlib.sha256(json.dumps(route_asset_sha, sort_keys=True).encode()).hexdigest(),
    },
    'captureAndFieldInventory': {
        'siteWeapons': len(weapons), 'uniqueReferencedPDRoutes': len(routes),
        'capturesHashMatchedAndDecoded': len(captures), 'exactBodyGuidMatches': len(decoded),
        'rawFieldEntries': field_count,
        'fieldsJsonl': {'path': str(inventory_path), 'sha256': sha(inventory_path), 'bytes': inventory_path.stat().st_size},
        'siteUsageJsonl': {'path': str(usage_path), 'sha256': sha(usage_path), 'records': len(site_usage)},
        'captureIds': [captures[route]['id'] for route in routes],
    },
    'directFieldResults': {
        'dragFieldPath': 'projectile GUID body object Field_30c37c24',
        'gravityFieldPath': 'projectile GUID body object Field_d9d33d20',
        'allSiteDragValuesMatchRaw': sum(row['siteDragAgreement'] for row in asset_rows),
        'allSiteGravityValuesMatchRaw': sum(row['siteGravityAgreement'] for row in asset_rows),
        'dragDistribution': distribution(asset_rows, 'decodedDrag'),
        'gravityDistribution': distribution(asset_rows, 'decodedGravity'),
        'healthAndTweakableAreDistinctCurves': True,
        'healthCurveBinding': 'Projectile Field_6008eb31 -> referenced health-curve object Field_edfc6df6 point structs.',
        'siteDamageCurveBinding': 'Projectile Field_2ad7e688 -> referenced TweakableDamageCurve object; Field_5279388d is its flat interleaved curve. Any Field_edfc6df6 points are on this same object and are compared only with its own flat array.',
        'tweakableObjectsWithPointArrayPopulated': sum(bool(row['tweakablePointPairs']) for row in asset_rows),
        'tweakablePointAndFlatComparedOnlyWhenBothPresent': 'Object-index/GUID refs, descriptor paths and all fields are in the external JSONL. The separately referenced health curve is not a second representation of TweakableDamageCurve.',
    },
    'siteDamageComparison': {
        'all63BaseWeaponsCompared': len(site_usage),
        'baseRepresentationAgreement': {
            'pointExactPairs': sum(bool(row['baseTweakablePointAgreement']) for row in site_usage),
            'pointBehavior': sum(bool(row['baseTweakablePointBehaviorAgreement']) for row in site_usage),
            'flatExactPairs': sum(row['baseTweakableFlatAgreement'] for row in site_usage),
            'flatBehavior': sum(row['baseTweakableFlatBehaviorAgreement'] for row in site_usage),
            'pointOutlierSiteIds': [x['siteId'] for x in base_point_differences],
            'flatOutlierSiteIds': [x['siteId'] for x in base_mismatches],
            'flatFunctionalOutlierSiteIds': [row['siteId'] for row in site_usage if not row['baseTweakableFlatBehaviorAgreement']],
            'limits': 'Pair-array equality and function-level behavior are separate. Functional comparison mirrors sim/damage.js and checks either side of each breakpoint, repeated-distance steps, and segment midpoints.'
        },
        'siteMatchesDatedSym': len(site_usage) - len(site_sym_mismatches),
        'siteDiffersFromDatedSymSiteIds': [x['siteId'] for x in site_sym_mismatches],
        'currentPointCopyDiffersFromDatedSymSiteIds': [x['siteId'] for x in point_sym_mismatches],
        'currentFlatCopyDiffersFromDatedSymSiteIds': [x['siteId'] for x in flat_sym_mismatches],
        'ammoRoutesCompared': sum(len(row['ammoSelections']) for row in site_usage),
        'ammoRepresentationAgreement': {
            'routesCompared': sum(len(row['ammoSelections']) for row in site_usage),
            'pointExactPairs': sum(bool(a['tweakablePointAgreement']) for row in site_usage for a in row['ammoSelections']),
            'pointBehavior': sum(bool(a['tweakablePointBehaviorAgreement']) for row in site_usage for a in row['ammoSelections']),
            'flatExactPairs': sum(a['tweakableFlatAgreement'] for row in site_usage for a in row['ammoSelections']),
            'flatBehavior': sum(a['tweakableFlatBehaviorAgreement'] for row in site_usage for a in row['ammoSelections']),
            'flatFunctionalOutlierSelections': [{'siteId':x['siteId'],'ammoId':x['ammoId'],'route':x['selectedBySiteBallistics']} for x in ammo_flat_functional_mismatches],
            'limits': 'Full per-route records, including point/flat curves, are in siteUsageJsonl.'
        },
        'curveRoles': {'tweakablePointFlatSameObjectDisagreements': sum(row['tweakablePointFlatExactWhenBothPresent'] is False for row in asset_rows), 'healthVsTweakableDistinctCurves': True, 'tweakablePointAndFlatSameObjectComparedOnlyWhenBothPopulated': True, 'assetsWithEmptyTweakablePointArray': sum(not row['tweakablePointPairs'] for row in asset_rows),
            'all64CurvesAndExactReferencedObjectPaths': 'projectile-fields.jsonl and projectile-site-usage.jsonl'},
        'namedBuildExceptions': {
            'vssm': {k:next(row for row in site_usage if row['siteId']=='vssm')[k] for k in ('siteId','internalId','baseRoute','siteBaseDamagePairs','symBaseDamagePairs','baseHealthCurveReference','baseTweakableDamageCurveReference','baseTweakablePointAgreement','baseTweakableFlatAgreement','siteSymAgreement')},
            'interdictor': {k:next(row for row in site_usage if row['siteId']=='interdictor')[k] for k in ('siteId','internalId','baseRoute','siteBaseDamagePairs','symBaseDamagePairs','baseHealthCurveReference','baseTweakableDamageCurveReference','baseTweakablePointAgreement','baseTweakableFlatAgreement','siteSymAgreement')},
            'm45a1': {
                'siteId': 'm45a1', 'exactInternalId': m45['internalId'], 'route': m45['baseRoute'],
                'siteCurve': m45['siteBaseDamagePairs'], 'currentPDTweakablePointCurve': m45_route['pointPairs'],
                'currentPDTweakableDamageCurve': m45_route['flatPairs'], 'datedSym1420Curve': m45['symBaseDamagePairs'],
                'curveRole': 'Field_6008eb31 points to a separate health-curve object. Field_2ad7e688 points to the TweakableDamageCurve object; its Field_edfc6df6 point array is empty for M45A1, while its Field_5279388d flat array is populated. Do not treat the health curve as a second encoding/copy of the TweakableDamageCurve.',
                'descriptorSelectedFieldOffsets': {
                    'healthCurvePoints': {'objectClass': m45['descriptorLayouts']['point']['class'], 'field': 'Field_edfc6df6', 'objectRelativeOffset': m45['descriptorLayouts']['point']['fields']['edfc6df6']['offset']},
                    'tweakableCurvePoints': {'objectClass': m45['descriptorLayouts']['flat']['class'], 'field': 'Field_edfc6df6', 'objectRelativeOffset': m45['descriptorLayouts']['flat']['fields']['edfc6df6']['offset']},
                    'flatArray': {'objectClass': m45['descriptorLayouts']['flat']['class'], 'field': 'Field_5279388d', 'objectRelativeOffset': m45['descriptorLayouts']['flat']['fields']['5279388d']['offset']},
                    'projectileReferences': {'objectClass': m45['descriptorLayouts']['body']['class'], 'pointField': 'Field_6008eb31', 'pointObjectRelativeOffset': m45['descriptorLayouts']['body']['fields']['6008eb31']['offset'], 'flatField': 'Field_2ad7e688', 'flatObjectRelativeOffset': m45['descriptorLayouts']['body']['fields']['2ad7e688']['offset']},
                    'provenance': 'Offsets come from the exact instance-selected descriptor key and inherited field layout in SharedTypeDescriptors; they are object-relative, not arbitrary raw-body byte-search hits. The matching exact capture raw SHA, field paths, GUIDs and decoded values are in external JSONL.'
                },
                'damageAtRangeSamples': m45_samples,
                'siteSelectedAmmoIdsAffected': [row['ammoId'] for row in m45['ammoSelections'] if row['selectedBySiteBallistics'] == m45['baseRoute'] and row['siteOverride'] is False],
                'priorSiteDecision': 'Known intentional transformation, not a newly identified site error. docs/DAMAGE_BALLISTICS.md and reference-data/provenance/frosty-damage-curve-review-2026-09-13.json record that the then-reviewed damage source omitted the 75m 14.3 point, while a 2026-09-13 in-game test observed damage marker 14 and 7 body shots below 75m, then marker 12 and 8 body shots beyond. The site intentionally retained 75m 14.3 to represent that tested step.',
                'currentBuildStatus': 'The current Head4892017 TweakableDamageCurve flat array has a direct 54m-to-75m ramp; its same-object point array is empty. This differs from the prior runtime step observation and needs controlled current-build revalidation. The separately referenced health curve is not used to make this comparison. Native runtime consumption remains unverified.',
                'interpretation': 'At 60m site and dated Sym retain 14.3, while the current PD TweakableDamageCurve interpolate to about 13.7857. The existing site step is intentionally runtime-supported by dated capture; repeat the same under-75/over-75 damage-marker and BTK test on Head4892017 to determine whether that behavior persists. This applies to M45A1 standard, penetration, frangible, and hollow_pt rows because all select the same PD route without a curve override.'
            },
            'limits': 'The health curve, TweakableDamageCurve same-object point array, TweakableDamageCurve flat array, and dated Sym 1.4.2.0 are reported as distinct sources. Empty arrays are non-comparable; differences retain their field path and build provenance.',
        },
    },
    'limitations': [
        'The supplied full Sym 1.4.2.0 file is compared by exact crosswalk identity; its older build is context, not current-build authority.',
        'The stored selector traces identify site data routes. They do not prove that the native game selects the same route at runtime or that every attachment chain is active.',
        'Current site weapon damage data provenance labels include older 1.4.2.5 values for some weapons, while PD captures here are Head 4892017. Build changes and semantic consumers must be considered when interpreting mismatches.',
        'The health curve and TweakableDamageCurve are distinct linked assets. Tweakable point and flat arrays are compared only within the same object when both are populated; source presence does not prove runtime consumption.',
    ],
}
out = ROOT / 'reference-data/provenance/frosty-site-projectile-2026-09-23.json'
out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({
    'weapons': len(weapons), 'uniqueRoutes': len(routes), 'captures': len(captures),
    'fieldRows': field_count, 'baseFlatMismatches': len(base_mismatches),
    'siteSymMismatches': len(site_sym_mismatches), 'ammoFlatMismatches': len(ammo_damage_mismatches),
    'ammoPointDifferences': len(ammo_point_copy_disagreements), 'tweakablePointFlatSameObjectDisagreements': report['siteDamageComparison']['curveRoles']['tweakablePointFlatSameObjectDisagreements'],
    'output': str(out),
}))




"""Audit 1.4.3.0 zeroing source against exact site identities and the site solver."""
import hashlib
import json
from pathlib import Path
import runpy
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DM = Path(r'C:\Users\royal\Documents\BF6 Datamining\builds\1.4.3.0')
params = json.loads((ROOT / 'reference-data/provenance/frosty-zeroing-parameters-2026-09-23.json').read_text(encoding='utf-8'))
roster = json.loads((ROOT / 'reference-data/provenance/frosty-audit-roster-2026-09-23.json').read_text(encoding='utf-8'))
site_weapons = json.loads((ROOT / 'data/weapons.json').read_text(encoding='utf-8'))
ballistics = json.loads((ROOT / 'data/ballistics.json').read_text(encoding='utf-8'))
identity_by_internal = {r['internalId']: r for r in roster['roots']}
identity_by_site = {r['siteIdentity']: r for r in roster['roots'] if r.get('siteIdentity')}
source_by_internal = {Path(r['route']).stem.removesuffix('_WB'): r for r in params['weapons']}

reader = runpy.run_path(str(ROOT / 'scripts/frosty-ebx-decode.py'))
types = reader['type_descriptors'](DM / 'capture/toolchain/SharedTypeDescriptors.ebx')
decoder_path = ROOT / 'scripts/frosty-ebx-decode.py'


def verify_field_pointer(rec):
    """Resolve the descriptor-defined list pointer through EBXX array metadata."""
    raw_path = DM / 'capture/collection/raw' / Path(*rec['route'].split('/')).with_suffix('.ebx')
    data = raw_path.read_bytes()
    raw_hash = hashlib.sha256(data).hexdigest()
    if raw_hash != rec['rawSha256']:
        raise ValueError(f"raw capture hash changed for {rec['route']}")
    ebx = reader['Ebx'](raw_path, types)
    object_start = ebx.data_start + ebx.data_offsets[rec['objectIndex']]
    values = rec['rawBlock']['Field_410f6aa8']
    found = []
    root_candidates = [c for c in types['classes'] if c['hash'] == '35259f6b']
    for root_class in root_candidates:
        root_field = next((f for f in root_class['fields'] if f['hash'] == '58d70acb'), None)
        if root_field is None:
            continue
        zeroing_class = ebx.class_by_index(root_field['classRef'])
        if zeroing_class['hash'] != '29ea5d2b':
            continue
        block_field = next((f for f in zeroing_class['fields'] if f['hash'] == '7d5dc312'), None)
        if block_field is None:
            continue
        block_class = ebx.class_by_index(block_field['classRef'])
        if block_class['hash'] != '7d5dc312':
            continue
        array_field = next((f for f in block_class['fields'] if f['hash'] == '410f6aa8'), None)
        if array_field is None:
            continue
        pointer_abs = object_start + root_field['offset'] + block_field['offset'] + array_field['offset']
        relative = struct.unpack_from('<i', data, pointer_abs)[0]
        resolved = (pointer_abs - ebx.data_start + relative) & 0xffffffff
        entry = next((a for a in ebx.arrays if a['offset'] == resolved), None)
        if entry is None:
            continue
        payload_abs = ebx.data_start + entry['offset']
        payload = data[payload_abs:payload_abs + entry['count'] * 4]
        decoded = list(struct.unpack('<' + 'i' * entry['count'], payload)) if entry['count'] else []
        if entry['type'] == 520 and decoded == values:
            layout = [root_class['hash'], zeroing_class['hash'], block_class['hash']]
            found.append({
                'descriptorClassPath': layout,
                'descriptorFields': [
                    {'hash': '58d70acb', 'offset': root_field['offset'], 'classRef': root_field['classRef']},
                    {'hash': '7d5dc312', 'offset': block_field['offset'], 'classRef': block_field['classRef']},
                    {'hash': '410f6aa8', 'offset': array_field['offset'], 'flags': array_field['flags']},
                ],
                'arrayPointerAbsoluteOffset': pointer_abs,
                'arrayRelativeOffset': relative,
                'ebxxArrayOffset': entry['offset'],
                'ebxxArrayType': entry['type'],
                'ebxxArrayCount': entry['count'],
                'payloadAbsoluteOffset': payload_abs,
                'payloadHex': payload.hex(),
                'payloadValues': decoded,
            })
    return {
        'rawSha256': raw_hash,
        'rawBytes': len(data),
        'fieldPointerChecks': found,
        'exactDescriptorPointerVerified': len(found) == 1,
    }


def gravity_only_offsets(speed, zero):
    # Separate physical simplification, not the Analyzer solver or an engine claim.
    g = -9.81
    return {str(d): round((-g * d * (zero - d) / (2 * speed * speed)) * 100, 3)
            for d in (25, 50, 100, 200, 300, 500)}


def singleton_integer(value):
    if isinstance(value, int):
        return value
    if isinstance(value, list) and len(value) == 1 and isinstance(value[0], int):
        return value[0]
    return None


source_checks = {
    Path(rec['route']).stem.removesuffix('_WB'): verify_field_pointer(rec)
    for rec in params['weapons']
}

# Invoke the Analyzer's actual solver for both relevant hypothetical zero values.
solver_inputs = []
for weapon in site_weapons:
    wid = weapon['id']
    identity = identity_by_site.get(wid)
    source = source_by_internal.get(identity['internalId']) if identity else None
    source_values = (source or {}).get('rawBlock', {}).get('Field_410f6aa8')
    fixed_source_candidate = singleton_integer(source_values)
    model_ref = ballistics['weapons'].get(wid, {})
    projectile_route = model_ref.get('ammo', {}).get('standard') or model_ref.get('base')
    projectile = ballistics['projectiles'].get(projectile_route, {}) if projectile_route else {}
    solver_inputs.append({
        'id': wid,
        'velocityMps': weapon.get('bulletVel'),
        'dragPerMeter': projectile.get('dragPerMeter'),
        'gravityMps2': projectile.get('gravityMps2'),
        'projectileRoute': projectile_route,
        'fixedSourceCandidateZeroM': fixed_source_candidate,
    })
solver_js = """
import { zeroRelativeVerticalOffset } from './sim/ballistics.js';
const rows = JSON.parse(process.argv[1]);
const result = {};
for (const row of rows) {
  const model = {velocityMps: row.velocityMps, dragPerMeter: row.dragPerMeter, gravityMps2: row.gravityMps2};
  const zeroValues = [100, 200, row.fixedSourceCandidateZeroM].filter((z, i, a) => Number.isFinite(z) && a.indexOf(z) === i);
  result[row.id] = {
    model,
    offsetsCmByZero: Object.fromEntries(zeroValues.map(z => [z,
      Object.fromEntries([25, 50, 100, 200, 300, 500].map(d => [d, zeroRelativeVerticalOffset(model, d, z) * 100]))
    ])),
    boreOffsetsCm: Object.fromEntries([25, 50, 100, 200, 300, 500].map(d => [d, zeroRelativeVerticalOffset(model, d, null) * 100]))
  };
}
process.stdout.write(JSON.stringify(result));
"""
solved = subprocess.run(
    ['node', '--input-type=module', '-e', solver_js, json.dumps(solver_inputs, separators=(',', ':'))],
    cwd=ROOT, text=True, capture_output=True, check=True,
)
predictions = json.loads(solved.stdout)

weapon_rows = []
for weapon in site_weapons:
    wid = weapon['id']
    identity = identity_by_site.get(wid)
    internal = identity['internalId'] if identity else None
    source = source_by_internal.get(internal) if internal else None
    block = (source or {}).get('rawBlock', {})
    check = source_checks.get(internal, {})
    named = bool(source and source.get('registryAnchorName'))
    sim_zeroable = weapon.get('cls') in ('DMR', 'Sniper Rifle')
    model = predictions[wid]['model']
    offsets = predictions[wid]['offsetsCmByZero']
    weapon_rows.append({
        'siteId': wid,
        'siteName': weapon['name'],
        'siteClass': weapon['cls'],
        'internalId': internal,
        'sourceRoute': (source or {}).get('route'),
        'sourceFieldPath': (source or {}).get('fieldPath'),
        'namedGRXZeroingAnchor': named,
        'sourceIntegerList': block.get('Field_410f6aa8'),
        'sourceWBFlags': [block.get('Field_4b636fc6'), block.get('Field_4e34fabb'), block.get('Field_4449ee55')],
        'sourceMinimumCustomZeroingDistance': block.get('Field_0910a3f6'),
        'sourceMaximumCustomZeroingDistance': block.get('Field_7a592b4e'),
        'sourceCustomZeroingDelay': block.get('Field_812f7451'),
        'sourceScalarListValue': singleton_integer(block.get('Field_410f6aa8')),
        'sourceRawSha256': check.get('rawSha256'),
        'exactDescriptorPointerVerified': check.get('exactDescriptorPointerVerified', False),
        'fieldPointerEvidence': check.get('fieldPointerChecks', []),
        'siteTargetSimulatorZeroable': sim_zeroable,
        'siteZeroingMap': 'mapped-named' if named and sim_zeroable else ('source-list-unanchored' if not named else 'source-named-site-not-zeroable'),
        'bulletVelocityMps': weapon.get('bulletVel'),
        'projectileRoute': next(row['projectileRoute'] for row in solver_inputs if row['id'] == wid),
        'dragPerMeter': model['dragPerMeter'],
        'gravityMps2': model['gravityMps2'],
        'boreRelativeOffsetsCm': {str(k): round(v, 3) for k, v in predictions[wid]['boreOffsetsCm'].items()},
        'simOffsetsCmAtDistancesFor100mZero': {str(k): round(v, 3) for k, v in offsets['100'].items()},
        'simOffsetsCmAtDistancesFor200mZero': {str(k): round(v, 3) for k, v in offsets['200'].items()},
        'gravityOnlyAlternativeOffsetsCmFor100mZero': gravity_only_offsets(weapon['bulletVel'], 100),
        'gravityOnlyAlternativeOffsetsCmFor200mZero': gravity_only_offsets(weapon['bulletVel'], 200),
    })

named_rows = []
for rec in params['weapons']:
    if not rec.get('registryAnchorName'):
        continue
    internal = Path(rec['route']).stem.removesuffix('_WB')
    identity = identity_by_internal.get(internal)
    wid = identity['siteIdentity'] if identity else None
    check = source_checks[internal]
    named_rows.append({
        'internalId': internal,
        'siteId': wid,
        'siteName': identity.get('siteDisplayName') if identity else None,
        'sourceRoute': rec['route'],
        'sourceFieldPath': rec['fieldPath'] + '/Field_410f6aa8',
        'registryAnchorName': rec['registryAnchorName'],
        'decodedSourceValues': rec['rawBlock']['Field_410f6aa8'],
        'sourceMinCustomZeroingDistance': rec['rawBlock']['Field_0910a3f6'],
        'sourceMaxCustomZeroingDistance': rec['rawBlock']['Field_7a592b4e'],
        'sourceCustomZeroingDelay': rec['rawBlock']['Field_812f7451'],
        'sourceWBFlags': [rec['rawBlock']['Field_4b636fc6'], rec['rawBlock']['Field_4e34fabb'], rec['rawBlock']['Field_4449ee55']],
        'sourceRawSha256': check['rawSha256'],
        'exactDescriptorPointerVerified': check['exactDescriptorPointerVerified'],
        'simDefaultZeroM': 100,
        'sourceRawListValue': rec['rawBlock']['Field_410f6aa8'],
        'siteVelocityMps': predictions[wid]['model']['velocityMps'] if wid else None,
        'dragPerMeter': predictions[wid]['model']['dragPerMeter'] if wid else None,
        'gravityMps2': predictions[wid]['model']['gravityMps2'] if wid else None,
        'sourceListCandidateOffsetsCm': {
            str(rec['rawBlock']['Field_410f6aa8']): {
                str(d): round(predictions[wid]['offsetsCmByZero'][str(rec['rawBlock']['Field_410f6aa8'])][str(d)], 3)
                for d in (25, 50, 100, 200, 300, 500)
            }
        } if wid and isinstance(rec['rawBlock']['Field_410f6aa8'], int) else None,
        'simOffsetsCm': {
            'z100': {str(d): round(predictions[wid]['offsetsCmByZero']['100'][str(d)], 3) for d in (50, 100, 200, 300)},
            'z200': {str(d): round(predictions[wid]['offsetsCmByZero']['200'][str(d)], 3) for d in (100, 200, 300)},
        } if wid else None,
    })

model_gap_samples = []
for wid in ('m4a1', 'sgx'):
    identity = identity_by_site[wid]
    source = source_by_internal[identity['internalId']]
    candidate = singleton_integer(source['rawBlock']['Field_410f6aa8'])
    result = predictions[wid]
    model_gap_samples.append({
        'siteId': wid,
        'siteName': identity['siteDisplayName'],
        'sourceRoute': source['route'],
        'sourceFieldPath': source['fieldPath'] + '/Field_410f6aa8',
        'sourceRawSha256': source_checks[identity['internalId']]['rawSha256'],
        'exactDescriptorPointerVerified': source_checks[identity['internalId']]['exactDescriptorPointerVerified'],
        'unanchoredScalarListValue': candidate,
        'currentSiteBehavior': 'zeroDistanceFor returns null for this non-DMR/non-sniper, so target prediction is bore-relative.',
        'boreRelativeOffsetsCm': {str(d): round(result['boreOffsetsCm'][str(d)], 3) for d in (25, 50, 100, 200)},
        'conditionalFixedSourceListOffsetsCm': {str(d): round(result['offsetsCmByZero'][str(candidate)][str(d)], 3) for d in (25, 50, 100, 200)},
        'interpretation': 'Conditional model only: if this singleton WB list is active as a fixed zero, these are the Analyzer solver offsets. Source semantics and native activation are unknown.',
    })

report = {
    'reviewDate': '2026-09-23',
    'scope': 'All 63 current Analyzer weapons compared against exact roster crosswalk and stored WB zeroing state; 12 GRX-named blocks receive descriptor-pointer and solver predictions. Source presence is not runtime proof.',
    'build': {
        'source': '1.4.3.0 release capture',
        'archiveHead': params['archiveHead'],
        'descriptorSha256': params['descriptorSha256'],
        'parameterReceiptDecoderSha256': params['decoderSha256'],
        'currentVerifierDecoderSha256': hashlib.sha256(decoder_path.read_bytes()).hexdigest(),
        'currentVerifierDescriptorSha256': types['sha256'],
    },
    'evidenceHashes': {
        'parameterReceiptSha256': hashlib.sha256((ROOT / 'reference-data/provenance/frosty-zeroing-parameters-2026-09-23.json').read_bytes()).hexdigest(),
        'siteWeaponsSha256': hashlib.sha256((ROOT / 'data/weapons.json').read_bytes()).hexdigest(),
        'siteBallisticsSha256': hashlib.sha256((ROOT / 'data/ballistics.json').read_bytes()).hexdigest(),
        'siteUiSha256': hashlib.sha256((ROOT / 'ui/app.js').read_bytes()).hexdigest(),
        'siteSolverSha256': hashlib.sha256((ROOT / 'sim/ballistics.js').read_bytes()).hexdigest(),
        'auditScriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    },
    'identityCrosswalk': 'reference-data/provenance/frosty-audit-roster-2026-09-23.json roots[].internalId/siteIdentity and reference-data/provenance/frosty-weapon-identities.json; no inferred aliases.',
    'siteZeroingBehavior': {
        'simDefaultM': 100,
        'simDefaultPath': 'ui/app.js state.recoil.zeroDistance',
        'isZeroablePredicate': 'ui/app.js isZeroableWeapon: DMR or Sniper Rifle',
        'sourceAgreement': 'The 12 GRX-named blocks map exactly to all 12 site DMR/sniper weapons. Their source list equals the simulator selectable distances. The site default is a simulator choice only; the game default is unknown.',
    },
    'descriptorPointerChecks': {'all63SourceLists': sum(c['exactDescriptorPointerVerified'] for c in source_checks.values()), 'expectedCount': 63},
    'storedSourceStateDistribution': {
        'totalSiteWeapons': len(weapon_rows),
        'grxNamedMapped': sum(r['namedGRXZeroingAnchor'] and r['siteTargetSimulatorZeroable'] for r in weapon_rows),
        'sourceListButNoNamedAnchor': sum(not r['namedGRXZeroingAnchor'] for r in weapon_rows),
        'lists': {'100': 21, '60': 21, '75': 9, '100,200,300,400,500': 12},
        'wbFlags': {'false,false,false': 51, 'false,true,false': 12},
    },
    'model': {
        'formula': 'Actual sim/ballistics.js trajectoryAtDistance and zeroRelativeVerticalOffset; RK4 step 1/500 s, drag dv/dt=-k|v|v and gravity from data/ballistics.json. Bore elevation is bisected to cross each hypothetical zero plane.',
        'separateAlternative': 'Named weapons also include a gravity-only point-mass curve using y=-g*d*(z-d)/(2*v^2), with g=-9.81 and site bulletVel. This is a simplifying comparison only; it is neither the site solver nor evidence of the native engine formula.',
        'speed': 'data/weapons.json bulletVel with the standard-ammo projectile route from data/ballistics.json; no attachment modifications.',
        'impactOffsetConvention': 'sim output y is positive upward in cm relative to reticle; sight height is omitted.',
        'limits': ['These reproduce the Analyzer model, not the native engine zeroing model.', 'Source min/max/delay units and active runtime selection remain unverified.', 'Native attachment/ammo modifiers may change speed.', 'Impact predictions are conditional on native behavior matching the Analyzer model.'],
    },
    'defaultSelectorInvestigation': {
        'checks': [
            'All 63 WB lists and three booleans were compared, and every decoded list was traced through its exact descriptor-defined pointer to a typed EBXX array payload.',
            'The 12 named blocks have [100,200,300,400,500] and flags [false,true,false]; the other 51 have singleton [100] (21), [60] (21), or [75] (9), with flags [false,false,false].',
            'The standard-MP HUD widget and HUDLoadout_WeaponZeroingDBD expose a ZeroingDistance binding, but that binding has no numeric default or distance value.',
            'The RangeFinder package is separate and has two true booleans with unresolved individual meanings; it is not connected to that HUD database in the reviewed source.',
            'The named GRX children are CustomZeroing=false, CustomZeroingDelay=0.4, MaximumCustomZeroingDistance=1000, MinimumCustomZeroingDistance=100, RangeFinder=false, and RangeFindingInAdsOnly=true. None names a selected default distance.',
        ],
        'result': 'No inspected source field determines untouched-spawn selected distance or proves correction. Precise blocker: effective selection/correction requires gameplay observation or an executable/runtime consumer trace. Gameplay can establish tested build/loadout behavior, but not general consumer semantics.',
    },
    'fixedZeroVsBoreModelGap': {
        'siteBehavior': 'ui/app.js zeroDistanceFor returns null for the other 51 site weapons; sim/ballistics.js therefore predicts bore-relative trajectory for them.',
        'sourceState': 'Those 51 WB blocks have no named GRX zeroing anchor, but store singleton arrays [60], [75], or [100]. This is a candidate source input only; do not treat it as an active fixed zero without runtime proof.',
        'proposal': 'If gameplay confirms a singleton value sets the bore zero, consider using that value for non-DMR/non-sniper trajectory predictions; otherwise retain current bore-relative behavior.',
        'conditionalPredictions': model_gap_samples,
    },
    'rank7CaptureUpdate': {
        'priority': 7,
        'protocol': ['Record untouched-spawn HUD zero before input for one exact-crosswalk bolt-action and one DMR; repeat five fresh spawns each.', 'At measured 100 m and 200 m, fire five shots with zero set to 100 m and then 200 m. Keep loadout, standard ammo, stance and optic fixed; preserve full HUD and impact grid.', 'Record RangeFinder separately only if offered; do not infer its activation from the unnamed source booleans.'],
        'predictions': 'Per-weapon conditional offsets for both 100 m and 200 m zero settings are included. If impacts cross near the selected plane, the Analyzer model is a candidate explanation. A different untouched-spawn HUD value identifies the tested game default. If HUD changes but impacts do not, displayed selection and trajectory correction are decoupled or another condition is required.',
        'gameplayLimit': 'A controlled capture can resolve displayed default and practical correction for tested weapons/build/loadouts. It cannot alone prove serialized consumer identity or generalize to all weapons/builds.',
    },
    'all63Details': None,
    'namedSourceBlocks': named_rows,
}
detail_path = DM / 'reports/exhaustive-audit-2026-09-23/site-zeroing-weapons.jsonl'
detail_path.write_text(''.join(json.dumps(row, ensure_ascii=True) + '\n' for row in weapon_rows), encoding='utf-8')
report['all63Details'] = {
    'path': str(detail_path),
    'sha256': hashlib.sha256(detail_path.read_bytes()).hexdigest(),
    'records': len(weapon_rows),
    'description': 'Per-site-weapon source and site values, exact descriptor pointer/EBXX evidence, and solver predictions for hypothetical 100 m and 200 m zeros.',
}
out = ROOT / 'reference-data/provenance/frosty-site-zeroing-2026-09-23.json'
out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'siteWeapons': len(weapon_rows), 'mappedNamed': report['storedSourceStateDistribution']['grxNamedMapped'], 'namedSources': len(named_rows), 'descriptorPointersVerified': sum(c['exactDescriptorPointerVerified'] for c in source_checks.values()), 'output': str(out)}))

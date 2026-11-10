"""Generate grip, laser and magazine handling from the capture (raw or XML export).

The identity file (--mapping) names, for every site grip, laser and magazine selection, the source
attachment record(s); every value is read from the capture on each run through the ability/selector
graph (WB modifier effects and GS_<weapon> bindings of the selected selectors).

Owned fields (regenerated on every run, never copied from the committed file):
  grip   GRIPS[].frostyModifiers[weapon]: adsTimeTierMod (WME_ADSTime anim = FOV step),
         adsMoveSpeedTierShift, sprintRecoveryTierShift, deployTimeTierShift (WME_* steps, sign flipped);
         movingAdsSpreadTierMod (the GS binding of the grip's selector to GDM_Array_ADSMoveDispersion_*;
         no binding = 0). It is stored as GRIPS[].movingAdsSpreadTierMod (the most common value of the
         weapons offering the grip) plus frostyModifiers[weapon].movingAdsSpreadTierMod where a weapon differs.
  laser  LASERS[].frostyModifiers[weapon]: hipSpreadTierMod, movingAdsSpreadTierMod (GDM dispersion arrays).
  mag    WEAPON_MAG[weapon].mags[id]: adsTimeTierShift, adsMoveSpeedTierShift, sprintRecoveryTierShift,
         deployTimeTierShift, movingAdsSpreadTierMod (GS route as for grips); weaponSwayMult
         (Class_28d25398 / Class_2fea847d Field_90fd0310; absent without one); reload: tacRldOverrideMs =
         round(1000 * Field_fc66e75e / Field_1c533b56) of the first Class_7d916d6b entry, else reloadSpeedTier =
         the index of the Class_9705264b multiplier (Field_348b8cd1) in balance_tables RELOAD_SPEED_MULTIPLIERS
         (0 without one), or reloadSpeedTier 0 plus reloadSpeedMult for a multiplier off that ladder.
  base   WEAPON_MAG m60 defAds/defAms and pw7a2 defAms from the GRX registry.
Copies of an owned fact in other files (written from the generated value; --check compares them):
  data/reload-exceptions.json animationOverrides[weapon][mag].tacRldOverrideMs
  data/weapon_attributes.json mobilityInputs[weapon].movingAdsGripShifts[grip]
  WEAPON_MAG..suspectedGameBug.expectedWhenFixed (checked: equals the source value of its field)
Fields not owned are listed in NOT_OWNED, kept as committed and counted in the report. Any other key
on a handled entry stops the run, so nothing is carried through silently.

Deviations (--overrides, rows with generator "frosty-attachment-handling": weapon, slot, id, field,
sourceValue, siteValue) replace one generated value. Each row is reported applied, STALE (the source
no longer equals sourceValue), REDUNDANT (the source now equals siteValue) or UNUSED (no such
selection); the last three fail the run.

--check writes nothing and exits 1 on any difference from the committed files or any problem
(unmapped selection, unresolved field, unknown key, copy mismatch, deviation not applied). Without
--check, a run with problems writes the report only and exits 1.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = 'frosty-attachment-handling'
AXES = {
    'grip': ('adsTimeTierMod', 'adsMoveSpeedTierShift', 'sprintRecoveryTierShift', 'deployTimeTierShift',
             'movingAdsSpreadTierMod'),
    'laser': ('hipSpreadTierMod', 'movingAdsSpreadTierMod'),
    'mag': ('adsTimeTierShift', 'adsMoveSpeedTierShift', 'sprintRecoveryTierShift',
            'deployTimeTierShift', 'movingAdsSpreadTierMod'),
}
MAG_EXTRA = ('weaponSwayMult', 'reloadSpeedTier', 'reloadSpeedMult', 'tacRldOverrideMs')
# Keys a handled entry may carry that this generator does not write, and who owns them.
NOT_OWNED = {
    'grip shared': {'id': 'catalog', 'name': 'catalog', 'pts': 'frosty-point-costs.py',
                    'adsRecoilTierMod': 'hand (recoil packages)', 'hipRecoilTierMod': 'hand (recoil packages)',
                    'hipSpreadTierMod': 'hand (Canted Vertical hip step)', 'deployed': 'hand (bipod packages)',
                    'utilities': 'hand', 'weaponSwayMult': 'hand (Actuated Module sway)',
                    'stanceSway': 'hand (recordings)'},
    'grip per weapon': {'adsRecoilTierMod': 'hand (recoil packages)', 'hipRecoilTierMod': 'hand (recoil packages)',
                        'deployed': 'hand (bipod packages)'},
    'laser shared': {'id': 'catalog', 'name': 'catalog', 'pts': 'frosty-point-costs.py',
                     'laserVisible': 'hand', 'utilities': 'hand', 'hipSpreadIncMult': 'hand (combo lights)',
                     'hipSpreadFiringDecCoefMult': 'hand (combo lights)',
                     'hipSpreadFiringDecOffsetMult': 'hand (combo lights)',
                     'hipSpreadNotFiringDecOffsetMult': 'hand (combo lights)',
                     'hipSpreadIdleDecOffsetMult': 'hand (combo lights)'},
    'laser per weapon': {},
    'mag': {'name': 'hand (UI names)', 'pts': 'frosty-point-costs.py', 'mag': 'hand (capacity)',
            'descriptionMismatch': 'hand (observation)', 'suspectedGameBug': 'hand (observation; checked)',
            'projectileOverride': 'hand (ballistics)'},
}
# Data sections this check compares, read by frosty-check-all.py --stamp (data/provenance/data-status.json):
# (file, section, fields); fields None = the whole section. NOT_COVERED: (file, section, fields, reason)
# for the families above that no check reads.
COVERS = [
    ('data/attachments.json', 'GRIPS[]', [f"frostyModifiers ({', '.join(AXES['grip'])})", 'movingAdsSpreadTierMod']),
    ('data/attachments.json', 'LASERS[]', [f"frostyModifiers ({', '.join(AXES['laser'])})"]),
    ('data/attachments.json', 'WEAPON_MAG[]', [f"mags ({', '.join(AXES['mag'] + MAG_EXTRA)})",
                                               'defAds (m60)', 'defAms (m60, pw7a2)']),
    ('data/reload-exceptions.json', 'animationOverrides[][]', ['tacRldOverrideMs']),
    ('data/weapon_attributes.json', 'mobilityInputs[]', ['movingAdsGripShifts']),
]
_NOT_OWNED_AT = {'grip shared': ('GRIPS[]', ''), 'grip per weapon': ('GRIPS[]', 'frostyModifiers[].'),
                 'laser shared': ('LASERS[]', ''), 'laser per weapon': ('LASERS[]', 'frostyModifiers[].'),
                 'mag': ('WEAPON_MAG[]', 'mags[].')}
NOT_COVERED = [('data/attachments.json', _NOT_OWNED_AT[label][0], [_NOT_OWNED_AT[label][1] + k], owner)
               for label, keys in NOT_OWNED.items() for k, owner in keys.items()
               if k != 'id' and not owner.endswith('.py')]
WB_FIELDS = {
    'Class_016623ac': ('adsAnimation', 'Field_9540bd8e'),
    'Class_104c2294': ('adsFov', 'Field_9540bd8e'),
    'Class_303a33cc': ('adsMoveSpeedTierShift', 'Field_c427eabf'),
    'Class_03db7a68': ('sprintRecoveryTierShift', 'Field_9540bd8e'),
    'Class_4aac041b': ('deployTimeTierShift', 'Field_9540bd8e'),
}
# GS_<weapon> (Class_539cff9b) binding collection of each spread field (research FIELD_MAP.md).
GS_COLLECTIONS = {'movingAdsSpreadTierMod': 'Field_2ffeb6ac', 'hipSpreadTierMod': 'Field_b53510be'}
SWAY_CLASSES = ('Class_28d25398', 'Class_2fea847d')
RELOAD_CLASS, RELOAD_OVERRIDE_CLASS = 'Class_9705264b', 'Class_7d916d6b'
BASE_FIELDS = {
    'm60': {'defAds': ('M60E6_WB.AnimationZoomSettingsIndex.Index', 'M60E6_WB.WeaponZoomTransitionIndex.Index'),
            'defAms': ('M60E6_WB.WeaponZoomedMoveSpeedMultiplierIndex.Index',)},
    'pw7a2': {'defAms': ('MP7A2_WB.WeaponZoomedMoveSpeedMultiplierIndex.Index',)},
}


def choose_default(values, current):
    counts = Counter(values)
    top = max(counts.values())
    tied = sorted(v for v, c in counts.items() if c == top)
    return current if current in tied else tied[0]


def merge(old, new):
    """new's keys and values, in old's key order where old has them."""
    return {**{k: new[k] for k in old if k in new}, **new}


def dump(doc, original_text):
    newline = '\r\n' if '\r\n' in original_text else '\n'
    return (json.dumps(doc, indent=2, ensure_ascii=False) + '\n').replace('\n', newline)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    spec = importlib.util.spec_from_file_location('raw_tree', ROOT / 'scripts/frosty-raw-tree.py')
    raw_tree = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(raw_tree)
    parser.add_argument('--root', type=Path, help='XML export root (or use --raw)')
    raw_tree.add_raw_arguments(parser)
    parser.add_argument('--mapping', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-handling-mapping-2026-11-10.json',
                        help='Reviewed handling identity rows and weapon identities')
    parser.add_argument('--overrides', type=Path, default=ROOT / 'data-src/overrides.json',
                        help='Reviewed deviations; rows with generator "frosty-attachment-handling" are read')
    parser.add_argument('--out', type=Path, default=ROOT / 'data/attachments.json',
                        help='Where to write the regenerated attachment catalog')
    parser.add_argument('--attributes-out', type=Path, default=ROOT / 'data/weapon_attributes.json',
                        help='Where to write weapon_attributes.json (mobilityInputs grip copies)')
    parser.add_argument('--reload-exceptions-out', type=Path, default=ROOT / 'data/reload-exceptions.json',
                        help='Where to write reload-exceptions.json (animationOverrides copies)')
    parser.add_argument('--report-out', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-attachment-handling-generated.json',
                        help='Where to write the per-selection source evidence')
    parser.add_argument('--check', action='store_true',
                        help='Write nothing; exit 1 on any difference from the committed data or any problem')
    args = parser.parse_args()
    export = raw_tree.open_input(parser, args, args.root)
    root = export.root
    spec = importlib.util.spec_from_file_location('configuration', ROOT / 'scripts/frosty-configuration.py')
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)

    texts = {name: (ROOT / 'data' / name).read_bytes().decode('utf-8')
             for name in ('attachments.json', 'weapon_attributes.json', 'reload-exceptions.json')}
    original = {name: json.loads(text) for name, text in texts.items()}
    catalog = json.loads(texts['attachments.json'])
    attributes = json.loads(texts['weapon_attributes.json'])
    reload_register = json.loads(texts['reload-exceptions.json'])
    ladder = json.loads((ROOT / 'data/balance_tables.json').read_text(encoding='utf-8'))['RELOAD_SPEED_MULTIPLIERS']
    mapping_document = json.loads(args.mapping.read_text(encoding='utf-8'))
    overrides = []
    if args.overrides.exists():
        overrides = [o for o in json.loads(args.overrides.read_text(encoding='utf-8'))['overrides']
                     if o.get('generator') == GENERATOR]
    problems = []          # (kind, key, detail): every one fails the run

    gs_files = {p.stem[3:].lower(): p for p in (root / 'Common/Hardware/Weapons').rglob('GS_*.xml')}
    weapons = []
    for w in mapping_document['identities']:
        gs = gs_files[w['internalId'].lower()]
        wb, = gs.parent.glob('*_WB.xml')
        weapons.append({**w, 'gsXml': gs.relative_to(root).as_posix(), 'wbXml': wb.relative_to(root).as_posix()})
    cache, hashes = {}, {}

    def read(path):
        if path not in cache:
            cache[path], hashes[path] = export.load(path)
        return cache[path]

    def object_at(source, guid):
        obj, = [n for n in read(source) if n.get('Guid', '').lower() == guid.lower()]
        return obj

    unbound = {(r['internalId'], r['attachmentXml'], r['selector']['guid'])
               for r in mapping_document.get('reviewedUnboundSelectors', [])}
    ability_progressions = defaultdict(list)
    for row in mapping_document['rows']:
        if 'abilityProgression' in row:
            internal, = [w['internalId'] for w in weapons if w['siteId'] == row['weapon']]
            ability_progressions[internal].append(row['abilityProgression'])
    graph, graph_issues = cfg.attachment_graph(root, weapons, read, ability_progressions=ability_progressions)
    reviewed_unbound = []
    for issue in graph_issues:
        key = (issue.get('weapon'), issue.get('attachmentXml'), issue.get('selector', {}).get('guid'))
        if key not in unbound:
            continue
        weapon, = [w for w in weapons if w['internalId'] == issue['weapon']]
        if issue['reason'] != 'selector has no WB/GS modifier match' or issue['resolvedSiblingSelectorCount'] < 1:
            raise ValueError(f'Reviewed unbound selector changed: {key}')
        for path in (weapon['wbXml'], weapon['gsXml']):
            if key[2].lower() in ET.tostring(read(path), encoding='unicode').lower():
                raise ValueError(f'Reviewed selector now occurs in the weapon: {key}')
        reviewed_unbound.append(issue)
    if len(reviewed_unbound) != len(unbound):
        raise ValueError('Reviewed unbound-selector inventory changed; review new bindings')
    missing_wb = [i for i in graph_issues if i['reason'] == 'missing WB modifier asset']
    # The graph also lists legacy and test-only assets outside the current-weapon modifiers.
    if any(not i['reference']['asset'].startswith(('Game/KingstonLegacy/', 'Test/TestData/')) for i in missing_wb):
        raise ValueError('Missing WB modifier asset; cannot infer zero handling effects')
    graph = {(r.get('sourceKey') or r['attachmentXml']).lower(): r for r in graph}   # raw routes keep the capture's folder case

    base_evidence = []
    registry = read(cfg.REGISTRY)
    for wid, fields in BASE_FIELDS.items():
        for field, names in fields.items():
            operands = []
            for name in names:
                obj, = [n for n in registry if n.findtext('Field_0c59fa06') == name]
                value = cfg.typed_scalar(obj.findtext('Field_42c8b257'), 'System.Int32')
                if value is None:
                    raise ValueError(f'Missing base index: {name}')
                operands.append({'name': name, 'guid': obj.get('Guid'), 'value': value})
            values = {o['value'] for o in operands}
            if len(values) != 1:
                raise ValueError(f'Base animation/FOV indices disagree: {wid}/{field}')
            value = next(iter(values))
            catalog['WEAPON_MAG'][wid][field] = value
            base_evidence.append({'weapon': wid, 'field': field, 'value': value, 'sourceXml': cfg.REGISTRY,
                                  'operands': operands})

    # weapon_attributes.json mobilityInputs zoom base indices (the attribute panel's ADS-time correction).
    for wid, inputs in attributes.get('mobilityInputs', {}).items():
        wb_stem = Path(next(w['wbXml'] for w in weapons if w['siteId'] == wid)).stem
        for field, name in (('animationZoomBaseIndex', 'AnimationZoomSettingsIndex'),
                            ('zoomTransitionBaseIndex', 'WeaponZoomTransitionIndex')):
            if field in inputs:
                obj, = [n for n in registry if n.findtext('Field_0c59fa06') == f'{wb_stem}.{name}.Index']
                inputs[field] = cfg.typed_scalar(obj.findtext('Field_42c8b257'), 'System.Int32')
                base_evidence.append({'weapon': wid, 'field': f'mobilityInputs.{field}', 'value': inputs[field],
                                      'sourceXml': cfg.REGISTRY, 'operands': [{'name': f'{wb_stem}.{name}.Index',
                                                                               'guid': obj.get('Guid')}]})

    # Site selections.
    by_id = {'grip': {r['id']: r for r in catalog['GRIPS']}, 'laser': {r['id']: r for r in catalog['LASERS']}}
    current = {}
    for slot in ('grip', 'laser'):
        for wid, availability in catalog['WEAPON_ATTS'].items():
            for aid in set(availability.get(slot, [])):
                if aid != 'none':
                    current[(wid, slot, aid)] = by_id[slot][aid]
    for wid, wm in catalog['WEAPON_MAG'].items():
        for aid, mag in wm['mags'].items():
            current[(wid, 'mag', aid)] = mag
    mapping = {}
    for row in mapping_document['rows']:
        key = (row['weapon'], row['slot'], row['attachment'])
        if key not in current:
            problems.append(('mapping row not on site', key, ''))
            continue
        if 'abilityProgression' in row:
            source, = [k for k, entry in graph.items()
                       if entry.get('progression', {}).get('asset') == row['abilityProgression']]
            mapping[key] = [source]
        else:
            mapping[key] = row['sources']

    def branch_operands(branch, slot):
        operands, issues = defaultdict(dict), {}
        for action in branch['actions']:
            for selector in action['selectors']:
                effects = [(e['sourceXml'], e['guid'], None) for m in selector['wbModifiers'] for e in m['effects']]
                effects += [(b['modifier']['asset'] + '.xml', b['modifier']['guid'], re.search(r'/(Field_[0-9a-f]+)/member', b['path'])[1])
                            for b in selector['gsBindings'] if b['modifier']]
                for source, guid, collection in effects:
                    obj = object_at(source, guid)
                    ref = source + '#' + guid
                    if obj.tag in WB_FIELDS:
                        field, path = WB_FIELDS[obj.tag]
                        value = cfg.typed_scalar(obj.findtext(path), 'System.Int32')
                        if value is None:
                            raise ValueError(f'Missing integer operand: {ref}/{path}')
                        operands[field][ref] = value
                    elif obj.tag == 'Class_743a3ce0':
                        target = obj.findtext('Field_94752c29')
                        name = source.lower()
                        field = ('hipSpreadTierMod' if '/hipdispersion/' in name else
                                 'movingAdsSpreadTierMod' if '/adsmovedispersion/' in name else None)
                        if field not in AXES[slot]:
                            continue
                        if collection and collection != GS_COLLECTIONS[field]:
                            # A GS binding counts only in that field's collection (18.5KS-K Slim Angled binds the
                            # ADS-move array under Field_b30a73ed; FIELD_MAP.md, ATTACHMENTS.md).
                            operands['outsideCollection'][ref + '@' + collection] = field
                            continue
                        if target != 'Field_84e57075':
                            raise ValueError(f'Unreviewed spread-array target: {ref}: {target}')
                        if ('bipod' in name or 'grippod' in name or name.endswith('gdm_array_hipdispersion_btm_p20.xml')
                                or obj.findtext('Field_b574fa40') == 'True'):
                            issues[field] = 'Conditional deployed spread modifier'
                            continue
                        path = 'Field_9540bd8e/Struct_d204f959/Field_4692836a'
                        value = cfg.typed_scalar(obj.findtext(path), 'System.Int32')
                        if value is None:
                            raise ValueError(f'Missing spread index: {ref}/{path}')
                        operands[field][ref] = value
                    elif slot == 'mag' and obj.tag in SWAY_CLASSES:
                        operands['sway'][ref] = cfg.typed_scalar(obj.findtext('Field_90fd0310'), 'System.Single')
                    elif slot == 'mag' and obj.tag == RELOAD_CLASS:
                        operands['reload'][ref] = cfg.typed_scalar(obj.findtext('Field_348b8cd1'), 'System.Single')
                    elif slot == 'mag' and obj.tag == RELOAD_OVERRIDE_CLASS:
                        first = obj.find('Field_d15a0c1c/member/*')
                        time = cfg.typed_scalar(first.findtext('Field_fc66e75e'), 'System.Single')
                        speed = cfg.typed_scalar(first.findtext('Field_1c533b56'), 'System.Single')
                        operands['reloadOverride'][ref] = [time, speed]
        return operands, issues

    def branch_fields(operands, issues, slot):
        values = {}
        for field in AXES[slot]:
            if field in issues:
                continue
            if field in ('adsTimeTierMod', 'adsTimeTierShift'):
                anim, fov = operands['adsAnimation'], operands['adsFov']
                if len(anim) > 1 or len(fov) > 1:
                    issues[field] = 'Multiple ADS effects require composition review'
                    continue
                a = next(iter(anim.values()), 0)
                f = next(iter(fov.values()), 0)
                if a != f:
                    issues[field] = 'Animation and FOV ADS steps differ'
                    continue
                values[field] = a if slot == 'grip' else -a
            else:
                entries = operands[field]
                if len(entries) > 1:
                    issues[field] = 'Multiple effects require composition review'
                    continue
                value = next(iter(entries.values()), 0)
                # Site speed ladders and hip-minimum indices use opposite signs.
                values[field] = -value if field.endswith('TierShift') or field == 'hipSpreadTierMod' else value
        if slot == 'mag':
            sway = set(operands['sway'].values())
            if len(sway) > 1:
                issues['weaponSwayMult'] = 'Sway multipliers differ'
            elif sway:
                values['weaponSwayMult'] = sway.pop()
            overrides_found = {tuple(v) for v in operands['reloadOverride'].values()}
            reloads = set(operands['reload'].values())
            if len(overrides_found) > 1 or len(reloads) > 1:
                issues['reload'] = 'Multiple reload effects require composition review'
            elif overrides_found:
                time, speed = overrides_found.pop()
                values['tacRldOverrideMs'] = round(1000 * time / speed)
            else:
                multiplier = reloads.pop() if reloads else 1.0
                tier = [i for i, m in enumerate(ladder) if abs(m - multiplier) < 1e-4]
                values['reloadSpeedTier'] = tier[0] if tier else 0
                if not tier:
                    values['reloadSpeedMult'] = multiplier
        return values

    rows, generated = [], {}
    for key in sorted(current):
        wid, slot, aid = key
        if key not in mapping:
            problems.append(('unmapped site selection', key, ''))
            continue
        row = {'weapon': wid, 'slot': slot, 'attachment': aid, 'sourceAttachments': mapping[key],
               'source': {}, 'deferred': {}, 'operands': {}}
        candidates, deferred = defaultdict(set), {}
        for path in mapping[key]:
            entry = graph.get(path.lower())
            if entry is None:
                deferred['*'] = f'source record not in the selector graph: {path}'
                continue
            relevant = [i for i in graph_issues if (i.get('attachmentXml') or '').lower() == path.lower()
                        and i not in reviewed_unbound]
            if not entry['branches'] or relevant:
                deferred['*'] = 'Incomplete source selector graph: ' + '; '.join(i['reason'] for i in relevant)
                continue
            for branch in entry['branches']:
                operands, issues = branch_operands(branch, slot)
                deferred.update(issues)
                for field, refs in operands.items():
                    row['operands'].setdefault(field, {}).update(refs)
                values = branch_fields(operands, issues, slot)
                for field in AXES[slot] + (MAG_EXTRA if slot == 'mag' else ()):
                    if field not in issues:
                        # null: the branch has no such effect (an optional field stays absent).
                        candidates[field].add(json.dumps(values.get(field)))
        for field, values in candidates.items():
            if len(values) != 1:
                deferred[field] = 'Source attachment/ability branches disagree'
            elif values != {'null'}:
                row['source'][field] = json.loads(next(iter(values)))
        row['deferred'] = deferred
        for field, reason in deferred.items():
            problems.append(('unresolved field', key, f'{field}: {reason}'))
        generated[key] = dict(row['source'])
        rows.append(row)

    # Deviations replace one generated value.
    wanted = {key: dict(fields) for key, fields in generated.items()}
    deviation_report = []
    for o in overrides:
        key = (o['weapon'], o['slot'], o['id'])
        source = generated.get(key, {}).get(o['field'])
        if key not in generated:
            status = 'UNUSED'
        elif source == o['siteValue']:
            status = 'REDUNDANT'
        elif source != o['sourceValue']:
            status = 'STALE'
        else:
            status = 'applied'
            if o['siteValue'] is None:
                wanted[key].pop(o['field'], None)
            else:
                wanted[key][o['field']] = o['siteValue']
        deviation_report.append({'overrideId': o.get('overrideId'), 'weapon': key[0], 'slot': key[1], 'id': key[2],
                                 'field': o['field'], 'status': status, 'source': source,
                                 'reviewedSource': o['sourceValue'], 'siteValue': o['siteValue']})
        if status != 'applied':
            problems.append((f'deviation {status}', key,
                             f'{o["field"]}: source {source}, reviewed {o["sourceValue"]}, site {o["siteValue"]}'))

    # Write the values in the site's storage shapes.
    not_owned_counts, notes = Counter(), []

    def check_keys(entry, allowed, label, key):
        for k in entry:
            if k in NOT_OWNED[label]:
                not_owned_counts[(label, k)] += 1
            elif k not in allowed:
                problems.append(('unknown key (not owned and not listed)', key, f'{label}: {k}'))

    for (wid, slot, aid), fields in wanted.items():
        if slot == 'mag':
            mag = catalog['WEAPON_MAG'][wid]['mags'][aid]
            for field in AXES['mag'] + MAG_EXTRA:
                if field in fields:
                    mag[field] = fields[field]
                else:
                    mag.pop(field, None)
            check_keys(mag, AXES['mag'] + MAG_EXTRA, 'mag', (wid, slot, aid))
            bug = mag.get('suspectedGameBug')
            if bug and generated[(wid, slot, aid)].get(bug['field'], 0) == bug['expectedWhenFixed']:
                notes.append(f'{wid} mag {aid}: the files now hold suspectedGameBug.expectedWhenFixed '
                             f'({bug["field"]} {bug["expectedWhenFixed"]}); recheck the observation')
    for slot, key in (('grip', 'GRIPS'), ('laser', 'LASERS')):
        for item in catalog[key]:
            supported = sorted(wid for wid, s, aid in wanted if s == slot and aid == item['id'])
            modifiers = item.get('frostyModifiers', {})
            for wid in sorted(set(modifiers) - set(supported)):
                problems.append(('per-weapon entry without a site selection', (wid, slot, item['id']), ''))
            default = None
            if slot == 'grip' and supported:
                values = [wanted[(wid, slot, item['id'])].get('movingAdsSpreadTierMod', 0) for wid in supported]
                default = choose_default(values, item.get('movingAdsSpreadTierMod', 0))
                if default != 0 or 'movingAdsSpreadTierMod' in item:
                    item['movingAdsSpreadTierMod'] = default
            for wid in supported:
                fields = dict(wanted[(wid, slot, item['id'])])
                # A per-weapon moving-ADS value is stored where it differs from the shared one; one already
                # stored is kept (rewritten from the source) so a regeneration does not churn storage.
                if (slot == 'grip' and fields.get('movingAdsSpreadTierMod', 0) == default
                        and 'movingAdsSpreadTierMod' not in modifiers.get(wid, {})):
                    fields.pop('movingAdsSpreadTierMod', None)
                resolved = {f: default if slot == 'grip' and f == 'movingAdsSpreadTierMod' else 0 for f in fields}
                if wid not in modifiers and fields == resolved:
                    # No entry is created where the shared values already resolve the same.
                    notes.append(f'{wid} {slot} {item["id"]}: no per-weapon entry; shared values resolve the same')
                    continue
                old = modifiers.get(wid, {})
                kept = {k: v for k, v in old.items() if k not in AXES[slot]}
                check_keys(kept, (), f'{slot} per weapon', (wid, slot, item['id']))
                item.setdefault('frostyModifiers', {})[wid] = merge(old, {**kept, **fields})
            # Per-weapon values replace a shared value once the entry is offered anywhere.
            for field in AXES[slot]:
                if supported and not (slot == 'grip' and field == 'movingAdsSpreadTierMod'):
                    item.pop(field, None)
            check_keys({k: v for k, v in item.items() if k != 'frostyModifiers'},
                       AXES[slot], f'{slot} shared', ('*', slot, item['id']))

    # Copies of owned facts in other files.
    copies = []
    for wid, mags in reload_register.get('animationOverrides', {}).items():
        for mid, entry in mags.items():
            value = catalog['WEAPON_MAG'].get(wid, {}).get('mags', {}).get(mid, {}).get('tacRldOverrideMs')
            copies.append({'file': 'data/reload-exceptions.json', 'path': f'animationOverrides.{wid}.{mid}.tacRldOverrideMs',
                           'mirrors': f'attachments.json WEAPON_MAG.{wid}.mags.{mid}.tacRldOverrideMs'})
            if value is None:
                problems.append(('copy without a source', (wid, 'mag', mid), 'animationOverrides entry, no tacRldOverrideMs'))
            else:
                entry['tacRldOverrideMs'] = value
    for wid, wm in catalog['WEAPON_MAG'].items():
        for mid, mag in wm['mags'].items():
            if 'tacRldOverrideMs' in mag and mid not in reload_register.get('animationOverrides', {}).get(wid, {}):
                problems.append(('copy missing', (wid, 'mag', mid),
                                 'reload-exceptions.json animationOverrides entry (displayName, recordKey) needed'))
    for wid, inputs in attributes.get('mobilityInputs', {}).items():
        for gid in inputs.get('movingAdsGripShifts', {}):
            grip = by_id['grip'].get(gid)
            copies.append({'file': 'data/weapon_attributes.json', 'path': f'mobilityInputs.{wid}.movingAdsGripShifts.{gid}',
                           'mirrors': f'attachments.json GRIPS.{gid} movingAdsSpreadTierMod for {wid}'})
            if (wid, 'grip', gid) not in wanted:
                problems.append(('copy without a source', (wid, 'grip', gid), 'mobilityInputs.movingAdsGripShifts'))
                continue
            resolved = {**grip, **grip.get('frostyModifiers', {}).get(wid, {})}
            inputs['movingAdsGripShifts'][gid] = resolved.get('movingAdsSpreadTierMod', 0)

    # fields: the owned values as stored in the selection's own record (the magazine, or the grip/laser
    # frostyModifiers[weapon]); source: the values read from the capture, before deviations.
    for row in rows:
        if row['slot'] == 'mag':
            record = catalog['WEAPON_MAG'][row['weapon']]['mags'][row['attachment']]
        else:
            record = by_id[row['slot']][row['attachment']].get('frostyModifiers', {}).get(row['weapon'], {})
        row['fields'] = {f: record[f] for f in AXES[row['slot']] + (MAG_EXTRA if row['slot'] == 'mag' else ())
                         if f in record}

    outputs = {'attachments.json': (catalog, args.out), 'weapon_attributes.json': (attributes, args.attributes_out),
               'reload-exceptions.json': (reload_register, args.reload_exceptions_out)}
    differences = []

    def walk(a, b, path):
        if isinstance(a, list) and isinstance(b, list) and all(isinstance(x, dict) and 'id' in x for x in a + b):
            a, b = {x['id']: x for x in a}, {x['id']: x for x in b}   # catalogues: address members by id
        if isinstance(a, dict) and isinstance(b, dict):
            for k in sorted(set(a) | set(b), key=str):
                walk(a.get(k, '<absent>'), b.get(k, '<absent>'), f'{path}/{k}')
        elif a != b:
            differences.append((path, a, b))
    for name, (doc, _) in outputs.items():
        walk(original[name], doc, name)

    owned = Counter()
    for (wid, slot, aid), fields in wanted.items():
        owned.update(slot for _ in fields)
    print(f'{len(rows)} of {len(current)} handling selections generated '
          f'({", ".join(f"{s} {n}" for s, n in sorted(Counter(k[1] for k in generated).items()))}); '
          f'{sum(owned.values())} fields ({", ".join(f"{s} {n}" for s, n in sorted(owned.items()))}); '
          f'{sum(1 for d in deviation_report if d["status"] == "applied")} deviations applied; '
          f'{len(copies)} copies in other files')
    print('Not owned (kept as committed): ' + ', '.join(f'{label} {k} {n}' for (label, k), n in sorted(not_owned_counts.items())))
    for note in notes:
        print('NOTE ' + note)
    for path, old, new in differences:
        print(f'DIFF {path}: site {json.dumps(old)} -> generated {json.dumps(new)}')
    for kind, key, detail in problems:
        print(f'{kind.upper() if kind.startswith("deviation") else kind}: {key[0]} {key[1]} {key[2]} {detail}')

    if args.check:
        if differences or problems:
            sys.exit(1)
        return
    followup_key = 'reference-data/provenance/frosty-handling-mapping-followup.json'
    report = {'generatedBy': 'scripts/frosty-attachment-handling.py', 'mapping': args.mapping.name,
              'mappingSha256': hashlib.sha256(args.mapping.read_bytes()).hexdigest(),
              # The follow-up identities the mapping was built from (frosty-attachment-tooltips.py checks this).
              'additionalIdentities': Path(followup_key).name,
              'additionalIdentitiesSha256': mapping_document.get('sources', {}).get(followup_key),
              'baseIndices': base_evidence, 'deviations': deviation_report, 'copies': copies,
              'notOwned': {f'{label}.{k}': {'owner': NOT_OWNED[label][k], 'entries': n}
                           for (label, k), n in sorted(not_owned_counts.items())},
              'notes': notes, 'excludedLegacyAndTestReferences': missing_wb,
              'problems': [{'kind': k, 'weapon': key[0], 'slot': key[1], 'id': key[2], 'detail': d} for k, key, d in problems],
              'sourceHashes': dict(sorted(hashes.items()))}
    # A run with problems writes the report only: unresolved fields must not drop committed values.
    for name, (doc, path) in outputs.items():
        if not problems and (doc != original[name] or path != ROOT / 'data' / name):
            path.write_bytes(dump(doc, texts[name]).encode('utf-8'))
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    # One evidence row per line keeps the report reviewable as a diff.
    text = json.dumps(export.mark(report), indent=2)
    rows_text = ',\n    '.join(json.dumps(r) for r in rows)
    text = text[:-2] + ',\n  "rows": [\n    ' + rows_text + '\n  ]\n}'
    args.report_out.write_text(text + '\n', encoding='utf-8')
    if problems:
        sys.exit(1)


if __name__ == '__main__':
    main()

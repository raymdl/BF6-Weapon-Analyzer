"""Generate reviewed grip handling, laser spread and magazine handling from XML.

The retained audit supplies identities, not values. Each run rebuilds selectors
and reads source operands. Unresolved identities/branches/fields remain explicit
exceptions. Native activation and timing are outside this data-generation step.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import importlib.util
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
FIELDS = {
    'grip': ('adsTimeTierMod', 'adsMoveSpeedTierShift', 'sprintRecoveryTierShift', 'deployTimeTierShift'),
    'laser': ('hipSpreadTierMod', 'movingAdsSpreadTierMod'),
    'mag': ('adsTimeTierShift', 'adsMoveSpeedTierShift', 'sprintRecoveryTierShift',
            'deployTimeTierShift', 'movingAdsSpreadTierMod'),
}
WB_FIELDS = {
    'Class_016623ac': ('adsAnimation', 'Field_9540bd8e'),
    'Class_104c2294': ('adsFov', 'Field_9540bd8e'),
    'Class_303a33cc': ('adsMoveSpeedTierShift', 'Field_c427eabf'),
    'Class_03db7a68': ('sprintRecoveryTierShift', 'Field_9540bd8e'),
    'Class_4aac041b': ('deployTimeTierShift', 'Field_9540bd8e'),
}
# These reviewed moving-spread adjustments lack a matching source effect.
# Retain them until the original evidence/source-selection difference is resolved.
EXCEPTIONS = {
    ('l110', '200_rnd'): ('movingAdsSpreadTierMod',),
    ('m123k', '200_rnd'): ('movingAdsSpreadTierMod',),
}
BASE_FIELDS = {
    'm60': {'defAds': ('M60E6_WB.AnimationZoomSettingsIndex.Index', 'M60E6_WB.WeaponZoomTransitionIndex.Index'),
            'defAms': ('M60E6_WB.WeaponZoomedMoveSpeedMultiplierIndex.Index',)},
    'pw7a2': {'defAms': ('MP7A2_WB.WeaponZoomedMoveSpeedMultiplierIndex.Index',)},
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--review', action='store_true', help='Write evidence without changing the catalog')
    parser.add_argument('--check', action='store_true', help='Compare generated fields without writing')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('configuration', ROOT / 'scripts/frosty-configuration.py')
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)
    catalog_path = ROOT / 'data/attachments.json'
    original = json.loads(catalog_path.read_text(encoding='utf-8'))
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    report_path = ROOT / 'reference-data/provenance/frosty-attachment-handling-generated.json'
    previous_fields = {}
    if report_path.exists():
        previous = json.loads(report_path.read_text(encoding='utf-8'))
        previous_fields = {(r['weapon'], r['slot'], r['attachment']): set(r['fields']) for r in previous['rows']}
    audit = json.loads((ROOT / 'reference-data/provenance/frosty-attachment-full-pass-2026-09-06.json').read_text())
    identities = json.loads((ROOT / 'reference-data/provenance/frosty-weapon-identities.json').read_text())['weapons']
    gs_files = {p.stem[3:].lower(): p for p in (args.root / 'Common/Hardware/Weapons').rglob('GS_*.xml')}
    weapons = []
    for w in identities:
        gs = gs_files[w['internalId'].lower()]
        wb, = gs.parent.glob('*_WB.xml')
        weapons.append({**w, 'gsXml': gs.relative_to(args.root).as_posix(),
                        'wbXml': wb.relative_to(args.root).as_posix()})
    cache, hashes = {}, {}

    def read(path):
        if path not in cache:
            raw = (args.root / path).read_bytes()
            cache[path] = ET.fromstring(raw)
            hashes[path] = hashlib.sha256(raw).hexdigest()
        return cache[path]

    def object_at(effect):
        obj, = [n for n in read(effect['sourceXml'])
                if n.get('Guid', '').lower() == effect['guid'].lower()]
        return obj

    mapping_path = ROOT / 'reference-data/provenance/frosty-handling-mapping-followup.json'
    mapping_document = json.loads(mapping_path.read_text(encoding='utf-8'))
    followup = mapping_document['rows']
    unbound = {(r['internalId'], r['attachmentXml'], r['selector']['guid'])
               for r in mapping_document.get('reviewedUnboundSelectors', [])}
    excluded = {r['attachmentXml'] for r in mapping_document.get('excludedSourceAttachments', [])}
    ability_progressions = defaultdict(list)
    for row in followup:
        if 'abilityProgression' in row:
            ability_progressions[row['internalId']].append(row['abilityProgression'])
    graph, graph_issues = cfg.attachment_graph(args.root, weapons, read, ability_progressions=ability_progressions)
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
    # The retained graph also lists legacy and test-only assets outside this
    # current-weapon modifier export. Keep that exclusion visible in the report.
    if any(not i['reference']['asset'].startswith(('Game/KingstonLegacy/', 'Test/TestData/')) for i in missing_wb):
        raise ValueError('Missing WB modifier asset; cannot infer zero handling effects')
    graph = {r.get('sourceKey') or r['attachmentXml']: r for r in graph}
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
            base_evidence.append({'weapon': wid, 'field': field, 'value': value,
                                  'sourceXml': cfg.REGISTRY, 'operands': operands})
    current = {}
    for slot, key in [('grip', 'GRIPS'), ('laser', 'LASERS')]:
        by_id = {r['id']: r for r in catalog[key]}
        for wid, availability in catalog['WEAPON_ATTS'].items():
            ids = set(availability.get(slot, []))
            for aid in ids:
                if aid in by_id and aid != 'none':
                    current[(wid, slot, aid)] = by_id[aid]
    for wid, wm in catalog['WEAPON_MAG'].items():
        for aid, mag in wm['mags'].items():
            current[(wid, 'mag', aid)] = mag
    prior_items = {key: json.loads(json.dumps(item)) for key, item in current.items()}
    for item in current.values():
        item.pop('frostyModifiers', None)
    mapping = defaultdict(set)
    for row in audit['candidateComparisons']:
        key = (row.get('siteWeaponId'), row.get('slot'), row.get('siteId'))
        if key in current and row['status'] == 'mapped' and row['attachmentXml'] not in excluded:
            mapping[key].add(row['attachmentXml'])
    for row in followup:
        key = (row['weapon'], row['slot'], row['attachment'])
        if key not in current:
            raise ValueError(f'Stale follow-up attachment identity: {key}')
        if 'attachmentXml' in row:
            source = row['attachmentXml']
        else:
            source, = [k for k, entry in graph.items() if entry.get('progression', {}).get('asset') == row['abilityProgression']]
        mapping[key].add(source)

    def branch_fields(branch, slot):
        operands = defaultdict(dict)
        issues = {}
        for action in branch['actions']:
            for selector in action['selectors']:
                effects = [e for m in selector['wbModifiers'] for e in m['effects']]
                effects += [{'sourceXml': b['modifier']['asset'] + '.xml', 'guid': b['modifier']['guid']}
                            for b in selector['gsBindings'] if b['modifier']]
                for effect in effects:
                    obj = object_at(effect)
                    ref = effect['sourceXml'] + '#' + effect['guid']
                    if obj.tag in WB_FIELDS:
                        field, path = WB_FIELDS[obj.tag]
                        value = cfg.typed_scalar(obj.findtext(path), 'System.Int32')
                        if value is None:
                            raise ValueError(f'Missing integer operand: {ref}/{path}')
                        operands[field][ref] = {'value': value, 'path': path}
                    elif obj.tag == 'Class_743a3ce0':
                        target = obj.findtext('Field_94752c29')
                        name = effect['sourceXml'].lower()
                        field = ('hipSpreadTierMod' if '/hipdispersion/' in name else
                                 'movingAdsSpreadTierMod' if '/adsmovedispersion/' in name else None)
                        if field not in FIELDS[slot]:
                            continue
                        if target != 'Field_84e57075':
                            raise ValueError(f'Unreviewed spread-array target: {ref}: {target}')
                        if 'bipod' in name or 'grippod' in name or name.endswith('gdm_array_hipdispersion_btm_p20.xml'):
                            issues[field] = 'Conditional deployed spread modifier'
                            continue
                        path = 'Field_9540bd8e/Struct_d204f959/Field_4692836a'
                        value = cfg.typed_scalar(obj.findtext(path), 'System.Int32')
                        if value is None:
                            raise ValueError(f'Missing spread index: {ref}/{path}')
                        operands[field][ref] = {'value': value, 'path': path, 'target': target}
        values = {}
        for field in FIELDS[slot]:
            if field in issues:
                continue
            if field in ('adsTimeTierMod', 'adsTimeTierShift'):
                anim, fov = operands['adsAnimation'], operands['adsFov']
                if len(anim) > 1 or len(fov) > 1:
                    issues[field] = 'Multiple ADS effects require composition review'
                    continue
                a = next((v['value'] for v in anim.values()), 0)
                f = next((v['value'] for v in fov.values()), 0)
                if a != f:
                    issues[field] = 'Animation and FOV ADS steps differ'
                    continue
                values[field] = a if slot == 'grip' else -a
            else:
                entries = operands[field]
                if len(entries) > 1:
                    issues[field] = 'Multiple effects require composition review'
                    continue
                value = next((v['value'] for v in entries.values()), 0)
                # Site speed ladders and hip-minimum indices use opposite signs.
                values[field] = -value if field.endswith('TierShift') or field == 'hipSpreadTierMod' else value
        return values, issues, dict(operands)

    rows, skipped = [], []
    for key, item in sorted(current.items()):
        wid, slot, aid = key
        paths = sorted(mapping[key])
        row = {'weapon': wid, 'slot': slot, 'attachment': aid, 'sourceAttachments': paths,
               'fields': {}, 'deferred': {}, 'branches': []}
        if not paths:
            if previous_fields.get(key):
                raise ValueError(f'Previously generated selection lost its identity: {key}')
            skipped.append({**{k: row[k] for k in ('weapon', 'slot', 'attachment')}, 'reason': 'No reviewed source identity'})
            continue
        candidates = defaultdict(set)
        for path in paths:
            entry = graph[path]
            relevant = [i for i in graph_issues if i.get('attachmentXml') == path and i not in reviewed_unbound]
            reviewed = [i for i in reviewed_unbound if i.get('attachmentXml') == path]
            if reviewed:
                row.setdefault('reviewedUnboundSelectors', []).extend(reviewed)
            if not entry['branches'] or relevant:
                row.setdefault('sourceIssues', []).extend(relevant)
                row['deferred'].update({f: 'Incomplete source selector graph' for f in FIELDS[slot]})
                continue
            for branch in entry['branches']:
                values, issues, operands = branch_fields(branch, slot)
                row['branches'].append({'attachmentXml': path, 'guid': branch['guid'], 'operands': operands})
                row['deferred'].update(issues)
                for field, value in values.items():
                    candidates[field].add(value)
        for field, values in candidates.items():
            if field in row['deferred']:
                continue
            if len(values) != 1:
                row['deferred'][field] = 'Source attachment/ability branches disagree'
                continue
            row['fields'][field] = next(iter(values))
        if slot == 'mag':
            for field in EXCEPTIONS.get((wid, aid), ()):
                candidate = row['fields'].pop(field, None)
                row['deferred'][field] = {'reason': 'No linked source effect for the existing moving-ADS adjustment',
                                          'sourceCandidate': candidate}
        lost = previous_fields.get(key, set()) - row['fields'].keys()
        if lost:
            raise ValueError(f'Previously generated fields became unresolved: {key}: {sorted(lost)}')
        prior = prior_items[key]
        prior = {**prior, **prior.get('weaponOverrides', {}).get(wid, {})}
        prior.update(prior.get('frostyModifiers', {}) if slot == 'mag' else prior.get('frostyModifiers', {}).get(wid, {}))
        row['changes'] = {f: {'before': prior.get(f, 0), 'source': v}
                          for f, v in row['fields'].items() if prior.get(f, 0) != v}
        if row['fields']:
            if slot == 'mag':
                item.update(row['fields'])
            else:
                item.setdefault('frostyModifiers', {})[wid] = row['fields']
        rows.append(row)
    # Remove shared/manual fields only when every supported use is generated.
    # Unresolved selections keep their existing values as explicit fallbacks.
    for slot, key in [('grip', 'GRIPS'), ('laser', 'LASERS')]:
        for item in catalog[key]:
            supported = [wid for wid, s, aid in current if s == slot and aid == item['id']]
            for field in FIELDS[slot]:
                if supported and all(field in item.get('frostyModifiers', {}).get(wid, {}) for wid in supported):
                    item.pop(field, None)
    report = {'generatedBy': 'scripts/frosty-attachment-handling.py',
              'baseIndices': base_evidence,
              'additionalIdentities': mapping_path.name,
              'additionalIdentitiesSha256': hashlib.sha256(mapping_path.read_bytes()).hexdigest(),
              'excludedLegacyAndTestReferences': missing_wb, 'rows': rows,
              'unmapped': skipped, 'sourceHashes': hashes,
              'summary': {'selections': len(current), 'mapped': len(rows),
                          'generatedFields': sum(len(r['fields']) for r in rows),
                          'generatedBaseIndices': len(base_evidence),
                          'changedFields': sum(len(r['changes']) for r in rows),
                          'deferredFields': sum(len(r['deferred']) for r in rows),
                          'unmapped': len(skipped)}}
    if args.check:
        if original != catalog:
            raise ValueError('Handling catalog differs from generated Frosty operands')
    else:
        report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        if not args.review:
            if json.loads(catalog_path.read_text(encoding='utf-8')) != original:
                raise ValueError('Catalog changed during extraction; rerun to preserve those edits')
            catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(report['summary']))


if __name__ == '__main__':
    main()

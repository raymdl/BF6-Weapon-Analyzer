"""Extract source operands for the global-assumption audit, without runtime totals.

Raw branches and kill-switch defaults are retained, not evaluated as live state.
Unlabelled field paths are evidence, not inferred native arithmetic.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
EFFECTS = {
    'Class_0045e7fa': 'spotting', 'Class_5830cb87': 'regenerationDelay',
    'Class_d11a23a2': 'penetrationIndexShift',
    'Class_2fea847d': 'weaponSway', 'Class_28d25398': 'cameraSway',
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--grid', type=Path, action='append', default=[])
    parser.add_argument('--descriptors', type=Path)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('configuration', ROOT / 'scripts/frosty-configuration.py')
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)
    cache, hashes = {}, {}

    def read(path):
        if path not in cache:
            raw = (args.root / path).read_bytes()
            hashes[path] = hashlib.sha256(raw).hexdigest()
            cache[path] = ET.fromstring(raw)
        return cache[path]

    def leaves(obj):
        paths = cfg.paths(obj)
        return {paths[n]: cfg.literal(n) for n in obj.iter() if cfg.literal(n) is not None}

    ids = json.loads((ROOT / 'reference-data/provenance/frosty-weapon-identities.json').read_text())['weapons']
    gs_files = {p.stem[3:]: p for p in (args.root / 'Common/Hardware/Weapons').rglob('GS_*.xml')}
    weapons = []
    for weapon in ids:
        gs = gs_files[weapon['internalId']]
        wb, = gs.parent.glob('*_WB.xml')
        weapons.append({**weapon, 'gsXml': gs.relative_to(args.root).as_posix(),
                        'wbXml': wb.relative_to(args.root).as_posix()})
    rows, issues = cfg.attachment_graph(args.root, weapons, read, include_optics=True)
    operands, links, availability, controller = {}, [], [], []

    def retain(source, guid, kind):
        key = source + '#' + guid
        if key not in operands:
            obj, = [n for n in read(source) if n.get('Guid', '').lower() == guid.lower()]
            operands[key] = {'kind': kind, 'sourceXml': source, 'guid': guid,
                             'type': obj.tag, 'fields': leaves(obj)}
        return key

    for row in rows:
        availability.append({'weapon': row['weapon'], 'attachmentXml': row['attachmentXml'],
                             'branches': [{'guid': b['guid'], 'killswitch': b.get('killswitch')}
                                          for b in row['branches']]})
        for branch in row['branches']:
            for action in branch['actions']:
                for selector in action['selectors']:
                    for modifier in selector['wbModifiers']:
                        for effect in modifier['effects']:
                            if effect['type'] in EFFECTS:
                                key = retain(effect['sourceXml'], effect['guid'], EFFECTS[effect['type']])
                                links.append({'weapon': row['weapon'], 'attachmentXml': row['attachmentXml'],
                                              'branch': branch['guid'], 'selector': selector['unlock'], 'operand': key})
                    for binding in selector['gsBindings']:
                        ref = binding['modifier']
                        if ref and re.search('GBM_Increase_Hip_|ADSTime|Sway', ref['asset']):
                            key = retain(ref['asset'] + '.xml', ref['guid'], 'GS modifier')
                            links.append({'weapon': row['weapon'], 'attachmentXml': row['attachmentXml'],
                                          'branch': branch['guid'], 'selector': selector['unlock'],
                                          'rawBranch': binding['rawBranch'], 'operand': key})

    # Controller modifiers use weapon unlocks, so they are outside attachment rows.
    for weapon in weapons:
        gs = read(weapon['gsXml'])
        paths = cfg.paths(gs)
        for binding in gs.iter('Struct_3e61171a'):
            match = cfg.EXTERNAL.fullmatch(binding.findtext('Field_2f0e5b83') or '')
            if match and 'Controller' in match[1]:
                key = retain(match[1] + '.xml', match[2], 'controller recoil')
                controller.append({'weapon': weapon['siteId'], 'gsXml': weapon['gsXml'],
                                   'path': paths[binding], 'rawBranch': binding.findtext('Field_3f680d24'),
                                   'unlockGuid': binding.findtext('Field_6d011165'), 'operand': key})

    registry = []
    for source in [cfg.REGISTRY, 'Common/Gameplay/Soldier/GRX_Glacier_Soldier.xml']:
        for obj in read(source):
            name = obj.findtext('Field_0c59fa06') or ''
            if re.search('PenetrationMultiplierIndex|WeaponZoomTransitionIndex|Sway|Regeneration|Spot|DistributionExponent', name):
                registry.append({'sourceXml': source, 'guid': obj.get('Guid'), 'name': name,
                                 'valueFields': leaves(obj.find('Field_42c8b257')) if obj.find('Field_42c8b257') is not None else {}})

    soldier_source = 'Common/Gameplay/Soldier/Glacier_Soldier.xml'
    regen_bindings = []
    for obj in read(soldier_source):
        if any('37efb14f-d146-4998-aa9f-9b6e09108d85' in (n.text or '') for n in obj.iter()):
            paths = cfg.paths(obj)
            regen_bindings = [{'type': obj.tag, 'guid': obj.get('Guid'), 'path': paths[n], 'reference': n.text}
                              for n in obj.iter() if '37efb14f-d146-4998-aa9f-9b6e09108d85' in (n.text or '')]
    counts = Counter(b['killswitch'].get('registry', {}).get('defaultRaw', b['killswitch'].get('localFallbackRaw'))
                     for row in availability for b in row['branches'] if b['killswitch'])
    penetration = {'status': 'Candidate record; native penetration consumer not identified.'}
    if args.grid:
        if not args.descriptors:
            parser.error('--descriptors is required with --grid')
        spec = importlib.util.spec_from_file_location('hit_zones', ROOT / 'scripts/frosty-hit-zones.py')
        hit = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(hit)
        types, descriptor_hash = hit.type_descriptors(args.descriptors)
        grids = [hit.MaterialGrid(path, types) for path in args.grid]

        def candidate(grid, source, target):
            row, count, _ = grid.array(grid.rows_offset + 8 * grid.index_map[source])
            column = grid.index_map[target]
            if column >= count:
                raise ValueError('Material column outside grid')
            records = []
            for side in (0, 8):
                groups, group_count, _ = grid.array(row + 16 * column + side)
                for i in range(group_count):
                    items, item_count, _ = grid.array(groups + 8 * i)
                    for j in range(item_count):
                        offset, kind = grid.pointer(items + 16 * j)
                        if kind['hash'] != '6aa794ef':
                            continue
                        values, value_count, flags = grid.array(offset + 24)
                        if flags != 616 or not 0 < value_count <= 32:
                            raise ValueError('Unexpected candidate array')
                        records.append([round(struct.unpack_from('<f', grid.data,
                                        grid.data_start + values + 4 * k)[0], 6) for k in range(value_count)])
            if len(records) != 1:
                raise ValueError(f'Expected one candidate record: {source}/{target}')
            return records[0]

        material_checks = []
        for weapon in weapons:
            ref = cfg.EXTERNAL.fullmatch(read(weapon['wbXml']).findtext(hit.PRIMARY_PROJECTILE))
            projectile, = [n for n in read(ref[1] + '.xml') if n.get('Guid') == ref[2]]
            material = int(projectile.findtext(hit.MATERIAL_DECL), 16) >> 20
            checks = {}
            for target in (24, 25, 26):
                values = [candidate(grid, material, target) for grid in grids]
                if any(v != values[0] for v in values[1:]):
                    raise ValueError(f'Material grids disagree: {material}/{target}')
                checks[str(target)] = values[0]
            material_checks.append({'weapon': weapon['siteId'], 'projectileXml': ref[1] + '.xml',
                                    'sourceMaterial': material, 'targetTables': checks})
        penetration.update({'recordType': 'Class_6aa794ef', 'field': 'Field_c52d90b8',
                            'fieldOffset': 24, 'descriptorsSha256': descriptor_hash,
                            'grids': [{'file': g.path.name, 'sha256': g.sha256} for g in grids],
                            'baseProjectileChecks': material_checks})
    output = {'schemaVersion': 1, 'scope': __doc__.strip(), 'operands': operands,
              'attachmentLinks': links, 'availability': availability, 'killSwitchDefaultCounts': dict(counts),
              'controllerBindings': controller, 'namedRegistry': registry, 'regenerationBaselineBindings': regen_bindings,
              'penetrationCandidate': penetration,
              'graphIssues': issues, 'sourceSha256': dict(sorted(hashes.items()))}
    args.out.write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'operands': len(operands), 'attachmentLinks': len(links),
                      'controllerWeapons': len(controller), 'registryFields': len(registry),
                      'killSwitchDefaults': dict(counts), 'noRootBranch': sum(not r['branches'] for r in rows)}))


if __name__ == '__main__':
    main()

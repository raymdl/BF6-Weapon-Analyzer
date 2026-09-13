"""Trace Linear Comp and burst attachment operands from the current Frosty XML.

The old audit supplies attachment identities only. Nested fire-mode selectors
are followed into the weapon's own GS bindings. This proves exported inputs,
not native runtime execution or live multiplayer availability.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TARGETS = {'linear_comp': 'MUZZLES', 'burst_training': 'ERGOS',
           'burst_mode': 'ERGOS', 'grtbc_burst_mode': 'ERGOS'}
RECOIL_FIELDS = {'adsRecoilTierMod': ('Field_6b84de87', 'Field_22ce7cf3'),
                 'hipRecoilTierMod': ('Field_7b609515', 'Field_22ce7cf3'),
                 'adsRecoilVariationTierMod': ('Field_6b84de87', 'Field_02433593'),
                 'hipRecoilVariationTierMod': ('Field_7b609515', 'Field_02433593')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('configuration', ROOT / 'scripts/frosty-configuration.py')
    cfg = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cfg)
    read_json = lambda name: json.loads((ROOT / name).read_text(encoding='utf-8'))
    sdk_path = 'reference-data/provenance/frosty-assumption-sdk-types.json'
    sdk = read_json(sdk_path)
    burst_symbol = 'Field_c57b586e'
    burst_enum = sdk['enums']['Enum_16e6fa59'][burst_symbol]
    if sdk['types']['Class_9dfbb158']['Field_1c85cbb1'] != 'System.UInt32':
        raise ValueError('Fire-mode mask type changed')
    if sdk['types']['Struct_d204f959']['Field_4692836a'] != 'System.Int32':
        raise ValueError('Recoil index operand type changed')
    catalog = read_json('data/attachments.json')
    original = json.loads(json.dumps(catalog))
    audit = read_json('reference-data/provenance/frosty-attachment-full-pass-2026-09-06.json')
    identities = read_json('reference-data/provenance/frosty-weapon-identities.json')['weapons']
    selections = [r for r in audit['candidateComparisons'] if r.get('siteId') in TARGETS and r['status'] == 'mapped']
    expected = {(wid, aid) for aid, category in TARGETS.items()
                for wid, availability in catalog['WEAPON_ATTS' if category == 'MUZZLES' else 'WEAPON_ERGO'].items()
                if aid in availability.get('muzzle' if category == 'MUZZLES' else 'avail', [])}
    if {(r['siteWeaponId'], r['siteId']) for r in selections} != expected:
        raise ValueError('Attachment identity coverage changed')
    needed = {r['siteWeaponId'] for r in selections}
    gs_files = {p.stem[3:].lower(): p for p in (args.root / 'Common/Hardware/Weapons').rglob('GS_*.xml')}
    weapons = []
    for identity in identities:
        if identity['siteId'] not in needed:
            continue
        gs = gs_files[identity['internalId'].lower()]
        wb, = gs.parent.glob('*_WB.xml')
        weapons.append({**identity, 'gsXml': gs.relative_to(args.root).as_posix(),
                        'wbXml': wb.relative_to(args.root).as_posix()})
    by_weapon = {w['siteId']: w for w in weapons}
    cache, hashes = {}, {}

    def read(path):
        if path not in cache:
            raw = (args.root / path).read_bytes()
            cache[path] = ET.fromstring(raw)
            hashes[path] = hashlib.sha256(raw).hexdigest()
        return cache[path]

    def resolve(raw, source):
        match = cfg.EXTERNAL.fullmatch(raw.strip())
        if match:
            path, guid = match[1] + '.xml', match[2]
        else:
            match = re.fullmatch(r'\[Class_[0-9a-f]+\] ([0-9a-f-]{36})', raw.strip())
            if not match:
                raise ValueError(f'Unsupported reference: {raw}')
            path, guid = source, match[1]
        obj, = [e for e in read(path) if e.get('Guid', '').lower() == guid.lower()]
        return path, obj

    graph, issues = cfg.attachment_graph(args.root, weapons, read)
    if any(i['reason'] == 'missing WB modifier asset'
           and not i['reference']['asset'].startswith(('Game/KingstonLegacy/', 'Test/TestData/')) for i in issues):
        raise ValueError('Missing current-weapon WB modifier asset')
    graph = {r['attachmentXml']: r for r in graph}
    rows = []
    for selection in selections:
        wid, aid, path = selection['siteWeaponId'], selection['siteId'], selection['attachmentXml']
        entry = graph[path]
        if any(i.get('attachmentXml') == path for i in issues) or len(entry['branches']) != 1:
            raise ValueError(f'Incomplete attachment graph: {path}')
        effects, nested, mode = {}, [], None
        for action in entry['branches'][0]['actions']:
            for selector in action['selectors']:
                for binding in selector['gsBindings']:
                    p, obj = resolve(binding['modifierRaw'], by_weapon[wid]['gsXml'])
                    effects[(p, obj.get('Guid'))] = obj
                for modifier in selector['wbModifiers']:
                    for effect in modifier['effects']:
                        p = effect['sourceXml']
                        obj, = [e for e in read(p) if e.get('Guid') == effect['guid']]
                        if obj.tag == 'Class_032c7d25':
                            mode = {'sourceXml': p, 'guid': obj.get('Guid'),
                                    'field': 'Field_7313f5d3', 'value': obj.findtext('Field_7313f5d3'),
                                    'alternateModes': [e.text for e in obj.findall('Field_2a5a28ee/member')]}
                            if mode['value'] != burst_symbol:
                                raise ValueError(f'Unexpected burst fire-mode enum: {path}')
                        elif obj.tag == 'Class_10713bed':
                            behavior_path, behavior = resolve(obj.findtext('Field_238b47d7'), p)
                            for member in behavior.findall('Field_4287ef66/member'):
                                node_path, node = resolve(member.text, behavior_path)
                                if node.tag != 'Class_9dfbb158':
                                    continue
                                mask = int(node.findtext('Field_1c85cbb1'), 16)
                                if mask != 1 << burst_enum:
                                    raise ValueError(f'Unreviewed fire-mode mask: {path}')
                                guid = node.findtext('Field_6d011165').lower()
                                bindings = [b for b in read(by_weapon[wid]['gsXml']).iter()
                                            if b.findtext('Field_6d011165', '').lower() == guid
                                            and b.find('Field_2f0e5b83') is not None]
                                if not bindings:
                                    raise ValueError(f'No nested mode bindings: {path}')
                                nested.append({'sourceXml': node_path, 'guid': node.get('Guid'),
                                               'selector': guid, 'modeMask': mask,
                                               'bindings': [b.findtext('Field_2f0e5b83') for b in bindings]})
                                for binding in bindings:
                                    ep, eo = resolve(binding.findtext('Field_2f0e5b83'), by_weapon[wid]['gsXml'])
                                    effects[(ep, eo.get('Guid'))] = eo
                        else:
                            effects[(p, obj.get('Guid'))] = obj
        if aid != 'linear_comp' and (not mode or not nested):
            raise ValueError(f'Burst mode trace missing: {path}')
        values, evidence, retained = {}, {}, []
        for field, (aim, member) in RECOIL_FIELDS.items():
            operands = []
            for (ep, guid), obj in effects.items():
                if obj.tag != 'Class_bb838ff6':
                    continue
                field_path = f'{aim}/Struct_26e24b34/{member}/Struct_d204f959/Field_4692836a'
                raw = obj.findtext(field_path)
                if raw is None:
                    raise ValueError(f'Missing recoil operand: {ep}/{field_path}')
                operands.append({'sourceXml': ep, 'guid': guid, 'fieldPath': field_path,
                                 'raw': raw, 'value': cfg.typed_scalar(raw, 'System.Int32')})
            if not operands:
                raise ValueError(f'No recoil source: {path}')
            values[field] = sum(o['value'] for o in operands)
            evidence[field] = {'operation': 'add-index-steps', 'sourceStatus': 'traced',
                               'simulationSupport': 'implemented', 'operands': operands}
        for (ep, guid), obj in effects.items():
            object_paths = cfg.paths(obj)
            for aim in ('Field_6b84de87', 'Field_7b609515'):
                for child in obj.findall(f'{aim}/Struct_26e24b34/*/Struct_b1f8b400'):
                    if child.findtext('Field_4692836a') not in (None, '0'):
                        retained.append({'sourceXml': ep, 'guid': guid, 'aimBranch': aim,
                                         'fieldPath': object_paths[child],
                                         'rawOperation': ET.tostring(child, encoding='unicode'),
                                         'sourceStatus': 'retained', 'simulationSupport': 'not-implemented'})
        if mode:
            values['setsFireModeBurst'] = True
            evidence['setsFireModeBurst'] = {'operation': 'select-fire-mode', 'sourceStatus': 'traced',
                                            'simulationSupport': 'selected-burst-mode', 'source': mode}
        rows.append({'weapon': wid, 'attachment': aid, 'attachmentXml': path,
                     'fields': values, 'fieldEvidence': evidence, 'nestedModeSelectors': nested,
                     'retainedOperations': retained, 'branch': entry['branches'][0]})
    # Shared catalog fields are safe only if all current weapon selections agree.
    for aid, category in TARGETS.items():
        matching = [r for r in rows if r['attachment'] == aid]
        fields = matching[0]['fields']
        if any(r['fields'] != fields for r in matching):
            raise ValueError(f'Weapon-specific values differ: {aid}')
        item, = [a for a in catalog[category] if a['id'] == aid]
        item.update(fields)
        item.pop('assumed', None)
    report = {'generatedBy': 'scripts/frosty-assumption-review.py', 'sourceVersion': audit['sourceVersion'],
              'sdkMetadata': sdk_path, 'sdkMetadataSha256': hashlib.sha256((ROOT / sdk_path).read_bytes()).hexdigest(),
              'scope': 'Exported modifier inputs; not native activation, burst input timing, or recoil recovery proof.',
              'rows': rows, 'sourceHashes': hashes,
              'summary': {'selections': len(rows), 'catalogRecords': len(TARGETS),
                          'retainedOperations': sum(len(r['retainedOperations']) for r in rows)}}
    if args.check:
        if catalog != original:
            raise ValueError('Catalog differs from traced modifier operands')
    else:
        (ROOT / 'reference-data/provenance/frosty-assumption-review.json').write_text(
            json.dumps(report, indent=2) + '\n', encoding='utf-8')
        if args.apply:
            if read_json('data/attachments.json') != original:
                raise ValueError('Catalog changed during extraction')
            (ROOT / 'data/attachments.json').write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(report['summary']))


if __name__ == '__main__':
    main()

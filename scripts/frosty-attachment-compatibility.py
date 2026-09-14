"""Generate physical mount slots and attachment dependencies from Frosty XML.

Reviewed identities map source assets to site choices; slot assignments and
dependency operands are read afresh. Unmapped choices are retained in evidence.
"""
import argparse
from collections import defaultdict
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

REPO = Path(__file__).resolve().parents[1]
MOUNTS = ('grip', 'laser', 'light')
EXTERNAL = re.compile(r'\[Ebx\] (.+) \[([0-9a-f-]{36})\]', re.I)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('tooltips', REPO / 'scripts/frosty-attachment-tooltips.py')
    tooltips = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(tooltips)
    sources, reviews = tooltips.reviewed_identities()
    offered = {(c['weapon'], c['slot'], c['attachment']) for c in tooltips.current_choices()}
    identity_path = REPO / 'reference-data/provenance/frosty-weapon-identities.json'
    identities = {w['siteId']: w['internalId'] for w in json.loads(identity_path.read_text())['weapons']}
    reviews[identity_path.name] = hashlib.sha256(identity_path.read_bytes()).hexdigest()
    catalog_path = REPO / 'data/attachments.json'
    original = catalog_path.read_text(encoding='utf-8')
    catalog = json.loads(original)
    ammo = json.loads((REPO / 'data/ammo.json').read_text(encoding='utf-8'))
    cache, hashes = {}, {}

    def read(path):
        path = Path(path).as_posix()
        if path not in cache:
            raw = (args.root / path).read_bytes()
            hashes[path] = hashlib.sha256(raw).hexdigest()
            cache[path] = ET.fromstring(raw)
        return cache[path]

    def reference(raw):
        match = EXTERNAL.fullmatch(raw or '')
        if not match:
            raise ValueError(f'Expected external reference: {raw}')
        return match[1] + '.xml', match[2].lower()

    def selected(key):
        weapon, slot, item = key
        wa = catalog['WEAPON_ATTS'].get(weapon)
        if wa is None:
            return False
        if slot == 'mag':
            return item in catalog['WEAPON_MAG'].get(weapon, {}).get('mags', {})
        if slot == 'ergo':
            return item in catalog['WEAPON_ERGO'].get(weapon, {}).get('avail', [])
        if slot == 'ammo':
            return item in ammo['WEAPON_AMMO'].get(weapon, {}).get('ammo', {})
        if slot == 'sight' and slot not in wa:
            return any(a['id'] == item for a in catalog['SIGHTS'])
        return item in wa.get(slot, [])

    by_path = defaultdict(set)
    for key, paths in sources.items():
        if selected(key):
            for path in paths:
                by_path[path.lower()].add(key)

    slot_rows, dependency_rows, unresolved = [], [], []
    # Slot definitions are generated only with complete, unambiguous coverage.
    for weapon, wa in catalog['WEAPON_ATTS'].items():
        categories = defaultdict(set)
        complete = True
        for slot in MOUNTS:
            for item in wa.get(slot, []):
                if item == 'none':
                    continue
                key = (weapon, slot, item)
                item_slots = set()
                for path in sources.get(key, {}):
                    if '#' in path:
                        ability_path, branch_guid = path.split('#')
                        branch = next(n for n in read(ability_path) if n.get('Guid') == branch_guid)
                        progression = branch.findtext('Field_f86e0433')
                    else:
                        attachment = read(path)[0]
                        progression = attachment.findtext('Field_157a7d74')
                        ability_path = (Path(path).parent / f'{identities[weapon]}_Ability.xml').as_posix()
                    ability = read(ability_path)
                    active = {n.text.split()[-1] for n in ability[0].findall('Field_d7605aab/member')}
                    for branch in ability:
                        if branch.get('Guid') not in active or branch.findtext('Field_f86e0433') != progression:
                            continue
                        physical, _ = reference(branch.findtext('Field_64ef48eb'))
                        item_slots.add(physical)
                        slot_rows.append(dict(weapon=weapon, slot=slot, attachment=item,
                            sourceAttachment=path, abilityXml=ability_path,
                            branchGuid=branch.get('Guid'), physicalSlot=physical))
                if len(item_slots) != 1:
                    complete = False
                    unresolved.append(dict(weapon=weapon, slot=slot, attachment=item,
                        reason='missing or ambiguous physical slot', physicalSlots=sorted(item_slots)))
                categories[slot].update(item_slots)
        if any(len(v) > 1 for v in categories.values()):
            complete = False
            unresolved.append(dict(weapon=weapon, reason='one attachment type spans multiple physical slots'))
        if not complete:
            continue
        groups = defaultdict(list)
        for slot in MOUNTS:
            if categories[slot]:
                groups[next(iter(categories[slot]))].append(slot)
        if sum(len(types) > 1 for types in groups.values()) > 1:
            raise ValueError(f'Multiple shared rails are not supported: {weapon}')
        # Keep empty category rows as before; they do not offer attachments.
        slots = {slot: {'accepts': [slot]} for slot in MOUNTS}
        for types in groups.values():
            if len(types) > 1:
                for slot in types:
                    del slots[slot]
                slots['rail'] = {'accepts': types}
        wa['slots'] = slots

    if unresolved:
        raise SystemExit('Cannot generate complete slot data: ' + json.dumps(unresolved))

    generated = defaultdict(list)
    for equipment in sorted((args.root / 'Common/Hardware/Weapons').rglob('Equipment_*.xml')):
        path = equipment.relative_to(args.root).as_posix()
        entries = read(path)[0].findall('Field_e70ce6be/member/Struct_4f9523cc')
        if not entries:
            continue
        ids = defaultdict(list)
        for asset in sorted(equipment.parent.glob('Attachment_*.xml')):
            relative = asset.relative_to(args.root).as_posix()
            ids[read(relative)[0].findtext('Field_de6f63b3')].append(relative)
        for index, entry in enumerate(entries):
            source, _ = reference(entry.findtext('Field_399fae20/Struct_490b9894/Field_d28dfb00'))
            raw_ids = [e.text for e in entry.findall('Field_f4142987/member')]
            row = dict(equipmentXml=path, entryIndex=index, sourceAttachment=source,
                requiredSourceIds=raw_ids, requiredSourceAttachments=[ids.get(h, []) for h in raw_ids])
            keys = sorted(by_path.get(source.lower(), set()))
            row['siteChoices'] = [dict(weapon=w, slot=s, attachment=a) for w, s, a in keys]
            if not keys:
                row['status'] = 'not offered or no reviewed identity'
                dependency_rows.append(row)
                continue
            for weapon, slot, item in keys:
                alternatives = set()
                permitted_paths = set()
                for raw_id in raw_ids:
                    if len(ids[raw_id]) != 1:
                        raise ValueError(f'Unresolved dependency ID: {path}: {raw_id}')
                    permitted_paths.add(ids[raw_id][0].lower())
                    mapped = {k for k in by_path[ids[raw_id][0].lower()] if k[0] == weapon}
                    if not mapped:
                        row.setdefault('unofferedAlternatives', []).append(ids[raw_id][0])
                        continue
                    if len(mapped) != 1:
                        raise ValueError(f'Ambiguous dependency: {source}: {raw_id}')
                    _, required_slot, required_item = mapped.pop()
                    alternatives.add((required_slot, required_item))
                if not alternatives:
                    raise ValueError(f'Empty dependency: {source}')
                # An unoffered source option can be omitted only when every
                # offered choice in the prerequisite category has known identity.
                domains = {s for s, _ in alternatives}
                for key in offered:
                    if key[0] != weapon or key[1] not in domains:
                        continue
                    paths = {p.lower() for p in sources.get(key, {})}
                    if not paths or len({p in permitted_paths for p in paths}) != 1:
                        raise ValueError(f'Incomplete or conflicting dependency identity: {key}')
                rule = dict(slot=slot, attachment=item,
                    requiresAny=[dict(slot=s, attachment=a) for s, a in sorted(alternatives)])
                if rule not in generated[weapon]:
                    generated[weapon].append(rule)
            row['status'] = 'generated'
            dependency_rows.append(row)
    for weapon, wa in catalog['WEAPON_ATTS'].items():
        wa.pop('dependencies', None)
        if generated[weapon]:
            wa['dependencies'] = sorted(generated[weapon], key=lambda r: (r['slot'], r['attachment']))

    output = json.dumps(catalog, indent=2, ensure_ascii=False) + '\n'
    report = dict(schemaVersion=1, source='Frosty ability slot categories and equipment dependency IDs',
        semantics='requiresAny lists permitted selected attachments; validated against PP-19 30/53-round UI evidence',
        scope='Only reviewed site identities; unavailable secondary sights remain in evidence. No native enum semantics inferred.',
        identitySources=reviews, sourceFiles=hashes, physicalSlots=slot_rows,
        dependencies=dependency_rows, unresolvedSlots=unresolved,
        counts=dict(slotChoices=len({(r['weapon'], r['slot'], r['attachment']) for r in slot_rows}),
            dependencyEntries=len(dependency_rows), generatedRules=sum(map(len, generated.values())),
            weaponsWithDependencies=sum(bool(v) for v in generated.values())))
    report_path = REPO / 'reference-data/provenance/frosty-attachment-compatibility.json'
    report_text = json.dumps(report, indent=2, ensure_ascii=False) + '\n'
    if args.check:
        if output != original or not report_path.exists() or report_path.read_text(encoding='utf-8') != report_text:
            raise SystemExit('Generated compatibility data differs; regenerate and review')
    else:
        catalog_path.write_text(output, encoding='utf-8')
        report_path.write_text(report_text, encoding='utf-8')
    print(json.dumps(report['counts']))


if __name__ == '__main__':
    main()

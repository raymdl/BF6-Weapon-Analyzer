"""Expand the generic site sight categories into the individual Frosty optics.

Inputs are committed or research-repo evidence; no Frosty export is read:
- the optic category mapping (every weapon's sight records, UI labels, costs);
- the attachment compatibility report (each Optic Accessory's permitted sights);
- the research repo's optic render-FOV report (in-game names, iron-sight zoom).

The legacy category entries stay at their SIGHTS positions so existing share
links keep their indices; they are hidden and resolve to an optic of the same
category. Optics are appended and never reordered.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

REPO = Path(__file__).resolve().parents[1]
PROVENANCE = REPO / 'reference-data/provenance'
DEFAULT_NAMES = Path('C:/Users/royal/Documents/BF6 Frosty Research/reference-data/provenance/frosty-optic-render-fov-2026-09-16.json')
LEGACY = ('std_optic', 'var_low', 'var_high', 'thermal', 'therm_hyb')
OUTPUT = PROVENANCE / 'frosty-individual-optics-2026-10-21.json'


def norm(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())


def source_key(path):
    return re.sub(r'\.xml$', '', path.lower())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def latest(pattern):
    return sorted(PROVENANCE.glob(pattern))[-1]


def magnification(label, name):
    """Fixed optics zoom to their UI label (all 1,810 linked parts checked); variables give a range."""
    label = label.strip()
    fixed = re.fullmatch(r'(?:Sight|Scope|Thermal) (\d+(?:\.\d+)?)x', label)
    if fixed:
        return float(fixed[1]), None
    variable = re.fullmatch(r'Variable (\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)x', label)
    if variable:
        low, high = float(variable[1]), float(variable[2])
        return high, [low, high]
    named = re.search(r'(\d+(?:\.\d+)?)x$', name)
    if label == 'Thermal Hybrid' and named:
        return float(named[1]), None
    raise ValueError(f'No magnification for {name} ({label})')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--optic-mapping', type=Path, default=latest('frosty-optic-category-mapping-*.json'))
    parser.add_argument('--compatibility', type=Path, default=PROVENANCE / 'frosty-attachment-compatibility.json')
    parser.add_argument('--names', type=Path, default=DEFAULT_NAMES,
                        help='Research-repo optic render-FOV report with opticNames and ironSights')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()

    catalog_path = REPO / 'data/attachments.json'
    original = catalog_path.read_text(encoding='utf-8')
    catalog = json.loads(original)
    mapping = json.loads(args.optic_mapping.read_text(encoding='utf-8'))
    compat = json.loads(args.compatibility.read_text(encoding='utf-8'))
    names_report = json.loads(args.names.read_text(encoding='utf-8'))

    by_record, name_rows = {}, {}
    for row in names_report['opticNames']:
        name_rows[row['inGameName']] = row
        for record in row['frostyRecordNames']:
            by_record.setdefault(norm(record), set()).add(row['inGameName'])

    sights = {s['id']: s for s in catalog['SIGHTS']}
    optics, per_weapon, by_source = {}, {}, {}
    for category in mapping['categories']:
        weapon, cat = category['weapon'], category['attachment']
        if cat == 'iron':
            if not category['members']:
                raise ValueError(f'{weapon}: no iron sights')
            continue
        for member in category['members']:
            token = re.search(r'_SCP_(.+?)(?:\.xml)?$', member['source'])[1]
            joined = set()
            for record in member.get('uiLink', {}).get('aamRecords', []):
                suffix = record['name'].split(' - SCP - ')[-1]
                joined |= by_record.get(norm(suffix), set()) | by_record.get(norm(record['name'].split(' - ', 1)[-1]), set())
            method = 'aam-record-name'
            if not joined:
                joined, method = by_record.get(norm(token), set()), 'attachment-file-token'
            if len(joined) != 1:
                raise ValueError(f'{member["source"]}: in-game name {sorted(joined) or "missing"}')
            name = next(iter(joined))
            label = member['label'].strip()
            if label not in [l.strip() for l in name_rows[name]['labels']]:
                raise ValueError(f'{member["source"]}: label {label} differs from {name}')
            if member['sourcePointCost'] != sights[cat]['pts']:
                raise ValueError(f'{member["source"]}: cost {member["sourcePointCost"]} != {cat}')
            mag, span = magnification(label, name)
            optic_id = re.sub(r'_+', '_', re.sub(r'[^a-z0-9]', '_', name.lower())).strip('_')
            entry = optics.setdefault(optic_id, dict(id=optic_id, inGameName=name, category=cat, label=label,
                magnification=mag, magnificationRange=span, nameIds=name_rows[name]['nameIds'],
                frostyRecordNames=name_rows[name]['frostyRecordNames']))
            if (entry['category'], entry['label']) != (cat, label):
                raise ValueError(f'{name}: inconsistent category or label')
            listed = per_weapon.setdefault(weapon, {})
            if optic_id in listed:
                raise ValueError(f'{weapon}: {name} listed twice')
            listed[optic_id] = dict(source=member['source'], joinMethod=method,
                                    **({'sourceBuild': member['sourceBuild']} if 'sourceBuild' in member else {}))
            by_source[source_key(member['source'])] = (weapon, optic_id)

    # Catalog: legacy entries keep their positions; existing optics keep theirs.
    ordered = [s for s in catalog['SIGHTS'] if s['id'] == 'iron' or s['id'] in LEGACY]
    if [s['id'] for s in ordered] != ['iron', *LEGACY]:
        raise ValueError('Legacy sight entries moved; share-link indices would change')
    known = [s['id'] for s in catalog['SIGHTS'][len(ordered):]]
    if set(known) - set(optics):
        raise ValueError(f'Optics no longer in Frosty: {sorted(set(known) - set(optics))}')
    new = sorted(set(optics) - set(known), key=lambda i: (optics[i]['magnification'], optics[i]['inGameName'].lower()))
    iron = ordered[0]
    iron_zoom = sorted({z for row in names_report['ironSights'] for z in row['zoom']})
    if iron_zoom != [1.5]:
        raise ValueError(f'Iron-sight zoom is no longer uniform: {iron_zoom}')
    iron['magnification'] = 1.5
    for legacy in ordered[1:]:
        legacy['legacy'] = True
    sight_entries = []
    for optic_id in known + new:
        optic = optics[optic_id]
        legacy = sights[optic['category']]
        name = optic['inGameName']
        if optic['magnificationRange'] and not re.search(r'\d+(?:\.\d+)?x$', name):
            low, high = (f'{v:g}' for v in optic['magnificationRange'])
            name = f'{name} {low}-{high}x'
        entry = dict(id=optic_id, name=name, category=optic['category'], pts=legacy['pts'],
                     magnification=optic['magnification'])
        if optic['magnificationRange']:
            entry['magnificationRange'] = optic['magnificationRange']
        entry.update({k: v for k, v in legacy.items() if k not in ('id', 'name', 'pts', 'legacy')})
        sight_entries.append(entry)
    catalog['SIGHTS'] = ordered + sight_entries
    order = {s['id']: i for i, s in enumerate(catalog['SIGHTS'])}

    for weapon, wa in catalog['WEAPON_ATTS'].items():
        if weapon not in per_weapon:
            raise ValueError(f'{weapon}: no Frosty optics')
        wa['sight'] = ['iron', *sorted(per_weapon[weapon], key=order.get)]

    # Optic Accessory prerequisites name individual sight records.
    permitted = {}
    for row in compat['dependencies']:
        for choice in row['siteChoices']:
            if choice['slot'] != 'accessory':
                continue
            ids = permitted.setdefault((choice['weapon'], choice['attachment']), set())
            for paths in row['requiredSourceAttachments']:
                for path in paths:
                    owner = by_source.get(source_key(path))
                    if owner and owner[0] == choice['weapon']:
                        ids.add(owner[1])
    for weapon, wa in catalog['WEAPON_ATTS'].items():
        for rule in wa.get('dependencies', []):
            if rule['slot'] != 'accessory':
                continue
            ids = permitted.get((weapon, rule['attachment']))
            if not ids:
                raise ValueError(f'{weapon} {rule["attachment"]}: no permitted optics in the report')
            had = {r['attachment'] for r in rule['requiresAny']}
            if had <= set(LEGACY) and had != {optics[i]['category'] for i in ids}:
                raise ValueError(f'{weapon} {rule["attachment"]}: categories {sorted(had)} differ from optics')
            rule['requiresAny'] = [dict(slot='sight', attachment=i) for i in sorted(ids, key=order.get)]
    for entry in catalog['WEAPON_ACCESSORY'].values():
        entry.pop('excludedSights', None)

    report = dict(
        schemaVersion=1,
        scope='Individual optics offered on each site weapon, with in-game names and magnifications. '
              'The site catalog in data/attachments.json is generated from this evidence by scripts/frosty-individual-optics.py.',
        magnificationBasis={
            'fixed': 'UI label magnification. The research render-FOV report finds every one of the 1,810 linked optic parts '
                     'with its own aim zooms to the magnification in its UI label.',
            'variable': 'UI label range. magnification is the high end, an assumption: the starting level of a variable optic '
                        'is not established in Frosty. The site zoom slider reaches the rest of the range.',
            'thermalHybrid': 'The label has no magnification; the in-game name TH-RDS 1.00x supplies it.',
            'iron': 'No iron-sight part overrides the aim; every checked weapon uses Aim_1x50 (1.50x). The report covers the '
                    '64 pre-2.1.1.0 blueprints; MK-24, ELR-40, Z-84M and RSPR were not checked and are assumed to match.',
        },
        sources={
            args.optic_mapping.name: sha(args.optic_mapping),
            args.compatibility.name: sha(args.compatibility),
            'BF6 Frosty Research/reference-data/provenance/' + args.names.name: sha(args.names),
        },
        ironSightsChecked=sorted(row['internalId'] for row in names_report['ironSights']),
        optics=[{k: v for k, v in optics[s['id']].items()} for s in sight_entries],
        weapons={w: [dict(id=i, **v) for i, v in sorted(per_weapon[w].items(), key=lambda kv: order[kv[0]])]
                 for w in sorted(per_weapon) if w in catalog['WEAPON_ATTS']},
        accessoryPrerequisites={f'{w}/{a}': sorted(ids, key=order.get) for (w, a), ids in sorted(permitted.items())
                                if w in catalog['WEAPON_ATTS']},
        counts=dict(optics=len(sight_entries), weapons=len(catalog['WEAPON_ATTS']),
                    weaponOptics=sum(len(per_weapon[w]) for w in catalog['WEAPON_ATTS'])),
    )
    output = json.dumps(catalog, indent=2, ensure_ascii=False) + '\n'
    report_text = json.dumps(report, indent=2, ensure_ascii=False) + '\n'
    if args.check:
        if output != original or not OUTPUT.exists() or OUTPUT.read_text(encoding='utf-8') != report_text:
            raise SystemExit('Generated optics differ; regenerate and review')
    else:
        catalog_path.write_text(output, encoding='utf-8')
        OUTPUT.write_text(report_text, encoding='utf-8')
    print(json.dumps(report['counts']))


if __name__ == '__main__':
    main()

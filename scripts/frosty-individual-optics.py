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
# Copied unchanged from the research repository (reference-data/provenance).
DEFAULT_NAMES = PROVENANCE / 'frosty-optic-render-fov-2026-09-16.json'
LEGACY = ('std_optic', 'var_low', 'var_high', 'thermal', 'therm_hyb')
OUTPUT = PROVENANCE / 'frosty-individual-optics-2026-11-10.json'
GENERATOR = 'frosty-individual-optics'
# Data sections this check compares, read by frosty-check-all.py --stamp (data/provenance/data-status.json):
# (file, section, fields); fields None = the whole section.
COVERS = [
    ('data/attachments.json', 'SIGHTS', None),
    ('data/attachments.json', 'WEAPON_ATTS[]', ['sight', 'dependencies (Optic Accessory rules)']),
]
# Optic Accessory record families (Attachment_*_SCA_<family>), as frosty-attachment-compatibility.py groups them.
ACCESSORY_FAMILIES = {
    'CantedIronSights': 'canted_irons', 'AGCoating': 'ag_coating',
    **{f: 'secondary_optic' for f in ('CantedReflex', 'CantedReflexSlanted', 'OffsetRedDot',
                                      'G43Magnifier', 'Variable2x', 'Variable3x', 'Variable4x')},
}


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
    parser = argparse.ArgumentParser(description=__doc__ + """
For a game update, pass the optic mapping the raw tooltip run writes
(frosty-attachment-tooltips.py --optic-mapping-json) and the compatibility report of the raw
compatibility run. --check writes nothing and exits 1 when the regenerated catalog or the
report's optic lists differ from the committed ones.""", formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--optic-mapping', type=Path, default=latest('frosty-optic-category-mapping-*.json'))
    parser.add_argument('--compatibility', type=Path, default=PROVENANCE / 'frosty-attachment-compatibility.json')
    parser.add_argument('--names', type=Path, action='append',
                        help='Optic name file with opticNames (and ironSights); repeat to add files. Default: the '
                             'render-FOV report (research repository copy) and the dated name supplements')
    parser.add_argument('--out', type=Path, default=REPO / 'data/attachments.json',
                        help='Where to write the regenerated attachment catalog')
    parser.add_argument('--report-out', type=Path, default=OUTPUT,
                        help='Where to write the individual-optics report (--check compares with it)')
    parser.add_argument('--availability', type=Path,
                        help='frosty-availability.py --report-out of the same capture: list only the sights it '
                             'finds offered')
    parser.add_argument('--overrides', type=Path, default=REPO / 'data-src/overrides-tooltips.json',
                        help='Reviewed deviations; rows with generator frosty-individual-optics keep a sight the '
                             'files do not offer')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()

    catalog_path = REPO / 'data/attachments.json'
    original_bytes = catalog_path.read_bytes().decode('utf-8')
    original = original_bytes.replace('\r\n', '\n')
    catalog = json.loads(original)
    mapping = json.loads(args.optic_mapping.read_text(encoding='utf-8'))
    compat = json.loads(args.compatibility.read_text(encoding='utf-8'))
    args.names = args.names or [DEFAULT_NAMES, *sorted(PROVENANCE.glob('frosty-optic-names-*.json'))]
    names_report = {'opticNames': [], 'ironSights': []}
    for path in args.names:
        document = json.loads(path.read_text(encoding='utf-8'))
        names_report['opticNames'] += document['opticNames']
        names_report['ironSights'] += document.get('ironSights', [])

    by_record, name_rows = {}, {}
    for row in names_report['opticNames']:
        name_rows[row['inGameName']] = row
        for record in row['frostyRecordNames']:
            by_record.setdefault(norm(record), set()).add(row['inGameName'])

    overrides = []
    if args.overrides.exists():
        overrides = [o for o in json.loads(args.overrides.read_text(encoding='utf-8'))['overrides']
                     if o.get('generator') == GENERATOR]
    kept = {(o['weapon'], o['id']): o for o in overrides}
    verdicts = None
    if args.availability:
        verdicts = {w: {source_key(path): v for path, v in records.items()}
                    for w, records in json.loads(args.availability.read_text(encoding='utf-8'))['records'].items()}
    deviation_status = {}
    not_listed = []
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
            # With --availability, a record the files do not offer (no ability branch, a kill-switch
            # row stored true, or not in the Equipment list) is not listed unless a deviation row keeps it.
            offered = True
            if verdicts is not None:
                verdict = verdicts.get(weapon, {}).get(source_key(member['source']))
                if verdict is None:
                    raise ValueError(f'{member["source"]}: no availability verdict')
                offered = verdict['offered']
            if not offered:
                optic_id = None
                if len(joined) == 1:
                    optic_id = re.sub(r'_+', '_', re.sub(r'[^a-z0-9]', '_', next(iter(joined)).lower())).strip('_')
                if (weapon, optic_id) not in kept:
                    not_listed.append(dict(weapon=weapon, source=member['source'], label=member['label'],
                                           inGameName=next(iter(joined)) if len(joined) == 1 else None))
                    continue
                deviation_status[weapon, optic_id] = 'applied'
            elif len(joined) == 1:
                optic_id = re.sub(r'_+', '_', re.sub(r'[^a-z0-9]', '_', next(iter(joined)).lower())).strip('_')
                if (weapon, optic_id) in kept:
                    deviation_status[weapon, optic_id] = 'REDUNDANT'
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
        if optic_id in sights:
            # An existing optic keeps the fields this script does not own (its effect fields
            # start as the category's and may since have been set for the optic itself).
            entry = dict(sights[optic_id])
            entry.update(name=name, category=optic['category'], pts=legacy['pts'], magnification=optic['magnification'])
            if optic['magnificationRange']:
                entry['magnificationRange'] = optic['magnificationRange']
            else:
                entry.pop('magnificationRange', None)
            sight_entries.append(entry)
            continue
        entry = dict(id=optic_id, name=name, category=optic['category'], pts=legacy['pts'],
                     magnification=optic['magnification'])
        if optic['magnificationRange']:
            entry['magnificationRange'] = optic['magnificationRange']
        entry.update({k: v for k, v in legacy.items() if k not in ('id', 'name', 'pts', 'legacy')})
        sight_entries.append(entry)
    catalog['SIGHTS'] = ordered + sight_entries
    # SIGHTS positions are share-link indices (append only); lists show the optics by low-end
    # magnification, then name.
    order = {s['id']: ((s.get('magnificationRange') or [s['magnification']])[0], s['name'].lower())
             for s in catalog['SIGHTS'][len(ordered):]}

    for weapon, wa in catalog['WEAPON_ATTS'].items():
        if weapon not in per_weapon:
            raise ValueError(f'{weapon}: no Frosty optics')
        wa['sight'] = ['iron', *sorted(per_weapon[weapon], key=order.get)]

    # Optic Accessory prerequisites name individual sight records.
    # The accessory comes from the record family and the weapon from the optic, so the report's
    # siteChoices (written from the previous individual-optics report) are not needed.
    permitted = {}
    for row in compat['dependencies']:
        family = re.search(r'_SCA_(\w+?)(?:\.xml)?$', row['sourceAttachment'])
        if not family or family[1] not in ACCESSORY_FAMILIES:
            continue
        for paths in row['requiredSourceAttachments']:
            for path in paths:
                owner = by_source.get(source_key(path))
                if owner:
                    permitted.setdefault((owner[0], ACCESSORY_FAMILIES[family[1]]), set()).add(owner[1])
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
            **{path.name: sha(path) for path in args.names},
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
    deviations = [dict(overrideId=o.get('overrideId'), weapon=o['weapon'], id=o['id'],
                       status=deviation_status.get((o['weapon'], o['id']), 'UNUSED')) for o in overrides]
    report['notOffered'] = not_listed
    report['deviations'] = deviations
    output = json.dumps(catalog, indent=2, ensure_ascii=False) + '\n'
    report_text = json.dumps(report, indent=2, ensure_ascii=False) + '\n'
    print(json.dumps(report['counts']))
    print(f'{len(not_listed)} mapped sights the files do not offer, not listed: '
          + ', '.join(f'{r["weapon"]} {r["source"].rsplit("/", 1)[-1]}' for r in not_listed))
    for row in deviations:
        print(f'deviation {row["overrideId"]} {row["weapon"]} {row["id"]}: {row["status"]}')
    failed_deviation = any(row['status'] != 'applied' for row in deviations)
    committed = json.loads(original)
    differences = []
    old_sights, new_sights = [s['id'] for s in committed['SIGHTS']], [s['id'] for s in catalog['SIGHTS']]
    if old_sights != new_sights:
        differences.append(f'SIGHTS ids: removed {[i for i in old_sights if i not in new_sights]}, '
                           f'added {[i for i in new_sights if i not in old_sights]}')
    for entry in catalog['SIGHTS']:
        old = next((s for s in committed['SIGHTS'] if s['id'] == entry['id']), None)
        if old is not None and old != entry:
            differences.append(f'SIGHTS {entry["id"]}: ' + json.dumps(
                {k: [old.get(k), entry.get(k)] for k in sorted(set(old) | set(entry)) if old.get(k) != entry.get(k)}))
    for weapon, wa in catalog['WEAPON_ATTS'].items():
        old = committed['WEAPON_ATTS'].get(weapon, {})
        if old.get('sight') != wa.get('sight'):
            differences.append(f'WEAPON_ATTS.{weapon}.sight: removed {[i for i in old.get("sight", []) if i not in wa["sight"]]}, '
                               f'added {[i for i in wa["sight"] if i not in old.get("sight", [])]}')
        old_rules = {r['attachment']: r for r in old.get('dependencies', []) if r['slot'] == 'accessory'}
        for rule in wa.get('dependencies', []):
            if rule['slot'] == 'accessory' and old_rules.get(rule['attachment']) != rule:
                was = {r['attachment'] for r in old_rules.get(rule['attachment'], {}).get('requiresAny', [])}
                now = {r['attachment'] for r in rule['requiresAny']}
                differences.append(f'WEAPON_ATTS.{weapon}.dependencies accessory {rule["attachment"]}: '
                                   f'removed {sorted(was - now)}, added {sorted(now - was)}' + (' (order)' if was == now else ''))
    for line in differences:
        print('DIFF ' + line)
    if output != original and not differences:
        print('Storage differs (order or fields outside the sight lists, SIGHTS and accessory rules)')
    if args.check:
        stale = False
        if args.report_out.exists():
            kept = json.loads(args.report_out.read_text(encoding='utf-8'))
            for key in ('optics', 'weapons', 'accessoryPrerequisites', 'counts', 'notOffered', 'deviations'):
                if kept.get(key) != report[key]:
                    print(f'REPORT {args.report_out.name} {key} differs')
                    stale = True
        else:
            print(f'REPORT {args.report_out.name} missing')
            stale = True
        if output != original or stale or failed_deviation:
            raise SystemExit(1)
        return
    newline = '\r\n' if '\r\n' in original_bytes else '\n'
    args.out.write_text(output, encoding='utf-8', newline=newline)
    args.report_out.write_text(report_text, encoding='utf-8', newline='\n')
    if failed_deviation:
        raise SystemExit(1)


if __name__ == '__main__':
    main()

"""Generate attachment point costs from the Attachment_* records' cost field (Field_6ee865a5).

Every site cost entry (weapon, slot, site id) is joined to its record(s) by the reviewed identity
file (--mapping); the cost is read from the capture on each run. The site stores costs in shapes
the simulator resolves as follows (sim/loadout.js computeAttPts):
  muzzle, ergo        MUZZLES/ERGOS[].pts, per-weapon exception weaponOverrides[weapon].pts
  barrel, grip,       BARRELS/GRIPS/LASERS/LIGHTS[].pts only: one cost for every weapon
  laser, light        (the simulator reads no per-weapon cost for these slots)
  sight               SIGHTS[].pts, per-weapon exception WEAPON_ATTS[weapon].sightPoints[id]
  mag                 WEAPON_MAG[weapon].mags[id].pts
  ammo                ammo.json WEAPON_AMMO[weapon].ammo[id]
A shared default is the most common source cost of the weapons offering the entry (a tie keeps the
committed default when it is one of the tied values, else the lowest). Accessories are not written
here: frosty-attachment-compatibility.py checks their cost.

Known deviations (--overrides, rows with generator "frosty-point-costs") replace the source cost of
one entry. Each row is reported as applied, STALE (the source no longer equals the reviewed source
value), REDUNDANT (the source now equals the site value) or UNUSED (no such site entry); the last
three fail the run.

--check exits 1 on any difference between the regenerated costs and the committed data, or on any
row the run cannot settle (unmapped site entry, missing record, conflicting records, a per-weapon
cost a shared-only slot cannot hold, a deviation not applied).
"""
import argparse
from collections import Counter
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
CATALOGS = {'muzzle': 'MUZZLES', 'barrel': 'BARRELS', 'grip': 'GRIPS', 'laser': 'LASERS',
            'light': 'LIGHTS', 'ergo': 'ERGOS', 'sight': 'SIGHTS'}
WEAPON_EXCEPTIONS = ('muzzle', 'ergo')     # weaponOverrides[weapon].pts
SHARED_ONLY = ('barrel', 'grip', 'laser', 'light')
GENERATOR = 'frosty-point-costs'


def site_entries(catalog, ammo):
    """{(weapon, slot, id): committed cost as the simulator resolves it}."""
    by_id = {slot: {e['id']: e for e in catalog[key]} for slot, key in CATALOGS.items()}
    out = {}
    for w, wa in catalog['WEAPON_ATTS'].items():
        for slot in ('muzzle', 'barrel', 'grip', 'laser', 'light'):
            for i in wa.get(slot, []):
                if i != 'none':
                    e = by_id[slot][i]
                    over = (e.get('weaponOverrides') or {}).get(w, {}) if slot in WEAPON_EXCEPTIONS else {}
                    out[(w, slot, i)] = over.get('pts', e['pts'])
        for i in wa.get('sight') or []:
            out[(w, 'sight', i)] = (wa.get('sightPoints') or {}).get(i, by_id['sight'][i]['pts'])
    for w, we in catalog['WEAPON_ERGO'].items():
        for i in we.get('avail', []):
            if i != 'none':
                e = by_id['ergo'][i]
                out[(w, 'ergo', i)] = (e.get('weaponOverrides') or {}).get(w, {}).get('pts', e['pts'])
    for w, wm in catalog['WEAPON_MAG'].items():
        for m, d in wm['mags'].items():
            out[(w, 'mag', m)] = d['pts']
    for w, wa in ammo['WEAPON_AMMO'].items():
        for i, p in wa['ammo'].items():
            out[(w, 'ammo', i)] = p
    return out


def record_cost(export, route):
    """(cost, sha256) of one Attachment record, or (None, reason)."""
    try:
        tree, sha = export.load(route + '.xml')
    except FileNotFoundError:
        return None, 'record not in capture'
    obj = tree[0]
    if (obj.findtext('Field_0c59fa06') or '').lower() != route.lower():
        return None, f'record name {obj.findtext("Field_0c59fa06")!r}'
    text = obj.findtext('Field_6ee865a5')
    if text is None:
        return None, 'no Field_6ee865a5'
    cost = int(text, 16)
    repeats = {int(t.text, 16) for t in obj.findall('Field_f6a09c90/member/*/Field_6ee865a5')}
    if repeats - {cost}:
        return None, f'Field_f6a09c90 repeats {sorted(repeats)} beside {cost}'
    return cost, sha


def choose_default(values, current):
    counts = Counter(values)
    top = max(counts.values())
    tied = sorted(v for v, c in counts.items() if c == top)
    return current if current in tied else tied[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    spec = importlib.util.spec_from_file_location('raw_tree', ROOT / 'scripts/frosty-raw-tree.py')
    raw_tree = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(raw_tree)
    parser.add_argument('--root', type=Path, help='XML export root (or use --raw)')
    raw_tree.add_raw_arguments(parser)
    parser.add_argument('--mapping', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-point-cost-mapping-2026-11-10.json',
                        help='Reviewed point-cost identity rows')
    parser.add_argument('--overrides', type=Path, default=ROOT / 'data-src/overrides.json',
                        help='Reviewed deviations; rows with generator "frosty-point-costs" are read')
    parser.add_argument('--out', type=Path, default=ROOT / 'data/attachments.json',
                        help='Where to write the regenerated attachment catalog')
    parser.add_argument('--ammo-out', type=Path, default=ROOT / 'data/ammo.json',
                        help='Where to write the regenerated ammunition file')
    parser.add_argument('--report-out', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-point-costs-generated.json',
                        help='Where to write the per-entry source evidence')
    parser.add_argument('--check', action='store_true',
                        help='Write nothing; exit 1 on any difference from the committed data')
    args = parser.parse_args()
    export = raw_tree.open_input(parser, args, args.root)

    catalog_path, ammo_path = ROOT / 'data/attachments.json', ROOT / 'data/ammo.json'
    catalog_text = catalog_path.read_bytes().decode('utf-8')
    ammo_text = ammo_path.read_bytes().decode('utf-8')
    catalog, ammo = json.loads(catalog_text), json.loads(ammo_text)
    committed = site_entries(catalog, ammo)
    mapping = json.loads(args.mapping.read_text(encoding='utf-8'))
    rows = {(r['weapon'], r['slot'], r['id']): r for r in mapping['rows']}
    overrides = []
    if args.overrides.exists():
        overrides = [o for o in json.loads(args.overrides.read_text(encoding='utf-8'))['overrides']
                     if o.get('generator') == GENERATOR]

    problems = []        # (kind, key, detail): every one fails the run
    source, evidence, hashes = {}, [], {}
    for key in sorted(set(committed) | set(rows)):
        if key not in rows:
            problems.append(('unmapped site entry', key, f'site {committed[key]}'))
            continue
        if key not in committed:
            problems.append(('mapping row not on site', key, ''))
            continue
        costs = {}
        for route in rows[key]['records']:
            cost, sha = record_cost(export, route)
            if cost is None:
                problems.append((sha, key, route))
            else:
                costs[route] = cost
                hashes[route] = sha
        if len(costs) != len(rows[key]['records']):
            continue
        if len(set(costs.values())) > 1:
            problems.append(('conflicting records', key, json.dumps(costs)))
            continue
        source[key] = next(iter(costs.values()))
        evidence.append({'weapon': key[0], 'slot': key[1], 'id': key[2], 'cost': source[key], 'records': sorted(costs)})

    # Deviations replace the source value of one entry.
    wanted = dict(source)
    deviation_report = []
    for o in overrides:
        key = (o['weapon'], o['slot'], o['id'])
        if key not in committed or key not in rows:
            status = 'UNUSED'
        elif key not in source:
            status = 'UNUSED'
        elif source[key] == o['siteValue']:
            status = 'REDUNDANT'
        elif source[key] != o['sourceValue']:
            status = 'STALE'
        else:
            status = 'applied'
            wanted[key] = o['siteValue']
        deviation_report.append({'overrideId': o.get('overrideId'), 'weapon': key[0], 'slot': key[1], 'id': key[2], 'status': status,
                                 'source': source.get(key), 'reviewedSource': o['sourceValue'], 'siteValue': o['siteValue']})
        if status != 'applied':
            problems.append((f'deviation {status}', key, f'source {source.get(key)}, reviewed {o["sourceValue"]}, site {o["siteValue"]}'))

    # Write the costs in the site's storage shapes.
    by_id = {slot: {e['id']: e for e in catalog[key]} for slot, key in CATALOGS.items()}
    per_entry = {}
    for (w, slot, i), cost in wanted.items():
        if slot in CATALOGS:
            per_entry.setdefault((slot, i), {})[w] = cost
    for (slot, i), costs in sorted(per_entry.items()):
        entry = by_id[slot][i]
        default = choose_default(list(costs.values()), entry.get('pts'))
        if slot in SHARED_ONLY and len(set(costs.values())) > 1:
            for w, c in sorted(costs.items()):
                if c != default:
                    problems.append(('per-weapon cost in a shared-only slot', (w, slot, i), f'source {c}, shared {default}'))
        entry['pts'] = default
        for w, c in sorted(costs.items()):
            if slot in WEAPON_EXCEPTIONS:
                overs = entry.setdefault('weaponOverrides', {})
                if c != default:
                    overs.setdefault(w, {})['pts'] = c
                elif w in overs:
                    overs[w].pop('pts', None)
                    if not overs[w]:
                        del overs[w]
                if not overs:
                    del entry['weaponOverrides']
            elif slot == 'sight':
                wa = catalog['WEAPON_ATTS'][w]
                points = wa.setdefault('sightPoints', {})
                if c != default:
                    points[i] = c
                else:
                    points.pop(i, None)
                if not points:
                    del wa['sightPoints']
    for (w, slot, i), cost in wanted.items():
        if slot == 'mag':
            catalog['WEAPON_MAG'][w]['mags'][i]['pts'] = cost
        elif slot == 'ammo':
            ammo['WEAPON_AMMO'][w]['ammo'][i] = cost

    generated = site_entries(catalog, ammo)
    differences = [(key, committed[key], generated[key], source.get(key)) for key in sorted(committed)
                   if key in generated and committed[key] != generated[key]]
    storage = (json.loads(catalog_text) != catalog) or (json.loads(ammo_text) != ammo)

    counts = Counter(k[1] for k in source)
    print(f'{len(source)} of {len(committed)} site cost entries read from {len(hashes)} records '
          f'({", ".join(f"{s} {n}" for s, n in sorted(counts.items()))}); '
          f'{sum(1 for d in deviation_report if d["status"] == "applied")} deviations applied')
    for key, old, new, src in differences:
        print(f'DIFF {key[0]} {key[1]} {key[2]}: site {old} -> generated {new} (source {src})')
    for kind, key, detail in problems:
        print(f'{kind.upper() if kind.startswith("deviation") else kind}: {key[0]} {key[1]} {key[2]} {detail}')
    if storage and not differences:
        print('Storage differs (shared defaults or exception rows) with every effective cost equal')

    if args.check:
        if differences or problems or storage:
            sys.exit(1)
        return
    report = {'generatedBy': 'scripts/frosty-point-costs.py', 'field': 'Attachment_* Field_6ee865a5',
              'mapping': args.mapping.name, 'deviations': deviation_report,
              'problems': [{'kind': k, 'weapon': key[0], 'slot': key[1], 'id': key[2], 'detail': d} for k, key, d in problems],
              'sourceHashes': dict(sorted(hashes.items()))}
    for path, doc, original in ((args.out, catalog, catalog_text), (args.ammo_out, ammo, ammo_text)):
        newline = '\r\n' if '\r\n' in original else '\n'
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline=newline)
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    # One evidence row per line keeps the report reviewable as a diff.
    text = json.dumps(export.mark(report), indent=2)
    rows_text = ',\n    '.join(json.dumps(r) for r in evidence)
    text = text[:-2] + ',\n  "rows": [\n    ' + rows_text + '\n  ]\n}'
    args.report_out.write_text(text + '\n', encoding='utf-8')
    if problems:
        sys.exit(1)


if __name__ == '__main__':
    main()

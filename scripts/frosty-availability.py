"""Check the site's availability lists against the raw capture (a checker: it writes no site data).

For every site weapon it computes which attachment, magazine and ammunition records the files
offer, and compares them with what the site offers: data/attachments.json WEAPON_ATTS (muzzle,
barrel, grip, laser, light, sight), WEAPON_ERGO, WEAPON_ACCESSORY, WEAPON_MAG mags and
data/ammo.json WEAPON_AMMO.

A record is offered when (docs/GAME_UPDATE_GUIDE.md, "Availability of new content"):
  record     Attachment_<W>_* exists in the weapon folder
  branch     <W>_Ability branch list Field_d7605aab has a branch whose Field_f86e0433 imports
             the record's unlock (U_PRG_*, record Field_157a7d74 and Field_f6a09c90[].Field_157a7d74)
  killswitch no kill-switch row named like the unlock is stored true (rows in every file under
             Common/GameSetup/Tweakables/Killswitches); no row means not switched off. The
             unlock file's own Field_32cf19f5 is not read: its meaning is not established (it
             is true on the DRS-IAR Heavy Barrel, which has no row in 2.1.1.0 or 2.1.2.0 and
             was in the in-game menu on 28 Jul 2026, attachment-audit screenshot 14)
  equipment  Equipment_<W> Field_6d390b97 or Field_844f8184 imports the record
The modifier-package condition of the guide is not applied: the WB list has no id join (the
10 November trace matched it by name and it decides nothing the four above do not).

Site entries join to records through the reviewed identity rows of the point-cost mapping
(--mapping); Optic Accessory choices join by family, as frosty-attachment-compatibility.py
groups them. Names of unlisted records come from the weapon's AAM_<W> label join (no stored
link exists; a missing name is printed as such).

Differences:
  (a) offered by the files but not on the site
  (b) on the site but not offered by the files (with the failing conditions)
  (c) on the site with no mapped record
Known deviations (--overrides, rows with generator "frosty-availability", key weapon/slot/id;
for (a) the id is the record name) carry sourceValue = the computed state ("offered",
"not offered: <conditions>", "no record") and siteValue ("listed" / "not listed"). Each row is
reported applied, STALE (the file state moved), REDUNDANT (site and files now agree) or UNUSED.
--check exits 1 unless every difference is an applied row and no row is STALE/REDUNDANT/UNUSED.
"""
import argparse
from collections import Counter, defaultdict
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = 'frosty-availability'
SITE_SLOTS = ('muzzle', 'barrel', 'grip', 'laser', 'light', 'sight', 'ergo', 'accessory', 'mag', 'ammo')
# Record slot code -> site slot, for records with no identity row (RGT/LFT/TOP hold lasers
# and lights on different weapons: the row of the same record name on another weapon decides first).
CODE_SLOT = {'MZL': 'muzzle', 'BRL': 'barrel', 'BTM': 'grip', 'ERG': 'ergo', 'MAG': 'mag', 'AMO': 'ammo',
             'SCP': 'sight', 'SCA': 'accessory'}
# Optic Accessory families -> site choice (same grouping as frosty-attachment-compatibility.py).
ACCESSORY_FAMILIES = {
    'cantedironsights': 'canted_irons', 'agcoating': 'ag_coating',
    **{f.lower(): 'secondary_optic' for f in ('CantedReflex', 'CantedReflexSlanted', 'OffsetRedDot',
                                              'G43Magnifier', 'Variable2x', 'Variable3x', 'Variable4x')},
}
KILLSWITCH_FOLDER = 'common/gamesetup/tweakables/killswitches/'
NAME = 'Field_0c59fa06'


def load_raw_tree():
    spec = importlib.util.spec_from_file_location('raw_tree', ROOT / 'scripts/frosty-raw-tree.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Files:
    """Decoded raw assets by route (lower-case, no extension), with file-GUID resolution."""

    def __init__(self, raw_tree, export):
        self.decode, self.export = raw_tree.decode, export
        self.routes = {key[:-4]: rel[:-4] for key, (rel, _) in export.files.items()}
        self.path_by_guid = export.builder.path_by_guid
        self.ambiguous = export.builder.ambiguous
        self.cache = {}

    def get(self, route):
        key = route.lower()
        if key not in self.cache:
            entry = self.export.files.get(key + '.xml')
            if entry is None or 'materialgrid' in key:
                self.cache[key] = None
            else:
                self.cache[key] = self.decode.Ebx(entry[1], self.export.types).decode()
        return self.cache[key]

    def path(self, guid):
        guid = guid.lower()
        if guid in self.ambiguous:
            raise ValueError(f'file GUID {guid} is listed by more than one asset ({", ".join(self.ambiguous[guid])}); '
                             'give the loaded-cache catalog first')
        return self.path_by_guid.get(guid)


def imports_under(value, objects):
    """File GUIDs imported anywhere below a value, following in-file references."""
    out, seen, stack = set(), set(), [value]
    while stack:
        x = stack.pop()
        if isinstance(x, dict):
            if '$import' in x:
                out.add(x['$import']['fileGuid'].lower())
            elif '$ref' in x:
                if x['$ref'] not in seen:
                    seen.add(x['$ref'])
                    stack.append(objects[x['$ref']])
            else:
                stack.extend(x.values())
        elif isinstance(x, list):
            stack.extend(x)
    return out


def unboxed(value):
    while isinstance(value, dict) and '$boxedValue' in value:
        value = value.get('value')
    return value


def kill_switch_rows(files):
    """U_PRG name (lower) -> [(registry, stored value)] from every kill-switch registry."""
    rows, registries = defaultdict(list), 0
    for key in sorted(files.routes):
        if not key.startswith(KILLSWITCH_FOLDER):
            continue
        registries += 1
        for o in files.get(key)['objects']:
            name = o.get(NAME)
            if isinstance(name, str) and name.startswith('U_PRG_'):
                rows[name.split('#')[0].lower()].append((files.routes[key].rsplit('/', 1)[1], unboxed(o.get('Field_42c8b257'))))
    return rows, registries


def u32(n):
    return None if n is None else int(n) & 0xFFFFFFFF


class Strings:
    def __init__(self, path):
        self.table = {}
        if path and Path(path).exists():
            for line in Path(path).read_text(encoding='utf-8').splitlines():
                parts = line.split('\t', 1)
                if len(parts) == 2:
                    self.table[parts[0].upper()] = parts[1]

    def get(self, number):
        return None if number is None else self.table.get('%08X' % number)


SLOT_CODES = ('AMO', 'BRL', 'BTM', 'ERG', 'MAG', 'MZL', 'SCA', 'SCP', 'TOP', 'RGT', 'LFT')


def norm(text):
    return re.sub(r'[^a-z0-9]', '', text.lower())


def split_record(name, weapon):
    m = re.match(r'attachment_' + re.escape(weapon.lower()) + r'_(' + '|'.join(SLOT_CODES) + r')_(.+)$', name.lower(), re.I)
    return (m.group(1).upper(), m.group(2)) if m else (None, None)


def aam_names(files, folder, weapon, strings):
    """[(label, in-game name)] from AAM_<W> (Class_ccf7da47 entries, Field_fd698f51 -> Field_3d34898a)."""
    doc = files.get(f'{folder}/aam_{weapon}')
    if doc is None:
        return []
    objects, out = doc['objects'], []
    for e in objects:
        if e.get('$class') != 'Class_ccf7da47':
            continue
        f = e.get('Field_fd698f51')
        number = u32(objects[f['$ref']].get('Field_3d34898a')) if isinstance(f, dict) and '$ref' in f else None
        out.append((e.get('Field_55aded8d') or '', strings.get(number)))
    return out


def name_of(record, weapon, entries):
    """In-game name of a record by the AAM label join, or None when no entry matches."""
    slot, rest = split_record(record, weapon)
    if not rest:
        return None
    key, found = norm(rest), []
    for label, name in entries:
        body = [p.strip() for p in label.split(' - ')]
        body = body[1:] if len(body) > 1 else body
        lslot = body[0].upper() if body and body[0].upper() in SLOT_CODES else None
        if lslot and lslot != slot:
            continue
        tail = norm(''.join(body[1:] if lslot else body))
        if tail == key or (len(key) > 3 and len(tail) > 3 and (tail.startswith(key) or key.startswith(tail))):
            found.append(name or f'<label {label}, no string>')
    return ' / '.join(sorted(set(found))) if found else None


def analyse_weapon(files, folder, kst):
    """Per record of one weapon folder: the four conditions and the offered verdict."""
    equipment = [k for k in files.routes if k.startswith(folder + '/equipment_') and k.count('/') == folder.count('/') + 1]
    if len(equipment) != 1:
        raise ValueError(f'{folder}: {len(equipment)} Equipment_* files')
    weapon = equipment[0].rsplit('/', 1)[1][len('equipment_'):]
    eq = files.get(equipment[0])
    listed = set()
    for field in ('Field_6d390b97', 'Field_844f8184'):
        listed |= imports_under(eq['objects'][0].get(field), eq['objects'])
    ability = files.get(f'{folder}/{weapon}_ability')
    branches = set()
    if ability:
        objects = ability['objects']
        root = next((o for o in objects if 'Field_d7605aab' in o), None)
        for r in (root or {}).get('Field_d7605aab') or []:
            if isinstance(r, dict) and '$ref' in r:
                f = objects[r['$ref']].get('Field_f86e0433')
                if isinstance(f, dict) and '$import' in f:
                    branches.add(f['$import']['fileGuid'].lower())
    records = {}
    for key in sorted(files.routes):
        if not (key.startswith(folder + '/attachment_') and key.count('/') == folder.count('/') + 1):
            continue
        doc = files.get(key)
        o = doc['objects'][0]
        unlocks = set()
        for v in [o.get('Field_157a7d74')] + [e.get('Field_157a7d74') for e in o.get('Field_f6a09c90') or []]:
            if isinstance(v, dict) and '$import' in v:
                unlocks.add(v['$import']['fileGuid'].lower())
        unlock_names, ks_values, ks_rows = [], [], []
        for g in sorted(unlocks):
            p = files.path(g)
            if not p:
                continue
            base = PurePosixPath(p).name
            unlock_names.append(base)
            rows = kst.get(base.lower(), [])
            ks_rows += [f'{reg}={val}' for reg, val in rows]
            ks_values += [val for _, val in rows]
        conditions = {
            'branch': bool(unlocks & branches),
            'killswitch': bool(unlock_names) and True not in ks_values,
            'equipment': doc['fileGuid'].lower() in listed,
        }
        records[files.routes[key]] = {
            'conditions': conditions, 'offered': all(conditions.values()),
            'unlocks': unlock_names, 'killSwitchRows': ks_rows, 'cost': o.get('Field_6ee865a5'),
        }
    return weapon, records


def failing(info):
    if info is None:
        return 'record not in capture'
    return ', '.join({'branch': 'no ability branch', 'killswitch': 'kill switch row true (or no unlock)',
                      'equipment': 'not in Equipment list'}[c] for c, ok in info['conditions'].items() if not ok)


def site_lists(catalog, ammo):
    out = defaultdict(set)
    for w, wa in catalog['WEAPON_ATTS'].items():
        for slot in ('muzzle', 'barrel', 'grip', 'laser', 'light', 'sight'):
            for i in wa.get(slot) or []:
                if i != 'none':
                    out[(w, slot)].add(i)
    for w, we in catalog['WEAPON_ERGO'].items():
        out[(w, 'ergo')] |= {i for i in we.get('avail', []) if i != 'none'}
    for w, wa in catalog['WEAPON_ACCESSORY'].items():
        out[(w, 'accessory')] |= set(wa.get('avail', []))
    for w, wm in catalog['WEAPON_MAG'].items():
        out[(w, 'mag')] |= set(wm['mags'])
    for w, wa in ammo['WEAPON_AMMO'].items():
        out[(w, 'ammo')] |= set(wa['ammo'])
    return out


def release_signal(files, internal_names):
    """Weapon (lower internal name) -> (GRX_Weapons rows, loot rows) naming it."""
    grx = next((k for k in files.routes if k.endswith('/gameremixer/grx_weapons')), None)
    loot = next((k for k in files.routes if k.endswith('/loot/mutatordatabase_loot')), None)
    names = {}
    for key in (grx, loot):
        names[key] = [o.get(NAME) for o in (files.get(key)['objects'] if key else []) if isinstance(o.get(NAME), str)]
    out = {}
    for w in internal_names:
        g = re.compile(r'^(gs_)?' + re.escape(w) + r'(_wb)?\.', re.I)
        l = re.compile(r'weapon_[a-z0-9]+_[a-z0-9]*' + re.escape(w) + r'($|[._ ])', re.I)
        out[w] = (sum(1 for n in names[grx] if g.match(n)), sum(1 for n in names[loot] if l.search(n)),
                  grx is not None, loot is not None)
    return out


def main():
    raw_tree = load_raw_tree()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    raw_tree.add_raw_arguments(parser)
    parser.add_argument('--mapping', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-point-cost-mapping-2026-11-10.json',
                        help='Reviewed identity rows: site (weapon, slot, id) -> Attachment_* records')
    parser.add_argument('--overrides', type=Path, default=ROOT / 'data-src/overrides-availability.json',
                        help='Reviewed deviations; rows with generator "frosty-availability" are read')
    parser.add_argument('--strings', type=Path, help='fs_us_loc.strings.tsv of the build (names of unlisted records)')
    parser.add_argument('--report-out', type=Path, help='Write every record verdict and difference as JSON')
    parser.add_argument('--check', action='store_true', help='Exit 1 on any difference not covered by an applied deviation row')
    args = parser.parse_args()
    if not args.raw:
        parser.error('raw mode only: give --raw, --descriptors and --catalog')
    export = raw_tree.open_input(parser, args, None).export
    files = Files(raw_tree, export)
    strings = Strings(args.strings)

    catalog = json.loads((ROOT / 'data/attachments.json').read_text(encoding='utf-8'))
    ammo = json.loads((ROOT / 'data/ammo.json').read_text(encoding='utf-8'))
    site = site_lists(catalog, ammo)
    mapping = json.loads(args.mapping.read_text(encoding='utf-8'))['rows']
    rows = {(r['weapon'], r['slot'], r['id']): r['records'] for r in mapping}
    weapons = sorted(catalog['WEAPON_ATTS'])

    # Site slot of an unlisted record: the slot its record name holds on other weapons, else its code.
    suffix_slot = defaultdict(Counter)
    for (w, slot, i), recs in rows.items():
        for rec in recs:
            m = re.match(r'attachment_.+?_((?:' + '|'.join(SLOT_CODES) + r')_.+)$', PurePosixPath(rec).name, re.I)
            if m:
                suffix_slot[m.group(1).lower()][slot] += 1

    kst, registries = kill_switch_rows(files)
    if not registries:
        parser.error('no kill-switch registry in the capture')
    problems, verdicts, internal = [], {}, {}
    diffs = []      # (finding, weapon, slot, id, sourceValue, siteValue, detail)
    counts = {s: Counter() for s in SITE_SLOTS}
    for w in weapons:
        folders = Counter(str(PurePosixPath(rec.lower()).parent) for (ww, _, _), recs in rows.items() if ww == w for rec in recs)
        if not folders:
            problems.append(f'{w}: no identity rows, folder unknown')
            continue
        folder = folders.most_common(1)[0][0]
        try:
            weapon, records = analyse_weapon(files, folder, kst)
        except ValueError as error:
            problems.append(f'{w}: {error}')
            continue
        internal[w] = weapon
        verdicts[w] = records
        by_lower = {k.lower(): v for k, v in records.items()}
        mapped = set()
        entries = None
        for slot in SITE_SLOTS:
            listed = site.get((w, slot), set())
            if slot == 'accessory':
                files_offered = defaultdict(list)
                all_family = defaultdict(list)
                for rec, info in records.items():
                    code, rest = split_record(PurePosixPath(rec).name, weapon)
                    if code != 'SCA':
                        continue
                    choice = ACCESSORY_FAMILIES.get(rest)
                    if choice is None:
                        # SecondarySight (cost 0, in no Equipment list) is the slot itself, not a choice.
                        if info['offered']:
                            problems.append(f'{w}: offered Optic Accessory of unknown family {PurePosixPath(rec).name}')
                        continue
                    mapped.add(rec.lower())
                    all_family[choice].append(rec)
                    if info['offered']:
                        files_offered[choice].append(rec)
                for i in sorted(listed - set(files_offered)):
                    if i not in all_family:
                        diffs.append(('c', w, slot, i, 'no record', 'listed', 'no Optic Accessory record of the family'))
                    else:
                        why = '; '.join(f'{PurePosixPath(r).name}: {failing(records[r])}' for r in all_family[i])
                        diffs.append(('b', w, slot, i, 'not offered', 'listed', why))
                for i in sorted(set(files_offered) - listed):
                    diffs.append(('a', w, slot, i, 'offered', 'not listed', ', '.join(PurePosixPath(r).name for r in files_offered[i])))
                counts[slot].update(site=len(listed), files=len(files_offered), agree=len(listed & set(files_offered)))
                continue
            agree = 0
            for i in sorted(listed):
                recs = rows.get((w, slot, i))
                if not recs:
                    diffs.append(('c', w, slot, i, 'no record', 'listed', 'no identity row'))
                    continue
                infos = [by_lower.get(r.lower()) for r in recs]
                mapped |= {r.lower() for r in recs}
                if any(x and x['offered'] for x in infos):
                    agree += 1
                else:
                    state = '; '.join(failing(x) for x in infos)
                    diffs.append(('b', w, slot, i, f'not offered: {state}', 'listed',
                                  ', '.join(PurePosixPath(r).name for r in recs)))
            counts[slot].update(site=len(listed), agree=agree)
        # (a) offered records with no site entry.
        files_count = Counter()
        own_slot = {r.lower(): s for (ww, s, _), recs in rows.items() if ww == w for r in recs}
        for rec, info in sorted(records.items()):
            code, rest = split_record(PurePosixPath(rec).name, weapon)
            if code == 'SCA':
                continue        # accessories are compared by family, above
            slot = own_slot.get(rec.lower())
            if not slot and rest and suffix_slot.get(f'{code}_{rest}'.lower()):
                slot = suffix_slot[f'{code}_{rest}'.lower()].most_common(1)[0][0]
            slot = slot or CODE_SLOT.get(code, (code or '?').lower())
            if info['offered']:
                files_count[slot] += 1
            if info['offered'] and rec.lower() not in mapped:
                if entries is None:
                    entries = aam_names(files, folder, weapon, strings)
                name = name_of(PurePosixPath(rec).name, weapon, entries) or 'no AAM name entry'
                diffs.append(('a', w, slot, PurePosixPath(rec).name, 'offered', 'not listed', name))
        for slot, n in files_count.items():
            if slot in counts:
                counts[slot]['files'] += n
            else:
                counts.setdefault(slot, Counter())['files'] += n

    # Deviations.
    overrides = []
    if args.overrides.exists():
        overrides = [o for o in json.loads(args.overrides.read_text(encoding='utf-8'))['overrides']
                     if o.get('generator') == GENERATOR]
    found = {(d[1], d[2], d[3]): d for d in diffs}
    covered, report = set(), []
    for o in overrides:
        key = (o['weapon'], o['slot'], o['id'])
        d = found.get(key)
        if d is None:
            listed = o['id'] in site.get((o['weapon'], o['slot']), set())
            status = 'REDUNDANT' if (o['siteValue'] == 'listed') == listed else 'UNUSED'
        elif d[4] != o['sourceValue'] or d[5] != o['siteValue']:
            status = 'STALE'
        else:
            status = 'applied'
            covered.add(key)
        report.append({'overrideId': o.get('overrideId'), 'weapon': key[0], 'slot': key[1], 'id': key[2], 'status': status,
                       'source': d[4] if d else None, 'reviewedSource': o['sourceValue'], 'kind': o.get('kind')})

    names = {'a': 'OFFERED BY FILES, NOT ON SITE', 'b': 'ON SITE, NOT OFFERED BY FILES', 'c': 'ON SITE, NO MAPPED RECORD'}
    print(f'{len(verdicts)} weapons, {sum(len(v) for v in verdicts.values())} records, {registries} kill-switch registries, '
          f'{sum(len(v) for v in kst.values())} kill-switch rows')
    for slot in SITE_SLOTS:
        c = counts[slot]
        print(f'  {slot:9} site {c["site"]:5}  files {c["files"]:5}  agree {c["agree"]:5}')
    other = {s: c['files'] for s, c in counts.items() if s not in SITE_SLOTS}
    if other:
        print(f'  offered records of other slot codes: {other}')
    for finding in 'abc':
        rows_f = [d for d in diffs if d[0] == finding]
        print(f'{names[finding]}: {len(rows_f)} ({sum(1 for d in rows_f if (d[1], d[2], d[3]) in covered)} with an applied deviation row)')
        for d in rows_f:
            mark = ' [deviation]' if (d[1], d[2], d[3]) in covered else ''
            print(f'  {d[1]} {d[2]} {d[3]}: {d[4]} | {d[6]}{mark}')
    for r in report:
        if r['status'] != 'applied':
            print(f'DEVIATION {r["status"]}: {r["overrideId"]} {r["weapon"]} {r["slot"]} {r["id"]} (files: {r["source"]}, reviewed: {r["reviewedSource"]})')
    print(f'deviations: {Counter(r["status"] for r in report)}')
    for p in problems:
        print(f'PROBLEM {p}')

    # Firearms only: weapon folders with an Equipment_<W> and a <W>_WB file (melee has no WB file).
    signal = release_signal(files, sorted({PurePosixPath(k).name[len('equipment_'):]
                                           for k in files.routes if k.startswith('common/hardware/weapons/')
                                           and PurePosixPath(k).name.startswith('equipment_')
                                           and f'{PurePosixPath(k).parent}/{PurePosixPath(k).name[10:]}_wb' in files.routes}))
    site_internal = {v: k for k, v in internal.items()}
    # Not a gate: a whole weapon has no stored on/off flag (GAME_UPDATE_GUIDE.md).
    print('release signal: GRX_Weapons rows (<W>_WB.* / GS_<W>.*) and loot rows (Weapon_<class>_*<W>*), for weapons')
    print('not on the site and site weapons with no GRX_Weapons row (none = not released):')
    for w, (g, l, has_g, has_l) in sorted(signal.items()):
        if w not in site_internal or not g:
            print(f'  {w}{" (site " + site_internal[w] + ")" if w in site_internal else ""}: GRX_Weapons {g}, loot {l}'
                  f' -> {"released" if g else "not released"}' + ('' if has_g and has_l else ' [registry not in capture]'))

    if args.report_out:
        args.report_out.write_text(json.dumps({
            'generatedBy': 'scripts/frosty-availability.py', 'sourceForm': 'raw', 'mapping': args.mapping.name,
            'differences': [dict(zip(('finding', 'weapon', 'slot', 'id', 'source', 'site', 'detail'), d)) for d in diffs],
            'deviations': report, 'problems': problems,
            'records': {w: verdicts[w] for w in sorted(verdicts)},
            'releaseSignal': {w: {'grxWeapons': s[0], 'loot': s[1]} for w, s in sorted(signal.items())},
        }, indent=1, sort_keys=True) + '\n', encoding='utf-8')
    failed = problems or any((d[1], d[2], d[3]) not in covered for d in diffs) or any(r['status'] != 'applied' for r in report)
    if args.check and failed:
        sys.exit(1)


if __name__ == '__main__':
    main()

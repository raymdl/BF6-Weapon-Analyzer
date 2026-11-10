"""Check the ammunition effects (data/ammo.json) and projectile values (data/ballistics.json) against the raw
capture (a checker: it writes no site data).

Field readers follow the research repo's update reader part B (scripts/update-readers/B/derive.py and
compare.py; README.md there), with three changes: identity comes from the reviewed point-cost mapping (so the
LMG Polymer Links records are the site's Lightweight), every projectile key of ballistics.json is read from its
own file (part B read only projectiles reached from a weapon, so it reported PD_.375EnABELR_API, the ELR-40
Single Shot bullet, as "in neither build"), and floats are compared as float32 (no six-decimal rounding).
Material grids are never opened: hit zones and collateral are not read here.

Joins, per site weapon (identity file --identities: site id -> internal name) and site ammunition id (point-cost
mapping --mapping, slot "ammo": weapon + id -> Attachment_<W>_AMO_* record):
  WB  <internal>_WB      firing object Class_35259f6b, Shot Field_58d70acb: bullet Field_808dd66c (base
                          projectile), InitialSpeed.z Field_0bf4f62b.Field_32a99b9c (GRX_Weapons row
                          <WB>.WeaponEntityData.WeaponFiring.PrimaryFire.Shot.InitialSpeed.z overrides);
                          modifier lists Field_0cd9f20f -> WPM package (selectors Field_819acc98, effects Field_9690d604)
  GS  GS_<internal>      bindings (modifier Field_2f0e5b83, selector Field_6d011165)
  record                 Attachment_* id Field_de6f63b3, unlock Field_157a7d74
  ability                <internal>_Ability branch list Field_d7605aab; branch unlock Field_f86e0433, actions
                          Field_ffba60f0 -> Field_7e54e22c selectors (U_WPM_*)
  Equipment_<internal>   presets Field_6780584d; default preset Field_b656da95 true; ids Field_6bf3cb97[].Field_c1ad37da
                          (2.1.2.0: Field_3538f6ad[].Field_5bed6412.Field_c1ad37da)
  PD  _Bullets/PD_*      gravity Field_d9d33d20, drag Field_30c37c24 (rows <PD>.BulletEntityData.Gravity / .Drag override),
                          damage curve Field_2ad7e688 (row <PD>.BulletEntityData.TweakableDamageCurve.XYValues overrides),
                          TimeToLive Field_5ef7b9a1 (reported; the site stores no lifetime)
Effects reached by the ammunition's selectors (FIELD_MAP.md):
  Class_303a33cc Field_c427eabf  ADS move step (site adsMoveSpeedTierShift = -step)
  Class_5830cb87 Field_8359723e  health regeneration delay added, s
  Class_0045e7fa Field_6f8d5f40 / Field_d98b0371  in-world / minimap spot factors (product)
  Class_3e93759b Field_6a5c4efd  muzzle velocity factor (velocityTreatments)
  Class_ef0525cd Field_db0fcea2  pellets (projectileOverrides.pellets)
  any effect Field_808dd66c -> _Bullets/  projectile swap (ballistics.json weapons[].ammo; projectileOverrides.dmg)
  GS Class_bb838ff6  recoil amount steps (zoomed Field_6b84de87 / unzoomed Field_7b609515 . Field_22ce7cf3 . Field_4692836a)
  GS Class_743a3ce0 on a GDM_Array_HipDispersion_* asset: hip spread step Field_9540bd8e.Field_4692836a (site -step)
  GS Class_5e5631ff  set operands (Field_bbffe8bc true, value Field_bbbfe9cc) on zoomed dispersion fields
                     (site adsSpreadDynOverride)
  read as evidence only: Class_e85fff64 protection steps (hit zones), Class_d11a23a2 penetration steps (collateral),
  recoil variation steps (Field_02433593); known and not stored: Class_96bab3b8 (sound), Class_b1afeb65 (carries the swap).
  Any other effect class is listed as unread and counted.

Families the checker does not own are in NOT_OWNED and counted; any other key stops the run.

Known deviations (--overrides, rows with generator "frosty-ammo"; key weapon / slot / id / field) carry
sourceValue (the computed value) and siteValue (the committed value; null = absent). Each row is reported
applied, STALE (the source or the site moved), REDUNDANT (site and source now agree) or UNUSED (no such
difference); --check exits 1 unless every difference has an applied row and every row is applied.
"""
import argparse
from collections import Counter, OrderedDict, defaultdict
import importlib.util
import json
import math
from pathlib import Path, PurePosixPath
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
GENERATOR = 'frosty-ammo'
F = lambda h: 'Field_' + h
NAME = F('0c59fa06')
SHOT = '.WeaponEntityData.WeaponFiring.PrimaryFire.Shot.'
ZOOM, UNZOOM = F('6b84de87'), F('7b609515')

# (file, family): where the checker reads it.
OWNED = OrderedDict([
    ('WEAPON_AMMO.def', 'Equipment_<W> default preset (Field_b656da95) id list, matched to the record id Field_de6f63b3'),
    ('adsRecoilTierMod', 'GS Class_bb838ff6 zoomed amount step, catalogue value merged with effectOverrides'),
    ('hipRecoilTierMod', 'GS Class_bb838ff6 unzoomed amount step, catalogue value merged with effectOverrides'),
    ('adsMoveSpeedTierShift', 'Class_303a33cc Field_c427eabf, negated'),
    ('healthRegenDelayAddS', 'Class_5830cb87 Field_8359723e'),
    ('worldSpotMult', 'Class_0045e7fa Field_6f8d5f40'),
    ('minimapSpotMult', 'Class_0045e7fa Field_d98b0371'),
    ('hipSpreadTierMod', 'GS Class_743a3ce0 on GDM_Array_HipDispersion_*, negated'),
    ('adsSpreadDynOverride', 'GS Class_5e5631ff zoomed set operands'),
    ('velocityTreatments', 'Class_3e93759b Field_6a5c4efd: tier = log0.8(factor), or base InitialSpeed.z x factor (float32)'),
    ('projectileOverrides', 'pellets Class_ef0525cd Field_db0fcea2; dmg = swap projectile damage curve'),
    ('ballistics.projectiles', 'PD_* gravity / drag (registry rows override) and BulletEntityData object GUID'),
    ('ballistics.weapons', 'base = WB Shot bullet; ammo = swap projectile, else base'),
])
NOT_OWNED = OrderedDict([
    ('AMMO.id', 'join key (point-cost mapping rows)'),
    ('AMMO.name', 'editorial: menu label; several are abbreviations (Sub HP, Range Pen) that are not in-game strings'),
    ('AMMO.collateralMult', 'fallback per class behind balance_tables COLLATERAL_MULT_OVERRIDE; needs the collateral table '
                            '(delegate resource or material grid), not ordinary EBX: see frosty-collateral.py'),
    ('WEAPON_AMMO.ammo', 'roster: frosty-availability.py; costs: frosty-point-costs.py'),
    ('velocityTreatments.displayRounding', 'site display convention'),
    ('velocityTreatments.combinesWith', 'site modelling note'),
    ('ballistics.source', 'provenance block (build label, XML-export hashes, attachment trace)'),
])
AMMO_KEYS = {'id', 'name', 'collateralMult', 'adsRecoilTierMod', 'hipRecoilTierMod', 'adsMoveSpeedTierShift',
             'healthRegenDelayAddS', 'worldSpotMult', 'minimapSpotMult', 'hipSpreadTierMod', 'adsSpreadDynOverride'}
EFFECT_FIELDS = ['adsRecoilTierMod', 'hipRecoilTierMod', 'adsMoveSpeedTierShift', 'healthRegenDelayAddS',
                 'worldSpotMult', 'minimapSpotMult', 'hipSpreadTierMod', 'adsSpreadDynOverride']
NEUTRAL = {'adsRecoilTierMod': 0, 'hipRecoilTierMod': 0, 'adsMoveSpeedTierShift': 0, 'healthRegenDelayAddS': 0,
           'worldSpotMult': 1, 'minimapSpotMult': 1, 'hipSpreadTierMod': 0, 'adsSpreadDynOverride': None}
WEAPON_AMMO_KEYS = {'def', 'ammo', 'effectOverrides', 'velocityTreatments', 'projectileOverrides'}
KNOWN_QUIET = {'Class_96bab3b8': 'sound', 'Class_b1afeb65': 'projectile swap carrier'}


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def signed(v):
    return v - (1 << 32) if isinstance(v, int) and not isinstance(v, bool) and v >= 1 << 31 else v


def w32(x):
    return struct.unpack('<f', struct.pack('<f', x))[0]


class Reader:
    def __init__(self, fw, files, registry):
        self.fw, self.files, self.registry = fw, files, registry
        self.projectiles = {}

    def proper(self, route):
        return self.files.routes.get(route.lower(), route)

    def projectile(self, route, guid=None):
        """Source values of one PD_* bullet. guid None: the file's single BulletEntityData object."""
        key = self.proper(route)
        if key in self.projectiles and (guid is None or self.projectiles[key].get('guid') == guid):
            return key
        objs = self.files.objects(route)
        if objs is None:
            self.projectiles[key] = {'error': 'not in the capture'}
            return key
        if guid is None:
            cands = [o for o in objs if F('30c37c24') in o and F('d9d33d20') in o]
            if len(cands) != 1:
                self.projectiles[key] = {'error': f'{len(cands)} bullet objects'}
                return key
            o = cands[0]
        else:
            o = next((x for x in objs if (x.get('$guid') or '').lower() == guid.lower()), None)
            if o is None:
                self.projectiles[key] = {'error': f'no object {guid}'}
                return key
        name = (objs[0].get(NAME) or key).rsplit('/', 1)[-1]
        reg = self.registry
        grav_r, drag_r = reg.get(name + '.BulletEntityData.Gravity'), reg.get(name + '.BulletEntityData.Drag')
        ttl_r = reg.get(name + '.BulletEntityData.TimeToLive')
        _, c = self.files.deref(o.get(F('2ad7e688')), objs)
        flat = (c or {}).get(F('5279388d')) or []
        pts = [[p[F('3901db14')], p[F('42fc0f5e')]] for p in (c or {}).get(F('edfc6df6')) or []] or \
              [[flat[i], flat[i + 1]] for i in range(0, len(flat) - 1, 2)]
        rv = reg.rows.get(name + '.BulletEntityData.TweakableDamageCurve.XYValues')
        regpts = None
        if isinstance(rv, dict):
            a = rv.get(F('ffba60f0')) or []
            regpts = [[a[i], a[i + 1]] for i in range(0, len(a) - 1, 2)]
        self.projectiles[key] = {
            'guid': (o.get('$guid') or '').lower(), 'name': name,
            'gravityOwn': o.get(F('d9d33d20')), 'gravityRegistry': grav_r,
            'dragOwn': o.get(F('30c37c24')), 'dragRegistry': drag_r,
            'gravityMps2': grav_r if grav_r is not None else o.get(F('d9d33d20')),
            'dragPerMeter': drag_r if drag_r is not None else o.get(F('30c37c24')),
            'timeToLive': ttl_r if ttl_r is not None else o.get(F('5ef7b9a1')),
            'curve': regpts or pts, 'curveFrom': 'registry' if regpts else 'file',
        }
        return key


def weapon_graph(rd, internal):
    """Routes, base projectile, base velocity, default preset ids and the selector maps of one weapon."""
    files, fw = rd.files, rd.fw
    wb, gs = fw.weapon_routes(files, internal)
    folder = wb.rsplit('/', 1)[0]
    wobjs, gobjs = files.objects(wb), files.objects(gs)
    wbname = wobjs[0][NAME].rsplit('/', 1)[-1]
    fire = next(o for o in wobjs if o['$class'] == 'Class_35259f6b' and isinstance(o.get(F('58d70acb')), dict))
    shot = fire[F('58d70acb')]
    br, bg = files.imp(shot[F('808dd66c')])
    base = rd.projectile(br, bg)
    vreg = rd.registry.get(wbname + SHOT + 'InitialSpeed.z')
    velocity = vreg if vreg is not None else shot[F('0bf4f62b')][F('32a99b9c')]
    mods = defaultdict(list)

    def lists(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k == F('0cd9f20f') and isinstance(v, list):
                    for m in v:
                        r, mo = files.deref(m, wobjs)
                        if mo is None:
                            continue
                        for s in mo.get(F('819acc98')) or []:
                            mods[str(s).lower()].append((r, mo))
                else:
                    lists(v)
        elif isinstance(x, list):
            for v in x:
                lists(v)
    lists(wobjs)
    binds = defaultdict(list)

    def bind(x):
        if isinstance(x, dict):
            if F('2f0e5b83') in x and F('6d011165') in x:
                binds[str(x[F('6d011165')]).lower()].append(x)
            for v in x.values():
                bind(v)
        elif isinstance(x, list):
            for v in x:
                bind(v)
    bind(gobjs)
    ability = files.objects(folder + '/' + internal.lower() + '_ability') or []
    branches = defaultdict(list)
    root = next((o for o in ability if F('d7605aab') in o), None)
    for m in (root or {}).get(F('d7605aab')) or []:
        _, b = files.deref(m, ability)
        u = files.imp((b or {}).get(F('f86e0433')))
        if u and u[0]:
            branches[u[0].lower()].append(b)
    defaults, presets = [], 0
    for key in sorted(files.routes):
        if key.startswith(folder + '/equipment_') and key.count('/') == folder.count('/') + 1:
            for p in files.objects(key)[0].get(F('6780584d')) or []:
                ids = [x.get(F('c1ad37da')) for x in p.get(F('6bf3cb97')) or []] or \
                      [(x.get(F('5bed6412')) or {}).get(F('c1ad37da')) for x in p.get(F('3538f6ad')) or []]
                presets += 1
                if p.get(F('b656da95')):
                    defaults.append(ids)
    return {'wb': files.routes[wb], 'gs': files.routes[gs], 'wbObjects': wobjs, 'gsObjects': gobjs,
            'ability': ability, 'base': base, 'velocity': velocity, 'velocityFrom': 'registry' if vreg is not None else 'file',
            'mods': mods, 'binds': binds, 'branches': branches, 'defaults': defaults, 'presets': presets}


def set_operands(x):
    """{dispersion field hash: value} of the operands a Class_5e5631ff sets; other non-neutral operands as 'other'."""
    out, other = {}, []

    def walk(v, path):
        if isinstance(v, dict):
            if F('bbffe8bc') in v:
                if v.get(F('bbffe8bc')):
                    out.setdefault(path[-1], set()).add(v.get(F('bbbfe9cc')))
                elif (v.get(F('4692836a')) or 0) != 0 or v.get(F('5695ee1c'), 1) != 1 or v.get(F('98a799ba'), 1) != 1:
                    other.append(path)
                return
            for k, w in v.items():
                walk(w, path + [k[6:] if k.startswith('Field_') else k])
    walk(x, [])
    return out, other


def ammo_effects(rd, g, record_route):
    """Effects of one ammunition record on its weapon."""
    files = rd.files
    objs = files.objects(record_route)
    if not objs:
        return None, 'record not in the capture'
    rec = objs[0]
    u = files.imp(rec.get(F('157a7d74')))
    branches = g['branches'].get((u[0] or '').lower(), []) if u else []
    if len(branches) != 1:
        return None, f'{len(branches)} ability branches for the record unlock'
    src = {'recordId': rec.get(F('de6f63b3')), 'swaps': set(), 'velocity': [], 'adsMove': 0, 'regen': 0.0,
           'world': 1.0, 'minimap': 1.0, 'adsRecoil': 0, 'hipRecoil': 0, 'adsRecoilVar': 0, 'hipRecoilVar': 0,
           'hipSpread': 0, 'adsSpreadDyn': {}, 'pellets': [], 'protection': 0, 'penetration': [], 'unread': [],
           'assets': []}
    seen = set()
    for am in branches[0].get(F('ffba60f0')) or []:
        _, act = files.deref(am, g['ability'])
        for sel_ref in (act or {}).get(F('7e54e22c')) or []:
            sel = files.imp(sel_ref)
            if not sel or not sel[0] or '/_weaponmodifiers/' not in sel[0].lower():
                continue
            effects = []
            for mr, mo in g['mods'].get(sel[1], []):
                for e in mo.get(F('9690d604')) or []:
                    er, eo = files.deref(e, files.objects(mr) if mr else g['wbObjects'])
                    effects.append((er or mr, eo, False))
            for bd in g['binds'].get(sel[1], []):
                gr, go = files.deref(bd[F('2f0e5b83')], g['gsObjects'])
                effects.append((gr, go, True))
            for route, eo, gs in effects:
                if eo is None:
                    src['unread'].append(f'missing effect object in {route}')
                    continue
                ident = (route, eo.get('$guid'), gs)
                if ident in seen:
                    continue
                seen.add(ident)
                if route and '/muzzlevfx/' in route.lower():
                    continue
                cls = eo['$class']
                asset = PurePosixPath(route or 'WB').name
                src['assets'].append(asset)
                ref = files.imp(eo.get(F('808dd66c')))
                if ref and ref[0] and '/_bullets/' in ref[0].lower():
                    src['swaps'].add(rd.projectile(ref[0], ref[1]))
                if gs and cls == 'Class_bb838ff6':
                    for aim, key in ((ZOOM, 'ads'), (UNZOOM, 'hip')):
                        blk = eo.get(aim) or {}
                        src[key + 'Recoil'] += signed((blk.get(F('22ce7cf3')) or {}).get(F('4692836a')) or 0)
                        src[key + 'RecoilVar'] += signed((blk.get(F('02433593')) or {}).get(F('4692836a')) or 0)
                elif gs and cls == 'Class_743a3ce0' and 'hipdispersion' in asset.lower():
                    src['hipSpread'] += signed((eo.get(F('9540bd8e')) or {}).get(F('4692836a')) or 0)
                elif gs and cls == 'Class_5e5631ff':
                    zoomed, other = set_operands(eo.get(ZOOM) or {})
                    unzoomed, other_hip = set_operands(eo.get(UNZOOM) or {})
                    if other or other_hip:
                        src['unread'].append(f'{asset}: non-set operands {other + other_hip}')
                    if unzoomed:
                        src['unread'].append(f'{asset}: unzoomed set operands {sorted(unzoomed)}')
                    for h, vals in zoomed.items():
                        src['adsSpreadDyn'].setdefault(h, set()).update(vals)
                elif cls == 'Class_303a33cc':
                    src['adsMove'] += signed(eo.get(F('c427eabf')))
                elif cls == 'Class_5830cb87':
                    src['regen'] += eo.get(F('8359723e'))
                elif cls == 'Class_0045e7fa':
                    src['world'] *= eo.get(F('6f8d5f40'), 1.0)
                    src['minimap'] *= eo.get(F('d98b0371'), 1.0)
                elif cls == 'Class_3e93759b':
                    f = eo.get(F('6a5c4efd'))
                    if f is not None and f != 1.0:
                        src['velocity'].append((asset, f))
                elif cls == 'Class_ef0525cd':
                    src['pellets'].append(eo.get(F('db0fcea2')))
                elif cls == 'Class_e85fff64':
                    src['protection'] += signed(eo.get(F('fbfacac9')))
                elif cls == 'Class_d11a23a2':
                    src['penetration'].append(signed(eo.get(F('fbfacac9'))))
                elif cls not in KNOWN_QUIET:
                    src['unread'].append(f'{asset} {cls}{" (GS)" if gs else ""}')
    return src, None


def dyn_key(fw, h):
    return next((k for k, _, hh in fw.DYN if hh == h), 'Field_' + h)


def main():
    raw_tree = load('raw_tree', ROOT / 'scripts/frosty-raw-tree.py')
    fw = load('frosty_weapons', ROOT / 'scripts/frosty-weapons.py')
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    raw_tree.add_raw_arguments(parser)
    parser.add_argument('--identities', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-weapon-identities-2026-11-10.json',
                        help='Reviewed identity rows: site weapon id -> internal name')
    parser.add_argument('--mapping', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-point-cost-mapping-2026-11-10.json',
                        help='Reviewed attachment identity rows (slot "ammo": weapon + id -> Attachment_*_AMO_* record)')
    parser.add_argument('--overrides', type=Path, default=ROOT / 'data-src/overrides-ammo.json',
                        help='Reviewed deviations; rows with generator "frosty-ammo" are read')
    parser.add_argument('--report-out', type=Path, help='Write every source value and difference as JSON')
    parser.add_argument('--check', action='store_true', help='Exit 1 on any difference not covered by an applied deviation row')
    args = parser.parse_args()
    if not args.raw:
        parser.error('raw mode only: give --raw, --descriptors and --catalog')
    export = raw_tree.open_input(parser, args, None).export
    files = fw.Files(raw_tree, export)
    registry = fw.Registry(files)
    rd = Reader(fw, files, registry)

    ammo = json.loads((ROOT / 'data/ammo.json').read_text(encoding='utf-8'))
    ball = json.loads((ROOT / 'data/ballistics.json').read_text(encoding='utf-8'))
    mags = json.loads((ROOT / 'data/attachments.json').read_text(encoding='utf-8'))['WEAPON_MAG']
    ids = {r['siteId']: r['internalId'] for r in json.loads(args.identities.read_text(encoding='utf-8'))['weapons']}
    mapping = {(r['weapon'], r['id']): r['records'] for r in json.loads(args.mapping.read_text(encoding='utf-8'))['rows']
               if r['slot'] == 'ammo'}
    catalog = {a['id']: a for a in ammo['AMMO']}

    problems, diffs, compared = [], [], set()
    counts = defaultdict(Counter)
    unread = defaultdict(list)
    evidence = {}

    def check(key, family, site, source, derived=False):
        c = fw.compare(site, source, derived=derived)
        compared.add(key)
        counts[family]['leaves'] += 1
        counts[family]['equal'] += c == 'equal'
        if c != 'equal':
            diffs.append((key, site, source, c))

    for a in ammo['AMMO']:
        extra = set(a) - AMMO_KEYS
        if extra:
            problems.append(f'AMMO {a["id"]}: keys neither owned nor listed as not owned: {sorted(extra)}')
        for k in ('id', 'name', 'collateralMult'):
            if k in a:
                counts['AMMO.' + k]['stored'] += 1

    for w, wa in ammo['WEAPON_AMMO'].items():
        extra = set(wa) - WEAPON_AMMO_KEYS
        if extra:
            problems.append(f'{w}: WEAPON_AMMO keys neither owned nor listed as not owned: {sorted(extra)}')
        counts['WEAPON_AMMO.ammo']['stored'] += 1
        if w not in ids:
            problems.append(f'{w}: no identity row')
            continue
        try:
            g = weapon_graph(rd, ids[w])
        except (ValueError, KeyError, StopIteration, TypeError) as error:
            problems.append(f'{w}: weapon files not read ({error!r})')
            continue
        ev = evidence[w] = {'wb': g['wb'], 'gs': g['gs'], 'base': g['base'], 'baseVelocity': g['velocity'],
                            'baseVelocityFrom': g['velocityFrom'], 'defaultPresets': len(g['defaults']), 'ammo': {}}
        srcs = {}
        for aid in wa['ammo']:
            recs = mapping.get((w, aid))
            if not recs:
                problems.append(f'{w}/{aid}: no mapping row')
                continue
            got = [ammo_effects(rd, g, r) for r in recs]
            errs = [e for _, e in got if e]
            if errs:
                problems.append(f'{w}/{aid}: {"; ".join(errs)}')
                continue
            src = got[0][0]
            srcs[aid] = src
            if src['unread']:
                unread[w].extend(f'{aid}: {u}' for u in src['unread'])
            proj = sorted(src['swaps'])
            ev['ammo'][aid] = {'record': recs[0], 'recordId': src['recordId'], 'projectile': proj or None,
                               'velocityFactors': src['velocity'], 'pellets': src['pellets'], 'protectionSteps': src['protection'],
                               'penetrationSteps': src['penetration'], 'recoilVariation': [src['adsRecoilVar'], src['hipRecoilVar']],
                               'assets': src['assets']}
            if len(proj) > 1:
                problems.append(f'{w}/{aid}: conflicting projectile swaps {proj}')

        # Default ammunition.
        defs = [aid for aid, s in srcs.items() if any(s['recordId'] in d for d in g['defaults'])]
        check((w, 'ammo', '-', 'def'), 'WEAPON_AMMO.def', wa.get('def'), defs[0] if len(defs) == 1 else defs)

        for aid, s in srcs.items():
            eff = {**catalog.get(aid, {}), **(wa.get('effectOverrides') or {}).get(aid, {})}
            dyn = {}
            for h, vals in s['adsSpreadDyn'].items():
                dyn[dyn_key(fw, h)] = sorted(vals)[0] if len(vals) == 1 else sorted(vals)
            source = {'adsRecoilTierMod': s['adsRecoil'], 'hipRecoilTierMod': s['hipRecoil'],
                      'adsMoveSpeedTierShift': -s['adsMove'], 'healthRegenDelayAddS': s['regen'],
                      'worldSpotMult': s['world'], 'minimapSpotMult': s['minimap'], 'hipSpreadTierMod': -s['hipSpread'],
                      'adsSpreadDynOverride': dyn or None}
            for f in EFFECT_FIELDS:
                sv = eff.get(f, NEUTRAL[f])
                if f == 'adsSpreadDynOverride':
                    for p in sorted(set(dict(fw.leaves(sv or {}, f))) | set(dict(fw.leaves(source[f] or {}, f))) - {f}):
                        check((w, 'ammo', aid, p), f, dict(fw.leaves(sv or {}, f)).get(p, '<absent>'),
                              dict(fw.leaves(source[f] or {}, f)).get(p, '<absent>'))
                else:
                    check((w, 'ammo', aid, f), f, sv, source[f])
            # Velocity treatment.
            vt = (wa.get('velocityTreatments') or {}).get(aid)
            for k in ('displayRounding', 'combinesWith'):
                if vt and k in vt:
                    counts['velocityTreatments.' + k]['stored'] += 1
            facs = [f for _, f in s['velocity']]
            if not facs:
                check((w, 'ammo', aid, 'velocityTreatments'), 'velocityTreatments', vt, None)
            elif len(facs) > 1:
                check((w, 'ammo', aid, 'velocityTreatments'), 'velocityTreatments', vt, f'factors {facs}')
            else:
                f = facs[0]
                t = math.log(f) / math.log(0.8)
                if abs(t - round(t)) < 1e-4 and round(t) > 0:
                    gen = {'kind': 'subsonic-tier', 'subsonicVelocityTier': round(t)}
                    sv = {k: vt[k] for k in ('kind', 'subsonicVelocityTier') if vt and k in vt} if vt else None
                    for k in gen:
                        check((w, 'ammo', aid, 'velocityTreatments.' + k), 'velocityTreatments', (sv or {}).get(k, '<absent>'), gen[k])
                else:
                    value = w32(w32(g['velocity']) * w32(f))
                    kind = (vt or {}).get('kind', '<absent>')
                    check((w, 'ammo', aid, 'velocityTreatments.kind'), 'velocityTreatments',
                          'absolute' if kind.endswith('-absolute') else kind, 'absolute')
                    check((w, 'ammo', aid, 'velocityTreatments.subsonicVelocityMps'), 'velocityTreatments',
                          (vt or {}).get('subsonicVelocityMps', '<absent>'), value)
                ev['ammo'][aid]['velocity'] = {'base': g['velocity'], 'factor': f}
            # Projectile override (pellets and damage curve of a swap projectile).
            po = (wa.get('projectileOverrides') or {}).get(aid)
            swap = next(iter(s['swaps']), None)
            base_curve = rd.projectiles[g['base']].get('curve')
            gen = None
            if s['pellets'] or (swap and swap != g['base'] and rd.projectiles[swap].get('curve') != base_curve):
                gen = {'pellets': s['pellets'][0] if len(s['pellets']) == 1 else s['pellets'] or '<base>',
                       'dmg': rd.projectiles[swap or g['base']].get('curve')}
            if po is None and gen is None:
                check((w, 'ammo', aid, 'projectileOverrides'), 'projectileOverrides', None, None)
            else:
                spo = {'pellets': (po or {}).get('pellets', '<absent>'),
                       'dmg': [[p['r'], p['d']] for p in po['dmg']] if po and 'dmg' in po else '<absent>'}
                gpo = gen or {'pellets': '<absent>', 'dmg': '<absent>'}
                check((w, 'ammo', aid, 'projectileOverrides.pellets'), 'projectileOverrides', spo['pellets'], gpo['pellets'])
                a_, b_ = spo['dmg'], gpo['dmg']
                ok = a_ != '<absent>' and b_ not in ('<absent>', None) and len(a_) == len(b_) and all(
                    fw.compare(x, y) == 'equal' for p, q in zip(a_, b_) for x, y in zip(p, q))
                check((w, 'ammo', aid, 'projectileOverrides.dmg'), 'projectileOverrides', a_ if not ok else 'same', b_ if not ok else 'same')

        # Ballistics selections.
        bw = ball['weapons'].get(w)
        if bw is None:
            check((w, 'ballistics', 'base', 'base'), 'ballistics.weapons', '<absent>', g['base'])
        else:
            check((w, 'ballistics', 'base', 'base'), 'ballistics.weapons', bw.get('base'), g['base'])
            for aid in sorted(set(bw.get('ammo', {})) | set(srcs)):
                s = srcs.get(aid)
                gen = (next(iter(s['swaps'])) if s and s['swaps'] else g['base']) if s else '<no source>'
                check((w, 'ballistics', aid, 'projectile'), 'ballistics.weapons', bw.get('ammo', {}).get(aid, '<absent>'), gen)
    for w in sorted(set(ball['weapons']) - set(ammo['WEAPON_AMMO'])):
        problems.append(f'ballistics.json weapon {w} has no WEAPON_AMMO entry')

    # Projectile values: every key of ballistics.json, read from its own file.
    used = {b['base'] for b in ball['weapons'].values()} | {p for b in ball['weapons'].values() for p in b['ammo'].values()}
    mag_routes = {m['projectileOverride']['route'] for wm in mags.values() for m in wm['mags'].values() if m.get('projectileOverride')}
    for key, sp in ball['projectiles'].items():
        k = rd.projectile(key)
        p = rd.projectiles[k]
        if k != key:
            problems.append(f'projectile key {key}: capture path is {k}')
        if 'error' in p:
            problems.append(f'projectile {key}: {p["error"]}')
            continue
        for f in ('gravityMps2', 'dragPerMeter', 'guid'):
            check((None, 'projectile', key, f), 'ballistics.projectiles', sp.get(f, '<absent>'), p[f])
        if key not in used and key not in mag_routes:
            problems.append(f'projectile {key}: referenced by no weapon selection and no magazine projectileOverride')
    for key in sorted(used - set(ball['projectiles'])):
        problems.append(f'projectile {key}: selected by a weapon but has no projectiles entry')
    for key in sorted(mag_routes):
        if key not in ball['projectiles']:
            problems.append(f'magazine projectileOverride route {key} has no projectiles entry')
    for f in ('source',):
        if f in ball:
            counts['ballistics.' + f]['stored'] += 1

    # Deviations.
    overrides = []
    if args.overrides.exists():
        overrides = [o for o in json.loads(args.overrides.read_text(encoding='utf-8'))['overrides'] if o.get('generator') == GENERATOR]
    found = {d[0]: d for d in diffs}
    covered, report = set(), []

    def agrees(value, reviewed):
        if value == '<absent>' and reviewed is None:
            return True
        if isinstance(value, (list, dict)) or isinstance(reviewed, (list, dict)):
            return json.dumps(value) == json.dumps(reviewed)
        return fw.compare(value, reviewed) == 'equal'

    for o in overrides:
        key = (o.get('weapon'), o['slot'], o['id'], o['field'])
        d = found.get(key)
        if d is None:
            status = 'REDUNDANT' if key in compared else 'UNUSED'
        elif not agrees(d[2], o['sourceValue']) or not agrees(d[1], o['siteValue']):
            status = 'STALE'
        else:
            status = 'applied'
            covered.add(key)
        report.append({'overrideId': o.get('overrideId'), 'key': list(key), 'kind': o.get('kind'), 'status': status,
                       'source': d[2] if d else None, 'reviewedSource': o['sourceValue']})

    print(f'{len(evidence)} of {len(ammo["WEAPON_AMMO"])} weapons read; {sum(len(e["ammo"]) for e in evidence.values())} '
          f'ammunition records; {len(rd.projectiles)} projectiles read; registry rows {len(registry.rows)}')
    print('family: equal/compared leaves')
    for family in OWNED:
        c = counts[family]
        print(f'  {family:28} {c["equal"]:5}/{c["leaves"]:5}  ({OWNED[family]})')
    for family in NOT_OWNED:
        print(f'  NOT_OWNED {family:36} stored {counts[family]["stored"]} ({NOT_OWNED[family]})')
    n_unread = sum(len(v) for v in unread.values())
    print(f'  NOT_OWNED unread effect objects: {n_unread} on {len(unread)} weapons '
          f'({dict(Counter(u.split(": ", 1)[1] for v in unread.values() for u in v))})')
    print(f'differences: {len(diffs)} ({dict(Counter(d[3] for d in diffs))}); {len(covered)} with an applied deviation row')
    for key, a, b, c in diffs:
        mark = ' [deviation]' if key in covered else ''
        print(f'  {c.upper():9} {key[0] or "-"} {key[1]} {key[2]} {key[3]}: site {a!r} source {b!r}{mark}')
    for r_ in report:
        if r_['status'] != 'applied':
            print(f'DEVIATION {r_["status"]}: {r_["overrideId"]} {r_["key"]} (source {r_["source"]!r}, reviewed {r_["reviewedSource"]!r})')
    print(f'deviations: {dict(Counter(r_["status"] for r_ in report))} by kind {dict(Counter(r_["kind"] for r_ in report))}')
    for p in problems:
        print(f'PROBLEM {p}')

    if args.report_out:
        args.report_out.write_text(json.dumps({
            'generatedBy': 'scripts/frosty-ammo.py', 'sourceForm': 'raw', 'identities': args.identities.name,
            'mapping': args.mapping.name, 'owned': OWNED, 'notOwned': NOT_OWNED,
            'counts': {k: dict(v) for k, v in counts.items()},
            'differences': [{'key': list(d[0]), 'site': d[1], 'source': d[2], 'class': d[3]} for d in diffs],
            'deviations': report, 'unread': unread, 'problems': problems, 'weapons': evidence,
            'projectiles': rd.projectiles, 'sourceHashes': dict(sorted(files.read.items())),
        }, indent=1, ensure_ascii=False, default=str) + '\n', encoding='utf-8')
    failed = problems or any(d[0] not in covered for d in diffs) or any(r_['status'] != 'applied' for r_ in report)
    if args.check and failed:
        sys.exit(1)


if __name__ == '__main__':
    main()

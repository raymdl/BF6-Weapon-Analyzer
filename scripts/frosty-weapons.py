"""Check the weapon base records (data/weapons.json) against the raw capture (a checker: it writes no site data).

Field readers are ported from the research repo's update reader part A (scripts/update-readers/A/extract.py,
uimeta.py; README.md there), with three corrections: floats are read exactly (that reader rounded every float32
to six decimals before comparing, which produced the 0.0833333 and bolt fire-rate "mismatches"), reloads use the
site rule of docs/frosty/WEAPONS.md ("Reload values": (ReloadDelay + PostReloadDelay + ReloadTimeBulletsLeft) /
ReloadSpeed of ReloadInfoArray[0]; empty = entry [1]; no empty value on shell-fed reloads), and
availableFireModes lists every WB mode, as the site and data/provenance/fire-modes.json do.

Per site weapon (identity file --identities: site id -> internal name and UI record) it reads:
  WB  <internal>_WB      firing object Class_35259f6b: FireLogic Field_f8822efa (rates, modes, bolt, reload
                          entries), Shot Field_58d70acb (speed, pellets, burst rounds, bullet), Ammo Field_4cc9e2ed
                          (MagazineCapacity); root Class_542ac52c handling indices; deploy index Field_2c3e0fbf
  GS  GS_<internal>      Class_539cff9b: recoil Field_c5d1c8fe, dispersion Field_0a5922e0, min/max Field_3ed1c995,
                          HDA/ZDA array rows (Field_ad14dd81 / Field_b5e19f3d at Field_fe708077 / Field_d94fe6ad)
  PD  _Bullets/PD_*      damage curve Field_2ad7e688 (points Field_edfc6df6, flat Field_5279388d)
  GRX_Weapons            registry rows (Field_0c59fa06 name, Field_42c8b257 value) override a file value where
                          one exists, as in part A; every file/registry disagreement is printed
  UI  UIWeaponAbilityMetaData* record Class_593f6146: name Field_fd698f51, description Field_490f0dd0
                          -> Field_3d34898a string id -> fs_us_loc (--strings)
  Attachment-gated fire modes: WB-imported WPM package Class_897c99a7 (selectors Field_819acc98, effects
    Field_9690d604) with a Class_032c7d25 mode effect (primary Field_7313f5d3, alternates Field_2a5a28ee) and
    Class_582cbe36 rate effects; selector -> <W>_Ability branch action Field_7e54e22c -> branch unlock
    Field_f86e0433 -> Attachment_* record Field_157a7d74 -> site ergonomics id (point-cost mapping, --mapping).

Families the checker does not own are in NOT_OWNED and counted; any other key stops the run.
It also checks the per-weapon values part A reads into other files (RELATED below).

Known deviations (--overrides, rows with generator "frosty-weapons"; key weapon + field leaf path) carry
sourceValue (the computed value) and siteValue (the committed value; null = absent). Each row is reported
applied, STALE (the source moved), REDUNDANT (site and source now agree) or UNUSED (no such difference);
--check exits 1 unless every difference has an applied row and every row is applied.
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
GENERATOR = 'frosty-weapons'
F = lambda h: 'Field_' + h
NAME = F('0c59fa06')

# Families of a data/weapons.json record the checker reads from the files.
OWNED = OrderedDict([
    ('id', 'join key: identity file (siteId -> internal name)'),
    ('name', 'UIWeaponAbilityMetaData record Field_fd698f51 -> fs_us_loc'),
    ('description', 'UIWeaponAbilityMetaData record Field_490f0dd0 -> fs_us_loc'),
    ('cls', 'weapon folder class (Common/Hardware/Weapons/<class>/), site class names'),
    ('rpm', 'WB FireLogic RateOfFire / RateOfFireForBurst / RateOfFireForSingleFire by primary mode; bolt cycle'),
    ('fireMode', 'WB FireLogic primary mode Field_16e6fa59 (bolt/pump by folder)'),
    ('availableFireModes', 'WB FireLogic primary + alternates Field_9b956c3d'),
    ('fireModes', 'WB modes plus attachment-gated modes; rates, burst rounds Field_ca2ec42a, BurstsPerMinute, '
                  'GS CMU_SemiAuto/GBM_NoIncrease_Semi binding'),
    ('fireModeAttachments', 'WPM mode package via ability branch and attachment record (see module doc)'),
    ('burstRounds', 'Shot Field_ca2ec42a, on weapons with a burst mode'),
    ('burstBurstsPerMinute', 'FireLogic BurstsPerMinute Field_2320e742 where nonzero'),
    ('burstRpm', 'FireLogic RateOfFireForBurst Field_5bd8006c, when burst is attachment-gated'),
    ('mag', 'WB Ammo MagazineCapacity Field_7f22bfb4; Regular package wpm_mag_std_<internal> when it sets one'),
    ('tacRld', 'ReloadInfoArray[0] (delay + post delay + ReloadTimeBulletsLeft) / ReloadSpeed'),
    ('emptyRld', 'ReloadInfoArray[1] ReloadTimeBulletsLeft / ReloadSpeed (sole [0] entry on revolvers)'),
    ('reloadSpeed', 'ReloadInfoArray[0] ReloadSpeed Field_1c533b56'),
    ('bulletVel', 'Shot InitialSpeed.z Field_0bf4f62b.Field_32a99b9c'),
    ('pellets', 'Shot Field_db0fcea2 where above 1'),
    ('recoilV', 'GS ADS RecoilAmount x RecoilAmountMultiplier ^ exponent'),
    ('recoilDir', 'GS ADS RecoilDirection'),
    ('recoilVar', 'GS ADS RecoilDirectionVariation'),
    ('recoilIncAds', 'GS ADS stationary IncreasePerShot'),
    ('recoil', 'GS recoil blocks Field_c5d1c8fe (zoomed / unzoomed)'),
    ('spreadDyn', 'GS dispersion Field_0a5922e0 stationary (+ moving DistributionExponent)'),
    ('spread', 'GS min/max Field_3ed1c995; HDA/ZDA array rows for the minima'),
    ('dmg', 'PD_* damage curve (GRX XYValues override), compared as one list of [range, damage] points; '
            'the "source" label of every point must read "Frosty"'),
])
NOT_OWNED = OrderedDict([
    ('cal', 'editorial: calibre label; the part A format rule from the bullet asset name (PD_*) gives the site label '
            'on 22 of 68 weapons (12ga (00 Buck), .338 Lapua Mag, NATO spacing are hand labels); the bullet is in the report'),
    ('damageStatus', 'editorial: project acceptance status (DATA_SOURCES.md)'),
    ('damageSource', 'editorial: text naming the curve and the build first read'),
    ('provenance', 'provenance: field-level evidence notes and recorded measurements (provenance.measured)'),
])
# Data sections this check compares, read by frosty-check-all.py --stamp (data/provenance/data-status.json):
# (file, section, fields); fields None = the whole section. NOT_COVERED: (file, section, fields, reason)
# for the families above that no check reads. RELATED_SECTIONS are the copies in other files that related() compares.
RELATED_SECTIONS = [
    ('data/recoil_decay.json', 'RECOIL_DEC', None),
    ('data/recoil_decay.json', 'RECOIL_DEC_TEXP', None),
    ('data/recoil_decay.json', 'RECOIL_DEC_EXP', None),
    ('data/balance_tables.json', 'RECOIL_MULT', None),
    ('data/balance_tables.json', 'HIP_SPREAD_BASE_INDEX', None),
    ('data/balance_tables.json', 'HIP_SPREAD_TABLE[]', ['hipStand (rows a weapon uses)']),
    ('data/balance_tables.json', 'MOVING_ACC_TIERS (rows a weapon uses)', None),
    ('data/attachments.json', 'WEAPON_MAG[]', ['defAds', 'defAms', 'sprintRecoveryBaseIndex', 'deployBaseIndex']),
]
COVERS = [('data/weapons.json', '[]', list(OWNED)), *RELATED_SECTIONS]
NOT_COVERED = [('data/weapons.json', '[]', [k], why) for k, why in NOT_OWNED.items()]

ZOOM, UNZOOM = F('6b84de87'), F('7b609515')
STAT, MOVE, JUMP, MJS = F('0a160c57'), F('e2ae7c09'), F('a059dd20'), F('447d6d51')
STAND, CROUCH, PRONE = F('8c7ee85a'), F('956304be'), F('97ff0ca4')
REG_AIM = {ZOOM: 'Zoomed', UNZOOM: 'Unzoomed'}
REG_STANCE = {STAND: 'Standing', CROUCH: 'Crouching', PRONE: 'Prone'}
REG_MOVE = {STAT: 'Stationary', MOVE: 'Moving', JUMP: 'JumpingSprinting', MJS: 'MovingJumpingSprinting'}
# (site key, registry name, field hash): hashes from the build's tweakable registry names (part A regnames.tsv).
RECOIL = [('dir', 'RecoilDirection', 'f888cb38'), ('amount', 'RecoilAmount', '22810b21'),
          ('amountMult', 'RecoilAmountMultiplier', '50b8fd5b'), ('amountExp', 'RecoilAmountMultiplierExponent', '22ce7cf3'),
          ('dirVar', 'RecoilDirectionVariation', '865174fa'), ('dirVarMult', 'RecoilDirectionVariationMultiplier', '7404fa33'),
          ('dirVarExp', 'RecoilDirectionVariationMultiplierExponent', '02433593'), ('decNorm', 'RecoilDecreaseNorm', '39740463'),
          ('decExp', 'RecoilDecreaseExponent', '9045ba17'), ('decTimeExp', 'RecoilDecreaseTimeExponent', '1d04f0f6'),
          ('decOffset', 'RecoilDecreaseOffset', '04490b34'), ('duration', 'RecoilDuration', '5a02dd65'),
          ('decFactor', 'RecoilDecreaseFactor', '28df1cde'), ('shootingDecScale', 'ShootingRecoilDecreaseScale', '9b46e71d')]
DYN = [('inc', 'IncreasePerShot', '0084b1d1'), ('idleTime', 'IdleTime', 'af333987'),
       ('idleCoef', 'IdleDecreaseCoefficient', '66d08b86'), ('idleExp', 'IdleDecreaseExponent', '0b26c028'),
       ('idleOffset', 'IdleDecreaseOffset', 'aa558d2b'), ('firingCoef', 'FiringDecreaseCoefficient', '2ca8533e'),
       ('firingExp', 'FiringDecreaseExponent', 'f37351e6'), ('firingOffset', 'FiringDecreaseOffset', '1b9eef5d'),
       ('notFiringCoef', 'NotFiringDecreaseCoefficient', 'b5ee0f41'), ('notFiringExp', 'NotFiringDecreaseExponent', '0f79aaed'),
       ('notFiringOffset', 'NotFiringDecreaseOffset', '4d3f0635'), ('firstShotMul', 'FirstShotIncreaseMultiplier', 'bf650805'),
       ('distExp', 'DistributionExponent', '94efea57')]
CLS = {'assaultrifle': 'Assault Rifle', 'carbine': 'Carbine', 'smg': 'SMG', 'mg': 'LMG', 'dmr': 'DMR',
       'boltaction': 'Sniper Rifle', 'shotgun': 'Shotgun', 'pistol': 'Sidearm', 'sidearm': 'Sidearm', 'secondary': 'Sidearm'}
MODE = {0: 'single', 1: 'single', 2: 'auto', 3: 'burst'}
RATE_FIELD = {'single': 'be31b12d', 'auto': '14c4a054', 'burst': '5bd8006c'}
SEMI_NOINC = 'gbm_noincrease_semi_p00'
# Shell-fed reload (docs/frosty/WEAPONS.md "Reload values": no empty value): ReloadInfoArray[0] ReloadType
# Field_6e081af4 0. In 2.1.1.0 and 2.1.2.0 only the M87A1, M1014 and DB-12 store it (1 = revolvers and the
# KTS100 [1] entry, 2 = every other entry).
SHELL_RELOAD_TYPE = 0
GRX = 'common/gamesetup/tweakables/gameremixer/grx_weapons'


def f32(x):
    """Shortest decimal that round-trips the float32 nearest to x (part A lib.f32)."""
    if isinstance(x, bool) or not isinstance(x, float):
        return x
    f = struct.unpack('<f', struct.pack('<f', x))[0]
    for n in range(1, 10):
        s = float('%.*g' % (n, f))
        if struct.unpack('<f', struct.pack('<f', s))[0] == f:
            return int(s) if s == int(s) and abs(s) < 1e15 else s
    return f


def w32(x):
    """The float32 value widened to double (the site stores fireModes rates this way)."""
    return struct.unpack('<f', struct.pack('<f', x))[0]


def div32(a, b):
    """float32 quotient as the shortest round-trip decimal."""
    return f32(w32(w32(a) / w32(b)))


def same32(a, b):
    try:
        return struct.pack('<f', a) == struct.pack('<f', b)
    except (struct.error, TypeError, OverflowError):
        return False


def compare(site, source, derived=False):
    """'equal', 'precision' (equal to 1e-4 relative, not the same value), or 'differs'.

    A value read from a float32 field is equal when both pack to the same float32. A derived value
    computed in double precision (derived=True: bolt/pump fire rate, recoilV) is equal to 1e-12 relative."""
    if isinstance(site, bool) or isinstance(source, bool) or not isinstance(site, (int, float)) or not isinstance(source, (int, float)):
        return 'equal' if site == source else 'differs'
    if site == source or (not derived and same32(site, source)) or (derived and math.isclose(site, source, rel_tol=1e-12)):
        return 'equal'
    if math.isclose(site, source, rel_tol=1e-4, abs_tol=1e-9):
        return 'precision'
    return 'differs'


def leaves(x, p=''):
    if isinstance(x, dict):
        if not x:
            yield p, {}
        for k, v in x.items():
            yield from leaves(v, p + '.' + k if p else k)
    elif isinstance(x, list):
        if not x:
            yield p, []
        for i, v in enumerate(x):
            yield from leaves(v, '%s[%d]' % (p, i))
    else:
        yield p, x


def load_raw_tree():
    spec = importlib.util.spec_from_file_location('raw_tree', ROOT / 'scripts/frosty-raw-tree.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Files:
    """Decoded raw assets by route (lower-case, no extension), exact floats, with import resolution."""

    def __init__(self, raw_tree, export):
        self.decode, self.export = raw_tree.decode, export
        self.routes = {key[:-4]: rel[:-4] for key, (rel, _) in export.files.items()}
        self.path_by_guid = export.builder.path_by_guid
        self.ambiguous = export.builder.ambiguous
        self.cache, self.by_guid_cache = {}, {}
        self.read = {}       # route -> sha256 of every file read

    def get(self, route):
        key = route.lower()
        if key not in self.cache:
            entry = self.export.files.get(key + '.xml')
            if entry is None or 'materialgrid' in key:
                self.cache[key] = None
            else:
                ebx = self.decode.Ebx(entry[1], self.export.types, exact_floats=True)
                self.cache[key] = ebx.decode()
                self.read[self.routes[key]] = ebx.sha256
        return self.cache[key]

    def objects(self, route):
        doc = self.get(route)
        return doc['objects'] if doc else None

    def path(self, guid):
        guid = guid.lower()
        if guid in self.ambiguous:
            raise ValueError(f'file GUID {guid} is listed by more than one asset; give the loaded-cache catalog first')
        return self.path_by_guid.get(guid)

    def imp(self, x):
        """(route or None, class GUID) of an import."""
        if isinstance(x, dict) and '$import' in x:
            i = x['$import']
            return self.path(i['fileGuid']), i['classGuid'].lower()
        return None

    def deref(self, x, objects):
        """(route or None, object or None) behind a $ref or $import."""
        if isinstance(x, dict) and '$ref' in x:
            return None, objects[x['$ref']]
        i = self.imp(x)
        if i and i[0]:
            objs = self.objects(i[0])
            if objs is not None:
                return i[0], next((o for o in objs if (o.get('$guid') or '').lower() == i[1]), None)
        return (i[0] if i else None), None


def unbox(v):
    if isinstance(v, dict) and '$boxedValue' in v:
        bv = v.get('value', v['$boxedValue'])
        return bv.get('value', bv) if isinstance(bv, dict) and 'value' in bv else bv
    return v


class Registry:
    """GRX_Weapons rows: name -> first stored value."""

    def __init__(self, files):
        self.rows = {}
        for o in files.objects(GRX) or []:
            n = o.get(NAME)
            if isinstance(n, str) and n not in self.rows:
                self.rows[n] = unbox(o.get(F('42c8b257')))
        self.found = bool(self.rows)

    def get(self, name):
        v = self.rows.get(name)
        return None if isinstance(v, dict) else v


class Src:
    """File value, overridden by a registry row where one exists (part A extract.Src)."""

    def __init__(self, registry):
        self.registry, self.log = registry, []

    def get(self, label, filev, regname):
        rv = self.registry.get(regname) if regname else None
        self.log.append((label, filev, rv, regname))
        return rv if rv is not None else filev


def weapon_routes(files, internal):
    k = internal.lower()
    wb = [r for r in files.routes if r.startswith('common/hardware/weapons/') and r.endswith('/' + k + '_wb') and '/' + k + '/' in r]
    gs = [r for r in files.routes if r.startswith('common/hardware/weapons/') and r.endswith('/gs_' + k) and '/' + k + '/' in r]
    if len(wb) != 1 or len(gs) != 1:
        raise ValueError(f'{internal}: WB {wb}, GS {gs}')
    return wb[0], gs[0]


def array_rows(files, ref, objects):
    """Rows of an HDA/ZDA array asset referenced from the GS."""
    route, o = files.deref(ref, objects)
    if o is None:
        return None
    aobjs = files.objects(route) if route else objects
    for v in o.values():
        if isinstance(v, list) and v and isinstance(v[0], dict):
            return [files.deref(e, aobjs)[1] if ('$ref' in e or '$import' in e) else e for e in v]
    return None


def read_weapon(files, registry, internal):
    """Source values of one weapon (part A extract.raw, exact floats)."""
    wbr, gsr = weapon_routes(files, internal)
    s = Src(registry)
    out = {'internal': internal, 'wbRoute': files.routes[wbr], 'gsRoute': files.routes[gsr], 'folder': wbr.split('/')[3]}
    wobjs, gobjs = files.objects(wbr), files.objects(gsr)
    wbname = wobjs[0][NAME].rsplit('/', 1)[-1]
    gsname = gobjs[0][NAME].rsplit('/', 1)[-1]
    fires = [o for o in wobjs if o['$class'] == 'Class_35259f6b']
    fire = fires[0]
    gs = next(o for o in gobjs if o['$class'] == 'Class_539cff9b')
    P = wbname + '.WeaponEntityData.WeaponFiring.PrimaryFire.'
    fl, shot, ammo = fire[F('f8822efa')], fire[F('58d70acb')], fire[F('4cc9e2ed')]
    g = s.get
    out['rateOfFire'] = g('rof', fl[F('14c4a054')], P + 'FireLogic.RateOfFire')
    out['rateOfFireSingle'] = g('rofSingle', fl[F('be31b12d')], P + 'FireLogic.RateOfFireForSingleFire')
    out['rateOfFireBurst'] = g('rofBurst', fl[F('5bd8006c')], P + 'FireLogic.RateOfFireForBurst')
    out['burstsPerMinute'] = g('bpm', fl[F('2320e742')], P + 'FireLogic.BurstsPerMinute')
    out['primaryMode'] = fl[F('16e6fa59')]
    out['altModes'] = list(fl[F('9b956c3d')])
    out['burstRounds'] = shot[F('ca2ec42a')]
    ba, BP = fl[F('eebe0fd8')], P + 'FireLogic.BoltAction.'
    out['bolt'] = {k: g('bolt.' + k, ba[F(h)], BP + n) for k, h, n in (
        ('delay', 'caf2ace0', 'BoltActionDelay'), ('time', 'a1abbce8', 'BoltActionTime'), ('speed', '1c57216a', 'BoltActionSpeed'))}
    out['reload'] = []
    for i, e in enumerate(fl[F('d15a0c1c')]):
        RP = P + 'FireLogic.ReloadInfoArray[%d].' % i
        entry = {k: g('reload%d.%s' % (i, k), e[F(h)], RP + n) for k, h, n in (
            ('timeBulletsLeft', 'fc66e75e', 'ReloadTimeBulletsLeft'), ('speed', '1c533b56', 'ReloadSpeed'),
            ('delay', 'c0c7c72f', 'ReloadDelay'), ('postDelay', 'b480c17a', 'PostReloadDelay'))}
        entry['type'] = e[F('6e081af4')]
        out['reload'].append(entry)
    out['mag'] = g('mag', ammo[F('7f22bfb4')], P + 'Ammo.MagazineCapacity')
    out['bulletVel'] = g('vel', shot[F('0bf4f62b')][F('32a99b9c')], P + 'Shot.InitialSpeed.z')
    out['pellets'] = shot[F('db0fcea2')]
    pr, pg = files.imp(shot[F('808dd66c')])
    out['bulletRoute'] = pr
    objs = files.objects(pr)
    bullet = next(o for o in objs if (o.get('$guid') or '').lower() == pg)
    out['bullet'] = (objs[0].get(NAME) or pr).rsplit('/', 1)[-1]
    _, c = files.deref(bullet[F('2ad7e688')], objs)
    flat = c.get(F('5279388d'), []) if c else []
    pts = [[p[F('3901db14')], p[F('42fc0f5e')]] for p in (c or {}).get(F('edfc6df6'), [])] or \
          [[flat[i], flat[i + 1]] for i in range(0, len(flat) - 1, 2)]
    rv = registry.rows.get(out['bullet'] + '.BulletEntityData.TweakableDamageCurve.XYValues')
    regpts = None
    if isinstance(rv, dict):
        a = rv.get(F('ffba60f0'), [])
        regpts = [[a[i], a[i + 1]] for i in range(0, len(a) - 1, 2)]
    s.log.append(('dmg', pts, regpts, out['bullet'] + '...XYValues'))
    out['dmg'] = regpts or pts
    root = next(o for o in wobjs if o['$class'] == 'Class_542ac52c')
    for nm, h in (('WeaponZoomTransitionIndex', 'db03e8a9'), ('SprintSettingsIndex', '5198399a'),
                  ('WeaponZoomedMoveSpeedMultiplierIndex', 'dcb8bf9e')):
        out[nm] = g(nm, root[F(h)][F('2b6f2936')], wbname + '.' + nm + '.Index')
    out['deployIndex'] = [o[F('2c3e0fbf')][F('2b6f2936')] for o in wobjs if F('2c3e0fbf') in o]
    G = gsname + '.'
    out['recoil'] = {}
    for aim, key in ((ZOOM, 'ads'), (UNZOOM, 'hip')):
        blk = gs[F('c5d1c8fe')][aim]
        out['recoil'][key] = {k: g('recoil.%s.%s' % (key, k), blk[F(h)], G + 'Recoil.%s.%s' % (REG_AIM[aim], n)) for k, n, h in RECOIL}
    out['dyn'] = {}
    for aim, key in ((ZOOM, 'ads'), (UNZOOM, 'hip')):
        for mv, mk in ((STAT, 'stat'), (MJS, 'move')):
            blk = gs[F('0a5922e0')][aim][mv]
            out['dyn'][key + '.' + mk] = {k: g('dyn.%s.%s.%s' % (key, mk, k), blk[F(h)], G + 'DispersionBehavior.%s.%s.%s' % (REG_AIM[aim], REG_MOVE[mv], n))
                                          for k, n, h in DYN}
    out['minmax'] = {}
    for aim in (ZOOM, UNZOOM):
        for st in (STAND, CROUCH, PRONE):
            for mv in (STAT, MOVE, JUMP):
                blk = gs[F('3ed1c995')][aim][st].get(mv)
                if blk is None:
                    continue
                rn = G + 'MinMaxDispersion.%s.%s.%s.' % (REG_AIM[aim], REG_STANCE[st], REG_MOVE[mv])
                key = '%s.%s.%s' % (REG_AIM[aim], REG_STANCE[st], REG_MOVE[mv])
                out['minmax'][key] = [g('minmax.' + key + '.min', blk[F('7baf4297')], rn + 'MinAngle'),
                                      g('minmax.' + key + '.max', blk[F('60e4e484')], rn + 'MaxAngle')]
    out['hipIndex'] = g('hipIndex', gs[F('fe708077')], G + 'UnzoomedMinAnglesArrayIndex')
    out['adsMoveIndex'] = g('adsMoveIndex', gs[F('d94fe6ad')], G + 'MovingZoomedMinAnglesArrayIndex')
    hr = array_rows(files, gs[F('ad14dd81')], gobjs)
    out['hipRow'] = None
    if hr is not None and 0 <= out['hipIndex'] < len(hr) and hr[out['hipIndex']]:
        row = hr[out['hipIndex']]
        out['hipRow'] = {'hipStand': row[F('1867639b')], 'hipMove': row[F('c5401fc2')]}
    mr = array_rows(files, gs[F('b5e19f3d')], gobjs)
    out['adsMoveRow'] = None
    if mr is not None and 0 <= out['adsMoveIndex'] < len(mr) and mr[out['adsMoveIndex']]:
        out['adsMoveRow'] = {k[6:]: v for k, v in mr[out['adsMoveIndex']].items() if k.startswith('Field_') and isinstance(v, float)}
    binds = []
    for lst in gs.values():
        if isinstance(lst, list):
            for b in lst:
                if isinstance(b, dict) and F('2f0e5b83') in b:
                    i = files.imp(b[F('2f0e5b83')])
                    binds.append(PurePosixPath(i[0]).name.lower() if i and i[0] else None)
    out['semiNoIncreaseBound'] = SEMI_NOINC in binds
    # Regular magazine package that sets a capacity (part A build.py std_magazine).
    k = 'wpm_mag_std_' + internal.lower()
    out['stdMagazine'] = []
    for route in sorted(r for r in files.routes if PurePosixPath(r).name.startswith(k)):
        for o in files.objects(route):
            if o['$class'] == 'Class_e7d2410a' and o.get(F('7f22bfb4')) not in (None, -1, 0):
                out['stdMagazine'].append((files.routes[route], o.get(F('7f22bfb4'))))
    out['log'] = s.log
    out['wbObjects'] = wobjs
    return out


def mode_gates(files, raw, internal):
    """Attachment records that change the fire modes: [(record route, primary, alternates, rate overrides, package)].

    Route: WB imports a WPM package; its Class_897c99a7 lists selector GUIDs (Field_819acc98) and effects
    (Field_9690d604). A Class_032c7d25 effect sets the primary mode (Field_7313f5d3) and alternates
    (Field_2a5a28ee); a Class_582cbe36 effect stores rates (RateOfFire, RateOfFireForBurst,
    RateOfFireForSingleFire; negative = not replaced). The selector is imported by an action
    (Field_7e54e22c) of a <W>_Ability branch (Field_ffba60f0); the branch's unlock (Field_f86e0433) is the
    Field_157a7d74 unlock of an Attachment_* record in the weapon folder."""
    packages = set()

    def walk(x):
        if isinstance(x, dict):
            if '$import' in x:
                i = files.imp(x)
                if i and i[0] and '/_weaponmodifiers/' in i[0].lower() and PurePosixPath(i[0]).name.lower().startswith('wpm_'):
                    packages.add(i[0])
                return
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(raw['wbObjects'])
    by_selector = defaultdict(list)
    for route in sorted(packages):
        objs = files.objects(route)
        if not objs:
            continue
        for o in objs:
            if o['$class'] != 'Class_897c99a7':
                continue
            effects = [objs[e['$ref']] for e in o.get(F('9690d604')) or [] if isinstance(e, dict) and '$ref' in e]
            modes = [e for e in effects if e['$class'] == 'Class_032c7d25']
            if not modes:
                continue
            rates = {}
            for e in effects:
                if e['$class'] == 'Class_582cbe36':
                    for mode, h in RATE_FIELD.items():
                        v = e.get(F(h))
                        if isinstance(v, float) and v > 0:
                            rates[mode] = v
            for sel in o.get(F('819acc98')) or []:
                by_selector[sel.lower()].append((modes[0][F('7313f5d3')], list(modes[0][F('2a5a28ee')]), rates, route))
    if not by_selector:
        return [], []
    folder = str(PurePosixPath(raw['wbRoute'].lower()).parent)
    ability = files.objects(f'{folder}/{internal.lower()}_ability')
    unlock_gates = defaultdict(list)
    if ability:
        root = next((o for o in ability if F('d7605aab') in o), None)
        for r in (root or {}).get(F('d7605aab')) or []:
            if not (isinstance(r, dict) and '$ref' in r):
                continue
            branch = ability[r['$ref']]
            unlock = branch.get(F('f86e0433'))
            for a in branch.get(F('ffba60f0')) or []:
                if not (isinstance(a, dict) and '$ref' in a):
                    continue
                for sel in ability[a['$ref']].get(F('7e54e22c')) or []:
                    if isinstance(sel, dict) and '$import' in sel:
                        for gate in by_selector.get(sel['$import']['classGuid'].lower(), []):
                            key = unlock['$import']['fileGuid'].lower() if isinstance(unlock, dict) and '$import' in unlock else None
                            unlock_gates[key].append(gate)
    gates, unmatched = [], []
    records = {}
    for key in sorted(files.routes):
        if key.startswith(folder + '/attachment_') and key.count('/') == folder.count('/') + 1:
            o = files.objects(key)[0]
            for v in [o.get(F('157a7d74'))] + [e.get(F('157a7d74')) for e in o.get(F('f6a09c90')) or []]:
                if isinstance(v, dict) and '$import' in v:
                    records.setdefault(v['$import']['fileGuid'].lower(), []).append(files.routes[key])
    for unlock, gs_ in unlock_gates.items():
        recs = records.get(unlock, [])
        for gate in gs_:
            if recs:
                for rec in recs:
                    gates.append((rec,) + gate)
            else:
                unmatched.append((files.path(unlock) if unlock else None,) + gate)
    return gates, unmatched


def record(r, gates):
    """Site-shaped fields from read_weapon(). gates: [(site ergo id, primary, alternates, rates)]."""
    w = OrderedDict()
    w['cls'] = CLS.get(r['folder'], r['folder'])
    pm = r['primaryMode']
    wb_modes = [pm] + [m for m in r['altModes'] if m != pm]
    if pm == 2:
        w['rpm'], w['fireMode'] = f32(r['rateOfFire']), 'auto'
    elif pm == 3:
        w['rpm'], w['fireMode'] = f32(r['rateOfFireBurst']), 'burst'
    elif pm == 0:
        w['rpm'], w['fireMode'] = f32(r['rateOfFireSingle']), 'semi'
    else:
        b = r['bolt']
        # Site arithmetic: shortest-decimal float32 operands, double precision.
        w['rpm'] = 60.0 / (f32(b['time']) / f32(b['speed']) + f32(b['delay']) + 60.0 / f32(r['rateOfFireSingle']))
        w['fireMode'] = 'pump' if r['folder'] == 'shotgun' else 'bolt'
    mags = [m for _, m in r['stdMagazine']]
    w['mag'] = mags[0] if mags else r['mag']
    r0 = r['reload'][0]
    w['tacRld'] = div32(w32(w32(r0['delay']) + w32(r0['postDelay'])) + w32(r0['timeBulletsLeft']), r0['speed']) \
        if (r0['delay'] or r0['postDelay']) else div32(r0['timeBulletsLeft'], r0['speed'])
    if r0['type'] == SHELL_RELOAD_TYPE:
        w['emptyRld'] = None
    else:
        r1 = r['reload'][1] if len(r['reload']) > 1 else r0
        w['emptyRld'] = div32(r1['timeBulletsLeft'], r1['speed'])
    w['reloadSpeed'] = f32(r0['speed'])
    w['bulletVel'] = f32(r['bulletVel'])
    if r['pellets'] and r['pellets'] > 1:
        w['pellets'] = r['pellets']
    ra = r['recoil']['ads']
    w['recoilV'] = f32(ra['amount']) * f32(ra['amountMult']) ** f32(ra['amountExp'])
    w['recoilDir'] = f32(ra['dir'])
    w['recoilVar'] = f32(ra['dirVar'])
    w['recoilIncAds'] = f32(r['dyn']['ads.stat']['inc'])
    w['availableFireModes'] = list(OrderedDict.fromkeys(MODE[m] for m in wb_modes))
    gated = []
    fma = OrderedDict()
    for gid, prim, alts, rates in gates:
        modes = list(OrderedDict.fromkeys(MODE[m] for m in [prim] + alts))
        entry = OrderedDict([('modes', modes), ('default', MODE[prim])])
        overrides = {MODE_NAME: w32(v) for MODE_NAME, v in rates.items() if MODE_NAME in modes and not same32(v, r[{'single': 'rateOfFireSingle', 'auto': 'rateOfFire', 'burst': 'rateOfFireBurst'}[MODE_NAME]])}
        if overrides:
            entry['rpmOverrides'] = overrides
        fma[gid] = entry
        gated += [m for m in [prim] + alts]
    all_modes = list(OrderedDict.fromkeys(wb_modes + gated))
    fm = OrderedDict()
    if 0 in all_modes or 1 in all_modes:
        fm['single'] = OrderedDict([('mechanism', ('pump' if r['folder'] == 'shotgun' else 'bolt') if 1 in all_modes else 'semi'),
                                    ('rpm', w32(r['rateOfFireSingle'])), ('hipNoBloomOnSwitch', bool(r['semiNoIncreaseBound']))])
    if 2 in all_modes:
        fm['auto'] = OrderedDict([('mechanism', 'auto'), ('rpm', w32(r['rateOfFire']))])
    if 3 in all_modes:
        fm['burst'] = OrderedDict([('mechanism', 'burst'), ('rpm', w32(r['rateOfFireBurst'])), ('burstRounds', r['burstRounds']),
                                   ('burstBurstsPerMinute', w32(r['burstsPerMinute']))])
    w['fireModes'] = fm
    if fma:
        w['fireModeAttachments'] = fma
    if 3 in all_modes:
        w['burstRounds'] = r['burstRounds']
        if r['burstsPerMinute'] > 0:
            w['burstBurstsPerMinute'] = f32(r['burstsPerMinute'])
        if 3 not in wb_modes:
            w['burstRpm'] = f32(r['rateOfFireBurst'])
    w['spreadDyn'] = {k: {f: f32(v) for f, v in r['dyn'][k + '.stat'].items()} for k in ('ads', 'hip')}
    for k in ('ads', 'hip'):
        if not same32(r['dyn'][k + '.move']['distExp'], r['dyn'][k + '.stat']['distExp']):
            w['spreadDyn'][k]['distExpMove'] = f32(r['dyn'][k + '.move']['distExp'])
    w['recoil'] = {k: {f: f32(v) for f, v in r['recoil'][k].items()} for k in ('ads', 'hip')}
    mm = r['minmax']
    w['spread'] = {
        'adsStand': [f32(mm['Zoomed.Standing.Stationary'][0]), f32(mm['Zoomed.Standing.Stationary'][1])],
        'adsMove': [f32((r['adsMoveRow'] or {}).get('6c73f45b')), f32(mm['Zoomed.Standing.Moving'][1])],
        'hipStand': [f32((r['hipRow'] or {}).get('hipStand')), f32(mm['Unzoomed.Standing.Stationary'][1])],
        'hipMove': [f32((r['hipRow'] or {}).get('hipMove')), f32(mm['Unzoomed.Standing.Moving'][1])]}
    w['dmg'] = [[f32(a), f32(b)] for a, b in r['dmg']]
    return w


def related(r, decay, balance, mags, sid):
    """(file key, site value, source value) for the per-weapon values in other files that part A checks."""
    ra = r['recoil']['ads']
    rows = [
        ('recoil_decay.json RECOIL_DEC', decay['RECOIL_DEC'].get(sid), f32(ra['decFactor'])),
        ('recoil_decay.json RECOIL_DEC_TEXP', decay['RECOIL_DEC_TEXP'].get(sid), f32(ra['decTimeExp'])),
        ('recoil_decay.json RECOIL_DEC_EXP', decay['RECOIL_DEC_EXP'].get(sid), f32(ra['decExp']) if not same32(ra['decExp'], 1.0) else None),
        ('balance_tables.json RECOIL_MULT', balance['RECOIL_MULT'].get(sid), f32(ra['amountMult'])),
        ('balance_tables.json HIP_SPREAD_BASE_INDEX', balance['HIP_SPREAD_BASE_INDEX'].get(sid), r['hipIndex']),
        ('balance_tables.json HIP_SPREAD_TABLE[index].hipStand',
         (balance['HIP_SPREAD_TABLE'][r['hipIndex']] or {}).get('hipStand') if 0 <= r['hipIndex'] < len(balance['HIP_SPREAD_TABLE']) else None,
         f32((r['hipRow'] or {}).get('hipStand'))),
        ('balance_tables.json MOVING_ACC_TIERS[adsMoveIndex]',
         balance['MOVING_ACC_TIERS'][r['adsMoveIndex']] if 0 <= r['adsMoveIndex'] < len(balance['MOVING_ACC_TIERS']) else None,
         f32((r['adsMoveRow'] or {}).get('6c73f45b'))),
        ('attachments.json WEAPON_MAG.defAds', mags.get(sid, {}).get('defAds'), r['WeaponZoomTransitionIndex']),
        ('attachments.json WEAPON_MAG.defAms', mags.get(sid, {}).get('defAms'), r['WeaponZoomedMoveSpeedMultiplierIndex']),
        ('attachments.json WEAPON_MAG.sprintRecoveryBaseIndex', mags.get(sid, {}).get('sprintRecoveryBaseIndex'), r['SprintSettingsIndex']),
        ('attachments.json WEAPON_MAG.deployBaseIndex', mags.get(sid, {}).get('deployBaseIndex'),
         r['deployIndex'][0] if len(set(r['deployIndex'])) == 1 else (r['deployIndex'] or None)),
    ]
    return rows


class Strings:
    def __init__(self, path):
        self.table = {}
        if path and Path(path).exists():
            for line in Path(path).read_text(encoding='utf-8').splitlines():
                parts = line.split('\t', 1)
                if len(parts) == 2:
                    self.table[parts[0].upper()] = parts[1]

    def get(self, number):
        return None if number is None else self.table.get('%08X' % (number & 0xFFFFFFFF))


def ui_records(files):
    """GUID (lower) -> (asset, object, objects) over every UIWeaponAbilityMetaData* file."""
    out = {}
    for key in sorted(files.routes):
        if 'uiweaponabilitymetadata' in key:
            objs = files.objects(key)
            for o in objs:
                if o['$class'] == 'Class_593f6146' and o.get('$guid'):
                    out[o['$guid'].lower()] = (files.routes[key], o, objs)
    return out


def ui_text(files, strings, rec, field):
    """(string id as 8 hex digits, text or None) of a name/description pointer."""
    asset, o, objs = rec
    ref = o.get(F(field))
    if not isinstance(ref, dict):
        return None, None
    _, so = files.deref(ref, objs)
    v = (so or {}).get(F('3d34898a'))
    if v is None:
        return None, None
    return '%08X' % (v & 0xFFFFFFFF), strings.get(v)


def main():
    raw_tree = load_raw_tree()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    raw_tree.add_raw_arguments(parser)
    parser.add_argument('--identities', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-weapon-identities-2026-11-10.json',
                        help='Reviewed identity rows: site weapon id -> internal name, UI record')
    parser.add_argument('--mapping', type=Path,
                        default=ROOT / 'reference-data/provenance/frosty-point-cost-mapping-2026-11-10.json',
                        help='Reviewed attachment identity rows (ergonomics record -> site id, for gated fire modes)')
    parser.add_argument('--overrides', type=Path, default=ROOT / 'data-src/overrides-weapons.json',
                        help='Reviewed deviations; rows with generator "frosty-weapons" are read')
    parser.add_argument('--strings', type=Path, help='fs_us_loc.strings.tsv of the build (names and descriptions)')
    parser.add_argument('--report-out', type=Path, help='Write every source value and difference as JSON')
    parser.add_argument('--check', action='store_true', help='Exit 1 on any difference not covered by an applied deviation row')
    args = parser.parse_args()
    if not args.raw:
        parser.error('raw mode only: give --raw, --descriptors and --catalog')
    if not args.strings:
        parser.error('--strings is required (names and descriptions)')
    export = raw_tree.open_input(parser, args, None).export
    files = Files(raw_tree, export)
    strings = Strings(args.strings)
    registry = Registry(files)

    site = json.loads((ROOT / 'data/weapons.json').read_text(encoding='utf-8'))
    decay = json.loads((ROOT / 'data/recoil_decay.json').read_text(encoding='utf-8'))
    balance = json.loads((ROOT / 'data/balance_tables.json').read_text(encoding='utf-8'))
    mags = json.loads((ROOT / 'data/attachments.json').read_text(encoding='utf-8'))['WEAPON_MAG']
    ids = {r['siteId']: r for r in json.loads(args.identities.read_text(encoding='utf-8'))['weapons']}
    mapping = json.loads(args.mapping.read_text(encoding='utf-8'))['rows']
    ergo_of = {}
    for row in mapping:
        if row['slot'] == 'ergo':
            for rec in row['records']:
                ergo_of[(row['weapon'], rec.lower())] = row['id']
    ui = ui_records(files)

    problems, raws, gens, gate_report = [], {}, {}, {}
    for w in site:
        sid = w['id']
        if sid not in ids:
            problems.append(f'{sid}: no identity row')
            continue
        try:
            raws[sid] = read_weapon(files, registry, ids[sid]['internalId'])
        except (ValueError, KeyError, StopIteration, TypeError) as error:
            problems.append(f'{sid}: weapon files not read ({error!r})')
    diffs = []        # (weapon, path, site, source, class)
    compared = set()  # (weapon, path) of every leaf compared
    unread = defaultdict(list)
    counts = defaultdict(Counter)    # family -> leaves compared / equal
    regdis = []
    for w in site:
        sid = w['id']
        r = raws.get(sid)
        unknown = [k for k in w if k not in OWNED and k not in NOT_OWNED]
        if unknown:
            problems.append(f'{sid}: keys neither owned nor listed as not owned: {unknown}')
        if r is None:
            continue
        for lab, fv, rv, rn in r['log']:
            if rv is not None and (fv != rv if isinstance(fv, list) else not same32(fv, rv) and fv != rv):
                regdis.append((sid, lab, fv, rv))
        gates, unmatched = mode_gates(files, r, ids[sid]['internalId'])
        site_gates = []
        for rec, prim, alts, rates, package in gates:
            gid = ergo_of.get((sid, rec.lower()))
            gate_report.setdefault(sid, []).append({'record': rec, 'siteErgo': gid, 'primary': prim, 'alternates': alts,
                                                    'rates': rates, 'package': package})
            if gid:
                site_gates.append((gid, prim, alts, rates))
        for route, prim, alts, rates, package in unmatched:
            gate_report.setdefault(sid, []).append({'record': None, 'unlock': route, 'siteErgo': None, 'primary': prim,
                                                    'alternates': alts, 'rates': rates, 'package': package})
        # A mode-changing branch the site offers no choice for is a difference until reviewed.
        for g in gate_report.get(sid, []):
            if not g['siteErgo']:
                name = PurePosixPath(g['record'] or g['unlock'] or '?').name
                diff = (sid, f'fireModeAttachments<{name}>', '<absent>',
                        f'gates primary {MODE[g["primary"]]}, alternates {[MODE[m] for m in g["alternates"]]} '
                        f'({PurePosixPath(g["package"]).name})', 'differs')
                compared.add(diff[:2])
                if diff not in diffs:
                    diffs.append(diff)
        gen = record(r, site_gates)
        # UI strings from the identity's primary record; when the files do not hold it (the
        # multiplayer copy of the main file leaves out the season weapons), the first record held.
        recs = sorted(ids[sid].get('uiRecords') or [], key=lambda x: not x.get('primary'))
        rec = next((ui[x['guid'].lower()] for x in recs if x.get('guid', '').lower() in ui), None)
        if rec is None:
            unread[sid] += ['name', 'description']
        else:
            for field, h in (('name', 'fd698f51'), ('description', '490f0dd0')):
                sidh, text = ui_text(files, strings, rec, h)
                gen[field] = text if text is not None else f'<string {sidh} not in the strings table>'
                if text is None:
                    unread[sid].append(f'{field} (string {sidh} not in the strings table)')
        gen['id'] = sid
        gens[sid] = gen
        site_w = dict(w)
        if isinstance(w.get('dmg'), list):
            labels = sorted({p.get('source') for p in w['dmg']} - {'Frosty'}, key=str)
            if labels:
                diffs.append((sid, 'dmg[].source', labels, 'Frosty', 'differs'))
            site_w['dmg'] = [[p.get('r'), p.get('d')] for p in w['dmg']]
        for family in OWNED:
            sv, gv = site_w.get(family, '<absent>'), gen.get(family, '<absent>')
            if sv == '<absent>' and gv == '<absent>':
                continue
            if family == 'dmg':
                # One leaf: the whole curve (an inserted point would otherwise shift every index).
                pairs = [compare(a, b) for x, y in zip(sv if sv != '<absent>' else [], gv) for a, b in zip(x, y)]
                c = 'differs' if sv == '<absent>' or len(sv) != len(gv) or 'differs' in pairs else                     'precision' if 'precision' in pairs else 'equal'
                counts[family]['leaves'] += 1
                counts[family]['equal'] += c == 'equal'
                compared.add((sid, 'dmg'))
                if c != 'equal':
                    diffs.append((sid, 'dmg', sv, gv, c))
                continue
            sl = dict(leaves(sv, family)) if sv != '<absent>' else {}
            gl = dict(leaves(gv, family)) if gv != '<absent>' else {}
            if not sl:
                sl = {family: '<absent>'}
            if not gl:
                gl = {family: '<absent>'}
            for p in sorted(set(sl) | set(gl)):
                a, b = sl.get(p, '<absent>'), gl.get(p, '<absent>')
                c = compare(a, b, derived=p == 'recoilV' or (p == 'rpm' and gen.get('fireMode') in ('bolt', 'pump')))
                compared.add((sid, p))
                counts[family]['leaves'] += 1
                counts[family]['equal'] += c == 'equal'
                if c != 'equal':
                    diffs.append((sid, p, a, b, c))
        for key, a, b in related(r, decay, balance, mags, sid):
            c = compare(a, b)
            compared.add((sid, key))
            counts[key]['leaves'] += 1
            counts[key]['equal'] += c == 'equal'
            if c != 'equal':
                diffs.append((sid, key, a, b, c))
        for family, why in NOT_OWNED.items():
            if family in w:
                counts[family]['stored'] += 1

    # Deviations.
    overrides = []
    if args.overrides.exists():
        overrides = [o for o in json.loads(args.overrides.read_text(encoding='utf-8'))['overrides'] if o.get('generator') == GENERATOR]
    found = {(d[0], d[1]): d for d in diffs}
    covered, report = set(), []

    def agrees(value, reviewed):
        return (value == '<absent>' and reviewed is None) or compare(value, reviewed) == 'equal'

    for o in overrides:
        key = (o['weapon'], o['field'])
        d = found.get(key)
        if d is None:
            status = 'REDUNDANT' if key in compared else 'UNUSED'
        elif not agrees(d[3], o['sourceValue']) or not agrees(d[2], o['siteValue']):
            status = 'STALE'
        else:
            status = 'applied'
            covered.add(key)
        report.append({'overrideId': o.get('overrideId'), 'weapon': key[0], 'field': key[1], 'kind': o.get('kind'), 'status': status,
                       'source': d[3] if d else None, 'reviewedSource': o['sourceValue']})

    names = {s: w['name'] for s, w in ((w['id'], w) for w in site)}
    print(f'{len(gens)} of {len(site)} weapons read; registry rows {len(registry.rows)}; '
          f'shell-fed (ReloadType {SHELL_RELOAD_TYPE}) weapons {sorted(s for s, r in raws.items() if r["reload"][0]["type"] == SHELL_RELOAD_TYPE)}; '
          f'file/registry disagreements {len(regdis)}')
    print('family: equal/compared leaves')
    for family in list(OWNED) + sorted(k for k in counts if k not in OWNED and k not in NOT_OWNED):
        c = counts[family]
        print(f'  {family:52} {c["equal"]:5}/{c["leaves"]:5}')
    for family in NOT_OWNED:
        print(f'  NOT_OWNED {family:42} stored on {counts[family]["stored"]} weapons ({NOT_OWNED[family]})')
    by_class = Counter(d[4] for d in diffs)
    print(f'differences: {len(diffs)} ({dict(by_class)}); {len(covered)} with an applied deviation row')
    for d in diffs:
        mark = ' [deviation]' if (d[0], d[1]) in covered else ''
        print(f'  {d[4].upper():9} {names.get(d[0], d[0])} ({d[0]}) {d[1]}: site {d[2]!r} source {d[3]!r}{mark}')
    for s, items in unread.items():
        print(f'UNREAD {names.get(s, s)}: {", ".join(items)}')
    for x in regdis:
        print(f'REGISTRY {x[0]} {x[1]}: file {x[2]!r} registry {x[3]!r}')
    for r_ in report:
        if r_['status'] != 'applied':
            print(f'DEVIATION {r_["status"]}: {r_["overrideId"]} {r_["weapon"]} {r_["field"]} (source {r_["source"]!r}, reviewed {r_["reviewedSource"]!r})')
    print(f'deviations: {dict(Counter(r_["status"] for r_ in report))} by kind {dict(Counter(r_["kind"] for r_ in report))}')
    for p in problems:
        print(f'PROBLEM {p}')

    if args.report_out:
        args.report_out.write_text(json.dumps({
            'generatedBy': 'scripts/frosty-weapons.py', 'sourceForm': 'raw', 'identities': args.identities.name,
            'owned': OWNED, 'notOwned': NOT_OWNED, 'bullets': {s: r['bullet'] for s, r in raws.items()},
            'counts': {k: dict(v) for k, v in counts.items()},
            'differences': [dict(zip(('weapon', 'field', 'site', 'source', 'class'), d)) for d in diffs],
            'deviations': report, 'unread': unread, 'registryDisagreements': regdis, 'problems': problems,
            'modeGates': gate_report, 'generated': gens,
            'sourceHashes': dict(sorted(files.read.items())),
        }, indent=1, ensure_ascii=False, default=str) + '\n', encoding='utf-8')
    failed = problems or any((d[0], d[1]) not in covered for d in diffs) or any(r_['status'] != 'applied' for r_ in report)
    if args.check and failed:
        sys.exit(1)


if __name__ == '__main__':
    main()

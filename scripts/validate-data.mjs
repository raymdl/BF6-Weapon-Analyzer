import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { damageAtRange } from '../sim/damage.js';
import { deriveSweetSpot, SWEET_SPOT_DAMAGE } from './sweet-spot.mjs';
import { loadReloadExceptionRegister } from './reload-exceptions.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = process.env.DATA_ROOT ? resolve(process.env.DATA_ROOT) : root;
const readJson = file => JSON.parse(readFileSync(resolve(dataRoot, file), 'utf8'));

const weapons = readJson('data/weapons.json');
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const recoilDecay = readJson('data/recoil_decay.json');
const balance = readJson('data/balance_tables.json');
const liveBaseline = readJson('data/provenance/live-baseline.json');

const SUPPORTED_CLASSES = new Set([
  'Assault Rifle',
  'Carbine',
  'SMG',
  'LMG',
  'DMR',
  'Sniper Rifle',
  'Shotgun',
  'Sidearm',
]);
const INTENTIONALLY_UNSUPPORTED_CLASSES = new Set();
// The live baseline declares which evidence a damage breakpoint may cite, so the
// policy file governs the data rather than restating a constant kept beside it.
const DAMAGE_POINT_SOURCES = new Set(liveBaseline.dataPolicy?.allowedDamagePointSources ?? []);
const MAX_RELOAD_SPEED_TIER = 2;

const errors = [];
const fail = message => errors.push(message);
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));
let reloadExceptions = null;
try {
  reloadExceptions = loadReloadExceptionRegister(dataRoot);
} catch (error) {
  fail(error.message);
}

if (!Number.isFinite(balance.RELOAD_SPEED_LADDER) || balance.RELOAD_SPEED_LADDER <= 0) {
  fail('RELOAD_SPEED_LADDER must be a finite positive number');
}
if (balance.VELOCITY_LADDER !== 0.8) {
  fail('VELOCITY_LADDER must be exactly 0.8');
}

const weaponIds = new Set();
for (const weapon of weapons) {
  if (!weapon.id) fail('Weapon is missing id');
  if (weaponIds.has(weapon.id)) fail(`Duplicate weapon id: ${weapon.id}`);
  weaponIds.add(weapon.id);

  if (!SUPPORTED_CLASSES.has(weapon.cls) && !INTENTIONALLY_UNSUPPORTED_CLASSES.has(weapon.cls)) {
    fail(`${weapon.id}: unknown class "${weapon.cls}"`);
  }

  if (!SUPPORTED_CLASSES.has(weapon.cls)) continue;

  for (const key of ['name', 'cls', 'cal', 'fireMode']) {
    if (weapon[key] == null) fail(`${weapon.id}: missing ${key}`);
  }
  if (Object.hasOwn(weapon, 'deployT')) {
    fail(`${weapon.id}: legacy deployT must be absent after the draw-time cutover`);
  }
  for (const key of ['tacRld', 'emptyRld']) {
    if (weapon[key] !== null && !Number.isFinite(weapon[key])) {
      fail(`${weapon.id}: ${key} must be numeric or null`);
    }
  }
  if (!Number.isFinite(weapon.reloadSpeed) || weapon.reloadSpeed <= 0) {
    fail(`${weapon.id}: reloadSpeed must be a finite positive number`);
  }
  if (!Array.isArray(weapon.dmg) || weapon.dmg.length === 0) {
    fail(`${weapon.id}: dmg must be a non-empty breakpoint array`);
  } else {
    if (weapon.damageStatus !== 'provisional' && weapon.damageStatus !== 'verified') {
      fail(`${weapon.id}: damageStatus must be provisional or verified`);
    }
    for (const point of weapon.dmg) {
      if (!Number.isFinite(point.r) || !Number.isFinite(point.d)) {
        fail(`${weapon.id}: dmg breakpoint must contain numeric r and d`);
      }
      if (!DAMAGE_POINT_SOURCES.has(point.source)) {
        fail(`${weapon.id}: dmg breakpoint source must be one of ${[...DAMAGE_POINT_SOURCES].join(', ')}`);
      }
    }
  }
}

const supportedWeaponIds = new Set(weapons.filter(w => SUPPORTED_CLASSES.has(w.cls)).map(w => w.id));

const DRAW_TIME_GROUPS = {
  semiAutoSidearm: new Set(['es57', 'ggh22', 'p18', 'm45a1']),
  revolverOrAutoSidearm: new Set(['m357trait', 'm44', 'vz61']),
  db12: new Set(['db12']),
};
const EXPECTED_DRAW_TIME_OFFSETS = {
  primary: 8,
  db12: 9,
  semiAutoSidearm: 5,
  revolverOrAutoSidearm: 7,
};
const drawTimeAxis = balance.DRAW_TIME_AXIS;
if (drawTimeAxis == null || typeof drawTimeAxis !== 'object' || Array.isArray(drawTimeAxis)) {
  fail('DRAW_TIME_AXIS must be a named object contract');
} else {
  const expectedAxis = {
    version: 1,
    coordinateName: 'drawTimeTier',
    baseCoordinateRange: [0, 7],
    coordinateRange: [-1, 15],
    sprintPrimary: { table: 'PRIMARY_SPRINT_REC_TIERS', coordinateOrigin: 0 },
    sprintSidearm: { table: 'SIDEARM_SPRINT_REC_TIERS', coordinateOrigin: -1 },
    deploy: { table: 'DEPLOY_TIME_TIERS', coordinateOrigin: 4, coordinateRange: [4, 15] },
  };
  if (drawTimeAxis.version !== expectedAxis.version) fail('DRAW_TIME_AXIS.version must be 1');
  if (drawTimeAxis.coordinateName !== expectedAxis.coordinateName) fail('DRAW_TIME_AXIS.coordinateName must be drawTimeTier');
  if (JSON.stringify(drawTimeAxis.baseCoordinateRange) !== JSON.stringify(expectedAxis.baseCoordinateRange)) {
    fail('DRAW_TIME_AXIS.baseCoordinateRange must be [0, 7]');
  }
  if (JSON.stringify(drawTimeAxis.coordinateRange) !== JSON.stringify(expectedAxis.coordinateRange)) {
    fail('DRAW_TIME_AXIS.coordinateRange must be [-1, 15]');
  }
  for (const [path, expected] of [
    ['sprintToFire.primary', expectedAxis.sprintPrimary],
    ['sprintToFire.sidearm', expectedAxis.sprintSidearm],
    ['deploy', expectedAxis.deploy],
  ]) {
    const actual = path === 'deploy'
      ? drawTimeAxis.deploy
      : drawTimeAxis.sprintToFire?.[path.endsWith('primary') ? 'primary' : 'sidearm'];
    if (actual?.table !== expected.table || actual?.coordinateOrigin !== expected.coordinateOrigin) {
      fail(`DRAW_TIME_AXIS.${path} must use ${expected.table} with coordinateOrigin ${expected.coordinateOrigin}`);
    }
    if (path === 'deploy' && JSON.stringify(actual?.coordinateRange) !== JSON.stringify(expected.coordinateRange)) {
      fail('DRAW_TIME_AXIS.deploy.coordinateRange must be [4, 15]');
    }
  }
  for (const [group, offset] of Object.entries(EXPECTED_DRAW_TIME_OFFSETS)) {
    if (drawTimeAxis.offsets?.[group] !== offset) fail(`DRAW_TIME_AXIS.offsets.${group} must be ${offset}`);
  }
  const expectedPrimary = [...supportedWeaponIds]
    .filter(weaponId => !Object.values(DRAW_TIME_GROUPS).some(ids => ids.has(weaponId)))
    .sort();
  const expectedGroups = {
    primary: expectedPrimary,
    db12: [...DRAW_TIME_GROUPS.db12].sort(),
    semiAutoSidearm: [...DRAW_TIME_GROUPS.semiAutoSidearm].sort(),
    revolverOrAutoSidearm: [...DRAW_TIME_GROUPS.revolverOrAutoSidearm].sort(),
  };
  if (expectedGroups.primary.length !== 54) fail(`draw-time standard primary set must contain 54 weapons; found ${expectedGroups.primary.length}`);
  const actualGroups = drawTimeAxis.weaponGroups ?? {};
  if (JSON.stringify(Object.keys(actualGroups).sort()) !== JSON.stringify(Object.keys(expectedGroups).sort())) {
    fail('DRAW_TIME_AXIS.weaponGroups must contain exactly primary, db12, semiAutoSidearm, and revolverOrAutoSidearm');
  }
  for (const [group, expectedIds] of Object.entries(expectedGroups)) {
    const actualIds = actualGroups[group];
    if (!Array.isArray(actualIds) || new Set(actualIds).size !== actualIds.length
        || JSON.stringify([...actualIds].sort()) !== JSON.stringify(expectedIds)) {
      fail(`DRAW_TIME_AXIS.weaponGroups.${group} is not the exact approved weapon set`);
    }
  }
}

const resolverSource = readFileSync(resolve(root, 'sim/applyAttachments.js'), 'utf8');
if (/Math\.abs\(DEPLOY_TIME_TIERS/.test(resolverSource) || /baseDeployIdx/.test(resolverSource)) {
  fail('sim/applyAttachments.js must not contain a nearest-value deploy resolver path');
}

if (liveBaseline.status !== 'current-live' || !Number.isInteger(liveBaseline.weaponCount)) {
  fail('data/provenance/live-baseline.json must identify the current live baseline and weapon count');
}
if (weapons.length !== liveBaseline.weaponCount) {
  fail(`live baseline declares ${liveBaseline.weaponCount} weapon records; found ${weapons.length}`);
}
if (supportedWeaponIds.size !== weapons.length) {
  fail(`every current weapon must use a supported class; found ${supportedWeaponIds.size}/${weapons.length}`);
}
if (liveBaseline.dataPolicy?.damageStatus !== 'verified') {
  fail('live baseline must declare the current verified damage policy');
}
if (DAMAGE_POINT_SOURCES.size === 0) {
  fail('live baseline must list the damage point sources a breakpoint may cite');
}
// Sweet spots are read from the current curve, never pinned to a distance.
// Assert the required curve shape so a future data refresh can move the window.
for (const weapon of weapons.filter(item => item.cls === 'Sniper Rifle')) {
  const { rangeM } = deriveSweetSpot(weapon);
  if (rangeM === null) continue;
  const [start, end] = rangeM;
  if (!(end > start)) {
    fail(`${weapon.id}: sweet-spot plateau does not span a range`);
    continue;
  }
  if (damageAtRange(weapon, start) !== SWEET_SPOT_DAMAGE || damageAtRange(weapon, end) !== SWEET_SPOT_DAMAGE) {
    fail(`${weapon.id}: damage curve does not hold ${SWEET_SPOT_DAMAGE} across its sweet spot`);
  }
  if (!(damageAtRange(weapon, start - 1) < SWEET_SPOT_DAMAGE) || !(damageAtRange(weapon, end + 1) < SWEET_SPOT_DAMAGE)) {
    fail(`${weapon.id}: damage curve does not ramp in and out of its sweet spot`);
  }
}
if (weapons.some(weapon => 'sweetSpot' in weapon)) {
  fail('sweetSpot is derived from the damage curve and must not be stored on a weapon');
}

const attachmentSets = {
  sight: new Set(attachments.SIGHTS.map(a => a.id)),
  muzzle: new Set(attachments.MUZZLES.map(a => a.id)),
  barrel: new Set(attachments.BARRELS.map(a => a.id)),
  grip: new Set(attachments.GRIPS.map(a => a.id)),
  laser: new Set(attachments.LASERS.map(a => a.id)),
};

for (const barrel of attachments.BARRELS ?? []) {
  if (!Object.hasOwn(barrel, 'velTierMod')) {
    fail(`${barrel.id}: velTierMod is required during the barrel-velocity dual-read phase`);
  } else if (!Number.isInteger(barrel.velTierMod)) {
    fail(`${barrel.id}: velTierMod must be an integer`);
  }
  if (!Number.isFinite(barrel.velMult) || barrel.velMult <= 0) {
    fail(`${barrel.id}: legacy velMult must remain a finite positive number during the dual-read phase`);
  }
  if (Number.isInteger(barrel.velTierMod) && Number.isFinite(balance.VELOCITY_LADDER)) {
    const expected = balance.VELOCITY_LADDER ** (-barrel.velTierMod);
    if (barrel.velMult !== expected) {
      fail(`${barrel.id}: velMult ${barrel.velMult} does not exactly equal VELOCITY_LADDER ** -velTierMod (${expected})`);
    }
  }
}

const lightsSet = new Set((attachments.LIGHTS ?? []).map(a => a.id));

for (const [weaponId, weaponAtts] of Object.entries(attachments.WEAPON_ATTS)) {
  if (!weaponIds.has(weaponId)) fail(`WEAPON_ATTS references unknown weapon ${weaponId}`);
  for (const [slot, validIds] of Object.entries(attachmentSets)) {
    // laserGripLightCombined: laser slot may contain grip or light IDs
    // laserLightCombined: laser slot may contain light IDs
    const extraIds = slot === 'laser'
      ? new Set([
          ...(weaponAtts.laserGripLightCombined ? attachmentSets.grip : []),
          ...((weaponAtts.laserLightCombined || weaponAtts.laserGripLightCombined) ? lightsSet : []),
        ])
      : new Set();
    for (const id of weaponAtts[slot] ?? []) {
      if (!validIds.has(id) && !extraIds.has(id)) fail(`${weaponId}: ${slot} references unknown attachment ${id}`);
    }
  }
  if (weaponAtts.barrelDef && !attachmentSets.barrel.has(weaponAtts.barrelDef)) {
    fail(`${weaponId}: barrelDef references unknown barrel ${weaponAtts.barrelDef}`);
  }
  if (weaponAtts.barrelDef && weaponAtts.barrel && !weaponAtts.barrel.includes(weaponAtts.barrelDef)) {
    fail(`${weaponId}: barrelDef ${weaponAtts.barrelDef} is not in its barrel list`);
  }
}

// Every supported non-sidearm weapon must declare each attachment slot.
// An explicit empty array means the weapon deliberately takes nothing in that
// slot (e.g. USG-90 has no grip rail); an absent key means forgotten data.
// Light (and for VZ.61-style weapons, grip) options live in the laser slot
// when the combined-slot flags are set. The DB-12 legitimately has no light slot.
const LIGHT_SLOT_EXEMPT = new Set(['db12']);
const REQUIRED_ATT_SLOTS = ['muzzle', 'barrel', 'laser', 'light', 'grip'];
for (const weapon of weapons) {
  if (!SUPPORTED_CLASSES.has(weapon.cls) || weapon.cls === 'Sidearm') continue;
  const weaponAtts = attachments.WEAPON_ATTS[weapon.id];
  if (!weaponAtts) continue; // reported as missing WEAPON_ATTS below
  for (const slot of REQUIRED_ATT_SLOTS) {
    if (slot === 'light' && (weaponAtts.laserLightCombined || weaponAtts.laserGripLightCombined || LIGHT_SLOT_EXEMPT.has(weapon.id))) continue;
    if (slot === 'grip' && weaponAtts.laserGripLightCombined) continue;
    if (!Array.isArray(weaponAtts[slot])) {
      fail(`${weapon.id}: ${slot} slot is missing from WEAPON_ATTS (use [] if the weapon takes none)`);
    }
  }
}

for (const weaponId of supportedWeaponIds) {
  if (!attachments.WEAPON_ATTS[weaponId]) fail(`${weaponId}: missing WEAPON_ATTS`);
  if (!recoilDecay.RECOIL_DEC?.[weaponId]) fail(`${weaponId}: missing RECOIL_DEC`);
  if (!recoilDecay.RECOIL_DEC_TEXP?.[weaponId]) fail(`${weaponId}: missing RECOIL_DEC_TEXP`);
  if (!balance.HIP_CLS?.[weaponId]) fail(`${weaponId}: missing HIP_CLS`);
}

for (const tableName of ['RECOIL_DEC', 'RECOIL_DEC_EXP', 'RECOIL_DEC_TEXP']) {
  for (const weaponId of Object.keys(recoilDecay[tableName] ?? {})) {
    if (!weaponIds.has(weaponId)) fail(`${tableName} references unknown weapon ${weaponId}`);
  }
}

for (const [weaponId, magData] of Object.entries(attachments.WEAPON_MAG)) {
  if (!weaponIds.has(weaponId)) fail(`WEAPON_MAG references unknown weapon ${weaponId}`);
  if (magData.def && !magData.mags?.[magData.def]) {
    fail(`${weaponId}: WEAPON_MAG def "${magData.def}" is not present in mags`);
  }

  const sprintTableName = magData.sprintRecoveryTierTable === 'sidearm'
    ? 'SIDEARM_SPRINT_REC_TIERS'
    : 'PRIMARY_SPRINT_REC_TIERS';
  const sprintTable = magData.sprintRecoveryTierTable === 'sidearm'
    ? (balance.SIDEARM_SPRINT_REC_TIERS?.length ? balance.SIDEARM_SPRINT_REC_TIERS : balance.SPRINT_REC_TIERS)
    : (balance.PRIMARY_SPRINT_REC_TIERS?.length ? balance.PRIMARY_SPRINT_REC_TIERS : balance.SPRINT_REC_TIERS);
  const baseIndexTables = [
    ['defAds', 'ADS_SPD_TIERS', balance.ADS_SPD_TIERS],
    ['defAms', 'ADS_MOVE_TIERS', balance.ADS_MOVE_TIERS],
    ['defSpr', sprintTableName, sprintTable],
  ];
  for (const [field, tableName, table] of baseIndexTables) {
    const value = magData[field];
    if (!Number.isInteger(value) || value < 0 || value >= table.length) {
      fail(`${weaponId}: ${field} must be an integer in [0, ${table.length - 1}] for ${tableName}; found ${value}`);
    }
  }
  const expectedGroup = Object.entries(DRAW_TIME_GROUPS).find(([, ids]) => ids.has(weaponId))?.[0] ?? 'primary';
  const expectedSprintTable = expectedGroup === 'primary' || expectedGroup === 'db12' ? 'primary' : 'sidearm';
  if (magData.drawTimeGroup !== expectedGroup) {
    fail(`${weaponId}: drawTimeGroup must be ${expectedGroup}; found ${magData.drawTimeGroup}`);
  }
  if (!Number.isInteger(magData.drawTimeOffset)
      || magData.drawTimeOffset !== EXPECTED_DRAW_TIME_OFFSETS[expectedGroup]) {
    fail(`${weaponId}: drawTimeOffset must be ${EXPECTED_DRAW_TIME_OFFSETS[expectedGroup]}; found ${magData.drawTimeOffset}`);
  }
  const [minDrawTimeTier, maxDrawTimeTier] = drawTimeAxis?.baseCoordinateRange ?? [NaN, NaN];
  if (!Number.isInteger(magData.drawTimeTier)
      || magData.drawTimeTier < minDrawTimeTier || magData.drawTimeTier > maxDrawTimeTier) {
    fail(`${weaponId}: drawTimeTier must be an integer in [${minDrawTimeTier}, ${maxDrawTimeTier}]; found ${magData.drawTimeTier}`);
  }
  if (magData.sprintRecoveryTierTable !== expectedSprintTable) {
    fail(`${weaponId}: sprintRecoveryTierTable must be ${expectedSprintTable} for ${expectedGroup}`);
  }
  const sprintOrigin = expectedSprintTable === 'sidearm'
    ? drawTimeAxis?.sprintToFire?.sidearm?.coordinateOrigin
    : drawTimeAxis?.sprintToFire?.primary?.coordinateOrigin;
  if (Number.isInteger(magData.defSpr) && Number.isInteger(sprintOrigin)
      && magData.drawTimeTier !== magData.defSpr + sprintOrigin) {
    fail(`${weaponId}: drawTimeTier does not match the explicit Sprint-to-Fire coordinate conversion`);
  }
  for (const [magazineId, magazine] of Object.entries(magData.mags ?? {})) {
    const hasReloadSpeedTier = Object.hasOwn(magazine, 'reloadSpeedTier');
    const hasTacRldOverride = Object.hasOwn(magazine, 'tacRldOverrideMs');
    if (hasReloadSpeedTier === hasTacRldOverride) {
      fail(`${weaponId}/${magazineId}: exactly one of reloadSpeedTier or tacRldOverrideMs is required after the reload cutover`);
    }
    if (Object.hasOwn(magazine, 'tacRld')) {
      fail(`${weaponId}/${magazineId}: legacy tacRld must be absent after the reload cutover`);
    }
    if (Object.hasOwn(magazine, 'reloadSpeedTier')
        && (!Number.isInteger(magazine.reloadSpeedTier)
          || magazine.reloadSpeedTier < 0
          || magazine.reloadSpeedTier > MAX_RELOAD_SPEED_TIER)) {
      fail(`${weaponId}/${magazineId}: reloadSpeedTier must be a non-negative integer in [0, ${MAX_RELOAD_SPEED_TIER}]`);
    }
    if (Object.hasOwn(magazine, 'tacRldOverrideMs')
        && (!Number.isInteger(magazine.tacRldOverrideMs) || magazine.tacRldOverrideMs <= 0)) {
      fail(`${weaponId}/${magazineId}: tacRldOverrideMs must be a positive integer number of milliseconds`);
    }
    if (Object.hasOwn(magazine, 'suspectedGameBug')) {
      const bug = magazine.suspectedGameBug;
      if (bug == null || typeof bug !== 'object' || Array.isArray(bug)) {
        fail(`${weaponId}/${magazineId}: suspectedGameBug must be an object`);
      } else {
        if (bug.field !== 'reloadSpeedTier') fail(`${weaponId}/${magazineId}: suspectedGameBug.field must be reloadSpeedTier`);
        if (!Number.isInteger(bug.expectedWhenFixed)
            || bug.expectedWhenFixed < 0
            || bug.expectedWhenFixed > MAX_RELOAD_SPEED_TIER) {
          fail(`${weaponId}/${magazineId}: suspectedGameBug.expectedWhenFixed must be a non-negative integer in [0, ${MAX_RELOAD_SPEED_TIER}]`);
        }
        for (const field of ['expectedReloadSeconds', 'observedReloadSeconds']) {
          if (!Number.isFinite(bug[field]) || bug[field] <= 0) {
            fail(`${weaponId}/${magazineId}: suspectedGameBug.${field} must be a positive finite number`);
          }
        }
        for (const field of ['observedOn', 'note']) {
          if (typeof bug[field] !== 'string' || !bug[field]) {
            fail(`${weaponId}/${magazineId}: suspectedGameBug.${field} must be a non-empty string`);
          }
        }
        const weapon = weaponById.get(weaponId);
        const derivedSeconds = Object.hasOwn(magazine, 'tacRldOverrideMs')
          ? magazine.tacRldOverrideMs / 1000
          : Number.isFinite(weapon?.tacRld)
            ? weapon.tacRld / (balance.RELOAD_SPEED_LADDER ** magazine.reloadSpeedTier)
            : null;
        if (reloadExceptions) {
          const registeredObservation = reloadExceptions.register.screenshotExceptions?.[weaponId]?.[magazineId];
          if (!registeredObservation) {
            fail(`${weaponId}/${magazineId}: suspectedGameBug observedReloadSeconds is not in the screenshot exception register`);
          } else if (Math.abs(bug.observedReloadSeconds - (registeredObservation.observedReloadMs / 1000)) > 0.005) {
            fail(`${weaponId}/${magazineId}: suspectedGameBug observedReloadSeconds mismatch: data/attachments.json=${bug.observedReloadSeconds}s, data/reload-exceptions.json=${registeredObservation.observedReloadMs}ms`);
          }
        }
        if (Number.isFinite(derivedSeconds) && Number.isFinite(bug.expectedReloadSeconds)
            && Math.abs(derivedSeconds - bug.expectedReloadSeconds) <= 0.005) {
          fail(`${weaponId}/${magazineId}: suspectedGameBug is stale; current reload matches expectedReloadSeconds`);
        } else if (Number.isFinite(derivedSeconds) && Number.isFinite(bug.observedReloadSeconds)
            && Math.abs(derivedSeconds - bug.observedReloadSeconds) > 0.005) {
          fail(`${weaponId}/${magazineId}: suspectedGameBug reload drift is unexplained; derived reload ${derivedSeconds.toFixed(3)}s does not match observedReloadSeconds ${bug.observedReloadSeconds.toFixed(3)}s`);
        }
      }
    }
    if (Object.hasOwn(magazine, 'tacRldOverrideMs') && reloadExceptions) {
      const registered = reloadExceptions.register.animationOverrides?.[weaponId]?.[magazineId];
      if (!registered) fail(`${weaponId}/${magazineId}: tacRldOverrideMs is not in the animation exception register`);
      else if (registered.tacRldOverrideMs !== magazine.tacRldOverrideMs) {
        fail(`${weaponId}/${magazineId}: tacRldOverrideMs mismatch: data/attachments.json=${magazine.tacRldOverrideMs}, data/reload-exceptions.json=${registered.tacRldOverrideMs}`);
      }
    }
  }
}

if (reloadExceptions) {
  for (const [weaponId, magazines] of Object.entries(reloadExceptions.register.animationOverrides ?? {})) {
    for (const magazineId of Object.keys(magazines)) {
      const magazine = attachments.WEAPON_MAG?.[weaponId]?.mags?.[magazineId];
      if (!magazine || !Object.hasOwn(magazine, 'tacRldOverrideMs')) {
        fail(`${weaponId}/${magazineId}: dangling tacRldOverrideMs in data/reload-exceptions.json; no matching override exists in data/attachments.json`);
      }
    }
  }
}

for (const ergo of attachments.ERGOS ?? []) {
  if (Object.hasOwn(ergo, 'reloadSpeedMult')
      && (!Number.isFinite(ergo.reloadSpeedMult) || ergo.reloadSpeedMult <= 0)) {
    fail(`${ergo.id}: reloadSpeedMult must be a positive finite number`);
  }
}

for (const [weaponId, weaponErgo] of Object.entries(attachments.WEAPON_ERGO ?? {})) {
  if (Object.hasOwn(weaponErgo, 'magCatchRld')) {
    fail(`${weaponId}: legacy magCatchRld must be absent after the reload cutover`);
  }
}

for (const [weaponId, ammoData] of Object.entries(ammo.WEAPON_AMMO)) {
  if (!weaponIds.has(weaponId)) fail(`WEAPON_AMMO references unknown weapon ${weaponId}`);
  if (ammoData.def && !(ammoData.def in (ammoData.ammo ?? {}))) {
    fail(`${weaponId}: WEAPON_AMMO def "${ammoData.def}" is not present in ammo`);
  }
  for (const ammoId of Object.keys(ammoData.ammo ?? {})) {
    if (!ammo.AMMO.some(a => a.id === ammoId)) fail(`${weaponId}: WEAPON_AMMO references unknown ammo ${ammoId}`);
  }
}

for (const [weaponId, hipClass] of Object.entries(balance.HIP_CLS ?? {})) {
  if (!weaponIds.has(weaponId)) fail(`HIP_CLS references unknown weapon ${weaponId}`);
  if (!balance.HIP_SPREAD_TIERS?.[hipClass]) fail(`${weaponId}: HIP_CLS references unknown spread tier ${hipClass}`);
}

for (const weaponId of Object.keys(balance.BASE_HS_MULT ?? {})) {
  if (!weaponIds.has(weaponId)) fail(`BASE_HS_MULT references unknown weapon ${weaponId}`);
}
for (const weaponId of balance.HP_HS_HIGH ?? []) {
  if (!weaponIds.has(weaponId)) fail(`HP_HS_HIGH references unknown weapon ${weaponId}`);
}
for (const [weaponId, ammoOverrides] of Object.entries(balance.COLLATERAL_MULT_OVERRIDE ?? {})) {
  if (!weaponIds.has(weaponId)) {
    fail(`COLLATERAL_MULT_OVERRIDE references unknown weapon ${weaponId}`);
    continue;
  }
  const availableAmmo = ammo.WEAPON_AMMO?.[weaponId]?.ammo ?? {};
  for (const ammoId of Object.keys(ammoOverrides ?? {})) {
    if (!ammo.AMMO.some(a => a.id === ammoId)) {
      fail(`COLLATERAL_MULT_OVERRIDE.${weaponId} references unknown ammo ${ammoId}`);
    } else if (!(ammoId in availableAmmo)) {
      fail(`COLLATERAL_MULT_OVERRIDE.${weaponId}.${ammoId} is not available to the weapon`);
    }
  }
}

for (const [weaponId, limbClass] of Object.entries(balance.LIMB_CLASS ?? {})) {
  if (!weaponIds.has(weaponId)) fail(`LIMB_CLASS references unknown weapon ${weaponId}`);
  if (!(limbClass in (balance.LIMB_CLASS_MULT ?? {}))) {
    fail(`${weaponId}: LIMB_CLASS references unknown limb class ${limbClass}`);
  }
}

const expectedLimbClassByWeaponClass = {
  'Assault Rifle': 'auto',
  Carbine: 'auto',
  SMG: 'auto',
  LMG: 'auto',
  DMR: 'dmr',
  'Sniper Rifle': 'sniper',
};
for (const weapon of weapons) {
  if (!SUPPORTED_CLASSES.has(weapon.cls)) continue;
  const expected = weapon.id === 'vz61' ? 'auto' : (expectedLimbClassByWeaponClass[weapon.cls] ?? null);
  const actual = balance.LIMB_CLASS?.[weapon.id] ?? null;
  if (actual !== expected) {
    fail(`${weapon.id}: expected LIMB_CLASS ${expected ?? 'omitted'} for ${weapon.cls}, found ${actual ?? 'omitted'}`);
  }
}
for (const [limbClass, multiplier] of Object.entries(balance.LIMB_CLASS_MULT ?? {})) {
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1) {
    fail(`LIMB_CLASS_MULT.${limbClass} must be a finite number in (0, 1]`);
  }
}
for (const ammoTier of ['standard', 'hp', 'synthetic']) {
  const multiplier = balance.AUTO_HS_MULT?.[ammoTier];
  if (!Number.isFinite(multiplier) || multiplier <= 1) {
    fail(`AUTO_HS_MULT.${ammoTier} must be a finite number greater than 1`);
  }
}

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Data validation passed for ${supportedWeaponIds.size} supported weapons (${weapons.length} total).`);

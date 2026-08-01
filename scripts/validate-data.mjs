import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { damageAtRange } from '../sim/damage.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = process.env.DATA_ROOT ? resolve(process.env.DATA_ROOT) : root;
const readJson = file => JSON.parse(readFileSync(resolve(dataRoot, file), 'utf8'));

const weapons = readJson('data/weapons.json');
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const recoilDecay = readJson('data/recoil_decay.json');
const balance = readJson('data/balance_tables.json');
const pp19Provenance = readJson('data/provenance/pp19-1.3.3.0.json');
const damageProvenance = readJson('data/provenance/damage-1.3.3.0.json');

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
const DAMAGE_POINT_SOURCES = new Set(['EA', 'Sym', 'in-game']);

const errors = [];
const fail = message => errors.push(message);

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
        fail(`${weapon.id}: dmg breakpoint source must be EA, Sym, or in-game`);
      }
    }
  }
}

const supportedWeaponIds = new Set(weapons.filter(w => SUPPORTED_CLASSES.has(w.cls)).map(w => w.id));

const pp19 = weapons.find(weapon => weapon.id === 'pp19');
if (weapons.length !== 59) fail(`release 1.3.3.0 requires 59 weapon records; found ${weapons.length}`);
if (supportedWeaponIds.size !== 59) fail(`release 1.3.3.0 requires 59 supported weapons; found ${supportedWeaponIds.size}`);
if (!pp19) fail('pp19: required release 1.3.3.0 weapon record is missing');
if (pp19) {
  if (pp19.cls !== 'SMG') fail('pp19: expected SMG class');
  if (pp19.damageStatus !== 'provisional') fail('pp19: damageStatus must remain provisional until in-game validation');
  if (pp19Provenance.release !== '1.3.3.0' || pp19Provenance.weaponId !== 'pp19') {
    fail('pp19: provenance record does not identify release 1.3.3.0 / weapon pp19');
  }
  if (pp19Provenance.capture?.status !== 'not-recorded') {
    fail('pp19: capture status changed without a reviewed in-game evidence package');
  }
  if (pp19Provenance.damage?.status !== 'provisional-community-tested') {
    fail('pp19: damage provenance must remain provisional-community-tested');
  }
  for (const point of pp19Provenance.damage?.breakpoints ?? []) {
    if (!DAMAGE_POINT_SOURCES.has(point.source)) fail('pp19: damage provenance breakpoint source is missing or invalid');
  }
  if (JSON.stringify(pp19.dmg) !== JSON.stringify(pp19Provenance.damage?.breakpoints)) {
    fail('pp19: live damage curve must match its provisional provenance breakpoints');
  }
  const requiredCrossFileEntries = [
    ['WEAPON_ATTS', attachments.WEAPON_ATTS?.pp19],
    ['WEAPON_ERGO', attachments.WEAPON_ERGO?.pp19],
    ['WEAPON_MAG', attachments.WEAPON_MAG?.pp19],
    ['WEAPON_AMMO', ammo.WEAPON_AMMO?.pp19],
    ['RECOIL_DEC', recoilDecay.RECOIL_DEC?.pp19],
    ['RECOIL_DEC_TEXP', recoilDecay.RECOIL_DEC_TEXP?.pp19],
    ['RECOIL_MULT', balance.RECOIL_MULT?.pp19],
    ['HIP_CLS', balance.HIP_CLS?.pp19],
    ['LIMB_CLASS', balance.LIMB_CLASS?.pp19],
  ];
  for (const [tableName, value] of requiredCrossFileEntries) {
    if (value == null) fail(`pp19: missing cross-file entry ${tableName}`);
  }
  for (const slot of ['muzzle', 'barrel', 'grip', 'laser', 'light']) {
    if (!Array.isArray(attachments.WEAPON_ATTS?.pp19?.[slot])) {
      fail(`pp19: ${slot} slot is missing from WEAPON_ATTS`);
    }
  }
  if (attachments.WEAPON_MAG?.pp19 && !('mags' in attachments.WEAPON_MAG.pp19)) {
    fail('pp19: WEAPON_MAG must declare a mags object, even while coverage is pending');
  }
}

if (damageProvenance.release !== '1.3.3.0' || damageProvenance.baseDamage?.status !== 'provisional-community-tested') {
  fail('damage provenance must remain pinned to 1.3.3.0 with provisional base-damage status');
}
const expectedSweetSpots = {
  sv98: [54, 75],
  m2010esr: [75, 100],
  psr: [90, 120],
  l115: [100, 133],
};
for (const [weaponId, rangeM] of Object.entries(expectedSweetSpots)) {
  const weapon = weapons.find(item => item.id === weaponId);
  const provenance = damageProvenance.sniperSweetSpots?.find(item => item.weaponId === weaponId);
  if (!weapon || !provenance || provenance.status !== 'applied' || provenance.source !== 'EA') {
    fail(`${weaponId}: missing applied EA sweet-spot provenance`);
    continue;
  }
  if (JSON.stringify(provenance.rangeM) !== JSON.stringify(rangeM)
      || JSON.stringify(weapon.sweetSpot?.rangeM) !== JSON.stringify(rangeM)
      || weapon.sweetSpot?.source !== 'EA') {
    fail(`${weaponId}: runtime/provenance sweet-spot range mismatch`);
  }
  // The Sym curve holds 100 across the whole sweet-spot window and ramps out of
  // it, so assert the evaluated window rather than a single labelled breakpoint.
  const [start, end] = rangeM;
  if (damageAtRange(weapon, start) !== 100 || damageAtRange(weapon, end) !== 100) {
    fail(`${weaponId}: damage curve does not hold 100 across the EA sweet spot`);
  }
  if (!(damageAtRange(weapon, start - 1) < 100) || !(damageAtRange(weapon, end + 1) < 100)) {
    fail(`${weaponId}: damage curve does not encode the EA sweet-spot endpoints`);
  }
}
const miniScout = weapons.find(item => item.id === 'miniscout');
const miniProvenance = damageProvenance.sniperSweetSpots?.find(item => item.weaponId === 'miniscout');
if (!miniScout || !miniProvenance || miniProvenance.status !== 'exception'
    || miniProvenance.source !== 'EA' || miniScout.sweetSpot?.rangeM !== null
    || miniScout.sweetSpot?.source !== 'EA') {
  fail('miniscout: Mini Scout no-sweet-spot exception is missing or untagged');
}

const attachmentSets = {
  sight: new Set(attachments.SIGHTS.map(a => a.id)),
  muzzle: new Set(attachments.MUZZLES.map(a => a.id)),
  barrel: new Set(attachments.BARRELS.map(a => a.id)),
  grip: new Set(attachments.GRIPS.map(a => a.id)),
  laser: new Set(attachments.LASERS.map(a => a.id)),
};

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

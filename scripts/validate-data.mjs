import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));

const weapons = readJson('data/weapons.json');
const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const recoilDecay = readJson('data/recoil_decay.json');
const balance = readJson('data/balance_tables.json');

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
  if (!Array.isArray(weapon.dmg) || weapon.dmg.length === 0) {
    fail(`${weapon.id}: dmg must be a non-empty breakpoint array`);
  } else {
    for (const point of weapon.dmg) {
      if (!Number.isFinite(point.r) || !Number.isFinite(point.d)) {
        fail(`${weapon.id}: dmg breakpoint must contain numeric r and d`);
      }
    }
  }
}

const supportedWeaponIds = new Set(weapons.filter(w => SUPPORTED_CLASSES.has(w.cls)).map(w => w.id));

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

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Data validation passed for ${supportedWeaponIds.size} supported weapons (${weapons.length} total).`);

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const attachmentsPath = join(root, 'data/attachments.json');
const weaponsPath = join(root, 'data/weapons.json');
const attachments = readJson('data/attachments.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const axis = balance.DRAW_TIME_AXIS;

assert.ok(axis, 'DRAW_TIME_AXIS must be present before migration');
const groups = axis.weaponGroups;
const offsets = axis.offsets;
const weaponIds = new Set(weapons.map(weapon => weapon.id));
const groupByWeapon = new Map();
for (const [group, ids] of Object.entries(groups)) {
  assert.ok(Array.isArray(ids), `${group}: weapon group must be an array`);
  assert.equal(new Set(ids).size, ids.length, `${group}: duplicate weapon mapping`);
  for (const weaponId of ids) {
    assert.ok(weaponIds.has(weaponId), `${group}: unknown weapon ${weaponId}`);
    assert.equal(groupByWeapon.has(weaponId), false, `${weaponId}: duplicate group mapping`);
    groupByWeapon.set(weaponId, group);
  }
}
assert.deepEqual([...groupByWeapon.keys()].sort(), [...weaponIds].sort(), 'weapon group coverage must be exact');
assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([group, ids]) => [group, ids.length])), {
  primary: 51,
  db12: 1,
  semiAutoSidearm: 4,
  revolverOrAutoSidearm: 3,
});

const records = {};
for (const weapon of [...weapons].sort((a, b) => a.id.localeCompare(b.id))) {
  const weaponMag = attachments.WEAPON_MAG[weapon.id];
  assert.ok(weaponMag, `${weapon.id}: missing WEAPON_MAG`);
  const group = groupByWeapon.get(weapon.id);
  const offset = offsets[group];
  assert.equal(Number.isInteger(weaponMag.defSpr), true, `${weapon.id}: defSpr must be an integer`);
  // Sidearm sprint tables have a distinct source origin: sidearm defSpr 1 is
  // the shared draw coordinate 0, while primary defSpr values already use the
  // shared coordinate directly.
  const drawTimeTier = weaponMag.sprintRecoveryTierTable === 'sidearm'
    ? weaponMag.defSpr + axis.sprintToFire.sidearm.coordinateOrigin
    : weaponMag.defSpr + axis.sprintToFire.primary.coordinateOrigin;
  const [minTier, maxTier] = axis.baseCoordinateRange;
  assert.ok(drawTimeTier >= minTier && drawTimeTier <= maxTier,
    `${weapon.id}: drawTimeTier ${drawTimeTier} outside [${minTier}, ${maxTier}]`);
  records[weapon.id] = {
    drawTimeTier,
    drawTimeGroup: group,
    drawTimeOffset: offset,
  };
}

const next = structuredClone(attachments);
for (const [weaponId, fields] of Object.entries(records)) Object.assign(next.WEAPON_MAG[weaponId], fields);

if (!process.argv.includes('--write-data')) {
  console.log(JSON.stringify({
    mode: 'preview',
    records,
    counts: Object.fromEntries(Object.entries(groups).map(([group, ids]) => [group, ids.length])),
  }, null, 2));
} else {
  writeFileSync(attachmentsPath, `${JSON.stringify(next, null, 2)}\n`);
  if (process.argv.includes('--delete-legacy-deployT')) {
    const nextWeapons = structuredClone(weapons);
    for (const weapon of nextWeapons) {
      assert.equal(typeof weapon.deployT, 'number',
        `${weapon.id}: legacy deployT is missing before migration`);
      delete weapon.deployT;
    }
    writeFileSync(weaponsPath, `${JSON.stringify(nextWeapons, null, 2)}\n`);
  }
  console.log(JSON.stringify({
    mode: 'write-data',
    path: attachmentsPath,
    deletedLegacyDeployT: process.argv.includes('--delete-legacy-deployT'),
    counts: Object.fromEntries(Object.entries(groups).map(([group, ids]) => [group, ids.length])),
  }, null, 2));
}

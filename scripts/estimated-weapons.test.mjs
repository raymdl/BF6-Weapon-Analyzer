import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createShareCodec } from '../sim/share-state.js';
import { attDisplayName, isAssumedAtt } from '../sim/loadout.js';

const root = join(import.meta.dirname, '..');
const read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const weapons = read('data/weapons.json');
const attachments = read('data/attachments.json');
const ammo = read('data/ammo.json');
const byId = id => weapons.find(weapon => weapon.id === id);


test('no weapon is estimated or uses donor values', () => {
  assert.deepEqual(weapons.filter(weapon => weapon.estimated === true), [], 'no weapon carries the estimated flag');
  for (const weapon of weapons) {
    assert.notEqual(weapon.provenance?.status, 'estimated', `${weapon.id}: estimated status`);
    assert.equal(weapon.provenance?.donor, undefined, `${weapon.id}: donor provenance`);
    assert.equal(weapon.provenance?.estimatedFields, undefined, `${weapon.id}: estimated fields`);
    assert.doesNotMatch(JSON.stringify(weapon.dmg) + (weapon.damageSource ?? ''), /donor/i, `${weapon.id}: donor damage`);
  }
});

test('attachment share state round-trips', () => {
  assert.equal(new Set(attachments.BARRELS.map(item => item.id)).size, attachments.BARRELS.length);
  const codec = createShareCodec({
    SIGHTS: attachments.SIGHTS, MUZZLES: attachments.MUZZLES, BARRELS: attachments.BARRELS,
    GRIPS: attachments.GRIPS, LASERS: attachments.LASERS, LIGHTS: attachments.LIGHTS,
    ...attachments, ...ammo,
    defaultAttsForWeapon: weapon => ({ sight: 'iron', muzzle: 'none', barrel: 'basic', grip: 'none', laser: 'none', light: 'none', ammo: 'standard', ergo: 'none', mag: attachments.WEAPON_MAG[weapon.id].def }),
  });
  const weapon = byId('ef88');
  const atts = { sight: 'iron', muzzle: 'none', barrel: 'ext_light', grip: 'none', laser: 'none', light: 'none', ammo: 'standard', ergo: 'none', mag: '42_fast' };
  const encoded = codec.encodeAtts(weapon, atts);
  assert.match(encoded, /B\d+/);
  assert.match(encoded, /K4/);
  assert.deepEqual(codec.decodeAtts(weapon, encoded), atts);
});

test('assumed attachments carry a visible marker', () => {
  assert.equal(attDisplayName({ name: 'Flashlight', assumedFields: { hipSpreadDecayBoost: 'pending' } }), 'Flashlight*');
  assert.equal(isAssumedAtt({ assumed: true }), true);
});

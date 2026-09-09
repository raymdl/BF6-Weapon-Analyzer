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
const balance = read('data/balance_tables.json');
const recoil = read('data/recoil_decay.json');
// These three arrive through the datamined changelist rather than the Sym
// baseline. They no longer carry the estimated flag -- their damage profiles
// are sourced -- so the coverage checks below key off the list itself.
const DATAMINED_WEAPON_IDS = ['brod3', 'ef88', 'vssm'];
const byId = id => weapons.find(weapon => weapon.id === id);
const estimated = DATAMINED_WEAPON_IDS.map(byId);

test('BROD 3, EF88 and VSSM are sourced, not estimated, with explicit provenance', () => {
  assert.deepEqual(weapons.filter(weapon => weapon.estimated === true), [], 'no weapon carries the estimated flag');
  assert.equal(byId('vssm').damageStatus, 'verified');
  assert.equal(byId('vssm').provenance.sourced.changelist, 28877515);
  assert.ok(byId('vssm').provenance.notes.length > 0);
  assert.equal(byId('brod3').damageStatus, 'verified');
  assert.equal(byId('ef88').damageStatus, 'verified');
  assert.equal(byId('brod3').provenance.donor.weaponId, 'grtbc');
  assert.deepEqual(byId('ef88').provenance.donor.weaponIds, ['b36a4', 'l85a3']);
  assert.deepEqual(byId('brod3').provenance.measured.displayedDamageEndpoints, [26, 14]);
  assert.deepEqual(byId('ef88').provenance.measured.displayedDamageEndpoints, [26, 17]);
  assert.ok(byId('brod3').provenance.estimatedFields.length > 0);
  assert.ok(byId('ef88').provenance.estimatedFields.length > 0);
});

test('estimated weapons have complete cross-file coverage and five attachment slots', () => {
  const catalogs = Object.fromEntries(['MUZZLES', 'BARRELS', 'GRIPS', 'LASERS', 'LIGHTS', 'ERGOS'].map(key => [key, new Set(attachments[key].map(item => item.id))]));
  for (const weapon of estimated) {
    const atts = attachments.WEAPON_ATTS[weapon.id];
    for (const slot of ['muzzle', 'barrel', 'laser', 'light', 'grip']) {
      assert.ok(Array.isArray(atts?.[slot]), `${weapon.id}: ${slot}`);
      const catalog = slot === 'muzzle' ? catalogs.MUZZLES : slot === 'barrel' ? catalogs.BARRELS : slot === 'grip' ? catalogs.GRIPS : slot === 'laser' ? catalogs.LASERS : catalogs.LIGHTS;
      for (const id of atts[slot]) assert.ok(catalog.has(id), `${weapon.id}: unknown ${slot} ${id}`);
    }
    assert.ok(attachments.WEAPON_ERGO[weapon.id]);
    assert.ok(attachments.WEAPON_MAG[weapon.id]?.mags);
    assert.ok(ammo.WEAPON_AMMO[weapon.id]);
    assert.equal(recoil.RECOIL_DEC[weapon.id] != null, true);
    assert.equal(recoil.RECOIL_DEC_TEXP[weapon.id] != null, true);
    assert.equal(balance.RECOIL_MULT[weapon.id] != null, true);
    assert.equal(balance.HIP_SPREAD_BASE_INDEX[weapon.id] != null, true);
    assert.equal(balance.LIMB_CLASS[weapon.id], weapon.cls === 'DMR' ? 'dmr' : 'auto');
  }
});

test('reviewed handling decisions and exact donor damage curves are pinned', () => {
  const brod = byId('brod3');
  const ef = byId('ef88');
  const grtbc = byId('grtbc');
  const l85a3 = byId('l85a3');
  assert.equal(brod.rpm, 10800 / 13);
  assert.equal(ef.rpm, 674.999); // Frosty WB and named registry; replaces the older panel-derived rate.
  assert.equal(brod.recoilDir, -16);
  assert.equal(ef.recoilDir, 11);
  for (const weapon of [brod, ef]) {
    const ads = weapon.recoil.ads;
    assert.equal(weapon.recoilV, ads.amount * (ads.amountMult ** ads.amountExp));
    assert.equal(weapon.recoilVar, ads.dirVar);
    assert.equal(weapon.recoilIncAds, weapon.spreadDyn.ads.inc);
    assert.equal(weapon.provenance.sourced.changelist, 28877515);
  }
  assert.equal(brod.mag, 31);
  assert.equal(ef.mag, 31);
  assert.deepEqual(brod.dmg.map(({ r, d }) => [r, d]), grtbc.dmg.map(({ r, d }) => [r, d]));
  assert.deepEqual(ef.dmg.map(({ r, d }) => [r, d]), l85a3.dmg.map(({ r, d }) => [r, d]));
  assert.equal(brod.provenance.damage.donorModel, 'grtbc');
  assert.equal(ef.provenance.damage.donorModel, 'l85a3');
  assert.equal(attachments.WEAPON_MAG.brod3.mags['20_rnd'].adsTimeTierShift, -1);
  assert.equal(attachments.WEAPON_MAG.brod3.mags['20_rnd'].adsMoveSpeedTierShift, -2);
  assert.equal(attachments.WEAPON_MAG.ef88.mags['42_rnd'].adsMoveSpeedTierShift, 1);
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

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
const hitZones = read('data/hit_zones.json');
// Sym does not publish these three weapons, so their values come from Frosty.
const DATAMINED_WEAPON_IDS = ['brod3', 'ef88', 'vssm'];
const byId = id => weapons.find(weapon => weapon.id === id);
const datamined = DATAMINED_WEAPON_IDS.map(byId);

test('no weapon is estimated or uses donor values; BROD 3, EF88 and VSSM are Frosty-sourced', () => {
  assert.deepEqual(weapons.filter(weapon => weapon.estimated === true), [], 'no weapon carries the estimated flag');
  for (const weapon of weapons) {
    assert.notEqual(weapon.provenance?.status, 'estimated', `${weapon.id}: estimated status`);
    assert.equal(weapon.provenance?.donor, undefined, `${weapon.id}: donor provenance`);
    assert.equal(weapon.provenance?.estimatedFields, undefined, `${weapon.id}: estimated fields`);
    assert.doesNotMatch(JSON.stringify(weapon.dmg) + (weapon.damageSource ?? ''), /donor/i, `${weapon.id}: donor damage`);
  }
  for (const weapon of datamined) {
    assert.equal(weapon.provenance.status, 'sourced', weapon.id);
    assert.equal(weapon.damageStatus, 'verified', weapon.id);
    assert.ok(weapon.dmg.every(point => point.source === 'Frosty'), weapon.id);
    assert.match(weapon.provenance.frosty.sourcingEvidence, /frosty-1\.4\.2\.5-datamined-weapons-2026-09-12\.json/);
  }
  assert.ok(byId('vssm').provenance.notes.length > 0);
});

test('BROD 3, EF88 and VSSM have complete cross-file coverage and five attachment slots', () => {
  const catalogs = Object.fromEntries(['MUZZLES', 'BARRELS', 'GRIPS', 'LASERS', 'LIGHTS', 'ERGOS'].map(key => [key, new Set(attachments[key].map(item => item.id))]));
  for (const weapon of datamined) {
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
    assert.ok(hitZones.weapons[weapon.id], `${weapon.id}: Frosty hit zones`);
  }
});

test('reviewed handling decisions and Frosty damage curves are pinned', () => {
  const brod = byId('brod3');
  const ef = byId('ef88');
  const vssm = byId('vssm');
  assert.equal(brod.rpm, 10800 / 13);
  assert.equal(ef.rpm, 674.999); // Frosty WB and named registry; replaces the older panel-derived rate.
  assert.equal(brod.recoilDir, -16);
  assert.equal(ef.recoilDir, 11);
  for (const weapon of [brod, ef]) {
    const ads = weapon.recoil.ads;
    assert.equal(weapon.recoilV, ads.amount * (ads.amountMult ** ads.amountExp));
    assert.equal(weapon.recoilVar, ads.dirVar);
    assert.equal(weapon.recoilIncAds, weapon.spreadDyn.ads.inc);
  }
  assert.equal(brod.mag, 31);
  assert.equal(ef.mag, 31);
  const curve = weapon => weapon.dmg.map(({ r, d }) => [r, d]);
  // Frosty 1.4.2.5 bullet curves: PD_556x45mmNATO_Carbine, PD_556x45mmNATO, PD_9x39mm_Semi.
  assert.deepEqual(curve(brod), [[0, 26.05], [9, 26.05], [9, 21.56], [21, 21.56], [21, 17.74], [36, 17.74], [36, 17.13], [75, 17.13], [75, 14.62]]);
  assert.deepEqual(curve(ef), [[0, 26.05], [21, 26.05], [21, 20.67], [75, 20.67], [75, 17.13]]);
  assert.deepEqual(curve(vssm), [[0, 35.22], [9, 35.22], [9, 27.48], [21, 27.48], [21, 21.56], [36, 21.56], [36, 20.67], [75, 20.67], [75, 17.13]]);
  assert.equal(ef.reloadSpeed, 1);
  assert.equal(vssm.emptyRld, 3.584);
  for (const key of ['burstRounds', 'burstRpm', 'burstBurstsPerMinute']) {
    assert.equal(Object.hasOwn(brod, key), false, `BROD 3 has no burst mode: ${key}`);
  }
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

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createShareCodec } from '../sim/share-state.js';

const root = join(import.meta.dirname, '..');
const read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const weapons = read('data/weapons.json');
const attachments = read('data/attachments.json');
const ammo = read('data/ammo.json');
const balance = read('data/balance_tables.json');
const recoil = read('data/recoil_decay.json');
const ui = readFileSync(join(root, 'ui/app.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const estimated = weapons.filter(weapon => weapon.estimated === true);
const byId = id => weapons.find(weapon => weapon.id === id);

test('exactly BROD 3 and EF88 are estimated with explicit donor provenance', () => {
  assert.deepEqual(estimated.map(weapon => weapon.id), ['brod3', 'ef88']);
  assert.equal(byId('vssm'), undefined);
  assert.equal(byId('brod3').damageStatus, 'provisional');
  assert.equal(byId('ef88').damageStatus, 'provisional');
  assert.equal(byId('brod3').provenance.donor.weaponId, 'grtbc');
  assert.deepEqual(byId('ef88').provenance.donor.weaponIds, ['b36a4', 'l85a3']);
  assert.deepEqual(byId('brod3').provenance.measured.damageEndpoints, [26, 14]);
  assert.deepEqual(byId('ef88').provenance.measured.damageEndpoints, [26, 17]);
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
    assert.equal(balance.HIP_CLS[weapon.id] != null, true);
    assert.equal(balance.LIMB_CLASS[weapon.id], 'auto');
  }
});

test('reviewed handling decisions and measured endpoint contracts are pinned', () => {
  const brod = byId('brod3');
  const ef = byId('ef88');
  assert.equal(brod.rpm, 10800 / 13);
  assert.equal(ef.rpm, 10800 / 16);
  assert.equal(brod.recoilDir, -16);
  assert.equal(ef.recoilDir, 12);
  assert.equal(brod.recoilV, byId('grtbc').recoilV);
  assert.equal(ef.recoilV, (byId('b36a4').recoilV + byId('l85a3').recoilV) / 2);
  assert.equal(brod.mag, 31);
  assert.equal(ef.mag, 31);
  assert.equal(brod.dmg[0].d, 26);
  assert.equal(brod.dmg.at(-1).d, 14);
  assert.equal(ef.dmg[0].d, 26);
  assert.equal(ef.dmg.at(-1).d, 17);
  assert.equal(brod.provenance.damage.donorModel, 'grtbc');
  assert.equal(ef.provenance.damage.donorModel, 'l85a3');
  assert.equal(attachments.WEAPON_MAG.brod3.mags['20_rnd'].adsTimeTierShift, -1);
  assert.equal(attachments.WEAPON_MAG.brod3.mags['20_rnd'].adsMoveSpeedTierShift, -2);
  assert.equal(attachments.WEAPON_MAG.ef88.mags['42_rnd'].adsMoveSpeedTierShift, 1);
});

test('new attachment tokens are append-only and share state round-trips', () => {
  assert.deepEqual(attachments.BARRELS.slice(-3).map(item => item.id), ['cryo', 'ext_light', 'short_light']);
  assert.equal(new Set(attachments.BARRELS.map(item => item.id)).size, attachments.BARRELS.length);
  const codec = createShareCodec({
    SIGHTS: attachments.SIGHTS, MUZZLES: attachments.MUZZLES, BARRELS: attachments.BARRELS,
    GRIPS: attachments.GRIPS, LASERS: attachments.LASERS, LIGHTS: attachments.LIGHTS,
    ERGOS: attachments.ERGOS, AMMO: ammo.AMMO, WEAPON_MAG: attachments.WEAPON_MAG,
    defaultAttsForWeapon: weapon => ({ sight: 'iron', muzzle: 'none', barrel: 'basic', grip: 'none', laser: 'none', light: 'none', ammo: 'standard', ergo: 'none', mag: attachments.WEAPON_MAG[weapon.id].def }),
  });
  const weapon = byId('ef88');
  const atts = { sight: 'iron', muzzle: 'none', barrel: 'ext_light', grip: 'none', laser: 'none', light: 'none', ammo: 'standard', ergo: 'none', mag: '42_fast' };
  const encoded = codec.encodeAtts(weapon, atts);
  assert.match(encoded, /B\d+/);
  assert.match(encoded, /K4/);
  assert.deepEqual(codec.decodeAtts(weapon, encoded), atts);
});

test('estimated badge and per-slot footnote are wired for normal and compare selections', () => {
  assert.match(ui, /w\.estimated \? `\$\{w\.name\} — ESTIMATED`/);
  assert.match(ui, /wbadge-estimated/);
  assert.match(ui, /Similar-weapon estimate pending Sym full statistics/);
  assert.match(ui, /state\.slots\[1\]/);
  assert.match(html, /wbadge-estimated/);
});

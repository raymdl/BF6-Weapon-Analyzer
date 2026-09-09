import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyAttachments, resolveReloadTiming, setAttachmentContext } from '../sim/applyAttachments.js';
import { resetAttsForWeapon } from '../sim/loadout.js';
import { formatMilliseconds, formatMovementMultiplier } from '../ui/format.js';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const attachments = read('../data/attachments.json');
const ammo = read('../data/ammo.json');
const balance = read('../data/balance_tables.json');
const weapons = read('../data/weapons.json');
const evidence = read('../reference-data/provenance/frosty-array-review-2026-09-09.json');
setAttachmentContext({ ...attachments, ...ammo, ...balance, HP_HS_HIGH: new Set(balance.HP_HS_HIGH) });
const build = (id, changes = {}) => {
  const weapon = weapons.find(w => w.id === id);
  const atts = {};
  resetAttsForWeapon(atts, weapon, { ...attachments, ...ammo });
  return applyAttachments(weapon, { ...atts, ...changes });
};

test('ADS calculations retain source precision while the panel keeps captured rounding', () => {
  assert.deepEqual(balance.ADS_SPD_TIERS,
    evidence.arrays.zoom.FZTT_General_01.map(value => +(value * 1000).toFixed(6)));
  assert.deepEqual(balance.ADS_MOVE_TIERS, evidence.arrays.adsMove);
  assert.deepEqual(balance.MOVING_ACC_TIERS, evidence.arrays.movingAdsSpread.map(row => Number(row.Field_6c73f45b)));
  assert.equal(balance.DEFAULT_MOV_TIER, 3);
  assert.deepEqual(balance.ADS_SPD_TIERS.map(formatMilliseconds), [500, 433, 367, 300, 250, 200, 167, 133]);
  assert.deepEqual(balance.ADS_MOVE_TIERS.map(formatMovementMultiplier),
    ['0.32', '0.32', '0.37', '0.42', '0.47', '0.54', '0.60', '0.67', '0.75', '0.82', '0.91', '1.00']);
  assert.equal(formatMilliseconds(null), '—');
  assert.equal(formatMovementMultiplier(null), '—');
  assert.equal(build('interdictor')._adsTimeMs, 433.334);
  assert.ok(weapons.some(w => [0.825, 0.745, 0.535, 0.475].includes(build(w.id)._adsMoveSpeedMult)));
  assert.equal(build('vssm')._adsTimeMs, 250);
});

test('hip table retains all source fields and weapon selectors without sorting the rows', () => {
  assert.equal(balance.HIP_SPREAD_TABLE.length, 18);
  const fields = { hipStand: 'Field_1867639b', hipMove: 'Field_c5401fc2' };
  balance.HIP_SPREAD_TABLE.forEach((row, index) => {
    assert.equal(Object.keys(row).length, 7);
    for (const [key, value] of Object.entries(row)) {
      assert.equal(value, Number(evidence.arrays.hipSpread[index][fields[key] ?? key]));
    }
  });
  for (const row of evidence.weapons) {
    assert.equal(balance.HIP_SPREAD_BASE_INDEX[row.weapon], row.indices.hipSpread);
  }
  assert.equal(balance.HIP_SPREAD_BASE_INDEX.vssm, 4);
  assert.equal(build('vssm').spread.hipStand[0], 3.352);
  assert.equal(balance.HIP_SPREAD_TABLE[10].hipStand, 0.38);
  assert.equal(balance.HIP_SPREAD_TABLE[11].hipStand, 2.16);
});

test('shotgun pellet ammunition adds nine source rows and stacks before clamping', () => {
  for (const id of ['ks18k', 'm87a1', 'db12', 'm1014']) {
    const raw = weapons.find(w => w.id === id);
    const original = structuredClone(raw);
    const baseIndex = balance.HIP_SPREAD_BASE_INDEX[id];
    for (const ammoId of ['buckshot', 'buckshot_00', 'flechette', 'slugs']) {
      const result = build(id, { ammo: ammoId });
      const shift = ammoId === 'slugs' ? 0 : -9;
      assert.equal(result._hipSpreadTierMod, shift, `${id}/${ammoId}`);
      const row = balance.HIP_SPREAD_TABLE[baseIndex - shift];
      for (const key of ['hipStand', 'hipMove']) {
        assert.deepEqual(result.spread[key], [row[key], raw.spread[key][1]]);
      }
    }
    assert.deepEqual(raw, original);
  }
  // Synthetic modifiers exercise the endpoint and opposing-shift order.
  setAttachmentContext({ LASERS: [{ id: 'none' }, { id: 'test_laser', hipSpreadTierMod: -100 }],
    GRIPS: [{ id: 'none' }, { id: 'test_grip', hipSpreadTierMod: 100 }] });
  try {
    const id = 'ks18k';
    assert.equal(build(id, { laser: 'test_laser' }).spread.hipStand[0], 0.208);
    assert.equal(build(id, { grip: 'test_grip' }).spread.hipStand[0], 7.4);
    assert.deepEqual(build(id, { laser: 'test_laser', grip: 'test_grip' }).spread, build(id).spread);
  } finally {
    setAttachmentContext({ LASERS: attachments.LASERS, GRIPS: attachments.GRIPS });
  }
});

test('double reload tier uses the exported 1.277 factor without rounding the calculation', () => {
  const result = resolveReloadTiming({ weaponTacRld: 3, magData: { reloadSpeedTier: 2 },
    ergoData: { reloadSpeedMult: 1.063 } });
  assert.equal(result.tacRld, 3 / (1.277 * 1.063));
  assert.notEqual(result.tacRld, 3 / (1.13 ** 2 * 1.063));
  assert.equal(result.tacRld.toFixed(3), '2.210');
});

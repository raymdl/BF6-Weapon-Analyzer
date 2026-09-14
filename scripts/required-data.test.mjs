import { setDataErrorReporter } from '../sim/required-data.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateWeaponSimulation, recoilGroup, spreadDynamics, spreadBounds, shotIntervalAfter, setSimContext } from '../sim/core.js';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';

const read = name => JSON.parse(readFileSync(new URL('../data/' + name + '.json', import.meta.url)));
const weapons = read('weapons');
const balance = read('balance_tables');
const context = { ...read('attachments'), ...read('ammo'), ...balance, HIT_ZONES: read('hit_zones') };

test('every current weapon has explicit simulation source data', () => {
  for (const weapon of weapons) assert.doesNotThrow(() => validateWeaponSimulation(weapon), weapon.id);
});

test('missing and non-finite simulation fields fail before results are published', () => {
  for (const path of [
    ['rpm'], ['recoilV'], ['recoilVar'], ['recoilIncAds'],
    ...['ads', 'hip'].flatMap(aim => [
      ...['dir', 'amount', 'amountMult', 'amountExp', 'dirVar', 'dirVarMult', 'dirVarExp',
        'decFactor', 'decExp', 'decTimeExp', 'decOffset'].map(field => ['recoil', aim, field]),
      ...['inc', 'firingCoef', 'firingExp', 'firingOffset', 'notFiringCoef', 'notFiringExp',
        'notFiringOffset', 'distExp'].map(field => ['spreadDyn', aim, field]),
    ]),
  ]) {
    for (const value of [undefined, null, NaN, Infinity]) {
      const weapon = structuredClone(weapons[0]);
      let record = weapon;
      for (const key of path.slice(0, -1)) record = record[key];
      record[path.at(-1)] = value;
      assert.throws(() => validateWeaponSimulation(weapon), /Missing or invalid/, path.join('.'));
    }
  }
});

test('direct simulation callers cannot use legacy recoil, spread, or RPM defaults', () => {
  setSimContext({ aimState: 'ads', stanceState: 'stand' });
  assert.throws(() => recoilGroup({ id: 'missing', recoilV: 1 }), /missing recoil.ads/);
  assert.throws(() => spreadDynamics({ id: 'missing' }), /missing spreadDyn.ads/);
  assert.throws(() => spreadBounds({ id: 'missing' }), /missing spread.adsStand/);
  for (const rpm of [undefined, null, NaN, Infinity, 0, -1]) {
    assert.throws(() => shotIntervalAfter({ id: 'missing', rpm }, 1), /missing rpm/);
  }
});

test('missing recoil tier rows fail even with no attachment tier shift', () => {
  const weapon = weapons[0];
  const rows = { ...balance.RECOIL_MULT };
  delete rows[weapon.id];
  setAttachmentContext({ ...context, RECOIL_MULT: rows });
  assert.throws(() => applyAttachments(weapon, { ammo: context.WEAPON_AMMO[weapon.id].def }), /RECOIL_MULT/);
  setAttachmentContext(context);
});

test('missing burst timing and malformed bounds fail while single-shot pumps remain valid', () => {
  const burst = structuredClone(weapons.find(w => w.fireMode === 'burst'));
  delete burst.burstBurstsPerMinute;
  assert.throws(() => validateWeaponSimulation(burst), /burstBurstsPerMinute/);
  const weapon = structuredClone(weapons[0]);
  for (const bounds of [undefined, [0, NaN], [2, 1]]) {
    weapon.spread.adsStand = bounds;
    assert.throws(() => validateWeaponSimulation(weapon), /spread.adsStand/);
  }
});

test('UI reporting keeps missing values unavailable and preserves independent stats', () => {
  const errors = [];
  setDataErrorReporter(error => errors.push(error.message));
  try {
    const weapon = structuredClone(weapons[0]);
    delete weapon.rpm;
    delete weapon.recoil.ads.decFactor;
    assert.equal(validateWeaponSimulation(weapon), false);
    assert.ok(errors.some(message => message.includes('rpm')));
    assert.ok(errors.some(message => message.includes('decFactor')));
    setAttachmentContext(context);
    const build = applyAttachments(weapon, { ammo: context.WEAPON_AMMO[weapon.id].def });
    assert.equal(build.rpm, undefined);
    assert.deepEqual(build.dmg, weapon.dmg);
    assert.equal(build.mag, applyAttachments(weapons[0], { ammo: context.WEAPON_AMMO[weapon.id].def }).mag);
    assert.equal(validateWeaponSimulation(weapons[1]), true);
  } finally { setDataErrorReporter(null); }
});

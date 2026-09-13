import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flightTimeAtDistance, trajectoryAtDistance, zeroRelativeVerticalOffset } from '../sim/ballistics.js';

const model = { velocityMps: 800, dragPerMeter: 0.0025, gravityMps2: -9.81 };
const near = (actual, expected, tolerance, message) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
};

near(flightTimeAtDistance(model, 500), 1.245171, 0.000001, '0.0025 drag matches the 500 m reference time');
near(flightTimeAtDistance({ ...model, dragPerMeter: 0.001 }, 500), 0.810902, 0.000001, '0.001 drag matches the 500 m reference time');
assert.equal(flightTimeAtDistance(null, 500), null, 'missing projectile inputs remain unavailable');
assert.equal(zeroRelativeVerticalOffset(null, 100, 100), null, 'missing projectile inputs do not receive a target-drop fallback');

const zero100AtZero = zeroRelativeVerticalOffset(model, 100, 100);
near(zero100AtZero, 0, 0.000001, 'the solved trajectory intersects its selected zero');
near(zeroRelativeVerticalOffset(model, 0, 100), 0, 0.000001, 'a zeroed trajectory still starts at the bore origin');
assert.ok(zeroRelativeVerticalOffset(model, 300, 100) < 0, 'a 100 m zero lands lower again beyond zero');
assert.ok(trajectoryAtDistance(model, 100).yMeters < 0, 'an unzeroed bore-axis trajectory falls below its origin');

const readJson = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const catalog = readJson('../data/ballistics.json');
const weapons = readJson('../data/weapons.json');
const ammo = readJson('../data/ammo.json').WEAPON_AMMO;
assert.deepEqual(Object.keys(catalog.weapons).sort(), weapons.map(w => w.id).sort());
assert.equal(catalog.schemaVersion, 2);
for (const [id, selection] of Object.entries(catalog.weapons)) {
  assert.deepEqual(Object.keys(selection.ammo).sort(), Object.keys(ammo[id].ammo).sort(), id);
  for (const key of [selection.base, ...Object.values(selection.ammo)]) {
    assert.ok(catalog.projectiles[key], `${id}: selected projectile exists`);
    assert.ok(!key.includes('_SP_'), `${id}: no unresolved SP selection`);
    assert.equal(catalog.projectiles[key].gravityMps2, -9.81);
  }
}
const selected = (id, ammoId) => catalog.projectiles[catalog.weapons[id].ammo[ammoId]];
assert.equal(selected('vssm', 'range_pen').dragPerMeter, 0.002);
assert.equal(selected('sv98', 'long_range').dragPerMeter, 0.002);
assert.equal(selected('sv98', 'penetration').dragPerMeter, 0.0035);
assert.equal(catalog.weapons.m60.ammo.lightweight, undefined);
assert.equal(catalog.weapons.m121a2.ammo.lightweight, undefined);

console.log('ballistics tests passed');

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
// The catalog is the Sym baseline, so it covers every weapon Sym publishes.
// These three reach the site through the datamined changelist instead and carry
// their own sourced bulletVel, which projectileModelFor uses directly.
const DATAMINED_WEAPON_IDS = ['brod3', 'ef88', 'vssm'];
const symWeaponIds = weapons.filter(weapon => !DATAMINED_WEAPON_IDS.includes(weapon.id)).map(weapon => weapon.id).sort();
assert.deepEqual([...catalog.weaponIds].sort(), symWeaponIds, 'runtime projectile availability covers every Sym-sourced weapon');
assert.equal(catalog.baseline, 'current-live');
assert.equal(catalog.source, 'data/provenance/live-baseline.json#sym-bf6-json');
assert.equal(catalog.gravityMps2, -9.81);
assert.equal(catalog.baseDragPerMeter, 0.0035);
assert.equal(catalog.ammoDragPerMeter.long_range, 0.002);
assert.deepEqual(catalog.ammoDragPerMeter.penetration, { DMR: 0.002, 'Sniper Rifle': 0.002 });

console.log('ballistics tests passed');

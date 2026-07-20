import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  bulletsToKillWithHits,
  damageAtRange,
  resolveHitMultipliers,
  zoneMultiplierForWeapon,
} from '../sim/damage.js';

const tables = {
  BASE_HS_MULT: { dmr: 1.5, sniper: 1.75, shotgun: 1 },
  HP_HS_HIGH: new Set(['dmr']),
  LIMB_CLASS: { auto: 'auto', dmr: 'dmr', sniper: 'sniper' },
  LIMB_CLASS_MULT: { auto: 0.84, dmr: 0.91, sniper: 0.67 },
  AUTO_HS_MULT: { standard: 1.4, hp: 1.57, synthetic: 1.8 },
};

const readJson = relativeUrl => JSON.parse(readFileSync(new URL(relativeUrl, import.meta.url), 'utf8'));

test('resolves automatic headshot ammo tiers and limb multiplier', () => {
  assert.deepEqual(resolveHitMultipliers('auto', { id: 'standard', hsMult: null }, tables), {
    headshotMultiplier: 1.4,
    limbMultiplier: 0.84,
    limbClass: 'auto',
  });
  assert.equal(resolveHitMultipliers('auto', { id: 'hollow_pt', hsMult: 'hp' }, tables).headshotMultiplier, 1.57);
  assert.equal(resolveHitMultipliers('auto', { id: 'synthetic', hsMult: 1.75 }, tables).headshotMultiplier, 1.8);
});

test('preserves DMR headshot behavior and shotgun/sidearm limb exceptions', () => {
  assert.equal(resolveHitMultipliers('dmr', { id: 'hollow_pt', hsMult: 'hp' }, tables).headshotMultiplier, 1.75);
  assert.equal(resolveHitMultipliers('shotgun', { id: 'buckshot', hsMult: 1 }, tables).limbMultiplier, 1);
  assert.equal(resolveHitMultipliers('sidearm', { id: 'standard', hsMult: null }, tables).limbMultiplier, 1);
});

test('calculates pure chest and limb BTK for the adjusted damage families', () => {
  assert.equal(bulletsToKillWithHits(26, { bodyMultiplier: 1 }), 4);
  assert.equal(bulletsToKillWithHits(26, { bodyMultiplier: 0.84 }), 5);
  assert.equal(bulletsToKillWithHits(35, { bodyMultiplier: 1 }), 3);
  assert.equal(bulletsToKillWithHits(35, { bodyMultiplier: 0.84 }), 4);
  assert.equal(bulletsToKillWithHits(100, { bodyMultiplier: 0.67 }), 2);
});

test('calculates mixed head/chest and head/limb sequences independently of hit order', () => {
  assert.equal(bulletsToKillWithHits(25, { headshots: 1, headshotMultiplier: 1.4, bodyMultiplier: 1 }), 4);
  assert.equal(bulletsToKillWithHits(25, { headshots: 1, headshotMultiplier: 1.4, bodyMultiplier: 0.84 }), 5);
  assert.equal(bulletsToKillWithHits(25, { headshots: 99, headshotMultiplier: 1.4, bodyMultiplier: 0.84 }), 3);
});

test('handles breakpoint lookup, exact lethal boundaries, and zone aliases', () => {
  const weapon = { dmg: [{ r: 0, d: 26 }, { r: 20, d: 20 }], _hsMult: 1.4, _limbMult: 0.84 };
  assert.equal(damageAtRange(weapon, 19.99), 26);
  assert.equal(damageAtRange(weapon, 20), 20);
  assert.equal(bulletsToKillWithHits(25, { bodyMultiplier: 1 }), 4);
  assert.equal(zoneMultiplierForWeapon(weapon, 'chest'), 1);
  assert.equal(zoneMultiplierForWeapon(weapon, 'stomach'), 0.84);
  assert.equal(zoneMultiplierForWeapon(weapon, 'arms'), 0.84);
  assert.equal(zoneMultiplierForWeapon(weapon, 'head'), 1.4);
});

test('classifies every current site weapon according to the 1.3.3.0 hit-zone rules', () => {
  const weapons = readJson('../data/weapons.json');
  const balance = readJson('../data/balance_tables.json');
  const actualTables = { ...balance, HP_HS_HIGH: new Set(balance.HP_HS_HIGH) };
  const expectedByClass = {
    'Assault Rifle': ['auto', 0.84, 1.4],
    Carbine: ['auto', 0.84, 1.4],
    SMG: ['auto', 0.84, 1.4],
    LMG: ['auto', 0.84, 1.4],
    DMR: ['dmr', 0.91, null],
    'Sniper Rifle': ['sniper', 0.67, 1.75],
    Shotgun: [null, 1, null],
    Sidearm: [null, 1, null],
  };

  for (const weapon of weapons) {
    const [expectedClass, expectedLimb, expectedAutomaticHead] = expectedByClass[weapon.cls];
    const resolved = resolveHitMultipliers(weapon.id, { id: 'standard', hsMult: null }, actualTables);
    assert.equal(resolved.limbClass, expectedClass, `${weapon.id} limb class`);
    assert.equal(resolved.limbMultiplier, expectedLimb, `${weapon.id} limb multiplier`);
    if (expectedAutomaticHead != null) {
      assert.equal(resolved.headshotMultiplier, expectedAutomaticHead, `${weapon.id} standard head multiplier`);
    }
  }
});

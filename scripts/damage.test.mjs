import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { deriveSweetSpot, hasSweetSpot } from './sweet-spot.mjs';
import { applyAttachments, setAttachmentContext } from '../sim/applyAttachments.js';

import {
  bulletsToKillWithHits,
  damageAtRange,
  damagePerShotAtRange,
  resolveHitMultipliers,
  zoneMultiplierForWeapon,
} from '../sim/damage.js';

const tables = {
  HIT_ZONES: {
    weapons: {
      auto: { headshot: 1.4, limb: 0.84, ammo: { standard: { headshot: 1.4, limb: 0.84 }, hollow_pt: { headshot: 1.57, limb: 0.84 } } },
      sniper: { headshot: 1.75, limb: 0.67, ammo: {} },
    },
  },
};

const readJson = relativeUrl => JSON.parse(readFileSync(new URL(relativeUrl, import.meta.url), 'utf8'));

test('shotgun ammunition replaces pellet count and damage without changing the base weapon', () => {
  const weapons = readJson('../data/weapons.json');
  const ammo = readJson('../data/ammo.json');
  setAttachmentContext({
    ...readJson('../data/attachments.json'),
    ...readJson('../data/balance_tables.json'),
    ...ammo,
    HIT_ZONES: readJson('../data/hit_zones.json'),
  });
  const expected = {
    ks18k: { buck: 80, slug: 75, farSlug: 27.3 },
    db12: { buck: 89.6, slug: 75, farSlug: 30 },
    m1014: { buck: 115.2, slug: 100, farSlug: 30 },
    m87a1: { buck: 134.4, slug: 100, farSlug: 42.9 },
  };
  for (const [id, values] of Object.entries(expected)) {
    const base = weapons.find(w => w.id === id);
    const before = structuredClone(base);
    for (const [ammoId, pellets] of Object.entries({ buckshot: 16, buckshot_00: 8, flechette: 16, slugs: 1 })) {
      const adjusted = applyAttachments(base, { ammo: ammoId, barrel: 'basic' });
      assert.equal(adjusted.pellets, pellets, `${id}/${ammoId} count`);
      assert.ok(Math.abs(damagePerShotAtRange(adjusted, 0) - (ammoId === 'slugs' ? values.slug : values.buck)) < 1e-9, `${id}/${ammoId} total damage`);
      if (ammoId === 'slugs') {
        assert.equal(damageAtRange(adjusted, 100), values.farSlug, `${id} distant slug`);
        assert.equal(damageAtRange(adjusted, 9), values.slug, `${id} repeated-range endpoint`);
      }
    }
    assert.deepEqual(base, before, `${id} base is unchanged`);
  }
  const m1014 = weapons.find(w => w.id === 'm1014');
  const no00 = applyAttachments(m1014, { ammo: 'buckshot_00' });
  assert.equal(damageAtRange(no00, 11), 14.4, 'use the tweakable curve, not the stale regular curve');
  assert.equal(damageAtRange(no00, 12), 10);
  assert.equal(damageAtRange(applyAttachments(m1014, { ammo: 'slugs' }), 9.01), 75);
  const rifle = weapons.find(w => w.id === 'm433');
  assert.deepEqual(applyAttachments(rifle, { ammo: 'standard' }).dmg, rifle.dmg);
});

test('resolves headshot and limb multipliers from hit-zone data per weapon and ammo', () => {
  assert.deepEqual(resolveHitMultipliers('auto', { id: 'standard' }, tables), { headshotMultiplier: 1.4, limbMultiplier: 0.84 });
  assert.equal(resolveHitMultipliers('auto', { id: 'hollow_pt' }, tables).headshotMultiplier, 1.57);
  assert.deepEqual(resolveHitMultipliers('sniper', null, tables), { headshotMultiplier: 1.75, limbMultiplier: 0.67 },
    'a null ammo type selects the weapon base');
  assert.throws(() => resolveHitMultipliers('sniper', { id: 'long_range' }, tables), /ammo "long_range"/,
    'an unlisted ammo is a data error, not a base-weapon fallback');
  assert.throws(() => resolveHitMultipliers('unknown', { id: 'standard' }, tables), /weapon "unknown"/,
    'a weapon without hit-zone data does not receive default multipliers');
  assert.throws(() => zoneMultiplierForWeapon({ dmg: [] }, 'head'), /headshot multiplier/);
  assert.throws(() => zoneMultiplierForWeapon({}, 'limb'), /limb multiplier/);
  for (const field of ['headshot', 'limb']) {
    for (const invalid of [undefined, null, NaN, Infinity]) {
      const broken = structuredClone(tables);
      broken.HIT_ZONES.weapons.auto.ammo.standard[field] = invalid;
      assert.throws(() => resolveHitMultipliers('auto', { id: 'standard' }, broken), /multiplier/);
    }
  }
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
  // Sym encodes a stepped tier as a repeated range: 26 holds through 20 m.
  const weapon = { dmg: [{ r: 0, d: 26 }, { r: 20, d: 26 }, { r: 20, d: 20 }], _hsMult: 1.4, _limbMult: 0.84 };
  assert.equal(damageAtRange(weapon, 19.99), 26);
  assert.equal(damageAtRange(weapon, 20), 26);
  assert.equal(damageAtRange(weapon, 20.01), 20);
  assert.equal(damageAtRange(weapon, 99), 20);
  assert.equal(bulletsToKillWithHits(25, { bodyMultiplier: 1 }), 4);
  assert.equal(zoneMultiplierForWeapon(weapon, 'chest'), 1);
  assert.equal(zoneMultiplierForWeapon(weapon, 'stomach'), 0.84);
  assert.equal(zoneMultiplierForWeapon(weapon, 'arms'), 0.84);
  assert.equal(zoneMultiplierForWeapon(weapon, 'head'), 1.4);
});

// Confirmed by the Sym developers: bolt-actions ramp linearly between tiers,
// every other class steps. Both come from the same polyline — distinct ranges
// interpolate, repeated ranges drop instantly.
test('interpolates linearly between distinct ranges and clamps outside the curve', () => {
  const sniper = { dmg: [{ r: 0, d: 80 }, { r: 36, d: 80 }, { r: 54, d: 100 }, { r: 75, d: 100 }, { r: 100, d: 62 }] };
  assert.equal(damageAtRange(sniper, 36), 80);
  assert.equal(damageAtRange(sniper, 45), 90);
  assert.equal(damageAtRange(sniper, 54), 100);
  assert.equal(damageAtRange(sniper, 75), 100);
  assert.equal(damageAtRange(sniper, 87.5), 81);
  assert.equal(damageAtRange(sniper, 100), 62);
  assert.equal(damageAtRange(sniper, 250), 62);
  assert.equal(damageAtRange(sniper, -5), 80);
});

test('every weapon and ammunition choice resolves finite hit-zone multipliers', () => {
  const weapons = readJson('../data/weapons.json');
  const ammo = readJson('../data/ammo.json');
  const HIT_ZONES = readJson('../data/hit_zones.json');
  const resolve = (id, ammoId) => resolveHitMultipliers(id, ammoId ? { id: ammoId } : null, { HIT_ZONES });
  for (const weapon of weapons) {
    for (const ammoId of Object.keys(ammo.WEAPON_AMMO[weapon.id].ammo)) {
      const multipliers = resolve(weapon.id, ammoId);
      assert.ok(Number.isFinite(multipliers.headshotMultiplier) && Number.isFinite(multipliers.limbMultiplier),
        `${weapon.id}/${ammoId} has finite Frosty hit zones`);
    }
  }
});

test('the sweet spot is the one-shot chest span, not the maximum-damage plateau', () => {
  // The 1.4.2.5 Interdictor peaked at 150 on a 120-150 m plateau; one chest hit already
  // kills from where the ramp crosses 100 to where the falloff drops below it.
  for (const falloffEnd of [170, 175]) {
    const weapon = { dmg: [[100, 80], [120, 150], [150, 150], [falloffEnd, 62], [200, 62]]
      .map(([r, d]) => ({ r, d })) };
    const { rangeM, damage } = deriveSweetSpot(weapon);
    assert.ok(Math.abs(rangeM[0] - (100 + 20 * 20 / 70)) < 1e-9, 'ramp crossing into 100');
    assert.ok(Math.abs(rangeM[1] - (150 + 50 * (falloffEnd - 150) / 88)) < 1e-9, 'falloff crossing below 100');
    assert.equal(damage, 150);
    assert.equal(damageAtRange(weapon, 135), 150);
    assert.equal(bulletsToKillWithHits(damageAtRange(weapon, 135), { bodyMultiplier: 0.67 }), 1);
  }
  // A curve that peaks at exactly 100 gives the plateau itself (the launch bolt-actions).
  const plateau = { dmg: [[54, 80], [75, 100], [100, 100], [133, 62]].map(([r, d]) => ({ r, d })) };
  assert.deepEqual(deriveSweetSpot(plateau), { rangeM: [75, 100], damage: 100 });
  // The ELR-40 Single Shot bullet peaks at 120 from 42 to 68 m but one-shots from 30 to 80 m.
  const singleShot = { dmg: [[0, 90], [24, 90], [42, 120], [68, 120], [80, 100], [140, 80]]
    .map(([r, d]) => ({ r, d })) };
  assert.deepEqual(deriveSweetSpot(singleShot), { rangeM: [30, 80], damage: 120 });
  const separatedPeaks = { dmg: [{ r: 120, d: 150 }, { r: 135, d: 80 }, { r: 150, d: 150 }] };
  assert.equal(hasSweetSpot(separatedPeaks), false);
});

test('every base damage curve is verified Frosty data', () => {
  const weapons = readJson('../data/weapons.json');
  // Frosty is the golden source for every base damage curve.
  for (const weapon of weapons) {
    assert.equal(weapon.damageStatus, 'verified', `${weapon.id} status`);
    assert.equal(weapon.dmg.every(point => point.source === 'Frosty'), true, `${weapon.id} source`);
  }
});

test('non-sniper, non-shotgun damage curves are stepped: no sampled range lands between tiers', () => {
  const weapons = readJson('../data/weapons.json');
  // Bolt-actions ramp across their sweet spot and shotguns carry a 1 m blend at
  // each tier boundary. Every other class repeats each boundary range, so no
  // sampled range may land strictly between two adjacent tier values.
  const stepped = weapon => weapon.cls !== 'Sniper Rifle' && weapon.cls !== 'Shotgun';
  for (const weapon of weapons.filter(stepped)) {
    const tiers = new Set(weapon.dmg.map(point => point.d));
    for (let range = 0; range <= 150; range += 0.5) {
      assert.ok(tiers.has(damageAtRange(weapon, range)), `${weapon.id} stepped at ${range}m`);
    }
  }
});

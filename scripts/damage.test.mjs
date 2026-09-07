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
  BASE_HS_MULT: { dmr: 1.5, sniper: 1.75, shotgun: 1 },
  HP_HS_HIGH: new Set(['dmr']),
  LIMB_CLASS: { auto: 'auto', dmr: 'dmr', sniper: 'sniper' },
  LIMB_CLASS_MULT: { auto: 0.84, dmr: 0.91, sniper: 0.67 },
  AUTO_HS_MULT: { standard: 1.4, hp: 1.57, synthetic: 1.8 },
};

const readJson = relativeUrl => JSON.parse(readFileSync(new URL(relativeUrl, import.meta.url), 'utf8'));

test('shotgun ammunition replaces pellet count and damage without changing the base weapon', () => {
  const weapons = readJson('../data/weapons.json');
  const ammo = readJson('../data/ammo.json');
  setAttachmentContext({
    ...readJson('../data/attachments.json'),
    ...readJson('../data/balance_tables.json'),
    ...ammo,
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

test('classifies every current site weapon according to the live hit-zone rules', () => {
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
    const [expectedClass, expectedLimb, expectedAutomaticHead] = weapon.id === 'vz61'
      ? ['auto', 0.84, 1.4]
      : expectedByClass[weapon.cls];
    const resolved = resolveHitMultipliers(weapon.id, { id: 'standard', hsMult: null }, actualTables);
    assert.equal(resolved.limbClass, expectedClass, `${weapon.id} limb class`);
    assert.equal(resolved.limbMultiplier, expectedLimb, `${weapon.id} limb multiplier`);
    if (expectedAutomaticHead != null) {
      assert.equal(resolved.headshotMultiplier, expectedAutomaticHead, `${weapon.id} standard head multiplier`);
    }
  }
});

test('derives sniper sweet spots from the curve and preserves the Mini Scout exception', () => {
  const weapons = readJson('../data/weapons.json');
  const snipers = weapons.filter(weapon => weapon.cls === 'Sniper Rifle');
  assert.ok(snipers.length > 0);

  // No weapon stores a sweet-spot window. A later update may move it, so the
  // current damage curve remains the only runtime authority for the window.
  assert.deepEqual(weapons.filter(weapon => 'sweetSpot' in weapon), []);

  const withPlateau = snipers.filter(weapon => hasSweetSpot(weapon));
  assert.ok(withPlateau.length >= 4, 'bolt-actions carry a sweet-spot plateau');
  for (const weapon of withPlateau) {
    const { rangeM: [start, end], damage } = deriveSweetSpot(weapon);
    assert.ok(end > start, `${weapon.id} sweet spot spans a range`);
    // The sweet spot is the flat plateau; damage ramps in and out of it.
    assert.ok(damageAtRange(weapon, start - 1) < damage, `${weapon.id} ramps into the sweet spot`);
    assert.equal(damageAtRange(weapon, start), damage);
    assert.equal(damageAtRange(weapon, end), damage);
    assert.ok(damageAtRange(weapon, end + 1) < damage, `${weapon.id} ramps out of the sweet spot`);
    assert.equal(weapon.dmg.at(-1).d, 62, `${weapon.id} minimum damage`);
  }

  const miniScout = weapons.find(item => item.id === 'miniscout');
  assert.equal(hasSweetSpot(miniScout), false);
  assert.equal(miniScout.dmg.some(point => point.d === 100), false);
});

test('recognizes the Interdictor plateau without capping damage before limb multipliers', () => {
  // Both exported health curves have this plateau; their falloff endpoints differ.
  for (const falloffEnd of [170, 175]) {
    const weapon = { dmg: [[100, 80], [120, 150], [150, 150], [falloffEnd, 62], [200, 62]]
      .map(([r, d]) => ({ r, d })) };
    assert.deepEqual(deriveSweetSpot(weapon), { rangeM: [120, 150], damage: 150 });
    assert.equal(damageAtRange(weapon, 135), 150);
    assert.equal(bulletsToKillWithHits(damageAtRange(weapon, 135), { bodyMultiplier: tables.LIMB_CLASS_MULT.sniper }), 1);
  }
  const separatedPeaks = { dmg: [{ r: 120, d: 150 }, { r: 135, d: 80 }, { r: 150, d: 150 }] };
  assert.equal(hasSweetSpot(separatedPeaks), false);
});

test('every live damage breakpoint carries explicit source provenance', () => {
  const weapons = readJson('../data/weapons.json');
  for (const weapon of weapons) {
    if (!Array.isArray(weapon.dmg)) continue;
    for (const point of weapon.dmg) assert.ok(['EA', 'Sym', 'in-game', 'Frosty'].includes(point.source), `${weapon.id} source`);
  }
});

test('Interdictor keeps its chest and limb kill windows distinct', () => {
  const weapon = readJson('../data/weapons.json').find(w => w.id === 'interdictor');
  const balance = readJson('../data/balance_tables.json');
  const { limbMultiplier } = resolveHitMultipliers(weapon.id, { id: 'standard' }, balance);
  const btk = (range, bodyMultiplier) => bulletsToKillWithHits(damageAtRange(weapon, range), { bodyMultiplier });
  assert.deepEqual([105, 106, 164, 165].map(r => btk(r, 1)), [2, 1, 1, 2]);
  assert.deepEqual([119, 120, 150, 151].map(r => btk(r, limbMultiplier)), [2, 1, 1, 2]);
  assert.equal(damageAtRange(weapon, 135), 150);
});

test('uses the refreshed Sym game-file damage tiers', () => {
  const weapons = readJson('../data/weapons.json');
  const curves = Object.fromEntries(weapons.map(weapon => [weapon.id, weapon.dmg?.map(point => point.d)]));

  assert.deepEqual(curves.m433, [26.05, 26.05, 20.67, 20.67, 17.13]);
  assert.deepEqual(curves.ak4d, [35.22, 35.22, 26.05, 26.05, 20.67]);
  assert.deepEqual(curves.nvo228e, [35.22, 35.22, 27.48, 27.48, 21.56, 21.56, 20.67, 20.67, 17.13]);
  assert.deepEqual(curves.pw5a3, [26.05, 26.05, 20.67, 20.67, 17.13, 17.13, 14.62, 14.62, 12.76]);
  assert.deepEqual(curves.m39emr, [41.5, 41.5, 37.6, 37.6, 34.4]);
  assert.deepEqual(curves.lmr27, [29.4, 29.4, 27.5, 27.5, 26.2]);
  assert.deepEqual(curves.svk86, [66.7, 66.7, 57.2, 57.2, 52.4]);

  // Preserve the distinct source of each reviewed curve.
  const NON_SYM_CURVES = { vssm: 'in-game', interdictor: 'Frosty' };
  for (const weapon of weapons) {
    assert.equal(weapon.damageStatus, 'verified', `${weapon.id} status`);
    const expected = NON_SYM_CURVES[weapon.id] ?? 'Sym';
    assert.equal(weapon.dmg.every(point => point.source === expected), true, `${weapon.id} source`);
  }
});

test('evaluates non-sniper damage curves and the NVO-228E tiers at whole metres', () => {
  const weapons = readJson('../data/weapons.json');
  const byId = Object.fromEntries(weapons.map(weapon => [weapon.id, weapon]));

  const nvo = byId.nvo228e;
  assert.equal(damageAtRange(nvo, 9), 35.22);
  assert.equal(damageAtRange(nvo, 10), 27.48);
  assert.equal(damageAtRange(nvo, 21), 27.48);
  assert.equal(damageAtRange(nvo, 22), 21.56);
  assert.equal(damageAtRange(nvo, 36), 21.56);
  assert.equal(damageAtRange(nvo, 37), 20.67);
  assert.equal(damageAtRange(nvo, 75), 20.67);
  assert.equal(damageAtRange(nvo, 76), 17.13);

  // Bolt-actions ramp across their sweet spot and shotguns carry a 1 m blend at
  // each tier boundary. Every other class repeats each boundary range, so no
  // sampled range may land strictly between two adjacent tier values.
  const stepped = weapon => weapon.cls !== 'Sniper Rifle' && weapon.cls !== 'Shotgun';
  // Provisional estimates retain donor-derived damage shapes until Sym publishes
  // the weapon-specific curve; their endpoint/dropoff contract is covered by
  // estimated-weapons.test.mjs instead of this measured-shape assertion.
  for (const weapon of weapons.filter(weapon => stepped(weapon) && !weapon.estimated)) {
    const tiers = new Set(weapon.dmg.map(point => point.d));
    for (let range = 0; range <= 150; range += 0.5) {
      assert.ok(tiers.has(damageAtRange(weapon, range)), `${weapon.id} stepped at ${range}m`);
    }
  }

  // User-confirmed: the M250 has a special profile with no falloff at any range.
  // Sym stops its curve at 15 m, which must stay a flat clamp, not a gap to fill.
  const m250 = byId.m250;
  assert.deepEqual(m250.dmg.map(point => point.d), [26.05, 26.05]);
  for (const range of [0, 15, 16, 50, 75, 150, 500]) {
    assert.equal(damageAtRange(m250, range), 26.05, `m250 flat at ${range}m`);
  }

  assert.deepEqual(byId.vz61.dmg.map(point => point.d), [17.13, 17.13, 15.07, 15.07, 13.09, 13.09, 12.76, 12.76, 11.32]);
  assert.deepEqual(byId.m87a1.dmg.map(point => point.d), [8.4, 8.4, 7.2, 7.2, 5.6, 5.6, 3.8]);
  assert.deepEqual(byId.db12.dmg.map(point => point.d), [5.6, 5.6, 3.3, 3.3, 2.5]);
});

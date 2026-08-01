import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  applyAttachments,
  floorVelocityDisplay,
  resolveBarrelVelocity,
  setAttachmentContext,
  VELOCITY_DISPLAY_EPSILON,
} from '../sim/applyAttachments.js';
import { compareBarrelVelocityLegacyAndDerived, buildEquivalenceEnumeration } from './attachment-equivalence-phase5.mjs';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const attachments = readJson('data/attachments.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const ammo = readJson('data/ammo.json');
const velocityManifest = readJson('scripts/barrel-velocity-phase7-manifest.json');

const context = {
  MUZZLES: attachments.MUZZLES,
  BARRELS: attachments.BARRELS,
  GRIPS: attachments.GRIPS,
  LASERS: attachments.LASERS,
  LIGHTS: attachments.LIGHTS,
  ERGOS: attachments.ERGOS,
  WEAPON_MAG: attachments.WEAPON_MAG,
  WEAPON_ERGO: attachments.WEAPON_ERGO,
  AMMO: ammo.AMMO,
  RECOIL_MULT: balance.RECOIL_MULT,
  HIP_SPREAD_TIERS: balance.HIP_SPREAD_TIERS,
  HIP_SPREAD_BASE_IDX: balance.HIP_SPREAD_BASE_IDX,
  HIP_CLS: balance.HIP_CLS,
  BASE_HS_MULT: balance.BASE_HS_MULT,
  HP_HS_HIGH: new Set(balance.HP_HS_HIGH),
  LIMB_CLASS: balance.LIMB_CLASS,
  LIMB_CLASS_MULT: balance.LIMB_CLASS_MULT,
  AUTO_HS_MULT: balance.AUTO_HS_MULT,
  MOVING_ACC_TIERS: balance.MOVING_ACC_TIERS,
  DEFAULT_MOV_TIER: balance.DEFAULT_MOV_TIER,
  ADS_SPD_TIERS: balance.ADS_SPD_TIERS,
  SPRINT_REC_TIERS: balance.SPRINT_REC_TIERS,
  PRIMARY_SPRINT_REC_TIERS: balance.PRIMARY_SPRINT_REC_TIERS,
  SIDEARM_SPRINT_REC_TIERS: balance.SIDEARM_SPRINT_REC_TIERS,
  DEPLOY_TIME_TIERS: balance.DEPLOY_TIME_TIERS,
  ADS_MOVE_TIERS: balance.ADS_MOVE_TIERS,
  DRAW_TIME_AXIS: balance.DRAW_TIME_AXIS,
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
  VELOCITY_LADDER: balance.VELOCITY_LADDER,
};

setAttachmentContext(context);

test('Phase 7 data has all seven exact velocity tiers and retains velMult', () => {
  assert.equal(balance.VELOCITY_LADDER, 0.8);
  const expected = new Map([
    ['none', 0],
    ['basic', 0],
    ['short', -1],
    ['extended', 1],
    ['heavy', 0],
    ['heavy_ext', 1],
    ['light', 0],
  ]);
  assert.deepEqual(new Set(attachments.BARRELS.map(barrel => barrel.id)), new Set(expected.keys()));
  for (const barrel of attachments.BARRELS) {
    assert.equal(barrel.velTierMod, expected.get(barrel.id), barrel.id);
    assert.equal(Object.hasOwn(barrel, 'velMult'), true, `${barrel.id} must retain velMult`);
    assert.equal(barrel.velMult, balance.VELOCITY_LADDER ** (-barrel.velTierMod), barrel.id);
  }
});

test('Phase 7 velocity dual-read prefers velTierMod and falls back to velMult', () => {
  assert.deepEqual(resolveBarrelVelocity({ barData: { velTierMod: -1, velMult: 0.8 } }), {
    multiplier: 0.8,
    branch: 'derived',
    mode: 'tier',
    velTierMod: -1,
    reason: 'derived-tier',
  });
  assert.deepEqual(resolveBarrelVelocity({ barData: { velMult: 0.8 } }), {
    multiplier: 0.8,
    branch: 'legacy',
    mode: 'velMult',
    reason: 'legacy-velMult',
  });
  assert.equal(resolveBarrelVelocity({ barData: { velTierMod: 1, velMult: 0.8 } }).multiplier, 1.25);
  assert.equal(resolveBarrelVelocity({ barData: { velTierMod: null, velMult: 0.8 } }).branch, 'derived');
  assert.equal(resolveBarrelVelocity({ barData: { velTierMod: 1 } }).branch, 'derived');
  assert.equal(resolveBarrelVelocity({ barData: { velTierMod: 1 } }).multiplier, 1.25);
});

test('Phase 7 derived and legacy barrel velocity are bit-identical for every selectable live barrel', () => {
  const legacyBarrels = structuredClone(attachments.BARRELS);
  for (const barrel of legacyBarrels) delete barrel.velTierMod;
  for (const weapon of weapons) {
    const weaponAtts = attachments.WEAPON_ATTS[weapon.id] ?? {};
    for (const barrelId of weaponAtts.barrel ?? []) {
      const atts = { barrel: barrelId, mag: attachments.WEAPON_MAG[weapon.id]?.def ?? null };
      setAttachmentContext({ ...context, BARRELS: attachments.BARRELS });
      const derived = applyAttachments(weapon, atts).bulletVel;
      setAttachmentContext({ ...context, BARRELS: legacyBarrels });
      const legacy = applyAttachments(weapon, atts).bulletVel;
      assert.equal(derived, legacy, `${weapon.id}/${barrelId}`);
    }
  }
});

test('Phase 7 audit corpus barrel velocity is 94/94 on the signed normal ladder with floor display', () => {
  const audit = readJson('outputs/attachment-audit/attachment-screenshot-review.json');
  const allRows = audit.records.filter(row => row.stats);
  const barrelRows = allRows.filter(row => row.attachmentType === 'Barrel');
  const byWeapon = new Map();
  for (const row of allRows) {
    const rows = byWeapon.get(row.weaponName) ?? [];
    rows.push(row);
    byWeapon.set(row.weaponName, rows);
  }
  const modal = rows => {
    const counts = new Map();
    for (const row of rows) {
      const value = row.stats?.muzzleVelocityMps;
      if (value == null) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0]?.[0] ?? null;
  };
  const tierBySubtype = new Map([
    ['Short', -1],
    ['Short Light', -1],
    ['Extended', 1],
    ['Heavy Ext', 1],
    ['Ext Light', 1],
    ['Basic', 0],
    ['Heavy', 0],
    ['Light', 0],
    ['Cryo', 0],
    ['Suppressed', 0],
  ]);
  const changed = barrelRows.filter(row => row.stats.muzzleVelocityMps !== modal(byWeapon.get(row.weaponName)));
  const predictions = changed.map(row => {
    const base = modal(byWeapon.get(row.weaponName));
    const tier = tierBySubtype.get(row.attachmentSubtype);
    assert.notEqual(tier, undefined, `${row.weaponName}/${row.attachmentSubtype} has no Phase 7 tier disposition`);
    const predicted = base * (balance.VELOCITY_LADDER ** (-tier));
    return {
      row,
      base,
      tier,
      predicted,
      floor: Math.floor(predicted),
      round: Math.round(predicted),
    };
  });
  const floorHits = predictions.filter(entry => entry.row.stats.muzzleVelocityMps === entry.floor);
  const roundHits = predictions.filter(entry => entry.row.stats.muzzleVelocityMps === entry.round);
  const discriminating = predictions.filter(entry => entry.floor !== entry.round);
  const indiscriminating = predictions.filter(entry => entry.floor === entry.round);
  assert.equal(barrelRows.length, 230);
  assert.equal(changed.length, 94);
  assert.equal(floorHits.length, 94, `barrel velocity floor hit rate ${floorHits.length}/${changed.length}`);
  assert.equal(roundHits.length, 69, `legacy round hit count ${roundHits.length}/${changed.length}`);
  assert.equal(indiscriminating.length, 69);
  assert.equal(discriminating.length, 25);
  assert.equal(discriminating.filter(entry => entry.row.stats.muzzleVelocityMps === entry.floor).length, 25);
  assert.equal(discriminating.filter(entry => entry.row.stats.muzzleVelocityMps === entry.round).length, 0);

  const keyFor = entry => `${entry.row.weaponName}|${entry.row.attachmentSubtype}|${entry.row.attachmentName}`;
  const corpusByKey = new Map(predictions.filter(entry => entry.floor !== entry.round).map(entry => [keyFor(entry), entry]));
  const manifestByKey = new Map(velocityManifest.explainedDifferences.map(entry => [
    `${entry.weaponName}|${entry.attachmentSubtype}|${entry.attachmentName}`,
    entry,
  ]));
  assert.equal(velocityManifest.counts.discriminatingRecords, 25);
  assert.equal(velocityManifest.counts.indiscriminatingRecords, 69);
  assert.deepEqual(new Set(manifestByKey.keys()), new Set(corpusByKey.keys()));
  for (const [key, entry] of manifestByKey) {
    const actual = corpusByKey.get(key);
    assert.ok(actual, `missing corpus evidence ${key}`);
    assert.equal(entry.baseVelocityMps, actual.base);
    assert.equal(entry.velTierMod, actual.tier);
    assert.equal(entry.predictedVelocityMps, actual.predicted);
    assert.equal(entry.observedVelocityMps, actual.row.stats.muzzleVelocityMps);
    assert.equal(entry.floorVelocityMps, actual.floor);
    assert.equal(entry.legacyRoundedVelocityMps, actual.round);
    const relativeSource = actual.row.source.currentPath.slice(root.length + 1).replaceAll('\\', '/');
    assert.equal(entry.sourcePath, relativeSource, `evidence source ${key}`);
  }
});

test('Phase 7 velocity flooring has a guarded floating-point edge', () => {
  const nearIntegerProducts = [];
  for (const weapon of weapons) {
    for (const barrelId of attachments.WEAPON_ATTS[weapon.id]?.barrel ?? []) {
      const barrel = attachments.BARRELS.find(candidate => candidate.id === barrelId);
      const multiplier = resolveBarrelVelocity({ barData: barrel }).multiplier;
      const product = weapon.bulletVel * multiplier;
      const nearest = Math.round(product);
      if (nearest > product && nearest - product < VELOCITY_DISPLAY_EPSILON) {
        nearIntegerProducts.push(`${weapon.id}/${barrelId}: ${product}`);
      }
    }
  }
  assert.deepEqual(nearIntegerProducts, []);
  assert.equal(floorVelocityDisplay(613.9999999999999), 614);
  assert.equal(floorVelocityDisplay(837.5), 837);
});

test('Phase 7 extends the Phase 5 witness comparison with an explicit legacy velocity path', () => {
  const enumeration = buildEquivalenceEnumeration();
  const result = compareBarrelVelocityLegacyAndDerived(enumeration);
  assert.equal(result.comparedCases, 88694);
  assert.equal(result.mismatchCases, 0, JSON.stringify(result.mismatches));
  assert.equal(result.historicalDisplayDifferencePairs, 20);
  assert.equal(result.unexplainedHistoricalDisplayDifferencePairs, 0, JSON.stringify(result.unexplainedHistoricalDisplayDifferences));
  assert.equal(result.corpusEvidence.explainedRecords, 25);
  assert.equal(result.corpusEvidence.unexplainedRecords, 0);
  assert.equal(result.corpusEvidence.indiscriminatingRecords, 69);
  assert.equal(result.corpusEvidence.discriminatingRecords, 25);
});

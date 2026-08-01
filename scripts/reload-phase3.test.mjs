import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { applyAttachments, resolveReloadTiming, setAttachmentContext } from '../sim/applyAttachments.js';
import { buildEnumeration } from './phase2b-enumeration.mjs';

const root = join(import.meta.dirname, '..');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const baselinePath = join(root, 'scripts/reload-phase3-baseline.json');

const attachments = readJson('data/attachments.json');
const ammo = readJson('data/ammo.json');
const balance = readJson('data/balance_tables.json');
const weapons = readJson('data/weapons.json');
const phase2bBaseline = readJson('scripts/ads-move-phase2b-iii-baseline.json');
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));

const baseContext = {
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
  RELOAD_SPEED_LADDER: balance.RELOAD_SPEED_LADDER,
};

setAttachmentContext(baseContext);

const CANONICAL_FIELDS = [
  ['caseKey', row => row.caseKey],
  ['weaponId', row => row.weaponId],
  ['magazineId', row => row.magazineId],
  ['gripId', row => row.gripId],
  ['ergoId', row => row.ergoId],
  ['ammoId', row => row.ammoId],
  ['tacticalReloadMs', row => row.tacticalReloadMs],
  ['branch', row => row.branch],
  ['mode', row => row.mode],
  ['reason', row => row.reason],
  ['reloadSpeedTier', row => row.reloadSpeedTier],
  ['reloadSpeedMult', row => row.reloadSpeedMult],
  ['overrideApplied', row => row.overrideApplied],
];

function canonicalValue(value) {
  if (typeof value === 'number') return Number(Object.is(value, -0) ? 0 : value).toFixed(12);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

function canonicalRow(row) {
  return `{${CANONICAL_FIELDS.map(([key, get]) => `${JSON.stringify(key)}:${canonicalValue(get(row))}`).join(',')}}`;
}

function sortedCases(cases) {
  return [...cases].sort((a, b) => a.caseKey.localeCompare(b.caseKey));
}

function canonicalSerialization(cases) {
  return sortedCases(cases).map(canonicalRow).join('\n');
}

function sha256(serialization) {
  return createHash('sha256').update(serialization, 'utf8').digest('hex');
}

function perWeaponDigests(cases) {
  return Object.fromEntries([...weaponById.keys()].sort().map(weaponId => [
    weaponId, sha256(canonicalSerialization(cases.filter(row => row.weaponId === weaponId))),
  ]));
}

function detailCases(cases) {
  const sampleKeys = new Set();
  const sampleCounts = {};
  for (const row of sortedCases(cases)) {
    if ((sampleCounts[row.weaponId] ?? 0) < 3) {
      sampleKeys.add(row.caseKey);
      sampleCounts[row.weaponId] = (sampleCounts[row.weaponId] ?? 0) + 1;
    }
  }
  return sortedCases(cases).filter(row => sampleKeys.has(row.caseKey));
}

function reloadCases(enumeration) {
  return enumeration.cases.map(row => {
    const weapon = weaponById.get(row.weaponId);
    const magazine = attachments.WEAPON_MAG[row.weaponId].mags[row.magazineId];
    const ergo = attachments.ERGOS.find(candidate => candidate.id === row.ergoId) ?? { id: 'none' };
    const resolution = resolveReloadTiming({
      weaponTacRld: weapon.tacRld,
      magData: magazine,
      ergoData: ergo,
      weaponErgo: attachments.WEAPON_ERGO[row.weaponId],
    });
    return {
      caseKey: row.caseKey,
      weaponId: row.weaponId,
      magazineId: row.magazineId,
      gripId: row.gripId,
      ergoId: row.ergoId,
      ammoId: row.ammoId,
      tacticalReloadMs: resolution.tacRld == null ? null : Math.round(resolution.tacRld * 1000),
      branch: resolution.branch,
      mode: resolution.mode ?? null,
      reason: resolution.reason ?? null,
      reloadSpeedTier: magazine.reloadSpeedTier ?? null,
      reloadSpeedMult: ergo.reloadSpeedMult ?? null,
      overrideApplied: Object.hasOwn(magazine, 'tacRldOverrideMs'),
    };
  });
}

function buildFixture() {
  const enumeration = buildEnumeration({ attachments, ammo, balance, weapons });
  const cases = sortedCases(reloadCases(enumeration));
  return {
    kind: 'reload-phase3-baseline',
    units: { tacticalReloadMs: 'integer milliseconds; null for scalar-null reloads' },
    scope: enumeration.scope,
    counts: enumeration.counts,
    digest: {
      algorithm: 'SHA-256',
      format: 'canonical-reload-row-v1',
      value: sha256(canonicalSerialization(cases)),
    },
    perWeaponDigest: perWeaponDigests(cases),
    detailSelection: { sampleCasesPerWeapon: 3, detailCaseCount: detailCases(cases).length },
    detailCases: detailCases(cases),
  };
}

const generatedBaseline = process.argv.includes('--write-baseline') ? buildFixture() : null;
if (generatedBaseline) writeFileSync(baselinePath, `${JSON.stringify(generatedBaseline, null, 2)}\n`);
const baseline = generatedBaseline ?? readJson('scripts/reload-phase3-baseline.json');

test('Phase 3 reload baseline reuses the complete 70,634-case Phase 2b enumeration', () => {
  const enumeration = buildEnumeration({ attachments, ammo, balance, weapons });
  assert.deepEqual(enumeration.counts, phase2bBaseline.counts);
  const actual = sortedCases(reloadCases(enumeration));
  assert.equal(baseline.kind, 'reload-phase3-baseline');
  assert.deepEqual(baseline.scope, enumeration.scope);
  assert.deepEqual(baseline.counts, enumeration.counts);
  assert.deepEqual(baseline.detailCases, detailCases(actual));
  assert.equal(sha256(canonicalSerialization(actual)), baseline.digest.value);
  assert.deepEqual(perWeaponDigests(actual), baseline.perWeaponDigest);
});

test('Phase 3 reload baseline records the legacy branch and absent derived fields at entry', () => {
  const actual = sortedCases(reloadCases(buildEnumeration({ attachments, ammo, balance, weapons })));
  assert.equal(actual.every(row => row.branch === 'legacy'), true);
  assert.equal(actual.every(row => row.reloadSpeedTier === null), true);
  assert.equal(actual.every(row => row.reloadSpeedMult === null), true);
  assert.equal(actual.every(row => row.overrideApplied === false), true);
  assert.deepEqual([...new Set(actual.map(row => row.reason))], ['no-derived-fields']);
});

test('Phase 3 keeps derived fields out of production data and declares the suspected-game-bug schema', () => {
  const modelSchema = readJson('schemas/attachment-model.schema.json');
  const bugSchema = modelSchema.$defs.suspectedGameBug;
  assert.deepEqual(bugSchema.required, [
    'field', 'expectedWhenFixed', 'expectedReloadSeconds', 'observedReloadSeconds', 'observedOn', 'note',
  ]);
  assert.equal(bugSchema.properties.field.const, 'reloadSpeedTier');
  assert.deepEqual(readJson('data/reload-exceptions.json').counts, {
    animationOverrideRecords: 4,
    animationOverrideEntries: 5,
    screenshotExceptionEntries: 1,
  });
  assert.equal(Object.values(attachments.WEAPON_MAG).some(weaponMag => Object.values(weaponMag.mags ?? {})
    .some(mag => Object.hasOwn(mag, 'reloadSpeedTier') || Object.hasOwn(mag, 'tacRldOverrideMs'))), false);
  assert.equal(attachments.ERGOS.some(ergo => Object.hasOwn(ergo, 'reloadSpeedMult')), false);
});

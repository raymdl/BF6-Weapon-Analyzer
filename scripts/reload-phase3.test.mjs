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
const preMigrationState = readJson('scripts/reload-phase4-pre-migration-state.json');
const preMigrationWeaponIds = new Set(Object.keys(preMigrationState.magazines));
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));

const EXPECTED_RELOAD_SCOPE = Object.freeze({
  weaponCount: 61,
  magazineEntryCount: 278,
  caseDimensions: 'weapon × magazine × selectable grip × selectable ergonomic × available ammo',
  gripSelection: 'none plus WEAPON_ATTS.grip, or grip IDs in the combined VZ.61 laser slot',
  ergoSelection: 'none plus WEAPON_ERGO[weapon].avail',
  ammoSelection: 'all IDs in WEAPON_AMMO[weapon].ammo, including standard-only weapons',
  barrelSelection: 'weapon barrelDef only; barrels do not affect sprint recovery or ADS move',
  caseKey: 'weaponId/magazineId/gripId/ergoId/ammoId',
});

const EXPECTED_RELOAD_COUNTS = Object.freeze({
  weapons: 61,
  magazineEntries: 278,
  gripChoices: 850,
  ergoChoices: 183,
  ammoChoices: 279,
  cases: 77564,
  primaryCases: 77330,
  sidearmCases: 234,
});

const EXPECTED_RELOAD_DIGEST = '640db63286b1506d8fa17bce7af4f98b3092265079da3329d9529f95599456a7';
const EXPECTED_PREVIOUS_DIGEST = 'e524734f8581903935f3dc3286bad6d1da2f32b5026836be41bf1a21df154051';
const EXPECTED_CHANGED_CASE_COUNT = 10322;
const EXPECTED_CHANGED_CASE_KEYS_DIGEST = 'c2f831145d84efc8a4042fa0d828d32a45f5e8bcb458ef3e5efc0b7476170ae4';

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
  DRAW_TIME_AXIS: balance.DRAW_TIME_AXIS,
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

function reloadCases(enumeration, modelAttachments = attachments) {
  return enumeration.cases.map(row => {
    const weapon = weaponById.get(row.weaponId);
    const magazine = modelAttachments.WEAPON_MAG[row.weaponId].mags[row.magazineId];
    const ergo = modelAttachments.ERGOS.find(candidate => candidate.id === row.ergoId) ?? { id: 'none' };
    const resolution = resolveReloadTiming({
      weaponTacRld: weapon.tacRld,
      magData: magazine,
      ergoData: ergo,
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

function preCutoverTacRldSeconds(weaponId, magazineId, ergoId) {
  const weapon = weaponById.get(weaponId);
  const magazine = attachments.WEAPON_MAG[weaponId].mags[magazineId];
  const oldMagazine = preMigrationState.magazines[weaponId]?.[magazineId];
  const oldWeaponErgo = preMigrationState.weaponErgo[weaponId];
  if (ergoId === 'mag_catch' && oldWeaponErgo) {
    const milliseconds = magazine.name.toLowerCase().includes('fast')
      ? (oldWeaponErgo.fast ?? oldWeaponErgo.reg)
      : oldWeaponErgo.reg;
    if (milliseconds != null) return +(milliseconds / 1000).toFixed(3);
  }
  return oldMagazine?.tacRld != null
    ? +(oldMagazine.tacRld / 1000).toFixed(3)
    : weapon.tacRld;
}

function preCutoverReloadCases(enumeration) {
  return enumeration.cases.map(row => {
    const magazine = attachments.WEAPON_MAG[row.weaponId].mags[row.magazineId];
    const tacRld = preCutoverTacRldSeconds(row.weaponId, row.magazineId, row.ergoId);
    return {
      caseKey: row.caseKey,
      weaponId: row.weaponId,
      magazineId: row.magazineId,
      gripId: row.gripId,
      ergoId: row.ergoId,
      ammoId: row.ammoId,
      tacticalReloadMs: tacRld == null ? null : Math.round(tacRld * 1000),
      branch: 'legacy',
      mode: null,
      reason: 'no-derived-fields',
      reloadSpeedTier: null,
      reloadSpeedMult: null,
      overrideApplied: false,
    };
  });
}

function changedCases(actual, previous) {
  const previousByKey = new Map(previous.map(row => [row.caseKey, row]));
  return sortedCases(actual.filter(row => row.tacticalReloadMs !== previousByKey.get(row.caseKey)?.tacticalReloadMs)
    .map(row => ({
      caseKey: row.caseKey,
      previousTacticalReloadMs: previousByKey.get(row.caseKey)?.tacticalReloadMs ?? null,
      newTacticalReloadMs: row.tacticalReloadMs,
    })));
}

function buildFixture() {
  const enumeration = buildEnumeration({ attachments, ammo, balance, weapons });
  const cases = sortedCases(reloadCases(enumeration));
  const previousCases = sortedCases(preCutoverReloadCases(enumeration));
  const migrationChangedCases = changedCases(cases, previousCases);
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
    migration: {
      previousDigest: sha256(canonicalSerialization(previousCases)),
      changedCaseCount: migrationChangedCases.length,
      changedCaseKeysDigest: sha256(migrationChangedCases.map(row => row.caseKey).join('\n')),
      changedCases: migrationChangedCases,
    },
    detailSelection: { sampleCasesPerWeapon: 3, detailCaseCount: detailCases(cases).length },
    detailCases: detailCases(cases),
  };
}

const generatedBaseline = process.argv.includes('--write-baseline') ? buildFixture() : null;
if (generatedBaseline) writeFileSync(baselinePath, `${JSON.stringify(generatedBaseline, null, 2)}\n`);
const baseline = generatedBaseline ?? readJson('scripts/reload-phase3-baseline.json');

test('Phase 3 reload baseline pins the complete 77,564-case live-roster enumeration', () => {
  const enumeration = buildEnumeration({ attachments, ammo, balance, weapons });
  assert.deepEqual(enumeration.scope, EXPECTED_RELOAD_SCOPE);
  assert.deepEqual(enumeration.counts, EXPECTED_RELOAD_COUNTS);
  const actual = sortedCases(reloadCases(enumeration));
  const previous = sortedCases(preCutoverReloadCases(enumeration));
  assert.equal(baseline.kind, 'reload-phase3-baseline');
  assert.deepEqual(baseline.scope, EXPECTED_RELOAD_SCOPE);
  assert.deepEqual(baseline.counts, EXPECTED_RELOAD_COUNTS);
  assert.deepEqual(baseline.detailCases, detailCases(actual));
  assert.equal(sha256(canonicalSerialization(actual)), EXPECTED_RELOAD_DIGEST);
  assert.equal(baseline.digest.value, EXPECTED_RELOAD_DIGEST);
  assert.deepEqual(perWeaponDigests(actual), baseline.perWeaponDigest);
  assert.equal(sha256(canonicalSerialization(previous)), EXPECTED_PREVIOUS_DIGEST);
  assert.equal(baseline.migration.previousDigest, EXPECTED_PREVIOUS_DIGEST);
  assert.equal(
    sha256(canonicalSerialization(previous.filter(row => preMigrationWeaponIds.has(row.weaponId)))),
    preMigrationState.baselineDigest,
  );
  const actualChangedCases = changedCases(actual, previous);
  assert.deepEqual(actualChangedCases, baseline.migration.changedCases);
  assert.equal(actualChangedCases.length, EXPECTED_CHANGED_CASE_COUNT);
  assert.equal(baseline.migration.changedCaseCount, EXPECTED_CHANGED_CASE_COUNT);
  assert.equal(sha256(actualChangedCases.map(row => row.caseKey).join('\n')), EXPECTED_CHANGED_CASE_KEYS_DIGEST);
  assert.equal(baseline.migration.changedCaseKeysDigest, EXPECTED_CHANGED_CASE_KEYS_DIGEST);
  assert.deepEqual(
    [...new Set(actualChangedCases
      .map(row => row.caseKey.split('/')[0])
      .filter(weaponId => !preMigrationWeaponIds.has(weaponId)))].sort(),
    ['brod3', 'ef88'],
  );
});

test('Phase 6 reload baseline is entirely authoritative derived output', () => {
  const actual = sortedCases(reloadCases(buildEnumeration({ attachments, ammo, balance, weapons })));
  const expectedReasons = new Set(['derived-normal', 'derived-override', 'invalid-derived-base']);
  assert.equal(actual.every(row => expectedReasons.has(row.reason)), true);
  assert.equal(actual.filter(row => row.branch === 'derived').length > 0, true);
  assert.equal(actual.every(row => row.overrideApplied === (row.reloadSpeedTier === null)), true);
  assert.equal(actual.filter(row => row.reason === 'invalid-derived-base').every(row => row.reloadSpeedTier === 0), true);
  assert.equal(actual.filter(row => row.reason === 'invalid-derived-base').every(row => row.tacticalReloadMs === null), true);
  assert.equal(actual.filter(row => row.reloadSpeedTier === 2).every(row => row.weaponId === 'kts100' && row.magazineId === '45_fast'), true);
  assert.equal(actual.filter(row => row.reloadSpeedMult !== null).every(row => row.ergoId === 'mag_catch' && row.reloadSpeedMult === 1.063), true);
});

test('Phase 6 deletes the legacy reload representation and retains the derived schema', () => {
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
    composedLoadoutEvidenceEntries: 1,
  });
  const magazines = Object.values(attachments.WEAPON_MAG).flatMap(weaponMag => Object.values(weaponMag.mags ?? {}));
  assert.equal(magazines.every(mag => Object.hasOwn(mag, 'reloadSpeedTier') || Object.hasOwn(mag, 'tacRldOverrideMs')), true);
  assert.equal(magazines.every(mag => Object.hasOwn(mag, 'tacRldOverrideMs') || Object.hasOwn(mag, 'reloadSpeedTier')), true);
  assert.equal(magazines.some(mag => Object.hasOwn(mag, 'tacRldOverrideMs')), true);
  assert.equal(attachments.ERGOS.find(ergo => ergo.id === 'mag_catch').reloadSpeedMult, 1.063);
  assert.equal(magazines.some(mag => Object.hasOwn(mag, 'tacRld')), false);
  assert.equal(Object.values(attachments.WEAPON_ERGO)
    .some(weaponErgo => Object.hasOwn(weaponErgo, 'magCatchRld')), false);
  const pp19Bug = attachments.WEAPON_MAG.pp19.mags['20_fast'].suspectedGameBug;
  assert.equal(pp19Bug.expectedReloadSeconds, 2.183);
  assert.equal(pp19Bug.observedReloadSeconds, 2.467);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  DEFAULT_ROOT,
  PHASE0_FIXTURES,
  RELOAD_ANIMATION_OVERRIDES,
  RELOAD_SCREENSHOT_EXCEPTIONS,
  TUBE_FED_SHOTGUNS,
  classFromSourcePath,
  hiddenRecoilAmountBase,
  hiddenRecoilVariationBase,
  loadPhase0Inputs,
  matchesDisplayOneDecimal,
  modalValue,
  reloadRowMatches,
  roundDisplayOneDecimal,
  sourceIdentity,
  sourceRelativePath,
} from './audit-phase0-lib.mjs';
import {
  inventoryDrift,
  isAllowedModelTierWarning,
  loadModelTierMismatchInventory,
  modelTierMismatchKey,
  runSweep,
  STATS,
} from './audit-sweep.mjs';
import { runFieldSlotDiscovery } from './audit-field-slot-discovery.mjs';

const inputs = loadPhase0Inputs(DEFAULT_ROOT);
const auditRows = inputs.auditSummary.stats;
const attachmentCatalogs = JSON.parse(fs.readFileSync(path.join(DEFAULT_ROOT, 'data', 'attachments.json'), 'utf8'));
const CATALOG_COVERAGE_EXEMPTIONS = Object.freeze({
  WEAPON_ATTS: new Set(),
  WEAPON_ERGO: new Set(['m123k', 'm250', 'm121a2', 'svk86', 'miniscout', 'm87a1', 'm1014', 'db12']),
  WEAPON_MAG: new Set(),
});
const rowsByWeapon = new Map();
for (const row of auditRows) {
  const rows = rowsByWeapon.get(row.weaponName) || [];
  rows.push(row);
  rowsByWeapon.set(row.weaponName, rows);
}
const weaponByName = new Map(inputs.weapons.map(weapon => [weapon.name.toLowerCase().replace(/[^a-z0-9]/g, ''), weapon]));

function assertLadder(rows, field, base, multiplier) {
  for (const row of rows) {
    const value = row.stats[field];
    if (value == null || value === 0) continue;
    const hit = [...Array(17)].some((_, index) => matchesDisplayOneDecimal(base * (multiplier ** (index - 8)), value));
    assert.equal(hit, true, `${row.weaponName}/${row.attachmentName} ${field}=${value} is off its hidden-precision ladder`);
  }
}

test('Phase 0 fixtures are complete, full-roster, and path-portable', () => {
  assert.equal(inputs.audit.recordCount, 3177);
  assert.equal(inputs.auditSummary.stats.length, 3115);
  assert.equal(inputs.auditSummary.weaponNames.length, 62);
  assert.equal(inputs.subsonicTreatments.length, 27);
  assert.equal(inputs.exceptions.length, 0);
  assert.equal(inputs.bulkRecapture.counts.correctedFields, 323);
  assert.equal(inputs.bulkRecapture.counts.duplicateRecordsRemoved, 29);
  assert.equal(inputs.dedupeExclusions.exclusions.length, 29);
  assert.equal(inputs.sl9Recapture.records.length, 12);

  const absolute = 'C:\\Users\\royal\\Documents\\BF6 Project\\Weapon Attachments\\Shotgun\\DB-12\\22_DB-12_Grip_Ribbed_Vertical.png';
  const relative = 'Weapon Attachments/Shotgun/DB-12/22_DB-12_Grip_Ribbed_Vertical.png';
  assert.equal(sourceIdentity(absolute), sourceIdentity(relative));
  assert.equal(classFromSourcePath(absolute), 'shotgun');
  assert.equal(sourceRelativePath(absolute), relative);
  assert.throws(() => sourceIdentity('C:/outside-corpus/capture.png'), /not rooted under Weapon Attachments/);

  for (const file of [
    'scripts/audit-phase0-lib.mjs',
    'scripts/audit-sweep.mjs',
    'scripts/audit-field-slot-discovery.mjs',
  ]) {
    const source = fs.readFileSync(path.join(DEFAULT_ROOT, file), 'utf8');
    assert.doesNotMatch(source, /C:\\Users\\royal\\Documents\\BF6 Project/);
  }
});

test('sweep pins inventoried model-tier mismatches and rejects other warnings', () => {
  const report = runSweep({ root: DEFAULT_ROOT });
  const inventoryKeys = loadModelTierMismatchInventory(DEFAULT_ROOT);
  const modelWarnings = report.findings.filter(finding => (
    finding.severity === 'warn' && finding.check === 'model-tier-mismatch'
  ));
  assert.equal(modelWarnings.length, 74);
  assert.deepEqual(new Set(modelWarnings.map(modelTierMismatchKey)), inventoryKeys);
  assert.deepEqual(inventoryDrift(report, DEFAULT_ROOT), {
    unexpected: [],
    missing: [],
    duplicates: [],
  });
  assert.equal(isAllowedModelTierWarning(modelWarnings[0], inventoryKeys), true);
  assert.equal(isAllowedModelTierWarning({ ...modelWarnings[0], check: 'other-warning' }, inventoryKeys), false);
  assert.deepEqual(report.severityCounts, { error: 0, warn: 74, info: 28 });
  assert.deepEqual(report.counts, {
    'fire-mode-ergo': 1,
    'model-tier-mismatch': 74,
    'subsonic-treatment': 27,
  });
  assert.deepEqual(report.findings.filter(finding => (
    finding.severity === 'warn' && finding.check !== 'model-tier-mismatch'
  )), []);
  assert.equal(report.findings.filter(finding => finding.check === 'recoil-ladder').length, 0);
  assert.equal(report.findings.filter(finding => finding.check === 'recoilvar-ladder').length, 0);
  assert.deepEqual(report.classes.shotgun, {
    statRows: 157,
    weapons: 4,
    weaponNames: ['18.5KS-K', 'DB-12', 'M1014', 'M87A1'],
  });
  assert.deepEqual(report.coverage.modelUnmappedWeapons, ['BROD 3', 'EF88', 'VSSM']);
});

test('cross-field consistency checks named capacity and every stat in duplicate identities', () => {
  assert.deepEqual(STATS, [
    'damage', 'longRangeDamage', 'muzzleVelocityMps', 'headshotMultiplier', 'collateralMultiplier',
    'spotOnFire3dM', 'spotOnFire2dM', 'recoilAmountDegrees', 'recoilVariationDegrees', 'adsTimeMs',
    'sprintRecoveryMs', 'adsMoveSpeedMultiplier', 'reloadTimeSeconds', 'rateOfFireRpm', 'magazineSize',
    'hipfire', 'precision', 'control', 'mobility',
  ]);

  const root = mkdtempSync(path.join(tmpdir(), 'bf6-phase0-check2-'));
  const fixturePaths = new Set([...Object.values(PHASE0_FIXTURES), 'data/attachments.json']);
  for (const relativePath of fixturePaths) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(DEFAULT_ROOT, relativePath), destination);
  }

  const reviewPath = path.join(root, PHASE0_FIXTURES.audit);
  const readReview = () => JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  const writeReview = review => fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
  const originalReview = JSON.parse(fs.readFileSync(
    path.join(DEFAULT_ROOT, PHASE0_FIXTURES.audit), 'utf8',
  ));
  try {
    const capacityReview = readReview();
    const capacityRow = capacityReview.records.find(row => (
      row.weaponName === 'B36A4'
      && row.attachmentType === 'Magazine'
      && row.attachmentName === '30Rnd Magazine'
      && row.stats
    ));
    assert.ok(capacityRow);
    capacityRow.stats.magazineSize = 29;
    writeReview(capacityReview);
    assert.equal(runSweep({ root }).findings.some(finding => (
      finding.check === 'name-vs-capacity'
      && finding.weapon === 'B36A4'
      && finding.attachment === 'Magazine/30Rnd Magazine'
    )), true);

    for (const field of STATS) {
      const duplicateReview = structuredClone(originalReview);
      const sourceRow = duplicateReview.records.find(row => (
        row.weaponName === 'B36A4'
        && row.attachmentType === 'Magazine'
        && row.attachmentName === '30Rnd Magazine'
        && row.stats
      ));
      sourceRow.stats.magazineSize = 30;
      const duplicate = structuredClone(sourceRow);
      duplicate.stats[field] = typeof duplicate.stats[field] === 'number'
        ? duplicate.stats[field] + 1
        : 12345;
      duplicateReview.records.push(duplicate);
      duplicateReview.recordCount += 1;
      duplicateReview.attachmentDetailCount += 1;
      writeReview(duplicateReview);
      assert.equal(runSweep({ root }).findings.some(finding => (
        finding.check === 'duplicate-conflict'
        && finding.weapon === 'B36A4'
        && finding.attachment === 'Magazine/30Rnd Magazine'
      )), true, `duplicate comparison omitted ${field}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recoil amount uses hidden recoilV and the pinned float32 round-half-up display rule', () => {
  const db12 = inputs.weapons.find(weapon => weapon.name === 'DB-12');
  const m87a1 = inputs.weapons.find(weapon => weapon.name === 'M87A1');
  const svk86 = inputs.weapons.find(weapon => weapon.name === 'SVK-8.6');
  assert.equal(hiddenRecoilAmountBase(db12), 2.708937326026026);
  assert.equal(roundDisplayOneDecimal(db12.recoilV * (0.94 ** 3)), 2.3);
  assert.equal(roundDisplayOneDecimal(m87a1.recoilV * (0.94 ** 5)), 2.7);
  // This boundary is why the float32 step is pinned rather than leaving the
  // result to a host-language decimal tie implementation.
  assert.equal(roundDisplayOneDecimal(svk86.recoilV * (0.94 ** 4)), 2.3);

  for (const [weaponName, rows] of rowsByWeapon) {
    const weapon = weaponByName.get(weaponName.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const multiplier = weapon && inputs.balance.RECOIL_MULT?.[weapon.id];
    if (!weapon || !multiplier) continue;
    assertLadder(rows, 'recoilAmountDegrees', hiddenRecoilAmountBase(weapon), multiplier);
    assertLadder(rows, 'recoilVariationDegrees', hiddenRecoilVariationBase(weapon), weapon.recoil.ads.dirVarMult);
  }
});

test('scalar reload characterization covers all weapons, magazine/ergonomic combinations, and overrides', () => {
  const scalarWeapons = [...rowsByWeapon.keys()].filter(name => !TUBE_FED_SHOTGUNS.has(name));
  assert.equal(scalarWeapons.length, 59);
  assert.equal(scalarWeapons.includes('18.5KS-K'), true);
  assert.deepEqual([...TUBE_FED_SHOTGUNS].sort(), ['DB-12', 'M1014', 'M87A1']);
  for (const weaponName of scalarWeapons) {
    const rows = rowsByWeapon.get(weaponName);
    const base = modalValue(rows, 'reloadTimeSeconds');
    assert.notEqual(base, null, `${weaponName} has no scalar reload baseline`);
    for (const row of rows) {
      if (row.stats.reloadTimeSeconds == null || row.stats.reloadTimeSeconds === 0) continue;
      assert.equal(reloadRowMatches(row, base), true, `${weaponName}/${row.attachmentName} reload is not a registered scalar combination`);
    }
  }

  assert.equal(RELOAD_ANIMATION_OVERRIDES.size, 5);
  for (const [key, expected] of RELOAD_ANIMATION_OVERRIDES) {
    const [weaponName, attachmentName] = key.split('/');
    const row = rowsByWeapon.get(weaponName)?.find(candidate => candidate.attachmentName === attachmentName);
    assert.ok(row, `missing registered animation override row ${key}`);
    assert.equal(row.stats.reloadTimeSeconds, expected, key);
  }
  assert.deepEqual(RELOAD_SCREENSHOT_EXCEPTIONS.get('PP-19/20Rnd Fast Mag'), {
    observed: 2.467,
    reason: 'direct screenshot reads base reload with no reload arrow',
  });

  const ks18k = inputs.weapons.find(weapon => weapon.id === 'ks18k');
  assert.equal(ks18k.tacRld, 2.75);
  assert.equal(ks18k.emptyRld, 3.7);
  assert.equal(modalValue(rowsByWeapon.get('18.5KS-K'), 'reloadTimeSeconds'), 2.75);
});

test('barrel velocity and every current ADS, sprint-recovery, and ADS-move table output stay in-table', () => {
  const adsTable = inputs.balance.ADS_SPD_TIERS;
  const adsMoveTable = inputs.balance.ADS_MOVE_TIERS;
  const sprintTable = [...new Set([...inputs.balance.PRIMARY_SPRINT_REC_TIERS, ...inputs.balance.SIDEARM_SPRINT_REC_TIERS])];
  const adsMoveOverrides = new Set(inputs.exceptions
    .filter(item => item.check === 'off-tier-table' && item.field === 'adsMoveSpeedMultiplier')
    .map(item => sourceIdentity(item.sourcePath)));
  assert.equal(adsMoveOverrides.size, 0);
  assert.ok(adsTable.length > 0 && adsMoveTable.length > 0 && sprintTable.length > 0);
  for (const row of auditRows) {
    const { stats } = row;
    if (stats.adsTimeMs != null && stats.adsTimeMs !== 0) assert.equal(adsTable.some(value => Math.abs(value - stats.adsTimeMs) <= 1), true, `${row.weaponName}/${row.attachmentName} ADS time`);
    if (stats.adsMoveSpeedMultiplier != null && stats.adsMoveSpeedMultiplier !== 0) {
      const inTable = adsMoveTable.some(value => Math.abs(value - stats.adsMoveSpeedMultiplier) <= 0.005);
      assert.equal(inTable || adsMoveOverrides.has(sourceIdentity(row.source.currentPath)), true, `${row.weaponName}/${row.attachmentName} ADS move`);
    }
    if (stats.sprintRecoveryMs != null && stats.sprintRecoveryMs !== 0) assert.equal(sprintTable.some(value => Math.abs(value - stats.sprintRecoveryMs) <= 1), true, `${row.weaponName}/${row.attachmentName} sprint recovery`);
  }
  const subsonic = new Set(inputs.subsonicTreatments.map(item => sourceIdentity(item.sourcePath)));
  const normalBarrelRows = auditRows.filter(row => row.attachmentType === 'Barrel' && !subsonic.has(sourceIdentity(row.source.currentPath)));
  assert.ok(normalBarrelRows.length > 0);
  for (const row of normalBarrelRows) {
    const rows = rowsByWeapon.get(row.weaponName);
    const base = modalValue(rows, 'muzzleVelocityMps');
    const value = row.stats.muzzleVelocityMps;
    if (value == null || value === 0 || base == null) continue;
    assert.equal([...Array(13)].some((_, index) => {
      const tier = index - 6;
      const predicted = base * (0.8 ** tier);
      return Math.floor(predicted) === value;
    }), true, `${row.weaponName}/${row.attachmentName} barrel velocity`);
  }
});

test('impossible-zero gates are explicit for damage, sprint recovery, and ADS move', () => {
  for (const field of ['damage', 'sprintRecoveryMs', 'adsMoveSpeedMultiplier']) {
    assert.equal(auditRows.filter(row => row.stats[field] === 0).length, 0, `${field} contains a sentinel zero`);
  }
  const report = runSweep({ root: DEFAULT_ROOT });
  assert.equal(report.findings.some(finding => finding.check === 'zero-read'), false);
});

test('field-by-slot discovery remains unresolved-free and keeps all 24 SL9 values path-scoped', () => {
  const report = runFieldSlotDiscovery({ root: DEFAULT_ROOT });
  assert.equal(report.unresolvedCount, 0);
  assert.equal(report.findings.length, 24);
  assert.equal(report.statusSummary['screenshot-confirmed-slot-context-value'], 24);
  assert.equal(report.findings.filter(item => item.field === 'collateralMultiplier').length, 12);
  assert.equal(report.findings.filter(item => item.field === 'sprintRecoveryMs').length, 12);
  assert.equal(report.findings.every(item => item.status === 'screenshot-confirmed-slot-context-value'), true);
  assert.equal(JSON.stringify(report).includes('C:\\Users\\royal\\Documents\\BF6 Project'), false);
});

test('attachment catalogs cover every weapon with explicit ergonomics-free exemptions', () => {
  const failures = [];
  for (const weapon of inputs.weapons) {
    const atts = attachmentCatalogs.WEAPON_ATTS?.[weapon.id];
    const ergo = attachmentCatalogs.WEAPON_ERGO?.[weapon.id];
    const mag = attachmentCatalogs.WEAPON_MAG?.[weapon.id];
    const attsNonEmpty = atts && Object.entries(atts)
      .some(([key, value]) => key !== 'barrelDef' && Array.isArray(value) && value.length > 0);
    const ergoNonEmpty = Array.isArray(ergo?.avail) && ergo.avail.length > 0;
    const magNonEmpty = !!mag && typeof mag.def === 'string' && Object.keys(mag.mags ?? {}).length > 0;
    if (!attsNonEmpty && !CATALOG_COVERAGE_EXEMPTIONS.WEAPON_ATTS.has(weapon.id)) failures.push(`${weapon.id}: WEAPON_ATTS`);
    if (!ergoNonEmpty && !CATALOG_COVERAGE_EXEMPTIONS.WEAPON_ERGO.has(weapon.id)) failures.push(`${weapon.id}: WEAPON_ERGO`);
    if (!magNonEmpty && !CATALOG_COVERAGE_EXEMPTIONS.WEAPON_MAG.has(weapon.id)) failures.push(`${weapon.id}: WEAPON_MAG`);
  }
  assert.deepEqual(failures, []);
  assert.deepEqual([...CATALOG_COVERAGE_EXEMPTIONS.WEAPON_ERGO].sort(), [
    'db12', 'm1014', 'm121a2', 'm123k', 'm250', 'm87a1', 'miniscout', 'svk86',
  ]);
  for (const weaponId of CATALOG_COVERAGE_EXEMPTIONS.WEAPON_ERGO) {
    const weapon = inputs.weapons.find(item => item.id === weaponId);
    assert.ok(weapon);
    assert.equal((rowsByWeapon.get(weapon.name) ?? []).filter(row => row.attachmentType === 'Ergonomics').length, 0, `${weaponId} unexpectedly has ergonomics evidence`);
  }
});

test('default CLI checks are read-only, work outside the repository cwd, and fail on missing fixtures', () => {
  const sweepOutput = path.join(DEFAULT_ROOT, 'outputs/attachment-audit/sweep-findings.json');
  const fieldOutput = path.join(DEFAULT_ROOT, 'outputs/attachment-audit/field-slot-discovery-findings.json');
  const before = new Map([sweepOutput, fieldOutput].map(file => [file, fs.existsSync(file) ? fs.statSync(file).mtimeNs : null]));
  const tempCwd = mkdtempSync(path.join(tmpdir(), 'bf6-phase0-cwd-'));
  const missingRoot = mkdtempSync(path.join(tmpdir(), 'bf6-phase0-missing-'));
  try {
    for (const script of ['scripts/audit-sweep.mjs', 'scripts/audit-field-slot-discovery.mjs']) {
      const result = spawnSync(process.execPath, [path.join(DEFAULT_ROOT, script)], {
        cwd: tempCwd,
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, `${script}: ${result.stdout}\n${result.stderr}`);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /wrote/);
    }
    assert.deepEqual(new Map([sweepOutput, fieldOutput].map(file => [file, fs.existsSync(file) ? fs.statSync(file).mtimeNs : null])), before);
    assert.throws(() => runSweep({ root: missingRoot }), /Missing required Phase 0 fixture/);
    assert.throws(() => runFieldSlotDiscovery({ root: missingRoot }), /Missing required Phase 0 fixture/);
  } finally {
    rmSync(tempCwd, { recursive: true, force: true });
    rmSync(missingRoot, { recursive: true, force: true });
  }
});

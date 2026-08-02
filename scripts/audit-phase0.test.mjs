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
  isAllowedNameEffectWarning,
  isAllowedNameEffectCoverageWarning,
  loadModelTierMismatchInventory,
  loadNameEffectConsistencyInventory,
  loadNameEffectCoverageInventory,
  modelTierMismatchKey,
  nameEffectInventoryDrift,
  nameEffectKey,
  nameEffectCoverageInventoryDrift,
  nameEffectCoverageKey,
  runSweep,
  STATS,
} from './audit-sweep.mjs';
import { runFieldSlotDiscovery } from './audit-field-slot-discovery.mjs';
import {
  deriveFieldSlotAsymmetryInventory,
  fieldSlotAsymmetryDrift,
  loadFieldSlotAsymmetryInventory,
} from '../migration/1.3.3.0/attachment-audit/build-20260801-field-slot-asymmetry-inventory.mjs';

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

test('sweep pins inventoried model-tier and name-effect warnings and rejects other warnings', () => {
  const report = runSweep({ root: DEFAULT_ROOT });
  const inventoryKeys = loadModelTierMismatchInventory(DEFAULT_ROOT);
  const nameEffectInventoryKeys = loadNameEffectConsistencyInventory(DEFAULT_ROOT);
  const nameEffectCoverageInventoryKeys = loadNameEffectCoverageInventory(DEFAULT_ROOT);
  const modelWarnings = report.findings.filter(finding => (
    finding.severity === 'warn' && finding.check === 'model-tier-mismatch'
  ));
  const nameEffectWarnings = report.findings.filter(finding => (
    finding.severity === 'warn' && finding.check === 'name-effect-consistency'
  ));
  const nameEffectCoverageWarnings = report.findings.filter(finding => (
    finding.severity === 'warn' && finding.check === 'name-effect-coverage'
  ));
  assert.equal(modelWarnings.length, 68);
  assert.equal(nameEffectWarnings.length, 16);
  assert.equal(nameEffectCoverageWarnings.length, 1);
  assert.deepEqual(new Set(modelWarnings.map(modelTierMismatchKey)), inventoryKeys);
  assert.deepEqual(new Set(nameEffectWarnings.map(nameEffectKey)), nameEffectInventoryKeys);
  assert.deepEqual(new Set(nameEffectCoverageWarnings.map(nameEffectCoverageKey)), nameEffectCoverageInventoryKeys);
  assert.deepEqual(inventoryDrift(report, DEFAULT_ROOT), {
    unexpected: [],
    missing: [],
    duplicates: [],
  });
  assert.deepEqual(nameEffectInventoryDrift(report, DEFAULT_ROOT), {
    unexpected: [],
    missing: [],
    duplicates: [],
  });
  assert.deepEqual(nameEffectCoverageInventoryDrift(report, DEFAULT_ROOT), {
    unexpected: [],
    missing: [],
    duplicates: [],
  });
  assert.equal(isAllowedModelTierWarning(modelWarnings[0], inventoryKeys), true);
  assert.equal(isAllowedModelTierWarning({ ...modelWarnings[0], check: 'other-warning' }, inventoryKeys), false);
  assert.equal(isAllowedNameEffectWarning(nameEffectWarnings[0], nameEffectInventoryKeys), true);
  assert.equal(isAllowedNameEffectWarning({ ...nameEffectWarnings[0], check: 'other-warning' }, nameEffectInventoryKeys), false);
  assert.equal(isAllowedNameEffectCoverageWarning(nameEffectCoverageWarnings[0], nameEffectCoverageInventoryKeys), true);
  assert.equal(isAllowedNameEffectCoverageWarning({ ...nameEffectCoverageWarnings[0], check: 'other-warning' }, nameEffectCoverageInventoryKeys), false);
  assert.deepEqual(report.severityCounts, { error: 0, warn: 85, info: 28 });
  assert.deepEqual(report.counts, {
    'fire-mode-ergo': 1,
    'model-tier-mismatch': 68,
    'name-effect-consistency': 16,
    'name-effect-coverage': 1,
    'subsonic-treatment': 27,
  });
  assert.deepEqual(report.findings.filter(finding => (
    finding.severity === 'warn'
      && !['model-tier-mismatch', 'name-effect-consistency', 'name-effect-coverage'].includes(finding.check)
  )), []);
  const pp19 = nameEffectWarnings.find(finding => finding.weapon === 'PP-19');
  assert.equal(pp19.direction, 'named-without-reload-speed-tier');
  assert.equal(pp19.screenshotException.observedReloadMs, 2467);
  assert.equal(nameEffectWarnings.filter(finding => finding.direction === 'reload-speed-tier-without-name').length, 11);
  assert.equal(nameEffectWarnings.filter(finding => finding.direction === 'named-without-reload-speed-tier').length, 5);
  assert.deepEqual(nameEffectCoverageWarnings[0], {
    severity: 'warn',
    check: 'name-effect-coverage',
    weapon: 'SOR-556 MK2',
    attachment: 'Magazine/45Rnd Magazine',
    detail: 'corpus screenshot exists, but no corresponding live WEAPON_MAG or Phase 4 migration-manifest entry exists',
    direction: 'unmapped-model-attachment',
    field: 'reloadSpeedTier',
    magazineId: null,
    modelMagazineName: null,
    reloadSpeedTier: null,
    nameImpliesReloadSpeed: false,
    source: 'Weapon Attachments/Assault Rifle/SOR-556 MK2/57_SOR-556 MK2_Magazine_45Rnd_Magazine.png',
    screenshotException: null,
    coverageContext: {
      kind: 'screenshot-present-no-live-catalog-entry',
      reason: 'The PNG and provisional corpus row exist; the live catalog has no regular 45-round SOR-556 MK2 magazine to map.',
    },
  });
  const m1014 = nameEffectWarnings.find(finding => finding.weapon === 'M1014');
  const m87a1 = nameEffectWarnings.find(finding => finding.weapon === 'M87A1');
  const m44 = nameEffectWarnings.find(finding => finding.weapon === 'M44');
  const m357Speedloader = nameEffectWarnings.find(finding => finding.attachment === 'Magazine/8Rnd Speedloader');
  assert.equal(m1014.structuralContext.kind, 'tube-fed-scalar-null');
  assert.equal(m87a1.structuralContext.kind, 'tube-fed-scalar-null');
  assert.equal(m44.structuralContext.kind, 'scalar-revolver');
  assert.equal(m357Speedloader.structuralContext.kind, 'scalar-revolver');
  assert.match(m1014.structuralContext.contract, /migration\/1\.3\.3\.0\/DERIVED_ATTACHMENT_MODEL\.md §6 Phase 6/);
  assert.match(m44.structuralContext.contract, /migration\/1\.3\.3\.0\/DERIVED_ATTACHMENT_MODEL\.md §6 Phase 6/);
  assert.equal(report.findings.filter(finding => finding.check === 'recoil-ladder').length, 0);
  assert.equal(report.findings.filter(finding => finding.check === 'recoilvar-ladder').length, 0);
  assert.deepEqual(report.classes.shotgun, {
    statRows: 157,
    weapons: 4,
    weaponNames: ['18.5KS-K', 'DB-12', 'M1014', 'M87A1'],
  });
  assert.deepEqual(report.coverage.modelUnmappedWeapons, ['BROD 3', 'EF88', 'VSSM']);
});

function copyNameEffectInventoryFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'bf6-name-effect-inventory-'));
  const files = new Set([
    ...Object.values(PHASE0_FIXTURES),
    'data/attachments.json',
    'migration/1.3.3.0/attachment-audit/name-effect-consistency-inventory-20260801.json',
    'migration/1.3.3.0/attachment-audit/name-effect-coverage-inventory-20260801.json',
  ]);
  for (const relativePath of files) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(DEFAULT_ROOT, relativePath), destination);
  }
  return root;
}

function assertNameEffectInventoryPinned(root) {
  const report = runSweep({ root });
  const inventoryKeys = loadNameEffectConsistencyInventory(root);
  const coverageInventoryKeys = loadNameEffectCoverageInventory(root);
  const warnings = report.findings.filter(finding => (
    finding.severity === 'warn' && finding.check === 'name-effect-consistency'
  ));
  assert.deepEqual(new Set(warnings.map(nameEffectKey)), inventoryKeys);
  assert.deepEqual(nameEffectInventoryDrift(report, root), {
    unexpected: [],
    missing: [],
    duplicates: [],
  });
  const coverageWarnings = report.findings.filter(finding => (
    finding.severity === 'warn' && finding.check === 'name-effect-coverage'
  ));
  assert.deepEqual(new Set(coverageWarnings.map(nameEffectCoverageKey)), coverageInventoryKeys);
  assert.deepEqual(nameEffectCoverageInventoryDrift(report, root), {
    unexpected: [],
    missing: [],
    duplicates: [],
  });
}

test('name-effect inventory rejects isolated new and disappearing reload-name findings', () => {
  const root = copyNameEffectInventoryFixture();
  const attachmentsPath = path.join(root, 'data', 'attachments.json');
  const readAttachments = () => JSON.parse(fs.readFileSync(attachmentsPath, 'utf8'));
  const writeAttachments = attachments => fs.writeFileSync(attachmentsPath, `${JSON.stringify(attachments, null, 2)}\n`);
  try {
    assertNameEffectInventoryPinned(root);

    const newFinding = readAttachments();
    newFinding.WEAPON_MAG.ak4d.mags['20_rnd'].reloadSpeedTier = 1;
    writeAttachments(newFinding);
    const newReport = runSweep({ root });
    const newDrift = nameEffectInventoryDrift(newReport, root);
    assert.deepEqual(newDrift.unexpected, ['AK4D|Magazine/20Rnd Magazine|reload-speed-tier-without-name']);
    assert.throws(() => assertNameEffectInventoryPinned(root));

    const disappearingFinding = readAttachments();
    disappearingFinding.WEAPON_MAG.kts100.mags['45_rnd'].reloadSpeedTier = 0;
    writeAttachments(disappearingFinding);
    const disappearingReport = runSweep({ root });
    const disappearingDrift = nameEffectInventoryDrift(disappearingReport, root);
    assert.deepEqual(disappearingDrift.missing, ['KTS100 MK8|Magazine/45Rnd Magazine|reload-speed-tier-without-name']);
    assert.throws(() => assertNameEffectInventoryPinned(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
    if (!weapon || !multiplier || weapon.estimated) continue;
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
  const sweepOutput = path.join(DEFAULT_ROOT, 'migration/1.3.3.0/attachment-audit/sweep-findings.json');
  const fieldOutput = path.join(DEFAULT_ROOT, 'migration/1.3.3.0/attachment-audit/field-slot-discovery-findings.json');
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

function copyFieldSlotInventoryFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'bf6-field-slot-inventory-'));
  const files = new Set([
    ...Object.values(PHASE0_FIXTURES),
    'data/attachments.json',
    'data/ammo.json',
    'migration/1.3.3.0/attachment-audit/field-slot-asymmetry-inventory-20260801.json',
  ]);
  for (const relativePath of files) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(DEFAULT_ROOT, relativePath), destination);
  }
  return root;
}

function assertFieldSlotInventoryPinned(root) {
  const actual = deriveFieldSlotAsymmetryInventory(root);
  const expected = loadFieldSlotAsymmetryInventory(root);
  assert.deepEqual(actual.statColumns, expected.statColumns);
  assert.deepEqual(actual.counts, expected.counts);
  assert.deepEqual(actual.records, expected.records);
  assert.deepEqual(fieldSlotAsymmetryDrift(root), {
    unexpected: [],
    missing: [],
    duplicates: [],
    changed: [],
  });
}

test('field-slot asymmetry inventory rejects isolated new and disappearing keys', () => {
  assertFieldSlotInventoryPinned(DEFAULT_ROOT);
  const root = copyFieldSlotInventoryFixture();
  const reviewPath = path.join(root, PHASE0_FIXTURES.audit);
  const readReview = () => JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  const writeReview = review => fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
  try {
    const originalReview = readReview();
    const newAsymmetry = structuredClone(originalReview);
    const newRow = newAsymmetry.records.find(row => row.weaponName === 'AK4D' && row.attachmentType === 'Muzzle');
    assert.ok(newRow);
    newRow.stats.reloadTimeSeconds = 99.999;
    writeReview(newAsymmetry);
    assert.deepEqual(fieldSlotAsymmetryDrift(root).unexpected, ['reloadTimeSeconds|Muzzle']);
    assert.throws(() => assertFieldSlotInventoryPinned(root));

    writeReview(originalReview);
    const disappearingAsymmetry = structuredClone(originalReview);
    const vssmRows = disappearingAsymmetry.records.filter(row => row.weaponName === 'VSSM');
    const vssmBarrel = disappearingAsymmetry.records.find(row => (
      row.weaponName === 'VSSM' && row.attachmentType === 'Barrel' && row.attachmentName === '200MM ASM'
    ));
    assert.ok(vssmBarrel);
    vssmBarrel.stats.spotOnFire2dM = modalValue(vssmRows, 'spotOnFire2dM');
    writeReview(disappearingAsymmetry);
    assert.deepEqual(fieldSlotAsymmetryDrift(root).missing, ['spotOnFire2dM|Barrel']);
    assert.throws(() => assertFieldSlotInventoryPinned(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

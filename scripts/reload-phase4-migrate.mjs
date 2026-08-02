import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const readJson = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const writeJson = (file, value) => writeFileSync(join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const normalize = value => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const firstNumber = value => {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
};
const isFast = value => /fast/i.test(String(value));
const roundSeconds = value => Number(value.toFixed(3));
const sourcePath = row => row.source.currentPath
  .split(/Weapon Attachments[\\/]/i)[1]
  .replaceAll('\\', '/');

const attachments = readJson('data/attachments.json');
const weapons = readJson('data/weapons.json');
const review = readJson('migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json');
const register = readJson('data/reload-exceptions.json');
const oldBaseline = readJson('scripts/reload-phase3-baseline.json');
const weaponById = new Map(weapons.map(weapon => [weapon.id, weapon]));
const rowsByWeapon = new Map();
for (const row of review.records.filter(candidate => candidate?.attachmentType === 'Magazine')) {
  const key = normalize(row.weaponName);
  const rows = rowsByWeapon.get(key) ?? [];
  rows.push(row);
  rowsByWeapon.set(key, rows);
}

const explicitEvidenceRows = new Map([
  ['db12/7_rnd', '7 Shell Dual Tubes'],
  ['kts100/60_rnd', '60Rnd Drum Mag'],
  ['kts100/60_fast', '60Rnd Magazine'],
  ['m1014/4_rnd', '4 Shell Tube'],
  ['m1014/4_fast', '4Rnd Speedloader'],
  ['m121a2/50_rnd', '50Rnd Drum'],
  ['m121a2/50_fast', '50Rnd Belt Pouch'],
  ['m87a1/5_rnd', '5 Shell Tube'],
  ['m87a1/5_fast', '5Rnd Speedloader'],
  ['m357trait/8_rnd', '8Rnd Speedloader'],
  ['m357trait/8_fast', '8Rnd Moon Clip'],
]);

const tubeFedShotguns = new Set(['db12', 'm1014', 'm87a1']);
const screenshotExceptions = new Set(['pp19/20_fast']);

function findEvidenceRow(weapon, magazineId, magazine) {
  const key = `${weapon.id}/${magazineId}`;
  const explicitName = explicitEvidenceRows.get(key);
  const rows = rowsByWeapon.get(normalize(weapon.name)) ?? [];
  if (explicitName) {
    const row = rows.find(candidate => candidate.attachmentName === explicitName);
    if (!row) throw new Error(`${key}: explicit screenshot row is missing: ${explicitName}`);
    return row;
  }

  const capacityRows = rows.filter(row => firstNumber(row.attachmentName) === magazine.mag);
  const fastRows = capacityRows.filter(row => isFast(row.attachmentName) === isFast(magazine.name));
  if (fastRows.length === 1) return fastRows[0];
  if (capacityRows.length === 1) return capacityRows[0];
  throw new Error(`${key}: screenshot mapping is ambiguous (${capacityRows.map(row => row.attachmentName).join(', ')})`);
}

function classify({ weapon, magazineId, magazine, row, override }) {
  const key = `${weapon.id}/${magazineId}`;
  if (override) return { kind: 'animation-override', tacRldOverrideMs: override.tacRldOverrideMs };
  if (tubeFedShotguns.has(weapon.id)) return { kind: 'tube-fed-screenshot', reloadSpeedTier: 0 };
  if (screenshotExceptions.has(key)) return { kind: 'screenshot-exception', reloadSpeedTier: 0 };
  if (weapon.tacRld == null) throw new Error(`${key}: no scalar base for non-tube classification`);

  const matches = [0, 1, 2].filter(tier => Math.abs(
    roundSeconds(weapon.tacRld / (1.13 ** tier)) - row.stats.reloadTimeSeconds,
  ) <= 0.005);
  if (matches.length !== 1) {
    throw new Error(`${key}: screenshot ${row.stats.reloadTimeSeconds}s does not pin exactly one known tier`);
  }
  return { kind: 'screenshot-ladder', reloadSpeedTier: matches[0] };
}

function assignedDescription(classification) {
  if (classification.tacRldOverrideMs != null) return `animation override ${classification.tacRldOverrideMs} ms`;
  return `reloadSpeedTier ${classification.reloadSpeedTier}`;
}

function expectedDerivedMs(weapon, classification, legacyTacRldMs) {
  if (classification.tacRldOverrideMs != null) return classification.tacRldOverrideMs;
  if (weapon.tacRld == null) return legacyTacRldMs;
  return Math.round(roundSeconds(weapon.tacRld / (1.13 ** classification.reloadSpeedTier)) * 1000);
}

function evidenceFor({ weapon, magazine, row, classification }) {
  const registerEntry = register.animationOverrides?.[weapon.id]?.[Object.entries(attachments.WEAPON_MAG[weapon.id].mags)
    .find(([, candidate]) => candidate === magazine)?.[0]];
  return {
    source: sourcePath(row),
    observedReloadMs: Math.round(row.stats.reloadTimeSeconds * 1000),
    observedReloadSeconds: row.stats.reloadTimeSeconds,
    screenshotName: row.attachmentName,
    classification: assignedDescription(classification),
    registerRecordKey: registerEntry?.recordKey ?? null,
  };
}

function nameEffectConflicts(records) {
  const conflicts = [];
  for (const record of records) {
    const catalogNameClaimsFast = isFast(record.magazineName);
    if (!catalogNameClaimsFast || record.assigned.reloadSpeedTier === 1) continue;
    if (record.key === 'pp19/20_fast') {
      conflicts.push({
        key: record.key,
        catalogName: record.magazineName,
        measuredClass: 'tier0',
        resolution: 'screenshot exception register; suspectedGameBug',
        source: record.evidence.source,
      });
    } else if (record.key === 'kts100/45_fast' && record.assigned.reloadSpeedTier === 2) {
      conflicts.push({
        key: record.key,
        catalogName: record.magazineName,
        measuredClass: 'tier2',
        resolution: 'direct screenshot; the single documented 1.13-squared stacked case',
        source: record.evidence.source,
      });
    } else if (tubeFedShotguns.has(record.weaponId)) {
      conflicts.push({
        key: record.key,
        catalogName: record.magazineName,
        measuredClass: 'tube-fed scalar-null; tier0 marker',
        resolution: 'tube-fed shotgun policy; scalar multiplier is not applied',
        source: record.evidence.source,
      });
    } else {
      throw new Error(`${record.key}: catalog name conflicts with screenshot class and has no registered resolution`);
    }
  }
  return conflicts;
}

function buildPreMigrationState() {
  return {
    kind: 'reload-phase4-pre-migration-state',
    units: { tacRld: 'integer milliseconds; null means the legacy field was absent' },
    baselineDigest: oldBaseline.digest.value,
    magazines: Object.fromEntries(Object.entries(attachments.WEAPON_MAG).map(([weaponId, weaponMag]) => [
      weaponId,
      Object.fromEntries(Object.entries(weaponMag.mags ?? {}).map(([magazineId, magazine]) => [
        magazineId,
        { tacRld: magazine.tacRld ?? null },
      ])),
    ])),
    weaponErgo: Object.fromEntries(Object.entries(attachments.WEAPON_ERGO).map(([weaponId, weaponErgo]) => [
      weaponId,
      weaponErgo.magCatchRld ? { ...weaponErgo.magCatchRld } : null,
    ])),
  };
}

if (Object.values(attachments.WEAPON_MAG).some(weaponMag => Object.values(weaponMag.mags ?? {})
  .some(mag => Object.hasOwn(mag, 'reloadSpeedTier') || Object.hasOwn(mag, 'tacRldOverrideMs')))) {
  throw new Error('reload data already contains derived magazine fields; refusing to rerun migration');
}

const preMigrationState = buildPreMigrationState();
const manifestRecords = [];
const changedValues = [];
const classCounts = { tier0: 0, tier1: 0, tier2: 0, animationOverrideEntries: 0 };

for (const [weaponId, weaponMag] of Object.entries(attachments.WEAPON_MAG)) {
  const weapon = weaponById.get(weaponId);
  if (!weapon) throw new Error(`missing weapon for ${weaponId}`);
  for (const [magazineId, magazine] of Object.entries(weaponMag.mags ?? {})) {
    const key = `${weaponId}/${magazineId}`;
    const row = findEvidenceRow(weapon, magazineId, magazine);
    const override = register.animationOverrides?.[weaponId]?.[magazineId] ?? null;
    const classification = classify({ weapon, magazineId, magazine, row, override });
    const legacyTacRldMs = magazine.tacRld ?? null;
    const newDerivedTacRldMs = expectedDerivedMs(weapon, classification, legacyTacRldMs);
    const assigned = classification.tacRldOverrideMs != null
      ? { tacRldOverrideMs: classification.tacRldOverrideMs }
      : { reloadSpeedTier: classification.reloadSpeedTier };
    if (classification.tacRldOverrideMs != null) classCounts.animationOverrideEntries++;
    else classCounts[`tier${classification.reloadSpeedTier}`]++;

    const record = {
      key,
      weaponId,
      weaponName: weapon.name,
      magazineId,
      magazineName: magazine.name,
      legacyComposedTacRldMs: legacyTacRldMs,
      newDerivedComposedTacRldMs: newDerivedTacRldMs,
      assigned,
      evidence: evidenceFor({ weapon, magazine, row, classification }),
      valueChanged: legacyTacRldMs !== newDerivedTacRldMs,
      justification: null,
    };
    if (record.valueChanged) {
      record.justification = classification.tacRldOverrideMs != null
        ? `Reviewed screenshot reads ${row.stats.reloadTimeSeconds.toFixed(3)} s; the ID-keyed animation register pins ${newDerivedTacRldMs} ms.`
        : `Reviewed screenshot reads ${row.stats.reloadTimeSeconds.toFixed(3)} s; the legacy ${legacyTacRldMs} ms transcription is replaced by the screenshot-backed ${assignedDescription(classification)} result.`;
      changedValues.push({
        key,
        field: 'tacRld',
        beforeMs: legacyTacRldMs,
        afterMs: newDerivedTacRldMs,
        evidence: record.evidence.source,
        justification: record.justification,
      });
    }
    manifestRecords.push(record);

    if (!dryRun) {
      if (classification.tacRldOverrideMs != null) {
        magazine.tacRldOverrideMs = classification.tacRldOverrideMs;
        delete magazine.reloadSpeedTier;
      } else {
        magazine.reloadSpeedTier = classification.reloadSpeedTier;
        delete magazine.tacRldOverrideMs;
      }
      if (key === 'pp19/20_fast') {
        magazine.suspectedGameBug = {
          field: 'reloadSpeedTier',
          expectedWhenFixed: 1,
          expectedReloadSeconds: 2.183,
          observedReloadSeconds: 2.467,
          observedOn: '2026-07-20',
          note: 'Named/described as a fast magazine but does not receive the 1.13 reload multiplier in game.',
        };
      }
      if (newDerivedTacRldMs != null) magazine.tacRld = newDerivedTacRldMs;
    }
  }
}

const screenshotNameEffectMismatches = manifestRecords
  .filter(record => record.assigned.reloadSpeedTier === 1 && !isFast(record.evidence.screenshotName))
  .map(record => ({
    key: record.key,
    screenshotName: record.evidence.screenshotName,
    observedReloadMs: record.evidence.observedReloadMs,
    resolution: 'direct screenshot wins; this is a documented non-Fast-named 1.13 class member',
    source: record.evidence.source,
  }));
const conflicts = nameEffectConflicts(manifestRecords);

const legacyMagCatchCorrections = [];
for (const [weaponId, weaponErgo] of Object.entries(attachments.WEAPON_ERGO)) {
  const weapon = weaponById.get(weaponId);
  const current = weaponErgo.magCatchRld;
  if (!current || weapon?.tacRld == null) continue;
  const expectedReg = Math.round(roundSeconds(weapon.tacRld / 1.063) * 1000);
  const expectedFast = current.fast == null
    ? null
    : Math.round(roundSeconds(weapon.tacRld / (1.13 * 1.063)) * 1000);
  if (current.reg === expectedReg && current.fast === expectedFast) continue;
  legacyMagCatchCorrections.push({
    weaponId,
    weaponName: weapon.name,
    before: { ...current },
    after: { reg: expectedReg, fast: expectedFast },
    evidence: 'AK-205 / Improved Mag Catch screenshot plus the measured 1.063 Mag Catch multiplier; fast value also uses the direct Fast Mag screenshot and the 1.13 ladder.',
  });
  if (!dryRun) {
    current.reg = expectedReg;
    if (expectedFast != null) current.fast = expectedFast;
  }
}

if (!dryRun) {
  const magCatch = attachments.ERGOS.find(ergo => ergo.id === 'mag_catch');
  if (!magCatch) throw new Error('ERGOS catalog is missing mag_catch');
  magCatch.reloadSpeedMult = 1.063;
  writeJson('data/attachments.json', attachments);
  writeJson('scripts/reload-phase4-pre-migration-state.json', preMigrationState);
}

const manifest = {
  kind: 'reload-phase4-migration-manifest',
  schemaVersion: 1,
  units: {
    legacyComposedTacRldMs: 'integer milliseconds from the pre-migration legacy resolver with no ergonomic selection',
    newDerivedComposedTacRldMs: 'integer milliseconds from the assigned tier or registered override; tube-fed rows retain their legacy scalar-null fallback',
    screenshotToleranceSeconds: 0.005,
  },
  source: {
    screenshotFixture: 'migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json',
    exceptionRegister: 'data/reload-exceptions.json',
    preMigrationBaselineDigest: oldBaseline.digest.value,
  },
  counts: {
    magazineEntries: manifestRecords.length,
    classCounts,
    animationOverrideRecords: register.counts.animationOverrideRecords,
    animationOverrideEntries: register.counts.animationOverrideEntries,
    changedMagazineValues: changedValues.length,
    legacyMagCatchCorrections: legacyMagCatchCorrections.length,
  },
  classificationConflicts: conflicts,
  screenshotNameEffectMismatches,
  legacyMagCatchCorrections,
  changedValues,
  magazines: manifestRecords,
};

if (!dryRun) writeJson('scripts/reload-phase4-migration-manifest.json', manifest);
console.log(JSON.stringify({
  dryRun,
  classCounts,
  changedMagazineValues: changedValues.length,
  legacyMagCatchCorrections,
  classificationConflicts: conflicts,
  screenshotNameEffectMismatchCount: screenshotNameEffectMismatches.length,
  changedValues: process.argv.includes('--print-changes') ? changedValues : undefined,
  preMigrationBaselineDigest: oldBaseline.digest.value,
}, null, 2));

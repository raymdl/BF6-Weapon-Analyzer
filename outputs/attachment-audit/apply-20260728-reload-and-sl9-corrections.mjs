import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('outputs/attachment-audit');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
const sl9Folder = path.resolve('Weapon Attachments/SMG/SL9');
const oldBurstPath = path.join(sl9Folder, '42_SL9_Ergonomics_BURST_TRAINING.png');
const burstPath = path.join(sl9Folder, '42_SL9_Ergonomics_Burst_Mode.png');
const replacements = new Map([
  ['40_SL9_Ergonomics_None.png', 'Battlefield 6 Screenshot 2026.07.28 - 14.57.31.89 (Medium).png'],
  ['41_SL9_Ergonomics_Improved_Mag_Catch.png', 'Battlefield 6 Screenshot 2026.07.28 - 14.57.33.89 (Medium).png'],
  ['42_SL9_Ergonomics_Burst_Mode.png', 'Battlefield 6 Screenshot 2026.07.28 - 14.57.35.75 (Medium).png'],
]);
const canonicalPath = sourcePath => path.resolve(sourcePath).toLowerCase() === oldBurstPath.toLowerCase() ? burstPath : path.resolve(sourcePath);

for (const [targetName, refreshName] of [
  ['raw-ocr.json', 'raw-ocr-sl9-refresh.json'],
  ['panel-ocr.json', 'panel-ocr-sl9-refresh.json'],
  ['value-ocr.json', 'value-ocr-sl9-refresh.json'],
  ['recoil-ocr.json', 'recoil-ocr-sl9-refresh.json'],
  ['recoil-value-ocr.json', 'recoil-value-ocr-sl9-refresh.json'],
  ['stat-comparisons.json', 'stat-comparisons-sl9-refresh.json'],
]) {
  const targetPath = path.join(root, targetName);
  if (!fs.existsSync(targetPath)) continue;
  const base = read(targetName).filter(row => row.weapon !== 'SL9');
  const refresh = read(refreshName).map(row => {
    const sourcePath = canonicalPath(row.sourcePath);
    return { ...row, sourcePath, sourceName: path.basename(sourcePath) };
  });
  write(targetName, [...base, ...refresh]);
}

const review = read('attachment-screenshot-review.json');
const sl9Stats = {
  damage: 26, rateOfFireRpm: 675, magazineSize: 30, hipfire: 47, precision: 61, control: 55, mobility: 68,
  fireModes: ['AUTO', 'SINGLE'], reloadTimeSeconds: 2.650, muzzleVelocityMps: 486, adsTimeMs: 167,
  headshotMultiplier: 1.40, longRangeDamage: 12, spotOnFire3dM: 54, spotOnFire2dM: 150,
  opponentHealthRegenDelaySeconds: 5.0, collateralMultiplier: 0.57, reloadInAds: true,
  adsMoveSpeedMultiplier: 0.75, sprintRecoveryMs: 100, recoilAmountDegrees: 0.5, recoilVariationDegrees: 13.0,
};
const reloadCorrections = new Map([
  ['SL9|Improved Mag Catch', 2.493],
  ['M433|20Rnd Fast Mag', 2.110], ['M433|30Rnd Fast Mag', 2.110], ['M433|40Rnd Fast Mag', 2.110],
  ['SOR-556 MK2|20Rnd Fast Mag', 2.110], ['SOR-556 MK2|40Rnd Fast Mag', 2.110], ['SOR-556 MK2|45Rnd Fast Mag', 2.110],
  ['PP-19|20Rnd Fast Mag', 2.183], ['SGX|36Rnd Fast Mag', 2.227],
]);
const changed = [];
for (const row of review.records) {
  if (row.weaponName === 'SL9' && row.attachmentType === 'Ergonomics') {
    row.stats = { ...sl9Stats };
    row.statFieldReasons = {};
    row.mappingReviewStatus = 'visually-checked';
    row.notes = [...new Set([...(row.notes ?? []), 'Detailed-panel replacement screenshot reviewed on 2026-07-28; all displayed typed stats and comparison indicators were refreshed.'])];
    if (row.attachmentName === 'Improved Mag Catch') row.statComparisons = { reloadTimeSeconds: { direction: 'down', effect: 'buff', color: 'green', source: 'replacement-screenshot-2026-07-28' } };
    else if (/BURST/i.test(row.attachmentName)) {
      row.attachmentName = 'Burst Mode';
      row.attachmentSubtype = 'Fire Control';
      row.attachmentDescription = 'Replaces the default fire mode with 2-round burst fire. Burst fire mode reduces horizontal recoil in favor of more stable vertical recoil and minimally reduces overall recoil.';
      row.stats.rateOfFireRpm = 771;
      row.stats.precision = 78;
      row.statComparisons = {
        rateOfFireRpm: { direction: 'up', effect: 'buff', color: 'green', source: 'replacement-screenshot-2026-07-28' },
        precision: { direction: 'up', effect: 'buff', color: 'green', source: 'replacement-screenshot-2026-07-28' },
      };
      row.source.currentPath = burstPath;
      row.source.proposedFilename = path.basename(burstPath);
    } else row.statComparisons = {};
    const originalName = replacements.get(path.basename(row.source.currentPath));
    if (originalName) {
      row.source.originalFilename = originalName;
      row.source.originalPath = path.join(sl9Folder, originalName);
    }
  }
  const key = `${row.weaponName}|${row.attachmentName}`;
  if (reloadCorrections.has(key)) {
    const before = row.stats.reloadTimeSeconds;
    row.stats.reloadTimeSeconds = reloadCorrections.get(key);
    row.statComparisons ??= {};
    row.statComparisons.reloadTimeSeconds = { direction: 'down', effect: 'buff', color: 'green', source: 'user-verified-reload-review-2026-07-28' };
    if (before !== row.stats.reloadTimeSeconds) row.notes = [...new Set([...(row.notes ?? []), `Reload time corrected from ${before.toFixed(3)}s to ${row.stats.reloadTimeSeconds.toFixed(3)}s after screenshot/model discrepancy review on 2026-07-28.`])];
    changed.push({ weaponName: row.weaponName, attachmentName: row.attachmentName, before, after: row.stats.reloadTimeSeconds });
  }
}
if (changed.length !== 9) throw new Error(`Expected 9 reload corrections, applied ${changed.length}`);
review.generatedAt = new Date().toISOString();
write('attachment-screenshot-review.json', review);

const manual = read('manual-review-overrides.json');
for (const row of review.records.filter(item => item.weaponName === 'SL9' && item.attachmentType === 'Ergonomics')) {
  let override = manual.overrides.find(item => path.resolve(item.sourcePath).toLowerCase() === path.resolve(row.source.currentPath).toLowerCase())
    ?? manual.overrides.find(item => path.resolve(item.sourcePath).toLowerCase() === oldBurstPath.toLowerCase());
  if (!override) {
    override = { weaponName: row.weaponName, attachmentType: row.attachmentType, attachmentName: row.attachmentName, sourcePath: row.source.currentPath, sourceFilename: path.basename(row.source.currentPath), updates: {}, evidence: [] };
    manual.overrides.push(override);
  }
  override.sourcePath = row.source.currentPath;
  override.sourceFilename = path.basename(row.source.currentPath);
  override.attachmentName = row.attachmentName;
  override.updates = { ...(override.updates ?? {}), ...row.stats };
  if (row.attachmentName === 'Burst Mode') {
    override.updates.attachmentName = 'Burst Mode';
    override.updates.attachmentSubtype = 'Fire Control';
    override.updates.attachmentDescription = row.attachmentDescription;
  }
  override.comparisons = row.statComparisons;
  override.replaceComparisons = true;
  override.mappingReviewStatus = 'visually-checked';
  override.evidence = [...new Map([...(override.evidence ?? []), { kind: 'detailed-panel-replacement-screenshot', reviewDate: '2026-07-28' }].map(item => [JSON.stringify(item), item])).values()];
}
for (const correction of changed) {
  const row = review.records.find(item => item.weaponName === correction.weaponName && item.attachmentName === correction.attachmentName);
  let override = manual.overrides.find(item => path.resolve(item.sourcePath).toLowerCase() === path.resolve(row.source.currentPath).toLowerCase());
  if (!override) {
    override = { weaponName: row.weaponName, attachmentType: row.attachmentType, attachmentName: row.attachmentName, sourcePath: row.source.currentPath, sourceFilename: path.basename(row.source.currentPath), updates: {}, evidence: [] };
    manual.overrides.push(override);
  }
  override.updates ??= {};
  override.updates.reloadTimeSeconds = correction.after;
  override.comparisons ??= {};
  override.comparisons.reloadTimeSeconds = row.statComparisons.reloadTimeSeconds;
  override.evidence = [...new Map([...(override.evidence ?? []), { kind: 'user-verified-reload-review', reviewDate: '2026-07-28' }].map(item => [JSON.stringify(item), item])).values()];
}
for (const override of manual.overrides) {
  if (path.resolve(override.sourcePath).toLowerCase() === oldBurstPath.toLowerCase()) {
    override.sourcePath = burstPath;
    override.sourceFilename = path.basename(burstPath);
    override.attachmentName = 'Burst Mode';
  }
}
manual.generatedAt = new Date().toISOString();
write('manual-review-overrides.json', manual);

for (const name of ['rename-manifest.json', 'rename-provenance.json', 'coverage-report.json']) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) continue;
  const doc = read(name);
  const rows = Array.isArray(doc) ? doc : doc.entries ?? doc.weapons ?? [];
  for (const row of rows) {
    for (const key of ['sourcePath', 'targetPath', 'currentPath']) {
      if (row[key] && path.resolve(row[key]).toLowerCase() === oldBurstPath.toLowerCase()) row[key] = burstPath;
    }
    if (row.sourceFilename === path.basename(oldBurstPath)) row.sourceFilename = path.basename(burstPath);
    if (row.targetFilename === path.basename(oldBurstPath)) row.targetFilename = path.basename(burstPath);
  }
  write(name, doc);
}

console.log(JSON.stringify({ changed, sl9Ergo: review.records.filter(row => row.weaponName === 'SL9' && row.attachmentType === 'Ergonomics').map(row => ({ name: row.attachmentName, reload: row.stats.reloadTimeSeconds, rof: row.stats.rateOfFireRpm, precision: row.stats.precision, path: row.source.currentPath })) }, null, 2));

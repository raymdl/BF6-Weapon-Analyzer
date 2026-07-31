import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('outputs/attachment-audit');
const reviewPath = path.join(root, 'attachment-screenshot-review.json');
const manualPath = path.join(root, 'manual-review-overrides.json');
const sweepPath = path.join(root, 'sweep-findings.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const review = read(reviewPath);
const manual = read(manualPath);
const sweep = read(sweepPath);
const changed = [];

function findRow(weaponName, attachmentType, attachmentName) {
  const matches = review.records.filter(row => row.weaponName === weaponName && row.attachmentType === attachmentType && row.attachmentName === attachmentName);
  if (matches.length !== 1) throw new Error(`Expected one row for ${weaponName}/${attachmentType}/${attachmentName}, found ${matches.length}`);
  return matches[0];
}

function persist(row, field, value, evidenceKind) {
  const before = row.stats[field];
  if (before === value) return;
  row.stats[field] = value;
  const sourcePath = row.source.currentPath;
  let override = manual.overrides.find(item => item.sourcePath && path.resolve(item.sourcePath).toLowerCase() === path.resolve(sourcePath).toLowerCase());
  if (!override) {
    override = {
      weaponName: row.weaponName,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      sourcePath,
      sourceFilename: path.basename(sourcePath),
      updates: {},
      evidence: [],
      reviewStatus: null,
      mappingReviewStatus: 'visually-checked',
    };
    manual.overrides.push(override);
  }
  override.updates ??= {};
  override.updates[field] = value;
  override.evidence = [...new Map([...(override.evidence ?? []), {
    kind: evidenceKind,
    source: sourcePath,
    reviewDate: '2026-07-30',
  }].map(item => [JSON.stringify(item), item])).values()];
  changed.push({ weapon: row.weaponName, attachment: `${row.attachmentType}/${row.attachmentName}`, field, before, after: value });
}

// Direct screenshot reads: NVO-228E Muzzle screenshots all show the same base
// columns except Linear Comp's recoil variation.
for (const row of review.records.filter(row => row.weaponName === 'NVO-228E' && row.attachmentType === 'Muzzle')) {
  persist(row, 'damage', 35, 'direct-screenshot-review-claude-feedback');
  persist(row, 'adsTimeMs', 250, 'direct-screenshot-review-claude-feedback');
  persist(row, 'adsMoveSpeedMultiplier', 0.6, 'direct-screenshot-review-claude-feedback');
  persist(row, 'recoilVariationDegrees', row.attachmentName === 'Linear Comp' ? 22.3 : 28.9, 'direct-screenshot-review-claude-feedback');
}

persist(findRow('M250', 'Grip', 'None'), 'damage', 26, 'direct-screenshot-review-claude-feedback');
persist(findRow('PSR', 'Muzzle', 'Compensated Brake'), 'rateOfFireRpm', 38, 'direct-screenshot-review-claude-feedback');
persist(findRow('SV-98', 'Muzzle', 'Lightened Suppressor'), 'rateOfFireRpm', 38, 'direct-screenshot-review-claude-feedback');
for (const row of review.records.filter(row => row.weaponName === 'M4A1' && row.attachmentType === 'Muzzle' && row.attachmentName !== 'Linear Comp')) {
  persist(row, 'recoilVariationDegrees', 30.7, 'direct-screenshot-review-claude-feedback');
}

// A non-magazine attachment cannot change capacity. These are unambiguous
// column leaks; restore each to the weapon base stated by the sweep.
for (const finding of sweep.findings.filter(item => item.check === 'cross-slot-leak')) {
  const match = /magazineSize reads \d+ but weapon base is (\d+)/.exec(finding.detail);
  const slash = finding.attachment.indexOf('/');
  if (!match || slash < 1) throw new Error(`Cannot parse sweep finding: ${JSON.stringify(finding)}`);
  const attachmentType = finding.attachment.slice(0, slash);
  const attachmentName = finding.attachment.slice(slash + 1);
  persist(findRow(finding.weapon, attachmentType, attachmentName), 'magazineSize', Number(match[1]), 'slot-invariant-correction-claude-feedback');
}

review.generatedAt = new Date().toISOString();
manual.generatedAt = review.generatedAt;
write(reviewPath, review);
write(manualPath, manual);
console.log(JSON.stringify({ correctedValues: changed.length, changed }, null, 2));

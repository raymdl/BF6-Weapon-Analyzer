// Apply the base-31 magazine price-ladder corrections to the durable override
// ledger. The screenshot-review JSON is already corrected and is read-only here.
// Idempotent: a successful rerun makes no changes.

import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT ?? 'outputs/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const overridesPath = path.join(auditRoot, 'manual-review-overrides.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const baseName = value => value.split(/[\\/]/).pop();
const sourceKey = value => path.resolve(value).toLowerCase();

const corrections = [
  { weaponName: 'B36A4', attachmentName: '20Rnd Magazine', cost: 5 },
  { weaponName: 'M16A4', attachmentName: '20Rnd Magazine', cost: 5 },
  { weaponName: 'SOR-556 MK2', attachmentName: '20Rnd Magazine', cost: 5 },
  { weaponName: 'M433', attachmentName: '20Rnd Magazine', cost: 5 },
  { weaponName: 'M16A4', attachmentName: '20Rnd Fast Mag', cost: 5 },
  { weaponName: 'SOR-556 MK2', attachmentName: '20Rnd Fast Mag', cost: 5 },
  { weaponName: 'VCR-2', attachmentName: '20Rnd Fast Mag', cost: 5 },
  { weaponName: 'M433', attachmentName: '30Rnd Magazine', cost: 5 },
  { weaponName: 'M433', attachmentName: '36Rnd Magazine', cost: 15 },
  { weaponName: 'M433', attachmentName: '40Rnd Fast Mag', cost: 30 },
  { weaponName: 'KORD 6P67', attachmentName: '40Rnd Magazine', cost: 25 },
];

const review = read(reviewPath);
const manual = read(overridesPath);
const additions = [];
const updates = [];

const assertSourceExists = (sourcePath, identity) => {
  const sourceFilename = baseName(sourcePath);
  if (!fs.existsSync(sourcePath)) throw new Error(identity + ': source path does not exist: ' + sourcePath);
  if (baseName(sourcePath) !== sourceFilename) throw new Error(identity + ': invalid source filename');
};

const assertUniqueSourcePaths = () => {
  const seen = new Map();
  for (const entry of manual.overrides ?? []) {
    const key = sourceKey(entry.sourcePath);
    if (seen.has(key)) throw new Error('Duplicate override sourcePath: ' + entry.sourcePath);
    seen.set(key, entry);
  }
};

const findReviewRow = correction => {
  const matches = review.records.filter(row => row.weaponName === correction.weaponName
    && row.attachmentType === 'Magazine'
    && row.attachmentName === correction.attachmentName);
  if (matches.length !== 1) {
    throw new Error('Expected exactly one review row for ' + correction.weaponName + '|Magazine|' + correction.attachmentName + ', found ' + matches.length);
  }
  const row = matches[0];
  if (row.attachmentCost !== correction.cost) {
    throw new Error(correction.weaponName + '|Magazine|' + correction.attachmentName + ': expected corrected cost ' + correction.cost + ', found ' + row.attachmentCost);
  }
  assertSourceExists(row.source.currentPath, correction.weaponName + '|Magazine|' + correction.attachmentName);
  return row;
};

const newEntry = (correction, row) => {
  const sourcePath = row.source.currentPath;
  assertSourceExists(sourcePath, correction.weaponName + '|Magazine|' + correction.attachmentName);
  return {
    sourcePath,
    sourceFilename: baseName(sourcePath),
    comparisons: {},
    replaceComparisons: false,
    evidence: [{
      kind: 'base-31-magazine-price-ladder-cost-correction',
      source: sourcePath,
      reviewDate: '2026-08-01',
    }],
    weaponName: correction.weaponName,
    attachmentType: 'Magazine',
    attachmentName: correction.attachmentName,
    updates: { attachmentCost: correction.cost },
  };
};

assertUniqueSourcePaths();

const insertions = new Map();
for (const correction of corrections) {
  const row = findReviewRow(correction);
  const sourcePath = row.source.currentPath;
  const sourceFilename = baseName(sourcePath);
  const matches = manual.overrides.filter(entry => sourceKey(entry.sourcePath) === sourceKey(sourcePath));
  if (matches.length > 1) throw new Error('Expected at most one override for ' + sourcePath + ', found ' + matches.length);
  if (matches.length === 1) {
    const override = matches[0];
    if (override.weaponName !== correction.weaponName
      || override.attachmentType !== 'Magazine'
      || override.attachmentName !== correction.attachmentName) {
      throw new Error('Override identity mismatch for ' + sourcePath);
    }
    assertSourceExists(override.sourcePath, correction.weaponName + '|Magazine|' + correction.attachmentName);
    if (Object.prototype.hasOwnProperty.call(override.updates ?? {}, 'attachmentCost')) {
      if (override.updates.attachmentCost !== correction.cost) {
        throw new Error(sourceFilename + ': expected override cost ' + correction.cost + ', found ' + override.updates.attachmentCost);
      }
    } else {
      override.updates = { attachmentCost: correction.cost, ...(override.updates ?? {}) };
      updates.push({ weaponName: correction.weaponName, attachmentName: correction.attachmentName, attachmentCost: correction.cost });
    }
    continue;
  }

  const sameWeaponMagazine = manual.overrides
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.weaponName === correction.weaponName && entry.attachmentType === 'Magazine');
  const sameWeapon = manual.overrides
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.weaponName === correction.weaponName);
  const anchor = sameWeaponMagazine.at(-1) ?? sameWeapon.at(-1);
  if (!anchor) throw new Error('No neighbouring override entry found for ' + correction.weaponName);
  const position = anchor.index + 1;
  if (!insertions.has(position)) insertions.set(position, []);
  insertions.get(position).push(newEntry(correction, row));
  additions.push({ weaponName: correction.weaponName, attachmentName: correction.attachmentName, sourceFilename, attachmentCost: correction.cost });
}

if (insertions.size > 0) {
  for (const [position, entries] of [...insertions.entries()].sort((a, b) => b[0] - a[0])) {
    manual.overrides.splice(position, 0, ...entries);
  }
}

assertUniqueSourcePaths();
for (const correction of corrections) {
  const row = findReviewRow(correction);
  const sourcePath = row.source.currentPath;
  const matches = manual.overrides.filter(entry => sourceKey(entry.sourcePath) === sourceKey(sourcePath));
  if (matches.length !== 1 || matches[0].updates?.attachmentCost !== correction.cost) {
    throw new Error('Override mirror missing or mismatched for ' + correction.weaponName + '|' + correction.attachmentName);
  }
}

if (additions.length > 0 || updates.length > 0) write(overridesPath, manual);

console.log(JSON.stringify({ additions, updates, noOp: additions.length === 0 && updates.length === 0 }, null, 2));

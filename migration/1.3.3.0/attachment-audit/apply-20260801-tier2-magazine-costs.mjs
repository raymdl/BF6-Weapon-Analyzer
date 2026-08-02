// Apply Tier 2 magazine cost corrections from direct screenshot validation to
// the review data and durable override ledger. Confirmed candidates are left
// untouched. Idempotent: a successful rerun makes no changes.

import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const overridesPath = path.join(auditRoot, 'manual-review-overrides.json');
const validationPath = path.join(auditRoot, 'tier2-20260801-magazine-cost-validation.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
const baseName = value => value.split(/[\\/]/).pop();
const sourceKey = value => path.resolve(value).toLowerCase();

const validation = read(validationPath);
const review = read(reviewPath);
const manual = read(overridesPath);

if (!Array.isArray(validation) || validation.length !== 9) {
  throw new Error('Expected exactly nine Tier 2 validation records');
}
const corrected = validation.filter(item => item.verdict === 'corrected');
const correctionSet = new Map([
  ['EF88|42Rnd Magazine', 25],
  ['LMR27|15Rnd Fast Mag', 25],
  ['TR7|20Rnd Magazine', 5],
  ['M277|30Rnd Magazine', 40],
  ['GRT-CPS|30Rnd Magazine', 40],
  ['PP-19|30Rnd Fast Mag', 10],
]);
if (corrected.length !== correctionSet.size || corrected.some(item => correctionSet.get(item.weapon + '|' + item.attachmentName) !== item.screenshotCost)) {
  throw new Error('Tier 2 correction set does not match the validated screenshot costs');
}
for (const item of validation) {
  if (!item.weapon || !item.attachmentName || !item.sourcePath
    || !['confirmed', 'corrected', 'unreadable'].includes(item.verdict)
    || !Number.isInteger(item.currentCost) || !Number.isInteger(item.screenshotCost)
    || !item.note) {
    throw new Error('Invalid Tier 2 validation record: ' + JSON.stringify(item));
  }
}

const assertSourceExists = (sourcePath, identity) => {
  if (!fs.existsSync(sourcePath)) throw new Error(identity + ': source path does not exist: ' + sourcePath);
};

const assertUniqueSourcePaths = () => {
  const seen = new Map();
  for (const entry of manual.overrides ?? []) {
    if (!entry.sourcePath) throw new Error('Override entry is missing sourcePath');
    const key = sourceKey(entry.sourcePath);
    if (seen.has(key)) throw new Error('Duplicate override sourcePath: ' + entry.sourcePath);
    seen.set(key, entry);
  }
};

const findReviewRow = item => {
  const matches = review.records.filter(row => row.weaponName === item.weapon
    && row.attachmentType === 'Magazine'
    && row.attachmentName === item.attachmentName);
  if (matches.length !== 1) {
    throw new Error('Expected exactly one review row for ' + item.weapon + '|Magazine|' + item.attachmentName + ', found ' + matches.length);
  }
  const row = matches[0];
  if (row.source.currentPath !== item.sourcePath) {
    throw new Error(item.weapon + '|Magazine|' + item.attachmentName + ': validation sourcePath does not match review currentPath');
  }
  if (row.attachmentCost !== item.currentCost && row.attachmentCost !== item.screenshotCost) {
    throw new Error(item.weapon + '|Magazine|' + item.attachmentName + ': expected current cost ' + item.currentCost + ' or corrected cost ' + item.screenshotCost + ', found ' + row.attachmentCost);
  }
  assertSourceExists(row.source.currentPath, item.weapon + '|Magazine|' + item.attachmentName);
  return row;
};

const beforeReviewCosts = new Map(review.records.map(row => [
  row.source.currentPath,
  row.attachmentCost,
]));
const rows = new Map();
for (const item of validation) rows.set(item, findReviewRow(item));

assertUniqueSourcePaths();

const additions = [];
const updates = [];
const insertions = new Map();

const newEntry = (item, row) => {
  const sourcePath = row.source.currentPath;
  assertSourceExists(sourcePath, item.weapon + '|Magazine|' + item.attachmentName);
  return {
    sourcePath,
    sourceFilename: baseName(sourcePath),
    comparisons: {},
    replaceComparisons: false,
    evidence: [{
      kind: 'tier-2-magazine-cost-screenshot-revalidation',
      source: sourcePath,
      reviewDate: '2026-08-01',
    }],
    weaponName: item.weapon,
    attachmentType: 'Magazine',
    attachmentName: item.attachmentName,
    updates: { attachmentCost: item.screenshotCost },
  };
};

for (const item of corrected) {
  const row = rows.get(item);
  const sourcePath = row.source.currentPath;
  const matches = manual.overrides.filter(entry => entry.sourcePath === sourcePath);
  if (matches.length > 1) throw new Error('Expected at most one override for ' + sourcePath + ', found ' + matches.length);
  if (matches.length === 1) {
    const override = matches[0];
    if (override.weaponName !== item.weapon
      || override.attachmentType !== 'Magazine'
      || override.attachmentName !== item.attachmentName) {
      throw new Error('Override identity mismatch for ' + sourcePath);
    }
    assertSourceExists(override.sourcePath, item.weapon + '|Magazine|' + item.attachmentName);
    if (Object.prototype.hasOwnProperty.call(override.updates ?? {}, 'attachmentCost')) {
      if (override.updates.attachmentCost !== item.screenshotCost) {
        throw new Error(sourcePath + ': expected override cost ' + item.screenshotCost + ', found ' + override.updates.attachmentCost);
      }
    } else {
      override.updates = { attachmentCost: item.screenshotCost, ...(override.updates ?? {}) };
      updates.push({ weapon: item.weapon, attachmentName: item.attachmentName, attachmentCost: item.screenshotCost });
    }
  } else {
    const sameWeaponMagazine = manual.overrides
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.weaponName === item.weapon && entry.attachmentType === 'Magazine');
    const sameWeapon = manual.overrides
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.weaponName === item.weapon);
    const anchor = sameWeaponMagazine.at(-1) ?? sameWeapon.at(-1);
    if (!anchor) throw new Error('No neighbouring override entry found for ' + item.weapon);
    const position = anchor.index + 1;
    if (!insertions.has(position)) insertions.set(position, []);
    insertions.get(position).push(newEntry(item, row));
    additions.push({ weapon: item.weapon, attachmentName: item.attachmentName, sourceFilename: baseName(sourcePath), attachmentCost: item.screenshotCost });
  }
}

for (const [position, entries] of [...insertions.entries()].sort((a, b) => b[0] - a[0])) {
  manual.overrides.splice(position, 0, ...entries);
}

for (const item of corrected) {
  const row = rows.get(item);
  if (row.attachmentCost === item.currentCost) row.attachmentCost = item.screenshotCost;
  if (row.attachmentCost !== item.screenshotCost) {
    throw new Error(item.weapon + '|Magazine|' + item.attachmentName + ': failed to apply screenshot cost');
  }
}

for (const row of review.records) {
  const prior = beforeReviewCosts.get(row.source.currentPath);
  const candidate = validation.find(item => item.sourcePath === row.source.currentPath);
  const expected = candidate?.verdict === 'corrected' ? candidate.screenshotCost : prior;
  if (row.attachmentCost !== expected) {
    throw new Error('Unexpected review cost change at ' + row.source.currentPath);
  }
}

assertUniqueSourcePaths();
for (const item of corrected) {
  const row = rows.get(item);
  const matches = manual.overrides.filter(entry => entry.sourcePath === row.source.currentPath);
  if (matches.length !== 1 || matches[0].updates?.attachmentCost !== item.screenshotCost) {
    throw new Error('Override mirror missing or mismatched for ' + item.weapon + '|' + item.attachmentName);
  }
}

if (corrected.some(item => rows.get(item).attachmentCost === item.currentCost)) {
  throw new Error('A corrected review cost was not changed');
}

if (additions.length > 0 || updates.length > 0 || corrected.some(item => beforeReviewCosts.get(rows.get(item).source.currentPath) === item.currentCost)) {
  write(reviewPath, review);
}
if (additions.length > 0 || updates.length > 0) write(overridesPath, manual);

console.log(JSON.stringify({
  additions,
  updates,
  corrected: corrected.map(item => ({ weapon: item.weapon, attachmentName: item.attachmentName, attachmentCost: item.screenshotCost })),
  noOp: additions.length === 0 && updates.length === 0,
}, null, 2));

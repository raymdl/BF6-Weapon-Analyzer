// Apply three screenshot-authoritative corpus transcription corrections and mirror them into
// the durable manual-review override ledger. This executable receipt records the pinned
// before/after values and the reason each correction is safe. Idempotent: a successful rerun
// reports noOp and makes no file changes.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const REVIEW = path.join(ROOT, 'migration', '1.3.3.0', 'attachment-audit', 'attachment-screenshot-review.json');
const LEDGER = path.join(ROOT, 'migration', '1.3.3.0', 'attachment-audit', 'manual-review-overrides.json');
const REVIEW_DATE = '2026-08-02';

const corrections = [
  {
    weaponName: 'M2010 ESR',
    attachmentType: 'Magazine',
    attachmentName: '8Rnd Magazine',
    field: 'adsTimeMs',
    before: 250,
    after: 300,
    reason: 'The screenshot is authoritative and reads 300 ms ADS time; the corpus value 250 ms is a transcription error.',
  },
  {
    weaponName: 'M2010 ESR',
    attachmentType: 'Magazine',
    attachmentName: '5Rnd Fast Mag',
    field: 'adsTimeMs',
    before: 250,
    after: 300,
    reason: 'The screenshot is authoritative and reads 300 ms ADS time; the corpus value 250 ms is a transcription error.',
  },
  {
    weaponName: '18.5KS-K',
    attachmentType: 'Grip',
    attachmentName: 'Alloy Vertical',
    field: 'muzzleVelocityMps',
    before: 500,
    after: 400,
    reason: 'Grips do not affect muzzle velocity. The basic barrel is 400 m/s, the extended barrel is 500 m/s, 13 of 14 grip records read 400, and every non-barrel attachment reads 400; this grip captured the extended-barrel value.',
  },
];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const baseName = value => value.split(/[\\/]/).pop();
const sourceKey = value => path.resolve(value).toLowerCase();

const review = readJson(REVIEW);
const ledger = readJson(LEDGER);
if (!Array.isArray(review.records)) throw new Error('Review JSON is missing records');
if (!Array.isArray(ledger.overrides)) throw new Error('Manual ledger is missing overrides');

const assertSourceExists = (sourcePath, identity) => {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error(`${identity}: source path does not exist: ${sourcePath}`);
  }
};

const assertUniqueSourcePaths = () => {
  const seen = new Set();
  for (const entry of ledger.overrides) {
    if (!entry.sourcePath) throw new Error('Override entry is missing sourcePath');
    const key = sourceKey(entry.sourcePath);
    if (seen.has(key)) throw new Error(`Duplicate override sourcePath: ${entry.sourcePath}`);
    seen.add(key);
  }
};

const findRecord = correction => {
  const matches = review.records.filter(row => row.weaponName === correction.weaponName
    && row.attachmentType === correction.attachmentType
    && row.attachmentName === correction.attachmentName);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one review row for ${correction.weaponName}|${correction.attachmentType}|${correction.attachmentName}, found ${matches.length}`);
  }
  const record = matches[0];
  assertSourceExists(record.source?.currentPath, `${correction.weaponName}|${correction.attachmentName}`);
  return record;
};

const newOverride = (record, correction) => ({
  sourcePath: record.source.currentPath,
  sourceFilename: baseName(record.source.currentPath),
  comparisons: {},
  replaceComparisons: false,
  evidence: [],
  weaponName: record.weaponName,
  attachmentType: record.attachmentType,
  attachmentName: record.attachmentName,
  updates: {},
});

const getOverride = (record, correction) => {
  const key = sourceKey(record.source.currentPath);
  const matches = ledger.overrides.filter(entry => sourceKey(entry.sourcePath) === key);
  if (matches.length > 1) throw new Error(`Expected at most one override for ${record.source.currentPath}, found ${matches.length}`);
  if (matches.length === 1) {
    const entry = matches[0];
    if (entry.weaponName !== record.weaponName
      || entry.attachmentType !== record.attachmentType
      || entry.attachmentName !== record.attachmentName) {
      throw new Error(`Override identity mismatch for ${record.source.currentPath}`);
    }
    return { entry, added: false };
  }

  const sameWeaponType = ledger.overrides
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.weaponName === record.weaponName && entry.attachmentType === record.attachmentType);
  const sameWeapon = ledger.overrides
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.weaponName === record.weaponName);
  const anchor = sameWeaponType.at(-1) ?? sameWeapon.at(-1);
  const entry = newOverride(record, correction);
  if (anchor) ledger.overrides.splice(anchor.index + 1, 0, entry);
  else ledger.overrides.push(entry);
  return { entry, added: true };
};

assertUniqueSourcePaths();

const receipt = [];
let reviewChanges = 0;
let ledgerEntriesAdded = 0;
let ledgerUpdates = 0;
let evidenceAdded = 0;

for (const correction of corrections) {
  const record = findRecord(correction);
  const current = record.stats?.[correction.field];
  let reviewChanged = false;
  if (current === correction.after) {
    // Already corrected: preserve idempotence while still checking the pinned target.
  } else if (current === correction.before) {
    record.stats[correction.field] = correction.after;
    reviewChanged = true;
    reviewChanges += 1;
  } else {
    throw new Error(`${correction.weaponName}|${correction.attachmentName}|${correction.field}: expected ${correction.before} or ${correction.after}, found ${current}`);
  }

  const { entry, added } = getOverride(record, correction);
  if (added) ledgerEntriesAdded += 1;
  entry.updates ??= {};
  const priorLedgerValue = entry.updates[correction.field];
  if (priorLedgerValue !== correction.after) {
    entry.updates[correction.field] = correction.after;
    ledgerUpdates += 1;
  }

  const expectedEvidence = {
    kind: 'direct-original-screenshot-corpus-transcription-correction',
    source: record.source.currentPath,
    field: correction.field,
    before: correction.before,
    value: correction.after,
    reviewDate: REVIEW_DATE,
    reason: correction.reason,
  };
  entry.evidence ??= [];
  const matchingEvidence = entry.evidence.filter(item => item.kind === expectedEvidence.kind
    && item.field === expectedEvidence.field && item.reviewDate === expectedEvidence.reviewDate);
  if (matchingEvidence.length > 1) throw new Error(`Duplicate receipt evidence for ${record.source.currentPath}`);
  if (matchingEvidence.length === 0) {
    entry.evidence.push(expectedEvidence);
    evidenceAdded += 1;
  } else if (JSON.stringify(matchingEvidence[0]) !== JSON.stringify(expectedEvidence)) {
    throw new Error(`Receipt evidence mismatch for ${record.source.currentPath}`);
  }

  receipt.push({
    weaponName: correction.weaponName,
    attachmentType: correction.attachmentType,
    attachmentName: correction.attachmentName,
    sourcePath: record.source.currentPath,
    field: correction.field,
    before: correction.before,
    after: correction.after,
    reason: correction.reason,
    reviewChanged,
    ledgerEntryAdded: added,
    ledgerValue: entry.updates[correction.field],
  });
}

assertUniqueSourcePaths();
if (review.records.length !== 3177) throw new Error(`Review record count changed: ${review.records.length}`);

if (reviewChanges > 0) writeJson(REVIEW, review);
if (ledgerEntriesAdded > 0 || ledgerUpdates > 0 || evidenceAdded > 0) writeJson(LEDGER, ledger);

console.log(JSON.stringify({
  corrections: receipt,
  reviewChanges,
  ledgerEntriesAdded,
  ledgerUpdates,
  evidenceAdded,
  noOp: reviewChanges === 0 && ledgerEntriesAdded === 0 && ledgerUpdates === 0 && evidenceAdded === 0,
}, null, 2));

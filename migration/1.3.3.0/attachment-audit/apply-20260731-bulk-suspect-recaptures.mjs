// Applies only screenshot-recaptured §8.1 values and removes the 29 proven
// duplicate M1014 canonical records.  It deliberately does not regenerate the
// review JSON from OCR: every saved correction gets a source-path-specific
// manual override and direct-screen evidence entry.
//
// Idempotent after a successful pass.  Source PNGs are never deleted.

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const REVIEW_PATH = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const MANUAL_PATH = path.join(AUDIT_DIR, 'manual-review-overrides.json');
const SUMMARY_PATH = path.join(AUDIT_DIR, 'bulk-suspect-recapture-summary-20260731.json');
const EXCLUSIONS_PATH = path.join(AUDIT_DIR, 'deduped-source-record-exclusions-20260731.json');
const REVIEW_DATE = '2026-07-31';

const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
manual.overrides ||= [];
const priorSummary = fs.existsSync(SUMMARY_PATH)
  ? JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'))
  : null;

const baseName = value => path.basename(value || '');
const sourceKey = value => path.resolve(value || '').toLowerCase();
const isDuplicateM1014 = row => row.weaponName === 'M1014'
  && /_duplicate-2\.png$/i.test(row.source?.currentPath || '');

function fail(message) {
  throw new Error(`bulk-suspect-recaptures: ${message}`);
}

function backupIfPresent(targetDir, target) {
  if (fs.existsSync(target)) fs.copyFileSync(target, path.join(targetDir, path.basename(target)));
}

function findOverride(row) {
  const key = sourceKey(row.source?.currentPath);
  let entry = manual.overrides.find(item => sourceKey(item.sourcePath) === key);
  if (!entry) {
    entry = {
      weaponName: row.weaponName,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      sourcePath: row.source.currentPath,
      sourceFilename: baseName(row.source.currentPath),
      updates: {},
      comparisons: {},
      replaceComparisons: false,
      evidence: [],
      reviewStatus: null,
      mappingReviewStatus: null,
    };
    manual.overrides.push(entry);
  }
  entry.updates ||= {};
  entry.evidence ||= [];
  return entry;
}

function addEvidence(entry, row, field, value) {
  const exists = entry.evidence.some(item => item.kind === 'direct-original-screenshot-field-recapture'
    && item.field === field && item.reviewDate === REVIEW_DATE);
  if (!exists) {
    entry.evidence.push({
      kind: 'direct-original-screenshot-field-recapture',
      source: row.source.currentPath,
      field,
      value,
      reviewDate: REVIEW_DATE,
      reviewArtifact: 'migration/1.3.3.0/attachment-audit/recapture-review/',
    });
  }
}

// These groups were visually re-read from the original, full-resolution field
// strips. `initialValues` makes the first selection bounded to the source
// records in this pass; `expectedCount` refuses a stale or broadened input.
const RECAPTURE_GROUPS = [
  { weapon: 'GRT-CPS', field: 'adsMoveSpeedMultiplier', value: 0.6, expectedCount: 52, initialValues: [0, 0.5] },
  { weapon: 'LMR27', field: 'adsMoveSpeedMultiplier', value: 0.6, expectedCount: 51, initialValues: [0, 0.5] },
  { weapon: 'M1014', field: 'adsMoveSpeedMultiplier', value: 0.6, expectedCount: 33, initialValues: [0, 0.5] },
  { weapon: 'M87A1', field: 'adsMoveSpeedMultiplier', value: 0.6, expectedCount: 33, initialValues: [0, 0.5] },
  { weapon: 'M39 EMR', field: 'sprintRecoveryMs', value: 200, expectedCount: 46, initialValues: [0] },
  { weapon: 'PSR', field: 'sprintRecoveryMs', value: 200, expectedCount: 31, initialValues: [0] },
  { weapon: 'SVDM', field: 'damage', value: 41, expectedCount: 13, initialValues: [0] },
  { weapon: 'SVDM', field: 'sprintRecoveryMs', value: 200, expectedCount: 48, initialValues: [0] },
  { weapon: 'SVK-8.6', field: 'damage', value: 66, expectedCount: 14, initialValues: [0] },
  { weapon: 'SVK-8.6', field: 'sprintRecoveryMs', value: 200, expectedCount: 2, initialValues: [0] },
];

// These values are correct as captured. They remain a narrow, visible sweep
// exception rather than being forced onto the non-shotgun recoil ladder.
const VERIFIED_UNCHANGED = [
  { weapon: 'M87A1', attachmentName: 'Classic Vertical', field: 'recoilAmountDegrees', value: 2.7 },
  { weapon: 'M87A1', attachmentName: 'Low-Profile Stubby', field: 'recoilAmountDegrees', value: 2.7 },
];

const duplicates = review.records.filter(isDuplicateM1014);
if (duplicates.length !== 0 && duplicates.length !== 29) {
  fail(`expected either 0 or 29 M1014 duplicate-2 records, found ${duplicates.length}`);
}

const exclusions = [];
if (duplicates.length) {
  for (const duplicate of duplicates) {
    const candidates = review.records.filter(row => row !== duplicate
      && row.weaponName === duplicate.weaponName
      && row.attachmentType === duplicate.attachmentType
      && row.attachmentName === duplicate.attachmentName
      && !isDuplicateM1014(row)
      // This is the same identity and full stats block that audit-sweep uses
      // for its duplicate-benign finding. Provenance-only metadata is allowed
      // to differ; the retained earlier capture remains the canonical record.
      && JSON.stringify(row.stats) === JSON.stringify(duplicate.stats));
    if (candidates.length !== 1) {
      fail(`${duplicate.attachmentType}/${duplicate.attachmentName} needs exactly one identical retained record; found ${candidates.length}`);
    }
    const retained = candidates[0];
    exclusions.push({
      sourcePath: duplicate.source.currentPath,
      sourceFilename: baseName(duplicate.source.currentPath),
      retainedSourcePath: retained.source.currentPath,
      weaponName: duplicate.weaponName,
      attachmentType: duplicate.attachmentType,
      attachmentName: duplicate.attachmentName,
      reason: 'Exact duplicate canonical record; original source PNG is intentionally retained for audit provenance.',
      reviewedAt: REVIEW_DATE,
    });
  }
  review.records = review.records.filter(row => !isDuplicateM1014(row));
}

const corrected = [];
for (const group of RECAPTURE_GROUPS) {
  const previousPaths = priorSummary?.corrected
    ?.filter(item => item.weaponName === group.weapon && item.field === group.field)
    .map(item => sourceKey(item.sourcePath));
  const rows = previousPaths?.length
    ? review.records.filter(row => previousPaths.includes(sourceKey(row.source?.currentPath)))
    : review.records.filter(row => row.weaponName === group.weapon
      && row.stats
      && group.initialValues.includes(row.stats[group.field]));
  if (rows.length !== group.expectedCount) {
    fail(`${group.weapon} ${group.field}: expected ${group.expectedCount} bounded source records, found ${rows.length}`);
  }
  for (const row of rows) {
    const before = row.stats[group.field];
    if (before !== group.value) row.stats[group.field] = group.value;
    const override = findOverride(row);
    override.updates[group.field] = group.value;
    addEvidence(override, row, group.field, group.value);
    corrected.push({
      weaponName: row.weaponName,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      sourcePath: row.source.currentPath,
      field: group.field,
      before,
      after: group.value,
      result: before === group.value ? 'already-correct' : 'corrected',
    });
  }
}

const verified = [];
for (const item of VERIFIED_UNCHANGED) {
  const rows = review.records.filter(row => row.weaponName === item.weapon
    && row.attachmentName === item.attachmentName
    && row.stats?.[item.field] === item.value);
  if (rows.length !== 1) fail(`${item.weapon} ${item.attachmentName}: expected one screenshot-confirmed ${item.field}=${item.value}, found ${rows.length}`);
  const row = rows[0];
  const override = findOverride(row);
  override.updates[item.field] = item.value;
  addEvidence(override, row, item.field, item.value);
  verified.push({
    weaponName: row.weaponName,
    attachmentType: row.attachmentType,
    attachmentName: row.attachmentName,
    sourcePath: row.source.currentPath,
    field: item.field,
    value: item.value,
    result: 'screenshot-confirmed-unchanged',
  });
}

if (corrected.length !== 323) fail(`expected 323 screenshot field corrections, produced ${corrected.length}`);
if (verified.length !== 2) fail(`expected 2 verified unchanged recoil values, produced ${verified.length}`);

const alreadyApplied = duplicates.length === 0 && corrected.every(item => item.result === 'already-correct');
if (!alreadyApplied) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const backupDir = path.join(AUDIT_DIR, `backups/pre-bulk-suspect-recaptures-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  backupIfPresent(backupDir, REVIEW_PATH);
  backupIfPresent(backupDir, MANUAL_PATH);
  backupIfPresent(backupDir, SUMMARY_PATH);
  backupIfPresent(backupDir, EXCLUSIONS_PATH);
}

fs.writeFileSync(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`);
fs.writeFileSync(MANUAL_PATH, `${JSON.stringify(manual, null, 2)}\n`);
fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify({
  kind: 'bulk-suspect-screenshot-recapture',
  reviewedAt: REVIEW_DATE,
  sourcePolicy: 'Every entry was read directly from its original screenshot field strip; no averages, interpolation, or weapon-wide default was used.',
  corrected,
  verifiedUnchanged: verified,
  counts: {
    duplicateRecordsRemoved: exclusions.length,
    sourcePngsDeleted: 0,
    correctedFields: corrected.filter(item => item.result === 'corrected').length,
    alreadyCorrectFields: corrected.filter(item => item.result === 'already-correct').length,
    verifiedUnchangedFields: verified.length,
  },
}, null, 2)}\n`);

if (exclusions.length || !fs.existsSync(EXCLUSIONS_PATH)) {
  fs.writeFileSync(EXCLUSIONS_PATH, `${JSON.stringify({
    kind: 'canonical-record-dedupe-exclusions',
    reviewedAt: REVIEW_DATE,
    policy: 'This ledger excludes only duplicate canonical JSON records. It does not authorize deleting source screenshots.',
    exclusions,
  }, null, 2)}\n`);
}

console.log(`M1014 duplicate canonical records removed: ${exclusions.length}`);
console.log(`screenshot-confirmed fields: ${corrected.length} (${corrected.filter(item => item.result === 'corrected').length} changed)`);
console.log(`screenshot-confirmed unchanged fields: ${verified.length}`);
console.log(`canonical records now: ${review.records.length}`);

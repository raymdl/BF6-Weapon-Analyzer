// Converts the §8.3 discovery report into bounded, screenshot-backed actions.
// A modal baseline is used only to find candidates; every value below was read
// from the original screenshot. Compact SL9 screens explicitly retain nulls
// for fields that are not displayed instead of inheriting another row's value.

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const REVIEW_PATH = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const MANUAL_PATH = path.join(AUDIT_DIR, 'manual-review-overrides.json');
const DISCOVERY_PATH = path.join(AUDIT_DIR, 'field-slot-discovery-findings.json');
const SUMMARY_PATH = path.join(AUDIT_DIR, 'field-slot-dispositions-20260731.json');
const SL9_DETAIL_RECEIPT_PATH = path.join(AUDIT_DIR, 'sl9-detailed-recapture-20260731.json');
const REVIEW_DATE = '2026-07-31';
const COMPACT_NULL_REASON = 'Field is not displayed in this compact accessory-selector layout; screenshot-specific null retained after direct visual review.';

const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
const discovery = JSON.parse(fs.readFileSync(DISCOVERY_PATH, 'utf8'));
const priorSummary = fs.existsSync(SUMMARY_PATH) ? JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8')) : null;
manual.overrides ||= [];

const key = value => path.resolve(value || '').toLowerCase();
const fail = message => { throw new Error(`field-slot-dispositions: ${message}`); };
if (fs.existsSync(SL9_DETAIL_RECEIPT_PATH)) {
  fail('the historical compact-SL9 disposition is superseded by the detailed recapture; do not reapply this historic script');
}

// Each entry is an exact direct-screen reading for a bounded group from the
// 2026-07-31 contact-sheet pass. `expectedCount` guards against any widened
// discovery result. None of these values are inferred from the modal baseline.
const FIX_GROUPS = [
  { field: 'headshotMultiplier', weapon: 'GRT-CPS', value: 1.5, expectedCount: 5 },
  { field: 'headshotMultiplier', weapon: 'LMR27', value: 1.34, expectedCount: 2 },
  { field: 'headshotMultiplier', weapon: 'M39 EMR', value: 1.5, expectedCount: 1 },
  { field: 'headshotMultiplier', weapon: 'M433', value: 1.4, expectedCount: 1 },
  { field: 'headshotMultiplier', weapon: 'M45A1', value: 1.34, expectedCount: 1 },
  { field: 'headshotMultiplier', weapon: 'P18', value: 1.34, expectedCount: 2 },
  { field: 'headshotMultiplier', weapon: 'PSR', value: 1.75, expectedCount: 5 },
  { field: 'headshotMultiplier', weapon: 'SVDM', value: 1.5, expectedCount: 1 },
  { field: 'headshotMultiplier', weapon: 'SVK-8.6', value: 1.5, expectedCount: 1 },
  { field: 'headshotMultiplier', weapon: 'VZ. 61', value: 1.4, expectedCount: 2 },
  { field: 'collateralMultiplier', weapon: 'M433', value: 0.75, expectedCount: 3 },
  { field: 'collateralMultiplier', weapon: 'NVO-228E', value: 0.75, expectedCount: 2 },
  { field: 'longRangeDamage', weapon: 'NVO-228E', value: 17, expectedCount: 9 },
  { field: 'longRangeDamage', weapon: 'SL9', attachmentType: 'Laser/Light', value: null, expectedCount: 12, reason: COMPACT_NULL_REASON },
  { field: 'recoilVariationDegrees', weapon: 'GRT-CPS', value: 8, expectedCount: 1 },
  { field: 'recoilVariationDegrees', weapon: 'M39 EMR', value: 8, expectedCount: 1 },
  { field: 'recoilVariationDegrees', weapon: 'M433', value: 41.4, expectedCount: 1 },
  { field: 'recoilVariationDegrees', weapon: 'SVDM', value: 10, expectedCount: 1 },
  { field: 'recoilVariationDegrees', weapon: 'SVK-8.6', value: 20, expectedCount: 1 },
  { field: 'recoilVariationDegrees', weapon: 'VSSM', value: 9.1, expectedCount: 1 },
  { field: 'sprintRecoveryMs', weapon: 'M433', attachmentTypes: ['Laser', 'Light'], value: 167, expectedCount: 5 },
  { field: 'adsMoveSpeedMultiplier', weapon: 'M433', attachmentTypes: ['Laser', 'Light'], value: 0.6, expectedCount: 5 },
  { field: 'spotOnFire2dM', weapon: 'M433', attachmentTypes: ['Barrel', 'Ergonomics'], value: 150, expectedCount: 4 },
  { field: 'spotOnFire2dM', weapon: 'SL9', attachmentType: 'Laser/Light', value: null, expectedCount: 12, reason: COMPACT_NULL_REASON },
];

const LEGITIMATE_RULES = [
  { field: 'sprintRecoveryMs', attachmentType: 'Barrel', expectedCount: 20, modelSupport: 'Barrel sprint-recovery tier/assignment support is required.' },
  { field: 'spotOnFire2dM', weapon: 'VSSM', attachmentType: 'Barrel', expectedCount: 1, modelSupport: 'The suppressed 200MM ASM barrel has a screenshot-confirmed 2D spotting range effect.' },
  { field: 'adsMoveSpeedMultiplier', weapon: 'VZ. 61', attachmentType: 'Grip/Laser/Light', expectedCount: 1, modelSupport: 'The combined grip accessory retains ordinary grip ADS-move behavior.' },
];

function selectDiscovery(group) {
  const items = discovery.findings.filter(item => item.field === group.field
    && item.weaponName === group.weapon
    && (!group.attachmentType || item.attachmentType === group.attachmentType)
    && (!group.attachmentTypes || group.attachmentTypes.includes(item.attachmentType)));
  if (items.length !== group.expectedCount) {
    fail(`${group.weapon} ${group.field}: expected ${group.expectedCount} discovery targets, found ${items.length}`);
  }
  return items;
}

function findOverride(row) {
  let item = manual.overrides.find(entry => key(entry.sourcePath) === key(row.source?.currentPath));
  if (!item) {
    item = {
      weaponName: row.weaponName,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      sourcePath: row.source.currentPath,
      sourceFilename: path.basename(row.source.currentPath),
      updates: {}, comparisons: {}, replaceComparisons: false,
      evidence: [], reviewStatus: null, mappingReviewStatus: null,
    };
    manual.overrides.push(item);
  }
  item.updates ||= {};
  item.evidence ||= [];
  return item;
}

function addEvidence(override, row, field, value, reason = null) {
  const exists = override.evidence.some(item => item.kind === 'direct-original-screenshot-field-disposition'
    && item.field === field && item.reviewDate === REVIEW_DATE);
  if (!exists) {
    override.evidence.push({
      kind: 'direct-original-screenshot-field-disposition',
      source: row.source.currentPath,
      field,
      value,
      reason,
      reviewDate: REVIEW_DATE,
      reviewArtifact: 'outputs/attachment-audit/field-slot-review/',
    });
  }
}

function recordForFinding(finding) {
  const rows = review.records.filter(row => key(row.source?.currentPath) === key(finding.sourcePath));
  if (rows.length !== 1) fail(`${finding.sourcePath}: expected one canonical record, found ${rows.length}`);
  return rows[0];
}

let correctionPlan;
if (priorSummary?.corrections?.length) {
  correctionPlan = priorSummary.corrections.map(item => ({ ...item, sourceFinding: null }));
} else {
  correctionPlan = FIX_GROUPS.flatMap(group => selectDiscovery(group).map(finding => ({
    weaponName: finding.weaponName,
    attachmentType: finding.attachmentType,
    attachmentName: finding.attachmentName,
    sourcePath: finding.sourcePath,
    field: group.field,
    before: finding.observed,
    after: group.value,
    reason: group.reason ?? null,
    sourceFinding: finding,
  })));
}
if (correctionPlan.length !== 79) fail(`expected 79 screenshot disposition corrections, found ${correctionPlan.length}`);

const corrections = [];
for (const item of correctionPlan) {
  const row = item.sourceFinding ? recordForFinding(item.sourceFinding) : recordForFinding(item);
  const before = row.stats?.[item.field];
  if (before === undefined) fail(`${item.sourcePath}: missing ${item.field}`);
  row.stats[item.field] = item.after;
  row.statFieldReasons ||= {};
  if (item.after === null) {
    row.statFieldReasons[item.field] = item.reason || COMPACT_NULL_REASON;
    delete row.statComparisons?.[item.field];
  } else {
    delete row.statFieldReasons[item.field];
  }
  const override = findOverride(row);
  override.updates[item.field] = item.after;
  addEvidence(override, row, item.field, item.after, item.reason);
  corrections.push({
    weaponName: row.weaponName,
    attachmentType: row.attachmentType,
    attachmentName: row.attachmentName,
    sourcePath: row.source.currentPath,
    field: item.field,
    before,
    after: item.after,
    reason: item.reason,
    result: before === item.after ? 'already-correct' : (item.after === null ? 'set-null-not-displayed' : 'corrected'),
  });
}

const legitimate = [];
for (const rule of LEGITIMATE_RULES) {
  const items = discovery.findings.filter(item => item.field === rule.field
    && (!rule.weapon || item.weaponName === rule.weapon)
    && item.attachmentType === rule.attachmentType);
  if (items.length !== rule.expectedCount) fail(`legitimate ${rule.field}: expected ${rule.expectedCount} findings, found ${items.length}`);
  for (const finding of items) {
    const row = recordForFinding(finding);
    if (row.stats?.[finding.field] !== finding.observed) fail(`${finding.sourcePath}: expected the direct-source value ${finding.observed} to remain unchanged`);
    legitimate.push({
      ...finding,
      status: 'screenshot-confirmed-legitimate-effect',
      modelSupport: rule.modelSupport,
    });
  }
}
if (legitimate.length !== 22) fail(`expected 22 legitimate effects, found ${legitimate.length}`);

const hasWrite = corrections.some(item => item.result !== 'already-correct');
if (hasWrite) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const backupDir = path.join(AUDIT_DIR, `backups/pre-field-slot-dispositions-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(REVIEW_PATH, path.join(backupDir, path.basename(REVIEW_PATH)));
  fs.copyFileSync(MANUAL_PATH, path.join(backupDir, path.basename(MANUAL_PATH)));
  if (fs.existsSync(SUMMARY_PATH)) fs.copyFileSync(SUMMARY_PATH, path.join(backupDir, path.basename(SUMMARY_PATH)));
}

fs.writeFileSync(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`);
fs.writeFileSync(MANUAL_PATH, `${JSON.stringify(manual, null, 2)}\n`);
fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify({
  kind: 'field-by-slot-screenshot-disposition',
  reviewedAt: REVIEW_DATE,
  sourcePolicy: 'Each correction is an original-screen reading. Modal values found candidates only and were never used as replacement values.',
  corrections,
  legitimateEffects: legitimate,
  counts: {
    screenshotCorrections: corrections.filter(item => item.result === 'corrected').length,
    compactPanelNulls: corrections.filter(item => item.result === 'set-null-not-displayed').length,
    alreadyCorrect: corrections.filter(item => item.result === 'already-correct').length,
    legitimateEffects: legitimate.length,
  },
}, null, 2)}\n`);

console.log(`Field-slot corrections saved: ${corrections.filter(item => item.result === 'corrected').length}`);
console.log(`Compact-panel nulls saved: ${corrections.filter(item => item.result === 'set-null-not-displayed').length}`);
console.log(`Screenshot-confirmed legitimate effects retained: ${legitimate.length}`);

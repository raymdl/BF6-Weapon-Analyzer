// Replaces the 12 SL9 compact Laser/Light captures with the user's 2026-07-31
// detailed-stat recaptures. The source paths and all values below were read
// directly from those screenshots; no modal value is used as a substitute.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve();
const AUDIT_DIR = path.join(ROOT, 'migration', '1.3.3.0', 'attachment-audit');
const REVIEW_PATH = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const MANUAL_PATH = path.join(AUDIT_DIR, 'manual-review-overrides.json');
const FIELD_SLOT_PATH = path.join(AUDIT_DIR, 'field-slot-dispositions-20260731.json');
const RECEIPT_PATH = path.join(AUDIT_DIR, 'sl9-detailed-recapture-20260731.json');
const SOURCE_DIR = path.join(ROOT, 'Weapon Attachments', 'Missing', 'SL9');
const TARGET_DIR = path.join(ROOT, 'Weapon Attachments', 'SMG', 'SL9');
const REVIEW_DATE = '2026-07-31';
const DETAIL_NOTE = 'Detailed-stat replacement screenshot manually reviewed on 2026-07-31; all displayed typed stats and comparison indicators were refreshed from the source image.';
const COMPACT_NOTE_FRAGMENT = 'Compact accessory-selector layout:';
const COMPACT_REASON_FRAGMENT = 'compact accessory-selector layout';

const COMMON_STATS = {
  damage: 26,
  rateOfFireRpm: 675,
  magazineSize: 30,
  precision: 61,
  control: 55,
  mobility: 68,
  fireModes: ['AUTO', 'SINGLE'],
  reloadTimeSeconds: 2.65,
  muzzleVelocityMps: 486,
  adsTimeMs: 167,
  headshotMultiplier: 1.4,
  longRangeDamage: 12,
  spotOnFire3dM: 54,
  spotOnFire2dM: 150,
  opponentHealthRegenDelaySeconds: 5,
  collateralMultiplier: 0,
  reloadInAds: true,
  adsMoveSpeedMultiplier: 0.75,
  sprintRecoveryMs: 167,
  recoilAmountDegrees: 0.5,
  recoilVariationDegrees: 13,
};

const up = field => ({ direction: 'up', effect: 'buff', color: 'green', source: 'direct-detailed-recapture-2026-07-31' });
const replacements = [
  ['18_SL9_Laser-Light_None.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.17.42 (Medium).png', 'None', 'None', 0, 47, {}],
  ['19_SL9_Laser-Light_Taclight_-_Aimed.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.19.45 (Medium).png', 'Taclight - Aimed', 'Light', 5, 47, {}],
  ['20_SL9_Laser-Light_Flashlight.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.20.78 (Medium).png', 'Flashlight', 'Light', 10, 51, { hipfire: up('hipfire') }],
  ['21_SL9_Laser-Light_Taclight_-_Hipfire.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.21.97 (Medium).png', 'Taclight - Hipfire', 'Light', 15, 51, { hipfire: up('hipfire') }],
  ['22_SL9_Laser-Light_5_MW_Red.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.23.20 (Medium).png', '5 MW Red', 'Red Laser', 10, 54, { hipfire: up('hipfire') }],
  ['23_SL9_Laser-Light_50_MW_Violet.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.33.16 (Medium).png', '50 MW Violet', 'Violet Laser', 10, 47, { mobility: up('mobility') }],
  ['24_SL9_Laser-Light_5_MW_Green.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.34.90 (Medium).png', '5 MW Green', 'Green Laser', 10, 62, { hipfire: up('hipfire') }],
  ['25_SL9_Laser-Light_50_MW_Green.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.36.22 (Medium).png', '50 MW Green', 'Green Laser', 20, 71, { hipfire: up('hipfire') }],
  ['26_SL9_Laser-Light_50_MW_Blue.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.37.60 (Medium).png', '50 MW Blue', 'Blue Laser', 20, 62, { hipfire: up('hipfire'), mobility: up('mobility') }],
  ['27_SL9_Laser-Light_120_MW_Blue.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.38.83 (Medium).png', '120 MW Blue', 'Blue Laser', 30, 71, { hipfire: up('hipfire'), mobility: up('mobility') }],
  ['28_SL9_Laser-Light_LASERLIGHT_COMBO_RED.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.41.94 (Medium).png', 'Laser/Light Combo Red', 'Red Laser', 20, 59, { hipfire: up('hipfire') }],
  ['29_SL9_Laser-Light_LaserLight_Combo_Green.png', 'Battlefield 6 Screenshot 2026.07.31 - 12.50.43.53 (Medium).png', 'Laser/Light Combo Green', 'Green Laser', 20, 68, { hipfire: up('hipfire') }],
].map(([targetFilename, rawFilename, attachmentName, attachmentSubtype, attachmentCost, hipfire, comparisons]) => ({
  targetFilename,
  rawFilename,
  attachmentName,
  attachmentSubtype,
  attachmentCost,
  stats: { ...COMMON_STATS, hipfire },
  comparisons,
}));

const key = value => path.resolve(value || '').toLowerCase();
const fail = message => { throw new Error(`SL9 detailed recapture: ${message}`); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temp, file);
};
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const captureTimestamp = filename => {
  const match = filename.match(/ - ([0-9.]+) \(Medium\)\.png$/);
  if (!match) fail(`could not parse capture time from ${filename}`);
  return match[1];
};
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

if (fs.existsSync(RECEIPT_PATH)) fail(`receipt already exists at ${RECEIPT_PATH}; use the paired verifier instead of reapplying`);
if (!fs.existsSync(REVIEW_PATH) || !fs.existsSync(MANUAL_PATH) || !fs.existsSync(FIELD_SLOT_PATH)) fail('one or more canonical audit JSON inputs are missing');
if (!fs.existsSync(SOURCE_DIR) || !fs.statSync(SOURCE_DIR).isDirectory()) fail(`missing source directory ${SOURCE_DIR}`);

const sourceNames = fs.readdirSync(SOURCE_DIR).sort();
const expectedSourceNames = replacements.map(item => item.rawFilename).sort();
if (!equal(sourceNames, expectedSourceNames)) fail(`source directory must contain exactly the 12 expected recaptures; found ${sourceNames.join(', ')}`);
if (new Set(replacements.map(item => item.targetFilename)).size !== replacements.length) fail('duplicate canonical target filename');
if (new Set(replacements.map(item => item.rawFilename)).size !== replacements.length) fail('duplicate detailed-source filename');

const review = readJson(REVIEW_PATH);
const manual = readJson(MANUAL_PATH);
const fieldSlots = readJson(FIELD_SLOT_PATH);
manual.overrides ||= [];

const prepared = replacements.map(item => {
  const targetPath = path.join(TARGET_DIR, item.targetFilename);
  const rawPath = path.join(SOURCE_DIR, item.rawFilename);
  if (!fs.existsSync(targetPath)) fail(`missing compact canonical screenshot ${targetPath}`);
  if (!fs.existsSync(rawPath)) fail(`missing detailed source screenshot ${rawPath}`);
  const rows = review.records.filter(row => key(row.source?.currentPath) === key(targetPath));
  if (rows.length !== 1) fail(`${item.targetFilename}: expected one canonical record, found ${rows.length}`);
  const row = rows[0];
  if (row.weaponName !== 'SL9' || row.attachmentType !== 'Laser/Light' || row.attachmentName !== item.attachmentName || row.attachmentSubtype !== item.attachmentSubtype) {
    fail(`${item.targetFilename}: record identity does not match the direct screenshot title`);
  }
  return {
    ...item,
    targetPath,
    rawPath,
    row,
    oldSource: { ...row.source },
    oldStats: { ...row.stats },
    oldComparisons: { ...(row.statComparisons || {}) },
    oldHash: sha256(targetPath),
    newHash: sha256(rawPath),
  };
});

const oldFieldSlots = fieldSlots.corrections.filter(item => item.weaponName === 'SL9'
  && item.attachmentType === 'Laser/Light'
  && ['longRangeDamage', 'spotOnFire2dM'].includes(item.field));
if (oldFieldSlots.length !== 24 || oldFieldSlots.some(item => item.after !== null)) fail('expected 24 historical compact-screen null dispositions to supersede');

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const backupDir = path.join(AUDIT_DIR, 'backups', `pre-sl9-detailed-recaptures-${stamp}`);
const imageBackupDir = path.join(backupDir, 'compact-screenshots');
fs.mkdirSync(imageBackupDir, { recursive: true });
for (const input of [REVIEW_PATH, MANUAL_PATH, FIELD_SLOT_PATH]) fs.copyFileSync(input, path.join(backupDir, path.basename(input)));

const moved = [];
try {
  for (const item of prepared) {
    item.backupPath = path.join(imageBackupDir, item.targetFilename);
    fs.renameSync(item.targetPath, item.backupPath);
    item.targetMoved = true;
    fs.renameSync(item.rawPath, item.targetPath);
    item.rawMoved = true;
    moved.push(item);
  }
} catch (error) {
  for (const item of [...prepared].reverse()) {
    try {
      if (item.rawMoved && fs.existsSync(item.targetPath)) fs.renameSync(item.targetPath, item.rawPath);
      if (item.targetMoved && fs.existsSync(item.backupPath)) fs.renameSync(item.backupPath, item.targetPath);
    } catch { /* preserve the original failure and leave the backup for recovery */ }
  }
  throw error;
}

const receiptRows = [];
for (const item of prepared) {
  const row = item.row;
  const before = {};
  for (const [field, value] of Object.entries(item.stats)) {
    before[field] = row.stats?.[field];
    row.stats[field] = Array.isArray(value) ? [...value] : value;
  }
  row.statFieldReasons ||= {};
  for (const field of Object.keys(item.stats)) delete row.statFieldReasons[field];
  row.statComparisons = item.comparisons;
  row.attachmentCost = item.attachmentCost;
  row.mappingReviewStatus = 'visually-checked';
  row.reviewDate = REVIEW_DATE;
  row.reviewer = 'direct-screenshot-recapture';
  row.notes = [...new Set([...((row.notes || []).filter(note => !note.includes(COMPACT_NOTE_FRAGMENT)
    && !note.startsWith('Attachment cost and typed stat fields require manual visual transcription')
    && !note.startsWith('Displayed stat panel was parsed with field-specific screen regions'))),
  DETAIL_NOTE])];
  row.source = {
    ...row.source,
    originalPath: item.rawPath,
    originalFilename: item.rawFilename,
    proposedFilename: item.targetFilename,
    currentPath: item.targetPath,
    renameApplied: true,
    captureTimestamp: captureTimestamp(item.rawFilename),
    resolution: '1365x768',
    rawAttachmentDescriptionOcr: null,
    rawFullScreenOcr: null,
  };

  let override = manual.overrides.find(entry => key(entry.sourcePath) === key(item.targetPath));
  if (!override) {
    override = {
      weaponName: row.weaponName,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      sourcePath: item.targetPath,
      sourceFilename: item.targetFilename,
      updates: {}, comparisons: {}, replaceComparisons: false,
      evidence: [], reviewStatus: null, mappingReviewStatus: null,
    };
    manual.overrides.push(override);
  }
  override.weaponName = 'SL9';
  override.attachmentType = 'Laser/Light';
  override.attachmentName = item.attachmentName;
  override.sourcePath = item.targetPath;
  override.sourceFilename = item.targetFilename;
  override.updates ||= {};
  Object.assign(override.updates, { attachmentCost: item.attachmentCost, ...item.stats });
  override.comparisons = item.comparisons;
  override.replaceComparisons = true;
  override.mappingReviewStatus = 'visually-checked';
  override.evidence = (override.evidence || []).filter(evidence => !(evidence.kind === 'direct-original-screenshot-field-disposition'
    && ['longRangeDamage', 'spotOnFire2dM'].includes(evidence.field)
    && String(evidence.reason || '').toLowerCase().includes(COMPACT_REASON_FRAGMENT)));
  override.evidence.push({
    kind: 'direct-detailed-stats-replacement-screenshot',
    source: item.rawPath,
    target: item.targetPath,
    fields: [...Object.keys(item.stats), 'attachmentCost', 'statComparisons'],
    reviewedAt: REVIEW_DATE,
    reviewArtifact: 'migration/1.3.3.0/attachment-audit/sl9-detailed-recapture-20260731.json',
    note: 'Accessory title, cost, all displayed typed stats, and visible comparison indicators were transcribed from the detailed recapture.',
  });

  receiptRows.push({
    weaponName: row.weaponName,
    attachmentType: row.attachmentType,
    attachmentName: row.attachmentName,
    attachmentSubtype: row.attachmentSubtype,
    attachmentCost: item.attachmentCost,
    sourcePathBeforeMove: item.rawPath,
    canonicalPath: item.targetPath,
    compactBackupPath: item.backupPath,
    compactSha256: item.oldHash,
    detailedSha256: item.newHash,
    previousStats: before,
    savedStats: item.stats,
    savedComparisons: item.comparisons,
  });
}

for (const item of oldFieldSlots) {
  const replacement = prepared.find(candidate => key(candidate.targetPath) === key(item.sourcePath));
  if (!replacement) fail(`no detailed replacement found for historical null disposition ${item.sourcePath}`);
  item.superseded = {
    reviewedAt: REVIEW_DATE,
    reason: 'The compact screenshot was replaced by a detailed-stat capture that displays this field.',
    receipt: 'migration/1.3.3.0/attachment-audit/sl9-detailed-recapture-20260731.json',
    currentValue: replacement.stats[item.field],
  };
}
fieldSlots.supersededCorrections = oldFieldSlots.map(item => ({
  sourcePath: item.sourcePath,
  field: item.field,
  historicValue: item.after,
  currentValue: item.superseded.currentValue,
  receipt: item.superseded.receipt,
  reason: item.superseded.reason,
}));
fieldSlots.currentState = {
  activeScreenshotCorrections: fieldSlots.corrections.filter(item => !item.superseded).length,
  supersededCompactPanelNulls: oldFieldSlots.length,
  note: 'The historic compact-panel null disposition remains in the receipt for provenance only; the SL9 current values are governed by the detailed-recapture receipt.',
};

review.generatedAt = new Date().toISOString();
manual.generatedAt = new Date().toISOString();
writeJson(REVIEW_PATH, review);
writeJson(MANUAL_PATH, manual);
writeJson(FIELD_SLOT_PATH, fieldSlots);

if (fs.readdirSync(SOURCE_DIR).length !== 0) fail(`source directory is not empty after replacement: ${SOURCE_DIR}`);
fs.rmdirSync(SOURCE_DIR);

writeJson(RECEIPT_PATH, {
  kind: 'direct-detailed-stats-screenshot-replacement',
  reviewedAt: REVIEW_DATE,
  sourcePolicy: 'The new detailed screenshots are authoritative for these 12 current records. Compact screenshots are retained in the named audit backup, and the deleted source directory was verified empty first.',
  sourceDirectory: SOURCE_DIR,
  sourceDirectoryRemovedAfterIngestion: true,
  backupDirectory: backupDir,
  records: receiptRows,
  counts: {
    screenshotsReplaced: prepared.length,
    displayedStatFieldsPerRecord: Object.keys(COMMON_STATS).length + 1,
    supersededCompactNulls: oldFieldSlots.length,
  },
});

console.log(`SL9 detailed screenshots replaced: ${prepared.length}`);
console.log(`Detailed displayed stats saved: ${prepared.length * (Object.keys(COMMON_STATS).length + 1)}`);
console.log(`Historical compact null dispositions superseded: ${oldFieldSlots.length}`);
console.log(`Removed empty source directory: ${SOURCE_DIR}`);

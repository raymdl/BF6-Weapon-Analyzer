import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve();
const AUDIT_DIR = path.join(ROOT, 'outputs', 'attachment-audit');
const receipt = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'sl9-detailed-recapture-20260731.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'attachment-screenshot-review.json'), 'utf8'));
const manual = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'manual-review-overrides.json'), 'utf8'));
const fieldSlots = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'field-slot-dispositions-20260731.json'), 'utf8'));
const key = value => path.resolve(value || '').toLowerCase();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fail = message => { throw new Error(`SL9 detailed recapture verification: ${message}`); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

if (receipt.kind !== 'direct-detailed-stats-screenshot-replacement' || receipt.records.length !== 12) fail('receipt does not describe exactly 12 detailed replacements');
if (fs.existsSync(receipt.sourceDirectory)) fail(`source directory should have been removed after becoming empty: ${receipt.sourceDirectory}`);
if (receipt.counts.supersededCompactNulls !== 24) fail('receipt did not supersede the 24 compact-only fields');

for (const item of receipt.records) {
  if (!fs.existsSync(item.canonicalPath)) fail(`missing detailed canonical screenshot ${item.canonicalPath}`);
  if (!fs.existsSync(item.compactBackupPath)) fail(`missing compact screenshot backup ${item.compactBackupPath}`);
  if (hash(item.canonicalPath) !== item.detailedSha256) fail(`detailed screenshot hash mismatch for ${item.canonicalPath}`);
  if (hash(item.compactBackupPath) !== item.compactSha256) fail(`compact backup hash mismatch for ${item.compactBackupPath}`);
  const records = review.records.filter(row => key(row.source?.currentPath) === key(item.canonicalPath));
  if (records.length !== 1) fail(`expected one review record for ${item.canonicalPath}, found ${records.length}`);
  const row = records[0];
  if (row.weaponName !== 'SL9' || row.attachmentType !== 'Laser/Light' || row.attachmentName !== item.attachmentName || row.attachmentSubtype !== item.attachmentSubtype) fail(`identity mismatch for ${item.canonicalPath}`);
  if (row.attachmentCost !== item.attachmentCost) fail(`cost mismatch for ${item.canonicalPath}`);
  for (const [field, value] of Object.entries(item.savedStats)) {
    if (!same(row.stats?.[field], value)) fail(`saved review value mismatch for ${item.canonicalPath} ${field}`);
    if (row.statFieldReasons?.[field]) fail(`stale field reason remains for ${item.canonicalPath} ${field}`);
  }
  if (!same(row.statComparisons || {}, item.savedComparisons)) fail(`comparison mismatch for ${item.canonicalPath}`);
  if (row.source.originalPath !== item.sourcePathBeforeMove || row.source.originalFilename !== path.basename(item.sourcePathBeforeMove)) fail(`new source provenance mismatch for ${item.canonicalPath}`);
  if (row.source.rawFullScreenOcr !== null || row.source.rawAttachmentDescriptionOcr !== null) fail(`stale compact OCR remains on ${item.canonicalPath}`);
  if (!row.notes?.some(note => note.includes('Detailed-stat replacement screenshot manually reviewed'))) fail(`missing detailed-review note for ${item.canonicalPath}`);
  const override = manual.overrides.find(entry => key(entry.sourcePath) === key(item.canonicalPath));
  if (!override || !override.replaceComparisons || override.mappingReviewStatus !== 'visually-checked') fail(`missing durable detailed override for ${item.canonicalPath}`);
  if (override.updates?.attachmentCost !== item.attachmentCost) fail(`override cost mismatch for ${item.canonicalPath}`);
  for (const [field, value] of Object.entries(item.savedStats)) {
    if (!same(override.updates?.[field], value)) fail(`override stat mismatch for ${item.canonicalPath} ${field}`);
  }
  if (!same(override.comparisons || {}, item.savedComparisons)) fail(`override comparison mismatch for ${item.canonicalPath}`);
  if ((override.evidence || []).some(e => e.kind === 'direct-original-screenshot-field-disposition' && ['longRangeDamage', 'spotOnFire2dM'].includes(e.field))) fail(`stale compact field evidence remains for ${item.canonicalPath}`);
  if (!(override.evidence || []).some(e => e.kind === 'direct-detailed-stats-replacement-screenshot' && e.source === item.sourcePathBeforeMove)) fail(`replacement evidence missing for ${item.canonicalPath}`);
}

const superseded = fieldSlots.corrections.filter(item => item.superseded);
if (superseded.length !== 24 || !Array.isArray(fieldSlots.supersededCorrections) || fieldSlots.supersededCorrections.length !== 24) fail('historical compact null dispositions were not all marked superseded');
for (const item of superseded) {
  if (item.after !== null || !['longRangeDamage', 'spotOnFire2dM'].includes(item.field)) fail(`invalid superseded historical disposition ${item.sourcePath}`);
  const row = review.records.find(record => key(record.source?.currentPath) === key(item.sourcePath));
  if (!row || !same(row.stats?.[item.field], item.superseded.currentValue) || row.statFieldReasons?.[item.field]) fail(`superseded current state mismatch for ${item.sourcePath} ${item.field}`);
}
console.log('SL9 detailed recapture verification passed (12 screenshot replacements, 264 displayed stat values, 24 compact nulls superseded, empty source folder removed).');

// Targeted post-write verification for apply-20260731-bulk-suspect-recaptures.mjs.
// It intentionally validates only the scoped review JSON, manual ledger and
// retained source evidence; workbook verification occurs once after final data work.

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'attachment-screenshot-review.json'), 'utf8'));
const manual = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'manual-review-overrides.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'bulk-suspect-recapture-summary-20260731.json'), 'utf8'));
const exclusions = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'deduped-source-record-exclusions-20260731.json'), 'utf8'));

const groups = [
  ['GRT-CPS', 'adsMoveSpeedMultiplier', 0.6, 52], ['LMR27', 'adsMoveSpeedMultiplier', 0.6, 51],
  ['M1014', 'adsMoveSpeedMultiplier', 0.6, 33], ['M87A1', 'adsMoveSpeedMultiplier', 0.6, 33],
  ['M39 EMR', 'sprintRecoveryMs', 200, 46], ['PSR', 'sprintRecoveryMs', 200, 31],
  ['SVDM', 'damage', 41, 13], ['SVDM', 'sprintRecoveryMs', 200, 48],
  ['SVK-8.6', 'damage', 66, 14], ['SVK-8.6', 'sprintRecoveryMs', 200, 2],
];
const key = value => path.resolve(value || '').toLowerCase();
const fail = message => { throw new Error(`bulk recapture verification: ${message}`); };

if (review.records.length !== 3177) fail(`expected 3,177 records after dedupe, found ${review.records.length}`);
if (review.records.some(row => row.weaponName === 'M1014' && /_duplicate-2\.png$/i.test(row.source?.currentPath || ''))) fail('a duplicate-2 M1014 record remains canonical');
if (exclusions.exclusions.length !== 29) fail(`expected 29 dedupe exclusions, found ${exclusions.exclusions.length}`);
for (const exclusion of exclusions.exclusions) {
  if (!fs.existsSync(exclusion.sourcePath)) fail(`duplicate source PNG was removed: ${exclusion.sourcePath}`);
  if (!fs.existsSync(exclusion.retainedSourcePath)) fail(`retained source PNG missing: ${exclusion.retainedSourcePath}`);
}

for (const [weapon, field, value, expected] of groups) {
  const targetPaths = summary.corrected
    .filter(item => item.weaponName === weapon && item.field === field)
    .map(item => key(item.sourcePath));
  if (targetPaths.length !== expected) fail(`${weapon} ${field}: summary has ${targetPaths.length} target paths, expected ${expected}`);
  const rows = review.records.filter(row => targetPaths.includes(key(row.source?.currentPath)));
  if (rows.length !== expected) fail(`${weapon} ${field}: expected ${expected} retained target records, found ${rows.length}`);
  for (const row of rows) {
    if (row.stats?.[field] !== value) fail(`${weapon} ${field}: saved value is ${row.stats?.[field]}, expected ${value} for ${row.source.currentPath}`);
    const override = manual.overrides.find(entry => key(entry.sourcePath) === key(row.source.currentPath));
    if (!override || override.updates?.[field] !== value) fail(`${weapon} ${field}: missing matching durable override for ${row.source.currentPath}`);
  }
}

const recoilNames = ['Classic Vertical', 'Low-Profile Stubby'];
for (const name of recoilNames) {
  const row = review.records.find(item => item.weaponName === 'M87A1' && item.attachmentName === name);
  if (!row || row.stats?.recoilAmountDegrees !== 2.7) fail(`M87A1 ${name}: expected screenshot-confirmed recoilAmountDegrees=2.7`);
}
if (summary.corrected.length !== 323 || summary.verifiedUnchanged.length !== 2) fail('summary does not contain all 323 corrections and 2 verified unchanged fields');
if (summary.counts.sourcePngsDeleted !== 0) fail('summary reports a source PNG deletion');

console.log('Bulk-suspect recapture verification passed.');
console.log(`records=${review.records.length}; corrected=${summary.corrected.length}; verifiedUnchanged=${summary.verifiedUnchanged.length}; deduped=${exclusions.exclusions.length}`);

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Weapon Analyzer/migration/1.3.3.0/attachment-audit');
const temp = path.join(root, 'idempotence-name-normalization-20260728');
const expected = JSON.parse(fs.readFileSync(path.join(temp, 'expected-review.json'), 'utf8'));
const rebuilt = JSON.parse(fs.readFileSync(path.join(temp, 'attachment-screenshot-review.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(root, 'attachment-name-normalization-summary-20260728.json'), 'utf8'));
const key = (value) => path.resolve(value).toLowerCase();
const expectedByPath = new Map(expected.records.map((row) => [key(row.source.currentPath), row]));
const rebuiltByPath = new Map(rebuilt.records.map((row) => [key(row.source.currentPath), row]));
const failures = [];

for (const change of summary.names) {
  const row = rebuiltByPath.get(key(change.sourcePath));
  if (!row) continue;
  if (row.attachmentName !== change.after) failures.push(`name reverted: ${change.sourcePath}`);
}
for (const change of summary.costs) {
  const row = rebuiltByPath.get(key(change.sourcePath));
  if (!row || row.attachmentCost !== change.after) failures.push(`cost reverted: ${change.sourcePath}`);
}
for (const change of summary.subtype) {
  const row = rebuiltByPath.get(key(change.sourcePath));
  if (!row || row.attachmentSubtype !== change.after) failures.push(`subtype reverted: ${change.sourcePath}`);
}
for (const change of summary.stats) {
  const row = rebuiltByPath.get(key(change.sourcePath));
  if (!row || row.stats?.[change.field] !== change.after) failures.push(`stat reverted: ${change.sourcePath}|${change.field}`);
}

const overlapping = [...rebuiltByPath.keys()].filter((item) => expectedByPath.has(item)).length;
const nameTargetsPresent = summary.names.filter((item) => rebuiltByPath.has(key(item.sourcePath))).length;
if (rebuilt.records.length !== 3155) failures.push(`expected known raw-input coverage of 3155, got ${rebuilt.records.length}`);
if (overlapping !== 3155) failures.push(`overlap mismatch: ${overlapping}`);
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, rebuiltRecords: rebuilt.records.length, canonicalRecords: expected.records.length, knownRawInputGap: expected.records.length - rebuilt.records.length, overlapping, nameTargetsPresent, nameTargetsPreserved: nameTargetsPresent, costTargetsPreserved: summary.costs.length, subtypeTargetsPreserved: summary.subtype.length, statTargetsPreserved: summary.stats.length }, null, 2));

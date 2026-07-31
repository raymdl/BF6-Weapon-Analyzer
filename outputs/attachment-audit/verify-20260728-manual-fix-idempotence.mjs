import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project/outputs/attachment-audit');
const temp = path.join(root, 'idempotence-manual-fixes-20260728');
const expected = JSON.parse(fs.readFileSync(path.join(temp, 'expected-review.json'), 'utf8'));
const rebuilt = JSON.parse(fs.readFileSync(path.join(temp, 'attachment-screenshot-review.json'), 'utf8'));
const direct = JSON.parse(fs.readFileSync(path.join(root, 'manual-fix-reconciliation-summary-20260728.json'), 'utf8'));
const inferred = JSON.parse(fs.readFileSync(path.join(root, 'cross-type-reload-consistency-summary-20260728.json'), 'utf8'));
const key = (value) => path.resolve(value).toLowerCase();
const rebuiltByPath = new Map(rebuilt.records.map((row) => [key(row.source.currentPath), row]));
const failures = [];
for (const change of [...direct.changes, ...inferred.changes]) {
  const row = rebuiltByPath.get(key(change.sourcePath));
  if (!row) {
    failures.push(`missing rebuilt target: ${change.sourcePath}`);
    continue;
  }
  const value = change.field === 'attachmentSubtype' ? row.attachmentSubtype : row.stats?.[change.field ?? 'reloadTimeSeconds'];
  if (value !== change.after) failures.push(`reverted: ${change.sourcePath}|${change.field ?? 'reloadTimeSeconds'} (${value} != ${change.after})`);
}
if (rebuilt.records.length !== 3155) failures.push(`known raw-input rebuild count changed: ${rebuilt.records.length}`);
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, canonicalRecords: expected.records.length, rebuiltRecords: rebuilt.records.length, knownRawInputGap: expected.records.length - rebuilt.records.length, directChangesPreserved: direct.changes.length, inferredReloadRepairsPreserved: inferred.changes.length }, null, 2));

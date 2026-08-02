import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
const key = (value) => path.resolve(value).toLowerCase();
const review = read('attachment-screenshot-review.json');
const manual = read('manual-review-overrides.json');
const coverage = read('coverage-report.json');
const captureOrder = read('capture-order.json');
const summary = read('attachment-name-normalization-summary-20260728.json');
const analysis = read('name-normalization-analysis-20260728.json');
const targets = new Map([
  ['16_DRS-IAR_Barrel_20_SDM-R.png', '20" SDM-R'],
  ['13_UMG-40_Barrel_Heavy.png', '200MM CUSTOM-H'],
  ['15_UMG-40_Barrel_Heavy_Ext.png', '305MM CUSTOM-H'],
]);
const rows = review.records.filter((row) => row.stats && targets.has(path.basename(row.source.currentPath)));
if (rows.length !== targets.size) throw new Error(`Expected ${targets.size} initialism targets, found ${rows.length}`);
for (const row of rows) {
  const expected = targets.get(path.basename(row.source.currentPath));
  row.attachmentName = expected;
  const override = manual.overrides.find((item) => item.sourcePath && key(item.sourcePath) === key(row.source.currentPath));
  if (!override) throw new Error(`Missing name override for ${row.source.currentPath}`);
  override.attachmentName = expected;
  override.updates.attachmentName = expected;
  const change = summary.names.find((item) => key(item.sourcePath) === key(row.source.currentPath));
  if (!change) throw new Error(`Missing normalization summary entry for ${row.source.currentPath}`);
  change.after = expected;
  const analyzed = analysis.changes.find((item) => key(item.sourcePath) === key(row.source.currentPath));
  if (!analyzed) throw new Error(`Missing analysis entry for ${row.source.currentPath}`);
  analyzed.after = expected;
}
const byPath = new Map(review.records.map((row) => [key(row.source.currentPath), row]));
for (const weapon of coverage.weapons ?? []) for (const item of weapon.records ?? []) {
  const row = byPath.get(key(item.sourcePath));
  if (row) item.name = row.attachmentName;
}
for (const entry of captureOrder.entries ?? []) {
  const row = byPath.get(key(path.join(entry.currentDirectory, entry.currentFilename)));
  if (row) entry.attachmentName = row.attachmentName;
}
const now = new Date().toISOString();
review.generatedAt = now;
manual.generatedAt = now;
coverage.generatedAt = now;
captureOrder.generatedAt = now;
summary.generatedAt = now;
write('attachment-screenshot-review.json', review);
write('manual-review-overrides.json', manual);
write('coverage-report.json', coverage);
write('capture-order.json', captureOrder);
write('attachment-name-normalization-summary-20260728.json', summary);
write('name-normalization-analysis-20260728.json', analysis);
console.log(JSON.stringify({ corrected: rows.map((row) => ({ weaponName: row.weaponName, attachmentName: row.attachmentName, sourcePath: row.source.currentPath })) }, null, 2));

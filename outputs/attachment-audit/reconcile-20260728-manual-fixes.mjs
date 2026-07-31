import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project/outputs/attachment-audit');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
const key = (value) => path.resolve(value).toLowerCase();
const before = read('attachment-screenshot-review.pre-manual-fix.json');
const review = read('attachment-screenshot-review.json');
const manual = read('manual-review-overrides.json');
const coverage = read('coverage-report.json');
const captureOrder = read('capture-order.json');
const beforeByPath = new Map(before.records.map((row) => [key(row.source.currentPath), row]));
const allowed = new Set(['attachmentSubtype', 'reloadTimeSeconds', 'magazineSize', 'muzzleVelocityMps']);
const changes = [];

for (const row of review.records) {
  const prior = beforeByPath.get(key(row.source.currentPath));
  if (!prior) continue;
  if (prior.attachmentSubtype !== row.attachmentSubtype) changes.push({ row, field: 'attachmentSubtype', before: prior.attachmentSubtype, after: row.attachmentSubtype });
  for (const field of ['reloadTimeSeconds', 'magazineSize', 'muzzleVelocityMps']) {
    if (prior.stats?.[field] !== row.stats?.[field]) changes.push({ row, field, before: prior.stats?.[field], after: row.stats?.[field] });
  }
  for (const field of ['attachmentType', 'attachmentCost', 'attachmentName', 'attachmentDescription']) {
    if (JSON.stringify(prior[field]) !== JSON.stringify(row[field])) throw new Error(`Unexpected manual-fix field change: ${row.source.currentPath}|${field}`);
  }
  for (const [field, value] of Object.entries(row.stats ?? {})) {
    if (!allowed.has(field) && JSON.stringify(prior.stats?.[field]) !== JSON.stringify(value)) throw new Error(`Unexpected manual-fix stat change: ${row.source.currentPath}|${field}`);
  }
}
const affectedRecords = new Set(changes.map((item) => key(item.row.source.currentPath))).size;
if (changes.length !== 50 || affectedRecords !== 46) throw new Error(`Expected 50 changes across 46 records, got ${changes.length} across ${affectedRecords}`);

function overrideFor(row) {
  let item = manual.overrides.find((entry) => entry.sourcePath && key(entry.sourcePath) === key(row.source.currentPath));
  if (!item) {
    item = { sourcePath: row.source.currentPath, sourceFilename: path.basename(row.source.currentPath), updates: {}, comparisons: {}, replaceComparisons: false, evidence: [] };
    manual.overrides.push(item);
  }
  item.weaponName = row.weaponName;
  item.attachmentType = row.attachmentType;
  item.attachmentName = row.attachmentName;
  item.sourcePath = row.source.currentPath;
  item.sourceFilename = path.basename(row.source.currentPath);
  item.updates ??= {};
  item.comparisons ??= {};
  item.evidence ??= [];
  return item;
}

for (const change of changes) {
  const item = overrideFor(change.row);
  item.updates[change.field] = change.after;
  const evidence = { kind: 'manual-json-fix-reconciled-from-ATTACHMENT_SCRAPE_MANUAL_FIXES.md', source: change.row.source.currentPath, reviewDate: '2026-07-28' };
  if (!item.evidence.some((entry) => JSON.stringify(entry) === JSON.stringify(evidence))) item.evidence.push(evidence);
  change.row.notes = [...new Set([...(change.row.notes ?? []), 'Manual screenshot correction was reconciled into the durable override ledger on 2026-07-28.'])];
}

const rowByPath = new Map(review.records.map((row) => [key(row.source.currentPath), row]));
for (const weapon of coverage.weapons ?? []) for (const item of weapon.records ?? []) {
  const row = rowByPath.get(key(item.sourcePath));
  if (row) item.subtype = row.attachmentSubtype;
}
for (const entry of captureOrder.entries ?? []) {
  const row = rowByPath.get(key(path.join(entry.currentDirectory, entry.currentFilename)));
  if (row) entry.attachmentSubtype = row.attachmentSubtype;
}

const now = new Date().toISOString();
const backupDir = path.join(root, 'backups', `pre-manual-fix-reconciliation-${now.replace(/[-:.TZ]/g, '')}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const name of ['attachment-screenshot-review.json', 'manual-review-overrides.json', 'coverage-report.json', 'capture-order.json']) fs.copyFileSync(path.join(root, name), path.join(backupDir, name));
review.generatedAt = now;
manual.generatedAt = now;
coverage.generatedAt = now;
captureOrder.generatedAt = now;
write('attachment-screenshot-review.json', review);
write('manual-review-overrides.json', manual);
write('coverage-report.json', coverage);
write('capture-order.json', captureOrder);
write('manual-fix-reconciliation-summary-20260728.json', { generatedAt: now, backupDir, fieldChanges: changes.length, affectedRecords, changes: changes.map(({ row, field, before: oldValue, after }) => ({ weaponName: row.weaponName, attachmentName: row.attachmentName, sourcePath: row.source.currentPath, field, before: oldValue, after })) });
console.log(JSON.stringify({ backupDir, fieldChanges: changes.length, affectedRecords }, null, 2));

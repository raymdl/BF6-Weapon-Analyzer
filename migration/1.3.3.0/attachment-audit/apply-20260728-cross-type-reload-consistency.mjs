import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
const review = read('attachment-screenshot-review.json');
const manual = read('manual-review-overrides.json');
const details = review.records.filter((row) => row.stats);
const key = (value) => path.resolve(value).toLowerCase();
const unaffectedTypes = new Set(['Muzzle', 'Grip', 'Laser', 'Light', 'Laser/Light', 'Grip/Laser/Light', 'Barrel', 'Ammo']);
const mode = (values) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
const changes = [];

for (const weaponName of [...new Set(details.map((row) => row.weaponName))]) {
  const rows = details.filter((row) => row.weaponName === weaponName && unaffectedTypes.has(row.attachmentType));
  const baseline = mode(rows.map((row) => row.stats.reloadTimeSeconds));
  for (const row of rows.filter((item) => item.stats.reloadTimeSeconds !== baseline)) changes.push({ row, before: row.stats.reloadTimeSeconds, after: baseline });
}
if (changes.length !== 29) throw new Error(`Expected 29 cross-type reload repairs, found ${changes.length}`);

for (const change of changes) {
  change.row.stats.reloadTimeSeconds = change.after;
  let override = manual.overrides.find((item) => item.sourcePath && key(item.sourcePath) === key(change.row.source.currentPath));
  if (!override) {
    override = { sourcePath: change.row.source.currentPath, sourceFilename: path.basename(change.row.source.currentPath), updates: {}, comparisons: {}, replaceComparisons: false, evidence: [] };
    manual.overrides.push(override);
  }
  override.weaponName = change.row.weaponName;
  override.attachmentType = change.row.attachmentType;
  override.attachmentName = change.row.attachmentName;
  override.sourcePath = change.row.source.currentPath;
  override.sourceFilename = path.basename(change.row.source.currentPath);
  override.updates ??= {};
  override.evidence ??= [];
  override.updates.reloadTimeSeconds = change.after;
  const evidence = { kind: 'same-weapon-unaffected-attachment-reload-inference', source: change.row.source.currentPath, inferredFromModalReloadSeconds: change.after, reviewDate: '2026-07-28' };
  if (!override.evidence.some((item) => JSON.stringify(item) === JSON.stringify(evidence))) override.evidence.push(evidence);
  change.row.notes = [...new Set([...(change.row.notes ?? []), 'Reload was reconciled to the same-weapon modal value for an attachment type that does not alter reload on 2026-07-28.'])];
}

const now = new Date().toISOString();
const backupDir = path.join(root, 'backups', `pre-cross-type-reload-consistency-${now.replace(/[-:.TZ]/g, '')}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const name of ['attachment-screenshot-review.json', 'manual-review-overrides.json']) fs.copyFileSync(path.join(root, name), path.join(backupDir, name));
review.generatedAt = now;
manual.generatedAt = now;
write('attachment-screenshot-review.json', review);
write('manual-review-overrides.json', manual);
write('cross-type-reload-consistency-summary-20260728.json', { generatedAt: now, backupDir, correctedRecords: changes.length, evidenceClass: 'same-weapon-inference', changes: changes.map(({ row, before, after }) => ({ weaponName: row.weaponName, attachmentType: row.attachmentType, attachmentName: row.attachmentName, sourcePath: row.source.currentPath, before, after })) });
console.log(JSON.stringify({ backupDir, correctedRecords: changes.length }, null, 2));

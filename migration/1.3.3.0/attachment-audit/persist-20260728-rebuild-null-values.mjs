import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Weapon Analyzer/migration/1.3.3.0/attachment-audit');
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'attachment-screenshot-review.json'), 'utf8'));
const rebuilt = JSON.parse(fs.readFileSync(path.join(root, 'idempotence-null-fire-20260728', 'attachment-screenshot-review.json'), 'utf8'));
const manualPath = path.join(root, 'manual-review-overrides.json');
const manual = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
const key = (value) => path.resolve(value).toLowerCase();
const canonicalByPath = new Map(canonical.records.filter((row) => row.stats).map((row) => [key(row.source.currentPath), row]));
let persisted = 0;

function manualFor(row) {
  let override = manual.overrides.find((item) => item.sourcePath && key(item.sourcePath) === key(row.source.currentPath));
  if (!override) {
    override = { weaponName: row.weaponName, attachmentType: row.attachmentType, attachmentName: row.attachmentName, sourcePath: row.source.currentPath, sourceFilename: path.basename(row.source.currentPath), updates: {}, comparisons: {}, replaceComparisons: false, evidence: [] };
    manual.overrides.push(override);
  }
  override.updates ??= {};
  override.comparisons ??= {};
  override.evidence ??= [];
  return override;
}

for (const row of rebuilt.records.filter((item) => item.stats)) {
  const canonicalRow = canonicalByPath.get(key(row.source.currentPath));
  if (!canonicalRow) continue;
  for (const [field, value] of Object.entries(row.stats)) {
    if (value !== null && value !== undefined) continue;
    const canonicalValue = canonicalRow.stats[field];
    if (canonicalValue === null || canonicalValue === undefined) throw new Error(`Canonical value also null: ${row.source.currentPath}|${field}`);
    const override = manualFor(canonicalRow);
    override.updates[field] = canonicalValue;
    if (canonicalRow.statComparisons?.[field]) override.comparisons[field] = canonicalRow.statComparisons[field];
    const evidence = { kind: 'canonical-non-null-rebuild-persistence', source: canonicalRow.source.currentPath, reviewDate: '2026-07-28' };
    if (!override.evidence.some((item) => JSON.stringify(item) === JSON.stringify(evidence))) override.evidence.push(evidence);
    persisted++;
  }
}

manual.generatedAt = new Date().toISOString();
fs.writeFileSync(manualPath, `${JSON.stringify(manual, null, 2)}\n`);
console.log(JSON.stringify({ persisted }, null, 2));

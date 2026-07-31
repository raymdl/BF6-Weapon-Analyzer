import fs from 'node:fs';
const root = 'C:/Users/royal/Documents/BF6 Project';
const audit = `${root}/outputs/attachment-audit`;
const review = JSON.parse(fs.readFileSync(`${audit}/attachment-screenshot-review.json`, 'utf8'));
const doc = JSON.parse(fs.readFileSync(`${audit}/manual-review-overrides.json`, 'utf8'));
const records = review.records.filter(r => r.source.originalPath.includes('\\Carbine\\'));
for (const override of doc.overrides ?? []) {
  if (!String(override.sourcePath).includes('\\Carbine\\')) continue;
  const oldName = String(override.sourceFilename ?? override.sourcePath).split('\\').pop();
  const prefix = oldName.match(/^(\d+)_/)?.[1];
  const record = records.find(r => r.weaponName === override.weaponName && prefix && String(r.source.currentPath).split('\\').pop().startsWith(`${prefix}_`));
  if (!record) throw new Error(`Could not reconcile override ${override.sourcePath}`);
  override.sourcePath = record.source.currentPath;
  override.sourceFilename = String(record.source.currentPath).split('\\').pop();
  for (const evidence of override.evidence ?? []) if (evidence.source) evidence.source = record.source.currentPath;
}
fs.writeFileSync(`${audit}/manual-review-overrides.json`, `${JSON.stringify(doc, null, 2)}\n`);
console.log('reconciled Carbine manual-review override paths to current canonical files');

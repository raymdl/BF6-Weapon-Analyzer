import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('migration/1.3.3.0/attachment-audit');
const folder = path.resolve('Weapon Attachments/LMG/RPK-74M');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
const specs = new Map([
  [35, { name:'45Rnd Magazine', size:45, reload:2.784 }],
  [36, { name:'45Rnd Fast Mag', size:45, reload:2.464 }],
  [37, { name:'30Rnd Magazine', size:30, reload:2.784 }],
  [38, { name:'30Rnd Fast Mag', size:30, reload:2.464 }],
  [39, { name:'36Rnd Magazine', size:36, reload:2.784 }],
  [40, { name:'50Rnd Magazine', size:50, reload:2.784, filename:'40_RPK-74M_Magazine_50Rnd_Magazine.png' }],
  [41, { name:'60Rnd Magazine', size:60, reload:2.784, filename:'41_RPK-74M_Magazine_60Rnd_Magazine.png' }],
  [42, { name:'95Rnd Drum', size:95, reload:2.950, filename:'42_RPK-74M_Magazine_95Rnd_Drum.png' }],
]);
const oldToNew = new Map([
  [path.join(folder,'40_RPK-74M_Magazine_36Rnd_Magazine_duplicate-2.png').toLowerCase(), path.join(folder,specs.get(40).filename)],
  [path.join(folder,'41_RPK-74M_Magazine_36Rnd_Magazine_duplicate-3.png').toLowerCase(), path.join(folder,specs.get(41).filename)],
  [path.join(folder,'42_RPK-74M_Magazine_36Rnd_Magazine_duplicate-4.png').toLowerCase(), path.join(folder,specs.get(42).filename)],
]);
const mappedPath = value => oldToNew.get(path.resolve(value).toLowerCase()) ?? path.resolve(value);

const review = read('attachment-screenshot-review.json');
const changed = [];
for (const row of review.records.filter(item => item.weaponName === 'RPK-74M' && item.attachmentType === 'Magazine')) {
  const spec = specs.get(row.source.captureOrder);
  if (!spec) continue;
  const before = { name:row.attachmentName, size:row.stats.magazineSize, reload:row.stats.reloadTimeSeconds, path:row.source.currentPath };
  row.attachmentName = spec.name;
  row.stats.magazineSize = spec.size;
  row.stats.reloadTimeSeconds = spec.reload;
  row.source.currentPath = mappedPath(row.source.currentPath);
  row.source.proposedFilename = path.basename(row.source.currentPath);
  row.notes = [...new Set([...(row.notes ?? []), 'RPK-74M magazine identity, capacity, and reload time were visually reconciled against the source screenshot on 2026-07-28.'])];
  changed.push({ captureOrder:row.source.captureOrder, before, after:{ name:spec.name, size:spec.size, reload:spec.reload, path:row.source.currentPath } });
}
if (changed.length !== 8) throw new Error(`Expected 8 RPK-74M magazine rows, changed ${changed.length}`);
review.generatedAt = new Date().toISOString();
write('attachment-screenshot-review.json', review);

const manual = read('manual-review-overrides.json');
for (const row of review.records.filter(item => item.weaponName === 'RPK-74M' && item.attachmentType === 'Magazine')) {
  const spec = specs.get(row.source.captureOrder);
  if (!spec) continue;
  let override = manual.overrides.find(item => item.sourcePath && mappedPath(item.sourcePath).toLowerCase() === path.resolve(row.source.currentPath).toLowerCase());
  if (!override) {
    override = { weaponName:row.weaponName, attachmentType:row.attachmentType, attachmentName:row.attachmentName, sourcePath:row.source.currentPath, sourceFilename:path.basename(row.source.currentPath), updates:{}, evidence:[] };
    manual.overrides.push(override);
  }
  override.sourcePath = row.source.currentPath;
  override.sourceFilename = path.basename(row.source.currentPath);
  override.attachmentName = row.attachmentName;
  override.updates = { ...(override.updates ?? {}), attachmentName:row.attachmentName, magazineSize:spec.size, reloadTimeSeconds:spec.reload };
  override.evidence = [...new Map([...(override.evidence ?? []), {kind:'visually-confirmed-rpk74m-magazine',reviewDate:'2026-07-28'}].map(item=>[JSON.stringify(item),item])).values()];
  override.mappingReviewStatus = 'visually-checked';
}
manual.generatedAt = new Date().toISOString();
write('manual-review-overrides.json', manual);

for (const name of ['raw-ocr.json','panel-ocr.json','value-ocr.json','cost-ocr.json','recoil-ocr.json','recoil-value-ocr.json','stat-comparisons.json','field-ocr.json','highlight-cards.json']) {
  const file = path.join(root,name); if (!fs.existsSync(file)) continue;
  const rows = read(name); let touched=0;
  for (const row of rows) if (row.sourcePath) {
    const next=mappedPath(row.sourcePath); if (next!==path.resolve(row.sourcePath)) {row.sourcePath=next;if('sourceName'in row)row.sourceName=path.basename(next);touched++;}
  }
  write(name,rows); console.log(`${name}: ${touched} paths reconciled`);
}
for (const name of ['rename-manifest.json','rename-provenance.json']) {
  const doc=read(name); const rows=Array.isArray(doc)?doc:doc.entries??[];
  for(const row of rows) for(const key of ['sourcePath','targetPath','currentPath']) if(row[key]) row[key]=mappedPath(row[key]);
  for(const row of rows){if(row.sourceFilename&&oldToNew.has(path.join(folder,row.sourceFilename).toLowerCase()))row.sourceFilename=path.basename(oldToNew.get(path.join(folder,row.sourceFilename).toLowerCase()));if(row.targetFilename&&oldToNew.has(path.join(folder,row.targetFilename).toLowerCase()))row.targetFilename=path.basename(oldToNew.get(path.join(folder,row.targetFilename).toLowerCase()));}
  write(name,doc);
}
console.log(JSON.stringify(changed,null,2));

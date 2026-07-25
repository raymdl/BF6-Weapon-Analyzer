import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT ?? 'outputs/attachment-audit');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'rename-manifest.json'), 'utf8'));
const moves = new Map(manifest.entries.filter(entry => entry.renameAllowed).map(entry => [
  path.resolve(entry.sourcePath).toLowerCase(),
  path.resolve(entry.targetPath),
]));
const provenanceFile = path.join(root, 'rename-provenance.json');
if (fs.existsSync(provenanceFile)) {
  const provenance = JSON.parse(fs.readFileSync(provenanceFile, 'utf8'));
  let changed = 0;
  for (const record of provenance) {
    const target = moves.get(path.resolve(record.currentPath).toLowerCase());
    if (!target) continue;
    record.currentPath = target;
    changed++;
  }
  fs.writeFileSync(provenanceFile, `${JSON.stringify(provenance, null, 2)}\n`);
  console.log(`rename-provenance.json: reconciled ${changed} path records`);
}
const files = [
  'raw-ocr.json', 'panel-ocr.json', 'value-ocr.json', 'cost-ocr.json',
  'highlight-cards.json', 'recoil-visual-map.json', 'visual-stat-map.json',
  'field-ocr.json', 'stat-comparisons.json', 'stat-comparisons-all-ar.json',
  'manual-review-overrides.json',
];
for (const name of files) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) continue;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const records = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.overrides) ? parsed.overrides : null);
  if (!records) continue;
  let changed = 0;
  for (const record of records) {
    if (!record.sourcePath) continue;
    const target = moves.get(path.resolve(record.sourcePath).toLowerCase());
    if (!target) continue;
    record.sourcePath = target;
    if ('sourceName' in record) record.sourceName = path.basename(target);
    changed++;
  }
  const missing = records.filter(record => record.sourcePath && !fs.existsSync(record.sourcePath));
  if (missing.length) throw new Error(`${name}: ${missing.length} reconciled source paths do not exist`);
  fs.writeFileSync(file, `${JSON.stringify(Array.isArray(parsed) ? records : { ...parsed, overrides: records }, null, 2)}\n`);
  console.log(`${name}: reconciled ${changed} path records`);
}

const captureOrderFile = path.join(root, 'capture-order.json');
if (fs.existsSync(captureOrderFile)) {
  const document = JSON.parse(fs.readFileSync(captureOrderFile, 'utf8'));
  let changed = 0;
  for (const entry of document.entries ?? []) {
    const currentPath = path.join(entry.currentDirectory, entry.currentFilename);
    const target = moves.get(path.resolve(currentPath).toLowerCase());
    if (!target) continue;
    entry.currentDirectory = path.dirname(target);
    entry.currentFilename = path.basename(target);
    entry.proposedFilename = path.basename(target);
    changed++;
  }
  fs.writeFileSync(captureOrderFile, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`capture-order.json: reconciled ${changed} path records`);
}

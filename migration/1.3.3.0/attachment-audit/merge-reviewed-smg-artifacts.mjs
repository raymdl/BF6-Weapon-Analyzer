import fs from 'node:fs';
import path from 'node:path';

const globalRoot = 'migration/1.3.3.0/attachment-audit';
const classRoot = 'migration/1.3.3.0/attachment-audit-smg';
const isSmgPath = value => /[\\/]Weapon Attachments[\\/]SMG[\\/]/i.test(String(value ?? ''));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

for (const name of ['raw-ocr.json', 'panel-ocr.json', 'value-ocr.json', 'cost-ocr.json', 'highlight-cards.json', 'stat-comparisons.json']) {
  const globalFile = path.join(globalRoot, name);
  const classFile = path.join(classRoot, name);
  if (!fs.existsSync(classFile)) continue;
  const globalRows = fs.existsSync(globalFile) ? read(globalFile) : [];
  const classRows = read(classFile);
  const merged = [...globalRows.filter(row => !isSmgPath(row.sourcePath)), ...classRows];
  write(globalFile, merged);
  console.log(`${name}: ${globalRows.length} -> ${merged.length}`);
}

{
  const name = 'manual-review-overrides.json';
  const globalFile = path.join(globalRoot, name);
  const classFile = path.join(classRoot, name);
  const globalDoc = fs.existsSync(globalFile) ? read(globalFile) : {overrides: []};
  const classDoc = read(classFile);
  const overrides = [...(globalDoc.overrides ?? []).filter(row => !isSmgPath(row.sourcePath)), ...(classDoc.overrides ?? [])];
  write(globalFile, {...globalDoc, overrides});
  console.log(`${name}: ${globalDoc.overrides?.length ?? 0} -> ${overrides.length}`);
}

{
  const name = 'capture-order.json';
  const globalFile = path.join(globalRoot, name);
  const classFile = path.join(classRoot, name);
  const globalDoc = fs.existsSync(globalFile) ? read(globalFile) : {entries: []};
  const classDoc = read(classFile);
  const entries = [...(globalDoc.entries ?? []).filter(row => !isSmgPath(path.join(row.currentDirectory ?? '', row.currentFilename ?? '')) && !isSmgPath(row.originalPath)), ...(classDoc.entries ?? [])];
  write(globalFile, {...globalDoc, generatedAt: new Date().toISOString(), recordCount: entries.length, entries});
  console.log(`${name}: ${globalDoc.entries?.length ?? 0} -> ${entries.length}`);
}

{
  const name = 'rename-provenance.json';
  const globalFile = path.join(globalRoot, name);
  const classFile = path.join(classRoot, name);
  const globalRows = fs.existsSync(globalFile) ? read(globalFile) : [];
  const classRows = read(classFile);
  const merged = [...globalRows.filter(row => !isSmgPath(row.currentPath) && !isSmgPath(row.originalPath)), ...classRows];
  write(globalFile, merged);
  console.log(`${name}: ${globalRows.length} -> ${merged.length}`);
}

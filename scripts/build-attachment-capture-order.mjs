import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const auditRoot = path.join(root, 'outputs', 'attachment-audit');
const historicalPath = path.join(auditRoot, 'attachment-screenshot-review.pre-20260723-stat-parser.json');
const currentPath = path.join(auditRoot, 'attachment-screenshot-review.pre-order-prefix.json');
const outputPath = path.join(auditRoot, 'capture-order.json');

const historical = JSON.parse(fs.readFileSync(historicalPath, 'utf8')).records;
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8')).records;
const textKey = record => `${record.weaponName}|${record.source?.rawFullScreenOcr ?? ''}`.toLowerCase();
const basename = value => value ? path.basename(value) : null;
const currentByText = new Map();
for (const record of current) {
  const key = textKey(record);
  if (!currentByText.has(key)) currentByText.set(key, []);
  currentByText.get(key).push(record);
}

const used = new Set();
const entries = [];
for (const weaponName of [...new Set(historical.map(record => record.weaponName))]) {
  const weaponHistory = historical.filter(record => record.weaponName === weaponName);
  let detailOrder = 0;
  for (const historicalRecord of weaponHistory) {
    const legacyIdentityOrder = ['M433', 'PP-19'].includes(weaponName);
    const candidates = legacyIdentityOrder
      ? current.filter(record => record.weaponName === weaponName && !used.has(record))
      : (currentByText.get(textKey(historicalRecord)) ?? []).filter(record => !used.has(record));
    let currentRecord = candidates.find(record =>
      basename(record.source?.currentPath)?.toLowerCase() === basename(historicalRecord.source?.currentPath)?.toLowerCase()
    ) ?? candidates.find(record =>
      record.attachmentType === historicalRecord.attachmentType
      && record.attachmentName?.toLowerCase() === historicalRecord.attachmentName?.toLowerCase()
    ) ?? candidates.find(record =>
      record.attachmentType === historicalRecord.attachmentType
      && record.attachmentSubtype?.toLowerCase() === historicalRecord.attachmentSubtype?.toLowerCase()
    ) ?? candidates[0];
    if (!currentRecord) throw new Error(`Could not reconcile capture order for ${weaponName}: ${historicalRecord.source?.currentPath}`);
    used.add(currentRecord);
    const captureOrder = historicalRecord.attachmentType === 'Overview' ? 0 : ++detailOrder;
    const originalFilename = /^Battlefield 6 Screenshot /i.test(historicalRecord.source?.originalFilename ?? '')
      ? historicalRecord.source.originalFilename
      : currentRecord.source?.originalFilename;
    const originalPath = /^Battlefield 6 Screenshot /i.test(historicalRecord.source?.originalFilename ?? '')
      ? historicalRecord.source.originalPath
      : currentRecord.source?.originalPath;
    const canonicalCurrentFilename = basename(currentRecord.source?.currentPath);
    const canonicalLightNone = /_Light_None(?:_duplicate-\d+)?\.png$/i.test(canonicalCurrentFilename ?? '');
    entries.push({
      weaponName,
      captureOrder,
      attachmentType: canonicalLightNone && currentRecord.attachmentType === 'Unknown' ? 'Light' : currentRecord.attachmentType,
      attachmentName: canonicalLightNone && currentRecord.attachmentName === 'Unknown' ? 'None' : currentRecord.attachmentName,
      attachmentSubtype: canonicalLightNone && currentRecord.attachmentSubtype === 'Unknown' ? 'None' : currentRecord.attachmentSubtype,
      currentFilename: canonicalCurrentFilename,
      currentDirectory: path.dirname(currentRecord.source?.currentPath),
      proposedFilename: currentRecord.source?.proposedFilename ?? basename(currentRecord.source?.currentPath),
      originalFilename,
      originalPath,
      captureTimestamp: historicalRecord.source?.captureTimestamp ?? currentRecord.source?.captureTimestamp ?? null,
    });
  }
}

if (used.size !== current.length || entries.length !== current.length) {
  throw new Error(`Capture-order reconciliation mismatch: matched ${used.size}/${current.length}, emitted ${entries.length}`);
}
for (const weaponName of [...new Set(entries.map(entry => entry.weaponName))]) {
  const weaponEntries = entries.filter(entry => entry.weaponName === weaponName);
  const overviewCount = weaponEntries.filter(entry => entry.captureOrder === 0).length;
  const detailOrders = weaponEntries.filter(entry => entry.captureOrder > 0).map(entry => entry.captureOrder).sort((a, b) => a - b);
  if (overviewCount !== 1) throw new Error(`${weaponName}: expected one overview, found ${overviewCount}`);
  if (detailOrders.some((value, index) => value !== index + 1)) throw new Error(`${weaponName}: detail capture order is not contiguous`);
}

const document = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: path.basename(historicalPath),
  rule: 'Overview is 0; detail screenshots follow original capture/UI order starting at 1.',
  recordCount: entries.length,
  entries,
};
fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`Wrote ${entries.length} capture-order entries to ${outputPath}`);

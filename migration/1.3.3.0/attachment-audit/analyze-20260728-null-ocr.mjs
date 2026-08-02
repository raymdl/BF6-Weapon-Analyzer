import fs from 'node:fs';
import path from 'node:path';

const review = JSON.parse(fs.readFileSync(new URL('./attachment-screenshot-review.json', import.meta.url), 'utf8'));
const ocr = JSON.parse(fs.readFileSync(new URL('./field-ocr-null-refresh-20260728.json', import.meta.url), 'utf8'));
const byPath = new Map(review.records.map((row) => [path.resolve(row.source?.currentPath ?? '').toLowerCase(), row]));

function texts(item) {
  return [...new Set(Object.values(item.passes).map((pass) => pass.text.trim()).filter(Boolean))];
}

const unresolved = [];
const conflicting = [];
const resolved = [];
for (const item of ocr) {
  const row = byPath.get(path.resolve(item.sourcePath).toLowerCase());
  const values = texts(item);
  if (!values.length) unresolved.push({ weapon: item.weapon, file: item.sourceName, name: row?.attachmentName, field: item.field, comparison: row?.statComparisons?.[item.field] ?? null });
  else if (values.length > 1) conflicting.push({ weapon: item.weapon, file: item.sourceName, name: row?.attachmentName, field: item.field, values, comparison: row?.statComparisons?.[item.field] ?? null });
  else resolved.push({ weapon: item.weapon, file: item.sourceName, name: row?.attachmentName, field: item.field, text: values[0], comparison: row?.statComparisons?.[item.field] ?? null });
}

const group = (items) => Object.fromEntries([...new Set(items.map((item) => item.field))].sort().map((field) => [field, items.filter((item) => item.field === field)]));
const normalTexts = Object.fromEntries([...new Set(ocr.map((item) => item.field))].sort().map((field) => [field, [...new Set(ocr.filter((item) => item.field === field).map((item) => item.passes.normal.text.trim()).filter(Boolean))].sort()]));
const reloadRows = Object.fromEntries([...new Set(ocr.filter((item) => item.field === 'reloadTimeSeconds').map((item) => item.passes.normal.text))].map((value) => [value, ocr.filter((item) => item.field === 'reloadTimeSeconds' && item.passes.normal.text === value).slice(0, 4).map((item) => ({ weapon:item.weapon,file:item.sourceName,threshold:item.passes.threshold.text,inverted:item.passes.inverted.text }))]));
console.log(JSON.stringify({ counts: { total: ocr.length, resolved: resolved.length, conflicting: conflicting.length, unresolved: unresolved.length }, normalTexts, reloadRows, unresolvedByFieldCounts: Object.fromEntries(Object.entries(group(unresolved)).map(([field, items]) => [field, items.length])) }, null, 2));

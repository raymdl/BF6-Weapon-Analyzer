import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbookPath = process.env.BF6_ATTACHMENT_WORKBOOK_PATH;
const outputDir = process.env.BF6_ATTACHMENT_INSPECTION_DIR;
if (!workbookPath || !outputDir) throw new Error('BF6_ATTACHMENT_WORKBOOK_PATH and BF6_ATTACHMENT_INSPECTION_DIR are required');
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const checks = [
  ['AK-205', 'A41:X63'],
  ['L115', 'A28:O38'],
  ['LMR27', 'A15:O20'],
  ['LMR27', 'A43:O58'],
  ['M44', 'A4:P8'],
  ['Mini Scout', 'A31:O39'],
  ['RPKM', 'A44:I50'],
  ['Read Me', 'A1:B19'],
];
await fs.mkdir(outputDir, { recursive: true });
for (const [sheetName, range] of checks) {
  const inspected = await workbook.inspect({ kind: 'table', sheetId: sheetName, range, include: 'values,formulas', tableMaxRows: 30, tableMaxCols: 24, maxChars: 6000 });
  console.log(inspected.ndjson);
  const rendered = await workbook.render({ sheetName, range, scale: 1.2, format: 'png' });
  const safe = `${sheetName}-${range}`.replace(/[^A-Za-z0-9-]/g, '_');
  await fs.writeFile(path.join(outputDir, `${safe}.png`), new Uint8Array(await rendered.arrayBuffer()));
}
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A', options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan' });
console.log(errors.ndjson);

import fs from 'node:fs';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbookPath = 'C:/Users/royal/Documents/BF6 Weapon Analyzer/BF6_Attachment_Stats_Review.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sidearms = ['ES 5.7', 'GGH-22', 'M357 Trait', 'M44', 'M45A1', 'P18', 'VZ. 61'];
const results = [];
for (const weapon of sidearms) {
  const sheet = workbook.worksheets.getItem(weapon);
  const used = sheet.getUsedRange();
  const values = sheet.getRangeByIndexes(4, 0, Math.max(0, used.rowCount - 4), used.columnCount).values;
  const arrowCells = values.flat().filter(value => typeof value === 'string' && /^[↑↓]/.test(value)).length;
  results.push({ weapon, rows: values.length, arrowCells });
}
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A', options: { useRegex: true, maxResults: 100 }, summary: 'Read-only stale workbook formula scan' });
console.log(JSON.stringify({ workbookPath, lastWriteTime: fs.statSync(workbookPath).mtime.toISOString(), sidearms: results, arrowCells: results.reduce((sum, item) => sum + item.arrowCells, 0), formulaErrors: /matched 0 entries/i.test(errors.ndjson) ? 0 : 'present' }, null, 2));

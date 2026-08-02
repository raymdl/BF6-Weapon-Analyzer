import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbookPath = process.env.BF6_ATTACHMENT_WORKBOOK_PATH ?? 'C:/Users/royal/Documents/BF6 Project/BF6_Attachment_Stats_Review.xlsx';
const reviewPath = 'C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit/attachment-screenshot-review.json';
const review = JSON.parse(await fs.readFile(reviewPath, 'utf8'));
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const detail = review.records.filter(record => record.stats);
const weaponClass = record => record.source.currentPath.match(/[\\/]Weapon Attachments[\\/]([^\\/]+)[\\/]/i)?.[1] ?? 'Unknown';
const classOrder = ['Assault Rifle', 'Carbine', 'DMR', 'LMG', 'Shotgun', 'Sidearm', 'Sniper Rifle', 'SMG', 'Unknown'];
const classByWeapon = new Map(detail.map(record => [record.weaponName, weaponClass(record)]));
const expectedWeapons = [...new Set(detail.map(record => record.weaponName))].sort((a,b) => classOrder.indexOf(classByWeapon.get(a)) - classOrder.indexOf(classByWeapon.get(b)) || a.localeCompare(b));
const actualSheets = workbook.worksheets.items.map(sheet => sheet.name);
const expectedSheets = [...expectedWeapons, 'Source Index', 'Read Me'];
if (JSON.stringify(actualSheets) !== JSON.stringify(expectedSheets)) throw new Error(`Sheet order mismatch\nExpected: ${expectedSheets.join(', ')}\nActual: ${actualSheets.join(', ')}`);

let arrowCells = 0;
for (const weapon of expectedWeapons) {
  const sheet = workbook.worksheets.getItem(weapon);
  const used = sheet.getUsedRange();
  const headers = sheet.getRangeByIndexes(3,0,1,used.columnCount).values[0].map(value => String(value ?? ''));
  const pathIndex = headers.indexOf('Current Screenshot Path');
  const reloadIndex = headers.indexOf('Reload in ADS');
  if (pathIndex < 0 || reloadIndex < 0) throw new Error(`${weapon}: missing required workbook columns`);
  const rowCount = detail.filter(record => record.weaponName === weapon).length;
  const values = sheet.getRangeByIndexes(4,0,rowCount,used.columnCount).values;
  const actualPaths = values.map(row => String(row[pathIndex] ?? ''));
  const expectedPaths = detail.filter(record => record.weaponName === weapon).sort((a,b) => a.source.captureOrder - b.source.captureOrder).map(record => record.source.currentPath);
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) throw new Error(`${weapon}: rows do not follow the reviewed capture/UI order`);
  const reloadValues = values.map(row => row[reloadIndex]).filter(value => value != null && value !== '');
  if (reloadValues.some(value => value !== 'Yes' && value !== 'No')) throw new Error(`${weapon}: Reload in ADS contains a value other than Yes/No`);
  arrowCells += values.flat().filter(value => typeof value === 'string' && /^[↑↓]/.test(value)).length;
}
const expectedArrows = detail.reduce((sum,record) => sum + Object.keys(record.statComparisons ?? {}).filter(field => record.stats[field] != null).length,0);
if (arrowCells !== expectedArrows) throw new Error(`Comparison arrow count mismatch ${arrowCells}/${expectedArrows}`);

const errors = await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',options:{useRegex:true,maxResults:300},summary:'formula error scan'});
if (!/matched 0 entries/i.test(errors.ndjson)) throw new Error(`Formula error scan failed: ${errors.ndjson}`);

const zip = await JSZip.loadAsync(await fs.readFile(workbookPath));
const workbookXml = await zip.file('xl/workbook.xml').async('string');
const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1],match[2]]));
const targets = new Map([...relsXml.matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)].map(match => {const a=attrs(match[0]);return[a.Id,a.Target];}));
const colors = {'Assault Rifle':'FF1D4ED8',Carbine:'FF0F766E',DMR:'FFCA8A04',LMG:'FFEA580C',Shotgun:'FFDC2626',Sidearm:'FF0891B2','Sniper Rifle':'FF0284C7',SMG:'FF7C3AED'};
for (const match of workbookXml.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) {
  const a=attrs(match[0]);
  if (!expectedWeapons.includes(a.name)) continue;
  const target=targets.get(a['r:id']);
  const xml=await zip.file(`xl/${target.replace(/^\//,'').replace(/^xl\//,'')}`).async('string');
  const expectedColor=colors[classByWeapon.get(a.name)];
  if (!new RegExp(`<(?:\\w+:)?tabColor\\b[^>]*rgb="${expectedColor}"`).test(xml)) throw new Error(`${a.name}: tab color mismatch`);
  if (!/<(?:\w+:)?pane\b[^>]*xSplit="3"[^>]*ySplit="4"[^>]*topLeftCell="D5"[^>]*state="frozen"/.test(xml)) throw new Error(`${a.name}: D5 freeze pane missing`);
  for (const ref of [...xml.matchAll(/<mergeCell\b[^>]*ref="([^"]+)"/g)].map(item=>item[1])) {
    if (ref.split(':').some(cell => Number(cell.match(/(\d+)$/)?.[1]) <= 2)) throw new Error(`${a.name}: rows 1 or 2 contain merged cells (${ref})`);
  }
}

console.log(JSON.stringify({workbookPath,sheets:actualSheets.length,weaponSheets:expectedWeapons.length,detailRows:detail.length,comparisonArrows:arrowCells,formulaErrors:0,sheetOrder:'pass',numericCaptureOrder:'pass',reloadInAdsYesNo:'pass',classTabColors:'pass',rows1And2Unmerged:'pass'},null,2));

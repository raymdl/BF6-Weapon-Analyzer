import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const root = path.resolve('migration/1.3.3.0/attachment-audit');
const review = JSON.parse(await fs.readFile(path.join(root, 'attachment-screenshot-review.json'), 'utf8'));
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.resolve('BF6_Attachment_Stats_Review.xlsx')));
const outputDir = path.join(root, 'previews-reload-corrections');
await fs.mkdir(outputDir, { recursive: true });
for (const weapon of ['SL9', 'M433', 'SOR-556 MK2', 'PP-19', 'SGX', 'RPK-74M']) {
  const rows = review.records.filter(row => row.weaponName === weapon && row.stats).sort((a, b) => a.source.captureOrder - b.source.captureOrder);
  const targets = rows.map((row, index) => ({ row, excelRow: index + 5 })).filter(item =>
    (weapon === 'SL9' && item.row.attachmentType === 'Ergonomics') ||
    (weapon === 'M433' && ['20Rnd Fast Mag', '30Rnd Fast Mag', '40Rnd Fast Mag'].includes(item.row.attachmentName)) ||
    (weapon === 'SOR-556 MK2' && ['20Rnd Fast Mag', '40Rnd Fast Mag', '45Rnd Fast Mag'].includes(item.row.attachmentName)) ||
    (weapon === 'PP-19' && item.row.attachmentName === '20Rnd Fast Mag') ||
    (weapon === 'SGX' && item.row.attachmentName === '36Rnd Fast Mag'));
  if (weapon === 'RPK-74M') targets.splice(0, targets.length, ...rows.map((row, index) => ({ row, excelRow:index + 5 })).filter(item => item.row.attachmentType === 'Magazine'));
  const first = Math.min(...targets.map(item => item.excelRow));
  const last = Math.max(...targets.map(item => item.excelRow));
  const preview = await workbook.render({ sheetName: weapon, range: `A${Math.max(4, first - 1)}:N${last + 1}`, scale: 1.5, format: 'png' });
  await fs.writeFile(path.join(outputDir, `${weapon.replace(/[^A-Za-z0-9-]/g, '_')}.png`), new Uint8Array(await preview.arrayBuffer()));
  console.log(`${weapon}: rows ${targets.map(item => item.excelRow).join(', ')}`);
}

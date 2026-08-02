import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbookPath = 'C:/Users/royal/Documents/BF6 Project/outputs/019f94db-3ac2-7831-bd8a-32275bf0343c/BF6_Attachment_Stats_Review.xlsx';
const outDir = 'C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit/affected-workbook-previews';
await fs.mkdir(outDir, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
for (const [name, range] of [['AK-205-laser-and-linear', 'A9:AJ63'], ['BROD-3-corrected-costs', 'A45:AJ66'], ['M277-corrected-costs', 'A36:AJ61'], ['M4A1-corrected-costs', 'A48:AJ69']]) {
  const blob = await workbook.render({ sheetName: name.startsWith('AK') ? 'AK-205' : name.startsWith('BROD') ? 'BROD 3' : name.startsWith('M277') ? 'M277' : 'M4A1', range, scale: 1, format: 'png' });
  await fs.writeFile(path.join(outDir, `${name}.png`), new Uint8Array(await blob.arrayBuffer()));
}
console.log('rendered affected workbook ranges');

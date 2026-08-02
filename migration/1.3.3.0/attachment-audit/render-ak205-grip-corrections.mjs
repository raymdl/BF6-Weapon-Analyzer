import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const root='C:/Users/royal/Documents/BF6 Project';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(`${root}/BF6_Attachment_Stats_Review.xlsx`));
const preview=await wb.render({sheetName:'AK-205',range:'A21:Z36',scale:1.2,format:'png'});
await fs.writeFile(`${root}/migration/1.3.3.0/attachment-audit/ak205-grip-corrected-workbook.png`,new Uint8Array(await preview.arrayBuffer()));

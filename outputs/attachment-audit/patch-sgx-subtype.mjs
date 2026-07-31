import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbookPath = 'C:/Users/royal/Documents/BF6 Project/outputs/attachment-audit/BF6_Attachment_Stats_Review.xlsx';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheet = workbook.worksheets.getItem('SGX');
sheet.getRange('C36').values = [['Magazine']];
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);

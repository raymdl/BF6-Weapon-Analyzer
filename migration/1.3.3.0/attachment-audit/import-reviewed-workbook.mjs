import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const root = path.resolve('../..');
const inputPath = path.resolve(process.argv[2] ?? path.join(root, 'outputs', '019f8197-45e9-7b52-a9a9-e82ab06be8d3', 'BF6_Attachment_Stats_Review.subtype-names.formatted.xlsx'));
const outputPath = path.resolve(process.argv[3] ?? path.join(root, 'migration', '1.3.3.0', 'attachment-audit', 'manual-review-overrides.json'));
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));

const reviewFills = new Map([
  ['FFFF00', 'human-filled-ocr-gap'],
  ['FFC000', 'human-corrected'],
]);
const headerToField = new Map([
  ['Attachment Type', 'attachmentType'],
  ['Attachment Name', 'attachmentName'],
  ['Attachment Subtype', 'attachmentSubtype'],
  ['Attachment Cost', 'attachmentCost'],
  ['Attachment Description', 'attachmentDescription'],
  ['Damage', 'damage'],
  ['Rate of Fire (RPM)', 'rateOfFireRpm'],
  ['Magazine Size', 'magazineSize'],
  ['Hipfire', 'hipfire'],
  ['Precision', 'precision'],
  ['Control', 'control'],
  ['Mobility', 'mobility'],
  ['Fire Modes', 'fireModes'],
  ['Reload Time (seconds)', 'reloadTimeSeconds'],
  ['Muzzle Velocity (m/s)', 'muzzleVelocityMps'],
  ['ADS Time (ms)', 'adsTimeMs'],
  ['Headshot Multiplier', 'headshotMultiplier'],
  ['Long Range Damage', 'longRangeDamage'],
  ['3D Spot-on-fire Range (m)', 'spotOnFire3dM'],
  ['2D Spot-on-fire Range (m)', 'spotOnFire2dM'],
  ['Opponent Health Regen Delay (seconds)', 'opponentHealthRegenDelaySeconds'],
  ['Collateral Multiplier', 'collateralMultiplier'],
  ['Reload in ADS', 'reloadInAds'],
  ['ADS Move Speed Multiplier', 'adsMoveSpeedMultiplier'],
  ['Sprint Recovery (ms)', 'sprintRecoveryMs'],
  ['Recoil Amount (degrees)', 'recoilAmountDegrees'],
  ['Recoil Variation (degrees)', 'recoilVariationDegrees'],
]);
const metadataFields = new Set(['attachmentType', 'attachmentName', 'attachmentSubtype', 'attachmentCost', 'attachmentDescription']);
const statTextFields = new Set(['fireModes']);
const boolFields = new Set(['reloadInAds']);

function columnIndex(address) {
  const letters = address.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) throw new Error(`Invalid cell address: ${address}`);
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function rowIndex(address) {
  const value = Number(address.match(/[0-9]+$/)?.[0]);
  if (!Number.isInteger(value)) throw new Error(`Invalid cell address: ${address}`);
  return value - 1;
}

function parseComparison(value, fontColor) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^([↑↓])\s*(.+)$/u);
  if (!match) return null;
  const effect = fontColor === 'FF0000' ? 'penalty' : fontColor === 'theme:6' ? 'buff' : null;
  if (!effect) throw new Error(`Arrow-marked value has unsupported font color ${fontColor ?? 'null'}: ${value}`);
  return { direction: match[1] === '↑' ? 'up' : 'down', effect, displayText: value.trim() };
}

function typedValue(field, rawValue, comparison) {
  const value = comparison ? comparison.displayText.replace(/^[↑↓]\s*/u, '') : rawValue;
  if (boolFields.has(field)) {
    if (typeof value === 'boolean') return value;
    if (/^(?:yes|true|☑)$/iu.test(String(value).trim())) return true;
    if (/^(?:no|false|☐)$/iu.test(String(value).trim())) return false;
    if (value === null || value === '') return null;
    throw new Error(`Unsupported boolean value for ${field}: ${value}`);
  }
  if (statTextFields.has(field)) {
    if (value === null || value === '') return null;
    return String(value).split(/\s*\/\s*/).map(item => item.trim()).filter(Boolean);
  }
  if (metadataFields.has(field)) return value;
  if (value === null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(number)) throw new Error(`Unsupported numeric value for ${field}: ${value}`);
  return number;
}

const overrides = [];
for (const sheet of workbook.worksheets.items) {
  if (['Source Index', 'Read Me'].includes(sheet.name)) continue;
  const used = sheet.getUsedRange();
  if (!used || used.rowCount < 5) continue;
  const headers = sheet.getRange('A4:AJ4').values[0];
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const currentPathIndex = headerIndex.get('Current Screenshot Path');
  const typeIndex = headerIndex.get('Attachment Type');
  const nameIndex = headerIndex.get('Attachment Name');
  if ([currentPathIndex, typeIndex, nameIndex].some(index => index === undefined)) continue;

  const colored = [];
  for (let firstRow = 1; firstRow <= used.rowCount; firstRow += 8) {
    const lastRow = Math.min(used.rowCount, firstRow + 7);
    const styles = await workbook.inspect({
      kind: 'computedStyle', sheetId: sheet.name, range: `A${firstRow}:AJ${lastRow}`, maxChars: 350000,
    });
    for (const line of styles.ndjson.split(/\r?\n/).filter(Boolean)) {
      const record = JSON.parse(line);
      const fill = record.style?.fill?.color?.value;
      if (!reviewFills.has(fill)) continue;
      colored.push({
        cell: record.for,
        fill,
        fontColor: record.style?.font?.fill?.color?.value ?? null,
        bold: Boolean(record.style?.font?.bold),
      });
    }
  }

  const byRow = new Map();
  for (const cell of colored) {
    const row = rowIndex(cell.cell);
    if (row < 4) continue;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(cell);
  }

  for (const [row, cells] of byRow) {
    const values = sheet.getRangeByIndexes(row, 0, 1, headers.length).values[0];
    const sourcePath = values[currentPathIndex];
    if (!sourcePath) throw new Error(`${sheet.name} row ${row + 1}: reviewed cells have no Current Screenshot Path`);
    const override = {
      weaponName: sheet.name,
      attachmentType: values[typeIndex],
      attachmentName: values[nameIndex],
      sourcePath: path.resolve(String(sourcePath)),
      sourceFilename: path.basename(String(sourcePath)),
      updates: {},
      comparisons: {},
      evidence: [],
      reviewStatus: null,
      mappingReviewStatus: null,
    };
    for (const cell of cells) {
      const col = columnIndex(cell.cell);
      const header = headers[col];
      const rawValue = values[col];
      const field = headerToField.get(header);
      if (field) {
        const comparison = parseComparison(rawValue, cell.fontColor);
        override.updates[field] = typedValue(field, rawValue, comparison);
        if (comparison) override.comparisons[field] = comparison;
      } else if (header === 'Review Status') {
        override.reviewStatus = /^reviewed$/i.test(String(rawValue)) ? 'reviewed' : String(rawValue);
      } else if (header === 'Mapping Review Status') {
        override.mappingReviewStatus = /^reviewed$/i.test(String(rawValue)) ? 'visually-checked' : String(rawValue);
      } else {
        throw new Error(`${sheet.name} ${cell.cell}: highlighted cell in unsupported column ${header}`);
      }
      override.evidence.push({
        cell: `${sheet.name}!${cell.cell}`,
        kind: reviewFills.get(cell.fill),
        value: rawValue,
        fontColor: cell.fontColor,
        bold: cell.bold,
      });
    }
    overrides.push(override);
  }
}

const document = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceWorkbook: inputPath,
  legend: {
    yellow: 'Human-filled value that OCR did not capture.',
    orange: 'Human correction to an extracted value.',
    arrow: 'Displayed comparison direction; stored separately from the typed value.',
    red: 'Penalty compared with the currently equipped baseline.',
    green: 'Buff compared with the currently equipped baseline.',
  },
  overrideCount: overrides.length,
  overrides,
};
await fs.writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`Imported ${overrides.length} reviewed screenshot rows to ${outputPath}`);

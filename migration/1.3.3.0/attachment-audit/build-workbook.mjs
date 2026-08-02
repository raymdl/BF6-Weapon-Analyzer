import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
import JSZip from 'jszip';

const root = 'C:\\Users\\royal\\Documents\\BF6 Project';
const jsonPath = process.env.BF6_ATTACHMENT_JSON_PATH ?? path.join(root, 'migration', '1.3.3.0', 'attachment-audit', 'attachment-screenshot-review.json');
const outDir = process.env.BF6_ATTACHMENT_OUTPUT_DIR ?? path.join(root, 'migration', '1.3.3.0', 'attachment-audit');
const outPath = path.join(outDir, process.env.BF6_ATTACHMENT_WORKBOOK_NAME ?? 'BF6_Attachment_Stats_Review.xlsx');
const templatePath = process.env.BF6_ATTACHMENT_TEMPLATE ?? path.join(root, 'BF6_Attachment_Stats_Review.xlsx');
const doc = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
const byCaptureOrder = (a, b) => (a.source?.captureOrder ?? Number.MAX_SAFE_INTEGER) - (b.source?.captureOrder ?? Number.MAX_SAFE_INTEGER);
const detail = doc.records.filter(record => record.stats).sort((a, b) => a.weaponName.localeCompare(b.weaponName) || byCaptureOrder(a, b));
const weaponClass = record => record.source?.currentPath?.match(/[\\/]Weapon Attachments[\\/]([^\\/]+)[\\/]/i)?.[1] ?? 'Unknown';
const classOrder = ['Assault Rifle', 'Carbine', 'SMG', 'LMG', 'DMR', 'Sniper Rifle', 'Shotgun', 'Sidearm', 'Unknown'];
const classRank = value => {
  const index = classOrder.indexOf(value);
  return index === -1 ? classOrder.length : index;
};
const classByWeapon = new Map(detail.map(record => [record.weaponName, weaponClass(record)]));
const weapons = [...new Set(detail.map(record => record.weaponName))].sort((a, b) =>
  classRank(classByWeapon.get(a)) - classRank(classByWeapon.get(b)) || a.localeCompare(b)
);
const classColors = {
  'Assault Rifle': { dark:'#172554', primary:'#1D4ED8', light:'#DBEAFE', text:'#1E3A8A' },
  Carbine: { dark:'#134E4A', primary:'#0F766E', light:'#CCFBF1', text:'#115E59' },
  DMR: { dark:'#713F12', primary:'#CA8A04', light:'#FEF9C3', text:'#854D0E' },
  LMG: { dark:'#7C2D12', primary:'#EA580C', light:'#FFEDD5', text:'#9A3412' },
  Shotgun: { dark:'#7F1D1D', primary:'#DC2626', light:'#FEE2E2', text:'#991B1B' },
  Sidearm: { dark:'#164E63', primary:'#0891B2', light:'#CFFAFE', text:'#155E75' },
  'Sniper Rifle': { dark:'#0C4A6E', primary:'#0284C7', light:'#E0F2FE', text:'#075985' },
  SMG: { dark:'#4C1D95', primary:'#7C3AED', light:'#EDE9FE', text:'#5B21B6' },
  Unknown: { dark:'#1F2937', primary:'#4B5563', light:'#E5E7EB', text:'#374151' },
};
const paletteFor = value => classColors[value] ?? classColors.Unknown;
const reloadInAdsText = value => value === true ? 'Yes' : value === false ? 'No' : null;
const fields = [
  ['Attachment Subtype', r => r.attachmentSubtype], ['Attachment Cost', r => r.attachmentCost], ['Attachment Description', r => r.attachmentDescription],
  ['Damage', r => r.stats.damage], ['Rate of Fire (RPM)', r => r.stats.rateOfFireRpm], ['Magazine Size', r => r.stats.magazineSize],
  ['Hipfire', r => r.stats.hipfire], ['Precision', r => r.stats.precision], ['Control', r => r.stats.control], ['Mobility', r => r.stats.mobility],
  ['Fire Modes', r => Array.isArray(r.stats.fireModes) ? r.stats.fireModes.join(' / ') : null], ['Reload Time (seconds)', r => r.stats.reloadTimeSeconds],
  ['Muzzle Velocity (m/s)', r => r.stats.muzzleVelocityMps], ['ADS Time (ms)', r => r.stats.adsTimeMs], ['Headshot Multiplier', r => r.stats.headshotMultiplier],
  ['Long Range Damage', r => r.stats.longRangeDamage], ['3D Spot-on-fire Range (m)', r => r.stats.spotOnFire3dM], ['2D Spot-on-fire Range (m)', r => r.stats.spotOnFire2dM],
  ['Opponent Health Regen Delay (seconds)', r => r.stats.opponentHealthRegenDelaySeconds], ['Collateral Multiplier', r => r.stats.collateralMultiplier],
  ['Reload in ADS', r => reloadInAdsText(r.stats.reloadInAds)], ['ADS Move Speed Multiplier', r => r.stats.adsMoveSpeedMultiplier],
  ['Sprint Recovery (ms)', r => r.stats.sprintRecoveryMs], ['Recoil Amount (degrees)', r => r.stats.recoilAmountDegrees], ['Recoil Variation (degrees)', r => r.stats.recoilVariationDegrees],
  ['Current Screenshot Filename', r => r.source.currentPath ? String(r.source.currentPath).split(/[\\/]/).pop() : null],
];
const typeColors = { Muzzle:'#DBEAFE', Barrel:'#DCFCE7', Grip:'#FEF3C7', Magazine:'#FCE7F3', Ammo:'#F3E8FF', Ergonomics:'#E0E7FF', Light:'#FEF9C3', Laser:'#CCFBF1', 'Laser/Light':'#D9F99D', 'Grip/Laser/Light':'#FDE68A', Sight:'#E5E7EB' };
const stripeFill = '#E2E2E2';
const columnWidths = [11.375,15.125,11.625,10.75,37.375,8,10.25,9.375,6.875,9.25,7.5,7.75,14,9.625,7.75,9.5,9.375,8,10.125,10.125,15.125,9.375,9.25,10.125,9.375,9.5,8.88,39.375];
const comparisonColumns = { damage:5, rateOfFireRpm:6, magazineSize:7, hipfire:8, precision:9, control:10, mobility:11, reloadTimeSeconds:13, muzzleVelocityMps:14, adsTimeMs:15, headshotMultiplier:16, longRangeDamage:17, spotOnFire3dM:18, spotOnFire2dM:19, opponentHealthRegenDelaySeconds:20, collateralMultiplier:21, adsMoveSpeedMultiplier:23, sprintRecoveryMs:24, recoilAmountDegrees:25, recoilVariationDegrees:26 };
const comparisonDisplay = (record, key, value) => {
  const comparison = record.statComparisons?.[key];
  if (!comparison || value === null || value === undefined) return value;
  return `${comparison.direction === 'up' ? '↑' : '↓'}${value}`;
};
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(templatePath));
const staging = wb.worksheets.add('__Build__');
for (const sheet of [...wb.worksheets.items]) if (sheet.name !== '__Build__' && sheet.name !== 'Overview') sheet.delete();
const overview = wb.worksheets.getItem('Overview');
const overviewUsed = overview.getUsedRange();
const overviewTypeOrder = ['Muzzle', 'Barrel', 'Light', 'Laser/Light', 'Grip/Laser/Light', 'Grip', 'Magazine', 'Laser', 'Ammo', 'Ergonomics'];
const overviewFieldFor = attachmentType => attachmentType === 'Barrel' || attachmentType === 'Ammo' ? 'Attachment Subtype' : 'Attachment Name';
const overviewValueFor = record => {
  const value = overviewFieldFor(record.attachmentType) === 'Attachment Subtype' ? record.attachmentSubtype : record.attachmentName;
  return value === null || value === undefined ? '' : String(value);
};
const existingOverviewValues = overviewUsed.rowCount > 2
  ? overview.getRangeByIndexes(2, 0, overviewUsed.rowCount - 2, 3).values
  : [];
const existingOptionOrder = new Map(overviewTypeOrder.map(type => [type, []]));
for (const row of existingOverviewValues) {
  const attachmentType = String(row[0] ?? '');
  const optionValue = String(row[2] ?? '');
  if (!existingOptionOrder.has(attachmentType) || !optionValue) continue;
  const values = existingOptionOrder.get(attachmentType);
  if (!values.includes(optionValue)) values.push(optionValue);
}
const currentOptionValues = new Map(overviewTypeOrder.map(type => [type, new Set()]));
const firstSeenOptionOrder = new Map(overviewTypeOrder.map(type => [type, []]));
for (const record of detail) {
  if (!currentOptionValues.has(record.attachmentType)) continue;
  const optionValue = overviewValueFor(record);
  if (!optionValue || currentOptionValues.get(record.attachmentType).has(optionValue)) continue;
  currentOptionValues.get(record.attachmentType).add(optionValue);
  firstSeenOptionOrder.get(record.attachmentType).push(optionValue);
}
const overviewOptions = overviewTypeOrder.flatMap(attachmentType => {
  const currentValues = currentOptionValues.get(attachmentType);
  const retained = existingOptionOrder.get(attachmentType).filter(value => currentValues.has(value));
  const retainedSet = new Set(retained);
  const newValues = firstSeenOptionOrder.get(attachmentType).filter(value => !retainedSet.has(value));
  return [...retained, ...newValues].map(optionValue => ({ attachmentType, field: overviewFieldFor(attachmentType), optionValue }));
});
const weaponRowsByName = new Map();
const recordRowByOption = new Map();
for (const weapon of weapons) {
  const rows = detail.filter(record => record.weaponName === weapon);
  weaponRowsByName.set(weapon, rows);
  rows.forEach((record, index) => {
    const optionKey = [weapon, record.attachmentType, overviewValueFor(record)].join('\u0000');
    if (!recordRowByOption.has(optionKey)) recordRowByOption.set(optionKey, index + 5);
  });
}
const overviewCols = 3 + weapons.length;
const overviewValues = [
  Array(overviewCols).fill(null),
  ['Attachment Type', 'Field', 'Attachment Name / Subtype', ...weapons],
  ...overviewOptions.map(option => [option.attachmentType, option.field, option.optionValue, ...Array(weapons.length).fill(null)]),
];
overviewValues[0][0] = 'Attachment Options';
let clearRows = Math.max(1000, overviewUsed.rowCount, overviewValues.length);
let clearCols = Math.max(overviewUsed.columnCount, overviewCols);
overview.getRangeByIndexes(0, 0, clearRows, clearCols).clear({ applyTo: 'contents' });
overview.getRangeByIndexes(0, 0, overviewValues.length, overviewCols).values = overviewValues;
const escapeSheetName = value => String(value).replace(/'/g, "''");
for (let optionIndex = 0; optionIndex < overviewOptions.length; optionIndex++) {
  const option = overviewOptions[optionIndex];
  const rowIndex = optionIndex + 2;
  for (let weaponIndex = 0; weaponIndex < weapons.length; weaponIndex++) {
    const weapon = weapons[weaponIndex];
    const optionKey = [weapon, option.attachmentType, option.optionValue].join('\u0000');
    const targetRow = recordRowByOption.get(optionKey);
    const cell = overview.getCell(rowIndex, weaponIndex + 3);
    if (targetRow) cell.formulas = [[`=HYPERLINK("#'${escapeSheetName(weapon)}'!B${targetRow}","Link")`]];
    else cell.values = [['—']];
  }
}
const overviewRowCount = overviewValues.length;
overview.getRangeByIndexes(0, 0, 1, overviewCols).format.wrapText = false;
overview.getRangeByIndexes(1, 0, 1, overviewCols).format.wrapText = true;
overview.getRangeByIndexes(0, 0, overviewRowCount, 1).format.columnWidth = 21;
overview.getRangeByIndexes(0, 1, overviewRowCount, 1).format.columnWidth = 15.25;
overview.getRangeByIndexes(0, 2, overviewRowCount, 1).format.columnWidth = 19;
overview.getRangeByIndexes(0, 3, overviewRowCount, overviewCols - 3).format.columnWidth = 7.88;
overview.getRangeByIndexes(0, 0, 1, 3).format = { fill: '#1E3A8A', font: { bold: true, color: '#FFFFFF' }, wrapText: false, verticalAlignment: 'center' };
overview.getRangeByIndexes(1, 0, 1, 3).format = { fill: '#1E3A8A', font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true };
if (overviewOptions.length) {
  overview.getRangeByIndexes(2, 0, overviewOptions.length, overviewCols).format = { fill: '#FFFFFF', verticalAlignment: 'top' };
  overview.getRangeByIndexes(2, 0, overviewOptions.length, overviewCols).format.rowHeight = 14.25;
}
const placeGroupLabelAtStart = (startColumn, columnCount, label) => {
  const headerRange = overview.getRangeByIndexes(0, startColumn, 1, columnCount);
  const headerValues = Array(columnCount).fill(null);
  headerValues[0] = label;
  headerRange.values = [headerValues];
  const palette = label === 'Attachment Options' ? { primary: '#1E3A8A' } : paletteFor(label);
  headerRange.format = { fill: palette.primary, font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'left', verticalAlignment: 'center', wrapText: false };
};
placeGroupLabelAtStart(0, 3, 'Attachment Options');
for (let start = 0; start < weapons.length;) {
  const className = classByWeapon.get(weapons[start]) ?? 'Unknown';
  let end = start + 1;
  while (end < weapons.length && (classByWeapon.get(weapons[end]) ?? 'Unknown') === className) end++;
  placeGroupLabelAtStart(start + 3, end - start, className);
  overview.getRangeByIndexes(1, start + 3, 1, end - start).format = { fill: paletteFor(className).primary, font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true };
  start = end;
}
for (let optionIndex = 0; optionIndex < overviewOptions.length; optionIndex++) {
  const option = overviewOptions[optionIndex];
  const rowIndex = optionIndex + 2;
  if ((rowIndex + 1) % 2 === 0) overview.getRangeByIndexes(rowIndex, 1, 1, overviewCols - 1).format.fill = stripeFill;
  overview.getCell(rowIndex, 0).format = { fill: typeColors[option.attachmentType] ?? '#E5E7EB', font: { bold: true, color: '#172554', size: 10 }, verticalAlignment: 'top' };
  overview.getRangeByIndexes(rowIndex, 1, 1, 2).format.font = { color: '#111827', size: 10 };
  for (let weaponIndex = 0; weaponIndex < weapons.length; weaponIndex++) {
    const weapon = weapons[weaponIndex];
    const optionKey = [weapon, option.attachmentType, option.optionValue].join('\u0000');
    const cell = overview.getCell(rowIndex, weaponIndex + 3);
    const targetRow = recordRowByOption.get(optionKey);
    cell.format = { font: { color: targetRow ? '#2563EB' : '#9CA3AF', underline: Boolean(targetRow), size: 10 }, horizontalAlignment: 'center', verticalAlignment: 'top' };
  }
}
for (const weapon of weapons) {
  const rows = weaponRowsByName.get(weapon) ?? [];
  const className = classByWeapon.get(weapon) ?? 'Unknown';
  const palette = paletteFor(className);
  const sheet = wb.worksheets.add(weapon);
  sheet.showGridLines = false;
  const columns = [['Attachment Type', r => r.attachmentType], ['Attachment Name', r => r.attachmentName], ...fields];
  const matrix = [columns.map(([label]) => label), ...rows.map(record => columns.map(([, getter], columnIndex) => {
    const value = getter(record);
    const comparisonKey = Object.entries(comparisonColumns).find(([, index]) => index === columnIndex)?.[0];
    return comparisonKey ? comparisonDisplay(record, comparisonKey, value) : value;
  }))];
  const cols = columns.length;
  const title = sheet.getRangeByIndexes(0, 0, 1, cols); title.values = [[`${weapon} Attachment Screenshot Review`, ...Array(cols - 1).fill(null)]]; title.format = { fill:palette.dark, font:{bold:true,color:'#FFFFFF',size:18}, wrapText:false, verticalAlignment:'center' }; title.format.rowHeight = 32;
  const subtitle = sheet.getRangeByIndexes(1, 0, 1, cols); subtitle.values = [[`${className} | All values remain provisional-review-required. Nulls carry field-specific transcription reasons; no screenshot value is promoted to live site data.`, ...Array(cols - 1).fill(null)]]; subtitle.format = { fill:palette.light, font:{italic:true,color:palette.text}, wrapText:false, verticalAlignment:'center' }; subtitle.format.rowHeight = 24;
  sheet.getRange('A5:AJ1000').clear({ applyTo:'contents' });
  sheet.getRangeByIndexes(3, 0, matrix.length, cols).values = matrix;
  sheet.getRangeByIndexes(3, 0, 1, cols).format = { fill:palette.primary, font:{bold:true,color:'#FFFFFF'}, horizontalAlignment:'center', verticalAlignment:'center', wrapText:true }; sheet.getRangeByIndexes(3, 0, 1, cols).format.rowHeight = 48;
  sheet.getRangeByIndexes(4, 0, rows.length, cols).format = { fill:'#FFFFFF', verticalAlignment:'top', wrapText:true };
  sheet.getRangeByIndexes(4, 0, rows.length, cols).format.font = { size:10 };
  rows.forEach((record, index) => {
    if ((index + 5) % 2 === 0) sheet.getRangeByIndexes(index + 4, 1, 1, cols - 1).format.fill = stripeFill;
    sheet.getCell(index + 4, 0).format = { fill:typeColors[record.attachmentType] ?? '#E5E7EB', font:{bold:true,color:palette.dark,size:10}, verticalAlignment:'top' };
    sheet.getCell(index + 4, 1).format.font = { bold:true,color:palette.text,size:10 };
    for (const [key, columnIndex] of Object.entries(comparisonColumns)) {
      const comparison = record.statComparisons?.[key];
      if (!comparison) continue;
      sheet.getCell(index + 4, columnIndex).format = {
        font: { bold:true, color:comparison.effect === 'buff' ? '#008000' : '#FF0000', size:10 },
        horizontalAlignment: 'right',
        verticalAlignment: 'top',
      };
    }
  });
  columnWidths.forEach((width, index) => { sheet.getRangeByIndexes(0, index, rows.length + 4, 1).format.columnWidth = width; });
  sheet.freezePanes.freezeRows(4); sheet.freezePanes.freezeColumns(3);
}
const index = wb.worksheets.add('Source Index'); index.showGridLines = false;
const indexHeaders = ['Weapon','Attachment Type','Attachment Subtype','Attachment Cost','Attachment Name','Extraction Status','Review Status','Mapping Review Status','Current Screenshot Path','Original Screenshot Path','Capture Timestamp','Resolution'];
const indexRows = [...doc.records].sort((a, b) => a.weaponName.localeCompare(b.weaponName) || byCaptureOrder(a, b)).map(r => [r.weaponName,r.attachmentType,r.attachmentSubtype,r.attachmentCost,r.attachmentName,r.extractionStatus,r.reviewStatus,r.mappingReviewStatus,r.source.currentPath,r.source.originalPath,r.source.captureTimestamp,r.source.resolution]);
index.getRange('A2:M1000').clear({applyTo:'contents'}); index.getRangeByIndexes(0,0,indexRows.length+1,indexHeaders.length).values = [indexHeaders,...indexRows]; index.getRangeByIndexes(0,0,1,indexHeaders.length).format = { fill:'#1D4ED8', font:{bold:true,color:'#FFFFFF'}, horizontalAlignment:'center', wrapText:true }; index.getRangeByIndexes(1,0,indexRows.length,indexHeaders.length).format.verticalAlignment='top'; index.getRangeByIndexes(1,8,indexRows.length,2).format.wrapText=true; index.getRangeByIndexes(1,12,indexRows.length,1).format.wrapText=true; index.getRange('A:M').format.columnWidth=18; index.getRange('I:J').format.columnWidth=62; index.getRange('M:M').format.columnWidth=45; index.freezePanes.freezeRows(1);
const readme = wb.worksheets.add('Read Me'); readme.showGridLines=false; readme.getRange('A1').values=[['BF6 Attachment Workbook - Read Me']]; readme.getRange('A1:D1').format={fill:'#172554',font:{bold:true,color:'#FFFFFF',size:18}};
const readmeRows = [
  ['Purpose','Review the screenshot-linked Battlefield 6 attachment transcription.'],
  ['Source JSON',jsonPath],
  ['JSON schema',doc.$schema ?? 'Legacy schema reference missing'],
  ['Status',doc.status],
  ['Weapons in workbook',weapons.length],
  ['Records',doc.recordCount],
  ['Detailed records',doc.attachmentDetailCount],
  ['Sheet order','Overview first, then Assault Rifle, Carbine, SMG, LMG, DMR, Sniper Rifle, Shotgun, and Sidearm sheets alphabetically within class; Source Index and Read Me are final.'],
  ['Worksheet columns','Weapon sheets omit Mapping Review Status, Extraction Status, Review Status, Original Screenshot Path, Current Screenshot Path, Capture Timestamp, Resolution, Stat Field Reasons, and Notes. Current Screenshot Filename follows Recoil Variation (width 8.88); comparison arrows remain inline with the affected stat values.'],
  ['Class colors','Assault Rifle = blue; Carbine = teal; SMG = purple.'],
  ['Screenshot order','Screenshot filenames and workbook rows use zero-padded sequential prefixes (00_, 01_, 02_, and so on) in original capture/UI order.'],
  ['Attachment taxonomy','Range Finder is categorized as Light. GRT-BC, KTS100 MK8, SL9, and most Sidearms use Laser/Light for a shared selector; VZ. 61 uses Grip/Laser/Light. No physical accessory-slot field is recorded.'],
  ['Subtype additions','Ammo supports Subsonic, Sub HP, Sub Pen, and Range Pen. VSSM Barrel supports Suppressed.'],
  ['Manual corrections','The 2026-07-28 direct JSON fixes are persisted in path-specific overrides and guarded by reload, velocity, capacity, and field-diff validation.'],
  ['Review rule','Only L85A3 has received a complete user review. Other targeted corrections remain provisional unless the record itself is marked reviewed.'],
  ['Comparison indicators','Arrows are part of the displayed value. Bold green means buff; bold red means penalty. Arrow direction is stored independently from effect in JSON. All arrow-marked cells use Top/Right alignment.'],
  ['Reload in ADS','Displayed as Yes or No; blank means null or not yet transcribed.'],
  ['Phase 4 note','Captured/transcribed artifacts do not complete live-data promotion, focused attachment tests, or barrel/ammunition modifier fixtures.'],
];
readme.getRange('A3:B30').clear({applyTo:'contents'});
readme.getRange(`A3:B${readmeRows.length+2}`).values=readmeRows;
readme.getRange(`A3:A${readmeRows.length+2}`).format={fill:'#DBEAFE',font:{bold:true,color:'#1E3A8A'}};
readme.getRange(`A3:B${readmeRows.length+2}`).format.wrapText=true;
readme.getRange('A:A').format.columnWidth=28;
readme.getRange('B:B').format.columnWidth=100;
readme.freezePanes.freezeRows(1);
staging.delete();
await fs.mkdir(outDir,{recursive:true});
const output=await SpreadsheetFile.exportXlsx(wb);
await output.save(outPath);

const xmlDecode = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const zip = await JSZip.loadAsync(await fs.readFile(outPath));
const workbookXml = await zip.file('xl/workbook.xml').async('string');
const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
const xmlAttributes = tag => Object.fromEntries([...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const relationshipTargets = new Map([...relsXml.matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)].map(match => {
  const attributes = xmlAttributes(match[0]);
  return [attributes.Id, attributes.Target];
}));
const sharedStringsFile = zip.file('xl/sharedStrings.xml');
const sharedStringsXml = sharedStringsFile ? await sharedStringsFile.async('string') : '';
const sharedStringsPrefix = sharedStringsXml.match(/<(\w+:)?sst\b/)?.[1] ?? '';
const sharedStrings = [...sharedStringsXml.matchAll(new RegExp('<' + sharedStringsPrefix + 'si[^>]*>([^]*?)</' + sharedStringsPrefix + 'si>', 'g'))].map(match => {
  return [...match[1].matchAll(new RegExp('<' + sharedStringsPrefix + 't[^>]*>([^]*?)</' + sharedStringsPrefix + 't>', 'g'))]
    .map(value => xmlDecode(value[1]))
    .join('');
});
/* The artifact-tool workbook styles are intentionally left untouched here. The prior style-table workaround caused boundary-row fills to become red.
let stylesXml = await zip.file('xl/styles.xml').async('string');
const bordersMatch = stylesXml.match(/(<(?:\w+:)?borders\b[^>]*>)([\s\S]*?)(<\/(?:\w+:)?borders>)/);
if (!bordersMatch) throw new Error('Workbook styles are missing the borders table.');
const borderEntries = [...bordersMatch[2].matchAll(/<(?:\w+:)?border\b[^>]*(?:\/>|>[\s\S]*?<\/(?:\w+:)?border>)/g)].map(match => match[0]);
let mediumGrayBorderId = borderEntries.findIndex(border => /bottom\b[^>]*style="medium"/.test(border) && /rgb="FF9CA3AF"/.test(border));
if (mediumGrayBorderId < 0) {
  const borderPrefix = stylesXml.match(/<(\w+:)?borders\b/)?.[1] ?? '';
  mediumGrayBorderId = borderEntries.length;
  borderEntries.push(`<${borderPrefix}border><${borderPrefix}bottom style="medium"><${borderPrefix}color rgb="FF9CA3AF"/></${borderPrefix}bottom></${borderPrefix}border>`);
}
const updatedBordersOpen = bordersMatch[1].replace(/\bcount="\d+"/, `count="${borderEntries.length}"`);
stylesXml = stylesXml.replace(bordersMatch[0], `${updatedBordersOpen}${borderEntries.join('')}${bordersMatch[3]}`);
const cellXfsMatch = stylesXml.match(/(<(?:\w+:)?cellXfs\b[^>]*>)([\s\S]*?)(<\/(?:\w+:)?cellXfs>)/);
if (!cellXfsMatch) throw new Error('Workbook styles are missing the cellXfs table.');
const cellXfs = [...cellXfsMatch[2].matchAll(/<(?:\w+:)?xf\b[^>]*(?:\/>|>[\s\S]*?<\/(?:\w+:)?xf>)/g)].map(match => match[0]);
const borderedStyleIds = new Map();
const styleWithBorder = (styleId, borderId) => {
  const existingId = Number.isInteger(styleId) && styleId >= 0 ? styleId : 0;
  const cacheKey = `${existingId}:${borderId}`;
  if (borderedStyleIds.has(cacheKey)) return borderedStyleIds.get(cacheKey);
  let style = cellXfs[existingId] ?? cellXfs[0];
  style = /\bborderId="/.test(style)
    ? style.replace(/\bborderId="\d+"/, `borderId="${borderId}"`)
    : style.replace(/(<(?:\w+:)?xf\b)/, `$1 borderId="${borderId}"`);
  if (!/\bapplyBorder="/.test(style)) {
    style = /\/>$/.test(style)
      ? style.replace(/\/>$/, ' applyBorder="1"/>')
      : style.replace(/(<(?:\w+:)?xf\b[^>]*)(>)/, '$1 applyBorder="1"$2');
  }
  const newId = cellXfs.length;
  cellXfs.push(style);
  borderedStyleIds.set(cacheKey, newId);
  return newId;
};
*/
let stylesXml = await zip.file('xl/styles.xml').async('string');
const bordersMatch = stylesXml.match(/(<(?:\w+:)?borders\b[^>]*>)([\s\S]*?)(<\/(?:\w+:)?borders>)/);
if (!bordersMatch) throw new Error('Workbook styles are missing the borders table.');
const borderEntries = [...bordersMatch[2].matchAll(/<(?:\w+:)?border\b[^>]*?(?:\/>|>[\s\S]*?<\/(?:\w+:)?border>)/g)].map(match => match[0]);
let mediumGrayBorderId = borderEntries.findIndex(border => /bottom\b[^>]*style="medium"/.test(border) && /rgb="FF9CA3AF"/.test(border));
if (mediumGrayBorderId < 0) {
  const borderPrefix = stylesXml.match(/<(\w+:)?borders\b/)?.[1] ?? '';
  mediumGrayBorderId = borderEntries.length;
  borderEntries.push('<' + borderPrefix + 'border><' + borderPrefix + 'bottom style="medium"><' + borderPrefix + 'color rgb="FF9CA3AF"/></' + borderPrefix + 'bottom></' + borderPrefix + 'border>');
  const updatedBordersOpen = bordersMatch[1].replace(/\bcount="\d+"/, 'count="' + borderEntries.length + '"');
  stylesXml = stylesXml.replace(bordersMatch[0], updatedBordersOpen + borderEntries.join('') + bordersMatch[3]);
}
const fillsMatch = stylesXml.match(/(<(?:\w+:)?fills\b[^>]*>)([\s\S]*?)(<\/(?:\w+:)?fills>)/);
if (!fillsMatch) throw new Error('Workbook styles are missing the fills table.');
const fillEntries = [...fillsMatch[2].matchAll(/<(?:\w+:)?fill\b[^>]*>[\s\S]*?<\/(?:\w+:)?fill>/g)].map(match => match[0]);
let overviewHeaderFillId = fillEntries.findIndex(fill => /patternType="solid"/.test(fill) && /rgb="FF1E3A8A"/.test(fill));
if (overviewHeaderFillId < 0) {
  const fillPrefix = stylesXml.match(/<(\w+:)?fills\b/)?.[1] ?? '';
  overviewHeaderFillId = fillEntries.length;
  fillEntries.push('<' + fillPrefix + 'fill><' + fillPrefix + 'patternFill patternType="solid"><' + fillPrefix + 'fgColor rgb="FF1E3A8A"/><' + fillPrefix + 'bgColor indexed="64"/></' + fillPrefix + 'patternFill></' + fillPrefix + 'fill>');
  const updatedFillsOpen = fillsMatch[1].replace(/\bcount="\d+"/, 'count="' + fillEntries.length + '"');
  stylesXml = stylesXml.replace(fillsMatch[0], updatedFillsOpen + fillEntries.join('') + fillsMatch[3]);
}
const cellXfsMatch = stylesXml.match(/(<(?:\w+:)?cellXfs\b[^>]*>)([\s\S]*?)(<\/(?:\w+:)?cellXfs>)/);
if (!cellXfsMatch) throw new Error('Workbook styles are missing the cellXfs table.');
const cellXfs = [...cellXfsMatch[2].matchAll(/<(?:\w+:)?xf\b[^>]*?(?:\/>|>[\s\S]*?<\/(?:\w+:)?xf>)/g)].map(match => match[0]);
const styleCache = new Map();
const setXfAttribute = (style, name, value) => {
  const pattern = new RegExp('\\b' + name + '="\\d+"');
  return pattern.test(style)
    ? style.replace(pattern, name + '="' + value + '"')
    : style.replace(/(<(?:\w+:)?xf\b[^>]*)(>)/, '$1 ' + name + '="' + value + '"$2');
};
const styleWithChanges = (styleId, fillId = null, borderId = null) => {
  const existingId = Number.isInteger(styleId) && styleId >= 0 ? styleId : 0;
  const cacheKey = existingId + ':' + (fillId ?? '') + ':' + (borderId ?? '');
  if (styleCache.has(cacheKey)) return styleCache.get(cacheKey);
  let style = cellXfs[existingId] ?? cellXfs[0];
  if (fillId !== null) {
    style = setXfAttribute(style, 'fillId', fillId);
    style = setXfAttribute(style, 'applyFill', 1);
  }
  if (borderId !== null) {
    style = setXfAttribute(style, 'borderId', borderId);
    style = setXfAttribute(style, 'applyBorder', 1);
  }
  const newId = cellXfs.length;
  cellXfs.push(style);
  styleCache.set(cacheKey, newId);
  return newId;
};
const borderPrefix = stylesXml.match(/<(\w+:)?borders\b/)?.[1] ?? '';
const edgeMarkup = (name, style, rgb) =>
  '<' + borderPrefix + name + ' style="' + style + '"><' + borderPrefix + 'color rgb="' + rgb + '"/></' + borderPrefix + name + '>';
const borderEdgePattern = name =>
  new RegExp('<' + borderPrefix + name + '\\b[^>]*(?:\\/>|>[\\s\\S]*?<\\/' + borderPrefix + name + '>)');
const setBorderEdge = (border, name, markup) => {
  const pattern = borderEdgePattern(name);
  if (markup === null) return border.replace(pattern, '');
  if (pattern.test(border)) return border.replace(pattern, markup);
  const selfClosingBorder = new RegExp('<' + borderPrefix + 'border\\b([^>]*)\\/>');
  if (selfClosingBorder.test(border)) {
    return border.replace(selfClosingBorder, '<' + borderPrefix + 'border$1>' + markup + '</' + borderPrefix + 'border>');
  }
  return border.replace(new RegExp('(<' + borderPrefix + 'border\\b[^>]*>)'), '$1' + markup);
};
const borderIdWithOverviewEdges = (currentBorderId, needsRight, needsBottom) => {
  const cacheKey = currentBorderId + ':' + (needsRight ? '1' : '0') + ':' + (needsBottom ? '1' : '0');
  if (styleCache.has('border:' + cacheKey)) return styleCache.get('border:' + cacheKey);
  const currentBorder = borderEntries[currentBorderId] ?? borderEntries[0];
  let updatedBorder = currentBorder;
  updatedBorder = setBorderEdge(updatedBorder, 'right', needsRight ? edgeMarkup('right', 'medium', 'FF9CA3AF') : null);
  updatedBorder = setBorderEdge(updatedBorder, 'bottom', needsBottom ? edgeMarkup('bottom', 'medium', 'FF9CA3AF') : null);
  let borderId = borderEntries.indexOf(updatedBorder);
  if (borderId < 0) {
    borderId = borderEntries.length;
    borderEntries.push(updatedBorder);
  }
  styleCache.set('border:' + cacheKey, borderId);
  return borderId;
};
for (const match of workbookXml.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) {
  const attributes = xmlAttributes(match[0]);
  const name = xmlDecode(attributes.name);
  const isOverview = name === 'Overview';
  const className = classByWeapon.get(name);
  const target = relationshipTargets.get(attributes['r:id']);
  if (!target) continue;
  const normalizedTarget = target.replace(/^\//, '');
  const sheetPath = normalizedTarget.startsWith('xl/') ? normalizedTarget : `xl/${normalizedTarget}`;
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) continue;
  if (isOverview) {
    let overviewXml = await sheetFile.async('string');
    const overviewPrefix = overviewXml.match(/<(\w+:)?sheetData\b/)?.[1] ?? '';
    const overviewDataMatch = overviewXml.match(new RegExp('(<' + overviewPrefix + 'sheetData[^>]*>)([^]*?)(</' + overviewPrefix + 'sheetData>)'));
    if (overviewDataMatch) {
      const rowEntries = [...overviewDataMatch[2].matchAll(new RegExp('<' + overviewPrefix + 'row[^>]*>[^]*?</' + overviewPrefix + 'row>', 'g'))].map(match => match[0]);
      const overviewTypeOrder = ['Muzzle', 'Barrel', 'Light', 'Laser/Light', 'Grip/Laser/Light', 'Grip', 'Magazine', 'Laser', 'Ammo', 'Ergonomics'];
      const overviewTypeRank = value => {
        const index = overviewTypeOrder.indexOf(value);
        return index === -1 ? overviewTypeOrder.length : index;
      };
      const rowNumberOf = rowXml => Number(rowXml.match(new RegExp('<' + overviewPrefix + 'row[^>]*r="([0-9]+)"'))?.[1] ?? 0);
      const cellTextOf = (rowXml, column, rowNumber) => {
        const cellMatch = rowXml.match(new RegExp('(<' + overviewPrefix + 'c[^>]*r="' + column + rowNumber + '"[^>]*>)([^]*?)</' + overviewPrefix + 'c>'));
        const cellAttributes = xmlAttributes(cellMatch?.[1] ?? '');
        const body = cellMatch?.[2] ?? '';
        const valueMatch = body.match(new RegExp('<' + overviewPrefix + 'v>([^]*?)</' + overviewPrefix + 'v>')) ?? body.match(new RegExp('<' + overviewPrefix + 't[^>]*>([^]*?)</' + overviewPrefix + 't>'));
        const rawValue = xmlDecode(valueMatch?.[1] ?? '');
        return cellAttributes.t === 's' ? sharedStrings[Number(rawValue)] ?? rawValue : rawValue;
      };
      const dataRows = rowEntries
        .filter(rowXml => rowNumberOf(rowXml) >= 3)
        .map((rowXml, index) => ({ rowXml, index, attachmentType: cellTextOf(rowXml, 'A', rowNumberOf(rowXml)) }));
      dataRows.sort((a, b) => overviewTypeRank(a.attachmentType) - overviewTypeRank(b.attachmentType) || a.index - b.index);
      const boundaryRows = new Set(dataRows.reduce((rowNumbers, entry, index, rows) => {
        if (index === rows.length - 1 || rows[index + 1].attachmentType !== entry.attachmentType) rowNumbers.push(index + 3);
        return rowNumbers;
      }, []));
      const overviewWhiteFillId = fillEntries.findIndex(fill => /patternType="solid"/.test(fill) && /rgb="FFFFFFFF"/.test(fill));
      const overviewStripeFillId = fillEntries.findIndex(fill => /patternType="solid"/.test(fill) && /rgb="FFE2E2E2"/.test(fill));
      if (overviewWhiteFillId < 0 || overviewStripeFillId < 0) throw new Error('Overview stripe fills are missing from the workbook styles.');
      const overviewColumnNumber = value => {
        let number = 0;
        for (const character of value) number = number * 26 + character.charCodeAt(0) - 64;
        return number;
      };
      const rightBoundaryColumns = new Set();
      for (let start = 0; start < weapons.length;) {
        const className = classByWeapon.get(weapons[start]) ?? 'Unknown';
        let end = start + 1;
        while (end < weapons.length && (classByWeapon.get(weapons[end]) ?? 'Unknown') === className) end++;
        if (end < weapons.length) rightBoundaryColumns.add(end + 3);
        start = end;
      }
      const rewrittenRows = [
        ...rowEntries.filter(rowXml => rowNumberOf(rowXml) < 3),
        ...dataRows.map((entry, index) => {
          const rowNumber = index + 3;
          let rowXml = entry.rowXml.replace(new RegExp('(<' + overviewPrefix + 'row[^>]*r=")[0-9]+(")'), '$1' + rowNumber + '$2');
          rowXml = rowXml.replace(/\br="([A-Z]+)\d+"/g, 'r="$1' + rowNumber + '"');
          if (entry.attachmentType === 'Ergonomics') {
            const fieldCell = new RegExp('(<' + overviewPrefix + 'c[^>]*r="B' + rowNumber + '"[^>]*>)[^]*?(</' + overviewPrefix + 'c>)');
            rowXml = rowXml.replace(fieldCell, (match, open, close) => open.replace(/\bt="[^"]+"/, 't="str"') + '<' + overviewPrefix + 'v>Attachment Name</' + overviewPrefix + 'v>' + close);
          }
          const fillId = rowNumber % 2 === 0 ? overviewStripeFillId : overviewWhiteFillId;
          rowXml = rowXml.replace(new RegExp('<' + overviewPrefix + 'c[^>]*>', 'g'), cellTag => {
            const cellAttributes = xmlAttributes(cellTag);
            const cellRef = cellAttributes.r ?? '';
            const column = cellRef.match(/^[A-Z]+/)?.[0] ?? '';
            const cellRow = Number(cellRef.match(/\d+$/)?.[0] ?? 0);
            if (cellRow < 3) return cellTag;
            const oldStyleId = Number(cellAttributes.s ?? 0);
            const currentStyle = cellXfs[oldStyleId] ?? cellXfs[0];
            const currentBorderId = Number(currentStyle.match(/borderId="(\d+)"/)?.[1] ?? 0);
            const columnNumber = overviewColumnNumber(column);
            const targetBorderId = borderIdWithOverviewEdges(
              currentBorderId,
              rightBoundaryColumns.has(columnNumber),
              boundaryRows.has(rowNumber),
            );
            const fillIdForCell = columnNumber < 2 ? null : fillId;
            const newStyleId = styleWithChanges(oldStyleId, fillIdForCell, targetBorderId);
            return /\bs="\d+"/.test(cellTag)
              ? cellTag.replace(/\bs="\d+"/, 's="' + newStyleId + '"')
              : cellTag.replace(/(<(?:\w+:)?c\b)/, '$1 s="' + newStyleId + '"');
          });
          return rowXml;
        }),
      ];
      overviewXml = overviewXml.replace(overviewDataMatch[0], overviewDataMatch[1] + rewrittenRows.join('') + overviewDataMatch[3]);
    }
    overviewXml = overviewXml.replace(/<(?:\w+:)?c\b[^>]*>/g, cellTag => {
      const cellAttributes = xmlAttributes(cellTag);
      if (!['A1', 'B1', 'C1'].includes(cellAttributes.r)) return cellTag;
      const oldStyleId = Number(cellAttributes.s ?? 0);
      const newStyleId = styleWithChanges(oldStyleId, overviewHeaderFillId, 0);
      return /\bs="\d+"/.test(cellTag)
        ? cellTag.replace(/\bs="\d+"/, 's="' + newStyleId + '"')
        : cellTag.replace(/(<(?:\w+:)?c\b)/, '$1 s="' + newStyleId + '"');
    });
    overviewXml = overviewXml.replace(/\s+t="e"(?=[^>]*><(?:\w:)?f>HYPERLINK)/g, ' t="str"');
    overviewXml = overviewXml.replace(/(<(?:\w:)?v>)HYPERLINK is not implemented\.[^<]*(<\/(?:\w:)?v>)/g, '$1Link$2');
    zip.file(sheetPath, overviewXml);
    continue;
  }
  if (!className) continue;
  const tabRgb = `FF${paletteFor(className).primary.replace('#', '').toUpperCase()}`;
  let sheetXml = await sheetFile.async('string');
  const namespacePrefix = sheetXml.match(/<(\w+:)?worksheet\b/)?.[1] ?? '';
  const sheetPrPattern = new RegExp(`<${namespacePrefix}sheetPr\\b([^>]*)>`);
  const selfClosingSheetPrPattern = new RegExp(`<${namespacePrefix}sheetPr\\b([^>]*)\\/>`);
  const tabColorPattern = new RegExp(`<${namespacePrefix}tabColor\\b[^>]*\\/>`);
  if (selfClosingSheetPrPattern.test(sheetXml)) sheetXml = sheetXml.replace(selfClosingSheetPrPattern, `<${namespacePrefix}sheetPr$1><${namespacePrefix}tabColor rgb="${tabRgb}"/></${namespacePrefix}sheetPr>`);
  else if (sheetPrPattern.test(sheetXml)) {
    if (tabColorPattern.test(sheetXml)) sheetXml = sheetXml.replace(tabColorPattern, `<${namespacePrefix}tabColor rgb="${tabRgb}"/>`);
    else sheetXml = sheetXml.replace(sheetPrPattern, `<${namespacePrefix}sheetPr$1><${namespacePrefix}tabColor rgb="${tabRgb}"/>`);
  } else sheetXml = sheetXml.replace(new RegExp(`<${namespacePrefix}worksheet\\b([^>]*)>`), `<${namespacePrefix}worksheet$1><${namespacePrefix}sheetPr><${namespacePrefix}tabColor rgb="${tabRgb}"/></${namespacePrefix}sheetPr>`);
  const panePattern = new RegExp(`<${namespacePrefix}pane\\b[^>]*/>`, 'g');
  sheetXml = sheetXml.replace(panePattern, '');
  const sheetViewPattern = new RegExp(`<${namespacePrefix}sheetView\\b([^>]*)>`);
  sheetXml = sheetXml.replace(sheetViewPattern, `<${namespacePrefix}sheetView$1><${namespacePrefix}pane xSplit="3" ySplit="4" topLeftCell="D5" activePane="bottomRight" state="frozen"/>`);
  /* Boundary borders are emitted by the worksheet range formatting above; do not rewrite style IDs here.
  const weaponRowsForXml = rowsForWeapon(name);
  const boundaryRows = new Set(weaponRowsForXml.reduce((rowNumbers, record, index, records) => {
    if (index === records.length - 1 || records[index + 1].attachmentType !== record.attachmentType) rowNumbers.push(index + 5);
    return rowNumbers;
  }, []));
  const dataRows = new Set(weaponRowsForXml.map((record, index) => index + 5));
  if (boundaryRows.size) {
    sheetXml = sheetXml.replace(/<(?:\w+:)?c\b[^>]*>/g, cellTag => {
      const cellAttributes = xmlAttributes(cellTag);
      const rowNumber = Number(cellAttributes.r?.match(/\d+$/)?.[0]);
      if (!cellAttributes.r || !dataRows.has(rowNumber)) return cellTag;
      const oldStyleId = Number(cellAttributes.s ?? 0);
      const currentStyle = cellXfs[oldStyleId] ?? cellXfs[0];
      const currentBorderId = Number(currentStyle.match(/borderId="(\d+)"/)?.[1] ?? 0);
      const targetBorderId = boundaryRows.has(rowNumber)
        ? mediumGrayBorderId
        : currentBorderId === mediumGrayBorderId ? 0 : null;
      if (targetBorderId === null || targetBorderId === currentBorderId) return cellTag;
      const newStyleId = styleWithBorder(oldStyleId, targetBorderId);
      return /\bs="\d+"/.test(cellTag)
        ? cellTag.replace(/\bs="\d+"/, `s="${newStyleId}"`)
        : cellTag.replace(/(<(?:\w+:)?c\b)/, `$1 s="${newStyleId}"`);
    });
  }
  */
  const weaponRowsForXml = detail.filter(record => record.weaponName === name);
  const boundaryRows = new Set(weaponRowsForXml.reduce((rowNumbers, record, index, records) => {
    if (index === records.length - 1 || records[index + 1].attachmentType !== record.attachmentType) rowNumbers.push(index + 5);
    return rowNumbers;
  }, []));
  if (boundaryRows.size) {
    sheetXml = sheetXml.replace(/<(?:\w+:)?c\b[^>]*>/g, cellTag => {
      const cellAttributes = xmlAttributes(cellTag);
      const rowNumber = Number(cellAttributes.r?.match(/\d+$/)?.[0]);
      if (!cellAttributes.r || !boundaryRows.has(rowNumber)) return cellTag;
      const oldStyleId = Number(cellAttributes.s ?? 0);
      const newStyleId = styleWithChanges(oldStyleId, null, mediumGrayBorderId);
      return /\bs="\d+"/.test(cellTag)
        ? cellTag.replace(/\bs="\d+"/, 's="' + newStyleId + '"')
        : cellTag.replace(/(<(?:\w+:)?c\b)/, '$1 s="' + newStyleId + '"');
    });
  }
  zip.file(sheetPath, sheetXml);
}
const finalBordersMatch = stylesXml.match(/(<(?:\w+:)?borders\b[^>]*>)([\s\S]*?)(<\/(?:\w+:)?borders>)/);
if (!finalBordersMatch) throw new Error('Workbook styles are missing the final borders table.');
const finalBordersOpen = finalBordersMatch[1].replace(/\bcount="\d+"/, 'count="' + borderEntries.length + '"');
stylesXml = stylesXml.replace(finalBordersMatch[0], finalBordersOpen + borderEntries.join('') + finalBordersMatch[3]);
const updatedCellXfsOpen = cellXfsMatch[1].replace(/\bcount="\d+"/, 'count="' + cellXfs.length + '"');
stylesXml = stylesXml.replace(cellXfsMatch[0], updatedCellXfsOpen + cellXfs.join('') + cellXfsMatch[3]);
zip.file('xl/styles.xml', stylesXml);
await fs.writeFile(outPath, await zip.generateAsync({ type:'nodebuffer', compression:'DEFLATE' }));
console.log(`Saved ${outPath}`);

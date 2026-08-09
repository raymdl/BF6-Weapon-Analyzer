import fs from 'node:fs';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const root = 'C:/Users/royal/Documents/BF6 Weapon Analyzer';
const audit = `${root}/migration/1.3.3.0/attachment-audit`;
const source = fs.readFileSync(`${audit}/apply-carbine-visual-corrections.mjs`, 'utf8');
for (const forbidden of ['descGroups', 'candidates[0]', 'repairDescription', 'records.filter(r => r.stats && r.stats.mobility == null)', 'stats?.mobility == null']) {
  if (source.includes(forbidden)) throw new Error(`Prohibited recurring-failure mechanism remains: ${forbidden}`);
}
const review = JSON.parse(fs.readFileSync(`${audit}/attachment-screenshot-review.json`, 'utf8'));
const rows = review.records.filter(r => r.source.currentPath.includes('\\Weapon Attachments\\Carbine\\'));
const details = rows.filter(r => r.stats);
if (details.length !== 512) throw new Error(`Expected 512 Carbine details, got ${details.length}`);
for (const field of ['damage','rateOfFireRpm','magazineSize','hipfire','precision','control','mobility','reloadTimeSeconds','muzzleVelocityMps','adsTimeMs','headshotMultiplier']) {
  const missing = details.filter(r => r.stats[field] == null);
  if (missing.length) throw new Error(`${field} null: ${missing.map(r => r.source.currentPath).join(', ')}`);
}
for (const field of ['recoilAmountDegrees','recoilVariationDegrees']) {
  const missing = details.filter(r => r.stats[field] == null);
  if (missing.length !== 0) throw new Error(`${field} expected 0 nulls after the AK-205 detailed compact recapture, got ${missing.length}`);
}
const descriptions = details.filter(r => r.attachmentDescription);
const badToken = /\b(?:ot|tiring|mlnimap)\b/i;
for (const r of descriptions) {
  if (badToken.test(r.attachmentDescription)) throw new Error(`Known bad description token: ${r.source.currentPath}`);
  if (/^[a-z]/.test(r.attachmentDescription)) throw new Error(`Lowercase description: ${r.source.currentPath}`);
  if (!/[.!?]$/.test(r.attachmentDescription)) throw new Error(`Unterminated description: ${r.source.currentPath}`);
}
const flash = rows.find(r => r.source.currentPath.endsWith('8_BROD 3_Muzzle_Flash_Comp.png'));
if (flash?.attachmentSubtype !== 'Flash Hider') throw new Error('BROD 3 Flash Comp subtype regression');
if (!flash.attachmentDescription.startsWith('Limits the intensity of muzzle flashes')) throw new Error('BROD 3 Flash Comp description regression');
const overrides = JSON.parse(fs.readFileSync(`${audit}/manual-review-overrides.json`, 'utf8')).overrides;
const overrideByPath = new Map(overrides.map(o => [String(o.sourcePath).toLowerCase(), o]));
for (const r of descriptions) {
  const o = overrideByPath.get(r.source.currentPath.toLowerCase());
  if (!o?.updates || !Object.hasOwn(o.updates, 'attachmentDescription')) throw new Error(`Description lacks exact screenshot override: ${r.source.currentPath}`);
  if (!o.evidence?.some(e => e.kind === 'direct-screenshot-review' && String(e.source).toLowerCase() === r.source.currentPath.toLowerCase())) throw new Error(`Description lacks direct evidence: ${r.source.currentPath}`);
}
const workbookPath = `${root}/outputs/019f94db-3ac2-7831-bd8a-32275bf0343c/BF6_Attachment_Stats_Review.xlsx`;
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const bySheet = new Map(rows.reduce((m, r) => { (m.get(r.weaponName) ?? m.set(r.weaponName, []).get(r.weaponName)).push(r); return m; }, new Map()).entries());
for (const [weapon, weaponRows] of bySheet) {
  const sheet = workbook.worksheets.getItem(weapon);
  const used = sheet.getUsedRange();
  const headers = sheet.getRangeByIndexes(3, 0, 1, used.columnCount).values[0].map(v => String(v ?? ''));
  const idx = name => headers.indexOf(name);
  const values = sheet.getRangeByIndexes(4, 0, used.rowCount - 4, used.columnCount).values;
  const pathIndex = idx('Current Screenshot Path');
  const byPath = new Map(values.map(row => [String(row[pathIndex] ?? '').toLowerCase(), row]));
  for (const r of weaponRows.filter(x => x.stats)) {
    const row = byPath.get(r.source.currentPath.toLowerCase());
    if (!row) throw new Error(`Workbook missing ${r.source.currentPath}`);
    for (const [jsonField, header] of [['attachmentSubtype','Attachment Subtype'],['attachmentDescription','Attachment Description']]) {
      if (String(row[idx(header)] ?? '') !== String(r[jsonField] ?? '')) throw new Error(`Workbook/JSON mismatch ${r.source.currentPath} ${header}`);
    }
    for (const [jsonField, header] of [['mobility','Mobility'],['control','Control']]) {
      const actual = String(row[idx(header)] ?? '').replace(/[↑↓]/g, '').trim();
      if (Number(actual) !== Number(r.stats[jsonField])) throw new Error(`Workbook/JSON mismatch ${r.source.currentPath} ${header}`);
    }
  }
}
console.log(JSON.stringify({ details: details.length, descriptions: descriptions.length, mobilityNull: details.filter(r => r.stats.mobility == null).length, controlNull: details.filter(r => r.stats.control == null).length, recoilNulls: Object.fromEntries(['recoilAmountDegrees','recoilVariationDegrees'].map(f => [f, details.filter(r => r.stats[f] == null).length])) }, null, 2));

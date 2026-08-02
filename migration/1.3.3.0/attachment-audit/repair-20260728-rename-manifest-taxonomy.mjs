import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('migration/1.3.3.0/attachment-audit/rename-manifest.json');
const document = JSON.parse(fs.readFileSync(file, 'utf8'));
const entries = Array.isArray(document) ? document : document.entries ?? [];
let rangeFinder = 0;
let vzCombined = 0;
for (const entry of entries) {
  const source = String(entry.sourceFilename ?? path.basename(entry.sourcePath ?? ''));
  if (/_Light_Range_Finder\.png$/i.test(source)) {
    entry.attachmentType = entry.attachmentType === 'Range Finder' ? 'Light' : entry.attachmentType;
    if (entry.targetPath) entry.targetPath = path.join(path.dirname(entry.targetPath), path.basename(entry.targetPath).replace('_Range Finder_Range_Finder.png', '_Light_Range_Finder.png'));
    if (entry.targetFilename) entry.targetFilename = entry.targetFilename.replace('_Range Finder_Range_Finder.png', '_Light_Range_Finder.png');
    rangeFinder++;
  }
  if (/VZ\. 61_Grip-Laser-Light_/i.test(source)) {
    entry.attachmentType = 'Grip/Laser/Light';
    const update = value => String(value).replace(/_VZ\. 61_(?:Grip|Laser-Light)_/, '_VZ. 61_Grip-Laser-Light_');
    if (entry.targetPath) entry.targetPath = update(entry.targetPath);
    if (entry.targetFilename) entry.targetFilename = update(entry.targetFilename);
    vzCombined++;
  }
}
if (rangeFinder !== 10 || vzCombined !== 13) throw new Error(`Unexpected manifest repair counts: ${rangeFinder}/${vzCombined}`);
fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);

const auditRoot = path.dirname(file);
const review = JSON.parse(fs.readFileSync(path.join(auditRoot, 'attachment-screenshot-review.json'), 'utf8'));
const statComparisonsFile = path.join(auditRoot, 'stat-comparisons.json');
const statComparisons = JSON.parse(fs.readFileSync(statComparisonsFile, 'utf8'));
const comparisonsByPath = new Map(statComparisons.map(row => [path.resolve(row.sourcePath).toLowerCase(), row]));
const penetration = review.records.filter(row => row.stats && row.attachmentType === 'Ammo' && row.attachmentSubtype === 'Penetration');
for (const row of penetration) {
  const key = path.resolve(row.source.currentPath).toLowerCase();
  let comparison = comparisonsByPath.get(key);
  if (!comparison) {
    comparison = { weapon: row.weaponName, sourcePath: row.source.currentPath, sourceName: path.basename(row.source.currentPath), resolution: row.source.resolution, comparisons: {} };
    statComparisons.push(comparison);
    comparisonsByPath.set(key, comparison);
  }
  comparison.comparisons = { ...comparison.comparisons, collateralMultiplier: row.statComparisons.collateralMultiplier, recoilAmountDegrees: row.statComparisons.recoilAmountDegrees };
}
fs.writeFileSync(statComparisonsFile, `${JSON.stringify(statComparisons, null, 2)}\n`);

const manualFile = path.join(auditRoot, 'manual-review-overrides.json');
const manual = JSON.parse(fs.readFileSync(manualFile, 'utf8'));
const manualByPath = new Map(manual.overrides.filter(row => row.sourcePath).map(row => [path.resolve(row.sourcePath).toLowerCase(), row]));
for (const [weapon, order, field] of [['CZ3A1', 33, 'adsMoveSpeedMultiplier'], ['PP-19', 32, 'adsMoveSpeedMultiplier'], ['L85A3', 41, 'adsMoveSpeedMultiplier'], ['L85A3', 51, 'adsMoveSpeedMultiplier']]) {
  const row = review.records.find(item => item.weaponName === weapon && item.source.captureOrder === order && item.stats);
  const override = manualByPath.get(path.resolve(row.source.currentPath).toLowerCase());
  if (!override) throw new Error(`Missing direct stat override: ${weapon}|${order}`);
  override.comparisons = { ...(override.comparisons ?? {}), [field]: row.statComparisons[field] };
}
fs.writeFileSync(manualFile, `${JSON.stringify(manual, null, 2)}\n`);

console.log(JSON.stringify({ rangeFinder, vzCombined, penetrationComparisons: penetration.length, directZeroRepairs: 4 }, null, 2));

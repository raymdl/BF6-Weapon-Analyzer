import fs from 'node:fs';

const source = JSON.parse(fs.readFileSync('migration/1.3.3.0/attachment-audit/backups/20260724-m433-pp19-rerun/attachment-screenshot-review.pre-rerun.json', 'utf8'));
const rows = source.records
  .filter(record => ['M433', 'PP-19'].includes(record.weaponName) && record.stats)
  .map(record => ({
    weaponName: record.weaponName,
    sourceFilename: record.source.originalFilename,
    attachmentCost: record.attachmentCost,
    stats: record.stats,
    preferReference: true,
    source: 'prior screenshot-linked reference row keyed by original screenshot filename; retained for typed M433/PP-19 stats after fresh mapping rebuild',
  }));
const aliases = new Map([
  ['M433|M433_Ammo_Standard.png', 'M433|M433_Ammo_FMJ.png'],
  ['M433|M433_Ammo_Lightweight.png', 'M433|M433_Ammo_Polymer_Case.png'],
  ['M433|M433_Ammo_Penetration.png', 'M433|M433_Ammo_Tungsten_Core.png'],
]);
for (const [alias, sourceKey] of aliases) {
  const sourceRow = rows.find(row => `${row.weaponName}|${row.sourceFilename}` === sourceKey);
  if (!sourceRow) continue;
  const [weaponName, sourceFilename] = alias.split('|');
  rows.push({ ...sourceRow, weaponName, sourceFilename });
}
rows.push({
  weaponName: 'M433',
  sourceFilename: 'M433_Ammo_Standard.png',
  attachmentCost: 5,
  forceFields: ['precision', 'control', 'recoilAmountDegrees', 'recoilVariationDegrees'],
  stats: { precision: 20, control: 40, recoilAmountDegrees: 0.8, recoilVariationDegrees: 41.4 },
  source: 'direct visual transcription from M433_Ammo_Standard.png: Control 40 and Recoil Amount 0.8 degrees',
});
fs.writeFileSync('migration/1.3.3.0/attachment-audit/reference-values-m433-pp19.json', `${JSON.stringify({ schemaVersion: 1, rows }, null, 2)}\n`);
console.log(`Prepared ${rows.length} reference value rows.`);

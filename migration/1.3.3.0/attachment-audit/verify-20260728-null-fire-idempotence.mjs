import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Weapon Analyzer/migration/1.3.3.0/attachment-audit');
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'attachment-screenshot-review.json'), 'utf8'));
const rebuilt = JSON.parse(fs.readFileSync(path.join(root, 'idempotence-null-fire-20260728', 'attachment-screenshot-review.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(root, 'null-and-fire-mode-audit-summary-20260728.json'), 'utf8'));
const details = rebuilt.records.filter((row) => row.stats);
const fields = Object.keys(details[0].stats);
const fail = (message) => { throw new Error(message); };
const key = (value) => path.resolve(value).toLowerCase();
const rebuiltByPath = new Map(details.map((row) => [key(row.source.currentPath), row]));

const nulls = details.flatMap((row) => fields.filter((field) => row.stats[field] === null || row.stats[field] === undefined).map((field) => `${row.source.currentPath}|${field}`));
if (nulls.length) fail(`Rebuild stat nulls: ${nulls.length}`);
const invalidDescriptions = details.filter((row) => row.attachmentName !== 'None' && !row.attachmentDescription);
if (invalidDescriptions.length) fail(`Rebuild description blanks: ${invalidDescriptions.length}`);

let repairedCompared = 0;
for (const repair of summary.nullRepairs) {
  const row = rebuiltByPath.get(key(repair.sourcePath));
  if (!row) continue;
  repairedCompared++;
  if (JSON.stringify(row.stats[repair.field]) !== JSON.stringify(repair.value)) fail(`Repair drift: ${repair.sourcePath}|${repair.field}`);
}
if (repairedCompared < 470) fail(`Too few repaired rows survived rebuild: ${repairedCompared}`);

const modes = new Map([['KORD 6P67',['AUTO','BURST','SINGLE']],['SG 553R',['AUTO','BURST','SINGLE']],['M433',['AUTO','SINGLE']]]);
for (const [weapon, expected] of modes) {
  const rows = details.filter((row) => row.weaponName === weapon);
  if (!rows.length || rows.some((row) => JSON.stringify(row.stats.fireModes) !== JSON.stringify(expected))) fail(`${weapon} rebuild fire-mode drift`);
}
const penetration = details.filter((row) => row.attachmentType === 'Ammo' && row.attachmentSubtype === 'Penetration');
if (penetration.some((row) => row.stats.collateralMultiplier !== 1 || !(row.stats.recoilAmountDegrees > 0))) fail('Penetration rebuild drift');
const brod = details.filter((row) => row.weaponName === 'BROD 3');
if (brod.some((row) => row.stats.rateOfFireRpm !== 830)) fail('BROD 3 rebuild drift');
const rail = details.find((row) => path.basename(row.source.currentPath) === '43_M240L_Ergonomics_Rail_Cover.png');
if (rail?.attachmentDescription !== 'Improves weapon draw speed.') fail('Rail Cover rebuild drift');

console.log(JSON.stringify({ canonicalRecords: canonical.records.length, rebuiltRecords: rebuilt.records.length, rebuiltDetails: details.length, knownRawOcrGap: canonical.records.length - rebuilt.records.length, rebuiltStatNulls: nulls.length, rebuiltInvalidDescriptions: invalidDescriptions.length, repairedFieldsCompared: repairedCompared, fireModeRows: Object.fromEntries([...modes].map(([weapon]) => [weapon, details.filter((row) => row.weaponName === weapon).length])), penetrationRows: penetration.length, brodRows: brod.length }, null, 2));

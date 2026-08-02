import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('migration/1.3.3.0/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(root, 'attachment-screenshot-review.json'), 'utf8'));
const visualPath = path.join(root, 'visual-stat-map.json');
const visual = JSON.parse(fs.readFileSync(visualPath, 'utf8'));
const byKey = new Map(visual.map(item => [`${path.resolve(item.sourcePath).toLowerCase()}|${item.field}`, item]));
const costs = new Map(Object.entries({
  'AK4D|Barrel|450MM FACTORY':10, 'AK4D|Barrel|409MM US':15,
  'AK4D|Magazine|15Rnd Fast Mag':10, 'AK4D|Magazine|15Rnd Magazine':5, 'AK4D|Magazine|20Rnd Magazine':5, 'AK4D|Magazine|30Rnd Magazine':40,
  'B36A4|Barrel|391MM COB':15, 'B36A4|Barrel|480MM FACTORY':10, 'B36A4|Barrel|480MM CRYOGENIC':20,
  'B36A4|Magazine|20Rnd Fast Mag':5, 'B36A4|Magazine|30Rnd Magazine':5, 'B36A4|Magazine|36Rnd Magazine':15, 'B36A4|Magazine|40Rnd Fast Mag':30, 'B36A4|Magazine|45Rnd Magazine':35,
  'EF88|Magazine|30Rnd Magazine':5, 'EF88|Magazine|42Rnd Fast Mag':30,
  'KORD 6P67|Barrel|415MM FACTORY':5, 'KORD 6P67|Magazine|30Rnd Magazine':5,
  'M16A4|Magazine|20Rnd Fast Mag':15, 'M16A4|Magazine|30Rnd Magazine':5, 'M16A4|Magazine|36Rnd Magazine':15, 'M16A4|Magazine|40Rnd Fast Mag':30,
  'SOR-556 MK2|Barrel|16" us':10, 'SOR-556 MK2|Barrel|FACTORY':5,
  'SOR-556 MK2|Magazine|20Rnd Fast Mag':15, 'SOR-556 MK2|Magazine|30Rnd Magazine':5, 'SOR-556 MK2|Magazine|36Rnd Magazine':15, 'SOR-556 MK2|Magazine|40Rnd Fast Mag':30, 'SOR-556 MK2|Magazine|45Rnd Magazine':35,
  'TR7|Barrel|17" FACTORY':10, 'TR7|Barrel|20" LONG':5, 'TR7|Magazine|15Rnd Magazine':5, 'TR7|Magazine|20Rnd Magazine':15,
  'VCR-2|Magazine|20Rnd Fast Mag':15, 'VCR-2|Magazine|30Rnd Magazine':5, 'VCR-2|Magazine|36Rnd Magazine':15, 'VCR-2|Magazine|40Rnd Fast Mag':30,
  'NVO-228E|Barrel|409MM FACTORY':10, 'NVO-228E|Barrel|458MM CUSTOM':5,
  'NVO-228E|Magazine|20Rnd Fast Mag':5, 'NVO-228E|Magazine|30Rnd Magazine':5, 'NVO-228E|Magazine|36Rnd Magazine':15,
}));
const magazines = new Map(Object.entries({
  'AK4D|15Rnd Fast Mag':15, 'AK4D|15Rnd Magazine':15, 'AK4D|30Rnd Magazine':30,
  'B36A4|20Rnd Fast Mag':20, 'B36A4|20Rnd Magazine':20, 'B36A4|36Rnd Magazine':36, 'B36A4|45Rnd Fast Mag':45, 'B36A4|45Rnd Magazine':45,
  'EF88|36Rnd Magazine':36, 'EF88|42Rnd Fast Mag':42,
  'KORD 6P67|36Rnd Magazine':36, 'KORD 6P67|45Rnd Fast Mag':45, 'KORD 6P67|45Rnd Magazine':45,
  'M16A4|20Rnd Fast Mag':20, 'M16A4|20Rnd Magazine':20, 'M16A4|36Rnd Magazine':36,
  'SOR-556 MK2|20Rnd Fast Mag':20, 'SOR-556 MK2|20Rnd Magazine':20, 'SOR-556 MK2|36Rnd Magazine':36, 'SOR-556 MK2|45Rnd Fast Mag':45, 'SOR-556 MK2|45Rnd Magazine':45,
  'TR7|10Rnd Fast Mag':10, 'TR7|15Rnd Magazine':15, 'TR7|30Rnd Magazine':30,
  'VCR-2|20Rnd Fast Mag':20, 'VCR-2|36Rnd Magazine':36, 'VCR-2|40Rnd Magazine':40,
  'NVO-228E|20Rnd Fast Mag':20, 'NVO-228E|20Rnd Magazine':20, 'NVO-228E|36Rnd Magazine':36,
}));

function add(record, field, value, evidence) {
  const sourcePath = record.source.currentPath && fs.existsSync(record.source.currentPath) ? record.source.currentPath : record.source.originalPath;
  const item = { sourcePath, field, value, evidence };
  byKey.set(`${path.resolve(sourcePath).toLowerCase()}|${field}`, item);
}

for (const record of review.records) {
  if (!record.source.originalPath.includes('Assault Rifle') || record.attachmentType === 'Overview') continue;
  const identity = `${record.weaponName}|${record.attachmentType}|${record.attachmentName}`;
  if (record.attachmentCost === null && costs.has(identity)) add(record, 'attachmentCost', costs.get(identity), 'Directly transcribed from the highlighted attachment-card cost crop in the 2026-07-24 visual contact sheet.');
  const magazineKey = `${record.weaponName}|${record.attachmentName}`;
  if (record.stats.magazineSize === null && magazines.has(magazineKey)) add(record, 'magazineSize', magazines.get(magazineKey), 'Directly transcribed from the MAG value crop in the 2026-07-24 visual contact sheet.');
  if (record.weaponName !== 'NVO-228E' && record.stats.spotOnFire3dM === null && ['CQB Suppressor','Flash Comp','Flash Hider','Lightened Suppressor','Long Suppressor','Standard Suppressor'].includes(record.attachmentName)) add(record, 'spotOnFire3dM', 0, 'Directly transcribed as the visible green down-arrow 0M value in the 2026-07-24 visual contact sheet.');
  if (record.stats.opponentHealthRegenDelaySeconds === null && record.attachmentName === 'Frangible') add(record, 'opponentHealthRegenDelaySeconds', 9, 'Directly transcribed as the visible red up-arrow 9.0S value in the 2026-07-24 visual contact sheet.');
  if (record.weaponName === 'M16A4' && record.stats.mobility === null && ['Low-Profile Stubby','Stippled Stubby'].includes(record.attachmentName)) add(record, 'mobility', 50, 'Directly transcribed as the visible red down-arrow 50 value in the 2026-07-24 visual contact sheet.');
}

const output = [...byKey.values()].sort((a,b) => a.sourcePath.localeCompare(b.sourcePath) || a.field.localeCompare(b.field));
fs.writeFileSync(visualPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`visual-stat-map.json now contains ${output.length} screenshot-evidenced values.`);

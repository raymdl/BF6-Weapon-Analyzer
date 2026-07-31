import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project/outputs/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(root, 'attachment-screenshot-review.json'), 'utf8'));
const details = review.records.filter((row) => row.stats);
const keep = new Set('US LE OH E3 SB LB MG SBR CQB LSW EBR SPR ASM COB DMR VMW 3LR HBAR MK22 US-LB SDM-R BOAR-F CUSTOM-H CIV CIV-S IAR A3 FMJ HP MW'.split(' '));
const content = new Map([
  ['SOR-556 MK2|FACTORY', '14.5" FACTORY'],
  ['PP-19|367MM', '367MM CIV'],
  ['USG-90|407MM CIV-s', '407MM CIV-S'],
  ['SOR-556 MK2|16" us', '16" US'],
  ['VCR-2|18" us', '18" US'],
  ['GRT-BC|AFTERMARKET B', 'AFTERMARKET BUFFER'],
  ['M240L|75RND BELT BO', '75RND BELT BOX'],
  ['KTS100 MK8|I00RND DRUM MAG', '100RND DRUM MAG'],
  ['M121 A2|I00RND BELT BOX', '100RND BELT BOX'],
  ['M240L|I0ORND BELT BOX', '100RND BELT BOX'],
  ['M250|I00RND BELT POUCH', '100RND BELT POUCH'],
  ['M277|50 MW', '50 MW BLUE'],
]);
const ammo = new Map([
  ['#00 BUCKSHOT','#00 Buckshot'],['#01 BUCKSHOT','#01 Buckshot'],['BUCKSHOT','Buckshot'],['FLECHETTE','Flechette'],['FMJ','FMJ'],['SLUGS','Slugs'],['SUBSONIC','Subsonic'],['SUBSONIC HP','Subsonic HP'],['SUBSONIC TUNGSTEN','Subsonic Tungsten'],
]);
const exact = new Map([
  ['Ergonomics|A3 RECEIVER','A3 Receiver'],['Ergonomics|AFTERMARKET BUFFER','Aftermarket Buffer'],['Ergonomics|BURST TRAINING','Burst Training'],['Ergonomics|MAGWELL FLARE','Magwell Flare'],['Ergonomics|RAIL COVER','Rail Cover'],
  ['Muzzle|SLANT BRAKE','Slant Brake'],['Muzzle|TRIPLE-PORT BRAKE','Triple-Port Brake'],
  ['Grip|FACTORY ANGLED','Factory Angled'],['Grip|UNDERSLUNG MOUNT','Underslung Mount'],
  ['Laser|LASER/LIGHT COMBO RED','Laser/Light Combo Red'],['Laser/Light|LASER/LIGHT COMBO RED','Laser/Light Combo Red'],
]);

function titlePart(part) {
  if (keep.has(part.toUpperCase())) return part.toUpperCase();
  return part ? part[0].toUpperCase() + part.slice(1).toLowerCase().replace(/\.$/, '') : part;
}
function titleToken(token) {
  if (/^\d+(?:\.\d+)?MM$/i.test(token)) return token.toUpperCase();
  if (/^\d+(?:\.\d+)?"$/.test(token)) return token;
  if (/^\d+RND$/i.test(token)) return `${token.match(/^\d+/)[0]}Rnd`;
  return token.split('-').map(titlePart).join('-');
}
function normalizedName(row) {
  let value = content.get(`${row.weaponName}|${row.attachmentName}`) ?? row.attachmentName;
  if (row.attachmentType === 'Ammo') return ammo.get(value) ?? value;
  const direct = exact.get(`${row.attachmentType}|${value}`);
  if (direct) return direct;
  if (['Barrel','Magazine'].includes(row.attachmentType)) return value.split(/\s+/).map(titleToken).join(' ');
  if (['Ergonomics','Muzzle','Grip','Laser','Laser/Light','Grip/Laser/Light'].includes(row.attachmentType)) {
    if (value === '50 MW BLUE') return '50 MW Blue';
    if (value === 'LASER/LIGHT COMBO RED') return 'Laser/Light Combo Red';
  }
  return value;
}

const candidates = details.filter((row) => {
  const letters = row.attachmentName.match(/[A-Za-z]/g) ?? [];
  return (letters.length && letters.every((letter) => letter === letter.toUpperCase()) && row.attachmentName !== 'FMJ') || /\bus\b/.test(row.attachmentName) || row.attachmentName === '407MM CIV-s';
});
const changes = candidates.map((row) => ({ weaponName: row.weaponName, attachmentType: row.attachmentType, before: row.attachmentName, after: normalizedName(row), sourcePath: row.source.currentPath })).filter((item) => item.before !== item.after);
const unchangedCandidates = candidates.filter((row) => normalizedName(row) === row.attachmentName).map((row) => ({ weaponName: row.weaponName, attachmentType: row.attachmentType, name: row.attachmentName, sourcePath: row.source.currentPath }));

const costFiles = fs.readdirSync(root).filter((name) => /^cost-ocr-refresh-(?:assault-[ab]|carbine|smg|lmg|dmr|sniper-rifle|shotgun|sidearm)-20260728\.json$/.test(name));
const costs = costFiles.flatMap((name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')));
function costNumber(value) {
  const normalized = String(value ?? '').toUpperCase().replace(/[OQØø]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5');
  for (const match of normalized.matchAll(/[0-9]+/g)) {
    const number = Number(match[0]);
    if (number >= 5 && number <= 60 && number % 5 === 0) return number;
  }
  return null;
}
const detailByPath = new Map(details.map((row) => [path.resolve(row.source.currentPath).toLowerCase(), row]));
const costComparisons = costs.map((item) => ({ item, row: detailByPath.get(path.resolve(item.sourcePath).toLowerCase()), parsed: costNumber(item.text) })).filter(({ row, parsed }) => row && parsed !== null);
const costDisagreements = costComparisons.filter(({ row, parsed }) => row.attachmentCost !== parsed).map(({ item, row, parsed }) => ({ weaponName: row.weaponName, attachmentType: row.attachmentType, attachmentName: row.attachmentName, recorded: row.attachmentCost, ocr: parsed, ocrText: item.text, sourcePath: row.source.currentPath }));

fs.writeFileSync(path.join(root, 'name-normalization-analysis-20260728.json'), `${JSON.stringify({ candidates: candidates.length, changes, unchangedCandidates, costFiles, costOcrRows: costs.length, confidentCostRows: costComparisons.length, costDisagreements }, null, 2)}\n`);
console.log(JSON.stringify({ candidates: candidates.length, changes: changes.length, unchangedCandidates: unchangedCandidates.length, changesByType: Object.fromEntries([...new Set(changes.map((item) => item.attachmentType))].sort().map((type) => [type, changes.filter((item) => item.attachmentType === type).length])), costFiles: costFiles.length, costOcrRows: costs.length, confidentCostRows: costComparisons.length, costDisagreements: costDisagreements.length, costDisagreementSample: costDisagreements.slice(0, 30) }, null, 2));

import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('C:/Users/royal/Documents/BF6 Weapon Analyzer');
const auditRoot = path.join(projectRoot, 'migration', '1.3.3.0', 'attachment-audit');
const read = (name) => JSON.parse(fs.readFileSync(path.join(auditRoot, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(auditRoot, name), `${JSON.stringify(value, null, 2)}\n`);
const pathKey = (value) => path.resolve(value).toLowerCase();

const review = read('attachment-screenshot-review.json');
const manual = read('manual-review-overrides.json');
const coverage = read('coverage-report.json');
const captureOrder = read('capture-order.json');
const details = review.records.filter((row) => row.stats);
const now = new Date().toISOString();

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
  ['#00 BUCKSHOT', '#00 Buckshot'], ['#01 BUCKSHOT', '#01 Buckshot'],
  ['BUCKSHOT', 'Buckshot'], ['FLECHETTE', 'Flechette'], ['FMJ', 'FMJ'],
  ['SLUGS', 'Slugs'], ['SUBSONIC', 'Subsonic'], ['SUBSONIC HP', 'Subsonic HP'],
  ['SUBSONIC TUNGSTEN', 'Subsonic Tungsten'],
]);
const exact = new Map([
  ['Ergonomics|A3 RECEIVER', 'A3 Receiver'],
  ['Ergonomics|AFTERMARKET BUFFER', 'Aftermarket Buffer'],
  ['Ergonomics|BURST TRAINING', 'Burst Training'],
  ['Ergonomics|MAGWELL FLARE', 'Magwell Flare'],
  ['Ergonomics|RAIL COVER', 'Rail Cover'],
  ['Muzzle|SLANT BRAKE', 'Slant Brake'],
  ['Muzzle|TRIPLE-PORT BRAKE', 'Triple-Port Brake'],
  ['Grip|FACTORY ANGLED', 'Factory Angled'],
  ['Grip|UNDERSLUNG MOUNT', 'Underslung Mount'],
  ['Laser|LASER/LIGHT COMBO RED', 'Laser/Light Combo Red'],
  ['Laser/Light|LASER/LIGHT COMBO RED', 'Laser/Light Combo Red'],
]);

function titlePart(part) {
  if (keep.has(part.toUpperCase())) return part.toUpperCase();
  return part ? part[0].toUpperCase() + part.slice(1).toLowerCase().replace(/\.$/, '') : part;
}
function titleToken(token) {
  if (/^\d+(?:\.\d+)?MM$/i.test(token)) return token.toUpperCase();
  if (/^\d+(?:\.\d+)?"$/.test(token)) return token;
  if (/^\d+RND$/i.test(token)) return `${token.match(/^\d+/)[0]}Rnd`;
  if (['US-LB', 'SDM-R', 'CUSTOM-H'].includes(token.toUpperCase())) return token.toUpperCase();
  return token.split('-').map(titlePart).join('-');
}
function normalizedName(row) {
  const value = content.get(`${row.weaponName}|${row.attachmentName}`) ?? row.attachmentName;
  if (row.attachmentType === 'Ammo') return ammo.get(value) ?? value;
  const direct = exact.get(`${row.attachmentType}|${value}`);
  if (direct) return direct;
  if (['Barrel', 'Magazine'].includes(row.attachmentType)) return value.split(/\s+/).map(titleToken).join(' ');
  if (['Ergonomics', 'Muzzle', 'Grip', 'Laser', 'Laser/Light', 'Grip/Laser/Light'].includes(row.attachmentType)) {
    if (value === '50 MW BLUE') return '50 MW Blue';
  }
  return value;
}
function isCandidate(row) {
  const letters = row.attachmentName.match(/[A-Za-z]/g) ?? [];
  return (letters.length && letters.every((letter) => letter === letter.toUpperCase()) && row.attachmentName !== 'FMJ') || /\bus\b/.test(row.attachmentName) || row.attachmentName === '407MM CIV-s';
}

const nameChanges = details.filter(isCandidate).map((row) => ({ row, before: row.attachmentName, after: normalizedName(row) })).filter(({ before, after }) => before !== after);
if (nameChanges.length !== 314) throw new Error(`Expected 314 name changes, found ${nameChanges.length}`);

const rowByPath = new Map(details.map((row) => [pathKey(row.source.currentPath), row]));
function manualFor(row) {
  let override = manual.overrides.find((item) => item.sourcePath && pathKey(item.sourcePath) === pathKey(row.source.currentPath));
  if (!override) {
    override = { sourcePath: row.source.currentPath, sourceFilename: path.basename(row.source.currentPath), updates: {}, comparisons: {}, replaceComparisons: false, evidence: [] };
    manual.overrides.push(override);
  }
  override.weaponName = row.weaponName;
  override.attachmentType = row.attachmentType;
  override.attachmentName = row.attachmentName;
  override.sourcePath = row.source.currentPath;
  override.sourceFilename = path.basename(row.source.currentPath);
  override.updates ??= {};
  override.comparisons ??= {};
  override.evidence ??= [];
  return override;
}
function addEvidence(override, kind, source) {
  const item = { kind, source, reviewDate: '2026-07-28' };
  if (!override.evidence.some((entry) => JSON.stringify(entry) === JSON.stringify(item))) override.evidence.push(item);
}

const changes = { names: [], costs: [], subtype: [], stats: [] };
for (const change of nameChanges) {
  const { row, before, after } = change;
  row.attachmentName = after;
  const override = manualFor(row);
  override.attachmentName = after;
  override.updates.attachmentName = after;
  addEvidence(override, 'attachment-name-normalization-instructions-and-screenshot-review', row.source.currentPath);
  changes.names.push({ weaponName: row.weaponName, attachmentType: row.attachmentType, before, after, sourcePath: row.source.currentPath });
}

const costByBasename = new Map([
  ['10_PP-19_Barrel_Basic_ambiguous-2.png', 5],
  ['41_SG 553R_Ammo_Hollow_Point.png', 20],
  ['40_SOR-300SC_Ammo_Hollow_Point.png', 20],
  ['35_SCW-10_Ammo_Hollow_Point.png', 20],
  ['31_CZ3A1_Grip_Slim_Angled.png', 20],
  ['27_KV9_Grip_Slim_Angled.png', 20],
  ['28_PP-19_Grip_Slim_Angled.png', 20],
  ['31_PW5A3_Grip_Slim_Angled.png', 20],
  ['31_PW7A2_Grip_Slim_Angled.png', 20],
  ['27_SCW-10_Grip_Slim_Angled.png', 20],
  ['28_SGX_Grip_Slim_Angled.png', 20],
  ['34_UMG-40_Grip_Slim_Angled.png', 20],
  ['37_UMG-40_Magazine_25Rnd_Fast_Mag.png', 10],
  ['44_UMG-40_Ammo_Synthetic.png', 25],
]);
for (const [basename, value] of costByBasename) {
  const row = details.find((item) => path.basename(item.source.currentPath) === basename);
  if (!row) throw new Error(`Cost target missing: ${basename}`);
  const before = row.attachmentCost;
  row.attachmentCost = value;
  const override = manualFor(row);
  override.updates.attachmentCost = value;
  addEvidence(override, 'corpus-wide-cost-ocr-with-direct-screenshot-confirmation', row.source.currentPath);
  changes.costs.push({ weaponName: row.weaponName, attachmentName: row.attachmentName, before, after: value, sourcePath: row.source.currentPath });
}

const usg = details.find((row) => path.basename(row.source.currentPath) === '15_USG-90_Barrel_Extended.png');
if (!usg) throw new Error('USG-90 CIV-S target missing');
changes.subtype.push({ weaponName: usg.weaponName, attachmentName: usg.attachmentName, before: usg.attachmentSubtype, after: 'Heavy Ext', sourcePath: usg.source.currentPath });
usg.attachmentSubtype = 'Heavy Ext';
manualFor(usg).updates.attachmentSubtype = 'Heavy Ext';
addEvidence(manualFor(usg), 'direct-screenshot-highlighted-heavy-ext-tile', usg.source.currentPath);

const psr = details.find((row) => path.basename(row.source.currentPath) === '34_PSR_Laser_5_MW_Red.png');
if (!psr) throw new Error('PSR 5 MW Red target missing');
changes.stats.push({ weaponName: psr.weaponName, attachmentName: psr.attachmentName, field: 'sprintRecoveryMs', before: psr.stats.sprintRecoveryMs, after: 200, sourcePath: psr.source.currentPath });
psr.stats.sprintRecoveryMs = 200;
manualFor(psr).updates.sprintRecoveryMs = 200;
addEvidence(manualFor(psr), 'direct-screenshot-200ms-display', psr.source.currentPath);

for (const weapon of coverage.weapons ?? []) {
  for (const item of weapon.records ?? []) {
    const row = rowByPath.get(pathKey(item.sourcePath));
    if (!row) continue;
    item.name = row.attachmentName;
    item.subtype = row.attachmentSubtype;
  }
}
for (const entry of captureOrder.entries ?? []) {
  const currentPath = path.join(entry.currentDirectory, entry.currentFilename);
  const row = rowByPath.get(pathKey(currentPath));
  if (!row) continue;
  entry.attachmentName = row.attachmentName;
  entry.attachmentSubtype = row.attachmentSubtype;
}

const note = 'Attachment name was normalized against the approved naming instructions on 2026-07-28.';
for (const { row } of nameChanges) row.notes = [...new Set([...(row.notes ?? []), note])];
psr.notes = [...new Set([...(psr.notes ?? []), 'PSR 5 MW Red sprint recovery was directly corrected from the 200MS screenshot display on 2026-07-28.'])];

review.generatedAt = now;
manual.generatedAt = now;
coverage.generatedAt = now;
captureOrder.generatedAt = now;

const backupDir = path.join(auditRoot, 'backups', `pre-attachment-name-normalization-${now.replace(/[-:.TZ]/g, '')}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const name of ['attachment-screenshot-review.json', 'manual-review-overrides.json', 'coverage-report.json', 'capture-order.json']) fs.copyFileSync(path.join(auditRoot, name), path.join(backupDir, name));

write('attachment-screenshot-review.json', review);
write('manual-review-overrides.json', manual);
write('coverage-report.json', coverage);
write('capture-order.json', captureOrder);
write('attachment-name-normalization-summary-20260728.json', {
  generatedAt: now,
  backupDir,
  specification: path.join(projectRoot, 'ATTACHMENT_NAME_NORMALIZATION.md'),
  scopeClarification: { uniqueCandidateNames: 245, candidateRecords: 340, changedRecords: 314, validInitialismOnlyRecordsLeftUnchanged: 26 },
  costAudit: { screenshotsScanned: 3164, confidentCostReads: 245, disagreementsReviewed: 29, confirmedCorrections: changes.costs.length, rejectedOcrFalsePositives: 15 },
  ...changes,
});

console.log(JSON.stringify({ backupDir, names: changes.names.length, costs: changes.costs.length, subtype: changes.subtype.length, stats: changes.stats.length }, null, 2));

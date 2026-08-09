import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('C:/Users/royal/Documents/BF6 Weapon Analyzer');
const auditRoot = path.join(projectRoot, 'migration', '1.3.3.0', 'attachment-audit');
const read = name => JSON.parse(fs.readFileSync(path.join(auditRoot, name), 'utf8'));
const review = read('attachment-screenshot-review.json');
const manual = read('manual-review-overrides.json');
const comparisons = read('stat-comparisons.json');
const details = review.records.filter(row => row.stats);
const fail = message => { throw new Error(message); };

if (review.records.length !== 3164 || details.length !== 3102) fail(`Corpus size changed: ${review.records.length}/${details.length}`);
const stale = review.records.filter(row => !fs.existsSync(row.source.currentPath));
if (stale.length) fail(`Stale screenshot paths: ${stale.slice(0, 3).map(row => row.source.currentPath).join(', ')}`);

const rangeFinders = details.filter(row => row.attachmentName === 'Range Finder');
if (rangeFinders.length !== 10 || rangeFinders.some(row => row.attachmentType !== 'Light' || row.attachmentSubtype !== 'Range Finder' || !/_Light_Range_Finder\.png$/.test(row.source.currentPath))) fail('Range Finder taxonomy/path gate failed');
if (review.records.some(row => row.attachmentType === 'Range Finder')) fail('Legacy Range Finder attachment type remains');

const vzCombined = details.filter(row => row.weaponName === 'VZ. 61' && /^(?:7|8|9|10|11|12|13|14|15|16|17|18|19)_/.test(path.basename(row.source.currentPath)));
if (vzCombined.length !== 13 || vzCombined.some(row => row.attachmentType !== 'Grip/Laser/Light' || !/_Grip-Laser-Light_/.test(row.source.currentPath))) fail('VZ. 61 combined Underbarrel gate failed');

const sidearms = details.filter(row => row.source.currentPath.includes(`${path.sep}Sidearm${path.sep}`));
const sidearmIndicators = sidearms.reduce((sum, row) => sum + Object.keys(row.statComparisons ?? {}).length, 0);
if (sidearms.length !== 144 || sidearmIndicators !== 184) fail(`Sidearm comparison gate failed: ${sidearms.length}/${sidearmIndicators}`);
const comparisonByPath = new Map(comparisons.map(row => [path.resolve(row.sourcePath).toLowerCase(), row.comparisons]));
for (const row of sidearms) if (JSON.stringify(comparisonByPath.get(path.resolve(row.source.currentPath).toLowerCase()) ?? null) !== JSON.stringify(row.statComparisons)) fail(`Sidearm comparison artifact mismatch: ${row.source.currentPath}`);

const penetration = details.filter(row => row.attachmentType === 'Ammo' && row.attachmentSubtype === 'Penetration');
if (penetration.length !== 53) fail(`Penetration row count ${penetration.length}`);
for (const row of penetration) {
  if (row.stats.collateralMultiplier !== 1) fail(`Penetration collateral mismatch: ${row.source.currentPath}`);
  if (!(row.stats.recoilAmountDegrees > 0)) fail(`Penetration recoil is not positive: ${row.source.currentPath}`);
  if (row.statComparisons?.collateralMultiplier?.direction !== 'up' || row.statComparisons?.collateralMultiplier?.color !== 'green') fail(`Penetration collateral comparison mismatch: ${row.source.currentPath}`);
  if (row.statComparisons?.recoilAmountDegrees?.direction !== 'up' || row.statComparisons?.recoilAmountDegrees?.color !== 'red') fail(`Penetration recoil comparison mismatch: ${row.source.currentPath}`);
}

const brod = details.filter(row => row.weaponName === 'BROD 3');
if (brod.length !== 61 || brod.some(row => row.stats.rateOfFireRpm !== 830)) fail('BROD 3 ROF gate failed');

const zeroIndicators = [];
for (const row of details) for (const [field, comparison] of Object.entries(row.statComparisons ?? {})) if (row.stats[field] === 0) zeroIndicators.push({ row, field, comparison });
const disallowedZeroIndicators = zeroIndicators.filter(({ row, field, comparison }) => !(field === 'spotOnFire3dM' && comparison.direction === 'down' && row.attachmentType === 'Muzzle' && /(Flash Hider|Flash Comp|Suppressor)/i.test(row.attachmentName)));
if (disallowedZeroIndicators.length) fail(`Disallowed zero arrow indicators: ${JSON.stringify(disallowedZeroIndicators.slice(0, 5).map(({ row, field }) => ({ weapon: row.weaponName, name: row.attachmentName, field })))}`);
if (!zeroIndicators.length) fail('Expected legitimate 3D Spot-on-fire Range zero indicators were not found');

const lowercaseDescriptions = details.filter(row => /^[a-z]/.test(row.attachmentDescription ?? ''));
if (lowercaseDescriptions.length) fail(`Lowercase-leading descriptions remain: ${lowercaseDescriptions.length}`);

const manualByPath = new Map(manual.overrides.filter(row => row.sourcePath).map(row => [path.resolve(row.sourcePath).toLowerCase(), row]));
for (const row of [...rangeFinders, ...vzCombined]) if (manualByPath.get(path.resolve(row.source.currentPath).toLowerCase())?.updates?.attachmentType !== row.attachmentType) fail(`Taxonomy override missing: ${row.source.currentPath}`);
for (const row of penetration) if (manualByPath.get(path.resolve(row.source.currentPath).toLowerCase())?.updates?.collateralMultiplier !== 1) fail(`Penetration override missing: ${row.source.currentPath}`);
for (const row of sidearms) if (!manualByPath.get(path.resolve(row.source.currentPath).toLowerCase())?.replaceComparisons) fail(`Sidearm comparison override missing: ${row.source.currentPath}`);

const canonicalPathFiles = ['attachment-screenshot-review.json', 'manual-review-overrides.json', 'raw-ocr.json', 'panel-ocr.json', 'value-ocr.json', 'cost-ocr.json', 'recoil-ocr.json', 'recoil-value-ocr.json', 'stat-comparisons.json', 'field-ocr.json', 'highlight-cards.json', 'recoil-visual-map.json', 'visual-stat-map.json', 'capture-order.json', 'rename-manifest.json', 'rename-provenance.json', 'coverage-report.json'];
for (const name of canonicalPathFiles) {
  const doc = read(name);
  const currentReferences = [];
  const visit = (value, key = '') => {
    if (Array.isArray(value)) return value.forEach(item => visit(item));
    if (value && typeof value === 'object') return Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey));
    if (typeof value === 'string' && ['sourcePath', 'currentPath', 'targetPath', 'sourceName', 'sourceFilename', 'currentFilename', 'targetFilename', 'proposedFilename'].includes(key)) currentReferences.push(value);
  };
  visit(doc);
  if (currentReferences.some(value => /_Range Finder_Range_Finder\.png/.test(value))) fail(`Legacy current Range Finder filename remains in ${name}`);
  if (currentReferences.some(value => /VZ\. 61\\(?:7_VZ\. 61_Laser-Light_|(?:8|9|10|11|12)_VZ\. 61_Grip_|(?:13|14|15|16|17|18|19)_VZ\. 61_Laser-Light_)/.test(value))) fail(`Legacy current VZ. 61 Underbarrel filename remains in ${name}`);
}

console.log(JSON.stringify({
  records: review.records.length,
  details: details.length,
  stalePaths: stale.length,
  rangeFinders: rangeFinders.length,
  vzCombined: vzCombined.length,
  sidearmRows: sidearms.length,
  sidearmIndicators,
  penetrationRows: penetration.length,
  penetrationRecoilValues: [...new Set(penetration.map(row => row.stats.recoilAmountDegrees))].sort((a, b) => a - b),
  brodRows: brod.length,
  zeroIndicators: zeroIndicators.length,
  disallowedZeroIndicators: disallowedZeroIndicators.length,
  lowercaseDescriptions: lowercaseDescriptions.length,
}, null, 2));

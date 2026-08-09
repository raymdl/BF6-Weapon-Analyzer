import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('C:/Users/royal/Documents/BF6 Weapon Analyzer');
const auditRoot = path.join(projectRoot, 'migration', '1.3.3.0', 'attachment-audit');
const read = name => JSON.parse(fs.readFileSync(path.join(auditRoot, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(auditRoot, name), `${JSON.stringify(value, null, 2)}\n`);
const review = read('attachment-screenshot-review.json');
const sidearmComparisons = read('stat-comparisons-sidearm-20260728.json');
const now = new Date().toISOString();
const note = 'Comparison, taxonomy, or description was directly reconciled against the source screenshot on 2026-07-28.';

const pathMoves = new Map();
const basenameMoves = new Map();
const taxonomyRows = [];
for (const row of review.records) {
  const current = path.resolve(row.source.currentPath);
  const basename = path.basename(current);
  let nextName = null;
  let nextType = null;
  if (row.attachmentName === 'Range Finder') {
    nextType = 'Light';
    nextName = basename.replace('_Range Finder_Range_Finder.png', '_Light_Range_Finder.png');
  } else if (row.weaponName === 'VZ. 61' && /^(?:7|8|9|10|11|12|13|14|15|16|17|18|19)_/.test(basename)) {
    nextType = 'Grip/Laser/Light';
    nextName = basename.replace(/_(?:Grip|Laser-Light)_/, '_Grip-Laser-Light_');
  }
  if (!nextType || !nextName || nextName === basename) continue;
  const next = path.join(path.dirname(current), nextName);
  pathMoves.set(current.toLowerCase(), next);
  basenameMoves.set(basename.toLowerCase(), nextName);
  taxonomyRows.push({ row, current, next, nextType });
}
if (taxonomyRows.length !== 23) throw new Error(`Expected 23 taxonomy/path changes, got ${taxonomyRows.length}`);
for (const { current, next } of taxonomyRows) {
  if (!fs.existsSync(current)) throw new Error(`Missing rename source: ${current}`);
  if (fs.existsSync(next)) throw new Error(`Rename destination already exists: ${next}`);
}

const mapPath = value => {
  if (typeof value !== 'string' || !path.isAbsolute(value)) return value;
  return pathMoves.get(path.resolve(value).toLowerCase()) ?? value;
};
const mapBasename = value => typeof value === 'string' ? (basenameMoves.get(value.toLowerCase()) ?? value) : value;
function updateCurrentReferences(value, key = '') {
  if (Array.isArray(value)) return value.map(item => updateCurrentReferences(item));
  if (!value || typeof value !== 'object') {
    if (['sourcePath', 'currentPath', 'targetPath'].includes(key)) return mapPath(value);
    if (['sourceName', 'sourceFilename', 'currentFilename', 'targetFilename', 'proposedFilename'].includes(key)) return mapBasename(value);
    return value;
  }
  for (const [childKey, childValue] of Object.entries(value)) value[childKey] = updateCurrentReferences(childValue, childKey);
  return value;
}

for (const { row, next, nextType } of taxonomyRows) {
  row.attachmentType = nextType;
  row.source.currentPath = next;
  row.source.proposedFilename = path.basename(next);
  row.mappingReviewStatus = 'visually-checked';
  row.notes = [...new Set([...(row.notes ?? []), note])];
}

const cleanDescriptions = new Map([
  ['Flashlight', 'Provides minor improvement to hip-fire recovery and can blind enemy soldiers, except those using thermal optics. Effects only active when light is turned on.'],
  ['5 MW Red', 'Provides minor improvement to hip-fire accuracy and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['5 MW Green', 'Provides slight improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['50 MW Green', 'Provides moderate improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['Laser/Light Combo Green', 'Laser provides slight improvement to hip-fire accuracy while light provides minor improvement to hip-fire recovery, but is visible to enemy soldiers. Effects only active when laser/light is turned on. Can be used together or separately.'],
  ['LASER/LIGHT COMBO RED', 'Laser provides minor improvement to hip-fire accuracy while light provides minor improvement to hip-fire recovery and can blind enemies. Benefits only active when laser/light is turned on. Can be used together or separately.'],
  ['Flash Hider', 'Reduces the intensity of muzzle flashes and fully hides in-world spotting while firing. Soldiers firing are still marked on the minimap.'],
  ['Single-Port Brake', 'Simple brake that reduces recoil but increases weapon sway. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  ['Double-Port Brake', 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  ['Standard Suppressor', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces hip-fire accuracy.'],
  ['Long Suppressor', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces recoil buildup and improves recoil recovery at the cost of hip-fire accuracy and weapon sway.'],
  ['CQB Suppressor', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing.'],
  ['Taclight - Aimed', 'Automatically turns on in aim down sights (ADS) and off in hip-fire. Can blind enemy soldiers. Effects only active when light is turned on.'],
  ['Taclight - Hipfire', 'Automatically turns on in hip-fire and off in aim down sights (ADS). Provides minor improvement to hip-fire recovery and can blind enemy soldiers. Effects only active when light is turned on.'],
  ['50 MW Violet', 'Provides minor improvement to aim down sights (ADS) accuracy while moving and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['50 MW Blue', 'Provides slight improvement to hip-fire accuracy and minor improvement to aim down sights (ADS) accuracy while moving, but is visible to enemy soldiers. Effects only active when laser is turned on.'],
  ['Frangible', 'Ammunition that delays health regeneration on impact with the target.'],
  ['Canted Stubby', 'Moderately reduces recoil and enables a slightly faster transition to aim down sights (ADS), at the cost of ADS accuracy while moving.'],
  ['Stippled Stubby', 'Significantly reduces recoil and enables a slightly faster transition to aim down sights (ADS), at the cost of ADS movement speed and accuracy.'],
  ['Low-Profile Stubby', 'Greatly reduces recoil and enables a slightly faster transition to aim down sights (ADS), at the cost of ADS movement speed and accuracy.'],
  ['Full Angled', 'Slightly reduces recoil, improves weapon draw speed, and enables a slightly faster transition to aim down sights (ADS) at the cost of ADS accuracy while moving.'],
  ['Classic Grip Pod', 'Allows weapon to be mounted more effectively on the edges of cover and while prone. Slightly reduces recoil and enables a slightly faster transition to aim down sights (ADS), at the cost of ADS accuracy while moving.'],
  ['Folding Stubby', 'Slightly reduces recoil and enables a slightly faster transition to aim down sights (ADS) at the cost of ADS accuracy while moving.'],
  ['Slim Angled', 'Marginally reduces recoil, increases weapon draw speed, and enables a slightly faster transition to aim down sights (ADS).'],
  ['PTT Grip Pod', 'Allows weapon to be mounted more effectively on the edges of cover and while prone. Slightly reduces recoil at the cost of aim down sights (ADS) accuracy while moving.'],
  ['Tungsten Core', 'Ammunition that trades recoil for improved penetration, resulting in greater damage to soldiers behind the initial target.'],
  ['TUNGSTENGORe-vov.-4', 'Ammunition that trades recoil for improved penetration, resulting in greater damage to soldiers behind the initial target.'],
  ['Linear Comp', 'Reduces horizontal recoil in favor of more stable vertical recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  ['Adjustable Angled', 'Marginally reduces recoil, improves weapon draw speed, and enables a slightly faster transition to aim down sights (ADS) at the cost of ADS accuracy while moving.'],
  ['17" FLUTED', 'Lightened barrel that improves aim down sights (ADS) accuracy while moving and enables a fast transition to ADS.'],
  ['50RND LOOSE BELT', 'Ammunition belt that improves weapon draw speed and weapon sway as well as transition to aim down sights (ADS) and movement speed while ADS.'],
  ['660MM VMW', 'Long heavy barrel for mounted use. Improves firing accuracy during sustained fire and increases projectile velocity at the cost of weapon draw speed.'],
  ['24" BRAVO', 'Long heavy barrel that increases projectile velocity and improves accuracy during sustained fire at the cost of weapon draw speed.'],
  ['20" OH', 'Lightened barrel that improves aim down sights (ADS) accuracy while moving and enables a fast transition to ADS.'],
]);
const descriptionRows = review.records.filter(row => row.stats && /^[a-z]/.test(row.attachmentDescription ?? ''));
for (const row of descriptionRows) {
  const corrected = cleanDescriptions.get(row.attachmentName);
  if (!corrected) throw new Error(`No reviewed description correction for ${row.weaponName}: ${row.attachmentName}`);
  row.attachmentDescription = corrected;
  row.mappingReviewStatus = 'visually-checked';
  row.notes = [...new Set([...(row.notes ?? []).filter(item => !/Description begins with a lowercase letter/.test(item)), 'Attachment description leading text was visually restored from the source screenshot on 2026-07-28.'])];
}
if (descriptionRows.length !== 78) throw new Error(`Expected 78 lowercase description repairs, got ${descriptionRows.length}`);

const sidearmByPath = new Map(sidearmComparisons.map(item => [mapPath(item.sourcePath).toLowerCase(), { ...item, sourcePath: mapPath(item.sourcePath), sourceName: path.basename(mapPath(item.sourcePath)) }]));
let sidearmRows = 0;
for (const row of review.records.filter(item => item.stats && item.source.currentPath.includes(`${path.sep}Sidearm${path.sep}`))) {
  const extracted = sidearmByPath.get(row.source.currentPath.toLowerCase());
  if (!extracted) throw new Error(`Missing sidearm comparison extraction: ${row.source.currentPath}`);
  row.statComparisons = extracted.comparisons;
  row.notes = [...new Set([...(row.notes ?? []), 'Red/green comparison colors and arrow directions were extracted from and visually spot-checked against the Sidearm screenshot on 2026-07-28.'])];
  sidearmRows++;
}
if (sidearmRows !== 144) throw new Error(`Expected 144 sidearm detail rows, got ${sidearmRows}`);

const penetrationRows = review.records.filter(row => row.stats && row.attachmentType === 'Ammo' && row.attachmentSubtype === 'Penetration');
for (const row of penetrationRows) {
  if (!(row.stats.recoilAmountDegrees > 0)) throw new Error(`Penetration recoil is not positive: ${row.source.currentPath}`);
  row.stats.collateralMultiplier = 1;
  row.statComparisons ??= {};
  row.statComparisons.collateralMultiplier = { ...(row.statComparisons.collateralMultiplier ?? {}), direction: 'up', effect: 'buff', color: 'green' };
  row.statComparisons.recoilAmountDegrees = { ...(row.statComparisons.recoilAmountDegrees ?? {}), direction: 'up', effect: 'penalty', color: 'red' };
  row.notes = [...new Set([...(row.notes ?? []), 'Penetration ammunition collateral multiplier was corrected to 1.00 and its nonzero weapon-specific recoil value was retained per user review on 2026-07-28.'])];
}
if (penetrationRows.length !== 53) throw new Error(`Expected 53 Penetration rows, got ${penetrationRows.length}`);

const directStatFixes = new Map([
  ['BROD 3|48|rateOfFireRpm', 830],
  ['CZ3A1|33|adsMoveSpeedMultiplier', 1],
  ['PP-19|32|adsMoveSpeedMultiplier', 1],
  ['L85A3|41|adsMoveSpeedMultiplier', 0.75],
  ['L85A3|51|adsMoveSpeedMultiplier', 0.67],
]);
for (const [key, value] of directStatFixes) {
  const [weapon, orderText, field] = key.split('|');
  const row = review.records.find(item => item.weaponName === weapon && item.source.captureOrder === Number(orderText) && item.stats);
  if (!row) throw new Error(`Missing direct stat row: ${key}`);
  row.stats[field] = value;
  row.notes = [...new Set([...(row.notes ?? []), note])];
}

const canonicalFiles = [
  'raw-ocr.json', 'panel-ocr.json', 'value-ocr.json', 'cost-ocr.json', 'recoil-ocr.json', 'recoil-value-ocr.json',
  'field-ocr.json', 'highlight-cards.json', 'recoil-visual-map.json', 'visual-stat-map.json', 'capture-order.json',
  'rename-manifest.json', 'rename-provenance.json', 'coverage-report.json', 'manual-review-overrides.json',
];
const docs = new Map(canonicalFiles.filter(name => fs.existsSync(path.join(auditRoot, name))).map(name => [name, updateCurrentReferences(read(name))]));

const canonicalComparisons = updateCurrentReferences(read('stat-comparisons.json'));
const mergedComparisons = canonicalComparisons.filter(item => !String(item.sourcePath ?? '').includes(`${path.sep}Sidearm${path.sep}`));
mergedComparisons.push(...sidearmByPath.values());
docs.set('stat-comparisons.json', mergedComparisons);

const manual = docs.get('manual-review-overrides.json');
function manualFor(row) {
  let override = manual.overrides.find(item => item.sourcePath && path.resolve(item.sourcePath).toLowerCase() === path.resolve(row.source.currentPath).toLowerCase());
  if (!override) {
    override = { weaponName: row.weaponName, attachmentType: row.attachmentType, attachmentName: row.attachmentName, sourcePath: row.source.currentPath, sourceFilename: path.basename(row.source.currentPath), updates: {}, comparisons: {}, replaceComparisons: false, evidence: [] };
    manual.overrides.push(override);
  }
  override.sourcePath = row.source.currentPath;
  override.sourceFilename = path.basename(row.source.currentPath);
  override.attachmentType = row.attachmentType;
  override.attachmentName = row.attachmentName;
  override.updates ??= {};
  override.comparisons ??= {};
  override.evidence ??= [];
  return override;
}
for (const { row } of taxonomyRows) manualFor(row).updates.attachmentType = row.attachmentType;
for (const row of descriptionRows) manualFor(row).updates.attachmentDescription = row.attachmentDescription;
for (const row of review.records.filter(item => item.stats && item.source.currentPath.includes(`${path.sep}Sidearm${path.sep}`))) {
  const override = manualFor(row);
  override.comparisons = row.statComparisons;
  override.replaceComparisons = true;
  override.evidence.push({ kind: 'direct-sidearm-comparison-screenshot-review', reviewDate: '2026-07-28' });
}
for (const row of penetrationRows) {
  const override = manualFor(row);
  override.updates.collateralMultiplier = 1;
  override.updates.recoilAmountDegrees = row.stats.recoilAmountDegrees;
  override.comparisons = { ...override.comparisons, collateralMultiplier: row.statComparisons.collateralMultiplier, recoilAmountDegrees: row.statComparisons.recoilAmountDegrees };
  override.evidence.push({ kind: 'user-reviewed-penetration-stat-correction', reviewDate: '2026-07-28' });
}
for (const [key, value] of directStatFixes) {
  const [weapon, orderText, field] = key.split('|');
  const row = review.records.find(item => item.weaponName === weapon && item.source.captureOrder === Number(orderText) && item.stats);
  manualFor(row).updates[field] = value;
}
manual.generatedAt = now;

const captureOrder = docs.get('capture-order.json');
for (const entry of captureOrder.entries ?? []) {
  if (entry.attachmentName === 'Range Finder') entry.attachmentType = 'Light';
  if (entry.weaponName === 'VZ. 61' && /^(?:7|8|9|10|11|12|13|14|15|16|17|18|19)_/.test(entry.currentFilename ?? '')) entry.attachmentType = 'Grip/Laser/Light';
}
const coverage = docs.get('coverage-report.json');
for (const weapon of coverage.weapons ?? []) for (const row of weapon.records ?? []) {
  if (row.name === 'Range Finder') row.type = 'Light';
  if (weapon.weapon === 'VZ. 61' && ['Grip', 'Laser/Light'].includes(row.type) && /(?:None|Stubby|Handstop|Taclight|Flashlight|MW|Combo)/i.test(row.name)) row.type = 'Grip/Laser/Light';
}
coverage.generatedAt = now;
if (coverage.totals) coverage.totals.comparisonIndicators = review.records.reduce((sum, row) => sum + Object.keys(row.statComparisons ?? {}).length, 0);

const backupDir = path.join(auditRoot, 'backups', `pre-comparison-taxonomy-description-${now.replace(/[-:.TZ]/g, '')}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const name of ['attachment-screenshot-review.json', 'stat-comparisons.json', ...canonicalFiles]) {
  const source = path.join(auditRoot, name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(backupDir, name));
}

for (const { current, next } of taxonomyRows) fs.renameSync(current, next);
review.generatedAt = now;
write('attachment-screenshot-review.json', review);
for (const [name, doc] of docs) write(name, doc);

console.log(JSON.stringify({
  backupDir,
  renamedScreenshots: taxonomyRows.length,
  rangeFinderRows: taxonomyRows.filter(item => item.row.attachmentName === 'Range Finder').length,
  vzCombinedRows: taxonomyRows.filter(item => item.row.weaponName === 'VZ. 61').length,
  sidearmComparisonRows: sidearmRows,
  sidearmIndicators: review.records.filter(item => item.stats && item.source.currentPath.includes(`${path.sep}Sidearm${path.sep}`)).reduce((sum, row) => sum + Object.keys(row.statComparisons ?? {}).length, 0),
  penetrationRows: penetrationRows.length,
  descriptionRepairs: descriptionRows.length,
  directStatFixes: [...directStatFixes],
}, null, 2));

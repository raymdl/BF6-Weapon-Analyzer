import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('C:/Users/royal/Documents/BF6 Project');
const auditRoot = path.join(projectRoot, 'outputs', 'attachment-audit');
const read = (name) => JSON.parse(fs.readFileSync(path.join(auditRoot, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(auditRoot, name), `${JSON.stringify(value, null, 2)}\n`);
const review = read('attachment-screenshot-review.json');
const manual = read('manual-review-overrides.json');
const fieldOcr = read('field-ocr-null-refresh-20260728.json');
const details = review.records.filter((row) => row.stats);
const statFields = Object.keys(details[0].stats);
const now = new Date().toISOString();

const pathKey = (value) => path.resolve(value).toLowerCase();
const rowByPath = new Map(details.map((row) => [pathKey(row.source.currentPath), row]));
const ocrByKey = new Map(fieldOcr.map((item) => [`${pathKey(item.sourcePath)}|${item.field}`, item]));
const changes = { nullRepairs: [], fireModeRepairs: [], descriptionRepairs: [] };

function numericCandidates(item) {
  if (!item) return [];
  return ['normal', 'threshold', 'inverted']
    .map((pass) => item.passes?.[pass]?.text ?? '')
    .filter(Boolean)
    .map((text) => text.replace(/[ØøOo]/g, '0').replace(/[Il]/g, '1').replace(/,/g, '.').replace(/\s+/g, ' ').trim());
}

function integerFromOcr(item) {
  for (const text of numericCandidates(item)) {
    const match = text.match(/\d+/g);
    if (!match) continue;
    const value = Number(match.join(''));
    if (Number.isInteger(value) && value > 0 && value <= 200) return value;
  }
  return null;
}

const directValues = new Map([
  ['28_L85A3_Grip_Ribbed_Stubby.png|control', 50],
  ['35_L85A3_Grip_Full_Angled.png|control', 50],
  ['53_L85A3_Ammo_Hollow_Point.png|headshotMultiplier', 1.57],
  ['54_L85A3_Ammo_Synthetic.png|headshotMultiplier', 1.8],
  ['30_DRS-IAR_Grip_Slim_Handstop.png|mobility', 50],
  ['32_DRS-IAR_Grip_Slim_Angled.png|mobility', 50],
  ['6_NVO-228E_Muzzle_Compensated_Brake.png|hipfire', 40],
  ['8_NVO-228E_Muzzle_Linear_Comp.png|hipfire', 40],
  ['19_RPKM_Light_Flashlight.png|precision', 35],
  ['20_RPKM_Light_Taclight_-_Hipfire.png|precision', 35],
  ['8_KTS100 MK8_Muzzle_Linear_Comp.png|recoilVariationDegrees', 7],
]);

function resolveNull(row, field) {
  const basename = path.basename(row.source.currentPath);
  const direct = directValues.get(`${basename}|${field}`);
  if (direct !== undefined) return { value: direct, evidence: 'direct-screenshot-review' };
  if (field === 'spotOnFire3dM') {
    if (row.statComparisons?.[field]?.direction !== 'down' || row.attachmentType !== 'Muzzle' || !/(Flash Hider|Flash Comp|Suppressor)/i.test(row.attachmentName)) throw new Error(`Unsafe zero spot-range repair: ${row.source.currentPath}`);
    return { value: 0, evidence: 'direct-screenshot-zero-display-rule' };
  }
  if (field === 'opponentHealthRegenDelaySeconds' && row.attachmentName === 'Frangible') return { value: 9, evidence: 'direct-screenshot-frangible-display' };
  if (field === 'opponentHealthRegenDelaySeconds' && row.weaponName === 'NVO-228E') return { value: 5, evidence: 'field-crop-ocr-confirmed-weapon-panel' };
  if (field === 'magazineSize') {
    const normalized = row.attachmentName.toUpperCase().replace(/I/g, '1').replace(/O/g, '0');
    const match = normalized.match(/(\d+)\s*RND/);
    if (match) return { value: Number(match[1]), evidence: 'direct-screenshot-attachment-name-and-stat-display' };
  }
  if (field === 'reloadTimeSeconds') {
    const values = new Map([['L85A3', 2.767], ['M250', 5.75], ['NVO-228E', 2.5]]);
    if (values.has(row.weaponName)) return { value: values.get(row.weaponName), evidence: 'field-crop-ocr-confirmed-weapon-panel' };
  }
  const item = ocrByKey.get(`${pathKey(row.source.currentPath)}|${field}`);
  if (['magazineSize', 'hipfire', 'precision', 'control', 'mobility'].includes(field)) {
    const value = integerFromOcr(item);
    if (value !== null) return { value, evidence: 'field-crop-ocr' };
  }
  if (field === 'headshotMultiplier') {
    if (row.weaponName === 'NVO-228E') return { value: 1.4, evidence: 'field-crop-ocr-confirmed-weapon-panel' };
    for (const text of numericCandidates(item)) {
      const match = text.match(/1\s*\.\s*(\d{1,2})/);
      if (match) return { value: Number(`1.${match[1]}`), evidence: 'field-crop-ocr' };
      if (/1\s*\.\s*40/.test(text)) return { value: 1.4, evidence: 'field-crop-ocr' };
    }
  }
  throw new Error(`No evidence-bound repair for ${row.weaponName}|${basename}|${field}`);
}

for (const row of details) {
  for (const field of statFields) {
    if (row.stats[field] !== null && row.stats[field] !== undefined) continue;
    const { value, evidence } = resolveNull(row, field);
    row.stats[field] = value;
    if (row.statFieldReasons) delete row.statFieldReasons[field];
    changes.nullRepairs.push({ sourcePath: row.source.currentPath, weaponName: row.weaponName, attachmentName: row.attachmentName, field, value, evidence });
  }
}

const fireModeTargets = new Map([
  ['KORD 6P67', ['AUTO', 'BURST', 'SINGLE']],
  ['SG 553R', ['AUTO', 'BURST', 'SINGLE']],
  ['M433', ['AUTO', 'SINGLE']],
]);
for (const row of details) {
  const modes = fireModeTargets.get(row.weaponName);
  if (!modes) continue;
  if (JSON.stringify(row.stats.fireModes) !== JSON.stringify(modes)) {
    changes.fireModeRepairs.push({ sourcePath: row.source.currentPath, weaponName: row.weaponName, before: row.stats.fireModes, after: modes });
    row.stats.fireModes = [...modes];
  }
}

const railCover = details.find((row) => path.basename(row.source.currentPath) === '43_M240L_Ergonomics_Rail_Cover.png');
if (!railCover) throw new Error('M240L Rail Cover record not found');
if (!railCover.attachmentDescription) {
  railCover.attachmentDescription = 'Improves weapon draw speed.';
  changes.descriptionRepairs.push({ sourcePath: railCover.source.currentPath, value: railCover.attachmentDescription });
}

function manualFor(row) {
  let override = manual.overrides.find((item) => item.sourcePath && pathKey(item.sourcePath) === pathKey(row.source.currentPath));
  if (!override) {
    override = { weaponName: row.weaponName, attachmentType: row.attachmentType, attachmentName: row.attachmentName, sourcePath: row.source.currentPath, sourceFilename: path.basename(row.source.currentPath), updates: {}, comparisons: {}, replaceComparisons: false, evidence: [] };
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

for (const repair of changes.nullRepairs) {
  const row = rowByPath.get(pathKey(repair.sourcePath));
  const override = manualFor(row);
  override.updates[repair.field] = repair.value;
  if (row.statComparisons?.[repair.field]) override.comparisons[repair.field] = row.statComparisons[repair.field];
  const evidence = { kind: repair.evidence, source: row.source.currentPath, reviewDate: '2026-07-28' };
  if (!override.evidence.some((item) => JSON.stringify(item) === JSON.stringify(evidence))) override.evidence.push(evidence);
}
for (const row of details.filter((item) => fireModeTargets.has(item.weaponName))) {
  const override = manualFor(row);
  override.updates.fireModes = row.stats.fireModes;
  const evidence = { kind: 'direct-screenshot-fire-mode-panel-review', source: row.source.currentPath, reviewDate: '2026-07-28' };
  if (!override.evidence.some((item) => JSON.stringify(item) === JSON.stringify(evidence))) override.evidence.push(evidence);
}
manualFor(railCover).updates.attachmentDescription = railCover.attachmentDescription;
manualFor(railCover).evidence.push({ kind: 'direct-screenshot-description-review', source: railCover.source.currentPath, reviewDate: '2026-07-28' });

const repairNote = 'Previously blank displayed stat value was recovered from the source screenshot or its field-specific OCR crop on 2026-07-28.';
for (const row of details.filter((item) => changes.nullRepairs.some((repair) => pathKey(repair.sourcePath) === pathKey(item.source.currentPath)))) row.notes = [...new Set([...(row.notes ?? []), repairNote])];
for (const row of details.filter((item) => fireModeTargets.has(item.weaponName))) row.notes = [...new Set([...(row.notes ?? []), 'Fire modes were directly reconciled against the screenshot panel on 2026-07-28.'])];
railCover.notes = [...new Set([...(railCover.notes ?? []), 'Attachment description was directly transcribed from the screenshot on 2026-07-28.'])];

const remainingNulls = details.flatMap((row) => statFields.filter((field) => row.stats[field] === null || row.stats[field] === undefined).map((field) => `${row.source.currentPath}|${field}`));
if (remainingNulls.length) throw new Error(`Stat nulls remain: ${remainingNulls.slice(0, 5).join(', ')}`);
const invalidDescriptions = details.filter((row) => row.attachmentName !== 'None' && !row.attachmentDescription);
if (invalidDescriptions.length) throw new Error(`Non-None descriptions remain blank: ${invalidDescriptions.map((row) => row.source.currentPath).join(', ')}`);
for (const [weapon, modes] of fireModeTargets) {
  const rows = details.filter((row) => row.weaponName === weapon);
  if (!rows.length || rows.some((row) => JSON.stringify(row.stats.fireModes) !== JSON.stringify(modes))) throw new Error(`${weapon} fire-mode repair failed`);
}

const coverage = read('coverage-report.json');
for (const weaponCoverage of coverage.weapons ?? []) {
  const weaponDetails = details.filter((row) => row.weaponName === weaponCoverage.weapon);
  weaponCoverage.unreadableOrObscuredFields = weaponDetails.filter((row) => Object.keys(row.statFieldReasons ?? {}).length).map((row) => ({ source: path.basename(row.source.currentPath), fields: Object.keys(row.statFieldReasons), note: 'field-specific reason retained in review JSON' }));
  weaponCoverage.statCoverage = Object.fromEntries(statFields.map((field) => [field, { populated: weaponDetails.filter((row) => row.stats[field] !== null && row.stats[field] !== undefined).length, total: weaponDetails.length }]));
  coverage.statCoverageByWeapon[weaponCoverage.weapon] = weaponCoverage.statCoverage;
}

review.generatedAt = now;
review.recordCount = review.records.length;
review.attachmentDetailCount = details.length;
review.mappingReviewedCount = review.records.filter((row) => row.mappingReviewStatus === 'visually-checked').length;
manual.generatedAt = now;
coverage.generatedAt = now;
coverage.totals.records = review.records.length;
coverage.totals.detailRecords = details.length;
coverage.totals.fullyTranscribedNewClass = details.filter((row) => statFields.every((field) => row.stats[field] !== null && row.stats[field] !== undefined) && row.attachmentCost !== null).length;
coverage.totals.unreadableOrObscured = coverage.weapons.reduce((sum, weapon) => sum + (weapon.unreadableOrObscuredFields?.length ?? 0), 0);
coverage.totals.populatedFieldNullReasons = review.records.reduce((sum, row) => sum + Object.keys(row.statFieldReasons ?? {}).length, 0);
coverage.totals.staleCurrentPaths = review.records.filter((row) => !fs.existsSync(row.source.currentPath)).length;

const backupDir = path.join(auditRoot, 'backups', `pre-null-fire-mode-audit-${now.replace(/[-:.TZ]/g, '')}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const name of ['attachment-screenshot-review.json', 'manual-review-overrides.json', 'coverage-report.json']) fs.copyFileSync(path.join(auditRoot, name), path.join(backupDir, name));
write('attachment-screenshot-review.json', review);
write('manual-review-overrides.json', manual);
write('coverage-report.json', coverage);
write('null-and-fire-mode-audit-summary-20260728.json', { generatedAt: now, backupDir, ...changes });

console.log(JSON.stringify({ backupDir, nullRepairs: changes.nullRepairs.length, fireModeRepairs: changes.fireModeRepairs.length, descriptionRepairs: changes.descriptionRepairs.length, remainingStatNulls: remainingNulls.length, invalidDescriptions: invalidDescriptions.length, fireModeRows: Object.fromEntries([...fireModeTargets].map(([weapon]) => [weapon, details.filter((row) => row.weaponName === weapon).length])) }, null, 2));

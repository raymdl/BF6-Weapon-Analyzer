import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('C:/Users/royal/Documents/BF6 Project');
const auditRoot = path.join(projectRoot, 'migration', '1.3.3.0', 'attachment-audit');
const missingRoot = path.join(projectRoot, 'Weapon Attachments', 'Missing', 'AK-205');
const canonicalRoot = path.join(projectRoot, 'Weapon Attachments', 'Carbine', 'AK-205');
const backupRoot = path.join(auditRoot, 'pre-ak205-laser-recapture-20260728');
const freshOcrPath = path.join(auditRoot, 'raw-ocr-ak205-laser-recapture-20260728.json');

const captures = [
  { order: 52, source: 'Battlefield 6 Screenshot 2026.07.28 - 19.57.33.80 (Medium).png', canonical: '52_AK-205_Laser_None.png', name: 'None', hash: '7D779647B8DC59095328F765FD021C20D1BD67791A6A8C6C6A8D75E54DA5DC7D', hipfire: 47, mobility: 60 },
  { order: 53, source: 'Battlefield 6 Screenshot 2026.07.28 - 19.57.35.77 (Medium).png', canonical: '53_AK-205_Laser_5_MW_Red.png', name: '5 MW Red', hash: '6E45E5EC10DF6D99105E68AD3231F50B3B9921F83D77F2DFD021AECC9417FDE5', hipfire: 54, mobility: 60 },
  { order: 54, source: 'Battlefield 6 Screenshot 2026.07.28 - 19.57.37.36 (Medium).png', canonical: '54_AK-205_Laser_50_MW_Violet.png', name: '50 MW Violet', hash: 'C4A9953C2DBB81AD9F02F1601914E40359D700F35AB1E782B90C8922FED13914', hipfire: 47, mobility: 64 },
  { order: 55, source: 'Battlefield 6 Screenshot 2026.07.28 - 19.57.39.19 (Medium).png', canonical: '55_AK-205_Laser_5_MW_Green.png', name: '5 MW Green', hash: 'DC9D032400F588F2ED732219AA4BC8C0FC011F874B23A0B473A64BBB9A12FC49', hipfire: 62, mobility: 60 },
  { order: 56, source: 'Battlefield 6 Screenshot 2026.07.28 - 19.57.40.75 (Medium).png', canonical: '56_AK-205_Laser_50_MW_Green.png', name: '50 MW Green', hash: 'E1438DA384EA02E3C7DEC10F41142CECB4911B1E4BC59226BF27459C768A9A2D', hipfire: 71, mobility: 60 },
  { order: 57, source: 'Battlefield 6 Screenshot 2026.07.28 - 19.57.42.44 (Medium).png', canonical: '57_AK-205_Laser_50_MW_Blue.png', name: '50 MW Blue', hash: '3C681DCC19C46E4D76CD8E1B1E2440C7509B86D168629B6E0E4B41BF7897C94A', hipfire: 62, mobility: 64 },
  { order: 58, source: 'Battlefield 6 Screenshot 2026.07.28 - 19.57.44.27 (Medium).png', canonical: '58_AK-205_Laser_120_MW_Blue.png', name: '120 MW Blue', hash: '7328BEE550F2B54BF52B39900C6F136F83B5E01B1F22F9538A8436A012DC09C0', hipfire: 71, mobility: 64 },
];

const artifactNames = [
  'attachment-screenshot-review.json', 'manual-review-overrides.json', 'raw-ocr.json',
  'raw-ocr-carbine.json', 'capture-order.json', 'rename-provenance.json',
  'visual-stat-map.json', 'stat-comparisons.json', 'coverage-report.json',
];
const read = name => JSON.parse(fs.readFileSync(path.join(auditRoot, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(auditRoot, name), `${JSON.stringify(value, null, 2)}\n`);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const isLaserPath = value => captures.some(capture => path.resolve(value ?? '').toLowerCase() === path.join(canonicalRoot, capture.canonical).toLowerCase());

for (const root of [missingRoot, canonicalRoot, auditRoot]) {
  if (!path.resolve(root).toLowerCase().startsWith(projectRoot.toLowerCase())) throw new Error(`Path escaped project root: ${root}`);
}
if (!fs.existsSync(freshOcrPath)) throw new Error(`Fresh OCR input is missing: ${freshOcrPath}`);
const freshOcr = JSON.parse(fs.readFileSync(freshOcrPath, 'utf8'));
if (freshOcr.length !== captures.length) throw new Error(`Expected ${captures.length} fresh OCR records, found ${freshOcr.length}`);

fs.mkdirSync(backupRoot, { recursive: true });
for (const name of artifactNames) {
  const source = path.join(auditRoot, name);
  const backup = path.join(backupRoot, name);
  if (!fs.existsSync(source)) throw new Error(`Required audit artifact is missing: ${source}`);
  if (!fs.existsSync(backup)) fs.copyFileSync(source, backup);
}

for (const capture of captures) {
  const source = path.join(missingRoot, capture.source);
  const destination = path.join(canonicalRoot, capture.canonical);
  const sourceExists = fs.existsSync(source);
  const destinationIsReplacement = fs.existsSync(destination) && hash(destination) === capture.hash;
  if (!sourceExists && !destinationIsReplacement) throw new Error(`Neither staged replacement nor installed replacement exists for ${capture.canonical}`);
  if (sourceExists) {
    if (hash(source) !== capture.hash) throw new Error(`Replacement hash mismatch: ${source}`);
    if (fs.existsSync(destination)) fs.unlinkSync(destination);
    fs.renameSync(source, destination);
  }
  if (hash(destination) !== capture.hash) throw new Error(`Installed screenshot hash mismatch: ${destination}`);
}

const detailedStats = capture => ({
  damage: 20,
  rateOfFireRpm: 720,
  magazineSize: 30,
  hipfire: capture.hipfire,
  precision: 88,
  control: 57,
  mobility: capture.mobility,
  fireModes: 'AUTO/SINGLE',
  reloadTimeSeconds: 2.337,
  muzzleVelocityMps: 708,
  adsTimeMs: 200,
  headshotMultiplier: 1.4,
  longRangeDamage: 12,
  spotOnFire3dM: 54,
  spotOnFire2dM: 150,
  opponentHealthRegenDelaySeconds: 5,
  collateralMultiplier: 0.75,
  reloadInAds: false,
  adsMoveSpeedMultiplier: 0.67,
  sprintRecoveryMs: 133,
  recoilAmountDegrees: 0.5,
  recoilVariationDegrees: 7.4,
});

const freshByName = new Map(freshOcr.map(record => [record.sourceName, record]));
const review = read('attachment-screenshot-review.json');
for (const capture of captures) {
  const row = review.records.find(record => record.weaponName === 'AK-205' && record.attachmentType === 'Laser' && record.source?.captureOrder === capture.order);
  if (!row || row.attachmentName !== capture.name) throw new Error(`Canonical review identity mismatch for AK-205 order ${capture.order}`);
  const fresh = freshByName.get(capture.source);
  if (!fresh) throw new Error(`Fresh OCR row missing for ${capture.source}`);
  row.stats = detailedStats(capture);
  row.statFieldReasons = {};
  row.source.originalPath = path.join(missingRoot, capture.source);
  row.source.originalFilename = capture.source;
  row.source.currentPath = path.join(canonicalRoot, capture.canonical);
  row.source.proposedFilename = capture.canonical;
  row.source.resolution = `${fresh.width}x${fresh.height}`;
  row.source.rawFullScreenOcr = fresh.text;
  row.mappingReviewStatus = 'visually-checked';
  row.notes = (row.notes ?? []).filter(note => !/Compact accessory-selector layout|compact-panel lower fields|lower detail fields are not displayed/i.test(note));
  row.notes = [...new Set([...row.notes, 'Replacement detailed compact screenshot was directly reviewed on 2026-07-28; every displayed lower-panel field was transcribed and the former compact-layout null reasons were removed.'])];
}
review.generatedAt = new Date().toISOString();
review.recordCount = review.records.length;
review.attachmentDetailCount = review.records.filter(record => record.stats).length;
write('attachment-screenshot-review.json', review);

const manual = read('manual-review-overrides.json');
for (const capture of captures) {
  const currentPath = path.join(canonicalRoot, capture.canonical);
  const override = manual.overrides.find(row => row.weaponName === 'AK-205' && row.attachmentType === 'Laser' && path.resolve(row.sourcePath).toLowerCase() === currentPath.toLowerCase());
  if (!override || override.attachmentName !== capture.name) throw new Error(`Manual override mismatch for AK-205 order ${capture.order}`);
  const description = override.updates?.attachmentDescription;
  override.updates = { ...detailedStats(capture), ...(description ? { attachmentDescription: description } : {}) };
  override.replaceComparisons = true;
  override.mappingReviewStatus = 'visually-checked';
  override.evidence = [...new Map([...(override.evidence ?? []), {
    kind: 'direct-detailed-stat-screenshot-review',
    source: currentPath,
    originalSource: path.join(missingRoot, capture.source),
    reviewDate: '2026-07-28',
  }].map(item => [JSON.stringify(item), item])).values()];
}
manual.generatedAt = new Date().toISOString();
write('manual-review-overrides.json', manual);

const replaceCanonicalRawRows = rows => {
  const retained = rows.filter(row => !isLaserPath(row.sourcePath));
  for (const capture of captures) {
    const fresh = freshByName.get(capture.source);
    retained.push({ ...fresh, weapon: 'AK-205', sourcePath: path.join(canonicalRoot, capture.canonical), sourceName: capture.canonical });
  }
  return retained;
};
write('raw-ocr.json', replaceCanonicalRawRows(read('raw-ocr.json')));

const historical = read('raw-ocr-carbine.json');
const ak205Indexes = historical.map((row, index) => row.weapon === 'AK-205' ? index : -1).filter(index => index >= 0);
if (ak205Indexes.length !== 59) throw new Error(`Expected 59 historical AK-205 captures, found ${ak205Indexes.length}`);
for (const capture of captures) {
  const fresh = freshByName.get(capture.source);
  historical[ak205Indexes[capture.order]] = { ...fresh, weapon: 'AK-205', sourcePath: path.join(missingRoot, capture.source), sourceName: capture.source };
}
write('raw-ocr-carbine.json', historical);

for (const name of ['capture-order.json', 'rename-provenance.json']) {
  const document = read(name);
  const rows = Array.isArray(document) ? document : document.entries;
  for (const capture of captures) {
    const row = rows.find(item => item.weaponName === 'AK-205' && item.captureOrder === capture.order);
    if (!row) throw new Error(`${name} lacks AK-205 order ${capture.order}`);
    row.originalPath = path.join(missingRoot, capture.source);
    row.originalFilename = capture.source;
    if ('captureTimestamp' in row) row.captureTimestamp = '2026-07-28T19:57:00-04:00';
  }
  write(name, document);
}

const statFields = Object.keys(detailedStats(captures[0]));
const visualStats = read('visual-stat-map.json').filter(row => !isLaserPath(row.sourcePath));
for (const capture of captures) for (const [field, value] of Object.entries(detailedStats(capture))) visualStats.push({
  sourcePath: path.join(canonicalRoot, capture.canonical),
  field,
  value,
  evidence: 'Direct transcription from the reviewed 2026-07-28 AK-205 detailed compact recapture; the field is visibly displayed.',
});
write('visual-stat-map.json', visualStats);

const comparisons = read('stat-comparisons.json').filter(row => !isLaserPath(row.sourcePath));
for (const capture of captures) {
  const row = review.records.find(record => record.weaponName === 'AK-205' && record.source.captureOrder === capture.order);
  comparisons.push({ weapon: 'AK-205', sourcePath: row.source.currentPath, sourceName: capture.canonical, resolution: '1365x768', comparisons: row.statComparisons ?? {} });
}
write('stat-comparisons.json', comparisons);

const coverage = read('coverage-report.json');
const allDetails = review.records.filter(record => record.stats);
const ak205Coverage = coverage.weapons.find(item => item.weapon === 'AK-205');
if (ak205Coverage) {
  const ak205Records = review.records.filter(record => record.weaponName === 'AK-205');
  const ak205Details = ak205Records.filter(record => record.stats);
  ak205Coverage.records = ak205Records.map(record => ({ type: record.attachmentType, name: record.attachmentName, subtype: record.attachmentSubtype, sourcePath: record.source.currentPath, duplicate: false, status: record.stats ? record.reviewStatus : 'context-only' }));
  ak205Coverage.unreadableOrObscuredFields = ak205Details.filter(record => Object.keys(record.statFieldReasons ?? {}).length).map(record => ({ source: path.basename(record.source.currentPath), fields: Object.keys(record.statFieldReasons), note: 'field-specific reason retained in review JSON' }));
  ak205Coverage.statCoverage = Object.fromEntries(statFields.map(field => [field, { populated: ak205Details.filter(record => record.stats[field] !== null && record.stats[field] !== undefined).length, total: ak205Details.length }]));
  coverage.statCoverageByWeapon['AK-205'] = ak205Coverage.statCoverage;
}
coverage.generatedAt = new Date().toISOString();
coverage.totals.records = review.records.length;
coverage.totals.detailRecords = allDetails.length;
coverage.totals.fullyTranscribedNewClass = allDetails.filter(record => statFields.every(field => record.stats[field] !== null && record.stats[field] !== undefined) && record.attachmentCost !== null).length;
coverage.totals.unreadableOrObscured = coverage.weapons.reduce((sum, weapon) => sum + (weapon.unreadableOrObscuredFields?.length ?? 0), 0);
coverage.totals.populatedFieldNullReasons = review.records.reduce((sum, record) => sum + Object.keys(record.statFieldReasons ?? {}).length, 0);
coverage.totals.staleCurrentPaths = review.records.filter(record => !fs.existsSync(record.source.currentPath)).length;
write('coverage-report.json', coverage);

console.log(JSON.stringify({
  installedScreenshots: captures.length,
  stagedScreenshotsRemaining: fs.readdirSync(missingRoot).filter(name => name.toLowerCase().endsWith('.png')).length,
  ak205LaserRecords: review.records.filter(record => record.weaponName === 'AK-205' && record.attachmentType === 'Laser').length,
  ak205LaserNullStatCells: review.records.filter(record => record.weaponName === 'AK-205' && record.attachmentType === 'Laser').reduce((sum, record) => sum + Object.values(record.stats).filter(value => value === null).length, 0),
  updatedFieldsPerRecord: statFields.length,
  backupRoot,
}, null, 2));

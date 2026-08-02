import fs from 'node:fs/promises';
import path from 'node:path';

const root = 'C:\\Users\\royal\\Documents\\BF6 Project';
const audit = path.join(root, 'migration', '1.3.3.0', 'attachment-audit');
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const writeJson = async (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const exists = async file => fs.access(file).then(() => true, () => false);
const review = await readJson(path.join(audit, 'attachment-screenshot-review.json'));

const badCanonical = '1_QBZ-192_Muzzle_Single-Port_Brake.png';
const badOriginalStamp = '15.55.12.86';
function transform(value, options = {}) {
  if (Array.isArray(value)) return value.filter(item => {
    const text = JSON.stringify(item);
    if (text.includes(badCanonical)) return false;
    if (options.removeHistoricalBad && text.includes('QBZ-192') && text.includes(badOriginalStamp)) return false;
    return true;
  }).map(item => transform(item, options));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transform(item, options)]));
  if (typeof value !== 'string') return value;
  return value.replace(/(QBZ-192[\\/])(\d+)_QBZ-192_/g, (all, prefix, order) => Number(order) >= 2 ? `${prefix}${Number(order) - 1}_QBZ-192_` : all)
    .replace(/^(\d+)_QBZ-192_/, (all, order) => Number(order) >= 2 ? `${Number(order) - 1}_QBZ-192_` : all);
}

for (const name of ['raw-ocr.json', 'raw-ocr-carbine.json', 'panel-ocr.json', 'value-ocr.json', 'cost-ocr.json', 'field-ocr.json', 'highlight-cards.json', 'recoil-visual-map.json', 'visual-stat-map.json', 'stat-comparisons.json', 'rename-provenance.json']) {
  const file = path.join(audit, name);
  if (!(await exists(file))) continue;
  let document = transform(await readJson(file), { removeHistoricalBad: name === 'raw-ocr-carbine.json' });
  if (name === 'raw-ocr.json') {
    document = document.filter(item => !(item.weapon === 'NVO-228E' && /(?:^|\\)(?:\d+_NVO-228E_Muzzle_|Battlefield 6 Screenshot 2026\.07\.26)/.test(item.sourcePath ?? '')));
    const fresh = await readJson(path.join(audit, 'raw-ocr-nvo-recapture.json'));
    const reviewRows = review.records.filter(item => item.weaponName === 'NVO-228E' && item.attachmentType === 'Muzzle');
    for (const row of reviewRows) {
      const source = fresh.find(item => item.sourceName === row.source.originalFilename);
      if (!source) throw new Error(`Missing fresh OCR for ${row.source.originalFilename}`);
      document.push({ ...source, sourcePath: row.source.currentPath, sourceName: path.basename(row.source.currentPath) });
    }
  }
  if (name === 'stat-comparisons.json') {
    document = document.filter(item => !(item.weapon === 'NVO-228E' && /_NVO-228E_Muzzle_/.test(item.sourcePath ?? '')));
    for (const row of review.records.filter(item => item.weaponName === 'NVO-228E' && item.attachmentType === 'Muzzle')) document.push({ weapon: 'NVO-228E', sourcePath: row.source.currentPath, sourceName: path.basename(row.source.currentPath), resolution: row.source.resolution, comparisons: row.statComparisons });
  }
  await writeJson(file, document);
}

const entries = review.records.map(record => ({
  weaponName: record.weaponName,
  captureOrder: record.source.captureOrder,
  sourcePath: record.source.currentPath,
  sourceFilename: path.basename(record.source.currentPath),
  targetPath: record.source.currentPath,
  targetFilename: path.basename(record.source.currentPath),
  duplicateCapture: false,
  classification: 'already-canonical',
  renameAllowed: true,
}));
const manifest = { generatedAt: new Date().toISOString(), entries };
await writeJson(path.join(audit, 'rename-manifest.json'), manifest);

const oldCoverage = await readJson(path.join(audit, 'coverage-report.json'));
const statFields = Object.keys(review.records.find(record => record.stats)?.stats ?? {});
const weapons = [...new Set(review.records.map(record => record.weaponName))].sort();
const coverageWeapons = weapons.map(weapon => {
  const records = review.records.filter(record => record.weaponName === weapon).sort((a, b) => a.source.captureOrder - b.source.captureOrder);
  const details = records.filter(record => record.stats);
  const previous = oldCoverage.weapons.find(item => item.weapon === weapon);
  const statCoverage = Object.fromEntries(statFields.map(field => [field, { populated: details.filter(record => record.stats[field] !== null && record.stats[field] !== undefined).length, total: details.length }]));
  return {
    weapon,
    screenshotCountBefore: records.length,
    overviewCount: records.filter(record => !record.stats).length,
    records: records.map(record => ({ type: record.attachmentType, name: record.attachmentName, subtype: record.attachmentSubtype, sourcePath: record.source.currentPath, duplicate: false, status: record.stats ? record.reviewStatus : 'context-only' })),
    missing: previous?.missing ?? [],
    duplicates: [],
    unreadableOrObscuredFields: details.filter(record => Object.keys(record.statFieldReasons ?? {}).length).map(record => ({ source: path.basename(record.source.currentPath), fields: Object.keys(record.statFieldReasons), note: 'field-specific reason retained in review JSON' })),
    status: details.every(record => record.reviewStatus === 'reviewed') ? 'reviewed' : 'provisional-review-required',
    screenshotCountAfter: records.length,
    statCoverage,
  };
});
const allDetails = review.records.filter(record => record.stats);
const totals = {
  ...oldCoverage.totals,
  screenshotsBefore: review.records.length,
  screenshotsAfter: review.records.length,
  records: review.records.length,
  detailRecords: allDetails.length,
  fullyTranscribedNewClass: allDetails.filter(record => statFields.every(field => record.stats[field] !== null && record.stats[field] !== undefined) && record.attachmentCost !== null).length,
  fullyReviewed: review.records.filter(record => record.reviewStatus === 'reviewed').length,
  comparisonIndicators: review.records.reduce((sum, record) => sum + Object.keys(record.statComparisons ?? {}).length, 0),
  reviewConflicts: review.records.reduce((sum, record) => sum + (record.reviewConflicts?.length ?? 0), 0),
  unreadableOrObscured: coverageWeapons.reduce((sum, weapon) => sum + weapon.unreadableOrObscuredFields.length, 0),
  mappingReviewed: review.records.filter(record => record.mappingReviewStatus === 'visually-checked').length,
  populatedFieldNullReasons: review.records.reduce((sum, record) => sum + Object.keys(record.statFieldReasons ?? {}).length, 0),
  staleCurrentPaths: 0,
  destinationEscapes: 0,
  destinationCollisions: 0,
  promoted: 0,
};
const manifestSummary = { 'already-canonical': entries.length };
await writeJson(path.join(audit, 'coverage-report.json'), { generatedAt: new Date().toISOString(), captureClass: 'Mixed', weapons: coverageWeapons, statCoverageByWeapon: Object.fromEntries(coverageWeapons.map(item => [item.weapon, item.statCoverage])), manifestSummary, totals });

console.log(JSON.stringify({ refreshedSupportingFiles: true, manifestEntries: entries.length, coverageRecords: totals.records, coverageDetailRecords: totals.detailRecords, unreadableOrObscured: totals.unreadableOrObscured }, null, 2));

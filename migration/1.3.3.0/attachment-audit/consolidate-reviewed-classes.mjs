import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('migration/1.3.3.0/attachment-audit');
const sources = [
  { className: 'DMR', root: path.resolve('migration/1.3.3.0/attachment-audit-dmr') },
  { className: 'Sniper Rifle', root: path.resolve('outputs/sniper-rifle-audit') },
  { className: 'Shotgun', root: path.resolve('outputs/shotgun-audit') },
  { className: 'Sidearm', root: path.resolve('outputs/sidearm-audit') },
];
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const now = new Date().toISOString();
const stamp = now.replace(/[-:TZ.]/g, '').slice(0, 14);
const backup = path.join(root, 'backups', `pre-primary-consolidation-${stamp}`);
fs.mkdirSync(backup, { recursive: true });

const canonicalNames = [
  'attachment-screenshot-review.json', 'raw-ocr.json', 'coverage-report.json',
  'rename-manifest.json', 'manual-review-overrides.json',
];
for (const name of canonicalNames) fs.copyFileSync(path.join(root, name), path.join(backup, name));

const pathClass = (value) => String(value ?? '').match(/[\\/]Weapon Attachments[\\/]([^\\/]+)[\\/]/i)?.[1] ?? null;
const pathOfRecord = (row) => row?.source?.currentPath ?? row?.source?.originalPath ?? row?.sourcePath ?? '';
const pathOfOcr = (row) => row?.sourcePath ?? row?.currentPath ?? row?.path ?? '';
const pathOfManifest = (row) => row?.targetPath ?? row?.sourcePath ?? '';
const pathOfOverride = (row) => row?.sourcePath ?? row?.currentPath ?? '';
const incomingClasses = new Set(sources.map(source => source.className.toLowerCase()));
const retainOtherClasses = (row, pathGetter) => !incomingClasses.has(String(pathClass(pathGetter(row))).toLowerCase());
const mergeByPath = (base, incoming, pathGetter) => {
  const merged = new Map();
  for (const row of [...base, ...incoming]) {
    const key = path.resolve(pathGetter(row)).toLowerCase();
    if (!key) throw new Error('Cannot merge row without a source/current path');
    merged.set(key, row);
  }
  return [...merged.values()];
};

const review = read(path.join(root, 'attachment-screenshot-review.json'));
const incomingReviews = sources.flatMap(source => read(path.join(source.root, 'attachment-screenshot-review.json')).records);
const incomingWeapons = new Set(incomingReviews.map(row => row.weaponName));
const records = mergeByPath(review.records.filter(row => retainOtherClasses(row, pathOfRecord)), incomingReviews, pathOfRecord)
  .sort((a, b) => a.weaponName.localeCompare(b.weaponName) || (a.source?.captureOrder ?? 9999) - (b.source?.captureOrder ?? 9999));
review.generatedAt = now;
review.captureClass = 'Mixed';
review.recordCount = records.length;
review.attachmentDetailCount = records.filter(row => row.attachmentType !== 'Overview').length;
review.mappingReviewedCount = records.filter(row => row.mappingReviewStatus === 'visually-checked').length;
review.weaponsProcessed = [...new Set(records.map(row => row.weaponName))];
review.records = records;
write(path.join(root, 'attachment-screenshot-review.json'), review);

const raw = read(path.join(root, 'raw-ocr.json')).filter(row => retainOtherClasses(row, pathOfOcr));
const incomingRaw = sources.flatMap(source => read(path.join(source.root, 'raw-ocr.json')));
write(path.join(root, 'raw-ocr.json'), mergeByPath(raw, incomingRaw, pathOfOcr));

const manifest = read(path.join(root, 'rename-manifest.json'));
const incomingManifest = sources.flatMap(source => read(path.join(source.root, 'rename-manifest.json')).entries);
manifest.generatedAt = now;
manifest.entries = mergeByPath(manifest.entries.filter(row => retainOtherClasses(row, pathOfManifest)), incomingManifest, pathOfManifest);
write(path.join(root, 'rename-manifest.json'), manifest);

const manual = read(path.join(root, 'manual-review-overrides.json'));
const incomingOverrides = sources.flatMap(source => read(path.join(source.root, 'manual-review-overrides.json')).overrides ?? []);
manual.generatedAt = now;
manual.overrides = mergeByPath((manual.overrides ?? []).filter(row => retainOtherClasses(row, pathOfOverride)), incomingOverrides, pathOfOverride);
write(path.join(root, 'manual-review-overrides.json'), manual);

const coverages = [read(path.join(root, 'coverage-report.json')), ...sources.map(source => read(path.join(source.root, 'coverage-report.json')))];
const coverage = coverages[0];
coverage.generatedAt = now;
coverage.captureClass = 'Mixed';
coverage.weapons = coverages.flatMap((item, index) => index === 0
  ? (item.weapons ?? []).filter(row => !incomingWeapons.has(row.weapon ?? row.weaponName))
  : (item.weapons ?? []));
coverage.statCoverageByWeapon = Object.assign({}, ...coverages.map(item => item.statCoverageByWeapon ?? {}));
coverage.manifestSummary = Object.fromEntries(Object.entries(manifest.entries.reduce((acc, entry) => {
  const key = entry.renameStatus ?? entry.status ?? (entry.renameAllowed ? 'approved' : 'blocked');
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {})));
const details = records.filter(row => row.attachmentType !== 'Overview');
coverage.totals = {
  ...(coverage.totals ?? {}),
  screenshotsBefore: records.length,
  screenshotsAfter: records.length,
  records: records.length,
  detailRecords: details.length,
  fullyReviewed: details.filter(row => row.reviewStatus === 'reviewed').length,
  comparisonIndicators: details.reduce((sum, row) => sum + Object.keys(row.statComparisons ?? {}).length, 0),
  duplicateCaptures: records.filter(row => row.duplicateCapture === true).length,
  mappingReviewed: details.filter(row => row.mappingReviewStatus === 'visually-checked').length,
  staleCurrentPaths: records.filter(row => !fs.existsSync(pathOfRecord(row))).length,
  destinationCollisions: manifest.entries.length - new Set(manifest.entries.map(row => path.resolve(pathOfManifest(row)).toLowerCase())).size,
  promoted: records.filter(row => row.promoted === true).length,
};
write(path.join(root, 'coverage-report.json'), coverage);

const expected = 2275 + 333 + 206 + 190 + 151;
if (records.length !== expected) throw new Error(`Consolidated record count ${records.length} != ${expected}`);
if (manifest.entries.length !== records.length) throw new Error(`Manifest count ${manifest.entries.length} != record count ${records.length}`);
if (coverage.totals.staleCurrentPaths !== 0 || coverage.totals.destinationCollisions !== 0) throw new Error('Consolidated paths are stale or colliding');
console.log(JSON.stringify({ backup, records: records.length, details: details.length, weapons: review.weaponsProcessed.length, rawOcr: mergeByPath(raw, incomingRaw, pathOfOcr).length, manifest: manifest.entries.length, overrides: manual.overrides.length, comparisons: coverage.totals.comparisonIndicators }, null, 2));

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('outputs/attachment-audit');
const reviewPath = path.join(root, 'attachment-screenshot-review.json');
const manualPath = path.join(root, 'manual-review-overrides.json');
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const manual = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
const wanted = [
  ['RPKM', 'Grip', 'Folding Stubby'], ['RPKM', 'Grip', 'Ribbed Stubby'],
  ['RPKM', 'Grip', 'Canted Stubby'], ['RPKM', 'Grip', 'Stippled Stubby'],
  ['RPKM', 'Grip', 'Low-Profile Stubby'], ['RPKM', 'Grip', 'Slim Handstop'],
  ['TR7', 'Laser', '5 MW Green'], ['TR7', 'Laser', '50 MW Blue'],
  ['KTS100 MK8', 'Magazine', '50Rnd Magazine'],
];
const added = [];
for (const [weaponName, attachmentType, attachmentName] of wanted) {
  if (review.records.some(row => row.weaponName === weaponName && row.attachmentType === attachmentType && row.attachmentName === attachmentName)) continue;
  const override = manual.overrides.find(row => row.weaponName === weaponName && row.attachmentType === attachmentType && row.attachmentName === attachmentName);
  if (!override?.updates?.stats) throw new Error(`Missing complete manual capture override for ${weaponName}|${attachmentType}|${attachmentName}`);
  const base = review.records.find(row => row.weaponName === weaponName && row.attachmentType === attachmentType && row.stats);
  if (!base) throw new Error(`Missing base record for ${weaponName}|${attachmentType}`);
  const captureOrder = Number(path.basename(override.sourcePath).match(/^(\d+)_/)?.[1]);
  if (!Number.isInteger(captureOrder)) throw new Error(`Missing capture order in ${override.sourcePath}`);
  const record = {
    ...base,
    weaponName,
    attachmentType,
    attachmentName,
    attachmentSubtype: override.updates.attachmentSubtype,
    attachmentCost: override.updates.attachmentCost,
    attachmentDescription: override.updates.attachmentDescription,
    stats: override.updates.stats,
    statComparisons: override.comparisons ?? {},
    mappingReviewStatus: 'visually-checked',
    notes: ['Manual-only captured attachment restored from its screenshot-complete override after consolidated rebuild.'],
    source: {
      ...base.source,
      originalPath: override.sourcePath,
      originalFilename: path.basename(override.sourcePath),
      currentPath: override.sourcePath,
      proposedFilename: path.basename(override.sourcePath),
      captureOrder,
    },
  };
  review.records.push(record);
  added.push(`${weaponName}|${attachmentType}|${captureOrder}|${attachmentName}`);
}
review.records.sort((a, b) => a.weaponName.localeCompare(b.weaponName) || a.source.captureOrder - b.source.captureOrder);
review.recordCount = review.records.length;
review.attachmentDetailCount = review.records.filter(row => row.stats).length;
review.generatedAt = new Date().toISOString();
fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
console.log(JSON.stringify({ added, records: review.records.length }, null, 2));

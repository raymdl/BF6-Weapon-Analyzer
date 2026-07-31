import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project');
const audit = path.join(root, 'outputs', 'attachment-audit');
const read = name => JSON.parse(fs.readFileSync(path.join(audit, name), 'utf8'));
const review = read('attachment-screenshot-review.json');
const baseline = read('attachment-screenshot-review.reload-idempotence-before.json');
const manual = read('manual-review-overrides.json');
const details = review.records.filter(row => row.stats);
const baselineDetails = baseline.records.filter(row => row.stats);
const fields = Object.keys(details[0].stats);
const nulls = Object.fromEntries(fields.map(field => [field, details.filter(row => row.stats[field] === null).length]));
const baselineNulls = Object.fromEntries(fields.map(field => [field, baselineDetails.filter(row => row.stats[field] === null).length]));
const expectedNulls = {
  damage: 0, rateOfFireRpm: 0, magazineSize: 42, hipfire: 9, precision: 68,
  control: 47, mobility: 108, fireModes: 0, reloadTimeSeconds: 109,
  muzzleVelocityMps: 0, adsTimeMs: 0, headshotMultiplier: 14, longRangeDamage: 0,
  spotOnFire3dM: 68, spotOnFire2dM: 0, opponentHealthRegenDelaySeconds: 21,
  collateralMultiplier: 0, reloadInAds: 0, adsMoveSpeedMultiplier: 0,
  sprintRecoveryMs: 0, recoilAmountDegrees: 0, recoilVariationDegrees: 1,
};
if (review.records.length !== 3164 || details.length !== 3102) throw new Error(`Unexpected corpus size ${review.records.length}/${details.length}`);
for (const field of fields) {
  if (nulls[field] !== expectedNulls[field]) throw new Error(`${field} null count ${nulls[field]} != expected ${expectedNulls[field]}`);
  if (nulls[field] > baselineNulls[field]) throw new Error(`${field} null count regressed above the pre-regression snapshot: ${nulls[field]} > ${baselineNulls[field]}`);
}
if (review.records.filter(row => row.stats && row.attachmentCost === null).length !== 0) throw new Error('Non-Overview attachment cost null remains');
if (review.records.some(row => !fs.existsSync(row.source.currentPath))) throw new Error('A current screenshot path is stale');

const m433 = new Map(review.records.filter(row => row.weaponName === 'M433' && row.stats).map(row => [row.source.captureOrder, row]));
for (const [order, velocity] of [[12, 630], [13, 787], [14, 504], [15, 630]]) if (m433.get(order)?.stats.muzzleVelocityMps !== velocity) throw new Error(`M433 barrel ${order} velocity regression`);
for (const [order, size, reload] of [[36,30,2.384],[37,20,2.11],[38,20,2.384],[39,30,2.11],[40,36,2.384],[41,40,2.384],[42,40,2.11]]) {
  const row = m433.get(order);
  if (row?.stats.magazineSize !== size || row?.stats.reloadTimeSeconds !== reload) throw new Error(`M433 magazine ${order} regression`);
}
const m4 = review.records.find(row => row.weaponName === 'M4A1' && row.source?.captureOrder === 22);
if (m4?.stats.recoilAmountDegrees !== 0.6) throw new Error('M4A1 Classic Vertical recoil regression');
for (const row of review.records.filter(row => row.weaponName === 'M1014' && row.attachmentName === 'SLUGS')) if (row.stats.recoilAmountDegrees !== 2.6) throw new Error('M1014 SLUGS recoil regression');

const groups = new Map();
for (const row of details) {
  const key = `${row.weaponName}|${row.attachmentType}|${row.attachmentName}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}
const duplicateDisagreements = [];
for (const [key, rows] of groups) if (rows.length > 1) for (const field of fields) {
  const values = [...new Set(rows.map(row => row.stats[field]).filter(value => value !== null).map(value => JSON.stringify(value)))];
  if (values.length > 1) duplicateDisagreements.push({ key, field, values });
}
if (duplicateDisagreements.length) throw new Error(`Duplicate stat disagreements: ${JSON.stringify(duplicateDisagreements.slice(0, 5))}`);

const basicBarrels = new Map();
for (const row of details.filter(row => row.attachmentType === 'Barrel' && row.attachmentSubtype === 'Basic')) basicBarrels.set(row.weaponName, (basicBarrels.get(row.weaponName) ?? 0) + 1);
const multipleBasic = [...basicBarrels].filter(([, count]) => count > 1);
if (multipleBasic.length) throw new Error(`Weapons with multiple Basic barrels: ${JSON.stringify(multipleBasic)}`);

const ak205Lasers = details.filter(row => row.weaponName === 'AK-205' && row.attachmentType === 'Laser');
if (ak205Lasers.length !== 7 || ak205Lasers.some(row => fields.some(field => row.stats[field] === null))) throw new Error('AK-205 detailed recapture regression');
if (!manual.overrides.some(row => row.evidence?.some(item => item.kind === 'pre-regression-non-null-json-recovery'))) throw new Error('Recovery was not persisted in the manual override ledger');

console.log(JSON.stringify({
  records: review.records.length,
  detailRecords: details.length,
  totalNulls: Object.values(nulls).reduce((sum, count) => sum + count, 0),
  completeRecords: details.filter(row => fields.every(field => row.stats[field] !== null)).length,
  nonOverviewNullCosts: review.records.filter(row => row.stats && row.attachmentCost === null).length,
  duplicateStatDisagreements: duplicateDisagreements.length,
  recoilNulls: nulls.recoilAmountDegrees,
  staleCurrentPaths: review.records.filter(row => !fs.existsSync(row.source.currentPath)).length,
}, null, 2));

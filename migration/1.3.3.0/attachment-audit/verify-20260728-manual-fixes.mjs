import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('C:/Users/royal/Documents/BF6 Project/migration/1.3.3.0/attachment-audit');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const before = read('attachment-screenshot-review.pre-manual-fix.json');
const review = read('attachment-screenshot-review.json');
const manual = read('manual-review-overrides.json');
const summary = read('manual-fix-reconciliation-summary-20260728.json');
const reloadConsistency = read('cross-type-reload-consistency-summary-20260728.json');
const details = review.records.filter((row) => row.stats);
const key = (value) => path.resolve(value).toLowerCase();
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const round3 = (value) => Math.round(value * 1000) / 1000;
const mode = (values) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];

assert(review.records.length === 3164, `record count ${review.records.length}`);
assert(details.length === 3102, `detail count ${details.length}`);
assert(summary.fieldChanges === 50 && summary.affectedRecords === 46, 'manual-fix summary count mismatch');
assert(review.records.every((row) => fs.existsSync(row.source.currentPath)), 'stale screenshot paths remain');
assert(details.every((row) => Object.values(row.stats).every((value) => value !== null && value !== undefined)), 'null stat remains');
assert(details.every((row) => row.attachmentCost !== null && row.attachmentCost !== undefined), 'null detail cost remains');

const beforeByPath = new Map(before.records.map((row) => [key(row.source.currentPath), row]));
const observed = [];
for (const row of review.records) {
  const prior = beforeByPath.get(key(row.source.currentPath));
  if (!prior) continue;
  if (prior.attachmentSubtype !== row.attachmentSubtype) observed.push({ row, field: 'attachmentSubtype', after: row.attachmentSubtype });
  for (const [field, value] of Object.entries(row.stats ?? {})) if (JSON.stringify(prior.stats?.[field]) !== JSON.stringify(value)) observed.push({ row, field, after: value });
  for (const field of ['attachmentType', 'attachmentCost', 'attachmentName', 'attachmentDescription']) assert(JSON.stringify(prior[field]) === JSON.stringify(row[field]), `unallowlisted direct-edit change: ${row.source.currentPath}|${field}`);
}
assert(observed.length === 79, `observed field changes ${observed.length}`);
assert(observed.every((item) => ['attachmentSubtype', 'reloadTimeSeconds', 'magazineSize', 'muzzleVelocityMps'].includes(item.field)), 'unallowlisted changed stat');
for (const item of observed) {
  const override = manual.overrides.find((entry) => entry.sourcePath && key(entry.sourcePath) === key(item.row.source.currentPath));
  assert(override?.updates?.[item.field] === item.after, `durable override missing: ${item.row.source.currentPath}|${item.field}`);
}

const unaffectedTypes = new Set(['Muzzle', 'Grip', 'Laser', 'Light', 'Laser/Light', 'Grip/Laser/Light', 'Barrel', 'Ammo']);
const weapons = [...new Set(details.map((row) => row.weaponName))];
const baseReload = new Map(weapons.map((weapon) => [weapon, mode(details.filter((row) => row.weaponName === weapon && unaffectedTypes.has(row.attachmentType)).map((row) => row.stats.reloadTimeSeconds))]));
const reloadTargets = details.filter((row) => /Fast Mag/i.test(row.attachmentName) || row.attachmentName === 'Improved Mag Catch');
const expectedReload = (row) => round3(baseReload.get(row.weaponName) / (row.attachmentName === 'Improved Mag Catch' ? 1.063 : 1.13));
const reloadMatches = reloadTargets.filter((row) => row.stats.reloadTimeSeconds === expectedReload(row)).length;
const reloadExceptions = reloadTargets.filter((row) => row.stats.reloadTimeSeconds !== expectedReload(row));
assert(reloadTargets.length === 119 && reloadMatches === 118, `reload model ${reloadMatches}/${reloadTargets.length}`);
assert(reloadExceptions.length === 1 && reloadExceptions[0].weaponName === 'KTS100 MK8' && reloadExceptions[0].attachmentName === '45Rnd Fast Mag' && reloadExceptions[0].stats.reloadTimeSeconds === 2.545, 'unexpected reload-model exception');
assert(round3(baseReload.get('KTS100 MK8') / 1.13 ** 2) === reloadExceptions[0]?.stats.reloadTimeSeconds, 'KTS100 stacked reload model mismatch');

const crossTypeReloadMismatches = weapons.flatMap((weapon) => details.filter((row) => row.weaponName === weapon && unaffectedTypes.has(row.attachmentType) && row.stats.reloadTimeSeconds !== baseReload.get(weapon)));
assert(crossTypeReloadMismatches.length === 0, `cross-type reload mismatches ${crossTypeReloadMismatches.length}`);

const velocityBaseTypes = new Set(['Muzzle', 'Grip', 'Laser', 'Light', 'Laser/Light', 'Grip/Laser/Light', 'Magazine', 'Ergonomics']);
const baseVelocity = new Map(weapons.map((weapon) => [weapon, mode(details.filter((row) => row.weaponName === weapon && velocityBaseTypes.has(row.attachmentType)).map((row) => row.stats.muzzleVelocityMps))]));
const barrels = details.filter((row) => row.attachmentType === 'Barrel');
const barrelMatches = barrels.filter((row) => {
  const subtype = String(row.attachmentSubtype).toLowerCase();
  const multiplier = subtype.includes('short') ? 0.8 : subtype.includes('ext') ? 1.25 : 1;
  return Math.abs(row.stats.muzzleVelocityMps - baseVelocity.get(row.weaponName) * multiplier) <= 1;
}).length;
assert(barrels.length === 216 && barrelMatches === 216, `barrel velocity model ${barrelMatches}/${barrels.length}`);

const shellWeapons = new Set(['DB-12', 'M1014', 'M87A1']);
const capacityRows = details.filter((row) => row.attachmentType === 'Magazine' && /\d+\s*Rnd/i.test(row.attachmentName));
const capacityMismatches = capacityRows.filter((row) => Number(row.attachmentName.match(/(\d+)\s*Rnd/i)[1]) !== row.stats.magazineSize);
const nonShellCapacityMismatches = capacityMismatches.filter((row) => !shellWeapons.has(row.weaponName));
assert(nonShellCapacityMismatches.length === 0, `non-shell capacity mismatches ${nonShellCapacityMismatches.length}`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
assert(reloadConsistency.correctedRecords === 29, `cross-type reconciliation count ${reloadConsistency.correctedRecords}`);
console.log(JSON.stringify({ ok: true, records: review.records.length, details: details.length, directFieldChanges: summary.fieldChanges, directAffectedRecords: summary.affectedRecords, inferredCrossTypeReloadRepairs: reloadConsistency.correctedRecords, totalChangesFromPreManualArtifact: observed.length, durableOverrides: observed.length, reloadModel: `${reloadMatches}/${reloadTargets.length}`, reloadException: `${reloadExceptions[0].weaponName} / ${reloadExceptions[0].attachmentName}`, stackedReloadModel: 'pass', crossTypeReloadMismatches: 0, barrelVelocityModel: `${barrelMatches}/${barrels.length}`, nonShellCapacityMismatches: 0, stalePaths: 0, nullStats: 0, nullCosts: 0 }, null, 2));

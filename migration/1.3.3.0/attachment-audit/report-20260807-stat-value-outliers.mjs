/**
 * List the stat rows that apply-20260807-baseline-arrow-reconciliation.mjs deliberately left
 * alone, so they can be settled against the screenshots.
 *
 * Three buckets, all of them "the value is as suspect as the arrow":
 *
 *   disputedBaseline  - the weapon has no single agreed baseline for the stat, so no arrow can
 *                       be derived. Either its "None" cards disagree or one of its own arrows
 *                       points away from the value the None cards give.
 *   crossWeaponOutlier- the same attachment moves the same stat the other way on most other
 *                       weapons, e.g. a magazine that lowers mobility everywhere but raises it
 *                       here. The odd weapon out is normally an OCR misread of the value.
 *   arrowOnTie        - an arrow sits on a value equal to the baseline. Usually legitimate,
 *                       because the panel rounds for display, but listed for completeness.
 *
 * BROD 3 and EF88 precision are excluded: their in-game stat screens are bugged.
 */
import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT
  ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const outPath = path.join(auditRoot, 'stat-value-outliers-20260807.json');

const STATS = ['damage', 'rateOfFireRpm', 'magazineSize', 'hipfire', 'precision', 'control',
  'mobility', 'reloadTimeSeconds', 'muzzleVelocityMps', 'adsTimeMs', 'headshotMultiplier',
  'longRangeDamage', 'spotOnFire3dM', 'spotOnFire2dM', 'opponentHealthRegenDelaySeconds',
  'collateralMultiplier', 'adsMoveSpeedMultiplier', 'sprintRecoveryMs', 'recoilAmountDegrees',
  'recoilVariationDegrees'];
const BUGGED_PRECISION = new Set(['BROD 3', 'EF88']);

const document = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const detail = document.records.filter(record => record.stats);
const byWeapon = new Map();
for (const record of detail) {
  if (!byWeapon.has(record.weaponName)) byWeapon.set(record.weaponName, []);
  byWeapon.get(record.weaponName).push(record);
}

const mode = (values) => {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0];
};
const signOf = delta => (delta === 0 ? 0 : delta > 0 ? 1 : -1);

const baselines = new Map();
const disputedBaseline = [];
for (const [weapon, records] of byWeapon) {
  for (const stat of STATS) {
    if (stat === 'precision' && BUGGED_PRECISION.has(weapon)) continue;
    const values = records
      .filter(record => record.attachmentName === 'None')
      .map(record => record.stats[stat])
      .filter(value => typeof value === 'number');
    if (!values.length) continue;
    const [value, support] = mode(values);
    if (support !== values.length) {
      disputedBaseline.push({ weapon, stat, reason: 'none-cards-disagree', values: [...new Set(values)] });
      continue;
    }
    const conflicts = records.filter(record => {
      const observed = record.stats[stat];
      const arrow = (record.statComparisons ?? {})[stat];
      if (typeof observed !== 'number' || !arrow) return false;
      return arrow.direction === 'up' ? observed < value : observed > value;
    });
    if (conflicts.length) {
      disputedBaseline.push({
        weapon, stat, reason: 'arrow-contradicts-baseline', baseline: value,
        rows: conflicts.map(record => ({
          attachment: record.attachmentName, value: record.stats[stat],
          arrow: record.statComparisons[stat].direction, capture: record.source?.proposedFilename,
        })),
      });
      continue;
    }
    baselines.set(`${weapon}|${stat}`, value);
  }
}

const directions = new Map();
for (const [weapon, records] of byWeapon) {
  for (const record of records) {
    if (!record.attachmentName || record.attachmentName === 'None') continue;
    for (const stat of STATS) {
      const value = record.stats[stat];
      const baseline = baselines.get(`${weapon}|${stat}`);
      if (typeof value !== 'number' || baseline === undefined) continue;
      const key = `${record.attachmentType}|${record.attachmentName}|${stat}`;
      if (!directions.has(key)) directions.set(key, new Map());
      directions.get(key).set(weapon, { sign: signOf(value - baseline), value, baseline, capture: record.source?.proposedFilename });
    }
  }
}

const crossWeaponOutlier = [];
for (const [key, perWeapon] of directions) {
  if (perWeapon.size < 4) continue;
  const [majority, count] = mode([...perWeapon.values()].map(entry => entry.sign));
  if (count / perWeapon.size < 0.7) continue;
  const [attachmentType, attachment, stat] = key.split('|');
  for (const [weapon, entry] of perWeapon) {
    if (entry.sign === majority) continue;
    crossWeaponOutlier.push({
      weapon, attachmentType, attachment, stat, value: entry.value, baseline: entry.baseline,
      movesHere: entry.sign, movesElsewhere: majority, agreement: `${count}/${perWeapon.size}`,
      capture: entry.capture,
    });
  }
}

const arrowOnTie = [];
for (const [weapon, records] of byWeapon) {
  for (const record of records) {
    for (const stat of STATS) {
      const baseline = baselines.get(`${weapon}|${stat}`);
      const arrow = (record.statComparisons ?? {})[stat];
      if (baseline === undefined || !arrow) continue;
      if (record.stats[stat] !== baseline) continue;
      arrowOnTie.push({
        weapon, attachment: record.attachmentName, stat, value: baseline,
        arrow: arrow.direction, capture: record.source?.proposedFilename,
      });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    disputedBaseline: disputedBaseline.length,
    crossWeaponOutlier: crossWeaponOutlier.length,
    arrowOnTie: arrowOnTie.length,
  },
  disputedBaseline,
  crossWeaponOutlier: crossWeaponOutlier.sort((a, b) =>
    a.weapon.localeCompare(b.weapon) || a.stat.localeCompare(b.stat) || a.attachment.localeCompare(b.attachment)),
  arrowOnTie,
};
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(report.summary);

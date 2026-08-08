/**
 * Correct the Linear Comp recoil amount arrow on the eight weapons that recorded it as a green
 * down arrow.
 *
 * The linear compensator trades recoil amount for recoil variation: across the other 24
 * weapons that offer it the amount rises with a red up arrow while the variation falls with a
 * green down arrow. On these eight the scanner recorded the variation row's green down arrow
 * against the amount, one row above it. Every one was re-read from its own capture and shows a
 * red up arrow on the amount:
 *
 *   M417 A2 1.0, SG 553R 0.9, M277 1.0, KTS100 MK8 0.6, M121 A2 0.9,
 *   RPK-74M 0.5, SOR-300SC 0.8, NVO-228E 0.8
 *
 * This matters beyond the eight rows. A down arrow on a value above the weapon's baseline is
 * exactly the contradiction that makes apply-20260807-baseline-arrow-reconciliation.mjs refuse
 * to trust a baseline, so one bad muzzle row was suppressing the recoil arrows on every grip
 * for that weapon. Run this before the reconciliation.
 */
import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT
  ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');

const weapons = ['M417 A2', 'SG 553R', 'M277', 'KTS100 MK8', 'M121 A2', 'RPK-74M', 'SOR-300SC', 'NVO-228E'];

const document = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const applied = [];

for (const weapon of weapons) {
  const records = document.records.filter(record =>
    record.weaponName === weapon
    && record.attachmentType === 'Muzzle'
    && record.attachmentName === 'Linear Comp');
  if (records.length !== 1) throw new Error(`expected one ${weapon} Linear Comp, found ${records.length}`);
  const [record] = records;
  const comparisons = record.statComparisons ?? (record.statComparisons = {});
  const before = comparisons.recoilAmountDegrees?.direction ?? null;
  if (before === 'up') { console.log(`skipped ${weapon}: already up`); continue; }
  comparisons.recoilAmountDegrees = { direction: 'up', effect: 'penalty', color: 'red', source: 'screenshot-recheck' };
  record.notes = [...(record.notes ?? []),
    `Recoil amount arrow re-read from ${record.source?.proposedFilename}: red up, not ${before ?? 'absent'}. The scanner had picked up the recoil variation row below it.`];
  applied.push({ weapon, before, value: record.stats?.recoilAmountDegrees });
}

document.generatedAt = new Date().toISOString();
fs.writeFileSync(reviewPath, `${JSON.stringify(document, null, 2)}\n`);
console.log({ applied: applied.length, rows: applied });

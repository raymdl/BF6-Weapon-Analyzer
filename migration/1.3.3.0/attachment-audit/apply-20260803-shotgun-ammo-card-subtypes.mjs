/**
 * Correct the shotgun ammo card subtypes (and three names) in the review corpus.
 *
 * `fallbackAttachmentSubtype` had no rule for shotgun shells, so every shotgun ammo card fell
 * through to the `Standard` default. That made all four cards on a shotgun share one subtype,
 * which is useless as a join key and is what made the 20-point `#00 BUCK` card read as a
 * duplicate name of the base card rather than the separate attachment it is.
 *
 * Verified against the source screenshots for all four shotguns on 2026-08-03: the cards read
 * `#01 BUCK` (10), `#00 BUCK` (20), `FLECHETTE` (30) and `SLUGS` (40) on every shotgun, and the
 * detail title of the 10-point card is `#01 BUCKSHOT` - the corpus recorded it as plain
 * `Buckshot` on 18.5KS-K, DB-12 and M1014.
 *
 * The taxonomy rules are fixed in scripts/attachment-screenshot-taxonomy.mjs so a rebuild
 * derives these directly; this backfills the existing corpus because the build's raw-ocr.json
 * input is not in the working tree.
 */
import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT
  ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const SHOTGUNS = new Set(['18.5KS-K', 'DB-12', 'M1014', 'M87A1']);

// cost -> [subtype, canonical detail-title name]
const BY_COST = new Map([
  [10, ['#01 BUCK', '#01 Buckshot']],
  [20, ['#00 BUCK', '#00 Buckshot']],
  [30, ['Flechette', 'Flechette']],
  [40, ['Slugs', 'Slugs']],
]);

const document = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
let subtypes = 0;
let names = 0;
const touched = [];

for (const record of document.records) {
  if (record.attachmentType !== 'Ammo' || !SHOTGUNS.has(record.weaponName)) continue;
  const entry = BY_COST.get(record.attachmentCost);
  if (!entry) continue;
  const [subtype, name] = entry;
  const before = { subtype: record.attachmentSubtype, name: record.attachmentName };
  if (record.attachmentSubtype !== subtype) { record.attachmentSubtype = subtype; subtypes += 1; }
  if (record.attachmentName !== name) { record.attachmentName = name; names += 1; }
  if (before.subtype !== record.attachmentSubtype || before.name !== record.attachmentName) {
    record.notes = [...new Set([...(record.notes ?? []),
      'Shotgun ammo card subtype corrected from the source screenshot on 2026-08-03; the card '
      + 'labels are #01 BUCK, #00 BUCK, FLECHETTE and SLUGS, not the Standard default the '
      + 'taxonomy fallback produced.'])];
    touched.push(`${record.weaponName}/${record.attachmentCost}: `
      + `"${before.name}" [${before.subtype}] -> "${record.attachmentName}" [${record.attachmentSubtype}]`);
  }
}

fs.writeFileSync(reviewPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(`subtypes corrected: ${subtypes}`);
console.log(`names corrected   : ${names}`);
for (const line of touched) console.log(`  ${line}`);

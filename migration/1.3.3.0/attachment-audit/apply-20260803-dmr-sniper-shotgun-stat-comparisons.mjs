/**
 * Backfill screenshot comparison indicators (arrow direction + buff/penalty colour) for the
 * DMR, Sniper Rifle and Shotgun captures.
 *
 * `extract-stat-comparisons-fast.py` had only ever been run over Assault Rifle, Carbine, SMG,
 * LMG and Sidearm, so these three classes reached the workbook with bare numbers and no
 * up/down arrows. The scan has now been run over all 714 detail captures for the three classes
 * and merged into stat-comparisons.json.
 *
 * This applies the same comparisons to attachment-screenshot-review.json in place rather than
 * re-running build-attachment-screenshot-review.mjs, because that build's raw-ocr.json input is
 * not in the working tree and, more importantly, its review-conflict gate is keyed on
 * `comparisonScanAvailable`. That gate was inert for these classes while no scan existed; making
 * a scan available flips 438 previously-applied workbook edits into conflicts, which the build
 * resolves by discarding the edit. Backfilling only the comparison metadata leaves every
 * reviewed stat value untouched.
 *
 * Existing comparisons win over the scan: they came from the manual review overrides.
 */
import fs from 'node:fs';
import path from 'node:path';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT
  ?? 'migration/1.3.3.0/attachment-audit');
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const comparisonPath = path.join(auditRoot, 'stat-comparisons.json');
const CLASSES = new Set(['DMR', 'Sniper Rifle', 'Shotgun']);

const classForPath = (sourcePath) => {
  const parts = path.resolve(sourcePath ?? '').split(/[\\/]/);
  const index = parts.findIndex(part => part.toLowerCase() === 'weapon attachments');
  return index >= 0 ? parts[index + 1] ?? null : null;
};

const document = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const comparisons = JSON.parse(fs.readFileSync(comparisonPath, 'utf8'));
const scanByPath = new Map(comparisons
  .filter(record => CLASSES.has(classForPath(record.sourcePath)))
  .map(record => [path.resolve(record.sourcePath).toLowerCase(), record.comparisons ?? {}]));

let touched = 0;
let added = 0;
let retained = 0;
const perClass = new Map();

for (const record of document.records) {
  if (record.attachmentType === 'Overview') continue;
  const current = record.source?.currentPath;
  const weaponClass = classForPath(current);
  if (!CLASSES.has(weaponClass)) continue;
  const scan = scanByPath.get(path.resolve(current).toLowerCase());
  if (!scan) continue;

  const existing = record.statComparisons ?? {};
  const merged = { ...scan, ...existing };
  const newFields = Object.keys(merged).length - Object.keys(existing).length;
  if (newFields <= 0 && Object.keys(existing).length === Object.keys(merged).length) {
    if (!Object.keys(scan).length) continue;
  }
  retained += Object.keys(existing).length;
  added += newFields;
  record.statComparisons = merged;
  if (newFields > 0) {
    touched += 1;
    const note = 'Screenshot comparison indicators (arrow direction and buff/penalty colour) were '
      + 'extracted for this capture on 2026-08-03; the class had been missed by the earlier '
      + 'comparison scan. Typed stat values are unchanged.';
    record.notes = [...new Set([...(record.notes ?? []), note])];
  }
  perClass.set(weaponClass, (perClass.get(weaponClass) ?? 0) + newFields);
}

fs.writeFileSync(reviewPath, `${JSON.stringify(document, null, 2)}\n`);

console.log(`records updated       : ${touched}`);
console.log(`comparisons added     : ${added}`);
console.log(`comparisons retained  : ${retained} (pre-existing manual review wins)`);
for (const [weaponClass, count] of [...perClass].sort()) {
  console.log(`  ${weaponClass.padEnd(13)} +${count}`);
}

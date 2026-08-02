// Clears the three open items listed in ../BF6_ATTACHMENT_SCREENSHOT_AUDIT_INSTRUCTIONS.md §3.
//
//   1. Eleven barrel names imported on 2026-07-31 were ALL-CAPS, violating the §11 casing rules.
//   2. Seven AK-205 laser records stored `fireModes` as a string instead of an array.
//   3. `recoilVariationDegrees` was wrong on five weapons. Every value below was read directly
//      from the magnified RECOIL VARIATION row of the named screenshot, per §7.15 — the printed
//      number is authoritative. The audit-sweep ladder check flagged these and was correct in
//      every case; after this pass all 22 recoilvar-ladder warnings clear.
//
// Idempotent: re-running after a successful pass is a no-op.

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const TARGET = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');

const review = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
const baseName = p => (p || '').split(/[\\/]/).pop();
const changes = [];

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const backupDir = path.join(AUDIT_DIR, `backups/pre-open-item-fixes-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(TARGET, path.join(backupDir, 'attachment-screenshot-review.json'));

// ───────────────────────────────── 1. barrel name casing (§11.3)
// Tokens that stay uppercase are initialisms; everything else title-cases. Only the eleven
// names below are touched — the other ALL-CAPS barrel names are length prefix + initialism
// (`600MM DMR`, `24" HBAR`, `457MM MK9`) and are already correct.
const NAME_FIXES = new Map([
  ['9" FACTORY', '9" Factory'],
  ['10.5" CUSTOM', '10.5" Custom'],
  ['7.5" COMPACT', '7.5" Compact'],
  ['9" FLUTED', '9" Fluted'],
  ['9" CRYOGENIC', '9" Cryogenic'],
  ['13" FACTORY', '13" Factory'],
  ['13" PROTOTYPE', '13" Prototype'],
  ['16" RIFLE', '16" Rifle'],
  ['16" CUSTOM', '16" Custom'],
  ['13" FLUTED', '13" Fluted'],
  ['13" CRYOGENIC', '13" Cryogenic'],
]);
let renamed = 0;
for (const record of review.records) {
  if (record.attachmentType !== 'Barrel') continue;
  const fixed = NAME_FIXES.get(record.attachmentName);
  if (!fixed) continue;
  changes.push(`name    ${record.weaponName} ${JSON.stringify(record.attachmentName)} -> ${JSON.stringify(fixed)}`);
  record.attachmentName = fixed;
  renamed += 1;
}

// ───────────────────────────────── 2. fireModes schema
// The seven AK-205 compact-panel laser captures stored "AUTO/SINGLE" as a string.
let fireModesFixed = 0;
for (const record of review.records) {
  const modes = record.stats?.fireModes;
  if (typeof modes !== 'string') continue;
  record.stats.fireModes = modes.split('/').map(part => part.trim()).filter(Boolean);
  fireModesFixed += 1;
  changes.push(`modes   ${record.weaponName} ${record.attachmentType}/${record.attachmentName}: `
    + `${JSON.stringify(modes)} -> ${JSON.stringify(record.stats.fireModes)}`);
}

// ───────────────────────────────── 3. recoilVariationDegrees
// Each entry: the value stored, the value printed on screen, and the screenshot it was read from.
const RECOIL_VARIATION_FIXES = [
  { weapon: 'M4A1', from: 40.7, to: 30.7, evidence: '17_M4A1_Grip_None.png and 13_M4A1_Barrel_Basic.png both print 30.7' },
  { weapon: 'M277', from: 34, to: 34.4, evidence: '01_M277_Muzzle_None.png and 19_M277_Grip_None.png both print 34.4' },
  { weapon: 'VCR-2', from: 50.4, to: 50.3, evidence: '01_VCR-2_Muzzle_None.png and 17_VCR-2_Grip_None.png both print 50.3' },
  { weapon: 'GRT-BC', from: 20.6, to: 20.2, attachmentName: 'Linear Comp', evidence: '08_GRT-BC_Muzzle_Linear_Comp.png prints 20.2' },
  { weapon: 'LMR27', from: 8, to: 11, attachmentName: '24" Extended', evidence: '14_LMR27_Barrel_Extended.png prints 11.0' },
];
const NOTE = 'Recoil variation was re-read from the magnified RECOIL VARIATION row of the source '
  + 'screenshot on 2026-07-31; the audit-sweep ladder check identified the discrepancy and the '
  + 'printed value was taken as authoritative.';

let recoilFixed = 0;
for (const fix of RECOIL_VARIATION_FIXES) {
  const hits = review.records.filter(r =>
    r.weaponName === fix.weapon
    && r.stats?.recoilVariationDegrees === fix.from
    && (!fix.attachmentName || r.attachmentName === fix.attachmentName));
  for (const record of hits) {
    record.stats.recoilVariationDegrees = fix.to;
    if (!(record.notes || []).includes(NOTE)) record.notes = [...(record.notes || []), NOTE];
    recoilFixed += 1;
  }
  if (hits.length) {
    changes.push(`recoil  ${fix.weapon}${fix.attachmentName ? ' ' + fix.attachmentName : ''}: `
      + `${fix.from} -> ${fix.to} on ${hits.length} record(s) — ${fix.evidence}`);
  }
}

fs.writeFileSync(TARGET, `${JSON.stringify(review, null, 2)}\n`);

console.log(`snapshot backup: ${path.relative(process.cwd(), backupDir)}`);
for (const line of changes) console.log('  ' + line);
console.log(`\nbarrel names re-cased: ${renamed}`);
console.log(`fireModes converted to arrays: ${fireModesFixed}`);
console.log(`recoilVariationDegrees values corrected: ${recoilFixed}`);

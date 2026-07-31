// KORD 6P67 uses one shared accessory selector, not separate Laser and Light slots.
//
// Evidence: `49_KORD 6P67_Light_None.png` shows a single `SELECT RIGHT ACCESSORY` grid holding
// three LIGHT tiles, RED/VIOLET/GREEN/BLUE LASER tiles and a LASER/LIGHT combo tile under one
// `None`. Records 49-59 are one uninterrupted capture sequence under that heading, and the
// sequence ends with a `Laser/Light Combo Green` item. That is the shared-selector signature
// described in BF6_ATTACHMENT_SCREENSHOT_AUDIT_INSTRUCTIONS.md §9.
//
// Retypes the 11 records to `Laser/Light` and renames their screenshots to the canonical
// `Laser-Light` filename token. Capture order is unchanged, so nothing renumbers.
// Idempotent: re-running after a successful pass is a no-op.

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const TARGET = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const WEAPON = 'KORD 6P67';

const review = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
const baseName = p => (p || '').split(/[\\/]/).pop();

const affected = review.records.filter(r => r.weaponName === WEAPON
  && ['Laser', 'Light'].includes(r.attachmentType));

if (!affected.length) {
  console.log('already applied: no KORD 6P67 Laser or Light records remain');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const backupDir = path.join(AUDIT_DIR, `backups/pre-kord-shared-selector-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(TARGET, path.join(backupDir, 'attachment-screenshot-review.json'));

// ── plan the renames first, and refuse to touch anything if the plan is not safe
const plan = [];
for (const record of affected) {
  const from = record.source.currentPath;
  const oldName = baseName(from);
  const newName = oldName.replace(/_(Laser|Light)_/, '_Laser-Light_');
  if (newName === oldName) throw new Error(`cannot derive a new filename for ${oldName}`);
  const to = path.join(path.dirname(from), newName);
  if (!fs.existsSync(from)) throw new Error(`source screenshot missing: ${from}`);
  if (fs.existsSync(to)) throw new Error(`destination already exists: ${to}`);
  plan.push({ record, from, to, oldName, newName });
}
const destinations = new Set(plan.map(p => p.to.toLowerCase()));
if (destinations.size !== plan.length) throw new Error('rename plan contains a destination collision');

const folder = path.dirname(plan[0].from);
const before = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.png')).length;

const NOTE = 'Attachment type reconciled to the shared Laser/Light selector on 2026-07-31 after '
  + 'direct review of the SELECT RIGHT ACCESSORY grid, which presents light, laser and combined '
  + 'options under one None baseline.';

for (const entry of plan) {
  fs.renameSync(entry.from, entry.to);
  entry.record.attachmentType = 'Laser/Light';
  entry.record.source.currentPath = entry.to;
  entry.record.source.proposedFilename = entry.newName;
  entry.record.source.renameApplied = true;
  if (!(entry.record.notes || []).includes(NOTE)) {
    entry.record.notes = [...(entry.record.notes || []), NOTE];
  }
}

const after = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.png')).length;
if (before !== after) throw new Error(`PNG count changed: ${before} -> ${after}`);

fs.writeFileSync(TARGET, `${JSON.stringify(review, null, 2)}\n`);

console.log(`snapshot backup: ${path.relative(process.cwd(), backupDir)}`);
for (const entry of plan) {
  console.log(`  ${entry.oldName}  ->  ${entry.newName}`);
}
console.log(`\nrecords retyped to Laser/Light: ${plan.length}`);
console.log(`PNG count in folder unchanged: ${before}`);
const remaining = review.records.filter(r => r.weaponName === WEAPON
  && ['Laser', 'Light'].includes(r.attachmentType)).length;
console.log(`KORD 6P67 records still typed Laser or Light: ${remaining}`);

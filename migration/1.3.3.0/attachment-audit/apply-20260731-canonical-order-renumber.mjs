// Renumber screenshot filename prefixes from capture order to canonical order.
//
// The prefix used to record the order the screenshots were taken in. Because capture sessions
// visited the attachment categories in whatever order suited them, that produced 21 different
// type sequences across 62 weapons, and 7 weapons where one type is split across two runs — so
// sorting a folder by filename did not group attachments the same way twice.
//
// The prefix now records canonical order: attachment type in the order used by the workbook
// Overview, then capture order within each type. Folder sort, weapon-sheet order and Overview
// order all agree, and the capture sequence you shot in still supplies the within-type order.
//
// The true capture sequence is NOT discarded. It stays in `source.captureOrder`, and this pass
// writes a complete `capture-order.json` ledger so a future rebuild reads it from there rather
// than re-deriving it from a filename prefix that no longer means capture order.
//
// Renames run in two phases through temporary names, because canonical order permutes positions
// within a weapon and a direct rename would clobber a file that has not moved yet.
//
// Idempotent: re-running after a successful pass is a no-op.
//
// REQUIRED AFTER EVERY FULL REBUILD. `scripts/build-attachment-screenshot-review.mjs` builds the
// filename prefix from `captureOrder` (see `currentName`), so a rebuild proposes capture-order
// names and would undo this pass. Run the OCR path reconcile, then the rebuild, then this script.
// Keeping canonical numbering in one small idempotent pass is deliberate: the alternative is
// threading a second ordering concept through the whole builder.

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const TARGET = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const LEDGER = path.join(AUDIT_DIR, 'capture-order.json');

// must match OVERVIEW_TYPE_ORDER in scripts/build-attachment-workbook.py
const TYPE_ORDER = ['Muzzle', 'Barrel', 'Light', 'Laser', 'Laser/Light', 'Grip/Laser/Light',
  'Grip', 'Magazine', 'Ammo', 'Ergonomics'];
const typeRank = type => {
  const index = TYPE_ORDER.indexOf(type);
  return index === -1 ? TYPE_ORDER.length : index;
};

const review = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
const baseName = p => (p || '').split(/[\\/]/).pop();
const pad = n => String(n).padStart(2, '0');

// ─────────────────────────────────────────────── 1. plan
const byWeapon = new Map();
for (const record of review.records) {
  if (!byWeapon.has(record.weaponName)) byWeapon.set(record.weaponName, []);
  byWeapon.get(record.weaponName).push(record);
}

const plan = [];
for (const [weapon, records] of byWeapon) {
  const overview = records.filter(r => r.attachmentType === 'Overview');
  const details = records.filter(r => r.attachmentType !== 'Overview')
    .sort((a, b) => typeRank(a.attachmentType) - typeRank(b.attachmentType)
      || String(a.attachmentType).localeCompare(String(b.attachmentType))
      || (a.source.captureOrder ?? 0) - (b.source.captureOrder ?? 0));

  const ordered = [...overview.map(r => [r, 0]), ...details.map((r, i) => [r, i + 1])];
  for (const [record, canonical] of ordered) {
    const from = record.source.currentPath;
    const oldName = baseName(from);
    const stem = oldName.replace(/^\d+_/, '');
    if (stem === oldName) throw new Error(`no numeric prefix to replace on ${oldName}`);
    const newName = `${pad(canonical)}_${stem}`;
    plan.push({ weapon, record, canonical, from, oldName, newName,
      to: path.join(path.dirname(from), newName), changed: newName !== oldName });
  }
}

const moving = plan.filter(entry => entry.changed);
if (!moving.length) {
  console.log('already applied: every filename prefix is already the canonical order');
  process.exit(0);
}

// ─────────────────────────────────────────────── 2. validate before touching anything
for (const entry of plan) {
  if (!fs.existsSync(entry.from)) throw new Error(`source screenshot missing: ${entry.from}`);
}
const destinations = new Map();
for (const entry of plan) {
  const key = entry.to.toLowerCase();
  if (destinations.has(key)) {
    throw new Error(`destination collision: ${entry.oldName} and ${destinations.get(key)} both -> ${entry.newName}`);
  }
  destinations.set(key, entry.oldName);
}
const sources = new Set(plan.map(entry => entry.from.toLowerCase()));
for (const entry of moving) {
  // a destination may already exist only if it is itself moving out of the way
  if (fs.existsSync(entry.to) && !sources.has(entry.to.toLowerCase())) {
    throw new Error(`destination exists and is not part of the plan: ${entry.to}`);
  }
}
const folders = [...new Set(plan.map(entry => path.dirname(entry.from)))];
const countsBefore = new Map(folders.map(folder =>
  [folder, fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.png')).length]));

// ─────────────────────────────────────────────── 3. two-phase rename
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const backupDir = path.join(AUDIT_DIR, `backups/pre-canonical-order-renumber-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(TARGET, path.join(backupDir, 'attachment-screenshot-review.json'));
if (fs.existsSync(LEDGER)) fs.copyFileSync(LEDGER, path.join(backupDir, 'capture-order.json'));

const temporaries = [];
for (const entry of moving) {
  const temporary = path.join(path.dirname(entry.from), `__renumber__${stamp}__${entry.oldName}`);
  fs.renameSync(entry.from, temporary);
  temporaries.push({ entry, temporary });
}
for (const { entry, temporary } of temporaries) {
  if (fs.existsSync(entry.to)) throw new Error(`phase-2 destination unexpectedly occupied: ${entry.to}`);
  fs.renameSync(temporary, entry.to);
}

for (const [folder, before] of countsBefore) {
  const after = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.png')).length;
  if (before !== after) throw new Error(`PNG count changed in ${folder}: ${before} -> ${after}`);
  const leftovers = fs.readdirSync(folder).filter(f => f.startsWith('__renumber__'));
  if (leftovers.length) throw new Error(`temporary files left behind in ${folder}: ${leftovers.join(', ')}`);
}

// ─────────────────────────────────────────────── 4. update the review records
for (const entry of plan) {
  entry.record.source.currentPath = entry.to;
  entry.record.source.proposedFilename = entry.newName;
  entry.record.source.canonicalOrder = entry.canonical;
  if (entry.changed) entry.record.source.renameApplied = true;
}
fs.writeFileSync(TARGET, `${JSON.stringify(review, null, 2)}\n`);

// ─────────────────────────────────────────────── 5. complete the capture-order ledger
// Every record gets an entry so a rebuild reads the capture sequence from here instead of
// re-deriving it from the filename prefix, which no longer encodes it.
const previous = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : {};
const priorByKey = new Map();
for (const item of previous.entries ?? []) {
  priorByKey.set(`${item.weaponName}|${String(item.currentFilename ?? '').replace(/^\d+_/, '')}`.toLowerCase(), item);
}
const entries = plan
  .sort((a, b) => a.weapon.localeCompare(b.weapon) || a.canonical - b.canonical)
  .map(entry => {
    const prior = priorByKey.get(`${entry.weapon}|${entry.stem ?? entry.oldName.replace(/^\d+_/, '')}`.toLowerCase());
    const source = entry.record.source;
    return {
      weaponName: entry.weapon,
      captureOrder: source.captureOrder ?? prior?.captureOrder ?? null,
      canonicalOrder: entry.canonical,
      attachmentType: entry.record.attachmentType,
      attachmentName: entry.record.attachmentName,
      attachmentSubtype: entry.record.attachmentSubtype,
      currentFilename: entry.newName,
      currentDirectory: path.dirname(entry.to),
      proposedFilename: entry.newName,
      originalFilename: source.originalFilename ?? prior?.originalFilename ?? null,
      originalPath: source.originalPath ?? prior?.originalPath ?? null,
      captureTimestamp: source.captureTimestamp ?? prior?.captureTimestamp ?? null,
    };
  });
fs.writeFileSync(LEDGER, `${JSON.stringify({
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  source: 'migration/1.3.3.0/attachment-audit/apply-20260731-canonical-order-renumber.mjs',
  rule: 'Overview is 0. `captureOrder` is the sequence the screenshots were taken in and is the '
    + 'authority for within-type order. `canonicalOrder` is the filename prefix: attachment type '
    + 'in workbook Overview order, then captureOrder within each type. A rebuild must read '
    + 'captureOrder from this ledger, never from the filename prefix.',
  recordCount: entries.length,
  entries,
}, null, 2)}\n`);

// ─────────────────────────────────────────────── 6. report
const byWeaponMoved = new Map();
for (const entry of moving) byWeaponMoved.set(entry.weapon, (byWeaponMoved.get(entry.weapon) ?? 0) + 1);
console.log(`snapshot backup: ${path.relative(process.cwd(), backupDir)}`);
console.log(`files renamed: ${moving.length} of ${plan.length}`);
console.log(`weapons touched: ${byWeaponMoved.size}`);
console.log(`capture-order ledger entries: ${entries.length} (was ${(previous.entries ?? []).length})`);
console.log(`entries missing a captureOrder: ${entries.filter(e => e.captureOrder == null).length}`);
console.log('\nsample:');
for (const entry of moving.slice(0, 8)) console.log(`  ${entry.oldName}  ->  ${entry.newName}`);

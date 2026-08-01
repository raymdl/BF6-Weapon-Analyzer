// Rename the three snipers' Match Grade captures from Range Pen to Long-range, and re-key
// everything that points at them in the same operation.
//
// L115, M2010 ESR and SV-98 had their Match Grade round transcribed from the adjacent PENETRATION
// tile rather than the viewed LONG-RANGE one, taking its subtype and its cost. The stat records
// were corrected in apply-20260801-ammo-stat-rule-corrections.mjs; this fixes the filenames, which
// encode the subtype for ammo captures and so still read `_Ammo_Range_Pen`.
//
// The override ledger is keyed on `sourcePath`, so renaming a capture without re-keying the ledger
// in the same pass is what orphaned 1,765 entries the last time the corpus was renumbered. Both
// sides move together here, and the guards refuse to write unless they agree.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const REVIEW = path.join(ROOT, 'outputs', 'attachment-audit', 'attachment-screenshot-review.json');
const LEDGER = path.join(ROOT, 'outputs', 'attachment-audit', 'manual-review-overrides.json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const RENAMES = [
  { weapon: 'L115', from: '37_L115_Ammo_Range_Pen.png', to: '37_L115_Ammo_Long-range.png' },
  { weapon: 'M2010 ESR', from: '38_M2010 ESR_Ammo_Range_Pen.png', to: '38_M2010 ESR_Ammo_Long-range.png' },
  { weapon: 'SV-98', from: '33_SV-98_Ammo_Range_Pen.png', to: '33_SV-98_Ammo_Long-range.png' },
];

const review = readJson(REVIEW);
const ledger = readJson(LEDGER);
const recordCountBefore = review.records.length;
const ledgerCountBefore = ledger.overrides.length;

let renamed = 0;
let alreadyDone = 0;
const moves = [];

for (const item of RENAMES) {
  const matches = review.records.filter((row) => row.weaponName === item.weapon
    && row.attachmentType === 'Ammo' && row.attachmentName === 'Match Grade');
  if (matches.length !== 1) throw new Error(`${item.weapon}: ${matches.length} Match Grade records`);
  const record = matches[0];
  if (record.attachmentSubtype !== 'Long-range') {
    throw new Error(`${item.weapon}: subtype is ${record.attachmentSubtype}, expected Long-range — `
      + 'run apply-20260801-ammo-stat-rule-corrections.mjs first');
  }

  const dir = path.dirname(record.source.currentPath);
  const oldPath = path.join(dir, item.from);
  const newPath = path.join(dir, item.to);
  const oldExists = fs.existsSync(oldPath);
  const newExists = fs.existsSync(newPath);

  if (oldExists && newExists) throw new Error(`both names exist for ${item.weapon}`);
  if (!oldExists && !newExists) throw new Error(`neither name exists for ${item.weapon}`);
  if (oldExists) { fs.renameSync(oldPath, newPath); renamed += 1; } else { alreadyDone += 1; }

  record.source.currentPath = newPath;
  record.source.proposedFilename = item.to;

  for (const entry of ledger.overrides) {
    if (entry.sourcePath !== oldPath && entry.sourcePath !== newPath) continue;
    entry.sourcePath = newPath;
    entry.sourceFilename = item.to;
    // Evidence blocks carry the capture path under either `source` or `sourcePath` depending on
    // which pass wrote them, and some point at pre-renumbering names. Only rewrite the ones that
    // name this capture; a historical path to a different file is left as history.
    for (const evidence of entry.evidence ?? []) {
      for (const key of ['source', 'sourcePath']) {
        const value = evidence[key];
        if (typeof value !== 'string') continue;
        if (value === oldPath || value === newPath) { evidence[key] = newPath; continue; }
        if (path.basename(value) === item.from) evidence[key] = newPath;
      }
    }
  }
  moves.push({ weapon: item.weapon, from: item.from, to: item.to });
}

if (review.records.length !== recordCountBefore) throw new Error('record count changed');
if (ledger.overrides.length !== ledgerCountBefore) throw new Error('ledger count changed');
const paths = ledger.overrides.map((entry) => entry.sourcePath);
if (new Set(paths).size !== paths.length) throw new Error('duplicate sourcePath produced');
for (const item of RENAMES) {
  const record = review.records.find((row) => row.weaponName === item.weapon
    && row.attachmentType === 'Ammo' && row.attachmentName === 'Match Grade');
  if (!fs.existsSync(record.source.currentPath)) throw new Error(`missing after rename: ${record.source.currentPath}`);
  if (path.basename(record.source.currentPath) !== item.to) throw new Error(`path not updated for ${item.weapon}`);
}
// No record anywhere may still reference the old names.
const stale = JSON.stringify({ review, ledger }).match(/_Ammo_Range_Pen\.png/g) ?? [];
const vssmKeeps = review.records.filter((row) => row.weaponName === 'VSSM'
  && String(row.source.currentPath).includes('_Ammo_Range_Pen.png')).length;
if (stale.length > 0 && vssmKeeps === 0) throw new Error(`stale Range Pen references remain: ${stale.length}`);

writeJson(REVIEW, review);
writeJson(LEDGER, ledger);

console.log(JSON.stringify({ renamed, alreadyDone, moves, noOp: renamed === 0 }, null, 2));

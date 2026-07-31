import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const review = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'attachment-screenshot-review.json'), 'utf8'));
const register = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'subsonic-velocity-treatments-20260731.json'), 'utf8'));
const key = value => path.resolve(value || '').toLowerCase();
const fail = message => { throw new Error(`subsonic velocity treatment verification: ${message}`); };

if (register.kind !== 'subsonic-velocity-treatment-register' || register.treatments?.length !== 27) fail('register must contain exactly 27 treatments');
const subsonicRows = review.records.filter(row => row.stats && row.attachmentType === 'Ammo' && /subsonic/i.test(row.attachmentName || ''));
if (subsonicRows.length !== 27) fail(`expected 27 current subsonic screenshot rows, found ${subsonicRows.length}`);
if (new Set(register.treatments.map(item => key(item.sourcePath))).size !== 27) fail('register contains duplicate source paths');
for (const item of register.treatments) {
  const row = subsonicRows.find(candidate => key(candidate.source?.currentPath) === key(item.sourcePath));
  if (!row || !fs.existsSync(item.sourcePath)) fail(`missing current screenshot source ${item.sourcePath}`);
  if (row.weaponName !== item.weaponName || row.attachmentName !== item.attachmentName || row.stats.muzzleVelocityMps !== item.screenshotVelocityMps) fail(`saved screenshot value mismatch for ${item.sourcePath}`);
  const treatment = item.velocityTreatment || {};
  if (treatment.kind === 'subsonic-tier') {
    if (![1, 2, 3].includes(treatment.subsonicVelocityTier) || treatment.displayRounding !== 'floor') fail(`invalid tier treatment for ${item.sourcePath}`);
    const expected = Math.floor(item.baseVelocityMps * (0.8 ** treatment.subsonicVelocityTier));
    if (item.screenshotVelocityMps !== expected) fail(`tier treatment does not reproduce ${item.sourcePath}`);
  } else if (treatment.kind === 'subsonic-absolute' || treatment.kind === 'subsonic-tungsten-absolute') {
    if (treatment.subsonicVelocityMps !== item.screenshotVelocityMps) fail(`absolute treatment does not reproduce ${item.sourcePath}`);
    if (treatment.kind === 'subsonic-tungsten-absolute' && treatment.combinesWith !== 'penetration') fail(`composite treatment is incomplete for ${item.sourcePath}`);
  } else {
    fail(`unknown treatment kind for ${item.sourcePath}`);
  }
}
for (const row of subsonicRows) {
  if (!register.treatments.some(item => key(item.sourcePath) === key(row.source.currentPath))) fail(`unregistered subsonic row ${row.source.currentPath}`);
}
const byKind = register.counts?.byKind || {};
if (byKind['subsonic-tier'] !== 22 || byKind['subsonic-absolute'] !== 4 || byKind['subsonic-tungsten-absolute'] !== 1) fail('unexpected treatment-kind count');
console.log('Subsonic velocity treatment verification passed (27 direct rows: 22 tiered, 4 absolute, 1 composite absolute).');

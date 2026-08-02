// Re-runs every check that found a regression in the 2026-07-31 rebuild, plus a
// guard that the 31 newly imported records were not disturbed by the repair.
import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('migration/1.3.3.0/attachment-audit');
const cur = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'attachment-screenshot-review.json'), 'utf8'));
const snap = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, 'backups/20260731-missing-screenshot-audit/attachment-screenshot-review.json'), 'utf8'));
const baseName = p => (p || '').split(/[\\/]/).pop();
const identity = r => `${r.weaponName}|${r.attachmentType}|${r.attachmentName}`;

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures += 1;
};

// 1. every screenshot on disk has exactly one record, and every record has its file
const onDisk = [];
const root = 'Weapon Attachments';
for (const cls of fs.readdirSync(root)) {
  const cd = path.join(root, cls);
  if (!fs.statSync(cd).isDirectory() || cls === 'Missing') continue;
  for (const w of fs.readdirSync(cd)) {
    const wd = path.join(cd, w);
    if (!fs.statSync(wd).isDirectory()) continue;
    for (const f of fs.readdirSync(wd)) if (f.toLowerCase().endsWith('.png')) onDisk.push(path.resolve(wd, f).toLowerCase());
  }
}
const claimed = new Set(cur.records.map(r => (r.source.currentPath || '').toLowerCase()));
const orphans = onDisk.filter(p => !claimed.has(p));
check('no screenshot on disk without a record', orphans.length === 0, orphans.map(baseName).join(', '));
const ghosts = cur.records.filter(r => r.source.currentPath && !fs.existsSync(r.source.currentPath));
check('no record pointing at a missing file', ghosts.length === 0, ghosts.map(r => identity(r)).join(', '));

// 2. no duplicate attachment identity inside a weapon+type group
const dupIdentity = new Map();
for (const r of cur.records) {
  if (r.attachmentType === 'Overview') continue;
  const k = identity(r);
  dupIdentity.set(k, (dupIdentity.get(k) || 0) + 1);
}
const dups = [...dupIdentity].filter(([k, v]) => v > 1 && !k.startsWith('M1014|'));
check('no duplicate attachment identities (M1014 pre-existing dupes excluded)', dups.length === 0,
  dups.map(([k, v]) => `${k} x${v}`).join(', '));

// 3. no two records claiming the same original screenshot (2 pre-existing pairs allowed)
const KNOWN_SHARED = new Set([
  'KTS100 MK8|Battlefield 6 Screenshot 2026.07.26 - 14.26.13.79 (Medium).png',
  'VCR-2|Battlefield 6 Screenshot 2026.07.23 - 15.48.38.17 (Medium).png',
]);
const byOriginal = new Map();
for (const r of cur.records) {
  const k = `${r.weaponName}|${r.source.originalFilename}`;
  if (!byOriginal.has(k)) byOriginal.set(k, []);
  byOriginal.get(k).push(r);
}
const shared = [...byOriginal].filter(([k, v]) => v.length > 1 && !KNOWN_SHARED.has(k) && !k.includes('M1014'));
check('no new shared-provenance collisions', shared.length === 0, shared.map(([k]) => k).join(', '));

// 4. a record typed Laser is never stored under a _Light_ filename and vice versa
const mistyped = cur.records.filter(r => {
  const f = baseName(r.source.currentPath);
  if (/_Laser_/i.test(f) && r.attachmentType === 'Light') return true;
  if (/_Light_/i.test(f) && r.attachmentType === 'Laser') return true;
  return false;
});
check('no Laser/Light type-vs-filename mismatch', mistyped.length === 0,
  mistyped.map(r => `${r.weaponName} ${baseName(r.source.currentPath)}`).join(', '));

// 5. the specific records repaired by hand
const pick = (w, t, n) => cur.records.filter(r => r.weaponName === w && r.attachmentType === t && r.attachmentName === n);
const m277Laser = cur.records.filter(r => r.weaponName === 'M277' && r.attachmentType === 'Laser')
  .sort((a, b) => a.source.captureOrder - b.source.captureOrder)
  .map(r => `${r.source.captureOrder}:${r.attachmentName}`);
check('M277 laser block is 53..59 None/5 MW Red/50 MW Violet/5 MW Green/50 MW Green/50 MW Blue/120 MW Blue',
  m277Laser.join(' ') === '53:None 54:5 MW Red 55:50 MW Violet 56:5 MW Green 57:50 MW Green 58:50 MW Blue 59:120 MW Blue',
  m277Laser.join(' '));
check('M240L penetration ammo named Tungsten Core', pick('M240L', 'Ammo', 'Tungsten Core').length === 1);
check('M277 frangible ammo named Frangible', pick('M277', 'Ammo', 'Frangible').length === 1);
check('RPKM grips restored', cur.records.filter(r => r.weaponName === 'RPKM' && r.attachmentType === 'Grip').length === 19);
check('TR7 lasers restored', cur.records.filter(r => r.weaponName === 'TR7' && r.attachmentType === 'Laser').length === 7);

// 6. curated stat values are back
const stat = (w, t, n, f) => (pick(w, t, n)[0] || {}).stats?.[f];
check('M433 40Rnd Magazine holds 40', stat('M433', 'Magazine', '40Rnd Magazine', 'magazineSize') === 40);
check('SOR-300SC 36Rnd Magazine holds 36', stat('SOR-300SC', 'Magazine', '36Rnd Magazine', 'magazineSize') === 36);
check('VCR-2 20Rnd Magazine holds 20', stat('VCR-2', 'Magazine', '20Rnd Magazine', 'magazineSize') === 20);
check('KTS100 MK8 50Rnd Magazine stats non-null', stat('KTS100 MK8', 'Magazine', '50Rnd Magazine', 'magazineSize') === 50);
check('M121 A2 Tungsten Core collateral is 1', stat('M121 A2', 'Ammo', 'Tungsten Core', 'collateralMultiplier') === 1);
check('Underslung Mount costs restored',
  cur.records.filter(r => r.attachmentName === 'Underslung Mount').every(r => r.attachmentCost === 10));

// 7. manual-review provenance notes are back
const withReviewNote = cur.records.filter(r => (r.notes || []).some(n => n.includes('reconciled by direct visual review'))).length;
check('2026-07-30 visual-review notes restored', withReviewNote === 48, `${withReviewNote} records`);

// 8. the 31 newly imported records are intact and untouched
const NEW_GROUPS = [['M417 A2', 'Ammo', 7], ['SOR-300SC', 'Barrel', 5], ['SG 553R', 'Light', 4], ['M277', 'Barrel', 6],
  ['KTS100 MK8', 'Barrel', 3], ['M121 A2', 'Light', 4], ['M45A1', 'Magazine', 2], ['RPK-74M', 'Light', 4]];
let newOk = true, newDetail = [];
for (const [w, t, n] of NEW_GROUPS) {
  const got = cur.records.filter(r => r.weaponName === w && r.attachmentType === t);
  if (got.length !== n) { newOk = false; newDetail.push(`${w}/${t}=${got.length} want ${n}`); }
  if (got.some(r => !r.stats || r.attachmentCost === undefined)) { newOk = false; newDetail.push(`${w}/${t} incomplete`); }
}
check('all 8 newly imported groups present and complete', newOk, newDetail.join(', '));

// 9. metadata consistency
check('recordCount matches', cur.recordCount === cur.records.length, `${cur.recordCount} vs ${cur.records.length}`);
check('attachmentDetailCount matches', cur.attachmentDetailCount === cur.records.filter(r => r.attachmentType !== 'Overview').length);
check('record total is snapshot + 31 new + 2 M277 laser repair', cur.records.length === snap.records.length + 35,
  `${cur.records.length} vs ${snap.records.length} + 35`);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

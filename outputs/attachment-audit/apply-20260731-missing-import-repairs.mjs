// Repairs the regressions introduced by the 2026-07-31 "missing attachment" rebuild.
//
// The rebuild correctly imported 31 new records (M417 A2 Ammo, SOR-300SC Barrel,
// SG 553R Light, M277 Barrel, KTS100 MK8 Barrel, M121 A2 Light, M45A1 Magazine,
// RPK-74M Light) but reassigned screenshots by numeric filename position rather
// than by record identity, dropped eight records outright, and re-derived a number
// of previously hand-corrected values from a noisier OCR pass.
//
// Every restored value comes from the pre-rebuild snapshot in
// backups/20260731-missing-screenshot-audit/. The 31 newly imported records are
// left untouched. Idempotent: re-running after a successful pass is a no-op.

import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const TARGET = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const SNAPSHOT = path.join(AUDIT_DIR, 'backups/20260731-missing-screenshot-audit/attachment-screenshot-review.json');

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const baseName = p => (p || '').split(/[\\/]/).pop();
const identity = r => `${r.weaponName}|${r.attachmentType}|${r.attachmentName}`;
const clone = r => JSON.parse(JSON.stringify(r));

const cur = read(TARGET);
const snap = read(SNAPSHOT);
const changes = [];
const note = (kind, detail) => changes.push({ kind, detail });

// ---------------------------------------------------------------- back up first
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
const backupDir = path.join(AUDIT_DIR, `backups/pre-missing-import-repairs-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(TARGET, path.join(backupDir, 'attachment-screenshot-review.json'));

// --------------------------------------------------- indexes over the snapshot
const snapByIdentity = new Map();
for (const r of snap.records) {
  const k = identity(r);
  if (!snapByIdentity.has(k)) snapByIdentity.set(k, []);
  snapByIdentity.get(k).push(r);
}
const snapUnique = k => {
  const v = snapByIdentity.get(k);
  return v && v.length === 1 ? v[0] : null;
};
const snapByFile = new Map();
for (const r of snap.records) snapByFile.set(`${r.weaponName}|${baseName(r.source.currentPath)}`, r);

const find = (records, pred) => records.filter(pred);
const one = (records, pred, what) => {
  const hits = find(records, pred);
  if (hits.length > 1) throw new Error(`expected at most one ${what}, found ${hits.length}`);
  return hits[0] || null;
};

// ------------------------------------- F1: Laser|None records re-typed to Light
// The rebuild re-typed each weapon's "Laser | None" record to "Light" because the
// renumbered Light block reused its old numeric prefix.
for (const r of cur.records) {
  if (r.attachmentType !== 'Light') continue;
  if (!/_Laser_None\.png$/i.test(baseName(r.source.currentPath))) continue;
  r.attachmentType = 'Laser';
  note('retype', `${r.weaponName}: ${baseName(r.source.currentPath)} attachmentType Light -> Laser`);
}

// ------------------------------------------- F2: attachment names lost to OCR
const renames = [
  { weapon: 'M240L', type: 'Ammo', subtype: 'Penetration', from: 'TUNGSTENGORe-vov.-4', to: 'Tungsten Core' },
  { weapon: 'M277', type: 'Ammo', subtype: 'Frangible', from: 'None', to: 'Frangible' },
];
for (const fix of renames) {
  const r = one(cur.records, x => x.weaponName === fix.weapon && x.attachmentType === fix.type
    && x.attachmentSubtype === fix.subtype && x.attachmentName === fix.from, `${fix.weapon} ${fix.subtype}`);
  if (!r) continue; // already repaired
  r.attachmentName = fix.to;
  note('rename', `${fix.weapon} ${fix.type}/${fix.subtype}: name ${JSON.stringify(fix.from)} -> ${JSON.stringify(fix.to)}`);
}

// ------------------------------------------------- F3: M277 laser block repair
// Files 53/54 on disk are NONE and 5 MW RED (verified visually). The rebuild
// labelled them "120 MW Blue" and "None", losing 5 MW Red and duplicating
// 120 MW Blue. Rebuild both records from the snapshot, repointed to the files.
const m277LaserFixes = [
  { file: '53_M277_Laser_None.png', order: 53, wrongName: '120 MW Blue', snapName: 'None' },
  { file: '54_M277_Laser_5_MW_Red.png', order: 54, wrongName: 'None', snapName: '5 MW Red' },
];
for (const fix of m277LaserFixes) {
  const r = one(cur.records, x => x.weaponName === 'M277' && x.attachmentType === 'Laser'
    && baseName(x.source.currentPath) === fix.file, `M277 laser ${fix.file}`);
  if (!r || r.attachmentName === fix.snapName) continue; // already repaired
  if (r.attachmentName !== fix.wrongName) throw new Error(`M277 ${fix.file}: unexpected name ${r.attachmentName}`);
  const source = snapUnique(`M277|Laser|${fix.snapName}`);
  if (!source) throw new Error(`snapshot has no unique M277 Laser ${fix.snapName}`);
  const rebuilt = clone(source);
  rebuilt.source.currentPath = path.join(path.dirname(r.source.currentPath), fix.file);
  rebuilt.source.proposedFilename = fix.file;
  rebuilt.source.captureOrder = fix.order;
  Object.keys(r).forEach(k => delete r[k]);
  Object.assign(r, rebuilt);
  note('m277-laser', `M277 ${fix.file}: rebuilt as ${JSON.stringify(fix.snapName)} (was ${JSON.stringify(fix.wrongName)})`);
}

// ------------------------------------------------- F4: silently dropped records
// Eight screenshots survived on disk but lost their records in the rebuild.
const dropped = [
  ['RPKM', '27_RPKM_Grip_Folding_Stubby.png'],
  ['RPKM', '28_RPKM_Grip_Ribbed_Stubby.png'],
  ['RPKM', '29_RPKM_Grip_Canted_Stubby.png'],
  ['RPKM', '30_RPKM_Grip_Stippled_Stubby.png'],
  ['RPKM', '31_RPKM_Grip_Low-Profile_Stubby.png'],
  ['RPKM', '32_RPKM_Grip_Slim_Handstop.png'],
  ['TR7', '50_TR7_Laser_5_MW_Green.png'],
  ['TR7', '52_TR7_Laser_50_MW_Blue.png'],
];
for (const [weapon, file] of dropped) {
  const already = cur.records.some(r => r.weaponName === weapon && baseName(r.source.currentPath) === file);
  if (already) continue;
  const source = snapByFile.get(`${weapon}|${file}`);
  if (!source) throw new Error(`snapshot has no record for ${weapon}/${file}`);
  if (!fs.existsSync(source.source.currentPath)) throw new Error(`screenshot missing on disk: ${source.source.currentPath}`);
  const restored = clone(source);
  // slot it back next to its neighbours in the weapon block
  const order = restored.source.captureOrder;
  let at = -1;
  for (let i = 0; i < cur.records.length; i += 1) {
    const r = cur.records[i];
    if (r.weaponName !== weapon) continue;
    if (r.source.captureOrder < order) at = i;
  }
  cur.records.splice(at + 1, 0, restored);
  note('restore-record', `${weapon}: re-added ${restored.attachmentType}/${restored.attachmentName} (${file})`);
}

// ------------------------------------------------------ F5-F7: field-level restores
const STAT_KEYS = new Set();
let statsRestored = 0, costRestored = 0, descRestored = 0, mapRestored = 0, provRestored = 0, notesRestored = 0;
const ambiguous = new Set();

const curByIdentity = new Map();
for (const r of cur.records) {
  const k = identity(r);
  if (!curByIdentity.has(k)) curByIdentity.set(k, []);
  curByIdentity.get(k).push(r);
}

for (const [k, list] of curByIdentity) {
  const before = snapUnique(k);
  if (!before) { if (snapByIdentity.has(k)) ambiguous.add(k); continue; }
  if (list.length !== 1) { ambiguous.add(k); continue; }
  const r = list[0];

  // F6a: hand-corrected stat values replaced by a noisier OCR pass
  if (JSON.stringify(r.stats) !== JSON.stringify(before.stats)) {
    const A = r.stats || {}, B = before.stats || {};
    for (const f of Object.keys(B)) {
      if (JSON.stringify(A[f]) === JSON.stringify(B[f])) continue;
      STAT_KEYS.add(`${k} :: ${f}: ${JSON.stringify(A[f])} -> ${JSON.stringify(B[f])}`);
      A[f] = B[f];
      if (r.statFieldReasons && B[f] !== null && B[f] !== undefined) delete r.statFieldReasons[f];
      statsRestored += 1;
    }
    r.stats = A;
  }

  // F6b: attachment cost dropped to null
  if (r.attachmentCost !== before.attachmentCost && r.attachmentCost === null && before.attachmentCost !== null) {
    r.attachmentCost = before.attachmentCost;
    if (r.statFieldReasons) delete r.statFieldReasons.attachmentCost;
    costRestored += 1;
    note('cost', `${k}: attachmentCost null -> ${before.attachmentCost}`);
  }

  // F6c: description replaced by OCR noise
  if (JSON.stringify(r.attachmentDescription) !== JSON.stringify(before.attachmentDescription)
    && before.attachmentDescription === null) {
    note('description', `${k}: description ${JSON.stringify(r.attachmentDescription)} -> null`);
    r.attachmentDescription = null;
    descRestored += 1;
  }

  // F6d: mapping review status downgraded away from a completed visual check
  if (before.mappingReviewStatus === 'visually-checked' && r.mappingReviewStatus === 'ocr-pending') {
    r.mappingReviewStatus = 'visually-checked';
    mapRestored += 1;
    note('mapping-status', `${k}: ocr-pending -> visually-checked`);
  }

  // F5: original-screenshot provenance shifted by the renumber
  if (r.source.originalFilename !== before.source.originalFilename) {
    r.source.originalPath = before.source.originalPath;
    r.source.originalFilename = before.source.originalFilename;
    r.source.captureTimestamp = before.source.captureTimestamp;
    provRestored += 1;
  }

  // F7: manual-review provenance notes wiped by the rebuild
  const have = new Set(r.notes || []);
  const missing = (before.notes || []).filter(n => !have.has(n));
  if (missing.length) {
    r.notes = [...(r.notes || []), ...missing];
    notesRestored += missing.length;
  }
}

// ------------------------- F9: same restores for records whose identity repeats
// M1014 carries a pre-existing pair of duplicate captures, so weapon|type|name is
// not a key there. Its filenames are unique on both sides, and the rebuild left
// them alone, so fall back to matching on the screenshot filename.
let fallbackNotes = 0, fallbackProv = 0;
const curByFile = new Map();
for (const r of cur.records) {
  const k = `${r.weaponName}|${baseName(r.source.currentPath)}`;
  if (!curByFile.has(k)) curByFile.set(k, []);
  curByFile.get(k).push(r);
}
for (const k of ambiguous) {
  for (const r of cur.records.filter(x => identity(x) === k)) {
    const fk = `${r.weaponName}|${baseName(r.source.currentPath)}`;
    if (curByFile.get(fk).length !== 1) continue;
    const before = snapByFile.get(fk);
    if (!before) continue;
    if (r.source.originalFilename !== before.source.originalFilename) {
      r.source.originalPath = before.source.originalPath;
      r.source.originalFilename = before.source.originalFilename;
      r.source.captureTimestamp = before.source.captureTimestamp;
      fallbackProv += 1;
    }
    const have = new Set(r.notes || []);
    const missing = (before.notes || []).filter(n => !have.has(n));
    if (missing.length) {
      r.notes = [...(r.notes || []), ...missing];
      fallbackNotes += missing.length;
    }
  }
}

// ------------------- F10: true provenance for the newly imported "missing" records
// The rebuild gave the 8 newly captured groups the original-filenames of whichever
// record previously sat at their numeric position, instead of the Missing/ capture
// they were actually built from. Recover the real source by matching raw OCR text.
const NEW_GROUPS = [['M417 A2', 'Ammo'], ['SOR-300SC', 'Barrel'], ['SG 553R', 'Light'], ['M277', 'Barrel'],
  ['KTS100 MK8', 'Barrel'], ['M121 A2', 'Light'], ['M45A1', 'Magazine'], ['RPK-74M', 'Light']];
const normText = s => (s || '').replace(/\s+/g, ' ').trim().slice(0, 200);
// Only the pre-rename pass knows the Missing/ capture each record was built from;
// the "-final-" pass re-OCRs the same screenshots after they were moved and renamed.
const ocrByText = new Map();
for (const e of read(path.join(AUDIT_DIR, 'raw-ocr-missing-20260731.json'))) {
  const k = `${e.weapon}||${normText(e.text)}`;
  if (!ocrByText.has(k)) ocrByText.set(k, new Set());
  ocrByText.get(k).add(JSON.stringify({ sourcePath: e.sourcePath, sourceName: e.sourceName }));
}
let newProv = 0;
const newProvUnresolved = [];
for (const [w, t] of NEW_GROUPS) {
  for (const r of cur.records.filter(x => x.weaponName === w && x.attachmentType === t)) {
    const hits = ocrByText.get(`${w}||${normText(r.source.rawFullScreenOcr)}`);
    if (!hits || hits.size !== 1) { newProvUnresolved.push(`${w}/${t}/${r.attachmentName}`); continue; }
    const { sourcePath, sourceName } = JSON.parse([...hits][0]);
    if (r.source.originalFilename === sourceName) continue;
    r.source.originalPath = sourcePath;
    r.source.originalFilename = sourceName;
    r.source.captureTimestamp = (sourceName.match(/ - ([\d.]+) \(/) || [])[1] || null;
    newProv += 1;
    note('new-provenance', `${w} ${t}/${r.attachmentName}: original -> ${sourceName}`);
  }
}

// --------------------------------------------------------------- F8: metadata
cur.recordCount = cur.records.length;
cur.attachmentDetailCount = cur.records.filter(r => r.attachmentType !== 'Overview').length;
cur.mappingReviewedCount = cur.records.filter(r => r.mappingReviewStatus === 'visually-checked').length;

fs.writeFileSync(TARGET, `${JSON.stringify(cur, null, 2)}\n`);

// ------------------------------------------------------------------- reporting
console.log(`snapshot backup: ${path.relative(process.cwd(), backupDir)}`);
for (const c of changes) console.log(`  [${c.kind}] ${c.detail}`);
console.log('\nstat field values restored:', statsRestored);
for (const s of [...STAT_KEYS].sort()) console.log('   ', s);
console.log('\ncosts restored:', costRestored);
console.log('descriptions restored:', descRestored);
console.log('mapping statuses restored:', mapRestored);
console.log('records with provenance restored:', provRestored, `(+${fallbackProv} matched by filename)`);
console.log('review notes restored:', notesRestored, `(+${fallbackNotes} matched by filename)`);
console.log('newly imported records repointed at their real capture:', newProv);
if (newProvUnresolved.length) {
  console.log('  UNRESOLVED new-record provenance:');
  newProvUnresolved.forEach(x => console.log('   ', x));
}
console.log('\nrecordCount:', cur.recordCount, '| attachmentDetailCount:', cur.attachmentDetailCount,
  '| mappingReviewedCount:', cur.mappingReviewedCount);

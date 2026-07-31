import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const auditDir = path.join(root, 'outputs', 'attachment-audit');
const shotsRoot = path.join(root, 'Weapon Attachments');
const ppDir = path.join(shotsRoot, 'SMG', 'PP-19');
const missingDir = path.join(shotsRoot, 'Missing', 'PP-19');
const backupDir = path.join(auditDir, 'backups', 'pre-pp19-missing-20260730');
const now = new Date().toISOString();
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(auditDir, name), 'utf8'));
const writeJson = (name, value) => fs.writeFileSync(path.join(auditDir, name), `${JSON.stringify(value, null, 2)}\n`);
const norm = (p) => path.resolve(p).toLowerCase();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

const missing = [
  ['Battlefield 6 Screenshot 2026.07.30 - 00.11.54.70 (Medium).png', '01_PP-19_Muzzle_None.png'],
  ['Battlefield 6 Screenshot 2026.07.30 - 00.11.59.18 (Medium).png', '34_PP-19_Ammo_FMJ.png'],
  ['Battlefield 6 Screenshot 2026.07.30 - 00.12.02.76 (Medium).png', '35_PP-19_Ammo_Tungsten_Core.png'],
  ['Battlefield 6 Screenshot 2026.07.30 - 00.12.03.99 (Medium).png', '36_PP-19_Ammo_Frangible.png'],
  ['Battlefield 6 Screenshot 2026.07.30 - 00.12.05.61 (Medium).png', '37_PP-19_Ammo_Hollow_Point.png'],
  ['Battlefield 6 Screenshot 2026.07.30 - 00.12.06.89 (Medium).png', '38_PP-19_Ammo_Synthetic_Tip.png'],
  ['Battlefield 6 Screenshot 2026.07.30 - 00.12.08.46 (Medium).png', '39_PP-19_Ammo_Subsonic.png'],
  ['Battlefield 6 Screenshot 2026.07.30 - 00.12.10.32 (Medium).png', '40_PP-19_Ammo_Subsonic_HP.png'],
];
for (const [name] of missing) if (!fs.existsSync(path.join(missingDir, name))) throw new Error(`Missing source screenshot: ${name}`);

const allPng = walk(shotsRoot).filter((p) => /\.png$/i.test(p) && !norm(p).startsWith(`${norm(path.join(shotsRoot, 'Missing'))}${path.sep}`));
const moves = [];
const stringMap = new Map();
for (const src of allPng) {
  const base = path.basename(src);
  let destBase = base;
  const single = base.match(/^(\d)_/);
  if (single) destBase = `0${base}`;
  if (norm(path.dirname(src)) === norm(ppDir)) {
    const m = base.match(/^(\d+)_/);
    if (!m) throw new Error(`PP-19 filename lacks order prefix: ${base}`);
    const oldOrder = Number(m[1]);
    let newOrder = oldOrder >= 34 ? oldOrder + 7 : oldOrder;
    let rest = base.replace(/^\d+_/, '');
    if (oldOrder === 7) rest = 'PP-19_Muzzle_CQB_Suppressor.png';
    destBase = `${String(newOrder).padStart(2, '0')}_${rest}`;
  }
  const dest = path.join(path.dirname(src), destBase);
  if (norm(src) !== norm(dest)) moves.push({ src, dest });
  stringMap.set(src, dest);
  stringMap.set(base, destBase);
}

const wrongOne = path.join(ppDir, '1_PP-19_Muzzle_CQB_Suppressor.png');
if (!fs.existsSync(wrongOne)) throw new Error('Expected displaced PP-19 #1 screenshot was not found.');
fs.mkdirSync(backupDir, { recursive: true });
const wrongBackup = path.join(backupDir, path.basename(wrongOne));
if (fs.existsSync(wrongBackup)) throw new Error(`Backup target already exists: ${wrongBackup}`);

const moveSources = new Set(moves.map((m) => norm(m.src)));
const destinations = new Set();
for (const { src, dest } of moves) {
  const key = norm(dest);
  if (destinations.has(key)) throw new Error(`Rename collision: ${dest}`);
  destinations.add(key);
  if (fs.existsSync(dest) && !moveSources.has(key)) throw new Error(`Destination already exists: ${dest}`);
}
for (const [, destBase] of missing) {
  const dest = path.join(ppDir, destBase);
  if (fs.existsSync(dest) && norm(dest) !== norm(wrongOne)) throw new Error(`New screenshot destination exists: ${dest}`);
}

fs.renameSync(wrongOne, wrongBackup);
const staged = [];
for (let i = 0; i < moves.length; i++) {
  const { src, dest } = moves[i];
  if (!fs.existsSync(src)) continue;
  const temp = path.join(path.dirname(src), `.__codex_20260730_${i}_${path.basename(src)}`);
  fs.renameSync(src, temp);
  staged.push({ temp, dest });
}
for (const { temp, dest } of staged) fs.renameSync(temp, dest);
for (const [srcBase, destBase] of missing) fs.renameSync(path.join(missingDir, srcBase), path.join(ppDir, destBase));

const canonicalPath = path.join(auditDir, 'attachment-screenshot-review.json');
const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
const ppOld = canonical.records.filter((r) => r.weaponName === 'PP-19').sort((a, b) => a.source.captureOrder - b.source.captureOrder);
if (ppOld.length !== 44) throw new Error(`Expected 44 PP-19 records, found ${ppOld.length}`);

const baseline = {
  damage: 26, rateOfFireRpm: 720, magazineSize: 30, hipfire: 47, precision: 50, control: 54, mobility: 68,
  fireModes: ['AUTO', 'SINGLE'], reloadTimeSeconds: 2.467, muzzleVelocityMps: 444, adsTimeMs: 167,
  headshotMultiplier: 1.4, longRangeDamage: 12, spotOnFire3dM: 54, spotOnFire2dM: 150,
  opponentHealthRegenDelaySeconds: 5, collateralMultiplier: 0.57, reloadInAds: true,
  adsMoveSpeedMultiplier: 0.75, sprintRecoveryMs: 100, recoilAmountDegrees: 0.5, recoilVariationDegrees: 18,
};
const cmp = (direction, effect, color) => ({ direction, effect, color, confidence: 1, coloredPixelCount: null, arrowBounds: null });
const newSpecs = [
  { order: 1, type: 'Muzzle', subtype: 'None', cost: 0, name: 'None', desc: null, stats: {}, comparisons: {} },
  { order: 34, type: 'Ammo', subtype: 'Standard', cost: 5, name: 'FMJ', desc: 'Standard-penetration ammunition.', stats: {}, comparisons: {} },
  { order: 35, type: 'Ammo', subtype: 'Penetration', cost: 5, name: 'Tungsten Core', desc: 'Ammunition that trades recoil for improved penetration, resulting in greater damage to soldiers behind the initial target.', stats: { precision: 49, control: 51, collateralMultiplier: 0.75, recoilAmountDegrees: 0.6 }, comparisons: { precision: cmp('down','penalty','red'), control: cmp('down','penalty','red'), collateralMultiplier: cmp('up','buff','green'), recoilAmountDegrees: cmp('up','penalty','red') } },
  { order: 36, type: 'Ammo', subtype: 'Frangible', cost: 20, name: 'Frangible', desc: 'Ammunition that delays health regeneration on impact with the target.', stats: { opponentHealthRegenDelaySeconds: 9, collateralMultiplier: 0.50 }, comparisons: { opponentHealthRegenDelaySeconds: cmp('up','penalty','red'), collateralMultiplier: cmp('down','penalty','red') } },
  { order: 37, type: 'Ammo', subtype: 'Hollow Point', cost: 15, name: 'Hollow Point', desc: 'Ammunition with slightly improved headshot damage.', stats: { headshotMultiplier: 1.57, collateralMultiplier: 0.50 }, comparisons: { headshotMultiplier: cmp('up','buff','green'), collateralMultiplier: cmp('down','penalty','red') } },
  { order: 38, type: 'Ammo', subtype: 'Synthetic', cost: 20, name: 'Synthetic Tip', desc: 'Ammunition with greatly improved headshot damage.', stats: { headshotMultiplier: 1.80, collateralMultiplier: 0.50 }, comparisons: { headshotMultiplier: cmp('up','buff','green'), collateralMultiplier: cmp('down','penalty','red') } },
  { order: 39, type: 'Ammo', subtype: 'Subsonic', cost: 10, name: 'Subsonic', desc: 'Low-velocity ammunition that partially hides in-world spotting and slightly reduces the range where a soldier is spotted on the minimap while firing. Marginally lowers recoil.', stats: { precision: 51, control: 57, muzzleVelocityMps: 227, spotOnFire3dM: 27, spotOnFire2dM: 64, collateralMultiplier: 0.50 }, comparisons: { precision: cmp('up','buff','green'), control: cmp('up','buff','green'), muzzleVelocityMps: cmp('down','penalty','red'), spotOnFire3dM: cmp('down','buff','green'), spotOnFire2dM: cmp('down','buff','green'), collateralMultiplier: cmp('down','penalty','red'), recoilAmountDegrees: cmp('down','buff','green') } },
  { order: 40, type: 'Ammo', subtype: 'Sub HP', cost: 25, name: 'Subsonic HP', desc: 'Low-velocity ammunition that partially hides in-world spotting and slightly reduces the range where a soldier is spotted on the minimap while firing and slightly improves headshot damage.', stats: { precision: 51, control: 57, muzzleVelocityMps: 227, headshotMultiplier: 1.57, spotOnFire3dM: 27, spotOnFire2dM: 64, collateralMultiplier: 0.50 }, comparisons: { precision: cmp('up','buff','green'), control: cmp('up','buff','green'), muzzleVelocityMps: cmp('down','penalty','red'), headshotMultiplier: cmp('up','buff','green'), spotOnFire3dM: cmp('down','buff','green'), spotOnFire2dM: cmp('down','buff','green'), collateralMultiplier: cmp('down','penalty','red'), recoilAmountDegrees: cmp('down','buff','green') } },
];
const finalNameByOrder = new Map(missing.map(([, b]) => [Number(b.match(/^\d+/)[0]), b]));
const originalByOrder = new Map(missing.map(([a, b]) => [Number(b.match(/^\d+/)[0]), a]));
const directNote = 'Directly transcribed from the user-supplied 2026-07-30 screenshot; record remains provisional-review-required and is not promoted to live site data.';
const buildNew = (s) => {
  const destBase = finalNameByOrder.get(s.order);
  const originalBase = originalByOrder.get(s.order);
  const ts = originalBase.match(/- (\d{2}\.\d{2}\.\d{2}\.\d{2})/)[1];
  return {
    weaponName: 'PP-19', attachmentType: s.type, attachmentSubtype: s.subtype, attachmentCost: s.cost,
    attachmentName: s.name, attachmentDescription: s.desc, stats: { ...baseline, ...s.stats }, statComparisons: s.comparisons,
    source: {
      originalPath: path.join(missingDir, originalBase), originalFilename: originalBase, proposedFilename: destBase,
      currentPath: path.join(ppDir, destBase), renameApplied: true, captureOrder: s.order,
      captureTimestamp: `2026-07-30 ${ts.replaceAll('.', ':')}`, resolution: '1365x768',
      rawAttachmentDescriptionOcr: s.desc,
      rawFullScreenOcr: `DIRECT VISUAL TRANSCRIPTION: ${s.type} ${s.name}; cost ${s.cost}; displayed stats transcribed from ${originalBase}.`,
    },
    extractionStatus: 'provisional-review-required', reviewStatus: 'provisional-review-required', mappingReviewStatus: 'visually-checked',
    reviewer: null, reviewDate: null, reviewConflicts: [], statFieldReasons: {}, notes: [directNote],
  };
};

const replaceStrings = (value) => {
  if (typeof value === 'string') {
    if (stringMap.has(value)) return stringMap.get(value);
    for (const [from, to] of stringMap) if (value.includes(from)) value = value.split(from).join(to);
    return value;
  }
  if (Array.isArray(value)) return value.map(replaceStrings);
  if (value && typeof value === 'object') for (const k of Object.keys(value)) value[k] = replaceStrings(value[k]);
  return value;
};
for (const r of canonical.records) replaceStrings(r);
const retained = canonical.records.filter((r) => r.weaponName !== 'PP-19');
const adjusted = ppOld.filter((r) => ![1].includes(r.source.captureOrder)).map((r) => {
  if (r.source.captureOrder >= 34) r.source.captureOrder += 7;
  if (r.source.captureOrder === 7) {
    const b = '07_PP-19_Muzzle_CQB_Suppressor.png';
    r.source.originalPath = path.join(ppDir, b); r.source.originalFilename = b; r.source.proposedFilename = b; r.source.currentPath = path.join(ppDir, b);
    r.source.renameApplied = true;
  }
  return r;
});
const ppFinal = [...adjusted, ...newSpecs.map(buildNew)].sort((a, b) => a.source.captureOrder - b.source.captureOrder);
canonical.records = [...retained, ...ppFinal];
canonical.generatedAt = now;
canonical.recordCount = canonical.records.length;
if ('attachmentDetailCount' in canonical) canonical.attachmentDetailCount = canonical.records.filter((r) => r.attachmentType !== 'Overview').length;
if ('mappingReviewedCount' in canonical) canonical.mappingReviewedCount = canonical.records.filter((r) => r.mappingReviewStatus === 'visually-checked').length;
if ('weaponsProcessed' in canonical) canonical.weaponsProcessed = new Set(canonical.records.map((r) => r.weaponName)).size;
fs.writeFileSync(canonicalPath, `${JSON.stringify(canonical, null, 2)}\n`);

const manual = readJson('manual-review-overrides.json');
for (const o of manual.overrides) replaceStrings(o);
const ppOverrides = ppFinal.filter((r) => r.attachmentType !== 'Overview').map((r) => ({
  sourcePath: r.source.currentPath, weaponName: 'PP-19',
  updates: { attachmentType: r.attachmentType, attachmentName: r.attachmentName, attachmentSubtype: r.attachmentSubtype, attachmentCost: r.attachmentCost, ...(r.attachmentDescription ? { attachmentDescription: r.attachmentDescription } : {}), ...r.stats },
  comparisons: r.statComparisons ?? {}, replaceComparisons: true,
  evidence: [{ kind: 'direct-screenshot-review', source: r.source.currentPath }], sourceFilename: path.basename(r.source.currentPath),
}));
manual.overrides = [...manual.overrides.filter((o) => o.weaponName !== 'PP-19'), ...ppOverrides];
manual.generatedAt = now;
writeJson('manual-review-overrides.json', manual);

const capture = readJson('capture-order.json');
for (const e of capture.entries) replaceStrings(e);
capture.entries = [...capture.entries.filter((e) => e.weaponName !== 'PP-19'), ...ppFinal.map((r) => ({
  weaponName: 'PP-19', captureOrder: r.source.captureOrder, attachmentType: r.attachmentType, attachmentName: r.attachmentName,
  attachmentSubtype: r.attachmentSubtype, currentFilename: path.basename(r.source.currentPath), currentDirectory: ppDir,
  proposedFilename: path.basename(r.source.currentPath), originalFilename: r.source.originalFilename, originalPath: r.source.originalPath, captureTimestamp: r.source.captureTimestamp,
}))];
capture.entries.sort((a,b) => a.weaponName.localeCompare(b.weaponName) || a.captureOrder-b.captureOrder);
capture.generatedAt = now; capture.recordCount = capture.entries.length; writeJson('capture-order.json', capture);

const manifest = readJson('rename-manifest.json');
for (const e of manifest.entries) replaceStrings(e);
manifest.entries = [...manifest.entries.filter((e) => e.weaponName !== 'PP-19'), ...ppFinal.map((r) => ({
  weaponName:'PP-19', captureOrder:r.source.captureOrder, sourcePath:r.source.currentPath, sourceFilename:path.basename(r.source.currentPath),
  targetPath:r.source.currentPath, targetFilename:path.basename(r.source.currentPath), duplicateCapture:false, classification:'already-canonical', renameAllowed:true,
}))];
manifest.generatedAt=now; writeJson('rename-manifest.json',manifest);

const provenance = readJson('rename-provenance.json');
for (const e of provenance) replaceStrings(e);
writeJson('rename-provenance.json', [...provenance.filter((e)=>e.weaponName!=='PP-19'), ...ppFinal.map((r)=>({weaponName:'PP-19',captureOrder:r.source.captureOrder,originalPath:r.source.originalPath,originalFilename:r.source.originalFilename,currentPath:r.source.currentPath,currentFilename:path.basename(r.source.currentPath)}))]);

const raw = readJson('raw-ocr.json');
for (const e of raw) replaceStrings(e);
writeJson('raw-ocr.json', [...raw.filter((e)=>e.weapon!=='PP-19'), ...ppFinal.map((r)=>({weapon:'PP-19',sourcePath:r.source.currentPath,sourceName:path.basename(r.source.currentPath),width:1365,height:768,text:r.source.rawFullScreenOcr,lines:[]}))]);

const comparisons = readJson('stat-comparisons.json');
for (const e of comparisons) replaceStrings(e);
writeJson('stat-comparisons.json', [...comparisons.filter((e)=>e.weapon!=='PP-19'), ...ppFinal.filter((r)=>r.attachmentType!=='Overview').map((r)=>({weapon:'PP-19',sourcePath:r.source.currentPath,sourceName:path.basename(r.source.currentPath),resolution:'1365x768',comparisons:r.statComparisons??{}}))]);

const auxiliary = ['coverage-report.json','field-ocr.json','highlight-cards.json','panel-ocr.json','value-ocr.json','visual-stat-map.json','recoil-ocr.json','recoil-value-ocr.json','recoil-visual-map.json','cost-ocr.json'];
for (const name of auxiliary) if (fs.existsSync(path.join(auditDir,name))) { const j=readJson(name); replaceStrings(j); if (j && !Array.isArray(j) && 'generatedAt' in j) j.generatedAt=now; writeJson(name,j); }

const coverage = readJson('coverage-report.json');
const cw = coverage.weapons.find((w) => w.weapon === 'PP-19');
if (cw) {
  cw.screenshotCountBefore = ppFinal.length;
  cw.overviewCount = 1;
  cw.records = ppFinal.map((r)=>({type:r.attachmentType,name:r.attachmentName,subtype:r.attachmentSubtype,sourcePath:r.source.currentPath,duplicate:false,status:r.extractionStatus}));
}
if (coverage.statCoverageByWeapon?.['PP-19']) for (const v of Object.values(coverage.statCoverageByWeapon['PP-19'])) { v.populated=50; v.total=50; }
for (const key of ['screenshotsBefore','screenshotsAfter','records','detailRecords','newClassRecords','fullyTranscribedNewClass','mappingReviewed']) if (typeof coverage.totals?.[key] === 'number') coverage.totals[key] += 7;
coverage.generatedAt=now; writeJson('coverage-report.json',coverage);

console.log(JSON.stringify({renamedExisting:moves.length,addedScreenshots:missing.length,pp19Records:ppFinal.length,pp19DetailRecords:ppOverrides.length,canonicalRecords:canonical.records.length,backup:wrongBackup},null,2));

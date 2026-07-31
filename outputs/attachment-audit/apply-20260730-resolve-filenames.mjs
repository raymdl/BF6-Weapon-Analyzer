import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const auditDir = path.join(root, 'outputs', 'attachment-audit');
const read = (name) => JSON.parse(fs.readFileSync(path.join(auditDir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(auditDir, name), `${JSON.stringify(value, null, 2)}\n`);
const canonical = read('attachment-screenshot-review.json');
const now = new Date().toISOString();
const norm = (p) => path.resolve(p).toLowerCase();
const sanitize = (value) => value.replace(/^#/, '').replace(/"/g, 'in').replace(/[^A-Za-z0-9.-]+/g, '_').replace(/^_+|_+$/g, '');

const corrections = new Map([
  ['AK4D:54', { type: 'Laser', subtype: 'None' }],
  ['EF88:63', { type: 'Light', subtype: 'None' }],
  ['NVO-228E:18', { type: 'Light', subtype: 'None' }],
  ['NVO-228E:55', { type: 'Laser', subtype: 'None' }],
  ['M87A1:22', { subtype: '6 Rnd' }],
  ['L115:24', { subtype: 'Range Pen' }],
  ['M2010 ESR:25', { subtype: 'Range Pen' }],
  ['SV-98:19', { subtype: 'Range Pen' }],
  ['SG 553R:43', { subtype: 'Sub HP' }],
  ['SOR-300SC:42', { subtype: 'Sub HP' }],
]);

for (const record of canonical.records) {
  const fix = corrections.get(`${record.weaponName}:${record.source.captureOrder}`);
  if (fix?.type) record.attachmentType = fix.type;
  if (fix?.subtype) record.attachmentSubtype = fix.subtype;
}

const changes = [];
for (const record of canonical.records) {
  const oldPath = record.source.currentPath;
  const oldBase = path.basename(oldPath);
  const isAmbiguous = /ambiguous/i.test(oldBase);
  const isFalseDuplicate = [
    'AK4D:54', 'EF88:63', 'NVO-228E:18', 'M2010 ESR:41',
  ].includes(`${record.weaponName}:${record.source.captureOrder}`);
  const isNvoSlotCorrection = `${record.weaponName}:${record.source.captureOrder}` === 'NVO-228E:55';
  if (!isAmbiguous && !isFalseDuplicate && !isNvoSlotCorrection) continue;

  const prefix = oldBase.match(/^(\d+)_/)?.[1];
  if (!prefix) throw new Error(`No numeric prefix: ${oldBase}`);
  let token;
  if (record.attachmentType === 'Barrel') {
    if (record.weaponName === 'GRT-CPS') token = 'Basic_16in_Rifle';
    else if (record.weaponName === 'VSSM') token = 'Suppressed_200MM_ASM';
    else token = sanitize(record.attachmentSubtype);
  } else if (record.attachmentType === 'Ammo') {
    const shotgunStandard = ['18.5KS-K', 'DB-12', 'M1014', 'M87A1'].includes(record.weaponName) && record.attachmentSubtype === 'Standard';
    token = sanitize(shotgunStandard ? record.attachmentName : record.attachmentSubtype);
  } else {
    token = sanitize(record.attachmentName);
  }
  const newBase = `${prefix}_${record.weaponName}_${record.attachmentType}_${token}.png`;
  const newPath = path.join(path.dirname(oldPath), newBase);
  if (norm(oldPath) === norm(newPath)) continue;
  changes.push({ record, oldPath, oldBase, newPath, newBase });
}

const sources = new Set(changes.map((c) => norm(c.oldPath)));
const targets = new Set();
for (const change of changes) {
  if (!fs.existsSync(change.oldPath)) throw new Error(`Missing source: ${change.oldPath}`);
  const key = norm(change.newPath);
  if (targets.has(key)) throw new Error(`Duplicate target: ${change.newPath}`);
  targets.add(key);
  if (fs.existsSync(change.newPath) && !sources.has(key)) throw new Error(`Target exists: ${change.newPath}`);
}

const staged = changes.map((change, index) => {
  const temp = path.join(path.dirname(change.oldPath), `.__codex_resolve_${index}_${change.oldBase}`);
  fs.renameSync(change.oldPath, temp);
  return { ...change, temp };
});
for (const change of staged) fs.renameSync(change.temp, change.newPath);

const pathMap = new Map();
const nameMap = new Map();
for (const change of changes) {
  pathMap.set(change.oldPath, change.newPath);
  nameMap.set(change.oldBase, change.newBase);
  change.record.source.currentPath = change.newPath;
  change.record.source.proposedFilename = change.newBase;
  change.record.source.renameApplied = true;
  change.record.notes ??= [];
  const note = 'Filename and attachment identity were reconciled by direct visual review on 2026-07-30; raw original-path provenance is preserved.';
  if (!change.record.notes.includes(note)) change.record.notes.push(note);
}
canonical.generatedAt = now;
write('attachment-screenshot-review.json', canonical);

const currentByKey = new Map(canonical.records.map((r) => [`${r.weaponName}:${r.source.captureOrder}`, r]));
const replaceCurrentStrings = (value) => {
  if (typeof value === 'string') {
    if (pathMap.has(value)) return pathMap.get(value);
    if (nameMap.has(value)) return nameMap.get(value);
    for (const [from, to] of pathMap) if (value.includes(from)) value = value.split(from).join(to);
    for (const [from, to] of nameMap) if (value.includes(from)) value = value.split(from).join(to);
    return value;
  }
  if (Array.isArray(value)) return value.map(replaceCurrentStrings);
  if (value && typeof value === 'object') for (const key of Object.keys(value)) value[key] = replaceCurrentStrings(value[key]);
  return value;
};

const manual = read('manual-review-overrides.json');
for (const override of manual.overrides) {
  replaceCurrentStrings(override);
  const row = canonical.records.find((r) => r.weaponName === override.weaponName && norm(r.source.currentPath) === norm(override.sourcePath));
  if (row) {
    override.updates.attachmentType = row.attachmentType;
    override.updates.attachmentSubtype = row.attachmentSubtype;
  }
}
manual.generatedAt = now;
write('manual-review-overrides.json', manual);

const capture = read('capture-order.json');
for (const entry of capture.entries) {
  const row = currentByKey.get(`${entry.weaponName}:${entry.captureOrder}`);
  if (!row) continue;
  entry.attachmentType = row.attachmentType;
  entry.attachmentSubtype = row.attachmentSubtype;
  entry.currentFilename = path.basename(row.source.currentPath);
  entry.proposedFilename = path.basename(row.source.currentPath);
}
capture.generatedAt = now;
write('capture-order.json', capture);

const manifest = read('rename-manifest.json');
for (const entry of manifest.entries) {
  const row = currentByKey.get(`${entry.weaponName}:${entry.captureOrder}`);
  if (!row) continue;
  entry.sourcePath = row.source.currentPath;
  entry.sourceFilename = path.basename(row.source.currentPath);
  entry.targetPath = row.source.currentPath;
  entry.targetFilename = path.basename(row.source.currentPath);
  entry.duplicateCapture = /duplicate/i.test(entry.targetFilename);
  entry.classification = entry.duplicateCapture ? 'duplicate-capture' : 'already-canonical';
}
manifest.generatedAt = now;
write('rename-manifest.json', manifest);

const provenance = read('rename-provenance.json');
for (const entry of provenance) {
  const row = currentByKey.get(`${entry.weaponName}:${entry.captureOrder}`);
  if (!row) continue;
  entry.currentPath = row.source.currentPath;
  entry.currentFilename = path.basename(row.source.currentPath);
}
write('rename-provenance.json', provenance);

for (const name of ['raw-ocr.json', 'stat-comparisons.json']) {
  const doc = read(name);
  replaceCurrentStrings(doc);
  write(name, doc);
}

const coverage = read('coverage-report.json');
for (const weapon of coverage.weapons ?? []) {
  for (const item of weapon.records ?? []) {
    replaceCurrentStrings(item);
    const row = canonical.records.find((r) => r.weaponName === weapon.weapon && norm(r.source.currentPath) === norm(item.sourcePath));
    if (row) { item.type = row.attachmentType; item.subtype = row.attachmentSubtype; }
  }
}
coverage.generatedAt = now;
write('coverage-report.json', coverage);

for (const name of ['field-ocr.json','highlight-cards.json','panel-ocr.json','value-ocr.json','visual-stat-map.json','recoil-ocr.json','recoil-value-ocr.json','recoil-visual-map.json','cost-ocr.json']) {
  const file = path.join(auditDir, name);
  if (!fs.existsSync(file)) continue;
  const doc = read(name);
  replaceCurrentStrings(doc);
  if (!Array.isArray(doc) && doc && 'generatedAt' in doc) doc.generatedAt = now;
  write(name, doc);
}

console.log(JSON.stringify({ renamed: changes.length, visuallyResolvedAmbiguous: changes.filter((c) => /ambiguous/i.test(c.oldBase)).length, falseDuplicateCorrections: changes.filter((c) => /duplicate/i.test(c.oldBase)).length, remainingDuplicateFiles: canonical.records.filter((r) => /duplicate/i.test(r.source.currentPath)).length }, null, 2));

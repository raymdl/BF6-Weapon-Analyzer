// Creates the screenshot-backed subsonic velocity register. This is an audit
// and proposed-model contract only: it deliberately does not add unverified
// ammo availability or runtime behavior to data/ammo.json.

import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.resolve('outputs/attachment-audit');
const REVIEW_PATH = path.join(AUDIT_DIR, 'attachment-screenshot-review.json');
const OUTPUT_PATH = path.join(AUDIT_DIR, 'subsonic-velocity-treatments-20260731.json');
const REVIEW_DATE = '2026-07-31';
const fail = message => { throw new Error(`subsonic velocity register: ${message}`); };
const sourceKey = value => path.resolve(value || '').toLowerCase();

const SPECS = [
  { weaponName: 'P18', baseVelocityMps: 350, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 1, screenshotVelocityMps: 280 },
  { weaponName: 'CZ3A1', baseVelocityMps: 336, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 2, screenshotVelocityMps: 215 },
  { weaponName: 'KV9', baseVelocityMps: 362, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 2, screenshotVelocityMps: 231 },
  { weaponName: 'PW5A3', baseVelocityMps: 408, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 2, screenshotVelocityMps: 261 },
  { weaponName: 'SCW-10', baseVelocityMps: 398, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 2, screenshotVelocityMps: 254 },
  { weaponName: 'SGX', baseVelocityMps: 378, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 2, screenshotVelocityMps: 241 },
  { weaponName: 'PP-19', baseVelocityMps: 444, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 3, screenshotVelocityMps: 227 },
  { weaponName: 'SG 553R', baseVelocityMps: 483, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 3, screenshotVelocityMps: 247 },
  { weaponName: 'SL9', baseVelocityMps: 486, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 3, screenshotVelocityMps: 248 },
  { weaponName: 'SOR-300SC', baseVelocityMps: 528, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 3, screenshotVelocityMps: 270 },
  { weaponName: 'UMG-40', baseVelocityMps: 467, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-tier', subsonicVelocityTier: 3, screenshotVelocityMps: 239 },
  { weaponName: 'M417 A2', baseVelocityMps: 560, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-absolute', subsonicVelocityMps: 273, screenshotVelocityMps: 273 },
  { weaponName: 'USG-90', baseVelocityMps: 543, attachmentNames: ['Subsonic', 'Subsonic HP'], kind: 'subsonic-absolute', subsonicVelocityMps: 265, screenshotVelocityMps: 265 },
  { weaponName: 'PW7A2', baseVelocityMps: 576, attachmentNames: ['Subsonic Tungsten'], kind: 'subsonic-tungsten-absolute', subsonicVelocityMps: 341, screenshotVelocityMps: 341, combinesWith: 'penetration' },
];

if (fs.existsSync(OUTPUT_PATH)) fail(`refusing to overwrite existing register ${OUTPUT_PATH}`);
const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
const subsonicRows = review.records.filter(row => row.stats && row.attachmentType === 'Ammo' && /subsonic/i.test(row.attachmentName || ''));
const selected = [];

for (const spec of SPECS) {
  const rows = subsonicRows.filter(row => row.weaponName === spec.weaponName && spec.attachmentNames.includes(row.attachmentName));
  if (rows.length !== spec.attachmentNames.length) fail(`${spec.weaponName}: expected ${spec.attachmentNames.length} subsonic source record(s), found ${rows.length}`);
  for (const row of rows) {
    if (!row.source?.currentPath || !fs.existsSync(row.source.currentPath)) fail(`${spec.weaponName}/${row.attachmentName}: source screenshot is missing`);
    if (row.stats.muzzleVelocityMps !== spec.screenshotVelocityMps) fail(`${spec.weaponName}/${row.attachmentName}: expected direct velocity ${spec.screenshotVelocityMps}, found ${row.stats.muzzleVelocityMps}`);
    const velocityTreatment = spec.kind === 'subsonic-tier'
      ? { kind: spec.kind, subsonicVelocityTier: spec.subsonicVelocityTier, displayRounding: 'floor' }
      : { kind: spec.kind, subsonicVelocityMps: spec.subsonicVelocityMps, ...(spec.combinesWith ? { combinesWith: spec.combinesWith } : {}) };
    selected.push({
      weaponName: row.weaponName,
      attachmentType: row.attachmentType,
      attachmentName: row.attachmentName,
      sourcePath: row.source.currentPath,
      sourceFilename: path.basename(row.source.currentPath),
      baseVelocityMps: spec.baseVelocityMps,
      screenshotVelocityMps: spec.screenshotVelocityMps,
      velocityTreatment,
      reviewMethod: 'direct-source-screenshot-velocity-strip',
    });
  }
}

if (selected.length !== 27 || new Set(selected.map(row => sourceKey(row.sourcePath))).size !== 27) fail(`expected 27 unique direct screenshot treatments, found ${selected.length}`);
const unmatched = subsonicRows.filter(row => !selected.some(item => sourceKey(item.sourcePath) === sourceKey(row.source?.currentPath)));
if (unmatched.length) fail(`unregistered subsonic screenshot(s): ${unmatched.map(row => row.source.currentPath).join('; ')}`);
for (const row of selected.filter(row => row.velocityTreatment.kind === 'subsonic-tier')) {
  const expected = Math.floor(row.baseVelocityMps * (0.8 ** row.velocityTreatment.subsonicVelocityTier));
  if (row.screenshotVelocityMps !== expected) fail(`${row.weaponName}/${row.attachmentName}: tier output ${row.screenshotVelocityMps} must equal floor(${row.baseVelocityMps} * 0.8^${row.velocityTreatment.subsonicVelocityTier}) = ${expected}`);
}

selected.sort((a, b) => a.weaponName.localeCompare(b.weaponName) || a.sourcePath.localeCompare(b.sourcePath));
const byKind = Object.fromEntries([...new Set(selected.map(row => row.velocityTreatment.kind))].sort().map(kind => [kind, selected.filter(row => row.velocityTreatment.kind === kind).length]));
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({
  kind: 'subsonic-velocity-treatment-register',
  reviewedAt: REVIEW_DATE,
  scope: 'Screenshot-audit validation and proposed model only; no live data/ammo availability or resolver behavior is changed by this register.',
  normalAmmoVelocityPolicy: 'Every listed path is excluded from the generic normal-ammo 0.8 ladder. Unlisted subsonic screenshots remain validation errors until directly reviewed.',
  modelShape: {
    location: 'WEAPON_AMMO[weaponId].ammo[ammoId].velocityTreatment',
    tier: '{ kind: "subsonic-tier", subsonicVelocityTier: 1|2|3, displayRounding: "floor" }',
    absolute: '{ kind: "subsonic-absolute", subsonicVelocityMps: integer }',
    composite: '{ kind: "subsonic-tungsten-absolute", subsonicVelocityMps: integer, combinesWith: "penetration" }',
  },
  treatments: selected,
  counts: { treatments: selected.length, byKind },
}, null, 2)}\n`);
console.log(`Subsonic velocity treatment register saved: ${selected.length} direct screenshot rows.`);

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('migration/1.3.3.0/attachment-audit');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
const key = row => `${row.weaponName}|${row.source.captureOrder}`;

const barrelSubtypes = new Map(Object.entries({
  '18.5KS-K|7': 'Basic', '18.5KS-K|8': 'Extended',
  'AK4D|15': 'Heavy Ext',
  'DRS-IAR|13': 'Basic', 'DRS-IAR|14': 'Heavy',
  'GRT-CPS|13': 'Extended', 'GRT-CPS|14': 'Basic',
  'L115|9': 'Basic', 'L115|10': 'Light',
  'M2010 ESR|11': 'Basic', 'M2010 ESR|13': 'Light',
  'M240L|11': 'Heavy Ext',
  'M60|13': 'Heavy', 'M60|14': 'Heavy Ext', 'M60|15': 'Light',
  'Mini Scout|12': 'Basic', 'Mini Scout|15': 'Light',
  'PP-19|8': 'Basic', 'PP-19|10': 'Extended',
  'RPK-74M|12': 'Basic', 'RPK-74M|13': 'Heavy', 'RPK-74M|14': 'Heavy Ext',
  'RPKM|12': 'Basic', 'RPKM|13': 'Heavy', 'RPKM|14': 'Heavy Ext',
  'SV-98|7': 'Basic', 'SV-98|10': 'Light',
  'SVK-8.6|11': 'Basic', 'SVK-8.6|12': 'Extended',
}));

const identities = new Map(Object.entries({
  '32_M1014_Ammo_Standard_ambiguous-4.png': ['Ammo', 'SLUGS', 'Standard'],
  '61_M1014_Ammo_SLUGS_duplicate-2.png': ['Ammo', 'SLUGS', 'Standard'],
  '36_M121 A2_Ammo_Standard.png': ['Ammo', 'FMJ', 'Standard'],
  '37_M121 A2_Ammo_Standard_ambiguous-2.png': ['Ammo', 'Tungsten Core', 'Penetration'],
  '38_M121 A2_Ammo_Standard_ambiguous-3.png': ['Ammo', 'Frangible', 'Frangible'],
  '42_L110_Ammo_Standard_ambiguous-2.png': ['Ammo', 'Frangible', 'Frangible'],
  '40_M123K_Ammo_Standard_ambiguous-2.png': ['Ammo', 'Frangible', 'Frangible'],
  '39_M2010 ESR_Laser_50_MW_Blue.png': ['Laser', '50 MW Green', 'Green Laser'],
  '40_M2010 ESR_Laser_50_MW_Blue_duplicate-2.png': ['Laser', '50 MW Blue', 'Blue Laser'],
  '59_EF88_Laser_None_duplicate-2.png': ['Laser', 'None', 'None'],
  '39_Mini Scout_Laser_50_MW_Violet.png': ['Laser', '50 MW Violet', 'Violet Laser'],
  '16_GRT-BC_Grip_None.png': ['Grip', 'None', 'None'],
}));
const identityFor = row => identities.get(path.basename(row.source.currentPath));

const recoveredCosts = new Map(Object.entries({
  '28_18.5KS-K_Magazine_4RND_MAGAZINE.png': 5, '31_18.5KS-K_Ammo_Standard.png': 10, '32_18.5KS-K_Ammo_Standard_ambiguous-2.png': 20,
  '7_18.5KS-K_Barrel_Basic.png': 10, '8_18.5KS-K_Barrel_Extended.png': 5,
  '21_DB-12_Ammo_Standard.png': 10, '22_DB-12_Ammo_Standard_ambiguous-2.png': 20, '4_DB-12_Barrel_Basic.png': 10, '7_DB-12_Grip_FACTORY_ANGLED.png': 15,
  '13_GRT-CPS_Barrel_Basic.png': 5, '14_GRT-CPS_Barrel_Basic_ambiguous-2.png': 10, '41_GRT-CPS_Magazine_20Rnd_Fast_Mag.png': 10,
  '14_LMR27_Barrel_Extended.png': 5, '15_LMR27_Barrel_Light.png': 20, '24_LMR27_Grip_FACTORY_ANGLED.png': 25,
  '41_LMR27_Magazine_10Rnd_Fast_Mag.png': 10, '42_LMR27_Magazine_15Rnd_Magazine.png': 20, '43_LMR27_Magazine_15Rnd_Fast_Mag.png': 5,
  '27_M1014_Magazine_4RND_SPEEDLOADER.png': 10, '29_M1014_Ammo_Standard.png': 10, '30_M1014_Ammo_Standard_ambiguous-2.png': 20,
  '5_M1014_Barrel_Basic.png': 10, '56_M1014_Magazine_4RND_SPEEDLOADER_duplicate-2.png': 10, '58_M1014_Ammo_BUCKSHOT_duplicate-2.png': 10, '59_M1014_Ammo_00_BUCKSHOT_duplicate-2.png': 20,
  '15_M39 EMR_Barrel_Short.png': 15, '41_M39 EMR_Magazine_15Rnd_Fast_Mag.png': 10, '44_M39 EMR_Magazine_25Rnd_Magazine.png': 20,
  '5_M87A1_Barrel_Basic.png': 10, '39_Mini Scout_Laser_50_MW_Violet.png': 10,
  '12_SVDM_Barrel_Short.png': 15, '40_SVDM_Magazine_5Rnd_Magazine.png': 5,
  '38_SVK-8.6_Magazine_10Rnd_Fast_Mag.png': 10, '4_SVK-8.6_Muzzle_Triple-Port_Brake.png': 10, '42_SVK-8.6_Ammo_Long-range.png': 20,
  '2_VSSM_Barrel_Suppressed_ambiguous-2.png': 20, '30_VSSM_Ammo_Range_Pen.png': 10,
}));

const costs = new Map(Object.entries({
  'DRS-IAR|Barrel': [10,10,5,10,15,20],
  'DRS-IAR|Magazine': [5,10,15,25,30,35,40,45,55],
  'DRS-IAR|Ergonomics': [0,10,15,5,5],
  'EF88|Barrel': [10,5,10,15,20,20,25,25],
  'KTS100 MK8|Magazine': [5,5,5,10,10,45],
  'KTS100 MK8|Ergonomics': [0,15,5],
  'KTS100 MK8|Laser/Light': [0,5,10,15,10,10,10,20,20,30,20,20],
  'L110|Barrel': [10,10,20], 'L110|Magazine': [5,50],
  'L85A3|Barrel': [10,10,5,10,15,20,20],
  'L85A3|Magazine': [5,5,5,10,15,25,30,35,40],
  'M121 A2|Barrel': [10,15,10], 'M121 A2|Magazine': [5,10,55],
  'M123K|Barrel': [10,10,15], 'M123K|Magazine': [5,50],
  'M16A4|Barrel': [5,10,5,10,15,20,20],
  'M240L|Barrel': [10,10,20], 'M240L|Magazine': [5,15,25], 'M240L|Ammo': [5,5,20,15],
  'M250|Barrel': [10,10], 'M250|Magazine': [5,55],
  'M60|Barrel': [10,10,20], 'M60|Magazine': [5,5],
  'QBZ-192|Barrel': [5,10,20], 'QBZ-192|Magazine': [5,10,15,25], 'QBZ-192|Ergonomics': [0,15,5],
  'RPK-74M|Muzzle': [0,10,20,10,10,20,10,20,25,30,30],
  'RPK-74M|Barrel': [10,10,10,15], 'RPK-74M|Magazine': [5,10,5,10,5,10,20,50], 'RPK-74M|Ergonomics': [0,10,15,5],
  'RPKM|Muzzle': [0,10,20,10,10,20,10,20,25,30,30],
  'RPKM|Barrel': [10,10,10,5,15], 'RPKM|Magazine': [5,10,5,10,5,30,50], 'RPKM|Ergonomics': [0,10,15,5],
}));

const review = read('attachment-screenshot-review.json');
const recoil = read('recoil-visual-map.json');
const recoilByPath = new Map(recoil.map(row => [path.resolve(row.sourcePath).toLowerCase(), row.recoilAmountDegrees]));
const changes = { identities: [], barrelSubtypes: [], costs: [], recoil: [], duplicateHarmonized: [] };

for (const row of review.records) {
  if (!row.stats) continue;
  const identity = identityFor(row);
  if (identity) {
    const before = [row.attachmentType, row.attachmentName, row.attachmentSubtype];
    [row.attachmentType, row.attachmentName, row.attachmentSubtype] = identity;
    row.mappingReviewStatus = 'visually-checked';
    row.notes = [...new Set([...(row.notes ?? []), 'Attachment identity was directly reconciled against the selected in-game tile on 2026-07-28; the earlier repeated name was an OCR fallback.'])];
    changes.identities.push({ key: key(row), before, after: identity });
  }
  const subtype = barrelSubtypes.get(key(row));
  if (row.attachmentType === 'Barrel' && subtype && row.attachmentSubtype !== subtype) {
    changes.barrelSubtypes.push({ key: key(row), before: row.attachmentSubtype, after: subtype });
    row.attachmentSubtype = subtype;
    row.mappingReviewStatus = 'visually-checked';
    row.notes = [...new Set([...(row.notes ?? []), 'Barrel subtype was read from the outlined inspected tile, distinguished from the green checked equipped tile, on 2026-07-28.'])];
  }
  const visualRecoil = recoilByPath.get(path.resolve(row.source.currentPath).toLowerCase());
  if (visualRecoil !== undefined && row.stats.recoilAmountDegrees !== visualRecoil) {
    changes.recoil.push({ key: key(row), before: row.stats.recoilAmountDegrees, after: visualRecoil });
    row.stats.recoilAmountDegrees = visualRecoil;
    if (row.statFieldReasons) delete row.statFieldReasons.recoilAmountDegrees;
  }
  const recoveredCost = recoveredCosts.get(path.basename(row.source.currentPath));
  if (recoveredCost !== undefined) {
    if (row.attachmentCost !== recoveredCost) changes.costs.push({ key: key(row), before: row.attachmentCost, after: recoveredCost });
    row.attachmentCost = recoveredCost;
    if (row.statFieldReasons) delete row.statFieldReasons.attachmentCost;
  }
}

for (const [groupKey, expected] of costs) {
  const [weaponName, attachmentType] = groupKey.split('|');
  const rows = review.records.filter(row => row.stats && row.weaponName === weaponName && row.attachmentType === attachmentType).sort((a, b) => a.source.captureOrder - b.source.captureOrder);
  if (rows.length !== expected.length) throw new Error(`${groupKey}: expected ${expected.length} rows, found ${rows.length}`);
  rows.forEach((row, index) => {
    if (row.attachmentCost !== expected[index]) changes.costs.push({ key: key(row), before: row.attachmentCost, after: expected[index] });
    row.attachmentCost = expected[index];
    if (row.statFieldReasons) delete row.statFieldReasons.attachmentCost;
    row.notes = [...new Set([...(row.notes ?? []), 'Attachment cost was directly transcribed from the visible attachment grid on 2026-07-28.'])];
  });
}
const ef88None = review.records.find(row => path.basename(row.source.currentPath) === '59_EF88_Laser_None_duplicate-2.png');
if (!ef88None) throw new Error('Missing EF88 duplicate None laser capture');
ef88None.attachmentCost = 0;
if (ef88None.statFieldReasons) delete ef88None.statFieldReasons.attachmentCost;

// The remaining duplicate numeric outlier is explicitly visible as 2.6 degrees.
for (const row of review.records.filter(row => row.weaponName === 'M1014' && row.attachmentName === 'SLUGS')) row.stats.recoilAmountDegrees = 2.6;

// M1014 was captured twice.  The two panels are complementary OCR reads of
// the same attachments: fill a null only when the sibling supplies one
// unambiguous non-null value, and stop on any true numeric conflict.
const duplicateGroupKeys = new Set();
const m1014Groups = new Map();
for (const row of review.records.filter(row => row.weaponName === 'M1014' && row.stats)) {
  const groupKey = `${row.weaponName}|${row.attachmentType}|${row.attachmentName}`;
  if (!m1014Groups.has(groupKey)) m1014Groups.set(groupKey, []);
  m1014Groups.get(groupKey).push(row);
}
for (const [groupKey, rows] of m1014Groups) {
  if (rows.length < 2) continue;
  duplicateGroupKeys.add(groupKey);
  for (const field of Object.keys(rows[0].stats)) {
    const values = [...new Set(rows.map(row => row.stats[field]).filter(value => value !== null).map(value => JSON.stringify(value)))];
    if (values.length > 1) throw new Error(`${groupKey}: conflicting non-null duplicate values for ${field}: ${values.join(', ')}`);
    if (values.length !== 1) continue;
    const value = JSON.parse(values[0]);
    for (const row of rows.filter(row => row.stats[field] === null)) {
      row.stats[field] = value;
      if (row.statFieldReasons) delete row.statFieldReasons[field];
      changes.duplicateHarmonized.push({ key: key(row), field, value });
    }
  }
}

review.generatedAt = new Date().toISOString();
write('attachment-screenshot-review.json', review);
write('remaining-scrape-fixes-summary.json', changes);

// Persist the screenshot-backed corrections in the normal rebuild ledger.
const manual = read('manual-review-overrides.json');
const erroneousIdentityOverrides = new Set(['38_M1014_Laser_50_MW_Blue.png', '8_M2010 ESR_Muzzle_Long_Suppressor.png', '9_M2010 ESR_Muzzle_CQB_Suppressor.png']);
for (const override of manual.overrides.filter(item => item.sourcePath && erroneousIdentityOverrides.has(path.basename(item.sourcePath)))) {
  delete override.updates?.attachmentType;
  delete override.updates?.attachmentName;
  delete override.updates?.attachmentSubtype;
}
const affectedCostGroups = new Set(costs.keys());
for (const row of review.records.filter(row => row.stats)) {
  const duplicateGroupKey = `${row.weaponName}|${row.attachmentType}|${row.attachmentName}`;
  const shouldPersist = Boolean(identityFor(row)) || duplicateGroupKeys.has(duplicateGroupKey) || recoveredCosts.has(path.basename(row.source.currentPath)) || barrelSubtypes.has(key(row)) || affectedCostGroups.has(`${row.weaponName}|${row.attachmentType}`) || path.basename(row.source.currentPath) === '59_EF88_Laser_None_duplicate-2.png';
  if (!shouldPersist) continue;
  const sourcePath = path.resolve(row.source.currentPath);
  let override = manual.overrides.find(item => item.sourcePath && path.resolve(item.sourcePath).toLowerCase() === sourcePath.toLowerCase());
  if (!override) {
    override = { weaponName: row.weaponName, attachmentType: row.attachmentType, attachmentName: row.attachmentName, sourcePath, sourceFilename: path.basename(sourcePath), updates: {}, evidence: [] };
    manual.overrides.push(override);
  }
  override.weaponName = row.weaponName;
  override.attachmentType = row.attachmentType;
  override.attachmentName = row.attachmentName;
  override.sourcePath = sourcePath;
  override.sourceFilename = path.basename(sourcePath);
  override.updates = { ...(override.updates ?? {}) };
  if (identityFor(row)) {
    override.updates.attachmentType = row.attachmentType;
    override.updates.attachmentName = row.attachmentName;
    override.updates.attachmentSubtype = row.attachmentSubtype;
  }
  if (barrelSubtypes.has(key(row))) override.updates.attachmentSubtype = row.attachmentSubtype;
  if (duplicateGroupKeys.has(duplicateGroupKey)) for (const [field, value] of Object.entries(row.stats)) if (value !== null) override.updates[field] = value;
  if (recoveredCosts.has(path.basename(row.source.currentPath)) || affectedCostGroups.has(`${row.weaponName}|${row.attachmentType}`) || path.basename(row.source.currentPath) === '59_EF88_Laser_None_duplicate-2.png') override.updates.attachmentCost = row.attachmentCost;
  override.mappingReviewStatus = 'visually-checked';
  override.evidence = [...new Map([...(override.evidence ?? []), { kind: 'direct-selected-tile-and-grid-review', reviewDate: '2026-07-28' }].map(item => [JSON.stringify(item), item])).values()];
}
manual.generatedAt = new Date().toISOString();
write('manual-review-overrides.json', manual);
console.log(JSON.stringify(Object.fromEntries(Object.entries(changes).map(([name, rows]) => [name, rows.length])), null, 2));

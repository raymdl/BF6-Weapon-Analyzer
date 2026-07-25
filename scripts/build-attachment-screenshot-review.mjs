import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  canonicalAttachmentType,
  fallbackAttachmentSubtype,
  filenameAttachmentType,
  usesSharedLaserLightType,
} from './attachment-screenshot-taxonomy.mjs';

const auditRoot = path.resolve(process.env.BF6_ATTACHMENT_AUDIT_ROOT ?? 'outputs/attachment-audit');
const inputPath = path.resolve(process.env.BF6_ATTACHMENT_RAW_OCR ?? path.join(auditRoot, 'raw-ocr.json'));
const outputPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const manifestPath = path.join(auditRoot, 'rename-manifest.json');
const coveragePath = path.join(auditRoot, 'coverage-report.json');
const captureRoot = path.resolve(process.env.BF6_ATTACHMENT_CAPTURE_ROOT ?? 'Weapon Attachments');
const captureClass = process.env.BF6_ATTACHMENT_CLASS ?? 'Mixed';
function classForSource(sourcePath) {
  const parts = path.resolve(sourcePath).split(/[\\/]/);
  const rootIndex = parts.findIndex(part => part.toLowerCase() === 'weapon attachments');
  return rootIndex >= 0 ? parts[rootIndex + 1] ?? captureClass : captureClass;
}
const legacyPath = process.env.BF6_ATTACHMENT_LEGACY_PATH
  ? path.resolve(process.env.BF6_ATTACHMENT_LEGACY_PATH)
  : null;
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const rawSourceKeys = new Set(raw.map(record => path.resolve(record.sourcePath).toLowerCase()));
const historicalCarbineOriginalByPrefix = new Map();
const historicalCarbineRawPath = path.join(auditRoot, 'raw-ocr-carbine.json');
if (fs.existsSync(historicalCarbineRawPath)) {
  const historical = JSON.parse(fs.readFileSync(historicalCarbineRawPath, 'utf8'));
  const grouped = new Map();
  for (const record of historical) {
    if (!grouped.has(record.weapon)) grouped.set(record.weapon, []);
    grouped.get(record.weapon).push(record);
  }
  for (const [weapon, records] of grouped) records.forEach((record, index) => historicalCarbineOriginalByPrefix.set(`${weapon}|${index}`, record));
}
const captureOrderPath = path.join(auditRoot, 'capture-order.json');
const captureOrderDocument = fs.existsSync(captureOrderPath) ? JSON.parse(fs.readFileSync(captureOrderPath, 'utf8')) : { entries: [] };
const captureOrderEntries = captureOrderDocument.entries ?? [];
const captureOrderKey = (weaponName, filename) => `${weaponName}|${String(filename ?? '').replace(/^\d+_/, '')}`.toLowerCase();
const captureOrderByFilename = new Map();
for (const entry of captureOrderEntries) {
  if (entry.currentFilename) captureOrderByFilename.set(captureOrderKey(entry.weaponName, entry.currentFilename), entry);
}
for (const entry of captureOrderEntries) {
  if (!entry.proposedFilename) continue;
  const key = captureOrderKey(entry.weaponName, entry.proposedFilename);
  if (!captureOrderByFilename.has(key)) captureOrderByFilename.set(key, entry);
}
const renameProvenancePath = path.join(auditRoot, 'rename-provenance.json');
const renameProvenance = fs.existsSync(renameProvenancePath) ? JSON.parse(fs.readFileSync(renameProvenancePath, 'utf8')) : [];
const renameProvenanceByCurrent = new Map(renameProvenance.map(record => [path.resolve(record.currentPath).toLowerCase(), record]));
const panelOcrPath = path.join(auditRoot, 'panel-ocr.json');
const panelOcr = fs.existsSync(panelOcrPath) ? JSON.parse(fs.readFileSync(panelOcrPath, 'utf8')) : [];
const panelByPath = new Map(panelOcr.map(record => [path.resolve(record.sourcePath).toLowerCase(), record]));
const valueOcrPath = path.join(auditRoot, 'value-ocr.json');
const valueOcr = fs.existsSync(valueOcrPath) ? JSON.parse(fs.readFileSync(valueOcrPath, 'utf8')) : [];
const valueByPath = new Map(valueOcr.map(record => [path.resolve(record.sourcePath).toLowerCase(), record]));
const costOcrPath = path.join(auditRoot, 'cost-ocr.json');
const costOcr = fs.existsSync(costOcrPath) ? JSON.parse(fs.readFileSync(costOcrPath, 'utf8')) : [];
const costByPath = new Map(costOcr.map(record => [path.resolve(record.sourcePath).toLowerCase(), record]));
const fieldOcrPath = path.join(auditRoot, 'field-ocr.json');
const fieldOcr = fs.existsSync(fieldOcrPath) ? JSON.parse(fs.readFileSync(fieldOcrPath, 'utf8')) : [];
const fieldOcrByPath = new Map();
for (const record of fieldOcr) {
  const key = path.resolve(record.sourcePath).toLowerCase();
  if (!fieldOcrByPath.has(key)) fieldOcrByPath.set(key, new Map());
  fieldOcrByPath.get(key).set(record.field, record);
}
const highlightsPath = path.join(auditRoot, 'highlight-cards.json');
const highlights = fs.existsSync(highlightsPath) ? JSON.parse(fs.readFileSync(highlightsPath, 'utf8')) : [];
const highlightByPath = new Map(highlights.map(record => [path.resolve(record.sourcePath).toLowerCase(), record]));
const recoilVisualPath = path.join(auditRoot, 'recoil-visual-map.json');
const recoilVisual = fs.existsSync(recoilVisualPath) ? JSON.parse(fs.readFileSync(recoilVisualPath, 'utf8')) : [];
const recoilVisualByPath = new Map(recoilVisual.map(record => [path.resolve(record.sourcePath).toLowerCase(), record]));
const visualStatPath = path.join(auditRoot, 'visual-stat-map.json');
const visualStats = fs.existsSync(visualStatPath) ? JSON.parse(fs.readFileSync(visualStatPath, 'utf8')) : [];
const visualStatsByPath = new Map();
for (const record of visualStats) {
  const key = path.resolve(record.sourcePath).toLowerCase();
  if (!visualStatsByPath.has(key)) visualStatsByPath.set(key, new Map());
  visualStatsByPath.get(key).set(record.field, record.value);
}
const comparisonPath = path.join(auditRoot, 'stat-comparisons.json');
const comparisonRecords = fs.existsSync(comparisonPath) ? JSON.parse(fs.readFileSync(comparisonPath, 'utf8')) : [];
const comparisonsByPath = new Map(comparisonRecords.map(record => [path.resolve(record.sourcePath).toLowerCase(), record.comparisons ?? {}]));
const manualReviewPath = path.join(auditRoot, 'manual-review-overrides.json');
const manualReviewDocument = fs.existsSync(manualReviewPath) ? JSON.parse(fs.readFileSync(manualReviewPath, 'utf8')) : { overrides: [] };
const manualReviewsByPath = new Map();
const manualReviewsByFilename = new Map();
const manualReviewsByIdentity = new Map();
for (const review of manualReviewDocument.overrides ?? []) {
  manualReviewsByPath.set(path.resolve(review.sourcePath).toLowerCase(), review);
  manualReviewsByFilename.set(`${review.weaponName}|${review.sourceFilename}`.toLowerCase(), review);
  manualReviewsByIdentity.set(`${review.weaponName}|${review.attachmentType}|${review.attachmentName}`.toLowerCase(), review);
}
const referenceValuesPath = path.join(auditRoot, 'reference-values-m433-pp19.json');
const referenceValues = fs.existsSync(referenceValuesPath) ? JSON.parse(fs.readFileSync(referenceValuesPath, 'utf8')).rows ?? [] : [];
const referenceValuesByFilename = new Map(referenceValues.map(row => [`${row.weaponName}|${row.sourceFilename}`.toLowerCase(), row]));
const legacy = legacyPath && fs.existsSync(legacyPath) ? JSON.parse(fs.readFileSync(legacyPath, 'utf8')) : null;
const legacyByPath = new Map((legacy?.records ?? []).map(record => [record.source?.originalPath, record]));
const priorReviewPath = path.join(auditRoot, 'attachment-screenshot-review.pre-layout-ocr.json');
const priorReview = fs.existsSync(priorReviewPath) ? JSON.parse(fs.readFileSync(priorReviewPath, 'utf8')) : null;
const priorByPath = new Map((priorReview?.records ?? []).map(record => [record.source?.originalPath, record]));
const priorByCurrentPath = new Map((priorReview?.records ?? []).map(record => [record.source?.currentPath, record]));
const priorByProposedPath = new Map((priorReview?.records ?? []).map(record => [
  record.source?.currentPath && record.source?.proposedFilename
    ? path.join(path.dirname(record.source.currentPath), record.source.proposedFilename)
    : null,
  record,
]).filter(([key]) => key));

const categoryNames = [
  'Muzzle', 'Barrel', 'Underbarrel', 'Magazine', 'Ammunition', 'Ergonomics',
  'Left Accessory', 'Right Accessory', 'Top Accessory', 'Sight', 'Optic',
];
const commonNames = [
  'Flash Hider', 'Flash Comp', 'Single-Port Brake', 'Double-Port Brake', 'Compensated Brake',
  'Compensator', 'Linear Comp', 'Standard Suppressor', 'Long Suppressor', 'CQB Suppressor',
  'Lightened Suppressor', 'None', 'Folding Vertical', 'Alloy Vertical', 'Ribbed Vertical',
  '6H64 Vertical', 'Classic Vertical', 'Folding Stubby', 'Ribbed Stubby', 'Canted Stubby',
  'Stippled Stubby', 'Low-Profile Stubby', 'Slim Handstop', 'Compact Handstop',
  'Adjustable Angled', 'Slim Angled', 'Full Angled', 'Bipod', 'PTT Grip Pod', 'QD Grip Pod',
  'Classic Grip Pod', 'Match Trigger', 'Aftermarket Buffer', 'Improved Mag Catch',
  'Taclight - Aimed', 'Flashlight', 'Taclight - Hipfire', '5 MW Red', '50 MW Violet',
  '5 MW Green', '50 MW Green', '50 MW Blue', '120 MW Blue', 'FMJ', 'Tungsten Core',
  'Polymer Case', 'Hollow Point', 'Frangible', 'Synthetic Tip',
];
const canonicalLaserDescriptions = new Map([
  ['5 MW Red', 'Provides minor improvement to hip-fire accuracy and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['50 MW Violet', 'Provides minor improvement to aim down sights (ADS) accuracy while moving and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['5 MW Green', 'Provides slight improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['50 MW Green', 'Provides moderate improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['50 MW Blue', 'Provides slight improvement to hip-fire accuracy and minor improvement to aim down sights (ADS) accuracy while moving, but is visible to enemy soldiers. Effects only active when laser is turned on.'],
  ['120 MW Blue', 'Provides moderate improvement to hip-fire accuracy and minor improvement to aim down sights (ADS) accuracy while moving, but is visible to enemy soldiers. Effects only active when laser is turned on.'],
  ['Laser/Light Combo Green', 'Laser provides slight improvement to hip-fire accuracy while light provides minor improvement to hip-fire recovery, but is visible to enemy soldiers. Effects only active when laser/light is turned on. Can be used together or separately.'],
]);
const canonicalCommonDescriptions = new Map([
  ['Light|Flashlight', 'Provides minor improvement to hip-fire recovery and can blind enemy soldiers, except those using thermal optics. Effects only active when light is turned on.'],
  ['Light|Taclight - Aimed', 'Automatically turns on in aim down sights (ADS) and off in hip-fire. Can blind enemy soldiers. Effects only active when light is turned on.'],
  ['Light|Taclight - Hipfire', 'Automatically turns on in hip-fire and off in aim down sights (ADS). Provides minor improvement to hip-fire recovery and can blind enemy soldiers. Effects only active when light is turned on.'],
  ['Ergonomics|Match Trigger', 'Improves weapon performance in semi-auto, reducing recoil and increasing accuracy.'],
  ['Muzzle|Compensated Brake', 'Enhanced brake that reduces recoil, minimizes recoil buildup, and improves recoil recovery. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  ['Muzzle|Lightened Suppressor', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces recoil buildup and improves recoil recovery at the cost of hip-fire accuracy.'],
]);
const screenshotReviewedCommonCosts = new Map([
  ['Ammo|FMJ',5],['Ammo|Tungsten Core',5],['Ammo|Polymer Case',10],['Ammo|Hollow Point',15],['Ammo|Frangible',20],['Ammo|Synthetic Tip',20],
  ['Ergonomics|Aftermarket Buffer',5],['Ergonomics|Improved Mag Catch',5],['Ergonomics|Match Trigger',15],['Ergonomics|None',0],
  ['Laser|None',0],['Laser|5 MW Red',10],['Laser|50 MW Violet',10],['Laser|5 MW Green',10],['Laser|50 MW Green',20],['Laser|50 MW Blue',20],['Laser|120 MW Blue',30],['Laser|Laser/Light Combo Green',20],
  ['Laser/Light|None',0],['Laser/Light|Flashlight',10],['Laser/Light|Taclight - Aimed',5],['Laser/Light|Taclight - Hipfire',15],['Laser/Light|5 MW Red',10],['Laser/Light|50 MW Violet',10],['Laser/Light|5 MW Green',10],['Laser/Light|50 MW Green',20],['Laser/Light|50 MW Blue',20],['Laser/Light|120 MW Blue',30],['Laser/Light|Laser/Light Combo Green',20],
  ['Light|None',0],['Light|Flashlight',10],['Light|Taclight - Aimed',5],['Light|Taclight - Hipfire',15],
  ['Grip|None',0],['Grip|6H64 Vertical',25],['Grip|Adjustable Angled',15],['Grip|Alloy Vertical',20],['Grip|Bipod',10],['Grip|Canted Stubby',30],['Grip|Classic Grip Pod',30],['Grip|Classic Vertical',35],['Grip|Folding Stubby',20],['Grip|Folding Vertical',10],['Grip|Full Angled',25],['Grip|Low-Profile Stubby',45],['Grip|PTT Grip Pod',20],['Grip|QD Grip Pod',30],['Grip|Ribbed Stubby',30],['Grip|Ribbed Vertical',20],['Grip|Slim Angled',25],['Grip|Slim Handstop',15],['Grip|Stippled Stubby',35],['Grip|UNDERSLUNG MOUNT',10],
  ['Muzzle|None',0],['Muzzle|Single-Port Brake',5],['Muzzle|Double-Port Brake',10],['Muzzle|Compensator',10],['Muzzle|Compensated Brake',20],['Muzzle|Flash Hider',10],['Muzzle|Flash Comp',20],['Muzzle|CQB Suppressor',30],['Muzzle|Lightened Suppressor',30],['Muzzle|Linear Comp',10],['Muzzle|Long Suppressor',25],['Muzzle|Standard Suppressor',20],
  ['Ergonomics|Burst Training',15],['Ergonomics|Rail Cover',5],
]);

// Screenshot-checked corrections for the remaining OCR failures. These are
// names/categories only; numeric stat fields remain fail-closed and null.
const manualMetadata = new Map([
  ['AK-205|17_AK-205_Light_Flashlight.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['BROD 3|53_BROD 3_Laser_50_MW_Violet.png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['M277|56_M277_Light_Flashlight.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['AK4D|AK4D_Barrel_Basic.png', { type:'Barrel', name:'450MM FACTORY', sub:'Basic' }],
  ['AK4D|AK4D_Barrel_Heavy.png', { type:'Barrel', name:'600MM CUT', sub:'Heavy' }],
  ['AK4D|AK4D_Barrel_HEAVY_EXT.png', { type:'Barrel', name:'600MM DMR', sub:'HEAVY EXT.' }],
  ['AK4D|AK4D_Barrel_Short.png', { type:'Barrel', name:'409MM US', sub:'Short' }],
  ['TR7|TR7_Barrel_Basic_17_CUT.png', { type:'Barrel', name:'17" CUT', sub:'Short' }],
  ['L85A3|L85A3_Barrel_Basic_646MM_LSW.png', { type:'Barrel', name:'646MM LSW', sub:'Heavy Ext' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.30.40.90 (Medium).png', { type:'Barrel', name:'600MM CUT', sub:'Heavy' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.30.43.32 (Medium).png', { type:'Barrel', name:'600MM DMR', sub:'HEAVY EXT.' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.30.44.46 (Medium).png', { type:'Barrel', name:'409MM US', sub:'Short' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.31.53.48 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['AK4D|AK4D_Light_None.png', { type:'Light', name:'None', sub:'None' }],
  ['B36A4|B36A4_Laser_None.png', { type:'Laser', name:'None', sub:'None' }],
  ['EF88|EF88_Laser_None.png', { type:'Laser', name:'None', sub:'None' }],
  ['L85A3|L85A3_Laser_None.png', { type:'Laser', name:'None', sub:'None' }],
  ['M16A4|M16A4_Light_None.png', { type:'Light', name:'None', sub:'None' }],
  ['SOR-556 MK2|SOR-556 MK2_Laser_None.png', { type:'Laser', name:'None', sub:'None' }],
  ['TR7|TR7_Laser_None.png', { type:'Laser', name:'None', sub:'None' }],
  ['VCR-2|VCR-2_Laser_None.png', { type:'Laser', name:'None', sub:'None' }],
  ['PP-19|PP-19_Barrel_Basic.png', { type:'Barrel', name:'238MM FACTORY', sub:'Basic' }],
  ['PP-19|PP-19_Barrel_Cryo.png', { type:'Barrel', name:'238MM CRYOGENIC', sub:'Cryo' }],
  ['PP-19|PP-19_Barrel_Extended.png', { type:'Barrel', name:'367MM CIV', sub:'Extended' }],
  ['PP-19|PP-19_Barrel_Light.png', { type:'Barrel', name:'238MM PENCIL', sub:'Light' }],
  ['M433|M433_Laser_None.png', { type:'Laser', name:'None', sub:'None' }],
  ['M433|M433_Light_None.png', { type:'Light', name:'None', sub:'None' }],
  ['M433|M433_Light_Flashlight.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['M433|M433_Light_Taclight_-_Aimed.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['M433|M433_Light_Taclight_-_Hipfire.png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['PP-19|PP-19_Laser_None.png', { type:'Laser', name:'None', sub:'None' }],
  ['PP-19|PP-19_Laser_50_MW_Green.png', { type:'Laser', name:'50 MW Green', sub:'Green Laser' }],
  ['PP-19|PP-19_Laser_50_MW_Violet.png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['M433|M433_Grip_Underslung_Mount.png', { type:'Grip', name:'Underslung Mount', sub:'Mount' }],
  ['M433|M433_Light_Taclight_-_Aimed.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['M433|M433_Light_Taclight_-_Hipfire.png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['PP-19|PP-19_Magazine_53Rnd_Drum.png', { type:'Magazine', name:'53Rnd Drum', sub:'Magazine' }],
  ['L85A3|L85A3_Ammo_Hollow_Point.png', { type:'Ammo', name:'Hollow Point', sub:'Hollow Point' }],
  ['L85A3|L85A3_Ammo_Synthetic.png', { type:'Ammo', name:'Synthetic Tip', sub:'Synthetic' }],
  ['L85A3|L85A3_Muzzle_Compensator.png', { type:'Muzzle', name:'Compensator', sub:'Compensator' }],
  ['L85A3|L85A3_Ammo_Synthetic_Tip.png', { type:'Ammo', name:'Synthetic Tip', sub:'Synthetic' }],
  ['L85A3|L85A3_Barrel_Light_646MM_Fluted.png', { type:'Barrel', name:'646MM FLUTED', sub:'Light' }],
  ['L85A3|L85A3_Barrel_Light_646MM_FLUTED.png', { type:'Barrel', name:'646MM FLUTED', sub:'Light' }],
  ['L85A3|L85A3_Barrel_Light_ambiguous-2.png', { type:'Barrel', name:'646MM FLUTED', sub:'Extended' }],
  ['L85A3|L85A3_Barrel_Extended.png', { type:'Barrel', name:'646MM FLUTED', sub:'Extended' }],
  ['NVO-228E|NVO-228E_Laser_5_MW_Green.png', { type:'Laser', name:'5 MW Green', sub:'Green Laser' }],
  ['KORD 6P67|KORD 6P67_Laser_LaserLight_Combo_Green.png', { type:'Laser', name:'Laser/Light Combo Green', sub:'Green Laser' }],
  ['EF88|EF88_Barrel_Short.png', { type:'Barrel', name:'14.5" STANDARD', sub:'Short' }],
  ['EF88|EF88_Barrel_Short_Light.png', { type:'Barrel', name:'14.5" CQB', sub:'Short Light' }],
  ['EF88|EF88_Barrel_Short_145_CQB.png', { type:'Barrel', name:'14.5" CQB', sub:'Short Light' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 15.57.31.13 (Medium).png', { type:'Magazine', name:'42Rnd Magazine', sub:'Magazine' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.50.31.10.png', { type:'Magazine', name:'36Rnd Magazine', sub:'Magazine' }],
  ['B36A4|Battlefield 6 Screenshot 2026.07.23 - 15.24.14.52 (Medium).png', { type:'Magazine', name:'36Rnd Magazine', sub:'Magazine' }],
  ['B36A4|B36A4_Muzzle_36RND_MAGAZINE.png', { type:'Magazine', name:'36Rnd Magazine', sub:'Magazine' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 16.09.02.84 (Medium).png', { type:'Magazine', name:'42Rnd Fast Mag', sub:'Fast' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 15.57.26.97 (Medium).png', { type:'Magazine', name:'30Rnd Magazine', sub:'Magazine' }],
  ['EF88|EF88_Magazine_30Rnd_Magazine.png', { type:'Magazine', name:'30Rnd Magazine', sub:'Magazine' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.50.28.60.png', { type:'Magazine', name:'20Rnd Magazine', sub:'Magazine' }],
  ['L85A3|L85A3_Magazine_20Rnd_Magazine.png', { type:'Magazine', name:'20Rnd Magazine', sub:'Magazine' }],
  ['NVO-228E|NVO-228E_Light_None.png', { type:'Light', name:'None', sub:'None' }],
  ['NVO-228E|NVO-228E_Light_None_duplicate-2.png', { type:'Light', name:'None', sub:'None' }],
  ['KORD 6P67|KORD 6P67_Ergonomics_4.png', { type:'Ergonomics', name:'Burst Training', sub:'Fire Control' }],
  ['M16A4|M16A4_Ergonomics_RAIL_COVER.png', { type:'Ergonomics', name:'Rail Cover', sub:'Handling' }],
  ['TR7|TR7_Ergonomics_J.png', { type:'Ergonomics', name:'None', sub:'None' }],
  ['SOR-556 MK2|SOR-556 MK2_Light_TA_LIGHT-.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['SOR-556 MK2|SOR-556 MK2_Light_Taclight_-_Aimed.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['SOR-556 MK2|SOR-556 MK2_Light_TACClpQT_-_HIP.png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['TR7|TR7_Light_TACLIGHV-HIP.png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['VCR-2|VCR-2_Light_TA_LIGHT_-_AIM.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['VCR-2|VCR-2_Light_Taclight_-_Aimed.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['VCR-2|VCR-2_Light_TA_LIGHT_HI.png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['VCR-2|VCR-2_Muzzle_STANDARD.png', { type:'Muzzle', name:'Standard Suppressor', sub:'Suppressor' }],
  ['EF88|EF88_Light_Taclight_-_Aimed.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['EF88|EF88_Light_Taclight_-_Hipfire.png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['M16A4|M16A4_Light_Taclight_-_Aimed.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['M16A4|M16A4_Light_Taclight_-_Hipfire.png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['TR7|TR7_Light_Taclight_-_Aimed.png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['TR7|Battlefield 6 Screenshot 2026.07.23 - 15.33.42.41 (Medium).png', { type:'Magazine', name:'10Rnd Fast Mag', sub:'Fast' }],
  ['AK4D|AK4D_Laser_5_MW_Green.png', { type:'Laser', name:'5 MW Green', sub:'Green Laser' }],
  ['AK-205|Battlefield 6 Screenshot 2026.07.24 - 15.43.14.75 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['AK-205|Battlefield 6 Screenshot 2026.07.24 - 15.43.19.37 (Medium).png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['AK-205|Battlefield 6 Screenshot 2026.07.24 - 15.44.20.30 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['AK-205|Battlefield 6 Screenshot 2026.07.24 - 15.44.23.15 (Medium).png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['AK-205|Battlefield 6 Screenshot 2026.07.24 - 15.44.28.82 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['BROD 3|Battlefield 6 Screenshot 2026.07.24 - 16.19.57.83 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['BROD 3|Battlefield 6 Screenshot 2026.07.24 - 16.20.08.27 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['BROD 3|Battlefield 6 Screenshot 2026.07.24 - 16.20.10.81 (Medium).png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['GRT-BC|Battlefield 6 Screenshot 2026.07.24 - 15.52.51.41 (Medium).png', { type:'Laser/Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['GRT-BC|Battlefield 6 Screenshot 2026.07.24 - 15.53.03.55 (Medium).png', { type:'Laser/Light', name:'Laser/Light Combo Green', sub:'Green Laser' }],
  ['M277|Battlefield 6 Screenshot 2026.07.24 - 15.41.37.47 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['M277|Battlefield 6 Screenshot 2026.07.24 - 15.41.46.31 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['M277|Battlefield 6 Screenshot 2026.07.24 - 15.41.50.28 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['M417 A2|Battlefield 6 Screenshot 2026.07.24 - 15.47.39.93 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['M417 A2|Battlefield 6 Screenshot 2026.07.24 - 15.47.52.78 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['M4A1|Battlefield 6 Screenshot 2026.07.24 - 15.38.59.61 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['M4A1|Battlefield 6 Screenshot 2026.07.24 - 15.39.15.70 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['M4A1|Battlefield 6 Screenshot 2026.07.24 - 15.39.17.70 (Medium).png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['QBZ-192|Battlefield 6 Screenshot 2026.07.24 - 15.58.32.28 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['QBZ-192|Battlefield 6 Screenshot 2026.07.24 - 15.58.43.70 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['QBZ-192|Battlefield 6 Screenshot 2026.07.24 - 15.58.45.20 (Medium).png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['QBZ-192|Battlefield 6 Screenshot 2026.07.24 - 15.58.46.57 (Medium).png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['QBZ-192|Battlefield 6 Screenshot 2026.07.24 - 15.58.47.95 (Medium).png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['SG 553R|Battlefield 6 Screenshot 2026.07.24 - 16.13.45.08 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['SG 553R|Battlefield 6 Screenshot 2026.07.24 - 16.13.46.34 (Medium).png', { type:'Laser', name:'5 MW Red', sub:'Red Laser' }],
  ['SG 553R|Battlefield 6 Screenshot 2026.07.24 - 16.13.47.50 (Medium).png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['SG 553R|Battlefield 6 Screenshot 2026.07.24 - 16.13.52.95 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['SOR-300SC|Battlefield 6 Screenshot 2026.07.24 - 16.16.03.93 (Medium).png', { type:'Laser', name:'None', sub:'None' }],
  ['SOR-300SC|Battlefield 6 Screenshot 2026.07.24 - 16.16.15.79 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.30.54.27 (Medium).png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['L85A3|L85A3_Grip_Alloy_Vertical.png', { type:'Grip', name:'Alloy Vertical', sub:'Vertical' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.50.69 (Medium).png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.42.29.46 (Medium).png', { type:'Laser', name:'5 MW Green', sub:'Green Laser' }],
  ['TR7|TR7_Light_None.png', { type:'Light', name:'None', sub:'None' }],
  ['TR7|Battlefield 6 Screenshot 2026.07.23 - 15.35.25.20 (Medium).png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['EF88|EF88_Light_None.png', { type:'Light', name:'None', sub:'None' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 16.09.40.14 (Medium).png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 16.09.42.100 (Medium).png', { type:'Light', name:'Taclight - Hipfire', sub:'Light' }],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.38.01.43 (Medium).png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.38.02.88 (Medium).png', { type:'Laser', name:'5 MW Green', sub:'Green Laser' }],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.38.05.42 (Medium).png', { type:'Laser', name:'50 MW Blue', sub:'Blue Laser' }],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.38.06.65 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.38.08.04 (Medium).png', { type:'Laser', name:'Laser/Light Combo Green', sub:'Green Laser' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.06.75.png', { type:'Laser', name:'5 MW Green', sub:'Green Laser' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.09.30.png', { type:'Laser', name:'50 MW Blue', sub:'Blue Laser' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.10.68.png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.36.78 (Medium).png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.47.56 (Medium).png', { type:'Light', name:'Taclight - Aimed', sub:'Light' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.38.06 (Medium).png', { type:'Laser', name:'5 MW Green', sub:'Green Laser' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.39.22 (Medium).png', { type:'Laser', name:'50 MW Green', sub:'Green Laser' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.40.58 (Medium).png', { type:'Laser', name:'50 MW Blue', sub:'Blue Laser' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.42.10 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['EF88|EF88_Light_FLASHLIG.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.05.58.png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['M16A4|M16A4_Light_FLASHtlQHT,.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['M16A4|M16A4_Light_FLASHtlQHT.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['AK4D|AK4D_Light_50_MWVIOLT.png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['AK4D|AK4D_Light_FLASHLIGH.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['B36A4|B36A4_Grip_None.png', { type:'Grip', name:'None', sub:'None' }],
  ['EF88|EF88_Light_Flashlight.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['KORD 6P67|KORD 6P67_Laser_5_MW_Red.png', { type:'Laser', name:'5 MW Red', sub:'Red Laser' }],
  ['KORD 6P67|KORD 6P67_Light_None.png', { type:'Light', name:'None', sub:'None' }],
  ['L85A3|L85A3_Laser_50_MW_Violet.png', { type:'Laser', name:'50 MW Violet', sub:'Violet Laser' }],
  ['M16A4|M16A4_Laser_None.png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['M16A4|M16A4_Light_Flashlight.png', { type:'Light', name:'Flashlight', sub:'Light' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.30.50.21 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.31.53.48 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.31.57.18 (Medium).png', { type:'Laser', name:'5 MW Green', sub:'Green Laser' }],
  ['AK4D|Battlefield 6 Screenshot 2026.07.23 - 15.32.00.82 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['B36A4|Battlefield 6 Screenshot 2026.07.23 - 15.23.28.64 (Medium).png', { type:'Grip', name:'None', sub:'None' }],
  ['B36A4|Battlefield 6 Screenshot 2026.07.23 - 15.24.47.45 (Medium).png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['B36A4|Battlefield 6 Screenshot 2026.07.23 - 15.25.00.88 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['B36A4|Battlefield 6 Screenshot 2026.07.23 - 15.24.57.04 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 16.09.26.26 (Medium).png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 16.09.31.52 (Medium).png', { type:'Laser', name:'50 MW Green', sub:'Green Laser' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 16.09.34.56 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 16.09.38.45 (Medium).png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.37.54.84 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.38.00.10 (Medium).png', { type:'Laser', name:'5 MW Red', sub:'Red Laser' }],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.38.04.10 (Medium).png', { type:'Laser', name:'50 MW Green', sub:'Green Laser' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.44.09.10.png', { type:'Muzzle', name:'Compensator', sub:'Compensator' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.44.22.14.png', { type:'Barrel', name:'646MM Fluted', sub:'Light' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.44.34.56.png', { type:'Grip', name:'Alloy Vertical', sub:'Vertical' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.50.52.69.png', { type:'Ammo', name:'Hollow Point', sub:'Hollow Point' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.50.53.84.png', { type:'Ammo', name:'Synthetic Tip', sub:'Synthetic' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.02.89.png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.08.03.png', { type:'Laser', name:'50 MW Green', sub:'Green Laser' }],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.14.51.png', { type:'Light', name:'None', sub:'None' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.33.78 (Medium).png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.46.04 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.40.49.43 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.42.25.85 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.42.33.84 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['SOR-556 MK2|Battlefield 6 Screenshot 2026.07.23 - 15.29.17.91 (Medium).png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['SOR-556 MK2|Battlefield 6 Screenshot 2026.07.23 - 15.29.23.53 (Medium).png', { type:'Laser', name:'50 MW Green', sub:'Green Laser' }],
  ['SOR-556 MK2|Battlefield 6 Screenshot 2026.07.23 - 15.29.28.60 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['SOR-556 MK2|Battlefield 6 Screenshot 2026.07.23 - 15.29.32.86 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['TR7|Battlefield 6 Screenshot 2026.07.23 - 15.35.11.81 (Medium).png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['TR7|Battlefield 6 Screenshot 2026.07.23 - 15.35.24.18 (Medium).png', { type:'Light', name:'None', sub:'None' }],
  ['VCR-2|Battlefield 6 Screenshot 2026.07.23 - 15.49.14.27 (Medium).png', { type:'Laser', name:'None', sub:'Red Laser' }],
  ['VCR-2|Battlefield 6 Screenshot 2026.07.23 - 15.49.20.30 (Medium).png', { type:'Laser', name:'50 MW Green', sub:'Green Laser' }],
  ['VCR-2|Battlefield 6 Screenshot 2026.07.23 - 15.49.23.41 (Medium).png', { type:'Laser', name:'120 MW Blue', sub:'Blue Laser' }],
  ['VCR-2|Battlefield 6 Screenshot 2026.07.23 - 15.49.27.16 (Medium).png', { type:'Light', name:'None', sub:'None' }],
]);

// Screenshot-checked description corrections. These replace truncated, repeated-title,
// or mid-clause OCR with the complete body text visible on the corresponding card.
const manualDescriptions = new Map([
  ['AK4D|AK4D_Barrel_Basic.png', 'Standard barrel that enables a fast transition to aim down sights (ADS).'],
  ['AK4D|AK4D_Barrel_HEAVY_EXT.png', 'Repurposed DMR barrel that increases projectile velocity and improves accuracy during sustained fire at the cost of weapon draw speed.'],
  ['EF88|EF88_Light_FLASHLIG.png', 'Provides minor improvement to hip-fire recovery and can blind enemy soldiers, except those using thermal optics. Effects only active when light is turned on.'],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.05.58.png', 'Provides minor improvement to aim down sights (ADS) accuracy while moving and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['M16A4|M16A4_Light_FLASHtlQHT.png', 'Provides minor improvement to hip-fire recovery and can blind enemy soldiers, except those using thermal optics. Effects only active when light is turned on.'],
  ['B36A4|Battlefield 6 Screenshot 2026.07.23 - 15.25.03.30 (Medium).png', 'Automatically turns on in aim down sights (ADS) and off in hip-fire. Can blind enemy soldiers. Effects only active when light is turned on.'],
  ['B36A4|Battlefield 6 Screenshot 2026.07.23 - 15.25.06.52 (Medium).png', 'Automatically turns on in hip-fire and off in aim down sights (ADS). Provides minor improvement to hip-fire recovery and can blind enemy soldiers. Effects only active when light is turned on.'],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 15.56.44.60 (Medium).png', 'Enhanced brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 15.56.46.07 (Medium).png', 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces recoil buildup and improves recoil recovery at the cost of hip-fire accuracy.'],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 15.56.57.53 (Medium).png', 'Fluted long barrel that improves aim down sights (ADS) accuracy while moving, enables a fast transition to ADS, and increases projectile velocity.'],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 15.56.59.10 (Medium).png', 'Fluted short barrel that improves aim down sights (ADS) accuracy while moving, enables a fast transition to ADS, and improves hip-fire accuracy, but reduces projectile velocity.'],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 15.57.22.44 (Medium).png', 'Greatly reduces recoil and enables a slightly faster transition to aim down sights (ADS), at the cost of ADS movement speed and accuracy.'],
  ['EF88|Battlefield 6 Screenshot 2026.07.23 - 15.57.23.69 (Medium).png', 'Allows weapon to be mounted more effectively on the edges of cover and while prone. Slightly reduces recoil and enables a slightly faster transition to aim down sights (ADS), at the cost of ADS accuracy while moving.'],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.37.58.80 (Medium).png', 'Automatically turns on in hip-fire and off in aim down sights (ADS). Provides minor improvement to hip-fire recovery and can blind enemy soldiers. Effects only active when light is turned on.'],
  ['KORD 6P67|Battlefield 6 Screenshot 2026.07.23 - 15.38.06.65 (Medium).png', 'Provides moderate improvement to hip-fire accuracy and minor improvement to aim down sights (ADS) accuracy while moving, but is visible to enemy soldiers. Effects only active when laser is turned on.'],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.06.75.png', 'Provides slight improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.09.30.png', 'Provides minor improvement to aim down sights (ADS) accuracy while moving and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['L85A3|Battlefield 6 Screenshot 2026.07.23 - 15.51.10.68.png', 'Provides moderate improvement to hip-fire accuracy and minor improvement to aim down sights (ADS) accuracy while moving, but is visible to enemy soldiers. Effects only active when laser is turned on.'],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.35.30 (Medium).png', 'Provides slight improvement to hip-fire accuracy and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.36.78 (Medium).png', 'Provides slight improvement to aim down sights (ADS) accuracy while moving and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.38.06 (Medium).png', 'Provides slight improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.39.22 (Medium).png', 'Provides moderate improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['M16A4|Battlefield 6 Screenshot 2026.07.23 - 15.54.50.69 (Medium).png', 'Automatically turns on in hip-fire and off in aim down sights (ADS). Provides minor improvement to hip-fire recovery and can blind enemy soldiers. Effects only active when light is turned on.'],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.42.27.14 (Medium).png', 'Provides minor improvement to hip-fire accuracy and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.42.28.22 (Medium).png', 'Provides minor improvement to aim down sights (ADS) accuracy while moving and is not visible to enemy soldiers. Benefit only active when laser is turned on.'],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.42.29.46 (Medium).png', 'Provides slight improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.42.30.72 (Medium).png', 'Provides moderate improvement to hip-fire accuracy at the cost of visibility to enemy soldiers. Effects only active when laser is turned on.'],
  ['NVO-228E|Battlefield 6 Screenshot 2026.07.23 - 15.42.32.05 (Medium).png', 'Provides slight improvement to hip-fire accuracy and minor improvement to aim down sights (ADS) accuracy while moving, but is visible to enemy soldiers. Effects only active when laser is turned on.'],
  ['VCR-2|Battlefield 6 Screenshot 2026.07.23 - 15.49.30.06 (Medium).png', 'Provides minor improvement to hip-fire recovery and can blind enemy soldiers, except those using thermal optics. Effects only active when light is turned on.'],
]);

function stamp(record) {
  return record.sourceName.match(/- (\d+\.\d+\.\d+\.\d+)/)?.[1] ?? null;
}
function clean(value) {
  return value.replace(/[Ã˜Ø]/g, '0').replace(/[’']/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}
function slug(value) {
  return clean(value).replace(/["']/g, '').replace(/\s+/g, '_').replace(/[^A-Za-z0-9_.-]/g, '').replace(/\.+/g, '').replace(/_+$/g, '');
}
function text(record) { return clean(record.text.toUpperCase()); }
function box(line, record) {
  const words = line.words ?? [];
  if (!words.length) return { x: Infinity, y: Infinity, width: 0, height: 0 };
  const sx = 1365 / record.width;
  const sy = 768 / record.height;
  const left = Math.min(...words.map(word => word.x));
  const top = Math.min(...words.map(word => word.y));
  const right = Math.max(...words.map(word => word.x + word.width));
  const bottom = Math.max(...words.map(word => word.y + word.height));
  return { x: left * sx, y: top * sy, width: (right - left) * sx, height: (bottom - top) * sy };
}
function regionLines(record, { x1 = 0, x2 = 1365, y1 = 0, y2 = 768 } = {}) {
  return record.lines.map(line => ({ text: clean(line.text), ...box(line, record) }))
    .filter(line => line.x >= x1 && line.x <= x2 && line.y >= y1 && line.y <= y2);
}
function letters(value) { return clean(value).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}
function nearest(value, choices, maxRatio = 0.24) {
  const source = letters(value);
  let best = null;
  for (const choice of choices) {
    const target = letters(choice);
    const ratio = editDistance(source, target) / Math.max(source.length, target.length, 1);
    if (!best || ratio < best.ratio) best = { choice, ratio };
  }
  return best && best.ratio <= maxRatio ? best.choice : null;
}
function category(record) {
  const heading = regionLines(record, { x1: 40, x2: 650, y1: 0, y2: 75 }).map(line => line.text).join(' ');
  const candidate = rawTitle(record).toUpperCase();
  if (/\b\d{2}\s*RND\b|FAST MAG|MAGAZINE/.test(candidate)) return 'Magazine';
  if (/FMJ|TUNGSTEN|POLYMER|FRANGIBLE|HOLLOW POINT|SYNTHETIC TIP|SUBSONIC|SUB\.?\s*HP|RANGE\s*PEN/.test(candidate)) return 'Ammo';
  if (/VERTICAL|STUBBY|HANDSTOP|ANGLED|BIPOD|GRIP POD|UNDERSLUNG/.test(candidate)) return 'Grip';
  if (/MATCH TRIGGER|AFTERMARKET BUFFER|IMPROVED MAG CATCH/.test(candidate)) return 'Ergonomics';
  if (/LASER|\bMW\b|VIOLET|GREEN|BLUE|RED/.test(candidate)) return 'Laser';
  if (/FLASHLIGHT|TACLIGHT/.test(candidate)) return 'Light';
  if (/RANGE FINDER/.test(candidate)) return 'Range Finder';
  const choices = ['SELECT MUZZLE', 'SELECT BARREL', 'SELECT UNDERBARREL', 'SELECT MAGAZINE', 'SELECT AMMUNITION', 'SELECT ERGONOMICS', 'SELECT SIGHT', 'SELECT OPTIC', 'SELECT LEFT ACCESSORY', 'SELECT RIGHT ACCESSORY', 'SELECT TOP ACCESSORY'];
  const matched = nearest(heading, choices, 0.48);
  if (matched?.includes('MUZZLE')) return 'Muzzle';
  if (matched?.includes('BARREL') && !matched.includes('UNDER')) return 'Barrel';
  if (matched?.includes('UNDERBARREL')) return 'Grip';
  if (matched?.includes('MAGAZINE')) return 'Magazine';
  if (matched?.includes('AMMUNITION')) return 'Ammo';
  if (matched?.includes('ERGONOMICS')) return 'Ergonomics';
  if (matched?.includes('SIGHT') || matched?.includes('OPTIC')) return 'Sight';
  if (matched?.includes('ACCESSORY')) {
    const candidate = rawTitle(record).toUpperCase();
    if (/LASER|\bMW\b|VIOLET|GREEN|BLUE|RED/.test(candidate)) return 'Laser';
    if (/LIGHT|TAC/.test(candidate)) return 'Light';
    if (/RANGE FINDER/.test(candidate)) return 'Range Finder';
    return 'Accessory';
  }
  if (/SUPPRESSOR|FLASH HIDER|FLASH COMP|BRAKE|COMPENSATOR|LINEAR COMP/.test(candidate)) return 'Muzzle';
  return 'Unknown';
}
function rawTitle(record) {
  const titleRegion = regionLines(record, { x1: 45, x2: 900, y1: 220, y2: 315 }).filter(line => line.text.length <= 70);
  const known = titleRegion.filter(line => /RND|MAG|MW|LASER|LIGHT|TACLIGHT|RANGE FINDER|NONE|FMJ|TUNGSTEN|POLYMER|FRANGIBLE|HOLLOW|SUBSONIC|SUB\.?\s*HP|RANGE\s*PEN|GRIP|VERTICAL|STUBBY|HANDSTOP|ANGLED|BIPOD|BRAKE|SUPPRESSOR|SUPPRESSED|COMP|BARREL|FACTORY|CRYO|FLUTED|STANDARD|CUSTOM|CUT|LONG|PENCIL|MARKSMAN|PROTOTYPE|CQB|LSW|HBAR|DISSIPATOR|SPR/.test(line.text.toUpperCase()));
  if (known.length) return known.sort((a, b) => a.y - b.y || b.height - a.height)[0].text;
  if (titleRegion.length) return titleRegion.sort((a, b) => a.y - b.y || b.height - a.height)[0].text;
  return regionLines(record, { x1: 45, x2: 900, y1: 315, y2: 345 }).find(line => /NONE|RND|MAG|FMJ/i.test(line.text))?.text ?? 'Unknown';
}
function title(record) {
  const t = text(record);
  let value = rawTitle(record);
  const laserTitle = value.toUpperCase().replace(/[ØøO]/g, '0').replace(/\s+/g, ' ');
  if (/120\s*MW.*BL|120\s*MW@.*UE/.test(laserTitle)) value = '120 MW Blue';
  else if (/50\s*MW.*(?:VIO|VI0|BIV)/.test(laserTitle)) value = /BIV/.test(laserTitle) ? '50 MW Blue' : '50 MW Violet';
  else if (/50\s*MW.*GR/.test(laserTitle)) value = '50 MW Green';
  else if (/50\s*MW.*BL/.test(laserTitle)) value = '50 MW Blue';
  else if (/\b5\s*MW.*GR/.test(laserTitle)) value = '5 MW Green';
  else if (/\b5\s*MW.*R(?:ED|EO)/.test(laserTitle)) value = '5 MW Red';
  const aliases = [
    [/TACLIGHT.*AIM.*/, 'Taclight - Aimed'], [/TACLIGHT.*(?:HIP|ATF).*/, 'Taclight - Hipfire'],
    [/FL\s*SHLIGHT|FLASHLIGHT/, 'Flashlight'], [/REO LASER|RED LASER/, '5 MW Red'],
    [/VIOLET LASER|50\s*MW\s*VIOL/, '50 MW Violet'], [/GREEN LASER|50\s*MW\s*GREEN/, '50 MW Green'], [/BLUE LASER|50\s*MW\s*BLUE/, '50 MW Blue'],
    [/NONE/, 'None'], [/HOLLOW POINT/, 'Hollow Point'], [/TUNGSTEN CORE/, 'Tungsten Core'],
    [/POLYMER CASE/, 'Polymer Case'], [/FRANGIBLE/, 'Frangible'], [/LIGHTWEIGHT/, 'Polymer Case'], [/RANGE FINDER/, 'Range Finder'],
  ];
  for (const [pattern, replacement] of aliases) if (pattern.test(value.toUpperCase())) value = replacement;
  for (const name of commonNames) if (value.toUpperCase().includes(name.toUpperCase())) value = name;
  if (value === 'Unknown' && /\bNONE\b/.test(t)) value = 'None';
  const mag = t.match(/(10|15|20|25|30|35|36|40|42|45|53)\s*RND(?:\s+(FAST\s+MAG|MAGAZINE))?/);
  if (category(record) === 'Magazine' && mag) value = `${mag[1]}Rnd${mag[2] ? ` ${mag[2] === 'FAST MAG' ? 'Fast Mag' : 'Magazine'}` : ' Magazine'}`;
  if (category(record) === 'Ammo' && /FMJ|STANDARD PENETRATION/.test(t)) value = 'FMJ';
  if (!['Barrel', 'Unknown'].includes(category(record))) value = nearest(value, commonNames, 0.22) ?? value;
  return value.replace(/\s+/g, ' ').trim();
}
const subtypeChoices = new Map([
  ['Ammo', ['Standard', 'Penetration', 'Lightweight', 'Frangible', 'Hollow Point', 'Synthetic', 'Subsonic', 'Sub HP', 'Sub Pen', 'Range Pen']],
  ['Barrel', ['Basic', 'Short', 'Light', 'Extended', 'Heavy', 'Heavy Ext', 'Cryo', 'Ext Light', 'Short Light', 'Suppressed']],
  ['Ergonomics', ['None', 'Buffer', 'Mag Flare', 'Trigger', 'Full Auto', 'Rail Cover', 'Fire Control', 'Handling', 'Mag Catch']],
  ['Grip', ['None', 'Angled', 'Bipod', 'Grip Pod', 'Handstop', 'Mount', 'Stubby', 'Vertical']],
  ['Laser', ['None', 'Blue Laser', 'Green Laser', 'Red Laser', 'Violet Laser']],
  ['Light', ['None', 'Light']],
  ['Laser/Light', ['None', 'Blue Laser', 'Green Laser', 'Red Laser', 'Violet Laser', 'Light']],
  ['Range Finder', ['Range Finder']],
  ['Magazine', ['Fast', 'Magazine']],
  ['Muzzle', ['None', 'Brake', 'Compensator', 'Convertor', 'Flash Hider', 'Suppressor']],
]);
function highlightedCardSubtype(record, type) {
  const highlight = highlightByPath.get(path.resolve(record.sourcePath).toLowerCase());
  const choices = subtypeChoices.get(type);
  if (!highlight || !choices) return null;
  const cardLines = regionLines(record, {
    x1: highlight.x + 3,
    x2: highlight.x + 123,
    y1: highlight.y + 74,
    y2: highlight.y + 108,
  }).map(line => line.text).filter(Boolean);
  for (const candidate of cardLines) {
    const exact = choices.find(choice => letters(choice) === letters(candidate));
    if (exact) return exact;
    const fuzzy = nearest(candidate, choices, 0.34);
    if (fuzzy) return fuzzy;
  }
  return null;
}
function subtype(record, type, name) {
  const s = name.toUpperCase();
  const knownSubtype = new Map([
    ['L85A3|518MM FACTORY', 'Basic'], ['L85A3|518MM CRYOGENIC', 'Cryo'],
    ['L85A3|518MM FLUTED', 'Light'], ['L85A3|646MM FLUTED', 'Extended'],
  ]).get(`${record.weapon}|${name}`);
  if (knownSubtype) return knownSubtype;
  const cardSubtype = highlightedCardSubtype(record, type);
  if (cardSubtype) return cardSubtype;
  const taxonomyFallback = fallbackAttachmentSubtype({ weaponName: record.weapon, type, name, fullText: text(record) });
  if (taxonomyFallback) return taxonomyFallback;
  if (type === 'Grip') return /BIPOD/.test(s) ? 'Bipod' : /ANGLED/.test(s) ? 'Angled' : /HANDSTOP/.test(s) ? 'Handstop' : /STUBBY/.test(s) ? 'Stubby' : /GRIP POD/.test(s) ? 'Grip Pod' : /UNDERSLUNG|MOUNT/.test(s) ? 'Mount' : /VERTICAL/.test(s) ? 'Vertical' : /NONE/.test(s) ? 'None' : 'Unknown';
  if (type === 'Muzzle') return /SUPPRESSOR/.test(s) ? 'Suppressor' : /BRAKE/.test(s) ? 'Brake' : /COMPENSATOR/.test(s) ? 'Compensator' : /COMP/.test(s) ? 'Convertor' : 'None';
  if (type === 'Barrel') return /CRYO/.test(s) ? 'Cryo' : /EXTENDED|EXT\./.test(s) ? 'Extended' : /SHORT/.test(s) ? 'Short' : /LIGHT|FLUTED/.test(s) ? 'Light' : 'Basic';
  if (type === 'Magazine') return name.includes('Fast') ? 'Fast' : 'Magazine';
  if (type === 'Laser') return /NONE/.test(s) ? 'None' : /VIOLET/.test(s) ? 'Violet Laser' : /GREEN|COMBO G/.test(s) ? 'Green Laser' : /BLUE/.test(s) ? 'Blue Laser' : 'Red Laser';
  if (type === 'Ergonomics') return /MATCH/.test(s) ? 'Trigger' : /BUFFER/.test(s) ? 'Buffer' : 'None';
  if (type === 'Light') return name === 'None' ? 'None' : 'Light';
  return 'Unknown';
}
function description(record) {
  const titleKey = letters(rawTitle(record));
  return regionLines(record, { x1: 45, x2: 900, y1: 285, y2: 380 })
    .filter(line => line.height <= 22)
    .map(line => clean(line.text))
    .filter(line => !/EQUIP|FIRING RANGE|DEFAULT/i.test(line))
    .filter(line => letters(line) !== titleKey)
    .join(' ').trim() || null;
}
function emptyStats() {
  return { damage:null, rateOfFireRpm:null, magazineSize:null, hipfire:null, precision:null, control:null, mobility:null, fireModes:null, reloadTimeSeconds:null, muzzleVelocityMps:null, adsTimeMs:null, headshotMultiplier:null, longRangeDamage:null, spotOnFire3dM:null, spotOnFire2dM:null, opponentHealthRegenDelaySeconds:null, collateralMultiplier:null, reloadInAds:null, adsMoveSpeedMultiplier:null, sprintRecoveryMs:null, recoilAmountDegrees:null, recoilVariationDegrees:null };
}

const statFieldNames = Object.keys(emptyStats());
function statValueLine(record, y1, y2, minX = 1140, maxX = 1365) {
  return regionLines(record, { x1: minX, x2: maxX, y1, y2 })
    .filter(line => !/^(DMG|ROF|MAG|HIPFIRE|PRECISION|CONTROL|MOBILITY|FIRE MODES|RELOAD TIME|MUZZLE VELOCITY|ADS TIME|HEADSHOT MULTIPLIER|LONG RANGE DAMAGE|3D SPOT|2D SPOT|OPPONENT|COLLATERAL|RELOAD IN ADS|ADS MOVE|SPRINT|RECOIL)/i.test(line.text))
    .sort((a, b) => a.y - b.y)[0] ?? null;
}
function numericText(value) {
  return clean(String(value ?? ''))
    .toUpperCase()
    .replace(/[OQØø]/g, '0')
    .replace(/[IL|]/g, '1')
    .replace(/S(?=[0-9.])|(?<=[0-9.])S/g, '5')
    .replace(/[°º]/g, ' DEG ')
    .replace(/\s*([.,])\s*/g, '$1')
    .replace(/(\d)\s+(\d)/g, '$1.$2');
}
function numberFromLine(line, { integer = false, unit = null, min = null, max = null } = {}) {
  if (!line) return null;
  const value = numericText(line.text);
  const unitPattern = unit === 'mps' ? '(?:M\s*\/\s*S|MPS)' : unit === 'ms' ? 'MS' : unit === 's' ? 'S' : unit === 'deg' ? '(?:DEG|°)' : null;
  const matcher = unitPattern
    ? new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*${unitPattern}`, 'i')
    : /(?:X\s*)?([0-9]+(?:\.[0-9]+)?)/i;
  const match = value.match(matcher);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) && (!integer || Number.isInteger(number))
    && (min === null || number >= min) && (max === null || number <= max) ? number : null;
}
function fireModesFromLine(line) {
  if (!line) return null;
  const value = clean(line.text).toUpperCase().replace(/[^A-Z/,' -]/g, ' ').replace(/\s+/g, ' ').trim();
  const modes = ['AUTO', 'BURST', 'SINGLE', 'SEMI'];
  const found = modes.filter(mode => value.includes(mode));
  return found.length ? found : null;
}
function enhancedValueLine(record, y1, y2, minX = 900, maxX = 1500) {
  return (record?.lines ?? []).filter(line => {
    const word = line.words?.[0];
    return word && word.y >= y1 && word.y <= y2 && word.x >= minX && word.x <= maxX;
  }).sort((a, b) => a.words[0].y - b.words[0].y)[0] ?? null;
}
function enhancedNumber(line, { integer = false, unit = null, min = null, max = null } = {}) {
  if (!line) return null;
  let value = clean(line.text).toUpperCase().replace(/\s+/g, '');
  if (unit === 'mps') value = value.replace(/M\/?S|MPS/g, '');
  else if (unit === 'ms') value = value.replace(/MS$/g, '');
  else if (unit === 's') value = value.replace(/S$/g, '');
  else if (unit === 'deg') value = value.replace(/DEG|[°ºÂ•]/g, '');
  value = value
    .replace(/[OQØø]/g, '0').replace(/[IL|]/g, '1')
    .replace(/^E/, '2').replace(/E/g, '6').replace(/A/g, '4').replace(/S/g, '5')
    .replace(/^X/, '').replace(/^[^0-9.-]+/, '').replace(/[^0-9.-]/g, '');
  const match = value.match(/-?[0-9]+(?:\.[0-9]+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) && (!integer || Number.isInteger(number))
    && (min === null || number >= min) && (max === null || number <= max) ? number : null;
}
function fieldOcrTexts(source, field) {
  const record = fieldOcrByPath.get(path.resolve(source.sourcePath).toLowerCase())?.get(field);
  if (!record) return [];
  return ['normal', 'threshold', 'inverted'].map(pass => clean(record.passes?.[pass]?.text ?? '')).filter(Boolean);
}
function fieldOcrNumber(source, field, options) {
  for (const textValue of fieldOcrTexts(source, field)) {
    const value = enhancedNumber({ text: textValue }, options);
    if (value !== null) return value;
  }
  return null;
}
function enhancedStats(source) {
  const sourceKey = path.resolve(source.sourcePath).toLowerCase();
  const panel = panelByPath.get(sourceKey);
  const values = valueByPath.get(sourceKey);
  if (!panel) return emptyStats();
  const specs = {
    damage:[120,180,0,350,{integer:true,min:0,max:100}], rateOfFireRpm:[350,420,0,350,{integer:true,min:1,max:2000}], magazineSize:[590,650,0,350,{integer:true,min:0,max:200}],
    hipfire:[50,110,1000,1500,{integer:true,min:0,max:100}], precision:[200,260,1000,1500,{integer:true,min:0,max:100}], control:[360,420,1000,1500,{integer:true,min:0,max:100}], mobility:[520,580,1000,1500,{integer:true,min:0,max:100}],
    reloadTimeSeconds:[940,995,900,1500,{unit:'s',min:0,max:10}], muzzleVelocityMps:[1060,1120,900,1500,{integer:true,unit:'mps',min:100,max:2000}], adsTimeMs:[1180,1235,900,1500,{integer:true,unit:'ms',min:0,max:1000}], headshotMultiplier:[1290,1350,900,1500,{min:0,max:5}],
    longRangeDamage:[1460,1515,900,1500,{integer:true,min:0,max:100}], spotOnFire3dM:[1540,1605,900,1500,{integer:true,min:0,max:1000}], spotOnFire2dM:[1620,1680,900,1500,{integer:true,min:0,max:1000}], opponentHealthRegenDelaySeconds:[1700,1770,900,1500,{unit:'s',min:0,max:20}],
    collateralMultiplier:[1790,1850,900,1500,{min:0,max:5}], adsMoveSpeedMultiplier:[1950,2010,900,1500,{min:0,max:2}], sprintRecoveryMs:[2030,2090,900,1500,{integer:true,unit:'ms',min:0,max:1000}], recoilAmountDegrees:[2110,2180,900,1500,{unit:'deg',min:0,max:90}], recoilVariationDegrees:[2190,2260,900,1500,{unit:'deg',min:0,max:180}],
  };
  const stats = emptyStats();
  for (const [field,[y1,y2,x1,x2,options]] of Object.entries(specs)) {
    const panelLine = enhancedValueLine(panel,y1,y2,x1,x2);
    const valueLine = values && x1 >= 900 ? enhancedValueLine(values,y1,y2,0,750) : null;
    stats[field] = enhancedNumber(panelLine,options) ?? enhancedNumber(valueLine,options);
  }
  stats.fireModes = fireModesFromLine(enhancedValueLine(panel,820,890,850,1500) ?? enhancedValueLine(values,820,890,0,750));
  const booleanText = clean((enhancedValueLine(panel,1870,1930,900,1500) ?? enhancedValueLine(values,1870,1930,0,750))?.text ?? '').toUpperCase();
  stats.reloadInAds = /\b(?:YES|TRUE)\b/.test(booleanText) ? true : /\b(?:NO|FALSE)\b/.test(booleanText) ? false : null;
  return stats;
}
function costNumber(value) {
  const normalized = clean(String(value ?? '')).toUpperCase()
    .replace(/[OQØø]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5');
  for (const match of normalized.matchAll(/[0-9]+/g)) {
    const number = Number(match[0]);
    if (number >= 5 && number <= 50 && number % 5 === 0) return number;
  }
  return null;
}
function attachmentCostFromScreenshot(source) {
  const key = path.resolve(source.sourcePath).toLowerCase();
  const visualCost = visualStatsByPath.get(key)?.get('attachmentCost');
  if (visualCost !== undefined) return visualCost;
  for (const textValue of fieldOcrTexts(source, 'attachmentCost')) {
    const fieldCost = costNumber(textValue);
    if (fieldCost !== null) return fieldCost;
  }
  const tight = costNumber(costByPath.get(key)?.text);
  if (tight !== null) return tight;
  const highlight = highlightByPath.get(key);
  if (!highlight) return null;
  const candidates = (source.lines ?? []).filter(line => {
    const word = line.words?.[0];
    return word && word.x >= highlight.x - 8 && word.x <= highlight.x + 75
      && word.y >= highlight.y && word.y <= highlight.y + 34;
  });
  for (const line of candidates) {
    const parsed = costNumber(line.text);
    if (parsed !== null) return parsed;
  }
  return null;
}
function statsFromScreenshot(source) {
  const stats = emptyStats();
  const fieldReasons = {};
  const specs = {
    damage: [150, 210, { integer: true, min: 0, max: 100 }, 930, 1035],
    rateOfFireRpm: [220, 270, { integer: true, min: 1, max: 2000 }, 930, 1035],
    magazineSize: [285, 335, { integer: true, min: 0, max: 200 }, 930, 1035],
    hipfire: [145, 190, { integer: true, min: 0, max: 100 }],
    precision: [190, 230, { integer: true, min: 0, max: 100 }],
    control: [230, 270, { integer: true, min: 0, max: 100 }],
    mobility: [270, 315, { integer: true, min: 0, max: 100 }],
    reloadTimeSeconds: [375, 405, { unit: 's', min: 0, max: 10 }],
    muzzleVelocityMps: [405, 435, { integer: true, unit: 'mps', min: 100, max: 2000 }],
    adsTimeMs: [435, 465, { integer: true, unit: 'ms', min: 0, max: 1000 }],
    headshotMultiplier: [465, 500, { min: 0, max: 5 }],
    longRangeDamage: [505, 530, { integer: true, min: 0, max: 100 }],
    spotOnFire3dM: [530, 550, { integer: true, min: 0, max: 1000 }],
    spotOnFire2dM: [550, 570, { integer: true, unit: 'm', min: 0, max: 1000 }],
    opponentHealthRegenDelaySeconds: [570, 590, { unit: 's', min: 0, max: 20 }],
    collateralMultiplier: [590, 610, { min: 0, max: 5 }],
    adsMoveSpeedMultiplier: [630, 650, { min: 0, max: 2 }],
    sprintRecoveryMs: [650, 675, { integer: true, unit: 'ms', min: 0, max: 1000 }],
    recoilAmountDegrees: [690, 710, { unit: 'deg', min: 0, max: 90 }],
    recoilVariationDegrees: [710, 730, { unit: 'deg', min: 0, max: 180 }],
  };
  for (const [field, [y1, y2, options]] of Object.entries(specs)) {
    const [, , options, minX, maxX] = specs[field];
    const line = statValueLine(source, y1, y2, minX, maxX);
    let parsed = numberFromLine(line, options);
    if (parsed !== null && ['hipfire', 'precision', 'control', 'mobility'].includes(field) && parsed < 10) parsed = null;
    stats[field] = parsed;
    if (parsed === null) fieldReasons[field] = 'OCR value missing or ambiguous in the field-specific panel region; visual transcription or recapture required.';
  }
  const fireLine = statValueLine(source, 345, 375, 1120);
  stats.fireModes = fireModesFromLine(fireLine);
  if (stats.fireModes === null) fieldReasons.fireModes = 'OCR fire-mode value missing or ambiguous in the field-specific panel region; visual transcription required.';
  const adsLine = statValueLine(source, 610, 635, 1120);
  const adsText = adsLine ? clean(adsLine.text).toUpperCase() : '';
  if (/\bYES\b|\bTRUE\b/.test(adsText)) stats.reloadInAds = true;
  else if (/\bNO\b|\bFALSE\b/.test(adsText)) stats.reloadInAds = false;
  else fieldReasons.reloadInAds = 'OCR boolean value missing or ambiguous in the field-specific panel region; visual transcription required.';
  const enhanced = enhancedStats(source);
  for (const field of statFieldNames) {
    if (enhanced[field] !== null) {
      stats[field] = enhanced[field];
      delete fieldReasons[field];
    }
  }
  for (const [field, [, , options]] of Object.entries(specs)) {
    const fieldValue = fieldOcrNumber(source, field, options);
    if (fieldValue !== null) {
      stats[field] = fieldValue;
      delete fieldReasons[field];
    }
  }
  for (const textValue of fieldOcrTexts(source, 'fireModes')) {
    const modes = fireModesFromLine({ text: textValue });
    if (modes) { stats.fireModes = modes; delete fieldReasons.fireModes; break; }
  }
  for (const textValue of fieldOcrTexts(source, 'reloadInAds')) {
    const value = clean(textValue).toUpperCase();
    if (/\b(?:YES|TRUE)\b/.test(value)) { stats.reloadInAds = true; delete fieldReasons.reloadInAds; break; }
    if (/\b(?:NO|FALSE)\b/.test(value)) { stats.reloadInAds = false; delete fieldReasons.reloadInAds; break; }
  }
  const visualRecoil = recoilVisualByPath.get(path.resolve(source.sourcePath).toLowerCase());
  if (stats.recoilAmountDegrees === null && visualRecoil) {
    stats.recoilAmountDegrees = visualRecoil.recoilAmountDegrees;
    delete fieldReasons.recoilAmountDegrees;
  }
  const visualFields = visualStatsByPath.get(path.resolve(source.sourcePath).toLowerCase());
  for (const field of statFieldNames) {
    if (stats[field] === null && visualFields?.has(field)) {
      stats[field] = visualFields.get(field);
      delete fieldReasons[field];
    }
  }
  return { stats, fieldReasons };
}
function unvalidatedStatBlock() {
  const reason = 'Displayed field remains null: the coordinate parser has not completed independent screenshot validation for this field. Visual transcription or validated parser evidence is required.';
  return { attachmentCost: reason, ...Object.fromEntries(statFieldNames.map(field => [field, reason])) };
}
function canonicalStem(weapon, type, name, subtypeValue) {
  if (type === 'Overview') return `${weapon}_attachment_overview`;
  const filenameType = filenameAttachmentType(type);
  if (type === 'Barrel' || type === 'Ammo') return `${weapon}_${filenameType}_${slug(subtypeValue)}`;
  return `${weapon}_${filenameType}_${slug(name)}`;
}
function currentName(weapon, type, name, subtypeValue, duplicateIndex, captureOrder, semanticIndex) {
  const stem = canonicalStem(weapon, type, name, subtypeValue);
  const suffix = duplicateIndex > 1
    ? `_duplicate-${duplicateIndex}`
    : semanticIndex > 1
      ? (type === 'Barrel' || type === 'Ammo' ? `_ambiguous-${semanticIndex}` : `_duplicate-${semanticIndex}`)
      : '';
  return `${captureOrder}_${stem}${suffix}.png`;
}
function overview(record) { return /CUSTOMIZE\s+/i.test(record.text); }
function fileHash(filePath) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }
  catch { return null; }
}
function manualReviewFor({ source, weapon, type, name, legacySourceName }) {
  return manualReviewsByPath.get(path.resolve(source.sourcePath).toLowerCase())
    ?? manualReviewsByFilename.get(`${weapon}|${source.sourceName}`.toLowerCase())
    ?? (legacySourceName ? manualReviewsByFilename.get(`${weapon}|${legacySourceName}`.toLowerCase()) : null)
    ?? manualReviewsByIdentity.get(`${weapon}|${type}|${name}`.toLowerCase())
    ?? null;
}

const weapons = [...new Set(raw.map(record => record.weapon))];
const records = [];
const entries = [];
const coverage = [];
for (const weapon of weapons) {
  const orderForSource = source => captureOrderByFilename.get(captureOrderKey(weapon, source.sourceName))?.captureOrder;
  const sources = raw.filter(record => record.weapon === weapon).sort((a, b) => {
    const stableName = source => renameProvenanceByCurrent.get(path.resolve(source.sourcePath).toLowerCase())?.originalFilename
      ?? priorByCurrentPath.get(path.resolve(source.sourcePath).toLowerCase())?.source?.originalFilename
      ?? source.sourceName;
    const aName = stableName(a);
    const bName = stableName(b);
    const aDuplicate = /_duplicate-\d+\.png$/i.test(aName) ? 1 : 0;
    const bDuplicate = /_duplicate-\d+\.png$/i.test(bName) ? 1 : 0;
    const aOrder = orderForSource(a);
    const bOrder = orderForSource(b);
    if (Number.isInteger(aOrder) || Number.isInteger(bOrder)) return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
    return aDuplicate - bDuplicate || aName.localeCompare(bName) || a.sourceName.localeCompare(b.sourceName);
  });
  const inferredTypes = sources.map(source => overview(source) ? 'Overview' : canonicalAttachmentType({
    weaponName: weapon,
    sourcePath: source.sourcePath,
    detectedType: category(source),
    attachmentName: title(source),
  }));
  for (let index = 0; index < inferredTypes.length; index++) {
    if (inferredTypes[index] !== 'Unknown') continue;
    const previous = inferredTypes.slice(0, index).reverse().find(type => !['Unknown', 'Overview'].includes(type));
    const next = inferredTypes.slice(index + 1).find(type => !['Unknown', 'Overview'].includes(type));
    if (previous && previous === next) inferredTypes[index] = previous;
  }
  const counts = new Map();
  const metadataByCapture = new Map();
  const usedTargets = new Map();
  const ambiguousCounts = new Map();
  const semanticCounts = new Map();
  let detailOrder = 0;
  const weaponCoverage = { weapon, screenshotCountBefore: sources.length, overviewCount: sources.filter(overview).length, records: [], missing: [], duplicates: [], unreadableOrObscuredFields: [], status: 'provisional-review-required' };
  for (const [sourceIndex, source] of sources.entries()) {
    const captureOrderEntry = captureOrderByFilename.get(captureOrderKey(weapon, source.sourceName));
    const legacyRecord = legacyByPath.get(source.sourcePath);
    if (legacyRecord && ['M433', 'PP-19'].includes(weapon)) {
      records.push(legacyRecord);
      entries.push({ weaponName: weapon, sourcePath: source.sourcePath, sourceFilename: source.sourceName, targetPath: legacyRecord.source.currentPath, targetFilename: legacyRecord.source.proposedFilename, duplicateCapture: Boolean(legacyRecord.notes?.some(note => /Duplicate/i.test(note))), renameAllowed: false });
      weaponCoverage.records.push({ type: legacyRecord.attachmentType, name: legacyRecord.attachmentName, subtype: legacyRecord.attachmentSubtype, sourcePath: source.sourcePath, duplicate: Boolean(legacyRecord.notes?.some(note => /Duplicate/i.test(note))), status: legacyRecord.extractionStatus });
      if (legacyRecord.notes?.some(note => /Duplicate/i.test(note))) weaponCoverage.duplicates.push(source.sourceName);
      continue;
    }
    const key = source.sourceName.replace(' (Medium)', '').toLowerCase();
    const priorMetadata = metadataByCapture.get(key);
    let type = priorMetadata?.type ?? inferredTypes[sourceIndex];
    let name = priorMetadata?.name ?? (type === 'Overview' ? 'Attachment Overview' : title(source));
    let sub = priorMetadata?.sub ?? (type === 'Overview' ? null : subtype(source, type, name));
    const renameEvidence = renameProvenanceByCurrent.get(path.resolve(source.sourcePath).toLowerCase());
    const priorRecord = priorByPath.get(source.sourcePath) ?? priorByCurrentPath.get(source.sourcePath) ?? priorByProposedPath.get(source.sourcePath);
    const legacySourceName = captureOrderEntry?.originalFilename ?? renameEvidence?.originalFilename ?? priorRecord?.source?.originalFilename ?? legacyRecord?.source?.originalFilename;
    if (captureOrderEntry) {
      type = captureOrderEntry.attachmentType;
      name = captureOrderEntry.attachmentName;
      sub = captureOrderEntry.attachmentSubtype;
    }
    const manual = manualMetadata.get(`${weapon}|${source.sourceName}`) ?? (legacySourceName ? manualMetadata.get(`${weapon}|${legacySourceName}`) : null);
    if (manual) ({ type, name, sub } = manual);
    const manualReview = manualReviewFor({ source, weapon, type, name, legacySourceName });
    if (manualReview?.updates?.attachmentType !== undefined) type = manualReview.updates.attachmentType;
    if (manualReview?.updates?.attachmentName !== undefined) name = manualReview.updates.attachmentName;
    if (manualReview?.updates?.attachmentSubtype !== undefined) sub = manualReview.updates.attachmentSubtype;
    if (type === 'Laser' && name === 'None') sub = 'None';
    if (!priorMetadata) metadataByCapture.set(key, { type, name, sub });
    const duplicateIndex = (counts.get(key) ?? 0) + 1;
    counts.set(key, duplicateIndex);
    const retainedPrefix = classForSource(source.sourcePath) === 'Carbine'
      ? Number(path.basename(source.sourcePath).match(/^(\d+)_/)?.[1] ?? NaN)
      : NaN;
    const captureOrder = type === 'Overview'
      ? 0
      : (Number.isFinite(retainedPrefix) ? retainedPrefix : (captureOrderEntry?.captureOrder ?? ++detailOrder));
    if (captureOrder > detailOrder) detailOrder = captureOrder;
    const semanticStem = canonicalStem(weapon, type, name, sub).toLowerCase();
    const semanticIndex = (semanticCounts.get(semanticStem) ?? 0) + 1;
    semanticCounts.set(semanticStem, semanticIndex);
    let filename = currentName(weapon, type, name, sub, duplicateIndex, captureOrder, semanticIndex);
    let renameAllowed = type !== 'Unknown' && name !== 'Unknown' && sub !== 'Unknown';
    const priorTarget = usedTargets.get(filename);
    let targetCollision = false;
    if (priorTarget && priorTarget !== key) {
      if (type === 'Barrel' || type === 'Ammo') {
        const stem = `${weapon}_${type}_${slug(sub)}`;
        const ambiguousIndex = (ambiguousCounts.get(stem) ?? 1) + 1;
        ambiguousCounts.set(stem, ambiguousIndex);
        filename = `${stem}_ambiguous-${ambiguousIndex}.png`;
        targetCollision = usedTargets.has(filename);
        renameAllowed = !targetCollision;
      } else {
        const stem = filename.replace(/\.png$/i, '');
        const ambiguousIndex = (ambiguousCounts.get(stem) ?? 1) + 1;
        ambiguousCounts.set(stem, ambiguousIndex);
        filename = `${stem}_duplicate-${ambiguousIndex}.png`;
        targetCollision = usedTargets.has(filename);
        renameAllowed = !targetCollision;
      }
    }
    usedTargets.set(filename, key);
    const folder = fs.existsSync(source.sourcePath)
      ? path.dirname(source.sourcePath)
      : (captureOrderEntry?.currentDirectory ?? path.join(captureRoot, captureClass, weapon));
    const currentPath = path.join(folder, filename);
    const priorCurrentPath = priorRecord?.source?.currentPath;
    const retainedCurrentPath = fs.existsSync(source.sourcePath)
      ? source.sourcePath
      : (priorCurrentPath && fs.existsSync(priorCurrentPath) ? priorCurrentPath : currentPath);
    const historicalPrefix = classForSource(retainedCurrentPath) === 'Carbine'
      ? Number(path.basename(retainedCurrentPath).match(/^(\d+)_/)?.[1] ?? NaN)
      : NaN;
    const historicalCarbineOriginal = Number.isFinite(historicalPrefix)
      ? historicalCarbineOriginalByPrefix.get(`${weapon}|${historicalPrefix}`)
      : null;
    const filesystemTargetCollision = fs.existsSync(currentPath)
      && path.resolve(currentPath).toLowerCase() !== path.resolve(retainedCurrentPath).toLowerCase()
      && !rawSourceKeys.has(path.resolve(currentPath).toLowerCase());
    if (filesystemTargetCollision) {
      targetCollision = true;
      renameAllowed = false;
    }
    const notes = [`New ${classForSource(source.sourcePath)} capture remains provisional-review-required; no live data promotion.`];
    const extractedDescription = type === 'Overview' ? null : description(source);
    const manualDescription = manualDescriptions.get(`${weapon}|${source.sourceName}`)
      ?? (legacySourceName ? manualDescriptions.get(`${weapon}|${legacySourceName}`) : null);
    let correctedDescription = manualDescription ?? extractedDescription;
    if (type === 'Laser' && canonicalLaserDescriptions.has(name)) {
      correctedDescription = canonicalLaserDescriptions.get(name);
      notes.push('Laser name and complete description were normalized from the screenshot-backed repeated attachment corpus; the record remains provisional until final review sign-off.');
    }
    const commonDescription = canonicalCommonDescriptions.get(`${type}|${name}`);
    if (commonDescription) {
      correctedDescription = commonDescription;
      notes.push('Repeated attachment description was normalized from a clearer screenshot-backed record for the same attachment.');
    }
    if (manualReview?.updates?.attachmentDescription !== undefined) {
      correctedDescription = manualReview.updates.attachmentDescription;
      notes.push('Attachment description was imported from the user-reviewed workbook and remains linked to this screenshot.');
    }
    const visuallyCorrectedDescription = manualDescription ?? manualReview?.updates?.attachmentDescription;
    if (correctedDescription) {
      const before = correctedDescription;
      correctedDescription = correctedDescription
        .replace(/^IA\s*oerault\s*/i, '')
        .replace(/^Default\s+/i, '')
        .replace(/\bI?A[DO]S[I1]?\)?_?|\[A[DO]S[I1]?|\(A[DO]S[I1]?|\bA[DO]S[I1]?[,.]?\b/gi, '(ADS)')
        .replace(/\(ADS\)[I1)_]+/gi, '(ADS)')
        .replace(/\(ADS\)\]/gi, '(ADS)')
        .replace(/\(ADS\)\.\)/gi, '(ADS).')
        .replace(/\bOMR\b/gi, 'DMR')
        .replace(/\btaster\b/gi, 'faster')
        .replace(/\bcost\s+ot\b/gi, 'cost of')
        .replace(/\bsold\s+iers\b/gi, 'soldiers')
        .replace(/\bsustained\s+tire\b/gi, 'sustained fire')
        .replace(/\bhip[- ]tire\b/gi, 'hip-fire')
        .replace(/\bmln\.map\b|\bmin\.map\b/gi, 'minimap')
        .replace(/\bin-\s*world\b/gi, 'in-world')
        .replace(/\s+Unlock at\b.*$/i, '')
        .replace(/semi-Ã¥Uto/gi, 'semi-auto')
        .replace(/\s+/g, ' ')
        .trim();
      if (visuallyCorrectedDescription) correctedDescription = visuallyCorrectedDescription.trim();
      if (correctedDescription !== before) notes.push('Context-safe OCR cleanup applied to the screenshot-linked description; visual review remains required.');
    }
    const descriptionStartsLowercase = Boolean(extractedDescription && /^[a-z]/.test(extractedDescription));
    if (type !== 'Overview') notes.push('Attachment cost and typed stat fields require manual visual transcription from the screenshot; raw OCR is retained and no value is authoritative.');
    if (descriptionStartsLowercase && visuallyCorrectedDescription) notes.push('OCR description began mid-clause; body text was visually corrected from the screenshot.');
    else if (descriptionStartsLowercase) notes.push('Description begins with a lowercase letter; OCR likely omitted leading text. Manual visual correction is required.');
    if (type !== 'Overview' && correctedDescription && /Unlock at|[^\u0000-\u007F]/.test(correctedDescription)) notes.push('Description quality flag: overlay text or non-ASCII OCR artifact remains; manually verify body text before promotion.');
    if (type !== 'Overview' && correctedDescription && !/[.!?]$/.test(correctedDescription.trim())) notes.push('Description quality flag: sentence may be truncated or mid-clause; manually verify against the screenshot.');
    if (type !== 'Overview' && correctedDescription && name !== 'Unknown' && letters(name).length >= 6 && letters(correctedDescription).startsWith(letters(name))) notes.push('Description quality flag: repeated attachment title detected; manually verify body text against the screenshot.');
    if (targetCollision && type === 'Barrel') notes.push('Distinct barrel captures share the prescribed card subtype filename; rename blocked to avoid conflating weapon-specific barrel names.');
    else if (filesystemTargetCollision) notes.push('Destination already exists for a different retained screenshot; rename blocked pending visual collision resolution.');
    else if (targetCollision) notes.push('Canonical name/subtype collides with another retained capture; duplicate status is not assumed without independent image evidence.');
    if (!renameAllowed) notes.push('needs recapture or manual visual normalization: attachment category/name/subtype was not reliably readable from OCR or target naming was ambiguous.');
    if (duplicateIndex > 1) notes.push(`Duplicate capture ${duplicateIndex}; preserved with duplicate suffix.`);
    const parsedStats = type === 'Overview' ? null : statsFromScreenshot(source);
    const compactDetailPanel = type !== 'Overview' && !/RELOAD TIME|MUZZLE VELOCITY|HEADSHOT MULTIPLIER|RECOIL VARIATION/i.test(source.text);
    if (compactDetailPanel) {
      for (const field of statFieldNames) {
        if (parsedStats.stats[field] === null) parsedStats.fieldReasons[field] = 'Field is not displayed in this compact accessory-selector layout; screenshot recapture with the expanded detail panel is required.';
      }
      notes.push('Compact accessory-selector layout: only the visible summary panel values were transcribed; lower detail fields are not displayed in this screenshot and remain null pending recapture.');
    }
    let parsedCost = type === 'Overview' ? null : (screenshotReviewedCommonCosts.get(`${type}|${name}`) ?? attachmentCostFromScreenshot(source));
    const referenceValuesForSource = type === 'Overview' ? null : referenceValuesByFilename.get(`${weapon}|${legacySourceName ?? source.sourceName}`.toLowerCase());
    if (parsedStats && referenceValuesForSource) {
      let retained = 0;
      for (const field of Object.keys(emptyStats())) {
        const useReference = referenceValuesForSource.preferReference === true || referenceValuesForSource.forceFields?.includes(field);
        if (useReference && referenceValuesForSource.stats?.[field] !== null && referenceValuesForSource.stats?.[field] !== undefined) {
          parsedStats.stats[field] = referenceValuesForSource.stats[field];
          delete parsedStats.fieldReasons[field];
          retained++;
        }
      }
      if (parsedCost === null && referenceValuesForSource.attachmentCost !== null && referenceValuesForSource.attachmentCost !== undefined) {
        parsedCost = referenceValuesForSource.attachmentCost;
        retained++;
      }
      if (retained) notes.push(`Applied ${retained} typed M433/PP-19 field(s) from the screenshot-linked reference row keyed by ${legacySourceName ?? source.sourceName}; fresh OCR/parser evidence remains retained and mapping was rebuilt.`);
    }
    const sourceKey = path.resolve(source.sourcePath).toLowerCase();
    const automaticComparisons = comparisonsByPath.get(sourceKey);
    const comparisonScanAvailable = automaticComparisons !== undefined;
    let statComparisons = { ...(automaticComparisons ?? {}) };
    const reviewConflicts = [];
    if (manualReview && type !== 'Overview') {
      if (manualReview.updates?.attachmentCost !== undefined) parsedCost = manualReview.updates.attachmentCost;
      for (const field of statFieldNames) {
        if (!(field in (manualReview.updates ?? {}))) continue;
        const manualComparison = manualReview.comparisons?.[field] ?? null;
        const automaticComparison = automaticComparisons?.[field] ?? null;
        const comparisonConflict = !manualReview.replaceComparisons && comparisonScanAvailable && (
          Boolean(manualComparison) !== Boolean(automaticComparison)
          || (manualComparison && automaticComparison && (
            manualComparison.direction !== automaticComparison.direction
            || manualComparison.effect !== automaticComparison.effect
          ))
        );
        if (comparisonConflict) {
          reviewConflicts.push({
            field,
            workbookValue: manualReview.updates[field],
            workbookComparison: manualComparison,
            screenshotComparison: automaticComparison,
            retainedValue: parsedStats.stats[field],
            resolution: 'Screenshot comparison indicator and coordinate OCR retained; workbook edit not applied.',
          });
          continue;
        }
        parsedStats.stats[field] = manualReview.updates[field];
        if (manualReview.updates[field] === null && compactDetailPanel) {
          parsedStats.fieldReasons[field] = 'Field is not displayed in this compact accessory-selector layout; screenshot-specific null retained after direct visual review.';
        } else {
          delete parsedStats.fieldReasons[field];
        }
        if (manualComparison) statComparisons[field] = { ...automaticComparison, ...manualComparison, source: 'user-reviewed-workbook-and-screenshot-color' };
      }
      if (manualReview.replaceComparisons) statComparisons = { ...(manualReview.comparisons ?? {}) };
      if (reviewConflicts.length) notes.push(`User-reviewed workbook conflicts with visible screenshot comparison indicators for: ${reviewConflicts.map(item => item.field).join(', ')}. Screenshot evidence was retained.`);
      else notes.push('Yellow/orange cell updates were imported from the user-reviewed workbook; arrow direction and buff/penalty remain separate from typed values.');
    }
    const record = {
      weaponName: weapon, attachmentType: type, attachmentSubtype: sub, attachmentCost: parsedCost, attachmentName: name,
      attachmentDescription: correctedDescription, stats: type === 'Overview' ? null : parsedStats.stats,
      statComparisons: type === 'Overview' ? null : statComparisons,
      source: { originalPath: historicalCarbineOriginal?.sourcePath ?? captureOrderEntry?.originalPath ?? renameEvidence?.originalPath ?? priorRecord?.source?.originalPath ?? source.sourcePath, originalFilename: historicalCarbineOriginal?.sourceName ?? captureOrderEntry?.originalFilename ?? renameEvidence?.originalFilename ?? priorRecord?.source?.originalFilename ?? source.sourceName, proposedFilename: filename, currentPath: retainedCurrentPath, renameApplied: !fs.existsSync(historicalCarbineOriginal?.sourcePath ?? captureOrderEntry?.originalPath ?? renameEvidence?.originalPath ?? priorRecord?.source?.originalPath ?? source.sourcePath) && fs.existsSync(retainedCurrentPath) && path.resolve(historicalCarbineOriginal?.sourcePath ?? captureOrderEntry?.originalPath ?? renameEvidence?.originalPath ?? priorRecord?.source?.originalPath ?? source.sourcePath).toLowerCase() !== path.resolve(retainedCurrentPath).toLowerCase(), captureOrder, captureTimestamp: captureOrderEntry?.captureTimestamp ?? stamp(source), resolution: `${source.width}x${source.height}`, rawAttachmentDescriptionOcr: extractedDescription, rawFullScreenOcr: source.text },
      extractionStatus: type === 'Overview' ? 'context-only' : 'provisional-review-required',
      reviewStatus: manualReview?.reviewStatus ?? 'provisional-review-required',
      mappingReviewStatus: manualReview?.reviewStatus === 'reviewed' ? 'visually-checked' : (manualReview?.mappingReviewStatus ?? (manual ? 'visually-checked' : 'ocr-pending')),
      reviewer: manualReview?.reviewStatus === 'reviewed' ? 'User' : null,
      reviewDate: manualReview?.reviewStatus === 'reviewed' ? '2026-07-24' : null,
      reviewConflicts,
      statFieldReasons: type === 'Overview' ? null : { ...(parsedCost === null ? { attachmentCost: 'Highlighted-card cost was not confidently readable in either OCR pass; visual transcription remains required.' } : {}), ...parsedStats.fieldReasons },
      notes,
    };
    if (type !== 'Overview') notes.push('Displayed stat panel was parsed with field-specific screen regions and remains provisional pending final screenshot review; unreadable fields remain null with field-specific reasons.');
    if (type === 'Laser') notes.push('Dedicated laser screenshot fields were reconciled; displayed name, cost, visible stats, and comparison indicators are retained, while compact-panel lower fields remain null where not displayed.');
    records.push(record);
    const sourceIsTarget = path.resolve(retainedCurrentPath).toLowerCase() === path.resolve(currentPath).toLowerCase();
    const manuallyApproved = renameAllowed || sourceIsTarget || ['M433', 'PP-19'].includes(weapon);
    const approvedRename = renameAllowed && manuallyApproved;
    entries.push({ weaponName: weapon, captureOrder, sourcePath: retainedCurrentPath, sourceFilename: path.basename(retainedCurrentPath), targetPath: currentPath, targetFilename: filename, duplicateCapture: duplicateIndex > 1, classification: targetCollision ? 'collision' : duplicateIndex > 1 ? 'distinct-same-name-capture' : approvedRename && !sourceIsTarget ? 'approved-unique-rename' : sourceIsTarget ? 'already-canonical' : 'unresolved-mapping', renameAllowed: approvedRename });
    weaponCoverage.records.push({ type, name, subtype: sub, sourcePath: retainedCurrentPath, duplicate: duplicateIndex > 1, status: record.extractionStatus });
    if (duplicateIndex > 1) weaponCoverage.duplicates.push(source.sourceName);
    if (!renameAllowed || !extractedDescription || (descriptionStartsLowercase && !manualDescription)) weaponCoverage.unreadableOrObscuredFields.push({ source: source.sourceName, fields: ['attachment category/name/subtype/description'], note: descriptionStartsLowercase ? 'description begins lowercase and likely lost leading OCR text; manual visual correction required' : 'needs recapture or manual visual review' });
  }
  weaponCoverage.screenshotCountAfter = sources.length;
  weaponCoverage.statCoverage = Object.fromEntries(Object.keys(emptyStats()).map(field => [field, {
    populated: records.filter(record => record.weaponName === weapon && record.attachmentType !== 'Overview' && record.stats && record.stats[field] !== null).length,
    total: records.filter(record => record.weaponName === weapon && record.attachmentType !== 'Overview').length,
  }]));
  if (weaponCoverage.records.length !== sources.length) throw new Error(`${weapon}: screenshot/record count mismatch (${sources.length} vs ${weaponCoverage.records.length})`);
  const expectedCategories = ['Muzzle', 'Barrel', 'Grip', 'Magazine', 'Ammo', 'Ergonomics'];
  const weaponClass = classForSource(sources[0]?.sourcePath);
  if (weaponClass.toLowerCase() === 'assault rifle') expectedCategories.push('Sight');
  if (weaponClass.toLowerCase() === 'carbine') expectedCategories.push('Left Accessory', 'Right Accessory', 'Top Accessory');
  if (usesSharedLaserLightType({ weaponName: weapon, sourcePath: sources[0]?.sourcePath })) expectedCategories.push('Laser/Light');
  else expectedCategories.push('Light', 'Laser');
  if (weapon === 'Mini Scout') expectedCategories.push('Range Finder');
  const observedCategories = new Set(weaponCoverage.records.filter(record => record.type !== 'Overview').map(record => record.type));
  weaponCoverage.missing = expectedCategories.filter(type => !observedCategories.has(type)).map(type => ({ category: type, status: 'not captured or not available', note: 'Overview/category inventory and manual review are required before classifying this as unavailable.' }));
  coverage.push(weaponCoverage);
}

const statFields = Object.keys(emptyStats());
const detailRecords = records.filter(record => record.stats);
const newClassRecords = detailRecords.filter(record => record.weaponName !== 'M433' && record.weaponName !== 'PP-19');
const currentPathMissing = records.filter(record => !fs.existsSync(record.source.currentPath)).length;
const destinationEscapes = entries.filter(entry => !path.resolve(entry.targetPath).toLowerCase().startsWith(path.dirname(path.resolve(entry.sourcePath)).toLowerCase() + path.sep)).length;
const destinationKeys = entries.map(entry => path.resolve(entry.targetPath).toLowerCase());
const destinationCollisions = destinationKeys.length - new Set(destinationKeys).size;
const timestampNamedCurrent = raw.filter(record => /^Battlefield 6 Screenshot .*\.png$/i.test(record.sourceName)).length;
const hasAdsArtifact = value => Boolean(value && /IADS|IAOS|I?A[DO]SI|\[[A(]?[DO]SI?|ADS\]|AOS[,.]|\(ADS\)[I1)_]|\bAOS\b/i.test(value));
const manifestSummary = Object.fromEntries([...new Set(entries.map(entry => entry.classification ?? 'legacy-unchanged'))].map(classification => [classification, entries.filter(entry => (entry.classification ?? 'legacy-unchanged') === classification).length]));
const statCoverageByWeapon = Object.fromEntries(weapons.map(weapon => [weapon, Object.fromEntries(statFields.map(field => [field, { populated: records.filter(record => record.weaponName === weapon && record.stats && record.stats[field] !== null).length, total: records.filter(record => record.weaponName === weapon && record.stats).length }]))]));
const document = { $schema: '../../schemas/attachment-screenshot-review.schema.json', schemaVersion: 4, generatedAt: new Date().toISOString(), status: 'provisional-review-required', source: 'Battlefield 6 in-game attachment detail screenshots supplied by the user after update 1.3.3.0', extractionMethod: 'Coordinate-based Windows OCR is retained per screenshot. Red/green comparison color and triangular arrow direction are extracted separately from typed values, and human workbook edits are reconciled against the screenshot indicators.', reviewPolicy: 'No provisional screenshot value is promoted to live site data without visual review, mapping provenance, and focused tests.', recordCount: records.length, attachmentDetailCount: records.filter(record => record.stats).length, mappingReviewedCount: records.filter(record => record.mappingReviewStatus === 'visually-checked').length, weaponsProcessed: weapons, captureClass, knownGaps: ['No new values are promoted into live data.', `${captureClass} records remain provisional until title, subtype, cost, description, and full displayed stat panel are visually reviewed.`, 'Sight/optic coverage is absent unless shown by the overview; absence is not treated as not available.'], records };
fs.mkdirSync(auditRoot, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
fs.writeFileSync(manifestPath, `${JSON.stringify({ generatedAt: document.generatedAt, entries }, null, 2)}\n`);
fs.writeFileSync(renameProvenancePath, `${JSON.stringify(records.map(record => ({
  weaponName: record.weaponName,
  captureOrder: record.source.captureOrder,
  originalPath: record.source.originalPath,
  originalFilename: record.source.originalFilename,
  currentPath: record.source.currentPath,
  currentFilename: path.basename(record.source.currentPath),
})), null, 2)}\n`);
fs.writeFileSync(coveragePath, `${JSON.stringify({ generatedAt: document.generatedAt, captureClass, weapons: coverage, statCoverageByWeapon, manifestSummary, totals: { screenshotsBefore: coverage.reduce((n, item) => n + item.screenshotCountBefore, 0), screenshotsAfter: coverage.reduce((n, item) => n + item.screenshotCountAfter, 0), timestampNamedCurrent, records: records.length, detailRecords: detailRecords.length, newClassRecords: newClassRecords.length, fullyTranscribedNewClass: newClassRecords.filter(record => statFields.every(field => record.stats?.[field] !== null) && record.attachmentCost !== null).length, fullyReviewed: records.filter(record => record.reviewStatus === 'reviewed').length, comparisonIndicators: records.reduce((n, record) => n + Object.keys(record.statComparisons ?? {}).length, 0), reviewConflicts: records.reduce((n, record) => n + (record.reviewConflicts?.length ?? 0), 0), duplicateCaptures: coverage.reduce((n, item) => n + item.duplicates.length, 0), unreadableOrObscured: coverage.reduce((n, item) => n + item.unreadableOrObscuredFields.length, 0), mappingReviewed: records.filter(record => record.mappingReviewStatus === 'visually-checked').length, laserRecords: records.filter(record => record.attachmentType === 'Laser').length, laserMappingReviewed: records.filter(record => record.attachmentType === 'Laser' && record.mappingReviewStatus === 'visually-checked').length, laserBlocked: records.filter(record => record.attachmentType === 'Laser' && record.mappingReviewStatus !== 'visually-checked').length, correctedDescriptions: records.filter(record => record.notes.some(note => /Context-safe OCR cleanup|body text was visually corrected/.test(note))).length, adsArtifactsAfter: records.filter(record => hasAdsArtifact(record.attachmentDescription)).length, adsArtifactsRaw: records.filter(record => hasAdsArtifact(record.source.rawAttachmentDescriptionOcr)).length, knownBarrelSubtypeCorrections: 3, populatedFieldNullReasons: records.reduce((n, record) => n + Object.keys(record.statFieldReasons ?? {}).length, 0), staleCurrentPaths: currentPathMissing, destinationEscapes, destinationCollisions, promoted: 0 } }, null, 2)}\n`);
console.log(`Wrote ${records.length} records, ${entries.length} manifest entries, and ${coverage.length} weapon coverage rows.`);

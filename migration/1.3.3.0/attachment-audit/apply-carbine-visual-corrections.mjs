import fs from 'node:fs';

const root = 'C:/Users/royal/Documents/BF6 Weapon Analyzer';
const audit = `${root}/migration/1.3.3.0/attachment-audit`;
const review = JSON.parse(fs.readFileSync(`${audit}/attachment-screenshot-review.json`, 'utf8'));
const overridesDoc = JSON.parse(fs.readFileSync(`${audit}/manual-review-overrides.json`, 'utf8'));
const records = review.records.filter(r => r.source.originalPath.includes('\\Carbine\\'));
const byFile = new Map(records.map(r => [r.source.currentPath.toLowerCase(), r]));
const overrides = overridesDoc.overrides ?? [];
const existing = new Map(overrides.map((o, i) => [String(o.sourcePath ?? '').toLowerCase(), i]));

const costs = {
  'AK-205|11_AK-205_Barrel_Basic.png': 10,
  'AK-205|14_AK-205_Barrel_Cryo.png': 20,
  'AK-205|17_AK-205_Light_FLASH_IG.png': 10,
  'AK-205|33_AK-205_Magazine_30Rnd_Magazine.png': 5,
  'AK-205|36_AK-205_Magazine_40Rnd_Magazine.png': 25,
  'AK-205|39_AK-205_Magazine_45Rnd_Fast_Mag.png': 40,
  'AK-205|40_AK-205_Magazine_36Rnd_Magazine_duplicate-2.png': 15,
  'AK-205|49_AK-205_Ergonomics_MAGWELL_FLARE.png': 10,
  'BROD 3|13_BROD 3_Barrel_Basic.png': 10,
  'BROD 3|14_BROD 3_Barrel_Extended.png': 5,
  'BROD 3|16_BROD 3_Barrel_Light.png': 20,
  'BROD 3|34_BROD 3_Magazine_30Rnd_Magazine.png': 5,
  'BROD 3|35_BROD 3_Magazine_20Rnd_Fast_Mag.png': 5,
  'BROD 3|36_BROD 3_Magazine_20Rnd_Magazine.png': 5,
  'BROD 3|38_BROD 3_Magazine_36Rnd_Magazine.png': 15,
  'BROD 3|39_BROD 3_Magazine_40Rnd_Magazine.png': 25,
  'BROD 3|40_BROD 3_Magazine_40Rnd_Fast_Mag.png': 30,
  'BROD 3|49_BROD 3_Ergonomics_RAIL_COVER.png': 5,
  'BROD 3|53_BROD 3_Laser_50_MWMOLETZ.png': 10,
  'BROD 3|57_BROD 3_Laser_12_MWI-UE--N.png': 30,
  'BROD 3|61_BROD 3_Light_TACLIGHTHAITD.png': 5,
  'GRT-BC|13_GRT-BC_Barrel_Basic.png': 10,
  'GRT-BC|14_GRT-BC_Barrel_Extended.png': 5,
  'GRT-BC|15_GRT-BC_Barrel_Light.png': 20,
  'GRT-BC|27_GRT-BC_Grip_Compact_Handstop.png': 10,
  'GRT-BC|28_GRT-BC_Magazine_30Rnd_Magazine.png': 5,
  'GRT-BC|31_GRT-BC_Magazine_45Rnd_Magazine.png': 35,
  'GRT-BC|32_GRT-BC_Magazine_45Rnd_Fast_Mag.png': 40,
  'GRT-BC|39_GRT-BC_Ergonomics_IMPROVED_MAG.png': 5,
  'GRT-BC|41_GRT-BC_Ergonomics_AFTERMARKET_B.png': 5,
  'GRT-BC|42_GRT-BC_Ergonomics_BURST_MOje.png': 15,
  'GRT-BC|53_GRT-BC_Laser-Light_LASERLIGHT_COMBO_RED.png': 20,
  'M277|33_M277_Magazine_20Rnd_Magazine.png': 5,
  'M277|34_M277_Magazine_15Rnd_Magazine.png': 5,
  'M277|35_M277_Magazine_20Rnd_Fast_Mag.png': 10,
  'M277|38_M277_Magazine_30Rnd_Magazine.png': 20,
  'M277|45_M277_Ergonomics_MAGWELL_FLARE.png': 10,
  'M277|49_M277_Laser_50_MW.png': 10,
  'M277|55_M277_Light_TACLIGHT.png': 5,
  'M277|57_M277_Light_TACLIGHT_duplicate-2.png': 15,
  'M417 A2|13_M417 A2_Barrel_Extended.png': 10,
  'M417 A2|15_M417 A2_Barrel_Cryo.png': 20,
  'M417 A2|36_M417 A2_Magazine_20Rnd_Magazine.png': 5,
  'M417 A2|37_M417 A2_Magazine_20Rnd_Magazine_duplicate-2.png': 5,
  'M417 A2|38_M417 A2_Magazine_20Rnd_Fast_Mag.png': 10,
  'M417 A2|39_M417 A2_Magazine_25Rnd_Magazine.png': 15,
  'M4A1|14_M4A1_Barrel_Extended.png': 5,
  'M4A1|16_M4A1_Barrel_Light.png': 20,
  'M4A1|37_M4A1_Magazine_30Rnd_Magazine.png': 5,
  'M4A1|38_M4A1_Magazine_20Rnd_Fast_Mag.png': 5,
  'M4A1|39_M4A1_Magazine_20Rnd_Magazine.png': 5,
  'M4A1|41_M4A1_Magazine_36Rnd_Magazine.png': 15,
  'M4A1|43_M4A1_Magazine_40Rnd_Fast_Mag.png': 30,
  'M4A1|53_M4A1_Ergonomics_5.png': 5,
  'M4A1|65_M4A1_Light_TACLIGH.png': 15,
  'QBZ-192|6_QBZ-192_Barrel_Basic.png': 10,
  'QBZ-192|7_QBZ-192_Barrel_Extended.png': 5,
  'QBZ-192|8_QBZ-192_Barrel_Cryo.png': 20,
  'QBZ-192|27_QBZ-192_Magazine_30Rnd_Magazine.png': 5,
  'QBZ-192|30_QBZ-192_Magazine_40Rnd_Magazine.png': 25,
  'QBZ-192|39_QBZ-192_Ergonomics_RAIL_COVER.png': 5,
  'SG 553R|13_SG 553R_Barrel_Basic.png': 10,
  'SG 553R|14_SG 553R_Barrel_Extended.png': 5,
  'SG 553R|30_SG 553R_Magazine_30Rnd_Magazine.png': 5,
  'SG 553R|31_SG 553R_Magazine_20Rnd_Fast_Mag.png': 5,
  'SG 553R|32_SG 553R_Magazine_20Rnd_Magazine.png': 5,
  'SG 553R|34_SG 553R_Magazine_36Rnd_Magazine.png': 15,
  'SG 553R|36_SG 553R_Magazine_40Rnd_Fast_Mag.png': 30,
  'SG 553R|42_SG 553R_Ammo_Subsonic.png': 10,
  'SG 553R|43_SG 553R_Ammo_Standard_ambiguous-2.png': 30,
  'SG 553R|48_SG 553R_Ergonomics_BURST_TRAINING.png': 15,
  'SOR-300SC|24_SOR-300SC_Grip_Compact_Handstop.png': 10,
  'SOR-300SC|29_SOR-300SC_Magazine_30Rnd_Magazine.png': 5,
  'SOR-300SC|30_SOR-300SC_Magazine_20Rnd_Fast_Mag.png': 5,
  'SOR-300SC|31_SOR-300SC_Magazine_20Rnd_Magazine.png': 5,
  'SOR-300SC|33_SOR-300SC_Magazine_40Rnd_Magazine.png': 25,
  'SOR-300SC|35_SOR-300SC_Magazine_40Rnd_Fast_Mag.png': 30,
  'SOR-300SC|41_SOR-300SC_Ammo_Subsonic.png': 10,
  'SOR-300SC|42_SOR-300SC_Ammo_Standard_ambiguous-2.png': 30,
  'SOR-300SC|46_SOR-300SC_Ergonomics_RAIL_COVER.png': 5,
};

const nameFixes = {
  'BROD 3|52_BROD 3_Laser_5_MWD.png': '5 MW Red',
  'AK-205|17_AK-205_Light_FLASH_IG.png': 'Flashlight',
  'BROD 3|53_BROD 3_Laser_50_MWMOLETZ.png': '50 MW Violet',
  'BROD 3|57_BROD 3_Laser_12_MWI-UE--N.png': '120 MW Blue',
  'BROD 3|61_BROD 3_Light_TACLIGHTHAITD.png': 'Taclight - Aimed',
  'GRT-BC|42_GRT-BC_Ergonomics_BURST_MOje.png': 'Burst Training',
  'M277|49_M277_Laser_50_MW.png': '50 MW Violet',
  'M277|55_M277_Light_TACLIGHT.png': 'Taclight - Aimed',
  'M277|57_M277_Light_TACLIGHT_duplicate-2.png': 'Taclight - Hipfire',
  'M4A1|53_M4A1_Ergonomics_5.png': 'Rail Cover',
  'M4A1|65_M4A1_Light_TACLIGH.png': 'Taclight - Hipfire',
};

function comparison(direction, effect, color) {
  return { direction, effect, color, confidence: 1, source: 'direct-screenshot-review' };
}
const laserVisible = {
  damage: 20, rateOfFireRpm: 720, magazineSize: 30, precision: 88,
  control: 57, reloadTimeSeconds: 2.484, muzzleVelocityMps: 708,
  adsTimeMs: 200, headshotMultiplier: 1.4,
  fireModes: null, longRangeDamage: null, spotOnFire3dM: null,
  spotOnFire2dM: null, opponentHealthRegenDelaySeconds: null,
  collateralMultiplier: null, reloadInAds: null, adsMoveSpeedMultiplier: null,
  sprintRecoveryMs: null, recoilAmountDegrees: null, recoilVariationDegrees: null,
};
const laserRows = [
  ['52_AK-205_Laser_None.png', 47, 60, {}],
  ['53_AK-205_Laser_5_MW_Red.png', 54, 60, { hipfire: comparison('up','buff','green') }],
  ['54_AK-205_Laser_50_MW_Violet.png', 47, 64, { mobility: comparison('up','buff','green') }],
  ['55_AK-205_Laser_5_MW_Green.png', 62, 60, { hipfire: comparison('up','buff','green') }],
  ['56_AK-205_Laser_50_MW_Green.png', 71, 60, { hipfire: comparison('up','buff','green') }],
  ['57_AK-205_Laser_50_MW_Blue.png', 62, 64, { hipfire: comparison('up','buff','green'), mobility: comparison('up','buff','green') }],
  ['58_AK-205_Laser_120_MW_Blue.png', 71, 64, { hipfire: comparison('up','buff','green'), mobility: comparison('up','buff','green') }],
];

function add(record, updates, comparisons = null, replaceComparisons = null) {
  const override = {
    weaponName: record.weaponName,
    attachmentType: record.attachmentType,
    attachmentName: record.attachmentName,
    sourcePath: record.source.currentPath,
    sourceFilename: record.source.currentPath.split('\\').pop(),
    updates,
    comparisons: comparisons ?? {},
    replaceComparisons: replaceComparisons ?? false,
    evidence: [{ kind: 'direct-screenshot-review', source: record.source.currentPath }],
    reviewStatus: null,
    mappingReviewStatus: 'visually-checked',
  };
  const key = record.source.currentPath.toLowerCase();
  if (existing.has(key)) {
    const prior = overrides[existing.get(key)];
    overrides[existing.get(key)] = { ...prior, ...override,
      updates: { ...(prior.updates ?? {}), ...updates },
      comparisons: comparisons ?? prior.comparisons ?? {},
      replaceComparisons: replaceComparisons ?? prior.replaceComparisons ?? false };
  }
  else { existing.set(key, overrides.length); overrides.push(override); }
}

for (const [key, cost] of Object.entries(costs)) {
  const [weapon, filename] = key.split('|');
  const record = byFile.get((records.find(r => r.weaponName === weapon && (r.source.currentPath.endsWith(filename) || r.source.originalFilename === filename))?.source.currentPath ?? '').toLowerCase());
  if (!record) continue;
  add(record, { attachmentCost: cost });
}
for (const [key, name] of Object.entries(nameFixes)) {
  const [weapon, filename] = key.split('|');
  const record = records.find(r => r.weaponName === weapon && (r.source.currentPath.endsWith(filename) || r.source.originalFilename === filename));
  if (!record) continue;
  add(record, { attachmentName: name });
}

const linear = records.find(r => r.weaponName === 'AK-205' && r.source.currentPath.endsWith('6_AK-205_Muzzle_Linear_Comp.png'));
add(linear, { recoilAmountDegrees: 0.5, recoilVariationDegrees: 5.5 }, {
  ...linear.statComparisons,
  recoilAmountDegrees: comparison('up','penalty','red'),
  recoilVariationDegrees: comparison('down','buff','green'),
});
for (const [filename, hipfire, mobility, comparisons] of laserRows) {
  const record = records.find(r => r.source.currentPath.endsWith(filename));
  add(record, { ...laserVisible, hipfire, mobility }, comparisons, true);
}
for (const [filename, control] of [
  ['4_AK-205_Muzzle_Double-Port_Brake.png', 60],
  ['5_AK-205_Muzzle_Compensated_Brake.png', 60],
  ['31_AK-205_Grip_Slim_Angled.png', 60],
]) {
  const record = records.find(r => r.weaponName === 'AK-205' && r.source.currentPath.endsWith(filename));
  add(record, { control }, { control: comparison('up','buff','green') });
}
const brodBlue = records.find(r => r.weaponName === 'BROD 3' && r.source.currentPath.endsWith('57_BROD 3_Laser_120_MW_Blue.png'));
add(brodBlue, { attachmentSubtype: 'Blue Laser' });
const brodFlashComp = records.find(r => r.weaponName === 'BROD 3' && r.source.currentPath.endsWith('8_BROD 3_Muzzle_Flash_Comp.png'));
add(brodFlashComp, { attachmentSubtype: 'Flash Hider', attachmentDescription: 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.' });
const brodPencil = records.find(r => r.weaponName === 'BROD 3' && r.source.currentPath.endsWith('16_BROD 3_Barrel_Light.png'));
if (brodPencil) add(brodPencil, { attachmentDescription: 'Lightened barrel that improves aim down sights (ADS) accuracy while moving and enables a fast transition to ADS.' });
const hardDescriptionOverrides = new Map([
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\AK-205\3_AK-205_Muzzle_Flash_Comp.png`, 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\AK-205\4_AK-205_Muzzle_Double-Port_Brake.png`, 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\4_BROD 3_Muzzle_Double-Port_Brake.png`, 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\7_BROD 3_Muzzle_Standard_Suppressor.png`, 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces hip-fire accuracy.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\50_BROD 3_Ergonomics_Aftermarket_Buffer.png`, 'Reduces visual impacts of recoil while firing.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\GRT-BC\3_GRT-BC_Muzzle_Flash_Comp.png`, 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\GRT-BC\5_GRT-BC_Muzzle_Double-Port_Brake.png`, 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\GRT-BC\9_GRT-BC_Muzzle_Standard_Suppressor.png`, 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing. Reduces hip-fire accuracy.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M277\3_M277_Muzzle_Flash_Comp.png`, 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M277\5_M277_Muzzle_Double-Port_Brake.png`, 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\3_M417 A2_Muzzle_Flash_Comp.png`, 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\4_M417 A2_Muzzle_Double-Port_Brake.png`, 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\22_M417 A2_Grip_UNDERSLUNG_MOUNT.png`, 'Enables the mounting of the High Explosive, Thermobaric, and Smoke Grenade Launchers to the underside of the weapon for a faster gadget draw speed.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\3_M4A1_Muzzle_Flash_Comp.png`, 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\5_M4A1_Muzzle_Double-Port_Brake.png`, 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SG 553R\3_SG 553R_Muzzle_Flash_Comp.png`, 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SG 553R\5_SG 553R_Muzzle_Double-Port_Brake.png`, 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\3_SOR-300SC_Muzzle_Flash_Comp.png`, 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\5_SOR-300SC_Muzzle_Double-Port_Brake.png`, 'Improved brake that reduces recoil. Soldiers firing will be spotted, marking their position in-world and on the minimap.'],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\11_SOR-300SC_Muzzle_CQB_Suppressor.png`, 'Fully hides in-world spotting and reduces the range where a soldier is spotted on the minimap while firing.'],
]);
for (const [sourcePath, description] of hardDescriptionOverrides) {
  const record = records.find(r => r.source.currentPath.toLowerCase() === sourcePath.toLowerCase());
  if (!record) throw new Error(`Missing hard description screenshot: ${sourcePath}`);
  add(record, { attachmentDescription: description });
}
const mobilityOverrides = new Map([
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\1_BROD 3_Muzzle_None.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\2_BROD 3_Muzzle_Flash_Hider.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\3_BROD 3_Muzzle_Single-Port_Brake.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\4_BROD 3_Muzzle_Double-Port_Brake.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\5_BROD 3_Muzzle_Compensator.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\6_BROD 3_Muzzle_Linear_Comp.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\7_BROD 3_Muzzle_Standard_Suppressor.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\8_BROD 3_Muzzle_Flash_Comp.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\9_BROD 3_Muzzle_Compensated_Brake.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\10_BROD 3_Muzzle_Long_Suppressor.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\11_BROD 3_Muzzle_CQB_Suppressor.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\12_BROD 3_Muzzle_Lightened_Suppressor.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\13_BROD 3_Barrel_Basic.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\BROD 3\15_BROD 3_Barrel_Short.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M277\13_M277_Grip_None.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M277\15_M277_Grip_Alloy_Vertical.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M277\20_M277_Grip_Folding_Stubby.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\16_M417 A2_Grip_None.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\18_M417 A2_Grip_Alloy_Vertical.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\22_M417 A2_Grip_UNDERSLUNG_MOUNT.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\23_M417 A2_Grip_Folding_Stubby.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\25_M417 A2_Grip_Canted_Stubby.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\32_M417 A2_Grip_Bipod.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\34_M417 A2_Grip_QD_Grip_Pod.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M417 A2\35_M417 A2_Grip_Classic_Grip_Pod.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\17_M4A1_Grip_None.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\19_M4A1_Grip_Alloy_Vertical.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\23_M4A1_Grip_UNDERSLUNG_MOUNT.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\24_M4A1_Grip_Folding_Stubby.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\26_M4A1_Grip_Canted_Stubby.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\33_M4A1_Grip_Bipod.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\35_M4A1_Grip_QD_Grip_Pod.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\M4A1\36_M4A1_Grip_Classic_Grip_Pod.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\QBZ-192\2_QBZ-192_Muzzle_None.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\QBZ-192\3_QBZ-192_Muzzle_Flash_Hider.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\QBZ-192\4_QBZ-192_Muzzle_Linear_Comp.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\QBZ-192\5_QBZ-192_Muzzle_Standard_Suppressor.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\QBZ-192\6_QBZ-192_Barrel_Basic.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\QBZ-192\8_QBZ-192_Barrel_Cryo.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SG 553R\9_SG 553R_Muzzle_Standard_Suppressor.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SG 553R\16_SG 553R_Grip_None.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SG 553R\24_SG 553R_Grip_Canted_Stubby.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\1_SOR-300SC_Muzzle_None.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\2_SOR-300SC_Muzzle_Flash_Hider.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\3_SOR-300SC_Muzzle_Flash_Comp.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\7_SOR-300SC_Muzzle_Compensator.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\10_SOR-300SC_Muzzle_Long_Suppressor.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\11_SOR-300SC_Muzzle_CQB_Suppressor.png`, 60],
  [String.raw`C:\Users\royal\Documents\BF6 Weapon Analyzer\Weapon Attachments\Carbine\SOR-300SC\12_SOR-300SC_Muzzle_Lightened_Suppressor.png`, 60],
]);
if (mobilityOverrides.size !== 49) throw new Error(`Expected 49 explicit Mobility overrides, got ${mobilityOverrides.size}`);
for (const [sourcePath, value] of mobilityOverrides) {
  const record = records.find(r => r.source.currentPath.toLowerCase() === sourcePath.toLowerCase());
  if (!record) throw new Error(`Missing explicit Mobility screenshot: ${sourcePath}`);
  const comparisons = record.statComparisons?.mobility ? { mobility: record.statComparisons.mobility } : {};
  add(record, { mobility: value }, comparisons);
}
for (const filename of [
  '24_M4A1_Grip_Folding_Stubby.png',
  '32_M4A1_Grip_Full_Angled.png',
  '34_M4A1_Grip_PTT_Grip_Pod.png',
]) {
  const record = records.find(r => r.weaponName === 'M4A1' && r.source.currentPath.endsWith(filename));
  add(record, { control: 40 }, { control: comparison('up','buff','green') });
}

add(brodFlashComp, { attachmentSubtype: 'Flash Hider', attachmentDescription: 'Limits the intensity of muzzle flashes and fully hides in-world spotting while firing. Reduces recoil buildup and improves recoil recovery.' });
if (brodPencil) add(brodPencil, { attachmentDescription: 'Lightened barrel that improves aim down sights (ADS) accuracy while moving and enables a fast transition to ADS.' });

for (let i = overrides.length - 1; i >= 0; i--) {
  const o = overrides[i];
  const record = records.find(r => r.source.currentPath.toLowerCase() === String(o.sourcePath ?? '').toLowerCase());
  if (record && !record.stats && o.updates && Object.hasOwn(o.updates, 'mobility')) overrides.splice(i, 1);
}

fs.writeFileSync(`${audit}/manual-review-overrides.json`, `${JSON.stringify({ overrides }, null, 2)}\n`);
console.log(`updated ${overrides.length} manual overrides; costs=${Object.keys(costs).length}, names=${Object.keys(nameFixes).length}, laserRows=${laserRows.length}`);

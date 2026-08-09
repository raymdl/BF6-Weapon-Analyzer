import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = path.dirname(fileURLToPath(import.meta.url));
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');

const corrections = [
  { groupRank: 13, weaponName: 'DB-12', attachmentType: 'Laser', attachmentName: 'None', sourceProposedFilename: '10_DB-12_Laser_None.png', stat: 'mobility', expectedBeforeValue: 58, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 13, weaponName: 'DB-12', attachmentType: 'Laser', attachmentName: '5 MW Red', sourceProposedFilename: '12_DB-12_Laser_5_MW_Red.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 13, weaponName: 'DB-12', attachmentType: 'Laser', attachmentName: '50 MW Green', sourceProposedFilename: '14_DB-12_Laser_50_MW_Green.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 13, weaponName: 'DB-12', attachmentType: 'Laser', attachmentName: '120 MW Blue', sourceProposedFilename: '16_DB-12_Laser_120_MW_Blue.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 64, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 14, weaponName: 'L115', attachmentType: 'Grip', attachmentName: 'None', sourceProposedFilename: '25_L115_Grip_None.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 46, observedArrow: null },
  { groupRank: 14, weaponName: 'L115', attachmentType: 'Grip', attachmentName: 'Full Angled', sourceProposedFilename: '26_L115_Grip_Full_Angled.png', stat: 'mobility', expectedBeforeValue: 42, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 48, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 14, weaponName: 'L115', attachmentType: 'Grip', attachmentName: 'Slim Angled', sourceProposedFilename: '29_L115_Grip_Slim_Angled.png', stat: 'mobility', expectedBeforeValue: 46, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 48, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 14, weaponName: 'L115', attachmentType: 'Grip', attachmentName: 'Classic Grip Pod', sourceProposedFilename: '31_L115_Grip_Classic_Grip_Pod.png', stat: 'mobility', expectedBeforeValue: 46, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 50, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 15, weaponName: 'M277', attachmentType: 'Grip', attachmentName: 'Underslung Mount', sourceProposedFilename: '36_M277_Grip_UNDERSLUNG_MOUNT.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 15, weaponName: 'M277', attachmentType: 'Grip', attachmentName: 'Bipod', sourceProposedFilename: '46_M277_Grip_Bipod.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 15, weaponName: 'M277', attachmentType: 'Grip', attachmentName: 'Classic Grip Pod', sourceProposedFilename: '49_M277_Grip_Classic_Grip_Pod.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 16, weaponName: 'M357 Trait', attachmentType: 'Laser/Light', attachmentName: 'None', sourceProposedFilename: '02_M357 Trait_Laser-Light_None.png', stat: 'hipfire', expectedBeforeValue: 71, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { groupRank: 16, weaponName: 'M357 Trait', attachmentType: 'Laser/Light', attachmentName: 'Taclight - Aimed', sourceProposedFilename: '03_M357 Trait_Laser-Light_Taclight_-_Aimed.png', stat: 'hipfire', expectedBeforeValue: 81, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { groupRank: 16, weaponName: 'M357 Trait', attachmentType: 'Laser/Light', attachmentName: 'Laser/Light Combo Green', sourceProposedFilename: '09_M357 Trait_Laser-Light_LaserLight_Combo_Green.png', stat: 'hipfire', expectedBeforeValue: 78, expectedBeforeArrow: { direction: 'down', effect: 'buff', color: 'green' }, observedValue: 78, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 17, weaponName: 'M39 EMR', attachmentType: 'Grip', attachmentName: '6H64 Vertical', sourceProposedFilename: '33_M39 EMR_Grip_6H64_Vertical.png', stat: 'precision', expectedBeforeValue: 74, expectedBeforeArrow: null, observedValue: 74, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 17, weaponName: 'M39 EMR', attachmentType: 'Grip', attachmentName: 'Stippled Stubby', sourceProposedFilename: '38_M39 EMR_Grip_Stippled_Stubby.png', stat: 'precision', expectedBeforeValue: 74, expectedBeforeArrow: null, observedValue: 74, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 17, weaponName: 'M39 EMR', attachmentType: 'Grip', attachmentName: 'Bipod', sourceProposedFilename: '43_M39 EMR_Grip_Bipod.png', stat: 'precision', expectedBeforeValue: 72, expectedBeforeArrow: null, observedValue: 65, observedArrow: null },
  { groupRank: 18, weaponName: 'QBZ-192', attachmentType: 'Grip', attachmentName: 'Alloy Vertical', sourceProposedFilename: '21_QBZ-192_Grip_Alloy_Vertical.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 18, weaponName: 'QBZ-192', attachmentType: 'Grip', attachmentName: 'Canted Stubby', sourceProposedFilename: '27_QBZ-192_Grip_Canted_Stubby.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 18, weaponName: 'QBZ-192', attachmentType: 'Grip', attachmentName: 'Classic Grip Pod', sourceProposedFilename: '36_QBZ-192_Grip_Classic_Grip_Pod.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 19, weaponName: 'SOR-300SC', attachmentType: 'Muzzle', attachmentName: 'Single-Port Brake', sourceProposedFilename: '04_SOR-300SC_Muzzle_Single-Port_Brake.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 19, weaponName: 'SOR-300SC', attachmentType: 'Muzzle', attachmentName: 'Compensated Brake', sourceProposedFilename: '06_SOR-300SC_Muzzle_Compensated_Brake.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 19, weaponName: 'SOR-300SC', attachmentType: 'Muzzle', attachmentName: 'Standard Suppressor', sourceProposedFilename: '09_SOR-300SC_Muzzle_Standard_Suppressor.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { groupRank: 20, weaponName: 'ES 5.7', attachmentType: 'Muzzle', attachmentName: 'Compensator', sourceProposedFilename: '02_ES 5.7_Muzzle_Compensator.png', stat: 'hipfire', expectedBeforeValue: 62, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { groupRank: 20, weaponName: 'ES 5.7', attachmentType: 'Muzzle', attachmentName: 'Flash Hider', sourceProposedFilename: '03_ES 5.7_Muzzle_Flash_Hider.png', stat: 'hipfire', expectedBeforeValue: 81, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { groupRank: 20, weaponName: 'ES 5.7', attachmentType: 'Muzzle', attachmentName: 'CQB Suppressor', sourceProposedFilename: '06_ES 5.7_Muzzle_CQB_Suppressor.png', stat: 'hipfire', expectedBeforeValue: 11, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { groupRank: 21, weaponName: 'GGH-22', attachmentType: 'Muzzle', attachmentName: 'Flash Hider', sourceProposedFilename: '02_GGH-22_Muzzle_Flash_Hider.png', stat: 'hipfire', expectedBeforeValue: 59, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { groupRank: 21, weaponName: 'GGH-22', attachmentType: 'Muzzle', attachmentName: 'Compensator', sourceProposedFilename: '03_GGH-22_Muzzle_Compensator.png', stat: 'hipfire', expectedBeforeValue: 78, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { groupRank: 21, weaponName: 'GGH-22', attachmentType: 'Muzzle', attachmentName: 'CQB Suppressor', sourceProposedFilename: '06_GGH-22_Muzzle_CQB_Suppressor.png', stat: 'hipfire', expectedBeforeValue: 11, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { groupRank: 22, weaponName: 'KTS100 MK8', attachmentType: 'Muzzle', attachmentName: 'Flash Comp', sourceProposedFilename: '03_KTS100 MK8_Muzzle_Flash_Comp.png', stat: 'precision', expectedBeforeValue: 76, expectedBeforeArrow: null, observedValue: 76, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 22, weaponName: 'KTS100 MK8', attachmentType: 'Muzzle', attachmentName: 'Compensator', sourceProposedFilename: '07_KTS100 MK8_Muzzle_Compensator.png', stat: 'precision', expectedBeforeValue: 76, expectedBeforeArrow: null, observedValue: 76, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 22, weaponName: 'KTS100 MK8', attachmentType: 'Muzzle', attachmentName: 'Lightened Suppressor', sourceProposedFilename: '11_KTS100 MK8_Muzzle_Lightened_Suppressor.png', stat: 'precision', expectedBeforeValue: 76, expectedBeforeArrow: null, observedValue: 76, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { groupRank: 23, weaponName: 'L115', attachmentType: 'Muzzle', attachmentName: 'Standard Suppressor', sourceProposedFilename: '03_L115_Muzzle_Standard_Suppressor.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 46, observedArrow: null },
  { groupRank: 23, weaponName: 'L115', attachmentType: 'Muzzle', attachmentName: 'Lightened Suppressor', sourceProposedFilename: '06_L115_Muzzle_Lightened_Suppressor.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 46, observedArrow: null },
  { groupRank: 23, weaponName: 'L115', attachmentType: 'Muzzle', attachmentName: 'Long Suppressor', sourceProposedFilename: '08_L115_Muzzle_Long_Suppressor.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 46, observedArrow: null },
  { groupRank: 24, weaponName: 'LMR27', attachmentType: 'Muzzle', attachmentName: 'Flash Comp', sourceProposedFilename: '03_LMR27_Muzzle_Flash_Comp.png', stat: 'mobility', expectedBeforeValue: 58, expectedBeforeArrow: null, observedValue: 52, observedArrow: null },
  { groupRank: 24, weaponName: 'LMR27', attachmentType: 'Muzzle', attachmentName: 'Single-Port Brake', sourceProposedFilename: '04_LMR27_Muzzle_Single-Port_Brake.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 52, observedArrow: null },
  { groupRank: 24, weaponName: 'LMR27', attachmentType: 'Muzzle', attachmentName: 'Standard Suppressor', sourceProposedFilename: '09_LMR27_Muzzle_Standard_Suppressor.png', stat: 'mobility', expectedBeforeValue: 56, expectedBeforeArrow: null, observedValue: 52, observedArrow: null }
];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const comparisonShape = comparison => comparison == null ? null : {
  direction: comparison.direction,
  effect: comparison.effect,
  color: comparison.color
};
const sameArrow = (left, right) => JSON.stringify(comparisonShape(left)) === JSON.stringify(comparisonShape(right));
const samePair = (record, correction) => record.stats?.[correction.stat] === correction.expectedBeforeValue
  && sameArrow(record.statComparisons?.[correction.stat], correction.expectedBeforeArrow);
const sameAfter = (record, correction) => record.stats?.[correction.stat] === correction.observedValue
  && sameArrow(record.statComparisons?.[correction.stat], correction.observedArrow);

const review = readJson(reviewPath);
let applied = 0;
let alreadyApplied = 0;

for (const correction of corrections) {
  const matches = review.records.filter(record => {
    const proposed = record.source?.proposedFilename;
    const current = record.source?.currentPath ? path.basename(record.source.currentPath) : null;
    const filenameMatches = proposed === correction.sourceProposedFilename
      || (!proposed && current === correction.sourceProposedFilename);
    return record.weaponName === correction.weaponName
      && record.attachmentType === correction.attachmentType
      && record.attachmentName === correction.attachmentName
      && filenameMatches;
  });
  if (matches.length !== 1) throw new Error(`Expected exactly one target for ${correction.weaponName}/${correction.attachmentType}/${correction.attachmentName}/${correction.sourceProposedFilename}; found ${matches.length}`);

  const record = matches[0];
  if (sameAfter(record, correction)) {
    alreadyApplied++;
    continue;
  }
  if (!samePair(record, correction)) throw new Error(`Unexpected before pair for ${correction.weaponName}/${correction.attachmentType}/${correction.attachmentName}/${correction.stat}`);

  record.stats[correction.stat] = correction.observedValue;
  if (correction.observedArrow == null) {
    delete record.statComparisons?.[correction.stat];
  } else if (!sameArrow(record.statComparisons?.[correction.stat], correction.observedArrow)) {
    record.statComparisons ??= {};
    record.statComparisons[correction.stat] = { ...correction.observedArrow };
  }
  applied++;
}

if (applied > 0) fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ total: corrections.length, applied, alreadyApplied }));

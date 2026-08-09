import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = path.dirname(fileURLToPath(import.meta.url));
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');

const corrections = [
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'Folding Vertical', sourceProposedFilename: '28_SVDM_Grip_Folding_Vertical.png', stat: 'precision', expectedBeforeValue: 50, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 60, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'Low-Profile Stubby', sourceProposedFilename: '38_SVDM_Grip_Low-Profile_Stubby.png', stat: 'precision', expectedBeforeValue: 5, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 67, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'QD Grip Pod', sourceProposedFilename: '44_SVDM_Grip_QD_Grip_Pod.png', stat: 'precision', expectedBeforeValue: 50, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 60, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'None', sourceProposedFilename: '27_SVDM_Grip_None.png', stat: 'adsTimeMs', expectedBeforeValue: 367, expectedBeforeArrow: null, observedValue: 300, observedArrow: null },
  { weaponName: 'M433', attachmentType: 'Muzzle', attachmentName: 'None', sourceProposedFilename: '01_M433_Muzzle_None.png', stat: 'mobility', expectedBeforeValue: 56, expectedBeforeArrow: null, observedValue: 52, observedArrow: null },
  { weaponName: 'M39 EMR', attachmentType: 'Grip', attachmentName: 'None', sourceProposedFilename: '28_M39 EMR_Grip_None.png', stat: 'adsTimeMs', expectedBeforeValue: 367, expectedBeforeArrow: null, observedValue: 300, observedArrow: null },
  { weaponName: 'M39 EMR', attachmentType: 'Grip', attachmentName: 'QD Grip Pod', sourceProposedFilename: '45_M39 EMR_Grip_QD_Grip_Pod.png', stat: 'adsTimeMs', expectedBeforeValue: 250, expectedBeforeArrow: null, observedValue: 300, observedArrow: null },
  { weaponName: 'M4A1', attachmentType: 'Muzzle', attachmentName: 'Flash Comp', sourceProposedFilename: '03_M4A1_Muzzle_Flash_Comp.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'M4A1', attachmentType: 'Muzzle', attachmentName: 'Linear Comp', sourceProposedFilename: '08_M4A1_Muzzle_Linear_Comp.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'M4A1', attachmentType: 'Muzzle', attachmentName: 'Lightened Suppressor', sourceProposedFilename: '11_M4A1_Muzzle_Lightened_Suppressor.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'LMR27', attachmentType: 'Grip', attachmentName: 'None', sourceProposedFilename: '28_LMR27_Grip_None.png', stat: 'mobility', expectedBeforeValue: 48, expectedBeforeArrow: null, observedValue: 52, observedArrow: null },
  { weaponName: 'LMR27', attachmentType: 'Grip', attachmentName: 'Classic Grip Pod', sourceProposedFilename: '46_LMR27_Grip_Classic_Grip_Pod.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 52, observedArrow: null },
  { weaponName: 'KV9', attachmentType: 'Muzzle', attachmentName: 'Flash Hider', sourceProposedFilename: '02_KV9_Muzzle_Flash_Hider.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'KV9', attachmentType: 'Muzzle', attachmentName: 'Standard Suppressor', sourceProposedFilename: '08_KV9_Muzzle_Standard_Suppressor.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'KV9', attachmentType: 'Muzzle', attachmentName: 'Lightened Suppressor', sourceProposedFilename: '11_KV9_Muzzle_Lightened_Suppressor.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'RPK-74M', attachmentType: 'Muzzle', attachmentName: 'Flash Hider', sourceProposedFilename: '02_RPK-74M_Muzzle_Flash_Hider.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'RPK-74M', attachmentType: 'Muzzle', attachmentName: 'Standard Suppressor', sourceProposedFilename: '08_RPK-74M_Muzzle_Standard_Suppressor.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'RPK-74M', attachmentType: 'Muzzle', attachmentName: 'Lightened Suppressor', sourceProposedFilename: '11_RPK-74M_Muzzle_Lightened_Suppressor.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: '18.5KS-K', attachmentType: 'Grip', attachmentName: 'None', sourceProposedFilename: '20_18.5KS-K_Grip_None.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: '18.5KS-K', attachmentType: 'Grip', attachmentName: 'Low-Profile Stubby', sourceProposedFilename: '31_18.5KS-K_Grip_Low-Profile_Stubby.png', stat: 'mobility', expectedBeforeValue: 56, expectedBeforeArrow: { direction: 'down', effect: 'penalty', color: 'red' }, observedValue: 58, observedArrow: { direction: 'down', effect: 'penalty', color: 'red' } },
  { weaponName: 'DB-12', attachmentType: 'Laser', attachmentName: 'None', sourceProposedFilename: '10_DB-12_Laser_None.png', stat: 'precision', expectedBeforeValue: 7, expectedBeforeArrow: null, observedValue: 6, observedArrow: null },
  { weaponName: 'DB-12', attachmentType: 'Laser', attachmentName: 'None', sourceProposedFilename: '10_DB-12_Laser_None.png', stat: 'control', expectedBeforeValue: 13, expectedBeforeArrow: null, observedValue: 9, observedArrow: null },
  { weaponName: 'DB-12', attachmentType: 'Laser', attachmentName: '50 MW Violet', sourceProposedFilename: '11_DB-12_Laser_50_MW_Violet.png', stat: 'control', expectedBeforeValue: 0, expectedBeforeArrow: null, observedValue: 9, observedArrow: null },
  { weaponName: 'BROD 3', attachmentType: 'Grip', attachmentName: 'Alloy Vertical', sourceProposedFilename: '30_BROD 3_Grip_Alloy_Vertical.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'BROD 3', attachmentType: 'Grip', attachmentName: 'QD Grip Pod', sourceProposedFilename: '37_BROD 3_Grip_QD_Grip_Pod.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'BROD 3', attachmentType: 'Grip', attachmentName: 'Classic Grip Pod', sourceProposedFilename: '44_BROD 3_Grip_Classic_Grip_Pod.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null }
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

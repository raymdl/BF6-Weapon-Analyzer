import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = path.dirname(fileURLToPath(import.meta.url));
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');

const corrections = [
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'Alloy Vertical', sourceProposedFilename: '30_SVDM_Grip_Alloy_Vertical.png', stat: 'precision', expectedBeforeValue: 50, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 60, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'Folding Stubby', sourceProposedFilename: '34_SVDM_Grip_Folding_Stubby.png', stat: 'precision', expectedBeforeValue: 50, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 60, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'Ribbed Stubby', sourceProposedFilename: '35_SVDM_Grip_Ribbed_Stubby.png', stat: 'precision', expectedBeforeValue: 50, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 60, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'Full Angled', sourceProposedFilename: '41_SVDM_Grip_Full_Angled.png', stat: 'precision', expectedBeforeValue: 50, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 60, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'Bipod', sourceProposedFilename: '42_SVDM_Grip_Bipod.png', stat: 'precision', expectedBeforeValue: 62, expectedBeforeArrow: null, observedValue: 55, observedArrow: null },
  { weaponName: 'SVDM', attachmentType: 'Grip', attachmentName: 'PTT Grip Pod', sourceProposedFilename: '43_SVDM_Grip_PTT_Grip_Pod.png', stat: 'precision', expectedBeforeValue: 50, expectedBeforeArrow: { direction: 'up', effect: 'buff', color: 'green' }, observedValue: 60, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'M4A1', attachmentType: 'Muzzle', attachmentName: 'Double-Port Brake', sourceProposedFilename: '05_M4A1_Muzzle_Double-Port_Brake.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'M4A1', attachmentType: 'Muzzle', attachmentName: 'Compensator', sourceProposedFilename: '07_M4A1_Muzzle_Compensator.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'M4A1', attachmentType: 'Muzzle', attachmentName: 'Standard Suppressor', sourceProposedFilename: '09_M4A1_Muzzle_Standard_Suppressor.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'M4A1', attachmentType: 'Muzzle', attachmentName: 'Long Suppressor', sourceProposedFilename: '10_M4A1_Muzzle_Long_Suppressor.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'KV9', attachmentType: 'Muzzle', attachmentName: 'Compensator', sourceProposedFilename: '06_KV9_Muzzle_Compensator.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'KV9', attachmentType: 'Muzzle', attachmentName: 'CQB Suppressor', sourceProposedFilename: '09_KV9_Muzzle_CQB_Suppressor.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'KV9', attachmentType: 'Muzzle', attachmentName: 'Long Suppressor', sourceProposedFilename: '10_KV9_Muzzle_Long_Suppressor.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'RPK-74M', attachmentType: 'Muzzle', attachmentName: 'Flash Comp', sourceProposedFilename: '03_RPK-74M_Muzzle_Flash_Comp.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'RPK-74M', attachmentType: 'Muzzle', attachmentName: 'Long Suppressor', sourceProposedFilename: '09_RPK-74M_Muzzle_Long_Suppressor.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'RPK-74M', attachmentType: 'Muzzle', attachmentName: 'CQB Suppressor', sourceProposedFilename: '10_RPK-74M_Muzzle_CQB_Suppressor.png', stat: 'control', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'BROD 3', attachmentType: 'Grip', attachmentName: 'Folding Stubby', sourceProposedFilename: '32_BROD 3_Grip_Folding_Stubby.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'BROD 3', attachmentType: 'Grip', attachmentName: 'Canted Stubby', sourceProposedFilename: '40_BROD 3_Grip_Canted_Stubby.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null }
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
  const matches = review.records.filter(record => record.weaponName === correction.weaponName
    && record.attachmentType === correction.attachmentType
    && record.attachmentName === correction.attachmentName
    && record.source?.proposedFilename === correction.sourceProposedFilename);
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

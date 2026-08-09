import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = path.dirname(fileURLToPath(import.meta.url));
const reviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');

const corrections = [
  { weaponName: 'M277', attachmentType: 'Grip', attachmentName: 'Canted Stubby', sourceProposedFilename: '39_M277_Grip_Canted_Stubby.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'M277', attachmentType: 'Grip', attachmentName: 'QD Grip Pod', sourceProposedFilename: '48_M277_Grip_QD_Grip_Pod.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'M39 EMR', attachmentType: 'Grip', attachmentName: 'Classic Vertical', sourceProposedFilename: '34_M39 EMR_Grip_Classic_Vertical.png', stat: 'precision', expectedBeforeValue: 77, expectedBeforeArrow: null, observedValue: 77, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'M39 EMR', attachmentType: 'Grip', attachmentName: 'Low-Profile Stubby', sourceProposedFilename: '39_M39 EMR_Grip_Low-Profile_Stubby.png', stat: 'precision', expectedBeforeValue: 77, expectedBeforeArrow: null, observedValue: 77, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'QBZ-192', attachmentType: 'Grip', attachmentName: 'Folding Stubby', sourceProposedFilename: '25_QBZ-192_Grip_Folding_Stubby.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'QBZ-192', attachmentType: 'Grip', attachmentName: 'QD Grip Pod', sourceProposedFilename: '35_QBZ-192_Grip_QD_Grip_Pod.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'SOR-300SC', attachmentType: 'Muzzle', attachmentName: 'Double-Port Brake', sourceProposedFilename: '05_SOR-300SC_Muzzle_Double-Port_Brake.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'SOR-300SC', attachmentType: 'Muzzle', attachmentName: 'Linear Comp', sourceProposedFilename: '08_SOR-300SC_Muzzle_Linear_Comp.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 60, observedArrow: null },
  { weaponName: 'ES 5.7', attachmentType: 'Muzzle', attachmentName: 'Single-Port Brake', sourceProposedFilename: '04_ES 5.7_Muzzle_Single-Port_Brake.png', stat: 'hipfire', expectedBeforeValue: 68, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { weaponName: 'GGH-22', attachmentType: 'Muzzle', attachmentName: 'Single-Port Brake', sourceProposedFilename: '04_GGH-22_Muzzle_Single-Port_Brake.png', stat: 'hipfire', expectedBeforeValue: 11, expectedBeforeArrow: null, observedValue: 54, observedArrow: null },
  { weaponName: 'KTS100 MK8', attachmentType: 'Muzzle', attachmentName: 'Long Suppressor', sourceProposedFilename: '10_KTS100 MK8_Muzzle_Long_Suppressor.png', stat: 'precision', expectedBeforeValue: 76, expectedBeforeArrow: null, observedValue: 76, observedArrow: { direction: 'up', effect: 'buff', color: 'green' } },
  { weaponName: 'L115', attachmentType: 'Muzzle', attachmentName: 'CQB Suppressor', sourceProposedFilename: '07_L115_Muzzle_CQB_Suppressor.png', stat: 'mobility', expectedBeforeValue: 50, expectedBeforeArrow: null, observedValue: 46, observedArrow: null },
  { weaponName: 'LMR27', attachmentType: 'Muzzle', attachmentName: 'Compensator', sourceProposedFilename: '05_LMR27_Muzzle_Compensator.png', stat: 'mobility', expectedBeforeValue: 46, expectedBeforeArrow: null, observedValue: 52, observedArrow: null }
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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = path.dirname(fileURLToPath(import.meta.url));
const ledgerPath = path.join(auditRoot, 'slot-baseline-evidence-b1-20260809.json');
const defaultReviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const reviewPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultReviewPath;

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const ledger = readJson(ledgerPath);

if (ledger.metadata?.stage !== 'B1'
  || ledger.metadata?.selection?.groupRankMin !== 1
  || ledger.metadata?.selection?.groupRankMax !== 30) {
  throw new Error('B1 ledger metadata does not match the requested scope');
}

const corrections = ledger.entries.filter(entry => entry.disposition === 'corrected');
if (corrections.length !== 44) {
  throw new Error(`Expected exactly 44 corrected ledger entries; found ${corrections.length}`);
}
if (ledger.entries.some(entry => entry.observedArrow !== null)) {
  throw new Error('B1 ledger contains a non-null observed arrow');
}

const directionOf = arrow => {
  if (arrow == null) return null;
  if (typeof arrow === 'string') return arrow;
  if (typeof arrow === 'object' && typeof arrow.direction === 'string') return arrow.direction;
  throw new Error(`Invalid arrow value: ${JSON.stringify(arrow)}`);
};

const comparisonShape = comparison => comparison == null ? null : {
  direction: comparison.direction ?? null,
  effect: comparison.effect ?? null,
  color: comparison.color ?? null
};

const sameArrowShape = (comparison, expectedArrow) => {
  if (expectedArrow == null) return comparison == null;
  return JSON.stringify(comparisonShape(comparison)) === JSON.stringify(comparisonShape(expectedArrow));
};

const identityKey = entry => JSON.stringify([
  entry.weapon,
  entry.slot,
  entry.attachment,
  entry.capture,
  entry.stat
]);

const seen = new Set();
for (const correction of corrections) {
  const key = identityKey(correction);
  if (seen.has(key)) throw new Error(`Duplicate corrected ledger identity: ${key}`);
  seen.add(key);
}

const review = readJson(reviewPath);
if (!Array.isArray(review.records)) throw new Error('Review JSON does not contain a records array');

const matchesFor = correction => review.records.filter(record => {
  const proposed = record.source?.proposedFilename;
  const current = record.source?.currentPath ? path.win32.basename(record.source.currentPath) : null;
  const filenameMatches = proposed === correction.capture || (!proposed && current === correction.capture);
  return record.weaponName === correction.weapon
    && record.attachmentType === correction.slot
    && record.attachmentName === correction.attachment
    && filenameMatches;
});

const sameBeforePair = (record, correction) => record.stats?.[correction.stat] === correction.recordedValue
  && directionOf(record.statComparisons?.[correction.stat]) === directionOf(correction.recordedArrow);

const sameAfterPair = (record, correction) => record.stats?.[correction.stat] === correction.observedValue
  && sameArrowShape(record.statComparisons?.[correction.stat], correction.observedArrow);

const targets = [];
for (const correction of corrections) {
  const matches = matchesFor(correction);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one target for ${correction.weapon}/${correction.slot}/${correction.attachment}/${correction.capture}; found ${matches.length}`);
  }

  const record = matches[0];
  const alreadyCorrect = sameAfterPair(record, correction);
  if (!alreadyCorrect && !sameBeforePair(record, correction)) {
    throw new Error(`Unexpected before/after pair for ${correction.weapon}/${correction.slot}/${correction.attachment}/${correction.stat}`);
  }
  targets.push({ correction, record, alreadyCorrect });
}

const comparisonState = (record, stat) => {
  const comparisons = record.statComparisons;
  if (!comparisons || !Object.prototype.hasOwnProperty.call(comparisons, stat)) return { present: false };
  return { present: true, value: comparisons[stat] };
};

let appliedEntries = 0;
let alreadyCorrectEntries = 0;
let valueChanges = 0;
let comparisonChanges = 0;

for (const target of targets) {
  const { correction, record, alreadyCorrect } = target;
  if (alreadyCorrect) {
    alreadyCorrectEntries++;
    continue;
  }

  const beforeComparison = comparisonState(record, correction.stat);

  if (record.stats[correction.stat] !== correction.observedValue) {
    record.stats[correction.stat] = correction.observedValue;
    valueChanges++;
  }

  if (correction.observedArrow == null) {
    if (record.statComparisons
      && Object.prototype.hasOwnProperty.call(record.statComparisons, correction.stat)) {
      delete record.statComparisons[correction.stat];
    }
  } else if (!sameArrowShape(record.statComparisons?.[correction.stat], correction.observedArrow)) {
    record.statComparisons ??= {};
    record.statComparisons[correction.stat] = {
      direction: correction.observedArrow.direction,
      effect: correction.observedArrow.effect,
      color: correction.observedArrow.color
    };
  }

  const afterComparison = comparisonState(record, correction.stat);
  if (JSON.stringify(beforeComparison) !== JSON.stringify(afterComparison)) comparisonChanges++;
  appliedEntries++;
}

if (appliedEntries > 0) {
  fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify({
  matchedEntries: corrections.length,
  appliedEntries,
  valueChanges,
  comparisonChanges,
  alreadyCorrectEntries
}));

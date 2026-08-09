import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const auditRoot = path.dirname(fileURLToPath(import.meta.url));
const b4LedgerPath = path.join(auditRoot, 'slot-baseline-evidence-b4-newly-exposed-20260809.json');
const nvoLedgerPath = path.join(auditRoot, 'slot-baseline-evidence-b4-nvo-correction-20260809.json');
const defaultReviewPath = path.join(auditRoot, 'attachment-screenshot-review.json');
const reviewPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultReviewPath;

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const basename = value => value ? path.win32.basename(value) : null;
const readArrowShape = arrow => arrow == null ? null : {
  direction: arrow.direction ?? null,
  effect: arrow.effect ?? null,
  color: arrow.color ?? null
};
const sameArrowShape = (comparison, expectedArrow) =>
  JSON.stringify(readArrowShape(comparison)) === JSON.stringify(readArrowShape(expectedArrow));
const identityKey = entry => JSON.stringify([
  entry.weapon,
  entry.slot,
  entry.attachment,
  entry.capture,
  entry.stat
]);
const isNvoSpot2d = entry =>
  entry.weapon === 'NVO-228E'
  && entry.slot === 'Muzzle'
  && entry.stat === 'spotOnFire2dM';
const setEquals = (actual, expected) =>
  actual.size === expected.size && [...expected].every(value => actual.has(value));
const shortIdentity = entry =>
  entry.weapon + '/' + entry.slot + '/' + entry.attachment + '/' + entry.stat + '/' + entry.capture;
const comparisonState = (record, stat) => {
  const comparisons = record.statComparisons;
  if (!comparisons || !Object.prototype.hasOwnProperty.call(comparisons, stat)) {
    return { present: false };
  }
  return { present: true, value: comparisons[stat] };
};
const sameState = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const expectedOriginalNvoCaptures = new Set([
  '02_NVO-228E_Muzzle_Flash_Hider.png',
  '03_NVO-228E_Muzzle_Flash_Comp.png',
  '04_NVO-228E_Muzzle_Single-Port_Brake.png',
  '05_NVO-228E_Muzzle_Double-Port_Brake.png',
  '06_NVO-228E_Muzzle_Compensated_Brake.png',
  '07_NVO-228E_Muzzle_Compensator.png'
]);
const expectedCorrectionNvoCaptures = new Set([
  '01_NVO-228E_Muzzle_None.png',
  ...expectedOriginalNvoCaptures,
  '08_NVO-228E_Muzzle_Linear_Comp.png'
]);
const expectedNvoPriorLedger = entry =>
  entry.attachment === 'None' || entry.attachment === 'Linear Comp'
    ? 'slot-baseline-evidence-b3-20260809.json'
    : 'slot-baseline-evidence-b4-newly-exposed-20260809.json';

const summary = {
  matchedEntries: 0,
  plannedEntries: 0,
  appliedEntries: 0,
  valueChanges: 0,
  comparisonChanges: 0,
  alreadyCorrect: 0,
  errors: []
};

try {
  const b4Ledger = readJson(b4LedgerPath);
  const nvoLedger = readJson(nvoLedgerPath);

  if (b4Ledger.metadata?.stage !== 'B4-newly-exposed') {
    throw new Error('B4 source ledger stage is not B4-newly-exposed');
  }
  if (b4Ledger.metadata?.entryCount !== 25 || !Array.isArray(b4Ledger.entries)
    || b4Ledger.entries.length !== 25) {
    throw new Error('Expected exactly 25 B4 source entries; found '
      + (b4Ledger.entries?.length ?? 'non-array'));
  }

  const b4DispositionCounts = b4Ledger.entries.reduce((counts, entry) => {
    counts[entry.disposition] = (counts[entry.disposition] ?? 0) + 1;
    return counts;
  }, {});
  if (b4DispositionCounts.corrected !== 22 || b4DispositionCounts.confirmed !== 3
    || Object.keys(b4DispositionCounts).some(key => !['corrected', 'confirmed'].includes(key))) {
    throw new Error('Unexpected B4 source dispositions: ' + JSON.stringify(b4DispositionCounts));
  }

  const b4Identities = new Set();
  for (const entry of b4Ledger.entries) {
    const key = identityKey(entry);
    if (b4Identities.has(key)) {
      throw new Error('Duplicate B4 source identity: ' + shortIdentity(entry));
    }
    b4Identities.add(key);
    if (entry.recordedArrow !== null || entry.observedArrow !== null) {
      throw new Error('B4 source contains an arrow state: ' + shortIdentity(entry));
    }
  }

  const originalNvoEntries = b4Ledger.entries.filter(isNvoSpot2d);
  const originalNvoCaptures = new Set(originalNvoEntries.map(entry => entry.capture));
  if (originalNvoEntries.length !== 6 || !setEquals(originalNvoCaptures, expectedOriginalNvoCaptures)) {
    throw new Error('B4 NVO superseded set mismatch: '
      + JSON.stringify([...originalNvoCaptures].sort()));
  }
  const nonNvoCorrections = b4Ledger.entries.filter(
    entry => !isNvoSpot2d(entry) && entry.disposition === 'corrected'
  );
  if (nonNvoCorrections.length !== 19
    || b4Ledger.entries.some(entry => !isNvoSpot2d(entry) && entry.disposition !== 'corrected')) {
    throw new Error('Expected exactly 19 non-NVO B4 corrections; found '
      + nonNvoCorrections.length);
  }

  if (nvoLedger.metadata?.stage !== 'B4-NVO-CORRECTION') {
    throw new Error('NVO correction ledger stage is not B4-NVO-CORRECTION');
  }
  if (nvoLedger.metadata?.entryCount !== 8 || nvoLedger.metadata?.uniqueCaptureStatCount !== 8
    || !Array.isArray(nvoLedger.entries) || nvoLedger.entries.length !== 8) {
    throw new Error('Expected exactly 8 NVO correction entries; found '
      + (nvoLedger.entries?.length ?? 'non-array'));
  }
  const nvoDispositionCounts = nvoLedger.entries.reduce((counts, entry) => {
    counts[entry.disposition] = (counts[entry.disposition] ?? 0) + 1;
    return counts;
  }, {});
  if (nvoDispositionCounts.corrected !== 8 || Object.keys(nvoDispositionCounts).some(
    key => key !== 'corrected'
  )) {
    throw new Error('Unexpected NVO correction dispositions: '
      + JSON.stringify(nvoDispositionCounts));
  }

  const nvoIdentities = new Set();
  for (const entry of nvoLedger.entries) {
    const key = identityKey(entry);
    if (nvoIdentities.has(key)) {
      throw new Error('Duplicate NVO correction identity: ' + shortIdentity(entry));
    }
    nvoIdentities.add(key);
    if (!isNvoSpot2d(entry) || entry.disposition !== 'corrected'
      || entry.observedValue !== 150 || entry.observedArrow !== null) {
      throw new Error('Invalid authoritative NVO correction: ' + shortIdentity(entry));
    }
    const supersedes = entry.supersedes;
    const priorIdentity = supersedes?.priorEntryIdentity;
    const priorLedger = typeof supersedes?.ledger === 'string'
      ? supersedes.ledger.split(/[\\/]/).pop()
      : null;
    if (!supersedes || priorLedger !== expectedNvoPriorLedger(entry)
      || !priorIdentity
      || priorIdentity.weapon !== entry.weapon
      || priorIdentity.slot !== entry.slot
      || priorIdentity.attachment !== entry.attachment
      || priorIdentity.stat !== entry.stat
      || priorIdentity.capture !== entry.capture) {
      throw new Error('Invalid NVO supersession reference: ' + shortIdentity(entry));
    }
  }
  if (!setEquals(new Set(nvoLedger.entries.map(entry => entry.capture)), expectedCorrectionNvoCaptures)) {
    throw new Error('NVO correction identity set mismatch: ' + JSON.stringify([...nvoIdentities]));
  }

  const corrections = [...nonNvoCorrections, ...nvoLedger.entries];
  if (corrections.length !== 27) {
    throw new Error('Expected exactly 27 planned corrections; found ' + corrections.length);
  }
  const correctionIdentities = new Set();
  for (const correction of corrections) {
    const key = identityKey(correction);
    if (correctionIdentities.has(key)) {
      throw new Error('Duplicate planned correction identity: ' + shortIdentity(correction));
    }
    correctionIdentities.add(key);
  }
  if (corrections.some(entry => entry.observedArrow !== null)) {
    throw new Error('Authoritative B4 corrections unexpectedly require comparison changes');
  }

  const review = readJson(reviewPath);
  if (!Array.isArray(review.records)) {
    throw new Error('Review JSON does not contain a records array');
  }
  const matchesFor = correction => review.records.filter(record => {
    const proposed = record.source?.proposedFilename;
    const current = basename(record.source?.currentPath);
    const filenameMatches = proposed === correction.capture
      || (!proposed && current === correction.capture);
    return record.weaponName === correction.weapon
      && record.attachmentType === correction.slot
      && record.attachmentName === correction.attachment
      && filenameMatches;
  });
  const sameBeforePair = (record, correction) =>
    record.stats?.[correction.stat] === correction.recordedValue
    && sameArrowShape(record.statComparisons?.[correction.stat], correction.recordedArrow);
  const sameAfterPair = (record, correction) =>
    record.stats?.[correction.stat] === correction.observedValue
    && sameArrowShape(record.statComparisons?.[correction.stat], correction.observedArrow);

  const targets = [];
  for (const correction of corrections) {
    const matches = matchesFor(correction);
    if (matches.length !== 1) {
      throw new Error('Expected exactly one corpus target for ' + shortIdentity(correction)
        + '; found ' + matches.length);
    }
    const record = matches[0];
    if (!record.stats || !Object.prototype.hasOwnProperty.call(record.stats, correction.stat)) {
      throw new Error('Corpus target is missing stat ' + shortIdentity(correction));
    }
    const alreadyCorrect = sameAfterPair(record, correction);
    if (!alreadyCorrect && !sameBeforePair(record, correction)) {
      throw new Error('Unexpected current before/after pair for ' + shortIdentity(correction));
    }
    targets.push({ correction, record, alreadyCorrect });
  }

  summary.matchedEntries = targets.length;
  summary.plannedEntries = targets.filter(target => !target.alreadyCorrect).length;
  summary.alreadyCorrect = targets.filter(target => target.alreadyCorrect).length;

  for (const target of targets) {
    if (target.alreadyCorrect) continue;
    const { correction, record } = target;
    const beforeComparison = comparisonState(record, correction.stat);

    if (record.stats[correction.stat] !== correction.observedValue) {
      record.stats[correction.stat] = correction.observedValue;
      summary.valueChanges++;
    }

    if (correction.observedArrow === null) {
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
    if (!sameState(beforeComparison, afterComparison)) summary.comparisonChanges++;
    summary.appliedEntries++;
  }

  if (summary.appliedEntries > 0) {
    fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify(summary));
} catch (error) {
  summary.errors.push(error instanceof Error ? error.message : String(error));
  console.error(JSON.stringify(summary));
  process.exitCode = 1;
}
